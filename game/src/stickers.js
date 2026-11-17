import { ROOMS } from './places.js';
import { FARM_STICKERS } from './village.js';
import { CITY_STICKERS } from './city.js';
import { SEA_STICKERS } from './sea.js';
// Альбом наклеек на весь дом: кроме открытий котла — блюда с плиты, урожай, клады и сувениры из снов.
// Наклейка появляется, когда ребёнок впервые получил предмет; страницы подсказывают, где искать остальные.

const KEY = 'pixel-house-stickers-v1'; // отдельно от комнаты: сброс дома альбом не стирает

export class Stickers {
  constructor() {
    try { this.found = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { this.found = {}; }
  }

  has(cat, subject) { return !!this.found[cat]?.[subject]; }

  /** true — наклейка новая. */
  add(cat, subject) {
    if (this.has(cat, subject)) return false;
    (this.found[cat] ||= {})[subject] = 1;
    try { localStorage.setItem(KEY, JSON.stringify(this.found)); } catch { /* без сохранения */ }
    return true;
  }
}

export function installStickers(Room, { COOK, GROW, TREASURE, DREAMS, DREAM_THEMES, sfx }) {
  Object.assign(Room.prototype, {
    /** Страницы альбома. Запись: a + b = result (a, b — предмет каталога или ключ текстуры-подсказки). */
    albumTabs() {
      if (!this.albumDefs) {
        const recs = (list) => [...new Set(list)].map((sub) => this.findRec(sub)).filter(Boolean);
        const can = this.findRec('watering can');
        const dishes = [];
        const seen = new Set();
        for (const [raw, done] of Object.entries(COOK)) {
          const a = this.findRec(raw);
          const result = this.findRec(done);
          if (!a || !result || seen.has(done)) continue;
          seen.add(done);
          dishes.push({ a, b: 'big_stove_icon', result });
        }
        this.albumDefs = [
          { key: 'recipe', icon: 'big_cauldron_icon' },
          { key: 'dish', icon: 'big_stove_icon', list: dishes },
          { key: 'plant', icon: 'big_gardenbed_icon', list: recs(GROW).map((result) => ({ a: 'big_gardenbed_icon', b: can || 'water_drop', result })) },
          { key: 'treasure', icon: this.findRec('shovel') || 'dig_x', list: recs(TREASURE).map((result) => ({ a: this.findRec('shovel') || 'dig_x', b: 'dig_x', result })) },
          { key: 'tidy', icon: 'bin_icon', list: ROOMS.map((r) => this.byId.get(r.clean)).filter(Boolean).map((result) => ({ a: 'bin_icon', b: 'broom_icon', result })) },
          // село: что дают животные, деревья, улей и мельница (a, b — предмет каталога, id или ключ текстуры)
          {
            key: 'farm', icon: 'place_village',
            list: FARM_STICKERS.map(([sub, a, b]) => ({ a: this.farmPic(a), b: this.farmPic(b), result: this.findRec(sub) })).filter((e) => e.result),
          },
          // город: мороженое, монетка покупателя, талисманы из фонтана, пакет с кассы, подарок, плюшевые игрушки, капсулы
          {
            key: 'city', icon: 'place_city',
            list: CITY_STICKERS.map(([sub, a, b]) => ({ a: this.farmPic(a), b: this.farmPic(b), result: this.byId.get(sub) || this.findRec(sub) })).filter((e) => e.result),
          },
          // море: ракушки, кокос, краб, рыбки, круг от дельфина, карта из бутылки, жемчуг, самоцветы, алмаз из клада, черепашка
          {
            key: 'sea', icon: 'place_sea',
            list: SEA_STICKERS.map(([sub, a, b]) => ({ a: this.farmPic(a), b: this.farmPic(b), result: this.byId.get(sub) || this.findRec(sub) })).filter((e) => e.result),
          },
          { key: 'dream', icon: 'wish_sleep', list: recs([...DREAMS, ...DREAM_THEMES.flatMap((t) => [...t.items, ...(t.rare || [])])]).map((result) => ({ a: 'big_bed_icon', b: 'wish_sleep', result })) },
        ];
      }
      return this.albumDefs.map((t) => ({
        key: t.key, icon: t.icon,
        entries: t.list
          ? t.list.map((e) => ({ ...e, key: `${t.key}:${e.result.subject}`, found: this.stickers.has(t.key, e.result.subject), plain: true }))
          : this.alchemy.entries(),
      }));
    },

    /** Картинка-подсказка для страниц «село» и «город»: предмет каталога (по id или названию) или текстура. */
    farmPic(x) {
      const rec = this.byId.get(x) || this.findRec(x);
      return rec ? (rec.tex ? `${rec.tex}_icon` : rec) : x;
    },

    /** Новая наклейка: фанфары, иконка летит в альбом; собрана вся страница — салют. */
    sticker(cat, rec, x, y) {
      if (!rec || !this.stickers.add(cat, rec.subject)) return false;
      this.stat('sticker');
      this.lastStickerTab = cat;
      this.time.delayedCall(250, () => sfx.fanfare());
      this.flyToAlbum(rec, x, y);
      const tab = this.albumTabs().find((t) => t.key === cat);
      if (tab && tab.entries.every((e) => e.found)) {
        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(900 + i * 160, () => {
            const cam = this.cameras.main;
            this.fxSparks.explode(14, cam.scrollX + 20 + Math.random() * (cam.width / cam.zoom - 40), 10 + Math.random() * 30);
            if (i % 2 === 0) sfx.sparkle();
          });
        }
      }
      return true;
    },
  });
}
