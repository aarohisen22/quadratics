// The Daimyo (大名): a great lord, boss of the maple valley. Big and slow, in dark blue armor with a red
// jinbaori surcoat bearing his crest, a huge gilded crescent on his helmet, a long nodachi sword and a
// gunbai war fan in his other hand.
//  - Raises his fan: archers he commands send VOLLEYS of arrows. Red circles on the ground show where: get out!
//  - Great sword: wide sweeps, and a ground SLAM (red ring).
//  - At half health he calls his hatamoto bodyguards.
import * as THREE from 'three';
import { Samurai } from './samurai.js';
import { part, buildKatana } from './models.js';
import { buildArrow } from './samurai.js';
import { sfx } from './sound.js';
import { groundMark, updateSlamRing, slamHit } from './bossmoves.js';

// A crest (mon) picture: white on a colored disc, used on his surcoat and fan.
function monTexture(bg, fg, kind = 'crane') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 7;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  if (kind === 'crane') {   // three diamonds in a triangle (an original crest)
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * 2.094, x = 64 + Math.cos(a) * 20, y = 66 + Math.sin(a) * 20;
      g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x + 12, y); g.lineTo(x, y + 15); g.lineTo(x - 12, y); g.closePath(); g.fill();
    }
  } else {   // a rising sun with rays
    g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath(); g.moveTo(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); g.lineTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A jinbaori: sleeveless surcoat worn over the armor, open at the front, crest on the back.
export function buildJinbaori(body, color, crestTex, mats) {
  const wool = new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide });
  mats.push(wool);
  const coat = part(new THREE.CylinderGeometry(0.33, 0.44, 0.95, 18, 1, true, 0.55, Math.PI * 2 - 1.1), wool, 0, 1.02, -0.01);
  coat.rotation.y = Math.PI;   // the gap at the front
  coat.scale.set(1, 1, 0.85);
  body.add(coat);
  for (const s of [-1, 1]) {   // stiff shoulders
    const sh = part(new THREE.BoxGeometry(0.2, 0.05, 0.36), wool, s * 0.3, 1.5, -0.01);
    sh.rotation.z = s * 0.2;
    body.add(sh);
  }
  const monMat = new THREE.MeshStandardMaterial({ map: crestTex, roughness: 0.9, transparent: true });
  mats.push(monMat);
  const mon = part(new THREE.CircleGeometry(0.17, 24), monMat, 0, 1.22, -0.39);
  mon.rotation.y = Math.PI;
  body.add(mon);
  return coat;
}

export class Daimyo extends Samurai {
  constructor(scene, world, cfg, x, z, toughness = 1, vineTop = 13) {
    super(scene, world, cfg, x, z, toughness, 0.8, 'samurai', vineTop);
    this.isBoss = true;
    this.bossName = '大名  Daimyo';
    this.speed = cfg.speed;
    this.attacks = cfg.attacks;
    this.attackRange = cfg.attackRange;
    this.radius = 0.8;
    this.root.scale.setScalar(1.75);
    if (this.vine) this.vine.scale.set(2.5, 1, 2.5);

    // Dark blue lacing, bright gold, no back banner (his bannermen carry those).
    this.mats[0].color.set(0x22306a);
    this.mats[2].color.set(0xe2b347);
    this.banner.visible = false;
    // A huge gilded crescent and sun on the helmet instead of the plain horns.
    this.crest.clear();
    const gold = this.mats[2];
    const moon = part(new THREE.TorusGeometry(0.26, 0.035, 6, 24, Math.PI * 1.1), gold, 0, 0.26, 0);
    moon.rotation.z = -Math.PI * 0.05;
    this.crest.add(moon);
    this.crest.add(part(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16).rotateX(Math.PI / 2), gold, 0, 0.1, 0.01));
    buildJinbaori(this.body, 0x9a1c1c, monTexture('#9a1c1c', '#f2ede0', 'crane'), this.mats);
    // Nodachi: a very long sword.
    this.sword.remove(this.blade);
    this.blade = buildKatana(1.25);
    this.blade.position.set(0, -0.56, 0.02);
    this.blade.rotation.x = Math.PI / 2;
    this.blade.children[0].material = this.steel;
    this.sword.add(this.blade);
    // Gunbai war fan in the left hand.
    const fan = new THREE.Group();
    fan.position.set(0, -0.58, 0.05);
    fan.add(part(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), this.mats[1], 0, -0.1, 0));
    const faceMat = new THREE.MeshStandardMaterial({ map: monTexture('#141210', '#d8b04a', 'sun'), roughness: 0.4, side: THREE.DoubleSide });
    this.mats.push(faceMat);
    const face = part(new THREE.CircleGeometry(0.2, 24), faceMat, 0, -0.42, 0);
    face.rotation.y = Math.PI / 2;
    fan.add(face);
    this.leftArm.add(fan);
    this.fan = fan;

    // Warning marks.
    this.ring = groundMark(scene, 'ring', cfg.attacks.chop.radius);
    this.ringFill = groundMark(scene, 'disc', cfg.attacks.chop.radius - 0.35);
    this.marks = [];          // arrow volley circles: { mesh, x, z, t }
    this.falling = [];        // arrows dropping out of the sky
    this.volleyCd = 4;
    this.summoned = false;
    this.onSummon = null;     // set by combat: call in hatamoto
    this.onShake = null;
  }

  // Bullets barely push him and can't stop his attacks.
  hit(amount, dirX, dirZ, interrupt = false, attacker = null) {
    return super.hit(amount, dirX * 0.15, dirZ * 0.15, false, attacker);
  }

  update(dt, players, others, smokes) {
    const V = this.attacks.volley;
    this.volleyCd -= dt;
    // Raise the fan: a volley is coming (if anyone is in sight, not too close).
    if (this.alive && this.state === 'chase' && this.volleyCd <= 0) {
      const seen = players.filter(p => p.alive && (!this.leash || Math.hypot(p.pos.x - this.leash.x, p.pos.z - this.leash.z) < this.leash.r)
        && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 24);
      if (seen.length) {
        this.attack = 'volley';
        this.state = 'windup';
        this.timer = V.windup;
        this.volleyCd = V.cooldown;
        sfx.fanSignal();
      }
    }
    const wasDescending = this.state === 'descend';
    super.update(dt, players, others, smokes);
    if (wasDescending && this.state !== 'descend') { sfx.roar(); this.onShake?.(0.8); }
    if (!this.summoned && this.alive && this.health < this.maxHealth / 2) {
      this.summoned = true;
      sfx.taiko();
      this.onSummon?.(this);
    }
    // Fan raised high while signalling.
    if (this.alive && this.attack === 'volley' && this.state === 'windup') {
      this.leftArm.rotation.x = -2.9;
      this.leftArm.rotation.z = -0.2 + Math.sin(performance.now() / 90) * 0.15;
    }
    updateSlamRing(this, this.ring, this.ringFill, this.attacks.chop);
    this.updateVolley(dt, players);
  }

  strikeHit(players, a) {
    if (a.slam) return slamHit(this, players, a);
    if (this.attack === 'volley') return this.launchVolley(players);
    return super.strikeHit(players, a);
  }

  // Red circles appear on and around the brothers; the arrows land on them a moment later.
  launchVolley(players) {
    const V = this.attacks.volley;
    const alive = players.filter(p => p.alive);
    if (!alive.length) return;
    for (let i = 0; i < V.circles; i++) {
      const p = alive[i % alive.length];
      const spread = i < alive.length ? 0 : 2.5 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      const x = p.pos.x + Math.cos(a) * spread, z = p.pos.z + Math.sin(a) * spread;
      const mesh = groundMark(this.scene, 'disc', V.radius);
      mesh.visible = true;
      mesh.position.set(x, this.world.heightAt(x, z) + 0.1, z);
      this.marks.push({ mesh, x, z, t: V.delay });
    }
    sfx.arrowRain();
  }

  updateVolley(dt, players) {
    const V = this.attacks.volley;
    for (const m of this.marks) {
      m.t -= dt;
      const k = 1 - Math.max(0, m.t) / V.delay;
      m.mesh.material.opacity = 0.15 + k * 0.35 + Math.sin(performance.now() / 60) * 0.08;
      if (m.t <= 0 && !m.done) {
        m.done = true;
        for (const p of players) {
          if (!p.alive || p.climb) continue;
          if (Math.hypot(p.pos.x - m.x, p.pos.z - m.z) < V.radius) {
            p.hurt(this.damage * V.damage);
            p.justHurt = true;
            sfx.hurt();
          }
        }
        // Arrows thud into the ground all over the circle.
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * V.radius;
          const x = m.x + Math.cos(a) * r, z = m.z + Math.sin(a) * r;
          const arrow = buildArrow();
          arrow.rotation.x = Math.PI / 2 - 0.25;   // pointing down
          arrow.rotation.y = Math.random() * 6;
          arrow.position.set(x, this.world.heightAt(x, z) + 6 + Math.random() * 3, z);
          this.scene.add(arrow);
          this.falling.push({ arrow, ground: this.world.heightAt(x, z) + 0.3, life: 2.5 });
        }
        sfx.arrowThunk();
      }
    }
    this.marks = this.marks.filter(m => {
      if (m.t < -0.3) { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); return false; }
      return true;
    });
    for (const f of this.falling) {
      if (f.arrow.position.y > f.ground) f.arrow.position.y = Math.max(f.ground, f.arrow.position.y - 40 * dt);
      f.life -= dt;
      if (f.life <= 0) this.scene.remove(f.arrow);
    }
    this.falling = this.falling.filter(f => f.life > 0);
  }

  remove() {
    this.scene.remove(this.ring, this.ringFill);
    for (const m of this.marks) this.scene.remove(m.mesh);
    for (const f of this.falling) this.scene.remove(f.arrow);
    super.remove();
  }
}
