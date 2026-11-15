// First-person view: the camera sits at the ninja's eyes, and you see your gloved hands
// holding the weapon in the bottom-right corner (drawn on top so it never clips into trees).
import * as THREE from 'three';
import { buildUzi, buildShotgun, buildKatana, buildSmokeBomb } from './models.js';

const glove = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.95 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.95 });

// A gloved hand at `at`, with the forearm reaching back toward the camera along `dir`.
function arm(at, dir) {
  const g = new THREE.Group();
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.09), glove);
  hand.position.copy(at);
  g.add(hand);
  const d = dir.clone().normalize();
  const len = 0.5;
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, len, 4, 10), sleeve);
  fore.position.copy(at).addScaledVector(d, len / 2 + 0.04);
  fore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  g.add(fore);
  for (let i = 0; i < 3; i++) {   // cloth wraps
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.006, 4, 12), wrapMat);
    w.position.copy(at).addScaledVector(d, 0.1 + i * 0.06);
    w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    g.add(w);
  }
  return g;
}

// A weapon with the hands holding it. Built pointing +z, then turned to point into the screen.
function heldGun(model, leftAt) {
  const g = new THREE.Group();
  g.add(model);
  g.add(arm(new THREE.Vector3(0, -0.03, -0.01), new THREE.Vector3(-0.12, -0.2, -0.45)));   // right hand on the grip
  g.add(arm(leftAt, new THREE.Vector3(0.35, -0.25, -0.45)));                                // left hand supporting
  g.rotation.y = Math.PI;
  g.userData = { muzzle: model.userData.muzzle, eject: model.userData.eject, model };
  return g;
}

export class FpsView {
  constructor(cfg) {
    this.cfg = cfg;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 10);
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 3, 1.5);
    this.scene.add(this.hemi);
    this.camera.add(this.sunLight);

    // Everything you hold sits in this group, low and to the right.
    this.holder = new THREE.Group();
    this.holder.position.set(0.17, -0.19, -0.5);
    this.camera.add(this.holder);
    this.camera.add(this.flashLight);
    this.flashLight.position.set(0.2, -0.15, -0.9);

    this.items = {
      uzi: heldGun(buildUzi(), new THREE.Vector3(0, -0.04, 0.15)),
      shotgun: heldGun(buildShotgun(), new THREE.Vector3(0, 0.03, 0.33)),
    };
    const katana = new THREE.Group();
    katana.add(buildKatana());
    katana.add(arm(new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(-0.1, -0.35, 0.4)));
    katana.position.set(-0.04, -0.02, -0.12);
    katana.scale.setScalar(0.75);
    katana.userData = {};
    this.items.katana = katana;
    const smoke = new THREE.Group();
    smoke.add(buildSmokeBomb());
    smoke.add(arm(new THREE.Vector3(0, -0.03, 0.02), new THREE.Vector3(-0.1, -0.3, 0.4)));
    smoke.position.set(0.05, 0.02, 0);
    smoke.userData = {};
    this.items.smoke = smoke;
    for (const it of Object.values(this.items)) { it.visible = false; this.holder.add(it); }

    // Left hand that flicks a shuriken.
    this.throwHand = arm(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, -0.3, 0.4));
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 8), new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.9, roughness: 0.25 }));
    star.position.set(0, 0.05, -0.03);
    this.throwHand.add(star);
    this.throwHand.visible = false;
    this.camera.add(this.throwHand);

    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
    this.player = null;
  }

  activate(player) {
    this.player = player;
    player.view = this;
    player.root.visible = false;   // you don't see your own body
    this.yaw = player.facing;
    this.pitch = 0;
  }

  deactivate() {
    if (!this.player) return;
    this.player.view = null;
    this.player.root.visible = true;
    this.player = null;
  }

  turn(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy));
  }

  // Turn the player's stick/keys (screen directions) into world directions for where you're looking.
  worldMove(move) {
    const f = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
    const r = { x: -Math.cos(this.yaw), z: Math.sin(this.yaw) };
    return { x: r.x * move.x - f.x * move.y, y: r.z * move.x - f.z * move.y, mag: move.mag };
  }

  update(dt, mainCamera, sky, flashIntensity) {
    const p = this.player;
    // Eyes: standing height, or down on the ground when knocked out.
    const down = p.alive ? 0 : Math.min(1, p.fallen);
    mainCamera.position.set(p.pos.x, p.pos.y + 1.85 - down * 1.45, p.pos.z);
    mainCamera.rotation.set(this.pitch * (1 - down) - down * 0.2, this.yaw + Math.PI, down * 0.9, 'YXZ');
    mainCamera.updateMatrixWorld();
    this.camera.position.copy(mainCamera.position);
    this.camera.quaternion.copy(mainCamera.quaternion);

    // Light the hands like the jungle around them.
    this.hemi.color.copy(sky.hemi.color);
    this.hemi.groundColor.copy(sky.hemi.groundColor);
    this.hemi.intensity = sky.hemi.intensity * 1.8 + 0.6;   // a bit brighter so the gun isn't a black shape
    this.sunLight.color.copy(sky.sun.color);
    this.sunLight.intensity = sky.sun.intensity * 0.8 + 0.5;
    this.sunLight.position.set(0.4, 1, 0.6);   // light from above-behind, relative to your view
    this.flashLight.intensity = flashIntensity * 0.25;

    // Show what you're holding, with walk bob, recoil kick, katana slash and throws.
    for (const [k, it] of Object.entries(this.items)) it.visible = p.alive && k === p.current;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    this.bob += dt * (2 + speed * 1.6);
    const k = Math.min(1, speed / 5);
    const h = this.holder;
    h.position.set(0.17 + Math.sin(this.bob) * 0.012 * k, -0.19 - Math.abs(Math.cos(this.bob)) * 0.014 * k, -0.5 + p.recoil * 0.05);
    h.rotation.set(p.recoil * 0.12, 0, 0);
    if (p.current === 'katana') {
      if (p.swing >= 0) {
        const t = p.swing;   // big slash from right to left
        h.position.x = 0.25 - t * 0.5;
        h.rotation.set(-0.3, 0.2, 1.2 - t * 2.2);
      } else {
        h.rotation.set(-0.3, 0, 0.28);   // blade leaning in toward the middle
      }
    }
    if (p.current === 'smoke' && p.throwT >= 0) h.position.z -= Math.sin(p.throwT * Math.PI) * 0.3;
    if (p.current === 'shotgun') this.items.shotgun.userData.model.userData.pump.position.z = 0.33 - Math.max(0, p.recoil - 0.3) * 0.12;

    const throwing = p.throwT >= 0 && p.current !== 'smoke';
    this.throwHand.visible = p.alive && throwing;
    if (throwing) {
      const t = p.throwT;
      this.throwHand.position.set(-0.25 + t * 0.15, -0.25 + Math.sin(t * Math.PI) * 0.12, -0.45 - t * 0.25);
    }
    this.camera.updateMatrixWorld(true);
  }

  muzzle(out) {
    const it = this.items[this.player.current];
    return (it.userData.muzzle || this.holder).getWorldPosition(out);
  }

  eject(out) {
    const it = this.items[this.player.current];
    return (it.userData.eject || this.holder).getWorldPosition(out);
  }

  throwFrom(out) {
    // Shurikens and smoke bombs leave from just in front of your face.
    return out.set(0, -0.15, -0.6).applyMatrix4(this.camera.matrixWorld);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  render(renderer) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
}
