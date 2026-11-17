// Уборка, вторая волна: то, что убирает само или превращает уборку в игру.
//  • робот-пылесос: тап — ездит по полу своей комнаты, подбирает лишнее и разносит по местам
//    (еда — в холодильник, одежда — в шкаф, листья и огрызки в саду — в компост, остальное — в сундук с игрушками);
//    ничего не выбрасывает. Питомца или игрушку можно посадить сверху — катаются;
//  • стиральная машина (ванная): до трёх вещей в барабан, тап — стирка; выходят чистыми, иногда с носком-сюрпризом.
//    Пачкаются игрушки и одежда в луже грязи;
//  • следы: испачканная кукла оставляет на полу следы; их стирают шваброй (и робот тоже);
//  • компост (сад): три листа или объедка — мешочек удобрения; удобрение на грядку — всё посаженное созревает сразу;
//  • награда: комнату убрали — салют, куклы радуются, наклейка на странице «чистюля».
// Что считается «лишним» — см. isLitter в tidy.js.
import Phaser from 'phaser';
import { canvasFor } from './furniture.js';
import { LEAVES } from './tidy.js';

const tex = (scene, key, canvas) => {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  return key;
};

const SOCKS = ['sock', 'ankle sock', 'knee sock', 'toe sock', 'slipper sock'];
const DIRT = 0x9a7a5a;      // цвет испачканной вещи
const MAX_PRINTS = 30;
const WASH_MS = 2600;
/** Какая мебель «отвечает» за комнату на странице наклеек «чистюля» (по номеру комнаты). */
export const CLEAN_ROOMS = ['bed', 'fridge', 'tree', 'tub', 'stage'];

const robot = (on) => canvasFor(16, 8, (r) => {
  r(2, 2, 12, 5, '#e6e8f0'); r(1, 3, 14, 3, '#e6e8f0'); r(3, 1, 10, 1, '#f6f7fb'); r(1, 6, 14, 1, '#b8bccc');
  r(4, 7, 2, 1, '#2b1d2e'); r(10, 7, 2, 1, '#2b1d2e');
  r(6, 3, 4, 2, '#8fa8f2'); r(7, 3, 1, 1, '#d6e0ff');
  r(12, 3, 2, 1, on ? '#7af28a' : '#ef5a6f');
});
const washer = (turn) => canvasFor(22, 26, (r) => {
  r(0, 0, 22, 26, '#f2f4fa'); r(0, 0, 22, 5, '#d8dcec'); r(0, 24, 22, 2, '#b8bccc'); r(20, 0, 2, 26, '#d8dcec');
  r(2, 1, 5, 2, '#8fa8f2'); r(14, 1, 2, 2, '#ff7ab8'); r(17, 1, 2, 2, '#ffd84a');
  // круглое окошко
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
    const d = x * x + y * y;
    if (d <= 64) r(11 + x, 15 + y, 1, 1, d > 42 ? '#8f96b0' : '#bfe6ff');
  }
  // блик (он и «вращается»)
  if (turn) { r(13, 11, 3, 1, '#ffffff'); r(15, 12, 1, 3, '#ffffff'); } else { r(6, 12, 1, 3, '#ffffff'); r(7, 11, 3, 1, '#ffffff'); }
});
const compost = (n) => canvasFor(22, 14, (r) => {
  r(0, 3, 22, 11, '#b8743a'); r(0, 3, 22, 1, '#d8985a'); r(0, 13, 22, 1, '#8d5a3b');
  for (const x of [0, 7, 14, 21]) r(x, 2, 1, 12, '#8d5a3b');
  r(1, 7, 20, 1, '#8d5a3b'); r(1, 10, 20, 1, '#8d5a3b');
  // куча растёт
  if (n >= 1) { r(4, 2, 14, 1, '#6b8a3a'); r(6, 1, 9, 1, '#7aa848'); }
  if (n >= 2) { r(5, 0, 12, 1, '#7aa848'); r(8, 1, 3, 1, '#d8a038'); r(13, 2, 2, 1, '#c8603a'); }
  if (n >= 3) { r(7, -1, 8, 1, '#8ac058'); r(9, 0, 2, 1, '#ffd84a'); }
});

export function makeClean(scene) {
  const add = (key, canvas) => { tex(scene, key, canvas); tex(scene, `${key}_icon`, canvas); };
  add('robovac', robot(false));
  tex(scene, 'robovac_on', robot(true));
  add('washer', washer(false));
  tex(scene, 'washer_b', washer(true));
  add('mop', canvasFor(11, 22, (r) => {
    r(5, 0, 1, 16, '#8fa8f2'); r(4, 0, 3, 2, '#5a78d8');
    r(2, 15, 7, 2, '#5a78d8');
    r(0, 17, 11, 5, '#ffffff'); for (const x of [1, 3, 5, 7, 9]) r(x, 18, 1, 4, '#cfe0f2');
  }));
  for (let n = 0; n <= 3; n++) tex(scene, `compost_${n}`, compost(n));
  tex(scene, 'compost_0_icon', compost(1));
  add('fertilizer', canvasFor(10, 12, (r) => {
    r(1, 2, 8, 10, '#c8a070'); r(1, 2, 8, 1, '#e0c090'); r(1, 11, 8, 1, '#a07848'); r(3, 0, 4, 2, '#c8a070'); r(2, 2, 6, 1, '#8d5a3b');
    r(4, 5, 2, 4, '#7ad98a'); r(3, 6, 4, 1, '#7ad98a'); r(4, 4, 2, 1, '#b8ff9a');
  }));
  // след: белый, красится в цвет грязи
  if (!scene.textures.exists('footprint')) {
    const c = document.createElement('canvas');
    c.width = 5; c.height = 3;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 2, 2); g.fillRect(3, 1, 2, 2);
    scene.textures.addCanvas('footprint', c);
  }
  return [
    { id: 'robo-vac', subject: 'robot vacuum', cat: 'toy', tags: ['toy'], tex: 'robovac', robot: true, bbox: [0, 0, 15, 15], order: 32 },
    { id: 'mop', subject: 'floor mop', cat: 'toy', tags: ['toy'], tex: 'mop', mop: true, bbox: [0, 0, 15, 15], order: 33 },
    { id: 'washer', subject: 'washing machine', cat: 'furniture', tags: ['furniture'], tex: 'washer', washer: true, bbox: [0, 0, 15, 15], order: 40 },
    { id: 'compost', subject: 'compost heap', cat: 'garden', tags: ['garden'], tex: 'compost_0', compost: true, bbox: [0, 0, 15, 15], order: 0 },
    { id: 'fertilizer', subject: 'magic fertilizer', cat: 'garden', tags: ['garden'], tex: 'fertilizer', fertilizer: true, bbox: [0, 0, 15, 15], hidden: true },
  ];
}

export function installClean(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  const inRoom = (o, k) => o.x >= k * L.W && o.x < (k + 1) * L.W;
  Object.assign(Room.prototype, {
    /** Робот (спальня), стиральная машина и швабра (ванная), компост (сад) один раз появляются в доме — и в старых сохранениях. */
    ensureClean() {
      if (this.flags.tidy2) return;
      this.flags.tidy2 = true;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const has = (id) => this.objs.some((o) => o.rec?.id === id);
      if (!has('robo-vac')) this.spawnItem(this.byId.get('robo-vac'), Math.round(W * 0.68), ROOM_H - 3);
      if (!has('washer')) this.spawnItem(this.byId.get('washer'), Math.round(3 * W + W * 0.66), FLOOR_TOP + 14);
      if (!has('mop')) this.spawnItem(this.byId.get('mop'), Math.round(3 * W + W * 0.76), FLOOR_TOP + 16);
      if (!has('compost')) this.spawnItem(this.byId.get('compost'), Math.round(2 * W + W * 0.28), FLOOR_TOP + 9);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initClean() {
      this.cleanAt = {};
      this.printImgs = [];
      for (const p of (this.flags.prints ||= [])) this.printImgs.push(this.printImg(p));
      for (const o of this.objs) if (o.beh?.compost) o.setTexture(`compost_${Math.min(o.contents.length, 3)}`);
      // роботы: гудят, пока работают, и сами берут следующую цель
      this.time.addEvent({
        delay: 350, loop: true, callback: () => {
          for (const r of this.objs) {
            if (!r.beh?.robot || !r.running) continue;
            if (this.visible(r)) { sfx.step(); this.fxCrumbs.setParticleTint(0xe6e8f0); this.fxCrumbs.explode(1, r.x, r.y); }
            if (!r.dragging && !this.tweens.isTweening(r)) this.robotNext(r);
          }
        },
      });
    },

    // ---------------------------------------------------------------- награда за чистоту
    /** Комнату убрали: салют, куклы радуются, наклейка «чистюля» (не чаще раза в 20 секунд на комнату). */
    roomClean(room, at) {
      if (this.time.now < (this.cleanAt[room] || 0)) return;
      this.cleanAt[room] = this.time.now + 20000;
      this.stat('clean');
      sfx.fanfare();
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 170, () => {
          this.fxSparks.explode(12, room * L.W + rnd(20, L.W - 20), rnd(L.FLOOR_TOP - 10, L.ROOM_H - 6));
          if (i % 2 === 0) sfx.sparkle();
        });
      }
      for (const c of this.objs) if (c.kind === 'char' && inRoom(c, room) && !c.sleeping && !c.dragging && !c.inTub && !c.restOn) this.celebrate(c, 2);
      const rec = this.big[CLEAN_ROOMS[room]];
      if (rec) this.sticker('tidy', rec, at.x, at.y - 10);
    },

    // ---------------------------------------------------------------- робот-пылесос
    robotTap(r) {
      if (r.running) { this.robotOff(r); sfx.click(); return; }
      r.running = true;
      r.got = 0;
      r.roam = 0;
      r.setTexture('robovac_on');
      sfx.ding();
      this.hintDone('robot');
      this.robotNext(r);
    },

    robotOff(r, done = false) {
      r.running = false;
      this.tweens.killTweensOf(r);
      if (!r.active) return;
      r.setTexture('robovac');
      if (!done) return;
      sfx.ding();
      this.tweens.add({ targets: r, y: r.y - 3, duration: 110, yoyo: true, repeat: 1 });
      if (r.got >= 3) this.roomClean(roomOf(r), r);
      this.save();
    },

    /** Куда робот отвезёт предмет: у каждой вещи в доме своё место. */
    homeFor(o, room) {
      const b = o.beh;
      const find = (pred) => this.objs.find((x) => x.kind === 'item' && !x.dragging && pred(x));
      if (LEAVES.includes(o.rec.subject) || b.edible) {
        const c = find((x) => x.beh.compost && inRoom(x, room));
        if (c) return c;
      }
      if (b.edible || b.drink) { const fr = find((x) => x.beh.fridge); if (fr) return fr; }
      if (o.rec.cat === 'clothing') { const w = find((x) => x.rec.id === 'big_wardrobe'); if (w) return w; }
      return find((x) => x.beh.chest) || find((x) => x.beh.bin && inRoom(x, room)) || null;
    },

    robotNext(r) {
      if (!r.running || !r.active || r.dragging) return;
      const room = roomOf(r);
      const x0 = room * L.W + 10;
      const x1 = (room + 1) * L.W - 10;
      const far = (p) => Math.hypot(p.x - r.x, (p.y - r.y) * 1.5);
      const items = this.litter(room).filter((o) => !o.noHome);
      const prints = this.flags.prints.filter((p) => p[0] >= room * L.W && p[0] < (room + 1) * L.W).map((p) => ({ x: p[0], y: p[1], print: true }));
      const t = [...items, ...prints].sort((a, b) => far(a) - far(b))[0];
      if (!t) {
        // чисто: пара кругов по комнате (упирается в стену и разворачивается) — и выключается
        if (r.roam >= 2) { this.robotOff(r, true); return; }
        r.roam++;
        const tx = r.x < (x0 + x1) / 2 ? x1 : x0;
        this.robotDrive(r, tx, Math.round(rnd(L.FLOOR_TOP + 8, L.ROOM_H - 2)), () => {
          sfx.thud();
          this.tweens.add({ targets: r, x: r.x + (tx === x1 ? -3 : 3), duration: 90, onComplete: () => r.setFlipX(!r.flipX) });
        });
        return;
      }
      r.roam = 0;
      this.robotDrive(r, Phaser.Math.Clamp(t.x, x0, x1), Phaser.Math.Clamp(t.y, L.FLOOR_TOP + 3, L.ROOM_H - 1), () => {
        if (t.print) { this.wipePrints(t.x, t.y, 9); r.got++; return; }
        if (this.isLitter(t)) this.robotSuck(r, t, room);
      });
    },

    robotDrive(r, tx, ty, done) {
      const dist = Math.hypot(tx - r.x, ty - r.y);
      r.setFlipX(tx > r.x);
      this.tweens.add({ targets: r, x: Math.round(tx), y: Math.round(ty), duration: Math.max(120, dist / 46 * 1000), ease: 'Linear', onComplete: () => { if (r.running && r.active) done(); } });
    },

    /** Робот подобрал предмет и «отвёз» его на место: над ним всплывает картинка, куда именно. */
    robotSuck(r, o, room) {
      const home = this.homeFor(o, room);
      if (!home) { o.noHome = true; return; } // класть некуда — не трогает
      r.got++;
      this.takeOut(o);
      this.tweens.add({ targets: o, x: r.x, y: r.y - 2, duration: 160, onComplete: () => this.removeObj(o, true) });
      sfx.pop();
      if (home.beh.compost) this.compostAdd(home, o.rec);
      else if (!home.beh.bin) home.contents.push(o.rec.id);
      if (this.visible(r) && home.rec.tex) {
        const key = `${home.rec.tex.replace(/_\d$/, '_0')}_icon`;
        if (this.textures.exists(key)) {
          const ic = this.add.image(r.x, r.y - 12, key).setDepth(15000);
          this.tweens.add({ targets: ic, y: ic.y - 14, alpha: 0, duration: 800, delay: 150, onComplete: () => ic.destroy() });
        }
      }
      this.save();
    },

    // ---------------------------------------------------------------- стиральная машина
    /** Вещь — в барабан (до трёх; питомцев, мебель и инструменты игры не берёт). */
    washerPut(w, o) {
      if (o.beh.pet || o.beh.furniture || o.rec.tex || o.beh.edible || o.beh.drink) return false;
      if (w.washing || w.contents.length >= 3) { sfx.boing(); return false; }
      this.takeOut(o);
      w.contents.push(o.rec.id);
      this.tweens.add({ targets: o, x: w.x, y: w.y - 10, duration: 200, onComplete: () => this.removeObj(o, true) });
      sfx.chestIn();
      this.tweens.add({ targets: w, y: w.y - 2, duration: 90, yoyo: true });
      this.washerPeek(w);
      return true;
    },

    /** В окошке видно, что лежит в барабане. */
    washerPeek(w) {
      const rec = this.recOf(w.contents[0]);
      w.peek?.destroy();
      w.peek = null;
      if (!rec || rec.tex) return;
      w.peek = this.add.image(w.x, w.y - 12, rec.cat, rec.frame).setAlpha(0.85).setDepth(w.y + 0.1);
      w.once('destroy', () => w.peek?.destroy());
    },

    washerTap(w) {
      if (w.washing) return;
      if (!w.contents.length) { sfx.click(); this.tweens.add({ targets: w, y: w.y - 2, duration: 80, yoyo: true }); return; }
      w.washing = true;
      this.hintDone('wash');
      if (!w.peek) this.washerPeek(w);
      const x0 = w.x;
      let n = 0;
      const spin = this.time.addEvent({
        delay: 160, loop: true, callback: () => {
          if (!w.active) { spin.remove(); return; }
          n++;
          w.setTexture(n % 2 ? 'washer_b' : 'washer');
          w.x = x0 + (n % 2 ? 1 : 0);
          w.peek?.setFlipX(n % 2 === 1).setFlipY(n % 4 >= 2);
          if (n % 3 === 0) { sfx.scrub(); this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(3, w.x + rnd(-8, 8), w.y - w.displayHeight); }
        },
      });
      this.time.delayedCall(WASH_MS, () => {
        spin.remove();
        if (!w.active) return;
        w.washing = false;
        w.x = x0;
        w.setTexture('washer');
        w.peek?.destroy();
        w.peek = null;
        const ids = w.contents.splice(0);
        // иногда в барабане находится носок, которого туда не клали
        if (Math.random() < 0.35) { const sock = this.findRec(pick(SOCKS)); if (sock) ids.push(sock.id); }
        sfx.ding();
        ids.forEach((id, i) => {
          const rec = this.recOf(id);
          if (!rec) return;
          const o = this.spawnItem(rec, w.x, w.y - 8);
          const tx = Math.round(Phaser.Math.Clamp(w.x + (i - (ids.length - 1) / 2) * 16 + rnd(-3, 3), roomOf(w) * L.W + 8, (roomOf(w) + 1) * L.W - 8));
          const ty = Math.round(Phaser.Math.Clamp(w.y + rnd(6, 16), L.FLOOR_TOP + 4, L.ROOM_H - 2));
          this.tweens.add({ targets: o, x: tx, duration: 420 });
          this.tweens.add({ targets: o, y: o.y - 14, duration: 180, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 320, ease: 'Bounce.easeOut' }) });
          this.time.delayedCall(250 + i * 120, () => { if (o.active) this.fxSparks.explode(6, o.x, o.y - 8); });
        });
        this.time.delayedCall(900, () => this.save());
      });
    },

    /** Игрушка или одежда попала в лужу — испачкалась (отстирывается в машине). */
    soil(o) {
      if (o.kind !== 'item' || o.rec.tex || o.beh.pet || o.beh.furniture || o.beh.edible || o.beh.drink) return false;
      o.dirty = true;
      o.setTint(DIRT);
      sfx.splash();
      this.fxCrumbs.setParticleTint(0x7a5232);
      this.fxCrumbs.explode(8, o.x, o.y - 2);
      return true;
    },

    // ---------------------------------------------------------------- следы и швабра
    printImg(p) {
      return this.add.image(p[0], p[1], 'footprint').setTint(p[2]).setDepth(2).setFlipX(!!(p[0] % 2));
    },

    addPrint(x, y, color) {
      const p = [Math.round(x), Math.round(y), color];
      this.flags.prints.push(p);
      this.printImgs.push(this.printImg(p));
      while (this.flags.prints.length > MAX_PRINTS) { this.flags.prints.shift(); this.printImgs.shift().destroy(); }
    },

    /** Стереть следы рядом с точкой; возвращает, сколько стёрто. */
    wipePrints(x, y, rad) {
      let n = 0;
      for (let i = this.flags.prints.length - 1; i >= 0; i--) {
        const p = this.flags.prints[i];
        if (Math.abs(p[0] - x) > rad || Math.abs(p[1] - y) > rad) continue;
        this.flags.prints.splice(i, 1);
        this.printImgs.splice(i, 1)[0].destroy();
        n++;
      }
      if (n) { this.fxCrumbs.setParticleTint(0xbfe6ff); this.fxCrumbs.explode(4, x, y); this.save(); }
      return n;
    },

    printsIn(room) { return this.flags.prints.filter((p) => p[0] >= room * L.W && p[0] < (room + 1) * L.W).length; },

    /** Шваброй ведут по полу — следы стираются; стёрли последние — комната чистая. */
    mopAt(mop) {
      const n = this.wipePrints(mop.x, mop.y, 10);
      if (!n) return;
      if (this.time.now > (mop.sndAt || 0)) { mop.sndAt = this.time.now + 220; sfx.scrub(); }
      if (!mop.wiped) this.stat('mop');
      mop.wiped = (mop.wiped || 0) + n;
      const room = roomOf(mop);
      if (!this.printsIn(room) && mop.wiped >= 3) { mop.wiped = 0; this.roomClean(room, mop); }
    },

    // ---------------------------------------------------------------- компост и удобрение
    compostOf(room) { return this.objs.find((o) => o.beh?.compost && !o.dragging && inRoom(o, room)) || null; },

    compostTakes(o) { return o.kind === 'item' && !o.rec.tex && (LEAVES.includes(o.rec.subject) || o.beh.edible); },

    /** В компост попал лист или объедок; набралось три — выскакивает мешочек удобрения. */
    compostAdd(c, rec) {
      c.contents.push(rec.id);
      c.setTexture(`compost_${Math.min(c.contents.length, 3)}`);
      sfx.dig();
      this.fxCrumbs.setParticleTint(0x6b8a3a);
      this.fxCrumbs.explode(5, c.x, c.y - c.displayHeight);
      this.tweens.add({ targets: c, y: c.y - 2, duration: 90, yoyo: true });
      if (c.contents.length < 3) return;
      this.time.delayedCall(500, () => {
        if (!c.active || c.contents.length < 3) return;
        c.contents.splice(0, 3);
        c.setTexture(`compost_${Math.min(c.contents.length, 3)}`);
        this.stat('compost');
        sfx.sparkle();
        this.fxSparks.explode(12, c.x, c.y - c.displayHeight);
        const room = roomOf(c);
        const f = this.spawnItem(this.byId.get('fertilizer'), c.x, c.y - 10);
        const tx = Math.round(Phaser.Math.Clamp(c.x + (c.x - room * L.W > L.W / 2 ? -20 : 20), room * L.W + 8, (room + 1) * L.W - 8));
        const ty = Math.round(Phaser.Math.Clamp(c.y + rnd(4, 12), L.FLOOR_TOP + 4, L.ROOM_H - 2));
        this.tweens.add({ targets: f, x: tx, duration: 400 });
        this.tweens.add({ targets: f, y: f.y - 14, duration: 180, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: f, y: ty, duration: 300, ease: 'Bounce.easeOut', onComplete: () => this.save() }) });
      });
    },

    /** Удобрение на грядку: всё, что на ней посажено, созревает сразу. */
    fertilize(bed, f) {
      const growing = bed.plots.filter((p) => p && p.stage < 3);
      if (!growing.length) { sfx.boing(); return false; }
      for (const p of growing) { p.stage = 3; p.watered = false; }
      this.renderPlots(bed);
      this.takeOut(f);
      this.removeObj(f, true);
      sfx.sparkle(); sfx.fanfare();
      this.fxSparks.explode(24, bed.x, bed.y - bed.displayHeight - 4);
      for (const img of bed.plantImgs || []) if (img) this.tweens.add({ targets: img, y: img.y - 4, duration: 130, yoyo: true });
      return true;
    },

    // ---------------------------------------------------------------- общее
    /** Предмет отпустили: может, это уборка? (вызывается из drop() раньше обычных правил) */
    cleanDrop(o, q) {
      if (o.kind !== 'item' || q.y > L.ROOM_H) return false;
      const at = (pred) => this.objAt(q.x, q.y, (x) => x.kind === 'item' && x !== o && pred(x));
      // питомец или игрушка — на робота: катаются
      if ((o.beh.pet || o.rec.cat === 'toy') && !o.beh.robot && !o.beh.bin && !o.beh.sweeper && !o.beh.mop) {
        const r = at((x) => x.beh.robot);
        if (r && !this.objs.some((x) => x.restOn === r)) {
          o.restOn = r; o.inTub = null;
          sfx.drop();
          if (o.beh.pet) sfx.squeak();
          this.fxHearts.explode(1, r.x, r.y - 14);
          this.stat('roboride');
          return true;
        }
      }
      const w = at((x) => x.beh.washer);
      if (w && this.washerPut(w, o)) return true;
      if (this.compostTakes(o)) {
        const c = at((x) => x.beh.compost);
        if (c) { this.takeOut(o); this.removeObj(o, true); this.compostAdd(c, o.rec); return true; }
      }
      if (o.beh.fertilizer) {
        const bed = at((x) => x.beh.gardenBed) || this.objs.find((x) => x.beh?.gardenBed && Math.abs(x.x - q.x) < 24 && q.y < x.y && q.y > x.y - 22);
        if (bed && this.fertilize(bed, o)) return true;
      }
      const mud = at((x) => x.beh.puddle);
      if (mud && this.soil(o)) { o.x = Math.round(q.x); o.y = Math.round(Math.max(q.y, mud.y - 2)); return true; }
      return false;
    },

    /** Каждый кадр: седоки робота едут с ним; испачканная кукла оставляет следы. */
    updateClean() {
      for (const o of this.objs) {
        const r = o.restOn;
        if (r?.beh?.robot && !o.dragging) {
          if (!r.active) { o.restOn = null; continue; }
          o.x = r.x;
          o.y = r.y - r.displayHeight + 3;
          o.setDepth(r.depth + 0.2);
        }
        if (o.kind !== 'char' || !o.stain) { if (o.kind === 'char') o.printAt = null; continue; }
        if (o.dragging || o.inTub || o.restOn || o.y <= L.FLOOR_TOP || o.y > L.ROOM_H) continue;
        const at = o.printAt;
        if (!at) { o.printAt = [o.x, o.y]; continue; }
        if (Math.hypot(o.x - at[0], o.y - at[1]) < 9) continue;
        o.printAt = [o.x, o.y];
        this.addPrint(o.x, o.y + 1, o.stain);
      }
    },
  });
}
