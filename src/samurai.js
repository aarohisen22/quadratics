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

function buildSamurai() {
  // Each samurai gets its own materials so it can flash and fade on its own.
  const mats = {
    armor: new THREE.MeshStandardMaterial({ color: 0x6a1515, roughness: 0.35, metalness: 0.2 }),
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
  shoulder.add(katana);
  body.add(shoulder);
  const leftArm = new THREE.Group(); leftArm.position.set(-0.3, 1.48, 0);
  leftArm.add(part(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), mats.cloth, 0, -0.28, 0));
  body.add(leftArm);

  return { root, body, legs, sword: shoulder, leftArm, mats: Object.values(mats) };
}

// The vine a samurai slides down on: a thin green rope hanging from the canopy, with a few leaves.
const VINE_TOP = 13;        // meters above the ground where the vine hangs from
const DROP_SECONDS = 1.4;   // time to slide all the way down
const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f5a22, roughness: 0.8 });
const vineLeafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a2a, roughness: 0.6, side: THREE.DoubleSide });
const vineGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5).translate(0, -0.5, 0);   // hangs down from its top
const vineLeafGeo = new THREE.PlaneGeometry(0.18, 0.1);
function buildVine() {
  const g = new THREE.Group();
  const rope = new THREE.Mesh(vineGeo, vineMat);
  rope.scale.y = VINE_TOP;
  g.add(rope);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(vineLeafGeo, vineLeafMat);
    leaf.position.set(0.05, -1 - Math.random() * (VINE_TOP - 3), 0);
    leaf.rotation.set(Math.random(), Math.random() * 6, 0.6);
    g.add(leaf);
  }
  return g;
}

export class Samurai {
  constructor(scene, world, cfg, x, z, toughness = 1, dropDelay = 0) {
    this.scene = scene;
    this.world = world;
    this.cfg = cfg;
    this.radius = 0.45;
    this.maxHealth = cfg.health * toughness;
    this.health = this.maxHealth;
    this.damage = cfg.damage * toughness;
    this.speed = cfg.speed * (0.9 + Math.random() * 0.2);
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.knock = new THREE.Vector2();
    this.facing = Math.random() * Math.PI * 2;
    // He arrives by sliding down a vine from the trees (waiting up there for dropDelay first).
    this.state = 'descend';
    this.timer = -dropDelay;
    this.vine = buildVine();
    this.vine.position.set(x, this.pos.y + VINE_TOP, z);
    scene.add(this.vine);
    this.slideSound = false;
    this.flash = 0;
    this.walkPhase = Math.random() * 6;
    this.gone = false;
    Object.assign(this, buildSamurai());
    this.root.scale.setScalar(1.15);
    this.root.position.copy(this.pos);
    this.root.position.y += VINE_TOP;   // up in the canopy until his turn
    scene.add(this.root);
    this.effects = null;                // set by combat, for the dust when he lands
  }

  // Sliding down the vine; can't be hit and doesn't attack until his feet touch the ground.
  updateDescend(dt) {
    this.timer += dt;
    const t = this.vine.userData.t = (this.vine.userData.t || 0) + dt;
    this.vine.rotation.z = Math.sin(t * 1.7) * 0.03;   // the vine sways
    this.vine.rotation.x = Math.sin(t * 1.3 + 1) * 0.03;
    if (this.timer < 0) {   // waiting his turn, hidden up in the leaves
      this.root.position.set(this.pos.x, this.pos.y + VINE_TOP, this.pos.z);
      return;
    }
    if (!this.slideSound) { this.slideSound = true; sfx.vineSlide(); }
    const k = Math.min(1, this.timer / DROP_SECONDS);
    const fall = k < 0.8 ? (k / 0.8) ** 1.6 * 0.95 : 0.95 + (k - 0.8) / 0.2 * 0.05;   // fast, then brakes at the bottom
    const height = (VINE_TOP - 2) * (1 - fall);
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

    // Find the closest ninja who is still standing and not hidden in smoke.
    // A samurai inside smoke can't see anyone at all.
    const inSmoke = (x, z) => smokes.some(sm => Math.hypot(sm.x - x, sm.z - z) < sm.r);
    const blind = inSmoke(this.pos.x, this.pos.z);
    let target = null, best = Infinity;
    for (const p of players) {
      if (!p.alive || blind || inSmoke(p.pos.x, p.pos.z)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < best) { best = d; target = p; }
    }

    let moveX = 0, moveZ = 0;
    if (target) {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      const turnRate = this.state === 'chase' ? 10 : 3;
      this.facing += diff * (1 - Math.exp(-turnRate * dt));

      this.timer -= dt;
      if (this.state === 'chase') {
        if (best > this.cfg.attackRange) { moveX = dx / best; moveZ = dz / best; }
        else { this.state = 'windup'; this.timer = this.cfg.windupSeconds; }
      } else if (this.state === 'windup' && this.timer <= 0) {
        this.state = 'strike'; this.timer = 0.18;
        sfx.swing();
        // Damage anyone in front of him and in reach.
        for (const p of players) {
          if (!p.alive) continue;
          const px = p.pos.x - this.pos.x, pz = p.pos.z - this.pos.z;
          const d = Math.hypot(px, pz);
          const facingDot = (px * Math.sin(this.facing) + pz * Math.cos(this.facing)) / (d || 1);
          if (d < this.cfg.attackRange + 0.5 && facingDot > 0.3) {
            p.hurt(this.damage);
            p.justHurt = true;
            sfx.hurt();
          }
        }
      } else if (this.state === 'strike' && this.timer <= 0) {
        this.state = 'recover'; this.timer = 0.55;
      } else if (this.state === 'recover' && this.timer <= 0) {
        this.state = 'chase';
      }
    }

    if (!target) {   // lost: wander about slowly
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
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < 1.1) { moveX += (dx / d) * (1.1 - d) * 2; moveZ += (dz / d) * (1.1 - d) * 2; }
    }

    const wade = this.world.waterDepthAt(this.pos.x, this.pos.z) > 0.25 ? 0.55 : 1;
    this.pos.x += (moveX * this.speed * wade + this.knock.x) * dt;
    this.pos.z += (moveZ * this.speed * wade + this.knock.y) * dt;
    this.knock.multiplyScalar(Math.exp(-8 * dt));
    for (const p of players) {
      if (!p.alive) continue;
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz), min = this.radius + p.radius;
      if (d > 0 && d < min) { this.pos.x = p.pos.x + dx / d * min; this.pos.z = p.pos.z + dz / d * min; }
    }
    this.world.resolveCollision(this.pos, this.radius, this.pos.y);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);

    this.animate(dt, Math.hypot(moveX, moveZ) > 0.1);
  }

  animate(dt, walking) {
    const k = walking ? 1 : 0;
    this.walkPhase += dt * 8;
    const swing = Math.sin(this.walkPhase) * 0.6 * k;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.6;
    this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.05 * k;

    // Sword arm: ready, raised high, slashing down, then recovering.
    const poses = { chase: -0.9, windup: -2.9, strike: -0.4, recover: -0.7 };
    const want = poses[this.state] ?? -0.9;
    const speed = this.state === 'strike' ? 40 : 10;
    this.sword.rotation.x += (want - this.sword.rotation.x) * (1 - Math.exp(-speed * dt));

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
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
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
}
