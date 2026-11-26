// Player settings, remembered by the browser between visits.
// If the browser won't save (private window), the game still works with the defaults.
const KEY = 'quadratics.settings';

export const DEFAULTS = {
  volume: 5,        // 0-10
  mouse: 5,         // first-person mouse speed, 1-10
  lowGraphics: false,
};

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export const settings = load();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not saved, still works */ }
}
