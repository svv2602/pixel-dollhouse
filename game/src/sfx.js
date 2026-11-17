// Звуки синтезируются на лету через WebAudio — никаких аудиофайлов.
let ctx = null;
let master = null; // общий выход: громкость (родительская зона) + лимитер, чтобы много звуков сразу не хрипели
let volume = 1;
try { const v = parseFloat(localStorage.getItem('pixel-house-volume')); if (v >= 0 && v <= 1) volume = v; } catch { /* ignore */ }

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 12;
    limiter.attack.value = 0.003; limiter.release.value = 0.2;
    master.connect(limiter).connect(ctx.destination);
    loadVoices();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

/** Громкость всей игры, 0…1 (запоминается). */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
  try { localStorage.setItem('pixel-house-volume', String(volume)); } catch { /* ignore */ }
}
export const getVolume = () => volume;

// ---------------------------------------------------------------- голоса семьи
// Короткие записи («ням!», «ура!»…) из родительской зоны заменяют синтезированные звуки. Хранятся локально.
const VOICE_KEY = 'pixel-house-voices';
export const VOICES = ['yum', 'hooray', 'giggle', 'yuck', 'hello'];
const voiceBuf = {};
const voiceAt = {};
function voiceStore() {
  try { return JSON.parse(localStorage.getItem(VOICE_KEY)) || {}; } catch { return {}; }
}
async function decodeVoice(name, url) {
  if (!ctx || !url) return;
  try {
    const data = await (await fetch(url)).arrayBuffer();
    voiceBuf[name] = await ctx.decodeAudioData(data);
  } catch { delete voiceBuf[name]; }
}
function loadVoices() {
  for (const [name, url] of Object.entries(voiceStore())) decodeVoice(name, url);
}
/** Записать (dataURL) или стереть (null) голос. */
export async function setVoice(name, url) {
  const st = voiceStore();
  if (url) st[name] = url; else { delete st[name]; delete voiceBuf[name]; }
  try { localStorage.setItem(VOICE_KEY, JSON.stringify(st)); } catch { return false; }
  if (url) { unlockAudio(); await decodeVoice(name, url); }
  return true;
}
export const hasVoice = (name) => !!voiceStore()[name];
/** Сыграть голос, если он записан. true — голос есть (синтезированный звук не нужен). */
export function say(name) {
  const buf = voiceBuf[name];
  if (!ctx || !buf) return false;
  if (ctx.currentTime - (voiceAt[name] ?? -9) < Math.max(0.9, buf.duration)) return true; // уже звучит
  voiceAt[name] = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = 1.5;
  src.connect(g).connect(master);
  src.start();
  return true;
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
  o.connect(g).connect(master);
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
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319];

/** «Голос»: треугольник + октава выше тише, с вибрато — как «ля-ля». */
function voice(freq, dur, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.11, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g.connect(master);
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 6;
  depth.gain.value = freq * 0.02;
  lfo.connect(depth);
  for (const [mul, type, vol] of [[1, 'triangle', 1], [2, 'sine', 0.25]]) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mul, t);
    depth.connect(o.frequency);
    og.gain.value = vol;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
}

export const sfx = {
  pick: () => tone(500, 0.08, { slide: 300, vol: 0.12 }),
  drop: () => tone(300, 0.1, { slide: -120, type: 'triangle', vol: 0.15 }),
  thud: () => noise(0.08, { freq: 400, vol: 0.2 }),
  chew: (delay = 0) => noise(0.07, { freq: 900, vol: 0.18, delay }),
  gulp: () => { tone(300, 0.12, { slide: -150, vol: 0.2 }); tone(250, 0.12, { slide: -100, vol: 0.15, delay: 0.15 }); },
  yum: () => { if (say('yum')) return; tone(660, 0.12, { type: 'triangle' }); tone(880, 0.18, { type: 'triangle', delay: 0.12 }); },
  giggle: () => { if (!say('giggle')) sfx.titter(); },
  titter: () => [0, 1, 2, 3].forEach((i) => tone(700 + i * 90 + Math.random() * 60, 0.07, { type: 'triangle', vol: 0.1, delay: i * 0.08 })),
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
  fanfare: () => { say('hooray'); [0, 2, 4, 7].forEach((n, i) => tone(PENTA[n], i === 3 ? 0.45 : 0.14, { type: 'triangle', vol: 0.13, delay: i * 0.11 })); },
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
  // спальня и сад
  rain: () => { noise(3.4, { freq: 3000, vol: 0.07 }); for (let i = 0; i < 14; i++) tone(900 + Math.random() * 900, 0.04, { slide: -300, vol: 0.04, delay: Math.random() * 3 }); },
  shutter: () => { noise(0.04, { freq: 6000, vol: 0.15 }); tone(1800, 0.05, { type: 'square', vol: 0.05, delay: 0.05 }); noise(0.05, { freq: 3000, vol: 0.1, delay: 0.08 }); },
  dig: (delay = 0) => { noise(0.1, { freq: 700, vol: 0.2, delay }); tone(160, 0.08, { slide: -60, vol: 0.1, delay }); },
  whee: () => tone(500, 0.35, { slide: 500, type: 'triangle', vol: 0.08 }),
  // концертный зал
  /** Спеть фразу из n нот пентатоники; возвращает длительность в секундах. */
  sing: (n = 7) => {
    let t = 0;
    let k = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      k = Math.max(0, Math.min(7, k + [-1, 1, 1, -2, 2, 0][Math.floor(Math.random() * 6)]));
      const d = i === n - 1 ? 0.55 : 0.28;
      voice(PENTA[k] / 2, d, t);
      t += d;
    }
    return t;
  },
  applause: () => { for (let i = 0; i < 26; i++) noise(0.035, { freq: 2500 + Math.random() * 2500, vol: 0.09, delay: Math.random() * 1.6 }); },
  swish: () => noise(0.7, { freq: 1100, vol: 0.09 }),
  // кухня и ванная
  blend: () => { for (let i = 0; i < 6; i++) tone(140 + i * 25, 0.28, { type: 'sawtooth', vol: 0.05, slide: 60, delay: i * 0.25 }); noise(1.5, { freq: 900, vol: 0.06 }); },
  pop: () => { tone(900 + Math.random() * 500, 0.06, { slide: 900, vol: 0.12 }); noise(0.03, { freq: 4000, vol: 0.08 }); },
  flush: () => { noise(1.1, { freq: 700, vol: 0.18 }); [0, 1, 2, 3, 4].forEach((i) => tone(260 - i * 30, 0.14, { slide: -120, vol: 0.08, delay: 0.25 + i * 0.15 })); },
  scrub: (delay = 0) => noise(0.08, { freq: 6000, vol: 0.07, delay }),
  yuck: () => { if (say('yuck')) return; tone(320, 0.18, { type: 'sawtooth', slide: -160, vol: 0.08 }); tone(200, 0.25, { type: 'sawtooth', slide: -90, vol: 0.07, delay: 0.18 }); },
  sour: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 560, 0.09, { type: 'square', vol: 0.05, delay: i * 0.09 }); },
  spicy: () => { noise(0.6, { freq: 2500, vol: 0.12 }); tone(400, 0.5, { slide: 900, type: 'triangle', vol: 0.1 }); },
  // жизнь кукол
  hello: () => { if (say('hello')) return; tone(620, 0.1, { type: 'triangle', vol: 0.1 }); tone(830, 0.16, { type: 'triangle', vol: 0.1, delay: 0.1 }); },
  yawn: () => tone(520, 0.7, { slide: -260, type: 'sine', vol: 0.07 }),
  step: () => noise(0.03, { freq: 900, vol: 0.05 }),
  jingle: () => [7, 5, 7, 5, 4].forEach((n, i) => { tone(PENTA[n] * 2, 0.22, { type: 'sine', vol: 0.06, delay: i * 0.09 }); tone(PENTA[n], 0.12, { type: 'triangle', vol: 0.04, delay: i * 0.09 }); }),
  boom: () => { noise(0.45, { freq: 500, vol: 0.28 }); tone(90, 0.4, { slide: -40, vol: 0.2 }); },
  // миры снов
  dreamIn: () => [0, 2, 4, 5, 7].forEach((n, i) => tone(PENTA[n] * 2, 0.5, { type: 'sine', vol: 0.06, delay: i * 0.09, slide: 30 })),
  dreamOut: () => [7, 5, 4, 2, 0].forEach((n, i) => tone(PENTA[n], 0.4, { type: 'triangle', vol: 0.07, delay: i * 0.1 })),
  toot: () => { tone(620, 0.18, { type: 'square', vol: 0.06 }); tone(780, 0.32, { type: 'square', vol: 0.06, delay: 0.2 }); },
  whale: () => { tone(220, 0.9, { type: 'sine', slide: 180, vol: 0.1 }); tone(330, 0.7, { type: 'sine', slide: -120, vol: 0.07, delay: 0.7 }); },
  beam: () => { for (let i = 0; i < 6; i++) tone(500 + i * 120, 0.12, { type: 'sine', vol: 0.06, delay: i * 0.09 }); },
  baa: () => { tone(430, 0.14, { type: 'sawtooth', vol: 0.035, slide: -40 }); tone(410, 0.22, { type: 'sawtooth', vol: 0.035, slide: -70, delay: 0.14 }); },
  rocket: () => { noise(1.1, { freq: 900, vol: 0.14 }); tone(160, 1.1, { type: 'sawtooth', slide: 500, vol: 0.05 }); },
  // ---- село: голоса животных и звуки хозяйства
  moo: () => { tone(150, 0.25, { type: 'sawtooth', vol: 0.05, slide: 30 }); tone(180, 0.6, { type: 'sawtooth', vol: 0.05, slide: -50, delay: 0.22 }); },
  oink: () => { tone(260, 0.09, { type: 'sawtooth', vol: 0.05, slide: 90 }); tone(230, 0.12, { type: 'sawtooth', vol: 0.05, slide: 110, delay: 0.13 }); },
  cluck: () => [0, 1, 2].forEach((i) => tone(640 + (i === 2 ? 260 : 0), i === 2 ? 0.14 : 0.05, { type: 'square', vol: 0.045, slide: i === 2 ? -200 : 0, delay: i * 0.09 })),
  neigh: () => { for (let i = 0; i < 6; i++) tone(900 - i * 90 + (i % 2) * 60, 0.09, { type: 'sawtooth', vol: 0.04, delay: i * 0.08 }); },
  quack: () => [0, 1].forEach((i) => tone(520, 0.1, { type: 'square', vol: 0.045, slide: -180, delay: i * 0.14 })),
  woof: () => [0, 1].forEach((i) => { tone(240, 0.09, { type: 'sawtooth', vol: 0.06, slide: -90, delay: i * 0.16 }); noise(0.05, { freq: 700, vol: 0.06, delay: i * 0.16 }); }),
  meow: () => { tone(620, 0.16, { type: 'triangle', vol: 0.08, slide: 240 }); tone(860, 0.3, { type: 'triangle', vol: 0.08, slide: -330, delay: 0.15 }); },
  ribbit: () => [0, 1].forEach((i) => tone(190, 0.1, { type: 'square', vol: 0.045, slide: 140, delay: i * 0.13 })),
  caw: () => [0, 1].forEach((i) => tone(520, 0.16, { type: 'sawtooth', vol: 0.04, slide: -140, delay: i * 0.2 })),
  buzz: () => { for (let i = 0; i < 8; i++) tone(210 + (i % 2) * 22, 0.22, { type: 'sawtooth', vol: 0.025, delay: i * 0.2 }); },
  tweet: () => [5, 7, 6, 7, 4, 7].forEach((n, i) => tone(PENTA[n] * 2, 0.09, { type: 'sine', vol: 0.07, slide: i % 2 ? 260 : -160, delay: i * 0.13 })),
  putt: () => { tone(85, 0.09, { type: 'square', vol: 0.06 }); noise(0.05, { freq: 300, vol: 0.07 }); },
  creak: () => [0, 1, 2].forEach((i) => tone(330 + i * 40, 0.12, { type: 'sawtooth', vol: 0.03, slide: 60, delay: i * 0.16 })),
  rattle: () => { for (let i = 0; i < 7; i++) noise(0.03, { freq: 2200 + (i % 3) * 600, vol: 0.09, delay: i * 0.05 }); },
  rustle: () => { for (let i = 0; i < 5; i++) noise(0.06, { freq: 3500, vol: 0.06, delay: i * 0.06 }); },
  honk: () => { tone(392, 0.16, { type: 'square', vol: 0.05 }); tone(494, 0.16, { type: 'square', vol: 0.05 }); tone(392, 0.3, { type: 'square', vol: 0.05, delay: 0.22 }); tone(494, 0.3, { type: 'square', vol: 0.05, delay: 0.22 }); },
  clop: () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 420 : 330, 0.04, { type: 'square', vol: 0.05, delay: i * 0.14 }); },
};

// ---------------------------------------------------------------- фоновая музыка
// У каждой комнаты своя тихая мелодия в пентатонике + бас раз в такт. Синтез, без файлов.
// Ноты ставятся в расписание по часам аудио (ctx.currentTime) с запасом ~0.3 с: ритм ровный,
// даже когда игра подтормаживает (setInterval «плавал»).
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
const THEMES = [
  { // спальня — колыбельная (она же играет ночью во всех комнатах)
    step: 0.34, type: 'triangle', vol: 0.03, len: 0.5, bass: [0, 3, 4, 0],
    melody: [4, 2, 4, 5, 4, 2, 0, -1, 1, 2, 3, 2, 1, 0, 1, -1, 4, 2, 4, 5, 7, 5, 4, -1, 3, 2, 1, 2, 0, -1, -1, -1],
  },
  { // кухня — бодрая, отрывистая
    step: 0.25, type: 'square', vol: 0.014, len: 0.14, bass: [0, 0, 3, 4],
    melody: [0, 2, 4, 2, 5, 4, 2, -1, 0, 2, 4, 5, 7, 5, 4, -1, 5, 7, 5, 4, 2, 4, 2, -1, 0, 2, 1, 2, 0, -1, 0, -1],
  },
  { // сад — светлая, неспешная
    step: 0.38, type: 'sine', vol: 0.04, len: 0.7, bass: [0, 4, 3, 0],
    melody: [4, -1, 5, 7, 5, -1, 4, 2, 4, -1, 2, 0, 2, -1, -1, -1, 2, -1, 4, 5, 7, -1, 5, 4, 2, -1, 1, 2, 0, -1, -1, -1],
  },
  { // ванная — «пузырьки»: арпеджио с подъездом вверх
    step: 0.3, type: 'sine', vol: 0.04, len: 0.22, slide: 60, bass: [0, 3, 0, 4],
    melody: [0, 2, 4, 7, 4, 2, 0, -1, 1, 3, 5, 7, 5, 3, 1, -1, 0, 2, 4, 7, 6, 4, 2, -1, 3, 5, 4, 2, 0, -1, 0, -1],
  },
  { // концертный зал — вальс
    step: 0.3, type: 'triangle', vol: 0.03, len: 0.4, bass: [0, 3, 4, 3], bassEvery: 6,
    melody: [4, -1, -1, 5, 4, 2, 4, -1, -1, 7, 5, 4, 5, -1, -1, 4, 2, 1, 0, -1, -1, 2, -1, -1],
  },
  // ---- миры снов (5…7): та же пентатоника, но выше/ниже и с «плывущими» нотами
  { // сказочный: лес, облака, игрушки — перезвон с подъездом
    step: 0.36, type: 'sine', vol: 0.035, len: 0.8, slide: 12, mul: 2, bass: [0, 4, 3, 4],
    melody: [0, 4, 7, 4, 5, -1, 4, 2, 0, 2, 4, -1, 2, -1, -1, -1, 1, 4, 6, 4, 7, -1, 5, 4, 2, 4, 1, -1, 0, -1, -1, -1],
  },
  { // глубокий: космос и море — редкие долгие ноты
    step: 0.46, type: 'triangle', vol: 0.03, len: 1.3, slide: -8, bass: [0, 0, 3, 2], bassEvery: 4,
    melody: [4, -1, -1, 7, -1, 5, -1, -1, 2, -1, 4, -1, -1, -1, 0, -1, 5, -1, -1, 4, -1, 2, -1, -1, 1, -1, 2, -1, 0, -1, -1, -1],
  },
  { // музыкальная шкатулка: конфеты и лёд
    step: 0.27, type: 'sine', vol: 0.03, len: 0.3, mul: 2, bass: [0, 3, 4, 3],
    melody: [4, 5, 7, 5, 4, 2, 4, -1, 5, 4, 2, 0, 2, -1, -1, -1, 4, 5, 7, 5, 7, 5, 4, -1, 2, 4, 2, 1, 0, -1, 0, -1],
  },
  // ---- село (8…9): наигрыш «вприпрыжку» и неспешная дудочка
  { // двор и огород
    step: 0.26, type: 'triangle', vol: 0.03, len: 0.2, bass: [0, 4, 0, 3], bassEvery: 4,
    melody: [0, 2, 4, 2, 4, 5, 4, -1, 5, 4, 2, 4, 2, 0, 2, -1, 0, 2, 4, 5, 7, 5, 4, -1, 5, 4, 2, 1, 0, -1, 0, -1],
  },
  { // фруктовый сад и поле
    step: 0.36, type: 'sine', vol: 0.04, len: 0.55, slide: 6, bass: [0, 3, 4, 3],
    melody: [4, -1, 5, 4, 2, -1, 0, -1, 2, -1, 4, 5, 4, -1, -1, -1, 7, -1, 5, 4, 5, -1, 2, -1, 4, -1, 2, 1, 0, -1, -1, -1],
  },
  // ---- город (10…11): бодрая улица и лёгкая «магазинная» мелодия
  { // улица и магазин игрушек
    step: 0.24, type: 'square', vol: 0.013, len: 0.16, bass: [0, 3, 4, 3], bassEvery: 4,
    melody: [4, 5, 7, 5, 4, -1, 2, 4, 5, 4, 2, -1, 0, 2, 4, -1, 7, 5, 4, 5, 7, -1, 5, 4, 2, 4, 5, 4, 2, -1, 0, -1],
  },
  { // супермаркет, кафе и магазин одежды
    step: 0.32, type: 'triangle', vol: 0.03, len: 0.35, slide: 4, bass: [0, 4, 3, 4], bassEvery: 4,
    melody: [2, -1, 4, 5, 4, -1, 2, 0, 2, -1, 4, 7, 5, -1, -1, -1, 4, -1, 5, 7, 5, -1, 4, 2, 4, -1, 2, 1, 0, -1, -1, -1],
  },
  // ---- море (12): ленивая укулеле — пляж, открытая вода и остров (под водой играет «глубокая» мелодия снов, 6)
  {
    step: 0.3, type: 'triangle', vol: 0.03, len: 0.3, slide: -4, bass: [0, 3, 0, 4], bassEvery: 4,
    melody: [4, -1, 2, 4, 5, -1, 4, -1, 2, -1, 0, 2, 4, -1, -1, -1, 5, -1, 4, 5, 7, -1, 5, -1, 4, -1, 2, 4, 2, -1, 0, -1],
  },
];
export const DREAM_MUSIC = 5; // номер первой мелодии снов
let musicOn = false;
let theme = 0;
let step = 0;
let musicNext = 0;
let pump = null;

function musicStep(delay) {
  const th = THEMES[theme];
  const n = th.melody[step % th.melody.length];
  if (n >= 0) tone(SCALE[n] * (th.mul || 1), th.len, { type: th.type, vol: th.vol, slide: th.slide || 0, delay });
  const every = th.bassEvery || 8;
  if (step % every === 0) tone(SCALE[th.bass[(step / every) % th.bass.length]] / 2, th.step * 4, { type: 'sine', vol: 0.035, delay });
  step++;
}

function pumpTick() {
  if (!ctx || ctx.state !== 'running' || document.hidden) { musicNext = 0; jamNext = 0; return; }
  const now = ctx.currentTime;
  if (musicOn) {
    if (musicNext < now) musicNext = now + 0.06;
    while (musicNext < now + 0.3) { musicStep(musicNext - now); musicNext += THEMES[theme].step; }
  }
  if (jamLayers.size) {
    if (jamNext < now) jamNext = now + 0.06;
    while (jamNext < now + 0.3) { jamTick(jamNext - now); jamNext += 0.25; }
  }
}
function pumpSync() {
  const need = musicOn || jamLayers.size > 0;
  if (need && !pump) pump = setInterval(pumpTick, 90);
  if (!need && pump) { clearInterval(pump); pump = null; }
}

export function setMusic(on) {
  if (on && !musicOn) { step = 0; musicNext = 0; }
  musicOn = !!on;
  pumpSync();
}
export const musicPlaying = () => musicOn;
/** Мелодия по номеру (комнаты дома — 0…4, сны — 5…7, село — 8…9; см. places.js); та же самая — без перезапуска. */
export function setMusicTheme(i) {
  const t = ((i % THEMES.length) + THEMES.length) % THEMES.length;
  if (t === theme) return;
  theme = t;
  step = 0;
}
export const musicTheme = () => theme;

// ---------------------------------------------------------------- джем-сессия (сцена)
// Каждый включённый инструмент добавляет свой слой в общий такт (16 шагов по 1/8 при ~120 BPM).
const JAM = {
  drum: (st) => (st % 8 === 0 ? 'kick' : st % 8 === 4 ? 'snare' : st % 2 === 1 ? 'hat' : null),
  bell: (st, bar) => [4, -1, 5, 4, 2, -1, 4, -1, 5, 7, 5, 4, 2, -1, 0, -1][st] + (bar % 2 ? 1 : 0),
  string: (st, bar) => (st % 8 === 0 ? [0, 3, 4, 0][bar % 4] : null),
  wind: (st, bar) => (st === 2 || st === 10 ? [7, 5, 6, 4][bar % 4] : null),
};
const jamLayers = new Map(); // kind -> количество включённых инструментов
let jamStep = 0;
let jamNext = 0;
let jamListener = null;

function jamTick(delay) {
  const st = jamStep % 16;
  const bar = Math.floor(jamStep / 16);
  const played = [];
  for (const kind of jamLayers.keys()) {
    const n = JAM[kind](st, bar);
    if (n === null || n === undefined || n < 0) continue;
    if (kind === 'drum') {
      if (n === 'kick') { tone(110, 0.15, { slide: -60, vol: 0.22, delay }); noise(0.05, { freq: 200, vol: 0.15, delay }); }
      else if (n === 'snare') noise(0.1, { freq: 2500, vol: 0.12, delay });
      else noise(0.03, { freq: 7000, vol: 0.04, delay });
    } else if (kind === 'bell') { tone(PENTA[n % 8], 0.3, { type: 'sine', vol: 0.09, delay }); tone(PENTA[n % 8] * 2, 0.15, { type: 'sine', vol: 0.03, delay }); }
    else if (kind === 'string') { tone(SCALE[n] / 2, 0.9, { type: 'sawtooth', vol: 0.04, delay }); tone(SCALE[n] / 4, 0.9, { type: 'triangle', vol: 0.08, delay }); }
    else if (kind === 'wind') tone(SCALE[n % 8], 0.9, { type: 'sine', vol: 0.06, slide: 4, delay });
    played.push(kind);
  }
  // картинка (танец, прожекторы) — в тот же момент, когда прозвучит нота
  if (played.length && jamListener) { const fn = jamListener; setTimeout(() => { if (jamLayers.size) fn(played, st); }, delay * 1000); }
  jamStep++;
}

/** Включить/выключить слой инструмента. Возвращает, играет ли джем вообще. */
export function setJamLayer(kind, on) {
  const was = jamLayers.size;
  const n = (jamLayers.get(kind) || 0) + (on ? 1 : -1);
  if (n > 0) jamLayers.set(kind, n); else jamLayers.delete(kind);
  if (jamLayers.size && !was) { jamStep = 0; jamNext = 0; }
  pumpSync();
  return jamLayers.size > 0;
}
export function stopJam() { jamLayers.clear(); pumpSync(); }
export const jamActive = () => jamLayers.size > 0;
export function onJamStep(fn) { jamListener = fn; }
