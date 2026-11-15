// The jungle: ground, trees, plants, rocks, logs and puddles.
import * as THREE from 'three';

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

function addCutaway(material) {
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
function makeFrondGeometry(length, width, droop) {
  const g = new THREE.PlaneGeometry(length, width, 10, 2);
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

function makeLumpyGeometry(radius, detail, amount, rnd) {
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

// Collects positions for many copies of one shape, then makes one InstancedMesh.
class Batch {
  constructor(geometry, material, { shadow = true, receive = true, shade = 1 } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.matrices = [];
    this.colors = [];
    this.shadow = shadow;
    this.receive = receive;
    this.shade = shade; // below 1 = darker colors
  }
  add(matrix, color) {
    this.matrices.push(matrix.clone());
    this.colors.push(color.clone().multiplyScalar(this.shade));
  }
  build(scene) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
    this.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, this.colors[i]);
    });
    mesh.castShadow = this.shadow;
    mesh.receiveShadow = this.receive;
    scene.add(mesh);
    return mesh;
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
    this.rnd = makeRandom(cfg.seed);
    this.build(scene);
  }

  heightAt(x, z) {
    let h = (noise2(x * 0.035 + 11, z * 0.035 - 4) - 0.5) * 4.5;
    h += (noise2(x * 0.11, z * 0.11) - 0.5) * 1.2;
    h += (noise2(x * 0.5, z * 0.5) - 0.5) * 0.15;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    h += smoothstep(this.half - 16, this.half, edge) * 10;
    h *= 1 - smoothstep(8, 0, Math.hypot(x, z)) * 0.6; // flatter clearing at the start
    return h;
  }

  // Push a circle (a ninja) out of trees, rocks and logs.
  resolveCollision(pos, radius, feetY) {
    for (const o of this.obstacles) {
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
      if (placed && placed.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing)) continue;
      return { x, z };
    }
    return null;
  }

  build(scene) {
    const cfg = this.cfg;
    const r = this.rnd;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // --- ground ---
    const seg = 160;
    const ground = new THREE.PlaneGeometry(this.size, this.size, seg, seg);
    ground.rotateX(-Math.PI / 2);
    const gp = ground.attributes.position;
    const colors = new Float32Array(gp.count * 3);
    const mud = new THREE.Color(0x3a2c1f), moss = new THREE.Color(0x2c4a1f), litter = new THREE.Color(0x4f3c22);
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      gp.setY(i, this.heightAt(x, z));
      const m = noise2(x * 0.08 + 50, z * 0.08);
      const l = noise2(x * 0.3, z * 0.3 + 20);
      color.copy(mud).lerp(moss, smoothstep(0.35, 0.65, m)).lerp(litter, smoothstep(0.6, 0.9, l) * 0.6);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }));
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // --- shared materials ---
    const barkMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    const leafMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.55, flatShading: true }));
    const frondMat = addCutaway(new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }));
    const plantMat = new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide });
    const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true });

    const trunkGeo = new THREE.CylinderGeometry(0.65, 1, 1, 9, 4).translate(0, 0.5, 0);
    const rootGeo = new THREE.ConeGeometry(1, 1, 7, 1, true).translate(0, 0.5, 0);
    const vineGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 4).translate(0, -0.5, 0);

    const trunks = new Batch(trunkGeo, barkMat, { shade: 0.6 });
    const roots = new Batch(rootGeo, barkMat, { shade: 0.6 });
    const canopy = new Batch(makeLumpyGeometry(1, 1, 0.35, r), leafMat, { shade: 0.7 });
    const fronds = new Batch(makeFrondGeometry(4.2, 0.9, 0.35), frondMat, { shade: 0.5 });
    const vines = new Batch(vineGeo, frondMat, { shadow: false, shade: 0.6 });
    const placed = [];

    // --- giant rainforest trees ---
    for (let i = 0; i < cfg.giantTrees; i++) {
      const s = this.freeSpot(7, 5, placed); if (!s) continue;
      placed.push(s);
      const y = this.heightAt(s.x, s.z);
      const rad = 0.3 + r() * 0.35, h = 7 + r() * 4;
      dummy.position.set(s.x, y - 0.3, s.z); dummy.rotation.set((r() - .5) * .06, r() * 6.28, (r() - .5) * .06);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      trunks.add(dummy.matrix, color.setHSL(0.07 + r() * 0.03, 0.3, 0.17 + r() * 0.08));
      dummy.scale.set(rad * 2.6, 1.6 + r(), rad * 2.6); dummy.updateMatrix();
      roots.add(dummy.matrix, color.setHSL(0.08, 0.28, 0.16));
      this.obstacles.push({ x: s.x, z: s.z, r: rad + 0.25, base: y, h: 99 });
      const blobs = 4 + Math.floor(r() * 4);
      for (let b = 0; b < blobs; b++) {
        const a = r() * 6.28, d = r() * 2.6;
        const br = 1.8 + r() * 1.6;
        dummy.position.set(s.x + Math.cos(a) * d, y + h - 0.5 + (r() - 0.3) * 2, s.z + Math.sin(a) * d);
        dummy.rotation.set(r() * 3, r() * 3, r() * 3);
        dummy.scale.set(br, br * (0.55 + r() * 0.2), br); dummy.updateMatrix();
        canopy.add(dummy.matrix, color.setHSL(0.26 + r() * 0.08, 0.45 + r() * 0.2, 0.16 + r() * 0.1));
      }
      const vineCount = Math.floor(r() * 5);
      for (let v = 0; v < vineCount; v++) {
        const a = r() * 6.28, d = 1.5 + r() * 2;
        dummy.position.set(s.x + Math.cos(a) * d, y + h - 1.5, s.z + Math.sin(a) * d);
        dummy.rotation.set((r() - .5) * .1, 0, (r() - .5) * .1);
        dummy.scale.set(1, 3 + r() * 6, 1); dummy.updateMatrix();
        vines.add(dummy.matrix, color.setHSL(0.25, 0.4, 0.14));
      }
    }

    // --- palm trees ---
    dummy.rotation.order = 'YZX';
    const top = new THREE.Vector3();
    for (let i = 0; i < cfg.palmTrees; i++) {
      const s = this.freeSpot(6, 3.5, placed); if (!s) continue;
      placed.push(s);
      const y = this.heightAt(s.x, s.z);
      const h = 5 + r() * 3, rad = 0.18 + r() * 0.08;
      dummy.position.set(s.x, y - 0.2, s.z);
      dummy.rotation.set(0, r() * 6.28, (r() - 0.5) * 0.35);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      trunks.add(dummy.matrix, color.setHSL(0.09, 0.25, 0.3 + r() * 0.08));
      top.set(0, 1, 0).applyMatrix4(dummy.matrix);
      this.obstacles.push({ x: s.x, z: s.z, r: rad + 0.25, base: y, h: 99 });
      const n = 8 + Math.floor(r() * 4);
      for (let f = 0; f < n; f++) {
        dummy.position.copy(top);
        dummy.rotation.set(0, (f / n) * 6.28 + r() * 0.4, 0.25 + r() * 0.35);
        const sc = 0.8 + r() * 0.4;
        dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        fronds.add(dummy.matrix, color.setHSL(0.24 + r() * 0.06, 0.5, 0.22 + r() * 0.08));
      }
    }

    // --- broken trees (may fall in Phase 4) ---
    for (let i = 0; i < cfg.brokenTrees; i++) {
      const s = this.freeSpot(10, 5, placed); if (!s) continue;
      placed.push(s);
      const y = this.heightAt(s.x, s.z);
      const rad = 0.3 + r() * 0.2, h = 5 + r() * 3;
      const lean = 0.2 + r() * 0.3, yaw = r() * 6.28;
      dummy.rotation.order = 'YZX';
      dummy.position.set(s.x, y - 0.3, s.z);
      dummy.rotation.set(0, yaw, lean);
      dummy.scale.set(rad, h, rad); dummy.updateMatrix();
      trunks.add(dummy.matrix, color.setHSL(0.08, 0.12, 0.22 + r() * 0.05));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(rad * 2.2, 1.2, rad * 2.2); dummy.updateMatrix();
      roots.add(dummy.matrix, color.setHSL(0.08, 0.15, 0.18));
      this.obstacles.push({ x: s.x, z: s.z, r: rad + 0.25, base: y, h: 99 });
      this.brokenTrees.push({ x: s.x, z: s.z, height: h, lean, yaw, radius: rad });
    }
    dummy.rotation.order = 'XYZ';

    // --- fallen logs (you can jump over these) ---
    const logGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1).rotateZ(Math.PI / 2);
    const logs = new Batch(logGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    for (let i = 0; i < cfg.fallenLogs; i++) {
      const s = this.freeSpot(6, 4, placed); if (!s) continue;
      placed.push(s);
      const len = 5 + r() * 5, rad = 0.35 + r() * 0.25, yaw = r() * 6.28;
      const y = this.heightAt(s.x, s.z);
      dummy.position.set(s.x, y + rad * 0.6, s.z);
      dummy.rotation.set(0, yaw, (r() - 0.5) * 0.1);
      dummy.scale.set(len, rad, rad); dummy.updateMatrix();
      logs.add(dummy.matrix, color.setHSL(0.15 + r() * 0.1, 0.35, 0.18 + r() * 0.05));
      const dx = Math.cos(yaw), dz = -Math.sin(yaw);
      for (let t = -len / 2; t <= len / 2; t += 0.7) {
        const ox = s.x + dx * t, oz = s.z + dz * t;
        this.obstacles.push({ x: ox, z: oz, r: rad + 0.15, base: this.heightAt(ox, oz), h: rad * 1.6 });
      }
    }

    // --- rocks (wet and shiny) ---
    const rocks = new Batch(makeLumpyGeometry(1, 1, 0.45, r), rockMat, { shade: 0.6 });
    for (let i = 0; i < cfg.rocks; i++) {
      const s = this.freeSpot(5, 2, placed); if (!s) continue;
      const sc = 0.4 + r() * r() * 2.2;
      const y = this.heightAt(s.x, s.z);
      dummy.position.set(s.x, y - sc * 0.25, s.z);
      dummy.rotation.set(r() * 3, r() * 3, r() * 3);
      dummy.scale.set(sc, sc * (0.6 + r() * 0.3), sc * (0.8 + r() * 0.4)); dummy.updateMatrix();
      rocks.add(dummy.matrix, color.setHSL(0.2 + r() * 0.1, 0.12, 0.22 + r() * 0.1));
      if (sc > 0.6) this.obstacles.push({ x: s.x, z: s.z, r: sc * 0.85, base: y, h: sc * 0.7 });
    }

    // --- ferns and big-leaf plants (walk through them) ---
    dummy.rotation.order = 'YZX';
    const ferns = new Batch(makeFrondGeometry(1.4, 0.38, 0.45), plantMat, { shadow: false, shade: 0.42 });
    for (let i = 0; i < cfg.ferns; i++) {
      const x = (r() * 2 - 1) * (this.half - 2), z = (r() * 2 - 1) * (this.half - 2);
      const y = this.heightAt(x, z);
      const n = 6 + Math.floor(r() * 4), sc = 0.6 + r() * 0.8;
      const hue = 0.22 + r() * 0.08;
      for (let f = 0; f < n; f++) {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, (f / n) * 6.28 + r() * 0.5, 0.5 + r() * 0.4);
        dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        ferns.add(dummy.matrix, color.setHSL(hue, 0.55, 0.22 + r() * 0.1));
      }
    }
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.5, 0.5, 0.7, 1.3, 0, 1.9);
    leafShape.bezierCurveTo(-0.7, 1.3, -0.5, 0.5, 0, 0);
    const bigLeafGeo = new THREE.ShapeGeometry(leafShape, 8).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);
    const bigLeaves = new Batch(bigLeafGeo, plantMat, { shadow: true, shade: 0.45 });
    for (let i = 0; i < cfg.bigLeafPlants; i++) {
      const x = (r() * 2 - 1) * (this.half - 2), z = (r() * 2 - 1) * (this.half - 2);
      if (Math.hypot(x, z) < 4) continue;
      const y = this.heightAt(x, z);
      const n = 3 + Math.floor(r() * 3), sc = 0.6 + r() * 0.7;
      for (let f = 0; f < n; f++) {
        dummy.position.set(x, y + 0.3 * sc, z);
        dummy.rotation.set(0, r() * 6.28, 0.3 + r() * 0.5);
        dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        bigLeaves.add(dummy.matrix, color.setHSL(0.27 + r() * 0.05, 0.55, 0.2 + r() * 0.08));
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
      if (y > -1.0) continue; // puddles collect in low spots
      dummy.position.set(x, y + 0.04, z);
      dummy.rotation.set(0, r() * 6.28, 0);
      dummy.scale.set(1 + r() * 2, 1, 0.7 + r() * 1.4); dummy.updateMatrix();
      puddles.add(dummy.matrix, color.set(0xffffff));
      made++;
    }

    for (const b of [trunks, roots, canopy, fronds, vines, logs, rocks, ferns, bigLeaves, puddles]) {
      if (b.matrices.length) b.build(scene);
    }

    this.buildMist(scene);
  }

  // Soft low clouds of mist drifting between the trees.
  buildMist(scene) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xc8d4cc, opacity: 0.14, transparent: true, depthWrite: false });
    this.mist = [];
    const r = this.rnd;
    for (let i = 0; i < 45; i++) {
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
    for (const s of this.mist) {
      s.position.x += s.userData.speed * dt;
      if (s.position.x > this.half) s.position.x = -this.half;
    }
  }
}
