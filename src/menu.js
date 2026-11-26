// The title screen menus: main menu, Free play (1 or 2 players), How to play and Settings.
// Works with the mouse, the keyboard (arrows + Enter, Esc to go back) and controllers (stick/d-pad + A, B back).
import { settings, saveSettings } from './settings.js';

const $ = sel => document.querySelector(sel);

// Each setting: how it shows, its range, and what changing it does.
const SETTINGS = {
  volume:      { min: 0, max: 10, show: v => v === 0 ? 'Off' : '■'.repeat(v) + '□'.repeat(10 - v) },
  mouse:       { min: 1, max: 10, show: v => '■'.repeat(v) + '□'.repeat(10 - v) },
  lowGraphics: { toggle: true, show: v => v ? 'On' : 'Off' },
};

export class Menu {
  // onStart(mode): 'solo' | 'coop' | 'vs' | 'fps'.  onSetting(name, value).  describe(mode): who controls what.
  constructor({ onStart, onSetting, describe }) {
    Object.assign(this, { onStart, onSetting, describe });
    this.root = $('#start');
    this.screens = Object.fromEntries([...document.querySelectorAll('#start .screen')].map(s => [s.dataset.screen, s]));
    this.whoEl = $('#who');
    this.noteEl = $('#menunote');
    this.history = [];
    this.noteTimer = 0;

    for (const screen of Object.values(this.screens)) {
      // Menu buttons never take keyboard focus, so Enter / Space can't "click" one a second time.
      screen.querySelectorAll('button').forEach(b => {
        b.tabIndex = -1;
        b.addEventListener('mousedown', e => e.preventDefault());
      });
      screen.querySelectorAll('.mi').forEach(item => {
        item.addEventListener('mouseenter', () => this.select(this.items().indexOf(item)));
        item.addEventListener('click', e => {
          if (e.target.closest('.arr')) return;   // the ◀ ▶ buttons handle themselves
          this.select(this.items().indexOf(item));
          this.activate(true);
        });
      });
      screen.querySelectorAll('.arr').forEach(b => b.addEventListener('click', () => {
        this.change(b.closest('.mi').dataset.set, +b.dataset.d);
      }));
    }
    this.refreshSettings();
    this.show('main', false);
  }

  get open() { return !this.root.classList.contains('hidden'); }

  items() { return [...this.screens[this.current].querySelectorAll('.mi')]; }

  show(name, remember = true) {
    if (remember && this.current) this.history.push({ name: this.current, sel: this.sel });
    this.current = name;
    for (const [n, s] of Object.entries(this.screens)) s.classList.toggle('hidden', n !== name);
    this.select(0);
  }

  back() {
    const prev = this.history.pop();
    if (!prev) return;
    this.show(prev.name, false);
    this.select(prev.sel);
  }

  select(i) {
    const items = this.items();
    this.sel = (i + items.length) % items.length;
    items.forEach((b, j) => b.classList.toggle('selected', j === this.sel));
    this.updateWho();
  }

  updateWho() {
    const mode = this.items()[this.sel]?.dataset.start;
    this.whoEl.textContent = mode ? this.describe(mode) : '';
  }

  // Enter / A / click on the highlighted item. `byMouse` matters for first person (it grabs the mouse).
  activate(byMouse = false) {
    const item = this.items()[this.sel];
    if (!item) return;
    const d = item.dataset;
    if (d.start) this.onStart(d.start, byMouse);
    else if (d.go) this.show(d.go);
    else if (d.set) this.change(d.set, 1, true);
    else if ('back' in d) this.back();
    else if (d.note) this.note(d.note);
  }

  // A short message under the menu (e.g. "coming soon").
  note(text) {
    this.noteEl.textContent = text;
    this.noteEl.classList.add('show');
    this.noteTimer = 3;
  }

  change(name, dir, wrap = false) {
    const def = SETTINGS[name];
    let v = settings[name];
    if (def.toggle) v = !v;
    else {
      v += dir;
      if (wrap && v > def.max) v = def.min;
      v = Math.max(def.min, Math.min(def.max, v));
    }
    if (v === settings[name]) return;
    settings[name] = v;
    saveSettings();
    this.refreshSettings();
    this.onSetting(name, v);
  }

  refreshSettings() {
    document.querySelectorAll('#start [data-set]').forEach(row => {
      row.querySelector('.val').textContent = SETTINGS[row.dataset.set].show(settings[row.dataset.set]);
    });
  }

  // Called every frame while the menu is open, with input.menu() (pressed-this-frame flags).
  update(dt, m) {
    if (this.noteTimer > 0 && (this.noteTimer -= dt) <= 0) this.noteEl.classList.remove('show');
    if (m.up) this.select(this.sel - 1);
    if (m.down) this.select(this.sel + 1);
    const item = this.items()[this.sel];
    if (item?.dataset.set && (m.left || m.right)) this.change(item.dataset.set, m.left ? -1 : 1);
    if (m.confirm) this.activate();
    else if (m.back) this.back();
  }

  hide() { this.root.classList.add('hidden'); }

  reopen() {
    this.history = [];
    this.show('main', false);
    this.root.classList.remove('hidden');
  }
}
