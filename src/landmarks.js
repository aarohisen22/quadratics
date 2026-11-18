// Japanese places around the map (step C of the Japan makeover, see PLAN-japan.md):
//  - Shrine hill: a Shinto shrine on a hill (worship hall, big torii gate, komainu guardian
//    lion-dogs, stone lanterns, water basin, wish plaques) reached through a tunnel of red torii.
//  - A five-storey pagoda near the start.
//  - Collapsed thatched farmhouses (minka) out in the forest: hideouts.
//  - The village: farmhouses, a white storehouse (kura), a red arched bridge, rice paddies, a watermill, a scarecrow.
//  - Paths from shrine hill to every area, with stone lanterns, jizō statues in red bibs and signposts.
//  - The castle: stone walls (ishigaki), moat, gatehouse, corner turrets and a white three-tier keep (tenshu).
// All signs are written in Japanese (jptext.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRandom, addCutaway } from './world.js';
import { textBoard, textTexture } from './jptext.js';

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, n = 10) => new THREE.CylinderGeometry(rt, rb, h, n);

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

// ---------- materials ----------
// Everything tall uses the see-through-from-above trick (addCutaway) so the camera can see the brothers.
const M = {};
function std(o) { return addCutaway(new THREE.MeshStandardMaterial(o)); }
function materials() {
  if (M.stone) return;
  const rnd = makeRandom(99);
  const stoneDraw = (moss) => (g, w, h) => {
    g.fillStyle = '#77756a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const v = 90 + rnd() * 50;
      g.fillStyle = `rgba(${v},${v - 4},${v - 14},0.3)`;
      g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 12, 3 + rnd() * 12);
    }
    g.strokeStyle = 'rgba(40,38,32,0.6)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (let x = (y / 64) % 2 ? 0 : 48; x < w; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
    }
    if (moss) for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${50 + rnd() * 30},${90 + rnd() * 40},${30 + rnd() * 20},${0.25 + rnd() * 0.35})`;
      g.beginPath(); g.arc(rnd() * w, rnd() * h * (0.4 + rnd() * 0.6), 3 + rnd() * 16, 0, 7); g.fill();
    }
  };
  M.stone = std({ roughness: 0.85, map: canvasTex(256, 256, stoneDraw(false)) });
  M.mossStone = std({ roughness: 0.9, map: canvasTex(256, 256, stoneDraw(true)) });
  // Castle walls: big uneven stones fitted together, no mortar.
  M.ishigaki = std({ roughness: 0.9, map: canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#5d5a52'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 26 + rnd() * 10) {
      for (let x = -rnd() * 40; x < w; x += 34 + rnd() * 30) {
        const v = 95 + rnd() * 45;
        g.fillStyle = `rgb(${v},${v - 3},${v - 10})`;
        g.beginPath();
        g.moveTo(x + 3, y + 2 + rnd() * 3); g.lineTo(x + 30 + rnd() * 14, y + rnd() * 4);
        g.lineTo(x + 32 + rnd() * 14, y + 24 + rnd() * 4); g.lineTo(x + 2, y + 26);
        g.closePath(); g.fill();
      }
    }
  }, [6, 1]) });
  M.wood = std({ roughness: 0.85, map: canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#5a4128'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,12,6,${0.15 + rnd() * 0.2})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); }
  }) });
  M.darkWood = std({ color: 0x2e2118, roughness: 0.85 });
  M.oldWood = std({ color: 0x6b5a48, roughness: 0.95 });        // grey weathered wood (ruins)
  M.thatch = std({ roughness: 1, side: THREE.DoubleSide, flatShading: true, map: canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#7a6a40'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '45,38,20' : '160,145,95'},0.5)`;
      const x = rnd() * w, y = rnd() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y + 10 + rnd() * 14); g.stroke();
    }
  }, [3, 3]) });
  M.vermilion = std({ color: 0xc2391e, roughness: 0.6 });         // shrine red (shu-iro)
  M.black = std({ color: 0x1d1b19, roughness: 0.7 });
  M.plaster = std({ color: 0xefeadf, roughness: 0.95 });         // white plaster walls
  M.copper = std({ color: 0x4d8070, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide, flatShading: true });   // green copper roof
  M.tile = std({ roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide, map: canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#3c4146'; g.fillRect(0, 0, w, h);                 // grey clay roof tiles in rows
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(15,18,22,0.75)'; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(120,128,136,0.25)'; g.fillRect(x, 0, 2, h); }
  }, [1, 1]) });
  M.shingle = std({ color: 0x4a3626, roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
  M.gold = std({ color: 0xd8a945, roughness: 0.3, metalness: 0.85 });
  M.paper = std({ color: 0xf3eee0, roughness: 0.8, side: THREE.DoubleSide });
  M.shoji = std({ roughness: 0.8, map: canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#efe8d4'; g.fillRect(0, 0, w, h);                 // paper sliding doors with a wooden lattice
    g.fillStyle = '#5a4128';
    for (let x = 0; x <= w; x += 32) g.fillRect(x - 2, 0, 4, h);
    for (let y = 0; y <= h; y += 21) g.fillRect(0, y - 2, w, 4);
  }, [2, 1]) });
  M.straw = std({ color: 0xc9b27a, roughness: 1 });
  M.redCloth = std({ color: 0xc8231c, roughness: 0.9, side: THREE.DoubleSide });
  M.water = new THREE.MeshStandardMaterial({ color: 0x4f6c66, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 });
  M.rice = new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.7, side: THREE.DoubleSide });
  M.glow = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 0.8 });
  M.namako = std({ roughness: 0.9, map: canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2b2b2d'; g.fillRect(0, 0, w, h);                  // black tiles with white crossed joints (namako-kabe)
    g.strokeStyle = '#e8e4da'; g.lineWidth = 5;
    for (let i = -h; i < w + h; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke();
    }
  }, [3, 1]) });
  // Castle keep walls: white plaster with a row of dark barred windows.
  M.keepWall = std({ roughness: 0.9, map: canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f0ece2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2622';
    for (let x = 18; x < w; x += 64) {
      g.fillRect(x, 40, 28, 34);
      g.fillStyle = '#8a8070'; for (let b = 4; b < 28; b += 7) g.fillRect(x + b, 40, 2, 34); g.fillStyle = '#2a2622';
    }
    g.fillStyle = '#3a2a1e'; g.fillRect(0, h - 22, w, 22);           // dark boards along the bottom
  }, [2, 1]) });
}

// ---------- shapes ----------

// A Japanese hip roof: four slopes with a short ridge, corners swept up a little.
// w x d is the size at the eaves, h the height of the ridge above them.
function hipRoof(w, d, h, mat, lift = 0.25) {
  const W = w / 2, D = d / 2, R = Math.max(0, W - D) * 0.9;
  const v = [
    -W, lift, -D,   W, lift, -D,   W, lift, D,   -W, lift, D,   // eave corners (swept up)
    -R, h, 0,   R, h, 0,                                         // ridge
    -W * 0.92, 0, 0,   W * 0.92, 0, 0,   0, 0, -D * 0.92,   0, 0, D * 0.92,   // eave middles (lower: makes the curve)
  ];
  const idx = [
    // front (z+): corner 3, middle 9, corner 2, ridge 4,5
    3, 9, 4,   9, 2, 5,   9, 5, 4,
    // back (z-)
    1, 8, 5,   8, 0, 4,   8, 4, 5,
    // left (x-)
    0, 6, 4,   6, 3, 4,
    // right (x+)
    2, 7, 5,   7, 1, 5,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push(v[i] * 0.6, v[i + 2] * 0.6 + v[i + 1] * 0.6);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  const m = mesh(ng, mat);
  return m;
}

// A torii gate. Width between the pillars `w`, height `h`. Front faces +z. Returns a group.
function torii(w = 2.6, h = 3.2, mat = M.vermilion, plaque = null) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    g.add(mesh(cyl(0.13 * h / 3.2, 0.16 * h / 3.2, h, 12), mat, s * w / 2, h / 2, 0));
    g.add(mesh(cyl(0.2 * h / 3.2, 0.2 * h / 3.2, 0.3, 12), M.black, s * w / 2, 0.15, 0));     // black foot
  }
  const span = w + 1.1 * h / 3.2;
  // Kasagi: the top beam, black on top, sweeping up at both ends.
  for (const s of [-1, 0, 1]) {
    const part = mesh(box(s ? span * 0.3 : span * 0.45, 0.2 * h / 3.2, 0.32 * h / 3.2), M.black, s * span * 0.36, h + 0.18 * h / 3.2 + Math.abs(s) * 0.05, 0);
    part.rotation.z = s * 0.08;
    g.add(part);
  }
  g.add(mesh(box(span * 0.95, 0.16 * h / 3.2, 0.28 * h / 3.2), mat, 0, h + 0.02, 0));   // shimaki under it
  g.add(mesh(box(w + 0.5, 0.14 * h / 3.2, 0.18 * h / 3.2), mat, 0, h * 0.78, 0));       // nuki crossbeam
  if (plaque) {   // gakuzuka: the name plaque between the beams
    const b = textBoard(plaque, 0.42 * h / 3.2, 0.7 * h / 3.2, { bg: '#1d1b19', color: '#e8c45a', border: true });
    b.position.set(0, h * 0.8, 0.12 * h / 3.2);
    g.add(b);
  }
  return g;
}

// A stone lantern (tōrō).
function toro(lit = true) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.38, 0.45, 0.25, 6), M.mossStone, 0, 0.12, 0));
  g.add(mesh(cyl(0.13, 0.16, 0.9, 8), M.stone, 0, 0.7, 0));
  g.add(mesh(cyl(0.3, 0.25, 0.18, 6), M.stone, 0, 1.22, 0));
  g.add(mesh(box(0.38, 0.34, 0.38), lit ? M.glow : M.stone, 0, 1.48, 0));     // fire box
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) g.add(mesh(box(0.08, 0.36, 0.08), M.stone, x, 1.48, z));
  g.add(mesh(new THREE.ConeGeometry(0.48, 0.3, 6), M.mossStone, 0, 1.8, 0));
  g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), M.stone, 0, 2.0, 0));
  return g;
}

// A komainu: stone lion-dog guardian on a pedestal. Faces +z.
function komainu(mouthOpen) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.9, 0.8, 0.9, 0.04), M.stone, 0, 0.4, 0));
  g.add(mesh(rbox(0.6, 0.55, 0.75, 0.15), M.mossStone, 0, 1.08, -0.05));        // sitting body
  g.add(mesh(new THREE.DodecahedronGeometry(0.3, 1), M.stone, 0, 1.55, 0.18));     // curly-maned head
  const snout = mesh(rbox(0.3, 0.2, 0.2, 0.06), M.stone, 0, 1.48, 0.42);
  g.add(snout);
  if (mouthOpen) g.add(mesh(box(0.24, 0.05, 0.1), M.black, 0, 1.38, 0.5));       // "a" (open mouth); the other says "un"
  for (const s of [-1, 1]) {
    g.add(mesh(cyl(0.08, 0.09, 0.5, 6), M.stone, s * 0.18, 1.05, 0.28));        // front legs
    g.add(mesh(new THREE.SphereGeometry(0.1, 6, 5), M.mossStone, s * 0.22, 1.76, 0.08));   // ears
  }
  g.add(mesh(new THREE.ConeGeometry(0.16, 0.45, 6), M.mossStone, 0, 1.45, -0.4));  // flame-like tail
  return g;
}

// A jizō statue: a little stone figure in a red bib and cap, protector of travellers.
function jizo(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.22, 0.26, 0.15, 8), M.stone, 0, 0.07, 0));
  g.add(mesh(cyl(0.14, 0.2, 0.55, 10), M.mossStone, 0, 0.42, 0));
  g.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), M.stone, 0, 0.82, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 10, 1, false, 0, Math.PI * 2).translate(0, 0.05, 0), M.redCloth, 0, 0.9, 0));   // knitted cap
  const bib = mesh(new THREE.ConeGeometry(0.23, 0.3, 10, 1, true, -Math.PI / 2, Math.PI), M.redCloth, 0, 0.55, 0.02);
  g.add(bib);
  g.scale.setScalar(scale);
  return g;
}

// A chōchin: a paper lantern with writing on it.
function chochin(text, red = true) {
  const tex = textTexture(text, { vertical: true, bg: red ? '#b8261b' : '#f2ead8', color: red ? '#1a1210' : '#1a1210', w: 512, h: 256, scale: 0.16, grain: false });
  tex.wrapS = THREE.RepeatWrapping;
  tex.offset.x = 0.25;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: red ? 0x401008 : 0x403020 });
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.28, 16, 10), mat, 0, 0, 0);
  body.scale.set(1, 1.35, 1);
  g.add(body);
  g.add(mesh(cyl(0.16, 0.16, 0.06, 12), M.black, 0, 0.4, 0));
  g.add(mesh(cyl(0.16, 0.16, 0.06, 12), M.black, 0, -0.4, 0));
  return g;
}

// A wooden signpost. `text` is written on an arrow-shaped board pointing along +x.
function signpost(text) {
  const g = new THREE.Group();
  g.add(mesh(box(0.14, 2.1, 0.14), M.wood, 0, 1.05, 0));
  const len = 0.32 * [...text].length + 0.4;
  const board = textBoard(text, len, 0.36, { vertical: false, bg: '#c9b48c', color: '#1d140c', scale: 0.78 });
  board.position.set(len / 2 + 0.05, 1.55, 0.08);
  g.add(board);
  const back = board.clone(); back.position.z = -0.08; back.rotation.y = Math.PI;
  back.position.x = len / 2 + 0.05;
  g.add(back);
  const tip = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 3).rotateX(Math.PI / 2), M.wood, len + 0.12, 1.73, 0);   // arrow tip
  tip.rotation.z = -Math.PI / 2;
  g.add(tip);
  return g;
}

// A tall wooden marker post with the area's name, at the start of each area.
function namePost(text) {
  const g = new THREE.Group();
  g.add(mesh(box(0.32, 2.6, 0.32), M.wood, 0, 1.3, 0));
  g.add(mesh(new THREE.ConeGeometry(0.26, 0.25, 4).rotateY(Math.PI / 4), M.darkWood, 0, 2.72, 0));
  for (const [z, ry] of [[0.17, 0], [-0.17, Math.PI]]) {
    const b = textBoard(text, 0.28, 1.9, { bg: '#d8c7a2', color: '#120c08', scale: 0.9 });
    b.position.set(0, 0.45, z); b.rotation.y = ry;
    g.add(b);
  }
  return g;
}

// ---------- shrine hill ----------
function buildShrine(rnd) {
  const g = new THREE.Group();
  const obstacles = [];
  // Haiden (worship hall) on a stone base, facing +z.
  const hz = -3.5;
  g.add(mesh(rbox(8, 0.6, 6, 0.05), M.stone, 0, 0.3, hz));
  g.add(mesh(box(7.2, 0.25, 5.2), M.wood, 0, 0.72, hz));                          // wooden floor
  for (let i = 0; i < 5; i++) g.add(mesh(box(0.9, 0.12, 0.35), M.stone, -1.8 + i * 0.9, 0.06 + 0.12, hz + 3.25 + 0.0));   // front step
  for (const x of [-3.4, -1.15, 1.15, 3.4]) for (const z of [-2.4, 2.4]) g.add(mesh(cyl(0.16, 0.16, 3.1, 10), M.vermilion, x, 2.35, hz + z));
  g.add(mesh(box(7, 2.6, 0.12), M.plaster, 0, 2.15, hz - 2.4));                     // back wall
  for (const s of [-1, 1]) g.add(mesh(box(0.12, 2.6, 4.8), M.shoji, s * 3.4, 2.15, hz));   // paper side walls
  g.add(mesh(box(7.2, 0.25, 0.25), M.vermilion, 0, 3.8, hz + 2.4));                // front beam
  const roof = hipRoof(10.4, 8.2, 2.8, M.copper, 0.35);
  roof.position.set(0, 3.95, hz);
  g.add(roof);
  g.add(mesh(box(2.6, 0.3, 0.3), M.copper, 0, 6.9, hz));                           // ridge
  // Shimenawa rope across the front, with zig-zag papers.
  const rope = mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.6, 8).rotateZ(Math.PI / 2), M.straw, 0, 3.55, hz + 2.55);
  g.add(rope);
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.14, 0.5, 0.02), M.paper, -2.2 + i * 1.47, 3.2, hz + 2.6));
  g.add(mesh(rbox(1.5, 0.6, 0.6, 0.03), M.darkWood, 0, 1.2, hz + 3.1));             // offering box (saisen-bako)
  const bell = mesh(new THREE.SphereGeometry(0.18, 10, 8), M.gold, 0, 3.2, hz + 2.75);
  g.add(bell);
  g.add(mesh(cyl(0.04, 0.04, 2.2, 6), M.redCloth, 0, 2.1, hz + 2.75));               // bell rope
  const nameplate = textBoard('森神社', 0.7, 1.8, { bg: '#1d1b19', color: '#e8c45a', border: true });
  nameplate.position.set(0, 4.3, hz + 2.6);
  g.add(nameplate);
  for (const x of [-2.8, -1, 1, 2.8]) obstacles.push({ x, z: hz - 1.2, r: 1.4, h: 99 }, { x, z: hz + 1.2, r: 1.4, h: 99 });

  // Big torii at the top of the steps.
  const gate = torii(3.4, 4.2, M.vermilion, '神社');
  gate.position.set(0, 0, 9);
  g.add(gate);
  obstacles.push({ x: -1.7, z: 9, r: 0.3, h: 99 }, { x: 1.7, z: 9, r: 0.3, h: 99 });
  // Komainu pair and stone lanterns along the approach.
  for (const s of [-1, 1]) {
    const k = komainu(s < 0);
    k.position.set(s * 2.3, 0, 5.8);
    k.rotation.y = -s * 0.25;
    g.add(k);
    obstacles.push({ x: s * 2.3, z: 5.8, r: 0.6, h: 99 });
    for (const z of [7.5, 3]) {
      const t = toro();
      t.position.set(s * 3.4, 0, z);
      g.add(t);
      obstacles.push({ x: s * 3.4, z, r: 0.45, h: 99 });
    }
  }
  // Temizuya: stone water basin under a little roof, to wash hands before praying.
  const tz = 2, tx = -6;
  g.add(mesh(rbox(1.8, 0.7, 0.9, 0.05), M.stone, tx, 0.35, tz));
  g.add(mesh(box(1.6, 0.05, 0.7), M.water, tx, 0.69, tz));
  for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) g.add(mesh(cyl(0.07, 0.07, 2.2, 6), M.vermilion, tx + x, 1.1, tz + z));
  const troof = hipRoof(2.8, 2, 0.8, M.copper, 0.15); troof.position.set(tx, 2.2, tz); g.add(troof);
  const ladle = mesh(cyl(0.015, 0.015, 0.7, 4), M.straw, tx + 0.3, 0.8, tz); ladle.rotation.z = 1.2; g.add(ladle);
  obstacles.push({ x: tx, z: tz, r: 1.1, h: 99 });
  // Ema board: little wooden wish plaques hanging on a rack.
  const ex = 6, ez = 1.5;
  for (const s of [-1, 1]) g.add(mesh(box(0.12, 1.8, 0.12), M.darkWood, ex + s * 1, 0.9, ez));
  g.add(mesh(box(2.3, 0.12, 0.12), M.darkWood, ex, 1.75, ez));
  g.add(mesh(box(2.3, 0.08, 0.08), M.darkWood, ex, 1.25, ez));
  const wishes = ['願', '夢', '福', '勝', '友', '家', '健', '心'];
  for (let i = 0; i < 12; i++) {
    const p = textBoard(wishes[i % wishes.length], 0.26, 0.2, { vertical: false, bg: '#d9bf8a', color: i % 3 ? '#1a120c' : '#a01810', scale: 0.7 });
    p.position.set(ex - 0.95 + (i % 6) * 0.38, i < 6 ? 1.47 : 0.97, ez + 0.06 + (rnd() - 0.5) * 0.02);
    p.rotation.z = (rnd() - 0.5) * 0.2;
    g.add(p);
  }
  obstacles.push({ x: ex, z: ez, r: 0.8, h: 99 });
  return { group: g, obstacles, radius: 12 };
}

// The tunnel of red torii leading up shrine hill from where the brothers start.
function buildToriiTunnel(world, scene) {
  const S = world.areas.byId.shrine, T = world.templeSpot;
  const dx = T.x - S.x, dz = T.z - S.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  const yaw = Math.atan2(ux, uz) + Math.PI;   // gates face the start
  const from = 7, to = len - 10.5;
  for (let d = from; d <= to; d += 1.35) {
    const x = S.x + ux * d, z = S.z + uz * d;
    const t = torii(2.4, 3.1, M.vermilion);
    t.position.set(x, world.heightAt(x, z) - 0.05, z);
    t.rotation.y = yaw;
    scene.add(t);
    for (const s of [-1, 1]) {
      const px = x + uz * s * 1.2, pz = z - ux * s * 1.2;
      world.obstacles.push({ x: px, z: pz, r: 0.2, base: world.heightAt(px, pz), h: 99 });
    }
  }
  // A small plaque post at the bottom with the shrine's name.
  const p = namePost('森神社');
  const px = S.x + ux * (from - 1.6) + uz * 2, pz = S.z + uz * (from - 1.6) - ux * 2;
  p.position.set(px, world.heightAt(px, pz), pz);
  scene.add(p);
  world.obstacles.push({ x: px, z: pz, r: 0.3, base: world.heightAt(px, pz), h: 99 });
  // Hiding inside the tunnel.
  for (let d = from; d <= to; d += 2.5) world.hideouts.push({ x: S.x + ux * d, z: S.z + uz * d, r: 1.5, tunnel: true });
  world.reserved.push({ x: S.x + ux * (from + to) / 2, z: S.z + uz * (from + to) / 2, r: (to - from) / 2 + 3 });
}

// ---------- five-storey pagoda ----------
function buildPagoda() {
  const g = new THREE.Group();
  g.add(mesh(rbox(6.6, 0.7, 6.6, 0.05), M.stone, 0, 0.35, 0));
  let y = 0.7;
  const widths = [4.4, 3.95, 3.5, 3.05, 2.6];
  widths.forEach((w, i) => {
    const h = i === 0 ? 2.2 : 1.6;
    g.add(mesh(box(w, h, w), M.plaster, 0, y + h / 2, 0));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(box(0.22, h, 0.22), M.vermilion, x * w / 2, y + h / 2, z * w / 2));
    g.add(mesh(box(w + 0.1, 0.18, w + 0.1), M.vermilion, 0, y + h - 0.09, 0));
    if (i === 0) for (const s of [-1, 1]) g.add(mesh(box(1.2, 1.7, 0.06), M.vermilion, 0, y + 0.85, s * (w / 2 + 0.02)));   // doors
    y += h;
    const roof = hipRoof(w + 2.6, w + 2.6, 0.95, M.tile, 0.35);
    roof.position.y = y;
    g.add(roof);
    y += 0.75;
  });
  // Sōrin: the bronze spire with nine rings.
  g.add(mesh(cyl(0.07, 0.09, 4.2, 8), M.gold, 0, y + 2.1, 0));
  for (let k = 0; k < 9; k++) g.add(mesh(new THREE.TorusGeometry(0.2 - k * 0.008, 0.035, 6, 16).rotateX(Math.PI / 2), M.gold, 0, y + 0.6 + k * 0.32, 0));
  g.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), M.gold, 0, y + 4.3, 0));
  return { group: g, obstacles: [{ x: 0, z: 0, r: 3.1, h: 99 }], radius: 10, hideout: 5.3 };
}

// ---------- farmhouses ----------
// A thatched minka. `ruined`: half collapsed, out in the forest (a hideout).
function buildMinka(rnd, ruined, noren = null) {
  const g = new THREE.Group();
  const W = 7, D = 5;
  const wood = ruined ? M.oldWood : M.wood;
  for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0]]) {   // stones under the posts
    g.add(mesh(rbox(0.5, 0.3, 0.5, 0.06), M.stone, x * W / 2, 0.15, z * D / 2));
  }
  if (!ruined) {
    for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0.33, 1], [-0.33, 1]]) {
      g.add(mesh(box(0.22, 2.8, 0.22), M.darkWood, x * W / 2, 1.7, z * D / 2));
    }
    g.add(mesh(box(W, 1.0, D), M.darkWood, 0, 0.8, 0));                       // raised floor and lower walls
    g.add(mesh(box(W - 0.1, 1.5, D - 0.1), M.plaster, 0, 2.05, 0));            // white upper walls
    for (const x of [-2.2, 2.2]) g.add(mesh(box(1.8, 1.6, 0.05), M.shoji, x, 2.05, D / 2 + 0.03));   // paper doors
    g.add(mesh(box(W + 0.6, 0.12, 1.1), wood, 0, 0.75, D / 2 + 0.6));          // engawa veranda
    const roof = hipRoof(W + 2.2, D + 2.2, 4.2, M.thatch, 0.1);
    roof.position.y = 2.8;
    g.add(roof);
    g.add(mesh(box(3.2, 0.35, 0.5), M.darkWood, 0, 7.05, 0));                  // ridge cap
    for (let i = 0; i < 5; i++) {   // crossed sticks along the ridge
      const s = mesh(box(0.06, 0.8, 0.06), M.darkWood, -1.4 + i * 0.7, 7.15, 0);
      s.rotation.x = 0.6; g.add(s);
      const s2 = s.clone(); s2.rotation.x = -0.6; g.add(s2);
    }
    if (noren) {   // door curtain (noren) in indigo with white writing
      for (let i = 0; i < 3; i++) {
        const n = textBoard([...noren][i] || '', 0.48, 0.75, { bg: '#22325a', color: '#f0ece2', scale: 0.7, grain: false });
        n.position.set(-0.52 + i * 0.52, 1.95, D / 2 + 0.08);
        g.add(n);
      }
      const lamp = chochin(noren.slice(0, 1), true);
      lamp.position.set(1.4, 2.4, D / 2 + 0.5);
      g.add(lamp);
    }
    const obstacles = [];
    for (const x of [-2.4, 0, 2.4]) for (const z of [-1.2, 1.2]) obstacles.push({ x, z, r: 1.35, h: 99 });
    return { group: g, obstacles, radius: 7 };
  }
  // Ruin: some posts snapped, a wall or two, the heavy roof slumped down on one side.
  for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) {
    const h = rnd() < 0.35 ? 0.6 + rnd() * 0.8 : 2.2 + rnd() * 0.5;
    const p = mesh(box(0.2, h, 0.2), M.oldWood, x * W / 2, 0.3 + h / 2, z * D / 2);
    p.rotation.z = (rnd() - 0.5) * 0.15;
    g.add(p);
  }
  g.add(mesh(box(W * 0.6, 1.2, 0.12), M.oldWood, -W * 0.2, 0.9, -D / 2));
  const broken = mesh(box(0.12, 1.4, D * 0.7), M.plaster, -W / 2, 1.0, -D * 0.12);
  broken.rotation.x = 0.1; g.add(broken);
  for (let i = 0; i < 8; i++) {   // floor boards, some missing
    if (rnd() < 0.3) continue;
    g.add(mesh(box(W * 0.9, 0.06, 0.5), M.oldWood, 0, 0.45, -D / 2 + 0.4 + i * 0.6));
  }
  const roof = hipRoof(W + 2, D + 2, 3.6, M.thatch, 0.1);
  roof.position.set(0.6, 1.1, 0.3);
  roof.rotation.set(0.12, 0.15, -0.32);   // slid off and sagging
  g.add(roof);
  for (let i = 0; i < 6; i++) {
    const p = mesh(box(1.6 + rnd(), 0.06, 0.28), M.oldWood, (rnd() - 0.5) * 8, 0.05, (rnd() - 0.5) * 7);
    p.rotation.y = rnd() * 3;
    g.add(p);
  }
  return { group: g, obstacles: [{ x: -0.5, z: -0.5, r: 2.4, h: 99 }], radius: 6, hideout: 4.6 };
}

// A kura: white storehouse with black-and-white tiled lower walls and a tiled roof.
function buildKura() {
  const g = new THREE.Group();
  const W = 4.2, D = 3.4, H = 4;
  g.add(mesh(rbox(W + 0.4, 0.5, D + 0.4, 0.04), M.stone, 0, 0.25, 0));
  g.add(mesh(box(W, 1.4, D), M.namako, 0, 1.2, 0));
  g.add(mesh(box(W, H - 1.4, D), M.plaster, 0, 1.9 + (H - 1.4) / 2, 0));
  g.add(mesh(box(1.1, 1.8, 0.1), M.darkWood, 0, 1.4, D / 2 + 0.04));        // heavy door
  const roof = hipRoof(W + 1.2, D + 1.2, 1.6, M.tile, 0.15);
  roof.position.y = H + 0.5;
  g.add(roof);
  const crest = textBoard('米', 0.9, 0.9, { vertical: false, bg: '#efeadf', color: '#1a1a1a', border: false, scale: 0.8 });
  crest.position.set(0, H - 0.6, D / 2 + 0.02);
  g.add(crest);
  return { group: g, obstacles: [{ x: -1, z: 0, r: 1.7, h: 99 }, { x: 1, z: 0, r: 1.7, h: 99 }], radius: 5 };
}

// ---------- bridges ----------
function buildBridge(world, scene, b) {
  const g = new THREE.Group();
  const red = b.style === 'taiko';
  const deckMat = red ? M.wood : M.oldWood, railMat = red ? M.vermilion : M.oldWood;
  const n = Math.ceil(b.len / 0.7);
  const yaw = Math.atan2(b.dx, b.dz);
  const at = (t) => {
    const x = b.x0 + b.dx * b.len * t, z = b.z0 + b.dz * b.len * t;
    return { x, z, y: b.h0 + (b.h1 - b.h0) * t + b.arch * Math.sin(Math.PI * t) };
  };
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, a = at(t0), c = at(t1);
    const seg = mesh(box(b.w + 0.2, 0.16, Math.hypot(c.x - a.x, c.z - a.z, c.y - a.y) + 0.04), deckMat, (a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
    seg.rotation.order = 'YXZ';
    seg.rotation.y = yaw;
    seg.rotation.x = -Math.atan2(c.y - a.y, Math.hypot(c.x - a.x, c.z - a.z));
    g.add(seg);
  }
  // Railings: posts, a handrail following the arch, onion-shaped caps (giboshi) on the red bridge.
  const posts = Math.max(3, Math.round(b.len / 2));
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= posts; i++) {
      const p = at(i / posts);
      const x = p.x + b.dz * s * (b.w / 2), z = p.z - b.dx * s * (b.w / 2);
      g.add(mesh(box(0.12, 0.9, 0.12), railMat, x, p.y + 0.45, z));
      if (red && (i === 0 || i === posts)) g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), M.gold, x, p.y + 1.0, z));
      const top = new THREE.Vector3(x, p.y + 0.88, z);
      if (prev) {
        const mid = prev.clone().add(top).multiplyScalar(0.5);
        const rail = mesh(box(0.08, 0.08, prev.distanceTo(top)), railMat, mid.x, mid.y, mid.z);
        rail.lookAt(top);
        g.add(rail);
      }
      prev = top;
    }
  }
  // Supports down into the water.
  for (const t of [0.3, 0.5, 0.7]) {
    const p = at(t);
    const bottom = world.terrainAt(p.x, p.z);
    for (const s of [-1, 1]) {
      const x = p.x + b.dz * s * (b.w / 2 - 0.1), z = p.z - b.dx * s * (b.w / 2 - 0.1);
      const h = p.y - bottom;
      if (h > 0.3) g.add(mesh(cyl(0.1, 0.1, h, 6), red ? M.darkWood : M.oldWood, x, bottom + h / 2, z));
    }
  }
  scene.add(g);
}

// ---------- the castle ----------
function buildCastle(world, scene) {
  const C = world.castle;
  const g = new THREE.Group();
  g.position.set(C.x, 0, C.z);
  const obs = (x, z, r, h = 99) => world.obstacles.push({ x: C.x + x, z: C.z + z, r, base: world.heightAt(C.x + x, C.z + z), h });
  const gx = C.gateDir.x, gz = C.gateDir.z;
  const theta = Math.atan2(gx, gz);                       // the gate direction as a cylinder angle
  const gapAt = (r, half) => Math.asin(Math.min(1, half / r));
  const wallH = C.top - C.ground;

  // Ishigaki: the sloping stone wall all round, with a gap for the causeway.
  const gap = gapAt(C.rTop, 3.4);
  const wall = mesh(new THREE.CylinderGeometry(C.rTop + 0.25, C.rWall + 0.6, wallH + 0.4, 64, 2, true, theta + gap, Math.PI * 2 - gap * 2), M.ishigaki,
    0, C.ground + wallH / 2 - 0.1, 0);
  g.add(wall);
  // Stone walls along both sides of the causeway.
  for (const s of [-1, 1]) {
    for (let d = C.rTop; d < C.rampEnd; d += 1.5) {
      const top = C.top - Math.max(0, d - C.rTop) * 0.42;
      const bottom = d < C.rWall ? C.ground : world.terrainAt(C.x + gx * d + gz * s * 4.5, C.z + gz * d - gx * s * 4.5);
      const h = top - bottom;
      if (h < 0.3) continue;
      const seg = mesh(box(0.8, h, 1.55), M.ishigaki, gx * d + gz * s * 3.6, bottom + h / 2, gz * d - gx * s * 3.6);
      seg.rotation.y = theta;
      g.add(seg);
      if (d < C.rWall + 1) obs(gx * d + gz * s * 3.7, gz * d - gx * s * 3.7, 0.7);
    }
  }
  // Keep people off the steep wall: solid ring at the foot of the wall and along the top (parapet).
  for (const [r, half] of [[C.rWall + 0.6, 4.6], [C.rTop - 0.4, 3.2]]) {
    const n = Math.round(Math.PI * 2 * r / 1.5), gapA = gapAt(r, half);
    for (let i = 0; i < n; i++) {
      const a = theta + (i / n) * Math.PI * 2;
      const da = Math.atan2(Math.sin(a - theta), Math.cos(a - theta));
      if (Math.abs(da) < gapA) continue;
      obs(Math.sin(a) * r, Math.cos(a) * r, 0.85);
    }
  }
  // Dobei: white plaster wall with a tiled cap along the top edge.
  {
    const parts = [], caps = [];
    const r = C.rTop - 0.4, n = 72, gapA = gapAt(r, 3.2);
    for (let i = 0; i < n; i++) {
      const a = theta + ((i + 0.5) / n) * Math.PI * 2;
      const da = Math.atan2(Math.sin(a - theta), Math.cos(a - theta));
      if (Math.abs(da) < gapA + 0.02) continue;
      const len = 2 * r * Math.sin(Math.PI / n) + 0.05;
      const p = new THREE.BoxGeometry(len, 1.4, 0.4).rotateY(a).translate(Math.sin(a) * r, C.top + 0.7, Math.cos(a) * r);
      const cp = new THREE.BoxGeometry(len + 0.05, 0.18, 0.75).rotateY(a).translate(Math.sin(a) * r, C.top + 1.48, Math.cos(a) * r);
      parts.push(p); caps.push(cp);
    }
    g.add(mesh(mergeGeometries(parts), M.plaster));
    g.add(mesh(mergeGeometries(caps), M.tile));
  }
  // The moat: a ring of water with a gap where the causeway crosses.
  const mgap = gapAt((C.moatIn + C.moatOut) / 2, 4.3);
  const a0 = -(Math.atan2(gz, gx));
  const moat = new THREE.Mesh(new THREE.RingGeometry(C.moatIn - 1.6, C.moatOut + 1.6, 96, 1, a0 + mgap, Math.PI * 2 - mgap * 2).rotateX(-Math.PI / 2), M.water);
  moat.position.y = C.moatLevel;
  moat.receiveShadow = true;
  g.add(moat);

  // Gatehouse (yagura-mon) at the top of the causeway: two big pillars, doors open, a white turret on top.
  const gd = C.rTop + 0.2;
  const gate = new THREE.Group();
  gate.position.set(gx * gd, C.top, gz * gd);
  gate.rotation.y = theta;
  for (const s of [-1, 1]) {
    gate.add(mesh(box(0.55, 4.2, 0.55), M.darkWood, s * 3, 2.1, 0));
    const door = mesh(box(2.5, 3.6, 0.15), M.darkWood, s * 3 - s * 0.1, 1.8, -1.3);   // swung open inward
    door.rotation.y = s * 1.3;
    gate.add(door);
  }
  gate.add(mesh(box(7.6, 0.5, 0.7), M.darkWood, 0, 4.4, 0));
  gate.add(mesh(box(8.4, 2.4, 3.4), M.keepWall, 0, 5.85, 0));
  const groof = hipRoof(10, 5, 1.8, M.tile, 0.3); groof.position.y = 7.05; gate.add(groof);
  const sign = textBoard('城', 0.9, 0.9, { vertical: false, bg: '#1d1b19', color: '#e8c45a', border: true, scale: 0.8 });
  sign.position.set(0, 3.55, 0.4); gate.add(sign);
  g.add(gate);
  obs(gx * gd + gz * 3, gz * gd - gx * 3, 0.45);
  obs(gx * gd - gz * 3, gz * gd + gx * 3, 0.45);

  // Corner turrets (sumi-yagura) on the walls.
  for (const da of [1.9, -1.9, Math.PI]) {
    const a = theta + da, r = C.rTop - 2.4;
    const t = new THREE.Group();
    t.position.set(Math.sin(a) * r, C.top, Math.cos(a) * r);
    t.rotation.y = a;
    t.add(mesh(box(5, 3, 5), M.keepWall, 0, 1.5, 0));
    const r1 = hipRoof(6.4, 6.4, 1.1, M.tile, 0.3); r1.position.y = 3; t.add(r1);
    t.add(mesh(box(3.6, 2.2, 3.6), M.keepWall, 0, 4.4, 0));
    const r2 = hipRoof(5, 5, 1.4, M.tile, 0.3); r2.position.y = 5.5; t.add(r2);
    g.add(t);
    obs(Math.sin(a) * r, Math.cos(a) * r, 3.2);
  }

  // Tenshu: the keep, at the back of the courtyard.
  const kd = -7.5;
  const keep = new THREE.Group();
  keep.position.set(gx * kd, C.top, gz * kd);
  keep.rotation.y = theta;
  keep.scale.setScalar(1.3);
  keep.add(mesh(new THREE.CylinderGeometry(7.4, 8.6, 3, 4, 1).rotateY(Math.PI / 4), M.ishigaki, 0, 1.5, 0));   // sloped stone base
  const tiers = [[10, 4.2, 8], [7.6, 3.6, 6.2], [5.4, 3.2, 4.4]];
  let y = 3;
  tiers.forEach(([w, h, d], i) => {
    keep.add(mesh(box(w, h, d), M.keepWall, 0, y + h / 2, 0));
    keep.add(mesh(box(w + 0.1, 0.25, d + 0.1), M.darkWood, 0, y + 0.12, 0));
    y += h;
    const roof = hipRoof(w + 2.8, d + 2.8, i === 2 ? 2.6 : 1.5, M.tile, 0.45);
    roof.position.y = y;
    keep.add(roof);
    if (i < 2) {   // a pointed gable (chidori-hafu) on the front of the roof
      const gable = mesh(new THREE.ConeGeometry(1.8, 1.4, 3).rotateY(Math.PI / 2).scale(1, 1, 0.5), M.tile, 0, y + 0.75, d / 2 + 0.6);
      keep.add(gable);
      keep.add(mesh(new THREE.CircleGeometry(0.55, 3).rotateZ(Math.PI / 2), M.plaster, 0, y + 0.55, d / 2 + 1.05));
    }
    y += i === 2 ? 0 : 1.1;
  });
  // Gold shachihoko (fish-tiger guardians against fire) on both ends of the top ridge.
  for (const s of [-1, 1]) {
    const fish = new THREE.Group();
    fish.position.set(s * 1.3, y + 2.55, 0);
    fish.add(mesh(new THREE.ConeGeometry(0.28, 0.9, 8).rotateZ(s * 0.3), M.gold, 0, 0.3, 0));                 // body, head down
    const tail = mesh(new THREE.ConeGeometry(0.2, 0.55, 6), M.gold, s * 0.3, 0.85, 0); tail.rotation.z = s * -0.8; fish.add(tail);
    keep.add(fish);
  }
  keep.add(mesh(box(2.6, 0.3, 0.3), M.tile, 0, y + 2.55, 0));
  g.add(keep);
  for (const [lx, lz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5], [0, 0]]) {
    const ca = Math.cos(theta), sa = Math.sin(theta);
    const wx = gx * kd + lx * ca + lz * sa, wz = gz * kd - lx * sa + lz * ca;
    obs(wx * 1 + (wx - gx * kd) * 0.3, wz + (wz - gz * kd) * 0.3, 3.8);
  }
  // Stone lanterns lining the way from the gate to the keep.
  for (const d of [14, 8]) for (const s of [-1, 1]) {
    const t = toro();
    const x = gx * d + gz * s * 3, z = gz * d - gx * s * 3;
    t.position.set(x, C.top, z);
    g.add(t);
    obs(x, z, 0.45);
  }
  scene.add(g);
  // The castle's name at the foot of the causeway.
  const np = namePost('城');
  const px = C.x + gx * (C.rampEnd + 1) + gz * 4.5, pz = C.z + gz * (C.rampEnd + 1) - gx * 4.5;
  np.position.set(px, world.heightAt(px, pz), pz);
  scene.add(np);
  world.obstacles.push({ x: px, z: pz, r: 0.3, base: world.heightAt(px, pz), h: 99 });
  world.obstaclesChanged();
}

// ---------- the village ----------
function buildVillage(world, scene, rnd, place) {
  const V = world.village;
  if (!V) return;
  // Farmhouses and a storehouse on the north bank.
  const houses = [['茶屋', 0], ['宿屋', 0], [null, 0], [null, 0], ['kura', 0]];
  for (const [what] of houses) {
    const built = what === 'kura' ? buildKura() : buildMinka(rnd, false, what);
    place(built, V.x, V.z, 10, 38, 9, (x, z) => z < world.streamZ(x) - 10, true);
  }
  // Rice paddies: shallow water with rows of rice plants.
  const tuftGeo = mergeGeometries([0, 1, 2].map(i => new THREE.PlaneGeometry(0.06, 0.55).translate(0, 0.27, 0).rotateZ((i - 1) * 0.25).rotateY(i * 1.05)));
  const tufts = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  for (const p of world.paddies) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(p.w - 0.3, p.d - 0.3).rotateX(-Math.PI / 2), M.water);
    w.position.set(p.x, p.y - 0.03, p.z);
    w.receiveShadow = true;
    scene.add(w);
    for (let x = -p.w / 2 + 0.6; x < p.w / 2 - 0.4; x += 0.65) for (let z = -p.d / 2 + 0.6; z < p.d / 2 - 0.4; z += 0.65) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
      sc.setScalar(0.8 + rnd() * 0.4);
      tufts.push(m4.compose(new THREE.Vector3(p.x + x, p.y - 0.1, p.z + z), q, sc).clone());
    }
  }
  const rice = new THREE.InstancedMesh(tuftGeo, M.rice, tufts.length);
  tufts.forEach((m, i) => rice.setMatrixAt(i, m));
  rice.computeBoundingSphere();
  scene.add(rice);
  // A scarecrow (kakashi) in the middle paddy.
  const P = world.paddies[2] || world.paddies[0];
  const k = new THREE.Group();
  k.position.set(P.x + 1, P.y - 0.1, P.z);
  k.add(mesh(cyl(0.05, 0.05, 2.2, 6), M.oldWood, 0, 1.1, 0));
  k.add(mesh(box(1.6, 0.07, 0.07), M.oldWood, 0, 1.6, 0));
  k.add(mesh(box(0.9, 0.8, 0.25), std({ color: 0x3d5a8a, roughness: 0.9 }), 0, 1.35, 0));     // old blue kimono
  k.add(mesh(new THREE.SphereGeometry(0.18, 8, 6), M.paper, 0, 2.05, 0));
  k.add(mesh(new THREE.ConeGeometry(0.5, 0.25, 12), M.straw, 0, 2.3, 0));                   // straw hat
  scene.add(k);
  // Watermill on the north bank, wheel turning in the stream.
  const mx = V.bridgeX + 24, sz = world.streamZ(mx);
  const wz = sz - 4.6, wy = world.waterLevel(mx) + 0.3;
  const wheel = new THREE.Group();
  wheel.position.set(mx, wy + 1.3, wz);
  for (const s of [-0.35, 0.35]) wheel.add(mesh(new THREE.TorusGeometry(1.9, 0.08, 6, 24), M.oldWood, 0, 0, s));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const blade = mesh(box(0.08, 0.6, 0.8), M.oldWood, Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0);
    blade.rotation.z = a;
    wheel.add(blade);
    const spoke = mesh(box(1.9, 0.07, 0.07), M.oldWood, Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
    spoke.rotation.z = a;
    if (i % 2 === 0) wheel.add(spoke);
  }
  wheel.add(mesh(cyl(0.12, 0.12, 1.4, 8).rotateX(Math.PI / 2), M.darkWood, 0, 0, 0));
  scene.add(wheel);
  (world.spinners = world.spinners || []).push({ obj: wheel, speed: -0.6 });
  const mill = buildMinka(rnd, false, null);
  mill.group.scale.setScalar(0.6);
  const hy = world.heightAt(mx, wz - 4.5);
  mill.group.position.set(mx, hy, wz - 4.6);
  scene.add(mill.group);
  for (const o of mill.obstacles) world.obstacles.push({ x: mx + o.x * 0.6, z: wz - 4.6 + o.z * 0.6, r: o.r * 0.6, base: hy, h: 99 });
  world.reserved.push({ x: mx, z: wz - 3, r: 6 });
  // A village name post by the red bridge.
  const np = namePost('村');
  np.position.set(V.bridgeX + 2.6, world.heightAt(V.bridgeX + 2.6, sz - 10), sz - 10);
  scene.add(np);
}

// ---------- paths: lanterns, jizō and signposts ----------
function buildRoadside(world, scene, rnd) {
  const ok = (x, z, clear) => world.streamDist(x, z) > 7 && !world.reserved.some(r => Math.hypot(r.x - x, r.z - z) < r.r + clear)
    && !world.blocked(x, z, clear) && world.deckAt(x, z) === -Infinity;
  const put = (obj, x, z, yaw, r) => {
    obj.position.set(x, world.heightAt(x, z), z);
    obj.rotation.y = yaw;
    scene.add(obj);
    world.obstacles.push({ x, z, r, base: world.heightAt(x, z), h: 99 });
  };
  for (const path of world.paths) {
    const pts = path.pts, A = world.areas.byId[path.area];
    // Length along the path, to space things out.
    let along = 0, nextLamp = 20, side = 1, jizoDone = false;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const seg = Math.hypot(b.x - a.x, b.z - a.z);
      along += seg;
      const ux = (b.x - a.x) / seg, uz = (b.z - a.z) / seg;
      if (along > nextLamp) {
        nextLamp += 30;
        const x = b.x + uz * side * 2.8, z = b.z - ux * side * 2.8;
        if (ok(x, z, 0.6)) put(toro(), x, z, Math.atan2(-uz * side, ux * side) + Math.PI / 2, 0.45);
        side = -side;
      }
      if (!jizoDone && along > 45) {   // a row of jizō by the path, a third of the way along
        const x = b.x - uz * 3.2, z = b.z + ux * 3.2;
        if (ok(x, z, 1.5)) {
          jizoDone = true;
          const n = 2 + Math.floor(rnd() * 3);
          for (let k = 0; k < n; k++) {
            const jx = x + ux * (k - (n - 1) / 2) * 0.6, jz = z + uz * (k - (n - 1) / 2) * 0.6;
            const j = jizo(0.9 + rnd() * 0.3);
            j.position.set(jx, world.heightAt(jx, jz), jz);
            j.rotation.y = Math.atan2(uz, -ux) + Math.PI / 2 + Math.PI;
            scene.add(j);
          }
          world.obstacles.push({ x, z, r: 0.4 + n * 0.3, base: world.heightAt(x, z), h: 1.2 });
          world.reserved.push({ x, z, r: 1.6 });
        }
      }
    }
    // Signpost near the start of the path, pointing the way: "竹林へ" = to the bamboo grove.
    const p0 = pts[3], p1 = pts[6];
    const ux = p1.x - p0.x, uz = p1.z - p0.z, l = Math.hypot(ux, uz);
    const sx = p0.x + (uz / l) * 2.2, sz = p0.z - (ux / l) * 2.2;
    const sign = signpost(`${A.jp}へ`);
    sign.position.set(sx, world.heightAt(sx, sz), sz);
    sign.rotation.y = Math.atan2(-uz, ux);          // the arrow (+x) points along the path
    sign.scale.setScalar(1.6);
    scene.add(sign);
    world.obstacles.push({ x: sx, z: sz, r: 0.25, base: world.heightAt(sx, sz), h: 99 });
    // Name post where the path reaches the area.
    if (path.area !== 'castle' && path.area !== 'village') {
      const e = pts[pts.length - 8], e2 = pts[pts.length - 7];
      const ex = e.x + (e2.z - e.z) * 0.9, ez = e.z - (e2.x - e.x) * 0.9;
      const ns = Math.hypot(e2.x - e.x, e2.z - e.z);
      const px = e.x + ((e2.z - e.z) / ns) * 2.6, pz = e.z - ((e2.x - e.x) / ns) * 2.6;
      void ex; void ez;
      if (ok(px, pz, 0.4)) put(namePost(A.jp), px, pz, Math.atan2(e2.x - e.x, e2.z - e.z), 0.3);
    }
  }
  for (const b of world.bridges) buildBridge(world, scene, b);
}

// ---------- put it all into the world ----------
export function buildLandmarks(world, scene) {
  materials();
  const rnd = makeRandom(world.cfg.seed + 5);
  world.landmarks = [];
  world.hideouts = [];   // places to hide: samurai lose track of you in here (unless they're right next to you)
  world.spinners = world.spinners || [];

  const ring = (x, z, r, y) => {   // a faint green ring on the ground so you know where a hideout is
    const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.22, depthWrite: false }));
    m.position.set(x, y + 0.08, z);
    m.renderOrder = 2;
    scene.add(m);
  };
  // Add a building at (x, z) facing `yaw`, make it solid, keep trees off it, and make its hideout.
  const add = (built, x, z, yaw, y = world.heightAt(x, z)) => {
    const { group, obstacles, radius, hideout } = built;
    group.position.set(x, y - 0.05, z);
    group.rotation.y = yaw;
    scene.add(group);
    world.reserved.push({ x, z, r: radius });
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    for (const o of obstacles) {
      const wx = x + o.x * c + o.z * sn, wz = z - o.x * sn + o.z * c;
      world.obstacles.push({ x: wx, z: wz, r: o.r, base: world.heightAt(wx, wz), h: o.h });
    }
    world.landmarks.push({ x, z, radius });
    if (hideout) { world.hideouts.push({ x, z, r: hideout }); ring(x, z, hideout, y); }
  };
  // Find a free spot between rMin and rMax meters from (cx, cz), then add the building there.
  const place = (built, cx, cz, rMin, rMax, clear, extra = () => true, faceCenter = false) => {
    for (let t = 0; t < 300; t++) {
      const a = rnd() * Math.PI * 2, d = rMin + rnd() * (rMax - rMin);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (Math.abs(x) > world.limit - 12 || Math.abs(z) > world.limit - 12) continue;
      if (world.streamDist(x, z) < clear + 3 || world.pathDist(x, z) < clear) continue;
      if (world.reserved.some(r => Math.hypot(r.x - x, r.z - z) < r.r + clear)) continue;
      const O = world.outpostSpot;
      if (O && Math.hypot(O.x - x, O.z - z) < (O.wall || 15) + 10 + clear) continue;
      if (!extra(x, z)) continue;
      const yaw = faceCenter ? Math.atan2(cx - x, cz - z) : rnd() * Math.PI * 2;
      add(built, x, z, yaw);
      return { x, z };
    }
    return null;
  };

  // Shrine hill.
  const T = world.templeSpot, S = world.areas.byId.shrine;
  add(buildShrine(rnd), T.x, T.z, Math.atan2(S.x - T.x, S.z - T.z), world.templeTop);
  world.hideouts.push({ x: T.x, z: T.z, r: 7 });
  ring(T.x, T.z, 7, world.templeTop);
  buildToriiTunnel(world, scene);
  // The pagoda, a short walk from the start.
  place(buildPagoda(), S.x, S.z, 20, 34, 8, (x, z) => Math.hypot(x - T.x, z - T.z) > 26);
  // Ruined farmhouses out in the forest (hideouts).
  for (const [id, n] of [['bamboo', 2], ['cedar', 1], ['maple', 1], ['shrine', 1]]) {
    const A = world.areas.byId[id];
    for (let i = 0; i < n; i++) place(buildMinka(rnd, true), A.x, A.z, id === 'shrine' ? 50 : 15, id === 'shrine' ? 80 : A.r * 0.8, 7);
  }
  buildVillage(world, scene, rnd, place);
  if (world.castle) buildCastle(world, scene);
  buildRoadside(world, scene, rnd);
}
