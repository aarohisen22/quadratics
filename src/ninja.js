// A ninja brother: his body, how he moves, and his walk animation.
// The body is made from simple shapes for now; a detailed model can replace it later.
import * as THREE from 'three';

function part(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildBody(bandColor) {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.8 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x2c313b, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc8956a, roughness: 0.6 });
  const band = new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.35, metalness: 0.7 });

  const root = new THREE.Group();   // feet at y = 0, faces +z
  const body = new THREE.Group();   // bobs up and down while walking
  root.add(body);

  // Torso, belt and head.
  const torso = part(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), cloth, 0, 1.3, 0);
  torso.scale.set(1.2, 1, 0.8);
  body.add(torso);
  const belt = part(new THREE.TorusGeometry(0.2, 0.035, 6, 16), band, 0, 1.05, 0);
  belt.rotation.x = Math.PI / 2; belt.scale.set(1.15, 0.8, 1);
  body.add(belt);
  const head = part(new THREE.SphereGeometry(0.17, 16, 12), cloth, 0, 1.74, 0);
  body.add(head);
  body.add(part(new THREE.BoxGeometry(0.26, 0.055, 0.1), skin, 0, 1.76, 0.12)); // eye slit
  const headband = part(new THREE.TorusGeometry(0.172, 0.028, 6, 20), band, 0, 1.81, 0);
  headband.rotation.x = Math.PI / 2;
  body.add(headband);
  for (const side of [-1, 1]) {   // headband tails flying behind
    const tail = part(new THREE.BoxGeometry(0.05, 0.02, 0.32), band, side * 0.04, 1.79, -0.3);
    tail.rotation.set(-0.5, side * 0.25, 0);
    body.add(tail);
  }

  // Legs swing from the hips.
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.12, 0.98, 0);
    hip.add(part(new THREE.CapsuleGeometry(0.085, 0.62, 4, 8), wrap, 0, -0.42, 0));
    hip.add(part(new THREE.BoxGeometry(0.13, 0.08, 0.26), cloth, 0, -0.92, 0.05));
    body.add(hip); legs.push(hip);
  }

  // Arms hold the Uzi forward.
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.28, 1.5, 0);
    shoulder.add(part(new THREE.CapsuleGeometry(0.065, 0.45, 4, 8), wrap, 0, -0.28, 0));
    body.add(shoulder); arms.push(shoulder);
  }
  arms[1].rotation.set(-1.35, 0, 0.12);   // right arm: gun forward
  arms[0].rotation.set(-1.15, 0, -0.45);  // left arm: supporting

  const uzi = new THREE.Group();
  uzi.add(part(new THREE.BoxGeometry(0.07, 0.1, 0.3), metal, 0, 0, 0.04));
  uzi.add(part(new THREE.BoxGeometry(0.05, 0.16, 0.05), metal, 0, -0.1, 0));
  const barrel = part(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), metal, 0, 0.02, 0.24);
  barrel.rotation.x = Math.PI / 2;
  uzi.add(barrel);
  uzi.position.set(0, -0.58, 0.04);
  uzi.rotation.x = Math.PI / 2;
  arms[1].add(uzi);

  return { root, body, legs, arms };
}

export class Ninja {
  constructor(scene, world, cfg, { bandColor = 0xc0272d, x = 0, z = 0 } = {}) {
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.4;
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.facing = 0;      // angle around the up axis; 0 = facing +z
    this.walkPhase = 0;

    const parts = buildBody(bandColor);
    Object.assign(this, parts);
    scene.add(this.root);
  }

  // ctrl comes from Input.read(); aimPoint is where the mouse points on the ground.
  update(dt, ctrl, aimPoint) {
    const c = this.cfg;

    // Moving: the camera looks north, so stick up = -z.
    const speed = (ctrl.run ? c.runSpeed : c.walkSpeed) * ctrl.move.mag;
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
    const swing = Math.sin(this.walkPhase) * 0.75 * k;

    if (this.onGround) {
      this.legs[0].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
      this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.06 * k;
    } else {
      this.legs[0].rotation.x = -0.9;   // tuck legs mid-jump
      this.legs[1].rotation.x = -0.3;
    }
    this.arms[0].rotation.x = -1.15 + swing * 0.15;
    this.arms[1].rotation.x = -1.35 + swing * 0.08;

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }
}
