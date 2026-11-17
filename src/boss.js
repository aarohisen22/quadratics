// The Oni Warlord: a giant samurai in black-and-gold armor with a studded iron club (kanabo).
// He comes down a thick vine after every 5th level. He swings his club in a wide arc,
// slams the ground (a red ring shows where: get out of it!), and calls in help at half health.
// He's built on the samurai, so he walks, attacks, gets hit and falls the same way, just bigger.
import * as THREE from 'three';
import { Samurai, buildOniMask } from './samurai.js';
import { part } from './models.js';
import { sfx } from './sound.js';

// Kanabo: a long wooden club with iron bands and rows of iron studs. Handle at the hand, head up +y.
function buildClub(iron) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.7 });
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.04, 0.045, 0.36, 8), wood, 0, -0.05, 0));         // handle
  g.add(part(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8), iron, 0, -0.23, 0));        // pommel
  g.add(part(new THREE.CylinderGeometry(0.12, 0.07, 1.0, 10), wood, 0, 0.62, 0));           // head
  for (const y of [0.15, 1.1]) {
    const band = part(new THREE.TorusGeometry(y > 1 ? 0.12 : 0.072, 0.015, 5, 14), iron, 0, y, 0);
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }
  const stud = new THREE.ConeGeometry(0.022, 0.06, 5);
  for (let row = 0; row < 6; row++) {
    const y = 0.28 + row * 0.15, r = 0.075 + (y - 0.12) * 0.05;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + row * 0.45;
      const s = part(stud, iron, Math.cos(a) * r, y, Math.sin(a) * r);
      s.rotation.z = -Math.PI / 2;
      s.rotation.y = -a;
      s.castShadow = false;
      g.add(s);
    }
  }
  g.userData.wood = wood;
  return g;
}

export class Boss extends Samurai {
  // appearance: 1 the first time (after level 5), 2 after level 10, and so on.
  constructor(scene, world, cfg, x, z, appearance = 1, vineTop = 13) {
    super(scene, world, cfg, x, z, 1, 0.8, 'sword', vineTop);
    this.isBoss = true;
    this.bossName = 'Oni Warlord';
    const k = appearance - 1;
    this.maxHealth = this.health = cfg.health * (1 + cfg.healthPerAppearance * k);
    this.damage = cfg.damage * (1 + cfg.damagePerAppearance * k);
    this.speed = cfg.speed;
    this.radius = 1.0;
    this.root.scale.setScalar(2.3);
    this.vine.scale.set(3, 1, 3);   // a thick vine for a heavy warlord

    // Dark blood-red armor with gold trim; the iron of his club glows red before a slam.
    this.mats[0].color.set(0x5a1212);
    this.mats[2].color.set(0xd4a440);
    // He wears a carved Oni demon mask instead of the plain iron face guard, and no helmet crest.
    this.mask.parent.remove(this.mask);
    this.crest.visible = false;
    const oni = new THREE.MeshStandardMaterial({ color: 0x7a1a12, roughness: 0.35, metalness: 0.1 });
    this.mats.push(oni);
    this.mask = buildOniMask({ oni, dark: this.mats[1], gold: this.mats[2] });
    this.mask.position.set(0, 1.71, 0.02);
    this.body.add(this.mask);
    this.sword.remove(this.blade);
    const club = buildClub(this.steel);
    club.position.set(0, -0.56, 0.02);
    club.rotation.x = Math.PI / 2;
    this.sword.add(club);
    this.blade = club;
    this.mats.push(club.userData.wood);

    // Red ring on the ground showing where the slam will land.
    const r = cfg.attacks.chop.radius;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
    this.ringFill = new THREE.Mesh(new THREE.CircleGeometry(r - 0.35, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.renderOrder = this.ringFill.renderOrder = 4;
    this.ring.visible = this.ringFill.visible = false;
    scene.add(this.ring, this.ringFill);

    this.summoned = false;
    this.landed = false;
    this.onSummon = null;   // set by combat: call in more samurai
    this.onShake = null;    // set by combat: shake the camera
  }

  // Bullets and shurikens hurt him but barely push him, and can't stop his attacks.
  hit(amount, dirX, dirZ) {
    return super.hit(amount, dirX * 0.15, dirZ * 0.15, false);
  }

  slamCenter() {
    return { x: this.pos.x + Math.sin(this.facing) * 1.8, z: this.pos.z + Math.cos(this.facing) * 1.8 };
  }

  update(dt, players, others, smokes) {
    const wasDescending = this.state === 'descend';
    super.update(dt, players, others, smokes);
    if (wasDescending && this.state !== 'descend') {   // just landed: roar and shake the ground
      sfx.roar();
      this.onShake?.(0.8);
    }
    if (!this.summoned && this.alive && this.health < this.maxHealth / 2) {
      this.summoned = true;
      sfx.roar();
      this.onSummon?.(this);
    }

    const slamming = this.alive && this.state === 'windup' && this.attack === 'chop';
    this.ring.visible = this.ringFill.visible = slamming;
    if (slamming) {
      const c = this.slamCenter(), y = this.world.heightAt(c.x, c.z) + 0.12;
      const k = 1 - Math.max(0, this.timer) / this.cfg.attacks.chop.windup;
      this.ring.position.set(c.x, y, c.z);
      this.ringFill.position.set(c.x, y, c.z);
      this.ring.material.opacity = 0.45 + Math.sin(performance.now() / 70) * 0.25;
      this.ringFill.material.opacity = 0.08 + k * 0.25;
    }
  }

  // The slam hits everyone inside the ring, wherever they face; the swing works like a samurai's.
  strikeHit(players, a) {
    if (!a.slam) return super.strikeHit(players, a);
    const c = this.slamCenter();
    for (const p of players) {
      if (!p.alive || p.perch || p.climb) continue;
      const dx = p.pos.x - c.x, dz = p.pos.z - c.z, d = Math.hypot(dx, dz);
      if (d < a.radius) {
        p.hurt(this.damage * a.damage);
        p.justHurt = true;
        p.vel.x += (dx / (d || 1)) * 8; p.vel.z += (dz / (d || 1)) * 8;   // knocked back
        sfx.hurt();
      }
    }
    if (this.effects) {
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const x = c.x + Math.cos(ang) * a.radius * 0.7, z = c.z + Math.sin(ang) * a.radius * 0.7;
        this.effects.burst(new THREE.Vector3(x, this.world.heightAt(x, z) + 0.2, z), 'dirt', 5);
      }
    }
    sfx.treeCrash();
    this.onShake?.(0.9);
  }

  remove() {
    this.scene.remove(this.ring, this.ringFill);
    super.remove();
  }
}
