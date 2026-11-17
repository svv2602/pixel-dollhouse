// Починка дома после сбоя раскладки и ежедневные снимки сохранения.
//
// Что случилось (ноябрь 2026): при повороте телефона сохранение записывалось с размерами НОВОЙ раскладки,
// но с координатами СТАРОЙ. Если после этого игра загружалась заново в альбомной ориентации,
// все координаты «пересчитывались» ещё раз — и вещи оказывались под потолком (или, наоборот, на нижней кромке пола).
// Причина устранена в main.js (раскладка всегда альбомная; сохранение — до смены раскладки),
// а этот файл возвращает на места то, что уже успело уехать.
import Phaser from 'phaser';
import { placeByKey } from './places.js';

const SNAP_KEY = 'pixel-house-snapshots'; // { метка: строка сохранения } — последние снимки дома

export function readSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY)) || {}; } catch { return {}; }
}

/** Сохранить снимок дома под меткой (дата или 'repair-дата'); храним четыре последних. */
export function writeSnapshot(label, raw) {
  if (!raw) return;
  const all = readSnapshots();
  all[label] = raw;
  const keys = Object.keys(all);
  while (keys.length > 4) delete all[keys.shift()];
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(all)); } catch { /* места нет — без снимка */ }
}

export function installRepair(Room, { L }) {
  Object.assign(Room.prototype, {
    /** Где вещи стоят в новом доме: rec.id -> [{x, y}]. Дом собирается «понарошку» и тут же разбирается. */
    defaultSpots() {
      const keep = { objs: this.objs, flags: this.flags, uidSeq: this.uidSeq };
      this.objs = [];
      this.flags = {};
      this.uidSeq = 900000;      // свои текстуры кукол-понарошку: не трогаем текстуры настоящих
      this.save = () => {};      // сборка не должна ничего сохранять
      const spots = {};
      try {
        this.defaultRoom(); this.ensureKitchen(); this.ensureGarden(); this.ensureBath(); this.ensureParty();
        this.ensureHall(); this.ensurePetBed(); this.ensureKitchen2(); this.ensureBath2(); this.ensureHall2();
        this.ensureBedroom2(); this.ensureGarden2(); this.ensureTidy(); this.ensureClean(); this.ensureVillage();
        for (const o of this.objs) if (o.kind === 'item') (spots[o.rec.id] ||= []).push({ x: o.x, y: o.y });
      } finally {
        for (const o of this.objs) { o.glow?.destroy(); o.destroy(); }
        delete this.save;
        Object.assign(this, keep);
      }
      return spots;
    },

    /**
     * Дом после сбоя раскладки: почти вся тяжёлая мебель под потолком (или вся на нижней кромке вместе с полками).
     * В обычной игре так не бывает — мебель без опоры падает на пол. Возвращает true, если дом починен.
     */
    repairLayout() {
      const { FLOOR_TOP, ROOM_H } = L;
      // сбой случался, когда мир состоял из одного дома: «край мира», в который упирались вещи, — правый край дома
      const WORLD = (placeByKey('home').last + 1) * L.W;
      const items = this.objs.filter((o) => o.kind === 'item');
      const wallish = (o) => o.kind === 'item' && (o.beh.wall || o.beh.shelf);
      const heavy = items.filter((o) => o.rec.tex?.startsWith('big_') && o.beh.furniture && !wallish(o) && !o.beh.flat && !o.beh.album && !o.restOn && !o.owner);
      if (heavy.length < 6) return false;
      const shelves = items.filter((o) => o.beh.shelf);
      const high = heavy.filter((o) => o.y < FLOOR_TOP - 12).length;
      const low = heavy.filter((o) => o.y >= ROOM_H - 1).length;
      const mode = high >= heavy.length * 0.8 ? 'ceiling'
        : low >= heavy.length * 0.8 && shelves.length && shelves.every((o) => o.y >= ROOM_H - 2) ? 'floor' : null;
      if (!mode) return false;

      writeSnapshot(`repair-${new Date().toISOString().slice(0, 10)}`, this.rawSave); // починку можно отменить
      const spots = this.defaultSpots();

      // 1. По горизонтали всё растянуто (или сжато) в одно и то же число раз. Находим его по мебели,
      //    которая стоит на своих стандартных местах: за какое число «голосует» больше всего вещей.
      const anchors = [...heavy, ...shelves].filter((o) => spots[o.rec.id]?.length === 1 && o.x > 8 && o.x < WORLD - 8)
        .map((o) => ({ x: o.x, x0: spots[o.rec.id][0].x }));
      let rx = 1;
      let votes = 0;
      for (const a of anchors) {
        const r = a.x / a.x0;
        const n = anchors.filter((b) => Math.abs(b.x - b.x0 * r) <= 2).length;
        if (n > votes) { votes = n; rx = r; }
      }
      if (votes < Math.max(4, anchors.length * 0.5) || rx < 0.6 || rx > 1.6 || Math.abs(rx - 1) < 0.01) rx = 1;

      // 2. По вертикали: «под потолком» высота сжата — восстанавливаем по самой нижней вещи (она была у края пола)
      const all = this.objs.filter((o) => !o.owner && !o.inTub);
      const free = all.filter((o) => !wallish(o) && !o.restOn);
      const maxY = Math.max(...free.map((o) => o.y));
      const ry = mode === 'ceiling' && maxY > 5 ? maxY / (ROOM_H - 2) : 0;
      const wallY = (o) => (o.rec.id === 'garland' ? 14 : o.beh.photo ? FLOOR_TOP - 14 : o.beh.shelf ? FLOOR_TOP - 30 : FLOOR_TOP - 22);
      const used = new Set();
      // всё, что стояло правее этой черты, при растяжении упёрлось в край мира — настоящая координата потеряна
      const edge = rx > 1.01 ? (WORLD - 6) / rx : Infinity;
      const lost = [];
      for (const o of all) {
        const atEdge = o.x >= WORLD - 7 && edge < Infinity;
        o.x = Math.round(Phaser.Math.Clamp(o.x / rx, 6, L.WORLD - 6));
        // вещь на стандартном месте — возвращаем точно, как было в новом доме
        const spot = o.kind === 'item' && spots[o.rec.id]?.find((s) => !used.has(s) && (atEdge ? s.x >= edge - 3 : Math.abs(s.x - o.x) <= 2));
        if (spot) { used.add(spot); o.x = spot.x; o.y = spot.y; o.fixed = true; continue; }
        if (atEdge && !o.restOn) lost.push(o);
        if (wallish(o)) o.y = ry && o.y > 4 ? Math.round(Phaser.Math.Clamp(o.y / ry, 4, FLOOR_TOP - 4)) : wallY(o);
        else if (!o.restOn) {
          o.y = ry ? Math.round(Phaser.Math.Clamp(o.y / ry, FLOOR_TOP + 2, ROOM_H - 1))
            : o.kind === 'item' && o.beh.furniture && !o.beh.flat ? FLOOR_TOP + 10 : ROOM_H - 3 - Math.floor(Math.random() * 5);
        }
      }
      // потерявшие место у правого края — расставляем по этой полосе в ряд, а не стопкой
      lost.forEach((o, i) => { o.x = Math.round(edge + (i + 1) * (WORLD - 12 - edge) / (lost.length + 1)); });
      // 3. То, что стояло или лежало на мебели, — обратно на неё
      for (const o of all) {
        const base = o.restOn;
        if (!base || o.fixed) continue;
        const half = Math.max(2, base.displayWidth / 2 - 3);
        o.x = Math.round(Phaser.Math.Clamp(o.x, base.x - half, base.x + half));
        if (base.beh.shelf) o.y = base.y - 4;
        else if (ry) o.y = Math.round(Phaser.Math.Clamp(o.y / ry, 4, base.y - 2));
        else o.y = Math.round(base.y - base.displayHeight * (o.kind === 'char' ? 0.3 : 0.7));
      }
      for (const o of all) delete o.fixed;
      this.flags.repaired = (this.flags.repaired || 0) + 1;
      this.save();
      return true;
    },
  });
}
