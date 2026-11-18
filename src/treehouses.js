// Lookout towers (monomi-yagura; the code still calls them "treehouses"): a wooden platform on four posts
// with a railing and a little roof, and a ladder. Stand at the ladder and press jump to climb up. Up there sword and nunchuck samurai can't reach you
// (archers can still shoot up at you), and you can shoot down. Walk off the edge to drop back down.
import * as THREE from 'three';
import { addCutaway } from './world.js';

const HEIGHT = 4;      // platform height above the ground at the trunk
const RADIUS = 2.4;    // how far from the trunk you can stand

export function buildTreehouses(world, scene, count = 7) {
  const wood = addCutaway(new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 }));
  const darkWood = addCutaway(new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 }));
  const shingle = addCutaway(new THREE.MeshStandardMaterial({ color: 0x3e2c1e, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
  world.treehouses = [];
  const H = RADIUS;   // half the width of the square platform

  // Pick clear spots spread round the map, away from the stream, paths, buildings and the start.
  const picks = [];
  const rnd = (() => { let a = 12345; return () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296); })();
  for (let t = 0; t < 4000 && picks.length < count; t++) {
    const x = (rnd() * 2 - 1) * (world.limit - 14), z = (rnd() * 2 - 1) * (world.limit - 14);
    if (Math.hypot(x, z) < 25 || world.streamDist(x, z) < 10 || world.pathDist(x, z) < 5) continue;
    if (world.reserved.some(r => Math.hypot(r.x - x, r.z - z) < r.r + 4)) continue;
    const O = world.outpostSpot;
    if (O && Math.hypot(O.x - x, O.z - z) < (O.wall || 15) + 6) continue;
    if (world.obstaclesNear(x, z, H + 1.4).some(o => Math.hypot(o.x - x, o.z - z) < o.r + H + 0.8)) continue;
    if (picks.some(p => Math.hypot(p.x - x, p.z - z) < 32)) continue;
    picks.push({ x, z });
  }

  for (const t of picks) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: t.x + a * H, z: t.z + b * H }));
    const y = Math.max(...corners.map(c => world.heightAt(c.x, c.z)), world.heightAt(t.x, t.z)) + HEIGHT;
    // Ladder on the side with the clearest ground (one of the four sides).
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const lx = t.x + Math.cos(a) * (H - 0.2), lz = t.z + Math.sin(a) * (H - 0.2);
      const score = Math.min(...world.obstaclesNear(lx, lz, 8).map(o => Math.hypot(o.x - lx, o.z - lz) - o.r), 8);
      if (score > bestScore) { bestScore = score; best = a; }
    }
    const lx = t.x + Math.cos(best) * (H - 0.2), lz = t.z + Math.sin(best) * (H - 0.2);
    const g = new THREE.Group();
    g.position.set(t.x, y, t.z);
    scene.add(g);
    const add = (geo, mat, x, yy, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };

    // Monomi-yagura: a lookout tower. Four posts, cross bracing, a plank floor, a railing and a little roof.
    for (const c of corners) {
      const gy = world.heightAt(c.x, c.z) - 0.2;
      const len = y + 2.4 - gy;
      add(new THREE.BoxGeometry(0.2, len, 0.2), darkWood, c.x - t.x, gy - y + len / 2, c.z - t.z);
      world.obstacles.push({ x: c.x, z: c.z, r: 0.2, base: gy, h: 99 });
    }
    for (let i = 0; i < 4; i++) {   // an X of bracing on each side, under the floor
      const a = corners[i], b = corners[(i + 1) % 4];
      const mx = (a.x + b.x) / 2 - t.x, mz = (a.z + b.z) / 2 - t.z;
      for (const s of [-1, 1]) {
        const brace = add(new THREE.BoxGeometry(0.08, Math.hypot(H * 2, HEIGHT - 0.6), 0.08), wood, mx, -HEIGHT / 2 - 0.2, mz);
        brace.rotation.order = 'YXZ';
        brace.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        brace.rotation.x = s * Math.atan2(H * 2, HEIGHT - 0.6);
      }
    }
    for (let i = -4; i <= 4; i++) add(new THREE.BoxGeometry(H * 2 + 0.2, 0.08, 0.5), i % 2 ? wood : darkWood, 0, -0.04, i * 0.53);
    // Railing all round, except the gap where the ladder comes up.
    const lsx = Math.round(Math.cos(best)), lsz = Math.round(Math.sin(best));
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const len = H * 2;
      for (const yy of [0.5, 0.95]) {
        if (sx === lsx && sz === lsz) {   // two short rails either side of the ladder
          for (const s of [-1, 1]) {
            const rail = add(new THREE.BoxGeometry(sx ? 0.06 : len * 0.32, 0.06, sx ? len * 0.32 : 0.06), wood, sx * H + (sx ? 0 : s * len * 0.34), yy, sz * H + (sz ? 0 : s * len * 0.34));
            void rail;
          }
        } else {
          add(new THREE.BoxGeometry(sx ? 0.06 : len, 0.06, sx ? len : 0.06), wood, sx * H, yy, sz * H);
        }
      }
    }
    // Shingled roof on the posts.
    const roof = add(new THREE.ConeGeometry(H * 1.75, 1.3, 4, 1, true).rotateY(Math.PI / 4), shingle, 0, 3.05, 0);
    void roof;

    // Wooden ladder from the platform edge down to the ground.
    const groundY = world.heightAt(lx, lz);
    const ladderLen = y - groundY;
    const ladder = new THREE.Group();
    ladder.position.set(lx - t.x, 0, lz - t.z);
    ladder.rotation.y = -best;
    g.add(ladder);
    for (const s of [-0.24, 0.24]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, ladderLen, 0.06), wood);
      r.position.set(0.05, -ladderLen / 2, s);
      ladder.add(r);
    }
    for (let k = 0.35; k < ladderLen; k += 0.38) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 5).rotateX(Math.PI / 2), darkWood);
      rung.position.set(0.05, -k, 0);
      ladder.add(rung);
    }

    world.treehouses.push({ x: t.x, z: t.z, y, r: RADIUS, ladder: { x: lx, z: lz, y: groundY },
      out: { x: Math.cos(best), z: Math.sin(best) } });
  }
}
