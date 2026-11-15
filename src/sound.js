// All game sounds, made from noise and tones, so there are no audio files to download.
// Browsers only allow sound after a click, so start() runs from the start screen.

let ctx = null, master = null, noiseBuf = null;

export function startSound(volume) {
  if (ctx) return;
  ctx = new AudioContext();
  // Started from a controller? Browsers wait for a click or key press before playing sound.
  if (ctx.state === 'suspended') {
    const wake = () => { ctx.resume(); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake);
    addEventListener('keydown', wake);
  }
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

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

function startRain() {
  const layer = (type, freq, q, gain) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master);
    src.start(0, Math.random() * 2);
  };
  layer('lowpass', 500, 0.5, 0.45);   // deep roar of heavy rain
  layer('bandpass', 1800, 0.6, 0.28); // hiss on the leaves
  layer('highpass', 6000, 0.3, 0.06); // fine patter
}

// A short burst of filtered noise: the building block for most effects.
function burst({ type = 'bandpass', freq = 1000, freqEnd = null, q = 1, gain = 0.5, attack = 0.002, decay = 0.1 }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 2);
  src.stop(t + attack + decay + 0.05);
}

function tone(freq, freqEnd, gain, decay, type = 'square') {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freqEnd, t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + decay + 0.02);
}

export const sfx = {
  uzi() {
    const p = 0.9 + Math.random() * 0.2;
    burst({ type: 'bandpass', freq: 1400 * p, q: 0.7, gain: 0.55, decay: 0.07 });
    burst({ type: 'lowpass', freq: 300 * p, q: 0.8, gain: 0.7, decay: 0.09 });
  },
  empty() { tone(1800, 1600, 0.08, 0.03); },
  shuriken() { burst({ type: 'bandpass', freq: 3500, freqEnd: 900, q: 4, gain: 0.35, attack: 0.03, decay: 0.25 }); },
  swing() { burst({ type: 'bandpass', freq: 600, freqEnd: 2600, q: 3, gain: 0.3, attack: 0.05, decay: 0.2 }); },
  hitEnemy() {
    burst({ type: 'lowpass', freq: 500, q: 1, gain: 0.5, decay: 0.08 });
    tone(2400, 1900, 0.04, 0.06, 'triangle');  // armor clink
  },
  hurt() {
    burst({ type: 'lowpass', freq: 220, q: 1, gain: 0.9, decay: 0.18 });
    tone(140, 70, 0.18, 0.2, 'sawtooth');
  },
  enemyDown() { tone(300, 80, 0.15, 0.4, 'sawtooth'); burst({ type: 'lowpass', freq: 250, gain: 0.6, decay: 0.3 }); },
  levelUp() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, f, 0.12, 0.25, 'triangle'), i * 120)); },
  thud() { burst({ type: 'lowpass', freq: 160, q: 1, gain: 0.5, decay: 0.12 }); },
};
