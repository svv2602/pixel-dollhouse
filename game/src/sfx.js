// Звуки синтезируются на лету через WebAudio — никаких аудиофайлов.
let ctx = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.12, freq = 1200, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319];

export const sfx = {
  pick: () => tone(500, 0.08, { slide: 300, vol: 0.12 }),
  drop: () => tone(300, 0.1, { slide: -120, type: 'triangle', vol: 0.15 }),
  thud: () => noise(0.08, { freq: 400, vol: 0.2 }),
  chew: (delay = 0) => noise(0.07, { freq: 900, vol: 0.18, delay }),
  gulp: () => { tone(300, 0.12, { slide: -150, vol: 0.2 }); tone(250, 0.12, { slide: -100, vol: 0.15, delay: 0.15 }); },
  yum: () => { tone(660, 0.12, { type: 'triangle' }); tone(880, 0.18, { type: 'triangle', delay: 0.12 }); },
  giggle: () => [0, 1, 2, 3].forEach((i) => tone(700 + i * 90 + Math.random() * 60, 0.07, { type: 'triangle', vol: 0.1, delay: i * 0.08 })),
  sparkle: () => [0, 2, 4, 5, 7].forEach((n, i) => tone(PENTA[n], 0.18, { vol: 0.08, delay: i * 0.06 })),
  wear: () => { tone(440, 0.08, { type: 'square', vol: 0.06 }); tone(660, 0.12, { type: 'square', vol: 0.06, delay: 0.08 }); },
  poof: () => noise(0.25, { freq: 2500, vol: 0.12 }),
  boing: () => tone(200, 0.25, { slide: 400, type: 'triangle', vol: 0.15 }),
  click: () => tone(1200, 0.03, { type: 'square', vol: 0.05 }),
  note: () => tone(PENTA[Math.floor(Math.random() * PENTA.length)], 0.35, { type: 'triangle', vol: 0.15 }),
  chestIn: () => tone(400, 0.12, { slide: -250, vol: 0.15 }),
  chestOut: () => [0, 1, 2].forEach((i) => tone(400 + i * 150, 0.08, { vol: 0.1, delay: i * 0.05 })),
  night: () => tone(500, 0.6, { slide: -300, vol: 0.1 }),
  day: () => tone(300, 0.6, { slide: 500, vol: 0.1 }),
  blub: () => tone(180 + Math.random() * 120, 0.12, { slide: 200, type: 'sine', vol: 0.12 }),
  splash: () => { noise(0.18, { freq: 1800, vol: 0.15 }); tone(500, 0.1, { slide: -300, vol: 0.08 }); },
  fanfare: () => [0, 2, 4, 7].forEach((n, i) => tone(PENTA[n], i === 3 ? 0.45 : 0.14, { type: 'triangle', vol: 0.13, delay: i * 0.11 })),
  page: () => noise(0.06, { freq: 3000, vol: 0.06 }),
  squeak: () => tone(900, 0.1, { slide: 500, vol: 0.1 }),
};

// ---------------------------------------------------------------- фоновая музыка
// Тихая колыбельная: фиксированная мелодия в пентатонике + бас раз в такт. Синтез, без файлов.
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
const MELODY = [4, 2, 4, 5, 4, 2, 0, -1, 1, 2, 3, 2, 1, 0, 1, -1, 4, 2, 4, 5, 7, 5, 4, -1, 3, 2, 1, 2, 0, -1, -1, -1];
const BASS = [0, 3, 4, 0];
let musicTimer = null;
let step = 0;

function musicTick() {
  if (!ctx || ctx.state !== 'running' || document.hidden) return;
  const n = MELODY[step % MELODY.length];
  if (n >= 0) tone(SCALE[n], 0.5, { type: 'triangle', vol: 0.03 });
  if (step % 8 === 0) tone(SCALE[BASS[(step / 8) % BASS.length]] / 2, 1.4, { type: 'sine', vol: 0.035 });
  step++;
}

export function setMusic(on) {
  if (on && !musicTimer) { step = 0; musicTimer = setInterval(musicTick, 340); }
  if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
export const musicPlaying = () => !!musicTimer;
