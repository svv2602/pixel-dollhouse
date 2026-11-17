// Город — третья локация: улица и четыре магазина (комнаты — в places.js, фон — в cityscene.js,
// рисунки и записи каталога — в cityart.js). Денег в игре нет: всё берут с полок просто так. Что там можно делать:
//  улица:    тап по магазину — входим (а в каждом магазине слева дверь с видом на улицу: тап — выходим); светофор — зелёный, и по дороге едут машины (тап по машине — сигналит);
//            тележка мороженого — мороженое; фонтан — струи; монетку в фонтан — «желание»: талисман на удачу;
//  супермаркет: прилавки (фрукты, хлеб, молочное) — тап роняет продукт; тележка покупателя — в неё кладут покупки,
//            куклу можно прокатить; касса — предмет на ленту: «пик!», и он в бумажном пакете (пакет можно увезти домой на повозке);
//  кафе:     витрина — выпечка, стойка — напитки; столик и стулья;
//  магазин одежды: стойка со шляпами и вешалка с украшениями; примерочная — кукла выходит в новом наряде;
//            манекен носит шляпу; подиум — показ мод; зеркало — гардероб;
//  магазин игрушек: витрина — игрушки; автомат-хваталка — плюшевая игрушка; автомат с капсулами — за монетку;
//            стол упаковки — игрушка становится подарком (в коробке именно она).
//  В кафе, магазине одежды и игрушек приходят покупатели-зверята с картинкой в облачке: дали то, что просят, —
//  зверёк радуется и оставляет монетку. Монетка — в фонтан или в автомат с капсулами.
// Всё, что получилось (мороженое, монетка, талисманы, пакет, плюшевые игрушки, капсулы, подарок), — страница «город» в альбоме.
import Phaser from 'phaser';
import { R, roomAt } from './places.js';
import { makeCityArt } from './cityart.js';
import { streetShops, exitDoor } from './cityscene.js';
import { OUTFIT_KEYS, DRESS } from './character.js';

/** Что лежит на полках: тап по прилавку роняет случайный предмет из его списка. */
const STOCK = {
  ice: ['ice cream cone', 'ice cream bar', 'ice cream sandwich', 'bowl of ice cream', 'ice cream sundae', 'mochi ice cream', 'banana split'],
  fruit: ['apple', 'banana', 'orange', 'pear', 'peach', 'bunch of grapes', 'watermelon slice', 'pineapple', 'mango', 'kiwi fruit', 'lemon',
    'strawberry', 'carrot', 'tomato', 'cucumber', 'broccoli', 'red bell pepper', 'avocado', 'coconut', 'raspberry'],
  bread: ['loaf of bread', 'baguette', 'bagel', 'soft pretzel', 'dinner roll', 'cinnamon roll', 'round bread loaf', 'hamburger bun', 'pita bread', 'slice of bread'],
  dairy: ['carton of milk', 'glass bottle of milk', 'wedge of cheese', 'tub of yogurt', 'egg carton', 'stick of butter', 'wheel of cheese', 'string cheese', 'juice box', 'egg'],
  pastry: ['croissant', 'glazed donut', 'macaron', 'cupcake', 'strawberry cupcake', 'slice of cake', 'cream puff', 'fruit tart', 'chocolate croissant',
    'jelly donut', 'slice of strawberry shortcake', 'egg tart', 'swiss roll', 'chocolate chip cookie'],
  drink: ['mug of cocoa', 'cup of tea', 'glass of orange juice', 'strawberry milkshake', 'chocolate milkshake', 'glass of lemonade', 'glass of apple juice', 'strawberry smoothie'],
  hat: ['beret', 'bowler hat', 'cowboy hat', 'sun hat', 'top hat', 'boater hat', 'cloche hat', 'sailor cap', 'pillbox hat', 'baseball cap', 'bobble hat',
    'bucket hat', 'panama hat', 'feathered hat', 'captain hat', 'newsboy cap', 'wide-brimmed hat', 'bonnet'],
  acc: ['heart-shaped sunglasses', 'star-shaped sunglasses', 'round sunglasses', 'aviator sunglasses', 'hair bow ribbon', 'butterfly hair clip', 'flower crown',
    'tiara', 'bunny ear headband', 'cat ear headband', 'necklace', 'handbag', 'scarf', 'bow tie', 'party dress', 'umbrella', 'heart locket'],
  toy: ['teddy bear', 'rag doll', 'nesting doll', 'toy robot', 'toy car', 'toy train engine', 'jack-in-the-box', 'spinning top', 'yo-yo', 'kite', 'beach ball',
    'toy castle', 'pull-along duck toy', 'stacking rings toy', 'toy rocket', 'toy building block', 'music box', 'toy airplane', 'toy sailboat', 'jump rope', 'pinwheel', 'toy truck'],
};
/** Плюшевые игрушки из автомата-хваталки (у каждой — наклейка). */
const PLUSH = ['plush unicorn', 'plush fox', 'plush penguin', 'plush owl', 'plush frog', 'plush whale', 'plush duck', 'plush octopus'];
/** Что бывает в капсулах. */
const CAPSULE = ['glass marble', 'bouncy ball', 'puzzle cube', 'pair of dice', 'rubber ball', 'jigsaw puzzle piece', 'slime ball', 'bag of marbles'];
/** Что дарит фонтан за монетку. */
const WISH = ['lucky charm', 'four leaf clover', 'heart crystal', 'clover charm', 'wishbone charm'];
/** Покупатели: в какой комнате, что просят (списки полок этой комнаты) и где встают (доля ширины). */
const GUESTS = {
  cafe: { want: ['pastry', 'drink'], spot: 0.6 },
  clothes: { want: ['hat'], spot: 0.47 },
  toyshop: { want: ['toy'], spot: 0.5 },
};
const GUEST_ANIMALS = ['panda', 'koala', 'penguin', 'fox', 'raccoon', 'red panda', 'hedgehog', 'owl', 'bear cub', 'squirrel', 'rabbit', 'cat', 'puppy', 'duckling'];

// Подсказки-облачка, приманки и страница альбома — дописываются к общим спискам в main.js и stickers.js
export const CITY_HINTS = {
  icecart: { room: R.street, seq: () => ['icecart', 'ice cream cone'] },
  traffic: { room: R.street, seq: () => ['trafficlight', 'tex:car_0_icon'] },
  fountain: { room: R.street, seq: () => ['fountain', 'tex:water_drop'] },
  wishcoin: { room: R.street, seq: () => ['coin', 'fountain', 'four leaf clover'] },
  shelf: { room: R.market, seq: (s) => { const k = ['fruit', 'bread', 'dairy'][Math.floor(Math.random() * 3)]; return [{ fruit: 'fruitstand', bread: 'breadrack', dairy: 'cooler' }[k], s.stockRecs(k)[0]]; } },
  checkout: { room: R.market, seq: () => ['apple', 'checkout', 'paper-bag'] },
  trolley: { room: R.market, seq: () => ['shopcart'] },
  pastry: { room: R.cafe, seq: () => (Math.random() < 0.5 ? ['showcase', 'croissant'] : ['drinkbar', 'mug of cocoa']) },
  hats: { room: R.clothes, seq: () => ['hatrack', 'top hat'] },
  fitting: { room: R.clothes, seq: () => ['fitting'] },
  mannequin: { room: R.clothes, seq: () => ['sun hat', 'mannequin'] },
  podium: { room: R.clothes, seq: () => ['podium'] },
  toystand: { room: R.toyshop, seq: () => ['toystand', 'teddy bear'] },
  claw: { room: R.toyshop, seq: () => ['claw', 'plush unicorn'] },
  gumball: { room: R.toyshop, seq: () => ['coin', 'gumball', 'glass marble'] },
  giftwrap: { room: R.toyshop, seq: () => ['teddy bear', 'giftwrap', 'gift-0'] },
  // покупатель ждёт: кукла подсказывает, что ему дать
  guest: { room: [R.cafe, R.clothes, R.toyshop], when: (s) => !!s.guest?.arrived && !s.guest.served, seq: (s) => [s.guest.want, s.guest.rec, 'coin'] },
};
export const CITY_LURES = [['icecart', (b) => b.stock === 'ice'], ['traffic', (b) => b.traffic], ['fountain', (b) => b.fountain],
  ['shelf', (b) => ['fruit', 'bread', 'dairy'].includes(b.stock)], ['checkout', (b) => b.checkout], ['trolley', (b) => b.trolley],
  ['pastry', (b) => b.stock === 'pastry' || b.stock === 'drink'], ['hats', (b) => b.stock === 'hat' || b.stock === 'acc'],
  ['fitting', (b) => b.fitting], ['mannequin', (b) => b.mannequin], ['podium', (b) => b.podium],
  ['toystand', (b) => b.stock === 'toy'], ['claw', (b) => b.claw], ['gumball', (b) => b.gumball], ['giftwrap', (b) => b.giftwrap]];
/** Страница «город» в альбоме: [что получилось, из чего (предмет каталога, id или ключ текстуры), чем]. */
export const CITY_STICKERS = [
  ['ice cream cone', 'icecart', 'spark'], ['ice cream sundae', 'icecart', 'spark'],
  ['coin', 'croissant', 'panda'], ['lucky charm', 'coin', 'fountain'], ['four leaf clover', 'coin', 'fountain'], ['heart crystal', 'coin', 'fountain'],
  ['paper-bag', 'apple', 'checkout'], ['gift-0', 'teddy bear', 'giftwrap'],
  ...PLUSH.map((p) => [p, 'claw', 'spark']),
  ['glass marble', 'coin', 'gumball'], ['bouncy ball', 'coin', 'gumball'], ['puzzle cube', 'coin', 'gumball'],
];

export function makeCity(scene) { return makeCityArt(scene); }

export function installCity(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    // ---------------------------------------------------------------- расстановка
    /** Город один раз обставляется — и в старых сохранениях. */
    ensureCity() {
      if (this.flags.city) return;
      this.flags.city = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const at = (room) => {
        const x0 = room * W;
        const rec = (id) => this.byId.get(id) || this.findRec(id);
        return (id, fx, y, extra) => { const r = rec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y), extra) : null; };
      };
      // ---- улица
      let put = at(R.street);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('trafficlight', 0.4, FLOOR_TOP + 15);
      put('icecart', 0.16, FLOOR_TOP + 13);
      put('fountain', 0.6, FLOOR_TOP + 14);
      put('park bench', 0.3, FLOOR_TOP + 10);
      put('street lamp', 0.78, FLOOR_TOP + 6);
      put('coin', 0.52, ROOM_H - 4);
      put('kick scooter', 0.24, ROOM_H - 4);
      put('balloon', 0.08, FLOOR_TOP + 8);
      // ---- супермаркет
      put = at(R.market);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('fruitstand', 0.2, FLOOR_TOP + 10);
      put('breadrack', 0.4, FLOOR_TOP + 8);
      put('cooler', 0.56, FLOOR_TOP + 8);
      put('checkout', 0.8, FLOOR_TOP + 18);
      put('shopcart', 0.33, ROOM_H - 6);
      put('shopping basket', 0.12, ROOM_H - 10);
      put('apple', 0.47, ROOM_H - 5);
      put('baguette', 0.6, ROOM_H - 3);
      // ---- кафе
      put = at(R.cafe);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('showcase', 0.2, FLOOR_TOP + 10);
      put('drinkbar', 0.4, FLOOR_TOP + 8);
      put('cafetable', 0.72, FLOOR_TOP + 22);
      put('chair', 0.62, FLOOR_TOP + 20);
      put('chair', 0.82, FLOOR_TOP + 20);
      put('cafetable', 0.3, ROOM_H - 4);
      put('chair', 0.2, ROOM_H - 6);
      put('teapot', 0.5, ROOM_H - 3);
      put('teacup and saucer', 0.56, ROOM_H - 7);
      // ---- магазин одежды
      put = at(R.clothes);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('rail', 0.18, FLOOR_TOP + 10);
      put('hatrack', 0.36, FLOOR_TOP + 8);
      put('shopmirror', 0.48, FLOOR_TOP + 8);
      put('fitting', 0.62, FLOOR_TOP + 8);
      put('mannequin', 0.8, FLOOR_TOP + 10);
      put('podium', 0.76, ROOM_H - 6);
      put('sun hat', 0.9, ROOM_H - 14);
      put('handbag', 0.42, ROOM_H - 3);
      // ---- магазин игрушек
      put = at(R.toyshop);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('toystand', 0.2, FLOOR_TOP + 8);
      put('claw', 0.42, FLOOR_TOP + 8);
      put('gumball', 0.57, FLOOR_TOP + 10);
      put('giftwrap', 0.78, FLOOR_TOP + 16);
      put('coin', 0.5, ROOM_H - 4);
      put('teddy bear', 0.9, ROOM_H - 5);
      put('rocking horse', 0.32, ROOM_H - 5);
      put('toy drum', 0.12, ROOM_H - 12);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initCity() {
      this.guest = null;
      this.guestAfter = 0;
      this.cars = [];
      // магазины на улице — не предметы: тап по фасаду ведёт в его комнату
      for (const s of streetShops(L)) {
        const z = this.add.zone(R.street * L.W + s.x, s.top, s.w, s.h).setOrigin(0).setDepth(-7.9).setInteractive();
        z.shopDoor = R[s.key];
      }
      // и обратно: в каждом магазине — дверь на улицу
      const d = exitDoor(L);
      for (const s of streetShops(L)) {
        const z = this.add.zone(R[s.key] * L.W + d.x - 2, d.top - 2, d.w + 4, d.h + 4).setOrigin(0).setDepth(-7.9).setInteractive();
        z.shopDoor = R.street;
      }
      this.time.addEvent({ delay: 2500, loop: true, callback: () => this.guestTick() });
      // вывеска автомата-хваталки мигает
      this.time.addEvent({
        delay: 600, loop: true, callback: () => {
          for (const m of this.objs) if (m.beh?.claw && this.visible(m)) { m.blinkB = !m.blinkB; m.setTexture(m.blinkB ? 'claw_b' : 'claw'); }
        },
      });
    },

    /** Каждый кадр: тележка и пакет с покупками выглядят полными; седок тележки едет вместе с ней; облачко покупателя — над ним. */
    updateCity() {
      for (const o of this.objs) {
        const b = o.beh;
        if (!b || o.kind !== 'item') continue;
        if (b.trolley) {
          const key = o.contents.length ? 'shopcart_full' : 'shopcart';
          if (o.texture.key !== key) o.setTexture(key);
          this.tractorSync(o);
        } else if (b.bag) {
          const key = o.contents.length ? 'paperbag_full' : 'paperbag';
          if (o.texture.key !== key) o.setTexture(key);
        }
      }
      const g = this.guest;
      if (g?.active) {
        g.setDepth(g.y);
        if (g.bubble) { g.bubble.setPosition(g.x + 3, g.y - 13); g.icon.setPosition(g.bubble.x + 9, g.bubble.y - 14); }
        if (g.hat) g.hat.setPosition(g.x + g.hatDx * (g.flipX ? -1 : 1), g.y - g.hatDy).setDepth(g.depth + 0.2);
      }
    },

    /** Записи каталога для списка полки (те, что есть в каталоге). */
    stockRecs(kind) {
      this.stockLists ||= {};
      return (this.stockLists[kind] ||= (STOCK[kind] || []).map((sub) => this.findRec(sub)).filter(Boolean));
    },

    /** Новое из города (или с моря — page): предмет выскакивает, наклейка — в альбом. */
    cityGift(rec, x, y, dir = 0, page = 'city') {
      if (typeof rec === 'string') rec = this.byId.get(rec) || this.findRec(rec);
      if (!rec) return null;
      sfx.chestOut();
      this.fxSparks.explode(6, x, y);
      this.sticker(page, rec, x, y - 6);
      return this.popItem(rec, x, y, dir);
    },

    /** В комнате и так всё завалено — полки больше ничего не роняют. */
    roomFull(room) { return this.countIn(room, (x) => !x.beh.furniture) > 40; },

    // ---------------------------------------------------------------- тап и бросок
    /** Тап по предмету города. true — тап обработан. */
    cityTap(o) {
      const b = o.beh;
      if (b.stock) { this.stockTap(o); return true; }
      if (b.traffic) { this.trafficTap(o); return true; }
      if (b.fountain) { this.fountainTap(o); return true; }
      if (b.trolley) { return this.trolleyTap(o); }
      if (b.checkout) { this.checkoutBeep(o); this.hintDone('checkout'); return true; }
      if (b.fitting) { this.fittingTap(o); return true; }
      if (b.mannequin) { this.mannequinTap(o); return true; }
      if (b.podium) { this.podiumTap(o); return true; }
      if (b.claw) { this.clawTap(o); return true; }
      if (b.gumball) { this.gumballTap(o); return true; }
      if (b.giftwrap) { this.giftwrapTap(o); return true; }
      return false;
    },

    /** Предмет или куклу бросили на что-то из города. true — бросок обработан. */
    cityDrop(o, q) {
      if (q.y > L.ROOM_H) return false;
      const under = (pred) => this.objAt(q.x, q.y, (x) => x !== o && x.kind === 'item' && pred(x.beh));
      if (o.kind === 'char') {
        const booth = under((b) => b.fitting);
        if (booth && this.fittingIn(booth, o)) return true;
        return false;
      }
      if (o.kind !== 'item') return false;
      // покупателю — то, что он просит
      const g = this.guest;
      if (g?.arrived && !g.served && Math.abs(q.x - g.x) < 14 && q.y > g.y - 34 && q.y < g.y + 8 && this.guestGive(g, o)) return true;
      if (o.beh.head) {
        const man = under((b) => b.mannequin);
        if (man) { this.petWear(man, o); this.hintDone('mannequin'); return true; }
      }
      if (o.rec.subject === 'coin') {
        const f = under((b) => b.fountain);
        if (f) { this.fountainWish(f, o); return true; }
        const m = under((b) => b.gumball);
        if (m) { this.gumballCoin(m, o); return true; }
      }
      const loose = !o.beh.furniture && !o.beh.pet && !o.beh.container;
      if (loose) {
        const co = under((b) => b.checkout);
        if (co) { this.checkoutScan(co, o); return true; }
      }
      if (loose && !o.beh.gift && (o.rec.cat === 'toy' || /^(plush|stuffed) /.test(o.rec.subject))) {
        const table = under((b) => b.giftwrap);
        if (table) { this.giftWrap(table, o); return true; }
      }
      return false;
    },

    // ---------------------------------------------------------------- полки
    /** Прилавок, витрина, вешалка, тележка мороженого: подпрыгивает и роняет предмет из своего списка. */
    stockTap(o) {
      if (this.time.now < (o.busyUntil || 0)) return;
      o.busyUntil = this.time.now + 450;
      const kind = o.beh.stock;
      this.tweens.add({ targets: o, y: o.y - 2, duration: 80, yoyo: true });
      this.stockDone(kind);
      const room = roomOf(o);
      if (this.roomFull(room)) { sfx.boing(); return; }
      const list = this.stockRecs(kind);
      if (!list.length) return;
      // покупатель ждёт что-то с этой полки — она часто «угадывает»
      const g = this.guest;
      const wanted = g?.arrived && !g.served && list.includes(g.want) && Math.random() < 0.55 ? g.want : null;
      const rec = wanted || pick(list);
      const x = o.x + rnd(-6, 6);
      const y = o.y - Math.min(18, o.displayHeight * 0.5);
      if (kind === 'ice') {
        sfx.jingle();
        if (/cone|sundae/.test(rec.subject)) { this.cityGift(rec, x, y); return; }
      } else if (kind === 'drink') {
        sfx.blub();
        this.fxPoof.explode(3, o.x - 3, o.y - o.displayHeight + 8);
      } else sfx.chestOut();
      this.popItem(rec, x, y);
    },

    /** Какой счётчик и какая подсказка у полки. */
    stockDone(kind) {
      if (kind === 'ice') this.hintDone('icecart');
      else if (kind === 'pastry' || kind === 'drink') this.hintDone('pastry');
      else if (kind === 'hat' || kind === 'acc') this.hintDone('hats');
      else if (kind === 'toy') this.hintDone('toystand');
      else this.hintDone('shelf');
    },

    // ---------------------------------------------------------------- улица
    /** Тап по магазину на улице — входим в его комнату; тап по двери в магазине — выходим на улицу. */
    shopEnter(idx) {
      if (this.dress || this.albumUi || this.mapUi || this.cardUi) return;
      this.stat('shopdoor');
      sfx.ding();
      this.goRoom(idx);
    },

    /** Светофор: зелёный на несколько секунд — и по дороге проезжают машины. */
    trafficTap(t) {
      if (t.green) return;
      t.green = true;
      t.setTexture('trafficlight_g');
      sfx.click();
      this.hintDone('traffic');
      const room = roomOf(t);
      for (let i = 0; i < 3; i++) this.time.delayedCall(250 + i * 1100, () => this.carPass(room, i));
      this.time.delayedCall(4200, () => { t.green = false; if (t.active) { t.setTexture('trafficlight'); sfx.click(); } });
    },

    /** Машина проезжает по дороге через всю комнату (тап по ней — сигналит). */
    carPass(room, i = 0) {
      const x0 = room * L.W;
      const dir = i % 2 ? -1 : 1;
      const lane = L.ROOM_H - 4 - (dir > 0 ? 0 : Math.round((L.ROOM_H - L.FLOOR_TOP) * 0.25));
      const c = this.add.image(dir > 0 ? x0 - 20 : x0 + L.W + 20, lane, `car_${Math.floor(Math.random() * 3)}`).setOrigin(0.5, 1).setFlipX(dir < 0).setInteractive();
      c.car = true;
      c.setDepth(lane);
      this.cars.push(c);
      if (Math.round(this.cameras.main.scrollX / L.W) === room) sfx.putt();
      this.tweens.add({
        targets: c, x: dir > 0 ? x0 + L.W + 20 : x0 - 20, duration: 2600,
        onUpdate: () => { c.y = lane - (Math.floor(c.x / 9) % 2 ? 1 : 0); },
        onComplete: () => { this.cars = this.cars.filter((x) => x !== c); c.destroy(); },
      });
    },

    carTap(c) {
      sfx.honk();
      this.fxNotes.explode(2, c.x, c.y - 14);
    },

    /** Струи фонтана: высота h, время ms. */
    fountainJets(f, ms, h = 1) {
      const top = f.y - f.displayHeight;
      const ev = this.time.addEvent({
        delay: 90, repeat: Math.round(ms / 90), callback: () => {
          if (!f.active) { ev.remove(); return; }
          this.fxCrumbs.setParticleTint(Math.random() < 0.3 ? 0xffffff : 0x5ac4f2);
          this.fxCrumbs.explode(Math.round(3 * h), f.x, top - 2);
        },
      });
    },

    fountainTap(f) {
      if (this.time.now < (f.busyUntil || 0)) return;
      f.busyUntil = this.time.now + 1700;
      sfx.splash();
      this.hintDone('fountain');
      this.tweens.add({ targets: f, y: f.y - 1, duration: 80, yoyo: true });
      this.fountainJets(f, 1500);
      for (const c of this.objs) if (c.kind === 'char' && roomOf(c) === roomOf(f) && Math.abs(c.x - f.x) < 34 && !c.busy && !c.sleeping) this.time.delayedCall(300, () => sfx.giggle());
    },

    /** Монетку — в фонтан: высокие струи, искры — и из воды выпрыгивает талисман на удачу. */
    fountainWish(f, coin) {
      this.objs = this.objs.filter((x) => x !== coin);
      this.tweens.add({ targets: coin, x: f.x, y: f.y - 10, alpha: 0, duration: 260, onComplete: () => coin.destroy() });
      sfx.splash();
      this.hintDone('wishcoin');
      this.fountainJets(f, 2000, 2);
      this.time.delayedCall(700, () => { sfx.sparkle(); if (f.active) this.fxSparks.explode(16, f.x, f.y - f.displayHeight - 8); });
      this.time.delayedCall(1300, () => {
        if (!f.active) return;
        const list = WISH.map((sub) => this.findRec(sub)).filter(Boolean);
        // сначала — те, чьих наклеек ещё нет
        const fresh = list.filter((r) => CITY_STICKERS.some(([sub]) => sub === r.subject) && !this.stickers.has('city', r.subject));
        this.cityGift(pick(fresh.length ? fresh : list), f.x, f.y - 10);
      });
    },

    // ---------------------------------------------------------------- супермаркет
    /** Тележка: с седоком (или пустая) — катится через зал; с покупками и без седока — высыпает их (общий тап по ящику). */
    trolleyTap(t) {
      const riders = this.objs.filter((r) => r.restOn === t && !r.dragging);
      if (!riders.length && t.contents.length) return false;
      if (!this.rollAcross(t)) return true;
      this.hintDone('trolley');
      sfx.rattle();
      if (riders.some((r) => r.kind === 'char')) sfx.whee();
      return true;
    },

    /**
     * Тележка, лодка, подводная лодка: едет (плывёт) к другому краю комнаты вместе с седоками. false — уже в пути.
     * turn — разворачивается носом по ходу; tick — что делать каждые 200 мс пути (брызги, пузыри).
     */
    rollAcross(t, { ms = 9, turn = false, tick = null } = {}) {
      if (t.rolling && this.tweens.isTweening(t)) return false; // флаг один не годится: её могли унести посреди пути
      const riders = this.objs.filter((r) => r.restOn === t && !r.dragging);
      const room = roomOf(t);
      const lo = room * L.W + 26;
      const hi = (room + 1) * L.W - 26;
      const tx = t.x < (lo + hi) / 2 ? hi : lo;
      if (turn && t.flipX !== tx < t.x) {
        t.setFlipX(tx < t.x);
        for (const r of riders) r.x = Math.round(2 * t.x - r.x); // седок пересаживается вместе с сиденьем
      }
      t.lastX = t.x;
      t.rolling = true;
      const ev = tick && this.time.addEvent({ delay: 200, loop: true, callback: () => { if (t.active && t.rolling && this.tweens.isTweening(t)) tick(t); else ev.remove(); } });
      this.tweens.add({
        targets: t, x: tx, duration: Math.abs(tx - t.x) * ms, ease: 'Sine.easeInOut',
        onComplete: () => {
          t.rolling = false;
          ev?.remove();
          this.tractorSync(t);
          for (const r of riders) if (r.kind === 'char' && r.restOn === t) { sfx.giggle(); this.fxHearts.explode(2, r.x, r.y - r.displayHeight); }
          this.save();
        },
      });
      return true;
    },

    /** Касса пикнула: зелёный огонёк. */
    checkoutBeep(co) {
      sfx.click(); sfx.ding();
      co.setTexture('checkout_lit');
      this.time.delayedCall(350, () => { if (co.active) co.setTexture('checkout'); });
    },

    /** Пакет у кассы (если его унесли — появляется новый). */
    bagAt(co) {
      const room = roomOf(co);
      const near = this.objs.find((b) => b.beh?.bag && !b.dragging && !b.owner && roomOf(b) === room && Math.abs(b.x - co.x) < 60);
      if (near) return near;
      const x = Phaser.Math.Clamp(co.x + 30, room * L.W + 10, (room + 1) * L.W - 8);
      return this.spawnItem(this.byId.get('paper-bag'), Math.round(x), Math.round(Math.min(L.ROOM_H - 1, co.y + 3)));
    },

    /** Предмет — на ленту кассы: едет к сканеру, «пик!» — и он в бумажном пакете. */
    checkoutScan(co, o) {
      const bag = this.bagAt(co);
      this.objs = this.objs.filter((x) => x !== o);
      bag.contents.push(o.rec.id); // в пакет — сразу: анимация ниже только для красоты
      o.glow?.destroy();
      o.disableInteractive();
      const by = co.y - 19;
      o.setDepth(co.depth + 0.3);
      o.x = co.x - 16;
      o.y = by;
      sfx.drop();
      this.hintDone('checkout');
      this.tweens.add({
        targets: o, x: co.x + 6, duration: 520,
        onComplete: () => {
          this.checkoutBeep(co);
          this.tweens.add({
            targets: o, x: bag.x, y: bag.y - 8, alpha: 0, duration: 320,
            onComplete: () => {
              o.destroy();
              if (!bag.active) return;
              this.tweens.add({ targets: bag, y: bag.y - 2, duration: 80, yoyo: true });
              this.sticker('city', bag.rec, bag.x, bag.y - 10);
            },
          });
        },
      });
    },

    // ---------------------------------------------------------------- покупатели
    /** Раз в две с половиной секунды: в кафе и в магазины одежды и игрушек заходит покупатель (пока игрок там). */
    guestTick() {
      const g = this.guest;
      const room = Math.round(this.cameras.main.scrollX / L.W);
      const cfg = GUESTS[roomAt(room).key];
      const busy = this.dress || this.albumUi || this.mapUi || this.travelling;
      if (g) {
        if (!g.active) { this.guest = null; return; }
        if (g.room !== room && !busy) { this.guestGone(g); return; } // игрок ушёл — покупатель тоже
        if (g.arrived && !g.served && this.time.now > g.until) this.guestLeave(g);
        return;
      }
      if (!cfg || busy || this.night || this.time.now < this.guestAfter || Math.random() < 0.4) return;
      const animals = GUEST_ANIMALS.map((sub) => this.findRec(sub)).filter(Boolean);
      const wants = cfg.want.flatMap((k) => this.stockRecs(k));
      if (!animals.length || !wants.length) return;
      this.guestCome(room, pick(animals), pick(wants), cfg.spot);
    },

    /** Покупатель вбегает справа, встаёт на своё место и показывает в облачке, чего хочет. */
    guestCome(room, rec, want, spot) {
      const x0 = room * L.W;
      const y = Math.round(L.ROOM_H - 6 - rnd(0, 8));
      const g = this.add.image(x0 + L.W + 10, y, rec.cat, rec.frame).setOrigin(0.5, 1).setInteractive();
      Object.assign(g, { guest: true, rec, want, room, arrived: false, served: false, until: 0, y0: y });
      g.setFlipX(true);
      this.guest = g;
      const tx = Math.round(x0 + L.W * spot + rnd(-8, 8));
      this.guestHop(g, tx, () => {
        if (!g.active) return;
        g.arrived = true;
        g.until = this.time.now + 45000;
        g.setFlipX(false);
        g.bubble = this.add.image(g.x, g.y, 'bubble').setOrigin(0.2, 1).setDepth(10003).setScale(0);
        g.icon = (want.tex ? this.add.image(0, 0, `${want.tex}_icon`) : this.add.image(0, 0, want.cat, want.frame)).setDepth(10004).setAlpha(0);
        this.tweens.add({ targets: g.bubble, scale: 1, duration: 220, ease: 'Back.easeOut', onComplete: () => g.bubble?.setScale(1) });
        this.tweens.add({ targets: g.icon, alpha: 1, duration: 200, delay: 150 });
        if (this.visible(g)) sfx.squeak();
      });
    },

    /** Вприпрыжку к точке. */
    guestHop(g, tx, done) {
      const x0 = g.x;
      const hops = Math.max(1, Math.round(Math.abs(tx - x0) / 14));
      this.tweens.addCounter({
        from: 0, to: 1, duration: hops * 210,
        onUpdate: (tw) => {
          if (!g.active) return;
          const k = tw.getValue();
          g.x = Math.round(x0 + (tx - x0) * k);
          g.y = Math.round(g.y0 - Math.abs(Math.sin(k * hops * Math.PI)) * 5);
        },
        onComplete: () => { if (g.active) { g.x = tx; g.y = g.y0; } done?.(); },
      });
    },

    /** Тап по покупателю: подпрыгивает и напоминает, чего ждёт. */
    guestTap(g) {
      this.petVoice(g);
      if (!g.arrived || g.served) return;
      this.tweens.add({ targets: g, y: g.y0 - 4, duration: 110, yoyo: true, onComplete: () => { if (g.active) g.y = g.y0; } });
      this.fxHearts.explode(1, g.x, g.y - 16);
    },

    /** Покупателю протянули предмет: то, что просил, — берёт, радуется и оставляет монетку. Не то — качает головой. */
    guestGive(g, o) {
      if (o.rec.subject !== g.want.subject) {
        sfx.boing();
        const gx = g.x;
        this.tweens.add({ targets: g, x: gx + 2, duration: 60, yoyo: true, repeat: 2, onComplete: () => { if (g.active) g.x = gx; } });
        if (g.bubble) this.tweens.add({ targets: g.bubble, scale: 1.25, duration: 120, yoyo: true, onComplete: () => g.bubble?.setScale(1) });
        return false;
      }
      g.served = true;
      this.objs = this.objs.filter((x) => x !== o);
      if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; }
      o.glow?.destroy();
      o.disableInteractive();
      this.guestBubbleOff(g);
      this.hintDone('guest');
      const top = g.y - 16;
      if (o.beh.head) {
        // шляпу надевает и уходит в ней
        const key = this.fitTex(o.rec, 10, 8);
        if (key) o.setTexture(key);
        const [bx0, by0, bx1] = g.rec.bbox || [0, 0, 15, 15];
        g.hat = o;
        g.hatDx = Math.round((bx0 + bx1) / 2 - 7.5);
        g.hatDy = 16 - by0 - 4;
        sfx.wear();
      } else {
        this.tweens.add({ targets: o, x: g.x, y: g.y - 6, alpha: 0, duration: 260, onComplete: () => o.destroy() });
        if (o.beh.edible || o.beh.drink) { sfx.chew(0.1); sfx.chew(0.25); this.time.delayedCall(450, () => sfx.yum()); } else sfx.giggle();
      }
      this.fxHearts.explode(5, g.x, top);
      this.tweens.add({ targets: g, y: g.y0 - 6, duration: 130, yoyo: true, repeat: 2, onComplete: () => { if (g.active) g.y = g.y0; } });
      this.time.delayedCall(700, () => {
        if (!g.active) return;
        if (this.countIn(g.room, (x) => x.rec.subject === 'coin') < 6) this.cityGift('coin', g.x, top + 4, -1);
        else this.fxSparks.explode(8, g.x, top);
      });
      this.time.delayedCall(1700, () => this.guestLeave(g));
      for (const c of this.objs) if (c.kind === 'char' && roomOf(c) === g.room && this.idle(c)) { this.celebrate(c, 2); break; }
      return true;
    },

    guestBubbleOff(g) {
      g.bubble?.destroy(); g.icon?.destroy();
      g.bubble = null; g.icon = null;
    },

    /** Покупатель уходит вприпрыжку к правому краю. */
    guestLeave(g) {
      if (!g.active || g.leaving) return;
      g.leaving = true;
      g.disableInteractive();
      this.guestBubbleOff(g);
      g.setFlipX(false);
      this.guestHop(g, g.room * L.W + L.W + 12, () => this.guestGone(g));
    },

    guestGone(g) {
      this.guestBubbleOff(g);
      g.hat?.destroy();
      g.destroy();
      if (this.guest === g) this.guest = null;
      this.guestAfter = this.time.now + rnd(7000, 14000);
    },

    // ---------------------------------------------------------------- магазин одежды
    /**
     * Куклу — в примерочную: шторка задёргивается, и кукла выходит в новом наряде другого цвета.
     * Пляжная кабинка (beh.cabin) — то же самое, но наряд известен заранее: купальник, а из купальника — обратно в своё.
     */
    fittingIn(booth, ch) {
      if (booth.fitBusy || ch.busy) return false;
      booth.fitBusy = true;
      ch.busy = true;
      ch.restOn = null;
      ch.inTub = null;
      ch.x = Math.round(booth.x);
      ch.y = Math.round(booth.y - 1);
      const show = (v) => { ch.setVisible(v); for (const it of Object.values(ch.slots)) it?.setVisible(v); ch.stainImg?.setVisible(v); };
      show(false);
      const tex = booth.rec.tex;
      booth.setTexture(`${tex}_closed`);
      sfx.swish();
      if (booth.beh.cabin) this.hintDone('cabin'); else this.hintDone('fitting');
      this.time.addEvent({ delay: 220, repeat: 3, callback: () => { if (booth.active) { this.tweens.add({ targets: booth, y: booth.y - 1, duration: 70, yoyo: true }); sfx.wear(); } } });
      this.time.delayedCall(1100, () => {
        const look = ch.look;
        if (booth.beh.cabin) {
          // wore — что было надето до купальника
          ch.look = look.outfit === 'swimsuit' ? { ...look, outfit: look.wore || 'dress', wore: undefined } : { ...look, outfit: 'swimsuit', wore: look.outfit };
        } else {
          ch.look = {
            ...look,
            outfit: pick(OUTFIT_KEYS.filter((k) => k !== look.outfit)),
            dress: pick(DRESS.filter((c) => c !== look.dress)),
          };
        }
        this.charTex(ch);
        booth.fitBusy = false;
        if (booth.active) booth.setTexture(tex);
        if (!ch.active) return;
        ch.busy = false;
        ch.setTexture(ch.key);
        show(true);
        // выходит из кабинки — на свободную сторону
        const room = roomOf(booth);
        const side = booth.x - room * L.W > L.W - 40 ? -1 : 1;
        ch.x = Math.round(booth.x + side * 22);
        ch.y = Math.round(Phaser.Math.Clamp(booth.y + 6, L.FLOOR_TOP + 8, L.ROOM_H - 2));
        sfx.sparkle();
        this.fxSparks.explode(14, ch.x, ch.y - ch.displayHeight * 0.5);
        this.refreshCastIcons();
        this.celebrate(ch, 3);
        this.save();
      });
      return true;
    },

    /** Тап по пустой примерочной: шторка задёргивается и открывается. */
    fittingTap(booth) {
      if (booth.fitBusy) return;
      booth.fitBusy = true;
      sfx.swish();
      booth.setTexture(`${booth.rec.tex}_closed`);
      this.time.delayedCall(600, () => { booth.fitBusy = false; if (booth.active) booth.setTexture(booth.rec.tex); });
    },

    /** Манекен поворачивается и блестит. */
    mannequinTap(m) {
      m.setFlipX(!m.flipX);
      sfx.wear();
      this.fxSparks.explode(5, m.x, m.y - m.displayHeight * 0.7);
      this.tweens.add({ targets: m, y: m.y - 2, duration: 90, yoyo: true });
      this.hintDone('mannequin');
    },

    /** Подиум: огни мигают, вспышки фотоаппаратов; кукла на подиуме поворачивается, все хлопают. */
    podiumTap(p) {
      if (this.time.now < (p.busyUntil || 0)) return;
      p.busyUntil = this.time.now + 1800;
      const models = this.objs.filter((r) => r.restOn === p && !r.dragging);
      this.time.addEvent({ delay: 150, repeat: 9, callback: () => { if (!p.active) return; p.litB = !p.litB; p.setTexture(p.litB ? 'podium_b' : 'podium'); } });
      this.time.delayedCall(1700, () => { if (p.active) { p.litB = false; p.setTexture('podium'); } });
      this.hintDone('podium');
      if (!models.length) { sfx.click(); return; }
      sfx.shutter();
      this.time.delayedCall(500, () => sfx.shutter());
      this.time.delayedCall(900, () => sfx.applause());
      for (const m of models) {
        this.time.addEvent({ delay: 260, repeat: 3, callback: () => { if (m.active && m.restOn === p) m.setFlipX(!m.flipX); } });
        this.time.delayedCall(1200, () => { if (m.active) { m.setFlipX(false); this.fxHearts.explode(3, m.x, m.y - m.displayHeight); } });
        this.fxSparks.explode(8, m.x + rnd(-10, 10), m.y - m.displayHeight * rnd(0.4, 1));
      }
    },

    // ---------------------------------------------------------------- магазин игрушек
    /** Автомат-хваталка: клешня едет вниз, хватает плюшевую игрушку и роняет её в лоток. */
    clawTap(m) {
      if (m.clawBusy) return;
      m.clawBusy = true;
      this.hintDone('claw');
      sfx.click();
      const list = PLUSH.map((sub) => this.findRec(sub)).filter(Boolean);
      const fresh = list.filter((r) => !this.stickers.has('city', r.subject));
      // новая игрушка — чаще, чем уже пойманная: альбом не превращается в долгую лотерею
      const rec = list.length ? pick(fresh.length && Math.random() < 0.7 ? fresh : list) : null;
      const top = m.y - m.displayHeight + 9;
      const hand = this.add.image(m.x - 6, top, 'clawhand').setOrigin(0.5, 0).setDepth(m.depth + 0.3);
      const done = () => { hand.destroy(); m.clawBusy = false; };
      const beep = this.time.addEvent({ delay: 160, repeat: 12, callback: () => { if (this.visible(m)) sfx.blub(); } });
      this.tweens.add({
        targets: hand, x: m.x + 4, duration: 500,
        onComplete: () => this.tweens.add({
          targets: hand, y: top + 11, duration: 450,
          onComplete: () => {
            if (!m.active) { done(); return; }
            const small = rec && this.fitTex(rec, 9, 9); // уменьшенная по пикселям копия — чтобы поместилась за стеклом
            const prize = rec ? (small ? this.add.image(hand.x, hand.y + 4, small) : this.add.image(hand.x, hand.y + 4, rec.cat, rec.frame)).setOrigin(0.5, 0).setDepth(m.depth + 0.25) : null;
            this.tweens.add({
              targets: prize ? [hand, prize] : hand, y: `-=${11}`, duration: 500,
              onComplete: () => {
                beep.remove();
                prize?.destroy();
                done();
                if (!m.active || !rec) return;
                sfx.ding();
                if (this.roomFull(roomOf(m))) { sfx.boing(); return; }
                this.cityGift(rec, m.x + 6, m.y - 6);
              },
            });
          },
        }),
      });
    },

    /** Автомат с капсулами без монетки только гремит шариками. */
    gumballTap(m) {
      sfx.rattle();
      const x0 = m.x;
      this.tweens.add({ targets: m, x: x0 + 1, duration: 50, yoyo: true, repeat: 3, onComplete: () => { if (m.active) m.x = x0; } });
      this.hintDone('gumball');
    },

    /** Монетку — в автомат: выкатывается капсула, лопается — внутри маленькая игрушка. */
    gumballCoin(m, coin) {
      this.objs = this.objs.filter((x) => x !== coin);
      this.tweens.add({ targets: coin, x: m.x, y: m.y - 12, alpha: 0, duration: 220, onComplete: () => coin.destroy() });
      sfx.chestIn();
      this.hintDone('gumball');
      this.time.delayedCall(250, () => this.gumballTap(m));
      this.time.delayedCall(800, () => {
        if (!m.active) return;
        const list = CAPSULE.map((sub) => this.findRec(sub)).filter(Boolean);
        const fresh = list.filter((r) => CITY_STICKERS.some(([sub]) => sub === r.subject) && !this.stickers.has('city', r.subject));
        const rec = pick(fresh.length ? fresh : list);
        const cap = this.add.image(m.x, m.y - 6, 'capsule').setDepth(m.y + 1);
        const tx = m.x + (m.x - roomOf(m) * L.W > L.W / 2 ? -14 : 14);
        sfx.thud();
        this.tweens.add({
          targets: cap, x: tx, y: Math.min(L.ROOM_H - 3, m.y + 4), angle: 360, duration: 450,
          onComplete: () => {
            const { x, y } = cap;
            cap.destroy();
            sfx.pop();
            this.fxSparks.explode(8, x, y - 3);
            if (rec) this.cityGift(rec, x, y - 2);
          },
        });
      });
    },

    giftwrapTap(table) {
      sfx.rustle();
      this.tweens.add({ targets: table, y: table.y - 2, duration: 80, yoyo: true });
      this.fxSparks.explode(3, table.x, table.y - table.displayHeight);
    },

    /** Игрушку — на стол упаковки: шуршит бумага, и на столе — подарок; в коробке именно эта игрушка. */
    giftWrap(table, toy) {
      const gifts = ['gift-0', 'gift-1', 'gift-2'].map((id) => this.byId.get(id)).filter(Boolean);
      if (!gifts.length) return;
      this.objs = this.objs.filter((x) => x !== toy);
      toy.glow?.destroy();
      toy.disableInteractive();
      const x = Math.round(table.x + 2);
      const y = Math.round(table.y - table.displayHeight + 9);
      toy.setDepth(table.depth + 0.3);
      this.tweens.add({ targets: toy, x, y, duration: 180 });
      this.hintDone('giftwrap');
      sfx.rustle();
      this.time.delayedCall(260, () => sfx.rustle());
      this.fxCrumbs.setParticleTint(0xff9ac8);
      this.time.delayedCall(200, () => this.fxCrumbs.explode(8, x, y - 4));
      // подарок появляется сразу (невидимым): игрушка не пропадёт, даже если игру закроют посреди упаковки
      const gift = this.spawnItem(pick(gifts), x, y, { contents: [toy.rec.id] });
      gift.restOn = table;
      gift.setAlpha(0);
      this.time.delayedCall(520, () => {
        toy.destroy();
        if (!gift.active) return;
        gift.setAlpha(1);
        sfx.sparkle();
        this.fxSparks.explode(10, gift.x, gift.y - 6);
        if (!gift.dragging) this.tweens.add({ targets: gift, y: gift.y - 4, duration: 110, yoyo: true });
        this.sticker('city', this.byId.get('gift-0'), gift.x, gift.y - 8);
        this.save();
      });
    },
  });
}
