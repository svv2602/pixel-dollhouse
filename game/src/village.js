// Село — вторая локация: двор с животными, огород, фруктовый сад и поле (комнаты — в places.js, фон — в villagescene.js,
// рисунки и записи каталога — в villageart.js). Здесь — что там можно делать:
//  двор:    тап по курятнику — курица выглядывает и несёт яйцо; корову или курицу покормили — молоко или яйцо;
//           овцу причесали щёткой — клубок шерсти; свинья любит лужу; у каждого животного свой голос;
//  огород:  грядки (как в саду у дома), колодец — ведро воды поливает все грядки (иногда выпрыгивает лягушка),
//           пугало — тап распугивает ворон (вороны ничего не портят: с них падает пёрышко); на пугало надевается шапка;
//  сад:     груша, вишня и слива — тап роняет плод; улей — пчёлы и банка мёда; скворечник — птичка поёт;
//           гамак — кукла в нём засыпает (и видит сны);
//  поле:    стог — куклу сверху, тап — прыжки; пустой стог шуршит и прячет сюрприз; трактор — куклу за руль,
//           тап — едет через поле и оставляет сноп; сноп — на мельницу: крылья крутятся, выходит хлеб.
// Всё, что получилось (яйцо, молоко, шерсть, мёд, хлеб, плоды, перо), — наклейки страницы «село» в альбоме.
import Phaser from 'phaser';
import { R } from './places.js';
import { makeVillageArt } from './villageart.js';

/** Голоса животных — и нарисованных для села, и из каталога. */
const VOICE = [
  [/\bcow\b/, 'moo'], [/\bpig(let)?\b/, 'oink'], [/sheep|\blamb\b/, 'baa'], [/\bhen\b|^chicken$|rooster|turkey/, 'cluck'],
  [/horse|pony|unicorn/, 'neigh'], [/duck/, 'quack'], [/\bdog\b|puppy/, 'woof'], [/kitten|\bcat\b/, 'meow'], [/frog/, 'ribbit'],
];
const FARM_KIND = [[/\bcow\b/, 'cow'], [/^chicken$/, 'hen'], [/^(pig|piglet|teacup pig)$/, 'pig'], [/^(sheep|lamb)$/, 'sheep']];
/** Что прячется в стогу. */
const HAY = ['field mouse', 'egg', 'hatchling chick', 'ear of corn', 'horseshoe charm', 'acorn', 'ball of yarn', 'four leaf clover'];
const BREAD = ['loaf of bread', 'round bread loaf', 'rye bread loaf'];

// Подсказки-облачка, приманки и страница альбома — дописываются к общим спискам в main.js и stickers.js
export const VILLAGE_HINTS = {
  travel: { room: 'home', seq: (s) => ['tex:busstop_icon', `tex:${(s.unseenPlace() || s.destinations()[Math.floor(Math.random() * s.destinations().length)]).icon}`] }, // просят в любой комнате дома; сначала — туда, где ещё не были
  coop: { room: R.yard, seq: () => ['coop', 'egg'] },
  farmfood: { room: R.yard, seq: () => ['ear of corn', 'farm-cow', 'glass bottle of milk'] },
  wool: { room: R.yard, seq: () => ['pet-brush', 'farm-sheep', 'ball of yarn'] },
  well: { room: R.veg, seq: () => ['well', 'tex:water_drop'] },
  scarecrow: { room: R.veg, seq: () => ['scarecrow', 'tex:crow'] },
  fruit: { room: R.orchard, seq: (s) => { const t = s.byId.get(['peartree', 'cherrytree', 'plumtree'][Math.floor(Math.random() * 3)]); return [t, t.beh.fruit]; } },
  hive: { room: R.orchard, seq: () => ['hive', 'jar of honey'] },
  birdhouse: { room: R.orchard, seq: () => ['birdhouse', 'bluebird'] },
  hay: { room: R.field, seq: () => ['haystack'] },
  tractor: { room: R.field, seq: () => ['tractor', 'sheaf'] },
  mill: { room: R.field, seq: () => ['sheaf', 'windmill', 'loaf of bread'] },
};
export const VILLAGE_LURES = [['coop', (b) => b.coop], ['well', (b) => b.well], ['scarecrow', (b) => b.scarecrow], ['fruit', (b) => !!b.fruit],
  ['hive', (b) => b.hive], ['birdhouse', (b) => b.birdhouse], ['hay', (b) => b.hay], ['tractor', (b) => b.tractor], ['mill', (b) => b.mill]];
/** Страница «село» в альбоме: [что получилось, из чего (предмет каталога, id или ключ текстуры), чем]. */
export const FARM_STICKERS = [
  ['egg', 'coop', 'farm-hen'], ['brown egg', 'coop', 'farm-hen'], ['glass bottle of milk', 'ear of corn', 'farm-cow'],
  ['ball of yarn', 'pet-brush', 'farm-sheep'], ['feather', 'scarecrow', 'crow'], ['frog', 'well', 'water_drop'],
  ['pear', 'peartree', 'spark'], ['pair of cherries', 'cherrytree', 'spark'], ['plum', 'plumtree', 'spark'],
  ['jar of honey', 'hive', 'bee'], ['loaf of bread', 'sheaf', 'windmill'], ['round bread loaf', 'sheaf', 'windmill'],
  ['rye bread loaf', 'sheaf', 'windmill'],
];

export function makeVillage(scene) { return makeVillageArt(scene); }

export function installVillage(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    // ---------------------------------------------------------------- расстановка
    /** Село один раз обставляется — и в старых сохранениях; повозка встаёт в саду у дома. */
    ensureVillage() {
      if (this.flags.village) return;
      this.flags.village = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const at = (room) => {
        const x0 = room * W;
        const rec = (id) => this.byId.get(id) || this.findRec(id);
        return (id, fx, y, extra) => { const r = rec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y), extra) : null; };
      };
      const has = (id) => this.objs.some((o) => o.rec?.id === id);
      // ---- двор
      let put = at(R.yard);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('coop', 0.56, FLOOR_TOP + 12);
      put('farm-hen', 0.48, FLOOR_TOP + 22);
      put('farm-hen', 0.65, FLOOR_TOP + 24);
      put('farm-cow', 0.34, ROOM_H - 10);
      put('big_puddle', 0.5, ROOM_H - 4);
      put('farm-pig', 0.49, ROOM_H - 6);
      put('farm-sheep', 0.68, ROOM_H - 8);
      put('pet-brush', 0.61, ROOM_H - 2);
      put('ear of corn', 0.13, ROOM_H - 6);
      put('ear of corn', 0.39, ROOM_H - 2);
      put('carrot', 0.27, ROOM_H - 2);
      put('dog', 0.77, FLOOR_TOP + 13);
      // ---- огород
      put = at(R.veg);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      const beds = [put('big_gardenbed', 0.2, FLOOR_TOP + 14), put('big_gardenbed', 0.42, FLOOR_TOP + 14),
        put('big_gardenbed', 0.31, FLOOR_TOP + 30), put('big_gardenbed', 0.53, FLOOR_TOP + 30)];
      // на грядках уже растёт: что-то пора собирать, что-то — полить
      const sow = (bed, i, sub, stage) => { const r = this.findRec(sub); if (bed && r) bed.plots[i] = { id: r.id, stage, watered: false }; };
      sow(beds[0], 0, 'carrot', 3); sow(beds[0], 1, 'carrot', 2); sow(beds[1], 1, 'tomato', 2); sow(beds[1], 2, 'tomato', 1);
      sow(beds[2], 0, 'pumpkin', 3); sow(beds[2], 2, 'cabbage', 1); sow(beds[3], 1, 'potato', 2);
      put('well', 0.7, FLOOR_TOP + 12);
      put('scarecrow', 0.88, FLOOR_TOP + 12);
      put('watering can', 0.1, ROOM_H - 14);
      put('seed packet', 0.64, ROOM_H - 3);
      put('rabbit', 0.78, ROOM_H - 5);
      // ---- фруктовый сад
      put = at(R.orchard);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('peartree', 0.16, FLOOR_TOP + 10);
      put('cherrytree', 0.42, FLOOR_TOP + 10);
      put('plumtree', 0.68, FLOOR_TOP + 10);
      put('birdhouse', 0.29, FLOOR_TOP + 6);
      put('hive', 0.88, FLOOR_TOP + 12);
      put('hammock', 0.55, ROOM_H - 6);
      put('harvest basket', 0.3, ROOM_H - 4);
      put('pear', 0.2, ROOM_H - 8);
      put('teacup and saucer', 0.8, ROOM_H - 3);
      // ---- поле
      put = at(R.field);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('windmill', 0.84, FLOOR_TOP + 10);
      put('haystack', 0.55, FLOOR_TOP + 14);
      put('tractor', 0.26, FLOOR_TOP + 26);
      put('sheaf', 0.5, ROOM_H - 4);
      put('pony', 0.68, ROOM_H - 5);
      put('pinwheel', 0.12, ROOM_H - 8);
      // ---- повозка ждёт у дома, в саду
      if (!has('cart')) at(R.garden)('cart', 0.48, ROOM_H - 1);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initVillage() {
      this.crows = [];
      this.time.addEvent({ delay: 1500, loop: true, callback: () => this.villageTick() });
      // мельницы машут крыльями, пока крутятся
      this.time.addEvent({
        delay: 150, loop: true, callback: () => {
          for (const m of this.objs) {
            if (!m.beh?.mill) continue;
            const spin = this.time.now < (m.spinUntil || 0);
            if (spin) { m.spinB = !m.spinB; m.setTexture(m.spinB ? 'windmill_b' : 'windmill'); if (this.visible(m) && Math.random() < 0.25) sfx.swish(); }
            else if (m.spinB) { m.spinB = false; m.setTexture('windmill'); }
          }
        },
      });
    },

    /** Каждый кадр: повозка с грузом выглядит полной; седоки едущего трактора едут вместе с ним. */
    updateVillage() {
      for (const o of this.objs) {
        const b = o.beh;
        if (!b || o.kind !== 'item') continue;
        if (b.cart) { const key = o.contents.length ? 'cart_full' : 'cart'; if (o.texture.key !== key) o.setTexture(key); }
        if (b.tractor) this.tractorSync(o);
      }
    },

    /** Трактор сдвинулся — седок сдвигается на столько же. */
    tractorSync(t) {
      const d = t.x - (t.lastX ?? t.x);
      t.lastX = t.x;
      if (d && !t.dragging) for (const r of this.objs) if (r.restOn === t && !r.dragging) r.x += d;
    },

    /** Предмет выскакивает из чего-то дугой и приземляется рядом, в той же комнате. */
    popItem(rec, x, y, dir = 0) {
      if (!rec) return null;
      const room = Math.floor(x / L.W);
      const o = this.spawnItem(rec, Math.round(x), Math.round(y));
      const d = dir || (x - room * L.W > L.W / 2 ? -1 : 1);
      const tx = Math.round(Phaser.Math.Clamp(x + d * rnd(14, 34), room * L.W + 8, (room + 1) * L.W - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 8, L.ROOM_H - 2));
      this.tweens.add({ targets: o, x: tx, duration: 520 });
      this.tweens.add({
        targets: o, y: o.y - 16, duration: 220, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 360, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
      });
      return o;
    },

    /** Сколько таких предметов уже лежит в комнате (чтобы двор не утонул в яйцах). */
    countIn(room, pred) { return this.objs.filter((o) => o.kind === 'item' && roomOf(o) === room && pred(o)).length; },

    /** Новое с фермы: предмет выскакивает, наклейка — в альбом. */
    farmGift(sub, x, y, dir = 0) {
      const rec = this.findRec(sub);
      if (!rec) return null;
      sfx.chestOut();
      this.fxSparks.explode(6, x, y);
      this.sticker('farm', rec, x, y - 6);
      return this.popItem(rec, x, y, dir);
    },

    // ---------------------------------------------------------------- тап и бросок
    /** Тап по предмету села. true — тап обработан. */
    villageTap(o) {
      const b = o.beh;
      if (b.cart) { this.cartTap(o); return true; }
      if (b.postcard) { this.openCard(o); return true; }
      if (b.coop) { this.coopTap(o); return true; }
      if (b.well) { this.wellTap(o); return true; }
      if (b.scarecrow) { this.scarecrowTap(o); return true; }
      if (b.hive) { this.hiveTap(o); return true; }
      if (b.birdhouse) { this.birdTap(o); return true; }
      if (b.hay) { if (!this.bounce(o, 'hay')) this.hayTap(o); return true; }
      if (b.tractor) { this.tractorTap(o); return true; }
      if (b.mill) { this.millSpin(o, 1600); return true; }
      return false;
    },

    /** Предмет или куклу бросили на что-то из села. true — бросок обработан. */
    villageDrop(o, q) {
      if (q.y > L.ROOM_H) return false;
      const under = (pred) => this.objAt(q.x, q.y, (x) => x !== o && x.kind === 'item' && pred(x.beh));
      // стог, трактор, повозка: кукла, питомец или игрушка садятся сверху
      if (o.kind === 'char' || o.beh?.pet || o.rec?.cat === 'toy') {
        const p = under((b) => !!b.perch);
        if (p) { this.perchOn(o, p, q.x); return true; }
      }
      if (o.kind !== 'item') return false;
      if (o.beh.head) {
        const sc = under((b) => b.scarecrow);
        if (sc) { this.petWear(sc, o); return true; }
      }
      if (o.beh.sheaf) {
        const mill = under((b) => b.mill);
        if (mill) { this.millGrind(mill, o); return true; }
      }
      return false;
    },

    /** То, что стоит или сидит на предмете, рисуется поверх него; в повозке и за рулём трактора — позади борта. */
    restLayer(base) { return base.beh?.perch?.behind ? -0.5 : 0.5; },

    /** Сесть на стог, за руль трактора или в повозку. */
    perchOn(o, p, x) {
      const { dy, lo, hi } = p.beh.perch;
      const k = p.flipX ? -1 : 1; // трактор, развернувшись, везёт сиденье с другой стороны
      const a = p.x + Math.min(lo * k, hi * k);
      const z = p.x + Math.max(lo * k, hi * k);
      o.x = Math.round(Phaser.Math.Clamp(x, a, z));
      o.y = Math.round(p.y - dy + (o.kind === 'char' ? 0 : -3));
      o.restOn = p;
      o.inTub = null;
      sfx.drop();
      this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
      if (p.beh.hay) {
        sfx.rustle();
        this.fxCrumbs.setParticleTint(0xf2c94c);
        this.fxCrumbs.explode(10, o.x, p.y - p.displayHeight + 6);
        if (o.kind === 'char') this.time.delayedCall(250, () => sfx.giggle());
      }
    },

    // ---------------------------------------------------------------- двор
    petVoice(o) {
      const v = VOICE.find(([rx]) => rx.test(o.rec.subject));
      (v ? sfx[v[1]] : sfx.squeak)();
    },

    farmKind(o) { return o.beh.farm || FARM_KIND.find(([rx]) => rx.test(o.rec.subject))?.[1] || null; },

    coopTap(coop) {
      if (this.time.now < (coop.busyUntil || 0)) return;
      coop.busyUntil = this.time.now + 900;
      coop.setTexture('coop_hen');
      sfx.cluck();
      this.tweens.add({ targets: coop, y: coop.y - 2, duration: 90, yoyo: true });
      this.time.delayedCall(700, () => { if (coop.active) coop.setTexture('coop'); });
      this.hintDone('coop');
      if (this.countIn(roomOf(coop), (x) => /\begg$/.test(x.rec.subject)) >= 6) return;
      this.farmGift(Math.random() < 0.3 ? 'brown egg' : 'egg', coop.x - 4, coop.y - 6);
    },

    /** Животное поело: корова даёт молоко, курица несёт яйцо, свинья просто довольна. */
    farmFed(pet) {
      const kind = this.farmKind(pet);
      if (!kind) return;
      this.time.delayedCall(650, () => {
        if (!pet.active) return;
        this.petVoice(pet);
        const room = roomOf(pet);
        const y = pet.y - pet.displayHeight * 0.4;
        if (kind === 'cow' && this.countIn(room, (x) => x.rec.subject === 'glass bottle of milk') < 5) {
          this.farmGift('glass bottle of milk', pet.x, y);
          this.hintDone('farmfood');
        } else if (kind === 'hen' && this.countIn(room, (x) => /\begg$/.test(x.rec.subject)) < 6) {
          this.farmGift('egg', pet.x, y);
          this.hintDone('farmfood');
        } else if (kind === 'pig') {
          this.tweens.add({ targets: pet, y: pet.y - 4, duration: 110, yoyo: true, repeat: 2 });
        }
      });
    },

    /** Овцу причесали: с неё — клубок шерсти (не чаще раза в восемь секунд). */
    farmBrushed(pet) {
      if (this.farmKind(pet) !== 'sheep' || this.time.now < (pet.woolAt || 0)) return;
      pet.woolAt = this.time.now + 8000;
      sfx.baa();
      this.hintDone('wool');
      if (this.countIn(roomOf(pet), (x) => x.rec.subject === 'ball of yarn') < 4) this.farmGift('ball of yarn', pet.x, pet.y - pet.displayHeight * 0.5);
    },

    // ---------------------------------------------------------------- огород
    /** Колодец: ведро поднимается и поливает все грядки своей комнаты; иногда в ведре — лягушка. */
    wellTap(well) {
      if (this.time.now < (well.busyUntil || 0)) return;
      well.busyUntil = this.time.now + 1500;
      sfx.creak();
      this.hintDone('well');
      const y0 = well.y - 14;
      const bucket = this.add.image(well.x, y0, 'bucket').setDepth(well.depth + 0.4);
      this.tweens.add({
        targets: bucket, y: y0 - 9, duration: 600,
        onComplete: () => {
          sfx.splash();
          this.fxCrumbs.setParticleTint(0x5ac4f2);
          this.fxCrumbs.explode(12, bucket.x, bucket.y);
          const room = roomOf(well);
          for (const bed of this.objs) {
            if (!bed.beh?.gardenBed || roomOf(bed) !== room) continue;
            bed.plots.forEach((p, i) => { if (p && p.stage < 3 && !p.watered) this.waterPlot(bed, i); });
          }
          if (Math.random() < 0.3 && this.countIn(room, (x) => x.rec.subject === 'frog') < 2) {
            sfx.ribbit();
            this.farmGift('frog', bucket.x, bucket.y, -1);
          }
          this.tweens.add({ targets: bucket, y: y0, duration: 350, delay: 250, onComplete: () => bucket.destroy() });
        },
      });
    },

    /** Раз в полторы секунды: на огород слетаются вороны (днём, пока игрок там). */
    villageTick() {
      this.crows = this.crows.filter((c) => c.active);
      const here = Math.round(this.cameras.main.scrollX / L.W) === R.veg && !this.night && !this.dress && !this.albumUi;
      if (!here) { for (const c of this.crows) c.destroy(); this.crows = []; return; }
      if (this.crows.length >= 2 || Math.random() < 0.5) return;
      const x0 = R.veg * L.W;
      const beds = this.objs.filter((o) => o.beh?.gardenBed && roomOf(o) === R.veg);
      const bed = beds.length ? pick(beds) : null;
      const tx = Math.round(bed ? bed.x + rnd(-14, 14) : x0 + rnd(30, L.W - 30));
      const ty = Math.round(bed ? bed.y - bed.displayHeight + 2 : rnd(L.FLOOR_TOP + 8, L.ROOM_H - 4));
      const c = this.add.image(Math.round(x0 + rnd(20, L.W - 20)), -8, 'crow_fly').setOrigin(0.5, 1).setDepth(15000).setInteractive();
      c.crow = true;
      c.setFlipX(tx < c.x);
      this.crows.push(c);
      this.tweens.add({
        targets: c, x: tx, y: ty, duration: 1300, ease: 'Sine.easeOut',
        onComplete: () => {
          c.landed = true;
          c.setTexture('crow');
          c.peck = this.tweens.add({ targets: c, y: ty + 1, duration: 160, yoyo: true, repeat: -1, repeatDelay: 700 });
        },
      });
    },

    /** Ворону спугнули (тапом или пугалом): улетает, роняет пёрышко. */
    shooCrow(c, byTap = true) {
      if (!c.active || c.gone) return;
      c.gone = true;
      c.disableInteractive();
      this.tweens.killTweensOf(c);
      c.setTexture('crow_fly');
      sfx.caw();
      if (byTap) this.stat('crow');
      const room = Math.floor(c.x / L.W);
      if (Math.random() < 0.6 && this.countIn(room, (x) => x.rec.subject === 'feather') < 3) this.farmGift('feather', c.x, c.y - 2);
      this.tweens.add({ targets: c, x: c.x + (c.flipX ? 60 : -60), y: -12, duration: 900, ease: 'Sine.easeIn', onComplete: () => c.destroy() });
    },

    scarecrowTap(sc) {
      const x0 = sc.x;
      sfx.rattle();
      this.tweens.add({ targets: sc, x: x0 + 2, duration: 60, yoyo: true, repeat: 3, onComplete: () => { sc.x = x0; } });
      this.fxCrumbs.setParticleTint(0xf2c94c);
      this.fxCrumbs.explode(6, sc.x, sc.y - sc.displayHeight * 0.6);
      this.hintDone('scarecrow');
      for (const c of this.crows) if (Math.floor(c.x / L.W) === roomOf(sc)) this.shooCrow(c, false);
    },

    // ---------------------------------------------------------------- фруктовый сад
    /** Улей: вылетает рой, покружит — и из улья выкатывается банка мёда. */
    hiveTap(hive) {
      if (this.time.now < (hive.busyUntil || 0)) return;
      hive.busyUntil = this.time.now + 2600;
      sfx.buzz();
      this.hintDone('hive');
      this.tweens.add({ targets: hive, y: hive.y - 2, duration: 90, yoyo: true });
      const cx = hive.x;
      const cy = hive.y - hive.displayHeight - 6;
      for (let i = 0; i < 5; i++) {
        const bee = this.add.image(hive.x, hive.y - 8, 'bee').setDepth(15000);
        const ph = (i / 5) * Math.PI * 2;
        const rad = 9 + i * 3;
        this.tweens.addCounter({
          from: 0, to: 1, duration: 2200,
          onUpdate: (tw) => {
            const k = tw.getValue();
            const a = ph + k * Math.PI * 4;
            const out = Math.sin(k * Math.PI); // вылетели — покружили — вернулись
            bee.x = Math.round(cx + Math.cos(a) * rad * out);
            bee.y = Math.round(hive.y - 8 + (cy - hive.y + 8) * out + Math.sin(a * 1.5) * 4 * out);
            bee.setFlipX(Math.sin(a) > 0);
          },
          onComplete: () => bee.destroy(),
        });
      }
      this.time.delayedCall(1500, () => {
        if (!hive.active || this.countIn(roomOf(hive), (x) => x.rec.subject === 'jar of honey') >= 3) return;
        this.farmGift('jar of honey', hive.x, hive.y - 6);
      });
    },

    /** Скворечник: птичка вылетает, поёт, делает круг и возвращается. */
    birdTap(house) {
      if (this.time.now < (house.busyUntil || 0)) return;
      house.busyUntil = this.time.now + 2400;
      this.hintDone('birdhouse');
      sfx.tweet();
      const rec = this.findRec('bluebird') || this.findRec('robin bird');
      const hx = house.x;
      const hy = house.y - house.displayHeight + 12;
      const bird = (rec ? this.add.image(hx, hy, rec.cat, rec.frame) : this.add.image(hx, hy, 'crow_fly')).setDepth(15000);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 2000,
        onUpdate: (tw) => {
          const a = tw.getValue() * Math.PI * 2;
          const x = Math.round(hx + Math.sin(a) * 26);
          bird.setFlipX(x < bird.x);
          bird.x = x;
          bird.y = Math.round(hy - (1 - Math.cos(a)) * 9);
          if (Math.random() < 0.08) this.fxNotes.explode(1, bird.x, bird.y - 6);
        },
        onComplete: () => bird.destroy(),
      });
      this.time.delayedCall(900, () => sfx.tweet());
      for (const c of this.objs) if (c.kind === 'char' && roomOf(c) === roomOf(house)) this.checkWish(c, 'music');
    },

    // ---------------------------------------------------------------- поле
    /** Пустой стог: шуршит, и из сена что-нибудь выкатывается. */
    hayTap(hay) {
      if (this.time.now < (hay.busyUntil || 0)) return;
      hay.busyUntil = this.time.now + 700;
      sfx.rustle();
      this.hintDone('hay');
      this.tweens.add({ targets: hay, y: hay.y - 2, duration: 80, yoyo: true, repeat: 1 });
      this.fxCrumbs.setParticleTint(0xf2c94c);
      this.fxCrumbs.explode(8, hay.x, hay.y - hay.displayHeight * 0.6);
      const room = roomOf(hay);
      if (this.countIn(room, (x) => !x.beh.furniture) > 40) return;
      this.hayList ||= HAY.map((sub) => this.findRec(sub)).filter(Boolean);
      this.popItem(pick(this.hayList), hay.x, hay.y - 8);
    },

    /** Трактор: едет до края поля, разворачивается и оставляет за собой сноп. */
    tractorTap(t) {
      if (t.driving && this.tweens.isTweening(t)) return;
      const room = roomOf(t);
      const lo = room * L.W + 26;
      const hi = (room + 1) * L.W - 26;
      let dir = t.flipX ? -1 : 1;
      if ((dir > 0 && t.x > hi - 30) || (dir < 0 && t.x < lo + 30)) { dir = -dir; this.tractorTurn(t); }
      const tx = dir > 0 ? hi : lo;
      const x0 = t.x;
      t.driving = true;
      this.hintDone('tractor');
      const chug = this.time.addEvent({
        delay: 190, loop: true, callback: () => {
          // трактор унесли или убрали посреди дороги — мотор глохнет
          if (!t.active || !this.tweens.isTweening(t)) { chug.remove(); t.driving = false; return; }
          if (this.visible(t)) sfx.putt();
          this.fxPoof.explode(1, t.x + dir * 9, t.y - t.displayHeight + 1);
        },
      });
      this.tweens.add({
        targets: t, x: tx, duration: Math.abs(tx - x0) * 22,
        onComplete: () => {
          chug.remove();
          t.driving = false;
          this.tractorTurn(t);
          if (this.countIn(room, (x) => x.beh.sheaf) < 4) {
            this.popItem(this.byId.get('sheaf'), Math.round((x0 + tx) / 2), t.y - 6);
            sfx.chestOut();
          }
          for (const c of this.objs) if (c.restOn === t && c.kind === 'char') { sfx.giggle(); this.fxHearts.explode(2, c.x, c.y - c.displayHeight); }
          this.save();
        },
      });
    },

    /** Разворот: трактор смотрит в другую сторону, седок пересаживается вместе с сиденьем. */
    tractorTurn(t) {
      this.tractorSync(t); // сначала довезти седока до места, потом пересаживать
      t.setFlipX(!t.flipX);
      for (const r of this.objs) if (r.restOn === t) r.x = Math.round(2 * t.x - r.x);
    },

    millSpin(mill, ms) {
      mill.spinUntil = Math.max(mill.spinUntil || 0, this.time.now + ms);
      sfx.swish();
    },

    /** Сноп — на мельницу: крылья крутятся, из двери выкатывается хлеб. */
    millGrind(mill, o) {
      this.objs = this.objs.filter((x) => x !== o);
      this.tweens.add({ targets: o, x: mill.x, y: mill.y - 4, alpha: 0, duration: 260, onComplete: () => o.destroy() });
      sfx.chestIn();
      this.millSpin(mill, 2200);
      this.hintDone('mill');
      this.time.delayedCall(1900, () => {
        if (!mill.active) return;
        sfx.ding();
        this.farmGift(pick(BREAD.filter((b) => this.findRec(b))), mill.x, mill.y - 6);
      });
    },
  });
}
