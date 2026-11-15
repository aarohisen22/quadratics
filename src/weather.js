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

  scene.add(new THREE.HemisphereLight(0xb8cad6, 0x1e2a16, 0.85));

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
  return sun;
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
    const { rainSpeed, wind } = this.cfg;
    const d = this.drops, out = this.lines.geometry.attributes.position.array;
    const sp = this.splashes.geometry.attributes.position.array;
    const box = this.box, fx = focus.x, fz = focus.z;
    const slant = (wind / rainSpeed) * this.len;

    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      // Drops live around the focus point; wrap them when it moves.
      let x = d[k] + wind * dt, y = d[k + 1] - rainSpeed * dt, z = d[k + 2];
      if (x - fx > box) x -= box * 2; else if (x - fx < -box) x += box * 2;
      if (z - fz > box) z -= box * 2; else if (z - fz < -box) z += box * 2;
      const ground = this.world.heightAt(x, z);
      if (y < ground) {
        if (Math.random() < 0.25) {
          const s = this.splashNext; this.splashNext = (s + 1) % this.splashCount;
          sp[s * 3] = x; sp[s * 3 + 1] = ground + 0.05; sp[s * 3 + 2] = z;
          this.splashLife[s] = 0.12;
        }
        x = fx + (Math.random() * 2 - 1) * box;
        z = fz + (Math.random() * 2 - 1) * box;
        y = this.world.heightAt(x, z) + this.top * (0.7 + Math.random() * 0.3);
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

  // Rain sound is made from noise, so there are no audio files to download.
  // Browsers only allow sound after a click, so this runs from the start screen.
  startSound() {
    if (this.audio) return;
    const ctx = new AudioContext();
    this.audio = ctx;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let brown = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = white * 0.6 + brown * 3;
      }
    }
    const master = ctx.createGain();
    master.gain.value = this.cfg.rainVolume;
    master.connect(ctx.destination);

    const layer = (type, freq, q, gain) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(f).connect(g).connect(master);
      src.start(0, Math.random() * 2);
    };
    layer('lowpass', 500, 0.5, 0.55);   // deep roar of heavy rain
    layer('bandpass', 1800, 0.6, 0.35); // hiss on the leaves
    layer('highpass', 6000, 0.3, 0.08); // fine patter
  }
}
