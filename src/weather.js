// Morning light, mist and heavy rain (with sound).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const MIST_COLOR = 0x8f9c95;

export function setupLighting(renderer, scene, cfg, lowGraphics) {
  scene.background = new THREE.Color(MIST_COLOR);
  scene.fog = new THREE.FogExp2(MIST_COLOR, cfg.fogDensity);

  // Soft reflections so wet rocks and puddles shine a little.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.2;

  const hemi = new THREE.HemisphereLight(0xb8cad6, 0x1e2a16, 0.85);
  scene.add(hemi);

  // Low, warm morning sun breaking through the clouds.
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.25);
  sun.position.set(30, 40, 15);
  if (!lowGraphics) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -32; s.right = 32; s.top = 32; s.bottom = -32; s.near = 1; s.far = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
  }
  scene.add(sun, sun.target);
  return { sun, hemi };
}

export class Rain {
  constructor(scene, world, cfg) {
    this.world = world;
    this.cfg = cfg;
    this.count = cfg.rainDrops;
    this.box = 34;      // rain falls in a box this wide around the action
    this.top = 26;      // how high above the ground it starts
    this.len = 0.9;     // streak length
    this.focus = new THREE.Vector3();
    this.amount = 1;          // 0 = no rain, 1 = downpour (set by the sky)
    this.wind = cfg.wind;

    this.drops = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      this.drops[i * 3] = (Math.random() * 2 - 1) * this.box;
      this.drops[i * 3 + 1] = Math.random() * this.top;
      this.drops[i * 3 + 2] = (Math.random() * 2 - 1) * this.box;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 6), 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xb4c4cf, transparent: true, opacity: 0.38, depthWrite: false,
    }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);

    // Little splashes where drops hit the ground.
    this.splashCount = 700;
    this.splashLife = new Float32Array(this.splashCount);
    this.splashNext = 0;
    const sgeo = new THREE.BufferGeometry();
    const sp = new Float32Array(this.splashCount * 3).fill(-9999);
    sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.splashes = new THREE.Points(sgeo, new THREE.PointsMaterial({
      color: 0xd0dce4, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this.splashes.frustumCulled = false;
    scene.add(this.splashes);
  }

  update(dt, focus) {
    this.focus.copy(focus);
    const { rainSpeed } = this.cfg;
    const wind = this.wind;
    const active = Math.floor(this.count * Math.min(1, this.amount));   // fewer drops when it's easing off
    this.lines.geometry.setDrawRange(0, active * 2);
    this.lines.visible = active > 0;
    const d = this.drops, out = this.lines.geometry.attributes.position.array;
    const sp = this.splashes.geometry.attributes.position.array;
    const box = this.box, fx = focus.x, fz = focus.z;
    const slant = (wind / rainSpeed) * this.len;

    for (let i = 0; i < active; i++) {
      const k = i * 3;
      // Drops live around the focus point; wrap them when it moves.
      let x = d[k] + wind * dt, y = d[k + 1] - rainSpeed * dt, z = d[k + 2];
      let moved = false;
      if (x - fx > box) { x -= box * 2; moved = true; } else if (x - fx < -box) { x += box * 2; moved = true; }
      if (z - fz > box) { z -= box * 2; moved = true; } else if (z - fz < -box) { z += box * 2; moved = true; }
      // The ground under each drop is looked up once and remembered (drops hardly move sideways).
      const gy = this.groundY || (this.groundY = new Float32Array(this.count).fill(NaN));
      if (moved || Number.isNaN(gy[i])) gy[i] = this.world.heightAt(x, z);
      const ground = gy[i];
      if (y < ground) {
        if (Math.random() < 0.25) {
          const s = this.splashNext; this.splashNext = (s + 1) % this.splashCount;
          sp[s * 3] = x; sp[s * 3 + 1] = ground + 0.05; sp[s * 3 + 2] = z;
          this.splashLife[s] = 0.12;
        }
        x = fx + (Math.random() * 2 - 1) * box;
        z = fz + (Math.random() * 2 - 1) * box;
        gy[i] = this.world.heightAt(x, z);
        y = gy[i] + this.top * (0.7 + Math.random() * 0.3);
      }
      d[k] = x; d[k + 1] = y; d[k + 2] = z;
      const o = i * 6;
      out[o] = x; out[o + 1] = y; out[o + 2] = z;
      out[o + 3] = x - slant; out[o + 4] = y + this.len; out[o + 5] = z;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;

    for (let s = 0; s < this.splashCount; s++) {
      if (this.splashLife[s] > 0) {
        this.splashLife[s] -= dt;
        if (this.splashLife[s] <= 0) sp[s * 3 + 1] = -9999;
      }
    }
    this.splashes.geometry.attributes.position.needsUpdate = true;
  }
}
