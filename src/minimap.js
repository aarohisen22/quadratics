// Round map in the bottom-left corner (every mode): the land around the brothers (VIEW meters)
// with the stream, big landmarks and rocks, and dots for the brothers, samurai, supply crates and the boss.
// Press M (controller: Back/View) for the full map of every area, with their names.
// It turns with the camera, so "up" on the map is always "up" on the screen.
// In first person it turns with your view, so "up" on the map is the way you are looking.
import * as THREE from 'three';

const SMALL = 168;  // CSS pixels (small map)
const BIG = 460;    // CSS pixels (full map)
const VIEW = 90;    // the small map shows this many meters around the brothers

export class Minimap {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.ctx = this.canvas.getContext('2d');
    this.full = false;
    this.resize();
    document.body.append(this.canvas);
    this.timer = 0;
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();

    // Things that never move: the stream line and the big solid things (ruins, plane, huts, boulders).
    this.stream = [];
    for (let x = -world.half; x <= world.half; x += 2) this.stream.push([x, world.streamZ(x)]);
    this.solids = world.obstacles.filter(o => o.r >= 0.9 && !o.tree).map(o => [o.x, o.z, o.r]);
  }

  show(on) { this.canvas.style.display = on ? '' : 'none'; }

  // Small map in the corner, or the full map in the middle of the screen.
  toggleFull(on = !this.full) {
    this.full = on;
    this.canvas.classList.toggle('full', on);
    this.resize();
    this.timer = 0;
  }
  resize() {
    const px = this.full ? BIG : SMALL;
    this.canvas.width = this.canvas.height = px * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // actors: { players, samurai, crates, boss }
  update(dt, camera, actors) {
    if (this.canvas.style.display === 'none') return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1 / 20;   // 20 updates a second is plenty

    // Screen directions on the ground: right and up as the camera sees them.
    camera.matrixWorld.extractBasis(this.right, this.up, new THREE.Vector3());
    const r = this.right.setY(0).normalize();
    const u = new THREE.Vector3(-r.z, 0, r.x);   // ground direction pointing "up" the screen
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    if (u.x * fwd.x + u.z * fwd.z < 0) u.negate();

    // Small map: centred between the brothers. Full map: the whole land.
    const live = (actors.players || []).filter(p => p.alive);
    const follow = live.length ? live : actors.players || [];
    const cx = this.full || !follow.length ? 0 : follow.reduce((a, p) => a + p.pos.x, 0) / follow.length;
    const cz = this.full || !follow.length ? 0 : follow.reduce((a, p) => a + p.pos.z, 0) / follow.length;
    const SIZE = this.full ? BIG : SMALL;
    const c = this.ctx, half = SIZE / 2, scale = (SIZE / 2 - 6) / (this.full ? this.world.half * 1.2 : VIEW);
    const map = (x, z) => { x -= cx; z -= cz; return [half + (x * r.x + z * r.z) * scale, half - (x * u.x + z * u.z) * scale]; };
    const reach = (this.full ? this.world.half * 1.5 : VIEW * 1.1);   // skip things further than this from the middle
    const near = (x, z, pad = 0) => Math.abs(x - cx) < reach + pad && Math.abs(z - cz) < reach + pad;

    c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    c.beginPath(); c.arc(half, half, half - 1, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(12,22,14,0.82)'; c.fillRect(0, 0, SIZE, SIZE);
    // The land itself (outside it is the dark edge of the map).
    const W = this.world.half;
    c.fillStyle = 'rgba(22,44,26,0.9)';
    c.beginPath();
    [[-W, -W], [W, -W], [W, W], [-W, W]].forEach(([x, z], i) => { const [px, py] = map(x, z); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.closePath(); c.fill();

    // Stream.
    c.strokeStyle = 'rgba(90,150,170,0.85)'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    this.stream.forEach(([x, z], i) => { const [px, py] = map(x, z); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.stroke();

    // Landmarks and boulders.
    c.fillStyle = 'rgba(150,150,135,0.55)';
    for (const [x, z, rad] of this.solids) {
      if (!near(x, z)) continue;
      const [px, py] = map(x, z);
      c.beginPath(); c.arc(px, py, Math.max(1.5, rad * scale), 0, Math.PI * 2); c.fill();
    }

    // Samurai territory (dashed red ring) and their camp (red flag).
    const O = this.world.outpost;
    if (O && actors.territory !== false) {
      const [ox, oy] = map(O.x, O.z);
      c.save();
      c.strokeStyle = 'rgba(255,70,60,0.75)'; c.lineWidth = 1.5; c.setLineDash([4, 4]);
      c.beginPath(); c.arc(ox, oy, O.r * scale, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(160,30,25,0.35)';
      c.beginPath(); c.arc(ox, oy, O.wall * scale, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3b281a'; c.lineWidth = 1.5;   // flag pole
      c.beginPath(); c.moveTo(ox, oy + 6); c.lineTo(ox, oy - 7); c.stroke();
      c.fillStyle = '#e8312a';
      c.beginPath(); c.moveTo(ox, oy - 7); c.lineTo(ox + 8, oy - 4.5); c.lineTo(ox, oy - 2); c.closePath(); c.fill();
      c.restore();
    }

    // Hideouts (green rings) and treehouses (brown squares with a ladder dot).
    c.strokeStyle = 'rgba(125,255,154,0.7)'; c.lineWidth = 1.5;
    for (const h of this.world.hideouts || []) {
      const [px, py] = map(h.x, h.z);
      c.beginPath(); c.arc(px, py, h.r * scale, 0, Math.PI * 2); c.stroke();
    }
    for (const h of this.world.treehouses || []) {
      const [px, py] = map(h.x, h.z);
      c.fillStyle = '#8a5a2b'; c.strokeStyle = '#e8d2a8'; c.lineWidth = 1;
      c.fillRect(px - 4, py - 4, 8, 8); c.strokeRect(px - 4, py - 4, 8, 8);
    }

    // Supply crates: yellow squares (green for health).
    c.fillStyle = '#ffd23a'; c.strokeStyle = '#000'; c.lineWidth = 1;
    for (const k of actors.crates || []) {
      if (k.taken) continue;
      const [px, py] = map(k.x, k.z);
      c.fillStyle = k.type === 'health' ? '#5aff7a' : '#ffd23a';   // health crates are green
      c.fillRect(px - 3.5, py - 3.5, 7, 7); c.strokeRect(px - 3.5, py - 3.5, 7, 7);
    }

    // Samurai: red dots.
    c.fillStyle = '#ff3b30';
    for (const s of actors.samurai || []) {
      if (!s.alive || s.hiddenOnMap || s.isBoss) continue;
      const [px, py] = map(s.pos.x, s.pos.z);
      c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2); c.fill();
    }

    // The boss: a big pulsing red ring.
    const b = actors.boss;
    if (b && b.alive) {
      const [px, py] = map(b.pos.x, b.pos.z);
      c.fillStyle = '#ff1a10'; c.strokeStyle = '#fff'; c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, 6 + Math.sin(performance.now() / 150) * 1.2, 0, Math.PI * 2); c.fill(); c.stroke();
    }

    // Area names (full map only): Japanese name big, English small underneath.
    if (this.full) {
      c.textAlign = 'center';
      for (const a of this.world.areas.list) {
        const [px, py] = map(a.x, a.z);
        c.strokeStyle = 'rgba(255,240,210,0.25)'; c.lineWidth = 1; c.setLineDash([3, 5]);
        c.beginPath(); c.arc(px, py, a.r * scale, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
        c.fillStyle = 'rgba(255,244,220,0.95)';
        c.font = '600 20px "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", "MS Mincho", serif';
        c.fillText(a.jp, px, py);
        c.font = '600 11px system-ui, sans-serif';
        c.fillStyle = 'rgba(255,244,220,0.75)';
        c.fillText(a.en, px, py + 14);
      }
    }

    // Brothers: arrows in their headband colors, pointing where they face.
    for (const p of actors.players || []) {
      const [px, py] = map(p.pos.x, p.pos.z);
      c.save();
      c.translate(px, py);
      const fx = Math.sin(p.facing ?? 0), fz = Math.cos(p.facing ?? 0);
      c.rotate(Math.atan2(fx * r.x + fz * r.z, fx * u.x + fz * u.z));
      c.fillStyle = p.alive ? '#' + p.bandColor.toString(16).padStart(6, '0') : '#888';
      c.strokeStyle = '#fff'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2.5); c.lineTo(-5, 5); c.closePath();
      c.fill(); c.stroke();
      c.restore();
    }
    c.restore();

    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.arc(half, half, half - 1, 0, Math.PI * 2); c.stroke();
  }
}
