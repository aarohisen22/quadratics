// The Shogun (将軍): the final boss, in the castle courtyard. Black-and-gold armor, a huge golden sun crest,
// a purple jinbaori and a tachi sword. Three phases:
//  1. Sword duel: quick jabs, slashes and chops. He blocks and leaps aside: hit him while he winds up.
//  2. Below 2/3 health: also DASHES (red streak: step aside) and calls his gunners: red LANES appear
//     across the ground, then a volley of shots rips along them. Get out of the lanes!
//  3. Below 1/3 health: enraged. Faster, and quicker to strike. He glows with anger.
import * as THREE from 'three';
import { Samurai } from './samurai.js';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';
import { buildJinbaori } from './daimyo.js';
import { groundMark, defend, updateDefense, maybeStartDash, startDash, updateDash } from './bossmoves.js';

function sunMon() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3d1a5c'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e8c050'; g.strokeStyle = '#e8c050'; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 5; i++) {   // five petals round a disc (an original crest)
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    g.beginPath(); g.ellipse(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22, 13, 8, a, 0, Math.PI * 2); g.fill();
  }
  g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Shogun extends Samurai {
  constructor(scene, world, cfg, x, z, toughness = 1, vineTop = 13) {
    super(scene, world, cfg, x, z, toughness, 0.8, 'samurai', vineTop);
    this.isBoss = true;
    this.bossName = '将軍  Shogun';
    this.speed = this.baseSpeed = cfg.speed;
    this.attacks = Object.fromEntries(Object.entries(cfg.attacks).map(([k, a]) => [k, { ...a }]));
    this.attackRange = cfg.attackRange;
    this.defense = cfg.defense;
    this.radius = 0.7;
    this.root.scale.setScalar(1.6);
    if (this.vine) this.vine.scale.set(2.5, 1, 2.5);
    this.phase = 1;
    this.onPhase = null;   // set by combat: tell the players

    // Black lacquer and bright gold.
    this.mats[0].color.set(0x2a2730);
    this.mats[2].color.set(0xf0c450);
    this.banner.visible = false;
    // A huge golden sun disc between tall golden horns.
    this.crest.clear();
    const gold = this.mats[2];
    for (const s of [-1, 1]) {
      const horn = part(new THREE.ConeGeometry(0.04, 0.6, 4), gold, s * 0.13, 0.32, 0);
      horn.scale.set(1, 1, 0.25);
      horn.rotation.z = -s * 0.5;
      this.crest.add(horn);
    }
    this.crest.add(part(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24).rotateX(Math.PI / 2), gold, 0, 0.2, 0.02));
    buildJinbaori(this.body, 0x3d1a5c, sunMon(), this.mats);
    // Tachi: a long, deeply curved sword.
    this.sword.remove(this.blade);
    this.blade = buildKatana(1.0);
    this.blade.position.set(0, -0.56, 0.02);
    this.blade.rotation.x = Math.PI / 2;
    this.blade.children[0].material = this.steel;
    this.sword.add(this.blade);

    this.streak = groundMark(scene, 'streak', 2.2);
    this.lanes = [];          // { mesh, x, z, dx, dz } while his gunners aim
    this.lanesCd = 3;
    this.dashCd = 3;
  }

  // Bullets hardly push him. He blocks and leaps aside when he isn't attacking.
  hit(amount, dirX, dirZ, interrupt = false, attacker = null) {
    if (!this.alive || this.state === 'descend') return false;
    if (defend(this, this.defense, dirX, dirZ, interrupt, attacker)) return false;
    const was = this.defense;
    this.defense = null;   // already checked above
    const r = super.hit(amount, dirX * 0.25, dirZ * 0.25, interrupt && this.attack !== 'lanes', attacker);
    this.defense = was;
    return r;
  }

  update(dt, players, others, smokes) {
    // Phases by health.
    const f = this.health / this.maxHealth;
    const want = f < 1 / 3 ? 3 : f < 2 / 3 ? 2 : 1;
    if (this.alive && want > this.phase) {
      this.phase = want;
      sfx.roar();
      if (want === 3) {   // enraged: faster and quicker to strike
        const E = this.cfg.enraged;
        this.speed = this.baseSpeed * E.speed;
        for (const a of Object.values(this.attacks)) a.windup *= E.windup;
        this.mats[0].emissive = new THREE.Color(0x400000);
        this.mats[0].userData.glow = true;
      }
      this.onPhase?.(want);
    }
    if (this.alive && this.phase >= 2) {
      maybeStartDash(this, players, this.attacks.dash);
      // Gunners: red lanes across the ground where he stands his men to fire.
      this.lanesCd -= dt;
      if (this.state === 'chase' && this.lanesCd <= 0) {
        const t = players.find(p => p.alive && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 20);
        if (t) this.startLanes(t);
      }
    }
    super.update(dt, players, others, smokes);
    updateDefense(this, dt);
    if (this.phase >= 2) updateDash(this, dt, players, this.attacks.dash);
    else this.streak.visible = false;
    // Lanes glow brighter as the volley comes.
    const L = this.attacks.lanes;
    for (const l of this.lanes) {
      const k = this.attack === 'lanes' && this.state === 'windup' ? 1 - Math.max(0, this.timer) / L.windup : 1;
      l.mesh.material.opacity = 0.15 + k * 0.4 + Math.sin(performance.now() / 50) * 0.07;
    }
    if (this.alive && this.attack === 'lanes' && this.state === 'windup') {
      this.sword.rotation.set(-2.9, 0, 0.1);   // tachi raised: the signal to fire
    }
    if (!this.alive || (this.attack !== 'lanes' && this.lanes.length)) this.clearLanes();
    // Enraged: a dark red glow that pulses.
    if (this.phase === 3 && this.alive) this.mats[0].emissive.setRGB(0.25 + Math.sin(performance.now() / 120) * 0.12, 0, 0);
  }

  // Three parallel red lanes, the middle one over the player, running the way the Shogun faces him.
  startLanes(target) {
    const L = this.attacks.lanes;
    this.attack = 'lanes';
    this.state = 'windup';
    this.timer = L.windup;
    this.lanesCd = L.cooldown;
    const ang = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z) + Math.PI / 2;   // across his line of sight
    const dx = Math.sin(ang), dz = Math.cos(ang);
    for (let i = 0; i < L.count; i++) {
      const off = (i - (L.count - 1) / 2) * (L.width + 1.8);
      const cx = target.pos.x + dz * off, cz = target.pos.z - dx * off;
      const mesh = groundMark(this.scene, 'streak', L.width);
      mesh.visible = true;
      mesh.rotation.y = ang;
      mesh.scale.z = L.length;
      const sx = cx - dx * L.length / 2, sz = cz - dz * L.length / 2;
      mesh.position.set(sx, this.world.heightAt(cx, cz) + 0.12, sz);
      this.lanes.push({ mesh, x: sx, z: sz, dx, dz });
    }
    sfx.matchFizz();
    sfx.fanSignal();
  }

  clearLanes() {
    for (const l of this.lanes) { this.scene.remove(l.mesh); l.mesh.geometry.dispose(); }
    this.lanes = [];
  }

  strikeHit(players, a) {
    if (a.dash) return startDash(this);
    if (this.attack === 'lanes') {
      // BANG: shots rip along every lane.
      const L = this.attacks.lanes;
      for (const l of this.lanes) {
        for (const p of players) {
          if (!p.alive || p.climb) continue;
          const ox = p.pos.x - l.x, oz = p.pos.z - l.z;
          const along = ox * l.dx + oz * l.dz, side = Math.abs(ox * l.dz - oz * l.dx);
          if (along > 0 && along < L.length && side < L.width / 2 + p.radius) {
            p.hurt(this.damage * L.damage);
            p.justHurt = true;
            sfx.hurt();
          }
        }
        if (this.effects) {
          const y = this.world.heightAt(l.x, l.z) + 1.2;
          this.effects.tracer(new THREE.Vector3(l.x, y, l.z), new THREE.Vector3(l.x + l.dx * L.length, y, l.z + l.dz * L.length));
          this.effects.smokeCloud(l.x, y - 1.2, l.z, 1.2, 1.5);
        }
      }
      sfx.teppo();
      setTimeout(() => sfx.teppo(), 90);
      this.clearLanes();
      return;
    }
    return super.strikeHit(players, a);
  }

  remove() {
    this.clearLanes();
    this.scene.remove(this.streak);
    super.remove();
  }
}
