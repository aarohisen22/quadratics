// The jungle: ground, trees, plants, rocks, logs and puddles.
import * as THREE from 'three';
import { buildLandmarks } from './landmarks.js';
import { buildOutpost } from './outpost.js';
import { pixelTexture } from './pixeltex.js';
import { Areas } from './areas.js';
import { buildForest, makeTierGeometry } from './flora.js';

// ---------- small helpers ----------

// Seeded random numbers, so the same seed always makes the same jungle.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const top = a + (b - a) * sx, bottom = c + (d - c) * sx;
  return top + (bottom - top) * sz;
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- "see-through canopy" ----------
// From above, tree tops would hide the ninjas. These shared settings make
// leaves and trunks between the camera and a ninja dissolve away.
export const cutaway = {
  uCutTargets: { value: [new THREE.Vector3(0, -9999, 0), new THREE.Vector3(0, -9999, 0)] },
  uCutRadius: { value: 5.5 },
};

export function addCutaway(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCutTargets = cutaway.uCutTargets;
    shader.uniforms.uCutRadius = cutaway.uCutRadius;
    shader.vertexShader = 'varying vec3 vCutWorld;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vec4 cutPos = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cutPos = instanceMatrix * cutPos;
      #endif
      vCutWorld = (modelMatrix * cutPos).xyz;`
    );
    shader.fragmentShader =
      'varying vec3 vCutWorld;\nuniform vec3 uCutTargets[2];\nuniform float uCutRadius;\n' +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        for (int i = 0; i < 2; i++) {
          vec3 p = uCutTargets[i];
          if (p.y < -999.0) continue;
          vec3 ab = p - cameraPosition;
          float t = clamp(dot(vCutWorld - cameraPosition, ab) / dot(ab, ab), 0.0, 1.0);
          float d = length(vCutWorld - (cameraPosition + ab * t));
          if (d < uCutRadius && vCutWorld.y > p.y + 1.4) {
            float fade = d / uCutRadius;
            float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
            if (dither > fade * fade) discard;
          }
        }`
      );
  };
  material.customProgramCacheKey = () => 'cutaway';
  return material;
}

// ---------- shapes ----------

// A long leaf (palm frond / fern leaf) lying along +x that droops at the tip.
export function makeFrondGeometry(length, width, droop, lengthSegments = 10, widthSegments = 2) {
  const g = new THREE.PlaneGeometry(length, width, lengthSegments, widthSegments);
  g.translate(length / 2, 0, 0);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / length;
    const taper = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.85 + 0.15 * (1 - t);
    const z = p.getZ(i) * taper;
    p.setZ(i, z);
    p.setY(i, -droop * t * t * length + Math.abs(z) * 0.35);
  }
  g.computeVertexNormals();
  return g;
}

export function makeLumpyGeometry(radius, detail, amount, rnd) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  // Move each shared corner by the same amount so the shape stays closed.
  const offsets = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 1 + (rnd() - 0.5) * amount);
    v.multiplyScalar(offsets.get(key));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Collects positions for many copies of one shape, then makes InstancedMeshes: one per
// TILE x TILE meter square of the map, so squares that are off screen aren't drawn at all.
export const TILE = 60;
const tileKey = (x, z) => `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
export class Batch {
  constructor(geometry, material, { shadow = true, receive = true, shade = 1 } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.matrices = [];
    this.colors = [];
    this.shadow = shadow;
    this.receive = receive;
    this.shade = shade; // below 1 = darker colors
    this.meshes = [];
    this.refs = [];     // for each copy added: { mesh, index } once built
  }
  add(matrix, color) {
    this.matrices.push(matrix.clone());
    this.colors.push(color.clone().multiplyScalar(this.shade));
    return this.matrices.length - 1;
  }
  build(scene) {
    const groups = new Map();
    this.matrices.forEach((m, i) => {
      const key = tileKey(m.elements[12], m.elements[14]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    for (const list of groups.values()) {
      const mesh = new THREE.InstancedMesh(this.geometry, this.material, list.length);
      list.forEach((i, j) => {
        mesh.setMatrixAt(j, this.matrices[i]);
        mesh.setColorAt(j, this.colors[i]);
        this.refs[i] = { mesh, index: j };
      });
      mesh.castShadow = this.shadow;
      mesh.receiveShadow = this.receive;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      this.meshes.push(mesh);
    }
    return this.meshes;
  }
}

// Spots already taken by trees, rocks and logs, sorted into 10 m squares so "is anything
// too close?" only looks at the squares nearby.
class Placed {
  constructor() { this.cells = new Map(); }
  key(cx, cz) { return cx * 100003 + cz; }
  push(p) {
    const k = this.key(Math.floor(p.x / 10), Math.floor(p.z / 10));
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(p);
  }
  some(fn) { for (const list of this.cells.values()) if (list.some(fn)) return true; return false; }
  tooClose(x, z, d) {
    const cx = Math.floor(x / 10), cz = Math.floor(z / 10), n = Math.ceil(d / 10);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const list = this.cells.get(this.key(cx + i, cz + j));
      if (list && list.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d)) return true;
    }
    return false;
  }
}

// ---------- the world ----------

export class World {
  constructor(scene, cfg) {
    this.cfg = cfg;
    this.size = cfg.size;
    this.half = cfg.size / 2;
    this.limit = this.half - 6;   // how far ninjas may walk from the center
    this.obstacles = [];          // { x, z, r, h } circles you bump into
    this.brokenTrees = [];        // trees that may fall (Phase 4)
    this.canopySpots = [];        // undersides of the big trees' leaves, where vines can hang from
    this.bigTrees = [];           // the giant trees (some get treehouses)
    this.rnd = makeRandom(cfg.seed);
    this.areas = new Areas(cfg.size);   // bamboo grove, cedar forest, village... (areas.js)
    this.k = cfg.size / 120;      // the land was first designed 120 m wide; everything is spread out by this much
    // Shrine hill: the shrine stands on a little hill just north of where the brothers start.
    const S = this.areas.byId.shrine;
    this.templeSpot = { x: S.x - 2, z: S.z - 30 };
    this.templeTop = this.baseHeight(this.templeSpot.x, this.templeSpot.z) + 4;
    this.reserved = [];           // places kept clear of trees for buildings
    this.outpostSpot = cfg.outpost;
    this.outpostY = this.baseHeight(cfg.outpost.x, cfg.outpost.z);
    this.planCastle();
    this.planVillage();
    this.planPaths();
    this.build(scene);
  }

  // ---------- the shape of the land ----------

  // A stream winds across the jungle from west to east. This is its middle line.
  streamZ(x) { const u = x / this.k; return this.k * (16 + 11 * Math.sin(u * 0.05 + 0.4) + 4 * Math.sin(u * 0.13 + 1.3)); }

  // Is this spot inside a hideout (temple ruins, collapsed hut)?
  inHideout(x, z) { return (this.hideouts || []).some(h => Math.hypot(h.x - x, h.z - z) < h.r); }

  // Distance from the middle of the stream.
  streamDist(x, z) {
    const u = x / this.k;
    const slope = 0.55 * Math.cos(u * 0.05 + 0.4) + 0.52 * Math.cos(u * 0.13 + 1.3);
    return Math.abs(z - this.streamZ(x)) / Math.sqrt(1 + slope * slope);
  }

  // The water surface height at this point along the stream.
  waterLevel(x) { return this.baseHeight(x, this.streamZ(x)) - 3.5 + 0.6; }

  // How deep the water is here (0 = dry land).
  waterDepthAt(x, z) {
    if (this.inMoat(x, z)) return Math.max(0, this.castle.moatLevel - this.heightAt(x, z));
    if (this.streamDist(x, z) > 6) return 0;
    return Math.max(0, this.waterLevel(x) - this.heightAt(x, z));
  }
  // Height of the water surface here (stream or castle moat).
  waterSurfaceAt(x, z) { return this.inMoat(x, z) ? this.castle.moatLevel : this.waterLevel(x); }

  // Bumpy jungle floor before the valley and hill are added.
  baseHeight(x, z) {
    let h = (noise2(x * 0.035 + 11, z * 0.035 - 4) - 0.5) * 4.5;
    h += (noise2(x * 0.11, z * 0.11) - 0.5) * 1.2;
    h += (noise2(x * 0.5, z * 0.5) - 0.5) * 0.15;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    h += smoothstep(this.half - 16, this.half, edge) * 10;
    h *= 1 - smoothstep(8, 0, Math.hypot(x, z)) * 0.6; // flatter clearing at the start
    return h;
  }

  // ---------- plans for the castle hill, the village and the paths (made before the land is built) ----------

  // The castle stands on a raised platform with sloping stone walls (ishigaki), ringed by a moat.
  // An earth causeway (dobashi) leads up to the gate on the side facing the shrine.
  planCastle() {
    const A = this.areas.byId.castle;
    if (!A) return;
    const C = { x: A.x, z: A.z, rTop: 22, rWall: 26.5, moatIn: 29.5, moatOut: 34.5, flat: 46 };
    C.ground = this.baseHeight(C.x, C.z);
    C.top = C.ground + 6;
    C.moatLevel = C.ground - 1.1;
    const a = Math.atan2(-C.z, -C.x);          // the gate faces the middle of the map
    C.gateDir = { x: Math.cos(a), z: Math.sin(a) };
    C.gateAngle = a;
    C.rampEnd = C.rTop + 6 / 0.42;             // the causeway slopes down to the ground here
    this.castle = C;
    this.reserved.push({ x: C.x, z: C.z, r: C.moatOut + 3 });
  }
  // How the castle hill changes the land (h is the land before).
  castleHeight(x, z, h) {
    const C = this.castle;
    const dx = x - C.x, dz = z - C.z, d = Math.hypot(dx, dz);
    if (d > C.flat) return h;
    h += (C.ground - h) * (1 - smoothstep(C.flat - 10, C.flat, d));          // levelled ground all round
    const along = dx * C.gateDir.x + dz * C.gateDir.z, side = Math.abs(dx * C.gateDir.z - dz * C.gateDir.x);
    const ramp = along > 0 && side < 3.2;
    if (d < C.rTop) return C.top;
    if (ramp && d < C.rampEnd) return Math.max(h, C.top - Math.max(0, along - C.rTop) * 0.42);
    if (d < C.rWall) return C.top + (C.ground - C.top) * smoothstep(C.rTop, C.rWall, d);   // steep stone wall
    if (d > C.moatIn - 1.5 && d < C.moatOut + 1.5 && !(along > 0 && side < 4)) {
      h -= 2 * (1 - smoothstep(0, 2.5, Math.abs(d - (C.moatIn + C.moatOut) / 2) - 1));   // the moat
    }
    return h;
  }
  inMoat(x, z) {
    const C = this.castle;
    if (!C) return false;
    const dx = x - C.x, dz = z - C.z, d = Math.hypot(dx, dz);
    const along = dx * C.gateDir.x + dz * C.gateDir.z, side = Math.abs(dx * C.gateDir.z - dz * C.gateDir.x);
    return d > C.moatIn - 1.5 && d < C.moatOut + 1.5 && !(along > 0 && side < 4);
  }

  // The village: a red arched bridge over the stream and rice paddies on the far bank.
  planVillage() {
    const V = this.areas.byId.village;
    if (!V) return;
    const bx = V.x, sz = this.streamZ(bx);
    this.village = { x: V.x, z: V.z, bridgeX: bx };
    this.bridges = this.bridges || [];
    this.bridges.push(this.makeBridge(bx, sz - 8.5, bx, sz + 8.5, 1.5, 2.4, 'taiko'));
    // Six paddies in two rows, on the south side of the stream.
    this.paddies = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const px = bx - 22 + i * 13, pz = this.streamZ(px) + 16 + j * 10;
      this.paddies.push({ x: px, z: pz, w: 11.5, d: 8.5, y: this.baseHeight(px, pz) - 0.6 + j * 0.45 });   // stepped slightly
    }
    for (const p of this.paddies) this.reserved.push({ x: p.x, z: p.z, r: 7.5 });
    this.reserved.push({ x: bx, z: sz, r: 10 });
  }
  paddyAt(x, z) { return (this.paddies || []).find(p => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2); }

  // A walkable bridge from (x0, z0) to (x1, z1), `w` meters wide, arching `arch` meters above the ends.
  makeBridge(x0, z0, x1, z1, w, arch, style) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    return { x0, z0, x1, z1, len, w, arch, style, dx: (x1 - x0) / len, dz: (z1 - z0) / len,
      h0: this.terrainAt(x0, z0), h1: this.terrainAt(x1, z1) };
  }
  // Height of a bridge's deck at this spot, or -Infinity if not on a bridge.
  deckAt(x, z) {
    let best = -Infinity;
    for (const b of this.bridges || []) {
      const ox = x - b.x0, oz = z - b.z0;
      const t = (ox * b.dx + oz * b.dz) / b.len;
      if (t < 0 || t > 1) continue;
      if (Math.abs(ox * b.dz - oz * b.dx) > b.w / 2) continue;
      best = Math.max(best, b.h0 + (b.h1 - b.h0) * t + b.arch * Math.sin(Math.PI * t) + 0.1);
    }
    return best;
  }

  // Stone-edged earth paths from shrine hill out to every area. Trees keep off them.
  planPaths() {
    const S = this.areas.byId.shrine;
    this.paths = [];
    this.pathCells = new Map();
    this.bridges = this.bridges || [];
    let flip = 1;
    for (const A of this.areas.list) {
      if (A === S) continue;
      let end = { x: A.x, z: A.z };
      if (A.id === 'castle' && this.castle) {   // to the foot of the causeway
        const C = this.castle;
        end = { x: C.x + C.gateDir.x * (C.rampEnd + 2), z: C.z + C.gateDir.z * (C.rampEnd + 2) };
      }
      const sx = S.x + (end.x - S.x) * 0.06, sz = S.z + (end.z - S.z) * 0.06;
      const len = Math.hypot(end.x - sx, end.z - sz);
      const nx = -(end.z - sz) / len, nz = (end.x - sx) / len;
      const bend = len * 0.12 * (flip = -flip);
      const cx = (sx + end.x) / 2 + nx * bend, cz = (sz + end.z) / 2 + nz * bend;
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, u = 1 - t;
        pts.push({ x: u * u * sx + 2 * u * t * cx + t * t * end.x, z: u * u * sz + 2 * u * t * cz + t * t * end.z });
      }
      const path = { area: A.id, pts };
      this.paths.push(path);
      // Where a path crosses the stream it gets a wooden bridge.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const sa = a.z - this.streamZ(a.x), sb = b.z - this.streamZ(b.x);
        if (sa * sb <= 0) {
          const t = sa / (sa - sb), mx = a.x + (b.x - a.x) * t, mz = a.z + (b.z - a.z) * t;
          const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
          if (Math.abs(mx - (this.village?.bridgeX ?? 1e9)) < 12) continue;
          this.bridges.push(this.makeBridge(mx - dx / l * 9, mz - dz / l * 9, mx + dx / l * 9, mz + dz / l * 9, 2.2, 1.2, 'plank'));
          path.bridge = this.bridges[this.bridges.length - 1];
        }
      }
      // Remember how far every square meter near the path is from it.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const x0 = Math.floor(Math.min(a.x, b.x) - 5), x1 = Math.ceil(Math.max(a.x, b.x) + 5);
        const z0 = Math.floor(Math.min(a.z, b.z) - 5), z1 = Math.ceil(Math.max(a.z, b.z) + 5);
        const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
          const t = Math.max(0, Math.min(1, ((x + 0.5 - a.x) * dx + (z + 0.5 - a.z) * dz) / l2));
          const d = Math.hypot(x + 0.5 - a.x - dx * t, z + 0.5 - a.z - dz * t);
          if (d > 5) continue;
          const key = x * 100003 + z, old = this.pathCells.get(key);
          if (old === undefined || d < old) this.pathCells.set(key, d);
        }
      }
    }
  }
  // Distance to the nearest path (up to 5 m; further away = Infinity).
  pathDist(x, z) { return this.pathCells?.get(Math.floor(x) * 100003 + Math.floor(z)) ?? Infinity; }

  // Where you walk: the land, or a bridge deck if you're on one.
  heightAt(x, z) {
    const h = this.terrainAt(x, z);
    return this.bridges?.length ? Math.max(h, this.deckAt(x, z)) : h;
  }

  // The height of the ground as it's DRAWN: the ground tiles are triangles every 0.75 m, so between
  // their corners the drawn ground can sit a little below (or above) terrainAt. Plants, rocks and
  // tree roots use this so they sit on the ground you see instead of floating. (No bridge decks.)
  groundY(x, z) {
    const s = TILE / Math.round(TILE * 4 / 3);
    const gx = (x + this.half) / s, gz = (z + this.half) / s;
    const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
    const X0 = -this.half + ix * s, Z0 = -this.half + iz * s, X1 = X0 + s, Z1 = Z0 + s;
    // Each cell is split along the diagonal from (x0, z1) to (x1, z0), like THREE.PlaneGeometry.
    const hb = this.terrainAt(X0, Z1), hd = this.terrainAt(X1, Z0);
    if (u + v <= 1) {
      const ha = this.terrainAt(X0, Z0);
      return ha + u * (hd - ha) + v * (hb - ha);
    }
    const hc = this.terrainAt(X1, Z1);
    return hc + (1 - u) * (hb - hc) + (1 - v) * (hd - hc);
  }

  // The shape of the land itself.
  terrainAt(x, z) {
    let h = this.baseHeight(x, z);
    // The stream valley: a wide gentle dip with a deeper stream bed in the middle.
    const d = this.streamDist(x, z);
    if (d < 16) h -= 2.2 * (1 - smoothstep(4, 16, d)) + 1.3 * (1 - smoothstep(2.2, 4.8, d));
    // A hill with a flat top where the old temple stands.
    const T = this.templeSpot;
    const dt = Math.hypot(x - T.x, z - T.z);
    if (dt < 22) {
      h += 4 * (1 - smoothstep(9, 22, dt));
      h += (this.templeTop - h) * (1 - smoothstep(9, 11.5, dt));   // level the top
    }
    // The samurai camp sits on a levelled clearing.
    const O = this.outpostSpot;
    if (O) {
      const d = Math.hypot(x - O.x, z - O.z);
      const w = O.wall || 15;
      if (d < w + 7) h += (this.outpostY - h) * (1 - smoothstep(w + 2, w + 7, d));
    }
    // Rice paddies: flat, a little below their low earth banks.
    for (const p of this.paddies || []) {
      const ex = Math.abs(x - p.x) - p.w / 2, ez = Math.abs(z - p.z) - p.d / 2;
      const e = Math.max(ex, ez);
      if (e < 3) h += (p.y + (e < 0 ? -0.15 : 0.05) - h) * (1 - smoothstep(0.6, 3, e));
    }
    if (this.castle) h = this.castleHeight(x, z, h);
    return h;
  }

  // ---------- obstacle grid ----------
  // The map has thousands of trees, rocks and logs. Instead of checking every one, they're sorted
  // into 8 m squares and only the squares near a spot are checked. The grid rebuilds itself
  // whenever obstacles are added or removed (call obstaclesChanged() after changing the list).
  obstaclesChanged() { this._grid = null; }
  obstacleGrid() {
    if (this._grid && this._gridLen === this.obstacles.length) return this._grid;
    const C = 8, g = new Map();
    for (const o of this.obstacles) {
      for (let cx = Math.floor((o.x - o.r) / C); cx <= Math.floor((o.x + o.r) / C); cx++) {
        for (let cz = Math.floor((o.z - o.r) / C); cz <= Math.floor((o.z + o.r) / C); cz++) {
          const key = cx * 100003 + cz;
          let list = g.get(key);
          if (!list) g.set(key, list = []);
          list.push(o);
        }
      }
    }
    this._grid = g;
    this._gridLen = this.obstacles.length;
    return g;
  }
  // Obstacles that might touch the box from (x0, z0) to (x1, z1). Returns a NEW array each time.
  obstaclesIn(x0, z0, x1, z1) {
    const C = 8, g = this.obstacleGrid(), out = [];
    const stamp = this._stamp = (this._stamp || 0) + 1;
    for (let cx = Math.floor(Math.min(x0, x1) / C); cx <= Math.floor(Math.max(x0, x1) / C); cx++) {
      for (let cz = Math.floor(Math.min(z0, z1) / C); cz <= Math.floor(Math.max(z0, z1) / C); cz++) {
        const list = g.get(cx * 100003 + cz);
        if (!list) continue;
        for (const o of list) if (o._stamp !== stamp) { o._stamp = stamp; out.push(o); }
      }
    }
    return out;
  }
  // Obstacles near the line from (x0, z0) to (x1, z1), up to `pad` meters to its sides.
  obstaclesAlong(x0, z0, x1, z1, pad) {
    return this.obstaclesIn(Math.min(x0, x1) - pad, Math.min(z0, z1) - pad, Math.max(x0, x1) + pad, Math.max(z0, z1) + pad);
  }
  obstaclesNear(x, z, r) { return this.obstaclesIn(x - r, z - r, x + r, z + r); }
  // Is anything solid within `pad` meters of this spot?
  blocked(x, z, pad) { return this.obstaclesNear(x, z, pad).some(o => Math.hypot(o.x - x, o.z - z) < o.r + pad); }

  // Push a circle (a ninja) out of trees, rocks and logs.
  resolveCollision(pos, radius, feetY) {
    for (const o of this.obstaclesNear(pos.x, pos.z, radius)) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const min = o.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      if (feetY > o.base + o.h) continue; // jumped over it
      const d = Math.sqrt(d2) || 0.0001;
      pos.x = o.x + (dx / d) * min;
      pos.z = o.z + (dz / d) * min;
    }
    pos.x = Math.max(-this.limit, Math.min(this.limit, pos.x));
    pos.z = Math.max(-this.limit, Math.min(this.limit, pos.z));
  }

  // Random spot that is not too close to the start or to other things.
  freeSpot(minDistFromCenter, spacing, placed) {
    const r = this.rnd;
    for (let tries = 0; tries < 60; tries++) {
      const x = (r() * 2 - 1) * (this.half - 2);
      const z = (r() * 2 - 1) * (this.half - 2);
      if (Math.hypot(x, z) < minDistFromCenter) continue;
      if (placed && (placed.tooClose ? placed.tooClose(x, z, spacing) : placed.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing))) continue;
      if (this.streamDist(x, z) < 6) continue;                                   // not in the stream
      if (this.reserved.some(a => Math.hypot(a.x - x, a.z - z) < a.r)) continue; // not inside a ruin
      if (this.pathDist(x, z) < 3.2) continue;                                  // not on a path
      return { x, z };
    }
    return null;
  }

  build(scene) {
    const cfg = this.cfg;
    const r = this.rnd;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // --- ground: TILE x TILE meter pieces, so pieces off screen aren't drawn ---
    const mud = new THREE.Color(0x3a2c1f), moss = new THREE.Color(0x2c4a1f), litter = new THREE.Color(0x4f3c22);
    const needles = new THREE.Color(0x3d2617), bambooLitter = new THREE.Color(0x6f5d3b), redLeaves = new THREE.Color(0x6a2a16);
    const pathDirt = new THREE.Color(0x6b5638), paddyMud = new THREE.Color(0x3a3020);
    const grass = new THREE.Color(0x4a5a28), gravel = new THREE.Color(0x7d786c), shrineMoss = new THREE.Color(0x35552a);
    const wetMud = new THREE.Color(0x261f16), pebbles = new THREE.Color(0x4a4639), stone = new THREE.Color(0x6d6b60), trampled = new THREE.Color(0x4a3a28);
    const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
    const tiles = Math.ceil(this.size / TILE), seg = Math.round(TILE * 4 / 3);   // same ground detail per meter at any size
    const n = new THREE.Vector3();
    this.groundTiles = [];
    for (let tx = 0; tx < tiles; tx++) for (let tz = 0; tz < tiles; tz++) {
      const x0 = -this.half + tx * TILE, z0 = -this.half + tz * TILE;
      const w = Math.min(TILE, this.half - x0), d = Math.min(TILE, this.half - z0);
      const ground = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(seg * w / TILE)), Math.max(1, Math.round(seg * d / TILE)));
      ground.rotateX(-Math.PI / 2);
      ground.translate(x0 + w / 2, 0, z0 + d / 2);
      const gp = ground.attributes.position, gn = ground.attributes.normal;
      const colors = new Float32Array(gp.count * 3);
      for (let i = 0; i < gp.count; i++) {
        const x = gp.getX(i), z = gp.getZ(i);
        gp.setY(i, this.terrainAt(x, z));
        // Normals from the height of the land around this point, so the tiles' edges match.
        n.set(this.terrainAt(x - 0.4, z) - this.terrainAt(x + 0.4, z), 0.8, this.terrainAt(x, z - 0.4) - this.terrainAt(x, z + 0.4)).normalize();
        gn.setXYZ(i, n.x, n.y, n.z);
        const m = noise2(x * 0.08 + 50, z * 0.08);
        const l = noise2(x * 0.3, z * 0.3 + 20);
        color.copy(mud).lerp(moss, smoothstep(0.35, 0.65, m)).lerp(litter, smoothstep(0.6, 0.9, l) * 0.6);
        // Each area has its own forest floor.
        const A = this.areas;
        color.lerp(needles, A.weight('cedar', x, z) * (0.75 - smoothstep(0.55, 0.8, m) * 0.45));          // cedar needles, moss in between
        color.lerp(bambooLitter, A.weight('bamboo', x, z) * (0.55 + l * 0.3));                         // pale bamboo leaves
        color.lerp(redLeaves, A.weight('maple', x, z) * smoothstep(0.35, 0.7, l) * 0.7);                // fallen maple leaves
        color.lerp(grass, A.weight('village', x, z) * 0.6);                                              // fields round the village
        color.lerp(gravel, A.weight('castle', x, z) * smoothstep(0.3, 0.6, m) * 0.6);                   // gravel up by the castle
        color.lerp(shrineMoss, A.weight('shrine', x, z) * smoothstep(0.4, 0.7, m) * 0.6);               // soft moss on shrine hill
        const pd = this.pathDist(x, z);
        if (pd < 2.6) color.lerp(pathDirt, (1 - smoothstep(1.3, 2.6, pd)) * 0.85);                       // packed-earth paths
        const pad = this.paddyAt(x, z);
        if (pad) color.lerp(paddyMud, 0.9);
        if (this.castle) {
          const cd = Math.hypot(x - this.castle.x, z - this.castle.z);
          if (cd < this.castle.rTop) color.lerp(gravel, 0.8);                                             // castle courtyard gravel
        }
        const sd = this.streamDist(x, z);
        if (sd < 7) color.lerp(sd < 4.5 ? pebbles : wetMud, (1 - smoothstep(3, 7, sd)) * 0.85);   // wet banks, pebbly bed
        const td = Math.hypot(x - this.templeSpot.x, z - this.templeSpot.z);
        if (td < 11) color.lerp(stone, (1 - smoothstep(8, 11, td)) * 0.9);                       // old stone floor
        const od = Math.hypot(x - this.outpostSpot.x, z - this.outpostSpot.z);
        if (od < this.outpostSpot.wall + 3) color.lerp(trampled, (1 - smoothstep(this.outpostSpot.wall - 2, this.outpostSpot.wall + 3, od)) * 0.8);                  // trampled earth in the camp
        colors.set([color.r, color.g, color.b], i * 3);
      }
      ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      ground.computeBoundingSphere();
      const groundMesh = new THREE.Mesh(ground, groundMat);
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);
      this.groundTiles.push(groundMesh);
    }

    this.buildWater(scene);
    buildLandmarks(this, scene);   // shrine, pagoda, village, castle... (they reserve their space before the trees)
    buildOutpost(this, scene, cfg.outpost);

    // --- shared materials ---
    const barkMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    const leafMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.55, flatShading: true }));
    const frondMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }));
    const plantMat = new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide });
    const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true });

    const trunkGeo = new THREE.CylinderGeometry(0.65, 1, 1, 9, 4).translate(0, 0.5, 0);
    const rootGeo = new THREE.ConeGeometry(1, 1, 7, 1, true).translate(0, 0.5, 0);

    const trunks = new Batch(trunkGeo, barkMat, { shade: 0.6 });
    const roots = new Batch(rootGeo, barkMat, { shade: 0.6 });
    const deadCrowns = new Batch(makeTierGeometry(r), leafMat, { shade: 0.8 });
    const placed = new Placed();
    const plantOK = (x, z) => this.streamDist(x, z) > 3.8 && this.pathDist(x, z) > 1.6 && !this.reserved.some(a => Math.hypot(a.x - x, a.z - z) < a.r * 0.6);

    // --- the Japanese forest: cedars, cypress, red pines, maples, cherries, bamboo, bamboo grass (flora.js) ---
    buildForest(this, scene, cfg, { barkMat, leafMat, frondMat, plantMat, trunkGeo, trunks, roots, placed, plantOK });

    // --- dead cedars, half snapped in a storm (they can fall on you) ---
    for (let i = 0; i < cfg.brokenTrees; i++) {
      const s = this.freeSpot(10, 5, placed); if (!s) continue;
      placed.push(s);
      const y = this.groundY(s.x, s.z);
      const rad = 0.3 + r() * 0.2, h = 5 + r() * 3;
      const lean = 0.2 + r() * 0.3, yaw = r() * 6.28;
      dummy.rotation.order = 'YZX';
      dummy.position.set(s.x, y - 0.3, s.z);
      dummy.rotation.set(0, yaw, lean);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      const index = trunks.matrices.length;   // remember which trunk, so it can fall later
      trunks.add(dummy.matrix, color.setHSL(0.07, 0.08, 0.3 + r() * 0.06));   // grey, dead wood
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(rad * 2.2, 1.2, rad * 2.2); dummy.updateMatrix();
      roots.add(dummy.matrix, color.setHSL(0.08, 0.15, 0.18));
      const obstacle = { x: s.x, z: s.z, r: rad + 0.25, base: y, h: 99 };
      this.obstacles.push(obstacle);
      // A crown of dead rust-brown needles, so you can see from above which tree it is.
      // Stored relative to the trunk top so it can fall together with the trunk.
      const crown = [];
      const tiers = 4;   // thin layers of dead needles, like a cedar that died standing
      for (let b = 0; b < tiers; b++) {
        const R = 1.5 - b * 0.3;
        dummy.rotation.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2);
        dummy.position.set((r() - 0.5) * 0.3, h * 0.45 + b * (h * 0.55 / tiers), (r() - 0.5) * 0.3);
        dummy.scale.set(R, 2.1, R); dummy.updateMatrix();
        crown.push({ local: dummy.matrix.clone(), index: deadCrowns.matrices.length });
        deadCrowns.add(dummy.matrix, color.setHSL(0.06 + r() * 0.03, 0.5, 0.25 + r() * 0.06));
      }
      dummy.rotation.order = 'YZX';
      const tree = { x: s.x, z: s.z, y, height: h, lean, yaw, radius: rad, index, obstacle, crown };
      obstacle.tree = tree;
      this.brokenTrees.push(tree);
    }
    dummy.rotation.order = 'XYZ';

    // --- fallen logs (you can jump over these) ---
    const logGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1).rotateZ(Math.PI / 2);
    const logs = new Batch(logGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    for (let i = 0; i < cfg.fallenLogs; i++) {
      const s = this.freeSpot(6, 4, placed); if (!s) continue;
      placed.push(s);
      const len = 5 + r() * 5, rad = 0.35 + r() * 0.25, yaw = r() * 6.28;
      const y = this.groundY(s.x, s.z);
      dummy.position.set(s.x, y + rad * 0.6, s.z);
      dummy.rotation.set(0, yaw, (r() - 0.5) * 0.1);
      dummy.scale.set(len, rad, rad); dummy.updateMatrix();
      logs.add(dummy.matrix, color.setHSL(0.17 + r() * 0.1, 0.38, 0.17 + r() * 0.05));   // mossy
      const dx = Math.cos(yaw), dz = -Math.sin(yaw);
      for (let t = -len / 2; t <= len / 2; t += 0.7) {
        const ox = s.x + dx * t, oz = s.z + dz * t;
        this.obstacles.push({ x: ox, z: oz, r: rad + 0.15, base: this.groundY(ox, oz), h: rad * 1.6 });
      }
    }

    // --- rocks (wet and shiny) ---
    const rocks = new Batch(makeLumpyGeometry(1, 1, 0.45, r), rockMat, { shade: 0.6 });
    const mossCaps = new Batch(makeLumpyGeometry(1, 1, 0.3, r), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), { shade: 0.9 });
    for (let i = 0; i < cfg.rocks; i++) {
      const s = this.freeSpot(5, 2, placed); if (!s) continue;
      const sc = 0.4 + r() * r() * 2.2;
      const y = this.groundY(s.x, s.z);
      dummy.position.set(s.x, y - sc * 0.25, s.z);
      dummy.rotation.set(r() * 3, r() * 3, r() * 3);
      dummy.scale.set(sc, sc * (0.6 + r() * 0.3), sc * (0.8 + r() * 0.4)); dummy.updateMatrix();
      rocks.add(dummy.matrix, color.setHSL(0.2 + r() * 0.1, 0.12, 0.22 + r() * 0.1));
      if (sc > 0.5 && r() < 0.7) {   // a cushion of moss on top, like the old forests of Yakushima
        dummy.position.y = y + sc * 0.22;
        dummy.rotation.set(0, r() * 6, 0);
        dummy.scale.set(sc * 0.85, sc * 0.32, sc * 0.8); dummy.updateMatrix();
        mossCaps.add(dummy.matrix, color.setHSL(0.24 + r() * 0.04, 0.5, 0.17 + r() * 0.05));
      }
      if (sc > 0.6) this.obstacles.push({ x: s.x, z: s.z, r: sc * 0.85, base: y, h: sc * 0.7 });
    }

    // --- ferns (walk through them) ---
    dummy.rotation.order = 'YZX';
    const ferns = new Batch(makeFrondGeometry(1.4, 0.38, 0.45), plantMat, { shadow: false, shade: 0.42 });
    for (let i = 0; i < cfg.ferns; i++) {
      const x = (r() * 2 - 1) * (this.half - 2), z = (r() * 2 - 1) * (this.half - 2);
      if (!plantOK(x, z)) continue;
      const y = this.groundY(x, z);
      const n = 6 + Math.floor(r() * 4), sc = 0.6 + r() * 0.8;
      const hue = 0.22 + r() * 0.08;
      for (let f = 0; f < n; f++) {
        dummy.position.set(x, y - 0.05, z);
        dummy.rotation.set(0, (f / n) * 6.28 + r() * 0.5, 0.5 + r() * 0.4);
        dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        ferns.add(dummy.matrix, color.setHSL(hue, 0.55, 0.22 + r() * 0.1));
      }
    }
    dummy.rotation.order = 'XYZ';

    // --- puddles ---
    const puddleGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
    const puddleMat = new THREE.MeshStandardMaterial({
      roughness: 0.05, metalness: 0.3, color: 0x2a332d,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const puddles = new Batch(puddleGeo, puddleMat, { shadow: false });
    let made = 0;
    for (let tries = 0; tries < 2000 && made < cfg.puddles; tries++) {
      const x = (r() * 2 - 1) * (this.half - 10), z = (r() * 2 - 1) * (this.half - 10);
      const y = this.heightAt(x, z);
      if (y > -1.0 || this.streamDist(x, z) < 9 || !plantOK(x, z)) continue; // puddles collect in low spots
      dummy.position.set(x, y + 0.04, z);
      dummy.rotation.set(0, r() * 6.28, 0);
      dummy.scale.set(1 + r() * 2, 1, 0.7 + r() * 1.4); dummy.updateMatrix();
      puddles.add(dummy.matrix, color.set(0xffffff));
      made++;
    }

    for (const b of [trunks, roots, logs, rocks, mossCaps, ferns, puddles, deadCrowns]) {
      if (b.matrices.length) b.build(scene);
    }
    // Falling trees move their trunk and crown copies: point each tree at the mesh + slot they ended up in.
    for (const t of this.brokenTrees) {
      t.trunkRef = trunks.refs[t.index];
      for (const c of t.crown) c.ref = deadCrowns.refs[c.index];
    }

    this.buildMist(scene);
  }

  // The stream: a ribbon of water following the valley, with ripples drifting downstream.
  buildWater(scene) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 64);
    g.filter = 'blur(2px)';
    for (let i = 0; i < 90; i++) {   // soft light streaks of flowing water
      g.strokeStyle = `rgba(150,175,170,${0.25 + Math.random() * 0.4})`;
      g.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * 256, y = Math.random() * 64, len = 20 + Math.random() * 60;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + (Math.random() - 0.5) * 6, x + len, y); g.stroke();
    }
    g.filter = 'none';
    this.waterTex = new THREE.CanvasTexture(c);
    this.waterTex.wrapS = this.waterTex.wrapT = THREE.RepeatWrapping;
    this.waterTex.colorSpace = THREE.SRGBColorSpace;

    const pos = [], uv = [], idx = [];
    const width = 5.6, step = 1;
    let row = 0;
    for (let x = -this.half; x <= this.half; x += step, row++) {
      const z = this.streamZ(x), y = this.waterLevel(x);
      const u = x / this.k;
      const slope = 0.55 * Math.cos(u * 0.05 + 0.4) + 0.52 * Math.cos(u * 0.13 + 1.3);
      const n = Math.sqrt(1 + slope * slope);
      const nx = -slope / n, nz = 1 / n;   // sideways across the stream
      pos.push(x - nx * width, y, z - nz * width, x + nx * width, y, z + nz * width);
      uv.push(row * 0.12, 0, row * 0.12, 1);
      if (row > 0) { const a = (row - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x3d5e58, map: this.waterTex, roughness: 0.08, metalness: 0.25,
      transparent: true, opacity: 0.86, side: THREE.DoubleSide,
    }));
    this.water.receiveShadow = true;
    scene.add(this.water);

    // Stepping stones to cross without getting your feet wet.
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5d5a50, roughness: 0.35, flatShading: true });
    const stoneGeo = makeLumpyGeometry(1, 1, 0.3, this.rnd);
    for (const cx of [-34, -6, 22, 44, -70, 70].map(v => v * this.size / 180).filter(v => Math.abs(v) < this.half - 8)) {
      for (let k = -2; k <= 2; k++) {
        const z = this.streamZ(cx) + k * 1.4 + (this.rnd() - 0.5) * 0.4;
        const x = cx + (this.rnd() - 0.5) * 0.6;
        const m = new THREE.Mesh(stoneGeo, stoneMat);
        m.position.set(x, this.waterLevel(cx) - 0.05, z);
        m.scale.set(0.55, 0.28, 0.5);
        m.rotation.y = this.rnd() * 3;
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
      }
    }
  }

  // Soft low clouds of mist drifting between the trees.
  buildMist(scene) {
    const tex = pixelTexture(128, 128, (u, v) => [1, 1, 1, 0.9 * Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2)]);
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xc8d4cc, opacity: 0.14, transparent: true, depthWrite: false });
    this.mist = [];
    const r = this.rnd;
    const count = Math.round(45 * (this.size / 180) ** 2);   // same amount of mist per square meter at any size
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat);
      const x = (r() * 2 - 1) * this.half, z = (r() * 2 - 1) * this.half;
      s.position.set(x, this.heightAt(x, z) + 1 + r() * 2, z);
      s.scale.setScalar(10 + r() * 10);
      s.userData.speed = 0.2 + r() * 0.4;
      scene.add(s);
      this.mist.push(s);
    }
  }

  update(dt) {
    this.outpost?.update(dt);
    for (const sp of this.spinners || []) sp.obj.rotation.z += sp.speed * dt;   // the watermill wheel
    if (this.waterTex) this.waterTex.offset.x -= dt * 0.25;   // the stream flows
    for (const s of this.mist) {
      s.position.x += s.userData.speed * dt;
      if (s.position.x > this.half) s.position.x = -this.half;
    }
  }
}
