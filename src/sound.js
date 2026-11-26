// All game sounds, made from noise and tones, so there are no audio files to download.
// Browsers only allow sound after a click, so start() runs from the start screen.

let ctx = null, master = null, noiseBuf = null, reverb = null, rainBus = null;

export function startSound(volume) {
  if (ctx) return;
  ctx = new AudioContext();
  // Started from a controller? Browsers wait for a click or key press before playing sound.
  if (ctx.state === 'suspended') {
    const wake = () => { ctx.resume(); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake);
    addEventListener('keydown', wake);
  }
  // master volume → compressor (keeps loud gunfire from crackling) → speakers
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.15;
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = wantVolume ?? volume;
  master.connect(comp);
  // A short echo of the jungle, added to gunshots and impacts so they sound outdoors.
  reverb = ctx.createConvolver();
  const irLen = Math.floor(ctx.sampleRate * 1.4);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
  }
  reverb.buffer = ir;
  const verbLevel = ctx.createGain(); verbLevel.gain.value = 0.35;
  reverb.connect(verbLevel).connect(master);

  const len = ctx.sampleRate * 3;
  noiseBuf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = noiseBuf.getChannelData(ch);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = white * 0.6 + brown * 3;
    }
  }
  startRain();
}

// Volume from the settings screen (0 = silent, 1 = loud). Works before or after the sound starts.
let wantVolume = null;
export function setVolume(v) {
  wantVolume = v;
  if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

function startRain() {
  rainBus = ctx.createGain();
  rainBus.gain.value = pendingRain;
  rainBus.connect(master);
  const layer = (type, freq, q, gain) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(rainBus);
    src.start(0, Math.random() * 2);
  };
  layer('lowpass', 500, 0.5, 0.45);   // deep roar of heavy rain
  layer('bandpass', 1800, 0.6, 0.28); // hiss on the leaves
  layer('highpass', 6000, 0.3, 0.06); // fine patter
}

// How loud the rain is (0 = stopped, 1 = downpour). Changes smoothly.
let pendingRain = 1;
export function setRainLevel(level) {
  pendingRain = level;
  if (rainBus) rainBus.gain.setTargetAtTime(level, ctx.currentTime, 0.6);
}

// ---------- sound building blocks ----------
// Each sound plays through a gain into the master, plus a little into the echo (verb).

function out(gain, verb, delay) {
  const g = ctx.createGain();
  g.connect(master);
  if (verb > 0) { const v = ctx.createGain(); v.gain.value = verb; g.connect(v).connect(reverb); }
  return { node: g, t: ctx.currentTime + delay };
}

// A short burst of filtered noise: cracks, booms, whooshes, clicks.
function burst({ type = 'bandpass', freq = 1000, freqEnd = null, q = 1, gain = 0.5, attack = 0.002, decay = 0.1, verb = 0, delay = 0 }) {
  if (!ctx) return;
  const { node, t } = out(gain, verb, delay);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(gain, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  src.connect(f).connect(node);
  src.start(t, Math.random() * 2);
  src.stop(t + attack + decay + 0.05);
}

// A pitched tone that slides from freq to freqEnd: thumps, rings, chimes.
function tone(freq, freqEnd, gain, decay, type = 'sine', { verb = 0, delay = 0, attack = 0.002 } = {}) {
  if (!ctx) return;
  const { node, t } = out(gain, verb, delay);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freqEnd, t + decay);
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(gain, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  o.connect(node);
  o.start(t); o.stop(t + attack + decay + 0.02);
}

// Metal ringing: a few out-of-tune partials, like struck steel.
function metal(base, gain, decay, { delay = 0, verb = 0.2 } = {}) {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(base * r, base * r * 0.995, gain / (i + 1.5), decay / (1 + i * 0.4), 'sine', { delay, verb }));
}

const rand = (a, b) => a + Math.random() * (b - a);

// A brass shell casing bouncing on the ground after a shot.
function casing(delay) {
  const f = rand(4200, 6200);
  tone(f, f * 0.98, 0.035, 0.05, 'sine', { delay });
  tone(f * 1.5, f * 1.48, 0.02, 0.04, 'sine', { delay: delay + 0.09 });
}

export const sfx = {
  uzi() {
    const p = rand(0.92, 1.08);
    burst({ type: 'highpass', freq: 2500, q: 0.5, gain: 0.7, decay: 0.018, verb: 0.3 });          // supersonic crack
    burst({ type: 'bandpass', freq: 950 * p, q: 0.9, gain: 0.85, decay: 0.07, verb: 0.6 });       // gas blast body
    tone(160 * p, 48, 0.9, 0.09, 'sine', { verb: 0.4 });                                          // chest thump
    burst({ type: 'bandpass', freq: 3200, q: 6, gain: 0.12, decay: 0.012, delay: 0.035 });        // bolt slamming home
    if (Math.random() < 0.6) casing(rand(0.35, 0.6));
  },
  shotgun() {
    burst({ type: 'highpass', freq: 1800, q: 0.5, gain: 0.8, decay: 0.03, verb: 0.4 });
    burst({ type: 'lowpass', freq: 1400, q: 0.7, gain: 1.0, decay: 0.28, verb: 0.9 });            // big boom
    tone(110, 32, 1.0, 0.3, 'sine', { verb: 0.5 });
    // pump: chk-chk
    burst({ type: 'bandpass', freq: 1800, q: 3, gain: 0.35, decay: 0.035, delay: 0.32 });
    burst({ type: 'bandpass', freq: 2600, q: 3, gain: 0.4, decay: 0.03, delay: 0.46 });
    casing(0.7);
  },
  empty() {
    burst({ type: 'bandpass', freq: 4200, q: 5, gain: 0.25, decay: 0.012 });                      // dry click
    burst({ type: 'bandpass', freq: 2000, q: 4, gain: 0.12, decay: 0.02, delay: 0.015 });
  },
  shuriken() {
    burst({ type: 'bandpass', freq: 4500, freqEnd: 1200, q: 5, gain: 0.35, attack: 0.02, decay: 0.28 });  // whoosh
    metal(2200, 0.06, 0.25);                                                                              // steel glint
  },
  shurikenHit() {
    metal(1500, 0.12, 0.2, { verb: 0.3 });
    burst({ type: 'bandpass', freq: 3000, q: 2, gain: 0.3, decay: 0.03 });
  },
  katanaDraw() {                                                                                    // shiiing
    burst({ type: 'bandpass', freq: 5200, freqEnd: 7800, q: 8, gain: 0.25, attack: 0.05, decay: 0.35 });
    metal(1750, 0.08, 0.6, { verb: 0.4 });
  },
  katanaSlash() {
    burst({ type: 'bandpass', freq: 500, freqEnd: 3000, q: 2.5, gain: 0.55, attack: 0.04, decay: 0.12 });
    burst({ type: 'bandpass', freq: 3000, freqEnd: 700, q: 2.5, gain: 0.4, attack: 0.01, decay: 0.15, delay: 0.12 });
  },
  katanaHit() {
    metal(900, 0.25, 0.35, { verb: 0.5 });                                                          // blade on armor
    burst({ type: 'lowpass', freq: 600, q: 1, gain: 0.6, decay: 0.08 });
  },
  parry() { tone(2400, 2200, 0.05, 0.25, 'triangle'); tone(3600, 3300, 0.03, 0.18, 'sine', { delay: 0.01 }); },   // steel ringing on steel
  warHorn() {   // a conch-shell horn from the camp: the next wave is coming
    tone(155, 150, 0.16, 1.3, 'sawtooth', { attack: 0.25, verb: 0.5 });
    tone(310, 300, 0.06, 1.2, 'triangle', { attack: 0.3, verb: 0.5 });
  },
  swing() {   // samurai sword swing
    burst({ type: 'bandpass', freq: 600, freqEnd: 2800, q: 3, gain: 0.35, attack: 0.06, decay: 0.18 });
  },
  hitEnemy() {  // bullet hitting lacquered armor
    burst({ type: 'bandpass', freq: rand(1800, 2600), q: 3, gain: 0.35, decay: 0.03 });
    metal(rand(1300, 1700), 0.07, 0.12);
    burst({ type: 'lowpass', freq: 400, q: 1, gain: 0.35, decay: 0.05 });
  },
  ricochet() {  // bullet hitting wood or rock
    burst({ type: 'bandpass', freq: 1200, q: 2, gain: 0.25, decay: 0.03 });
    if (Math.random() < 0.25) tone(rand(2500, 3500), rand(900, 1300), 0.06, 0.25, 'sine', { verb: 0.3 });
  },
  hurt() {
    burst({ type: 'lowpass', freq: 220, q: 1, gain: 0.9, decay: 0.18 });
    tone(140, 70, 0.25, 0.2, 'sawtooth');
  },
  enemyDown() {
    metal(300, 0.2, 0.5, { verb: 0.4 });                                                            // armor clatter
    burst({ type: 'lowpass', freq: 250, gain: 0.7, decay: 0.3, delay: 0.25, verb: 0.3 });           // body hits the ground
  },
  smokeBomb() {
    burst({ type: 'lowpass', freq: 400, gain: 0.8, decay: 0.12, verb: 0.5 });                       // pop
    burst({ type: 'highpass', freq: 2500, gain: 0.35, attack: 0.05, decay: 1.6 });                  // hiss
  },
  pickupAmmo() {  // magazine slapped in and the bolt racked
    burst({ type: 'bandpass', freq: 1500, q: 3, gain: 0.45, decay: 0.03 });
    burst({ type: 'bandpass', freq: 2400, q: 4, gain: 0.4, decay: 0.03, delay: 0.16 });
    burst({ type: 'bandpass', freq: 3000, q: 4, gain: 0.4, decay: 0.025, delay: 0.26 });
  },
  pickupWeapon() {
    metal(1200, 0.1, 0.4, { verb: 0.3 });
    [659, 880].forEach((f, i) => tone(f, f, 0.1, 0.2, 'triangle', { delay: 0.05 + i * 0.1 }));
  },
  switchWeapon() { burst({ type: 'bandpass', freq: 2200, q: 4, gain: 0.3, decay: 0.03 }); },
  crateLand() {
    burst({ type: 'lowpass', freq: 300, q: 1, gain: 0.9, decay: 0.2, verb: 0.5 });
    burst({ type: 'bandpass', freq: 900, q: 3, gain: 0.3, decay: 0.08 });                           // wooden knock
  },
  treeCreak() {
    const t = rand(70, 95);
    tone(t, t * 1.5, 0.12, 1.4, 'sawtooth', { attack: 0.3, verb: 0.4 });
    tone(t * 1.9, t * 1.4, 0.06, 1.2, 'sawtooth', { attack: 0.4, delay: 0.5 });
  },
  treeCrash() {
    burst({ type: 'lowpass', freq: 380, q: 0.7, gain: 1.0, decay: 1.2, verb: 0.8 });
    tone(60, 25, 0.9, 0.6, 'sine', { verb: 0.5 });
    for (let i = 0; i < 6; i++) burst({ type: 'bandpass', freq: rand(1500, 4000), q: 3, gain: 0.25, decay: 0.03, delay: rand(0, 0.6) }); // snapping branches
  },
  thunder() {
    burst({ type: 'highpass', freq: 1500, q: 0.5, gain: 0.5, decay: 0.15, verb: 0.8 });       // crack
    burst({ type: 'lowpass', freq: 160, q: 0.6, gain: 1.0, attack: 0.08, decay: 2.8, verb: 1 }); // rumble
    burst({ type: 'lowpass', freq: 90, q: 0.6, gain: 0.9, attack: 0.3, decay: 2.2, delay: 0.4 });
  },
  bird() {   // a short jungle bird call
    const base = rand(1800, 3200), n = 2 + Math.floor(Math.random() * 3), gap = rand(0.08, 0.16);
    for (let i = 0; i < n; i++) tone(base, base * rand(1.2, 1.6), 0.035, 0.07, 'sine', { delay: i * gap, verb: 0.4 });
  },
  levelUp() { [523, 659, 784].forEach((f, i) => tone(f, f, 0.12, 0.25, 'triangle', { delay: i * 0.12 })); },
  bowDraw() { burst({ type: 'bandpass', freq: 380, freqEnd: 520, q: 3, gain: 0.12, attack: 0.25, decay: 0.4 }); },  // wood creaks as the string comes back
  bowShot() {   // string twang and the arrow whooshing off
    tone(210, 120, 0.25, 0.18, 'triangle');
    burst({ type: 'highpass', freq: 2500, freqEnd: 900, q: 0.7, gain: 0.15, decay: 0.25 });
  },
  arrowThunk() { burst({ type: 'lowpass', freq: 700, q: 2, gain: 0.45, decay: 0.08 }); },
  teppo() {   // matchlock gun: a crack, a deep boom rolling away through the forest
    burst({ type: 'highpass', freq: 1500, q: 0.6, gain: 0.7, decay: 0.04, verb: 0.6 });
    burst({ type: 'lowpass', freq: 900, q: 0.7, gain: 1.0, decay: 0.45, verb: 1.0 });
    tone(90, 28, 0.9, 0.5, 'sine', { verb: 0.7 });
  },
  matchFizz() { burst({ type: 'highpass', freq: 5000, q: 1, gain: 0.08, attack: 0.1, decay: 0.5 }); },   // the slow-match fizzing
  naginata() {   // a long heavy blade sweeping round
    burst({ type: 'bandpass', freq: 400, freqEnd: 1800, q: 2, gain: 0.4, attack: 0.1, decay: 0.3 });
  },
  taiko() {   // war drum: boom... boom-boom
    [0, 0.45, 0.62].forEach(d => { tone(70, 42, 0.6, 0.45, 'sine', { delay: d, verb: 0.6 }); burst({ type: 'lowpass', freq: 250, q: 1, gain: 0.35, decay: 0.12, delay: d }); });
  },
  fanSignal() { tone(880, 880, 0.08, 0.15, 'triangle'); tone(660, 660, 0.08, 0.2, 'triangle', { delay: 0.16 }); },   // the lord's signal
  arrowRain() { burst({ type: 'bandpass', freq: 2200, freqEnd: 900, q: 1.5, gain: 0.3, attack: 0.15, decay: 0.6 }); },  // a hiss of many arrows
  roar() {   // a boss's war cry
    tone(120, 55, 0.35, 1.0, 'sawtooth', { verb: 0.5 });
    tone(90, 45, 0.3, 1.1, 'square', { verb: 0.5, delay: 0.05 });
    burst({ type: 'lowpass', freq: 400, freqEnd: 150, q: 1, gain: 0.35, decay: 0.8, verb: 0.4 });
  },
  gatling() {   // lighter, faster crack than the Uzi
    const p = rand(0.95, 1.05);
    burst({ type: 'highpass', freq: 2800, q: 0.5, gain: 0.55, decay: 0.014, verb: 0.3 });
    burst({ type: 'bandpass', freq: 1150 * p, q: 0.9, gain: 0.6, decay: 0.05, verb: 0.5 });
    tone(140 * p, 50, 0.6, 0.06, 'sine', { verb: 0.3 });
    if (Math.random() < 0.4) casing(rand(0.35, 0.6));
  },
  gatlingSpin() { tone(180, 900, 0.12, 0.55, 'sawtooth', { attack: 0.05 }); },   // barrels whirring up
  vineSlide() { burst({ type: 'bandpass', freq: 900, q: 0.8, gain: 0.16, decay: 0.7 }); },   // rope zipping through gloves
  thud() { burst({ type: 'lowpass', freq: 160, q: 1, gain: 0.5, decay: 0.12 }); },
};
