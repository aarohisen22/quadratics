// The samurai outpost: a camp behind a wall of sharpened stakes, with tents, tall banners, torches
// and a campfire. Waves of samurai march out of its gate. Red-ribboned posts mark the edge of
// samurai territory: go past them and no more samurai come after you, so you can explore in peace.
import * as THREE from 'three';
import { makeRandom } from './world.js';

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A clan crest (mon): three commas swirling in a circle.
function drawMon(g, cx, cy, r, color) {
  g.strokeStyle = color; g.lineWidth = r * 0.12;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const x = cx + Math.cos(a) * r * 0.38, y = cy + Math.sin(a) * r * 0.38;
    g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(x + Math.cos(a + 1.6) * r * 0.3, y + Math.sin(a + 1.6) * r * 0.3);
    g.quadraticCurveTo(cx + Math.cos(a + 1.3) * r * 0.85, cy + Math.sin(a + 1.3) * r * 0.85,
      cx + Math.cos(a + 2.2) * r * 0.7, cy + Math.sin(a + 2.2) * r * 0.7);
    g.lineTo(x + Math.cos(a - 1.6) * r * 0.3, y + Math.sin(a - 1.6) * r * 0.3);
    g.fill();
  }
}

export function buildOutpost(world, scene, cfg) {
  const rnd = makeRandom(world.cfg.seed + 21);
  const O = { x: cfg.x, z: cfg.z, r: cfg.territory, wall: 9.5 };
  const g = new THREE.Group();
  const groundY = (x, z) => world.heightAt(x, z);
  // Which way the gate faces: toward the middle of the jungle.
  const gateAngle = Math.atan2(-O.z, -O.x);
  O.gate = { x: O.x + Math.cos(gateAngle) * O.wall, z: O.z + Math.sin(gateAngle) * O.wall };

  const log = new THREE.MeshStandardMaterial({ color: 0x5a3e24, roughness: 0.9 });
  const darkLog = new THREE.MeshStandardMaterial({ color: 0x3b281a, roughness: 0.95 });
  const rope = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6e6b62, roughness: 0.9, flatShading: true });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.7 });
  const canvas = new THREE.MeshStandardMaterial({
    roughness: 0.95, side: THREE.DoubleSide,
    map: canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#d8cfb4'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) {   // dirt and rain stains
        c.fillStyle = `rgba(${90 + rnd() * 40},${80 + rnd() * 30},${50 + rnd() * 20},${0.04 + rnd() * 0.06})`;
        c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 18, 2 + rnd() * 30);
      }
      c.fillStyle = 'rgba(70,40,25,0.5)'; c.fillRect(0, h - 10, w, 10);   // muddy hem
    }),
  });
  const maku = new THREE.MeshStandardMaterial({   // the commander's curtained tent: white with a black crest
    roughness: 0.9, side: THREE.DoubleSide,
    map: canvasTex(512, 128, (c, w, h) => {
      c.fillStyle = '#ece6d6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d1a18'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
      for (let x = 64; x < w; x += 128) drawMon(c, x, h / 2, 30, '#1d1a18');
    }),
  });
  const flagMats = ['#a3161a', '#ece6d6', '#1d1a18'].map((bg, i) => new THREE.MeshStandardMaterial({
    roughness: 0.85, side: THREE.DoubleSide,
    map: canvasTex(64, 256, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = i === 1 ? '#a3161a' : '#ece6d6';
      c.fillRect(0, 0, w, 10);
      drawMon(c, w / 2, 48, 22, i === 1 ? '#1d1a18' : '#ece6d6');
      c.fillStyle = 'rgba(0,0,0,0.15)';
      for (let y = 90; y < h - 10; y += 34) c.fillRect(w * 0.3, y, w * 0.4, 18);   // painted writing
    }),
  }));
  const flame = new THREE.MeshBasicMaterial({ color: 0xffa233, transparent: true, opacity: 0.9 });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });

  const obstacles = [];
  const flames = [];
  const flags = [];

  // --- the stake wall, with a gap for the gate ---
  const stakeGeo = new THREE.CylinderGeometry(0.16, 0.2, 1, 6).translate(0, 0.5, 0);
  const tipGeo = new THREE.ConeGeometry(0.16, 0.45, 6).translate(0, 0.22, 0);
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const gap = Math.abs(Math.atan2(Math.sin(a - gateAngle), Math.cos(a - gateAngle)));
    if (gap < 0.17) continue;   // the gate
    const x = O.x + Math.cos(a) * O.wall, z = O.z + Math.sin(a) * O.wall;
    const h = 2.4 + rnd() * 0.5;
    const s = mesh(stakeGeo, log, x, groundY(x, z) - 0.2, z);
    s.scale.y = h; s.rotation.set((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08);
    const tip = mesh(tipGeo, log, 0, 1, 0); tip.scale.y = 1 / h;
    s.add(tip);
    g.add(s);
    if (i % 2 === 0) obstacles.push({ x, z, r: 0.75, h: 99 });
  }
  // Two rope bands lashing the stakes together.
  for (const y of [0.7, 1.7]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(O.wall, 0.04, 4, 96), rope);
    band.rotation.x = Math.PI / 2;
    band.position.set(O.x, groundY(O.x, O.z) + y, O.z);
    g.add(band);
  }
  // Gate posts with a crossbeam and a big banner hanging from it.
  const gx = O.gate.x, gz = O.gate.z, side = { x: -Math.sin(gateAngle), z: Math.cos(gateAngle) };
  for (const k of [-1, 1]) {
    const px = gx + side.x * 1.9 * k, pz = gz + side.z * 1.9 * k;
    const post = mesh(new THREE.CylinderGeometry(0.25, 0.3, 4.2, 8).translate(0, 2.1, 0), darkLog, px, groundY(px, pz) - 0.2, pz);
    g.add(post);
    obstacles.push({ x: px, z: pz, r: 0.5, h: 99 });
  }
  const beam = mesh(new THREE.BoxGeometry(4.8, 0.35, 0.35), darkLog, gx, groundY(gx, gz) + 3.7, gz);
  beam.rotation.y = -gateAngle + Math.PI / 2;
  g.add(beam);

  // --- tents: canvas A-frames around the inside, and the commander's curtain tent ---
  const tentGeo = (() => {   // triangular prism, open at the ends
    const s = new THREE.Shape();
    s.moveTo(-1.6, 0); s.lineTo(0, 2.1); s.lineTo(1.6, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false }).translate(0, 0, -1.6);
  })();
  const tentSpots = [2.2, 3.4, 4.4, 5.6];   // angles (from the gate) around the inside of the wall
  for (const off of tentSpots) {
    const a = gateAngle + off;
    const x = O.x + Math.cos(a) * 6.2, z = O.z + Math.sin(a) * 6.2;
    const t = mesh(tentGeo, canvas, x, groundY(x, z) - 0.05, z);
    t.rotation.y = -a;
    g.add(t);
    const ridge = mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.8, 5), log, x, groundY(x, z) + 2.1, z);
    ridge.rotation.set(Math.PI / 2, 0, 0); ridge.rotation.order = 'YXZ'; ridge.rotation.y = -a;
    g.add(ridge);
    obstacles.push({ x, z, r: 1.6, h: 2 });
  }
  // The commander's tent: four posts and curtains with the clan crest, a stool and a war table.
  {
    const a = gateAngle + Math.PI, x = O.x + Math.cos(a) * 3.2, z = O.z + Math.sin(a) * 3.2;
    const y = groundY(x, z);
    const ct = new THREE.Group();
    ct.position.set(x, y, z); ct.rotation.y = -a + Math.PI / 2;
    for (const [px, pz] of [[-2, -1.4], [2, -1.4], [-2, 1.4], [2, 1.4]]) ct.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6).translate(0, 1.1, 0), darkLog, px, 0, pz));
    const back = mesh(new THREE.PlaneGeometry(4, 1.5), maku, 0, 1.35, -1.4); ct.add(back);
    const l = mesh(new THREE.PlaneGeometry(2.8, 1.5), maku, -2, 1.35, 0); l.rotation.y = Math.PI / 2; ct.add(l);
    const r = mesh(new THREE.PlaneGeometry(2.8, 1.5), maku, 2, 1.35, 0); r.rotation.y = Math.PI / 2; ct.add(r);
    const table = mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), log, 0, 0.7, -0.3); ct.add(table);
    for (const [tx, tz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0], [0.6, 0]]) ct.add(mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), darkLog, tx, 0.35, tz));
    const map = mesh(new THREE.PlaneGeometry(1.1, 0.6), new THREE.MeshStandardMaterial({ color: 0xcdb98a, roughness: 1 }), 0, 0.75, -0.3);
    map.rotation.x = -Math.PI / 2; ct.add(map);
    const stool = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), canvas, 0, 0.45, 0.6); ct.add(stool);
    g.add(ct);
    obstacles.push({ x, z, r: 2.0, h: 1 });
  }

  // --- tall nobori banners on poles, along the wall and at the gate ---
  const flagGeo = new THREE.PlaneGeometry(0.7, 2.6, 1, 8).translate(0.35, -1.3, 0);
  const addBanner = (x, z, i) => {
    const y = groundY(x, z);
    const pole = mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.6, 6).translate(0, 2.8, 0), darkLog, x, y - 0.2, z);
    const arm = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 5), darkLog, 0.37, 5.35, 0);
    arm.rotation.z = Math.PI / 2;
    pole.add(arm);
    const f = new THREE.Mesh(flagGeo.clone(), flagMats[i % 3]);
    f.castShadow = true;
    f.position.set(0.03, 5.35, 0);
    pole.add(f);
    pole.rotation.y = rnd() * Math.PI * 2;
    g.add(pole);
    flags.push({ mesh: f, base: flagGeo.attributes.position.array.slice(), phase: rnd() * 6 });
  };
  for (let i = 0; i < 8; i++) {
    const a = gateAngle + 0.5 + (i / 8) * (Math.PI * 2 - 1);
    addBanner(O.x + Math.cos(a) * (O.wall - 0.7), O.z + Math.sin(a) * (O.wall - 0.7), i);
  }
  for (const k of [-1, 1]) addBanner(gx + side.x * 2.6 * k + Math.cos(gateAngle) * 0.8, gz + side.z * 2.6 * k + Math.sin(gateAngle) * 0.8, k + 1);

  // --- torches and the campfire ---
  const addFlame = (parent, y, size) => {
    const f = mesh(new THREE.ConeGeometry(0.16 * size, 0.55 * size, 7).translate(0, 0.27 * size, 0), flame, 0, y, 0);
    f.castShadow = false;
    const core = mesh(new THREE.ConeGeometry(0.08 * size, 0.3 * size, 6).translate(0, 0.15 * size, 0), flameCore, 0, 0, 0);
    core.castShadow = false;
    f.add(core);
    parent.add(f);
    flames.push({ mesh: f, phase: rnd() * 6, size });
  };
  const torchSpots = [-0.5, 0.5, 2.8, 4.9];
  for (const off of torchSpots) {
    const a = gateAngle + off;
    const x = O.x + Math.cos(a) * (O.wall - 0.6), z = O.z + Math.sin(a) * (O.wall - 0.6);
    const t = mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6).translate(0, 1.1, 0), darkLog, x, groundY(x, z), z);
    t.add(mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.3, 7), iron, 0, 2.25, 0));
    addFlame(t, 2.35, 1);
    g.add(t);
  }
  const fire = new THREE.Group();
  fire.position.set(O.x, groundY(O.x, O.z), O.z);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    fire.add(mesh(new THREE.DodecahedronGeometry(0.22, 0), stone, Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75));
  }
  for (let i = 0; i < 4; i++) {
    const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), darkLog, 0, 0.2, 0);
    l.rotation.set(0.35, (i / 4) * Math.PI * 2, Math.PI / 2 - 0.35);
    fire.add(l);
  }
  addFlame(fire, 0.2, 2.6);
  const fireLight = new THREE.PointLight(0xff8a30, 18, 16, 1.6);
  fireLight.position.set(0, 1.4, 0);
  fire.add(fireLight);
  g.add(fire);
  obstacles.push({ x: O.x, z: O.z, r: 0.9, h: 0.5 });

  // --- a weapon rack with spears and a few supply barrels ---
  {
    const a = gateAngle + 1.2, x = O.x + Math.cos(a) * 6.5, z = O.z + Math.sin(a) * 6.5;
    const rack = new THREE.Group();
    rack.position.set(x, groundY(x, z), z); rack.rotation.y = -a;
    rack.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), log, 0, 1.5, 0));
    rack.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), log, 0, 0.3, 0));
    for (const zz of [-1.05, 1.05]) rack.add(mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), darkLog, 0, 0.85, zz));
    for (let i = 0; i < 6; i++) {
      const sp = mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 5).translate(0, 1.3, 0), darkLog, 0.08, 0, -0.85 + i * 0.34);
      sp.rotation.z = -0.12;
      sp.add(mesh(new THREE.ConeGeometry(0.05, 0.3, 4).translate(0, 0.15, 0), iron, 0, 2.6, 0));
      rack.add(sp);
    }
    g.add(rack);
    obstacles.push({ x, z, r: 1.1, h: 1.6 });
    for (let i = 0; i < 3; i++) {
      const bx = x + Math.cos(a + 0.5 + i * 0.12) * 1.6, bz = z + Math.sin(a + 0.5 + i * 0.12) * 1.6;
      const b = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.85, 12).translate(0, 0.42, 0), log, bx, groundY(bx, bz), bz);
      b.add(mesh(new THREE.TorusGeometry(0.39, 0.025, 4, 16), iron, 0, 0.2, 0).rotateX(Math.PI / 2));
      b.add(mesh(new THREE.TorusGeometry(0.39, 0.025, 4, 16), iron, 0, 0.65, 0).rotateX(Math.PI / 2));
      g.add(b);
    }
  }

  // --- posts with red ribbons around the edge of samurai territory ---
  const ribbon = new THREE.MeshStandardMaterial({ color: 0xc4161c, roughness: 0.8, side: THREE.DoubleSide });
  const posts = 28;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    const x = O.x + Math.cos(a) * O.r, z = O.z + Math.sin(a) * O.r;
    if (Math.abs(x) > world.limit + 1 || Math.abs(z) > world.limit + 1 || world.waterDepthAt(x, z) > 0) continue;
    const post = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6).translate(0, 0.8, 0), darkLog, x, groundY(x, z) - 0.1, z);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.9, 1, 4).translate(0, -0.45, 0), ribbon);
    strip.position.y = 1.55;
    post.add(strip);
    post.add(mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), ribbon, 0, 1.5, 0));
    g.add(post);
    flags.push({ mesh: strip, base: strip.geometry.attributes.position.array.slice(), phase: rnd() * 6, ribbon: true });
  }

  scene.add(g);
  world.reserved.push({ x: O.x, z: O.z, r: O.wall + 2.5 });
  for (const o of obstacles) world.obstacles.push({ ...o, base: world.heightAt(o.x, o.z) });
  world.outpost = O;

  let time = 0;
  O.update = (dt) => {
    time += dt;
    for (const f of flames) {   // flicker
      const k = 1 + Math.sin(time * 17 + f.phase) * 0.12 + Math.sin(time * 29 + f.phase * 2) * 0.08;
      f.mesh.scale.set(1, k, 1);
      f.mesh.rotation.y = time * 2 + f.phase;
    }
    fireLight.intensity = 16 + Math.sin(time * 13) * 3 + Math.sin(time * 31) * 2;
    for (const f of flags) {    // ripple in the wind
      const p = f.mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = f.base[i * 3], by = f.base[i * 3 + 1];
        const along = f.ribbon ? -by : bx + -by * 0.25;
        p.setZ(i, Math.sin(time * 3.2 + f.phase + along * 3) * 0.12 * along);
      }
      p.needsUpdate = true;
    }
  };
  return O;
}
