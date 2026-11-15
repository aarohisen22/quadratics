// A ninja brother: his body, his weapons, how he moves, and his animations.
import * as THREE from 'three';
import { buildNinja, buildUzi, buildShotgun, buildKatana, buildSmokeBomb, part } from './models.js';
import { sfx } from './sound.js';

export { part } from './models.js';

const SCALE = 1.15;   // bigger than real life so he reads well from the overhead camera

// Arm poses for each weapon: [shoulder x, shoulder z, elbow x] for right and left arms,
// plus how the weapon sits in the right hand.
const POSES = {
  uzi:     { r: [-0.55, 0.12, -1.15], l: [-0.85, -0.55, -0.95], hold: [1.7, 0, 0] },
  shotgun: { r: [-0.55, 0.12, -1.15], l: [-1.15, -0.4, -0.35], hold: [1.7, 0, 0] },
  katana:  { r: [-0.35, 0.15, -0.9],  l: [0.1, -0.12, -0.2],   hold: [1.9, 0, 0] },
  smoke:   { r: [-0.3, 0.1, -1.0],    l: [0.1, -0.12, -0.2],   hold: [1.6, 0, 0] },
};

// Where each weapon is carried, and how the right arm reaches for it there
// (shoulder x, shoulder y, shoulder z, elbow x).
const REACH = {
  uzi:     { sx: 0.15, sy: 0, sz: 0.3, ex: -0.5 },     // holster on the right hip
  shotgun: { sx: 0.55, sy: 0, sz: 0.25, ex: -0.7 },    // stock at the right hip, slung across the back
  katana:  { sx: -2.9, sy: 0, sz: 0.15, ex: -2.0 },    // handle over the right shoulder
  smoke:   { sx: -0.45, sy: 0.5, sz: -0.5, ex: -1.3 }, // bombs on the left of the belt
};
const SWITCH_TIME = 0.5;   // seconds to put one weapon away and draw the next
// Parts of a switch: put away the old one, reach for the new one, bring it up.
const PUT_AWAY = 0.4, GRAB = 0.7;

// Weapons he's carrying but not holding: Uzi in a hip holster, shotgun on his back,
// smoke bombs hanging from his belt, plus a shuriken for the left hand to pull out of the pouch.
function buildCarried(body, armL) {
  const leather = new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 0.7 });
  const holster = new THREE.Group();
  holster.position.set(0.25, 0.92, 0.02);
  holster.rotation.z = 0.12;
  body.add(holster);
  holster.add(part(new THREE.BoxGeometry(0.075, 0.2, 0.11), leather, 0, -0.1, 0.02));
  holster.add(part(new THREE.BoxGeometry(0.02, 0.12, 0.02), leather, 0, 0.04, 0.0));   // strap to the sash
  const uzi = buildUzi();
  uzi.rotation.x = Math.PI / 2;   // barrel down into the holster
  uzi.position.set(0, 0.0, 0.05);
  holster.add(uzi);

  const sling = new THREE.Group();   // shotgun slung across the back, stock at the right hip
  sling.position.set(0.02, 1.22, -0.21);
  sling.rotation.z = 0.75;
  body.add(sling);
  const shotgun = buildShotgun();
  shotgun.rotation.x = -Math.PI / 2;   // barrel up
  shotgun.position.y = -0.1;
  sling.add(shotgun);

  const bombs = [[-0.21, 0.07], [-0.15, 0.13], [-0.075, 0.165]].map(([x, z]) => {
    const b = buildSmokeBomb();
    b.scale.setScalar(0.8);
    b.position.set(x, 0.86, z);
    body.add(b);
    return b;
  });

  const star = part(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 8),
    new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.9, roughness: 0.25 }), 0, -0.06, 0.03);
  star.rotation.x = Math.PI / 2;
  star.visible = false;
  armL.hand.add(star);
  return { uzi, shotgun, bombs, star };
}

export class Ninja {
  constructor(scene, world, cfg, weapons, { bandColor = 0xc0272d, x = 0, z = 0 } = {}) {
    this.world = world;
    this.cfg = cfg;
    this.weapons = weapons;
    this.bandColor = bandColor;
    this.radius = 0.42;
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.facing = 0;      // angle around the up axis; 0 = facing +z
    this.walkPhase = 0;
    this.time = 0;

    Object.assign(this, buildNinja(bandColor));
    this.root.scale.setScalar(SCALE);

    // All the weapons he can hold; only the current one is shown.
    this.models = { uzi: buildUzi(), shotgun: buildShotgun(), katana: buildKatana(), smoke: buildSmokeBomb() };
    for (const m of Object.values(this.models)) { m.visible = false; this.armR.hand.add(m); }
    this.carried = buildCarried(this.body, this.armL);
    scene.add(this.root);
    this.reset(x, z);
  }

  reset(x, z) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.health = this.cfg.health;
    this.ammo = this.weapons.uziAmmo;
    this.shurikens = this.weapons.shurikens;
    this.special = null;     // { type: 'shotgun' | 'katana' | 'smoke', count }
    this.current = 'uzi';
    this.alive = true;
    this.fireCooldown = 0;
    this.recoil = 0;
    this.swing = -1;         // katana slash progress 0..1 (-1 = not swinging)
    this.throwT = -1;        // throwing arm progress 0..1
    this.fallen = 0;
    this.reviveProgress = 0;
    this.lastAttacker = null;
    this.respawnIn = null;
    this.root.rotation.x = 0;
    this.hold('uzi');
  }

  // Instantly holding this weapon (new game, respawn).
  hold(type) {
    this.current = type;
    this.switching = null;
    this.showHeld();
  }

  // Put the current weapon away and draw another one (takes SWITCH_TIME; can't fire meanwhile).
  switchTo(type) {
    if (type === this.current && !this.switching) return;
    this.switching = { from: this.displayed, to: type, t: 0, drawn: false };
    this.current = type;
  }

  // What's actually in his hand right now (nothing for a moment while switching).
  get displayed() {
    const w = this.switching;
    if (!w) return this.current;
    return w.t < PUT_AWAY ? w.from : w.t < GRAB ? null : w.to;
  }

  // Show the weapon in his hand, and everything else where it's carried.
  showHeld() {
    const d = this.displayed;
    for (const [k, m] of Object.entries(this.models)) m.visible = k === d;
    const c = this.carried, sp = this.special;
    c.uzi.visible = d !== 'uzi';
    c.shotgun.visible = !!sp && sp.type === 'shotgun' && d !== 'shotgun';
    const bombs = sp && sp.type === 'smoke' ? Math.min(3, sp.count - (d === 'smoke' ? 1 : 0)) : 0;
    c.bombs.forEach((b, i) => { b.visible = i < bombs; });
    // The sheath stays on his back; only the handle goes when the katana is out.
    this.sheath.children[1].visible = this.sheath.children[2].visible = d !== 'katana';
  }

  // Back on his feet after his brother helped him (or a new level started).
  revive(healthFraction) {
    this.alive = true;
    this.health = Math.max(1, Math.round(this.cfg.health * healthFraction));
    this.fallen = 0;
    this.reviveProgress = 0;
    this.vy = 0;
    this.root.rotation.x = 0;
  }

  get forward() { return { x: Math.sin(this.facing), z: Math.cos(this.facing) }; }

  // The real tip of the gun barrel (or the hand, for the katana and smoke bombs).
  muzzlePosition(out) {
    if (this.view) return this.view.muzzle(out);   // first person: the gun you see on screen
    this.root.updateMatrixWorld(true);
    const m = this.models[this.current];
    return (m.userData.muzzle || this.armR.hand).getWorldPosition(out);
  }

  ejectPosition(out) {
    if (this.view) return this.view.eject(out);
    const m = this.models[this.current];
    return (m.userData.eject || this.armR.hand).getWorldPosition(out);
  }

  // Where thrown things (shurikens) leave from: the left hand.
  throwPosition(out) {
    if (this.view) return this.view.throwFrom(out);
    this.root.updateMatrixWorld(true);
    return this.armL.hand.getWorldPosition(out);
  }

  hurt(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.alive = false;
  }

  // Hit by the other brother's weapon (VS mode). Returns true if it knocked him down.
  hit(amount, dirX, dirZ, heavy = false, attacker = null) {
    if (!this.alive) return false;
    this.lastAttacker = attacker;
    this.hurt(amount);
    this.justHurt = true;
    this.vel.x += dirX * (heavy ? 7 : 2);
    this.vel.z += dirZ * (heavy ? 7 : 2);
    sfx.hurt();
    return !this.alive;
  }

  // ctrl comes from Input.read(); aimPoint is where the mouse points on the ground.
  update(dt, ctrl, aimPoint) {
    const c = this.cfg;
    this.time += dt;
    this.recoil = Math.max(0, this.recoil - dt * 9);
    if (this.swing >= 0) { this.swing += dt / 0.32; if (this.swing > 1) this.swing = -1; }
    if (this.throwT >= 0) { this.throwT += dt / 0.3; if (this.throwT > 1) this.throwT = -1; }
    const w = this.switching;
    if (w) {
      w.t += dt / SWITCH_TIME;
      if (!w.drawn && w.t >= GRAB) {
        w.drawn = true;
        if (w.to === 'katana') sfx.katanaDraw(); else sfx.switchWeapon();
      }
      if (w.t >= 1) this.switching = null;
    }

    if (!this.alive) {  // fall over
      this.fallen = Math.min(1, this.fallen + dt * 3);
      this.root.rotation.x = -this.fallen * Math.PI / 2;
      this.pos.y = this.world.heightAt(this.pos.x, this.pos.z) + 0.15;
      this.root.position.copy(this.pos);
      return;
    }

    // Moving: the camera looks north, so stick up = -z.
    const wading = this.world.waterDepthAt(this.pos.x, this.pos.z) > 0.25;   // the stream slows you down
    const speed = (ctrl.run ? c.runSpeed : c.walkSpeed) * ctrl.move.mag * (wading ? 0.55 : 1);
    const mx = ctrl.move.mag ? ctrl.move.x / ctrl.move.mag : 0;
    const mz = ctrl.move.mag ? ctrl.move.y / ctrl.move.mag : 0;
    const blend = 1 - Math.exp(-12 * dt);
    this.vel.x += (mx * speed - this.vel.x) * blend;
    this.vel.z += (mz * speed - this.vel.z) * blend;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.world.resolveCollision(this.pos, this.radius, this.pos.y);

    // Jumping and gravity.
    const ground = this.world.heightAt(this.pos.x, this.pos.z);
    if (ctrl.jumpPressed && this.onGround) { this.vy = c.jumpSpeed; this.onGround = false; }
    this.vy -= c.gravity * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.onGround = true; }
    else if (this.onGround && this.pos.y - ground < 0.35) { this.pos.y = ground; this.vy = 0; } // walk down slopes
    else this.onGround = false;

    // Facing: aim stick, then mouse, then the way he's walking.
    let target = null;
    if (ctrl.aim) target = Math.atan2(ctrl.aim.x, ctrl.aim.y);
    else if (ctrl.aimMouse && aimPoint) target = Math.atan2(aimPoint.x - this.pos.x, aimPoint.z - this.pos.z);
    else if (ctrl.move.mag > 0.1) target = Math.atan2(mx, mz);
    if (target !== null) {
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * (1 - Math.exp(-14 * dt));
    }

    this.animate(dt);
  }

  animate(dt) {
    const moving = Math.hypot(this.vel.x, this.vel.z);
    const k = Math.min(1, moving / this.cfg.walkSpeed);
    this.walkPhase += dt * (4 + moving * 1.3);
    const s = Math.sin(this.walkPhase);
    const swingLeg = s * 0.7 * k;

    const [L, R] = this.legs;
    if (this.onGround) {
      L.hip.rotation.x = swingLeg;
      R.hip.rotation.x = -swingLeg;
      L.knee.rotation.x = Math.max(0, -s) * 0.9 * k + 0.05;
      R.knee.rotation.x = Math.max(0, s) * 0.9 * k + 0.05;
      this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.05 * k;
      this.body.rotation.y = s * 0.06 * k;
    } else {
      L.hip.rotation.x = -1.0; L.knee.rotation.x = 1.3;    // tuck legs mid-jump
      R.hip.rotation.x = -0.3; R.knee.rotation.x = 0.6;
    }
    this.body.rotation.x = 0.06 * k;   // lean into the run

    // Arms: pose for the weapon, plus recoil, katana slash and shuriken throw.
    const pose = POSES[this.current];
    const blend = 1 - Math.exp(-18 * dt);
    const setArm = (arm, [sx, sz, ex], extra = {}) => {
      arm.shoulder.rotation.x += ((extra.sx ?? sx) - arm.shoulder.rotation.x) * blend;
      arm.shoulder.rotation.y += ((extra.sy ?? 0) - arm.shoulder.rotation.y) * blend;
      arm.shoulder.rotation.z += ((extra.sz ?? sz) - arm.shoulder.rotation.z) * blend;
      arm.elbow.rotation.x += ((extra.ex ?? ex) - arm.elbow.rotation.x) * blend;
    };

    const rExtra = {};
    if (this.swing >= 0) {
      // Big sideways slash: arm out front, sweeping right to left.
      const t = this.swing;
      rExtra.sx = -1.45; rExtra.ex = -0.15;
      rExtra.sy = 1.3 - t * 2.6;
      rExtra.sz = 0.2;
    } else if (this.switching) {
      // Reach to where the old weapon goes, then to where the new one is, then back to the pose.
      const t = this.switching.t;
      const r = t < PUT_AWAY ? REACH[this.switching.from] : t < GRAB ? REACH[this.switching.to] : null;
      if (r) Object.assign(rExtra, r);
    } else if (this.current !== 'katana' && this.current !== 'smoke') {
      rExtra.sx = pose.r[0] + this.recoil * 0.12 + s * 0.03 * k;
      rExtra.ex = pose.r[2] - this.recoil * 0.1;
    }
    if (this.current === 'smoke' && this.throwT >= 0) {
      const t = this.throwT;
      rExtra.sx = t < 0.4 ? 0.6 : -2.2;   // wind up behind, then fling forward
      rExtra.ex = t < 0.4 ? -1.4 : -0.2;
    }
    setArm(this.armR, pose.r, rExtra);

    const lExtra = {};
    const throwing = this.throwT >= 0 && this.current !== 'smoke';
    this.carried.star.visible = throwing && this.throwT > 0.15 && this.throwT < 0.55;
    if (throwing) {
      const t = this.throwT;                 // pull a shuriken from the belt pouch, then flick it
      lExtra.sx = t < 0.3 ? 0.1 : t < 0.45 ? -0.4 : -1.7;
      lExtra.sz = t < 0.3 ? 0.1 : t < 0.45 ? 0.9 : -0.15;
      lExtra.ex = t < 0.3 ? -0.9 : t < 0.45 ? -1.6 : -0.1;
    } else if (pose.l[0] > 0) {
      lExtra.sx = 0.1 - s * 0.35 * k;      // free arm swings when walking
    }
    setArm(this.armL, pose.l, lExtra);

    this.showHeld();
    const d = this.displayed;
    if (d) {
      const held = this.models[d], hp = POSES[d].hold;
      held.rotation.set(hp[0], hp[1], hp[2]);
      if (d === 'katana' && this.swing >= 0) held.rotation.x = 1.6;   // blade forward during the slash
      if (d === 'shotgun') held.userData.pump.position.z = 0.33 - Math.max(0, this.recoil - 0.3) * 0.12;
    }

    // Headband tails flap in the wind.
    this.tails.forEach((t, i) => {
      t.rotation.x = -0.45 - moving * 0.06 + Math.sin(this.time * 11 + i) * 0.12;
      t.rotation.y = (i ? 0.25 : -0.25) + Math.sin(this.time * 7 + i * 2) * 0.1;
    });

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }
}
