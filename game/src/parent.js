// Родительская зона: обычная HTML-панель поверх игры (здесь текст можно — это для взрослых).
// Громкость, локальная статистика «во что играет», голоса семьи, копия сохранения, сброс дома.
// Всё хранится только на устройстве; в сеть ничего не уходит.
import { readSnapshots } from './repair.js';
import { getVolume, setVolume, setMusic, musicPlaying, VOICES, hasVoice, setVoice, say, unlockAudio } from './sfx.js';
import { helpHtml, HELP_CSS } from './help.js';

// ---------------------------------------------------------------- статистика
const STATS_KEY = 'pixel-house-stats';
const ROOMS = ['Спальня', 'Кухня', 'Сад', 'Ванная', 'Зал', 'Сны (все миры)'];
const FEATS = {
  feed: 'Кормление', potion: 'Зелья', wear: 'Наряды и вещи в руки', brew: 'Котёл', dressup: 'Гардероб', jam: 'Музыка',
  plant: 'Посадка', harvest: 'Урожай', bathe: 'Купание', gift: 'Подарки', album: 'Альбом', sticker: 'Новые наклейки',
  wish: 'Исполненные желания', cast: 'Позвать куклу', map: 'Карта комнат', tree: 'Ёлка',
  fridge: 'Холодильник', smoothie: 'Блендер', cook: 'Плита', makeup: 'Косметика', teeth: 'Зубная щётка',
  bubbles: 'Пузыри в ванне', toilet: 'Унитаз', potty: 'Горшок', dryer: 'Фен', bounce: 'Прыжки на кровати',
  chest: 'Сундук', photo: 'Фотоаппарат', stars: 'Ночник', rain: 'Тучка', swing: 'Качели', butterfly: 'Бабочки',
  dig: 'Клад', mic: 'Микрофон', audience: 'Зрители', curtain: 'Занавес', disco: 'Диско-шар',
  dream: 'Сон: вошла из кровати', dreamsky: 'Мечта на качелях', dreamsea: 'Нырнула из ванны', dreamcandy: 'Мечта у холодильника',
  dreamtoys: 'Мечта у сундука', dreamforest: 'Мечта у яблони', dreamspace: 'Мечта под диско-шаром',
  tidy: 'Урна: уборка комнаты', trash: 'Урна: выбросила предмет', sweep: 'Метла и грабли',
  castleave: 'Отпустила куклу из дома',
  robot: 'Робот-пылесос', roboride: 'Катание на роботе', wash: 'Стиральная машина', mop: 'Швабра', compost: 'Компост: удобрение', clean: 'Комната убрана',
  dreamwish: 'Во сне: исполнила желание жителя', dreamwalk: 'Во сне: кукла идёт за пальцем', dreamevent: 'Во сне: поймала редкое событие',
  w_forest: 'Мир: сказочный лес', w_planet: 'Мир: другая планета', w_sea: 'Мир: подводное царство', w_clouds: 'Мир: облачная страна',
  w_candy: 'Мир: конфетная страна', w_ice: 'Мир: ледяной дворец', w_toys: 'Мир: игрушечный мир',
};
const fresh = () => ({ v: 1, since: null, rooms: [0, 0, 0, 0, 0], feats: {}, days: {} });
let stats = fresh();
try { const s = JSON.parse(localStorage.getItem(STATS_KEY)); if (s && s.v === 1) stats = { ...fresh(), ...s }; } catch { /* ignore */ }
let dirty = false;
let frozen = false; // после восстановления из файла — ничего не перезаписывать до перезагрузки
let lastFlush = 0;

export function flushStats() {
  if (!dirty || frozen) return;
  dirty = false;
  lastFlush = Date.now();
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}
/** Секунды активной игры в комнате (date — 'ГГГГ-ММ-ДД'). */
export function statTime(room, sec, date) {
  stats.since ||= date;
  stats.rooms[room] = (stats.rooms[room] || 0) + sec;
  stats.days[date] = (stats.days[date] || 0) + sec;
  const days = Object.keys(stats.days).sort();
  while (days.length > 30) delete stats.days[days.shift()];
  dirty = true;
  if (Date.now() - lastFlush > 15000) flushStats();
}
/** Сработала механика (кормление, качели, блендер…). */
export function statHit(name) {
  stats.feats[name] = (stats.feats[name] || 0) + 1;
  dirty = true;
}
export const getStats = () => stats;

// ---------------------------------------------------------------- панель
const VOICE_LABEL = { yum: '«Ням!» — доела вкусное', hooray: '«Ура!» — желание исполнено', giggle: 'Смех — тап по кукле', yuck: '«Фу!» — невкусно', hello: '«Привет!» — вошла в комнату' };
const CSS = `
#parent-zone{position:fixed;inset:0;z-index:20;background:rgba(43,29,46,.97);color:#fff;font:14px/1.35 system-ui,sans-serif;
  overflow-y:auto;touch-action:pan-y;-webkit-user-select:none;user-select:none}
#parent-zone .pz{max-width:760px;margin:0 auto;padding:10px 14px 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
#parent-zone h1{grid-column:1/-1;margin:0;font-size:18px;display:flex;justify-content:space-between;align-items:center}
#parent-zone section{background:#4a3157;border-radius:10px;padding:10px 12px}
#parent-zone h2{margin:0 0 8px;font-size:14px;color:#ffd84a}
#parent-zone button{font:inherit;color:#fff;background:#8a52cc;border:0;border-radius:8px;padding:8px 12px;min-height:38px}
#parent-zone button.sec{background:#6b4a7e}
#parent-zone button.danger{background:#b8264a;position:relative;overflow:hidden;width:100%}
#parent-zone button.danger i{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.35)}
#parent-zone button.danger.hold i{width:100%;transition:width 3s linear}
#parent-zone .row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}
#parent-zone .bar{flex:1;height:10px;background:#3a2546;border-radius:5px;overflow:hidden;min-width:60px}
#parent-zone .bar b{display:block;height:100%;background:#52b893}
#parent-zone .lbl{width:74px}
#parent-zone .val{width:64px;text-align:right;color:#e2ccff}
#parent-zone small{color:#cdb8dc}
#parent-zone input[type=range]{flex:1;height:32px}
#parent-zone .feats{columns:2;column-gap:14px;margin:4px 0 0;padding:0;list-style:none;font-size:13px}
#parent-zone .wide{grid-column:1/-1}
@media (max-width:560px){#parent-zone .pz{grid-template-columns:1fr}}
${HELP_CSS}`;
const mins = (sec) => (sec < 60 ? `${Math.round(sec)} с` : `${Math.round(sec / 60)} мин`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function statsHtml() {
  const total = stats.rooms.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...stats.rooms);
  const rooms = ROOMS.map((name, i) => `<div class="row"><span class="lbl">${name}</span><span class="bar"><b style="width:${Math.round((stats.rooms[i] || 0) / max * 100)}%"></b></span><span class="val">${mins(stats.rooms[i] || 0)}</span></div>`).join('');
  const days = Object.keys(stats.days).sort().slice(-7).map((d) => `${d.slice(8)}.${d.slice(5, 7)} — ${mins(stats.days[d])}`).join(' · ');
  const feats = Object.entries(stats.feats).sort((a, b) => b[1] - a[1]).slice(0, 16)
    .map(([k, n]) => `<li>${esc(FEATS[k] || k)} — ${n}</li>`).join('');
  return `${rooms}
    <small>Всего ${mins(total)}${stats.since ? ` с ${stats.since.split('-').reverse().join('.')}` : ''}. Считается только время, когда экран трогают.</small>
    ${days ? `<div class="row"><small>По дням: ${days}</small></div>` : ''}
    <h2 style="margin-top:10px">Чем пользуется (сколько раз)</h2>
    ${feats ? `<ul class="feats">${feats}</ul>` : '<small>Пока нет данных.</small>'}`;
}

function voicesHtml() {
  return VOICES.map((v) => `<div class="row" data-voice="${v}"><span style="flex:1">${VOICE_LABEL[v]}</span>
    <button data-act="rec">● Записать</button>
    <button class="sec" data-act="play" ${hasVoice(v) ? '' : 'disabled style="opacity:.4"'}>▶</button>
    <button class="sec" data-act="del" ${hasVoice(v) ? '' : 'disabled style="opacity:.4"'}>✕</button></div>`).join('');
}

function snapsHtml() {
  const keys = Object.keys(readSnapshots()).reverse();
  if (!keys.length) return '<small>Снимков пока нет — первый появится завтра.</small>';
  const label = (k) => (k.startsWith('repair-') ? `до починки ${k.slice(15)}.${k.slice(12, 14)}` : `утро ${k.slice(8)}.${k.slice(5, 7)}`);
  return keys.map((k) => `<button class="sec" data-snap="${esc(k)}">${label(k)}</button>`).join('');
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Все данные игры одним объектом (для копии в файл). */
export function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('pixel-house') && k !== 'pixel-house-date') data[k] = localStorage.getItem(k);
  }
  return { app: 'pixel-dollhouse', v: 1, at: new Date().toISOString(), data };
}

/** Восстановить данные из копии. Бросает ошибку, если файл не от этой игры. */
export function importData(obj) {
  if (!obj || obj.app !== 'pixel-dollhouse' || typeof obj.data !== 'object') throw new Error('not a backup');
  const entries = Object.entries(obj.data).filter(([k, v]) => k.startsWith('pixel-house') && typeof v === 'string');
  if (!entries.some(([k]) => /^pixel-house-v\d+$/.test(k))) throw new Error('no house in backup');
  frozen = true;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k.startsWith('pixel-house') && k !== 'pixel-house-date') localStorage.removeItem(k);
  }
  for (const [k, v] of entries) localStorage.setItem(k, v);
}

async function record(name, btn, done) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { btn.textContent = 'Нет доступа к микрофону'; return; }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const fr = new FileReader();
    fr.onload = async () => { await setVoice(name, fr.result); done(); };
    fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType }));
  };
  rec.start();
  btn.textContent = '■ Говорите… (2 с)';
  btn.disabled = true;
  setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 2000);
}

export function parentOpen() { return !!document.getElementById('parent-zone'); }

export function openParent(scene) {
  if (parentOpen()) return;
  scene.saveNow();
  flushStats();
  const el = document.createElement('div');
  el.id = 'parent-zone';
  el.innerHTML = `<style>${CSS}</style><div class="pz">
    <h1><span>Родительская зона</span><button data-act="close">Закрыть ✕</button></h1>
    <section><h2>Звук</h2>
      <div class="row"><span>Громкость</span><input type="range" min="0" max="100" value="${Math.round(getVolume() * 100)}" data-act="vol"></div>
      <label class="row"><input type="checkbox" data-act="music" ${musicPlaying() ? 'checked' : ''}> Фоновая музыка</label>
      <h2 style="margin-top:10px">Голоса семьи</h2>
      <small>Запишите короткие фразы — куклы будут говорить вашими голосами вместо писка.</small>
      <div id="pz-voices">${voicesHtml()}</div>
    </section>
    <section><h2>Во что играет</h2><div id="pz-stats">${statsHtml()}</div>
      <div class="row"><button class="sec" data-act="statreset">Обнулить статистику</button></div>
    </section>
    <section class="wide"><h2>Что умеет игра — подсказки для ребёнка</h2>
      <small>Всё, что можно делать в доме и во снах. <span style="color:#7ad9b5">✓</span> — уже пробовали,
        <span style="color:#ffd84a">○</span> — ещё не находили: это и стоит подсказать. Отметки ведутся только на этом устройстве.</small>
      <div id="pz-help">${helpHtml(stats.feats, scene.flags)}</div>
    </section>
    <section class="wide"><h2>Копия дома</h2>
      <small>Файл со всем домом, альбомами, фото и голосами. Пригодится при смене телефона или перед сбросом.</small>
      <div class="row"><button data-act="export">Сохранить в файл</button><button class="sec" data-act="import">Восстановить из файла</button>
        <input type="file" accept="application/json,.json" hidden><span id="pz-msg"></span></div>
      <h2 style="margin-top:10px">Вернуть дом, каким он был</h2>
      <small>Игра сама хранит несколько последних снимков: на начало каждого дня и перед автоматической починкой.</small>
      <div class="row" id="pz-snaps">${snapsHtml()}</div>
      <h2 style="margin-top:10px">Сброс</h2>
      <small>Комнаты вернутся к начальному виду. Альбом, наклейки и статистика сохранятся.</small>
      <div class="row"><button class="danger" data-act="reset"><i></i><span style="position:relative">Удерживайте 3 секунды, чтобы сбросить дом</span></button></div>
    </section></div>`;
  document.body.appendChild(el);
  const $ = (sel) => el.querySelector(sel);
  const msg = (t) => { $('#pz-msg').textContent = t; };
  const close = () => { el.remove(); scene.drawMusicIcon?.(); };
  const refreshVoices = () => { $('#pz-voices').innerHTML = voicesHtml(); };

  el.addEventListener('input', (e) => {
    const act = e.target.dataset.act;
    if (act === 'vol') { unlockAudio(); setVolume(e.target.value / 100); }
    if (act === 'music') {
      setMusic(e.target.checked);
      try { localStorage.setItem('pixel-house-music', e.target.checked ? '1' : '0'); } catch { /* ignore */ }
    }
  });
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    const voice = btn.closest('[data-voice]')?.dataset.voice;
    if (act === 'close') close();
    if (act === 'statreset') { stats = fresh(); dirty = true; flushStats(); $('#pz-stats').innerHTML = statsHtml(); }
    if (act === 'export') { download(`pixel-house-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportData())); msg('Файл сохранён в «Загрузки».'); }
    if (act === 'import') $('input[type=file]').click();
    if (btn.dataset.snap) {
      const raw = readSnapshots()[btn.dataset.snap];
      if (raw && window.confirm(`Вернуть дом из снимка «${btn.textContent}»? Сегодняшние перестановки пропадут.`)) {
        scene.noSave = true;
        localStorage.setItem('pixel-house-v3', raw);
        window.location.reload();
      }
    }
    if (voice && act === 'rec') { unlockAudio(); record(voice, btn, refreshVoices); }
    if (voice && act === 'play') { unlockAudio(); say(voice); }
    if (voice && act === 'del') setVoice(voice, null).then(refreshVoices);
  });
  $('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      scene.noSave = true; // дом из файла не должен быть перезаписан текущим при выгрузке страницы
      importData(JSON.parse(await file.text()));
      window.location.reload();
    } catch {
      scene.noSave = false;
      msg('Это не файл копии «Пиксельного домика».');
    }
  });
  // сброс — только долгим удержанием: случайный тап ничего не сотрёт
  const reset = $('[data-act=reset]');
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; reset.classList.remove('hold'); };
  reset.addEventListener('pointerdown', () => {
    reset.classList.add('hold');
    timer = setTimeout(() => { close(); scene.resetRoom(); }, 3000);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) reset.addEventListener(ev, stop);
}
