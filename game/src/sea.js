// Море — четвёртая локация: пляж, открытая вода, морское дно и остров (комнаты — в places.js, фон — в seascene.js,
// рисунки и записи каталога — в seaart.js). Что там можно делать:
//  пляж:   тап по морю у горизонта — волна выбрасывает на песок ракушку; кучка песка — три тапа, и это замок
//          (из готового замка вылезает краб); пальма — кокос; кабинка — кукла выходит в купальнике (и обратно);
//  в море: лодка под парусом (куклу — в лодку, тап — плывёт); мостик с удочкой — клюёт рыбка;
//          дельфин выпрыгивает из воды — тап, и он бросает подарок; бутылка с запиской — тап, внутри карта сокровищ;
//          кукла в воде — в надувном круге;
//  под водой: у кукол русалочий хвост; большая ракушка — жемчужина; сундук — самоцветы; подводная лодка;
//          коралл пускает пузыри; мимо плавают рыбки;
//  остров: пальмы, гнездо черепахи (вылупляется черепашка), красный крестик — карту сокровищ (или лопатку) на него:
//          клад с алмазом; котелок на костре — тот же волшебный котёл, что дома (pots.js).
// Всё, что получилось, — страница «море» в альбоме.
import Phaser from 'phaser';
import { R } from './places.js';
import { makeSeaArt } from './seaart.js';
import { SEA_BAND } from './seascene.js';

const SHELLS = ['seashell', 'conch shell', 'scallop shell', 'spiral shell', 'starfish'];
const FISH = ['goldfish', 'salmon fish', 'tuna fish', 'trout fish', 'bass fish', 'cod fish', 'koi fish', 'blue tang fish'];
const GEMS = ['ruby', 'sapphire', 'emerald'];
/** Что ещё лежит в кладе под крестиком, кроме алмаза. */
const LOOT = ['ruby', 'sapphire', 'emerald', 'pearl', 'gold coin tower', 'tiara', 'crown'];
/** Чем бросается дельфин (первым — надувной круг). */
const DOLPHIN_TOYS = ['inflatable swim ring', 'beach ball', 'message in a bottle', 'rubber duck'];

// Подсказки-облачка, приманки и страница альбома — дописываются к общим спискам в main.js и stickers.js
export const SEA_HINTS = {
  wave: { room: [R.beach, R.island], seq: () => ['tex:water_drop', 'seashell'] },
  sandcastle: { room: R.beach, seq: () => ['sandcastle', 'tex:sandcastle_3_icon'] },
  palm: { room: [R.beach, R.island], seq: () => ['palm', 'coconut'] },
  cabin: { room: R.beach, seq: () => ['cabin'] },
  boat: { room: R.waves, seq: () => ['boat'] },
  fishing: { room: R.waves, seq: () => ['pier', 'goldfish'] },
  dolphin: { room: R.waves, seq: () => ['dolphin'] },
  bottle: { room: [R.beach, R.waves], when: (s) => s.objs.some((o) => o.rec?.subject === 'message in a bottle'), seq: () => ['message in a bottle', 'treasure map'] },
  clam: { room: R.deep, seq: () => ['giantclam', 'pearl'] },
  seachest: { room: R.deep, seq: () => ['seachest', 'ruby'] },
  sub: { room: R.deep, seq: () => ['sub'] },
  vent: { room: R.deep, seq: () => ['coral', 'tex:bubble_big'] },
  treasure: { room: R.island, seq: () => ['treasure map', 'xmark', 'diamond'] },
  nest: { room: R.island, seq: () => ['nest', 'sea turtle'] },
};
export const SEA_LURES = [['sandcastle', (b) => b.sand], ['palm', (b) => b.palm], ['cabin', (b) => b.cabin], ['boat', (b) => b.boat],
  ['fishing', (b) => b.fishing], ['clam', (b) => b.clam], ['seachest', (b) => b.seachest], ['sub', (b) => b.sub], ['vent', (b) => b.vent],
  ['treasure', (b) => b.xmark], ['nest', (b) => b.nest]];
/** Страница «море» в альбоме: [что получилось, из чего (предмет каталога, id или ключ текстуры), чем]. */
export const SEA_STICKERS = [
  ...SHELLS.map((s) => [s, 'water_drop', 'spark']),
  ['coconut', 'palm', 'spark'], ['crab', 'sandcastle', 'spark'],
  ...FISH.map((f) => [f, 'pier', 'spark']),
  ['inflatable swim ring', 'dolphin', 'spark'], ['treasure map', 'message in a bottle', 'spark'],
  ['pearl', 'giantclam', 'spark'], ['black pearl', 'giantclam', 'spark'],
  ...GEMS.map((g) => [g, 'seachest', 'spark']),
  ['diamond', 'treasure map', 'xmark'], ['sea turtle', 'nest', 'spark'],
];

export function makeSea(scene) { return makeSeaArt(scene); }

export function installSea(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    // ---------------------------------------------------------------- расстановка
    /** Море один раз обставляется — и в старых сохранениях. */
    ensureSea() {
      if (this.flags.sea) return;
      this.flags.sea = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const at = (room) => {
        const x0 = room * W;
        const rec = (id) => this.byId.get(id) || this.findRec(id);
        return (id, fx, y, extra) => { const r = rec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y), extra) : null; };
      };
      // ---- пляж
      let put = at(R.beach);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('palm', 0.13, FLOOR_TOP + 8);
      put('deck chair', 0.25, FLOOR_TOP + 14);
      put('sandcastle', 0.4, FLOOR_TOP + 20);
      put('cabin', 0.58, FLOOR_TOP + 8);
      put('toy bucket', 0.47, ROOM_H - 4);
      put('beach ball', 0.3, ROOM_H - 6);
      put('message in a bottle', 0.76, ROOM_H - 8);
      put('sunglasses', 0.2, ROOM_H - 3);
      // ---- в море
      put = at(R.waves);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('boat', 0.32, FLOOR_TOP + 24);
      put('pier', 0.74, FLOOR_TOP + 14);
      put('rubber duck', 0.52, ROOM_H - 6);
      put('inflatable flamingo float', 0.16, ROOM_H - 8);
      // ---- под водой
      put = at(R.deep);
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('giantclam', 0.2, FLOOR_TOP + 14);
      put('coral', 0.38, FLOOR_TOP + 8);
      put('seachest', 0.58, FLOOR_TOP + 12);
      put('sub', 0.8, FLOOR_TOP + 26);
      put('octopus', 0.47, ROOM_H - 6);
      put('seahorse', 0.3, ROOM_H - 10);
      put('seashell', 0.68, ROOM_H - 4);
      // ---- остров (котелок на костре ставит ensurePots)
      put = at(R.island);
      put('tidy-bin', 20 / W, ROOM_H - 6);
      put('palm', 0.18, FLOOR_TOP + 8);
      put('palm', 0.84, FLOOR_TOP + 10);
      put('hammock', 0.33, FLOOR_TOP + 22);
      put('nest', 0.68, FLOOR_TOP + 18);
      put('xmark', 0.6, ROOM_H - 9);
      put('parrot', 0.76, FLOOR_TOP + 24);
      put('seashell', 0.43, ROOM_H - 8);
      put('starfish', 0.53, ROOM_H - 13);
      put('coconut', 0.26, ROOM_H - 7);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initSea() {
      this.dolphin = null;
      this.dolphinAfter = 0;
      this.shoal = [];
      // море у горизонта на пляже и острове — не предмет: тап по нему поднимает волну
      for (const room of [R.beach, R.island]) {
        const z = this.add.zone(room * L.W, L.FLOOR_TOP - SEA_BAND, L.W, SEA_BAND + 1).setOrigin(0).setDepth(-7.9).setInteractive();
        z.seaWave = room;
      }
      this.time.addEvent({ delay: 2000, loop: true, callback: () => this.seaTick() });
    },

    /** Каждый кадр: замок по стадии, седоки лодок, круг на кукле в воде, хвост на кукле под водой. */
    updateSea() {
      for (const o of this.objs) {
        if (o.kind === 'item') {
          const b = o.beh;
          if (b.boat || b.sub) this.tractorSync(o);
          else if (b.sand) { const key = `sandcastle_${o.stage || 0}`; if (o.texture.key !== key) o.setTexture(key); }
          continue;
        }
        if (o.kind !== 'char') continue;
        const room = roomOf(o);
        const free = !o.dragging && !o.restOn && !o.inTub && o.visible && o.pose !== 'lie';
        this.seaWear(o, 'ringImg', 'swimring', free && room === R.waves, 1, 0.12);
        this.seaWear(o, 'tailImg', 'dw_tail', free && room === R.deep && !o.dmark?.tail, 3, 0.1);
      }
    },

    /** Накладка у ног куклы (круг, хвост): появляется и исчезает по условию, сама следует за куклой. */
    seaWear(ch, field, tex, on, dy, layer) {
      let im = ch[field];
      if (!on) { if (im?.visible) im.setVisible(false); return; }
      if (!im) {
        im = ch[field] = this.add.image(ch.x, ch.y, tex).setOrigin(0.5, 1);
        ch.once('destroy', () => im.destroy());
      }
      const k = ch.scaleY;
      im.setVisible(true).setPosition(ch.x, Math.round(ch.y + dy * k)).setScale(k).setFlipX(ch.flipX).setDepth(ch.depth + layer);
    },

    /** Подарок моря: предмет выскакивает, наклейка — на страницу «море». */
    seaGift(rec, x, y, dir = 0) { return this.cityGift(rec, x, y, dir, 'sea'); },

    /** Из списка — сначала то, чьей наклейки ещё нет (чаще, но не всегда: альбом не превращается в лотерею). */
    seaFresh(list, chance = 0.7) {
      const recs = list.map((sub) => this.findRec(sub)).filter(Boolean);
      const fresh = recs.filter((r) => !this.stickers.has('sea', r.subject));
      return recs.length ? pick(fresh.length && Math.random() < chance ? fresh : recs) : null;
    },

    // ---------------------------------------------------------------- тап и бросок
    /** Тап по предмету моря. true — тап обработан. */
    seaTap(o) {
      const b = o.beh;
      if (b.sand) { this.sandTap(o); return true; }
      if (b.boat) { this.boatTap(o); return true; }
      if (b.fishing) { this.pierTap(o); return true; }
      if (b.clam) { this.clamTap(o); return true; }
      if (b.seachest) { this.seaChestTap(o); return true; }
      if (b.sub) { this.subTap(o); return true; }
      if (b.vent) { this.ventTap(o); return true; }
      if (b.nest) { this.nestTap(o); return true; }
      if (b.xmark) { sfx.boing(); this.fxSparks.explode(4, o.x, o.y - 4); return true; }
      if (o.rec.subject === 'message in a bottle' && !o.owner) { this.bottleOpen(o); return true; }
      return false;
    },

    /** Предмет бросили на что-то из моря. true — бросок обработан. */
    seaDrop(o, q) {
      if (q.y > L.ROOM_H || o.kind !== 'item') return false;
      if (o.rec.subject === 'treasure map' || o.beh.shovel) {
        const x = this.objs.find((m) => m.beh?.xmark && !m.dragging && m !== o && Math.abs(m.x - q.x) < 16 && Math.abs(m.y - 4 - q.y) < 14);
        if (x) { this.treasureDig(x, o); return true; }
      }
      return false;
    },

    // ---------------------------------------------------------------- пляж
    /** Тап по морю у горизонта: волна плещет и выбрасывает на песок ракушку. */
    waveTap(room, x) {
      if (this.dress || this.albumUi || this.mapUi || this.cardUi || this.time.now < (this.waveAt || 0)) return;
      this.waveAt = this.time.now + 600;
      x = Phaser.Math.Clamp(Math.round(x), room * L.W + 14, (room + 1) * L.W - 14);
      sfx.splash();
      this.hintDone('wave');
      this.fxCrumbs.setParticleTint(0xffffff);
      this.fxCrumbs.explode(10, x, L.FLOOR_TOP - 2);
      this.fxCrumbs.setParticleTint(0x5ac4f2);
      this.fxCrumbs.explode(6, x, L.FLOOR_TOP - 4);
      if (this.roomFull(room) || this.countIn(room, (o) => SHELLS.includes(o.rec.subject)) >= 6) return;
      const rec = this.seaFresh(SHELLS);
      if (rec) this.seaGift(rec, x, L.FLOOR_TOP + 2);
    },

    /** Песок: кучка → башня → замок → замок с флажком. Из готового замка вылезает краб; когда крабов хватает — замок рассыпается. */
    sandTap(c) {
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 350;
      const stage = c.stage || 0;
      this.hintDone('sandcastle');
      this.fxCrumbs.setParticleTint(0xf2d28a);
      this.fxCrumbs.explode(8, c.x, c.y - 8);
      this.tweens.add({ targets: c, y: c.y - 2, duration: 80, yoyo: true });
      if (stage < 3) {
        c.stage = stage + 1;
        sfx.dig();
        if (c.stage === 3) { sfx.sparkle(); this.fxSparks.explode(12, c.x, c.y - c.displayHeight - 4); }
        this.save();
        return;
      }
      const room = roomOf(c);
      if (this.countIn(room, (o) => o.rec.subject === 'crab') < 2) { sfx.squeak(); this.seaGift('crab', c.x, c.y - 4); return; }
      c.stage = 0; // строим заново
      sfx.poof();
      this.fxPoof.explode(10, c.x, c.y - 10);
      this.save();
    },

    // ---------------------------------------------------------------- в море
    boatTap(b) {
      const splash = (t) => { this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(2, t.x - (t.flipX ? -18 : 18), t.y - 2); };
      if (!this.rollAcross(b, { ms: 14, turn: true, tick: splash })) return;
      this.hintDone('boat');
      sfx.swish();
      if (this.objs.some((r) => r.restOn === b && r.kind === 'char')) sfx.whee();
    },

    /** Мостик с удочкой: поплавок ныряет — и из воды вылетает рыбка. */
    pierTap(p) {
      if (this.time.now < (p.busyUntil || 0)) return;
      p.busyUntil = this.time.now + 1400;
      this.hintDone('fishing');
      p.setTexture('pier_b');
      sfx.blub();
      const fx = p.x + 17;
      const fy = p.y - 4;
      this.fxCrumbs.setParticleTint(0xffffff);
      this.fxCrumbs.explode(5, fx, fy);
      this.time.delayedCall(550, () => {
        if (!p.active) return;
        p.setTexture('pier');
        sfx.splash();
        this.fxCrumbs.setParticleTint(0x5ac4f2);
        this.fxCrumbs.explode(8, fx, fy);
        const room = roomOf(p);
        if (this.roomFull(room) || this.countIn(room, (o) => FISH.includes(o.rec.subject)) >= 6) return;
        const rec = this.seaFresh(FISH);
        if (rec) this.seaGift(rec, fx, fy - 4, -1);
      });
    },

    /** Раз в две секунды: в открытом море выпрыгивает дельфин, под водой проплывают рыбки (пока игрок там). */
    seaTick() {
      const room = Math.round(this.cameras.main.scrollX / L.W);
      const busy = this.dress || this.albumUi || this.mapUi || this.travelling;
      this.shoal = this.shoal.filter((f) => f.active);
      if (room !== R.deep) { for (const f of this.shoal) { this.tweens.killTweensOf(f); f.destroy(); } this.shoal = []; }
      if (this.dolphin && !this.dolphin.active) this.dolphin = null;
      if (busy) return;
      if (room === R.waves && !this.dolphin && this.time.now > this.dolphinAfter && Math.random() < 0.6) this.dolphinJump();
      if (room === R.deep && this.shoal.length < 3 && Math.random() < 0.5) this.fishSwim();
    },

    /** Дельфин выпрыгивает из воды, замирает на хвосте и ныряет обратно. Тап по нему — бросает подарок. */
    dolphinJump() {
      const rec = this.findRec('dolphin');
      if (!rec) return;
      const x0 = R.waves * L.W;
      const x = Math.round(x0 + rnd(L.W * 0.3, L.W * 0.7));
      const yW = L.ROOM_H - 14;
      const d = this.add.image(x, yW + 12, rec.cat, rec.frame).setOrigin(0.5, 1).setDepth(15000).setInteractive();
      d.dolphin = true;
      this.dolphin = d;
      const splash = () => { this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(8, d.x, yW); if (this.visible(d)) sfx.splash(); };
      splash();
      const top = yW - 22;
      this.tweens.add({
        targets: d, y: top, duration: 600, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({
          targets: d, y: top + 3, duration: 280, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', // стоит на хвосте — успеть тапнуть
          onComplete: () => this.tweens.add({
            targets: d, y: yW + 12, duration: 500, ease: 'Quad.easeIn',
            onComplete: () => { splash(); d.destroy(); if (this.dolphin === d) this.dolphin = null; this.dolphinAfter = this.time.now + rnd(5000, 10000); },
          }),
        }),
      });
    },

    dolphinTap(d) {
      if (d.gave) { sfx.squeak(); return; }
      d.gave = true;
      sfx.whee(); sfx.squeak();
      this.hintDone('dolphin');
      this.fxHearts.explode(3, d.x, d.y - 16);
      this.time.addEvent({ delay: 90, repeat: 3, callback: () => { if (d.active) d.setFlipX(!d.flipX); } });
      const room = R.waves;
      if (this.roomFull(room)) return;
      const ring = this.findRec('inflatable swim ring');
      // первым делом — круг (его наклейка); бутылка — только если карты сокровищ сейчас ни у кого нет
      const noMap = !this.objs.some((o) => ['message in a bottle', 'treasure map'].includes(o.rec?.subject));
      const list = DOLPHIN_TOYS.filter((sub) => (sub !== 'message in a bottle' || noMap) && this.countIn(room, (o) => o.rec.subject === sub) < 2);
      const rec = ring && !this.stickers.has('sea', ring.subject) ? ring : this.findRec(noMap && list.includes('message in a bottle') && Math.random() < 0.5 ? 'message in a bottle' : pick(list.length ? list : ['beach ball']));
      if (!rec) return;
      if (rec === ring) this.seaGift(rec, d.x, d.y - 8); else { sfx.chestOut(); this.popItem(rec, d.x, d.y - 8); }
    },

    /** Бутылка с запиской: пробка вылетает, внутри — карта сокровищ. */
    bottleOpen(o) {
      const { x, y } = o;
      this.hintDone('bottle');
      sfx.pop();
      this.removeObj(o);
      const map = this.findRec('treasure map');
      if (map) this.seaGift(map, x, y - 6);
    },

    // ---------------------------------------------------------------- под водой
    /** Большая ракушка открывается — внутри жемчужина. */
    clamTap(c) {
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 1300;
      this.hintDone('clam');
      c.setTexture('giantclam_open');
      sfx.pop();
      this.fxSparks.explode(6, c.x, c.y - 10);
      this.time.delayedCall(950, () => { if (c.active) { c.setTexture('giantclam'); sfx.thud(); } });
      const room = roomOf(c);
      if (this.roomFull(room) || this.countIn(room, (o) => /pearl$/.test(o.rec.subject)) >= 4) return;
      const white = this.findRec('pearl');
      const rec = white && !this.stickers.has('sea', 'pearl') ? white : (Math.random() < 0.3 ? this.findRec('black pearl') : white);
      if (rec) this.seaGift(rec, c.x, c.y - 8);
    },

    /** Затонувший сундук: крышка откидывается, выкатывается самоцвет. */
    seaChestTap(c) {
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 1300;
      this.hintDone('seachest');
      c.setTexture('seachest_open');
      sfx.chestOut();
      this.fxSparks.explode(8, c.x, c.y - 14);
      this.time.delayedCall(950, () => { if (c.active) c.setTexture('seachest'); });
      const room = roomOf(c);
      if (this.roomFull(room) || this.countIn(room, (o) => GEMS.includes(o.rec.subject)) >= 6) return;
      const rec = this.seaFresh(GEMS, 1);
      if (rec) this.seaGift(rec, c.x, c.y - 10);
    },

    subTap(s) {
      const bubbles = (t) => { this.fxCrumbs.setParticleTint(0xdff4ff); this.fxCrumbs.explode(3, t.x - (t.flipX ? -22 : 22), t.y - 10); };
      if (!this.rollAcross(s, { ms: 16, turn: true, tick: bubbles })) return;
      this.hintDone('sub');
      sfx.ding();
      this.time.delayedCall(700, () => sfx.ding());
      if (this.objs.some((r) => r.restOn === s && r.kind === 'char')) sfx.whee();
    },

    /** Коралл пускает пузыри — их лопают пальцем, как пузыри в ванне. */
    ventTap(c) {
      if (this.time.now < (c.busyUntil || 0)) return;
      c.busyUntil = this.time.now + 900;
      this.hintDone('vent');
      sfx.blub();
      this.tweens.add({ targets: c, y: c.y - 2, duration: 80, yoyo: true });
      const top = c.y - c.displayHeight + 2;
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 130, () => { if (c.active && (this.popBubbles?.length || 0) < 20) this.spawnBubble(c.x + rnd(-9, 9), top, 0xbfe6ff); });
      }
    },

    /** Рыбка проплывает через всю комнату; тап — разворачивается. */
    fishSwim() {
      const rec = this.findRec(pick(FISH)) || this.findRec('goldfish');
      if (!rec) return;
      const x0 = R.deep * L.W;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = Math.round(rnd(12, L.FLOOR_TOP - 10));
      const f = this.add.image(dir > 0 ? x0 - 10 : x0 + L.W + 10, y, rec.cat, rec.frame).setDepth(-6).setInteractive();
      f.fish = true;
      f.dir = dir;
      f.y0 = y;
      this.shoal.push(f);
      this.fishGo(f);
    },

    fishGo(f) {
      const x0 = R.deep * L.W;
      const tx = f.dir > 0 ? x0 + L.W + 12 : x0 - 12;
      f.setFlipX(f.dir < 0); // рыбки в каталоге смотрят вправо
      this.tweens.killTweensOf(f);
      this.tweens.add({
        targets: f, x: tx, duration: Math.abs(tx - f.x) * 38,
        onUpdate: () => { f.y = Math.round(f.y0 + Math.sin(f.x / 11) * 3); },
        onComplete: () => f.destroy(),
      });
    },

    fishTap(f) {
      f.dir = -f.dir;
      sfx.blub();
      this.fxHearts.explode(1, f.x, f.y - 6);
      this.fishGo(f);
    },

    // ---------------------------------------------------------------- остров
    /** Гнездо черепахи: яйцо шевелится, и из него вылупляется черепашка. */
    nestTap(n) {
      if (this.time.now < (n.busyUntil || 0)) return;
      n.busyUntil = this.time.now + 1200;
      this.hintDone('nest');
      const x0 = n.x;
      sfx.squeak();
      this.tweens.add({ targets: n, x: x0 + 1, duration: 60, yoyo: true, repeat: 4, onComplete: () => { if (n.active) n.x = x0; } });
      this.time.delayedCall(650, () => {
        if (!n.active) return;
        const room = roomOf(n);
        if (this.roomFull(room) || this.countIn(room, (o) => o.rec.subject === 'sea turtle') >= 3) { this.fxHearts.explode(2, n.x, n.y - 8); return; }
        sfx.pop();
        this.seaGift('sea turtle', n.x, n.y - 5);
      });
    },

    /** Карту сокровищ (или лопатку) — на красный крестик: копаем, и из песка вылетает клад. Крестик появляется в новом месте. */
    treasureDig(x, tool) {
      if (x.digging) return;
      x.digging = true;
      this.hintDone('treasure');
      const byMap = !tool.beh.shovel;
      if (byMap) {
        this.objs = this.objs.filter((o) => o !== tool);
        tool.disableInteractive();
        this.tweens.add({ targets: tool, x: x.x, y: x.y - 2, alpha: 0, duration: 300, onComplete: () => tool.destroy() });
      } else { tool.x = Math.round(x.x + 12); this.settle(tool); }
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 260, () => { sfx.dig(); this.fxCrumbs.setParticleTint(0xe0c078); this.fxCrumbs.explode(8, x.x, x.y - 3); });
      }
      this.time.delayedCall(900, () => {
        if (!x.active) return;
        const room = roomOf(x);
        sfx.fanfare();
        this.fxSparks.explode(18, x.x, x.y - 8);
        const diamond = this.findRec('diamond');
        // по карте — алмаз и ещё две вещи; лопаткой без карты — одна вещь (алмаз — редко)
        const loot = LOOT.map((sub) => this.findRec(sub)).filter(Boolean);
        if (byMap || Math.random() < 0.25) { if (diamond) this.seaGift(diamond, x.x, x.y - 6, -1); } else if (loot.length) this.popItem(pick(loot), x.x, x.y - 6, -1);
        if (byMap) for (let i = 0; i < 2 && loot.length; i++) this.time.delayedCall(180 + i * 180, () => this.popItem(pick(loot), x.x, x.y - 6, i ? 1 : -1));
        // крестик переезжает
        this.time.delayedCall(700, () => {
          if (!x.active) return;
          this.fxPoof.explode(6, x.x, x.y - 3);
          x.x = Math.round(room * L.W + rnd(L.W * 0.2, L.W * 0.8));
          x.y = Math.round(rnd(L.FLOOR_TOP + 12, L.ROOM_H - 8));
          x.digging = false;
          this.fxSparks.explode(6, x.x, x.y - 3);
          this.save();
        });
      });
    },
  });
}
