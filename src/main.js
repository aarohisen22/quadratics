// Starts the game: sets up the 3D view, builds the jungle and runs the game loop.
import * as THREE from 'three';
import { CONFIG, LOW_GRAPHICS, PLAYER_NAMES } from './config.js';
import { World, cutaway } from './world.js';
import { setupLighting, Rain } from './weather.js';
import { Input } from './input.js';
import { Ninja } from './ninja.js';
import { CameraRig } from './camera.js';
import { Effects } from './effects.js';
import { Foam } from './foam.js';
import { Minimap } from './minimap.js';
import { buildTreehouses } from './treehouses.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { startSound, setVolume } from './sound.js';
import { Team } from './team.js';
import { Drops } from './drops.js';
import { FallingTrees } from './trees.js';
import { Versus } from './versus.js';
import { Sky } from './sky.js';
import { FpsView } from './fps.js';
import { Menu } from './menu.js';
import { TitleScene } from './title.js';
import { settings } from './settings.js';

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

const { sun, hemi } = setupLighting(renderer, scene, CONFIG.weather, LOW_GRAPHICS);
const world = new World(scene, CONFIG.world);
const rain = new Rain(scene, world, CONFIG.weather);
const input = new Input(renderer.domElement);
const rig = new CameraRig(camera, CONFIG.camera);
const effects = new Effects(scene);
effects.world = world;
const foam = new Foam(scene, world, effects);
buildTreehouses(world, scene, CONFIG.world.lookouts);
const combat = new Combat(scene, world, effects, CONFIG);

// Both brothers are built up front; 1-player mode only uses the first.
const allPlayers = [
  new Ninja(scene, world, CONFIG.player, CONFIG.weapons, { bandColor: 0xc0272d, x: -1, z: 0 }),
  new Ninja(scene, world, CONFIG.player, CONFIG.weapons, { bandColor: 0x2f7be0, x: 1, z: 0 }),
];
let players = allPlayers.slice(0, 1);
const hud = new Hud(allPlayers);
const minimap = new Minimap(world);
minimap.show(false);
const team = new Team(scene, allPlayers, CONFIG.coop);
const drops = new Drops(scene, world, effects, CONFIG);
const trees = new FallingTrees(scene, world, effects, rig, CONFIG.hazards);
combat.onObstacleHit = (obstacle, amount) => trees.onShot(obstacle, amount);
allPlayers.forEach((p, i) => { p.index = i; });
const versus = new Versus(world, CONFIG.versus);
const sky = new Sky({ scene, renderer, sun, hemi, rain, world });
combat.onLevelStart = (n, hud) => sky.forLevel(n, hud);
combat.onShake = v => { rig.shake = Math.max(rig.shake, v); };
combat.onHit = shooter => { if (shooter.view) hud.hitMarker(); };

// States: 'menu', 'playing', 'dying' (falling over), 'defeated', 'won' (VS winner)
let state = 'menu';
let dyingTimer = 0;
let playerCount = 1;
let mode = 'solo';   // 'solo', 'coop' or 'vs'
const fpsView = new FpsView(CONFIG.fps);
fpsView.scene.environment = scene.environment;   // metal needs something to reflect

function setPlayerCount(n) {
  playerCount = n;
  players = allPlayers.slice(0, n);
  allPlayers.forEach((p, i) => { p.root.visible = i < n; });
  hud.setCount(n);
}
setPlayerCount(1);

// First person on or off: camera, hidden body, crosshair, less aim help.
function setFirstPerson(on) {
  if (on) fpsView.activate(players[0]); else fpsView.deactivate();
  camera.fov = on ? CONFIG.fps.fieldOfView : 50;
  camera.near = on ? 0.05 : 0.1;
  camera.updateProjectionMatrix();
  combat.aimHelpOverride = on ? CONFIG.fps.aimHelpDegrees : null;
  hud.showCrosshair(on);
  effects.flashScale = on ? 0.22 : 1;   // the flash is right in front of your eyes in first person
  if (!on) rig.first = true;
}

function newGame() {
  combat.reset();
  drops.reset();
  foam.clear();
  trees.calm();   // fallen trees stay down; they only stand back up from the main menu
  hud.hideDefeat();
  combat.vs = mode === 'vs';
  if (mode === 'vs') {
    sky.random(true);   // every VS match gets a surprise weather
    combat.level = 0;
    versus.start(players);
    hud.banner('Fight!', 1.5);
  } else {
    players.forEach((p, i) => p.reset(players.length > 1 ? (i ? 1.5 : -1.5) : 0, 0));
    sky.set('rain', true);
    combat.startLevel(1, players, hud);
  }
  setFirstPerson(mode === 'fps');
  state = 'playing';
}

// ---------- title screen and start menu ----------
const title = new TitleScene(camera, world, scene);
const BASE_MOUSE = CONFIG.fps.mouseSensitivity;
function applySetting(name, v) {
  if (name === 'volume') setVolume(v / 10);
  if (name === 'mouse') CONFIG.fps.mouseSensitivity = BASE_MOUSE * v / 5;
  if (name === 'lowGraphics') location.reload();   // the graphics are built once, at the start
}
applySetting('volume', settings.volume);
applySetting('mouse', settings.mouse);
// Browsers only play sound after a click or key press, so the rain and lanterns start humming then.
const wakeSound = () => startSound(CONFIG.weather.rainVolume);
addEventListener('pointerdown', wakeSound, { once: true });
addEventListener('keydown', wakeSound, { once: true });

const menu = new Menu({
  onStart: (m, byMouse) => { if (m === 'fps' && byMouse) input.lockMouse(); beginGame(m); },
  onSetting: applySetting,
  describe: m => describeControls(m),
});

function beginGame(m) {
  mode = m;
  setPlayerCount(mode === 'coop' || mode === 'vs' ? 2 : 1);
  menu.hide();
  document.body.classList.remove('menu');
  title.end(rig);
  startSound(CONFIG.weather.rainVolume);
  newGame();
}
function openMenu() {
  combat.reset();
  drops.reset();
  trees.reset();
  foam.clear();
  combat.level = 0;
  combat.vs = false;
  hud.hideDefeat();
  setFirstPerson(false);
  if (document.pointerLockElement) document.exitPointerLock();
  setPlayerCount(2);          // both brothers stand on the title screen
  title.begin(allPlayers);
  sky.set('dusk', true);
  menu.reopen();
  document.body.classList.add('menu');
  state = 'menu';
}

// ---------- pause menu ----------
// The ❚❚ button, Esc, P or a controller's Start button pause the game (and leaving the window does too).
const pausedEl = document.getElementById('paused');
const pauseBtn = document.getElementById('pausebtn');
const pauseItems = [...document.querySelectorAll('.pbtn')];
let pauseSel = 0;
function selectPause(i) {
  pauseSel = (i + pauseItems.length) % pauseItems.length;
  pauseItems.forEach((b, j) => b.classList.toggle('selected', j === pauseSel));
}
function pauseGame() {
  if (state === 'menu' || menuPaused) return;
  menuPaused = paused = true;
  selectPause(0);
  pausedEl.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
function pauseChoice(act) {
  pausedEl.classList.add('hidden');
  menuPaused = paused = false;
  clock.getDelta();
  if (act === 'restart') newGame();
  else if (act === 'menu') openMenu();
  if (act !== 'menu' && mode === 'fps') { input.lockMouse(); input.takeLook(); }
}
pauseBtn.addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
pauseItems.forEach((b, i) => {
  b.addEventListener('mouseenter', () => selectPause(i));
  b.addEventListener('click', () => pauseChoice(b.dataset.act));
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pauseGame(); });
// While paused, the controller and keyboard still work the pause menu.
function pollPauseMenu() {
  const m = input.menu();
  if (m.up) selectPause(pauseSel - 1);
  if (m.down) selectPause(pauseSel + 1);
  if (m.confirm) pauseChoice(pauseItems[pauseSel].dataset.act);
  else if (m.pause || m.back) pauseChoice('resume');
}

// First person: clicking the game locks the mouse for looking around. Letting go (Esc) pauses.
renderer.domElement.addEventListener('click', () => { if (mode === 'fps' && state !== 'menu' && !input.mouseLocked && !menuPaused) input.lockMouse(); });
document.addEventListener('pointerlockchange', () => {
  if (mode === 'fps' && state === 'playing' && !input.mouseLocked && input.pads().length === 0) pauseGame();
});

// Tells the players who controls which brother.
function describeControls(mode) {
  const pads = input.pads().length;
  const playerCount = mode === 'coop' || mode === 'vs' ? 2 : 1;
  if (mode === 'fps') return pads ? 'Left stick move · right stick look · RT fire' : 'Mouse to look around (click to grab the mouse, Esc to pause) · WASD move · click to fire';
  if (playerCount === 1) return pads ? 'Use the controller or keyboard + mouse' : 'Keyboard + mouse (plug in a controller and press a button to use it)';
  if (pads >= 2) return `${PLAYER_NAMES[0]} (red): controller 1 · ${PLAYER_NAMES[1]} (blue): controller 2`;
  if (pads === 1) return `${PLAYER_NAMES[0]} (red): keyboard + mouse · ${PLAYER_NAMES[1]} (blue): the controller`;
  return `${PLAYER_NAMES[0]} (red): WASD + mouse · ${PLAYER_NAMES[1]} (blue): arrow keys, / fire, . shuriken, Right Shift jump`;
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
  if (state === 'menu') menu.updateWho();
}

const clock = new THREE.Clock();
let time = 0;
let paused = false;   // for testing from the browser console: game.paused = true
let menuPaused = false;   // paused by the player (the pause menu is showing)
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (menuPaused) pollPauseMenu();
  else if (!paused) step(dt);
  requestAnimationFrame(frame);
}
function step(dt) {
  time += dt;
  const keys = input.menu();

  const ctrls = players.map((p, i) => input.read(i, playerCount));
  if (state !== 'playing') ctrls.forEach(c => { c.fire = false; c.throwPressed = false; c.jumpPressed = false; });
  if (state === 'menu') ctrls.forEach(c => { c.move = { x: 0, y: 0, mag: 0 }; c.aim = null; c.aimMouse = false; });
  const fps = mode === 'fps' && state !== 'menu';
  if (fps) {
    // Look with the mouse or right stick; move relative to where you're looking.
    const look = input.takeLook(), c = ctrls[0];
    const stick = c.look || { x: 0, y: 0 };
    fpsView.turn(look.x * CONFIG.fps.mouseSensitivity + stick.x * CONFIG.fps.stickLookSpeed * dt,
                 look.y * CONFIG.fps.mouseSensitivity + stick.y * CONFIG.fps.stickLookSpeed * 0.7 * dt);
    c.move = fpsView.worldMove(c.move);
    c.aim = null;
    c.aimMouse = false;
  }
  players.forEach((p, i) => p.update(dt, ctrls[i], ctrls[i].aimMouse ? mouseAimPoint(p) : null));
  if (fps) players[0].facing = fpsView.yaw;

  if (state === 'menu') {
    menu.update(dt, keys);
  } else if (state === 'playing') {
    if (keys.pause) { pauseGame(); return; }
    if (keys.map) minimap.toggleFull();
    combat.update(dt, players, ctrls, hud);
    drops.update(dt, players, hud);
    trees.update(dt, players, combat.samurai, hud);
    team.update(dt, players, time, mode === 'coop');
    if (mode === 'vs') {
      versus.update(dt, players, hud);
      if (versus.winner) {
        state = 'won';
        const name = PLAYER_NAMES[versus.winner.index];
        hud.showEnd(`${name} wins!`, `Final score: ${PLAYER_NAMES[0]} ${versus.score[0]} – ${versus.score[1]} ${PLAYER_NAMES[1]}`, versus.winner.bandColor);
      }
    } else if (players.every(p => !p.alive)) { state = 'dying'; dyingTimer = 1.2; }
  } else if (state === 'dying') {
    combat.update(dt, players, ctrls, hud);
    dyingTimer -= dt;
    if (dyingTimer <= 0) { state = 'defeated'; hud.showDefeat(combat.level, playerCount); }
  } else if (state === 'defeated' || state === 'won') {
    combat.update(dt, players, ctrls, hud);  // samurai keep moving behind the message
    if (keys.confirm) newGame();
    else if (keys.back) openMenu();
  }

  if (fps) {
    fpsView.update(dt, camera, sky, effects.flashes[0].intensity);
    rig.focus.copy(players[0].pos);
  } else if (state === 'menu') {
    title.update(dt, players);
    rig.focus.copy(title.target);
  } else {
    rig.update(dt, players.map(p => p.pos));
  }
  allPlayers.forEach((p, i) => {
    if (i < playerCount && !fps && state !== 'menu') cutaway.uCutTargets.value[i].copy(p.pos);
    else cutaway.uCutTargets.value[i].set(0, -9999, 0);
  });

  // Keep the sun's shadows centered on the action.
  sky.update(dt, rig.focus);
  sun.position.copy(rig.focus).add(sky.sunOffset);
  sun.target.position.copy(rig.focus);

  world.update(dt);
  rain.update(dt, rig.focus);
  effects.update(dt);
  foam.update(dt, [...players, ...combat.samurai]);
  const status = mode === 'vs' && state !== 'menu' ? versus.text
    : combat.statusText();
  hud.update(dt, players, status);
  minimap.show(state !== 'menu');
  pauseBtn.classList.toggle('hidden', state === 'menu');
  minimap.update(dt, camera, { players, samurai: combat.samurai, crates: drops.crates, boss: combat.boss, territory: mode !== 'vs' });
  hud.bossBar(state === 'menu' ? null : combat.boss);
  updatePadInfo(dt);
  renderer.render(scene, camera);
  if (fps) fpsView.render(renderer);   // hands and weapon drawn on top
}
openMenu();
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  fpsView.resize();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Handy for testing in the browser console.
window.game = { scene, world, get players() { return players; }, allPlayers, combat, menu, title, team, drops, trees, foam, minimap, versus, sky, fpsView, camera, input, CONFIG, get state() { return state; }, step, renderer, rig, get paused() { return paused; }, set paused(v) { paused = v; } };
