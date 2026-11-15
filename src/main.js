// Starts the game: sets up the 3D view, builds the jungle and runs the game loop.
import * as THREE from 'three';
import { CONFIG, LOW_GRAPHICS } from './config.js';
import { World, cutaway } from './world.js';
import { setupLighting, Rain } from './weather.js';
import { Input } from './input.js';
import { Ninja } from './ninja.js';
import { CameraRig } from './camera.js';

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

// Phase 1: one brother. Phase 3 adds the second (blue headband).
const players = [new Ninja(scene, world, CONFIG.player, { bandColor: 0xc0272d, x: 0, z: 0 })];

// Start screen: a click is needed before the browser allows sound.
const start = document.getElementById('start');
start.addEventListener('click', () => {
  start.classList.add('hidden');
  rain.startSound();
});

// Mouse aiming: find where the mouse points at ninja height.
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();
function mouseAimPoint(ninja) {
  aimPlane.constant = -(ninja.pos.y + 1.2);
  raycaster.setFromCamera(new THREE.Vector2(input.mouse.x, input.mouse.y), camera);
  return raycaster.ray.intersectPlane(aimPlane, aimPoint);
}

const padsEl = document.getElementById('pads');
let hudTimer = 0;
function updateHud(dt) {
  hudTimer -= dt;
  if (hudTimer > 0) return;
  hudTimer = 0.5;
  const pads = input.pads();
  padsEl.textContent = pads.length
    ? pads.map((p, i) => `Controller ${i + 1}: connected`).join(' · ')
    : 'No controller found: press a button on it, or use the keyboard';
}

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  players.forEach((p, i) => {
    const ctrl = input.read(i);
    p.update(dt, ctrl, ctrl.aimMouse ? mouseAimPoint(p) : null);
  });

  rig.update(dt, players.map(p => p.pos));
  players.forEach((p, i) => cutaway.uCutTargets.value[i].copy(p.pos));

  // Keep the sun's shadows centered on the action.
  sun.position.set(rig.focus.x + 30, rig.focus.y + 40, rig.focus.z + 15);
  sun.target.position.copy(rig.focus);

  world.update(dt);
  rain.update(dt, rig.focus);
  updateHud(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Handy for testing in the browser console.
window.game = { scene, world, players, camera, CONFIG };
