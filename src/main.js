// Starts the game: sets up the 3D view, builds the jungle and runs the game loop.
import * as THREE from 'three';
import { CONFIG, LOW_GRAPHICS } from './config.js';
import { World, cutaway } from './world.js';
import { setupLighting, Rain } from './weather.js';
import { Input } from './input.js';
import { Ninja } from './ninja.js';
import { CameraRig } from './camera.js';
import { Effects } from './effects.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { startSound } from './sound.js';
import { Team } from './team.js';
import { Drops } from './drops.js';
import { FallingTrees } from './trees.js';
import { Versus } from './versus.js';

const renderer = new THREE.WebGLRenderer({ antialias: !LOW_GRAPHICS, powerPreference: 'high-performance' });
renderer.setPixelRatio(LOW_GRAPHICS ? 1 : Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = !LOW_GRAPHICS;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);

const sun = setupLighting(renderer, scene, CONFIG.weather, LOW_GRAPHICS);
const world = new World(scene, CONFIG.world);
const rain = new Rain(scene, world, CONFIG.weather);
const input = new Input(renderer.domElement);
const rig = new CameraRig(camera, CONFIG.camera);
const effects = new Effects(scene);
effects.world = world;
const combat = new Combat(scene, world, effects, CONFIG);

// Both brothers are built up front; 1-player mode only uses the first.
const allPlayers = [
  new Ninja(scene, world, CONFIG.player, CONFIG.weapons, { bandColor: 0xc0272d, x: -1, z: 0 }),
  new Ninja(scene, world, CONFIG.player, CONFIG.weapons, { bandColor: 0x2f7be0, x: 1, z: 0 }),
];
let players = allPlayers.slice(0, 1);
const hud = new Hud(allPlayers);
const team = new Team(scene, allPlayers, CONFIG.coop);
const drops = new Drops(scene, world, effects, CONFIG);
const trees = new FallingTrees(scene, world, effects, rig, CONFIG.hazards);
combat.onObstacleHit = (obstacle, amount) => trees.onShot(obstacle, amount);
allPlayers.forEach((p, i) => { p.index = i; });
const versus = new Versus(world, CONFIG.versus);

// States: 'menu', 'playing', 'dying' (falling over), 'defeated', 'won' (VS winner)
let state = 'menu';
let dyingTimer = 0;
let playerCount = 1;
let mode = 'solo';   // 'solo', 'coop' or 'vs'
const MODES = ['solo', 'coop', 'vs'];

function setPlayerCount(n) {
  playerCount = n;
  players = allPlayers.slice(0, n);
  allPlayers.forEach((p, i) => { p.root.visible = i < n; });
  hud.setCount(n);
}
setPlayerCount(1);

function newGame() {
  combat.reset();
  drops.reset();
  trees.reset();
  hud.hideDefeat();
  combat.vs = mode === 'vs';
  if (mode === 'vs') {
    combat.level = 0;
    versus.start(players);
    hud.banner('Fight!', 1.5);
  } else {
    players.forEach((p, i) => p.reset(players.length > 1 ? (i ? 1.5 : -1.5) : 0, 0));
    combat.startLevel(1, players, hud);
  }
  state = 'playing';
}

// ---------- start menu ----------
const start = document.getElementById('start');
const modeButtons = [...document.querySelectorAll('.mode')];
let selected = 0;
function selectMode(i) {
  selected = i;
  mode = MODES[i];
  modeButtons.forEach((b, j) => b.classList.toggle('selected', j === i));
  setPlayerCount(mode === 'solo' ? 1 : 2);
}
function beginGame() {
  start.classList.add('hidden');
  startSound(CONFIG.weather.rainVolume);
  newGame();
}
function openMenu() {
  combat.reset();
  drops.reset();
  trees.reset();
  combat.level = 0;
  combat.vs = false;
  hud.hideDefeat();
  players.forEach((p, i) => p.reset(players.length > 1 ? (i ? 1.5 : -1.5) : 0, 0));
  start.classList.remove('hidden');
  state = 'menu';
}
modeButtons.forEach((b, i) => {
  b.addEventListener('mouseenter', () => selectMode(i));
  b.addEventListener('click', () => { selectMode(i); beginGame(); });
});

// Tells the players who controls which brother.
const whoEl = document.getElementById('who');
function describeControls() {
  const pads = input.pads().length;
  if (playerCount === 1) return pads ? 'Use the controller or keyboard + mouse' : 'Keyboard + mouse (plug in a controller and press a button to use it)';
  if (pads >= 2) return 'Red brother: controller 1 · Blue brother: controller 2';
  if (pads === 1) return 'Red brother: keyboard + mouse · Blue brother: the controller';
  return 'Red brother: WASD + mouse · Blue brother: arrow keys, / fire, . shuriken, Right Shift jump';
}

// Mouse aiming: find where the mouse points at ninja height.
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();
const mouseNdc = new THREE.Vector2();
function mouseAimPoint(ninja) {
  aimPlane.constant = -(ninja.pos.y + 1.2);
  raycaster.setFromCamera(mouseNdc.set(input.mouse.x, input.mouse.y), camera);
  return raycaster.ray.intersectPlane(aimPlane, aimPoint);
}

const padsEl = document.getElementById('pads');
let padTimer = 0;
function updatePadInfo(dt) {
  padTimer -= dt;
  if (padTimer > 0) return;
  padTimer = 0.5;
  const pads = input.pads();
  padsEl.textContent = pads.length
    ? pads.map((p, i) => `Controller ${i + 1}: connected`).join(' · ')
    : 'No controller found: press a button on it, or use the keyboard';
  whoEl.textContent = describeControls();
}

const clock = new THREE.Clock();
let time = 0;
let paused = false;   // for testing from the browser console: game.paused = true
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) step(dt);
  requestAnimationFrame(frame);
}
function step(dt) {
  time += dt;
  const menu = input.menu();

  const ctrls = players.map((p, i) => input.read(i, playerCount));
  if (state !== 'playing') ctrls.forEach(c => { c.fire = false; c.throwPressed = false; c.jumpPressed = false; });
  if (state === 'menu') ctrls.forEach(c => { c.move = { x: 0, y: 0, mag: 0 }; });
  players.forEach((p, i) => p.update(dt, ctrls[i], ctrls[i].aimMouse ? mouseAimPoint(p) : null));

  if (state === 'menu') {
    if (menu.left) selectMode(Math.max(0, selected - 1));
    if (menu.right) selectMode(Math.min(MODES.length - 1, selected + 1));
    if (menu.confirm) beginGame();
  } else if (state === 'playing') {
    combat.update(dt, players, ctrls, hud);
    drops.update(dt, players, hud);
    trees.update(dt, players, combat.samurai, hud);
    team.update(dt, players, time, mode === 'coop');
    if (mode === 'vs') {
      versus.update(dt, players, hud);
      if (versus.winner) {
        state = 'won';
        const name = versus.winner.index ? 'Blue' : 'Red';
        hud.showEnd(`${name} brother wins!`, `Final score: Red ${versus.score[0]} – ${versus.score[1]} Blue`, versus.winner.bandColor);
      }
    } else if (players.every(p => !p.alive)) { state = 'dying'; dyingTimer = 1.2; }
  } else if (state === 'dying') {
    combat.update(dt, players, ctrls, hud);
    dyingTimer -= dt;
    if (dyingTimer <= 0) { state = 'defeated'; hud.showDefeat(combat.level, playerCount); }
  } else if (state === 'defeated' || state === 'won') {
    combat.update(dt, players, ctrls, hud);  // samurai keep moving behind the message
    if (menu.confirm) newGame();
    else if (menu.back) openMenu();
  }

  rig.update(dt, players.map(p => p.pos));
  allPlayers.forEach((p, i) => {
    if (i < playerCount) cutaway.uCutTargets.value[i].copy(p.pos);
    else cutaway.uCutTargets.value[i].set(0, -9999, 0);
  });

  // Keep the sun's shadows centered on the action.
  sun.position.set(rig.focus.x + 30, rig.focus.y + 40, rig.focus.z + 15);
  sun.target.position.copy(rig.focus);

  world.update(dt);
  rain.update(dt, rig.focus);
  effects.update(dt);
  const status = mode === 'vs' && state !== 'menu' ? versus.text
    : combat.level > 0 ? `Level ${combat.level} · Samurai left: ${combat.samuraiLeft}` : '';
  hud.update(dt, players, status);
  updatePadInfo(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Handy for testing in the browser console.
window.game = { scene, world, get players() { return players; }, allPlayers, combat, team, drops, trees, versus, camera, input, CONFIG, get state() { return state; }, step, renderer, rig, get paused() { return paused; }, set paused(v) { paused = v; } };
