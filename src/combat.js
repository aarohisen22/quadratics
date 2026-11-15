// Fighting: Uzi bullets, thrown shurikens, and levels of samurai.
import * as THREE from 'three';
import { Samurai, buildArrow } from './samurai.js';
import { makeShurikenGeometry } from './models.js';
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

export class Combat {
  constructor(scene, world, effects, config) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.weapons = config.weapons;
    this.samuraiCfg = config.samurai;
    this.levelsCfg = config.levels;
    this.coopCfg = config.coop;
    this.specials = config.specials;
    this.smokes = [];   // active smoke clouds { x, z, r, t }
    this.vs = false;    // VS mode: the brothers' weapons hit each other
    this.players = [];
    this.bombs = [];    // smoke bombs in the air
    this.arrows = [];   // archers' arrows in flight or stuck in trees
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
    this.waveTotal = L.wavesPerLevel + (n >= L.extraWaveFromLevel ? 1 : 0);
    this.wave = 0;
    this.toughness = 1 + L.toughnessPerLevel * (n - 1);
    this.waveSize = Math.max(3, Math.round((L.startSamurai + L.extraPerLevel * (n - 1)) * L.waveSizeFactor));
    this.spawnWave(players);
    hud.banner(`Level ${n}`, 2);
    const M = this.samuraiCfg.mix;
    if (n === M.archerFromLevel) hud.toast('Samurai archers (green)! Watch the red line and step out of the way.', 5);
    if (n === M.nunchuckFromLevel) hud.toast('Nunchuck fighters (blue)! Fast and hit 3 times. Keep your distance!', 5);
    this.onLevelStart?.(n, hud);
  }

  spawnWave(players) {
    this.wave++;
    this.waveTimer = 0;
    for (let i = 0; i < this.waveSize; i++) {
      const spot = this.spawnSpot(players);
      // They come down their vines one after another, not all at once.
      const s = new Samurai(this.scene, this.world, this.samuraiCfg, spot.x, spot.z, this.toughness,
        i * 0.45 + Math.random() * 0.3, this.pickKind());
      s.effects = this.effects;
      s.shoot = (from, dir, damage) => this.fireArrow(from, dir, damage);
      this.samurai.push(s);
    }
  }

  // Sword samurai, archer or nunchuck fighter: more of the special kinds in later levels.
  pickKind() {
    const M = this.samuraiCfg.mix, n = this.level;
    const share = from => n >= from ? Math.min(M.maxShare, M.startShare + M.sharePerLevel * (n - from)) : 0;
    const r = Math.random(), a = share(M.archerFromLevel);
    if (r < a) return 'archer';
    if (r < a + share(M.nunchuckFromLevel)) return 'nunchuck';
    return 'sword';
  }

  // ---------- arrows ----------
  fireArrow(from, dir, damage) {
    const mesh = buildArrow();
    mesh.position.copy(from);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(mesh);
    this.arrows.push({ mesh, dx: dir.x, dz: dir.z, damage, life: 2, stuck: 0 });
  }

  updateArrows(dt, players) {
    const speed = this.samuraiCfg.archer.arrowSpeed;
    const ninjas = players.filter(p => p.alive);
    for (const a of this.arrows) {
      const m = a.mesh.position;
      if (a.stuck > 0) {   // stuck in a tree or the ground for a while
        a.stuck -= dt;
        if (a.stuck <= 0) a.life = 0;
      } else {
        const step = speed * dt;
        const hit = this.castRay(m.x, m.y, m.z, a.dx, a.dz, step, null, ninjas);
        if (hit.target) {
          hit.target.hurt(a.damage);
          hit.target.justHurt = true;
          hit.target.vel.x += a.dx * 2; hit.target.vel.z += a.dz * 2;
          this.effects.burst(m, 'chip', 6);
          sfx.hurt();
          a.life = 0;
        } else if (hit.obstacle) {
          m.x += a.dx * (hit.dist - 0.35); m.z += a.dz * (hit.dist - 0.35);   // tip sinks into the bark
          this.effects.burst(m, 'chip', 5);
          sfx.arrowThunk();
          a.stuck = 4;
        } else {
          m.x += a.dx * step; m.z += a.dz * step;
          m.y -= dt * 0.6;   // drops a tiny bit as it flies
          a.life -= dt;
          if (m.y < this.world.heightAt(m.x, m.z) + 0.05) { a.stuck = 4; a.mesh.rotation.x = 0.4; sfx.arrowThunk(); }
        }
      }
      if (a.life <= 0) this.scene.remove(a.mesh);
    }
    this.arrows = this.arrows.filter(a => a.life > 0);
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
    for (const b of this.bombs) this.scene.remove(b.mesh);
    for (const a of this.arrows) this.scene.remove(a.mesh);
    this.arrows = [];
    this.samurai = [];
    this.shurikens = [];
    this.bombs = [];
    this.smokes = [];
    this.effects.clearSmoke();
    this.betweenLevels = 0;
  }

  // ---------- each frame ----------

  // Everything a shooter's weapons can hit: samurai, plus the other brother in VS mode.
  targets(shooter) {
    const list = this.samurai.filter(s => s.alive && s.state !== 'descend');   // can't hit them on the vine
    if (this.vs) for (const p of this.players) if (p !== shooter && p.alive) list.push(p);
    return list;
  }

  inSmoke(x, z) { return this.smokes.some(sm => Math.hypot(sm.x - x, sm.z - z) < sm.r); }

  update(dt, players, ctrls, hud) {
    this.players = players;
    players.forEach((p, i) => {
      if (!p.alive) return;
      p.fireCooldown -= dt;
      const c = ctrls[i];
      if (c.switchPressed && p.special && !p.switching) p.switchTo(p.current === 'uzi' ? p.special.type : 'uzi');
      if (c.fire && p.current !== 'uzi' && !p.special) p.switchTo('uzi');   // special just ran out
      if (c.fire && p.fireCooldown <= 0 && !p.switching) {
        if (p.current === 'uzi') this.fireUzi(p, i);
        else if (p.current === 'shotgun') this.fireShotgun(p, i);
        else if (p.current === 'katana') this.slashKatana(p);
        else if (p.current === 'smoke') this.throwSmoke(p);
      }
      if (c.throwPressed) this.throwShuriken(p);
    });

    this.updateShurikens(dt);
    this.updateArrows(dt, players);
    this.updateBombs(dt);
    for (const sm of this.smokes) sm.t -= dt;
    this.smokes = this.smokes.filter(sm => sm.t > 0);
    for (const s of this.samurai) s.update(dt, players, this.samurai, this.smokes);
    this.samurai = this.samurai.filter(s => !s.gone);

    // Next wave: when this one is almost beaten, or after 35 seconds.
    if (!this.vs && this.level > 0 && this.wave < this.waveTotal && players.some(p => p.alive)) {
      this.waveTimer += dt;
      if (this.samuraiLeft <= 1 || this.waveTimer > 35) {
        this.spawnWave(players);
        hud.toast(`Wave ${this.wave} of ${this.waveTotal}: more samurai coming!`);
      }
    }

    // Level cleared? Short pause, then the next one.
    if (!this.vs && this.level > 0 && this.wave >= this.waveTotal && this.samuraiLeft === 0 && players.some(p => p.alive)) {
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

  // Aim help: bend the shot toward a target close to where you're aiming (not one hidden in smoke).
  // `from` is where the bullet or shuriken starts (the gun tip or hand), so it flies straight at the target.
  aimDirection(p, range = this.weapons.uziRange, from = p.pos) {
    const f = p.forward;
    const help = (this.aimHelpOverride ?? this.weapons.aimHelpDegrees) * Math.PI / 180;
    let best = null, bestAngle = help;
    for (const s of this.targets(p)) {
      if (this.inSmoke(s.pos.x, s.pos.z)) continue;
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.01) continue;
      const angle = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d)));
      if (angle < bestAngle) {
        bestAngle = angle;
        const fx = s.pos.x - from.x, fz = s.pos.z - from.z, fd = Math.hypot(fx, fz) || 1;
        best = { x: fx / fd, z: fz / fd };
      }
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
    const f = p.forward;
    this.effects.casing(p.ejectPosition(this.tmp2), { x: -f.z, z: f.x });  // casings fly out to the right
    let dir = this.aimDirection(p, this.weapons.uziRange, from);
    const spread = (Math.random() - 0.5) * 0.06;
    dir = { x: dir.x * Math.cos(spread) - dir.z * Math.sin(spread), z: dir.x * Math.sin(spread) + dir.z * Math.cos(spread) };

    const hit = this.castRay(from.x, from.y, from.z, dir.x, dir.z, this.weapons.uziRange, p);
    const end = this.tmp2.set(from.x + dir.x * hit.dist, from.y, from.z + dir.z * hit.dist);
    this.effects.tracer(from, end);

    if (hit.target) {
      end.y = hit.target.pos.y + 1.2;
      hit.target.hit(this.weapons.uziDamage, dir.x, dir.z, false, p);
      this.onHit?.(p);
      this.effects.burst(end, 'spark', 7, { x: -dir.x, z: -dir.z });
      sfx.hitEnemy();
    } else if (hit.obstacle) {
      this.effects.burst(end, 'chip', 5, { x: -dir.x, z: -dir.z });
      sfx.ricochet();
      this.onObstacleHit?.(hit.obstacle, 1);
    }
  }

  // Uses up one shell / swing / bomb; back to the Uzi when the special runs out.
  useSpecial(p) {
    p.special.count--;
    if (p.special.count <= 0) {
      p.special = null;
      setTimeout(() => { if (!p.special) p.switchTo('uzi'); }, 350);
    }
  }

  fireShotgun(p, index) {
    const S = this.specials.shotgun;
    p.fireCooldown = 1 / S.shotsPerSecond;
    p.recoil = 1.6;
    sfx.shotgun();
    const from = p.muzzlePosition(this.tmp).clone();
    this.effects.muzzle(index, from, 1.6);
    const f = p.forward;
    setTimeout(() => this.effects.casing(p.ejectPosition(this.tmp2), { x: -f.z, z: f.x }), 400);
    const base = this.aimDirection(p, S.range, from);
    const spread = S.spreadDegrees * Math.PI / 180;
    for (let k = 0; k < S.pellets; k++) {
      const a = (k / (S.pellets - 1) - 0.5) * spread + (Math.random() - 0.5) * 0.05;
      const dir = { x: base.x * Math.cos(a) - base.z * Math.sin(a), z: base.x * Math.sin(a) + base.z * Math.cos(a) };
      const hit = this.castRay(from.x, from.y, from.z, dir.x, dir.z, S.range, p);
      const end = new THREE.Vector3(from.x + dir.x * hit.dist, from.y, from.z + dir.z * hit.dist);
      this.effects.tracer(from, end);
      if (hit.target) {
        end.y = hit.target.pos.y + 1.2;
        hit.target.hit(S.damagePerPellet, dir.x * 2, dir.z * 2, false, p);
        this.onHit?.(p);
        this.effects.burst(end, 'spark', 5, { x: -dir.x, z: -dir.z });
      } else if (hit.obstacle) {
        this.effects.burst(end, 'chip', 4, { x: -dir.x, z: -dir.z });
      }
      if (hit.obstacle) this.onObstacleHit?.(hit.obstacle, 2);
    }
    sfx.hitEnemy();
    this.useSpecial(p);
  }

  slashKatana(p) {
    const K = this.specials.katana;
    p.fireCooldown = 1 / K.swingsPerSecond;
    p.swing = 0;
    sfx.katanaSlash();
    const f = p.forward;
    const half = (K.arcDegrees / 2) * Math.PI / 180;
    let hits = 0;
    // Only the closest few in front of the blade get hit, not a whole crowd.
    const inReach = this.targets(p).filter(s => {
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > K.reach + s.radius) return false;
      return Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / (d || 1)))) <= half;
    }).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, K.maxHitsPerSwing);
    for (const s of inReach) {
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      s.hit(K.damage, dx / (d || 1), dz / (d || 1), true, p);
      this.effects.burst(new THREE.Vector3(s.pos.x, s.pos.y + 1.2, s.pos.z), 'steel', 14, { x: dx / d, z: dz / d });
      hits++;
    }
    if (hits) { setTimeout(() => sfx.katanaHit(), 60); this.onHit?.(p); }
    this.useSpecial(p);
  }

  throwSmoke(p) {
    const S = this.specials.smoke;
    p.fireCooldown = 0.8;
    p.throwT = 0;
    sfx.shuriken();
    const f = p.forward;
    const mesh = p.models.smoke.clone();
    p.muzzlePosition(mesh.position);
    this.scene.add(mesh);
    const flight = 0.7;
    this.bombs.push({
      mesh, t: 0, flight,
      vx: f.x * S.throwDistance / flight, vz: f.z * S.throwDistance / flight, vy: 6,
    });
    this.useSpecial(p);
  }

  updateBombs(dt) {
    const S = this.specials.smoke;
    for (const b of this.bombs) {
      b.t += dt;
      b.vy -= 18 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.rotation.x += dt * 10;
      const ground = this.world.heightAt(b.mesh.position.x, b.mesh.position.z);
      if (b.mesh.position.y <= ground + 0.05) {
        b.done = true;
        this.scene.remove(b.mesh);
        const { x, z } = b.mesh.position;
        this.smokes.push({ x, z, r: S.radius, t: S.seconds });
        this.effects.smokeCloud(x, ground, z, S.radius, S.seconds);
        sfx.smokeBomb();
      }
    }
    this.bombs = this.bombs.filter(b => !b.done);
  }

  // Finds the first target (samurai / other brother) or tree/rock along a shot.
  // list: who can be hit (default: whatever the shooter's weapons can hit).
  castRay(ox, oy, oz, dx, dz, range, shooter = null, list = null) {
    let dist = range, target = null, obstacle = null;
    for (const s of list ?? this.targets(shooter)) {
      const t = rayCircle(ox, oz, dx, dz, s.pos.x, s.pos.z, s.radius + 0.1);
      if (t !== null && t < dist) { dist = t; target = s; }
    }
    for (const o of this.world.obstacles) {
      if (oy > o.base + o.h) continue; // shot passes over low logs and rocks
      const t = rayCircle(ox, oz, dx, dz, o.x, o.z, o.r - 0.2);
      if (t !== null && t < dist) { dist = t; target = null; obstacle = o; }
    }
    return { dist, target, obstacle };
  }

  throwShuriken(p) {
    if (p.shurikens <= 0) { sfx.empty(); return; }
    p.shurikens--;
    sfx.shuriken();
    const mesh = new THREE.Mesh(this.shurikenGeo, this.shurikenMat);
    mesh.castShadow = true;
    p.throwT = 0;
    p.throwPosition(mesh.position);
    const dir = this.aimDirection(p, this.weapons.uziRange, mesh.position);
    this.scene.add(mesh);
    this.shurikens.push({ mesh, dx: dir.x, dz: dir.z, life: 1.4, owner: p });
  }

  updateShurikens(dt) {
    const speed = this.weapons.shurikenSpeed;
    for (const s of this.shurikens) {
      const step = speed * dt;
      const m = s.mesh.position;
      const hit = this.castRay(m.x, m.y, m.z, s.dx, s.dz, step, s.owner);
      if (hit.target) {
        hit.target.hit(this.weapons.shurikenDamage, s.dx, s.dz, true, s.owner);
        this.onHit?.(s.owner);
        this.effects.burst(m, 'steel', 12, { x: -s.dx, z: -s.dz });
        sfx.shurikenHit();
        s.life = 0;
      } else if (hit.obstacle) {
        m.x += s.dx * hit.dist; m.z += s.dz * hit.dist;
        this.effects.burst(m, 'chip', 6);
        sfx.thud();
        this.onObstacleHit?.(hit.obstacle, 3);
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
