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
  sizzle: (delay = 0) => noise(0.12, { freq: 5000, vol: 0.05, delay }),
  ding: () => { tone(1568, 0.5, { type: 'sine', vol: 0.12 }); tone(2093, 0.4, { type: 'sine', vol: 0.06, delay: 0.05 }); },
  shh: () => noise(0.5, { freq: 1500, vol: 0.05 }),
  /** Инструмент оркестра: kind = drum | bell | string | wind, n — ступень пентатоники. */
  instrument: (kind, n, delay = 0) => {
    const f = PENTA[((n % PENTA.length) + PENTA.length) % PENTA.length];
    if (kind === 'drum') { noise(0.12, { freq: 300, vol: 0.25, delay }); tone(110, 0.15, { slide: -50, vol: 0.2, delay }); return; }
    if (kind === 'bell') { tone(f, 0.6, { type: 'sine', vol: 0.12, delay }); tone(f * 2, 0.3, { type: 'sine', vol: 0.04, delay }); return; }
    if (kind === 'string') { tone(f / 2, 0.5, { type: 'sawtooth', vol: 0.05, delay }); tone(f, 0.4, { type: 'triangle', vol: 0.06, delay }); return; }
    tone(f, 0.45, { type: 'sine', vol: 0.12, delay, slide: 6 });
  },
  /** Сыграть мелодию: [[полутон от C4, доли], ...]. */
  tune: (notes, beat = 0.32) => {
    let t = 0;
    for (const [n, d] of notes) {
      tone(261.63 * 2 ** (n / 12), d * beat * 0.95, { type: 'triangle', vol: 0.12, delay: t });
      t += d * beat;
    }
  },
  purr: () => { tone(70, 0.35, { type: 'sawtooth', vol: 0.05 }); tone(75, 0.35, { type: 'triangle', vol: 0.06, delay: 0.05 }); },
  squeak: () => tone(900, 0.1, { slide: 500, vol: 0.1 }),
  // кухня и ванная
  blend: () => { for (let i = 0; i < 6; i++) tone(140 + i * 25, 0.28, { type: 'sawtooth', vol: 0.05, slide: 60, delay: i * 0.25 }); noise(1.5, { freq: 900, vol: 0.06 }); },
  pop: () => { tone(900 + Math.random() * 500, 0.06, { slide: 900, vol: 0.12 }); noise(0.03, { freq: 4000, vol: 0.08 }); },
  flush: () => { noise(1.1, { freq: 700, vol: 0.18 }); [0, 1, 2, 3, 4].forEach((i) => tone(260 - i * 30, 0.14, { slide: -120, vol: 0.08, delay: 0.25 + i * 0.15 })); },
  scrub: (delay = 0) => noise(0.08, { freq: 6000, vol: 0.07, delay }),
  yuck: () => { tone(320, 0.18, { type: 'sawtooth', slide: -160, vol: 0.08 }); tone(200, 0.25, { type: 'sawtooth', slide: -90, vol: 0.07, delay: 0.18 }); },
  sour: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 560, 0.09, { type: 'square', vol: 0.05, delay: i * 0.09 }); },
  spicy: () => { noise(0.6, { freq: 2500, vol: 0.12 }); tone(400, 0.5, { slide: 900, type: 'triangle', vol: 0.1 }); },
  boom: () => { noise(0.45, { freq: 500, vol: 0.28 }); tone(90, 0.4, { slide: -40, vol: 0.2 }); },
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

// ---------------------------------------------------------------- джем-сессия (сцена)
// Каждый включённый инструмент добавляет свой слой в общий такт (16 шагов по 1/8 при ~120 BPM).
const JAM = {
  drum: (st) => (st % 8 === 0 ? 'kick' : st % 8 === 4 ? 'snare' : st % 2 === 1 ? 'hat' : null),
  bell: (st, bar) => [4, -1, 5, 4, 2, -1, 4, -1, 5, 7, 5, 4, 2, -1, 0, -1][st] + (bar % 2 ? 1 : 0),
  string: (st, bar) => (st % 8 === 0 ? [0, 3, 4, 0][bar % 4] : null),
  wind: (st, bar) => (st === 2 || st === 10 ? [7, 5, 6, 4][bar % 4] : null),
};
const jamLayers = new Map(); // kind -> количество включённых инструментов
let jamTimer = null;
let jamStep = 0;
let jamListener = null;

function jamTick() {
  if (!ctx || ctx.state !== 'running' || document.hidden) return;
  const st = jamStep % 16;
  const bar = Math.floor(jamStep / 16);
  const played = [];
  for (const kind of jamLayers.keys()) {
    const n = JAM[kind](st, bar);
    if (n === null || n === undefined || n < 0) continue;
    if (kind === 'drum') {
      if (n === 'kick') { tone(110, 0.15, { slide: -60, vol: 0.22 }); noise(0.05, { freq: 200, vol: 0.15 }); }
      else if (n === 'snare') noise(0.1, { freq: 2500, vol: 0.12 });
      else noise(0.03, { freq: 7000, vol: 0.04 });
    } else if (kind === 'bell') { tone(PENTA[n % 8], 0.3, { type: 'sine', vol: 0.09 }); tone(PENTA[n % 8] * 2, 0.15, { type: 'sine', vol: 0.03 }); }
    else if (kind === 'string') { tone(SCALE[n] / 2, 0.9, { type: 'sawtooth', vol: 0.04 }); tone(SCALE[n] / 4, 0.9, { type: 'triangle', vol: 0.08 }); }
    else if (kind === 'wind') tone(SCALE[n % 8], 0.9, { type: 'sine', vol: 0.06, slide: 4 });
    played.push(kind);
  }
  if (played.length && jamListener) jamListener(played, st);
  jamStep++;
}

/** Включить/выключить слой инструмента. Возвращает, играет ли джем вообще. */
export function setJamLayer(kind, on) {
  const n = (jamLayers.get(kind) || 0) + (on ? 1 : -1);
  if (n > 0) jamLayers.set(kind, n); else jamLayers.delete(kind);
  if (jamLayers.size && !jamTimer) { jamStep = 0; jamTimer = setInterval(jamTick, 250); }
  if (!jamLayers.size && jamTimer) { clearInterval(jamTimer); jamTimer = null; }
  return jamLayers.size > 0;
}
export function stopJam() { jamLayers.clear(); if (jamTimer) { clearInterval(jamTimer); jamTimer = null; } }
export const jamActive = () => jamLayers.size > 0;
export function onJamStep(fn) { jamListener = fn; }
