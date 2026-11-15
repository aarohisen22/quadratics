// Fighting: Uzi bullets, thrown shurikens, and levels of samurai.
import * as THREE from 'three';
import { Samurai } from './samurai.js';
import { sfx } from './sound.js';

// Where does a ray (in 2D, seen from above) first touch a circle? Returns distance or null.
function rayCircle(ox, oz, dx, dz, cx, cz, r) {
  const mx = ox - cx, mz = oz - cz;
  const b = mx * dx + mz * dz;
  const c = mx * mx + mz * mz - r * r;
  if (c > 0 && b > 0) return null;
  const disc = b * b - c;
  if (disc < 0) return null;
  return Math.max(0, -b - Math.sqrt(disc));
}

function makeShurikenGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.22 : 0.07;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.03, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

export class Combat {
  constructor(scene, world, effects, config) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.weapons = config.weapons;
    this.samuraiCfg = config.samurai;
    this.levelsCfg = config.levels;
    this.coopCfg = config.coop;
    this.samurai = [];
    this.shurikens = [];
    this.level = 0;
    this.betweenLevels = 0;
    this.shurikenGeo = makeShurikenGeometry();
    this.shurikenMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.9, roughness: 0.25 });
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
  }

  get samuraiLeft() { return this.samurai.filter(s => s.alive).length; }

  // ---------- levels ----------

  startLevel(n, players, hud) {
    this.level = n;
    const L = this.levelsCfg;
    const count = L.startSamurai + L.extraPerLevel * (n - 1);
    const tough = 1 + L.toughnessPerLevel * (n - 1);
    for (let i = 0; i < count; i++) {
      const spot = this.spawnSpot(players);
      this.samurai.push(new Samurai(this.scene, this.world, this.samuraiCfg, spot.x, spot.z, tough));
    }
    hud.banner(`Level ${n}`, 2);
  }

  // Somewhere 14-26 m from the ninjas, not inside a tree or rock.
  spawnSpot(players) {
    const alive = players.filter(p => p.alive);
    const center = alive[0]?.pos ?? new THREE.Vector3();
    const lim = this.world.limit - 1;
    for (let tries = 0; tries < 80; tries++) {
      const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 12;
      const x = center.x + Math.cos(a) * d, z = center.z + Math.sin(a) * d;
      if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
      if (this.world.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 1)) continue;
      if (alive.some(p => Math.hypot(p.pos.x - x, p.pos.z - z) < 12)) continue;
      return { x, z };
    }
    return { x: center.x + 15, z: center.z };
  }

  reset() {
    for (const s of this.samurai) if (!s.gone) s.remove();
    for (const s of this.shurikens) this.scene.remove(s.mesh);
    this.samurai = [];
    this.shurikens = [];
    this.betweenLevels = 0;
  }

  // ---------- each frame ----------

  update(dt, players, ctrls, hud) {
    players.forEach((p, i) => {
      if (!p.alive) return;
      p.fireCooldown -= dt;
      if (ctrls[i].fire && p.fireCooldown <= 0) this.fireUzi(p, i);
      if (ctrls[i].throwPressed) this.throwShuriken(p);
    });

    this.updateShurikens(dt);
    for (const s of this.samurai) s.update(dt, players, this.samurai);
    this.samurai = this.samurai.filter(s => !s.gone);

    // Level cleared? Short pause, then the next one.
    if (this.level > 0 && this.samuraiLeft === 0 && players.some(p => p.alive)) {
      if (this.betweenLevels === 0) {
        this.betweenLevels = 3;
        hud.banner('Level cleared!', 2.5);
        sfx.levelUp();
      }
      this.betweenLevels -= dt;
      if (this.betweenLevels <= 0) {
        this.betweenLevels = 0;
        if (this.levelsCfg.refillAmmoOnLevelUp) {
          for (const p of players) { p.ammo = this.weapons.uziAmmo; p.shurikens = this.weapons.shurikens; }
        }
        for (const p of players) if (!p.alive) p.revive(this.coopCfg.reviveOnNewLevel);
        this.startLevel(this.level + 1, players, hud);
      }
    }
  }

  // Aim help: bend the shot toward a samurai close to where you're aiming.
  aimDirection(p) {
    const f = p.forward;
    const help = this.weapons.aimHelpDegrees * Math.PI / 180;
    let best = null, bestAngle = help;
    for (const s of this.samurai) {
      if (!s.alive) continue;
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > this.weapons.uziRange || d < 0.01) continue;
      const angle = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d)));
      if (angle < bestAngle) { bestAngle = angle; best = { x: dx / d, z: dz / d }; }
    }
    return best || f;
  }

  fireUzi(p, index) {
    if (p.ammo <= 0) {
      sfx.empty();
      p.fireCooldown = 0.25;
      return;
    }
    p.ammo--;
    p.fireCooldown = 1 / this.weapons.uziShotsPerSecond;
    p.recoil = 1;
    sfx.uzi();

    const from = p.muzzlePosition(this.tmp);
    this.effects.muzzle(index, from);
    let dir = this.aimDirection(p);
    const spread = (Math.random() - 0.5) * 0.06;
    dir = { x: dir.x * Math.cos(spread) - dir.z * Math.sin(spread), z: dir.x * Math.sin(spread) + dir.z * Math.cos(spread) };

    const hit = this.castRay(from.x, from.y, from.z, dir.x, dir.z, this.weapons.uziRange);
    const end = this.tmp2.set(from.x + dir.x * hit.dist, from.y, from.z + dir.z * hit.dist);
    this.effects.tracer(from, end);

    if (hit.samurai) {
      end.y = hit.samurai.pos.y + 1.2;
      hit.samurai.hit(this.weapons.uziDamage, dir.x, dir.z);
      this.effects.burst(end, 'spark', 7, { x: -dir.x, z: -dir.z });
      sfx.hitEnemy();
    } else if (hit.obstacle) {
      this.effects.burst(end, 'chip', 5, { x: -dir.x, z: -dir.z });
    }
  }

  // Finds the first samurai or tree/rock along a shot.
  castRay(ox, oy, oz, dx, dz, range) {
    let dist = range, samurai = null, obstacle = null;
    for (const s of this.samurai) {
      if (!s.alive) continue;
      const t = rayCircle(ox, oz, dx, dz, s.pos.x, s.pos.z, s.radius + 0.1);
      if (t !== null && t < dist) { dist = t; samurai = s; }
    }
    for (const o of this.world.obstacles) {
      if (oy > o.base + o.h) continue; // shot passes over low logs and rocks
      const t = rayCircle(ox, oz, dx, dz, o.x, o.z, o.r - 0.2);
      if (t !== null && t < dist) { dist = t; samurai = null; obstacle = o; }
    }
    return { dist, samurai, obstacle };
  }

  throwShuriken(p) {
    if (p.shurikens <= 0) { sfx.empty(); return; }
    p.shurikens--;
    sfx.shuriken();
    const dir = this.aimDirection(p);
    const mesh = new THREE.Mesh(this.shurikenGeo, this.shurikenMat);
    mesh.castShadow = true;
    p.muzzlePosition(mesh.position);
    this.scene.add(mesh);
    this.shurikens.push({ mesh, dx: dir.x, dz: dir.z, life: 1.4 });
  }

  updateShurikens(dt) {
    const speed = this.weapons.shurikenSpeed;
    for (const s of this.shurikens) {
      const step = speed * dt;
      const m = s.mesh.position;
      const hit = this.castRay(m.x, m.y, m.z, s.dx, s.dz, step);
      if (hit.samurai) {
        hit.samurai.hit(this.weapons.shurikenDamage, s.dx, s.dz, true);
        this.effects.burst(m, 'steel', 12, { x: -s.dx, z: -s.dz });
        sfx.hitEnemy();
        s.life = 0;
      } else if (hit.obstacle) {
        m.x += s.dx * hit.dist; m.z += s.dz * hit.dist;
        this.effects.burst(m, 'chip', 6);
        sfx.thud();
        s.stuck = true;
        s.life = Math.min(s.life, 0);
      } else {
        m.x += s.dx * step; m.z += s.dz * step;
        s.mesh.rotation.y += dt * 30;
        s.life -= dt;
      }
      if (s.life <= 0) this.scene.remove(s.mesh);
    }
    this.shurikens = this.shurikens.filter(s => s.life > 0);
  }
}
