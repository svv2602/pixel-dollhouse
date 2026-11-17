// Кухня: холодильник, блендер, вкусы, плита, котёл и полёт открытия в альбом.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx } from './sfx.js';
import { recipeKey } from './alchemy.js';
import { blenderTex } from './salon.js';
import { R, placeOf } from './places.js';
import { L, COOK, FRIDGE, DISLIKE, rnd, pick } from './core.js';

export function installKitchen(Room) {
  Object.assign(Room.prototype, {
    /** Блендер на тумбе (кухня) — появляется и в старых сохранениях. */
    ensureKitchen2() {
      if (this.flags.kitchen2) return;
      this.flags.kitchen2 = true;
      if (!this.objs.some((o) => o.beh?.blender)) {
        const { W, FLOOR_TOP } = L;
        const counter = this.objs.find((o) => o.rec?.id === 'big_counter' && o.x >= R.kitchen * W && o.x < (R.kitchen + 1) * W) || this.objs.find((o) => o.rec?.id === 'big_counter');
        if (counter) {
          // то, что стояло посередине тумбы, переезжает на пол перед ней
          for (const x of this.objs) {
            if (x.restOn === counter && Math.abs(x.x - counter.x) < 7) { x.restOn = null; x.x = counter.x + 6; x.y = Math.min(L.ROOM_H - 2, counter.y + 8); }
          }
          const bl = this.spawnItem(this.byId.get('blender'), counter.x, counter.y - 20);
          bl.restOn = counter;
        } else this.spawnItem(this.byId.get('blender'), Math.round(1.25 * W), FLOOR_TOP + 20);
      }
      this.save();
    },
    /** Тап по холодильнику: дверца открывается, выпадает продукт (или то, что туда положили). */
    openFridge(fr) {
      sfx.chestOut();
      fr.setTexture('big_fridgeOpen');
      this.hintDone('fridge');
      this.fridgeDream(fr);
      this.time.delayedCall(650, () => { if (fr.active) fr.setTexture('big_fridge'); });
      if (fr.contents.length) { this.spill(fr); return; }
      const room = Math.floor(fr.x / L.W);
      const loose = this.objs.filter((x) => x.kind === 'item' && !x.beh.furniture && Math.floor(x.x / L.W) === room).length;
      if (loose > 40) { sfx.boing(); return; } // и так всё завалено
      this.fridgeList ||= FRIDGE.map((sub) => this.findRec(sub)).filter(Boolean);
      // если кто-то хочет есть — холодильник иногда «угадывает» желание
      const rec = this.wish?.type === 'food' && this.wish.rec && Math.random() < 0.4 ? this.wish.rec : pick(this.fridgeList);
      const o = this.spawnItem(rec, fr.x, Math.round(fr.y - 20));
      const dir = fr.x - room * L.W > L.W / 2 ? -1 : 1;
      const tx = Math.round(Phaser.Math.Clamp(fr.x + dir * rnd(16, 60), room * L.W + 8, (room + 1) * L.W - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
      this.tweens.add({ targets: o, x: tx, duration: 550 });
      this.tweens.add({
        targets: o, y: o.y - 14, duration: 220, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
      });
    },
    /** Средний «яркий» цвет спрайта (без контура и тёмных пикселей) — для коктейля. */
    avgColor(rec) {
      this.colorCache ||= new Map();
      if (this.colorCache.has(rec.id)) return this.colorCache.get(rec.id);
      const key = rec.tex ? `${rec.tex}_icon` : rec.cat;
      const frame = rec.tex ? undefined : rec.frame;
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const c = this.textures.getPixel(x, y, key, frame);
          if (!c || c.alpha < 128 || c.red + c.green + c.blue < 200) continue;
          r += c.red; g += c.green; b += c.blue; n++;
        }
      }
      const col = n ? ((Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)) : 0xff9ac8;
      this.colorCache.set(rec.id, col);
      return col;
    },
    renderBlender(bl, mixed = null) {
      const cols = bl.contents.map((id) => this.recOf(id)).filter(Boolean).map((r) => this.avgColor(r));
      bl.setTexture(blenderTex(this, cols, mixed));
    },
    addToBlender(bl, o) {
      if (bl.blending || bl.contents.length >= 3) {
        sfx.boing();
        o.x = Math.round(Phaser.Math.Clamp(bl.x + (o.x < bl.x ? -14 : 14), 8, L.WORLD - 8));
        this.settle(o);
        return;
      }
      this.objs = this.objs.filter((x) => x !== o);
      bl.contents.push(o.rec.id);
      o.glow?.destroy();
      o.setDepth(bl.depth + 1);
      this.tweens.add({
        targets: o, x: bl.x, y: bl.y - bl.displayHeight + 4, alpha: 0, duration: 220,
        onComplete: () => {
          o.destroy();
          sfx.blub();
          this.renderBlender(bl);
          this.tweens.add({ targets: bl, y: bl.y - 2, duration: 80, yoyo: true });
        },
      });
    },
    /** Тап по блендеру: жужжит, трясётся, слои смешиваются — выскакивает коктейль цвета смеси. */
    blend(bl) {
      if (bl.blending) return;
      if (!bl.contents.length) { sfx.click(); this.tweens.add({ targets: bl, y: bl.y - 1, duration: 60, yoyo: true }); return; }
      bl.blending = true;
      const cols = bl.contents.map((id) => this.recOf(id)).filter(Boolean).map((r) => this.avgColor(r));
      const mixed = cols.length ? [16, 8, 0].reduce((acc, sh) => acc | (Math.round(cols.reduce((t, c) => t + ((c >> sh) & 255), 0) / cols.length) << sh), 0) : 0xff9ac8;
      sfx.blend();
      const x0 = bl.x;
      this.tweens.add({ targets: bl, x: x0 + 1, duration: 50, yoyo: true, repeat: 13, onComplete: () => { bl.x = x0; } });
      let k = 0;
      this.time.addEvent({ delay: 130, repeat: 8, callback: () => { if (bl.active) bl.setTexture(blenderTex(this, ++k % 2 ? cols.slice().reverse() : cols)); } });
      this.time.delayedCall(1300, () => { if (bl.active) this.renderBlender(bl, mixed); });
      this.time.delayedCall(1800, () => {
        bl.blending = false;
        if (!bl.active) return;
        bl.contents = [];
        this.renderBlender(bl);
        const top = bl.y - bl.displayHeight;
        const g = this.spawnItem(this.byId.get('smoothie'), bl.x, top + 4, { color: mixed });
        sfx.ding();
        this.fxSparks.explode(10, bl.x, top);
        const room = Math.floor(bl.x / L.W);
        const tx = Math.round(Phaser.Math.Clamp(bl.x + (Math.random() < 0.5 ? -1 : 1) * rnd(14, 28), room * L.W + 8, (room + 1) * L.W - 8));
        const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
        this.tweens.add({ targets: g, x: tx, duration: 600 });
        this.tweens.add({
          targets: g, y: top - 12, duration: 250, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: g, y: ty, duration: 400, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
        });
        this.save();
      });
    },
    /** Два нелюбимых овоща у каждого персонажа (свои у каждого — по номеру). */
    dislikes(ch, subj) {
      const i = (ch.uid * 5) % DISLIKE.length;
      return subj === DISLIKE[i] || subj === DISLIKE[(i + 3) % DISLIKE.length];
    },
    /** «Фу!» — язык наружу, мотает головой и отбрасывает еду. */
    refuse(ch, o) {
      ch.busy = true;
      ch.sleeping = false;
      if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
      ch.setTexture(ch.key + '_yuck');
      sfx.yuck();
      let n = 0;
      this.time.addEvent({ delay: 120, repeat: 5, callback: () => { ch.setFlipX(!ch.flipX); if (++n === 6) ch.setFlipX(false); } });
      const room = Math.floor(ch.x / L.W);
      const tx = Math.round(Phaser.Math.Clamp(ch.x + (o.x < ch.x ? -1 : 1) * rnd(22, 34), room * L.W + 8, (room + 1) * L.W - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
      o.restOn = null;
      this.tweens.add({ targets: o, x: tx, duration: 500 });
      this.tweens.add({
        targets: o, y: o.y - 14, duration: 200, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 350, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
      });
      this.time.delayedCall(1100, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
    },
    /** Кислое: морщится и дрожит. Острое: краснеет, пышет огнём, прыгает — и просит молока. */
    tasteReact(ch, taste) {
      const m = this.mouth(ch);
      if (taste === 'sour') {
        sfx.sour();
        const x0 = ch.x;
        this.tweens.add({ targets: ch, x: x0 + 1, duration: 60, yoyo: true, repeat: 7, onComplete: () => { ch.x = x0; } });
        return;
      }
      sfx.spicy();
      if (!ch.rainbow && !ch.ice) ch.setTint(0xff9a8a);
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 260, () => {
          this.fxPoof.setParticleTint(i % 2 ? 0xffd84a : 0xff6a2a);
          this.fxPoof.explode(8, m.x + (ch.flipX ? -3 : 3), m.y - 1);
          this.fxPoof.setParticleTint(0xffffff);
        });
      }
      this.tweens.add({ targets: ch, y: ch.y - 7, duration: 150, yoyo: true, repeat: 2 });
      this.time.delayedCall(1500, () => {
        if (!ch.rainbow && !ch.ice) ch.clearTint();
        const milk = this.findRec('glass of milk');
        // «дайте молока!» важнее чужого случайного желания (как и остальные потребности)
        if (milk && !this.wish?.need) { this.showWish(ch, 'food', milk); this.wish.need = true; }
      });
    },
    /** Котёл бахает цветным дымом; кто стоит рядом — в саже и с волосами дыбом (до купания). */
    potBlast(pot, cols) {
      const top = { x: pot.x, y: pot.y - pot.displayHeight + 4 };
      sfx.boom();
      cols.forEach((c, i) => {
        this.fxPoof.setParticleTint(c);
        this.fxPoof.explode(16, top.x, top.y - 4 - i * 4);
      });
      this.fxPoof.setParticleTint(0xffffff);
      for (const ch of this.objs) {
        if (ch.kind !== 'char' || ch.inTub || ch.dragging || Math.abs(ch.x - pot.x) > 40 || Math.abs(ch.y - pot.y) > 30) continue;
        ch.look = { ...ch.look, frazzled: true };
        this.charTex(ch);
        ch.setTexture(ch.key + '_open');
        this.stain(ch, 0x3a3340);
        this.time.delayedCall(700, () => { if (!ch.busy && ch.active) ch.setTexture(ch.key); sfx.giggle(); });
      }
    },
    /** Положить еду на плиту: шипит, пар, через пару секунд — готовое блюдо (если есть рецепт). */
    cook(stove, o) {
      o.x = Math.round(stove.x);
      o.y = Math.round(stove.y - stove.displayHeight + 3);
      o.restOn = stove;
      o.cooking = true;
      const steam = this.add.particles(o.x, o.y - 6, 'px', {
        lifespan: 900, speedY: { min: -22, max: -10 }, speedX: { min: -5, max: 5 }, x: { min: -4, max: 4 },
        scale: { start: 2, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 120,
      }).setDepth(16000);
      this.time.addEvent({ delay: 280, repeat: 7, callback: () => sfx.sizzle() });
      this.time.delayedCall(2400, () => {
        steam.stop();
        this.time.delayedCall(1000, () => steam.destroy());
        o.cooking = false;
        // сняли с плиты раньше времени — ничего не готовим
        if (!o.active || o.restOn !== stove || !this.objs.includes(o)) return;
        const to = COOK[o.rec.subject] && this.findRec(COOK[o.rec.subject]);
        sfx.ding();
        if (!to) { this.fxHearts.explode(2, o.x, o.y - 10); return; } // просто тёплое
        const x = o.x;
        const y = o.y;
        this.removeObj(o);
        const n = this.spawnItem(to, x, y);
        n.restOn = stove;
        this.sticker('dish', to, x, y - 8);
        this.hintDone('cook');
        this.fxSparks.explode(14, x, y - 8);
        this.tweens.add({ targets: n, y: y - 4, duration: 120, yoyo: true });
        this.save();
      });
    },
    /** В любой комнате (и в старых сохранениях) должны быть котёл и альбом. */
    ensureMagic() {
      const { W, FLOOR_TOP } = L;
      // в доме должен быть свой котёл (котлы других локаций его не заменяют)
      let pot = this.objs.find((o) => o.kind === 'item' && o.beh.cauldron && placeOf(Math.floor(o.x / W)).key === 'home');
      if (!pot) pot = this.spawnItem(this.big.cauldron, Math.round(W * 0.4), FLOOR_TOP + 12);
      if (!this.objs.some((o) => o.kind === 'item' && o.beh.album)) {
        this.spawnItem(this.big.album, Math.round(Math.min(W - 10, pot.x + 22)), FLOOR_TOP + 14);
      }
      // игру закрыли, пока котёл варил, — доварить (любой из котлов)
      for (const p of this.objs) if (p.kind === 'item' && p.beh.cauldron && p.contents.length >= 2) this.time.delayedCall(500, () => this.brew(p));
    },
    recColor(rec) {
      const c = rec.tex ? this.textures.getPixel(8, 8, `${rec.tex}_icon`) : this.textures.getPixel(8, 9, rec.cat, rec.frame);
      return c && c.alpha ? c.color : 0xffffff;
    },
    addToCauldron(pot, o) {
      if (pot.brewing || pot.contents.length >= 2) {
        sfx.boing();
        o.x = Math.round(Phaser.Math.Clamp(pot.x + (o.x < pot.x ? -20 : 20), 8, L.WORLD - 8));
        this.settle(o);
        return;
      }
      this.objs = this.objs.filter((x) => x !== o);
      pot.contents.push(o.rec.id);
      o.glow?.destroy();
      const top = pot.y - pot.displayHeight + 4;
      o.setDepth(pot.depth + 1);
      this.tweens.add({
        targets: o, x: pot.x, y: top + 6, alpha: 0, duration: 260, ease: 'Quad.easeIn',
        onComplete: () => {
          o.destroy();
          sfx.splash();
          this.fxCrumbs.setParticleTint(0x9ff5b8);
          this.fxCrumbs.explode(8, pot.x, top);
          this.tweens.add({ targets: pot, y: pot.y - 2, duration: 80, yoyo: true });
          if (pot.contents.length === 2) this.time.delayedCall(250, () => this.brew(pot));
        },
      });
    },
    brew(pot) {
      this.stat('brew');
      if (pot.brewing || !pot.active) return;
      const [a, b] = pot.contents.map((id) => this.recOf(id));
      if (!a || !b) { pot.contents = []; return; }
      pot.brewing = true;
      const top = { x: pot.x, y: pot.y - pot.displayHeight + 4 };
      const steam = this.add.particles(top.x, top.y, 'px', {
        lifespan: 800, speedY: { min: -45, max: -15 }, speedX: { min: -10, max: 10 }, x: { min: -9, max: 9 },
        scale: { start: 2, end: 0 }, tint: [this.recColor(a), this.recColor(b), 0x9ff5b8, 0xffffff], frequency: 35,
      }).setDepth(16000);
      const x0 = pot.x;
      this.tweens.add({ targets: pot, x: x0 + 1, duration: 60, yoyo: true, repeat: 13, onComplete: () => { pot.x = x0; } });
      this.time.addEvent({ delay: 150, repeat: 10, callback: () => sfx.blub() });
      this.time.delayedCall(1800, () => {
        steam.stop();
        this.time.delayedCall(900, () => steam.destroy());
        const { result, isNew } = this.alchemy.brew(a, b);
        if (this.wish?.type === 'magic') this.checkWish(this.wish.ch, 'magic', recipeKey(a.subject, b.subject));
        pot.contents = [];
        pot.brewing = false;
        this.potBlast(pot, [this.recColor(a), this.recColor(b)]);
        const o = this.spawnItem(result, top.x, top.y + 2);
        const tx = Math.round(Phaser.Math.Clamp(top.x + (Math.random() < 0.5 ? -1 : 1) * rnd(16, 30), 10, L.WORLD - 10));
        const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
        sfx.sparkle();
        this.fxSparks.explode(28, top.x, top.y - 10);
        this.tweens.add({ targets: o, x: tx, duration: 750 });
        this.tweens.add({
          targets: o, y: top.y - 30, duration: 320, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 430, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
        });
        if (isNew) {
          // новое открытие: фанфары, сердечки и подпрыгивающий альбом
          this.time.delayedCall(250, () => sfx.fanfare());
          this.fxHearts.explode(6, top.x, top.y - 16);
          this.flyToAlbum(result, top.x, top.y - 10);
          this.lastStickerTab = 'recipe';
        }
        this.save();
      });
    },
    /** Новое открытие: копия иконки летит из котла к альбому (или к краю экрана в его сторону). */
    flyToAlbum(rec, x, y) {
      const album = this.objs.find((o) => o.kind === 'item' && o.beh.album);
      const cam = this.cameras.main;
      let tx = cam.scrollX + L.W - 10;
      let ty = 12;
      if (album) {
        tx = album.x;
        ty = album.y - album.displayHeight / 2;
        if (!this.visible(album)) tx = album.x < cam.scrollX ? cam.scrollX + 6 : cam.scrollX + L.W - 6;
      }
      const icon = this.recImage(rec, x, y).setOrigin(0.5).setDepth(16001);
      this.time.delayedCall(450, () => {
        this.tweens.add({ targets: icon, x: tx, duration: 900, ease: 'Sine.easeInOut' });
        this.tweens.add({
          targets: icon, y: Math.min(y, ty) - 25, duration: 450, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({
            targets: icon, y: ty, duration: 450, ease: 'Quad.easeIn',
            onComplete: () => {
              icon.destroy();
              sfx.page();
              this.fxSparks.explode(14, tx, ty);
              if (album) this.tweens.add({ targets: album, y: album.y - 6, duration: 140, yoyo: true, repeat: 3 });
            },
          }),
        });
      });
    },
  });
}
