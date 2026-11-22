// Extra armor for the lords (Daimyo, Shogun), so they don't read as one big block:
//  - their own lacing color on every laced plate (cuirass, skirt, shoulder guards, thigh guards)
//  - a short jinbaori surcoat, open at the front, with a woven pattern, gold brocade edges and the crest on the back
//  - big shoulder guards with gold hems and crest studs, gold rims on the cuirass and skirt plates
//  - a crest on the chest, a laced thigh apron (haidate), armored sleeves (kote) with gold plates
//  - a big silk bow (agemaki) and gold tassels, gilded turnbacks (fukigaeshi) on the helmet
// Built around the warrior's body (facing +z), the same as samurai.js.
import * as THREE from 'three';
import { part } from './models.js';

// The surcoat's cloth: a fine diamond weave (hishi) in the coat color, gold brocade along the hem
// and the front edges, a pale lining showing at the edge.
function coatTexture(color, gold) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const base = new THREE.Color(color), dark = base.clone().multiplyScalar(0.72), light = base.clone().lerp(new THREE.Color(0xffffff), 0.12);
  g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, 512, 128);
  // Diamond weave.
  g.strokeStyle = '#' + dark.getHexString(); g.lineWidth = 1.5;
  for (let x = -128; x < 640; x += 16) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 128, 128); g.stroke();
    g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 128, 0); g.stroke();
  }
  g.fillStyle = '#' + light.getHexString();
  for (let x = 8; x < 512; x += 16) for (let y = 8; y < 128; y += 16) g.fillRect(x - 1, y - 1, 2, 2);
  // Gold brocade: a band with a running pattern of small squares.
  const band = (x, y, w, h) => {
    g.fillStyle = gold; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(60,30,0,0.45)';
    if (w > h) for (let i = x + 3; i < x + w; i += 9) g.fillRect(i, y + h * 0.3, 4, h * 0.4);
    else for (let i = y + 3; i < y + h; i += 9) g.fillRect(x + w * 0.3, i, w * 0.4, 4);
    g.fillStyle = 'rgba(255,250,220,0.5)';
    if (w > h) { g.fillRect(x, y, w, 1.5); g.fillRect(x, y + h - 1.5, w, 1.5); }
    else { g.fillRect(x, y, 1.5, h); g.fillRect(x + w - 1.5, y, 1.5, h); }
  };
  band(0, 0, 512, 14);     // hem (the texture's bottom row maps to the bottom of the coat)
  band(0, 114, 512, 14);   // collar edge at the top
  band(0, 0, 18, 128);     // front edges
  band(494, 0, 18, 128);
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 4, 128); g.fillRect(508, 0, 4, 128);   // the lining at the edge
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;   // v = 0 at the top of the coat
  return t;
}

// o: { lace, coat, gold, cord, crest (a texture), mats (the boss's own list, for flashing and fading) }
export function dressBoss(w, o) {
  const body = w.body, mats = w.mats;
  const add = (m) => { mats.push(m); return m; };
  const gold = w.mats[2];
  gold.color.set(o.gold);
  const laceSmall = w.lacedMats.find(m => m.userData.kind === 'small') || w.lacedMats[0];
  const sodeMat = w.lacedMats.find(m => m.userData.kind === 'sode') || w.lacedMats[0];
  for (const m of w.lacedMats) m.color.set(o.lace);
  const crestMat = add(new THREE.MeshStandardMaterial({ map: o.crest, roughness: 0.5, metalness: 0.2 }));
  const cord = add(new THREE.MeshStandardMaterial({ color: o.cord, roughness: 0.7 }));
  const small = m => { m.castShadow = false; return m; };

  // --- cuirass: gold rims, a crest on the chest ---
  const rim = (r, y, tube = 0.014) => small(part(new THREE.TorusGeometry(r, tube, 5, 28).rotateX(Math.PI / 2), gold, 0, y, 0));
  const top = rim(0.262, 1.445); top.scale.set(1, 1, 0.8); body.add(top);
  const low = rim(0.258, 1.04); low.scale.set(1, 1, 0.82); body.add(low);
  const chest = part(new THREE.CircleGeometry(0.085, 24), crestMat, 0, 1.3, 0.236);
  body.add(chest);
  body.add(small(part(new THREE.TorusGeometry(0.087, 0.01, 5, 24), gold, 0, 1.3, 0.237)));
  // Breast plate edge (munaita) in gold.
  body.add(small(part(new THREE.BoxGeometry(0.34, 0.025, 0.02), gold, 0, 1.47, 0.2)));

  // --- skirt: gold hems on the six plates ---
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const hem = small(part(new THREE.TorusGeometry(0.405, 0.016, 4, 8, 0.85).rotateX(Math.PI / 2), gold, 0, 0.65, 0));
    hem.rotation.y = -a + Math.PI / 2 - 0.425;
    hem.scale.set(1, 1, 1);
    body.add(hem);
  }

  // --- thigh apron (haidate): laced plates with a gold hem, hanging from the waist ---
  for (const s of [-1, 1]) {
    const ap = part(new THREE.BoxGeometry(0.22, 0.3, 0.03), laceSmall, s * 0.13, 0.62, 0.25);
    ap.rotation.x = -0.18;
    body.add(ap);
    body.add(small(part(new THREE.BoxGeometry(0.23, 0.022, 0.035), gold, s * 0.13, 0.475, 0.276)));
  }

  // --- big shoulder guards (o-sode) with a gold hem and a crest stud ---
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.44, 1.37, 0);
    g.rotation.z = s * 0.32;
    g.add(part(new THREE.BoxGeometry(0.045, 0.44, 0.38), sodeMat, 0, -0.04, 0));
    g.add(small(part(new THREE.BoxGeometry(0.055, 0.035, 0.39), gold, 0, -0.26, 0)));      // gold hem
    g.add(small(part(new THREE.BoxGeometry(0.06, 0.04, 0.4), w.mats[1], 0, 0.19, 0)));     // lacquered top plate
    g.add(small(part(new THREE.BoxGeometry(0.065, 0.012, 0.41), gold, 0, 0.215, 0)));       // its gold edge
    const stud = part(new THREE.CircleGeometry(0.05, 16), crestMat, s * 0.026, 0.06, 0);
    stud.rotation.y = s * Math.PI / 2;
    g.add(stud);
    body.add(g);
  }

  // --- armored sleeves: gold-edged plates on the forearms ---
  for (const arm of [w.sword, w.leftArm]) {
    arm.add(part(new THREE.BoxGeometry(0.12, 0.2, 0.035), laceSmall, 0, -0.16, 0.07));
    arm.add(small(part(new THREE.BoxGeometry(0.13, 0.02, 0.04), gold, 0, -0.27, 0.07)));
    arm.add(part(new THREE.BoxGeometry(0.11, 0.13, 0.03), w.mats[1], 0, -0.4, 0.07));
    arm.add(small(part(new THREE.BoxGeometry(0.115, 0.015, 0.035), gold, 0, -0.335, 0.072)));
  }

  // --- the surcoat (jinbaori): short, open at the front ---
  const coatMat = add(new THREE.MeshStandardMaterial({ map: coatTexture(o.coat, o.goldCss || '#d8b04a'), roughness: 0.85, side: THREE.DoubleSide }));
  const gap = 1.7;   // radians left open at the front
  const coat = part(new THREE.CylinderGeometry(0.31, 0.43, 0.66, 28, 1, true, gap / 2, Math.PI * 2 - gap), coatMat, 0, 1.18, -0.01);
  coat.scale.set(1.04, 1, 0.9);
  body.add(coat);
  // Stiff shoulders, winged a little, with gold edges (seen from above).
  for (const s of [-1, 1]) {
    const sh = part(new THREE.BoxGeometry(0.2, 0.04, 0.4), coatMat, s * 0.26, 1.515, -0.04);
    sh.rotation.z = s * 0.22;
    body.add(sh);
    const edge = small(part(new THREE.BoxGeometry(0.21, 0.02, 0.025), gold, s * 0.26, 1.52, 0.165));
    edge.rotation.z = s * 0.22;
    body.add(edge);
  }
  // Crest on the back.
  const mon = part(new THREE.CircleGeometry(0.17, 28), crestMat, 0, 1.25, -0.37);
  mon.rotation.y = Math.PI;
  body.add(mon);
  // A silk bow (agemaki) under the crest, its tails hanging down.
  const bow = new THREE.Group();
  bow.position.set(0, 1.03, -0.42);
  for (const s of [-1, 1]) {
    const loop = part(new THREE.TorusGeometry(0.055, 0.018, 6, 14), cord, s * 0.06, 0, 0);
    loop.scale.set(1.3, 0.8, 1);
    bow.add(loop);
    const tail = part(new THREE.BoxGeometry(0.04, 0.22, 0.015), cord, s * 0.035, -0.13, 0);
    tail.rotation.z = s * 0.15;
    bow.add(tail);
  }
  bow.add(part(new THREE.SphereGeometry(0.03, 8, 6), cord));
  body.add(bow);
  // Gold tassels on cords at the open front.
  for (const s of [-1, 1]) {
    const a = gap / 2 * s;
    const x = Math.sin(a) * 0.37 * 1.04, z = Math.cos(a) * 0.37 * 0.9;
    body.add(small(part(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), cord, x, 1.28, z + 0.01)));
    body.add(small(part(new THREE.ConeGeometry(0.035, 0.09, 8), gold, x, 1.17, z + 0.01)));
  }

  // --- helmet: gilded turnbacks (fukigaeshi) and a wider neck guard ---
  for (const s of [-1, 1]) {
    const f = part(new THREE.BoxGeometry(0.02, 0.12, 0.13), w.mats[1], s * 0.25, -0.02, 0.06);
    f.rotation.y = s * 0.5;
    w.helmet.add(f);
    const fg = small(part(new THREE.CircleGeometry(0.035, 12), gold, s * 0.262, -0.02, 0.07));
    fg.rotation.y = s * (Math.PI / 2 + 0.5);
    w.helmet.add(fg);
  }
  const neck = part(new THREE.CylinderGeometry(0.25, 0.32, 0.12, 24, 1, true, 1.1, Math.PI * 2 - 2.2), sodeMat, 0, -0.1, 0);
  w.helmet.add(neck);
  w.helmet.add(small(part(new THREE.TorusGeometry(0.32, 0.01, 4, 24, Math.PI * 2 - 2.2).rotateX(Math.PI / 2).rotateY(-1.1 - Math.PI / 2 + Math.PI), gold, 0, -0.16, 0)));
  return coat;
}
