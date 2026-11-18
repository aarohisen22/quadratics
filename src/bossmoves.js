// Moves the bosses (and the tougher ranks) share. They came from the old Twin-blade Ronin and Oni Warlord:
//  - defense: block bullets/shurikens with the blade, parry the katana and counter, or leap aside
//  - dash: a red streak shows the line, then he dashes through it
//  - slam: a red ring shows where the heavy blow will land; everyone inside is hurt and knocked back
//  - ground marks: red rings, discs and streaks drawn on the ground as warnings
// Each function takes the warrior (`w`, a Samurai or a boss) as its first argument.
import * as THREE from 'three';
import { sfx } from './sound.js';

// ---------- red warning marks on the ground ----------
export function groundMark(scene, shape, size = 1) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false });
  let geo;
  if (shape === 'ring') geo = new THREE.RingGeometry(size - 0.35, size, 48);
  else if (shape === 'disc') geo = new THREE.CircleGeometry(size, 40);
  else geo = new THREE.PlaneGeometry(size, 1).translate(0, 0.5, 0);   // 'streak': 1 m long along +z (scale z to lengthen)
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 4;
  m.visible = false;
  scene.add(m);
  return m;
}

// ---------- defense: block, parry, leap aside ----------
// Call from hit(). Returns true if the hit was blocked or dodged (so no damage).
// D: { blockChance, blockArcDegrees, shurikenBlock, katanaParry, dodgeChance, dodgeCooldown, dodgeDistance, dodgeSeconds }
export function defend(w, D, dirX, dirZ, interrupt, attacker) {
  if (w.dodge) return true;                       // mid-leap: nothing touches him
  const busy = w.state === 'windup' || w.state === 'strike';   // the moment to hit him
  if (!D || busy) return false;
  const len = Math.hypot(dirX, dirZ) || 1;
  const fx = Math.sin(w.facing), fz = Math.cos(w.facing);
  const facing = (-dirX * fx - dirZ * fz) / len > Math.cos(((D.blockArcDegrees ?? 150) / 2) * Math.PI / 180);
  const close = attacker && Math.hypot(attacker.pos.x - w.pos.x, attacker.pos.z - w.pos.z) < 3.5;
  const melee = interrupt && close, thrown = interrupt && !close;
  const r = Math.random();
  if (facing && (melee ? r < (D.katanaParry ?? 0) : thrown ? r < (D.shurikenBlock ?? 0) : r < (D.blockChance ?? 0))) {
    block(w, melee);
    return true;
  }
  if ((w.dodgeCd ?? 0) <= 0 && Math.random() < (D.dodgeChance ?? 0)) {
    startDodge(w, D, dirX / len, dirZ / len);
    return true;
  }
  return false;
}

// Blade up: sparks and the ring of steel; after a katana parry a quick counter-jab.
export function block(w, melee) {
  w.blockT = 0.18;
  sfx.parry();
  if (w.effects) {
    const fx = Math.sin(w.facing), fz = Math.cos(w.facing);
    w.effects.burst(new THREE.Vector3(w.pos.x + fx * 0.9, w.pos.y + 1.6 * (w.root.scale.y / 1.15), w.pos.z + fz * 0.9), 'spark', 8, { x: fx, z: fz });
  }
  if (melee && w.state !== 'recover' && w.attacks.jab) {
    w.attack = 'jab';
    w.state = 'windup';
    w.timer = w.attacks.jab.windup * 0.6;   // the counter comes fast
  }
}

// Leap sideways out of the line of fire.
export function startDodge(w, D, dx, dz) {
  const side = Math.random() < 0.5 ? 1 : -1;
  w.dodge = { x: -dz * side, z: dx * side, t: 0, len: D.dodgeDistance ?? 3.2, secs: D.dodgeSeconds ?? 0.3 };
  w.dodgeCd = D.dodgeCooldown ?? 1.6;
  w.dashCd = Math.min(w.dashCd ?? 99, 0.4);   // and he may come straight back with a dash
  sfx.swing();
}

// Call every frame AFTER the normal update. Moves him through the leap and shows the block pose.
export function updateDefense(w, dt) {
  w.dodgeCd = (w.dodgeCd ?? 0) - dt;
  w.blockT = (w.blockT ?? 0) - dt;
  if (w.dodge && w.alive) {
    const d = w.dodge;
    const step = (d.len / d.secs) * dt;
    d.t += dt;
    w.pos.x += d.x * step; w.pos.z += d.z * step;
    w.world.resolveCollision(w.pos, w.radius, w.pos.y + 1);
    const k = Math.min(1, d.t / d.secs);
    w.pos.y = w.world.heightAt(w.pos.x, w.pos.z);
    w.root.position.set(w.pos.x, w.pos.y + Math.sin(k * Math.PI) * 0.6, w.pos.z);
    const fx = Math.sin(w.facing), fz = Math.cos(w.facing);
    w.body.rotation.z = Math.sin(k * Math.PI) * 0.45 * Math.sign(d.x * fz - d.z * fx);
    if (w.effects && Math.random() < 0.4) w.effects.burst(new THREE.Vector3(w.pos.x, w.pos.y + 0.1, w.pos.z), 'dirt', 2);
    if (d.t >= d.secs) { w.dodge = null; w.body.rotation.z = 0; }
  }
  if (w.blockT > 0 && w.alive && w.state !== 'windup' && w.state !== 'strike') {
    w.sword.rotation.set(-1.9, 0, 0.7);   // weapon raised across in front
  }
}

// ---------- dash ----------
// Call BEFORE the normal update. From the middle distance he starts a dash instead of walking up.
export function maybeStartDash(w, players, D) {
  w.dashCd = (w.dashCd ?? 2);
  if (w.state !== 'chase' || w.dashCd > 0) return;
  const t = players.filter(p => p.alive && !p.perch && !p.climb
      && (!w.leash || Math.hypot(p.pos.x - w.leash.x, p.pos.z - w.leash.z) < w.leash.r))
    .map(p => ({ p, d: Math.hypot(p.pos.x - w.pos.x, p.pos.z - w.pos.z) }))
    .filter(o => o.d > D.minRange && o.d < D.maxRange && (o.p.revealed > 0 || !w.world.inHideout(o.p.pos.x, o.p.pos.z)))
    .sort((a, b) => a.d - b.d)[0];
  if (!t) return;
  const dx = t.p.pos.x - w.pos.x, dz = t.p.pos.z - w.pos.z;
  w.dashDir = { x: dx / t.d, z: dz / t.d };
  w.dashLen = t.d + 3;
  w.attack = 'dash';
  w.state = 'windup';
  w.timer = D.windup;
  w.dashCd = D.cooldown;
  sfx.katanaDraw();
}

// The dash attack's strike: off he goes.
export function startDash(w) {
  sfx.swing();
  w.dash = { left: w.dashLen, hit: new Set() };
  w.timer = 5;   // the dash ends itself when it has gone the whole way
}

// Call AFTER the normal update: the streak while crouching, then flying along the line.
export function updateDash(w, dt, players, D) {
  w.dashCd -= dt;
  const dashing = w.attack === 'dash' && w.alive;
  if (dashing && (w.state === 'windup' || w.state === 'strike')) {
    w.facing = Math.atan2(w.dashDir.x, w.dashDir.z);   // locked on his line
    w.root.rotation.y = w.facing;
  }
  const winding = dashing && w.state === 'windup';
  w.streak.visible = winding;
  if (winding) {
    const k = 1 - Math.max(0, w.timer) / D.windup;
    w.streak.position.set(w.pos.x, w.pos.y + 0.1, w.pos.z);
    w.streak.rotation.y = w.facing;
    w.streak.scale.z = w.dashLen;
    w.streak.material.opacity = 0.2 + k * 0.4 + Math.sin(performance.now() / 50) * 0.08;
    w.sword.rotation.set(0.7, 0, 0.3);
    w.body.rotation.x = 0.35;
  }
  if (dashing && w.state === 'strike' && w.dash) {
    const step = Math.min(D.speed * dt, w.dash.left);
    const bx = w.pos.x, bz = w.pos.z;
    w.pos.x += w.dashDir.x * step;
    w.pos.z += w.dashDir.z * step;
    w.world.resolveCollision(w.pos, w.radius, w.pos.y + 1);
    const moved = Math.hypot(w.pos.x - bx, w.pos.z - bz);
    w.dash.left -= step;
    if (moved < step * 0.3) w.dash.left = 0;   // ran into something solid
    w.pos.y = w.world.heightAt(w.pos.x, w.pos.z);
    for (const p of players) {
      if (!p.alive || p.perch || p.climb || w.dash.hit.has(p)) continue;
      if (Math.hypot(p.pos.x - w.pos.x, p.pos.z - w.pos.z) < 1.1) {
        w.dash.hit.add(p);
        p.hurt(w.damage * D.damage);
        p.justHurt = true;
        p.vel.x += w.dashDir.z * 6; p.vel.z -= w.dashDir.x * 6;   // knocked aside
        sfx.katanaHit?.(); sfx.hurt();
      }
    }
    w.sword.rotation.set(-1.5, 0, 0.5);
    w.body.rotation.x = 0.25;
    w.root.position.set(w.pos.x, w.pos.y, w.pos.z);
    if (w.dash.left <= 0) { w.timer = 0; w.dash = null; }
    if (w.effects && Math.random() < 0.5) w.effects.burst(new THREE.Vector3(bx, w.pos.y + 0.2, bz), 'dirt', 2);
  }
}

// ---------- slam ----------
export function slamCenter(w, reach = 1.8) {
  return { x: w.pos.x + Math.sin(w.facing) * reach, z: w.pos.z + Math.cos(w.facing) * reach };
}

// Show the red ring while winding up a slam attack (call after the normal update).
export function updateSlamRing(w, ring, fill, a) {
  const slamming = w.alive && w.state === 'windup' && w.attacks[w.attack]?.slam;
  ring.visible = fill.visible = !!slamming;
  if (!slamming) return;
  const c = slamCenter(w), y = w.world.heightAt(c.x, c.z) + 0.12;
  const k = 1 - Math.max(0, w.timer) / a.windup;
  ring.position.set(c.x, y, c.z);
  fill.position.set(c.x, y, c.z);
  ring.material.opacity = 0.45 + Math.sin(performance.now() / 70) * 0.25;
  fill.material.opacity = 0.08 + k * 0.25;
}

// The slam lands: hurt and knock back everyone in the ring, throw up dirt, shake the camera.
export function slamHit(w, players, a) {
  const c = slamCenter(w);
  for (const p of players) {
    if (!p.alive || p.perch || p.climb) continue;
    const dx = p.pos.x - c.x, dz = p.pos.z - c.z, d = Math.hypot(dx, dz);
    if (d < a.radius) {
      p.hurt(w.damage * a.damage);
      p.justHurt = true;
      p.vel.x += (dx / (d || 1)) * 8; p.vel.z += (dz / (d || 1)) * 8;
      sfx.hurt();
    }
  }
  if (w.effects) {
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const x = c.x + Math.cos(ang) * a.radius * 0.7, z = c.z + Math.sin(ang) * a.radius * 0.7;
      w.effects.burst(new THREE.Vector3(x, w.world.heightAt(x, z) + 0.2, z), 'dirt', 5);
    }
  }
  sfx.treeCrash();
  w.onShake?.(0.9);
}
