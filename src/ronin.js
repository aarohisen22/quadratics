// The Twin-blade Ronin: the lesser boss (after levels 3, 8, 13...). A fast masterless samurai with a wide
// straw hat and a katana in each hand. Up close he jabs and slashes with both swords; from further away
// he crouches, a red streak shows his path along the ground, and then he DASHES through it.
// Step out of the streak! A shuriken while he's crouching cancels the dash.
import * as THREE from 'three';
import { Samurai } from './samurai.js';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';

export class Ronin extends Samurai {
  constructor(scene, world, cfg, x, z, appearance = 1, vineTop = 13) {
    super(scene, world, cfg, x, z, 1, 0.6, 'sword', vineTop);
    this.isBoss = true;
    this.bossName = 'Twin-blade Ronin';
    const k = appearance - 1;
    this.maxHealth = this.health = cfg.health * (1 + cfg.healthPerAppearance * k);
    this.damage = cfg.damage * (1 + cfg.damagePerAppearance * k);
    this.speed = cfg.speed;
    this.radius = 0.6;
    this.root.scale.setScalar(1.5);
    this.dashCd = 2;

    // Dark purple armor, and a wide straw hat over the helmet.
    this.mats[0].color.set(0x3a2450);
    const straw = new THREE.MeshStandardMaterial({ color: 0xc9a85c, roughness: 0.9 });
    this.mats.push(straw);
    const hat = part(new THREE.ConeGeometry(0.62, 0.32, 18, 1, true), straw, 0, 2.03, 0);
    hat.material.side = THREE.DoubleSide;
    this.body.add(hat);
    // Second katana in the left hand.
    const left = buildKatana(0.8);
    left.position.set(0, -0.56, 0.02);
    left.rotation.x = Math.PI / 2;
    this.leftArm.add(left);
    this.leftBlade = left;

    // Red streak on the ground showing where he'll dash.
    this.streak = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
    this.streak.renderOrder = 4;
    this.streak.visible = false;
    scene.add(this.streak);
  }

  // Bullets barely push him; a shuriken can still stop him mid wind-up.
  hit(amount, dirX, dirZ, interrupt = false) {
    return super.hit(amount, dirX * 0.3, dirZ * 0.3, interrupt);
  }

  update(dt, players, others, smokes) {
    this.dashCd -= dt;
    const D = this.cfg.attacks.dash;
    // From the middle distance, start a dash instead of walking up.
    if (this.state === 'chase' && this.dashCd <= 0) {
      const t = players.filter(p => p.alive && !p.perch && !p.climb)
        .map(p => ({ p, d: Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) }))
        .filter(o => o.d > D.minRange && o.d < D.maxRange && !this.world.inHideout(o.p.pos.x, o.p.pos.z))
        .sort((a, b) => a.d - b.d)[0];
      if (t) {
        const dx = t.p.pos.x - this.pos.x, dz = t.p.pos.z - this.pos.z;
        this.dashDir = { x: dx / t.d, z: dz / t.d };
        this.dashLen = t.d + 3;
        this.attack = 'dash';
        this.state = 'windup';
        this.timer = D.windup;
        this.dashCd = D.cooldown;
        sfx.katanaDraw();
      }
    }

    super.update(dt, players, others, smokes);

    const dashing = this.attack === 'dash' && this.alive;
    if (dashing && (this.state === 'windup' || this.state === 'strike')) {
      this.facing = Math.atan2(this.dashDir.x, this.dashDir.z);   // locked on his line
      this.root.rotation.y = this.facing;
    }
    // Crouched with both swords back while winding up; streak on the ground.
    const winding = dashing && this.state === 'windup';
    this.streak.visible = winding;
    if (winding) {
      const k = 1 - Math.max(0, this.timer) / D.windup;
      this.streak.position.set(this.pos.x, this.pos.y + 0.1, this.pos.z);
      this.streak.rotation.y = this.facing;
      this.streak.scale.z = this.dashLen;
      this.streak.material.opacity = 0.2 + k * 0.4 + Math.sin(performance.now() / 50) * 0.08;
      this.sword.rotation.set(0.7, 0, 0.3);
      this.leftArm.rotation.set(0.7, 0, -0.3);
      this.body.rotation.x = 0.35;
    }
    // The dash itself: fly along the line, cutting anyone on it (once each).
    if (dashing && this.state === 'strike' && this.dash) {
      const step = Math.min(D.speed * dt, this.dash.left);
      const bx = this.pos.x, bz = this.pos.z;
      this.pos.x += this.dashDir.x * step;
      this.pos.z += this.dashDir.z * step;
      this.world.resolveCollision(this.pos, this.radius, this.pos.y + 1);
      const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
      this.dash.left -= step;
      if (moved < step * 0.3) this.dash.left = 0;   // ran into something solid
      this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
      for (const p of players) {
        if (!p.alive || p.perch || p.climb || this.dash.hit.has(p)) continue;
        if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.1) {   // same width as the red streak
          this.dash.hit.add(p);
          p.hurt(this.damage * D.damage);
          p.justHurt = true;
          p.vel.x += this.dashDir.z * 6; p.vel.z -= this.dashDir.x * 6;   // knocked aside
          sfx.katanaHit?.(); sfx.hurt();
        }
      }
      this.sword.rotation.set(-1.5, 0, 0.5);
      this.leftArm.rotation.set(-1.5, 0, -0.5);
      this.body.rotation.x = 0.25;
      this.root.position.set(this.pos.x, this.pos.y, this.pos.z);
      if (this.dash.left <= 0) { this.timer = 0; this.dash = null; }
      if (this.effects && Math.random() < 0.5) this.effects.burst(new THREE.Vector3(bx, this.pos.y + 0.2, bz), 'dirt', 2);
    }
    // Twin swords: the left arm mirrors the right one during normal attacks.
    if (this.alive && this.attack !== 'dash' && (this.state === 'windup' || this.state === 'strike')) {
      this.leftArm.rotation.x = this.sword.rotation.x;
      this.leftArm.rotation.z = -this.sword.rotation.z;
    }
  }

  strikeHit(players, a) {
    if (!a.dash) return super.strikeHit(players, a);
    sfx.swing();
    this.dash = { left: this.dashLen, hit: new Set() };
    this.timer = 5;   // the dash ends itself when it has gone the whole way
  }

  remove() {
    this.scene.remove(this.streak);
    super.remove();
  }
}
