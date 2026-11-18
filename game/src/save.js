// Сохранение и загрузка дома (localStorage, ключ SAVE_KEY) и сброс.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { L, SAVE_KEY } from './core.js';
import { INSERTED, R } from './places.js';

/**
 * Комнату вставили в середину ленты (INSERTED в places.js): в доме, сохранённом до этого, всё правее вставки
 * сдвигается на одну комнату — вещи, куклы, следы, комната на экране. Сдвиг — в ширинах той раскладки,
 * в которой дом был сохранён (st.W), до пересчёта в текущую. Уже учтённые вставки — в flags.inserted.
 */
/**
 * Сохранённый дом (localStorage, ключ SAVE_KEY).
 * @typedef {object} SaveState
 * @property {2} v
 * @property {boolean} night
 * @property {number} W        ширина комнаты в раскладке, в которой дом сохранён (координаты имеют смысл только с ней)
 * @property {number} ROOM_H
 * @property {number} FLOOR_TOP
 * @property {number} room     комната на экране (номер на ленте)
 * @property {object} flags    разовые появления (village, playroom…), tried, dreamTried, inserted, decor, prints…
 * @property {number} [buddy]  uid куклы, с которой играли последней
 * @property {{uid: number, id: string, x: number, y: number, contents?: string[], owner?: number, slot?: string, restOn?: number, stage?: number}[]} objs
 * @property {{uid: number, cast?: string, x: number, y: number, look: object, mul?: number, restOn?: number}[]} chars
 */

/** @param {SaveState} st */
export function migrateRooms(st) {
  const flags = (st.flags ||= {});
  const done = new Set(flags.inserted || []);
  const w = st.W || L.W;
  for (const key of INSERTED) {
    if (done.has(key)) continue;
    const at = R[key] * w;
    const shift = (o) => { if (o.x >= at) o.x += w; };
    (st.objs || []).forEach(shift);
    (st.chars || []).forEach(shift);
    for (const p of flags.prints || []) if (p[0] >= at) p[0] += w;
    if ((st.room || 0) >= R[key]) st.room = (st.room || 0) + 1;
    done.add(key);
  }
  flags.inserted = [...done];
  return st;
}

export function installSave(Room) {
  Object.assign(Room.prototype, {
    save() {
      clearTimeout(this.saveT);
      this.saveT = setTimeout(() => this.saveNow(), 400);
    },
    saveNow() {
      clearTimeout(this.saveT);
      if (!this.objs || this.noSave) return;
      const state = {
        v: 2, night: this.night, W: L.W, ROOM_H: L.ROOM_H, FLOOR_TOP: L.FLOOR_TOP,
        room: this.targetRoom ?? Math.round(this.cameras.main.scrollX / L.W),
        flags: this.flags, buddy: this.buddy || undefined,
        objs: this.objs.filter((o) => o.kind === 'item' && !o.summoned).map((o) => ({
          uid: o.uid, id: o.rec.id, x: Math.round(o.x), y: Math.round(o.y), lit: o.lit, plots: o.plots || undefined,
          dirty: o.dirty || undefined, took: o.tookBy ? [o.tookBy, o.tookSlot] : undefined, contents: o.contents, owner: o.owner?.uid, slot: o.slot, restOn: o.restOn?.summoned ? undefined : o.restOn?.uid, bites: o.bites || 0,
          stain: o.stain || undefined, foam: o.foam || undefined, inTub: o.inTub?.uid, tubDx: o.tubDx, deco: o.deco || undefined,
          color: o.color, photoId: o.photoId, flip: (o.beh.tractor && o.flipX) || undefined, stage: o.stage || undefined,
        })),
        chars: this.objs.filter((o) => o.kind === 'char').map((o) => ({
          uid: o.uid, cast: o.cast || undefined, x: Math.round(o.x), y: Math.round(o.y), look: o.look, mul: o.mul, restOn: o.restOn?.summoned ? undefined : o.restOn?.uid,
          stain: o.stain || undefined, inTub: o.inTub?.uid, tubDx: o.tubDx,
        })),
      };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* приватный режим — играем без сохранения */ }
    },
    loadState() {
      let st;
      this.rawSave = null;
      try { this.rawSave = localStorage.getItem(SAVE_KEY); st = JSON.parse(this.rawSave); } catch { return false; }
      if (!st || st.v !== 2) return false;
      migrateRooms(st);
      // Старая ошибка поворота экрана могла записать размеры портретной раскладки рядом с координатами альбомной.
      // Признак: по записанным размерам до пола не достаёт ни одна вещь. Тогда размерам не верим — координаты уже наши.
      const ys = [...st.objs.filter((o) => !o.owner), ...st.chars].map((o) => o.y);
      if (ys.length >= 6 && Math.max(...ys) < (st.FLOOR_TOP || 0) * 0.6) { st.W = L.W; st.ROOM_H = L.ROOM_H; st.FLOOR_TOP = L.FLOOR_TOP; }
      // экран мог поменяться (полноэкранный режим, другое устройство) — переносим координаты в новую раскладку
      const fx = (x) => Math.round(Phaser.Math.Clamp(x * L.W / (st.W || L.W), 6, L.WORLD - 6));
      this.roomIdx = Phaser.Math.Clamp(st.room || 0, 0, L.ROOMS - 1);
      this.flags = st.flags || {};
      this.buddy = st.buddy || null;
      const fy = (y) => {
        const oldFloor = st.FLOOR_TOP || L.FLOOR_TOP;
        const oldRoom = st.ROOM_H || L.ROOM_H;
        const ny = y >= oldFloor
          ? L.FLOOR_TOP + (y - oldFloor) * (L.ROOM_H - L.FLOOR_TOP) / Math.max(1, oldRoom - oldFloor)
          : y * L.FLOOR_TOP / Math.max(1, oldFloor);
        return Math.round(Phaser.Math.Clamp(ny, 4, L.ROOM_H - 1));
      };
      const byUid = new Map();
      for (const c of st.chars) byUid.set(c.uid, this.spawnChar(fx(c.x), fy(c.y), c.look, { uid: c.uid, mul: c.mul, cast: c.cast }));
      for (const s of st.objs) {
        const rec = this.recOf(s.id);
        if (!rec) continue;
        const contents = (s.contents || []).map((id) => this.recOf(id)?.id).filter(Boolean);
        const it = this.spawnItem(rec, fx(s.x), fy(s.y), { uid: s.uid, lit: s.lit, contents, plots: s.plots, deco: s.deco, color: s.color, photoId: s.photoId, stage: s.stage });
        if (s.bites && it.beh.edible) { it.bites = s.bites; this.applyBites(it); }
        if (s.flip) it.setFlipX(true);
        byUid.set(s.uid, it);
      }
      for (const s of [...st.objs, ...st.chars]) {
        const o = byUid.get(s.uid);
        if (!o) continue;
        if (s.restOn && byUid.get(s.restOn)) o.restOn = byUid.get(s.restOn);
        if (s.stain) this.stain(o, s.stain, true);
        if (s.dirty && o.kind === 'item') { o.dirty = true; o.setTint(0x9a7a5a); }
        if (s.took && o.kind === 'item') { o.tookBy = s.took[0]; o.tookSlot = s.took[1]; }
        if (s.foam) { o.foam = s.foam; this.renderFoam(o); }
        if (s.inTub && byUid.get(s.inTub)) { o.inTub = byUid.get(s.inTub); o.tubDx = s.tubDx || 0; }
        if (s.owner && byUid.get(s.owner)) {
          const ch = byUid.get(s.owner);
          ch.slots[s.slot] = o; o.owner = ch; o.slot = s.slot;
        }
      }
      this.night = !!st.night;
      return true;
    },
    resetRoom() {
      clearTimeout(this.saveT);
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      this.objs = null;
      this.scene.restart();
    },
  });
}
