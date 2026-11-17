// The sky and weather change as you go through the levels:
// heavy rain → sun breaking through → golden afternoon → thunderstorm → evening with fireflies.
import * as THREE from 'three';
import { setRainLevel, sfx } from './sound.js';
import { pixelTexture } from './pixeltex.js';

export const PRESETS = {
  rain: {
    message: 'The rain returns…',
    fog: 0x8f9c95, fogDensity: 0.024, sky: 0xb8cad6, ground: 0x1e2a16, hemi: 0.85,
    sun: 0xffe0b0, sunPower: 1.25, sunDir: [30, 40, 15], rain: 1, wind: 4, mist: 1, rays: 0,
    exposure: 0.95, storm: 0, fireflies: 0, birds: 0,
  },
  clearing: {
    message: 'The rain is stopping… sunlight breaks through the trees',
    fog: 0xa9b8a4, fogDensity: 0.012, sky: 0xd6e6ee, ground: 0x2c3c1e, hemi: 1.0,
    sun: 0xfff1d0, sunPower: 2.6, sunDir: [18, 45, 10], rain: 0, wind: 1, mist: 0.45, rays: 1,
    exposure: 1.0, storm: 0, fireflies: 0, birds: 1,
  },
  golden: {
    message: 'Late afternoon: golden light through the jungle',
    fog: 0xb39a78, fogDensity: 0.016, sky: 0xf0caa0, ground: 0x2e2818, hemi: 1.0,
    sun: 0xffa54d, sunPower: 2.6, sunDir: [42, 24, 6], rain: 0.12, wind: 2, mist: 0.7, rays: 0.85,
    exposure: 1.1, storm: 0, fireflies: 0, birds: 0.5,
  },
  storm: {
    message: 'A thunderstorm is rolling in!',
    fog: 0x4d5862, fogDensity: 0.03, sky: 0x6f7f8f, ground: 0x141a12, hemi: 0.6,
    sun: 0x9fb0c8, sunPower: 0.5, sunDir: [20, 40, 20], rain: 1.15, wind: 10, mist: 1, rays: 0,
    exposure: 0.95, storm: 1, fireflies: 0, birds: 0,
  },
  dusk: {
    message: 'Evening falls. The fireflies come out',
    fog: 0x4c4b68, fogDensity: 0.02, sky: 0x9a90c4, ground: 0x1e1e2a, hemi: 0.85,
    sun: 0xff8a6a, sunPower: 0.9, sunDir: [-40, 14, -10], rain: 0.15, wind: 1.5, mist: 0.8, rays: 0,
    exposure: 1.05, storm: 0, fireflies: 1, birds: 0,
  },
};
const LEVEL_ORDER = ['rain', 'rain', 'clearing', 'clearing', 'golden', 'golden', 'storm', 'storm', 'dusk', 'dusk'];
const COLOR_KEYS = ['fog', 'sky', 'ground', 'sun'];
const NUM_KEYS = ['fogDensity', 'hemi', 'sunPower', 'rain', 'wind', 'mist', 'rays', 'exposure', 'storm', 'fireflies', 'birds'];

function toState(p) {
  const s = {};
  for (const k of COLOR_KEYS) s[k] = new THREE.Color(p[k]);
  for (const k of NUM_KEYS) s[k] = p[k];
  s.sunDir = new THREE.Vector3(...p.sunDir);
  return s;
}

export class Sky {
  constructor({ scene, renderer, sun, hemi, rain, world }) {
    Object.assign(this, { scene, renderer, sun, hemi, rain, world });
    this.now = toState(PRESETS.rain);
    this.target = toState(PRESETS.rain);
    this.name = 'rain';
    this.flash = 0;
    this.lightningTimer = 6;
    this.birdTimer = 2;
    this.time = 0;
    this.buildRays();
    this.buildFireflies();
  }

  // Which weather a level has.
  forLevel(n, hud) {
    const name = LEVEL_ORDER[(n - 1) % LEVEL_ORDER.length];
    if (name !== this.name) {
      this.set(name);
      if (n > 1) hud?.toast(PRESETS[name].message, 4);
    }
  }

  set(name, instant = false) {
    this.name = name;
    this.target = toState(PRESETS[name]);
    if (instant) this.now = toState(PRESETS[name]);
  }

  random(instant = true) {
    const names = Object.keys(PRESETS);
    this.set(names[Math.floor(Math.random() * names.length)], instant);
  }

  // ---------- sunbeams: soft shafts of light slanting down through the canopy ----------
  buildRays() {
    // Bright at the top, fading toward the ground, with soft left and right edges.
    const tex = pixelTexture(64, 256, (u, v) => {
      const down = v < 0.7 ? 0.9 - 0.55 * (v / 0.7) : 0.35 * (1 - (v - 0.7) / 0.3);
      return [1, 1, 1, down * (1 - Math.abs(u - 0.5) * 2)];
    });
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.rays = [];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      });
      const shaft = new THREE.Group();
      for (const turn of [0, Math.PI / 2]) {
        const m = new THREE.Mesh(geo, mat);
        m.rotation.y = turn;
        shaft.add(m);
      }
      shaft.userData = { mat, life: 0, span: 1, width: 1 };
      this.scene.add(shaft);
      this.rays.push(shaft);
    }
  }

  placeRay(shaft, focus) {
    const u = shaft.userData;
    const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 15;
    const x = focus.x + Math.cos(a) * d, z = focus.z + Math.sin(a) * d;
    shaft.position.set(x, this.world.heightAt(x, z) - 0.2, z);
    u.life = 0;
    u.span = 5 + Math.random() * 6;
    const w = 1 + Math.random() * 2.2;
    shaft.scale.set(w, 22 + Math.random() * 8, w);
  }

  // ---------- fireflies ----------
  buildFireflies() {
    this.flyCount = 140;
    const geo = new THREE.BufferGeometry();
    this.flyPos = new Float32Array(this.flyCount * 3);
    this.flyCol = new Float32Array(this.flyCount * 3);
    this.flyPhase = new Float32Array(this.flyCount).map(() => Math.random() * 100);
    geo.setAttribute('position', new THREE.BufferAttribute(this.flyPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.flyCol, 3));
    this.flies = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flies.frustumCulled = false;
    this.flyHome = [];
    for (let i = 0; i < this.flyCount; i++) this.flyHome.push(new THREE.Vector3(9999, 0, 0));
    this.scene.add(this.flies);
  }

  update(dt, focus) {
    this.time += dt;
    const k = 1 - Math.exp(-dt / 1.8);   // about 6 seconds to change over fully
    const now = this.now, tgt = this.target;
    for (const key of COLOR_KEYS) now[key].lerp(tgt[key], k);
    for (const key of NUM_KEYS) now[key] += (tgt[key] - now[key]) * k;
    now.sunDir.lerp(tgt.sunDir, k);

    // Lightning: two quick flashes, then thunder a moment later.
    if (now.storm > 0.5) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 5 + Math.random() * 8;
        this.flashSeq = [0, 0.07, 0.16, 0.26];
        this.flashT = 0;
        setTimeout(() => sfx.thunder(), 300 + Math.random() * 1400);
      }
    }
    let flash = 0;
    if (this.flashSeq) {
      this.flashT += dt;
      const [a, b, c, d] = this.flashSeq;
      const t = this.flashT;
      flash = (t < b && t >= a) || (t >= c && t < d) ? 1 : 0;
      if (t > d) this.flashSeq = null;
    }

    // Apply the mix to the scene.
    this.scene.fog.color.copy(now.fog);
    this.scene.fog.density = now.fogDensity;
    this.scene.background.copy(now.fog).lerp(new THREE.Color(0xdde6ff), flash * 0.6);
    this.hemi.color.copy(now.sky);
    this.hemi.groundColor.copy(now.ground);
    this.hemi.intensity = now.hemi + flash * 3;
    this.sun.color.copy(now.sun);
    this.sun.intensity = now.sunPower;
    this.renderer.toneMappingExposure = now.exposure;
    this.rain.amount = Math.max(0, now.rain);
    this.rain.wind = now.wind;
    setRainLevel(Math.min(1.3, now.rain * 0.9 + now.storm * 0.3));
    if (this.world.mist.length) this.world.mist[0].material.opacity = 0.14 * now.mist;

    // Sunbeams fade in and out at different spots, slanting the way the sun shines.
    const dir = now.sunDir.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    for (const shaft of this.rays) {
      const u = shaft.userData;
      u.life += dt;
      if (u.life > u.span || shaft.position.distanceTo(focus) > 26) this.placeRay(shaft, focus);
      shaft.quaternion.copy(q);
      const fade = Math.sin(Math.PI * Math.min(1, u.life / u.span));
      u.mat.opacity = now.rays * fade * 0.2;
      u.mat.color.copy(now.sun);
      shaft.visible = u.mat.opacity > 0.002;
    }

    // Fireflies drift and blink near the action.
    const show = now.fireflies;
    this.flies.visible = show > 0.02;
    if (this.flies.visible) {
      for (let i = 0; i < this.flyCount; i++) {
        const home = this.flyHome[i];
        if (home.distanceTo(focus) > 22) {
          const a = Math.random() * Math.PI * 2, d = Math.random() * 20;
          home.set(focus.x + Math.cos(a) * d, 0, focus.z + Math.sin(a) * d);
          home.y = this.world.heightAt(home.x, home.z) + 0.4 + Math.random() * 2.2;
        }
        const ph = this.flyPhase[i] + this.time;
        this.flyPos[i * 3] = home.x + Math.sin(ph * 0.7) * 0.8;
        this.flyPos[i * 3 + 1] = home.y + Math.sin(ph * 1.3) * 0.3;
        this.flyPos[i * 3 + 2] = home.z + Math.cos(ph * 0.5) * 0.8;
        const blink = Math.max(0, Math.sin(ph * 2.1)) ** 3 * show;
        this.flyCol[i * 3] = 0.8 * blink; this.flyCol[i * 3 + 1] = 1 * blink; this.flyCol[i * 3 + 2] = 0.3 * blink;
      }
      this.flies.geometry.attributes.position.needsUpdate = true;
      this.flies.geometry.attributes.color.needsUpdate = true;
    }

    // Birds sing when the rain stops.
    if (now.birds > 0.3) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) { this.birdTimer = 1.5 + Math.random() * 4 / now.birds; sfx.bird(); }
    }
  }

  // Where the sun shines from, relative to the action (for the shadow light).
  get sunOffset() { return this.now.sunDir; }
}
