// Локации и дорога между ними. Мир — одна лента комнат (см. places.js); камера, свайпы и стрелки ходят
// только по комнатам своей локации. В другую локацию ведут:
//  • автобусная остановка у калитки (в саду у дома и во дворе села): тап по ней — и едем. К остановке
//    подъезжает и сигналит автобус (тап по нему — тоже едем): пока игрок ещё никуда не ездил — часто,
//    это приманка; после первой поездки — раз в три минуты, чтобы не отвлекать от игры в комнате;
//  • повозка: тап по пустой — едем; если в ней груз — два облачка: «ехать» и «выгрузить». Повозка всегда
//    переезжает вместе с игроком и встаёт у калитки; что в неё положили и кто в ней сидит — приезжает с ней;
//  • карта (кнопка-домик): значки локаций сверху, под ними комнаты выбранной;
//  • открытка: из каждой локации один раз прилетает в дом, тап — картинка места, тап по картинке — едем.
// В городе с улицы в магазины ведут ещё и сами магазины: тап по фасаду — входим (city.js).
// Если ехать можно в несколько мест, над остановкой или повозкой всплывают облачка с картинками мест — выбрать.
// Кукла, с которой играли последней (или та, что сама попросилась в облачке), приходит следом.
import Phaser from 'phaser';
import { PLACES, placeOf, placeByKey, gateOf } from './places.js';

const STOP_Y = 4; // остановка стоит на линии горизонта: низ — на 4 пикселя ниже неё
const BUS_EVERY = 180000; // после первой поездки автобус подъезжает к остановке раз в три минуты

export function installTravel(Room, { L, rnd, sfx }) {
  Object.assign(Room.prototype, {
    /** Локация, в которой сейчас игрок. */
    placeNow() { return placeOf(this.targetRoom ?? 0); },

    /** Границы прокрутки камеры: только комнаты своей локации. */
    camRange() { const p = this.placeNow(); return [p.first * L.W, p.last * L.W]; },

    /** Номер комнаты, прижатый к своей локации (свайп и стрелки за её край не выводят). */
    inPlace(idx) { const p = this.placeNow(); return Phaser.Math.Clamp(idx, p.first, p.last); },

    /** Куда отсюда можно поехать. */
    destinations() { return PLACES.filter((p) => p !== this.placeNow()); },

    /** Есть ли локация, где ещё не были (тогда на кнопке карты горит звёздочка). */
    unseenPlace() { return PLACES.find((p) => !this.flags.seen?.[p.key]) || null; },

    /** Вызывается из create(): остановки у калиток (не предметы — их нельзя унести или убрать), автобус, открытки. */
    initTravel() {
      this.travelling = false;
      this.choices = null;
      this.cardUi = null;
      this.bus = null;
      this.busAfter = this.busEager() ? 0 : this.time.now + BUS_EVERY;
      // где уже были: дом — всегда; кто ездил до появления этой отметки — был в селе
      const seen = (this.flags.seen ||= {});
      seen[this.placeNow().key] = 1;
      if (this.flags.tried?.travel) seen.village = 1;
      this.portals = [];
      for (const p of PLACES) {
        const others = PLACES.filter((x) => x !== p);
        const x = Math.round(gateOf(p) * L.W + L.W * p.stop);
        const s = this.add.image(x, L.FLOOR_TOP + STOP_Y, 'busstop').setOrigin(0.5, 1).setDepth(-7.5).setInteractive();
        s.portal = others.length === 1 ? others[0].key : 'choose';
        s.place = p.key;
        // едут в одно место — на табло его значок
        if (others.length === 1) this.add.image(x, s.y - 29, others[0].icon).setDepth(-7.45);
        this.portals.push(s);
      }
      // автобус подъезжает к остановке, пока игрок в комнате с ней
      this.time.addEvent({ delay: 4000, loop: true, callback: () => this.busTick() });
      this.time.delayedCall(2600, () => this.sendPostcards());
    },

    /** Остановка комнаты, которая сейчас на экране (или null). */
    stopHere() {
      if (this.travelling || this.dress || this.albumUi || this.mapUi || this.cardUi) return null;
      return this.portals.find((x) => this.visible(x)) || null;
    },

    /** Ещё ни разу никуда не ездили: автобус — приманка, приезжает часто. */
    busEager() { return !this.flags.tried?.travel; },

    /**
     * Автобус подъезжает к остановке, пока игрок в комнате с ней: до первой поездки — часто (это приманка),
     * потом — раз в три минуты, чтобы не отвлекать от игры в комнате.
     */
    busTick() {
      const s = this.stopHere();
      if (!s || this.bus || this.bedtime || this.time.now < (this.busAfter || 0)) return; // «спокойной ночи» — автобус не ходит
      if (this.busEager() && Math.random() > 0.7) return;
      this.busVisit(s);
    },

    /** Автобус въезжает справа, останавливается, сигналит, ждёт и уезжает влево. Тап по нему — едем. */
    busVisit(stop) {
      const x0 = Math.floor(stop.x / L.W) * L.W;
      const y = L.FLOOR_TOP + STOP_Y + 3;
      const bus = this.add.image(x0 + L.W - 20, y, 'bus').setOrigin(0.5, 1).setDepth(-7.4).setAlpha(0).setInteractive();
      bus.portal = stop.portal;
      bus.stop = stop;
      this.bus = bus;
      const bump = () => { bus.y = y - (Math.floor(bus.x / 6) % 2 ? 1 : 0); };
      this.tweens.add({ targets: bus, alpha: 1, duration: 300 });
      this.tweens.add({
        targets: bus, x: stop.x + 2, duration: Math.abs(bus.x - stop.x) * 16, ease: 'Sine.easeOut', onUpdate: bump,
        onComplete: () => {
          if (!bus.active) return;
          bus.y = y;
          bus.waiting = true;
          if (this.visible(stop)) sfx.honk();
          this.tweens.add({ targets: bus, y: y - 1, duration: 110, yoyo: true, repeat: 1 });
          this.time.delayedCall(5200, () => this.busLeave(bus));
        },
      });
    },

    busLeave(bus) {
      if (!bus.active || bus.leaving) return;
      bus.leaving = true;
      bus.waiting = false;
      bus.disableInteractive();
      const x0 = Math.floor(bus.stop.x / L.W) * L.W;
      const y = bus.y;
      this.tweens.add({
        targets: bus, x: x0 + 20, duration: Math.abs(bus.x - x0 - 20) * 16, ease: 'Sine.easeIn',
        onUpdate: () => { bus.y = y - (Math.floor(bus.x / 6) % 2 ? 1 : 0); },
      });
      this.tweens.add({
        targets: bus, alpha: 0, delay: Math.max(0, Math.abs(bus.x - x0 - 20) * 16 - 350), duration: 350,
        onComplete: () => { bus.destroy(); if (this.bus === bus) this.bus = null; this.busAfter = this.time.now + (this.busEager() ? rnd(14000, 24000) : BUS_EVERY); },
      });
    },

    /** Тап по остановке или автобусу: едем; если мест несколько — облачка с выбором. */
    portalTap(o) {
      const stop = o.stop || o;
      const to = this.destinations();
      if (to.length === 1) { this.goPlace(to[0].key); return; }
      this.showChoices(stop, to.map((p) => ({ icon: p.icon, act: () => this.goPlace(p.key) })));
    },

    /** Тап по повозке: пустая — сразу в путь; с грузом — выбрать: ехать или выгрузить. */
    cartTap(cart) {
      const to = this.destinations();
      const loaded = cart.contents.length > 0;
      if (!loaded && to.length === 1) { this.goPlace(to[0].key); return; }
      const opts = to.map((p) => ({ icon: p.icon, act: () => this.goPlace(p.key) }));
      if (loaded) opts.push({ icon: 'unload', act: () => this.spill(cart) });
      this.showChoices(cart, opts);
    },

    /** Облачка с картинками над предметом: тап по облачку — действие; тап мимо или восемь секунд — исчезают. */
    showChoices(owner, opts) {
      this.closeChoices();
      sfx.pop();
      const n = opts.length;
      const cam = this.cameras.main;
      // весь ряд облачков — на экране, даже если предмет у края
      const cx = Phaser.Math.Clamp(owner.x, cam.scrollX + 24 + (n - 1) * 13, cam.scrollX + L.W - 24 - (n - 1) * 13);
      const y = Math.max(24, owner.y - owner.displayHeight - 3);
      const parts = [];
      opts.forEach((opt, i) => {
        const x = Math.round(cx + (i - (n - 1) / 2) * 26);
        const b = this.add.image(x, y, 'choice').setOrigin(0.5, 1).setDepth(10003).setScale(0).setInteractive();
        b.choice = opt;
        const ic = this.add.image(x, y - 12, opt.icon).setDepth(10004).setAlpha(0);
        this.tweens.add({ targets: b, scale: 1, duration: 200, ease: 'Back.easeOut', onComplete: () => b.setScale(1) });
        this.tweens.add({ targets: ic, alpha: 1, duration: 150, delay: 90 });
        parts.push(b, ic);
      });
      this.choices = { parts, owner, timer: this.time.delayedCall(8000, () => this.closeChoices()) };
    },

    closeChoices() {
      const c = this.choices;
      if (!c) return;
      this.choices = null;
      c.timer.remove();
      c.parts.forEach((o) => o.destroy());
    },

    /** В другую локацию — к её калитке. */
    goPlace(key) {
      const p = placeByKey(key);
      if (p && p !== this.placeNow()) this.travel(gateOf(p));
    },

    /** Повозка переезжает к калитке локации вместе с седоками (груз лежит внутри). */
    cartMove(dest) {
      const cart = this.objs.find((o) => o.beh?.cart && !o.dragging);
      if (!cart) return null;
      const riders = this.objs.filter((o) => o.restOn === cart);
      const x = Math.round(gateOf(dest) * L.W + L.W * dest.cart);
      const y = Math.round(Phaser.Math.Clamp(cart.y, L.FLOOR_TOP + 16, L.ROOM_H - 1));
      for (const r of riders) { r.x += x - cart.x; r.y += y - cart.y; }
      cart.x = x;
      cart.y = y;
      return { cart, loaded: riders.length > 0 || cart.contents.length > 0 };
    },

    /**
     * Дорога в комнату другой локации: экран темнеет, по нему едет автобус (с грузом или седоками — повозка),
     * светлеет уже на месте. Если повозка едет не пустой, приезжаем к калитке — туда, где она встанет.
     */
    travel(idx) {
      if (this.travelling) return;
      const dest = placeOf(idx);
      const from = this.placeNow();
      if (dest === from) { this.goRoom(idx); return; }
      this.travelling = true;
      this.press = null;
      this.closeMap();
      this.closeCard();
      this.closeChoices();
      if (this.jam?.size) this.jamEnded();
      if (this.wish) {
        // кукла сама просилась в дорогу — желание исполнено
        const asked = this.wish.hint === 'travel' ? this.wish.ch : null;
        this.clearWish(!!asked);
        if (asked) { sfx.fanfare(); this.fxHearts.explode(6, asked.x, asked.y - asked.displayHeight); }
      }
      if (this.bus) { this.tweens.killTweensOf(this.bus); this.bus.destroy(); this.bus = null; }
      const { W, H } = L;
      const back = dest.first < from.first; // обратно — едем влево
      const D = 29000;
      const fix = (o, d = 1) => o.setDepth(D + d).setScrollFactor(0);
      const shade = fix(this.add.rectangle(0, 0, W, H, 0x2b1d2e, 0).setOrigin(0), 0);
      this.tweens.add({
        targets: shade, fillAlpha: 1, duration: 250,
        onComplete: () => {
          const moved = this.cartMove(dest);
          const room = moved?.loaded ? gateOf(dest) : idx;
          const cam = this.cameras.main;
          this.tweens.killTweensOf(cam);
          cam.scrollX = room * W;
          this.targetRoom = room;
          (this.flags.seen ||= {})[dest.key] = 1;
          const y = Math.round(H * 0.6);
          const road = fix(this.add.rectangle(0, y, W, 2, 0x6b4a7e).setOrigin(0));
          const icon = fix(this.add.image(Math.round(W / 2), y - 40, dest.icon).setScale(3));
          // автобус нарисован мордой влево, повозка — оглоблей вправо
          // поехали поездом с вокзала (center.js) — по дороге едет поезд; он, как и автобус, нарисован мордой влево
          const train = this.viaTrain && !moved?.loaded;
          this.viaTrain = false;
          const car = moved?.loaded
            ? this.add.image(0, y, 'cart_full').setFlipX(back)
            : this.add.image(0, y, train ? 'train_side' : 'bus').setFlipX(!back);
          fix(car.setOrigin(0.5, 1), 2).x = back ? W + 30 : -30;
          if (moved?.loaded) sfx.clop(); else if (train) sfx.toot(); else sfx.honk();
          this.tweens.add({
            targets: car, x: back ? -30 : W + 30, duration: 900,
            onUpdate: () => { car.y = y - (Math.floor(car.x / 7) % 2 ? 1 : 0); }, // потряхивает на кочках
            onComplete: () => {
              road.destroy(); icon.destroy(); car.destroy();
              this.tweens.add({
                targets: shade, fillAlpha: 0, duration: 250,
                onComplete: () => {
                  shade.destroy();
                  this.travelling = false;
                  this.busAfter = this.time.now + BUS_EVERY; // только что приехали — следующий автобус нескоро
                  this.arrived();
                  this.hintDone('travel');
                  if (moved?.loaded) this.hintDone('cart');
                  this.save();
                },
              });
            },
          });
        },
      });
    },

    // ---------------------------------------------------------------- открытки
    /** Открытка из локации один раз прилетает в дом — и в старых сохранениях. Игрок не дома — ждёт его возвращения. */
    sendPostcards() {
      if (!this.objs) return;
      const cards = (this.flags.cards ||= {});
      const p = PLACES.find((x) => x.card && !cards[x.key]);
      if (!p) return;
      const rec = this.byId.get(`postcard-${p.key}`);
      if (!rec) return;
      if (this.placeNow().key !== 'home' || this.travelling || this.dreaming || this.dress || this.albumUi || this.mapUi) {
        this.time.delayedCall(6000, () => this.sendPostcards());
        return;
      }
      cards[p.key] = 1;
      this.time.delayedCall(120000, () => this.sendPostcards()); // открытка из следующего места — не сразу следом
      const room = Math.round(this.cameras.main.scrollX / L.W);
      const o = this.spawnItem(rec, Math.round(room * L.W + L.W * rnd(0.4, 0.6)), -6);
      const ty = Math.round(rnd(L.FLOOR_TOP + 10, L.ROOM_H - 4));
      sfx.jingle();
      // планирует, покачиваясь, как лист
      this.tweens.add({ targets: o, x: o.x + 10, duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: o, y: ty, duration: 1700, ease: 'Sine.easeOut',
        onComplete: () => { this.fxSparks.explode(12, o.x, o.y - 6); sfx.sparkle(); this.save(); },
      });
      this.save();
    },

    /** Тап по открытке: во весь экран — картинка места (двор села с бабушкой, улица города с поваром, пляж с моряком); тап по ней — едем. */
    openCard(o) {
      const p = placeByKey(o.beh.postcard);
      if (!p || this.cardUi || this.dress || this.albumUi || this.mapUi || this.travelling) return;
      sfx.page();
      this.stat('postcard');
      const { W, H, FLOOR_TOP, ROOM_H } = L;
      const parts = [];
      const add = (x, d = 1) => { parts.push(x.setDepth(30000 + d).setScrollFactor(0)); return x; };
      const bg = add(this.add.rectangle(0, 0, W, H, 0x2b1d2e, 0.85).setOrigin(0).setInteractive(), 0);
      bg.ui = { cardClose: true };
      // картинка — настоящий фон комнаты-калитки этой локации, вырезанный куском
      const pw = Math.min(124, W - 40);
      const ph = Math.min(64, ROOM_H - 14, H - 44);
      const x0 = Math.floor((W - pw) / 2);
      const y0 = Math.floor((H - ph - 22) / 2);
      const frame = add(this.add.rectangle(x0 - 4, y0 - 4, pw + 8, ph + 26, 0xfff8e8).setOrigin(0).setInteractive());
      frame.setStrokeStyle(1, 0x2b1d2e, 1);
      frame.ui = { cardGo: p.key };
      const cy = Math.max(0, FLOOR_TOP - (ph - 18)); // в кадре — земля и всё, что над ней
      add(this.add.rectangle(x0, y0, pw, ph, 0x9fdcff).setOrigin(0));
      for (const tex of [`bg_${p.gate}`, `fg_${p.gate}`]) {
        if (this.textures.exists(tex)) add(this.add.image(x0 - 6, y0 - cy, tex).setOrigin(0).setCrop(6, cy, pw, ph), 2);
      }
      const ground = y0 + ph - 3;
      (p.card.pics || []).forEach((tex, i) => add(this.add.image(x0 + pw - 18 - i * 24, ground - (i % 2) * 3, tex).setOrigin(0.5, 1), 3));
      if (p.card.who) add(this.add.image(x0 + 16, ground + 1, `cast_${p.card.who}_icon`).setOrigin(0.5, 1).setScale(2), 4);
      // под картинкой — «поехали»: автобус и значок места
      const by = y0 + ph + 11;
      add(this.add.image(Math.round(W / 2) - 14, by, 'bus').setFlipX(true), 3);
      const ic = add(this.add.image(Math.round(W / 2) + 18, by, p.icon), 3);
      this.tweens.add({ targets: ic, y: by - 2, duration: 320, yoyo: true, repeat: -1 });
      this.cardUi = { parts, place: p.key };
    },

    closeCard() {
      if (!this.cardUi) return;
      this.cardUi.parts.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
      this.cardUi = null;
    },

    onCardUi(ui) {
      const key = ui.cardGo;
      this.closeCard();
      if (key) this.goPlace(key); else sfx.page();
    },
  });
}
