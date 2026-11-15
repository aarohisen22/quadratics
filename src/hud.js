// On-screen info: health bar with a number, ammo, level, messages.
const $ = id => document.getElementById(id);

export class Hud {
  constructor(players) {
    this.cards = players.map((p, i) => {
      const card = document.createElement('div');
      card.className = 'pcard';
      card.style.setProperty('--band', '#' + p.bandColor.toString(16).padStart(6, '0'));
      card.innerHTML = `
        <div class="name">Brother ${i + 1}</div>
        <div class="bar"><div class="fill"></div><div class="num"></div></div>
        <div class="ammo"><span class="uzi"></span><span class="shur"></span></div>`;
      $('players').append(card);
      return {
        fill: card.querySelector('.fill'), num: card.querySelector('.num'),
        uzi: card.querySelector('.uzi'), shur: card.querySelector('.shur'),
      };
    });
    this.hurtAlpha = 0;
    this.bannerTimer = 0;
  }

  update(dt, players, level, samuraiLeft) {
    players.forEach((p, i) => {
      const c = this.cards[i];
      const hp = Math.ceil(p.health);
      const frac = hp / p.cfg.health;
      c.fill.style.width = (frac * 100) + '%';
      c.fill.classList.toggle('low', frac <= 0.3);
      c.num.textContent = `Health ${hp} / ${p.cfg.health}`;
      c.uzi.textContent = `Uzi ${p.ammo}`;
      c.uzi.classList.toggle('out', p.ammo === 0);
      c.shur.textContent = `Shurikens ${p.shurikens}`;
      c.shur.classList.toggle('out', p.shurikens === 0);
      if (p.justHurt) { this.hurtAlpha = 0.9; p.justHurt = false; }
    });
    this.hurtAlpha = Math.max(0, this.hurtAlpha - dt * 2.5);
    $('hurt').style.opacity = this.hurtAlpha;
    $('level').textContent = `Level ${level} · Samurai left: ${samuraiLeft}`;
    $('level').style.visibility = level > 0 ? 'visible' : 'hidden';

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) $('banner').classList.remove('show');
    }
  }

  banner(text, seconds = 2) {
    $('banner').textContent = text;
    $('banner').classList.add('show');
    this.bannerTimer = seconds;
  }

  showDefeat(level) {
    $('defeat-text').textContent = `You reached level ${level}.`;
    $('defeat').classList.remove('hidden');
  }

  hideDefeat() { $('defeat').classList.add('hidden'); }
}
