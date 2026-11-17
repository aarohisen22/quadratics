// Detailed 3D models built in code: the ninja, the weapons and the supply crates.
// Every gun is built pointing forward (+z), with its grip at (0, 0, 0) where the hand holds it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pixelTexture } from './pixeltex.js';

export function part(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const rbox = (w, h, d, r = 0.006, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
const cyl = (r, len, seg = 12) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2); // along z

// ---------- shared materials ----------
export const MAT = {
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.8, roughness: 0.42 }),
  blackened: new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.6, roughness: 0.5 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.05, roughness: 0.75 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5b3a22, metalness: 0, roughness: 0.6 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.12 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xb8913c, metalness: 0.9, roughness: 0.3 }),
  wrapCord: new THREE.MeshStandardMaterial({ color: 0x1b2340, roughness: 0.85 }),
  lacquer: new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: 0.2, roughness: 0.25 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.3 }),
};

// ---------- Uzi submachine gun ----------
export function buildUzi() {
  const g = new THREE.Group();
  const M = MAT;
  g.add(part(rbox(0.056, 0.078, 0.30, 0.01), M.gunmetal, 0, 0.075, 0.05));          // receiver
  for (let i = 0; i < 4; i++) g.add(part(rbox(0.05, 0.006, 0.012, 0.002), M.blackened, 0, 0.116, -0.04 + i * 0.05)); // top-cover ribs
  g.add(part(rbox(0.046, 0.13, 0.052, 0.012), M.polymer, 0, -0.03, 0.0)); // pistol grip
  g.children.at(-1).rotation.x = 0.12;
  g.add(part(rbox(0.032, 0.14, 0.036, 0.004), M.blackened, 0, -0.14, -0.012));     // magazine through the grip
  g.add(part(rbox(0.036, 0.012, 0.042, 0.004), M.gunmetal, 0, -0.215, -0.012));    // magazine base plate
  const guard = part(new THREE.TorusGeometry(0.026, 0.004, 6, 16, Math.PI), M.gunmetal, 0, 0.03, 0.055);
  guard.rotation.set(Math.PI, Math.PI / 2, 0);
  g.add(guard);
  g.add(part(rbox(0.008, 0.026, 0.008, 0.002), M.blackened, 0, 0.025, 0.05));      // trigger
  g.add(part(cyl(0.02, 0.022), M.gunmetal, 0, 0.075, 0.21));                        // barrel nut
  g.add(part(cyl(0.011, 0.075), M.blackened, 0, 0.075, 0.25));                      // barrel
  g.add(part(rbox(0.006, 0.03, 0.008, 0.002), M.blackened, 0, 0.128, 0.17));        // front sight post
  for (const s of [-1, 1]) g.add(part(rbox(0.005, 0.03, 0.016, 0.002), M.gunmetal, s * 0.014, 0.128, 0.17)); // sight ears
  g.add(part(rbox(0.03, 0.022, 0.016, 0.003), M.gunmetal, 0, 0.124, -0.085));       // rear sight
  g.add(part(new THREE.SphereGeometry(0.009, 8, 6), M.blackened, 0, 0.122, 0.09));  // cocking knob
  for (const s of [-1, 1]) g.add(part(cyl(0.004, 0.26, 6), M.gunmetal, s * 0.026, 0.03, 0.06)); // folded stock arms
  g.add(part(rbox(0.06, 0.03, 0.01, 0.003), M.gunmetal, 0, 0.03, 0.19));            // stock butt plate (folded)
  g.add(part(rbox(0.004, 0.012, 0.02, 0.002), M.blackened, -0.03, 0.06, -0.02));     // fire selector
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.075, 0.3); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(-0.03, 0.09, 0.08); g.add(eject);
  g.userData = { muzzle, eject };
  return g;
}

// ---------- pump shotgun ----------
export function buildShotgun() {
  const g = new THREE.Group();
  const M = MAT;
  g.add(part(rbox(0.05, 0.075, 0.22, 0.01), M.gunmetal, 0, 0.07, 0.05));           // receiver
  g.add(part(cyl(0.013, 0.5), M.blackened, 0, 0.09, 0.4));                          // barrel
  g.add(part(cyl(0.013, 0.42), M.gunmetal, 0, 0.055, 0.36));                        // magazine tube
  const pump = part(rbox(0.05, 0.045, 0.17, 0.012), M.wood, 0, 0.058, 0.33);       // pump
  g.add(pump);
  for (let i = 0; i < 5; i++) g.add(part(rbox(0.052, 0.003, 0.006, 0.001), M.blackened, 0, 0.081, 0.27 + i * 0.03)); // grip grooves
  g.add(part(new THREE.SphereGeometry(0.006, 6, 6), M.gold, 0, 0.105, 0.64));       // bead sight
  g.add(part(rbox(0.044, 0.11, 0.05, 0.012), M.wood, 0, -0.01, -0.02)); // pistol grip
  g.children.at(-1).rotation.x = 0.35;
  const stock = part(rbox(0.044, 0.1, 0.3, 0.02), M.wood, 0, 0.02, -0.2);
  stock.rotation.x = -0.08;
  g.add(stock);
  g.add(part(rbox(0.048, 0.11, 0.02, 0.008), M.polymer, 0, 0.012, -0.355));         // recoil pad
  const guard = part(new THREE.TorusGeometry(0.026, 0.004, 6, 16, Math.PI), M.gunmetal, 0, 0.03, 0.05);
  guard.rotation.set(Math.PI, Math.PI / 2, 0);
  g.add(guard);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.09, 0.66); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(-0.03, 0.08, 0.08); g.add(eject);
  g.userData = { muzzle, eject, pump };
  return g;
}

// ---------- katana (blade points up +y from the hand) ----------
export function buildKatana(bladeLength = 0.72) {
  const g = new THREE.Group();
  const M = MAT;
  // Curved, tapering blade drawn as a side profile, then given a little thickness.
  const s = new THREE.Shape();
  const curve = t => 0.05 * t * t;
  const steps = 16;
  s.moveTo(0.013, 0);
  for (let i = 1; i <= steps; i++) { const t = i / steps; s.lineTo(0.013 - curve(t), t * bladeLength * 0.97); }
  s.lineTo(-0.03 - curve(1) * 0.6, bladeLength);                 // the tip
  for (let i = steps; i >= 0; i--) { const t = i / steps; s.lineTo(-0.017 * (1 - t * 0.25) - curve(t), t * bladeLength * 0.95); }
  s.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  bladeGeo.translate(0, 0, -0.003).rotateY(Math.PI / 2);
  g.add(part(bladeGeo, M.steel, 0, 0.045, 0));
  g.add(part(rbox(0.018, 0.03, 0.03, 0.004), M.gold, 0, 0.03, 0));                  // habaki collar
  g.add(part(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 16), M.gold, 0, 0.012, 0)); // tsuba guard
  g.add(part(new THREE.CylinderGeometry(0.016, 0.017, 0.24, 10), M.wrapCord, 0, -0.11, 0)); // wrapped handle
  for (let i = 0; i < 6; i++) {                                                      // diamond cord wraps
    const w = part(new THREE.TorusGeometry(0.0175, 0.003, 4, 10), M.lacquer, 0, -0.02 - i * 0.035, 0);
    w.rotation.x = Math.PI / 2 + (i % 2 ? 0.3 : -0.3);
    g.add(w);
  }
  g.add(part(new THREE.CylinderGeometry(0.018, 0.016, 0.02, 10), M.gold, 0, -0.235, 0)); // pommel cap
  return g;
}

export function buildSheath(length = 0.78) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.02, 0.016, length, 10), MAT.lacquer, 0, length / 2, 0));
  g.add(part(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 16), MAT.gold, 0, length + 0.01, 0));
  g.add(part(new THREE.CylinderGeometry(0.016, 0.017, 0.22, 10), MAT.wrapCord, 0, length + 0.12, 0));
  return g;
}

// ---------- gatling gun (points +z, six barrels that spin around the middle) ----------
export function buildGatling() {
  const g = new THREE.Group();
  const M = MAT;
  g.add(part(rbox(0.11, 0.12, 0.26, 0.015), M.gunmetal, 0, 0.06, -0.02));            // housing
  g.add(part(rbox(0.035, 0.12, 0.05, 0.01), M.polymer, 0, -0.04, -0.1));             // rear grip
  g.children.at(-1).rotation.x = 0.25;
  const handle = part(new THREE.TorusGeometry(0.06, 0.008, 6, 14, Math.PI), M.blackened, 0, 0.12, 0.0);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);                                                                      // carry handle on top
  const barrels = new THREE.Group();
  barrels.position.set(0, 0.06, 0.12);
  g.add(barrels);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    barrels.add(part(cyl(0.012, 0.56, 8), M.blackened, Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0.28));
  }
  for (const z of [0.06, 0.3, 0.55]) barrels.add(part(cyl(0.05, 0.018, 12), M.gunmetal, 0, 0, z));   // barrel clamps
  const box = part(rbox(0.07, 0.11, 0.13, 0.01), M.wood, -0.1, -0.02, -0.02);        // ammo box on the left
  g.add(box);
  for (let i = 0; i < 4; i++) g.add(part(rbox(0.012, 0.03, 0.012, 0.002), M.brass, -0.06 + i * 0.012, 0.05 - i * 0.008, -0.02)); // belt
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.06, 0.7); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.06, 0.05, 0.0); g.add(eject);
  g.userData = { muzzle, eject, barrels };
  return g;
}

// A four-pointed throwing star with a hole in the middle, lying flat.
export function makeShurikenGeometry() {
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

const bombMats = {};
export function buildSmokeBomb() {
  if (!bombMats.shell) {
    bombMats.shell = new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 0.45, metalness: 0.35 });
    bombMats.band = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.7 });
    bombMats.paper = new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.9 });
    bombMats.fuse = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
    bombMats.ember = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: 2 });
  }
  const M = bombMats;
  const g = new THREE.Group();
  const c = new THREE.Group(); c.position.set(0, 0.02, 0.03); g.add(c);
  const shell = part(new THREE.SphereGeometry(0.05, 16, 12), M.shell);
  shell.scale.set(1, 0.92, 1);
  c.add(shell);
  const band = part(new THREE.TorusGeometry(0.05, 0.008, 6, 20), M.band);   // red paper band around the middle
  band.rotation.x = Math.PI / 2;
  c.add(band);
  for (const s of [-1, 1]) {                                                 // two little rivets on the band
    c.add(part(new THREE.SphereGeometry(0.006, 6, 4), M.paper, s * 0.05, 0, 0));
  }
  c.add(part(new THREE.CylinderGeometry(0.012, 0.022, 0.02, 8), M.paper, 0, 0.052, 0));   // twisted paper cap
  const twist = part(new THREE.ConeGeometry(0.014, 0.03, 6), M.paper, 0, 0.074, 0);
  twist.rotation.y = 0.6;
  c.add(twist);
  const fuse = part(new THREE.CylinderGeometry(0.0035, 0.0035, 0.04, 5), M.fuse, 0.008, 0.1, 0);
  fuse.rotation.z = -0.35;
  c.add(fuse);
  const ember = part(new THREE.SphereGeometry(0.007, 6, 4), M.ember, 0.016, 0.12, 0);
  ember.castShadow = false;
  c.add(ember);
  return g;
}

// ---------- the ninja ----------
export function buildNinja(bandColor) {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.92 });
  const clothLight = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.95 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc58f63, roughness: 0.6 });
  const band = new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.65 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 0.7 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.2 });

  const root = new THREE.Group();   // feet at y = 0, faces +z
  const body = new THREE.Group();   // bobs while walking
  root.add(body);

  // Torso: broad chest, narrow waist, crossed collar, sash and straps.
  const chest = part(new THREE.CapsuleGeometry(0.17, 0.26, 6, 14), cloth, 0, 1.36, 0);
  chest.scale.set(1.35, 1, 0.82);
  body.add(chest);
  const waist = part(new THREE.CylinderGeometry(0.17, 0.2, 0.22, 14), cloth, 0, 1.08, 0);
  waist.scale.z = 0.8;
  body.add(waist);
  for (const s of [-1, 1]) {
    const collar = part(rbox(0.05, 0.3, 0.02, 0.008), clothLight, s * 0.05, 1.42, 0.13);
    collar.rotation.z = s * 0.45;
    body.add(collar);
  }
  const sash = part(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 18), band, 0, 1.0, 0);
  sash.scale.z = 0.82;
  body.add(sash);
  for (const s of [0, 1]) {   // sash knot tails at the left hip
    const t = part(rbox(0.05, 0.2, 0.012, 0.005), band, -0.19 + s * 0.04, 0.88, 0.06);
    t.rotation.z = 0.1 - s * 0.15;
    body.add(t);
  }
  const strap = part(rbox(0.04, 0.62, 0.015, 0.005), leather, 0, 1.33, 0.142);
  strap.rotation.z = 0.75;
  body.add(strap);
  const strapBack = strap.clone(); strapBack.position.z = -0.142; body.add(strapBack);
  for (const s of [-1, 1]) {  // shuriken pouches on the belt
    body.add(part(rbox(0.08, 0.09, 0.05, 0.012), leather, s * 0.13, 0.97, 0.15));
    body.add(part(rbox(0.082, 0.03, 0.054, 0.008), leather, s * 0.13, 1.02, 0.151));
  }
  // Katana in its sheath across the back, handle over the right shoulder.
  const sheath = buildSheath();
  sheath.position.set(-0.18, 1.0, -0.16);
  sheath.rotation.z = -0.7;
  body.add(sheath);

  // Neck and head: hood, mask, eye slit with eyes, headband with flying tails.
  body.add(part(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), cloth, 0, 1.6, 0));
  const head = new THREE.Group(); head.position.set(0, 1.74, 0); body.add(head);
  head.add(part(new THREE.SphereGeometry(0.135, 20, 16), cloth));
  const hood = part(new THREE.SphereGeometry(0.148, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), clothLight, 0, 0.005, -0.01);
  hood.rotation.x = -0.35;
  head.add(hood);
  const slit = part(rbox(0.19, 0.042, 0.08, 0.015), skin, 0, 0.015, 0.088);
  head.add(slit);
  for (const s of [-1, 1]) head.add(part(new THREE.SphereGeometry(0.012, 8, 6), eye, s * 0.045, 0.017, 0.13));
  const headband = part(new THREE.TorusGeometry(0.143, 0.022, 8, 24), band, 0, 0.06, 0);
  headband.rotation.x = Math.PI / 2 - 0.15;
  head.add(headband);
  head.add(part(rbox(0.05, 0.04, 0.035, 0.01), band, 0, 0.04, -0.15)); // knot
  const tails = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.02, 0.04, -0.16);
    const tail = part(rbox(0.04, 0.012, 0.34, 0.004, 1), band, 0, 0, -0.17);
    pivot.add(tail);
    pivot.rotation.set(-0.4, s * 0.25, 0);
    head.add(pivot);
    tails.push(pivot);
  }

  // Arms: shoulder → elbow → hand. The right hand holds the weapon.
  function arm(side) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.235, 1.49, 0);
    shoulder.add(part(new THREE.SphereGeometry(0.075, 12, 10), cloth));
    shoulder.add(part(new THREE.CapsuleGeometry(0.062, 0.18, 4, 10), cloth, 0, -0.14, 0));
    const elbow = new THREE.Group(); elbow.position.y = -0.28; shoulder.add(elbow);
    elbow.add(part(new THREE.CapsuleGeometry(0.052, 0.17, 4, 10), wrap, 0, -0.12, 0));
    for (let i = 0; i < 3; i++) {   // cloth wraps on the forearm
      const t = part(new THREE.TorusGeometry(0.055, 0.006, 4, 12), clothLight, 0, -0.06 - i * 0.06, 0);
      t.rotation.x = Math.PI / 2;
      elbow.add(t);
    }
    const hand = new THREE.Group(); hand.position.y = -0.27; elbow.add(hand);
    hand.add(part(rbox(0.055, 0.08, 0.075, 0.02), glove, 0, -0.02, 0));
    body.add(shoulder);
    return { shoulder, elbow, hand };
  }
  const armR = arm(1), armL = arm(-1);

  // Legs: hip → knee, baggy trousers, wrapped shins, split-toe tabi boots.
  function leg(side) {
    const hip = new THREE.Group(); hip.position.set(side * 0.105, 0.95, 0);
    const thigh = part(new THREE.CapsuleGeometry(0.085, 0.26, 4, 10), cloth, 0, -0.2, 0);
    thigh.scale.set(1.15, 1, 1.1);
    hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    knee.add(part(new THREE.CapsuleGeometry(0.065, 0.24, 4, 10), wrap, 0, -0.2, 0));
    for (let i = 0; i < 3; i++) {
      const t = part(new THREE.TorusGeometry(0.067, 0.006, 4, 12), clothLight, 0, -0.1 - i * 0.08, 0);
      t.rotation.x = Math.PI / 2;
      knee.add(t);
    }
    const foot = part(rbox(0.1, 0.075, 0.24, 0.025), glove, 0, -0.44, 0.045);
    knee.add(foot);
    knee.add(part(rbox(0.004, 0.06, 0.06, 0.001), cloth, side * 0.015, -0.44, 0.15)); // split toe
    body.add(hip);
    return { hip, knee };
  }
  const legs = [leg(-1), leg(1)];

  return { root, body, head, tails, armR, armL, legs, sheath };
}

// ---------- supply crate ----------
const crateTextures = {};
function crateTexture(kind, label) {
  if (crateTextures[label]) return crateTextures[label];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const base = kind === 'ammo' ? '#4f5a2e' : kind === 'health' ? '#d9d5c9' : '#6b2a1c';
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6; i++) {            // planks and grain
    g.fillStyle = `rgba(0,0,0,${0.12 + (i % 2) * 0.08})`;
    g.fillRect(0, i * 43, 256, 2);
    for (let k = 0; k < 14; k++) {
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(Math.random() * 256, i * 43 + Math.random() * 40, 40 + Math.random() * 80, 1);
    }
  }
  g.fillStyle = kind === 'ammo' ? '#e5c43a' : kind === 'health' ? '#c62828' : '#e8b44a';
  g.fillRect(0, 104, 256, 48);
  g.fillStyle = kind === 'health' ? '#ffffff' : '#151515';
  g.font = 'bold 38px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, 128, 129);
  if (kind === 'health') {   // red crosses above and below the label
    g.fillStyle = '#c62828';
    for (const y of [52, 206]) { g.fillRect(116, y - 26, 24, 52); g.fillRect(102, y - 12, 52, 24); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  crateTextures[label] = tex;
  return tex;
}

export function buildCrate(kind, label) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: crateTexture(kind, label), roughness: 0.75 });
  const box = part(rbox(0.9, 0.55, 0.6, 0.03), mat, 0, 0.275, 0);
  g.add(box);
  const metal = new THREE.MeshStandardMaterial({ color: 0x6d6f70, metalness: 0.8, roughness: 0.4 });
  for (const x of [-1, 1]) for (const y of [0, 1]) for (const z of [-1, 1]) {
    g.add(part(rbox(0.1, 0.1, 0.1, 0.01), metal, x * 0.41, 0.04 + y * 0.47, z * 0.26));
  }
  for (const x of [-0.2, 0.2]) g.add(part(rbox(0.05, 0.57, 0.62, 0.008), metal, x, 0.275, 0)); // straps
  return g;
}

// Bright star-shaped flash texture for gun muzzles.
let flashTex = null;
export function muzzleFlashTexture() {
  if (flashTex) return flashTex;
  // A 16-point star, white-hot in the middle fading to orange at the tips.
  flashTex = pixelTexture(128, 128, (u, v) => {
    const dx = (u - 0.5) * 128, dy = (v - 0.5) * 128, d = Math.hypot(dx, dy);
    const seg = ((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / 16);
    const i = Math.floor(seg), f = seg - i;
    const r0 = i % 2 ? 22 : 62, r1 = (i + 1) % 2 ? 22 : 62;
    if (d > r0 + (r1 - r0) * f) return [0, 0, 0, 0];
    const k = d / 64;
    if (k < 0.25) { const m = k / 0.25; return [1, 1 - 0.22 * m, 0.9 - 0.55 * m, 1 - 0.1 * m]; }
    const m = (k - 0.25) / 0.75;
    return [1, 0.78 - 0.31 * m, 0.35 - 0.27 * m, 0.9 * (1 - m)];
  });
  return flashTex;
}
