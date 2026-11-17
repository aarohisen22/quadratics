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

    // The Oni Warlord's health bar across the top.
    this.bossEl = document.createElement('div');
    this.bossEl.id = 'bossbar';
    this.bossEl.innerHTML = '<div class="bname">Oni Warlord</div><div class="bbar"><div class="bfill"></div></div>';
    this.bossEl.style.display = 'none';
    document.body.append(this.bossEl);
    this.bossFill = this.bossEl.querySelector('.bfill');
    this.bossNameEl = this.bossEl.querySelector('.bname');
  }

  bossBar(boss) {
    const show = !!boss && boss.state !== 'descend';
    this.bossEl.style.display = show ? '' : 'none';
    if (show) {
      this.bossFill.style.width = Math.max(0, boss.health / boss.maxHealth * 100) + '%';
      if (this.bossNameEl.textContent !== boss.bossName) this.bossNameEl.textContent = boss.bossName;
    }
  }

  // Show one or two player cards.
  setCount(n) {
    this.cards.forEach((c, i) => { c.el.style.display = i < n ? '' : 'none'; });
  }

  // status: the text in the corner (level and samurai, or the VS score); '' hides it.
  update(dt, players, status) {
    players.forEach((p, i) => {
      const c = this.cards[i];
      const hp = Math.ceil(p.health);
      const frac = hp / p.cfg.health;
      c.fill.style.width = (frac * 100) + '%';
      c.fill.classList.toggle('low', frac <= 0.3);
      c.num.textContent = `Health ${hp} / ${p.cfg.health}`;
      c.uzi.textContent = `Uzi ${p.ammo}`;
      c.uzi.classList.toggle('out', p.ammo === 0);
      c.uzi.classList.toggle('active', p.current === 'uzi' && p.weaponsOwned.length > 1);
      const names = { shotgun: 'Shotgun', smoke: 'Smoke', gatling: 'Gatling' };
      const parts = [];
      if (p.special) parts.push(p.current === p.special.type ? `<b>${names[p.special.type]} ${p.special.count}</b>` : `${names[p.special.type]} ${p.special.count}`);
      if (p.hasKatana) parts.push(p.current === 'katana' ? '<b>Katana</b>' : 'Katana');
      c.spec.innerHTML = parts.join(' · ');
      c.spec.classList.toggle('active', p.current !== 'uzi' && p.weaponsOwned.length > 1);
      c.shur.textContent = `Shurikens ${p.shurikens}`;
      c.shur.classList.toggle('out', p.shurikens === 0);
      const down = !p.alive && players.length > 1;
      c.el.classList.toggle('down', down);
      const hidden = p.alive && (p.hidden || p.perch);
      c.el.classList.toggle('hiding', !!hidden);
      if (hidden && !down) c.status.textContent = p.perch ? 'UP A TREE (walk off the edge to get down)' : 'HIDDEN';
      if (down) {
        c.status.textContent = p.respawnIn !== null && p.respawnIn !== undefined
          ? `Back in ${Math.max(1, Math.ceil(p.respawnIn))}…`
          : p.reviveProgress > 0
          ? `Reviving… ${Math.floor(p.reviveProgress * 100)}%`
          : 'DOWN! Brother, stand next to him to revive';
      }
      if (p.justHurt) { this.hurtAlpha = 0.9; p.justHurt = false; }
    });
    this.hurtAlpha = Math.max(0, this.hurtAlpha - dt * 2.5);
    $('hurt').style.opacity = this.hurtAlpha;
    $('level').textContent = status;
    $('level').style.visibility = status ? 'visible' : 'hidden';

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) $('banner').classList.remove('show');
    }
  }

  // Red circle flash on the crosshair when your shot lands.
  hitMarker() {
    $('crosshair').classList.add('hit');
    clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => $('crosshair').classList.remove('hit'), 90);
  }

  showCrosshair(on) { $('crosshair').classList.toggle('hidden', !on); }

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

  // End screen for VS: who won, in their headband color.
  showEnd(title, text, color) {
    $('defeat-title').textContent = title;
    $('defeat-title').style.color = '#' + color.toString(16).padStart(6, '0');
    $('defeat-text').textContent = text;
    $('defeat').classList.remove('hidden');
  }

  showDefeat(level, playerCount) {
    $('defeat-title').textContent = 'Defeated';
    $('defeat-title').style.color = '';
    $('defeat-text').textContent = playerCount > 1
      ? `Both brothers are down. You reached level ${level}.`
      : `You reached level ${level}.`;
    $('defeat').classList.remove('hidden');
  }

  hideDefeat() { $('defeat').classList.add('hidden'); }
}
