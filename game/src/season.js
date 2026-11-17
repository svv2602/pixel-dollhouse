// Повод вернуться: раз в день — посылка-сюрприз и подросшие за ночь грядки;
// зимой (1 декабря – 14 января) — ёлка с огоньками в спальне и снег в саду.
import { canvasFor } from './furniture.js';
import { writeSnapshot } from './repair.js';
import { R, placeByKey } from './places.js';

/** Сегодняшняя дата 'ГГГГ-ММ-ДД' по часам устройства (в dev-сборке подменяется ключом pixel-house-date — для тестов). */
export function today() {
  if (import.meta.env.DEV) {
    try { const d = localStorage.getItem('pixel-house-date'); if (d) return d; } catch { /* ignore */ }
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isWinter(date) {
  const [, m, d] = date.split('-').map(Number);
  return m === 12 || (m === 1 && d <= 14);
}
/** Год зимы: декабрь 2026 и январь 2027 — одна и та же зима 2026. */
const winterYear = (date) => { const [y, m] = date.split('-').map(Number); return m === 1 ? y - 1 : y; };

const BULBS = ['#ff5a7a', '#ffd84a', '#5ac4f2', '#ff9ad5', '#ffffff'];

function drawTree(r, shift) {
  r(12, 0, 1, 5, '#ffd84a'); r(10, 2, 5, 1, '#ffd84a'); r(11, 1, 3, 3, '#ffe98a');   // звезда
  const cx = 12;
  let k = 0;
  for (let y = 0; y < 27; y++) {
    const hw = 1 + Math.floor((y % 9) * 0.9) + Math.floor(y / 9) * 2;
    const yy = 5 + y;
    r(cx - hw, yy, hw * 2 + 1, 1, y % 9 === 8 ? '#1f7a44' : '#2f9e5a');
    if (y % 9 < 7 && hw > 2) r(cx - hw + 1, yy, 1, 1, '#55c47c');                     // блик слева
    if (y % 3 === 1 && hw > 1) {                                                       // гирлянда из огоньков
      for (let x = -hw + 1 + (y % 2); x <= hw - 1; x += 4) r(cx + x, yy, 1, 1, BULBS[(k++ + shift) % BULBS.length]);
    }
  }
  r(cx - 1, 32, 3, 4, '#8d5a3b'); r(cx - 1, 32, 1, 4, '#a8714d');                     // ствол
}

export function makeSeason(scene) {
  const add = (key, canvas) => { if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas); };
  add('ny_tree', canvasFor(25, 36, (r) => drawTree(r, 0)));
  add('ny_tree_b', canvasFor(25, 36, (r) => drawTree(r, 2)));
  add('ny_tree_icon', canvasFor(13, 14, (r) => {
    r(6, 0, 1, 2, '#ffd84a');
    for (let y = 0; y < 10; y++) { const hw = 1 + Math.floor(y / 2) + (y % 4 === 3 ? -1 : 0); r(6 - hw, 2 + y, hw * 2 + 1, 1, '#2f9e5a'); }
    r(4, 6, 1, 1, '#ff5a7a'); r(8, 8, 1, 1, '#ffd84a'); r(5, 10, 1, 1, '#5ac4f2'); r(9, 11, 1, 1, '#ff9ad5');
    r(5, 12, 3, 2, '#8d5a3b');
  }));
  return [{ id: 'ny-tree', subject: 'new year tree', cat: 'furniture', tags: ['furniture'], tex: 'ny_tree', nyTree: true, bbox: [0, 0, 15, 15], order: 40 }];
}

export function installSeason(Room, { L, rnd, sfx }) {
  Object.assign(Room.prototype, {
    /** Первый запуск за день: грядки подросли, а в комнату падает посылка. */
    dailyVisit() {
      const d = today();
      if (this.flags.day === d) return;
      const first = !this.flags.day;
      writeSnapshot(d, this.rawSave); // дом, каким он был в начале дня, — можно вернуть из родительской зоны
      this.flags.day = d;
      this.flags.visits = (this.flags.visits || 0) + 1;
      if (!first) {
        for (const bed of this.objs) {
          if (!bed.plots) continue;
          for (const p of bed.plots) if (p && p.stage < 3) { p.stage = 3; p.watered = false; }
        }
        const gifts = this.objs.filter((o) => o.beh?.gift && !o.owner).length;
        if (gifts < 3) this.time.delayedCall(1800, () => this.dropParcel());
      }
      this.save();
    },

    /** Посылка дня: подарок падает с потолка в ту комнату, что сейчас на экране. */
    dropParcel() {
      if (!this.objs) return;
      const rec = this.byId.get(`gift-${Math.floor(Math.random() * 3)}`) || this.byId.get('gift-0');
      if (!rec) return;
      const room = Math.round(this.cameras.main.scrollX / L.W);
      const o = this.spawnItem(rec, Math.round(room * L.W + L.W * rnd(0.35, 0.65)), -6);
      o.parcel = true;
      const ty = Math.round(rnd(L.FLOOR_TOP + 8, L.ROOM_H - 3));
      sfx.sparkle();
      this.tweens.add({
        targets: o, y: ty, duration: 900, ease: 'Bounce.easeOut',
        onComplete: () => { sfx.fanfare(); this.fxSparks.explode(18, o.x, o.y - 8); this.save(); },
      });
    },

    /** Зима: ёлка с подарками один раз за сезон появляется в спальне; после праздников — убирается. */
    ensureWinter() {
      const d = today();
      if (this.winter && this.flags.ny !== winterYear(d)) {
        this.flags.ny = winterYear(d);
        const rec = this.byId.get('ny-tree');
        if (!this.objs.some((o) => o.beh?.nyTree)) {
          const tree = this.spawnItem(rec, Math.round(L.W * 0.37), L.FLOOR_TOP + 10);
          for (const [i, dx] of [[1, -9], [2, 10]]) {
            const g = this.byId.get(`gift-${i}`);
            if (g) this.spawnItem(g, tree.x + dx, tree.y + 6);
          }
        }
        this.save();
      }
      if (!this.winter && this.flags.ny) {
        delete this.flags.ny;
        for (const o of this.objs.filter((x) => x.beh?.nyTree)) {
          for (const x of this.objs) if (x.restOn === o) { x.restOn = null; x.y = L.FLOOR_TOP + 12; }
          this.objs = this.objs.filter((x) => x !== o);
          o.destroy();
        }
        this.save();
      }
      if (this.winter && !this.snow) {
        // снег идёт на улице: в саду у дома и над всем селом (оно на ленте одним куском — и снег над ним один)
        const fall = (a, b) => this.add.particles(0, 0, 'px', {
          x: { min: a * L.W, max: b * L.W }, y: -2, lifespan: 7000, speedY: { min: 9, max: 20 }, speedX: { min: -5, max: 5 },
          frequency: Math.round(160 / (b - a)), tint: 0xffffff, alpha: { start: 1, end: 0.7 },
        }).setDepth(4500);
        this.snow = fall(R.garden, R.garden + 1);
        const farm = placeByKey('village');
        fall(farm.first, farm.last + 1);
        fall(R.street, R.street + 1); // в городе на улице — только первая комната
      }
    },

    /** Тап по ёлке: огоньки переключаются, звенят колокольчики. */
    tapTree(o) {
      o.lightsB = !o.lightsB;
      o.setTexture(o.lightsB ? 'ny_tree_b' : 'ny_tree');
      sfx.jingle();
      this.fxSparks.explode(14, o.x, o.y - o.displayHeight * 0.6);
      this.tweens.add({ targets: o, y: o.y - 2, duration: 90, yoyo: true });
      this.stat('tree');
    },

    /** Огоньки на ёлке перемигиваются сами. */
    seasonTick() {
      for (const o of this.objs) {
        if (!o.beh?.nyTree || o.dragging) continue;
        o.lightsB = !o.lightsB;
        o.setTexture(o.lightsB ? 'ny_tree_b' : 'ny_tree');
      }
    },
  });
}
