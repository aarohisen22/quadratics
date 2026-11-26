// Story mode: the quest for the Quadratic Stone, five chapters, one per area.
// Each chapter: a talk at the shrine → follow the golden beam to the area → beat the waves → beat the
// leader → pick up the piece of the Stone → a short talk → the next chapter.
// All the words are in story.js. Progress is saved in the browser after every chapter.
import * as THREE from 'three';
import { Samurai } from './samurai.js';
import { StonePiece } from './stone.js';
import { CHAPTERS, INTRO, ENDING, CREDITS, MESSAGES, SPEAKERS } from './story.js';
import { fill } from './cutscene.js';
import { sfx } from './sound.js';

const KEY = 'quadratics.story';
export function loadProgress() {
  try { return { chapter: 0, round: 1, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { chapter: 0, round: 1 }; }
}
function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not saved, still works */ }
}

const LEADER_HEALTH = 6;     // a captain has this many times the health of his warriors
const LEADER_DAMAGE = 1.25;
const QUIET = 5;             // seconds between waves
const ROUND_TOUGHNESS = 1.4; // every warrior this much tougher each round after the first

export class StoryMode {
  constructor({ scene, world, combat, effects, hud, sky, stone, beacon, cutscene, onCredits }) {
    Object.assign(this, { scene, world, combat, effects, hud, sky, stone, beacon, cutscene, onCredits });
    this.phase = 'off';
    this.piece = null;
    this.tmp = new THREE.Vector3();
  }

  get chapter() { return CHAPTERS[this.index]; }
  get area() { return this.world.areas.byId[this.chapter.area]; }
  get busy() { return this.cutscene.active || this.phase === 'credits'; }   // players can't move

  // Where the camera looks in films.
  places(name, players) {
    const W = this.world, H = (x, z) => W.heightAt(x, z);
    if (name === 'stone') {
      const c = this.stone.top;
      return { center: c, dist: 5.5, height: 0.6, angle: this.stone.group.rotation.y - 0.35, turn: 0.7, rise: 0.3 };
    }
    if (name === 'castle') {
      const C = W.castle || W.areas.byId.castle;
      return { center: new THREE.Vector3(C.x, H(C.x, C.z) + 13, C.z), dist: 40, height: 6, angle: 0.3, turn: 0.35 };
    }
    if (name === 'torii') {
      return { center: new THREE.Vector3(0, H(0, -2) + 1.2, -2), dist: 7.5, height: 1.4, angle: 0.2, turn: 0.35, rise: 0.4 };
    }
    if (name === 'players') {
      const live = players.filter(p => p.alive);
      const ps = live.length ? live : players;
      const c = ps.reduce((a, p) => a.add(p.pos), new THREE.Vector3()).divideScalar(ps.length);
      c.y += 1.2;
      return { center: c, dist: 6.5, height: 2.6, angle: 0.25, turn: 0.4, rise: 0.4 };
    }
    const A = W.areas.byId[name];
    if (A) return { center: new THREE.Vector3(A.x, H(A.x, A.z) + 3, A.z), dist: 24, height: 13, turn: 0.4 };
    return null;
  }

  // ---------- starting ----------

  // A fresh story (or Continue): chapter `index` of `round`, starting at shrine hill.
  begin(players, index, round) {
    this.index = index;
    this.round = round;
    this.players = players;
    this.phase = 'film';
    this.combat.reset();
    this.combat.level = 0;
    this.combat.hud = this.hud;
    this.removePiece();
    players.forEach((p, i) => { p.facing = (i ? -0.25 : 0.25); });   // facing the camera (south), for the films
    const intro = index === 0 && round === 1 ? INTRO : [];
    // The opening film starts with the Stone whole (it gets stolen in the film).
    this.stone.set(intro.length ? 4 : Math.min(index, 4), index < 4);
    this.briefing(intro);
  }

  // Try again after being beaten: back to the edge of the area, the fight starts again when you go in.
  retry(players) {
    this.players = players;
    this.combat.reset();
    this.removePiece();
    const A = this.area, d = Math.hypot(A.x, A.z) || 1;
    const r = A.r + 6;
    const x = A.x - A.x / d * r, z = A.z - A.z / d * r;
    players.forEach((p, i) => p.reset(x + (players.length > 1 ? (i ? 1.5 : -1.5) : 0), z));
    this.startTravel(true);
  }

  // The shrine keeper's talk before a chapter (after the opening film, the first time).
  briefing(before = []) {
    const C = this.chapter;
    const lines = C.start.map(([speaker, text], i) => ({ speaker, text, place: i === 0 ? 'stone' : undefined }));
    this.phase = 'film';
    this.play([...before, ...lines], () => this.startTravel());
  }

  play(steps, done) {
    this.cutscene.play(steps, {
      onSky: name => this.sky.set(name, true),
      onEvent: e => this.event(e),
      done,
    });
  }

  event(e) {
    if (e === 'steal') {
      this.stone.set(0);
      this.effects.burst(this.stone.top, 'spark', 30);
      sfx.thud?.();
    }
    if (e === 'shine') { this.stone.set(4, true); this.stone.shine = 1; sfx.levelUp(); }
  }

  startTravel(again = false) {
    const C = this.chapter, A = this.area;
    this.phase = 'travel';
    this.sky.set(C.sky);
    this.beacon.show(A.x, this.world.heightAt(A.x, A.z), A.z);
    if (!again) this.hud.banner(`<span class="jp">${C.jp}</span><span class="en">${C.title}</span>`, 3.5);
    else this.hud.toast(fill(MESSAGES.goTo, { place: C.title }), 4);
  }

  // ---------- fighting ----------

  get toughness() {
    return (1 + 0.15 * this.index) * Math.pow(ROUND_TOUGHNESS, this.round - 1);
  }

  startFight() {
    const C = this.chapter, A = this.area;
    this.phase = 'fight';
    this.beacon.hide();
    this.wave = 0;
    this.quiet = 2;
    this.mine = [];
    // The warriors belong to this area: they won't chase you far out of it.
    this.combat.camp = { x: A.x, z: A.z, r: A.r + 12, wall: 10 };
    this.hud.toast(fill(C.arrive), 5);
  }

  spawnWave() {
    const C = this.chapter;
    const alive = this.players.filter(p => p.alive);
    const size = C.waves[this.wave] + (this.players.length > 1 ? 2 : 0);
    this.wave++;
    this.mine = [];
    for (let i = 0; i < size; i++) {
      const spot = this.combat.spawnSpot(alive), delay = i * 0.45 + Math.random() * 0.3;
      const s = new Samurai(this.scene, this.world, this.combat.samuraiCfg, spot.x, spot.z, this.toughness, delay, pick(C.kinds), spot.vineTop);
      this.combat.arrive(s, spot, delay);
      this.mine.push(this.combat.enlist(s));
    }
  }

  spawnLeader() {
    const C = this.chapter, L = C.leader;
    this.phase = 'leader';
    const [who, line] = C.leaderLine;
    this.hud.toast(`${SPEAKERS[who]?.name ?? who}: “${fill(line)}”`, 5);
    if (L.kind === 'daimyo' || L.kind === 'shogun') {
      this.combat.toughness = this.toughness;
      this.combat.startBoss(this.players, this.hud, L.kind);
      this.leader = this.combat.boss;
      return;
    }
    const alive = this.players.filter(p => p.alive);
    const spot = this.combat.spawnSpot(alive, null, 10, 20);
    const s = new Samurai(this.scene, this.world, this.combat.samuraiCfg, spot.x, spot.z, this.toughness, 0.5, L.kind, spot.vineTop);
    s.maxHealth *= LEADER_HEALTH;
    s.health = s.maxHealth;
    s.damage *= LEADER_DAMAGE;
    s.root.scale.multiplyScalar(1.3);
    s.isBoss = true;
    s.bossName = L.name;
    this.combat.arrive(s, spot, 0.5);
    this.combat.enlist(s);
    this.leader = s;
    sfx.taiko?.();
    this.hud.banner(L.name, 3);
  }

  // ---------- each frame ----------

  update(dt, players) {
    this.players = players;
    if (this.phase === 'off' || this.busy) return;
    const A = this.area;
    const alive = players.filter(p => p.alive);
    if (!alive.length) return;

    if (this.phase === 'travel') {
      const inside = alive.some(p => Math.hypot(p.pos.x - A.x, p.pos.z - A.z) < A.r * 0.7);
      if (inside) this.startFight();
    } else if (this.phase === 'fight') {
      const left = this.mine.filter(s => s.alive).length;
      if (left === 0) {
        this.quiet -= dt;
        if (this.quiet <= 0) {
          if (this.wave < this.chapter.waves.length) {
            this.spawnWave();
            if (this.wave > 1) this.hud.toast(MESSAGES.waveDone, 3);
          } else {
            this.hud.toast(MESSAGES.leaderComing, 3);
            this.spawnLeader();
          }
          this.quiet = QUIET;
        }
      }
    } else if (this.phase === 'leader') {
      if (this.leader && !this.leader.alive) this.leaderBeaten();
    } else if (this.phase === 'piece') {
      this.piece.update(dt);
      if (alive.some(p => Math.hypot(p.pos.x - this.piece.pos.x, p.pos.z - this.piece.pos.z) < 1.8)) this.collect();
    }
  }

  leaderBeaten() {
    const pos = this.leader.pos;
    this.leader = null;
    this.combat.camp = null;
    // The rest of the warriors run off (they disappear).
    for (const s of this.combat.samurai) if (s.alive && !s.gone) s.remove();
    this.combat.samurai = this.combat.samurai.filter(s => !s.gone);
    sfx.levelUp();
    if (this.index === CHAPTERS.length - 1) { this.victory(); return; }
    this.phase = 'piece';
    this.piece = new StonePiece(this.scene, this.world, pos.x, pos.z);
    this.beacon.show(pos.x, this.world.heightAt(pos.x, pos.z), pos.z);
    this.hud.banner(MESSAGES.pickUp, 3);
  }

  collect() {
    this.removePiece();
    this.beacon.hide();
    const n = this.index + 1;
    sfx.pickupAmmo?.();
    this.hud.banner(`<span class="jp">石 ${n}/4</span><span class="en">${fill(MESSAGES.gotPiece, { n })}</span>`, 3);
    this.stone.set(n, n < 4);
    // Fresh for the next chapter: full health and ammo, and anyone who was down gets up.
    for (const p of this.players) {
      if (!p.alive) p.revive(1);
      p.health = p.cfg.health;
      p.ammo = p.weapons.uziAmmo;
      p.shurikens = p.weapons.shurikens;
    }
    this.advance();
  }

  // Next chapter (saved), after the chapter's closing talk.
  advance() {
    const C = this.chapter;
    this.index++;
    saveProgress({ chapter: this.index, round: this.round });
    this.phase = 'film';
    const lines = C.win.map(([speaker, text], i) => ({ speaker, text, place: i === 0 ? 'players' : undefined }));
    this.play(lines, () => this.briefing());
  }

  victory() {
    this.phase = 'film';
    saveProgress({ chapter: 0, round: this.round + 1 });
    this.play(ENDING, () => this.credits());
  }

  credits() {
    this.phase = 'credits';
    this.onCredits?.(CREDITS.map(([a, b]) => [fill(a), fill(b)]), this.round + 1);
  }

  removePiece() {
    if (this.piece) { this.piece.remove(); this.piece = null; }
  }

  stop() {
    this.phase = 'off';
    this.combat.camp = null;
    this.removePiece();
    this.beacon.hide();
    if (this.cutscene.active) { this.cutscene.done = null; this.cutscene.finish(); }
    this.stone.set(4, true);
  }

  // What the bar at the top says.
  statusText(players) {
    if (this.phase === 'off' || this.busy) return '';
    const C = this.chapter, A = this.area, head = `Chapter ${this.index + 1}`;
    if (this.phase === 'travel') {
      const live = players.filter(p => p.alive);
      const d = Math.min(...live.map(p => Math.hypot(p.pos.x - A.x, p.pos.z - A.z)));
      return `${head} · ${fill(MESSAGES.goTo, { place: C.title })} · ${Math.max(0, Math.round(d - A.r * 0.7))} m`;
    }
    if (this.phase === 'fight') return `${head} · Wave ${Math.max(1, this.wave)}/${C.waves.length} · Warriors left: ${this.mine.filter(s => s.alive).length}`;
    if (this.phase === 'leader') return `${head} · Beat ${SPEAKERS[C.leader.speaker]?.name ?? 'the leader'}!`;
    if (this.phase === 'piece') return `${head} · ${MESSAGES.pickUp}`;
    return head;
  }

  // For the minimap: where to go (the golden ring).
  get objective() {
    if (this.phase === 'travel') return { x: this.area.x, z: this.area.z };
    if (this.phase === 'piece' && this.piece) return { x: this.piece.pos.x, z: this.piece.pos.z };
    return null;
  }
}

// Picks a rank from a mix like { yari: 0.5, yumi: 0.3, teppo: 0.2 }.
function pick(mix) {
  let r = Math.random() * Object.values(mix).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(mix)) { if ((r -= w) <= 0) return k; }
  return Object.keys(mix)[0];
}
