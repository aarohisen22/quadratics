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
    this.dodgeCd = 0;
    this.dodge = null;   // leaping aside: { x, z, t, len }
    this.blockT = 0;     // swords raised to block

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
  // When he isn't attacking he blocks with his swords, parries the katana, or leaps aside.
  hit(amount, dirX, dirZ, interrupt = false, attacker = null) {
    if (!this.alive || this.state === 'descend') return false;
    if (this.dodge) return false;   // mid-leap: nothing touches him
    const D = this.cfg.defense;
    const busy = this.state === 'windup' || this.state === 'strike';   // the moment to hit him
    if (D && !busy) {
      const len = Math.hypot(dirX, dirZ) || 1;
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      const facing = (-dirX * fx - dirZ * fz) / len > Math.cos((D.blockArcDegrees / 2) * Math.PI / 180);
      const close = attacker && Math.hypot(attacker.pos.x - this.pos.x, attacker.pos.z - this.pos.z) < 3.5;
      const melee = interrupt && close, thrown = interrupt && !close;
      const r = Math.random();
      if (facing && (melee ? r < D.katanaParry : thrown ? r < D.shurikenBlock : r < D.blockChance)) {
        this.block(melee);
        return false;
      }
      if (this.dodgeCd <= 0 && Math.random() < D.dodgeChance) {
        this.startDodge(dirX / len, dirZ / len);
        return false;
      }
    }
    return super.hit(amount, dirX * 0.3, dirZ * 0.3, interrupt);
  }

  // Swords up: sparks, a ring of steel, and after a katana parry a quick counter-jab.
  block(melee) {
    this.blockT = 0.18;
    sfx.parry();
    if (this.effects) {
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      this.effects.burst(new THREE.Vector3(this.pos.x + fx * 0.9, this.pos.y + 1.9, this.pos.z + fz * 0.9), 'spark', 8, { x: fx, z: fz });
    }
    if (melee && this.state !== 'recover') {
      this.attack = 'jab';
      this.state = 'windup';
      this.timer = this.cfg.attacks.jab.windup * 0.6;   // the counter comes fast
    }
  }

  // Leap sideways out of the line of fire.
  startDodge(dx, dz) {
    const D = this.cfg.defense;
    const side = Math.random() < 0.5 ? 1 : -1;
    this.dodge = { x: -dz * side, z: dx * side, t: 0, len: D.dodgeDistance };
    this.dodgeCd = D.dodgeCooldown;
    this.dashCd = Math.min(this.dashCd, 0.4);   // and he may come straight back at you with a dash
    sfx.swing();
  }

  update(dt, players, others, smokes) {
    this.dashCd -= dt;
    const D = this.cfg.attacks.dash;
    // From the middle distance, start a dash instead of walking up.
    if (this.state === 'chase' && this.dashCd <= 0) {
      const t = players.filter(p => p.alive && !p.perch && !p.climb)
        .map(p => ({ p, d: Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) }))
        .filter(o => o.d > D.minRange && o.d < D.maxRange && (o.p.revealed > 0 || !this.world.inHideout(o.p.pos.x, o.p.pos.z)))
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

    this.dodgeCd -= dt;
    this.blockT -= dt;
    super.update(dt, players, others, smokes);

    // Leaping aside: a fast low hop, body leaning away.
    if (this.dodge && this.alive) {
      const D = this.cfg.defense, d = this.dodge;
      const step = (d.len / D.dodgeSeconds) * dt;
      d.t += dt;
      this.pos.x += d.x * step; this.pos.z += d.z * step;
      this.world.resolveCollision(this.pos, this.radius, this.pos.y + 1);
      const k = Math.min(1, d.t / D.dodgeSeconds);
      this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
      this.root.position.set(this.pos.x, this.pos.y + Math.sin(k * Math.PI) * 0.6, this.pos.z);
      // lean away from the way he's going (sideways relative to his facing)
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      const side = d.x * fz - d.z * fx;
      this.body.rotation.z = Math.sin(k * Math.PI) * 0.45 * Math.sign(side);
      if (this.effects && Math.random() < 0.4) this.effects.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.1, this.pos.z), 'dirt', 2);
      if (d.t >= D.dodgeSeconds) { this.dodge = null; this.body.rotation.z = 0; }
    }
    // Blocking: both swords crossed up in front.
    if (this.blockT > 0 && this.alive && this.state !== 'windup' && this.state !== 'strike') {
      this.sword.rotation.set(-1.9, 0, 0.7);
      this.leftArm.rotation.set(-1.9, 0, -0.7);
    }

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
