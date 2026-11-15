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
        <div class="ammo"><span class="uzi"></span><span class="spec"></span><span class="shur"></span></div>
        <div class="status"></div>`;
      $('players').append(card);
      return {
        el: card, fill: card.querySelector('.fill'), num: card.querySelector('.num'),
        uzi: card.querySelector('.uzi'), spec: card.querySelector('.spec'),
        shur: card.querySelector('.shur'), status: card.querySelector('.status'),
      };
    });
    this.hurtAlpha = 0;
    this.bannerTimer = 0;
  }

  // Show one or two player cards.
  setCount(n) {
    this.cards.forEach((c, i) => { c.el.style.display = i < n ? '' : 'none'; });
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
      c.uzi.classList.toggle('active', p.current === 'uzi' && !!p.special);
      const names = { shotgun: 'Shotgun', katana: 'Katana', smoke: 'Smoke' };
      c.spec.textContent = p.special ? `${names[p.special.type]} ${p.special.count}` : '';
      c.spec.classList.toggle('active', !!p.special && p.current === p.special.type);
      c.shur.textContent = `Shurikens ${p.shurikens}`;
      c.shur.classList.toggle('out', p.shurikens === 0);
      const down = !p.alive && players.length > 1;
      c.el.classList.toggle('down', down);
      if (down) {
        c.status.textContent = p.reviveProgress > 0
          ? `Reviving… ${Math.floor(p.reviveProgress * 100)}%`
          : 'DOWN! Brother, stand next to him to revive';
      }
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

  toast(text, seconds = 3) {
    $('toast').textContent = text;
    $('toast').classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => $('toast').classList.remove('show'), seconds * 1000);
  }

  banner(text, seconds = 2) {
    $('banner').textContent = text;
    $('banner').classList.add('show');
    this.bannerTimer = seconds;
  }

  showDefeat(level, playerCount) {
    $('defeat-text').textContent = playerCount > 1
      ? `Both brothers are down. You reached level ${level}.`
      : `You reached level ${level}.`;
    $('defeat').classList.remove('hidden');
  }

  hideDefeat() { $('defeat').classList.add('hidden'); }
}
