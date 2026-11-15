// Treehouses: a wooden platform with a railing high up a few of the giant trees, and a rope ladder.
// Stand at the ladder and press jump to climb up. Up there sword and nunchuck samurai can't reach you
// (archers can still shoot up at you), and you can shoot down. Walk off the edge to drop back down.
import * as THREE from 'three';
import { addCutaway } from './world.js';

const HEIGHT = 4;      // platform height above the ground at the trunk
const RADIUS = 2.4;    // how far from the trunk you can stand

export function buildTreehouses(world, scene, count = 5) {
  const wood = addCutaway(new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 }));
  const darkWood = addCutaway(new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 }));
  const rope = addCutaway(new THREE.MeshStandardMaterial({ color: 0xb59a68, roughness: 0.9 }));
  world.treehouses = [];

  // Pick big trees spread around the jungle, away from the stream, landmarks and the middle.
  const picks = [];
  const trees = world.bigTrees.filter(t =>
    t.h >= HEIGHT + 3 && Math.hypot(t.x, t.z) > 10 && Math.hypot(t.x, t.z) < world.limit - 8 &&
    world.streamDist(t.x, t.z) > 9 && !world.reserved.some(r => Math.hypot(r.x - t.x, r.z - t.z) < r.r + 6));
  trees.sort((a, b) => (a.x * 7.13 + a.z * 3.71) % 1 - (b.x * 7.13 + b.z * 3.71) % 1);   // fixed shuffle
  for (const t of trees) {
    if (picks.length >= count) break;
    if (picks.some(p => Math.hypot(p.x - t.x, p.z - t.z) < 22)) continue;
    picks.push(t);
  }

  for (const t of picks) {
    const y = t.y + HEIGHT;
    // Ladder on the side with the clearest ground.
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const lx = t.x + Math.cos(a) * (RADIUS - 0.2), lz = t.z + Math.sin(a) * (RADIUS - 0.2);
      const score = Math.min(...world.obstacles.filter(o => o.h < 50 || Math.hypot(o.x - t.x, o.z - t.z) > 0.1)
        .map(o => Math.hypot(o.x - lx, o.z - lz) - o.r));
      if (score > bestScore) { bestScore = score; best = a; }
    }
    const lx = t.x + Math.cos(best) * (RADIUS - 0.2), lz = t.z + Math.sin(best) * (RADIUS - 0.2);
    const g = new THREE.Group();
    g.position.set(t.x, y, t.z);
    scene.add(g);

    // Platform of planks with a support beam under it.
    for (let i = -4; i <= 4; i++) {
      const len = 2 * Math.sqrt(Math.max(0, RADIUS * RADIUS - (i * 0.55) ** 2)) + 0.3;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.5), i % 2 ? wood : darkWood);
      plank.position.set(0, -0.04, i * 0.55);
      plank.castShadow = plank.receiveShadow = true;
      g.add(plank);
    }
    for (const a of [0, Math.PI / 2]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(RADIUS * 2.2, 0.16, 0.16), darkWood);
      beam.position.y = -0.16;
      beam.rotation.y = a;
      g.add(beam);
    }
    // Railing posts all round, except the gap at the ladder.
    const posts = 14;
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const gap = Math.abs(Math.atan2(Math.sin(a - best), Math.cos(a - best)));
      if (gap < 0.35) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), darkWood);
      post.position.set(Math.cos(a) * (RADIUS + 0.1), 0.45, Math.sin(a) * (RADIUS + 0.1));
      g.add(post);
      const a2 = ((i + 1) / posts) * Math.PI * 2;
      const gap2 = Math.abs(Math.atan2(Math.sin(a2 - best), Math.cos(a2 - best)));
      if (gap2 < 0.35) continue;
      const mid = (a + a2) / 2, len = 2 * (RADIUS + 0.1) * Math.sin(Math.PI / posts);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), wood);
      rail.position.set(Math.cos(mid) * (RADIUS + 0.1) * Math.cos(Math.PI / posts), 0.88, Math.sin(mid) * (RADIUS + 0.1) * Math.cos(Math.PI / posts));
      rail.rotation.y = -mid + Math.PI / 2;
      g.add(rail);
    }
    // Rope ladder from the platform edge down to the ground.
    const groundY = world.heightAt(lx, lz);
    const ladderLen = y - groundY;
    const ladder = new THREE.Group();
    ladder.position.set(lx - t.x, 0, lz - t.z);
    ladder.rotation.y = -best;
    g.add(ladder);
    for (const s of [-0.22, 0.22]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ladderLen, 5), rope);
      r.position.set(0.05, -ladderLen / 2, s);
      ladder.add(r);
    }
    for (let k = 0.35; k < ladderLen; k += 0.38) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 5).rotateX(Math.PI / 2), darkWood);
      rung.position.set(0.05, -k, 0);
      ladder.add(rung);
    }

    world.treehouses.push({ x: t.x, z: t.z, y, r: RADIUS, ladder: { x: lx, z: lz, y: groundY },
      out: { x: Math.cos(best), z: Math.sin(best) } });
  }
}
