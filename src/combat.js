// Fighting: Uzi bullets, thrown shurikens, and levels of samurai.
import * as THREE from 'three';
import { Samurai, buildArrow } from './samurai.js';
import { Boss } from './boss.js';
import { Ronin } from './ronin.js';
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
    this.bossCfg = config.boss;
    this.roninCfg = config.ronin;
    this.bossFor = 0;   // the level whose boss fight has started
    this.levelsCfg = config.levels;
    this.coopCfg = config.coop;
    this.specials = config.specials;
    this.hidingCfg = config.hiding;
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
    // A quiet spell first: the first wave marches out when the countdown ends.
    this.quiet = n === 1 ? L.firstQuietSeconds : this.quietTime();
    hud.banner(`Level ${n}`, 2);
    const M = this.samuraiCfg.mix;
    if (n === M.archerFromLevel) hud.toast('Samurai archers (green)! Watch the red line and step out of the way.', 5);
    if (n === M.nunchuckFromLevel) hud.toast('Nunchuck fighters (blue)! Fast and hit 3 times. Keep your distance!', 5);
    this.onLevelStart?.(n, hud);
  }

  quietTime() {
    const [a, b] = this.levelsCfg.quietSeconds;
    return a + Math.random() * (b - a);
  }

  // Is this spot inside samurai territory (inside the red-ribboned posts around the camp)?
  inTerritory(pos) {
    const O = this.world.outpost;
    return !O || Math.hypot(pos.x - O.x, pos.z - O.z) < O.r;
  }

  // Every samurai belongs to the camp: he won't chase you far outside its territory.
  enlist(s) {
    const O = this.world.outpost;
    if (O && !this.vs) s.leash = { x: O.x, z: O.z, r: O.r + this.levelsCfg.leashExtra, camp: O.wall * 0.6 };
    s.effects = this.effects;
    s.shoot = (from, dir, damage) => this.fireArrow(from, dir, damage);
    this.samurai.push(s);
    return s;
  }

  spawnWave(players) {
    this.wave++;
    this.quiet = null;
    const O = this.world.outpost;
    let marched = 0, dropped = 0;
    const size = this.waveSize + (this.wave - 1) * (this.levelsCfg.extraPerWave || 0);   // each wave bigger than the last
    const fromCamp = O && !this.vs ? Math.round(size * this.levelsCfg.fromCamp) : 0;
    for (let i = 0; i < size; i++) {
      if (i < fromCamp) {
        // Lined up inside the gate, then they march out one after another.
        const inward = Math.atan2(O.z - O.gate.z, O.x - O.gate.x);
        const row = Math.floor(marched / 3), col = (marched % 3) - 1;
        const x = O.gate.x + Math.cos(inward) * (1.5 + row * 1.3) - Math.sin(inward) * col * 1.2;
        const z = O.gate.z + Math.sin(inward) * (1.5 + row * 1.3) + Math.cos(inward) * col * 1.2;
        const s = this.enlist(new Samurai(this.scene, this.world, this.samuraiCfg, x, z, this.toughness, 0, this.pickKind(), 5));
        s.facing = inward + Math.PI;   // facing out of the gate
        s.startOnGround(marched * 0.5);
        marched++;
      } else {
        // The rest come down their vines near you, one after another.
        const spot = this.spawnSpot(players);
        this.enlist(new Samurai(this.scene, this.world, this.samuraiCfg, spot.x, spot.z, this.toughness,
          dropped * 0.45 + Math.random() * 0.3, this.pickKind(), spot.vineTop));
        dropped++;
      }
    }
    if (marched) sfx.warHorn?.();
  }

  // What the bar at the top says.
  statusText() {
    if (this.level <= 0) return '';
    const head = `Level ${this.level}`;
    if (this.quiet != null) {
      if (!this.someoneInside) return `${head} · Outside samurai territory: exploring`;
      return `${head} · ${this.pendingBoss ? 'Boss' : `Wave ${this.wave + 1}/${this.waveTotal}`} coming in ${Math.ceil(this.quiet)}s`;
    }
    return `${head} · Wave ${this.wave}/${this.waveTotal} · Samurai left: ${this.samuraiLeft}`;
  }

  // Which boss comes after this level: the Ronin after 3, 8, 13..., the Oni Warlord after 5, 10, 15...
  bossTypeFor(level) {
    const B = this.bossCfg;
    if (!B) return null;
    if (level % B.every === 0) return 'warlord';
    if (level % B.every === B.roninAt) return 'ronin';
    return null;
  }

  startBoss(players, hud, type = 'warlord') {
    const B = this.bossCfg;
    this.bossFor = this.level;
    const spot = this.spawnSpot(players);
    if (type === 'ronin') {
      const ronin = this.enlist(new Ronin(this.scene, this.world, this.roninCfg, spot.x, spot.z,
        Math.floor((this.level - B.roninAt) / B.every) + 1, spot.vineTop));
      this.bossName = ronin.bossName;
      hud.banner('The Twin-blade Ronin!', 3);
      hud.toast('He blocks and dodges! Hit him while he winds up an attack. Red streak = dash: step aside, a shuriken stops him.', 6);
      return;
    }
    const boss = new Boss(this.scene, this.world, B, spot.x, spot.z, this.level / B.every, spot.vineTop);
    this.bossName = boss.bossName;
    boss.effects = this.effects;
    boss.onShake = v => this.onShake?.(v);
    boss.onSummon = b => {   // at half health he calls for help
      for (let i = 0; i < B.summon; i++) {
        const sp = this.spawnSpot(players, b.pos, 3, 14);
        this.enlist(new Samurai(this.scene, this.world, this.samuraiCfg, sp.x, sp.z, this.toughness, 0.3 + i * 0.4, this.pickKind(), sp.vineTop));
      }
      hud.toast('The Warlord calls for help! Samurai are coming down the vines!', 4);
    };
    this.enlist(boss);
    hud.banner('The Oni Warlord!', 3);
    hud.toast('Big club swing: back off. Red ring on the ground: get out of it!', 5);
  }

  get boss() { return this.samurai.find(s => s.isBoss && s.alive) || null; }

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
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    mesh.rotation.x = -Math.atan(dir.slope || 0);   // tilted up toward someone in a tree
    this.scene.add(mesh);
    this.arrows.push({ mesh, dx: dir.x, dz: dir.z, slope: dir.slope || 0, damage, life: 2, stuck: 0 });
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
        // Only ninjas the arrow is level with (feet to head) can be hit.
        const level = ninjas.filter(p => m.y > p.pos.y - 0.1 && m.y < p.pos.y + 2.1);
        const hit = this.castRay(m.x, m.y, m.z, a.dx, a.dz, step, null, level);
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
          m.y += a.slope * step - dt * 0.6;   // flies up toward its target, dropping a tiny bit
          a.life -= dt;
          if (m.y < this.world.heightAt(m.x, m.z) + 0.05) { a.stuck = 4; a.mesh.rotation.x = 0.4; sfx.arrowThunk(); }
        }
      }
      if (a.life <= 0) this.scene.remove(a.mesh);
    }
    this.arrows = this.arrows.filter(a => a.life > 0);
  }

  // Under the leaves of a big tree, 14-26 m from the ninjas (or `near` a point, like the boss),
  // so the vine hangs from a real tree. Returns { x, z, vineTop } (vineTop = height of the leaves).
  spawnSpot(players, near = null, minD = 14, maxD = 26) {
    const alive = players.filter(p => p.alive);
    const center = near ?? alive[0]?.pos ?? new THREE.Vector3();
    const lim = this.world.limit - 1;
    const free = (x, z) => Math.abs(x) < lim && Math.abs(z) < lim
      && !this.world.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 0.8)
      && !alive.some(p => Math.hypot(p.pos.x - x, p.pos.z - z) < 10)
      && !this.samurai.some(s => s.state === 'descend' && Math.hypot(s.pos.x - x, s.pos.z - z) < 1.5);
    const spots = this.world.canopySpots.filter(c => {
      const d = Math.hypot(c.x - center.x, c.z - center.z);
      return d > minD && d < maxD;
    });
    for (let tries = 0; tries < 40 && spots.length; tries++) {
      const c = spots[Math.floor(Math.random() * spots.length)];
      if (free(c.x, c.z)) return { x: c.x, z: c.z, vineTop: c.top - this.world.heightAt(c.x, c.z) };
    }
    // No tree in range (rare): the nearest free canopy anywhere further than 8 m.
    let best = null, bestD = Infinity;
    for (const c of this.world.canopySpots) {
      const d = Math.hypot(c.x - center.x, c.z - center.z);
      if (d > 8 && d < bestD && free(c.x, c.z)) { best = c; bestD = d; }
    }
    if (best) return { x: best.x, z: best.z, vineTop: best.top - this.world.heightAt(best.x, best.z) };
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
    this.bossFor = 0;
    this.quiet = null;          // seconds of quiet left before the next wave (null = a wave is on)
    this.pendingBoss = null;    // 'ronin' / 'warlord' waiting for the quiet spell to end
    this.someoneInside = undefined;
    this.toldReveal = false;
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
      // Switch goes round what he carries: Uzi -> special weapon -> katana -> Uzi.
      const owned = p.weaponsOwned;
      if (c.switchPressed && owned.length > 1 && !p.switching) p.switchTo(owned[(owned.indexOf(p.current) + 1) % owned.length]);
      if (c.fire && !owned.includes(p.current)) p.switchTo('uzi');   // special just ran out
      // Gatling: the barrels spin up while you hold fire, and slow down when you let go.
      const G = this.specials.gatling;
      if (p.current === 'gatling' && c.fire && !p.switching && p.special) {
        if (p.spin === 0) sfx.gatlingSpin();
        p.spin = Math.min(1, p.spin + dt / G.spinUpSeconds);
      } else p.spin = Math.max(0, p.spin - dt / 0.8);
      if (c.fire && p.fireCooldown <= 0 && !p.switching) {
        const before = p.fireCooldown;
        this.fireWeapon(p, i);
        // Gunfire gives away where you are, even from a hideout or smoke (shurikens and the katana are silent).
        if (p.fireCooldown > before && p.current !== 'katana' && p.current !== 'smoke') this.revealShooter(p, hud);
      }
      if (c.throwPressed) this.throwShuriken(p);
    });
    this.updateRest(dt, players, hud);
  }

  fireWeapon(p, i) {
    if (p.current === 'gatling') { if (p.spin >= 1) this.fireGatling(p, i); }
    else if (p.current === 'uzi') this.fireUzi(p, i);
    else if (p.current === 'shotgun') this.fireShotgun(p, i);
    else if (p.current === 'katana') this.slashKatana(p);
    else if (p.current === 'smoke') this.throwSmoke(p);
  }

  // Standing in a campfire burns (ninjas and samurai alike).
  updateFire(dt, players, hud) {
    const fires = this.world.outpost?.fires || [];
    if (!fires.length) return;
    const dmg = this.world.outpost.fireDamage || 25;
    const inFire = pos => fires.some(f => Math.hypot(pos.x - f.x, pos.z - f.z) < f.r && pos.y < f.y + 0.8);
    for (const p of players) {
      if (!p.alive || !inFire(p.pos)) { p.burnT = 0; continue; }
      p.hurt(dmg * dt);
      p.burnT = (p.burnT || 0) - dt;
      if (p.burnT <= 0) {   // ouch, a flash and a puff of embers every so often
        p.burnT = 0.4;
        p.justHurt = true;
        sfx.hurt();
        this.effects.burst(new THREE.Vector3(p.pos.x, p.pos.y + 0.5, p.pos.z), 'spark', 6);
        if (!this.toldFire) { this.toldFire = true; hud.toast('Ouch! The fire burns. Get out!', 3); }
      }
    }
    for (const s of this.samurai) {
      if (s.alive && s.state !== 'descend' && inFire(s.pos)) s.hit(dmg * 0.5 * dt, 0, 0);
    }
  }

  revealShooter(p, hud) {
    const wasHiding = p.hidden || this.inSmoke(p.pos.x, p.pos.z);
    p.revealed = this.hidingCfg.revealSeconds;
    if (wasHiding && !this.toldReveal) {
      this.toldReveal = true;
      hud.toast('Shooting gives away your hiding spot! Shurikens are silent.', 4);
    }
  }

  updateRest(dt, players, hud) {
    this.updateFire(dt, players, hud);
    this.updateShurikens(dt);
    this.updateArrows(dt, players);
    this.updateBombs(dt);
    for (const sm of this.smokes) sm.t -= dt;
    this.smokes = this.smokes.filter(sm => sm.t > 0);
    for (const s of this.samurai) s.update(dt, players, this.samurai, this.smokes);
    this.samurai = this.samurai.filter(s => !s.gone);

    // Samurai territory: tell them when they cross the red-ribboned posts.
    const anyAlive = players.some(p => p.alive);
    const inside = players.some(p => p.alive && this.inTerritory(p.pos));
    if (!this.vs && this.level > 0 && anyAlive && this.world.outpost) {
      if (this.someoneInside === true && !inside) hud.toast('You left samurai territory. No more samurai will come until you go back past the red ribbons.', 5);
      if (this.someoneInside === false && inside) hud.toast('Back in samurai territory!', 3);
    }
    this.someoneInside = inside;

    // Waves: when one is beaten there's a quiet spell, then the next marches out of the camp.
    // The countdown only runs while someone is inside samurai territory.
    if (!this.vs && this.level > 0 && anyAlive && this.betweenLevels === 0) {
      const more = this.wave < this.waveTotal || this.pendingBoss;
      if (more && this.samuraiLeft === 0) {
        if (this.quiet == null) {
          this.quiet = this.quietTime();
          hud.toast(`Wave beaten! Quiet for a while: explore, find crates. The next ${this.pendingBoss ? 'fight' : 'wave'} comes when the countdown ends.`, 5);
        }
        if (inside) this.quiet -= dt;
        if (this.quiet <= 0) {
          if (this.pendingBoss) {
            const type = this.pendingBoss;
            this.pendingBoss = null;
            this.quiet = null;
            this.startBoss(players, hud, type);
          } else {
            this.spawnWave(players);
            hud.toast(`Wave ${this.wave} of ${this.waveTotal}: samurai are marching out of their camp!`);
          }
        }
      }
    }

    // Level cleared? Short pause, then the next one.
    if (!this.vs && this.level > 0 && this.wave >= this.waveTotal && !this.pendingBoss && this.samuraiLeft === 0 && anyAlive) {
      if (this.betweenLevels === 0) {
        this.betweenLevels = 3;
        hud.banner(this.bossFor === this.level ? `The ${this.bossName} is defeated!` : 'Level cleared!', 2.5);
        sfx.levelUp();
      }
      this.betweenLevels -= dt;
      if (this.betweenLevels <= 0) {
        this.betweenLevels = 0;
        if (this.levelsCfg.refillAmmoOnLevelUp) {
          for (const p of players) { p.ammo = this.weapons.uziAmmo; p.shurikens = this.weapons.shurikens; }
        }
        for (const p of players) if (!p.alive) p.revive(this.coopCfg.reviveOnNewLevel);
        const B = this.bossCfg;
        const type = this.bossTypeFor(this.level);
        if (type && this.bossFor !== this.level) {
          // The boss comes after a quiet spell too.
          this.bossFor = this.level;
          this.pendingBoss = type;
          this.quiet = this.quietTime();
          hud.toast(`Something big is coming from the camp... get ready!`, 4);
        } else this.startLevel(this.level + 1, players, hud);
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
    this.bullet(p, index, this.weapons.uziDamage, this.weapons.uziRange, 0.06);
  }

  fireGatling(p, index) {
    const G = this.specials.gatling;
    p.fireCooldown = 1 / G.shotsPerSecond;
    p.recoil = 0.7;
    sfx.gatling();
    this.bullet(p, index, G.damage, G.range, G.spreadDegrees * Math.PI / 180);
    this.useSpecial(p);
  }

  // One bullet from the gun's muzzle: flash, casing, tracer, and whatever it hits.
  bullet(p, index, damage, range, spreadRad) {
    const from = p.muzzlePosition(this.tmp);
    this.effects.muzzle(index, from);
    const f = p.forward;
    this.effects.casing(p.ejectPosition(this.tmp2), { x: -f.z, z: f.x });  // casings fly out to the right
    let dir = this.aimDirection(p, range, from);
    const spread = (Math.random() - 0.5) * spreadRad;
    dir = { x: dir.x * Math.cos(spread) - dir.z * Math.sin(spread), z: dir.x * Math.sin(spread) + dir.z * Math.cos(spread) };

    const hit = this.castRay(from.x, from.y, from.z, dir.x, dir.z, range, p);
    const end = this.tmp2.set(from.x + dir.x * hit.dist, from.y, from.z + dir.z * hit.dist);
    this.effects.tracer(from, end);

    if (hit.target) {
      end.y = hit.target.pos.y + 1.2;
      hit.target.hit(damage, dir.x, dir.z, false, p);
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
    // Next move in the combo, or back to the first one after a pause.
    p.swingMove = p.sinceSwing < K.comboResetSeconds ? (p.swingMove + 1) % K.moves.length : 0;
    p.sinceSwing = 0;
    const M = K.moves[p.swingMove];
    p.fireCooldown = 1 / K.swingsPerSecond;
    p.swing = 0;
    sfx.katanaSlash();
    const f = p.forward;
    const half = (K.arcDegrees * M.arc / 2) * Math.PI / 180, reach = K.reach * M.reach;
    let hits = 0;
    // Only the closest few in front of the blade get hit, not a whole crowd.
    const inReach = this.targets(p).filter(s => {
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > reach + s.radius) return false;
      return Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / (d || 1)))) <= half;
    }).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, M.hits);
    for (const s of inReach) {
      const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      s.hit(K.damage * M.damage, dx / (d || 1), dz / (d || 1), true, p);
      this.effects.burst(new THREE.Vector3(s.pos.x, s.pos.y + 1.2, s.pos.z), 'steel', 14, { x: dx / d, z: dz / d });
      hits++;
    }
    if (hits) { setTimeout(() => sfx.katanaHit(), 60); this.onHit?.(p); }
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
