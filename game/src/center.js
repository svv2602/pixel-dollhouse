// Центр — шестая локация: вокзал, школа, больница, театр (комнаты — в places.js, фон — в centerscene.js,
// рисунки и записи каталога — в centerart.js). Что там можно делать:
//  вокзал:   поезд у платформы — тап: гудок, пар и облачка со всеми местами: поезд везёт в любую локацию;
//            билетный автомат выдаёт билет (билет на поезд — тоже поехали); часы на столбе бьют;
//            тележка для багажа — в неё кладут вещи и садятся, тап — едет; чемодан — в него складывают вещи;
//  школа:    доска — водить пальцем: рисует мел (цвет — тап по мелку на полочке; губка — водить ею стирает, два тапа
//            по губке — стереть всё; рисунок сохраняется); звонок: перемена — куклы встают из-за парт и пляшут, урок — садятся за парты;
//            глобус крутится — выходит зверь с другого конца света; счёты считают до пяти; котёл-колба (pots.js);
//  больница: кушетка — куклу или питомца на неё, тап: доктор слушает сердечко; рентген — куклу или питомца на
//            экран: виден скелетик; аптечка даёт пластырь — его на куклу, он держится на щеке; шкафчик с
//            витаминами; скорая с мигалкой возит седока через комнату. Иногда кукла, прыгая, ушибается и
//            просит пластырь (облачко);
//  театр:    сцена — тап: занавес; пока он задёрнут, меняются декорации (лес, замок, море, звёздное небо); открыли,
//            а на сцене кто-то есть — зрители-зверята хлопают; прожектор светит на сцену разными цветами;
//            сундук с костюмами — шляпы и короны; ширма — куклу за неё: выходит в новом наряде.
// Всё, что получилось, — страница «центр» в альбоме.
import Phaser from 'phaser';
import { R } from './places.js';
import { makeCenterArt, GLOBE_PETS, MEDCAB, COSTUMES } from './centerart.js';
import { boardRect, CHALKS } from './centerscene.js';

const TRAIN_X = 0.47; // поезд у платформы (доля ширины вокзала)
const MAX_POINTS = 4000; // сколько точек мела хранится (старые штрихи уходят первыми)

export const CENTER_HINTS = {
  train: { room: R.station, seq: () => ['tex:train_icon', 'tex:place_center'] },
  ticket: { room: R.station, seq: () => ['ticketbox', 'train-ticket'] },
  sclock: { room: R.station, seq: () => ['stationclock'] },
  chalk: { room: R.school, seq: () => ['tex:chalk_icon'] },
  sponge: { room: R.school, when: (s) => (s.flags.board || []).length > 0, seq: () => ['tex:sponge_icon', 'tex:chalk_icon'] }, // на доске что-то есть — подскажем про губку
  sbell: { room: R.school, seq: () => ['schoolbell', 'schooldesk'] },
  globe: { room: R.school, seq: () => ['globe', 'polar bear'] },
  abacus: { room: R.school, seq: () => ['abacus'] },
  couch: { room: R.hospital, seq: () => ['couch', 'kitten'] },
  xray: { room: R.hospital, seq: () => ['xray', 'tex:xray_doll'] },
  plaster: { room: R.hospital, seq: () => ['firstaid', 'plaster'] },
  medcab: { room: R.hospital, seq: () => ['medcab', 'vitamin jar'] },
  ambulance: { room: R.hospital, seq: () => ['ambulance'] },
  ouch: { room: null, seq: () => ['plaster'] }, // ушиблась — только как потребность (addNeed)
  tstage: { room: R.theater, seq: () => ['tstage', 'tex:tcurtain_closed'] },
  spot: { room: R.theater, seq: () => ['spot'] },
  costumes: { room: R.theater, seq: () => ['costumes', 'tiara'] },
  tscreen: { room: R.theater, seq: () => ['tscreen'] },
};
export const CENTER_LURES = [['ticket', (b) => b.tickets], ['sclock', (b) => b.sclock], ['sbell', (b) => b.sbell], ['globe', (b) => b.globe],
  ['abacus', (b) => b.abacus], ['couch', (b) => b.couch], ['xray', (b) => b.xray], ['plaster', (b) => b.firstaid], ['medcab', (b) => b.medcab],
  ['ambulance', (b) => b.ambulance], ['tstage', (b) => b.tstage], ['spot', (b) => b.spot], ['costumes', (b) => b.costumes]];
/** Страница «центр» в альбоме: [что получилось, из чего (предмет каталога, id или ключ текстуры), чем]. */
export const CENTER_STICKERS = [
  ['train-ticket', 'ticketbox', 'spark'],
  ...GLOBE_PETS.map((s) => [s, 'globe', 'spark']),
  ['plaster', 'firstaid', 'spark'],
  ...MEDCAB.map((s) => [s, 'medcab', 'spark']),
  ...COSTUMES.map((s) => [s, 'costumes', 'spark']),
];

export function makeCenter(scene) { return makeCenterArt(scene); }

export function installCenter(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    // ---------------------------------------------------------------- расстановка
    /** Центр один раз обставляется — и в старых сохранениях. */
    ensureCenter() {
      if (this.flags.center) return;
      this.flags.center = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const at = (room) => {
        const x0 = room * W;
        const rec = (id) => this.byId.get(id) || this.findRec(id);
        return (id, fx, y) => { const r = rec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y)) : null; };
      };
      // ---- вокзал (поезд — не предмет, его ставит initCenter)
      let put = at(R.station);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('ticketbox', 0.14, FLOOR_TOP + 16);
      put('stationclock', 0.78, FLOOR_TOP + 14);
      put('bagcart', 0.44, ROOM_H - 5); // правее встаёт повозка (cart в places.js)
      put('suitcase', 0.27, ROOM_H - 4);
      put('school backpack', 0.36, ROOM_H - 1);
      // ---- школа (котёл-колбу ставит ensurePots)
      put = at(R.school);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('schoolbell', 0.13, FLOOR_TOP + 12);
      put('schooldesk', 0.36, ROOM_H - 10);
      put('schooldesk', 0.58, ROOM_H - 10);
      put('globe', 0.8, FLOOR_TOP + 13);
      put('abacus', 0.24, ROOM_H - 3);
      put('picture book', 0.47, ROOM_H - 2);
      put('box of crayons', 0.7, ROOM_H - 3);
      put('world map', 0.86, ROOM_H - 4);
      // ---- больница
      put = at(R.hospital);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('couch', 0.28, FLOOR_TOP + 18);
      put('xray', 0.53, FLOOR_TOP + 14);
      put('medcab', 0.72, FLOOR_TOP + 9);
      put('firstaid', 0.88, FLOOR_TOP + 10);
      put('ambulance', 0.55, ROOM_H - 3);
      put('teddy bear', 0.18, ROOM_H - 4);
      // ---- театр
      put = at(R.theater);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('spot', 0.17, FLOOR_TOP + 14);
      put('tstage', 0.53, FLOOR_TOP + 16);
      put('tscreen', 0.88, FLOOR_TOP + 10);
      put('costumes', 0.8, ROOM_H - 9);
      put('rose', 0.3, ROOM_H - 6);
      this.save();
    },

    /** Вызывается из create(): поезд у платформы, доска с рисунком, зрители, состояние сцен. */
    initCenter() {
      const { W, FLOOR_TOP, ROOM_H } = L;
      this.viaTrain = false;
      // поезд — как остановка: его нельзя унести или убрать
      const t = this.add.image(Math.round(R.station * W + W * TRAIN_X), FLOOR_TOP + 7, 'train').setOrigin(0.5, 1).setDepth(-7.6).setInteractive();
      t.train = true;
      this.trainImg = t;
      // доска: картинка, на которой рисуют, и зона касаний (вместе с полочкой)
      const b = boardRect(L);
      const bx = R.school * W + b.x;
      if (this.textures.exists('chalkboard')) this.textures.remove('chalkboard');
      this.board = { ...b, x0: bx, tex: this.textures.createCanvas('chalkboard', b.w, b.h), color: 0, last: null };
      this.add.image(bx, b.y, 'chalkboard').setOrigin(0).setDepth(-7.7);
      const zone = this.add.rectangle(bx - 4, b.y, b.w + 8, b.h + b.tray, 0xffffff, 0.001).setOrigin(0).setDepth(-7.65).setInteractive();
      zone.chalk = true;
      // мелки и губка на полочке: выбранный приподнят
      const slot = Math.floor(b.w / (CHALKS.length + 1));
      const ty = b.y + b.h + 3;
      this.board.slot = slot;
      this.board.pieces = [
        ...CHALKS.map((c, i) => this.add.rectangle(bx + 4 + i * slot, ty, 6, 2, c).setOrigin(0, 1).setDepth(-7.66)),
        this.add.image(bx + 4 + CHALKS.length * slot, ty, 'sponge').setOrigin(0, 1).setDepth(-7.66),
      ];
      this.board.pieceY = ty;
      this.trayLook();
      this.redrawBoard();
      // зрители театра — спиной к нам, у нижнего края
      this.fans = ['bunny', 'bear', 'cat', 'fox'].map((k, i) => this.add.image(Math.round(R.theater * W + W * (0.3 + i * 0.14)), ROOM_H + 5, `fan_${k}`).setOrigin(0.5, 1).setDepth(9000));
      this.spotBeam = null;
    },

    /** Каждый кадр: занавес над сценой, луч прожектора, пластыри на куклах. */
    updateCenter() {
      for (const o of this.objs) {
        if (o.kind === 'item') {
          if (o.beh.tstage) {
            // не «curtain»: по этому полю input.js узнаёт занавес концертного зала
            if (!o.curtainImg) { o.curtainImg = this.add.image(o.x, o.y, o.open ? 'tcurtain' : 'tcurtain_closed').setOrigin(0.5, 1); o.once('destroy', () => o.curtainImg?.destroy()); }
            o.curtainImg.setPosition(o.x, o.y).setDepth(o.depth + 0.8).setVisible(o.visible);
            const k = `tstage_${o.scene_k || 0}`;
            if (o.texture.key !== k) o.setTexture(k);
          }
          continue;
        }
        if (o.kind !== 'char') continue;
        const on = o.plasterUntil > this.time.now && o.visible && o.pose !== 'lie';
        if (!on) { if (o.plasterImg?.visible) o.plasterImg.setVisible(false); continue; }
        if (!o.plasterImg) { o.plasterImg = this.add.image(o.x, o.y, 'plaster_on'); o.once('destroy', () => o.plasterImg?.destroy()); }
        const k = o.scaleY;
        // на щеке: голова — верхняя треть куклы
        o.plasterImg.setVisible(true).setScale(k).setPosition(Math.round(o.x + (o.flipX ? -3 : 3) * k), Math.round(o.y - o.displayHeight * 0.72)).setDepth(o.depth + 0.15);
      }
      const sp = this.spotOn?.active ? this.spotOn : null;
      if (this.spotBeam) {
        if (!sp) { this.spotBeam.destroy(); this.spotBeam = null; }
        else {
          const stage = this.objs.find((x) => x.beh?.tstage && roomOf(x) === roomOf(sp));
          const tx = stage ? stage.x : sp.x + 60;
          const ty = stage ? stage.y - 16 : sp.y;
          const g = this.spotBeam.clear();
          g.fillStyle(this.spotColor, 0.22);
          g.fillTriangle(sp.x + 6, sp.y - 22, tx - 16, ty, tx + 16, ty);
          g.fillStyle(this.spotColor, 0.18).fillEllipse(tx, ty, 34, 8);
        }
      }
    },

    // ---------------------------------------------------------------- тап и бросок
    /** Тап по предмету Центра. true — тап обработан. */
    centerTap(o) {
      const b = o.beh;
      if (b.tickets) { this.ticketTap(o); return true; }
      if (b.sclock) { this.clockTap(o); return true; }
      if (b.sbell) { this.bellTap(o); return true; }
      if (b.globe) { this.globeTap(o); return true; }
      if (b.abacus) { this.abacusTap(o); return true; }
      if (b.couch) { this.couchTap(o); return true; }
      if (b.xray) { sfx.click(); this.tweens.add({ targets: o, alpha: 0.7, duration: 80, yoyo: true, repeat: 1 }); return true; }
      if (b.firstaid) { this.firstAidTap(o); return true; }
      if (b.medcab) { this.medcabTap(o); return true; }
      if (b.ambulance) { this.ambulanceTap(o); return true; }
      if (b.tstage) { this.curtainTap(o); return true; }
      if (b.spot) { this.spotTap(o); return true; }
      if (b.costumes) { this.costumesTap(o); return true; }
      return false;
    },

    /** Предмет или куклу бросили на что-то из Центра. true — бросок обработан. */
    centerDrop(o, q) {
      if (q.y > L.ROOM_H) return false;
      const under = (pred) => this.objAt(q.x, q.y, (x) => x !== o && x.kind === 'item' && pred(x.beh));
      if (o.kind === 'item' && o.beh.ticket && this.trainImg && Phaser.Geom.Rectangle.Contains(this.trainImg.getBounds(), q.x, q.y)) {
        this.trainTap(this.trainImg);
        return false; // билет остаётся там, куда его бросили
      }
      if (o.kind === 'item' && o.beh.plaster) {
        const who = this.objAt(q.x, q.y, (x) => x !== o && (x.kind === 'char' || x.beh?.pet));
        if (who) { this.putPlaster(who, o); return true; }
      }
      if (o.kind === 'char' || o.beh?.pet) {
        const x = under((b) => b.xray);
        if (x) { this.xrayIn(x, o); return true; }
      }
      return false;
    },

    /** Сундук, ушиб и пр. из других мест: предмет Центра выскакивает, наклейка — на страницу «центр». */
    centerGift(rec, x, y, dir = 0) { return this.cityGift(rec, x, y, dir, 'center'); },

    centerFresh(list, chance = 0.7) {
      const recs = list.map((sub) => this.byId.get(sub) || this.findRec(sub)).filter(Boolean);
      const fresh = recs.filter((r) => !this.stickers.has('center', r.subject));
      return recs.length ? pick(fresh.length && Math.random() < chance ? fresh : recs) : null;
    },

    // ---------------------------------------------------------------- вокзал
    /** Поезд: гудок, пар — и облачка со всеми местами. */
    trainTap(t) {
      if (this.travelling) return;
      sfx.toot();
      t.setTexture('train_b');
      this.tweens.add({ targets: t, y: t.y - 1, duration: 90, yoyo: true, repeat: 2 });
      this.time.delayedCall(700, () => { if (t.active) t.setTexture('train'); });
      this.hintDone('train');
      const opts = this.destinations().map((p) => ({ icon: p.icon, act: () => { this.viaTrain = true; this.goPlace(p.key); } }));
      this.showChoices({ x: t.x + 10, y: t.y - 10, displayHeight: t.displayHeight - 10 }, opts);
    },

    ticketTap(m) {
      if (this.time.now < (m.busyUntil || 0)) return;
      m.busyUntil = this.time.now + 900;
      m.setTexture('ticketbox_b');
      sfx.click();
      this.time.delayedCall(250, () => sfx.ding());
      this.time.delayedCall(800, () => { if (m.active) m.setTexture('ticketbox'); });
      this.hintDone('ticket');
      if (this.countIn(roomOf(m), (x) => x.beh.ticket) < 4) this.time.delayedCall(300, () => this.centerGift('train-ticket', m.x + 2, m.y - 4, 1));
    },

    /** Часы: стрелка обегает круг, часы бьют. */
    clockTap(c) {
      if (c.ticking) return;
      c.ticking = true;
      c.k = c.k || 0;
      this.hintDone('sclock');
      this.time.addEvent({
        delay: 120, repeat: 7, callback: () => {
          if (!c.active) return;
          c.k = (c.k + 1) % 4;
          c.setTexture(`stationclock_${c.k}`);
          sfx.click();
        },
      });
      this.time.delayedCall(1000, () => {
        c.ticking = false;
        if (!c.active) return;
        for (let i = 0; i < 3; i++) sfx.instrument('bell', [4, 2, 0][i], i * 0.45);
        this.fxNotes.explode(3, c.x, c.y - c.displayHeight);
      });
    },

    // ---------------------------------------------------------------- школа
    /** Нарисовать доску заново по сохранённым штрихам (c = -1 — след губки). */
    redrawBoard() {
      const bd = this.board;
      const ctx = bd.tex.getContext();
      ctx.clearRect(0, 0, bd.w, bd.h);
      for (const s of this.flags.board || []) {
        if (s.c < 0) { for (let i = 0; i < s.p.length; i += 2) ctx.clearRect(s.p[i] - 2, s.p[i + 1] - 2, 6, 6); continue; }
        ctx.fillStyle = `#${CHALKS[s.c].toString(16).padStart(6, '0')}`;
        for (let i = 0; i < s.p.length; i += 2) ctx.fillRect(s.p[i], s.p[i + 1], 2, 2);
      }
      bd.tex.refresh();
    },

    /** Выбранный мелок (или губка) на полочке приподнят. */
    trayLook() {
      const bd = this.board;
      bd.pieces.forEach((p, i) => { p.y = bd.pieceY - (i === bd.color ? 2 : 0); });
    },

    /** Палец на доске: рисуем мелом или стираем губкой; на полочке — выбрать мелок или губку. */
    chalkDown(q) {
      const bd = this.board;
      const lx = Math.round(q.x - bd.x0);
      const ly = Math.round(q.y - bd.y);
      const SPONGE = CHALKS.length;
      const sx = 4 + SPONGE * bd.slot;
      const onSponge = lx >= sx - 2 && lx <= sx + 16 && ly >= bd.h - 5;
      if (onSponge || ly >= bd.h - 1) {
        const i = onSponge ? SPONGE : Phaser.Math.Clamp(Math.floor((lx - 2) / bd.slot), 0, SPONGE);
        if (i === SPONGE) {
          // два тапа по губке подряд — стереть всю доску
          if (bd.color === SPONGE && this.time.now - (bd.spongeAt || -1e9) < 500) {
            this.flags.board = [];
            this.redrawBoard();
            sfx.swish(); sfx.scrub();
            this.fxCrumbs.setParticleTint(0xffffff);
            for (let k = 0; k < 6; k++) this.fxCrumbs.explode(3, bd.x0 + rnd(4, bd.w - 4), bd.y + rnd(4, bd.h - 4));
            this.hintDone('sponge');
            this.save();
          } else sfx.scrub();
          bd.spongeAt = this.time.now;
        } else sfx.click();
        bd.color = i;
        bd.last = null;
        this.trayLook();
        this.fxSparks.explode(3, q.x, q.y);
        return false;
      }
      (this.flags.board ||= []).push({ c: bd.color === SPONGE ? -1 : bd.color, p: [] });
      bd.last = null;
      this.chalkAt(q);
      if (bd.color === SPONGE) this.hintDone('sponge'); else this.hintDone('chalk');
      return true;
    },

    chalkAt(q) {
      const bd = this.board;
      const s = this.flags.board?.[this.flags.board.length - 1];
      if (!s) return;
      const x = Phaser.Math.Clamp(Math.round(q.x - bd.x0), 0, bd.w - 2);
      const y = Phaser.Math.Clamp(Math.round(q.y - bd.y), 0, bd.h - 3);
      const ctx = bd.tex.getContext();
      const erase = s.c < 0;
      if (!erase) ctx.fillStyle = `#${CHALKS[s.c].toString(16).padStart(6, '0')}`;
      // между прошлой и новой точкой — сплошная линия
      const [px, py] = bd.last || [x, y];
      const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / (erase ? 2 : 1)));
      for (let i = 1; i <= n; i++) {
        const ix = Math.round(px + ((x - px) * i) / n);
        const iy = Math.round(py + ((y - py) * i) / n);
        if (erase) ctx.clearRect(ix - 2, iy - 2, 6, 6); else ctx.fillRect(ix, iy, 2, 2);
        s.p.push(ix, iy);
      }
      bd.last = [x, y];
      bd.tex.refresh();
      // слишком много мела — старые штрихи уходят
      let total = this.flags.board.reduce((a, t) => a + t.p.length, 0);
      while (total > MAX_POINTS * 2 && this.flags.board.length > 1) total -= this.flags.board.shift().p.length;
      if (Math.random() < (erase ? 0.4 : 0.15)) {
        if (erase) sfx.scrub();
        this.fxCrumbs.setParticleTint(0xffffff);
        this.fxCrumbs.explode(erase ? 3 : 1, q.x, q.y); // губка — облачко меловой пыли
      }
    },

    chalkEnd() { this.board.last = null; this.save(); },

    /** Звонок: перемена — встают из-за парт и пляшут; урок — садятся за свободные парты. */
    bellTap(bell) {
      if (bell.ringing) return;
      bell.ringing = true;
      this.hintDone('sbell');
      this.time.addEvent({ delay: 90, repeat: 9, callback: () => { if (bell.active) bell.setTexture(bell.texture.key === 'schoolbell' ? 'schoolbell_b' : 'schoolbell'); } });
      for (let i = 0; i < 4; i++) sfx.instrument('bell', i % 2 ? 4 : 2, i * 0.2);
      this.time.delayedCall(950, () => { bell.ringing = false; if (bell.active) bell.setTexture('schoolbell'); });
      const room = roomOf(bell);
      const kids = this.objs.filter((c) => c.kind === 'char' && roomOf(c) === room && !c.dragging && !c.sleeping && !c.busy);
      const desks = this.objs.filter((d) => d.beh?.desk && roomOf(d) === room && !d.dragging);
      const seated = kids.filter((c) => c.restOn?.beh?.desk);
      if (seated.length) {
        // перемена!
        for (const c of seated) {
          c.restOn = null;
          c.y = Math.min(L.ROOM_H - 2, c.y + 12);
          c.x = Math.round(Phaser.Math.Clamp(c.x + rnd(-24, 24), room * L.W + 16, (room + 1) * L.W - 16));
          this.time.delayedCall(300, () => this.celebrate(c, 4));
        }
        return;
      }
      // урок: свободные куклы — за свободные парты
      const free = desks.filter((d) => !this.objs.some((x) => x.restOn === d));
      kids.filter((c) => !c.restOn).slice(0, free.length).forEach((c, i) => this.time.delayedCall(300 + i * 150, () => { if (c.active && !c.dragging) this.perchOn(c, free[i], free[i].x); }));
    },

    /** Глобус крутится и показывает зверя с другого конца света. */
    globeTap(g) {
      if (g.spinning) return;
      g.spinning = true;
      this.hintDone('globe');
      let k = 0;
      sfx.whee();
      this.time.addEvent({ delay: 90, repeat: 11, callback: () => { if (g.active) g.setTexture(`globe_${++k % 3}`); } });
      this.time.delayedCall(1150, () => {
        g.spinning = false;
        if (!g.active) return;
        const room = roomOf(g);
        if (this.countIn(room, (x) => x.beh.pet && GLOBE_PETS.includes(x.rec.subject)) >= 3) { sfx.boing(); return; }
        const rec = this.centerFresh(GLOBE_PETS);
        if (rec) this.centerGift(rec, g.x - 10, g.y - 6, -1);
      });
    },

    /** Счёты: каждая бусина — нота; пять — фанфары. */
    abacusTap(a) {
      a.n = ((a.n || 0) + 1) % 6;
      a.setTexture(`abacus_${a.n}`);
      this.hintDone('abacus');
      if (a.n === 0) { sfx.swish(); return; }
      sfx.instrument('bell', a.n - 1);
      this.tweens.add({ targets: a, y: a.y - 2, duration: 70, yoyo: true });
      if (a.n === 5) { this.time.delayedCall(250, () => sfx.fanfare()); this.fxSparks.explode(10, a.x, a.y - 10); }
    },

    // ---------------------------------------------------------------- больница
    /** Кушетка: доктор слушает сердечко у того, кто на ней сидит. */
    couchTap(c) {
      const pat = this.objs.filter((x) => x.restOn === c && !x.dragging);
      if (!pat.length) { sfx.click(); return; }
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 1600;
      this.hintDone('couch');
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 420, () => { sfx.thud(); this.time.delayedCall(140, () => sfx.thud()); });
      for (const p of pat) {
        this.time.delayedCall(1300, () => {
          if (!p.active) return;
          this.fxHearts.explode(4, p.x, p.y - p.displayHeight);
          if (p.kind === 'char') { sfx.giggle(); p.setTexture(p.key + '_smile'); this.time.delayedCall(800, () => { if (!p.busy) p.setTexture(p.key); }); } else sfx.purr();
        });
      }
    },

    /** Рентген: кукла или питомец заходит за экран — на нём скелетик; потом выходит сбоку. */
    xrayIn(x, o) {
      if (x.busy || o.busy) { o.x = Math.round(x.x + 20); o.y = Math.round(x.y + 4); return; }
      x.busy = true;
      o.busy = true;
      o.restOn = null;
      const show = (v) => { o.setVisible(v); if (o.slots) for (const it of Object.values(o.slots)) it?.setVisible(v); o.stainImg?.setVisible(v); };
      show(false);
      o.x = Math.round(x.x);
      o.y = Math.round(x.y);
      x.setTexture(o.kind === 'char' ? 'xray_doll' : 'xray_pet');
      sfx.beam();
      this.hintDone('xray');
      this.time.delayedCall(2000, () => {
        x.busy = false;
        if (x.active) x.setTexture('xray');
        if (!o.active) return;
        o.busy = false;
        show(true);
        const room = roomOf(x);
        const side = x.x - room * L.W > L.W - 40 ? -1 : 1;
        o.x = Math.round(x.x + side * 20);
        o.y = Math.round(Phaser.Math.Clamp(x.y + 6, L.FLOOR_TOP + 8, L.ROOM_H - 2));
        if (o.kind === 'char') { o.setTexture(o.key); sfx.giggle(); } else this.petVoice(o);
        this.fxSparks.explode(8, o.x, o.y - o.displayHeight / 2);
        this.save();
      });
    },

    firstAidTap(k) {
      if (this.time.now < (k.busyUntil || 0)) return;
      k.busyUntil = this.time.now + 700;
      sfx.chestOut();
      this.tweens.add({ targets: k, y: k.y - 2, duration: 80, yoyo: true });
      if (this.countIn(roomOf(k), (x) => x.beh.plaster) < 4) this.centerGift('plaster', k.x, k.y - 8, -1);
    },

    /** Пластырь — на куклу (на щеку) или питомца: ушиб проходит, все радуются. */
    putPlaster(who, p) {
      this.takeOut(p);
      this.removeObj(p, true);
      sfx.wear();
      this.hintDone('plaster');
      if (who.kind === 'char') {
        who.plasterUntil = this.time.now + 120000;
        this.hintDone('ouch', who);
        this.celebrate(who, 2);
      } else {
        sfx.purr();
      }
      this.fxHearts.explode(4, who.x, who.y - who.displayHeight);
      this.save();
    },

    /** Ушиблась (прыгала на кровати или батуте): просит пластырь. */
    ouch(ch) {
      if (ch.kind !== 'char' || ch.needs?.has('ouch') || ch.plasterUntil > this.time.now || this.bedtime) return;
      this.time.delayedCall(900, () => { if (ch.active) { sfx.yuck?.(); this.addNeed(ch, 'ouch', 600); } });
    },

    medcabTap(m) {
      if (this.time.now < (m.busyUntil || 0)) return;
      m.busyUntil = this.time.now + 900;
      m.setTexture('medcab_b');
      sfx.creak();
      this.hintDone('medcab');
      this.time.delayedCall(800, () => { if (m.active) m.setTexture('medcab'); });
      if (this.roomFull(roomOf(m))) return;
      const rec = this.centerFresh(MEDCAB);
      if (rec) this.time.delayedCall(250, () => this.centerGift(rec, m.x - 14, m.y - 10, -1));
    },

    /** Скорая: мигалка и сирена, едет к другому краю комнаты с седоком. */
    ambulanceTap(a) {
      if (!this.rollAcross(a, { ms: 7, turn: true })) return;
      this.hintDone('ambulance');
      let n = 0;
      this.time.addEvent({
        delay: 220, repeat: 9, callback: () => {
          if (!a.active) return;
          a.setTexture(++n % 2 ? 'ambulance_b' : 'ambulance');
          if (n % 2 && this.visible(a)) sfx.instrument('wind', n % 4 ? 4 : 2);
        },
      });
      this.time.delayedCall(2300, () => { if (a.active) a.setTexture('ambulance'); });
    },

    // ---------------------------------------------------------------- театр
    /** Занавес: задёрнули — декорации меняются; открыли при артистах — зрители хлопают. */
    curtainTap(st) {
      if (this.time.now < (st.busyUntil || 0)) return;
      st.busyUntil = this.time.now + 600;
      st.open = !st.open;
      sfx.swish();
      this.hintDone('tstage');
      st.curtainImg?.setTexture(st.open ? 'tcurtain' : 'tcurtain_closed');
      if (!st.open) {
        // пока занавес задёрнут, рабочие сцены меняют задник
        this.time.delayedCall(350, () => { st.scene_k = ((st.scene_k || 0) + 1) % 4; sfx.thud(); });
        return;
      }
      const stars = this.objs.filter((x) => x.restOn === st && !x.dragging);
      if (stars.length) this.time.delayedCall(400, () => this.theaterApplause(st, stars));
    },

    theaterApplause(st, stars) {
      sfx.applause();
      for (const f of this.fans || []) {
        if (!this.visible(f)) continue;
        this.tweens.add({ targets: f, y: f.y - 4, duration: 110, yoyo: true, repeat: 3, delay: rnd(0, 200) });
        this.fxHearts.explode(1, f.x, f.y - 14);
      }
      const flowers = ['rose', 'tulip', 'daisy flower', 'sunflower'].map((s) => this.findRec(s)).filter(Boolean);
      for (let i = 0; i < 4 && flowers.length; i++) {
        const r = pick(flowers);
        const f = this.add.image(st.x + rnd(-30, 30), L.ROOM_H, r.cat, r.frame).setDepth(16000);
        this.tweens.add({ targets: f, x: st.x + rnd(-24, 24), y: st.y - 12, duration: 700, delay: i * 120, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: f, alpha: 0, duration: 400, onComplete: () => f.destroy() }) });
      }
      for (const s of stars) if (s.kind === 'char') this.celebrate(s, 3);
    },

    /** Прожектор: свет на сцену; каждый тап — новый цвет, после пяти — гаснет. */
    spotTap(s) {
      const COLORS = [0xfff4a8, 0xff9ac8, 0x8fd6f7, 0xb8ff9a, 0xc48ff2];
      this.hintDone('spot');
      sfx.click();
      if (this.spotOn === s && this.spotK >= COLORS.length - 1) { this.spotOn = null; s.setTexture('spot'); return; }
      this.spotK = this.spotOn === s ? this.spotK + 1 : 0;
      this.spotOn = s;
      this.spotColor = COLORS[this.spotK];
      s.setTexture('spot_on');
      if (!this.spotBeam) this.spotBeam = this.add.graphics().setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
      sfx.sparkle();
    },

    costumesTap(c) {
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 700;
      this.hintDone('costumes');
      sfx.chestOut();
      this.tweens.add({ targets: c, y: c.y - 2, duration: 80, yoyo: true });
      if (this.roomFull(roomOf(c))) return;
      const rec = this.centerFresh(COSTUMES);
      if (rec) this.centerGift(rec, c.x, c.y - 14, -1);
    },
  });
}
