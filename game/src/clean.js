// Уборка, вторая волна: то, что убирает само или превращает уборку в игру.
//  • робот-пылесос: приезжает по кнопке (под кнопкой карты) в любую комнату любой локации, подбирает лишнее
//    и разносит по местам (еда — в холодильник, одежда — в шкаф, листья и огрызки — в компост, остальное — в сундук
//    с игрушками; из села, города, моря и парка — домой); ничего не выбрасывает. Убрал — круг почёта и уезжает.
//    Он не предмет дома: в сохранение не попадает и в ящике его нет. Куклу, питомца или игрушку можно посадить
//    сверху — катаются (perch). В море и в бассейне аквапарка — в надувном круге;
//  • стиральная машина (ванная): до трёх вещей в барабан, тап — стирка; выходят чистыми, иногда с носком-сюрпризом.
//    Пачкаются игрушки и одежда в луже грязи;
//  • следы: испачканная кукла оставляет на полу следы; их стирают шваброй (и робот тоже);
//  • компост (сад): три листа или объедка — мешочек удобрения; удобрение на грядку — всё посаженное созревает сразу;
//  • награда: комнату убрали — салют, куклы радуются, наклейка на странице «чистюля».
// Что считается «лишним» — см. isLitter в tidy.js.
import Phaser from 'phaser';
import { canvasFor } from './furniture.js';
import { LEAVES } from './tidy.js';
import { roomAt, R } from './places.js';
import { POOL_TOP } from './parkscene.js';

const tex = (scene, key, canvas) => {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  return key;
};

const SOCKS = ['sock', 'ankle sock', 'knee sock', 'toe sock', 'slipper sock'];
const DIRT = 0x9a7a5a;      // цвет испачканной вещи
const MAX_PRINTS = 30;
const WASH_MS = 2600;

// Робот: 26×12 (в круге — 32×14). f — кадр щёточек, on — огонёк, ring — надувной круг.
const ROBOT_W = 26;
const robot = (f, on, ring = false) => canvasFor(ring ? 32 : ROBOT_W, ring ? 14 : 12, (r0) => {
  const dx = ring ? 3 : 0;
  const r = (x, y, w, h, c) => r0(x + dx, y, w, h, c);
  // щёточки по бокам (крутятся: два кадра)
  const br = f ? [[0, 9], [2, 11]] : [[0, 11], [2, 9]];
  for (const [x, y] of br) { r(x, y - 1, 2, 1, '#c8a04a'); r(ROBOT_W - 2 - x, y - 1, 2, 1, '#c8a04a'); }
  // корпус
  r(3, 3, 20, 7, '#e6e8f0'); r(1, 5, 24, 4, '#e6e8f0'); r(5, 2, 16, 1, '#f6f7fb'); r(2, 4, 22, 1, '#f6f7fb');
  r(1, 9, 24, 1, '#b8bccc'); r(3, 10, 20, 1, '#8f96b0');
  // бампер и колёса
  r(1, 6, 1, 3, '#8fa8f2'); r(24, 6, 1, 3, '#8fa8f2');
  r(6, 11, 3, 1, '#2b1d2e'); r(17, 11, 3, 1, '#2b1d2e');
  // «лицо»: экранчик с глазками
  r(8, 4, 10, 4, '#2b3d6e'); r(10, 5, 2, 2, on ? '#7af2ff' : '#5a78a8'); r(14, 5, 2, 2, on ? '#7af2ff' : '#5a78a8');
  if (on) r(11, 7, 4, 1, '#7af2ff');
  // огонёк на макушке
  r(12, 0, 2, 2, on ? '#7af28a' : '#ef5a6f'); r(12, 2, 2, 1, '#b8bccc');
  if (ring) {
    // надувной круг вокруг: красно-белые полоски, перед корпусом
    for (let x = -3; x < ROBOT_W + 3; x++) r(x, 10, 1, 4, Math.floor((x + 3) / 4) % 2 ? '#ffffff' : '#ef5a6f');
    r(-3, 9, 1, 4, '#ef5a6f'); r(ROBOT_W + 2, 9, 1, 4, '#ffffff');
    r(-2, 9, ROBOT_W + 4, 1, '#ffb0b8');
  }
});
// Значок на кнопке вызова: 13×7
const robotIcon = () => canvasFor(13, 7, (r) => {
  r(2, 1, 9, 5, '#e6e8f0'); r(1, 2, 11, 3, '#e6e8f0'); r(3, 0, 7, 1, '#f6f7fb'); r(1, 5, 11, 1, '#b8bccc');
  r(4, 2, 5, 2, '#2b3d6e'); r(5, 2, 1, 1, '#7af2ff'); r(7, 2, 1, 1, '#7af2ff');
  r(3, 6, 2, 1, '#2b1d2e'); r(8, 6, 2, 1, '#2b1d2e');
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
  add('robovac', robot(0, false));
  for (const ring of ['', 'r']) for (const f of [0, 1]) tex(scene, `robovac${ring}_on${f}`, robot(f, true, !!ring));
  tex(scene, 'robovac_btn', robotIcon());
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
    // робот приезжает по кнопке (callRobot) — в ящике его нет; сверху можно сесть
    { id: 'robo-vac', subject: 'robot vacuum', cat: 'toy', tags: ['toy'], tex: 'robovac', robot: true, hidden: true, bbox: [0, 0, 15, 15], order: 32, beh: { perch: { dy: 9, lo: -6, hi: 6 } } },
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
    /** Стиральная машина и швабра (ванная), компост (сад) один раз появляются в доме — и в старых сохранениях. */
    ensureClean() {
      // робот теперь приезжает по кнопке: тот, что стоял в спальне старых домов, уходит (седоки остаются на полу)
      if (!this.flags.tidy3) {
        this.flags.tidy3 = true;
        for (const o of this.objs.filter((x) => x.beh?.robot)) this.removeObj(o, true);
      }
      if (this.flags.tidy2) return;
      this.flags.tidy2 = true;
      const { W, FLOOR_TOP } = L;
      const has = (id) => this.objs.some((o) => o.rec?.id === id);
      if (!has('washer')) this.spawnItem(this.byId.get('washer'), Math.round(R.bath * W + W * 0.66), FLOOR_TOP + 14);
      if (!has('mop')) this.spawnItem(this.byId.get('mop'), Math.round(R.bath * W + W * 0.76), FLOOR_TOP + 16);
      if (!has('compost')) this.spawnItem(this.byId.get('compost'), Math.round(R.garden * W + W * 0.28), FLOOR_TOP + 9);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initClean() {
      this.cleanAt = {};
      this.printImgs = [];
      for (const p of (this.flags.prints ||= [])) this.printImgs.push(this.printImg(p));
      for (const o of this.objs) if (o.beh?.compost) o.setTexture(`compost_${Math.min(o.contents.length, 3)}`);
      this.robot = null;
      this.buildRobotBtn();
      // робот: гудит и крутит щёточками, пока работает, и сам берёт следующую цель; кнопка зовёт, когда в комнате много лишнего
      this.time.addEvent({
        delay: 350, loop: true, callback: () => {
          const r = this.robot;
          if (r?.active && r.running) {
            r.frame2 = !r.frame2;
            if (this.visible(r)) { sfx.step(); this.fxCrumbs.setParticleTint(0xe6e8f0); this.fxCrumbs.explode(1, r.x, r.y); }
            if (!r.dragging && !r.leaving && !this.tweens.isTweening(r)) this.robotNext(r);
          }
          const here = this.cameras.main.scrollX / L.W;
          const messy = !(r?.active) && Number.isInteger(here) && !this.travelling && this.litter(here).length >= 5;
          this.robotBtnDot.setVisible(messy);
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
      const rec = this.byId.get(roomAt(room).clean); // предмет, которым комната отмечена в альбоме (places.js)
      if (rec) this.sticker('tidy', rec, at.x, at.y - 10);
    },

    // ---------------------------------------------------------------- робот-пылесос
    /** Кнопка вызова — под кнопкой карты; звёздочка на ней — в комнате много лишнего. */
    buildRobotBtn() {
      const b = this.add.rectangle(2, 19, 17, 15, 0x3a8fd8, 0.9).setOrigin(0).setDepth(19000).setScrollFactor(0).setInteractive();
      b.setStrokeStyle(1, 0xffffff, 0.9);
      b.ui = { robot: true };
      const ic = this.add.image(11, 27, 'robovac_btn').setDepth(19001).setScrollFactor(0);
      this.robotBtn = [b, ic];
      this.robotBtnDot = this.add.image(19, 20, 'spark').setTint(0xfff07a).setDepth(19002).setScrollFactor(0).setVisible(false);
      this.tweens.add({ targets: this.robotBtnDot, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
    },

    /** Кнопка: робот приезжает в комнату, где сейчас игрок; если он уже здесь — уезжает. */
    callRobot() {
      if (this.dress || this.albumUi || this.mapUi || this.cardUi || this.travelling || this.dreaming || this.bedtime) return;
      const room = this.targetRoom ?? Math.round(this.cameras.main.scrollX / L.W);
      const old = this.robot?.active ? this.robot : null;
      if (old && !old.leaving && old.home === room) { sfx.click(); this.robotLeave(old); return; }
      if (old) this.robotGone(old); // работал в другой комнате — там и исчез
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? room * L.W - 16 : (room + 1) * L.W + 16;
      const y = Math.round(rnd(L.FLOOR_TOP + 14, L.ROOM_H - 3));
      const r = this.spawnItem(this.byId.get('robo-vac'), x, y);
      r.summoned = true;
      r.home = room;
      r.leaving = false;
      this.robot = r;
      this.stat('robot');
      this.hintDone('robot');
      sfx.ding();
      this.time.delayedCall(180, () => sfx.ding());
      this.robotStart(r);
      // въезжает в комнату
      r.entering = true;
      this.robotDrive(r, fromLeft ? room * L.W + 22 : (room + 1) * L.W - 22, y, () => { r.entering = false; this.robotNext(r); });
    },

    robotTap(r) {
      if (r.leaving) return;
      sfx.click();
      if (!r.running) { this.robotStart(r); this.robotNext(r); return; }
      this.robotLeave(r); // тап по работающему роботу — «спасибо, хватит»
    },

    robotStart(r) {
      r.running = true;
      r.got = 0;
      r.roam = 0;
      this.robotLook(r);
    },

    /** Текстура по обстоятельствам: огонёк, кадр щёточек, круг в воде. Зовётся каждый кадр из updateClean. */
    robotLook(r) {
      const room = r.entering || r.leaving ? r.home : roomOf(r); // за краем комнаты — ещё (уже) в своей
      const wet = room === R.waves || (room === R.aqua && r.y > L.FLOOR_TOP + POOL_TOP + 2);
      const key = r.running || r.leaving ? `robovac${wet ? 'r' : ''}_on${r.frame2 ? 1 : 0}` : 'robovac';
      if (r.texture.key !== key) r.setTexture(key);
    },

    robotOff(r, done = false) {
      r.running = false;
      this.tweens.killTweensOf(r);
      if (!r.active) return;
      this.robotLook(r);
      if (!done) return;
      sfx.ding();
      this.tweens.add({ targets: r, y: r.y - 3, duration: 110, yoyo: true, repeat: 1, onComplete: () => this.robotLeave(r) });
      if (r.got >= 3) this.roomClean(roomOf(r), r);
    },

    /** Уезжает к ближнему краю комнаты и пропадает до следующего вызова; седоки спрыгивают на пол. */
    robotLeave(r) {
      if (!r.active || r.leaving) return;
      r.leaving = true;
      r.running = false;
      this.tweens.killTweensOf(r);
      this.robotUnload(r);
      const room = r.entering ? r.home : Math.max(0, roomOf(r));
      r.entering = false;
      r.home = room;
      const toLeft = r.x - room * L.W < L.W / 2;
      this.robotLook(r);
      sfx.ding();
      this.robotDrive(r, toLeft ? room * L.W - 16 : (room + 1) * L.W + 16, r.y, () => this.robotGone(r), true);
      this.save();
    },

    /** Седоки спрыгивают на пол. */
    robotUnload(r) {
      for (const o of this.objs) {
        if (o.restOn !== r) continue;
        o.restOn = null;
        o.x = Math.round(r.x + rnd(-6, 6));
        o.y = Math.min(L.ROOM_H - 1, Math.round(r.y + 2));
        this.tweens.add({ targets: o, y: o.y - 4, duration: 110, yoyo: true });
        if (o.kind === 'char') sfx.giggle();
      }
    },

    robotGone(r) {
      if (this.robot === r) this.robot = null;
      if (r.active) { this.tweens.killTweensOf(r); this.robotUnload(r); this.removeObj(r, true); }
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
      if (!r.running || !r.active || r.dragging || r.leaving || r.entering) return;
      const room = roomOf(r);
      r.home = room; // могли перенести в другую комнату — убирает там
      const x0 = room * L.W + 10;
      const x1 = (room + 1) * L.W - 10;
      const far = (p) => Math.hypot(p.x - r.x, (p.y - r.y) * 1.5);
      const items = this.litter(room).filter((o) => !o.noHome);
      const prints = this.flags.prints.filter((p) => p[0] >= room * L.W && p[0] < (room + 1) * L.W).map((p) => ({ x: p[0], y: p[1], print: true }));
      const t = [...items, ...prints].sort((a, b) => far(a) - far(b))[0];
      if (!t) {
        // чисто: пара кругов по комнате (упирается в стену и разворачивается) — и уезжает
        // пока на нём катаются — ездит кругами дольше, а не уезжает сразу
        if (r.roam >= (this.objs.some((x) => x.restOn === r) ? 8 : 2)) { this.robotOff(r, true); return; }
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

    robotDrive(r, tx, ty, done, always = false) {
      const dist = Math.hypot(tx - r.x, ty - r.y);
      r.setFlipX(tx > r.x);
      this.tweens.add({
        targets: r, x: Math.round(tx), y: Math.round(ty), duration: Math.max(120, dist / 46 * 1000), ease: 'Linear',
        onComplete: () => { if (r.active && (always || r.running)) done(); },
      });
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

    /** В окошке видно, что лежит в барабане. Картинка привязана к машине: её место каждый кадр задаёт updateClean. */
    washerPeek(w) {
      const rec = this.recOf(w.contents[0]);
      w.peek?.destroy();
      w.peek = null;
      if (!rec || rec.tex) return;
      w.peek = this.add.image(w.x, w.y - 12, rec.cat, rec.frame).setAlpha(0.85).setDepth(w.depth + 0.1);
      if (!w.peekBound) { w.peekBound = true; w.once('destroy', () => w.peek?.destroy()); }
    },

    washerTap(w) {
      if (w.washing) return;
      if (!w.contents.length) { sfx.click(); this.tweens.add({ targets: w, y: w.y - 2, duration: 80, yoyo: true }); return; }
      w.washing = true;
      this.hintDone('wash');
      if (!w.peek) this.washerPeek(w);
      // машину трясёт сдвигом на пиксель относительно того, где она стоит сейчас: её можно двигать и во время стирки
      w.shake = 0;
      let n = 0;
      const spin = this.time.addEvent({
        delay: 160, loop: true, callback: () => {
          if (!w.active) { spin.remove(); return; }
          n++;
          w.setTexture(n % 2 ? 'washer_b' : 'washer');
          const d = w.dragging ? 0 : n % 2;
          if (!w.dragging) w.x += d - w.shake;
          w.shake = d;
          w.peek?.setFlipX(n % 2 === 1).setFlipY(n % 4 >= 2);
          if (n % 3 === 0) { sfx.scrub(); this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(3, w.x + rnd(-8, 8), w.y - w.displayHeight); }
        },
      });
      this.time.delayedCall(WASH_MS, () => {
        spin.remove();
        if (!w.active) return;
        w.washing = false;
        if (!w.dragging) w.x -= w.shake;
        w.shake = 0;
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
      if (q.y > L.ROOM_H) return false;
      const at = (pred) => this.objAt(q.x, q.y, (x) => x.kind === 'item' && x !== o && pred(x));
      // кукла, питомец или игрушка — на робота: катаются (по одному)
      if (o.kind === 'char' || ((o.beh.pet || o.rec.cat === 'toy') && !o.beh.robot && !o.beh.bin && !o.beh.sweeper && !o.beh.mop)) {
        // робот низкий и всё время едет: достаточно бросить «примерно на него» — палец над ним или чуть выше
        const r = at((x) => x.beh.robot && !x.leaving)
          || this.objs.find((x) => x.beh?.robot && !x.leaving && Math.abs(x.x - q.x) < 20 && q.y > x.y - 40 && q.y < x.y + 8);
        if (r && !this.objs.some((x) => x.restOn === r)) {
          this.perchOn(o, r, r.x);
          if (o.beh?.pet) sfx.squeak();
          if (o.kind === 'char') sfx.giggle();
          this.fxHearts.explode(1, r.x, r.y - 14);
          this.stat('roboride');
          return true;
        }
      }
      if (o.kind !== 'item') return false;
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

    /** Каждый кадр: робот и его седок; испачканная кукла оставляет следы. */
    updateClean() {
      const rb = this.robot;
      if (rb?.active) {
        this.robotLook(rb);
      }
      for (const o of this.objs) {
        if (o.beh?.washer) {
          // вещь в окошке едет вместе с машиной (и появляется после перезапуска, если барабан не пуст)
          if (o.contents.length && !o.peek) this.washerPeek(o);
          if (o.peek) o.peek.setPosition(o.x, o.y - 12).setDepth(o.depth + 0.1);
          continue;
        }
        const r = o.restOn;
        if (r?.beh?.robot && !o.dragging) {
          if (!r.active) { o.restOn = null; continue; }
          o.x = r.x;
          o.y = r.y - r.beh.perch.dy + (o.kind === 'char' ? 0 : -3);
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
