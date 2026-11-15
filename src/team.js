// Co-op teamwork: reviving a downed brother, and staying close enough to share the screen.
import * as THREE from 'three';
import { sfx } from './sound.js';

export class Team {
  constructor(scene, players, cfg) {
    this.cfg = cfg;
    // A glowing ring on the ground around a downed brother that fills up while he's revived.
    this.rings = players.map(p => {
      const color = new THREE.Color(p.bandColor);
      const base = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 1.15, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
      );
      const fill = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
      );
      base.visible = fill.visible = false;
      scene.add(base, fill);
      return { base, fill, shown: -1 };
    });
  }

  update(dt, players, time) {
    if (players.length < 2) {
      this.rings.forEach(r => { r.base.visible = r.fill.visible = false; });
      return;
    }
    const cfg = this.cfg;

    players.forEach((p, i) => {
      const ring = this.rings[i];
      if (p.alive) { ring.base.visible = ring.fill.visible = false; return; }

      // Is a standing brother close enough to help?
      const helper = players.find(o => o !== p && o.alive &&
        Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < cfg.reviveDistance);
      if (helper) p.reviveProgress += dt / cfg.reviveSeconds;
      else p.reviveProgress = Math.max(0, p.reviveProgress - dt * 0.5);

      if (p.reviveProgress >= 1) {
        p.revive(cfg.reviveHealth);
        sfx.levelUp();
        ring.base.visible = ring.fill.visible = false;
        return;
      }

      // Pulsing ring, plus a white arc showing revive progress.
      ring.base.visible = true;
      ring.base.position.set(p.pos.x, p.pos.y + 0.05, p.pos.z);
      ring.base.material.opacity = 0.3 + Math.sin(time * 5) * 0.15;
      const steps = Math.round(p.reviveProgress * 40);
      if (steps !== ring.shown) {
        ring.fill.geometry.dispose();
        ring.fill.geometry = new THREE.RingGeometry(1.0, 1.15, 40, 1, 0, Math.max(0.001, p.reviveProgress) * Math.PI * 2)
          .rotateX(-Math.PI / 2);
        ring.shown = steps;
      }
      ring.fill.visible = p.reviveProgress > 0;
      ring.fill.position.copy(ring.base.position).y += 0.01;
    });

    // Keep the brothers from getting too far apart: pull both toward the middle.
    const [a, b] = players;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > cfg.maxApart) {
      const push = (d - cfg.maxApart) / d;
      const movers = [a, b].filter(p => p.alive);
      const share = movers.length === 2 ? 0.5 : 1;
      for (const p of movers) {
        const sign = p === a ? 1 : -1;
        p.pos.x += dx * push * share * sign;
        p.pos.z += dz * push * share * sign;
      }
    }
  }
}
