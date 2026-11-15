// Samurai enemies: they chase the nearest ninja, raise their katana, then strike.
import * as THREE from 'three';
import { part } from './ninja.js';
import { sfx } from './sound.js';

function buildSamurai() {
  // Each samurai gets its own materials so it can flash and fade on its own.
  const mats = {
    armor: new THREE.MeshStandardMaterial({ color: 0x6a1515, roughness: 0.35, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x17161a, roughness: 0.5, metalness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.35, metalness: 0.8 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x2a2730, roughness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd0d6dc, roughness: 0.15, metalness: 0.95 }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const chest = part(new THREE.CapsuleGeometry(0.24, 0.38, 4, 10), mats.armor, 0, 1.3, 0);
  chest.scale.set(1.25, 1, 0.85);
  body.add(chest);
  // Armored skirt plates.
  const skirt = part(new THREE.CylinderGeometry(0.3, 0.42, 0.42, 8, 1, true), mats.armor, 0, 0.9, 0);
  body.add(skirt);
  const belt = part(new THREE.TorusGeometry(0.27, 0.03, 6, 16), mats.gold, 0, 1.08, 0);
  belt.rotation.x = Math.PI / 2;
  body.add(belt);

  // Helmet, face mask and golden crest.
  body.add(part(new THREE.SphereGeometry(0.18, 14, 10), mats.cloth, 0, 1.73, 0));
  body.add(part(new THREE.BoxGeometry(0.24, 0.13, 0.08), mats.dark, 0, 1.68, 0.14)); // face mask
  const helmet = part(new THREE.SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.dark, 0, 1.76, 0);
  body.add(helmet);
  const brim = part(new THREE.CylinderGeometry(0.34, 0.38, 0.04, 14), mats.dark, 0, 1.76, -0.03);
  brim.rotation.x = 0.25;
  body.add(brim);
  const crest = part(new THREE.TorusGeometry(0.16, 0.025, 4, 12, Math.PI), mats.gold, 0, 1.92, 0.12);
  crest.rotation.z = 0;
  body.add(crest);

  // Big shoulder plates.
  for (const side of [-1, 1]) {
    const plate = part(new THREE.BoxGeometry(0.22, 0.28, 0.3), mats.armor, side * 0.38, 1.45, 0);
    plate.rotation.z = side * 0.35;
    body.add(plate);
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.14, 0.95, 0);
    hip.add(part(new THREE.CapsuleGeometry(0.1, 0.6, 4, 8), mats.cloth, 0, -0.42, 0));
    hip.add(part(new THREE.BoxGeometry(0.14, 0.08, 0.28), mats.dark, 0, -0.9, 0.05));
    body.add(hip); legs.push(hip);
  }

  // Right arm holds the katana.
  const shoulder = new THREE.Group(); shoulder.position.set(0.3, 1.48, 0);
  shoulder.add(part(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), mats.cloth, 0, -0.28, 0));
  const katana = new THREE.Group();
  katana.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 6), mats.dark, 0, 0, 0));           // handle
  katana.add(part(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 10), mats.gold, 0, 0.14, 0));        // guard
  const blade = part(new THREE.BoxGeometry(0.035, 0.95, 0.012), mats.steel, 0, 0.62, 0);
  blade.rotation.z = 0.04;
  katana.add(blade);
  katana.position.set(0, -0.58, 0.02);
  katana.rotation.x = Math.PI / 2;
  shoulder.add(katana);
  body.add(shoulder);
  const leftArm = new THREE.Group(); leftArm.position.set(-0.3, 1.48, 0);
  leftArm.add(part(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), mats.cloth, 0, -0.28, 0));
  body.add(leftArm);

  return { root, body, legs, sword: shoulder, leftArm, mats: Object.values(mats) };
}

export class Samurai {
  constructor(scene, world, cfg, x, z, toughness = 1) {
    this.scene = scene;
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.45;
    this.maxHealth = cfg.health * toughness;
    this.health = this.maxHealth;
    this.damage = cfg.damage * toughness;
    this.speed = cfg.speed * (0.9 + Math.random() * 0.2);
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.knock = new THREE.Vector2();
    this.facing = Math.random() * Math.PI * 2;
    this.state = 'chase';
    this.timer = 0;
    this.flash = 0;
    this.walkPhase = Math.random() * 6;
    this.gone = false;
    Object.assign(this, buildSamurai());
    this.root.position.copy(this.pos);
    scene.add(this.root);
  }

  get alive() { return this.state !== 'dead'; }

  // Returns true if this hit defeated him.
  hit(amount, dirX, dirZ, interrupt = false) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flash = 0.08;
    this.knock.x += dirX * (interrupt ? 6 : 1.5);
    this.knock.y += dirZ * (interrupt ? 6 : 1.5);
    if (interrupt && this.state === 'windup') { this.state = 'recover'; this.timer = 0.5; }
    if (this.health <= 0) {
      this.state = 'dead';
      this.timer = 0;
      this.fallDir = Math.random() < 0.5 ? -1 : 1;
      sfx.enemyDown();
      return true;
    }
    return false;
  }

  update(dt, players, others) {
    this.flash -= dt;
    const glow = this.flash > 0 ? 1 : 0;
    for (const m of this.mats) m.emissive.setScalar(glow * 0.8);

    if (this.state === 'dead') return this.updateDead(dt);

    // Find the closest ninja who is still standing.
    let target = null, best = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < best) { best = d; target = p; }
    }

    let moveX = 0, moveZ = 0;
    if (target) {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      const turnRate = this.state === 'chase' ? 10 : 3;
      this.facing += diff * (1 - Math.exp(-turnRate * dt));

      this.timer -= dt;
      if (this.state === 'chase') {
        if (best > this.cfg.attackRange) { moveX = dx / best; moveZ = dz / best; }
        else { this.state = 'windup'; this.timer = this.cfg.windupSeconds; }
      } else if (this.state === 'windup' && this.timer <= 0) {
        this.state = 'strike'; this.timer = 0.18;
        sfx.swing();
        // Damage anyone in front of him and in reach.
        for (const p of players) {
          if (!p.alive) continue;
          const px = p.pos.x - this.pos.x, pz = p.pos.z - this.pos.z;
          const d = Math.hypot(px, pz);
          const facingDot = (px * Math.sin(this.facing) + pz * Math.cos(this.facing)) / (d || 1);
          if (d < this.cfg.attackRange + 0.5 && facingDot > 0.3) {
            p.hurt(this.damage);
            p.justHurt = true;
            sfx.hurt();
          }
        }
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = 0.55;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    }

    // Keep a little space from other samurai and from the ninjas.
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < 1.1) { moveX += (dx / d) * (1.1 - d) * 2; moveZ += (dz / d) * (1.1 - d) * 2; }
    }

    this.pos.x += (moveX * this.speed + this.knock.x) * dt;
    this.pos.z += (moveZ * this.speed + this.knock.y) * dt;
    this.knock.multiplyScalar(Math.exp(-8 * dt));
    for (const p of players) {
      if (!p.alive) continue;
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz), min = this.radius + p.radius;
      if (d > 0 && d < min) { this.pos.x = p.pos.x + dx / d * min; this.pos.z = p.pos.z + dz / d * min; }
    }
    this.world.resolveCollision(this.pos, this.radius, this.pos.y);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);

    this.animate(dt, Math.hypot(moveX, moveZ) > 0.1);
  }

  animate(dt, walking) {
    const k = walking ? 1 : 0;
    this.walkPhase += dt * 8;
    const swing = Math.sin(this.walkPhase) * 0.6 * k;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.6;
    this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.05 * k;

    // Sword arm: ready, raised high, slashing down, then recovering.
    const poses = { chase: -0.9, windup: -2.9, strike: -0.4, recover: -0.7 };
    const want = poses[this.state] ?? -0.9;
    const speed = this.state === 'strike' ? 40 : 10;
    this.sword.rotation.x += (want - this.sword.rotation.x) * (1 - Math.exp(-speed * dt));

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }

  // Falls over, then sinks and fades away.
  updateDead(dt) {
    this.timer += dt;
    const fall = Math.min(1, this.timer * 2.2);
    this.root.rotation.z = this.fallDir * fall * Math.PI / 2 * 0.95;
    this.pos.x += this.knock.x * dt; this.pos.z += this.knock.y * dt;
    this.knock.multiplyScalar(Math.exp(-6 * dt));
    this.root.position.set(this.pos.x, this.world.heightAt(this.pos.x, this.pos.z) + 0.15 * fall, this.pos.z);
    if (this.timer > 1.5) {
      const fade = Math.max(0, 1 - (this.timer - 1.5) / 1.2);
      for (const m of this.mats) { m.transparent = true; m.opacity = fade; }
      this.root.position.y -= (1 - fade) * 0.4;
      if (fade === 0) this.remove();
    }
  }

  remove() {
    this.gone = true;
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
}
