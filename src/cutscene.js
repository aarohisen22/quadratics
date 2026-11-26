// Little films and conversations: the camera glides around a place while words appear at the bottom.
// A list of steps plays in order:
//   { place, seconds, text, sky?, event? }   a camera shot with a caption (moves on by itself)
//   { speaker, text, place? }                 someone talks (waits for Enter / A / a click)
// Enter, A or a click: next.  Esc or B: skip the whole thing.
import * as THREE from 'three';
import { SPEAKERS } from './story.js';
import { PLAYER_NAMES } from './config.js';

const $ = id => document.getElementById(id);

// {anay} and {arha} become the players' names.
export function fill(text, extra = {}) {
  return text.replace(/\{(\w+)\}/g, (m, k) => k === 'anay' ? PLAYER_NAMES[0] : k === 'arha' ? PLAYER_NAMES[1] : (extra[k] ?? m));
}

export class Cutscene {
  // places(name) -> { center: Vector3, dist, height } for the camera to circle.
  constructor(camera, places) {
    this.camera = camera;
    this.places = places;
    this.active = false;
    this.lookAt = new THREE.Vector3();
    this.film = $('film');
    this.caption = $('caption');
    this.dialog = $('dialog');
    const advance = e => { if (this.active) { e.preventDefault(); this.next(); } };
    this.film.addEventListener('click', advance);
    this.dialog.addEventListener('click', advance);
    $('skipfilm').addEventListener('click', e => { e.stopPropagation(); if (this.active) this.skip(); });
  }

  // Plays the steps; onEvent(name) for shot events ('steal', 'shine'), onSky(name), then done() at the end.
  play(steps, { onEvent, onSky, done } = {}) {
    this.steps = steps.filter(Boolean);
    Object.assign(this, { onEvent, onSky, done });
    this.i = -1;
    this.active = true;
    this.film.classList.remove('hidden');
    this.next();
  }

  next() {
    const cur = this.steps[this.i];
    // While words are still typing out, the first press shows them all.
    if (cur && this.typing < this.full?.length) { this.typing = this.full.length; return; }
    if (this.pending) { this.onEvent?.(this.pending); this.pending = null; }
    this.i++;
    if (this.i >= this.steps.length) { this.finish(); return; }
    const s = this.steps[this.i];
    if (s.sky) this.onSky?.(s.sky);
    if (s.place) this.startShot(s);
    this.pending = s.event || null;   // happens partway through the shot
    this.full = fill(s.text || '');
    this.typing = 0;
    this.t = 0;
    if (s.speaker) {
      const who = SPEAKERS[s.speaker] || { name: s.speaker, mark: '?', color: '#888' };
      this.dialog.classList.remove('hidden');
      this.caption.classList.add('hidden');
      $('dname').textContent = fill(who.name === 'Anay' ? '{anay}' : who.name === 'Arha' ? '{arha}' : who.name);
      $('dmark').textContent = who.mark;
      $('dmark').style.setProperty('--c', who.color);
    } else {
      this.dialog.classList.add('hidden');
      this.caption.classList.remove('hidden');
    }
  }

  startShot(s) {
    const P = this.places(s.place);
    if (!P) return;
    this.shot = { ...P, a0: P.angle ?? Math.random() * Math.PI * 2, seconds: s.seconds || 6 };
    this.lookAt.copy(P.center);
    this.shotT = 0;
    this.placeCamera(0);
  }

  placeCamera(t) {
    const S = this.shot;
    if (!S) return;
    const k = Math.min(1, t / S.seconds);
    const a = S.a0 + k * (S.turn ?? 0.45);
    const d = S.dist * (1 - k * 0.12);
    this.camera.position.set(S.center.x + Math.sin(a) * d, S.center.y + S.height + k * (S.rise ?? 1), S.center.z + Math.cos(a) * d);
    this.camera.lookAt(S.center);
  }

  skip() {
    // Events still happen (the Stone is stolen even if you skip the film).
    if (this.pending) { this.onEvent?.(this.pending); this.pending = null; }
    for (let j = this.i + 1; j < this.steps.length; j++) {
      const s = this.steps[j];
      if (s.event) this.onEvent?.(s.event);
      if (s.sky) this.onSky?.(s.sky);
    }
    this.finish();
  }

  finish() {
    this.active = false;
    this.shot = null;
    this.film.classList.add('hidden');
    this.dialog.classList.add('hidden');
    const d = this.done;
    this.done = null;
    d?.();
  }

  // keys = input.menu() (pressed this frame).
  update(dt, keys) {
    if (!this.active) return;
    if (keys.back || keys.pause) { this.skip(); return; }
    if (keys.confirm) { this.next(); if (!this.active) return; }
    const s = this.steps[this.i];
    this.t += dt;
    this.typing = Math.min(this.full.length, this.typing + dt * 45);
    const shown = this.full.slice(0, Math.floor(this.typing));
    if (s.speaker) $('dtext').textContent = shown;
    else this.caption.textContent = shown;
    this.shotT += dt;
    if (this.pending && this.t >= (s.seconds || 6) * 0.4) { this.onEvent?.(this.pending); this.pending = null; }
    this.placeCamera(this.shotT);
    // Shots move on by themselves; talking waits for a press.
    if (!s.speaker && this.t >= (s.seconds || 6)) this.next();
  }
}
