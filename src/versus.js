// VS mode: the brothers fight each other. First to 5 knock-downs wins.
import { sfx } from './sound.js';

import { PLAYER_NAMES as NAMES } from './config.js';

export class Versus {
  constructor(world, cfg) {
    this.world = world;
    this.cfg = cfg;
    this.score = [0, 0];
    this.winner = null;
  }

  // An open spot for a brother, as far as possible from where the other one is.
  spawnSpot(awayFrom) {
    const lim = this.world.limit - 4;
    let best = null, bestD = -1;
    for (let tries = 0; tries < 40; tries++) {
      const x = (Math.random() * 2 - 1) * Math.min(lim, 22);
      const z = (Math.random() * 2 - 1) * Math.min(lim, 22);
      if (this.world.blocked(x, z, 1)) continue;
      const d = awayFrom ? Math.hypot(awayFrom.x - x, awayFrom.z - z) : 0;
      // Not too close, not so far the shared camera has to zoom way out.
      if (awayFrom && (d < 12 || d > this.cfg.spawnApart + 4)) continue;
      if (d > bestD) { best = { x, z }; bestD = d; }
    }
    return best || { x: awayFrom ? -awayFrom.x : 0, z: awayFrom ? -awayFrom.z : 0 };
  }

  start(players) {
    this.score = [0, 0];
    this.winner = null;
    const half = this.cfg.spawnApart / 2;
    const spots = [{ x: -half, z: 0 }, { x: half, z: 0 }].map(s => {
      // nudge out of any tree or rock
      for (let i = 0; i < 20 && this.world.blocked(s.x, s.z, 1); i++) s.z += 1;
      return s;
    });
    players.forEach((p, i) => { p.reset(spots[i].x, spots[i].z); p.facing = i ? -Math.PI / 2 : Math.PI / 2; });
  }

  update(dt, players, hud) {
    if (this.winner) return;
    players.forEach((p, i) => {
      const other = players[1 - i];
      if (!p.alive && p.respawnIn === null) {
        // Knocked down: the other brother scores (also for trees and other accidents).
        const scorer = p.lastAttacker && p.lastAttacker !== p ? p.lastAttacker : other;
        this.score[scorer.index]++;
        p.respawnIn = this.cfg.respawnSeconds;
        if (this.score[scorer.index] >= this.cfg.killsToWin) {
          this.winner = scorer;
          sfx.levelUp();
          return;
        }
        hud.toast(`${NAMES[scorer.index]} scores! ${this.score[0]} – ${this.score[1]}`);
      } else if (!p.alive) {
        p.respawnIn -= dt;
        if (p.respawnIn <= 0) {
          const s = this.spawnSpot(other.pos);
          p.reset(s.x, s.z);
          sfx.pickupWeapon();
        }
      }
    });
  }

  get text() {
    return `Red ${this.score[0]} – ${this.score[1]} Blue · first to ${this.cfg.killsToWin}`;
  }
}
