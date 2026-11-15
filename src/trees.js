// Broken trees that creak, show a red danger zone, then crash down on whoever is underneath.
// You can also shoot one enough times to knock it over onto the samurai!
import * as THREE from 'three';
import { sfx } from './sound.js';

export class FallingTrees {
  constructor(scene, world, effects, rig, cfg) {
    this.world = world;
    this.effects = effects;
    this.rig = rig;
    this.cfg = cfg;
    this.dummy = new THREE.Object3D();
    this.dummy.rotation.order = 'YZX';
    this.fallenObstacles = [];

    // Red danger strip on the ground, one per tree (only shown while it's about to fall).
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
    for (const t of world.brokenTrees) {
      t.dir = { x: -Math.cos(t.yaw), z: Math.sin(t.yaw) };   // the way it leans = the way it falls
      t.zone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xff2a1a, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
      }));
      t.zone.renderOrder = 5;
      t.zone.rotation.y = t.yaw + Math.PI;
      t.zone.scale.set(t.height + 0.5, 1, t.radius * 2 + 1.6);
      t.zone.position.set(t.x, t.y + 0.15, t.z);
      t.zone.visible = false;
      scene.add(t.zone);
    }
    this.reset();
  }

  reset() {
    for (const o of this.fallenObstacles) {
      const i = this.world.obstacles.indexOf(o);
      if (i >= 0) this.world.obstacles.splice(i, 1);
    }
    this.fallenObstacles = [];
    for (const t of this.world.brokenTrees) {
      t.state = 'standing';
      t.angle = t.lean;
      t.hp = this.cfg.shotsToTopple;
      t.wobble = 0;
      t.zone.visible = false;
      this.place(t);
    }
    this.nextFall();
  }

  nextFall() {
    const [a, b] = this.cfg.treeFallEverySeconds;
    this.timer = a + Math.random() * (b - a);
  }

  place(t, shake = 0) {
    const d = this.dummy;
    d.position.set(t.x, t.y - 0.3, t.z);
    d.rotation.set(0, t.yaw, t.angle + shake);
    d.scale.set(t.radius, t.height, t.radius);
    d.updateMatrix();
    this.world.trunkMesh.setMatrixAt(t.index, d.matrix);
    this.world.trunkMesh.instanceMatrix.needsUpdate = true;
  }

  warn(t, seconds) {
    t.state = 'warning';
    t.t = seconds;
    t.zone.visible = true;
    sfx.treeCreak();
  }

  // Called by combat when a bullet hits a tree, rock or log.
  onShot(obstacle, amount) {
    const t = obstacle.tree;
    if (!t || t.state !== 'standing') return;
    t.hp -= amount;
    t.wobble = 0.25;
    if (t.hp <= 0) this.warn(t, 0.7);
  }

  update(dt, players, samurai, hud) {
    // Every so often, a broken tree near a ninja starts to go.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.nextFall();
      const near = this.world.brokenTrees.filter(t => t.state === 'standing' &&
        players.some(p => p.alive && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 18 && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) > 3));
      if (near.length) {
        this.warn(near[Math.floor(Math.random() * near.length)], this.cfg.warningSeconds);
        hud.toast('Timber! A tree is coming down!');
      }
    }

    for (const t of this.world.brokenTrees) {
      if (t.state === 'standing' && t.wobble > 0) {
        t.wobble = Math.max(0, t.wobble - dt);
        this.place(t, Math.sin(t.wobble * 60) * 0.02);
      } else if (t.state === 'warning') {
        t.t -= dt;
        t.zone.material.opacity = 0.25 + Math.sin(t.t * 14) * 0.15;
        this.place(t, Math.sin(t.t * 40) * 0.03);
        if (t.t <= 0) { t.state = 'falling'; t.speed = 0.3; }
      } else if (t.state === 'falling') {
        t.speed += dt * 3.5;   // falls faster and faster
        t.angle += t.speed * dt;
        t.zone.material.opacity = 0.45;
        if (t.angle >= Math.PI / 2 - 0.06) {
          t.angle = Math.PI / 2 - 0.06;
          this.land(t, players, samurai);
        }
        this.place(t);
      }
    }
  }

  // The crash: hurt everyone under it, throw up dust, and leave a log to jump over.
  land(t, players, samurai) {
    t.state = 'down';
    t.zone.visible = false;
    sfx.treeCrash();
    this.rig.shake = 1;

    const under = (x, z, r) => {
      const px = x - t.x, pz = z - t.z;
      const along = Math.max(0, Math.min(t.height, px * t.dir.x + pz * t.dir.z));
      const cx = t.x + t.dir.x * along, cz = t.z + t.dir.z * along;
      return Math.hypot(x - cx, z - cz) < t.radius + r + 0.5 && along > 0.3;
    };
    for (const p of players) {
      if (p.alive && under(p.pos.x, p.pos.z, p.radius)) {
        p.hurt(this.cfg.treeDamage);
        p.justHurt = true;
        sfx.hurt();
      }
    }
    for (const s of samurai) {
      if (s.alive && under(s.pos.x, s.pos.z, s.radius)) s.hit(this.cfg.treeDamage * 2, t.dir.x, t.dir.z, true);
    }

    for (let a = 1; a < t.height; a += 0.8) {
      const x = t.x + t.dir.x * a, z = t.z + t.dir.z * a;
      const ground = this.world.heightAt(x, z);
      this.effects.burst(new THREE.Vector3(x, ground + 0.3, z), 'dirt', 6);
      this.effects.burst(new THREE.Vector3(x, ground + 0.3, z), 'chip', 3);
      const o = { x, z, r: t.radius + 0.15, base: ground, h: t.radius * 1.8 };
      this.world.obstacles.push(o);
      this.fallenObstacles.push(o);
    }
  }
}
