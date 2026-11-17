// Семья: постоянный состав кукол и вкладка «люди» в ящике.
// Тап по портрету зовёт куклу в комнату, где сейчас игрок (нового человека — приводит в дом).
// Кукол нельзя ни удалить, ни размножить: состав ограничен, любимицы не теряются.
import Phaser from 'phaser';
import { HAIR, SKIN, DRESS, makeHeadIcon } from './character.js';

export const CAST = [
  { id: 'mia', look: { hair: HAIR[0], skin: SKIN[0], dress: DRESS[0], hairStyle: 'long', outfit: 'dress' } },      // две первые —
  { id: 'zoe', look: { hair: HAIR[2], skin: SKIN[1], dress: DRESS[1], hairStyle: 'pigtails', outfit: 'pants' } },  // куклы из старых сохранений
  { id: 'mom', home: 1, look: { hair: '#6b3f2a', skin: SKIN[0], dress: '#c48ff2', hairStyle: 'bun', outfit: 'skirt' } },
  { id: 'dad', look: { hair: '#2a2433', skin: SKIN[1], dress: '#5ac4f2', hairStyle: 'short', outfit: 'pants', stache: true } },
  { id: 'boy', home: 3, look: { hair: '#d9653b', skin: '#ffe0cc', dress: '#7ad9b5', hairStyle: 'short', outfit: 'overalls' } },
  { id: 'granny', look: { hair: '#f2f2f2', skin: SKIN[0], dress: '#f2955a', hairStyle: 'bun', outfit: 'dress', glasses: true } },
  { id: 'star', home: 4, look: { hair: '#b46ad9', skin: SKIN[2], dress: '#ef5a6f', hairStyle: 'ponytail', outfit: 'princess' } },
  { id: 'kid', look: { hair: '#e8b04a', skin: SKIN[3], dress: '#f2c94c', hairStyle: 'curly', outfit: 'shorts' } },
];
const HOME_X = { 1: 0.72, 3: 0.5, 4: 0.3 }; // где встаёт жилец комнаты (доля ширины)

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
      for (const c of CAST) makeHeadIcon(this, `cast_${c.id}_icon`, this.castChar(c.id)?.look || c.look);
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
        ch = this.spawnChar(0, L.ROOM_H - 5, { ...def.look }, { cast: id });
        sfx.sparkle();
        this.refreshCastIcons();
      } else {
        fromLeft = ch.x < cam.scrollX + L.W / 2;
        ch.sleeping = false;
        ch.restOn = null;
        ch.inTub = null;
        if (ch.dreamBubble) this.endDream(ch);
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
