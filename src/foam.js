// White foam where the stream breaks around anyone wading through it.
// Fresh patches form a ring around the legs, then drift downstream with the current
// and fade, leaving a foamy trail. Walking through the water also throws up splashes.
import * as THREE from 'three';

const FLOW_SPEED = 1.1;   // m/s, matches the stream texture drifting toward +x

function foamTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  // Lots of little bubbles, packed thicker toward a ring, thinning out at the edge.
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.min(1, Math.abs(0.55 + (Math.random() - 0.5) * 0.7 * Math.random() * 2)) * 54;
    const x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = 1.5 + Math.random() * 4.5;
    const alpha = 0.35 + Math.random() * 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Foam {
  constructor(scene, world, effects) {
    this.world = world;
    this.effects = effects;
    const tex = foamTexture();
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.patches = [];
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: tex, color: 0xeef4f2, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.renderOrder = 3;
      m.visible = false;
      m.frustumCulled = false;
      m.userData = { age: 0, life: 0, size: 1, vx: 0, vz: 0 };
      scene.add(m);
      this.patches.push(m);
    }
    this.next = 0;
    this.track = new Map();   // per wader: last position and spawn timer
  }

  // Which way the water flows at this x (along the stream, toward +x).
  flowAt(x) {
    const slope = 0.55 * Math.cos(x * 0.05 + 0.4) + 0.52 * Math.cos(x * 0.13 + 1.3);
    const n = Math.sqrt(1 + slope * slope);
    return { x: 1 / n, z: slope / n };
  }

  spawn(x, z, y, size, life, vx, vz) {
    const m = this.patches[this.next];
    this.next = (this.next + 1) % this.patches.length;
    m.position.set(x, y, z);
    m.rotation.y = Math.random() * Math.PI * 2;
    Object.assign(m.userData, { age: 0, life, size, vx, vz });
    m.scale.setScalar(size * 0.6);
    m.visible = true;
  }

  // actors: anything with pos, radius and alive (ninjas, samurai, the boss).
  update(dt, actors) {
    const seen = new Set();
    for (const a of actors) {
      if (!a || !a.alive || !a.pos) continue;
      const depth = this.world.waterDepthAt(a.pos.x, a.pos.z);
      let t = this.track.get(a);
      if (!t) { t = { x: a.pos.x, z: a.pos.z, timer: 0, splash: 0 }; this.track.set(a, t); }
      seen.add(a);
      const speed = dt > 0 ? Math.hypot(a.pos.x - t.x, a.pos.z - t.z) / dt : 0;
      t.x = a.pos.x; t.z = a.pos.z;
      if (depth < 0.12) continue;

      const y = this.world.waterLevel(a.pos.x) + 0.03;
      const flow = this.flowAt(a.pos.x);
      const r = (a.radius || 0.4) + 0.15;
      // Foam rings: faster when moving, a gentle trickle when standing still.
      t.timer -= dt;
      if (t.timer <= 0) {
        t.timer = speed > 0.5 ? 0.07 : 0.16;
        // The water piles up on the upstream side of the legs and peels off around them.
        const off = (Math.random() - 0.3) * r;
        const side = (Math.random() - 0.5) * r * 1.6;
        this.spawn(a.pos.x - flow.x * off - flow.z * side, a.pos.z - flow.z * off + flow.x * side, y,
          r * (1.8 + Math.random() * 0.8), 1.6 + Math.random() * 0.8,
          flow.x * FLOW_SPEED, flow.z * FLOW_SPEED);
      }
      // Splashes kicked up by walking or running through the water.
      if (speed > 1.5) {
        t.splash -= dt;
        if (t.splash <= 0) {
          t.splash = 0.12;
          this.effects.burst(new THREE.Vector3(a.pos.x, y + 0.1, a.pos.z), 'water', 5);
        }
      }
    }
    for (const a of this.track.keys()) if (!seen.has(a)) this.track.delete(a);

    for (const m of this.patches) {
      if (!m.visible) continue;
      const u = m.userData;
      u.age += dt;
      if (u.age >= u.life) { m.visible = false; m.material.opacity = 0; continue; }
      const k = u.age / u.life;
      m.position.x += u.vx * dt;
      m.position.z += u.vz * dt;
      m.position.y = this.world.waterLevel(m.position.x) + 0.03;
      m.rotation.y += dt * 0.3;
      m.scale.setScalar(u.size * (0.6 + k * 0.9));          // spreads out as it drifts
      m.material.opacity = Math.min(1, u.age * 8) * (1 - k) * 0.85;
    }
  }

  clear() {
    for (const m of this.patches) { m.visible = false; m.material.opacity = 0; }
    this.track.clear();
  }
}
