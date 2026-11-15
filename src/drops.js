// Supply crates: one falls from the sky every 30 seconds with ammo or a special weapon.
import * as THREE from 'three';
import { buildCrate } from './models.js';
import { sfx } from './sound.js';

const SPECIAL_NAMES = { shotgun: 'SHOTGUN', katana: 'KATANA', smoke: 'SMOKE BOMBS' };

export class Drops {
  constructor(scene, world, effects, config) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.cfg = config.drops;
    this.specials = config.specials;
    this.weapons = config.weapons;
    this.crates = [];
    this.reset();
  }

  reset() {
    for (const c of this.crates) this.scene.remove(c.group, c.beam);
    this.crates = [];
    this.timer = this.cfg.firstDropSeconds;
  }

  // Somewhere 5-14 m from the brothers, in the open.
  spot(players) {
    const alive = players.filter(p => p.alive);
    const list = alive.length ? alive : players;
    const cx = list.reduce((a, p) => a + p.pos.x, 0) / list.length;
    const cz = list.reduce((a, p) => a + p.pos.z, 0) / list.length;
    const lim = this.world.limit - 2;
    for (let tries = 0; tries < 60; tries++) {
      const a = Math.random() * Math.PI * 2, d = 5 + Math.random() * 9;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
      if (this.world.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 1.2)) continue;
      if (this.world.streamDist(x, z) < 6) continue;   // not in the water
      return { x, z };
    }
    return { x: cx + 4, z: cz };
  }

  spawn(players) {
    const special = Math.random() < this.cfg.specialChance;
    const type = special ? ['shotgun', 'katana', 'smoke'][Math.floor(Math.random() * 3)] : 'ammo';
    const { x, z } = this.spot(players);
    const ground = this.world.heightAt(x, z);
    const group = buildCrate(special ? 'special' : 'ammo', special ? SPECIAL_NAMES[type] : 'AMMO');
    group.position.set(x, ground + 22, z);
    group.rotation.y = Math.random() * Math.PI;
    // A tall beam of light so you can spot the crate through the trees.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.5, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: special ? 0xff6a3a : 0xffd84a, transparent: true, opacity: 0.22,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      }),
    );
    beam.position.set(x, ground + 15, z);
    this.scene.add(group, beam);
    this.crates.push({ group, beam, type, x, z, ground, vy: 0, landed: false, t: 0 });
  }

  update(dt, players, hud) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.cfg.everySeconds;
      if (this.crates.length < this.cfg.maxCratesOnMap) {
        this.spawn(players);
        hud.toast('Supply crate incoming!');
      }
    }

    for (const c of this.crates) {
      c.t += dt;
      if (!c.landed) {
        c.vy -= 14 * dt;
        c.group.position.y += c.vy * dt;
        c.group.rotation.z = Math.sin(c.t * 3) * 0.08;
        if (c.group.position.y <= c.ground) {
          c.group.position.y = c.ground;
          c.group.rotation.z = 0;
          c.landed = true;
          sfx.crateLand();
          this.effects.burst(new THREE.Vector3(c.x, c.ground + 0.2, c.z), 'dirt', 25);
        }
      }
      c.beam.material.opacity = 0.16 + Math.sin(c.t * 4) * 0.06;

      if (!c.landed) continue;
      // Walk into a crate to pick it up.
      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) > 1.3) continue;
        this.collect(p, c, hud);
        break;
      }
    }
    this.crates = this.crates.filter(c => !c.taken);
  }

  collect(p, c, hud) {
    c.taken = true;
    this.scene.remove(c.group, c.beam);
    const name = `Brother ${p.index + 1}`;
    if (c.type === 'ammo') {
      p.ammo = Math.min(this.cfg.maxUziAmmo, p.ammo + this.cfg.ammoBullets);
      p.shurikens = Math.min(this.cfg.maxShurikens, p.shurikens + this.cfg.ammoShurikens);
      sfx.pickupAmmo();
      hud.toast(`${name}: +${this.cfg.ammoBullets} bullets, +${this.cfg.ammoShurikens} shurikens`);
    } else {
      const s = this.specials[c.type];
      const count = c.type === 'shotgun' ? s.shells : c.type === 'katana' ? s.swings : s.bombs;
      p.special = { type: c.type, count };
      p.switchTo(c.type);
      if (c.type === 'katana') sfx.katanaDraw(); else sfx.pickupWeapon();
      hud.toast(`${name} got the ${SPECIAL_NAMES[c.type].toLowerCase()}!  (Y / Q to switch)`);
    }
  }
}
