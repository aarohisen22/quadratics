// The areas of the big map. Each one is held by a different rank of warrior, and the brothers
// work their way up: bamboo grove (ronin) -> cedar forest (ashigaru) -> village (samurai)
// -> maple valley (hatamoto + the Daimyo) -> castle (the Shogun). Shrine hill in the middle is safe.
// Positions are for the 420 m map and are scaled for other sizes.

const LAYOUT = [
  { id: 'shrine',  jp: '神社',   en: 'Shrine hill',  x: 0,    z: 0,    r: 45, rank: null,       season: null },
  { id: 'bamboo',  jp: '竹林',   en: 'Bamboo grove', x: -120, z: 120,  r: 75, rank: 'ronin',    season: 'spring' },
  { id: 'cedar',   jp: '杉の森', en: 'Cedar forest', x: -130, z: -55,  r: 75, rank: 'ashigaru', season: 'summer' },
  { id: 'village', jp: '村',     en: 'Village',      x: 125,  z: 75,   r: 70, rank: 'samurai',  season: 'autumn' },
  { id: 'maple',   jp: '紅葉谷', en: 'Maple valley', x: 120,  z: -110, r: 70, rank: 'hatamoto', season: 'autumn' },
  { id: 'castle',  jp: '城',     en: 'Castle',       x: 0,    z: -160, r: 55, rank: 'shogun',   season: 'winter' },
];

const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export class Areas {
  constructor(size) {
    const m = size / 420;
    this.list = LAYOUT.map(a => ({ ...a, x: a.x * m, z: a.z * m, r: a.r * m }));
    this.byId = Object.fromEntries(this.list.map(a => [a.id, a]));
  }

  // How much this spot belongs to an area: 1 in the middle, fading to 0 at its edge.
  weight(id, x, z) {
    const a = this.byId[id];
    return 1 - smooth((Math.hypot(x - a.x, z - a.z) - a.r * 0.6) / (a.r * 0.4));
  }

  // The area this spot is in (the one it belongs to most), or null out in the wild forest between them.
  at(x, z) {
    let best = null, bestW = 0;
    for (const a of this.list) {
      const w = this.weight(a.id, x, z);
      if (w > bestW) { best = a; bestW = w; }
    }
    return bestW > 0.5 ? best : null;
  }
}
