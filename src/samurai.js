// Samurai enemies: they chase the nearest ninja, raise their katana, then strike.
import * as THREE from 'three';
import { part, buildKatana } from './models.js';
import { sfx } from './sound.js';

// An Oni (demon) face mask: red face, angry brows, glowing eyes, fangs and horns.
// Built around the head's center, facing +z. Also used (bigger) by the mini boss.
export function buildOniMask(mats) {
  const g = new THREE.Group();
  // Face plate: the front half of a slightly squashed ball, from the brow down to the chin.
  const face = part(new THREE.SphereGeometry(0.195, 18, 12, 0, Math.PI, 0.32 * Math.PI, 0.6 * Math.PI), mats.oni);
  face.scale.set(1, 1.05, 1.08);
  g.add(face);
  // Cheek bumps and a broad nose.
  for (const s of [-1, 1]) {
    const cheek = part(new THREE.SphereGeometry(0.06, 10, 8), mats.oni, s * 0.09, -0.04, 0.155);
    cheek.scale.set(1, 0.8, 0.6);
    g.add(cheek);
  }
  const nose = part(new THREE.ConeGeometry(0.04, 0.08, 6), mats.oni, 0, -0.005, 0.21);
  nose.rotation.x = Math.PI / 2 + 0.5;
  g.add(nose);
  // Angry brows slanting down toward the middle, and glowing eyes under them.
  for (const s of [-1, 1]) {
    const brow = part(new THREE.BoxGeometry(0.11, 0.035, 0.05), mats.dark, s * 0.065, 0.075, 0.18);
    brow.rotation.z = s * 0.45;
    brow.rotation.y = s * -0.25;
    g.add(brow);
    const eye = part(new THREE.SphereGeometry(0.024, 10, 6), mats.eye, s * 0.062, 0.035, 0.185);
    eye.scale.set(1.4, 0.7, 0.6);
    eye.castShadow = false;
    g.add(eye);
  }
  // Open snarling mouth with fangs.
  const mouth = part(new THREE.BoxGeometry(0.13, 0.04, 0.04), mats.dark, 0, -0.1, 0.175);
  g.add(mouth);
  for (const s of [-1, 1]) {
    const up = part(new THREE.ConeGeometry(0.014, 0.06, 5), mats.fang, s * 0.05, -0.095, 0.195);
    g.add(up);                                            // bottom fangs point up
    const down = part(new THREE.ConeGeometry(0.011, 0.045, 5), mats.fang, s * 0.025, -0.09, 0.197);
    down.rotation.z = Math.PI;                            // top fangs point down
    g.add(down);
  }
  // Two horns sweeping up and out from the forehead.
  for (const s of [-1, 1]) {
    const horn = part(new THREE.ConeGeometry(0.035, 0.3, 7), mats.fang, s * 0.21, 0.26, 0.05);
    horn.rotation.z = -s * 0.6;
    horn.rotation.x = -0.2;
    g.add(horn);
  }
  return g;
}

// ---------- weapons for the other kinds of samurai ----------
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.6 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.5 });
const featherMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8, side: THREE.DoubleSide });
const tipMat = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, roughness: 0.3, metalness: 0.9 });
const chainMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.3, metalness: 0.9 });

// An arrow pointing +z, 0.8 m long, centered on its middle. Combat uses this for flying arrows too.
export function buildArrow() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.011, 0.011, 0.8, 5).rotateX(Math.PI / 2), woodMat));
  const tip = part(new THREE.ConeGeometry(0.025, 0.09, 6).rotateX(Math.PI / 2), tipMat, 0, 0, 0.44);
  g.add(tip);
  for (let i = 0; i < 3; i++) {   // three feathers at the back
    const f = part(new THREE.PlaneGeometry(0.05, 0.12), featherMat, 0, 0, -0.34);
    f.rotation.set(Math.PI / 2, 0, (i / 3) * Math.PI * 2);
    f.position.x = Math.cos((i / 3) * Math.PI * 2) * 0.02;
    f.position.y = Math.sin((i / 3) * Math.PI * 2) * 0.02;
    g.add(f);
  }
  return g;
}

// Bow for the left hand. The hand grips the middle; limbs go up and down, string toward the archer.
// Built for an arm pointing at the target: arm-frame -y = forward, +z = up.
function buildBow() {
  const g = new THREE.Group();
  const arc = 1.6, r = 0.5;
  const limbs = new THREE.TorusGeometry(r, 0.016, 5, 24, arc)
    .rotateZ(-Math.PI / 2 - arc / 2).translate(0, r, 0).rotateY(Math.PI / 2);
  g.add(part(limbs, darkWoodMat));
  g.add(part(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 6).rotateX(Math.PI / 2), woodMat));   // grip wrap
  const ends = r - r * Math.cos(arc / 2), half = r * Math.sin(arc / 2);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, ends, half), new THREE.Vector3(0, ends, 0), new THREE.Vector3(0, ends, -half)]);
  const string = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8e0c8 }));
  g.add(string);
  const arrow = buildArrow();
  arrow.rotation.x = Math.PI / 2;   // pointing forward (-y) from the string
  arrow.visible = false;
  g.add(arrow);
  g.userData = { string, ends, arrow };
  return g;
}

// Pull the bow string back (0 = resting, 1 = fully drawn) with an arrow on it.
function drawBow(bow, pull, nocked) {
  const { string, ends, arrow } = bow.userData;
  const back = ends + pull * 0.42;
  string.geometry.attributes.position.setY(1, back);
  string.geometry.attributes.position.needsUpdate = true;
  arrow.visible = nocked;
  arrow.position.set(0, back - 0.4, 0);
}

function buildQuiver() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 8), woodMat));
  for (let i = 0; i < 4; i++) {
    const a = buildArrow();
    a.rotation.x = -Math.PI / 2;
    a.position.set((i % 2 - 0.5) * 0.05, 0.22, (i < 2 ? -0.02 : 0.02));
    g.add(a);
  }
  return g;
}

// Nunchucks for the right hand: one stick held, a short chain, and a second stick that whirls.
function buildNunchucks() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), darkWoodMat, 0, -0.1, 0));
  const pivot = new THREE.Group();
  pivot.position.y = -0.26;
  g.add(pivot);
  for (let i = 0; i < 3; i++) pivot.add(part(new THREE.TorusGeometry(0.012, 0.004, 4, 8), chainMat, 0, -0.012 - i * 0.02, 0));
  pivot.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), darkWoodMat, 0, -0.21, 0));
  g.userData.pivot = pivot;
  return g;
}

const ARMOR = { sword: 0x6a1515, archer: 0x2c4a22, nunchuck: 0x2a2f6a };   // easy to tell apart from above

function buildSamurai(kind = 'sword') {
  // Each samurai gets its own materials so it can flash and fade on its own.
  const mats = {
    armor: new THREE.MeshStandardMaterial({ color: ARMOR[kind], roughness: 0.35, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x17161a, roughness: 0.5, metalness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.35, metalness: 0.8 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x2a2730, roughness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd0d6dc, roughness: 0.15, metalness: 0.95 }),
    oni: new THREE.MeshStandardMaterial({ color: 0xa3170f, roughness: 0.3, metalness: 0.15 }),
    fang: new THREE.MeshStandardMaterial({ color: 0xeee6cf, roughness: 0.4 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb300, emissiveIntensity: 1.2 }),
  };
  mats.eye.userData.glow = true;   // keeps its own glow when the samurai flashes
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const chest = part(new THREE.CapsuleGeometry(0.24, 0.38, 4, 10), mats.armor, 0, 1.3, 0);
  chest.scale.set(1.25, 1, 0.85);
  body.add(chest);
  // Armored skirt plates.
  const skirt = part(new THREE.CylinderGeometry(0.3, 0.42, 0.42, 8, 1, true), mats.armor, 0, 0.9, 0);
  body.add(skirt);
  const belt = part(new THREE.TorusGeometry(0.27, 0.03, 6, 16), mats.gold, 0, 1.08, 0);
  belt.rotation.x = Math.PI / 2;
  body.add(belt);

  // Helmet, face mask and golden crest.
  body.add(part(new THREE.SphereGeometry(0.18, 14, 10), mats.cloth, 0, 1.73, 0));
  const mask = buildOniMask(mats);
  mask.position.set(0, 1.71, 0.01);
  body.add(mask);
  const helmet = part(new THREE.SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.dark, 0, 1.84, -0.02);
  body.add(helmet);
  const brim = part(new THREE.CylinderGeometry(0.34, 0.38, 0.04, 14), mats.dark, 0, 1.85, -0.06);
  brim.rotation.x = -0.18;   // front tipped up so the Oni face shows
  body.add(brim);
  const crest = part(new THREE.TorusGeometry(0.16, 0.025, 4, 12, Math.PI), mats.gold, 0, 2.0, 0.1);
  crest.rotation.z = 0;
  body.add(crest);

  // Big shoulder plates.
  for (const side of [-1, 1]) {
    const plate = part(new THREE.BoxGeometry(0.22, 0.28, 0.3), mats.armor, side * 0.38, 1.45, 0);
    plate.rotation.z = side * 0.35;
    body.add(plate);
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.14, 0.95, 0);
    hip.add(part(new THREE.CapsuleGeometry(0.1, 0.6, 4, 8), mats.cloth, 0, -0.42, 0));
    hip.add(part(new THREE.BoxGeometry(0.14, 0.08, 0.28), mats.dark, 0, -0.9, 0.05));
    body.add(hip); legs.push(hip);
  }

  // Right arm holds the katana.
  const shoulder = new THREE.Group(); shoulder.position.set(0.3, 1.48, 0);
  shoulder.add(part(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), mats.cloth, 0, -0.28, 0));
  const katana = buildKatana(0.85);
  katana.position.set(0, -0.56, 0.02);
  katana.rotation.x = Math.PI / 2;
  katana.children[0].material = mats.steel;   // his own blade material, so it can glow before a big chop
  shoulder.add(katana);
  body.add(shoulder);
  const leftArm = new THREE.Group(); leftArm.position.set(-0.3, 1.48, 0);
  leftArm.add(part(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), mats.cloth, 0, -0.28, 0));
  body.add(leftArm);

  let bow = null, nunchucks = null;
  if (kind === 'archer') {
    katana.visible = false;
    bow = buildBow();
    bow.position.set(0, -0.56, 0);
    leftArm.add(bow);
    const quiver = buildQuiver();
    quiver.position.set(0.14, 1.35, -0.24);
    quiver.rotation.z = -0.35;
    body.add(quiver);
  } else if (kind === 'nunchuck') {
    katana.visible = false;
    nunchucks = buildNunchucks();
    nunchucks.position.set(0, -0.56, 0);
    shoulder.add(nunchucks);
  }

  return { root, body, legs, sword: shoulder, blade: katana, leftArm, bow, nunchucks, steel: mats.steel, mats: Object.values(mats) };
}

// The vine a samurai slides down on: a thin green rope hanging from the canopy, with a few leaves.
const VINE_TOP = 13;        // meters above the ground where the vine hangs from
const DROP_SECONDS = 1.4;   // time to slide all the way down
const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f5a22, roughness: 0.8 });
const vineLeafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a2a, roughness: 0.6, side: THREE.DoubleSide });
const vineGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5).translate(0, -0.5, 0);   // hangs down from its top
const vineLeafGeo = new THREE.PlaneGeometry(0.18, 0.1);
function buildVine(length) {
  const g = new THREE.Group();
  const rope = new THREE.Mesh(vineGeo, vineMat);
  rope.scale.y = length;
  g.add(rope);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(vineLeafGeo, vineLeafMat);
    leaf.position.set(0.05, -1 - Math.random() * (length - 3), 0);
    leaf.rotation.set(Math.random(), Math.random() * 6, 0.6);
    g.add(leaf);
  }
  return g;
}

export class Samurai {
  // vineTop: the height (above the ground here) of the leaves his vine hangs from.
  constructor(scene, world, cfg, x, z, toughness = 1, dropDelay = 0, kind = 'sword', vineTop = VINE_TOP) {
    this.scene = scene;
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.45;
    this.kind = kind;
    const K = cfg.kinds?.[kind] ?? { health: 1, speed: 1 };
    this.maxHealth = cfg.health * toughness * K.health;
    this.health = this.maxHealth;
    this.damage = cfg.damage * toughness;
    this.speed = cfg.speed * K.speed * (0.9 + Math.random() * 0.2);
    this.reload = 0.5 + Math.random();   // archers: time until the next arrow
    this.strafeSide = Math.random() < 0.5 ? 1 : -1;
    this.shoot = null;                   // set by combat: fires an arrow
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.knock = new THREE.Vector2();
    this.jumpY = 0;     // height of a jump over a log
    this.vy = 0;
    this.stuckT = 0;
    this.facing = Math.random() * Math.PI * 2;
    // He arrives by sliding down a vine from the trees (waiting up there for dropDelay first).
    this.state = 'descend';
    this.timer = -dropDelay;
    this.vineTop = Math.max(5, vineTop);
    this.vine = buildVine(this.vineTop);
    this.vine.position.set(x, this.pos.y + this.vineTop, z);
    scene.add(this.vine);
    this.slideSound = false;
    this.flash = 0;
    this.walkPhase = Math.random() * 6;
    this.gone = false;
    Object.assign(this, buildSamurai(kind));
    if (kind === 'archer') {   // red line on the ground showing where the arrow will fly
      this.aimLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
      this.aimLine.renderOrder = 4;
      this.aimLine.visible = false;
      scene.add(this.aimLine);
    }
    this.root.scale.setScalar(1.15);
    this.root.position.copy(this.pos);
    this.root.position.y += this.vineTop + 0.8;   // hidden up in the leaves until his turn
    scene.add(this.root);
    this.effects = null;                // set by combat, for the dust when he lands
  }

  // Marching out of the camp instead of sliding down a vine: no vine, he waits his turn (holdSeconds)
  // standing in the camp, then comes out of the gate.
  startOnGround(holdSeconds = 0) {
    if (this.vine) { this.scene.remove(this.vine); this.vine = null; }
    this.state = 'chase';
    this.timer = 0;
    this.holdT = holdSeconds;
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.root.position.copy(this.pos);
  }

  // Sliding down the vine; can't be hit and doesn't attack until his feet touch the ground.
  updateDescend(dt) {
    this.timer += dt;
    const t = this.vine.userData.t = (this.vine.userData.t || 0) + dt;
    this.vine.rotation.z = Math.sin(t * 1.7) * 0.03;   // the vine sways
    this.vine.rotation.x = Math.sin(t * 1.3 + 1) * 0.03;
    if (this.timer < 0) {   // waiting his turn, hidden up in the leaves
      this.root.position.set(this.pos.x, this.pos.y + this.vineTop + 0.8, this.pos.z);
      return;
    }
    if (!this.slideSound) { this.slideSound = true; sfx.vineSlide(); }
    const k = Math.min(1, this.timer / DROP_SECONDS);
    const fall = k < 0.8 ? (k / 0.8) ** 1.6 * 0.95 : 0.95 + (k - 0.8) / 0.2 * 0.05;   // fast, then brakes at the bottom
    const height = (this.vineTop - 2) * (1 - fall);
    // Hands up on the vine, legs together, sword arm too (he grips with both hands).
    this.sword.rotation.x = -3.0;
    this.leftArm.rotation.x = -3.0;
    this.legs[0].rotation.x = -0.25; this.legs[1].rotation.x = -0.1;
    this.root.position.set(this.pos.x, this.pos.y + height, this.pos.z);
    this.root.rotation.y = this.facing + Math.sin(this.timer * 3) * 0.3;   // spins a little on the rope
    if (k >= 1) {   // landed: thump, dust, and the vine pulls back up into the trees
      this.state = 'chase';
      this.timer = 0;
      this.leftArm.rotation.x = 0;
      sfx.thud();
      if (this.effects) {
        this.effects.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 'dirt', 12);
        this.effects.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 'chip', 4);
      }
      this.vineUp = 0;
    }
  }

  // After landing, the empty vine is pulled back up out of sight.
  updateVine(dt) {
    if (!this.vine || this.vineUp === undefined) return;
    this.vineUp += dt;
    this.vine.position.y += dt * 9 * Math.min(1, this.vineUp * 2);
    if (this.vineUp > 1.6) { this.scene.remove(this.vine); this.vine = null; }
  }

  get alive() { return this.state !== 'dead'; }
  get hiddenOnMap() { return this.state === 'descend' && this.timer < 0; }   // still hidden up in the trees

  // Returns true if this hit defeated him.
  hit(amount, dirX, dirZ, interrupt = false) {
    if (!this.alive || this.state === 'descend') return false;
    this.health -= amount;
    this.flash = 0.08;
    this.knock.x += dirX * (interrupt ? 6 : 1.5);
    this.knock.y += dirZ * (interrupt ? 6 : 1.5);
    if (interrupt && this.state === 'windup') { this.state = 'recover'; this.timer = 0.5; }
    if (this.health <= 0) {
      if (this.aimLine) this.aimLine.visible = false;
      this.state = 'dead';
      this.timer = 0;
      this.fallDir = Math.random() < 0.5 ? -1 : 1;
      sfx.enemyDown();
      return true;
    }
    return false;
  }

  update(dt, players, others, smokes = []) {
    this.flash -= dt;
    const glow = this.flash > 0 ? 1 : 0;
    for (const m of this.mats) if (!m.userData.glow) m.emissive.setScalar(glow * 0.8);

    this.updateVine(dt);
    if (this.state === 'dead') return this.updateDead(dt);
    if (this.state === 'descend') return this.updateDescend(dt);
    if (this.holdT > 0) {   // waiting in the camp for his turn to march out
      this.holdT -= dt;
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.facing;
      return;
    }

    // Find the closest ninja who is still standing and not hidden in smoke.
    // A samurai inside smoke can't see anyone at all.
    const inSmoke = (x, z) => smokes.some(sm => Math.hypot(sm.x - x, sm.z - z) < sm.r);
    const blind = inSmoke(this.pos.x, this.pos.z);
    let target = null, best = Infinity;
    for (const p of players) {
      if (!p.alive || blind) continue;
      // Too far from the camp: he gives up on you.
      if (this.leash && Math.hypot(p.pos.x - this.leash.x, p.pos.z - this.leash.z) > this.leash.r) continue;
      const spotted = p.revealed > 0;   // he just fired a gun: everyone knows where he is
      if (!spotted && inSmoke(p.pos.x, p.pos.z)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (!spotted && d > 3.5 && this.world.inHideout(p.pos.x, p.pos.z)) continue;   // hiding in the ruins: can't see him
      if (d < best) { best = d; target = p; }
    }

    let moveX = 0, moveZ = 0;
    this.reload -= dt;
    if (target && this.kind === 'archer') {
      // Archer: stay at shooting distance, draw the bow, shoot, reload.
      const A = this.cfg.archer;
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += diff * (1 - Math.exp(-(this.state === 'windup' ? 6 : 10) * dt));
      this.timer -= dt;
      if (this.state === 'chase') {
        if (best < A.keepAway) { moveX = -dx / best; moveZ = -dz / best; }        // too close: back off
        else if (best > A.shootRange) { moveX = dx / best; moveZ = dz / best; }  // too far: come closer
        else if (this.reload <= 0) {
          this.state = 'windup'; this.attack = 'bow'; this.timer = A.drawSeconds;
          sfx.bowDraw();
        } else {                                                                 // waiting to shoot: sidestep
          moveX = (-dz / best) * 0.45 * this.strafeSide; moveZ = (dx / best) * 0.45 * this.strafeSide;
        }
      } else if (this.state === 'windup' && this.timer <= 0) {
        // Let go: the arrow flies where he's aiming right now, so move and it misses.
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        const from = new THREE.Vector3(this.pos.x + fx * 0.6, this.pos.y + 1.65, this.pos.z + fz * 0.6);
        // Aim up (or down) at his chest, so arrows reach someone up a tree too.
        const dist = Math.max(1, Math.hypot(target.pos.x - from.x, target.pos.z - from.z));
        const slope = (target.pos.y + 1.2 - from.y) / dist;
        this.shoot?.(from, { x: fx, z: fz, slope }, this.damage * A.damage, this);
        sfx.bowShot();
        this.state = 'strike'; this.timer = 0.2;
        this.reload = A.reloadSeconds * (0.8 + Math.random() * 0.4);
        this.strafeSide = -this.strafeSide;
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = 0.35;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    } else if (target) {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      const turnRate = this.state === 'chase' ? 10 : 3;
      this.facing += diff * (1 - Math.exp(-turnRate * dt));

      this.timer -= dt;
      if (this.state === 'chase') {
        if (target.perch || target.climb) {   // he's up a tree: wait underneath, a little way out
          if (best > 3) { moveX = dx / best; moveZ = dz / best; }
        } else if (best > this.cfg.attackRange) { moveX = dx / best; moveZ = dz / best; }
        else {
          // Pick an attack: quick jab, side slash (from the left or right) or big overhead chop.
          const A = this.cfg.attacks;
          let r = Math.random(), name = 'chop';
          for (const k of Object.keys(A)) { if (r < A[k].chance) { name = k; break; } r -= A[k].chance; }
          if (this.kind === 'nunchuck') { name = 'combo'; sfx.nunchuckWhirl(); }
          this.attack = name;
          this.slashSide = Math.random() < 0.5 ? 1 : -1;
          this.state = 'windup'; this.timer = A[name].windup;
        }
      } else if (this.state === 'windup' && this.timer <= 0) {
        const a = this.cfg.attacks[this.attack];
        this.state = 'strike'; this.timer = a.hits ? a.hits * a.interval + 0.05 : 0.18;
        this.hitsDone = 1; this.nextHit = a.interval || 0;
        sfx.swing();
        if (this.attack === 'chop') sfx.thud();
        if (this.attack === 'jab') {   // lunges forward with the poke
          this.knock.x += Math.sin(this.facing) * 5;
          this.knock.y += Math.cos(this.facing) * 5;
        }
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.hitsDone < (this.cfg.attacks[this.attack].hits || 1)
                 && (this.nextHit -= dt) <= 0) {
        // The next hit of a combo.
        const a = this.cfg.attacks[this.attack];
        this.hitsDone++; this.nextHit = a.interval;
        sfx.swing();
        this.strikeHit(players, a);
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = this.cfg.attacks[this.attack].recover;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    }

    const L = this.leash;
    const home = L && Math.hypot(this.pos.x - L.x, this.pos.z - L.z);
    if (!target && L && home > L.camp) {   // nobody to fight: walk back to the camp
      const hx = (L.x - this.pos.x) / home, hz = (L.z - this.pos.z) / home;
      moveX = hx * 0.6; moveZ = hz * 0.6;
      const want = Math.atan2(hx, hz);
      this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * (1 - Math.exp(-5 * dt));
    } else if (!target) {   // lost: wander about slowly
      this.wanderT = (this.wanderT || 0) - dt;
      if (this.wanderT <= 0) { this.wanderT = 1 + Math.random() * 1.5; this.wanderDir = Math.random() * Math.PI * 2; }
      moveX = Math.sin(this.wanderDir) * 0.35;
      moveZ = Math.cos(this.wanderDir) * 0.35;
      const turn = Math.atan2(Math.sin(this.wanderDir - this.facing), Math.cos(this.wanderDir - this.facing));
      this.facing += turn * (1 - Math.exp(-4 * dt));
      if (this.state !== 'chase') { this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
    }

    // Keep a little space from other samurai and from the ninjas.
    for (const o of others) {
      if (o === this || !o.alive || o.state === 'descend') continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz), min = this.radius + (o.radius ?? 0.45) + 0.2;
      if (d > 0 && d < min) { moveX += (dx / d) * (min - d) * 2; moveZ += (dz / d) * (min - d) * 2; }
    }

    [moveX, moveZ] = this.steer(moveX, moveZ, dt);
    const startX = this.pos.x, startZ = this.pos.z;
    const wade = (this.world.waterDepthAt(this.pos.x, this.pos.z) > 0.25 ? 0.55 : 1) * (this.jumpY > 0 ? 1.4 : 1);   // leaps forward when jumping
    this.pos.x += (moveX * this.speed * wade + this.knock.x) * dt;
    this.pos.z += (moveZ * this.speed * wade + this.knock.y) * dt;
    this.knock.multiplyScalar(Math.exp(-8 * dt));
    for (const p of players) {
      if (!p.alive || p.perch || p.climb) continue;
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz), min = this.radius + p.radius;
      if (d > 0 && d < min) { this.pos.x = p.pos.x + dx / d * min; this.pos.z = p.pos.z + dz / d * min; }
    }
    this.world.resolveCollision(this.pos, this.radius, this.pos.y + this.jumpY);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);

    // Jumping: up and back down again.
    if (this.jumpY > 0 || this.vy > 0) {
      this.vy -= 18 * dt;
      this.jumpY += this.vy * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.vy = 0; if (this.isBoss) sfx.thud(); }
    }
    // Stuck? (trying to walk but hardly moving) Then try the other way around, or jump.
    const wanted = Math.hypot(moveX, moveZ) * this.speed * wade * dt;
    const moved = Math.hypot(this.pos.x - startX, this.pos.z - startZ);
    if (wanted > 0.01 && moved < wanted * 0.3) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > 0.6) {
      this.stuckT = 0;
      this.detourSide = -(this.detourSide || 1);
      this.detourT = 1.4;
      if (this.jumpY === 0) this.vy = 7.5;   // and hop, in case it's something low
    }

    this.animate(dt, Math.hypot(moveX, moveZ) > 0.1);
    this.root.position.y += this.jumpY;
  }

  // Look ahead along the way he wants to walk: jump over anything low (logs, low walls),
  // and walk around the side of anything tall (boulders, trees, ruins, the plane).
  steer(mx, mz, dt) {
    this.detourT = Math.max(0, (this.detourT || 0) - dt);
    const mag = Math.hypot(mx, mz);
    if (mag < 0.1) return [mx, mz];
    const dx = mx / mag, dz = mz / mag;
    const feet = this.pos.y + this.jumpY;
    const look = 1.4 + this.radius;
    let block = null, blockT = Infinity, cross = 0;
    for (const o of this.world.obstacles) {
      const ox = o.x - this.pos.x, oz = o.z - this.pos.z;
      const t = ox * dx + oz * dz;                       // how far ahead
      if (t < -0.2 || t > look + o.r) continue;
      const side = ox * dz - oz * dx;                    // how far to the side of the path
      if (Math.abs(side) > o.r + this.radius) continue;
      if (feet > (o.base ?? 0) + o.h) continue;          // already above it
      if (t < blockT) { block = o; blockT = t; cross = side; }
    }
    if (!block) return [mx, mz];
    const top = (block.base ?? this.pos.y) + block.h - this.pos.y;
    if (top < 1.25) {                                    // low: jump it
      if (this.jumpY === 0 && this.vy === 0 && blockT < block.r + this.radius + 1.1) this.vy = 7.5;
      return [mx, mz];
    }
    // Tall: go round the side it's not leaning to, and keep going that way for a moment.
    if (!this.detourT) { this.detourSide = cross > 0 ? 1 : -1; this.detourT = 0.8; }
    const s = this.detourSide;
    const tx = -dz * s, tz = dx * s;                     // sideways along the obstacle
    const k = Math.min(1, (look + block.r - blockT) / look);
    const nx = dx * (1 - k) + tx * (0.6 + k), nz = dz * (1 - k) + tz * (0.6 + k);
    const n = Math.hypot(nx, nz) || 1;
    return [nx / n * mag, nz / n * mag];
  }

  // Damage anyone in reach and inside this attack's arc.
  strikeHit(players, a) {
    for (const p of players) {
      if (!p.alive || p.perch || p.climb) continue;   // up a tree: out of reach
      const px = p.pos.x - this.pos.x, pz = p.pos.z - this.pos.z;
      const d = Math.hypot(px, pz);
      const facingDot = (px * Math.sin(this.facing) + pz * Math.cos(this.facing)) / (d || 1);
      if (d < a.range + 0.3 && facingDot > a.arc) {
        p.hurt(this.damage * a.damage);
        p.justHurt = true;
        sfx.hurt();
      }
    }
  }

  animate(dt, walking) {
    const k = walking ? 1 : 0;
    this.walkPhase += dt * 8;
    const swing = Math.sin(this.walkPhase) * 0.6 * k;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.6;
    this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.05 * k;

    // Sword arm and body twist for each attack: [shoulder x, shoulder z, body twist, body lean].
    const s = this.slashSide || 1;
    const POSES = {
      jab:   { windup: [-1.25, 0.15, -0.55, -0.05], strike: [-1.62, 0.0, 0.25, 0.2] },        // pull back, then thrust
      slash: { windup: [-1.5, 0.25 * s, -1.4 * s, 0],         // twists right round with the sword out to one side...
               strike: [-1.5, 0.25 * s, 1.1 * s, 0.1] },       // ...then sweeps it flat across in front
      chop:  { windup: [-3.05, 0.1, 0, -0.1], strike: [-0.35, 0.05, 0, 0.25] },                // way up high, then down hard
    };
    let pose = [-0.9, 0, 0, 0];                       // ready stance
    const atk = POSES[this.attack];
    if (atk && this.state === 'windup') pose = atk.windup;
    else if (atk && this.state === 'strike') pose = atk.strike;
    else if (this.state === 'recover') pose = [-0.7, 0.1, 0, 0];
    const speed = this.state === 'strike' ? 30 : this.state === 'windup' ? 9 : 8;
    const b = 1 - Math.exp(-speed * dt);
    if (this.kind !== 'archer') {   // archers pose their own arms (animateArcher)
      this.sword.rotation.x += (pose[0] - this.sword.rotation.x) * b;
      this.sword.rotation.z += (pose[1] - this.sword.rotation.z) * b;
      this.body.rotation.y += (pose[2] - this.body.rotation.y) * b;
    }
    this.body.rotation.x += (pose[3] - this.body.rotation.x) * b;
    // For the side slash the blade sticks straight out from his arm, so it sweeps wide and flat.
    const flat = this.attack === 'slash' && (this.state === 'windup' || this.state === 'strike');
    const bladeWant = flat ? Math.PI * 0.95 : Math.PI / 2;
    this.blade.rotation.x += (bladeWant - this.blade.rotation.x) * b;
    // The big chop's blade glows red while he winds up: get out of the way!
    const glowing = this.state === 'windup' && this.attack === 'chop';
    if (glowing) this.steel.emissive.setRGB(1.0, 0.12, 0.05).multiplyScalar(0.6 + Math.sin(performance.now() / 60) * 0.4);

    if (this.kind === 'archer') this.animateArcher(dt, b);
    if (this.kind === 'nunchuck') this.animateNunchucks(dt);

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
  }

  // Bow arm out at the target, string hand pulling back, and the red aim line on the ground.
  animateArcher(dt, b) {
    const drawing = this.state === 'windup';
    const k = drawing ? 1 - Math.max(0, this.timer) / this.cfg.archer.drawSeconds : 0;
    const aiming = drawing || this.state === 'strike';
    // Right (string) arm: forward and pulled in to the chest while drawing.
    const rx = aiming ? -1.45 : -0.35, rz = aiming ? -0.25 - k * 0.2 : 0.05;
    this.sword.rotation.x += (rx - this.sword.rotation.x) * b;
    this.sword.rotation.z += (rz - this.sword.rotation.z) * b;
    this.body.rotation.y += ((aiming ? -0.35 : 0) - this.body.rotation.y) * b;
    if (aiming) { this.leftArm.rotation.x = -1.55; this.leftArm.rotation.z = -0.15; }
    else { this.leftArm.rotation.z = 0; }
    drawBow(this.bow, drawing ? k : 0, drawing);
    // The red line grows stronger as he gets ready to let go.
    const line = this.aimLine;
    line.visible = drawing;
    if (drawing) {
      line.position.set(this.pos.x, this.pos.y + 0.12, this.pos.z);
      line.rotation.y = this.facing;
      line.scale.z = this.cfg.archer.shootRange + 2;
      line.material.opacity = 0.12 + k * 0.4;
    }
  }

  // The free stick whirls while winding up and during the combo, and hangs down otherwise.
  animateNunchucks(dt) {
    const pivot = this.nunchucks.userData.pivot;
    const spinning = this.state === 'windup' || this.state === 'strike';
    if (spinning) pivot.rotation.x -= dt * 28;
    else pivot.rotation.x += (Math.round(pivot.rotation.x / (Math.PI * 2)) * Math.PI * 2 - pivot.rotation.x) * (1 - Math.exp(-6 * dt));
    if (this.state === 'strike') {   // quick hits swinging back and forth
      this.body.rotation.y = Math.sin(this.timer * 45) * 0.6;
      this.sword.rotation.x = -1.6;
      this.sword.rotation.z = 0.2;
    } else if (this.state === 'windup') {
      this.sword.rotation.x += (-2.3 - this.sword.rotation.x) * (1 - Math.exp(-14 * dt));
    }
  }

  // Falls over, then sinks and fades away.
  updateDead(dt) {
    this.timer += dt;
    const fall = Math.min(1, this.timer * 2.2);
    this.root.rotation.z = this.fallDir * fall * Math.PI / 2 * 0.95;
    this.pos.x += this.knock.x * dt; this.pos.z += this.knock.y * dt;
    this.knock.multiplyScalar(Math.exp(-6 * dt));
    this.root.position.set(this.pos.x, this.world.heightAt(this.pos.x, this.pos.z) + 0.15 * fall, this.pos.z);
    if (this.timer > 1.5) {
      const fade = Math.max(0, 1 - (this.timer - 1.5) / 1.2);
      for (const m of this.mats) { m.transparent = true; m.opacity = fade; }
      this.root.position.y -= (1 - fade) * 0.4;
      if (fade === 0) this.remove();
    }
  }

  remove() {
    this.gone = true;
    if (this.vine) { this.scene.remove(this.vine); this.vine = null; }
    if (this.aimLine) { this.scene.remove(this.aimLine); this.aimLine = null; }
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
}
