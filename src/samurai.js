// The warriors: ronin, ashigaru (spear, bow, gun), samurai and hatamoto. They chase the nearest ninja,
// wind up (you get a warning), then strike. The bosses (daimyo.js, shogun.js) are built on this too.
import * as THREE from 'three';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';
import { defend, updateDefense } from './bossmoves.js';

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

// A yari (spear): a long straight shaft with a narrow steel blade. Built along +y, the hand grips
// a third of the way up from the butt (at the origin).
function buildYari(steel) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.02, 0.022, 3.0, 6), darkWoodMat, 0, 0.55, 0));
  g.add(part(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 6), tipMat, 0, 2.02, 0));            // collar
  const blade = part(new THREE.ConeGeometry(0.03, 0.42, 4), steel, 0, 2.28, 0);
  blade.scale.set(1, 1, 0.35);
  g.add(blade);
  g.add(part(new THREE.SphereGeometry(0.03, 6, 4), tipMat, 0, -0.95, 0));                       // butt cap
  return g;
}

// A naginata: a long pole with a curved blade on the end. Built along +y, gripped near the middle.
function buildNaginata(steel) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.022, 0.024, 2.0, 6), darkWoodMat, 0, 0.35, 0));
  g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), tipMat, 0, 1.36, 0));
  const blade = buildKatana(0.62);
  blade.position.y = 1.32;
  blade.children[0].material = steel;
  g.add(blade);
  return g;
}

// A teppō (matchlock gun): long iron barrel on a dark wooden stock, with the match cord.
// Built along +y: muzzle up the +y end, butt below the hand.
function buildTeppo() {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(0.06, 0.62, 0.08), woodMat, 0, -0.08, 0));                  // stock
  g.add(part(new THREE.CylinderGeometry(0.018, 0.022, 1.0, 8), chainMat, 0, 0.62, 0.02));      // barrel
  g.add(part(new THREE.BoxGeometry(0.05, 0.08, 0.06), tipMat, 0.04, 0.05, 0.03));               // lock
  const match = part(new THREE.SphereGeometry(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff6a20 }), 0.06, 0.12, 0.06);
  g.add(match);                                                                                // glowing match cord
  g.userData.muzzleY = 1.12;
  return g;
}

// What each rank looks like. lace: color of the armor lacing / main color seen from above.
//  armor: 'laced' (samurai lamellar), 'plate' (ashigaru simple plates), null (ronin: no armor)
//  helmet: 'kabuto', 'jingasa' (ashigaru cone hat), 'kasa' (ronin's deep straw hat)
//  banner: null, 'small', 'normal', 'tall'
const LOOKS = {
  ronin:    { lace: 0x6e5a44, armor: null,     helmet: 'kasa',    mask: false, banner: null,     cloth: 0x4e4338, hakama: 0x39342e },
  yari:     { lace: 0x3b3f46, armor: 'plate',  helmet: 'jingasa', mask: false, banner: 'small',  cloth: 0x2e3442, hakama: 0x2a2e38 },
  yumi:     { lace: 0x3b3f46, armor: 'plate',  helmet: 'jingasa', mask: false, banner: 'small',  cloth: 0x2e3442, hakama: 0x2a2e38 },
  teppo:    { lace: 0x3b3f46, armor: 'plate',  helmet: 'jingasa', mask: false, banner: 'small',  cloth: 0x2e3442, hakama: 0x2a2e38 },
  samurai:  { lace: 0x8f1d1a, armor: 'laced',  helmet: 'kabuto',  mask: true,  banner: 'normal', cloth: 0x24212a, hakama: 0x2d2a33 },
  hatamoto: { lace: 0xc9a040, armor: 'laced',  helmet: 'kabuto',  mask: true,  banner: 'tall',   cloth: 0x15141a, hakama: 0x1c1a22, gold: 0xe8bb4a, bigCrest: true },
};
// Dots on the minimap.
export const MAP_COLORS = { ronin: '#d9a35a', yari: '#ff8a3a', yumi: '#ff8a3a', teppo: '#ff8a3a', samurai: '#ff3b30', hatamoto: '#ff2fb0' };

function buildSamurai(kind = 'samurai') {
  // Each warrior gets his own materials so he can flash and fade on his own.
  // (mats[0] = armor, [1] = dark, [2] = gold: the bosses recolor these.)
  const L = LOOKS[kind] || LOOKS.samurai;
  const tint = L.lace;
  const laced = (rows, cols) => new THREE.MeshStandardMaterial({ color: tint, map: lamellarTex(rows, cols), roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide });
  const mats = {
    armor: L.armor === 'plate' ? new THREE.MeshStandardMaterial({ color: 0x2c2a2a, roughness: 0.35, metalness: 0.35, side: THREE.DoubleSide }) : laced(5, 3),
    dark: new THREE.MeshStandardMaterial({ color: 0x17161a, roughness: 0.35, metalness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: L.gold ?? 0xb08a3a, roughness: 0.3, metalness: 0.85 }),
    cloth: new THREE.MeshStandardMaterial({ color: L.cloth, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd0d6dc, roughness: 0.15, metalness: 0.95 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.4, metalness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x5b5148, roughness: 0.9 }),   // grey-brown horsehair
    skin: new THREE.MeshStandardMaterial({ color: 0xa8775a, roughness: 0.7 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.3 }),
    hakama: new THREE.MeshStandardMaterial({ color: L.hakama, roughness: 0.95 }),
    lacquer: new THREE.MeshStandardMaterial({ color: 0xffffff, map: helmetTex(), roughness: 0.3, metalness: 0.3 }),
    skirt: L.armor === 'plate' ? null : laced(4, 1),
    sode: laced(6, 1),
    laceSmall: laced(3, 2),
    banner: new THREE.MeshStandardMaterial({ color: kind === 'hatamoto' ? 0xf2e2b0 : tint, map: bannerTex(), roughness: 0.85, side: THREE.DoubleSide }),
    straw: new THREE.MeshStandardMaterial({ color: 0xc4a35e, roughness: 0.95, side: THREE.DoubleSide }),
  };
  if (!mats.skirt) mats.skirt = mats.armor;
  if (kind !== 'hatamoto') mats.banner.color.lerp(new THREE.Color(0xffffff), 0.25);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const small = m => { m.castShadow = false; return m; };

  // --- torso: a dark undercoat (a kimono for the ronin) ---
  const core = part(new THREE.CapsuleGeometry(0.22, 0.36, 4, 10), mats.cloth, 0, 1.32, 0);
  core.scale.set(1.2, 1, 0.82);
  body.add(core);
  if (L.armor) {
    // Cuirass (do): laced plates for samurai, plain lacquered iron for ashigaru.
    const dou = part(new THREE.CylinderGeometry(0.28, 0.255, 0.4, 18, 1, true), mats.armor, 0, 1.24, 0);
    dou.scale.set(1, 1, 0.8);
    body.add(dou);
    const muna = part(new THREE.CylinderGeometry(0.25, 0.28, 0.08, 18, 1, false, -1.1, 2.2), mats.dark, 0, 1.475, 0);
    muna.scale.set(1, 1, 0.8);
    body.add(muna);
    if (L.armor === 'plate') {   // a painted crest on the ashigaru's chest: his lord's mon
      body.add(small(part(new THREE.CircleGeometry(0.07, 16), new THREE.MeshStandardMaterial({ color: 0xb22a20, roughness: 0.6 }), 0, 1.3, 0.231)));
    }
  } else {
    // Ronin: a worn kimono, crossed at the front, tied with a sash.
    for (const s of [-1, 1]) {
      const lapel = small(part(new THREE.BoxGeometry(0.05, 0.42, 0.02), mats.hakama, s * 0.06, 1.38, 0.2));
      lapel.rotation.z = s * 0.35;
      body.add(lapel);
    }
  }
  const obi = part(new THREE.CylinderGeometry(0.265, 0.265, 0.07, 18), L.armor ? mats.cloth : mats.straw, 0, 1.06, 0);
  obi.scale.set(1, 1, 0.82);
  body.add(obi);
  if (kind !== 'ronin') body.add(small(part(new THREE.BoxGeometry(0.08, 0.06, 0.04), mats.gold, 0.1, 1.06, 0.21)));
  // Short sword (wakizashi) through the sash; ronin carry only one sword.
  if (kind !== 'ronin') {
    const saya = small(part(new THREE.CylinderGeometry(0.02, 0.017, 0.55, 6), mats.dark, -0.24, 1.02, 0.1));
    saya.rotation.set(1.2, 0, 0.25);
    body.add(saya);
  }

  // --- skirt: laced or plate panels (kusazuri); the ronin's kimono hangs loose instead ---
  if (L.armor) {
    const n = L.armor === 'plate' ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      const panel = part(new THREE.CylinderGeometry(0.3, 0.41, L.armor === 'plate' ? 0.3 : 0.4, 4, 1, true, a - 0.46 * 6 / n, 0.92 * 6 / n), mats.skirt, 0, L.armor === 'plate' ? 0.88 : 0.84, 0);
      panel.scale.set(1, 1, 0.85);
      body.add(panel);
    }
  } else {
    const skirt = part(new THREE.CylinderGeometry(0.27, 0.36, 0.5, 14, 1, true), mats.cloth, 0, 0.8, 0);
    skirt.material.side = THREE.DoubleSide;
    body.add(skirt);
  }

  // --- shoulder guards (sode): big for samurai and hatamoto, none for ashigaru and ronin ---
  if (L.armor === 'laced') {
    const big = kind === 'hatamoto' ? 1.2 : 1;
    for (const side of [-1, 1]) {
      const sode = part(new THREE.BoxGeometry(0.04, 0.32 * big, 0.3 * big), mats.sode, side * 0.41, 1.39, 0);
      sode.rotation.z = side * 0.3;
      body.add(sode);
      body.add(small(part(new THREE.BoxGeometry(0.05, 0.03, 0.31 * big), mats.dark, side * 0.37, 1.545, 0).rotateZ(side * 0.3)));
    }
  }

  // --- head ---
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
  let mask = null;
  if (L.mask) {
    mask = buildMenpo(mats);
    mask.position.set(0, 1.71, 0.005);
    body.add(mask);
  }

  // --- headgear ---
  const helmet = new THREE.Group();
  helmet.position.set(0, 1.79, -0.01);
  body.add(helmet);
  let crest = new THREE.Group();
  if (L.helmet === 'kabuto') {
    // Ribbed bowl, visor, neck guard, turned-back side flaps and a golden crest.
    const bowl = part(new THREE.SphereGeometry(0.21, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.lacquer);
    bowl.scale.set(1, 0.9, 1.05);
    helmet.add(bowl);
    helmet.add(small(part(new THREE.TorusGeometry(0.035, 0.012, 5, 12), mats.gold, 0, 0.185, 0).rotateX(Math.PI / 2)));
    const visor = part(new THREE.CylinderGeometry(0.24, 0.255, 0.025, 20, 1, false, -1.2, 2.4), mats.dark, 0, 0.005, 0.02);
    visor.rotation.x = -0.12;
    helmet.add(visor);
    for (let r = 0; r < 3; r++) {
      helmet.add(part(new THREE.CylinderGeometry(0.21 + r * 0.03, 0.235 + r * 0.03, 0.07, 20, 1, true, 1.1, Math.PI * 2 - 2.2),
        mats.laceSmall, 0, -0.025 - r * 0.06, -0.015));
    }
    for (const s of [-1, 1]) {
      const flap = part(new THREE.BoxGeometry(0.08, 0.1, 0.02), mats.armor, s * 0.215, -0.04, 0.1);
      flap.rotation.y = s * 1.0;
      helmet.add(flap);
      helmet.add(small(part(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), mats.gold, s * 0.225, -0.04, 0.115).rotateX(Math.PI / 2)));
    }
    // Crest (maedate): two golden horn blades in a V and a disc. The hatamoto's are much bigger.
    crest.position.set(0, 0.06, 0.2);
    for (const s of [-1, 1]) {
      const horn = small(part(new THREE.ConeGeometry(0.03, 0.42, 4), mats.gold, s * 0.08, 0.19, 0));
      horn.scale.set(1, 1, 0.25);
      horn.rotation.z = -s * 0.42;
      crest.add(horn);
    }
    crest.add(small(part(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), mats.gold, 0, 0.03, 0.01).rotateX(Math.PI / 2)));
    if (L.bigCrest) crest.scale.setScalar(1.7);
    helmet.add(crest);
  } else if (L.helmet === 'jingasa') {
    // Ashigaru's jingasa: a shallow lacquered iron cone with the lord's mon on the front.
    const hat = part(new THREE.ConeGeometry(0.36, 0.17, 18, 1, true), mats.armor, 0, 0.03, 0);
    hat.material.side = THREE.DoubleSide;
    helmet.add(hat);
    helmet.add(small(part(new THREE.CircleGeometry(0.05, 14), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.6, roughness: 0.4 }), 0, 0.02, 0.17).rotateX(-0.5)));
    for (const s of [-1, 1]) helmet.add(small(part(new THREE.BoxGeometry(0.012, 0.2, 0.012), mats.cloth, s * 0.15, -0.1, 0.02)));   // chin cords
  } else if (L.helmet === 'kasa') {
    // The ronin's deep woven straw hat, pulled down so you can hardly see his face.
    const hat = part(new THREE.ConeGeometry(0.46, 0.34, 20, 2, true), mats.straw, 0, 0.0, 0);
    helmet.add(hat);
    helmet.add(small(part(new THREE.TorusGeometry(0.45, 0.015, 4, 24), mats.straw, 0, -0.16, 0).rotateX(Math.PI / 2)));
    helmet.position.y = 1.86;
  }

  // --- banner on his back (sashimono) ---
  const banner = new THREE.Group();
  if (L.banner) {
    const tall = L.banner === 'tall' ? 1.45 : L.banner === 'small' ? 0.75 : 1;
    banner.position.set(-0.1, 1.45, -0.26);
    banner.add(small(part(new THREE.CylinderGeometry(0.012, 0.012, 1.25 * tall, 5), mats.dark, 0, 0.55 * tall, 0)));
    const flag = small(part(new THREE.PlaneGeometry(0.24 * tall, 0.5 * tall), mats.banner, 0.12 * tall, 0.88 * tall, 0));
    banner.add(flag);
    banner.add(small(part(new THREE.CylinderGeometry(0.008, 0.008, 0.26 * tall, 4), mats.dark, 0.12 * tall, 1.13 * tall, 0).rotateZ(Math.PI / 2)));
    if (L.banner === 'tall') {   // a gold border down the hatamoto's banner
      banner.add(small(part(new THREE.BoxGeometry(0.02, 0.73, 0.01), mats.gold, 0.35, 1.28, 0)));
    }
    body.add(banner);
  }

  // --- legs: hakama, thigh guards, shin guards, sandals ---
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.14, 0.95, 0);
    hip.add(part(new THREE.CylinderGeometry(0.11, 0.16, 0.6, 10), mats.hakama, 0, -0.33, 0));
    if (L.armor === 'laced') {
      const thigh = part(new THREE.BoxGeometry(0.2, 0.26, 0.035), mats.laceSmall, 0, -0.2, 0.14);
      thigh.rotation.x = -0.12;
      hip.add(thigh);
    }
    if (L.armor) {
      hip.add(part(new THREE.CylinderGeometry(0.085, 0.075, 0.3, 10, 1, true, -1.3, 2.6), mats.iron, 0, -0.74, 0.01));
      for (const y of [-0.64, -0.84]) hip.add(small(part(new THREE.TorusGeometry(0.08, 0.008, 4, 12), mats.gold, 0, y, 0.01).rotateX(Math.PI / 2)));
    }
    hip.add(part(new THREE.BoxGeometry(0.12, 0.07, 0.24), mats.cloth, 0, -0.91, 0.05));
    hip.add(small(part(new THREE.BoxGeometry(0.13, 0.025, 0.27), mats.straw, 0, -0.955, 0.05)));
    body.add(hip); legs.push(hip);
  }

  // --- arms ---
  const buildArm = () => {
    const a = new THREE.Group();
    a.add(part(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), mats.cloth, 0, -0.26, 0));
    if (L.armor) {
      a.add(part(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 8, 1, true), mats.iron, 0, -0.4, 0));
      a.add(small(part(new THREE.TorusGeometry(0.07, 0.007, 4, 10), mats.gold, 0, -0.29, 0).rotateX(Math.PI / 2)));
    }
    a.add(part(new THREE.SphereGeometry(0.06, 8, 6), L.armor ? mats.dark : mats.skin, 0, -0.54, 0));
    return a;
  };
  const shoulder = buildArm(); shoulder.position.set(0.3, 1.48, 0);
  body.add(shoulder);
  const leftArm = buildArm(); leftArm.position.set(-0.3, 1.48, 0);
  body.add(leftArm);

  // --- weapon in the right hand ---
  const weapon = { ronin: 'katana', yari: 'yari', yumi: 'bow', teppo: 'gun', samurai: 'katana', hatamoto: 'naginata' }[kind] || 'katana';
  let blade, bow = null, gun = null;
  if (weapon === 'yari') {
    blade = buildYari(mats.steel);
    blade.rotation.x = 2.47;                // shaft points forward in the ready stance
  } else if (weapon === 'naginata') {
    blade = buildNaginata(mats.steel);
    blade.rotation.x = Math.PI / 2;
  } else if (weapon === 'gun') {
    blade = gun = buildTeppo();
    blade.rotation.x = 3.02;                // barrel forward when the arm is raised to aim
  } else {
    blade = buildKatana(0.85);
    blade.rotation.x = Math.PI / 2;
    blade.children[0].material = mats.steel;   // his own blade material, so it can glow before a big chop
  }
  blade.position.set(0, -0.56, 0.02);
  shoulder.add(blade);
  if (weapon === 'bow') {
    blade.visible = false;
    bow = buildBow();
    bow.position.set(0, -0.56, 0);
    leftArm.add(bow);
    const quiver = buildQuiver();
    quiver.position.set(0.16, 1.35, -0.3);
    quiver.rotation.z = -0.35;
    body.add(quiver);
  }

  return { root, body, legs, sword: shoulder, blade, leftArm, bow, gun, weapon, steel: mats.steel,
           mask, helmet, crest, banner, mats: Object.values(mats).filter((m, i, a) => m && a.indexOf(m) === i) };
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
  constructor(scene, world, cfg, x, z, toughness = 1, dropDelay = 0, kind = 'samurai', vineTop = VINE_TOP) {
    this.scene = scene;
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.45;
    if (kind === 'sword') kind = 'samurai';
    this.kind = kind;
    const R = cfg.ranks?.[kind] ?? { health: 1, speed: 1, damage: 1, weapon: 'katana' };
    this.rank = R;
    this.maxHealth = cfg.health * toughness * R.health;
    this.health = this.maxHealth;
    this.damage = cfg.damage * toughness * (R.damage ?? 1);
    this.speed = cfg.speed * R.speed * (0.9 + Math.random() * 0.2);
    this.ranged = R.weapon === 'bow' || R.weapon === 'gun';
    // His attacks: the katana set, or the spear / naginata set. Ronin wind up a little faster.
    const base = cfg.weaponAttacks?.[R.weapon] ?? cfg.attacks;
    this.attacks = {};
    for (const [k, a] of Object.entries(base)) this.attacks[k] = { ...a, windup: a.windup * (R.quick ?? 1) };
    this.attackRange = R.weapon === 'yari' ? 2.9 : R.weapon === 'naginata' ? 2.6 : cfg.attackRange;
    // Ronin leap aside, hatamoto block with the naginata shaft (only while they aren't attacking).
    if (R.dodge) this.defense = { dodgeChance: R.dodge, dodgeCooldown: 2.2, dodgeDistance: 2.8, dodgeSeconds: 0.28 };
    if (R.block) this.defense = { blockChance: R.block, blockArcDegrees: 140, shurikenBlock: R.block * 0.8, katanaParry: R.block * 0.8 };
    this.mapColor = MAP_COLORS[kind] || '#ff3b30';
    this.reload = 0.5 + Math.random();   // archers / gunners: time until the next shot
    this.strafeSide = Math.random() < 0.5 ? 1 : -1;
    this.shoot = null;                   // set by combat: fires an arrow
    this.fire = null;                    // set by combat: fires a gun
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
    if (this.ranged) {   // red line on the ground showing where the arrow / bullet will fly
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

  // Where to walk first to reach `goal` if the camp wall is in the way: round the outside of the wall
  // to the front of the gate, through it, then on. Returns null when the way is clear.
  routeVia(goal) {
    const O = this.world.outpost;
    if (!O) return null;
    const dSelf = Math.hypot(this.pos.x - O.x, this.pos.z - O.z);
    const selfIn = dSelf < O.wall, goalIn = Math.hypot(goal.x - O.x, goal.z - O.z) < O.wall;
    if (selfIn === goalIn) return null;
    const ax = Math.cos(O.gateAngle), az = Math.sin(O.gateAngle);   // out through the gate
    if (Math.hypot(this.pos.x - O.gate.x, this.pos.z - O.gate.z) < 3.4) {   // in the gateway: straight through
      const s = selfIn ? 1 : -1;
      return { x: O.gate.x + ax * 3.5 * s, z: O.gate.z + az * 3.5 * s };
    }
    if (selfIn) return { x: O.gate.x - ax * 3, z: O.gate.z - az * 3 };
    const aSelf = Math.atan2(this.pos.z - O.z, this.pos.x - O.x);
    const diff = Math.atan2(Math.sin(O.gateAngle - aSelf), Math.cos(O.gateAngle - aSelf));
    if (Math.abs(diff) > 0.35) {   // round the outside of the wall toward the gate
      const a = aSelf + Math.sign(diff) * 0.45, r = Math.max(dSelf, O.wall + 3);
      return { x: O.x + Math.cos(a) * r, z: O.z + Math.sin(a) * r };
    }
    return { x: O.gate.x + ax * 3, z: O.gate.z + az * 3 };
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
  hit(amount, dirX, dirZ, interrupt = false, attacker = null) {
    if (!this.alive || this.state === 'descend') return false;
    if (this.defense && defend(this, this.defense, dirX, dirZ, interrupt, attacker)) return false;   // blocked or leapt aside
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
    if (target && this.ranged) {
      // Archer / gunner: stay at shooting distance, draw (or aim), shoot, reload.
      const gun = this.rank.weapon === 'gun';
      const A = gun ? this.cfg.gunner : this.cfg.archer;
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      // A gunner's aim locks for the last moment before he fires: that's your chance to step off the line.
      const locked = gun && this.state === 'windup' && this.timer < A.lockSeconds;
      if (!locked) this.facing += diff * (1 - Math.exp(-(this.state === 'windup' ? 6 : 10) * dt));
      this.timer -= dt;
      if (this.state === 'chase') {
        if (best < A.keepAway) { moveX = -dx / best; moveZ = -dz / best; }        // too close: back off
        else if (best > A.shootRange) { moveX = dx / best; moveZ = dz / best; }  // too far: come closer
        else if (this.reload <= 0) {
          this.state = 'windup'; this.attack = 'bow'; this.timer = gun ? A.aimSeconds : A.drawSeconds;
          if (gun) sfx.matchFizz(); else sfx.bowDraw();
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
        if (gun) { this.fire?.(from, { x: fx, z: fz, slope }, this.damage * A.damage, A.shootRange + 4, this); sfx.teppo(); }
        else { this.shoot?.(from, { x: fx, z: fz, slope }, this.damage * A.damage, this); sfx.bowShot(); }
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
        } else if (best > this.attackRange) { moveX = dx / best; moveZ = dz / best; }
        else {
          // Pick an attack: quick jab, side slash (from the left or right) or big overhead chop.
          const A = this.attacks;
          let r = Math.random(), name = 'chop';
          name = Object.keys(A).find(k => A[k].chance > 0);
          for (const k of Object.keys(A)) { if (!A[k].chance) continue; if (r < A[k].chance) { name = k; break; } r -= A[k].chance; }
          this.attack = name;
          this.slashSide = Math.random() < 0.5 ? 1 : -1;
          this.state = 'windup'; this.timer = A[name].windup;
        }
      } else if (this.state === 'windup' && this.timer <= 0) {
        const a = this.attacks[this.attack];
        this.state = 'strike'; this.timer = a.hits ? a.hits * a.interval + 0.05 : 0.18;
        this.hitsDone = 1; this.nextHit = a.interval || 0;
        if (this.rank.weapon === 'naginata') sfx.naginata(); else sfx.swing();
        if (this.attack === 'chop') sfx.thud();
        if (this.attack === 'jab') {   // lunges forward with the poke
          this.knock.x += Math.sin(this.facing) * 5;
          this.knock.y += Math.cos(this.facing) * 5;
        }
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.hitsDone < (this.attacks[this.attack]?.hits || 1)
                 && (this.nextHit -= dt) <= 0) {
        // The next hit of a combo.
        const a = this.attacks[this.attack];
        this.hitsDone++; this.nextHit = a.interval;
        sfx.swing();
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = this.attacks[this.attack]?.recover ?? 0.6;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    }

    const L = this.leash;
    const home = L && Math.hypot(this.pos.x - L.x, this.pos.z - L.z);
    let goal = target ? target.pos : null;
    const G = this.guard;
    if (!target && G) {   // camp guard with nobody to fight: walk to his post, wait, walk his patrol, wait...
      const pt = G.out ? G.patrol : G.post;
      const gx = pt.x - this.pos.x, gz = pt.z - this.pos.z, gd = Math.hypot(gx, gz);
      goal = pt;
      if (gd > 0.6) {
        moveX = gx / gd * 0.45; moveZ = gz / gd * 0.45;
        const want = Math.atan2(gx, gz);
        this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * (1 - Math.exp(-5 * dt));
      } else if ((G.wait -= dt) <= 0) { G.out = !G.out; G.wait = 2 + Math.random() * 3; }
    } else if (!target && L && home > L.camp) {   // nobody to fight: walk back to the camp
      goal = L;
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

    // The camp has a wall: to get in or out, go to the gate first.
    if (goal && (moveX || moveZ) && ((goal.x - this.pos.x) * moveX + (goal.z - this.pos.z) * moveZ) > 0) {
      const w = this.routeVia(goal);
      if (w) {
        const m = Math.max(0.6, Math.hypot(moveX, moveZ));
        const wx = w.x - this.pos.x, wz = w.z - this.pos.z, wd = Math.hypot(wx, wz) || 1;
        moveX = wx / wd * m; moveZ = wz / wd * m;
        const want = Math.atan2(wx, wz);
        this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * (1 - Math.exp(-8 * dt));
      }
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
    if (this.defense) updateDefense(this, dt);   // leaping aside / blocking
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
    for (const o of this.world.obstaclesAlong(this.pos.x, this.pos.z, this.pos.x + dx * (look + 3), this.pos.z + dz * (look + 3), this.radius + 0.5)) {
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
    const POSES = this.rank.weapon === 'yari' ? {
      jab:   { windup: [-0.55, 0.0, -0.45, -0.1], strike: [-0.98, 0.0, 0.2, 0.25] },          // spear drawn back, then thrust
      slash: { windup: [-0.9, 0.0, -1.3 * s, 0], strike: [-0.9, 0.0, 1.1 * s, 0.1] },       // swing the shaft round
    } : {
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
    if (!this.ranged) {   // archers and gunners pose their own arms
      this.sword.rotation.x += (pose[0] - this.sword.rotation.x) * b;
      this.sword.rotation.z += (pose[1] - this.sword.rotation.z) * b;
      this.body.rotation.y += (pose[2] - this.body.rotation.y) * b;
    }
    this.body.rotation.x += (pose[3] - this.body.rotation.x) * b;
    // For the side slash the blade sticks straight out from his arm, so it sweeps wide and flat.
    if (this.rank.weapon === 'katana' || this.rank.weapon === 'naginata') {
      const flat = this.attack === 'slash' && (this.state === 'windup' || this.state === 'strike');
      const bladeWant = flat ? Math.PI * 0.95 : Math.PI / 2;
      this.blade.rotation.x += (bladeWant - this.blade.rotation.x) * b;
    }
    if (this.rank.weapon === 'yari') this.leftArm.rotation.x = this.sword.rotation.x * 0.8;   // both hands on the shaft
    // The big chop's blade glows red while he winds up: get out of the way!
    const glowing = this.state === 'windup' && this.attack === 'chop';
    if (glowing) this.steel.emissive.setRGB(1.0, 0.12, 0.05).multiplyScalar(0.6 + Math.sin(performance.now() / 60) * 0.4);

    if (this.ranged) this.animateArcher(dt, b);

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }

  // Bow arm out at the target, string hand pulling back, and the red aim line on the ground.
  animateArcher(dt, b) {
    const drawing = this.state === 'windup';
    const gun = this.rank.weapon === 'gun';
    const A = gun ? this.cfg.gunner : this.cfg.archer;
    const k = drawing ? 1 - Math.max(0, this.timer) / (gun ? A.aimSeconds : A.drawSeconds) : 0;
    const aiming = drawing || this.state === 'strike';
    // Right (string) arm: forward and pulled in to the chest while drawing.
    const rx = aiming ? -1.45 : gun ? -1.05 : -0.35, rz = aiming ? -0.25 - k * 0.2 : 0.05;   // gunners carry the gun pointing forward and down
    this.sword.rotation.x += (rx - this.sword.rotation.x) * b;
    this.sword.rotation.z += (rz - this.sword.rotation.z) * b;
    this.body.rotation.y += ((aiming ? -0.35 : 0) - this.body.rotation.y) * b;
    if (aiming) { this.leftArm.rotation.x = -1.55; this.leftArm.rotation.z = gun ? 0.35 : -0.15; }
    else { this.leftArm.rotation.z = 0; }
    if (this.bow) drawBow(this.bow, drawing ? k : 0, drawing);
    // The red line grows stronger as he gets ready to let go.
    const line = this.aimLine;
    line.visible = drawing;
    if (drawing) {
      line.position.set(this.pos.x, this.pos.y + 0.12, this.pos.z);
      line.rotation.y = this.facing;
      line.scale.z = A.shootRange + 2;
      // A gunner's line turns solid red when his aim locks: move NOW.
      const lockedIn = gun && this.timer < A.lockSeconds;
      line.scale.x = gun ? 1.6 : 1;
      line.material.opacity = lockedIn ? 0.55 + Math.sin(performance.now() / 40) * 0.15 : 0.12 + k * 0.4;
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
