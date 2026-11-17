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
  const O = { x: cfg.x, z: cfg.z, r: cfg.territory, wall: cfg.wall || 15, fireDamage: cfg.fireDamage };
  const g = new THREE.Group();
  const groundY = (x, z) => world.heightAt(x, z);
  // Which way the gate faces: toward the middle of the jungle.
  const gateAngle = Math.atan2(-O.z, -O.x);
  O.gate = { x: O.x + Math.cos(gateAngle) * O.wall, z: O.z + Math.sin(gateAngle) * O.wall };
  O.gateAngle = gateAngle;
  const gapHalf = 2.7 / O.wall;   // the gate opening, as an angle seen from the middle
  const at = (a, r) => ({ x: O.x + Math.cos(gateAngle + a) * r, z: O.z + Math.sin(gateAngle + a) * r });

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
  const n = Math.round(Math.PI * 2 * O.wall / 0.72);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const gap = Math.abs(Math.atan2(Math.sin(a - gateAngle), Math.cos(a - gateAngle)));
    if (gap < gapHalf) continue;   // the gate
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
    const band = new THREE.Mesh(new THREE.TorusGeometry(O.wall, 0.04, 4, 128, Math.PI * 2 - gapHalf * 2), rope);
    band.rotation.set(Math.PI / 2, 0, gateAngle + gapHalf);   // all the way round except across the gate
    band.position.set(O.x, groundY(O.x, O.z) + y, O.z);
    g.add(band);
  }
  // --- the gatehouse: tall pillars, a curved top beam, a roof, the clan crest, and heavy doors swung open ---
  const gx = O.gate.x, gz = O.gate.z, side = { x: -Math.sin(gateAngle), z: Math.cos(gateAngle) };
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.75, side: THREE.DoubleSide });
  const plank = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    map: canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = '#5b3f26'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 21) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x, 0, 2, h); }   // planks
      for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(30,20,10,${0.05 + rnd() * 0.1})`; c.fillRect(rnd() * w, rnd() * h, 1, 10 + rnd() * 40); }
    }),
  });
  const gate = new THREE.Group();
  gate.position.set(gx, groundY(gx, gz), gz);
  gate.rotation.y = Math.PI / 2 - gateAngle;   // local +z points out of the camp
  g.add(gate);
  const local = (lx, lz) => {   // gate-local (x across, z outward) to world
    const ax = Math.cos(gateAngle), az = Math.sin(gateAngle);   // outward
    const sx = az, sz = -ax;                                     // across (matches local +x after the rotation)
    return { x: gx + sx * lx + ax * lz, z: gz + sz * lx + az * lz };
  };
  for (const k of [-1, 1]) {
    gate.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 5.4, 10).translate(0, 2.7, 0), darkLog, k * 2.5, -0.3, 0.2));   // main pillars
    gate.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 4.4, 8).translate(0, 2.2, 0), darkLog, k * 2.5, -0.3, -1.6));   // back pillars
    gate.add(mesh(new THREE.BoxGeometry(0.16, 0.16, 1.9), darkLog, k * 2.5, 3.9, -0.7));                                // side ties
    gate.add(mesh(new THREE.BoxGeometry(0.62, 0.25, 0.62), iron, k * 2.5, 0.0, 0.2));                                   // iron feet
    for (const lz of [0.2, -1.6]) { const p = local(k * 2.5, lz); obstacles.push({ x: p.x, z: p.z, r: 0.45, h: 99 }); }
  }
  const kasagi = mesh(new THREE.BoxGeometry(6.4, 0.32, 0.5), darkLog, 0, 5.15, 0.2);   // top beam
  gate.add(kasagi);
  for (const k of [-1, 1]) {   // its upturned ends
    const tip = mesh(new THREE.BoxGeometry(0.9, 0.28, 0.5), darkLog, k * 3.45, 5.3, 0.2);
    tip.rotation.z = k * 0.28;
    gate.add(tip);
  }
  gate.add(mesh(new THREE.BoxGeometry(5.6, 0.24, 0.26), darkLog, 0, 4.3, 0.2));        // lower tie beam
  // Plaque with the clan crest between the beams.
  const plaque = mesh(new THREE.BoxGeometry(0.9, 0.7, 0.08), new THREE.MeshStandardMaterial({
    roughness: 0.6, map: canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#1d1a18'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b08a3a'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); drawMon(c, w / 2, h / 2, 30, '#b08a3a'); }),
  }), 0, 4.75, 0.36);
  gate.add(plaque);
  // Gabled roof over the gate.
  for (const k of [-1, 1]) {
    const slope = mesh(new THREE.BoxGeometry(7.2, 0.12, 1.75), roofMat, 0, 5.75, -0.7 + k * 0.75);
    slope.rotation.x = k * 0.5;
    gate.add(slope);
  }
  gate.add(mesh(new THREE.BoxGeometry(7.4, 0.18, 0.2), darkLog, 0, 6.15, -0.7));   // ridge
  // Two heavy doors, swung open into the camp, with iron bands and studs.
  for (const k of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(k * 2.25, 0, -0.1);
    hinge.rotation.y = -k * 1.25;   // swung open inward
    const door = mesh(new THREE.BoxGeometry(2.2, 3.8, 0.14), plank, -k * 1.1, 1.9, 0);
    hinge.add(door);
    for (const y of [0.6, 1.9, 3.2]) {
      hinge.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 0.17), iron, -k * 1.1, y, 0));
      for (let sx = 0.25; sx < 2.2; sx += 0.45) hinge.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), iron, -k * sx, y, 0.1));
    }
    gate.add(hinge);
    const mid = local(k * 2.25 - k * Math.cos(1.25) * 1.1, -0.1 - Math.sin(1.25) * 1.1);
    obstacles.push({ x: mid.x, z: mid.z, r: 0.75, h: 99 });
  }
  // Lanterns hanging from the gate.
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2e2b8, emissive: 0xff9a40, emissiveIntensity: 0.9, roughness: 0.8 });
  for (const k of [-1, 1]) {
    gate.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), rope, k * 1.6, 4.0, 0.36));
    const lantern = mesh(new THREE.SphereGeometry(0.22, 12, 8), paper, k * 1.6, 3.65, 0.36);
    lantern.scale.set(1, 1.25, 1);
    gate.add(lantern);
  }

  // --- two watchtowers just inside the wall, one each side of the gate ---
  for (const k of [-1, 1]) {
    const p = local(k * 5.2, -2.6);
    const tower = new THREE.Group();
    tower.position.set(p.x, groundY(p.x, p.z), p.z);
    tower.rotation.y = Math.PI / 2 - gateAngle;
    for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      const leg = mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 7).translate(0, 3.1, 0), darkLog, lx, -0.2, lz);
      tower.add(leg);
    }
    for (const y of [1.6, 3.2]) {   // cross bracing
      for (const r of [0, Math.PI / 2]) {
        const br = mesh(new THREE.BoxGeometry(2.5, 0.08, 0.08), log, 0, y, 0);
        br.rotation.set(0, r, 0.6);
        tower.add(br);
      }
    }
    tower.add(mesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), log, 0, 4.4, 0));     // platform
    for (const [lx, lz, w, d] of [[0, 1.15, 2.4, 0.08], [0, -1.15, 2.4, 0.08], [1.15, 0, 0.08, 2.4], [-1.15, 0, 0.08, 2.4]]) {
      tower.add(mesh(new THREE.BoxGeometry(w, 0.9, d), plank, lx, 4.95, lz));   // waist-high boards
    }
    const roof = mesh(new THREE.ConeGeometry(2.0, 1.1, 4), roofMat, 0, 6.7, 0);
    roof.rotation.y = Math.PI / 4;
    tower.add(roof);
    for (let y = 0.4; y < 4.4; y += 0.45) tower.add(mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), log, 0, y, -1.05));   // ladder rungs
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.6, 1, 8).translate(0.35, -1.3, 0), flagMats[0]);
    flag.position.set(0.95, 8.5, 0.95);
    tower.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 5).translate(0, 1.7, 0), darkLog, 0.95, 5.3, 0.95));
    tower.add(flag);
    flags.push({ mesh: flag, base: flag.geometry.attributes.position.array.slice(), phase: rnd() * 6 });
    g.add(tower);
    obstacles.push({ x: p.x, z: p.z, r: 1.4, h: 99 });
  }

  // --- tents: canvas A-frames around the inside, and the commander's curtain tent ---
  const tentGeo = (() => {   // triangular prism, open at the ends
    const s = new THREE.Shape();
    s.moveTo(-1.6, 0); s.lineTo(0, 2.1); s.lineTo(1.6, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false }).translate(0, 0, -1.6);
  })();
  const tentSpots = [0.95, 1.6, 2.3, 3.95, 4.65, 5.35];   // angles (from the gate) around the inside, leaving the gate path clear
  for (const off of tentSpots) {
    const a = gateAngle + off;
    const x = O.x + Math.cos(a) * O.wall * 0.62, z = O.z + Math.sin(a) * O.wall * 0.62;
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
    const a = gateAngle + Math.PI, x = O.x + Math.cos(a) * O.wall * 0.45, z = O.z + Math.sin(a) * O.wall * 0.45;
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
  for (let i = 0; i < 12; i++) {
    const a = gateAngle + 0.75 + (i / 11) * (Math.PI * 2 - 1.5);
    addBanner(O.x + Math.cos(a) * (O.wall - 0.7), O.z + Math.sin(a) * (O.wall - 0.7), i);
  }
  for (const k of [-1, 1]) { const p = local(k * 3.6, 0.9); addBanner(p.x, p.z, k + 1); }   // either side of the gate, outside

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
  const torchSpots = [-0.45, 0.45, 1.3, 2.0, 2.7, 3.6, 4.3, 5.0];
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
  O.fires = [{ x: O.x, z: O.z, r: 0.95, y: groundY(O.x, O.z) }];   // walkable, but it burns

  // --- a weapon rack with spears and a few supply barrels ---
  for (const off of [1.25, -1.25]) {
    const a = gateAngle + off, x = O.x + Math.cos(a) * O.wall * 0.5, z = O.z + Math.sin(a) * O.wall * 0.5;
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
  const posts = Math.round(O.r * 0.75);
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

  // --- where the camp guards stand, and the spot each one walks to and from on patrol ---
  const ring = O.wall * 0.8;
  O.posts = [
    { ...local(-1.8, -3.4), patrol: local(-1.8, -6.5) },          // either side of the gate
    { ...local(1.8, -3.4), patrol: local(1.8, -6.5) },
    { ...at(Math.PI / 2, 3.5), patrol: at(Math.PI / 2 + 0.8, 4.5) },   // by the campfire
    { ...at(-Math.PI / 2, 3.5), patrol: at(-Math.PI / 2 - 0.8, 4.5) },
    { ...at(Math.PI, O.wall * 0.45 - 2.8), patrol: at(Math.PI - 0.5, O.wall * 0.3) },   // in front of the commander
  ];
  for (const a of [1.3, -1.3, 2.0, -2.0, 2.7, -2.7, 3.4]) O.posts.push({ ...at(a, ring), patrol: at(a + (a > 0 ? 0.45 : -0.45), ring) });

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
