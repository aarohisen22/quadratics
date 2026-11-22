// The Shogun (将軍): the final boss, in the castle courtyard. Black-and-gold armor, a huge golden sun crest,
// a purple jinbaori and a tachi sword. Three phases:
//  1. Sword duel: quick jabs, slashes and chops. He blocks and leaps aside: hit him while he winds up.
//  2. Below 2/3 health: also DASHES (red streak: step aside) and calls his gunners: kneeling gunners
//     appear at the edge of the fight, each aiming a glowing red beam (and a red lane on the ground)
//     across it. The beams blink just before the volley rips along them. Get out of the lanes!
//  3. Below 1/3 health: enraged. Faster, and quicker to strike. He glows with anger.
import * as THREE from 'three';
import { Samurai, buildSamurai } from './samurai.js';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';
import { dressBoss } from './bossarmor.js';
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
    // White silk lacing on black plates, bright gold, a purple surcoat with his golden crest.
    dressBoss(this, { lace: 0xe6ded0, coat: 0x4a2270, gold: 0xf0c450, goldCss: '#e8bf4c', cord: 0x7a3db0, crest: sunMon() });
    // Tachi: a long, deeply curved sword.
    this.sword.remove(this.blade);
    this.blade = buildKatana(1.0);
    this.blade.position.set(0, -0.56, 0.02);
    this.blade.rotation.x = Math.PI / 2;
    this.blade.children[0].material = this.steel;
    this.sword.add(this.blade);

    this.streak = groundMark(scene, 'streak', 2.2);
    this.lanes = [];          // { mesh, x, z, dx, dz, gunner, beam, glow, muzzle } while his gunners aim
    this.leaving = [];        // gunners who just fired: { root, t }, gone in a puff of smoke
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
        for (const m of this.lacedMats) { m.emissive = new THREE.Color(0x400000); m.userData.glow = true; }
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
    // Lanes and aim beams glow brighter as the volley comes, and blink in the last moment.
    const L = this.attacks.lanes;
    for (const l of this.lanes) {
      const left = this.attack === 'lanes' && this.state === 'windup' ? Math.max(0, this.timer) : 0;
      const k = 1 - left / L.windup;
      const blink = left < 0.45 ? (Math.sin(performance.now() / 30) > 0 ? 1 : 0.25) : 1;
      l.mesh.material.opacity = (0.2 + k * 0.45 + Math.sin(performance.now() / 50) * 0.07) * blink;
      l.beam.material.opacity = (0.45 + k * 0.5) * blink;
      l.glow.material.opacity = (0.12 + k * 0.3) * blink;
      l.glow.scale.x = l.glow.scale.y = 1 + k * 0.6;
      l.spark.scale.setScalar(1 + k * 0.8 + Math.sin(performance.now() / 40) * 0.25);
    }
    for (const g of this.leaving) {
      g.t -= dt;
      if (g.t <= 0) this.removeGunner(g.root, true);
    }
    this.leaving = this.leaving.filter(g => g.t > 0);
    if (this.alive && this.attack === 'lanes' && this.state === 'windup') {
      this.sword.rotation.set(-2.9, 0, 0.1);   // tachi raised: the signal to fire
    }
    if (!this.alive || (this.attack !== 'lanes' && this.lanes.length)) this.clearLanes();
    // Enraged: a dark red glow that pulses.
    if (this.phase === 3 && this.alive) for (const m of this.lacedMats) m.emissive.setRGB(0.25 + Math.sin(performance.now() / 120) * 0.12, 0, 0);
  }

  // Three parallel red lanes, the middle one over the player, running the way the Shogun faces him.
  // A gunner kneels at the start of each lane, aiming a glowing red beam along it, so you can see
  // where the shots will come from (in first person too, where the ground lanes are hard to see).
  startLanes(target) {
    const L = this.attacks.lanes;
    this.attack = 'lanes';
    this.state = 'windup';
    this.timer = L.windup;
    this.lanesCd = L.cooldown;
    const ang = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z) + Math.PI / 2;   // across his line of sight
    const dx = Math.sin(ang), dz = Math.cos(ang);
    // The gunners stand on whichever side is more level with the player (not behind a hill), so you can see them.
    const hillAt = sd => {
      const x = target.pos.x - dx * sd * L.length / 2, z = target.pos.z - dz * sd * L.length / 2;
      return Math.abs(this.world.heightAt(x, z) - target.pos.y) + (this.world.blocked(x, z, 1) ? 2 : 0) + Math.random() * 0.5;
    };
    const side = hillAt(1) <= hillAt(-1) ? 1 : -1;
    const fdx = dx * side, fdz = dz * side;
    for (let i = 0; i < L.count; i++) {
      const off = (i - (L.count - 1) / 2) * (L.width + 1.8);
      const cx = target.pos.x + dz * off, cz = target.pos.z - dx * off;
      const sx = cx - fdx * L.length / 2, sz = cz - fdz * L.length / 2;
      const mesh = this.laneMesh(sx, sz, fdx, fdz, L.width, L.length);
      this.lanes.push({ mesh, x: sx, z: sz, dx: fdx, dz: fdz, ...this.makeGunner(sx - fdx * 1.2, sz - fdz * 1.2, fdx, fdz, L.length + 1.2) });
    }
    sfx.matchFizz();
    sfx.fanSignal();
  }

  // A red lane lying on the ground (following the hills, so it never floats or sinks in).
  laneMesh(sx, sz, dx, dz, width, length) {
    const segs = Math.ceil(length / 0.75);
    const geo = new THREE.PlaneGeometry(width, length, 2, segs);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const across = pos.getX(i), along = pos.getY(i) + length / 2;   // plane x = across, plane y = along
      const x = sx + dx * along + dz * across, z = sz + dz * along - dx * across;
      pos.setXYZ(i, x, Math.max(this.world.groundY(x, z), this.world.heightAt(x, z)) + 0.1, z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    mesh.renderOrder = 4;
    this.scene.add(mesh);
    return mesh;
  }

  // One of his gunners, kneeling and aiming along (dx, dz), and the beam showing his line of fire.
  makeGunner(x, z, dx, dz, length) {
    const f = buildSamurai('teppo');
    const y = this.world.heightAt(x, z);
    f.root.scale.setScalar(1.15);
    f.root.position.set(x, y - 0.25, z);
    f.root.rotation.y = Math.atan2(dx, dz);
    f.legs[0].rotation.x = -1.0;   // one knee up, the other leg back: kneeling to fire
    f.legs[1].rotation.x = 0.7;
    f.body.rotation.y = -0.35;
    f.sword.rotation.set(-1.45, 0, -0.3);
    f.leftArm.rotation.set(-1.55, 0, 0.35);
    this.scene.add(f.root);
    if (this.effects) this.effects.burst(new THREE.Vector3(x, y + 0.3, z), 'dirt', 8);
    // The beam: a thin bright core and a soft glow round it, from the muzzle along the lane.
    const muzzle = new THREE.Vector3(x + dx * 0.9, y + 0.95, z + dz * 0.9);
    const ex = x + dx * length, ez = z + dz * length;
    const end = new THREE.Vector3(ex, this.world.heightAt(ex, ez) + 0.95, ez);
    const len = muzzle.distanceTo(end);
    const ray = (r, opacity) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.position.copy(muzzle);
      m.lookAt(end);
      m.scale.z = len;
      m.renderOrder = 5;
      this.scene.add(m);
      return m;
    };
    // A bright spark at the muzzle (the burning match), so you can spot where each shot comes from.
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    spark.position.set(0, 0.95 / 1.15 + 0.25 / 1.15, 0.9 / 1.15);
    f.root.add(spark);
    return { gunner: f.root, spark, beam: ray(0.02, 0.5), glow: ray(0.055, 0.15), muzzle, end };
  }

  removeGunner(root, puff) {
    if (puff && this.effects) this.effects.smokeCloud(root.position.x, root.position.y + 0.6, root.position.z, 0.9, 1.2);
    this.scene.remove(root);
    root.traverse(o => o.geometry?.dispose());
  }

  // Lanes and beams go; the gunners stay a moment after firing, then vanish in smoke.
  clearLanes(fired = false) {
    for (const l of this.lanes) {
      for (const m of [l.mesh, l.beam, l.glow]) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      if (fired) this.leaving.push({ root: l.gunner, t: 0.9 });
      else this.removeGunner(l.gunner, true);
    }
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
        if (this.effects) {   // muzzle flash, gun smoke and the shot along the beam
          this.effects.tracer(l.muzzle, l.end);
          this.effects.burst(l.muzzle.clone(), 'spark', 10, { x: l.dx, z: l.dz });
          this.effects.smokeCloud(l.muzzle.x, l.muzzle.y - 0.4, l.muzzle.z, 1.1, 1.6);
        }
      }
      sfx.teppo();
      setTimeout(() => sfx.teppo(), 90);
      this.clearLanes(true);
      return;
    }
    return super.strikeHit(players, a);
  }

  remove() {
    this.clearLanes();
    for (const g of this.leaving) this.removeGunner(g.root, false);
    this.leaving = [];
    this.scene.remove(this.streak);
    super.remove();
  }
}
