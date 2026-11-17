// Samurai enemies: they chase the nearest ninja, raise their katana, then strike.
import * as THREE from 'three';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';

// ---------- armor textures (shared by every samurai; each gets its own tinted material) ----------
// Kebiki-odoshi armor: rows of lacquered plates laced together with silk cords. Drawn in white
// so the material color tints the lacing (red, green, blue...) while the plate edges stay black.
const texCache = {};
function lamellarTex(rows, cols = 3) {
  const key = rows + 'x' + cols;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d'), w = 128, h = 256, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    g.fillStyle = '#ece6da'; g.fillRect(0, y, w, rh);                         // silk lacing
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let x = 0; x < w; x += 6) g.fillRect(x, y, 1.5, rh);                // separate cords
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = 3; x < w; x += 6) g.fillRect(x, y + rh * 0.3, 1, rh * 0.7); // shine on each cord
    g.fillStyle = '#16120f'; g.fillRect(0, y, w, rh * 0.26);                  // lacquered plate edge
    g.fillStyle = 'rgba(255,240,210,0.22)'; g.fillRect(0, y + 1, w, 2);       // its glossy top
    g.fillStyle = '#b38b3c';                                                  // small gilt rivets
    for (let x = 8; x < w; x += 21) g.fillRect(x, y + rh * 0.1, 3, 3);
  }
  // Red cross-knots (hishinui) along the bottom row.
  g.strokeStyle = '#8f1b16'; g.lineWidth = 2.5;
  const y0 = h - rh * 0.55;
  for (let x = 6; x < w; x += 16) {
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 8, y0 + 8); g.moveTo(x + 8, y0); g.lineTo(x, y0 + 8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(cols, 1);
  return texCache[key] = t;
}
// The helmet bowl: dark lacquer with raised ribs (suji) running up to the top.
function helmetTex() {
  if (texCache.helmet) return texCache.helmet;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1816'; g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 8) {
    g.fillStyle = 'rgba(255,235,200,0.16)'; g.fillRect(x, 0, 2, 64);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 2, 0, 1, 64);
  }
  return texCache.helmet = Object.assign(new THREE.CanvasTexture(c), { colorSpace: THREE.SRGBColorSpace });
}
// Flag for the banner on his back (sashimono): a white clan crest on the kind's color.
function bannerTex() {
  if (texCache.banner) return texCache.banner;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ece6da'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#16120f'; g.fillRect(0, 0, 64, 8);
  g.strokeStyle = '#16120f'; g.lineWidth = 4;
  g.beginPath(); g.arc(32, 52, 18, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#16120f';
  for (let i = 0; i < 3; i++) { const a = i * 2.094; g.beginPath(); g.arc(32 + Math.cos(a) * 7, 52 + Math.sin(a) * 7, 6, 0, 7); g.fill(); }
  return texCache.banner = Object.assign(new THREE.CanvasTexture(c), { colorSpace: THREE.SRGBColorSpace });
}

// A menpo: the iron face guard samurai wore over the nose, cheeks and chin, with a moustache
// and a laced throat guard hanging below. The eyes show above it in the helmet's shadow.
// Built around the head's center, facing +z.
function buildMenpo(mats) {
  const g = new THREE.Group();
  // Cheeks and chin: the lower front of a ball, slightly jutting forward.
  const guard = part(new THREE.SphereGeometry(0.19, 18, 10, Math.PI / 2 - 1.15, 2.3, 0.53 * Math.PI, 0.33 * Math.PI), mats.iron);
  guard.scale.set(1.04, 1, 1.12);
  g.add(guard);
  // Separate nose piece.
  const nose = part(new THREE.SphereGeometry(0.03, 10, 8), mats.iron, 0, 0.0, 0.18);
  nose.scale.set(0.8, 1.5, 1.1); nose.rotation.x = 0.25;
  g.add(nose);
  // Cheek ridges and a grim slit mouth.
  for (const s of [-1, 1]) {
    const ridge = part(new THREE.BoxGeometry(0.07, 0.018, 0.03), mats.iron, s * 0.09, -0.05, 0.175);
    ridge.rotation.z = -s * 0.3; ridge.rotation.y = s * 0.5;
    g.add(ridge);
  }
  g.add(part(new THREE.BoxGeometry(0.075, 0.01, 0.02), mats.dark, 0, -0.085, 0.208));
  // Moustache sweeping down and out, and a little tuft on the chin.
  for (const s of [-1, 1]) {
    const m = part(new THREE.ConeGeometry(0.02, 0.11, 5), mats.hair, s * 0.05, -0.055, 0.2);
    m.rotation.z = s * 2.0; m.rotation.x = 0.2; m.castShadow = false;
    g.add(m);
  }
  const tuft = part(new THREE.ConeGeometry(0.018, 0.06, 5), mats.hair, 0, -0.16, 0.18);
  tuft.rotation.x = Math.PI - 0.3; tuft.castShadow = false;
  g.add(tuft);
  // Throat guard (yodare-kake): three laced rows hanging under the chin.
  const throat = part(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 14, 1, true, -1.2, 2.4), mats.laceSmall, 0, -0.23, 0.02);
  throat.material.side = THREE.DoubleSide;
  g.add(throat);
  return g;
}

// An Oni (demon) face mask in carved, painted lacquer: deep red, heavy brows, dark eye holes,
// gilded teeth and horns. Built around the head's center, facing +z. The Oni Warlord wears it.
export function buildOniMask(mats) {
  const g = new THREE.Group();
  const face = part(new THREE.SphereGeometry(0.195, 20, 14, 0, Math.PI, 0.3 * Math.PI, 0.62 * Math.PI), mats.oni);
  face.scale.set(1, 1.05, 1.1);
  g.add(face);
  for (const s of [-1, 1]) {
    const cheek = part(new THREE.SphereGeometry(0.06, 10, 8), mats.oni, s * 0.095, -0.04, 0.155);
    cheek.scale.set(1, 0.85, 0.6);
    g.add(cheek);
    // Heavy carved brows knotted toward the middle.
    const brow = part(new THREE.CapsuleGeometry(0.022, 0.08, 3, 6), mats.oni, s * 0.065, 0.085, 0.18);
    brow.rotation.z = Math.PI / 2 + s * 0.45; brow.rotation.y = s * -0.3;
    g.add(brow);
    // Deep dark eye holes (no glow).
    const eye = part(new THREE.SphereGeometry(0.026, 10, 6), mats.dark, s * 0.064, 0.04, 0.178);
    eye.scale.set(1.5, 0.7, 0.5);
    eye.castShadow = false;
    g.add(eye);
    // Flared nostrils.
    g.add(part(new THREE.SphereGeometry(0.02, 8, 6), mats.oni, s * 0.025, -0.01, 0.205));
  }
  const nose = part(new THREE.ConeGeometry(0.035, 0.08, 6), mats.oni, 0, 0.0, 0.21);
  nose.rotation.x = Math.PI / 2 + 0.5;
  g.add(nose);
  // Snarling mouth with gilded teeth and fangs.
  g.add(part(new THREE.BoxGeometry(0.13, 0.045, 0.04), mats.dark, 0, -0.1, 0.175));
  g.add(part(new THREE.BoxGeometry(0.11, 0.014, 0.02), mats.gold, 0, -0.085, 0.19));
  for (const s of [-1, 1]) {
    g.add(part(new THREE.ConeGeometry(0.014, 0.06, 5), mats.gold, s * 0.05, -0.095, 0.195));
    const down = part(new THREE.ConeGeometry(0.011, 0.045, 5), mats.gold, s * 0.025, -0.09, 0.197);
    down.rotation.z = Math.PI;
    g.add(down);
  }
  // Two gilded horns sweeping up and out from the forehead.
  for (const s of [-1, 1]) {
    const horn = part(new THREE.ConeGeometry(0.035, 0.3, 8), mats.gold, s * 0.21, 0.26, 0.05);
    horn.rotation.z = -s * 0.6;
    horn.rotation.x = -0.2;
    g.add(horn);
  }
  return g;
}

// ---------- weapons for the other kinds of samurai ----------
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.6 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.5 });
const featherMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8, side: THREE.DoubleSide });
const tipMat = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, roughness: 0.3, metalness: 0.9 });
const chainMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.3, metalness: 0.9 });

// An arrow pointing +z, 0.8 m long, centered on its middle. Combat uses this for flying arrows too.
export function buildArrow() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.011, 0.011, 0.8, 5).rotateX(Math.PI / 2), woodMat));
  const tip = part(new THREE.ConeGeometry(0.025, 0.09, 6).rotateX(Math.PI / 2), tipMat, 0, 0, 0.44);
  g.add(tip);
  for (let i = 0; i < 3; i++) {   // three feathers at the back
    const f = part(new THREE.PlaneGeometry(0.05, 0.12), featherMat, 0, 0, -0.34);
    f.rotation.set(Math.PI / 2, 0, (i / 3) * Math.PI * 2);
    f.position.x = Math.cos((i / 3) * Math.PI * 2) * 0.02;
    f.position.y = Math.sin((i / 3) * Math.PI * 2) * 0.02;
    g.add(f);
  }
  return g;
}

// Bow for the left hand. The hand grips the middle; limbs go up and down, string toward the archer.
// Built for an arm pointing at the target: arm-frame -y = forward, +z = up.
function buildBow() {
  const g = new THREE.Group();
  const arc = 1.6, r = 0.5;
  const limbs = new THREE.TorusGeometry(r, 0.016, 5, 24, arc)
    .rotateZ(-Math.PI / 2 - arc / 2).translate(0, r, 0).rotateY(Math.PI / 2);
  g.add(part(limbs, darkWoodMat));
  g.add(part(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 6).rotateX(Math.PI / 2), woodMat));   // grip wrap
  const ends = r - r * Math.cos(arc / 2), half = r * Math.sin(arc / 2);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, ends, half), new THREE.Vector3(0, ends, 0), new THREE.Vector3(0, ends, -half)]);
  const string = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8e0c8 }));
  g.add(string);
  const arrow = buildArrow();
  arrow.rotation.x = Math.PI / 2;   // pointing forward (-y) from the string
  arrow.visible = false;
  g.add(arrow);
  g.userData = { string, ends, arrow };
  return g;
}

// Pull the bow string back (0 = resting, 1 = fully drawn) with an arrow on it.
function drawBow(bow, pull, nocked) {
  const { string, ends, arrow } = bow.userData;
  const back = ends + pull * 0.42;
  string.geometry.attributes.position.setY(1, back);
  string.geometry.attributes.position.needsUpdate = true;
  arrow.visible = nocked;
  arrow.position.set(0, back - 0.4, 0);
}

function buildQuiver() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 8), woodMat));
  for (let i = 0; i < 4; i++) {
    const a = buildArrow();
    a.rotation.x = -Math.PI / 2;
    a.position.set((i % 2 - 0.5) * 0.05, 0.22, (i < 2 ? -0.02 : 0.02));
    g.add(a);
  }
  return g;
}

// Nunchucks for the right hand: one stick held, a short chain, and a second stick that whirls.
function buildNunchucks() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), darkWoodMat, 0, -0.1, 0));
  const pivot = new THREE.Group();
  pivot.position.y = -0.26;
  g.add(pivot);
  for (let i = 0; i < 3; i++) pivot.add(part(new THREE.TorusGeometry(0.012, 0.004, 4, 8), chainMat, 0, -0.012 - i * 0.02, 0));
  pivot.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), darkWoodMat, 0, -0.21, 0));
  g.userData.pivot = pivot;
  return g;
}

const ARMOR = { sword: 0x8f1d1a, archer: 0x2f5a26, nunchuck: 0x2c3a8a };   // lacing colors: easy to tell apart from above

function buildSamurai(kind = 'sword') {
  // Each samurai gets its own materials so it can flash and fade on its own.
  // (mats[0] = armor, [1] = dark, [2] = gold: the bosses recolor these.)
  const tint = ARMOR[kind];
  const laced = (rows, cols) => new THREE.MeshStandardMaterial({ color: tint, map: lamellarTex(rows, cols), roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide });
  const mats = {
    armor: laced(5, 3),
    dark: new THREE.MeshStandardMaterial({ color: 0x17161a, roughness: 0.35, metalness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.3, metalness: 0.85 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x24212a, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd0d6dc, roughness: 0.15, metalness: 0.95 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.4, metalness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x5b5148, roughness: 0.9 }),   // grey-brown horsehair
    skin: new THREE.MeshStandardMaterial({ color: 0xa8775a, roughness: 0.7 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.3 }),
    hakama: new THREE.MeshStandardMaterial({ color: 0x2d2a33, roughness: 0.95 }),
    lacquer: new THREE.MeshStandardMaterial({ color: 0xffffff, map: helmetTex(), roughness: 0.3, metalness: 0.3 }),
    skirt: laced(4, 1),
    sode: laced(6, 1),
    laceSmall: laced(3, 2),
    banner: new THREE.MeshStandardMaterial({ color: tint, map: bannerTex(), roughness: 0.85, side: THREE.DoubleSide }),
  };
  mats.banner.color.lerp(new THREE.Color(0xffffff), 0.25);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const small = m => { m.castShadow = false; return m; };

  // --- torso: a dark undercoat, the laced cuirass (do) and a lacquered chest plate ---
  const core = part(new THREE.CapsuleGeometry(0.22, 0.36, 4, 10), mats.cloth, 0, 1.32, 0);
  core.scale.set(1.2, 1, 0.82);
  body.add(core);
  const dou = part(new THREE.CylinderGeometry(0.28, 0.255, 0.4, 18, 1, true), mats.armor, 0, 1.24, 0);
  dou.scale.set(1, 1, 0.8);
  body.add(dou);
  const muna = part(new THREE.CylinderGeometry(0.25, 0.28, 0.08, 18, 1, false, -1.1, 2.2), mats.dark, 0, 1.475, 0);
  muna.scale.set(1, 1, 0.8);
  body.add(muna);
  // Silk obi sash and the cords tying the cuirass.
  const obi = part(new THREE.CylinderGeometry(0.265, 0.265, 0.07, 18), mats.cloth, 0, 1.06, 0);
  obi.scale.set(1, 1, 0.82);
  body.add(obi);
  const knot = small(part(new THREE.BoxGeometry(0.08, 0.06, 0.04), mats.gold, 0.1, 1.06, 0.21));
  body.add(knot);
  // Short sword (wakizashi) in its scabbard through the sash on the left.
  const saya = small(part(new THREE.CylinderGeometry(0.02, 0.017, 0.55, 6), mats.dark, -0.24, 1.02, 0.1));
  saya.rotation.set(1.2, 0, 0.25);
  body.add(saya);
  body.add(small(part(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), mats.hair, -0.2, 1.1, 0.3).rotateX(1.2)));

  // --- skirt: six laced panels (kusazuri) hanging from the waist ---
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const panel = part(new THREE.CylinderGeometry(0.3, 0.41, 0.4, 4, 1, true, a - 0.46, 0.92), mats.skirt, 0, 0.84, 0);
    panel.scale.set(1, 1, 0.85);
    body.add(panel);
  }

  // --- shoulder guards (sode): big laced panels hanging off each shoulder ---
  for (const side of [-1, 1]) {
    const sode = part(new THREE.BoxGeometry(0.04, 0.32, 0.3), mats.sode, side * 0.41, 1.39, 0);
    sode.rotation.z = side * 0.3;
    body.add(sode);
    body.add(small(part(new THREE.BoxGeometry(0.05, 0.03, 0.31), mats.dark, side * 0.37, 1.545, 0).rotateZ(side * 0.3)));
  }

  // --- head: face, the menpo, eyes in the shadow of the helmet ---
  const head = part(new THREE.SphereGeometry(0.175, 16, 12), mats.skin, 0, 1.73, 0);
  body.add(head);
  for (const s of [-1, 1]) {
    const eye = small(part(new THREE.SphereGeometry(0.02, 8, 6), mats.eye, s * 0.06, 1.765, 0.155));
    eye.scale.set(1.5, 0.6, 0.5);
    body.add(eye);
    const brow = small(part(new THREE.BoxGeometry(0.06, 0.012, 0.02), mats.hair, s * 0.06, 1.792, 0.158));
    brow.rotation.z = s * 0.25;
    body.add(brow);
  }
  const mask = buildMenpo(mats);
  mask.position.set(0, 1.71, 0.005);
  body.add(mask);

  // --- helmet (kabuto): ribbed bowl, visor, neck guard, turned-back side flaps and a golden crest ---
  const helmet = new THREE.Group();
  helmet.position.set(0, 1.79, -0.01);
  body.add(helmet);
  const bowl = part(new THREE.SphereGeometry(0.21, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.lacquer);
  bowl.scale.set(1, 0.9, 1.05);
  helmet.add(bowl);
  helmet.add(small(part(new THREE.TorusGeometry(0.035, 0.012, 5, 12), mats.gold, 0, 0.185, 0).rotateX(Math.PI / 2)));   // top ring
  const visor = part(new THREE.CylinderGeometry(0.24, 0.255, 0.025, 20, 1, false, -1.2, 2.4), mats.dark, 0, 0.005, 0.02);
  visor.rotation.x = -0.12;
  helmet.add(visor);
  // Neck guard: three flaring laced rows around the back and sides.
  for (let r = 0; r < 3; r++) {
    const ring = part(new THREE.CylinderGeometry(0.21 + r * 0.03, 0.235 + r * 0.03, 0.07, 20, 1, true, 1.1, Math.PI * 2 - 2.2),
      mats.laceSmall, 0, -0.025 - r * 0.06, -0.015);
    helmet.add(ring);
  }
  // Fukigaeshi: the flaps at the front of the neck guard, folded back, with a gilt crest each.
  for (const s of [-1, 1]) {
    const flap = part(new THREE.BoxGeometry(0.08, 0.1, 0.02), mats.armor, s * 0.215, -0.04, 0.1);
    flap.rotation.y = s * 1.0;
    helmet.add(flap);
    helmet.add(small(part(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), mats.gold, s * 0.225, -0.04, 0.115).rotateX(Math.PI / 2).rotateZ(0)));
  }
  // Crest (maedate): two tall golden horn blades in a V and a crest disc between them.
  const crest = new THREE.Group();
  crest.position.set(0, 0.06, 0.2);
  for (const s of [-1, 1]) {
    const horn = small(part(new THREE.ConeGeometry(0.03, 0.42, 4), mats.gold, s * 0.08, 0.19, 0));
    horn.scale.set(1, 1, 0.25);
    horn.rotation.z = -s * 0.42;
    crest.add(horn);
  }
  crest.add(small(part(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), mats.gold, 0, 0.03, 0.01).rotateX(Math.PI / 2)));
  helmet.add(crest);

  // --- banner on his back (sashimono) in his color ---
  const banner = new THREE.Group();
  banner.position.set(-0.1, 1.45, -0.26);
  banner.add(small(part(new THREE.CylinderGeometry(0.012, 0.012, 1.25, 5), mats.dark, 0, 0.55, 0)));
  const flag = small(part(new THREE.PlaneGeometry(0.24, 0.5), mats.banner, 0.12, 0.88, 0));
  banner.add(flag);
  banner.add(small(part(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4), mats.dark, 0.12, 1.13, 0).rotateZ(Math.PI / 2)));
  body.add(banner);

  // --- legs: wide pleated hakama, laced thigh guards, iron shin guards, sandals ---
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.14, 0.95, 0);
    const trouser = part(new THREE.CylinderGeometry(0.11, 0.16, 0.6, 10), mats.hakama, 0, -0.33, 0);
    hip.add(trouser);
    const thigh = part(new THREE.BoxGeometry(0.2, 0.26, 0.035), mats.laceSmall, 0, -0.2, 0.14);
    thigh.rotation.x = -0.12;
    hip.add(thigh);
    const shin = part(new THREE.CylinderGeometry(0.085, 0.075, 0.3, 10, 1, true, -1.3, 2.6), mats.iron, 0, -0.74, 0.01);
    hip.add(shin);
    for (const y of [-0.64, -0.84]) hip.add(small(part(new THREE.TorusGeometry(0.08, 0.008, 4, 12), mats.gold, 0, y, 0.01).rotateX(Math.PI / 2)));
    hip.add(part(new THREE.BoxGeometry(0.12, 0.07, 0.24), mats.cloth, 0, -0.91, 0.05));       // tabi socks
    hip.add(small(part(new THREE.BoxGeometry(0.13, 0.025, 0.27), mats.gold, 0, -0.955, 0.05))); // straw sandal
    body.add(hip); legs.push(hip);
  }

  // --- arms: dark sleeves with iron forearm plates (kote) and gloved hands ---
  const buildArm = () => {
    const a = new THREE.Group();
    a.add(part(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), mats.cloth, 0, -0.26, 0));
    const kote = part(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 8, 1, true), mats.iron, 0, -0.4, 0);
    a.add(kote);
    a.add(small(part(new THREE.TorusGeometry(0.07, 0.007, 4, 10), mats.gold, 0, -0.29, 0).rotateX(Math.PI / 2)));
    a.add(part(new THREE.SphereGeometry(0.06, 8, 6), mats.dark, 0, -0.54, 0));   // gauntlet
    return a;
  };
  // Right arm holds the katana.
  const shoulder = buildArm(); shoulder.position.set(0.3, 1.48, 0);
  const katana = buildKatana(0.85);
  katana.position.set(0, -0.56, 0.02);
  katana.rotation.x = Math.PI / 2;
  katana.children[0].material = mats.steel;   // his own blade material, so it can glow before a big chop
  shoulder.add(katana);
  body.add(shoulder);
  const leftArm = buildArm(); leftArm.position.set(-0.3, 1.48, 0);
  body.add(leftArm);

  let bow = null, nunchucks = null;
  if (kind === 'archer') {
    katana.visible = false;
    bow = buildBow();
    bow.position.set(0, -0.56, 0);
    leftArm.add(bow);
    const quiver = buildQuiver();
    quiver.position.set(0.16, 1.35, -0.3);
    quiver.rotation.z = -0.35;
    body.add(quiver);
  } else if (kind === 'nunchuck') {
    katana.visible = false;
    nunchucks = buildNunchucks();
    nunchucks.position.set(0, -0.56, 0);
    shoulder.add(nunchucks);
  }

  return { root, body, legs, sword: shoulder, blade: katana, leftArm, bow, nunchucks, steel: mats.steel,
           mask, helmet, crest, banner, mats: Object.values(mats) };
}

// The vine a samurai slides down on: a thin green rope hanging from the canopy, with a few leaves.
const VINE_TOP = 13;        // meters above the ground where the vine hangs from
const DROP_SECONDS = 1.4;   // time to slide all the way down
const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f5a22, roughness: 0.8 });
const vineLeafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a2a, roughness: 0.6, side: THREE.DoubleSide });
const vineGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5).translate(0, -0.5, 0);   // hangs down from its top
const vineLeafGeo = new THREE.PlaneGeometry(0.18, 0.1);
function buildVine(length) {
  const g = new THREE.Group();
  const rope = new THREE.Mesh(vineGeo, vineMat);
  rope.scale.y = length;
  g.add(rope);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(vineLeafGeo, vineLeafMat);
    leaf.position.set(0.05, -1 - Math.random() * (length - 3), 0);
    leaf.rotation.set(Math.random(), Math.random() * 6, 0.6);
    g.add(leaf);
  }
  return g;
}

export class Samurai {
  // vineTop: the height (above the ground here) of the leaves his vine hangs from.
  constructor(scene, world, cfg, x, z, toughness = 1, dropDelay = 0, kind = 'sword', vineTop = VINE_TOP) {
    this.scene = scene;
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.45;
    this.kind = kind;
    const K = cfg.kinds?.[kind] ?? { health: 1, speed: 1 };
    this.maxHealth = cfg.health * toughness * K.health;
    this.health = this.maxHealth;
    this.damage = cfg.damage * toughness;
    this.speed = cfg.speed * K.speed * (0.9 + Math.random() * 0.2);
    this.reload = 0.5 + Math.random();   // archers: time until the next arrow
    this.strafeSide = Math.random() < 0.5 ? 1 : -1;
    this.shoot = null;                   // set by combat: fires an arrow
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.knock = new THREE.Vector2();
    this.jumpY = 0;     // height of a jump over a log
    this.vy = 0;
    this.stuckT = 0;
    this.facing = Math.random() * Math.PI * 2;
    // He arrives by sliding down a vine from the trees (waiting up there for dropDelay first).
    this.state = 'descend';
    this.timer = -dropDelay;
    this.vineTop = Math.max(5, vineTop);
    this.vine = buildVine(this.vineTop);
    this.vine.position.set(x, this.pos.y + this.vineTop, z);
    scene.add(this.vine);
    this.slideSound = false;
    this.flash = 0;
    this.walkPhase = Math.random() * 6;
    this.gone = false;
    Object.assign(this, buildSamurai(kind));
    if (kind === 'archer') {   // red line on the ground showing where the arrow will fly
      this.aimLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
      this.aimLine.renderOrder = 4;
      this.aimLine.visible = false;
      scene.add(this.aimLine);
    }
    this.root.scale.setScalar(1.15);
    this.root.position.copy(this.pos);
    this.root.position.y += this.vineTop + 0.8;   // hidden up in the leaves until his turn
    scene.add(this.root);
    this.effects = null;                // set by combat, for the dust when he lands
  }

  // Marching out of the camp instead of sliding down a vine: no vine, he waits his turn (holdSeconds)
  // standing in the camp, then comes out of the gate.
  startOnGround(holdSeconds = 0) {
    if (this.vine) { this.scene.remove(this.vine); this.vine = null; }
    this.state = 'chase';
    this.timer = 0;
    this.holdT = holdSeconds;
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.root.position.copy(this.pos);
  }

  // Sliding down the vine; can't be hit and doesn't attack until his feet touch the ground.
  updateDescend(dt) {
    this.timer += dt;
    const t = this.vine.userData.t = (this.vine.userData.t || 0) + dt;
    this.vine.rotation.z = Math.sin(t * 1.7) * 0.03;   // the vine sways
    this.vine.rotation.x = Math.sin(t * 1.3 + 1) * 0.03;
    if (this.timer < 0) {   // waiting his turn, hidden up in the leaves
      this.root.position.set(this.pos.x, this.pos.y + this.vineTop + 0.8, this.pos.z);
      return;
    }
    if (!this.slideSound) { this.slideSound = true; sfx.vineSlide(); }
    const k = Math.min(1, this.timer / DROP_SECONDS);
    const fall = k < 0.8 ? (k / 0.8) ** 1.6 * 0.95 : 0.95 + (k - 0.8) / 0.2 * 0.05;   // fast, then brakes at the bottom
    const height = (this.vineTop - 2) * (1 - fall);
    // Hands up on the vine, legs together, sword arm too (he grips with both hands).
    this.sword.rotation.x = -3.0;
    this.leftArm.rotation.x = -3.0;
    this.legs[0].rotation.x = -0.25; this.legs[1].rotation.x = -0.1;
    this.root.position.set(this.pos.x, this.pos.y + height, this.pos.z);
    this.root.rotation.y = this.facing + Math.sin(this.timer * 3) * 0.3;   // spins a little on the rope
    if (k >= 1) {   // landed: thump, dust, and the vine pulls back up into the trees
      this.state = 'chase';
      this.timer = 0;
      this.leftArm.rotation.x = 0;
      sfx.thud();
      if (this.effects) {
        this.effects.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 'dirt', 12);
        this.effects.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 'chip', 4);
      }
      this.vineUp = 0;
    }
  }

  // After landing, the empty vine is pulled back up out of sight.
  updateVine(dt) {
    if (!this.vine || this.vineUp === undefined) return;
    this.vineUp += dt;
    this.vine.position.y += dt * 9 * Math.min(1, this.vineUp * 2);
    if (this.vineUp > 1.6) { this.scene.remove(this.vine); this.vine = null; }
  }

  get alive() { return this.state !== 'dead'; }
  get hiddenOnMap() { return this.state === 'descend' && this.timer < 0; }   // still hidden up in the trees

  // Returns true if this hit defeated him.
  hit(amount, dirX, dirZ, interrupt = false) {
    if (!this.alive || this.state === 'descend') return false;
    this.health -= amount;
    this.flash = 0.08;
    this.knock.x += dirX * (interrupt ? 6 : 1.5);
    this.knock.y += dirZ * (interrupt ? 6 : 1.5);
    if (interrupt && this.state === 'windup') { this.state = 'recover'; this.timer = 0.5; }
    if (this.health <= 0) {
      if (this.aimLine) this.aimLine.visible = false;
      this.state = 'dead';
      this.timer = 0;
      this.fallDir = Math.random() < 0.5 ? -1 : 1;
      sfx.enemyDown();
      return true;
    }
    return false;
  }

  update(dt, players, others, smokes = []) {
    this.flash -= dt;
    const glow = this.flash > 0 ? 1 : 0;
    for (const m of this.mats) if (!m.userData.glow) m.emissive.setScalar(glow * 0.8);

    this.updateVine(dt);
    if (this.state === 'dead') return this.updateDead(dt);
    if (this.state === 'descend') return this.updateDescend(dt);
    if (this.holdT > 0) {   // waiting in the camp for his turn to march out
      this.holdT -= dt;
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.facing;
      return;
    }

    // Find the closest ninja who is still standing and not hidden in smoke.
    // A samurai inside smoke can't see anyone at all.
    const inSmoke = (x, z) => smokes.some(sm => Math.hypot(sm.x - x, sm.z - z) < sm.r);
    const blind = inSmoke(this.pos.x, this.pos.z);
    let target = null, best = Infinity;
    for (const p of players) {
      if (!p.alive || blind) continue;
      // Too far from the camp: he gives up on you.
      if (this.leash && Math.hypot(p.pos.x - this.leash.x, p.pos.z - this.leash.z) > this.leash.r) continue;
      const spotted = p.revealed > 0;   // he just fired a gun: everyone knows where he is
      if (!spotted && inSmoke(p.pos.x, p.pos.z)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (!spotted && d > 3.5 && this.world.inHideout(p.pos.x, p.pos.z)) continue;   // hiding in the ruins: can't see him
      if (d < best) { best = d; target = p; }
    }

    let moveX = 0, moveZ = 0;
    this.reload -= dt;
    if (target && this.kind === 'archer') {
      // Archer: stay at shooting distance, draw the bow, shoot, reload.
      const A = this.cfg.archer;
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += diff * (1 - Math.exp(-(this.state === 'windup' ? 6 : 10) * dt));
      this.timer -= dt;
      if (this.state === 'chase') {
        if (best < A.keepAway) { moveX = -dx / best; moveZ = -dz / best; }        // too close: back off
        else if (best > A.shootRange) { moveX = dx / best; moveZ = dz / best; }  // too far: come closer
        else if (this.reload <= 0) {
          this.state = 'windup'; this.attack = 'bow'; this.timer = A.drawSeconds;
          sfx.bowDraw();
        } else {                                                                 // waiting to shoot: sidestep
          moveX = (-dz / best) * 0.45 * this.strafeSide; moveZ = (dx / best) * 0.45 * this.strafeSide;
        }
      } else if (this.state === 'windup' && this.timer <= 0) {
        // Let go: the arrow flies where he's aiming right now, so move and it misses.
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        const from = new THREE.Vector3(this.pos.x + fx * 0.6, this.pos.y + 1.65, this.pos.z + fz * 0.6);
        // Aim up (or down) at his chest, so arrows reach someone up a tree too.
        const dist = Math.max(1, Math.hypot(target.pos.x - from.x, target.pos.z - from.z));
        const slope = (target.pos.y + 1.2 - from.y) / dist;
        this.shoot?.(from, { x: fx, z: fz, slope }, this.damage * A.damage, this);
        sfx.bowShot();
        this.state = 'strike'; this.timer = 0.2;
        this.reload = A.reloadSeconds * (0.8 + Math.random() * 0.4);
        this.strafeSide = -this.strafeSide;
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = 0.35;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    } else if (target) {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      const turnRate = this.state === 'chase' ? 10 : 3;
      this.facing += diff * (1 - Math.exp(-turnRate * dt));

      this.timer -= dt;
      if (this.state === 'chase') {
        if (target.perch || target.climb) {   // he's up a tree: wait underneath, a little way out
          if (best > 3) { moveX = dx / best; moveZ = dz / best; }
        } else if (best > this.cfg.attackRange) { moveX = dx / best; moveZ = dz / best; }
        else {
          // Pick an attack: quick jab, side slash (from the left or right) or big overhead chop.
          const A = this.cfg.attacks;
          let r = Math.random(), name = 'chop';
          for (const k of Object.keys(A)) { if (r < A[k].chance) { name = k; break; } r -= A[k].chance; }
          if (this.kind === 'nunchuck') { name = 'combo'; sfx.nunchuckWhirl(); }
          this.attack = name;
          this.slashSide = Math.random() < 0.5 ? 1 : -1;
          this.state = 'windup'; this.timer = A[name].windup;
        }
      } else if (this.state === 'windup' && this.timer <= 0) {
        const a = this.cfg.attacks[this.attack];
        this.state = 'strike'; this.timer = a.hits ? a.hits * a.interval + 0.05 : 0.18;
        this.hitsDone = 1; this.nextHit = a.interval || 0;
        sfx.swing();
        if (this.attack === 'chop') sfx.thud();
        if (this.attack === 'jab') {   // lunges forward with the poke
          this.knock.x += Math.sin(this.facing) * 5;
          this.knock.y += Math.cos(this.facing) * 5;
        }
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.hitsDone < (this.cfg.attacks[this.attack].hits || 1)
                 && (this.nextHit -= dt) <= 0) {
        // The next hit of a combo.
        const a = this.cfg.attacks[this.attack];
        this.hitsDone++; this.nextHit = a.interval;
        sfx.swing();
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = this.cfg.attacks[this.attack].recover;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    }

    const L = this.leash;
    const home = L && Math.hypot(this.pos.x - L.x, this.pos.z - L.z);
    if (!target && L && home > L.camp) {   // nobody to fight: walk back to the camp
      const hx = (L.x - this.pos.x) / home, hz = (L.z - this.pos.z) / home;
      moveX = hx * 0.6; moveZ = hz * 0.6;
      const want = Math.atan2(hx, hz);
      this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * (1 - Math.exp(-5 * dt));
    } else if (!target) {   // lost: wander about slowly
      this.wanderT = (this.wanderT || 0) - dt;
      if (this.wanderT <= 0) { this.wanderT = 1 + Math.random() * 1.5; this.wanderDir = Math.random() * Math.PI * 2; }
      moveX = Math.sin(this.wanderDir) * 0.35;
      moveZ = Math.cos(this.wanderDir) * 0.35;
      const turn = Math.atan2(Math.sin(this.wanderDir - this.facing), Math.cos(this.wanderDir - this.facing));
      this.facing += turn * (1 - Math.exp(-4 * dt));
      if (this.state !== 'chase') { this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
    }

    // Keep a little space from other samurai and from the ninjas.
    for (const o of others) {
      if (o === this || !o.alive || o.state === 'descend') continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz), min = this.radius + (o.radius ?? 0.45) + 0.2;
      if (d > 0 && d < min) { moveX += (dx / d) * (min - d) * 2; moveZ += (dz / d) * (min - d) * 2; }
    }

    [moveX, moveZ] = this.steer(moveX, moveZ, dt);
    const startX = this.pos.x, startZ = this.pos.z;
    const wade = (this.world.waterDepthAt(this.pos.x, this.pos.z) > 0.25 ? 0.55 : 1) * (this.jumpY > 0 ? 1.4 : 1);   // leaps forward when jumping
    this.pos.x += (moveX * this.speed * wade + this.knock.x) * dt;
    this.pos.z += (moveZ * this.speed * wade + this.knock.y) * dt;
    this.knock.multiplyScalar(Math.exp(-8 * dt));
    for (const p of players) {
      if (!p.alive || p.perch || p.climb) continue;
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz), min = this.radius + p.radius;
      if (d > 0 && d < min) { this.pos.x = p.pos.x + dx / d * min; this.pos.z = p.pos.z + dz / d * min; }
    }
    this.world.resolveCollision(this.pos, this.radius, this.pos.y + this.jumpY);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);

    // Jumping: up and back down again.
    if (this.jumpY > 0 || this.vy > 0) {
      this.vy -= 18 * dt;
      this.jumpY += this.vy * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.vy = 0; if (this.isBoss) sfx.thud(); }
    }
    // Stuck? (trying to walk but hardly moving) Then try the other way around, or jump.
    const wanted = Math.hypot(moveX, moveZ) * this.speed * wade * dt;
    const moved = Math.hypot(this.pos.x - startX, this.pos.z - startZ);
    if (wanted > 0.01 && moved < wanted * 0.3) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > 0.6) {
      this.stuckT = 0;
      this.detourSide = -(this.detourSide || 1);
      this.detourT = 1.4;
      if (this.jumpY === 0) this.vy = 7.5;   // and hop, in case it's something low
    }

    this.animate(dt, Math.hypot(moveX, moveZ) > 0.1);
    this.root.position.y += this.jumpY;
  }

  // Look ahead along the way he wants to walk: jump over anything low (logs, low walls),
  // and walk around the side of anything tall (boulders, trees, ruins, the plane).
  steer(mx, mz, dt) {
    this.detourT = Math.max(0, (this.detourT || 0) - dt);
    const mag = Math.hypot(mx, mz);
    if (mag < 0.1) return [mx, mz];
    const dx = mx / mag, dz = mz / mag;
    const feet = this.pos.y + this.jumpY;
    const look = 1.4 + this.radius;
    let block = null, blockT = Infinity, cross = 0;
    for (const o of this.world.obstacles) {
      const ox = o.x - this.pos.x, oz = o.z - this.pos.z;
      const t = ox * dx + oz * dz;                       // how far ahead
      if (t < -0.2 || t > look + o.r) continue;
      const side = ox * dz - oz * dx;                    // how far to the side of the path
      if (Math.abs(side) > o.r + this.radius) continue;
      if (feet > (o.base ?? 0) + o.h) continue;          // already above it
      if (t < blockT) { block = o; blockT = t; cross = side; }
    }
    if (!block) return [mx, mz];
    const top = (block.base ?? this.pos.y) + block.h - this.pos.y;
    if (top < 1.25) {                                    // low: jump it
      if (this.jumpY === 0 && this.vy === 0 && blockT < block.r + this.radius + 1.1) this.vy = 7.5;
      return [mx, mz];
    }
    // Tall: go round the side it's not leaning to, and keep going that way for a moment.
    if (!this.detourT) { this.detourSide = cross > 0 ? 1 : -1; this.detourT = 0.8; }
    const s = this.detourSide;
    const tx = -dz * s, tz = dx * s;                     // sideways along the obstacle
    const k = Math.min(1, (look + block.r - blockT) / look);
    const nx = dx * (1 - k) + tx * (0.6 + k), nz = dz * (1 - k) + tz * (0.6 + k);
    const n = Math.hypot(nx, nz) || 1;
    return [nx / n * mag, nz / n * mag];
  }

  // Damage anyone in reach and inside this attack's arc.
  strikeHit(players, a) {
    for (const p of players) {
      if (!p.alive || p.perch || p.climb) continue;   // up a tree: out of reach
      const px = p.pos.x - this.pos.x, pz = p.pos.z - this.pos.z;
      const d = Math.hypot(px, pz);
      const facingDot = (px * Math.sin(this.facing) + pz * Math.cos(this.facing)) / (d || 1);
      if (d < a.range + 0.3 && facingDot > a.arc) {
        p.hurt(this.damage * a.damage);
        p.justHurt = true;
        sfx.hurt();
      }
    }
  }

  animate(dt, walking) {
    const k = walking ? 1 : 0;
    this.walkPhase += dt * 8;
    const swing = Math.sin(this.walkPhase) * 0.6 * k;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.6;
    this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.05 * k;

    // Sword arm and body twist for each attack: [shoulder x, shoulder z, body twist, body lean].
    const s = this.slashSide || 1;
    const POSES = {
      jab:   { windup: [-1.25, 0.15, -0.55, -0.05], strike: [-1.62, 0.0, 0.25, 0.2] },        // pull back, then thrust
      slash: { windup: [-1.5, 0.25 * s, -1.4 * s, 0],         // twists right round with the sword out to one side...
               strike: [-1.5, 0.25 * s, 1.1 * s, 0.1] },       // ...then sweeps it flat across in front
      chop:  { windup: [-3.05, 0.1, 0, -0.1], strike: [-0.35, 0.05, 0, 0.25] },                // way up high, then down hard
    };
    let pose = [-0.9, 0, 0, 0];                       // ready stance
    const atk = POSES[this.attack];
    if (atk && this.state === 'windup') pose = atk.windup;
    else if (atk && this.state === 'strike') pose = atk.strike;
    else if (this.state === 'recover') pose = [-0.7, 0.1, 0, 0];
    const speed = this.state === 'strike' ? 30 : this.state === 'windup' ? 9 : 8;
    const b = 1 - Math.exp(-speed * dt);
    if (this.kind !== 'archer') {   // archers pose their own arms (animateArcher)
      this.sword.rotation.x += (pose[0] - this.sword.rotation.x) * b;
      this.sword.rotation.z += (pose[1] - this.sword.rotation.z) * b;
      this.body.rotation.y += (pose[2] - this.body.rotation.y) * b;
    }
    this.body.rotation.x += (pose[3] - this.body.rotation.x) * b;
    // For the side slash the blade sticks straight out from his arm, so it sweeps wide and flat.
    const flat = this.attack === 'slash' && (this.state === 'windup' || this.state === 'strike');
    const bladeWant = flat ? Math.PI * 0.95 : Math.PI / 2;
    this.blade.rotation.x += (bladeWant - this.blade.rotation.x) * b;
    // The big chop's blade glows red while he winds up: get out of the way!
    const glowing = this.state === 'windup' && this.attack === 'chop';
    if (glowing) this.steel.emissive.setRGB(1.0, 0.12, 0.05).multiplyScalar(0.6 + Math.sin(performance.now() / 60) * 0.4);

    if (this.kind === 'archer') this.animateArcher(dt, b);
    if (this.kind === 'nunchuck') this.animateNunchucks(dt);

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }

  // Bow arm out at the target, string hand pulling back, and the red aim line on the ground.
  animateArcher(dt, b) {
    const drawing = this.state === 'windup';
    const k = drawing ? 1 - Math.max(0, this.timer) / this.cfg.archer.drawSeconds : 0;
    const aiming = drawing || this.state === 'strike';
    // Right (string) arm: forward and pulled in to the chest while drawing.
    const rx = aiming ? -1.45 : -0.35, rz = aiming ? -0.25 - k * 0.2 : 0.05;
    this.sword.rotation.x += (rx - this.sword.rotation.x) * b;
    this.sword.rotation.z += (rz - this.sword.rotation.z) * b;
    this.body.rotation.y += ((aiming ? -0.35 : 0) - this.body.rotation.y) * b;
    if (aiming) { this.leftArm.rotation.x = -1.55; this.leftArm.rotation.z = -0.15; }
    else { this.leftArm.rotation.z = 0; }
    drawBow(this.bow, drawing ? k : 0, drawing);
    // The red line grows stronger as he gets ready to let go.
    const line = this.aimLine;
    line.visible = drawing;
    if (drawing) {
      line.position.set(this.pos.x, this.pos.y + 0.12, this.pos.z);
      line.rotation.y = this.facing;
      line.scale.z = this.cfg.archer.shootRange + 2;
      line.material.opacity = 0.12 + k * 0.4;
    }
  }

  // The free stick whirls while winding up and during the combo, and hangs down otherwise.
  animateNunchucks(dt) {
    const pivot = this.nunchucks.userData.pivot;
    const spinning = this.state === 'windup' || this.state === 'strike';
    if (spinning) pivot.rotation.x -= dt * 28;
    else pivot.rotation.x += (Math.round(pivot.rotation.x / (Math.PI * 2)) * Math.PI * 2 - pivot.rotation.x) * (1 - Math.exp(-6 * dt));
    if (this.state === 'strike') {   // quick hits swinging back and forth
      this.body.rotation.y = Math.sin(this.timer * 45) * 0.6;
      this.sword.rotation.x = -1.6;
      this.sword.rotation.z = 0.2;
    } else if (this.state === 'windup') {
      this.sword.rotation.x += (-2.3 - this.sword.rotation.x) * (1 - Math.exp(-14 * dt));
    }
  }

  // Falls over, then sinks and fades away.
  updateDead(dt) {
    this.timer += dt;
    const fall = Math.min(1, this.timer * 2.2);
    this.root.rotation.z = this.fallDir * fall * Math.PI / 2 * 0.95;
    this.pos.x += this.knock.x * dt; this.pos.z += this.knock.y * dt;
    this.knock.multiplyScalar(Math.exp(-6 * dt));
    this.root.position.set(this.pos.x, this.world.heightAt(this.pos.x, this.pos.z) + 0.15 * fall, this.pos.z);
    if (this.timer > 1.5) {
      const fade = Math.max(0, 1 - (this.timer - 1.5) / 1.2);
      for (const m of this.mats) { m.transparent = true; m.opacity = fade; }
      this.root.position.y -= (1 - fade) * 0.4;
      if (fade === 0) this.remove();
    }
  }

  remove() {
    this.gone = true;
    if (this.vine) { this.scene.remove(this.vine); this.vine = null; }
    if (this.aimLine) { this.scene.remove(this.aimLine); this.aimLine = null; }
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
}
