// Парк развлечений — пятая локация: зоопарк, аквапарк, аттракционы и спортплощадка (комнаты — в places.js,
// фон — в parkscene.js, рисунки и записи каталога — в parkart.js). Что там можно делать:
//  зоопарк:   бамбуковая роща — выходит панда, красная панда или коала; ледяная скала — пингвин или тюлень
//             (зверей можно кормить, наряжать и увезти домой на повозке); слон трубит и брызгает из хобота,
//             а с седоком на спине — идёт через всю комнату; обезьянка на дереве бросает бананы и носит шапку;
//             слона и обезьянку можно угостить;
//  аквапарк:  куклу — на горку: съезжает по жёлобу в бассейн; в воде она в надувном круге; плот-ватрушка плывёт
//             через бассейн; площадка-фонтанчик бьёт струями и выбрасывает игрушку; ведро на башне опрокидывается
//             на тех, кто под ним; кабинка — купальник (та же, что на пляже);
//  аттракционы: карусель с лошадками крутится под музыку; вагончик-гусеница едет «по горкам»; силомер —
//             шайба летит к колоколу, зазвенел — приз; ларёк со сладкой ватой и попкорном; котёл со сладостями (pots.js);
//  спортплощадка: тап по воротам — мяч летит в сетку (нет мяча — ворота его выкатывают); кольцо — бросок;
//             батут; пьедестал — куклам на нём дают медали; скейт, самокат и велосипед катают куклу.
// Всё, что получилось, — страница «парк» в альбоме.
import Phaser from 'phaser';
import { R } from './places.js';
import { makeParkArt, SLIDE, HOOP, PEDESTAL } from './parkart.js';
import { POOL_TOP } from './parkscene.js';

const BAMBOO = ['panda', 'red panda', 'koala'];
const ICE = ['penguin', 'emperor penguin', 'harp seal'];
/** Что выбрасывает фонтанчик в аквапарке. */
const POOL_TOYS = ['rubber duck', 'swim cap', 'bubble wand', 'inflatable flamingo float'];
/** Что лежит в ларьке: первые три — наклейки. */
const TREATS = ['cotton candy', 'bag of popcorn', 'candy apple'];
const FAIR = [...TREATS, 'caramel apple', 'lollipop', 'hot dog', 'soft pretzel', 'funnel cake', 'waffle on a stick', 'paper cup of soda', 'glass of lemonade', 'pinwheel'];
/** Призы силомера. */
const PRIZES = ['balloon', 'heart balloon', 'balloon dog'];
const MEDALS = ['medal on ribbon', 'star-shaped medal', 'prize ribbon rosette'];
/** Чем играют в ворота и в кольцо. */
const BALLS = ['soccer ball', 'rubber ball', 'tennis ball', 'rugby ball', 'beach ball', 'bouncy ball', 'golf ball', 'cricket ball', 'ping pong ball'];

// Подсказки-облачка, приманки и страница альбома — дописываются к общим спискам в main.js и stickers.js
export const PARK_HINTS = {
  bamboo: { room: R.zoo, seq: () => ['bamboo', 'panda'] },
  icepool: { room: R.zoo, seq: () => ['icepool', 'penguin'] },
  elephant: { room: R.zoo, seq: () => ['elephant', 'tex:water_drop'] },
  monkey: { room: R.zoo, seq: () => ['monkeytree', 'banana'] },
  zoofeed: { room: R.zoo, seq: () => [Math.random() < 0.5 ? 'banana' : 'watermelon slice', 'elephant'] },
  slide: { room: R.aqua, seq: () => ['slide', 'tex:water_drop'] },
  raft: { room: R.aqua, seq: () => ['raft'] },
  geyser: { room: R.aqua, seq: () => ['geyser', 'rubber duck'] },
  tipbucket: { room: R.aqua, seq: () => ['tipbucket', 'tex:water_drop'] },
  carousel: { room: R.rides, seq: () => ['carousel'] },
  coaster: { room: R.rides, seq: () => ['coaster'] },
  hammer: { room: R.rides, seq: () => ['hammer', 'balloon'] },
  treats: { room: R.rides, seq: () => ['treats', 'cotton candy'] },
  goal: { room: R.sport, seq: () => ['soccer ball', 'goal', 'victory cup'] },
  hoop: { room: R.sport, seq: () => ['rubber ball', 'hoop', 'loving cup'] },
  trampoline: { room: R.sport, seq: () => ['trampoline'] },
  winners: { room: R.sport, seq: () => ['pedestal', 'medal on ribbon'] },
  wheels: { room: R.sport, seq: () => ['skateboard'] },
};
export const PARK_LURES = [['bamboo', (b) => b.bamboo], ['icepool', (b) => b.icepool], ['elephant', (b) => b.elephant], ['monkey', (b) => b.monkey],
  ['slide', (b) => b.slide], ['raft', (b) => b.raft], ['geyser', (b) => b.geyser], ['tipbucket', (b) => b.tipbucket],
  ['carousel', (b) => b.carousel], ['coaster', (b) => b.coaster], ['hammer', (b) => b.hammer], ['treats', (b) => b.treats],
  ['goal', (b) => b.goal], ['hoop', (b) => b.hoop], ['trampoline', (b) => b.trampoline], ['winners', (b) => b.pedestal]];
/** Страница «парк» в альбоме: [что получилось, из чего (предмет каталога, id или ключ текстуры), чем]. */
export const PARK_STICKERS = [
  ...BAMBOO.map((s) => [s, 'bamboo', 'spark']), ...ICE.map((s) => [s, 'icepool', 'spark']), ['banana', 'monkeytree', 'spark'],
  ...POOL_TOYS.map((s) => [s, 'geyser', 'spark']),
  ...TREATS.map((s) => [s, 'treats', 'spark']), ...PRIZES.map((s) => [s, 'hammer', 'spark']),
  ['victory cup', 'soccer ball', 'goal'], ['loving cup', 'rubber ball', 'hoop'], ...MEDALS.map((s) => [s, 'pedestal', 'spark']),
];

export function makePark(scene) { return makeParkArt(scene); }

export function installPark(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  const TAU = Math.PI * 2;
  Object.assign(Room.prototype, {
    // ---------------------------------------------------------------- расстановка
    /** Парк один раз обставляется — и в старых сохранениях. */
    ensurePark() {
      if (this.flags.park) return;
      this.flags.park = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const at = (room) => {
        const x0 = room * W;
        const rec = (id) => this.byId.get(id) || this.findRec(id);
        return (id, fx, y, extra) => { const r = rec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y), extra) : null; };
      };
      // ---- зоопарк
      let put = at(R.zoo);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('bamboo', 0.13, FLOOR_TOP + 8);
      put('icepool', 0.31, FLOOR_TOP + 14);
      put('elephant', 0.48, FLOOR_TOP + 22);
      put('monkeytree', 0.65, FLOOR_TOP + 8);
      put('flamingo', 0.38, ROOM_H - 6);
      put('watermelon slice', 0.57, ROOM_H - 4);
      put('peanut', 0.2, ROOM_H - 8);
      put('carrot', 0.68, ROOM_H - 3);
      // ---- аквапарк
      put = at(R.aqua);
      put('tidy-bin', 22 / W, FLOOR_TOP + 13); // на плитке: ниже — бассейн
      put('slide', 0.2, FLOOR_TOP + 12);
      put('tipbucket', 0.47, FLOOR_TOP + 10);
      put('geyser', 0.62, FLOOR_TOP + 13);
      put('cabin', 0.78, FLOOR_TOP + 8);
      put('deck chair', 0.92, FLOOR_TOP + 13);
      put('raft', 0.6, ROOM_H - 5);
      put('beach ball', 0.4, ROOM_H - 9);
      put('inflatable swim ring', 0.74, ROOM_H - 11);
      put('rubber duck', 0.88, ROOM_H - 6);
      // ---- аттракционы (котёл со сладостями ставит ensurePots)
      put = at(R.rides);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('carousel', 0.2, FLOOR_TOP + 18);
      put('hammer', 0.52, FLOOR_TOP + 8);
      put('treats', 0.76, FLOOR_TOP + 8);
      put('coaster', 0.5, ROOM_H - 4);
      put('balloon', 0.9, ROOM_H - 8);
      put('pinwheel', 0.36, ROOM_H - 6);
      // ---- спортплощадка
      put = at(R.sport);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('goal', 0.15, FLOOR_TOP + 12);
      put('hoop', 0.35, FLOOR_TOP + 8);
      put('trampoline', 0.53, FLOOR_TOP + 18);
      put('pedestal', 0.78, FLOOR_TOP + 15);
      put('soccer ball', 0.3, ROOM_H - 8);
      put('rubber ball', 0.44, ROOM_H - 4);
      put('skateboard', 0.7, ROOM_H - 3);
      put('kick scooter', 0.92, ROOM_H - 6);
      put('jump rope', 0.84, ROOM_H - 2);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initPark() {
      this.parkJingleAt = 0;
    },

    /** Каждый кадр: карусель и её седоки, седоки слона, плота, гусеницы и самокатов. */
    updatePark(time, delta) {
      for (const o of this.objs) {
        if (o.kind === 'char' && o.rideBack && !o.restOn?.beh?.carousel) o.rideBack = false;
        if (o.sliding && !this.tweens.isTweening(o)) o.sliding = false; // с горки сняли на полпути
        if (o.kind !== 'item') continue;
        const b = o.beh;
        if (b.carousel) this.carouselStep(o, time, delta);
        else if (b.coaster) this.rideSync(o);
        else if (b.elephant || b.raft || b.wheels) this.tractorSync(o);
      }
    },

    /** Вагончик сдвинулся (и вбок, и вверх) — седоки сдвигаются на столько же. */
    rideSync(t) {
      const dx = t.x - (t.lastX ?? t.x);
      const dy = t.y - (t.lastY ?? t.y);
      t.lastX = t.x;
      t.lastY = t.y;
      if ((dx || dy) && !t.dragging) for (const r of this.objs) if (r.restOn === t && !r.dragging) { r.x += dx; r.y += dy; }
    },

    /** Кукла в бассейне аквапарка (там она в надувном круге — см. updateSea). */
    inPool(o) { return roomOf(o) === R.aqua && o.y > L.FLOOR_TOP + POOL_TOP + 2; },

    /** Подарок парка: предмет выскакивает, наклейка — на страницу «парк». */
    parkGift(rec, x, y, dir = 0) { return this.cityGift(rec, x, y, dir, 'park'); },

    /** Из списка — сначала то, чьей наклейки ещё нет (чаще, но не всегда). */
    parkFresh(list, chance = 0.7) {
      const recs = list.map((sub) => this.findRec(sub)).filter(Boolean);
      const fresh = recs.filter((r) => !this.stickers.has('park', r.subject));
      return recs.length ? pick(fresh.length && Math.random() < chance ? fresh : recs) : null;
    },

    /** Все, кто свободно стоит рядом с точкой: подпрыгивают и смеются (обрызгали, подбросило струёй). */
    parkHop(room, x, y, dx, dy, h = 8) {
      let n = 0;
      for (const c of this.objs) {
        if (c.dragging || c.restOn || c.owner || c.inTub || roomOf(c) !== room || Math.abs(c.x - x) > dx || Math.abs(c.y - y) > dy) continue;
        if (c.kind === 'char' ? c.busy || c.sleeping || c.walking : !(c.beh.pet || c.rec.cat === 'toy')) continue;
        n++;
        const y0 = c.y;
        if (c.kind === 'char') { c.busy = true; c.hopBusy = true; c.setTexture(c.key + '_open'); this.time.delayedCall(200, () => sfx.giggle()); }
        this.tweens.add({
          targets: c, y: y0 - h, duration: 140 + h * 6, yoyo: true, ease: 'Quad.easeOut',
          onComplete: () => { c.y = y0; if (c.kind === 'char') { c.busy = false; c.hopBusy = false; c.setTexture(c.key); } },
        });
      }
      return n;
    },

    // ---------------------------------------------------------------- тап и бросок
    /** Тап по предмету парка. true — тап обработан. */
    parkTap(o) {
      const b = o.beh;
      if (b.bamboo) { this.bambooTap(o); return true; }
      if (b.icepool) { this.iceTap(o); return true; }
      if (b.elephant) { this.elephantTap(o); return true; }
      if (b.monkey) { this.monkeyTap(o); return true; }
      if (b.slide) { sfx.blub(); this.fxCrumbs.setParticleTint(0x9fe4f7); this.fxCrumbs.explode(6, o.x + 20, o.y - 6); this.tweens.add({ targets: o, y: o.y - 1, duration: 70, yoyo: true }); return true; }
      if (b.tipbucket) { this.bucketTap(o); return true; }
      if (b.geyser) { this.geyserTap(o); return true; }
      if (b.raft) { this.raftTap(o); return true; }
      if (b.carousel) { this.carouselTap(o); return true; }
      if (b.coaster) { this.coasterTap(o); return true; }
      if (b.hammer) { this.hammerTap(o); return true; }
      if (b.treats) { this.treatsTap(o); return true; }
      if (b.goal) { this.goalTap(o); return true; }
      if (b.hoop) { this.hoopTap(o); return true; }
      if (b.trampoline) { if (!this.bounce(o, 'trampoline')) this.trampolineTap(o); return true; }
      if (b.pedestal) { this.pedestalTap(o); return true; }
      if (b.wheels && !o.owner) { this.wheelsTap(o); return true; }
      return false;
    },

    /** Предмет или куклу бросили на что-то из парка. true — бросок обработан. */
    parkDrop(o, q) {
      if (q.y > L.ROOM_H) return false;
      const under = (pred) => this.objAt(q.x, q.y, (x) => x !== o && x.kind === 'item' && pred(x.beh));
      const rider = o.kind === 'char' || !!o.beh?.pet || o.rec?.cat === 'toy';
      if (rider) {
        const sl = under((b) => b.slide);
        if (sl && this.slideDown(sl, o)) return true;
        const ped = under((b) => b.pedestal);
        if (ped) { this.pedestalOn(o, ped, q.x); return true; }
      }
      if (o.kind !== 'item') return false;
      if (BALLS.includes(o.rec.subject)) {
        const g = under((b) => b.goal || b.hoop);
        if (g) { o.x = Math.round(q.x); o.y = Math.round(q.y); this.shoot(o, g); return true; }
      }
      if (o.beh.edible) {
        const a = under((b) => b.elephant || b.monkey);
        if (a) { this.zooFeed(a, o); return true; }
      }
      if (o.beh.head) {
        const tree = under((b) => b.monkey);
        if (tree) { this.petWear(tree, o); this.hintDone('monkey'); return true; }
      }
      return false;
    },

    // ---------------------------------------------------------------- зоопарк
    /** Роща или скала шуршит, кто-то выглядывает — и выходит наружу (пока зверей здесь не станет трое). */
    habitatTap(h, list, wet) {
      if (this.time.now < (h.busyUntil || 0)) return false;
      h.busyUntil = this.time.now + 1000;
      const tex = h.rec.tex;
      h.setTexture(`${tex}_b`);
      this.time.delayedCall(700, () => { if (h.active) h.setTexture(tex); });
      const x0 = h.x;
      this.tweens.add({ targets: h, x: x0 + 1, duration: 60, yoyo: true, repeat: 3, onComplete: () => { if (h.active) h.x = x0; } });
      if (wet) { sfx.splash(); this.fxCrumbs.setParticleTint(0xdff4ff); this.fxCrumbs.explode(8, h.x + 8, h.y - 8); } else { sfx.rustle(); this.fxCrumbs.setParticleTint(0x6cc04a); this.fxCrumbs.explode(8, h.x, h.y - h.displayHeight * 0.6); }
      const room = roomOf(h);
      if (this.roomFull(room) || this.countIn(room, (o) => list.includes(o.rec.subject)) >= 3) { this.fxHearts.explode(2, h.x, h.y - h.displayHeight * 0.5); return true; }
      const rec = this.parkFresh(list);
      this.time.delayedCall(380, () => {
        if (!h.active || !rec) return;
        sfx.squeak();
        this.parkGift(rec, h.x + (wet ? 8 : 0), h.y - 6);
      });
      return true;
    },

    bambooTap(h) { if (this.habitatTap(h, BAMBOO, false)) this.hintDone('bamboo'); },

    iceTap(h) { if (this.habitatTap(h, ICE, true)) this.hintDone('icepool'); },

    /** Слон: с седоком на спине идёт через комнату; без седока — трубит и пускает фонтан из хобота. */
    elephantTap(e) {
      const riders = this.objs.filter((r) => r.restOn === e && !r.dragging);
      if (riders.length) {
        const dust = (t) => { this.fxCrumbs.setParticleTint(0xe8d39a); this.fxCrumbs.explode(2, t.x - (t.flipX ? -12 : 12), t.y - 1); if (this.visible(t)) sfx.thud(); };
        if (!this.rollAcross(e, { ms: 22, turn: true, tick: dust, padR: 74 })) return; // до остановки и повозки не доходит
        this.hintDone('elephant');
        sfx.toot();
        if (riders.some((r) => r.kind === 'char')) sfx.whee();
        return;
      }
      if (this.time.now < (e.busyUntil || 0) || (e.rolling && this.tweens.isTweening(e))) return;
      e.busyUntil = this.time.now + 1500;
      this.hintDone('elephant');
      e.setTexture('elephant_b');
      sfx.toot();
      const dir = e.flipX ? -1 : 1;
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(150 + i * 100, () => {
          if (!e.active) return;
          this.fxCrumbs.setParticleTint(i % 2 ? 0x8fd6f7 : 0xdff4ff);
          this.fxCrumbs.explode(5, e.x + dir * (24 + i * 5), e.y - 36 + i * 4);
        });
      }
      this.time.delayedCall(500, () => { if (e.active) { sfx.splash(); this.parkHop(roomOf(e), e.x + dir * 42, e.y, 20, 26); } });
      this.time.delayedCall(1200, () => { if (e.active) e.setTexture('elephant'); });
    },

    /** Обезьянка машет и бросает банан. */
    monkeyTap(t) {
      if (this.time.now < (t.busyUntil || 0)) return;
      t.busyUntil = this.time.now + 800;
      this.hintDone('monkey');
      t.setTexture('monkeytree_b');
      this.time.delayedCall(550, () => { if (t.active) t.setTexture('monkeytree'); });
      sfx.squeak();
      this.time.delayedCall(140, () => sfx.squeak());
      const room = roomOf(t);
      if (this.roomFull(room) || this.countIn(room, (o) => o.rec.subject === 'banana') >= 5) { this.fxHearts.explode(2, t.x + 11, t.y - 34); return; }
      this.parkGift('banana', t.x + 13, t.y - 30, 1);
    },

    /** Угощение слону или обезьянке: съедают и радуются. */
    zooFeed(a, food) {
      this.objs = this.objs.filter((x) => x !== food);
      food.disableInteractive();
      const ele = !!a.beh.elephant;
      const mx = ele ? a.x + (a.flipX ? -18 : 18) : a.x + 11;
      const my = ele ? a.y - 12 : a.y - 30;
      this.tweens.add({ targets: food, x: mx, y: my, alpha: 0, duration: 260, onComplete: () => food.destroy() });
      this.hintDone('zoofeed');
      sfx.chew();
      this.time.delayedCall(350, () => {
        if (!a.active) return;
        this.fxHearts.explode(4, mx, my - 6);
        a.setTexture(`${a.rec.tex}_b`);
        if (ele) sfx.toot(); else sfx.squeak();
        if (!(a.rolling && this.tweens.isTweening(a))) this.tweens.add({ targets: a, y: a.y - 3, duration: 110, yoyo: true, repeat: 1 });
        this.time.delayedCall(700, () => { if (a.active) a.setTexture(a.rec.tex); });
      });
    },

    // ---------------------------------------------------------------- аквапарк
    /** Куклу (питомца, игрушку) посадили на горку: съезжает по жёлобу и плюхается в бассейн. */
    slideDown(sl, o) {
      if (o.kind === 'char' && o.busy) return false;
      if (o.sliding && this.tweens.isTweening(o)) return false;
      const k = sl.flipX ? -1 : 1;
      const pt = (cx) => ({ x: Math.round(sl.x + k * (cx - SLIDE.w / 2)), y: Math.round(sl.y - (SLIDE.h - SLIDE.y(cx)) + 4) });
      const isChar = o.kind === 'char';
      o.restOn = null;
      o.inTub = null;
      o.sliding = true;
      if (isChar) { o.busy = true; o.hopBusy = true; o.setTexture(o.key + '_open'); }
      const a = pt(SLIDE.x0);
      o.x = a.x;
      o.y = a.y;
      o.slideK = 0;
      this.hintDone('slide');
      sfx.whee();
      const room = roomOf(sl);
      const done = () => { o.sliding = false; if (isChar) { o.busy = false; o.hopBusy = false; o.setTexture(o.key); } };
      this.tweens.add({
        targets: o, slideK: 1, duration: 850, ease: 'Quad.easeIn',
        onUpdate: () => {
          const p = pt(SLIDE.x0 + (SLIDE.x1 - SLIDE.x0) * o.slideK);
          o.x = p.x;
          o.y = p.y;
          if (Math.random() < 0.3) { this.fxCrumbs.setParticleTint(0xdff4ff); this.fxCrumbs.explode(1, o.x, o.y - 2); }
        },
        onComplete: () => {
          const tx = Math.round(Phaser.Math.Clamp(sl.x + k * 34, room * L.W + 10, (room + 1) * L.W - 10));
          const ty = Math.round(Phaser.Math.Clamp(sl.y + 12, L.FLOOR_TOP + POOL_TOP + 6, L.ROOM_H - 2));
          this.tweens.add({
            targets: o, x: tx, y: ty, duration: 200, ease: 'Quad.easeIn',
            onComplete: () => {
              done();
              sfx.splash();
              this.fxCrumbs.setParticleTint(0xffffff);
              this.fxCrumbs.explode(12, o.x, o.y - 4);
              this.fxCrumbs.setParticleTint(0x4fc4e8);
              this.fxCrumbs.explode(8, o.x, o.y - 2);
              if (isChar) { sfx.giggle(); this.fxHearts.explode(3, o.x, o.y - o.displayHeight); }
              this.save();
            },
          });
        },
      });
      return true;
    },

    /** Ведро на башне наполняется, опрокидывается — и все, кто под ним, мокрые и довольные. */
    bucketTap(b) {
      if (this.time.now < (b.busyUntil || 0)) return;
      b.busyUntil = this.time.now + 2300;
      this.hintDone('tipbucket');
      const x0 = b.x;
      this.tweens.add({ targets: b, x: x0 + 1, duration: 70, yoyo: true, repeat: 4, onComplete: () => { if (b.active) b.x = x0; } });
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 170, () => sfx.blub());
      this.time.delayedCall(650, () => {
        if (!b.active) return;
        b.setTexture('tipbucket_b');
        sfx.splash();
        sfx.swish();
        this.fxCrumbs.setParticleTint(0xdff4ff);
        this.fxCrumbs.explode(16, b.x, b.y - 4);
        this.fxCrumbs.setParticleTint(0x8fd6f7);
        this.fxCrumbs.explode(10, b.x, b.y - 14);
        if (this.parkHop(roomOf(b), b.x, b.y + 6, 15, 12, 6)) this.fxHearts.explode(3, b.x, b.y - 24);
      });
      this.time.delayedCall(1700, () => { if (b.active) b.setTexture('tipbucket'); });
    },

    /** Площадка-фонтанчик: три струи бьют вверх, подбрасывают тех, кто на ней стоит, и выносят игрушку. */
    geyserTap(g) {
      if (this.time.now < (g.busyUntil || 0)) return;
      g.busyUntil = this.time.now + 1300;
      this.hintDone('geyser');
      sfx.splash();
      sfx.blub();
      for (const dx of [-7, 0, 7]) {
        const jet = this.add.image(g.x + dx, g.y - 2, 'geyser_jet').setOrigin(0.5, 1).setDepth(g.y + 20);
        const h = jet.height;
        jet.jetK = 0;
        jet.setCrop(0, 0, jet.width, 0);
        this.tweens.add({
          targets: jet, jetK: 1, duration: 260, delay: Math.abs(dx) * 12, yoyo: true, hold: 420,
          onUpdate: () => { const v = Math.round(h * jet.jetK); jet.setCrop(0, 0, jet.width, v); jet.y = g.y - 2 + (h - v); },
          onComplete: () => jet.destroy(),
        });
      }
      this.fxCrumbs.setParticleTint(0xdff4ff);
      this.fxCrumbs.explode(10, g.x, g.y - 20);
      const room = roomOf(g);
      if (this.parkHop(room, g.x, g.y, 12, 9, 16)) sfx.whee();
      if (this.roomFull(room) || this.countIn(room, (o) => POOL_TOYS.includes(o.rec.subject)) >= 5) return;
      const rec = this.parkFresh(POOL_TOYS);
      if (rec) this.time.delayedCall(300, () => { if (g.active) this.parkGift(rec, g.x, g.y - 18); });
    },

    raftTap(t) {
      const splash = (r) => { this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(2, r.x + rnd(-12, 12), r.y - 1); };
      if (!this.rollAcross(t, { ms: 16, tick: splash })) return;
      this.hintDone('raft');
      sfx.swish();
      if (this.objs.some((r) => r.restOn === t && r.kind === 'char')) sfx.whee();
    },

    // ---------------------------------------------------------------- аттракционы
    /** Карусель каждый кадр: три лошадки ходят по кругу (дальние — за столбом), седоки — на них. */
    carouselStep(c, time, delta) {
      if (!c.horses) {
        c.horses = [0, 1, 2].map((i) => this.add.image(c.x, c.y, `carohorse_${i}`).setOrigin(0.5, 1));
        c.roof = this.add.image(c.x, c.y, 'carousel_roof').setOrigin(0.5, 1); // крыша поверх седоков
        c.once('destroy', () => { c.horses.forEach((h) => h.destroy()); c.roof.destroy(); });
        c.spin = c.uid % 5;
      }
      const spinning = time < (c.spinUntil || 0);
      if (spinning) {
        c.spin += delta * 0.0024;
        const key = Math.floor(time / 180) % 2 ? 'carousel_b' : 'carousel';
        if (c.texture.key !== key) c.setTexture(key);
        if (time > this.parkJingleAt && this.visible(c)) { this.parkJingleAt = time + 1100; sfx.jingle(); }
      }
      const roofKey = `${c.texture.key}_roof`;
      if (c.roof.texture.key !== roofKey) c.roof.setTexture(roofKey);
      c.roof.setPosition(c.x, c.y).setDepth(c.depth + 0.7);
      const riders = this.objs.filter((r) => r.restOn === c && !r.dragging).sort((a, b) => a.uid - b.uid);
      c.horses.forEach((h, i) => {
        const a = c.spin + (i * TAU) / 3;
        const front = Math.cos(a) >= 0;
        const hx = Math.round(c.x + Math.sin(a) * 18);
        const hy = Math.round(c.y - 5 + Math.sin(a * 2 + i) * 2);
        h.setPosition(hx, hy).setFlipX(!front).setDepth(c.depth + (front ? 0.6 : -0.3)).setVisible(!c.dragging);
        riders.forEach((r, n) => {
          if (n % 3 !== i) return;
          r.x = hx;
          r.y = hy - (r.kind === 'char' ? 6 : 10);
          r.rideBack = !front;
          if (r.kind !== 'char' || !r.busy) r.setFlipX(!front);
        });
      });
      if (c.wasSpinning && !spinning) {
        c.setTexture('carousel');
        for (const r of riders) if (r.kind === 'char') { sfx.giggle(); this.fxHearts.explode(2, r.x, r.y - r.displayHeight); }
        this.save();
      }
      c.wasSpinning = spinning;
    },

    carouselTap(c) {
      const now = this.time.now;
      c.spinUntil = Math.min(now + 9000, Math.max(now, c.spinUntil || 0) + 4500);
      this.hintDone('carousel');
      this.fxSparks.explode(6, c.x, c.y - c.displayHeight + 6);
      if (this.objs.some((r) => r.restOn === c && r.kind === 'char')) sfx.whee(); else sfx.ding();
    },

    /** Вагончик-гусеница едет к другому краю «по горкам» — вместе с седоками. */
    coasterTap(t) {
      if (t.rolling && this.tweens.isTweening(t)) return;
      const riders = this.objs.filter((r) => r.restOn === t && !r.dragging);
      const room = roomOf(t);
      const lo = room * L.W + 28;
      const hi = (room + 1) * L.W - 28;
      const tx = t.x < (lo + hi) / 2 ? hi : lo;
      if (t.flipX !== tx < t.x) {
        t.setFlipX(tx < t.x);
        for (const r of riders) r.x = Math.round(2 * t.x - r.x);
      }
      const x0 = t.x;
      const y0 = t.y;
      t.lastX = x0;
      t.lastY = y0;
      t.rolling = true;
      this.hintDone('coaster');
      sfx.toot();
      if (riders.some((r) => r.kind === 'char')) sfx.whee();
      const clack = this.time.addEvent({ delay: 230, loop: true, callback: () => { if (t.active && t.rolling && this.tweens.isTweening(t)) { if (this.visible(t)) sfx.rattle(); } else clack.remove(); } });
      this.tweens.add({
        targets: t, x: tx, duration: Math.abs(tx - x0) * 12, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const k = (t.x - x0) / (tx - x0 || 1);
          t.y = Math.round(y0 - Math.abs(Math.sin(k * Math.PI * 3)) * 7);
          this.rideSync(t);
        },
        onComplete: () => {
          t.y = y0;
          this.rideSync(t);
          t.rolling = false;
          clack.remove();
          for (const r of riders) if (r.kind === 'char' && r.restOn === t) { sfx.giggle(); this.fxHearts.explode(2, r.x, r.y - r.displayHeight); }
          this.save();
        },
      });
    },

    /** Силомер: шайба летит вверх по столбу. Каждый второй удар — до самого колокола: звон и приз. */
    hammerTap(m) {
      if (m.hamBusy) return;
      m.hamBusy = true;
      this.hintDone('hammer');
      sfx.thud();
      m.hits = (m.hits || 0) + 1;
      const win = m.hits % 2 === 0 || Math.random() < 0.35;
      const base = m.y - 9;
      const top = m.y - m.displayHeight + 10;
      const peak = Math.round(win ? top : base - (base - top) * rnd(0.3, 0.8));
      const puck = this.add.image(m.x + 2, base, 'hammer_puck').setDepth(m.depth + 0.3);
      this.tweens.add({ targets: m, y: m.y + 1, duration: 60, yoyo: true });
      const end = () => { puck.destroy(); m.hamBusy = false; if (m.active) m.setTexture('hammer'); };
      this.tweens.add({
        targets: puck, y: peak, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => {
          if (win && m.active) {
            m.setTexture('hammer_b');
            sfx.ding();
            this.time.delayedCall(120, () => sfx.ding());
            this.fxSparks.explode(10, m.x, top - 4);
            const room = roomOf(m);
            const rec = this.parkFresh(PRIZES);
            if (rec && !this.roomFull(room) && this.countIn(room, (o) => PRIZES.includes(o.rec.subject)) < 6) this.parkGift(rec, m.x, m.y - 8);
          } else sfx.boing();
          this.tweens.add({ targets: puck, y: base, duration: 420, ease: 'Quad.easeIn', onComplete: end });
        },
      });
    },

    /** Ларёк: сладкая вата, попкорн, яблоко в карамели и другие угощения. */
    treatsTap(o) {
      if (this.time.now < (o.busyUntil || 0)) return;
      o.busyUntil = this.time.now + 450;
      this.tweens.add({ targets: o, y: o.y - 2, duration: 80, yoyo: true });
      this.hintDone('treats');
      sfx.jingle();
      if (this.roomFull(roomOf(o))) { sfx.boing(); return; }
      this.fairList ||= FAIR.map((sub) => this.findRec(sub)).filter(Boolean);
      const fresh = TREATS.map((sub) => this.findRec(sub)).filter((r) => r && !this.stickers.has('park', r.subject));
      const rec = fresh.length && Math.random() < 0.6 ? pick(fresh) : pick(this.fairList);
      if (!rec) return;
      const x = o.x + rnd(-8, 8);
      if (TREATS.includes(rec.subject)) this.parkGift(rec, x, o.y - 16); else { sfx.chestOut(); this.popItem(rec, x, o.y - 16); }
    },

    // ---------------------------------------------------------------- спортплощадка
    /** Ближайший свободный мяч в комнате. */
    ballNear(room, x) {
      const now = this.time.now;
      return this.objs.filter((o) => o.kind === 'item' && BALLS.includes(o.rec.subject) && !o.owner && !o.dragging && !o.restOn && roomOf(o) === room && now > (o.flyUntil || 0))
        .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] || null;
    },

    /** Тап по воротам: ближайший мяч летит в сетку. Мяча нет — ворота выкатывают новый. */
    goalTap(g) {
      if (this.time.now < (g.busyUntil || 0)) return;
      g.busyUntil = this.time.now + 500;
      const room = roomOf(g);
      const ball = this.ballNear(room, g.x);
      if (ball) { this.shoot(ball, g); return; }
      this.tweens.add({ targets: g, y: g.y - 2, duration: 80, yoyo: true });
      sfx.chestOut();
      if (!this.roomFull(room)) this.popItem(this.findRec('soccer ball'), g.x, g.y - 6, 1);
    },

    hoopTap(h) {
      if (this.time.now < (h.busyUntil || 0)) return;
      h.busyUntil = this.time.now + 500;
      const room = roomOf(h);
      const ball = this.ballNear(room, h.x);
      if (ball) { this.shoot(ball, h); return; }
      this.tweens.add({ targets: h, y: h.y - 2, duration: 80, yoyo: true });
      sfx.chestOut();
      if (!this.roomFull(room)) this.popItem(this.findRec('rubber ball'), h.x + 8, h.y - 6, 1);
    },

    /** Мяч летит дугой в ворота или в кольцо: гол — трибуны хлопают; за первый — кубок. */
    shoot(ball, target) {
      const now = this.time.now;
      if (now < (ball.flyUntil || 0)) return;
      ball.flyUntil = now + 1500;
      const hoop = !!target.beh.hoop;
      const room = roomOf(target);
      const tx = Math.round(hoop ? target.x + (target.flipX ? -1 : 1) * HOOP.dx : target.x + rnd(-8, 8));
      const ty = Math.round(hoop ? target.y - HOOP.dy : target.y - 9);
      const top = Math.min(ball.y, ty) - (hoop ? 12 : 16);
      const ms = Phaser.Math.Clamp(Math.abs(tx - ball.x) * 5, 260, 620);
      sfx.thud();
      this.tweens.killTweensOf(ball);
      this.tweens.add({ targets: ball, x: tx, duration: ms });
      this.tweens.add({
        targets: ball, y: top, duration: ms / 2, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({
          targets: ball, y: ty, duration: ms / 2, ease: 'Quad.easeIn',
          onComplete: () => {
            if (!target.active) { this.settle(ball); return; }
            sfx.fanfare();
            this.time.delayedCall(250, () => sfx.applause());
            this.fxSparks.explode(14, tx, ty - 4);
            const cup = this.findRec(hoop ? 'loving cup' : 'victory cup');
            if (hoop) {
              this.hintDone('hoop');
              sfx.swish();
            } else {
              this.hintDone('goal');
              target.setTexture('goal_b');
              this.time.delayedCall(600, () => { if (target.active) target.setTexture('goal'); });
            }
            // мяч падает на землю и откатывается
            const fx = Math.round(Phaser.Math.Clamp(tx + (hoop ? 6 : 26), room * L.W + 8, (room + 1) * L.W - 8));
            const fy = Math.round(Phaser.Math.Clamp(target.y + 6, L.FLOOR_TOP + 8, L.ROOM_H - 2));
            this.tweens.add({ targets: ball, x: fx, duration: 520, delay: hoop ? 0 : 300 });
            this.tweens.add({ targets: ball, y: fy, duration: 520, delay: hoop ? 0 : 300, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } });
            if (cup && !this.stickers.has('park', cup.subject) && !this.roomFull(room)) this.time.delayedCall(500, () => this.parkGift(cup, target.x, target.y - 14, 1));
          },
        }),
      });
    },

    /** Пустой батут: просто пружинит. */
    trampolineTap(t) {
      if (this.time.now < (t.busyUntil || 0)) return;
      t.busyUntil = this.time.now + 300;
      this.hintDone('trampoline');
      sfx.boing();
      this.tweens.add({ targets: t, y: t.y + 1, duration: 70, yoyo: true, repeat: 1 });
    },

    /** Встать на ступеньку пьедестала — какая под пальцем. */
    pedestalOn(o, p, x) {
      const dx = Phaser.Math.Clamp(x - p.x, PEDESTAL[0].lo, PEDESTAL[2].hi);
      const step = PEDESTAL.find((s) => dx >= s.lo && dx <= s.hi) || PEDESTAL[1];
      o.x = Math.round(p.x + Phaser.Math.Clamp(dx, step.lo + 5, step.hi - 5));
      o.y = Math.round(p.y - step.dy + (o.kind === 'char' ? 0 : -3));
      o.restOn = p;
      o.inTub = null;
      sfx.drop();
      this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
    },

    /** Награждение: фанфары, трибуны хлопают, победителям — медаль. */
    pedestalTap(p) {
      if (this.time.now < (p.busyUntil || 0)) return;
      p.busyUntil = this.time.now + 1800;
      const winners = this.objs.filter((r) => r.restOn === p && !r.dragging);
      this.hintDone('winners');
      if (!winners.length) { sfx.click(); this.fxSparks.explode(4, p.x, p.y - p.displayHeight); return; }
      sfx.fanfare();
      this.time.delayedCall(500, () => sfx.applause());
      for (const w of winners) {
        this.fxSparks.explode(8, w.x, w.y - w.displayHeight * 0.8);
        this.time.delayedCall(700, () => { if (w.active) this.fxHearts.explode(2, w.x, w.y - w.displayHeight); });
      }
      const room = roomOf(p);
      if (this.roomFull(room) || this.countIn(room, (o) => MEDALS.includes(o.rec.subject)) >= 6) return;
      const rec = this.parkFresh(MEDALS);
      if (rec) this.time.delayedCall(450, () => { if (p.active) this.parkGift(rec, p.x, p.y - 24); });
    },

    /** Скейт, самокат, велосипед: едут к другому краю комнаты (с куклой — веселее). */
    wheelsTap(o) {
      if (o.y < L.FLOOR_TOP) return;
      if (!this.rollAcross(o, { ms: 8, turn: true })) return;
      this.hintDone('wheels');
      sfx.rattle();
      if (this.objs.some((r) => r.restOn === o && r.kind === 'char')) sfx.whee();
    },
  });
}
