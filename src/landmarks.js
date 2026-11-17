// Landmarks hidden in the jungle: a crashed cargo plane, an old stone temple on a hill,
// and the broken-down remains of stilt huts. They make great cover in a fight.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeRandom } from './world.js';

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

// ---------- textures ----------
let planeMat, stoneMat, mossStoneMat, woodMat, thatchMat;
function materials() {
  if (planeMat) return;
  const rnd = makeRandom(99);
  planeMat = new THREE.MeshStandardMaterial({
    roughness: 0.75, metalness: 0.35,
    map: canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#4b5232'; g.fillRect(0, 0, w, h);                         // faded olive paint
      for (let i = 0; i < 300; i++) {                                           // weathering blotches
        g.fillStyle = `rgba(${rnd() < 0.5 ? '30,32,20' : '110,112,80'},${0.05 + rnd() * 0.1})`;
        g.beginPath(); g.arc(rnd() * w, rnd() * h, 4 + rnd() * 26, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(20,22,14,0.55)'; g.lineWidth = 2;                   // panel lines and rivets
      for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let i = 0; i < 40; i++) {                                            // rust streaks
        const x = rnd() * w;
        const grad = g.createLinearGradient(x, 0, x, h);
        grad.addColorStop(0, 'rgba(120,60,25,0.5)'); grad.addColorStop(1, 'rgba(120,60,25,0)');
        g.fillStyle = grad; g.fillRect(x, rnd() * h * 0.5, 2 + rnd() * 4, h * 0.6);
      }
      g.fillStyle = 'rgba(225,220,200,0.75)'; g.font = 'bold 70px sans-serif';  // tail number
      g.fillText('47', 330, 160);
      g.fillStyle = 'rgba(225,215,170,0.6)'; g.fillRect(0, 200, w, 14);         // faded stripe
    }),
  });
  const stoneDraw = (moss) => (g, w, h) => {
    g.fillStyle = '#77756a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const v = 90 + rnd() * 50;
      g.fillStyle = `rgba(${v},${v - 4},${v - 14},0.3)`;
      g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 12, 3 + rnd() * 12);
    }
    g.strokeStyle = 'rgba(40,38,32,0.6)'; g.lineWidth = 2;                       // block joints
    for (let y = 0; y < h; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (let x = (y / 64) % 2 ? 0 : 48; x < w; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
    }
    for (let i = 0; i < 12; i++) {                                               // cracks
      let x = rnd() * w, y = rnd() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 30; y += rnd() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    if (moss) for (let i = 0; i < 160; i++) {                                    // moss patches
      g.fillStyle = `rgba(${50 + rnd() * 30},${90 + rnd() * 40},${30 + rnd() * 20},${0.25 + rnd() * 0.35})`;
      g.beginPath(); g.arc(rnd() * w, rnd() * h * (0.4 + rnd() * 0.6), 3 + rnd() * 16, 0, 7); g.fill();
    }
  };
  stoneMat = new THREE.MeshStandardMaterial({ roughness: 0.85, map: canvasTex(256, 256, stoneDraw(false)) });
  mossStoneMat = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 256, stoneDraw(true)) });
  woodMat = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    map: canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#4e3a26'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,12,6,${0.15 + rnd() * 0.2})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); }
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(60,90,40,0.35)'; g.fillRect(0, rnd() * h, w, 4 + rnd() * 12); }
    }),
  });
  thatchMat = new THREE.MeshStandardMaterial({
    roughness: 1, side: THREE.DoubleSide, flatShading: true,
    map: canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#6e6038'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) {
        g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,34,18' : '150,135,85'},0.5)`;
        const x = rnd() * w, y = rnd() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y + 10 + rnd() * 14); g.stroke();
      }
    }, [3, 2]),
  });
}

// ---------- crashed cargo plane (nose toward +x) ----------
function buildPlane() {
  const g = new THREE.Group();
  const obstacles = [];
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1d1a, roughness: 0.8, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.45, metalness: 0.8 });

  // Scorched ground where it hit.
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(8, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0d0b08, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }));
  scorch.position.y = 0.06; scorch.scale.set(1.3, 1, 0.8);
  g.add(scorch);

  // Front half of the body, nose dug into the dirt.
  const front = new THREE.Group();
  front.add(mesh(new THREE.CylinderGeometry(1.15, 1.2, 6, 20, 1, true).rotateZ(Math.PI / 2), planeMat));
  const nose = mesh(new THREE.SphereGeometry(1.15, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), planeMat, 3, 0, 0);
  nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.1, 1);
  front.add(nose);
  front.add(mesh(rbox(1.3, 0.45, 1.6, 0.15), glass, 2.6, 0.8, 0));                      // cockpit windows
  front.add(mesh(new THREE.CircleGeometry(1.15, 20).rotateY(-Math.PI / 2), dark, -3, 0, 0)); // torn-open back end
  for (let i = 0; i < 4; i++) {                                                           // windows down the side
    for (const s of [-1, 1]) front.add(mesh(rbox(0.35, 0.3, 0.05, 0.05), glass, 1.2 - i * 1.0, 0.35, s * 1.14));
  }
  for (let i = 0; i < 5; i++) {                                                           // torn metal at the break
    const shard = mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.6, 0.04, 0.4), planeMat, -3.1, Math.random() * 1.6 - 0.8, Math.random() * 1.6 - 0.8);
    shard.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    front.add(shard);
  }
  front.position.set(1.5, 0.85, 0);
  front.rotation.z = -0.08;
  g.add(front);
  for (let x = -1.5; x <= 4.5; x += 1) obstacles.push({ x, z: 0, r: 1.2, h: 99 });

  // Right wing still attached, with an engine and a bent propeller.
  const wing = mesh(rbox(2.4, 0.22, 9, 0.08), planeMat, 1.8, 0.95, -5.4);
  wing.rotation.x = 0.07;
  g.add(wing);
  const engine = mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.2, 16).rotateZ(Math.PI / 2), planeMat, 2.7, 0.7, -3.4);
  g.add(engine);
  g.add(mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.4, 12).rotateZ(Math.PI / 2), dark, 3.9, 0.7, -3.4));
  for (let b = 0; b < 3; b++) {
    const blade = mesh(rbox(0.06, 1.3, 0.22, 0.03), steel, 4.1, 0.7, -3.4);
    blade.geometry = blade.geometry.clone().translate(0, 0.65, 0);
    blade.rotation.x = b * (Math.PI * 2 / 3);
    blade.rotation.z = 0.2 + b * 0.3;   // bent from the crash
    g.add(blade);
  }
  for (let z = -2; z >= -9.5; z -= 1.2) obstacles.push({ x: 1.8, z, r: 0.9, h: 1.0 });   // low enough to jump over

  // Back half with the tail, broken off and twisted.
  const back = new THREE.Group();
  back.add(mesh(new THREE.CylinderGeometry(1.05, 0.45, 5.5, 18, 1, true).rotateZ(-Math.PI / 2), planeMat));
  back.add(mesh(new THREE.CircleGeometry(1.05, 18).rotateY(Math.PI / 2), dark, 2.75, 0, 0));
  const fin = mesh(rbox(1.9, 2.3, 0.14, 0.05), planeMat, -2.3, 1.4, 0);
  fin.rotation.z = 0.35;
  back.add(fin);
  back.add(mesh(rbox(1.3, 0.1, 4.2, 0.04), planeMat, -2.4, 0.3, 0));
  back.position.set(-6.2, 0.8, 1.8);
  back.rotation.y = 0.45;
  back.rotation.x = 0.25;
  g.add(back);
  for (let t = -2.5; t <= 2.5; t += 1.1) obstacles.push({ x: -6.2 + Math.cos(0.45) * t, z: 1.8 - Math.sin(0.45) * t, r: 1.0, h: 99 });

  // Left wing snapped off, lying half buried.
  const lost = mesh(rbox(2.2, 0.2, 6.5, 0.08), planeMat, 0.5, 0.25, 7);
  lost.rotation.set(0.18, 0.7, 0.1);
  g.add(lost);
  for (let t = -2.8; t <= 2.8; t += 1.4) obstacles.push({ x: 0.5 + Math.sin(0.7) * t, z: 7 + Math.cos(0.7) * t, r: 0.9, h: 0.6 });

  // Spilled cargo crates and a wheel.
  for (let i = 0; i < 5; i++) {
    const c = mesh(rbox(0.8, 0.6, 0.6, 0.04), woodMat, -2 + Math.random() * 4, 0.3, 3 + Math.random() * 2.5);
    c.rotation.set(0, Math.random() * 3, Math.random() < 0.3 ? 0.4 : 0);
    g.add(c);
    obstacles.push({ x: c.position.x, z: c.position.z, r: 0.5, h: 0.6 });
  }
  const wheel = mesh(new THREE.TorusGeometry(0.5, 0.2, 10, 20), dark, -3, 0.25, -3);
  wheel.rotation.x = Math.PI / 2 - 0.2;
  g.add(wheel);
  return { group: g, obstacles, radius: 11 };
}

// ---------- old stone temple on the hill ----------
function buildTemple(rnd) {
  const g = new THREE.Group();
  const obstacles = [];
  // Ring of pillars, most broken off at different heights.
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * 5, z = Math.sin(a) * 5;
    if (i === 3) continue;   // one is missing entirely
    const h = i % 3 === 0 ? 4 + rnd() : 0.8 + rnd() * 2.6;
    const p = mesh(new THREE.CylinderGeometry(0.42, 0.48, h, 12), i % 2 ? mossStoneMat : stoneMat, x, h / 2, z);
    g.add(p);
    g.add(mesh(rbox(1.15, 0.3, 1.15, 0.04), stoneMat, x, 0.15, z));                     // base block
    if (h > 3.5) g.add(mesh(rbox(1.2, 0.35, 1.2, 0.04), mossStoneMat, x, h + 0.17, z));  // capital
    else {                                                                               // jagged broken top
      const chunk = mesh(new THREE.DodecahedronGeometry(0.4, 0), stoneMat, x, h, z);
      chunk.scale.set(1, 0.5, 1); chunk.rotation.set(rnd(), rnd(), rnd());
      g.add(chunk);
    }
    obstacles.push({ x, z, r: 0.55, h: 99 });
  }
  // Archway at the front.
  for (const s of [-1, 1]) {
    g.add(mesh(rbox(0.9, 4.6, 0.9, 0.05), mossStoneMat, 8, 2.3, s * 1.6));
    obstacles.push({ x: 8, z: s * 1.6, r: 0.6, h: 99 });
  }
  const lintel = mesh(rbox(1.1, 0.7, 4.4, 0.05), stoneMat, 8, 4.9, 0);
  lintel.rotation.x = 0.04;
  g.add(lintel);
  // Fallen pillars lying in pieces: good low cover.
  for (const [x, z, rot] of [[-2.5, 2.8, 0.8], [2.5, -6.5, 2.1]]) {
    for (let k = 0; k < 3; k++) {
      const seg = mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.3, 12).rotateZ(Math.PI / 2), mossStoneMat,
        x + Math.cos(rot) * k * 1.45, 0.42, z - Math.sin(rot) * k * 1.45);
      seg.rotation.y = rot + (rnd() - 0.5) * 0.2;
      g.add(seg);
      obstacles.push({ x: seg.position.x, z: seg.position.z, r: 0.65, h: 0.85 });
    }
  }
  // Central altar with steps.
  g.add(mesh(rbox(2.4, 0.35, 2.4, 0.05), stoneMat, 0, 0.17, 0));
  g.add(mesh(rbox(1.7, 0.9, 1.2, 0.05), mossStoneMat, 0, 0.8, 0));
  const head = mesh(new THREE.DodecahedronGeometry(0.55, 1), stoneMat, 1.6, 0.45, 1.3);  // toppled statue head
  head.scale.set(0.9, 1.1, 0.95);
  g.add(head);
  obstacles.push({ x: 0, z: 0, r: 1.2, h: 1.2 });
  // Loose blocks scattered around.
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, d = 2.5 + rnd() * 5;
    const b = mesh(rbox(0.7 + rnd() * 0.5, 0.45 + rnd() * 0.4, 0.6 + rnd() * 0.4, 0.04), rnd() < 0.5 ? stoneMat : mossStoneMat,
      Math.cos(a) * d, 0.25, Math.sin(a) * d);
    b.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.3);
    g.add(b);
    obstacles.push({ x: b.position.x, z: b.position.z, r: 0.5, h: 0.75 });
  }
  return { group: g, obstacles, radius: 10 };
}

// ---------- collapsed stilt hut ----------
function buildHut(rnd) {
  const g = new THREE.Group();
  // Posts, some snapped.
  for (const [x, z] of [[-1.8, -1.8], [0, -1.8], [1.8, -1.8], [-1.8, 1.8], [0, 1.8], [1.8, 1.8], [-1.8, 0], [1.8, 0]]) {
    const h = rnd() < 0.3 ? 0.5 + rnd() * 0.6 : 1.1 + rnd() * 0.4;
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, h, 7), woodMat, x, h / 2, z));
  }
  // Floor planks, a few missing and one hanging down.
  for (let i = 0; i < 12; i++) {
    if (rnd() < 0.2) continue;
    const p = mesh(rbox(4, 0.07, 0.3, 0.02), woodMat, 0, 1.0, -1.65 + i * 0.3);
    if (rnd() < 0.15) { p.rotation.x = 0.5; p.position.y = 0.6; }
    g.add(p);
  }
  // Two broken walls of upright poles.
  for (let i = 0; i < 14; i++) {
    const h = 0.6 + rnd() * 1.6;
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 6), woodMat, -1.9 + i * 0.29, 1.0 + h / 2, -1.9));
  }
  for (let i = 0; i < 8; i++) {
    const h = 0.4 + rnd() * 1.4;
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 6), woodMat, -1.9, 1.0 + h / 2, -1.6 + i * 0.29));
  }
  // The thatched roof has slid off and collapsed on one side.
  const roof = mesh(new THREE.ConeGeometry(3.2, 1.8, 8, 1, true, 0, Math.PI * 1.5), thatchMat, 1.2, 1.1, 0.6);
  roof.rotation.set(0.15, 0.6, -0.55);
  g.add(roof);
  // Loose planks on the ground.
  for (let i = 0; i < 6; i++) {
    const p = mesh(rbox(1.6 + rnd(), 0.06, 0.28, 0.02), woodMat, (rnd() - 0.5) * 6, 0.05, (rnd() - 0.5) * 6);
    p.rotation.y = rnd() * 3;
    g.add(p);
  }
  return { group: g, obstacles: [{ x: 0, z: 0, r: 2.3, h: 99 }], radius: 5 };
}

// Put everything into the world, keep trees out of the way, and make it solid.
export function buildLandmarks(world, scene) {
  materials();
  const rnd = makeRandom(world.cfg.seed + 5);
  const T = world.templeSpot;
  const spots = [
    { build: buildPlane, x: -50, z: -12, yaw: 0.6 },
    { build: () => buildTemple(rnd), x: T.x, z: T.z, yaw: 0.3, flatTop: true },
    { build: () => buildHut(rnd), x: -18, z: 60, yaw: 0.4 },
    { build: () => buildHut(rnd), x: 58, z: 12, yaw: 2.1 },
    { build: () => buildHut(rnd), x: 42, z: 62, yaw: 2.8 },
    { build: () => buildHut(rnd), x: -62, z: -62, yaw: 0.9 },
    { build: () => buildHut(rnd), x: -62, z: 30, yaw: 1.2 },
  ];
  world.landmarks = [];
  world.hideouts = [];   // places to hide: samurai lose track of you in here (unless they're right next to you)
  for (const s of spots) {
    const { group, obstacles, radius } = s.build();
    const y = s.flatTop ? world.templeTop : world.heightAt(s.x, s.z);
    group.position.set(s.x, y - 0.05, s.z);
    group.rotation.y = s.yaw;
    scene.add(group);
    world.reserved.push({ x: s.x, z: s.z, r: radius });
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
    for (const o of obstacles) {
      const wx = s.x + o.x * c + o.z * sn, wz = s.z - o.x * sn + o.z * c;
      world.obstacles.push({ x: wx, z: wz, r: o.r, base: world.heightAt(wx, wz), h: o.h });
    }
    world.landmarks.push({ x: s.x, z: s.z, radius });
    if (s.build !== buildPlane) {
      const r = s.flatTop ? 6.5 : 4.5;   // the whole temple top, or around a collapsed hut
      world.hideouts.push({ x: s.x, z: s.z, r });
      // A faint green ring on the ground so you know where the hideout is.
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 64).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.22, depthWrite: false }));
      ring.position.set(s.x, y + 0.08, s.z);
      ring.renderOrder = 2;
      scene.add(ring);
    }
  }
}
