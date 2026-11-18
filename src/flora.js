// The Japanese forest: which trees grow where, and how each kind is built.
//  - Sugi (Japanese cedar): tall straight red-brown trunk, narrow dark cone crown in layers.
//  - Hinoki (Japanese cypress): a bit shorter, softer rounded layers, lighter green.
//  - Akamatsu (red pine): bent trunk, orange-red bark up high, flat "cloud" pads of needles.
//  - Momiji (Japanese maple): small tree, wide umbrella of red/orange leaves.
//  - Sakura (cherry): dark trunk, wide flat clouds of pink blossom.
//  - Bamboo (moso): clumps of tall thin jointed stalks with feathery leaf sprays.
// Each area of the map (areas.js) has its own mix. Leaves of each kind are kept in their own
// batch (world.foliage) so the seasons can recolour them later.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, makeLumpyGeometry, makeFrondGeometry, addCutaway } from './world.js';

// How many trees grow in each area (0-1) and which kinds: [kind, share].
const MIX = {
  wild:    { density: 0.85, kinds: [['sugi', 0.45], ['hinoki', 0.3], ['pine', 0.15], ['maple', 0.1]] },
  cedar:   { density: 1.0,  kinds: [['sugi', 0.65], ['hinoki', 0.3], ['pine', 0.05]] },
  bamboo:  { density: 0.25, kinds: [['sugi', 0.4], ['maple', 0.35], ['pine', 0.25]] },
  village: { density: 0.25, kinds: [['pine', 0.3], ['sakura', 0.35], ['maple', 0.3], ['sugi', 0.05]] },
  maple:   { density: 0.8,  kinds: [['maple', 0.6], ['sugi', 0.3], ['hinoki', 0.1]] },
  castle:  { density: 0.3,  kinds: [['pine', 0.6], ['sakura', 0.3], ['sugi', 0.1]] },
  shrine:  { density: 0.55, kinds: [['sugi', 0.45], ['sakura', 0.25], ['maple', 0.2], ['pine', 0.1]] },
};
// How thick the bamboo grows (clumps) in each area.
const BAMBOO = { wild: 0.06, bamboo: 1, cedar: 0.04, shrine: 0.05, village: 0.08, maple: 0, castle: 0 };

// A cone that's a bit uneven, for the cedar's layers of needles.
export function makeTierGeometry(rnd) {
  const g = new THREE.ConeGeometry(1, 1, 10, 3);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position, v = new THREE.Vector3(), seen = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [1 + (rnd() - 0.5) * 0.35, (rnd() - 0.5) * 0.12]);
    const [s, dy] = seen.get(key);
    p.setXYZ(i, v.x * s, v.y + (v.y > 0.01 && v.y < 0.99 ? dy : 0), v.z * s);
  }
  g.computeVertexNormals();
  return g;
}

// A bamboo stalk 1 m tall and 1 m wide (scaled per stalk), with a bulge at each joint.
function makeCulmGeometry() {
  const rows = 24;
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, rows, true);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const row = Math.round(p.getY(i) * rows);
    const s = (row % 3 === 0 ? 1.3 : 1) * (1 - p.getY(i) * 0.35);   // joints, and thinner toward the top
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g;
}

// A spray of 5 narrow bamboo leaves fanned out from one twig.
function makeSprayGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const leaf = makeFrondGeometry(0.75, 0.12, 0.5, 4, 1);   // few triangles: there are a LOT of these
    leaf.rotateY((i - 2) * 0.45);
    leaf.rotateZ(-0.25 - Math.abs(i - 2) * 0.08);
    parts.push(leaf);
  }
  return mergeGeometries(parts);
}

// Japanese bamboo grass: a clump of short, wide, pointed leaves.
function makeSasaGeometry(rnd) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.09, 0.12, 0.08, 0.32, 0, 0.42);
  shape.bezierCurveTo(-0.08, 0.32, -0.09, 0.12, 0, 0);
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.ShapeGeometry(shape, 4);
    leaf.rotateX(-Math.PI / 2 + 0.5 + rnd() * 0.5);          // tipped out and down
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    leaf.rotateY(a);
    leaf.translate(Math.sin(a) * 0.12, 0.25 + rnd() * 0.35, Math.cos(a) * 0.12);
    parts.push(leaf);
  }
  return mergeGeometries(parts);
}

export function buildForest(world, scene, cfg, m) {
  const r = world.rnd;
  const areas = world.areas;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), tmp = new THREE.Vector3();

  // Batches (one InstancedMesh per map tile each).
  const tierGeo = makeTierGeometry(r);
  const blobGeo = makeLumpyGeometry(1, 1, 0.35, r);
  const padGeo = makeLumpyGeometry(1, 1, 0.3, r);
  const evergreen = new Batch(tierGeo, m.leafMat, { shade: 0.9 });          // sugi + hinoki layers
  const cypress = new Batch(makeTierGeometry(r), m.leafMat, { shade: 0.9 }); // hinoki's softer layers
  const pinePads = new Batch(padGeo, m.leafMat, { shade: 0.9 });
  const mapleLeaves = new Batch(blobGeo, m.leafMat, { shade: 1 });
  const sakuraLeaves = new Batch(blobGeo, m.leafMat, { shade: 1 });
  const limbs = new Batch(m.trunkGeo, m.barkMat, { shade: 0.8 });           // branches and pine upper trunks
  const culms = new Batch(makeCulmGeometry(), m.barkMat, { shade: 1 });
  const sprays = new Batch(makeSprayGeometry(), m.frondMat, { shadow: false, shade: 0.85 });
  const sasa = new Batch(makeSasaGeometry(r), m.plantMat, { shadow: false, shade: 0.8 });

  // A tube (trunk or branch) from point a to point b.
  const segment = (batch, a, b, radius, col) => {
    dir.subVectors(b, a);
    const len = dir.length();
    dummy.position.copy(a);
    dummy.quaternion.setFromUnitVectors(up, dir.normalize());
    dummy.scale.set(radius, len, radius);
    dummy.updateMatrix();
    batch.add(dummy.matrix, col);
  };
  const blob = (batch, x, y, z, sx, sy, sz, col) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(r() * 3, r() * 3, r() * 3);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    batch.add(dummy.matrix, col);
  };
  const vineSpot = (x, z, top, tx, tz) => world.canopySpots.push({ x, z, top, tx, tz });

  // ---------- each kind of tree ----------
  const kinds = {
    sugi(x, y, z) {
      const rad = 0.35 + r() * 0.25, h = 13 + r() * 6;
      dummy.position.set(x, y - 0.3, z); dummy.rotation.set((r() - .5) * .04, r() * 6.28, (r() - .5) * .04);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      m.trunks.add(dummy.matrix, color.setHSL(0.03 + r() * 0.02, 0.38, 0.2 + r() * 0.06));
      dummy.scale.set(rad * 2.4, 1.4 + r(), rad * 2.4); dummy.updateMatrix();
      m.roots.add(dummy.matrix, color.setHSL(0.04, 0.3, 0.16));
      // A tall narrow spire: many overlapping layers, widest a third of the way up.
      const base = Math.max(6, h * 0.38), R = 1.5 + r() * 0.6, tiers = 8 + Math.floor(r() * 3);
      const step = (h + 1.5 - base) / tiers;
      for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1), f = t < 0.2 ? 0.75 + t * 1.25 : 1 - (t - 0.2) * 1.05;
        dummy.position.set(x + (r() - 0.5) * 0.25, y + base + i * step - step * 0.3, z + (r() - 0.5) * 0.25);
        dummy.rotation.set((r() - 0.5) * 0.08, r() * 6.28, (r() - 0.5) * 0.08);
        dummy.scale.set(R * (0.2 + 0.8 * f), step * 2.3, R * (0.2 + 0.8 * f)); dummy.updateMatrix();
        evergreen.add(dummy.matrix, color.setHSL(0.36 + r() * 0.06, 0.32 + r() * 0.12, 0.085 + r() * 0.04));
      }
      for (let k = 0; k < 2; k++) { const a = r() * 6.28; vineSpot(x + Math.cos(a) * R * 0.8, z + Math.sin(a) * R * 0.8, y + base, x, z); }
      return { rad, h };
    },
    hinoki(x, y, z) {
      const rad = 0.3 + r() * 0.2, h = 10 + r() * 5;
      dummy.position.set(x, y - 0.3, z); dummy.rotation.set((r() - .5) * .05, r() * 6.28, (r() - .5) * .05);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      m.trunks.add(dummy.matrix, color.setHSL(0.05 + r() * 0.02, 0.3, 0.27 + r() * 0.06));
      dummy.scale.set(rad * 2.2, 1.2, rad * 2.2); dummy.updateMatrix();
      m.roots.add(dummy.matrix, color.setHSL(0.05, 0.25, 0.2));
      // Broader and softer than a cedar: rounded layers of lighter, yellower green, drooping a little.
      const base = Math.max(5.5, h * 0.35), R = 2.1 + r() * 0.6, n = 6 + Math.floor(r() * 2);
      const step = (h + 1 - base) / n;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), f = Math.sqrt(Math.max(0, 1 - t * t * 0.9)) * (1 - t * 0.55);
        dummy.position.set(x + (r() - 0.5) * 0.4, y + base + i * step - step * 0.4, z + (r() - 0.5) * 0.4);
        dummy.rotation.set((r() - 0.5) * 0.15, r() * 6.28, (r() - 0.5) * 0.15);
        dummy.scale.set(R * (0.25 + 0.75 * f), step * 1.7, R * (0.25 + 0.75 * f)); dummy.updateMatrix();
        cypress.add(dummy.matrix, color.setHSL(0.25 + r() * 0.04, 0.42 + r() * 0.1, 0.14 + r() * 0.05));
      }
      const a = r() * 6.28; vineSpot(x + Math.cos(a) * R * 0.8, z + Math.sin(a) * R * 0.8, y + base - 0.4, x, z);
      return { rad, h };
    },
    pine(x, y, z) {
      const rad = 0.24 + r() * 0.12, yaw = r() * 6.28;
      const a = new THREE.Vector3(x, y - 0.3, z);
      const lean1 = 0.1 + r() * 0.2, lean2 = 0.3 + r() * 0.35, h1 = 3 + r() * 2, h2 = 3.5 + r() * 2.5;
      const b = a.clone().add(tmp.set(Math.cos(yaw) * Math.sin(lean1), Math.cos(lean1), Math.sin(yaw) * Math.sin(lean1)).multiplyScalar(h1));
      const yaw2 = yaw + (r() - 0.5) * 1.5;
      const c = b.clone().add(tmp.set(Math.cos(yaw2) * Math.sin(lean2), Math.cos(lean2), Math.sin(yaw2) * Math.sin(lean2)).multiplyScalar(h2));
      segment(m.trunks, a, b.clone().add(tmp.set(0, 0.3, 0)), rad, color.setHSL(0.06, 0.18, 0.24));                 // grey-brown low down
      segment(limbs, b, c, rad * 0.8, color.setHSL(0.045 + r() * 0.015, 0.6, 0.4 + r() * 0.06));                  // orange-red up high
      dummy.position.copy(a); dummy.rotation.set(0, 0, 0); dummy.scale.set(rad * 2.4, 1, rad * 2.4); dummy.updateMatrix();
      m.roots.add(dummy.matrix, color.setHSL(0.06, 0.2, 0.18));
      // Branches straight out to the sides, each ending in a flat pad of needles.
      const pads = [c];
      const nb = 3 + Math.floor(r() * 3);
      for (let i = 0; i < nb; i++) {
        const t = 0.35 + r() * 0.6;
        const from = b.clone().lerp(c, t);
        const ang = r() * 6.28, len = 1.6 + r() * 1.8;
        const to = from.clone().add(tmp.set(Math.cos(ang) * len, 0.3 + r() * 0.6, Math.sin(ang) * len));
        segment(limbs, from, to, rad * 0.32, color.setHSL(0.05, 0.45, 0.32));
        pads.push(to);
      }
      for (const p of pads) {
        const s = 1.3 + r() * 0.8;
        dummy.position.copy(p).add(tmp.set(0, 0.2, 0));
        dummy.rotation.set((r() - 0.5) * 0.3, r() * 6.28, (r() - 0.5) * 0.3);
        dummy.scale.set(s, 0.42 + r() * 0.2, s * (0.8 + r() * 0.3)); dummy.updateMatrix();
        pinePads.add(dummy.matrix, color.setHSL(0.27 + r() * 0.05, 0.35, 0.15 + r() * 0.06));
        if (Math.hypot(p.x - x, p.z - z) > 1.2) vineSpot(p.x, p.z, p.y - 0.25, x, z);
      }
      return { rad, h: c.y - y };
    },
    maple(x, y, z) {
      // Each tree has one colour: most are deep red, some orange, a few golden yellow.
      const t = r();
      const [hu, sa, li] = t < 0.6 ? [0.0 + r() * 0.02, 0.78, 0.36] : t < 0.85 ? [0.05 + r() * 0.02, 0.85, 0.44] : [0.11 + r() * 0.02, 0.85, 0.5];
      return broadleaf(x, y, z, mapleLeaves, () => color.setHSL(hu + (r() - 0.5) * 0.015, sa, li + (r() - 0.5) * 0.08),
        { trunk: color.clone().setHSL(0.06, 0.18, 0.22), h: 2 + r() * 1.2, spread: 2.2, blobs: 12, size: 1.05, flat: true });
    },
    sakura(x, y, z) { return broadleaf(x, y, z, sakuraLeaves,
      () => color.setHSL(0.94 + r() * 0.03, 0.75 + r() * 0.15, 0.8 + r() * 0.06),
      { trunk: color.clone().setHSL(0.02, 0.2, 0.13), h: 1.8 + r() * 0.8, spread: 3, blobs: 12, size: 1.25, flat: true }); },
  };

  // Maple and cherry: short trunk, limbs spreading up and out, leaf clouds on the ends.
  function broadleaf(x, y, z, leaves, leafColor, o) {
    const rad = 0.18 + r() * 0.1;
    const a = new THREE.Vector3(x, y - 0.2, z), b = new THREE.Vector3(x + (r() - 0.5) * 0.4, y + o.h, z + (r() - 0.5) * 0.4);
    segment(m.trunks, a, b, rad, o.trunk);
    const n = 3 + Math.floor(r() * 2);
    let top = 0;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.28 + r() * 0.6, len = 2 + r() * 1.5, rise = o.flat ? 0.45 : 0.75;
      const to = b.clone().add(tmp.set(Math.cos(ang) * len * (1 - rise * 0.5), len * rise, Math.sin(ang) * len * (1 - rise * 0.5)));
      segment(limbs, b, to, rad * 0.55, o.trunk);
      top = Math.max(top, to.y);
      for (let k = 0; k < o.blobs / n + 1; k++) {
        const s = o.size * (0.7 + r() * 0.5);
        blob(leaves, to.x + (r() - 0.5) * 1.6, to.y + 0.3 + (r() - 0.3) * 0.8, to.z + (r() - 0.5) * 1.6, s, s * (o.flat ? 0.5 : 0.65), s, leafColor());
      }
      vineSpot(to.x, to.z, to.y - 0.4, x, z);
    }
    // One cloud over the middle so it isn't hollow.
    const s = o.size * 1.2;
    blob(leaves, b.x, top + 0.5, b.z, s, s * 0.6, s, leafColor());
    return { rad, h: top + 1 - y };
  }

  // ---------- the sacred cedar on shrine hill ----------
  // An ancient giant (shinboku) with a thick straw rope (shimenawa) round it and zig-zag paper (shide).
  const S = areas.byId.shrine;
  if (S) {
    const sx = S.x + 11, sz = S.z - 13, sy = world.heightAt(sx, sz);
    world.reserved.push({ x: sx, z: sz, r: 5 });
    const g = new THREE.Group();
    g.position.set(sx, sy, sz);
    const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const bark = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.9, color: new THREE.Color().setHSL(0.03, 0.35, 0.16) }));
    add(new THREE.CylinderGeometry(1.1, 1.7, 26, 12, 6).translate(0, 13, 0), bark, 0, -0.4, 0);
    add(new THREE.ConeGeometry(3.4, 2.4, 12, 1, true).translate(0, 1.2, 0), bark, 0, -0.4, 0);   // spreading roots
    const needles = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.55, flatShading: true, color: new THREE.Color().setHSL(0.36, 0.35, 0.09) }));
    for (let i = 0; i < 11; i++) {
      const t = i / 10, f = t < 0.25 ? 0.8 + t * 0.8 : 1 - (t - 0.25) * 1.1;
      const tier = add(tierGeo, needles, (r() - 0.5) * 0.6, 11 + i * 1.8, (r() - 0.5) * 0.6);
      tier.scale.set(4.2 * (0.2 + 0.8 * f), 4, 4.2 * (0.2 + 0.8 * f));
      tier.rotation.y = r() * 6;
    }
    const straw = new THREE.MeshStandardMaterial({ color: 0xc9b27a, roughness: 1 });
    // Two thick twisted strands of straw, with tufts of straw hanging down between the papers.
    for (const [dy, tilt] of [[0.12, 0.04], [-0.12, -0.04]]) {
      const strand = add(new THREE.TorusGeometry(1.72, 0.2, 8, 40).rotateX(Math.PI / 2), straw, 0, 2.7 + dy, 0);
      strand.rotation.z = tilt;
    }
    const tuft = new THREE.ConeGeometry(0.09, 0.45, 5).translate(0, -0.22, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6 + 1 / 12) * Math.PI * 2;
      add(tuft, straw, Math.cos(a) * 1.9, 2.5, Math.sin(a) * 1.9);
    }
    const paper = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.8, side: THREE.DoubleSide });
    const zig = new THREE.Shape();   // a shide: white paper folded in a zig-zag
    zig.moveTo(0, 0); zig.lineTo(0.12, 0); zig.lineTo(0.12, -0.12); zig.lineTo(0.2, -0.12); zig.lineTo(0.2, -0.26);
    zig.lineTo(0.08, -0.26); zig.lineTo(0.08, -0.38); zig.lineTo(0.16, -0.38); zig.lineTo(0.16, -0.5); zig.lineTo(0.04, -0.5);
    zig.lineTo(0.04, -0.38); zig.lineTo(-0.04, -0.38); zig.lineTo(-0.04, -0.26); zig.lineTo(0.04, -0.26); zig.lineTo(0.04, -0.12);
    zig.lineTo(0, -0.12); zig.closePath();
    const shideGeo = new THREE.ShapeGeometry(zig);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sh = add(shideGeo, paper, Math.cos(a) * 1.95, 2.55, Math.sin(a) * 1.95);
      sh.rotation.y = -a + Math.PI / 2;
      sh.scale.setScalar(2);
    }
    scene.add(g);
    world.obstacles.push({ x: sx, z: sz, r: 2, base: sy, h: 99 });
    world.sacredTree = { x: sx, z: sz };
  }

  // ---------- plant them ----------
  const areaName = (x, z) => areas.at(x, z)?.id ?? 'wild';
  const pick = (list) => { let t = r(); for (const [k, w] of list) { if ((t -= w) <= 0) return k; } return list[0][0]; };
  let planted = 0;
  for (let tries = 0; tries < cfg.trees * 4 && planted < cfg.trees; tries++) {
    const s = world.freeSpot(7, 4.5, m.placed); if (!s) continue;
    const mix = MIX[areaName(s.x, s.z)];
    if (r() > mix.density) continue;
    m.placed.push(s);
    const kind = pick(mix.kinds);
    const y = world.heightAt(s.x, s.z);
    const t = kinds[kind](s.x, y, s.z);
    world.obstacles.push({ x: s.x, z: s.z, r: t.rad + 0.25, base: y, h: 99 });
    if (kind !== 'maple' && kind !== 'sakura') world.bigTrees.push({ x: s.x, z: s.z, y, h: t.h, rad: t.rad, kind });
    planted++;
  }

  // Bamboo: clumps of 6-14 stalks, thick in the bamboo grove, a few patches elsewhere.
  let clumps = 0;
  for (let tries = 0; tries < cfg.bambooClumps * 6 && clumps < cfg.bambooClumps; tries++) {
    const s = world.freeSpot(9, 3.4, m.placed); if (!s) continue;
    const want = BAMBOO[areaName(s.x, s.z)] ?? 0;
    // Outside the grove bamboo grows in patches (where this noise is high).
    const patch = want >= 1 ? 1 : (Math.sin(s.x * 0.05 + 1.7) * Math.cos(s.z * 0.043 - 0.6) > 0.55 ? 6 : 0.3);
    if (r() > want * patch) continue;
    m.placed.push(s);
    const y0 = world.heightAt(s.x, s.z);
    const n = 6 + Math.floor(r() * 9), spread = 0.7 + r() * 0.7;
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * spread;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d, y = world.heightAt(x, z);
      const h = 9 + r() * 6, rad = 0.05 + r() * 0.04, lean = 0.02 + r() * 0.07;
      dummy.position.set(x, y - 0.1, z);
      dummy.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      const old = r() < 0.2;   // older stalks go yellowish
      culms.add(dummy.matrix, color.setHSL(old ? 0.15 : 0.23 + r() * 0.04, old ? 0.45 : 0.5, old ? 0.45 : 0.3 + r() * 0.1));
      const culmMatrix = dummy.matrix.clone();
      const nSprays = cfg.spraysPerStalk;
      for (let k = 0; k < nSprays; k++) {
        const t = 0.55 + (k / nSprays) * 0.45 + r() * 0.05;
        tmp.set(0, t, 0).applyMatrix4(culmMatrix);
        dummy.position.copy(tmp);
        dummy.rotation.set(0, r() * 6.28, -0.2 - r() * 0.3);
        dummy.rotation.order = 'YZX';
        const sc = 0.9 + r() * 0.5;
        dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        dummy.rotation.order = 'XYZ';
        sprays.add(dummy.matrix, color.setHSL(0.24 + r() * 0.04, 0.5, 0.3 + r() * 0.08));
      }
      if (i === 0) vineSpot(x + 0.6, z + 0.6, y + h * 0.7, s.x, s.z);
    }
    world.obstacles.push({ x: s.x, z: s.z, r: spread + 0.2, base: y0, h: 99 });
    clumps++;
  }

  // Sasa bamboo grass: low clumps you walk through. Thick under the bamboo and cedars.
  const SASA = { wild: 0.6, cedar: 1, bamboo: 1, shrine: 0.5, maple: 0.6, village: 0.2, castle: 0.15 };
  let grass = 0;
  for (let tries = 0; tries < cfg.sasa * 4 && grass < cfg.sasa; tries++) {
    const x = (r() * 2 - 1) * (world.half - 2), z = (r() * 2 - 1) * (world.half - 2);
    if (!m.plantOK(x, z) || Math.hypot(x, z) < 5) continue;
    if (r() > (SASA[areaName(x, z)] ?? 0.5)) continue;
    const y = world.heightAt(x, z);
    for (let k = 0; k < 5; k++) {
      dummy.position.set(x + (r() - 0.5) * 1.6, y, z + (r() - 0.5) * 1.6);
      dummy.rotation.set(0, r() * 6.28, 0);
      const sc = 1.1 + r() * 0.8;
      dummy.scale.set(sc, sc * (0.9 + r() * 0.6), sc); dummy.updateMatrix();
      sasa.add(dummy.matrix, color.setHSL(0.24 + r() * 0.05, 0.5, 0.17 + r() * 0.07));
    }
    grass++;
  }

  const all = { evergreen, cypress, pinePads, mapleLeaves, sakuraLeaves, limbs, culms, sprays, sasa };
  for (const b of Object.values(all)) if (b.matrices.length) b.build(scene);
  world.foliage = all;   // the seasons (step F) recolour these
}
