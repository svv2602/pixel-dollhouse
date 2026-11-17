// Семья: постоянный состав кукол и вкладка «люди» в ящике.
// Тап по портрету зовёт куклу в комнату, где сейчас игрок (нового человека — приводит в дом).
// Кукол нельзя ни удалить, ни размножить: состав ограничен, любимицы не теряются.
import Phaser from 'phaser';
import { HAIR, SKIN, DRESS, makeHeadIcon } from './character.js';
import { R } from './places.js';

export const CAST = [
  { id: 'mia', look: { hair: HAIR[0], skin: SKIN[0], dress: DRESS[0], hairStyle: 'long', outfit: 'dress' } },      // две первые —
  { id: 'zoe', look: { hair: HAIR[2], skin: SKIN[1], dress: DRESS[1], hairStyle: 'pigtails', outfit: 'pants' } },  // куклы из старых сохранений
  { id: 'mom', home: 1, look: { hair: '#6b3f2a', skin: SKIN[0], dress: '#c48ff2', hairStyle: 'bun', outfit: 'skirt' } },
  { id: 'dad', farm: 'field', look: { hair: '#2a2433', skin: SKIN[1], dress: '#5ac4f2', hairStyle: 'short', outfit: 'pants', stache: true } },
  { id: 'boy', home: 3, look: { hair: '#d9653b', skin: '#ffe0cc', dress: '#7ad9b5', hairStyle: 'short', outfit: 'overalls' } },
  { id: 'granny', farm: 'yard', look: { hair: '#f2f2f2', skin: SKIN[0], dress: '#f2955a', hairStyle: 'bun', outfit: 'dress', glasses: true } },
  { id: 'star', home: 4, look: { hair: '#b46ad9', skin: SKIN[2], dress: '#ef5a6f', hairStyle: 'ponytail', outfit: 'princess' } },
  { id: 'kid', farm: 'orchard', look: { hair: '#e8b04a', skin: SKIN[3], dress: '#f2c94c', hairStyle: 'curly', outfit: 'shorts' } },
  // горожане: повар в кафе, модница в магазине одежды, продавец игрушек
  { id: 'cook', city: 'cafe', look: { hair: '#2a2433', skin: SKIN[2], dress: '#ffffff', hairStyle: 'bob', outfit: 'overalls' } },
  { id: 'model', city: 'clothes', look: { hair: '#f28fb5', skin: SKIN[1], dress: '#7ad9b5', hairStyle: 'ponytail', outfit: 'dress' } },
  { id: 'toyman', city: 'toyshop', look: { hair: '#4fb3d9', skin: SKIN[4], dress: '#f2c94c', hairStyle: 'curly', outfit: 'overalls', glasses: true } },
  // у моря: моряк на пляже и русалка на дне
  { id: 'sailor', sea: 'beach', look: { hair: '#f2f2f2', skin: SKIN[2], dress: '#5a7fd9', hairStyle: 'short', outfit: 'shorts', stache: true } },
  { id: 'mermaid', sea: 'deep', look: { hair: '#3fc8b0', skin: SKIN[0], dress: '#f28fb5', hairStyle: 'long', outfit: 'swimsuit' } },
];
const HOME_X = { 1: 0.72, 3: 0.5, 4: 0.5 }; // где встаёт жилец комнаты (доля ширины)
const FARM_X = { yard: 0.2, orchard: 0.37, field: 0.41 }; // жильцы села: бабушка во дворе, малыш в саду, папа в поле
const CITY_X = { cafe: 0.47, clothes: 0.27, toyshop: 0.66 }; // горожане — в своих магазинах
const SEA_X = { beach: 0.72, deep: 0.5 }; // моряк — у остановки на пляже, русалка — на дне

export function installCast(Room, { L, rnd, sfx, statHit }) {
  Object.assign(Room.prototype, {
    /** Записи для ящика (вкладка «люди»). */
    castRecs() {
      this.castList ||= CAST.map((c) => ({ id: `cast-${c.id}`, cast: c.id, tex: `cast_${c.id}`, subject: `cast ${c.id}`, cat: 'people', tags: [] }));
      return this.castList;
    },

    castChar(id) { return this.objs.find((o) => o.kind === 'char' && o.cast === id) || null; },

    /** Портреты в ящике — по текущему виду куклы (после гардероба меняются). */
    refreshCastIcons() {
      for (const c of CAST) makeHeadIcon(this, `cast_${c.id}_icon`, this.castChar(c.id)?.look || this.flags.castLook?.[c.id] || c.look);
      if (this.cat === 'people') this.refreshDrawer();
    },

    /** Куклы из старых сохранений получают место в составе; жильцы комнат один раз приходят в дом. */
    ensureCast() {
      const chars = this.objs.filter((o) => o.kind === 'char').sort((a, b) => a.uid - b.uid);
      const used = new Set(chars.map((c) => c.cast).filter(Boolean));
      for (const ch of chars) {
        if (ch.cast) continue;
        const free = CAST.find((c) => !used.has(c.id));
        if (!free) break;
        ch.cast = free.id;
        used.add(free.id);
      }
      if (!this.flags.cast2) {
        this.flags.cast2 = true;
        for (const c of CAST) {
          if (c.home === undefined || this.castChar(c.id)) continue;
          this.spawnChar(Math.round(c.home * L.W + L.W * HOME_X[c.home]), L.ROOM_H - 5, { ...c.look }, { cast: c.id });
        }
        this.save();
      }
      // в селе живут те, кого ещё не позвали в дом (кто уже в доме — там и остаётся)
      if (!this.flags.cast3) {
        this.flags.cast3 = true;
        for (const c of CAST) {
          if (!c.farm || this.castChar(c.id)) continue;
          this.spawnChar(Math.round(R[c.farm] * L.W + L.W * FARM_X[c.farm]), L.ROOM_H - 5, { ...(this.flags.castLook?.[c.id] || c.look) }, { cast: c.id });
        }
        this.save();
      }
      // горожане появляются в своих магазинах — и в старых сохранениях
      if (!this.flags.cast4) {
        this.flags.cast4 = true;
        for (const c of CAST) {
          if (!c.city || this.castChar(c.id)) continue;
          this.spawnChar(Math.round(R[c.city] * L.W + L.W * CITY_X[c.city]), L.ROOM_H - 5, { ...(this.flags.castLook?.[c.id] || c.look) }, { cast: c.id });
        }
        this.save();
      }
      // моряк и русалка — и в старых сохранениях
      if (!this.flags.cast5) {
        this.flags.cast5 = true;
        for (const c of CAST) {
          if (!c.sea || this.castChar(c.id)) continue;
          this.spawnChar(Math.round(R[c.sea] * L.W + L.W * SEA_X[c.sea]), L.ROOM_H - 5, { ...(this.flags.castLook?.[c.id] || c.look) }, { cast: c.id });
        }
        this.save();
      }
      this.refreshCastIcons();
    },

    /** Позвать куклу в комнату на экране: кто уже здесь — машет, остальные входят в дверь. */
    callCast(id) {
      const def = CAST.find((c) => c.id === id);
      if (!def) return;
      statHit('cast');
      const cam = this.cameras.main;
      const room = Math.round(cam.scrollX / L.W);
      let ch = this.castChar(id);
      if (ch && (ch.busy || ch.dragging)) { sfx.boing(); return; }
      if (ch && this.visible(ch) && !ch.walking) {
        this.buddy = ch.uid;
        this.wave(ch);
        return;
      }
      let fromLeft = room > 0 && (room === L.ROOMS - 1 || Math.random() < 0.5);
      if (!ch) {
        ch = this.spawnChar(0, L.ROOM_H - 5, { ...(this.flags.castLook?.[id] || def.look) }, { cast: id }); // ушедшая возвращается в том же виде
        sfx.sparkle();
        this.refreshCastIcons();
      } else {
        fromLeft = ch.x < cam.scrollX + L.W / 2;
        ch.sleeping = false;
        ch.restOn = null;
        ch.inTub = null;
        this.endDream(ch);
        ch.setTexture(ch.key);
      }
      this.buddy = ch.uid;
      this.enterRoom(ch, room, fromLeft, () => this.wave(ch));
    },

    /** Кукла входит в комнату от края экрана и встаёт на свободное место. */
    enterRoom(ch, room, fromLeft, done) {
      const x0 = room * L.W;
      ch.x = fromLeft ? x0 - 12 : x0 + L.W + 12;
      ch.y = Math.round(Phaser.Math.Clamp(ch.y, L.FLOOR_TOP + 8, L.ROOM_H - 2));
      const tx = Math.round(x0 + L.W * (fromLeft ? rnd(0.2, 0.42) : rnd(0.58, 0.8)));
      this.strollTo(ch, tx, ch.y, () => { done?.(); this.save(); });
    },
  });
}
