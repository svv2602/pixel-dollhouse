// Спальня: день рождения, кровать-батут, сундук, ночник, фотоаппарат.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx } from './sfx.js';
import { BIRTHDAY_TUNE } from './party.js';
import { makePhoto } from './play.js';
import { L, FAVORITES, TOYBOX, rnd, pick } from './core.js';

export function installBedroom(Room) {
  Object.assign(Room.prototype, {
    /** Праздничный набор один раз появляется в спальне (и в старых сохранениях). */
    ensureParty() {
      if (this.flags.party) return;
      this.flags.party = true;
      const { W, ROOM_H } = L;
      this.spawnItem(this.byId.get('party-cake'), Math.round(W * 0.53), ROOM_H - 9, { deco: { frost: 0xff9ac8, sprinkles: true, candles: true, lit: true } });
      this.spawnItem(this.byId.get('gift-0'), Math.round(W * 0.73), ROOM_H - 3);
      this.spawnItem(this.byId.get('garland'), Math.round(W * 0.18), 14);
      this.save();
    },
    renderCake(o) {
      if (!o.active) return;
      if (!o.cakeLayers) {
        o.cakeLayers = {
          fr: this.add.image(o.x, o.y, 'cake_frost').setOrigin(0.5, 1),
          sp: this.add.image(o.x, o.y, 'cake_sprinkles').setOrigin(0.5, 1),
          ca: this.add.image(o.x, o.y, 'cake_candles').setOrigin(0.5, 1),
          fl: this.add.image(o.x, o.y, 'cake_flames').setOrigin(0.5, 1),
        };
      }
      const d = o.deco;
      const L2 = o.cakeLayers;
      L2.fr.setVisible(!!d.frost).setTint(d.frost || 0xffffff);
      L2.sp.setVisible(!!d.sprinkles);
      L2.ca.setVisible(!!d.candles);
      L2.fl.setVisible(!!(d.candles && d.lit));
    },
    /** Украсить торт: глазурь (цвет), посыпка, свечи (сразу горят). Инструмент остаётся рядом. */
    decorate(cake, o) {
      const d = cake.deco;
      if (o.beh.icing) d.frost = o.beh.icing;
      if (o.beh.sprinkles) d.sprinkles = true;
      if (o.beh.candles) { d.candles = true; d.lit = true; }
      this.renderCake(cake);
      sfx.wear(); sfx.sparkle();
      this.fxSparks.explode(10, cake.x, cake.y - 10);
      this.tweens.add({ targets: cake, y: cake.y - 2, duration: 90, yoyo: true });
      o.x = Math.round(cake.x + (o.x < cake.x ? -14 : 14));
      this.settle(o);
    },
    /** Задуть свечи: дымок, конфетти, мелодия, все в комнате танцуют. */
    blowCandles(cake) {
      cake.deco.lit = false;
      this.renderCake(cake);
      sfx.poof();
      this.fxPoof.explode(10, cake.x, cake.y - 18);
      this.time.delayedCall(300, () => {
        this.fxSparks.explode(40, cake.x, cake.y - 20);
        this.fxHearts.explode(8, cake.x, cake.y - 24);
        sfx.tune(BIRTHDAY_TUNE);
        const room = Math.floor(cake.x / L.W);
        for (const c of this.objs) {
          if (c.kind !== 'char' || Math.floor(c.x / L.W) !== room) continue;
          this.checkWish(c, 'party');
          if (!c.sleeping) this.celebrate(c, 6);
        }
      });
      this.save();
    },
    lightCandles(cake) {
      cake.deco.lit = true;
      this.renderCake(cake);
      sfx.click();
      this.fxSparks.explode(4, cake.x, cake.y - 18);
      this.save();
    },
    /** Подарок персонажу: коробка открывается, внутри — игрушка прямо в руки. */
    openGift(ch, gift) {
      this.stat('gift');
      const x = gift.x;
      const y = gift.y;
      this.removeObj(gift);
      const toys = (FAVORITES.toy || []).map((sub) => this.findRec(sub)).filter(Boolean);
      // подарок, упакованный в магазине игрушек, помнит, что в него положили
      const rec = this.recOf(gift.contents[0]) || pick(toys);
      this.fxSparks.explode(20, ch.x, ch.y - ch.displayHeight / 2);
      sfx.fanfare();
      if (!rec) return;
      const toy = this.spawnItem(rec, Math.round(x), Math.round(y));
      this.wear(ch, 'hand', toy);
      this.celebrate(ch, 3);
    },
    /** Фотоаппарат в спальне — и в старых сохранениях. */
    ensureBedroom2() {
      if (this.flags.bed2) return;
      this.flags.bed2 = true;
      if (!this.objs.some((o) => o.beh?.camera)) this.spawnItem(this.byId.get('camera'), Math.round(L.W * 0.76), L.FLOOR_TOP + 20);
      this.save();
    },
    /** Тап по кровати с персонажем: прыгает всё выше, летят пёрышки, на третьем прыжке — сальто. */
    bounce(bed, hint = 'bounce') {
      const riders = this.objs.filter((o) => o.restOn === bed && (o.kind === 'char' || o.beh?.pet) && !o.dragging);
      if (!riders.length) return false;
      const now = this.time.now;
      this.bounceN = now - (this.lastBounce || 0) < 1600 ? (this.bounceN || 0) + 1 : 1;
      this.lastBounce = now;
      this.fxCrumbs.setParticleTint(0xffffff);
      this.fxCrumbs.explode(4, bed.x - bed.displayWidth / 2 + 9, bed.y - bed.displayHeight + 8);
      for (const r of riders) {
        if (r.sleeping) { // спит — только ворочается
          const x0 = r.x;
          this.tweens.add({ targets: r, x: x0 + 1, duration: 90, yoyo: true, repeat: 1, onComplete: () => { r.x = x0; } });
          continue;
        }
        r.awakeUntil = now + 6000;
        r.bounceY0 ??= r.y;
        this.tweens.killTweensOf(r);
        r.y = r.bounceY0;
        const h = 8 + 5 * Math.min(this.bounceN, 4);
        const flip = this.bounceN >= 3;
        if (r.kind === 'char') { r.busy = true; r.setTexture(r.key + '_open'); }
        sfx.boing();
        if (flip) {
          sfx.whee();
          this.time.addEvent({ delay: 70, repeat: 5, callback: () => r.setFlipX(!r.flipX) });
          this.fxSparks.explode(6, r.x, r.y - r.displayHeight - h);
        }
        this.tweens.add({
          targets: r, y: r.bounceY0 - h, duration: 180 + h * 4, yoyo: true, ease: 'Quad.easeOut',
          onComplete: () => {
            r.y = r.bounceY0; r.bounceY0 = undefined; r.setFlipX(false);
            if (r.kind === 'char') { r.busy = false; r.setTexture(r.key); if (flip) sfx.giggle(); }
          },
        });
      }
      this.hintDone(hint);
      return true;
    },
    /** Тап по сундуку: крышка откидывается, выскакивает игрушка (или то, что туда положили). */
    openChest(box) {
      sfx.chestOut();
      box.setTexture('big_chestOpen');
      this.time.delayedCall(650, () => { if (box.active) box.setTexture('big_chest'); });
      this.hintDone('chest');
      this.itemDream('chest', box, 'toys');
      if (box.contents.length) { this.spill(box); return; }
      const room = Math.floor(box.x / L.W);
      const loose = this.objs.filter((x) => x.kind === 'item' && !x.beh.furniture && Math.floor(x.x / L.W) === room).length;
      if (loose > 40) { sfx.boing(); return; }
      this.toyList ||= TOYBOX.map((sub) => this.findRec(sub)).filter(Boolean);
      const rec = pick(this.toyList);
      const o = this.spawnItem(rec, box.x, Math.round(box.y - 14));
      const dir = box.x - room * L.W > L.W / 2 ? -1 : 1;
      const tx = Math.round(Phaser.Math.Clamp(box.x + dir * rnd(16, 55), room * L.W + 8, (room + 1) * L.W - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
      this.fxSparks.explode(8, box.x, box.y - 16);
      this.tweens.add({ targets: o, x: tx, duration: 550 });
      this.tweens.add({
        targets: o, y: o.y - 18, duration: 230, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
      });
    },
    /** Ночник: ночью выключенная лампа превращается в проектор — по стенам плывут звёзды и луна. */
    nightLight() {
      const lamp = this.objs?.find((o) => o.kind === 'item' && o.beh.lamp && !o.dragging && !o.owner);
      const on = !!(lamp && this.night && !lamp.lit);
      const room = lamp ? Math.floor(lamp.x / L.W) : -1;
      if (this.nightStars && (!on || this.nightStars.room !== room)) {
        const old = this.nightStars.imgs;
        this.nightStars = null;
        this.tweens.add({ targets: old, alpha: 0, duration: 500, onComplete: () => old.forEach((i) => i.destroy()) });
      }
      if (!on || this.nightStars) return;
      const x0 = room * L.W;
      const imgs = [];
      for (let i = 0; i < 14; i++) {
        const im = this.add.image(Math.round(x0 + rnd(8, L.W - 8)), Math.round(rnd(4, L.FLOOR_TOP - 6)), i === 0 ? 'moon_px' : 'star_px').setDepth(10001).setAlpha(0);
        im.setTint(pick([0xfff6a8, 0xffffff, 0x9fdcff, 0xffc0e0]));
        if (i === 0) im.clearTint();
        this.tweens.add({ targets: im, alpha: 0.9, duration: 700, delay: i * 60 });
        this.tweens.add({ targets: im, x: im.x + rnd(-10, 10), duration: rnd(5000, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (i) this.tweens.add({ targets: im, scale: 1, alpha: { from: 0.9, to: 0.35 }, duration: rnd(900, 1600), yoyo: true, repeat: -1, delay: 800 });
        imgs.push(im);
      }
      this.nightStars = { room, imgs };
      sfx.sparkle();
      this.hintDone('stars');
    },
    /** Фотоаппарат: щёлк — вспышка, и на стене появляется пиксельная фотография того, что в кадре. */
    takePhoto(cam) {
      if (this.snapping) return;
      this.snapping = true;
      sfx.shutter();
      this.tweens.add({ targets: cam, y: cam.y - 2, duration: 80, yoyo: true });
      const cw = Math.min(120, L.W);
      const sx = Math.round((L.W - cw) / 2);
      const room = Math.round(this.cameras.main.scrollX / L.W);
      const done = (img) => {
        const finish = () => {
          let url = null;
          try { url = makePhoto(img, cw, L.ROOM_H); } catch { url = null; }
          this.snapping = false;
          // вспышка поверх всего экрана
          const flash = this.add.rectangle(0, 0, L.W, L.H, 0xffffff, 0.9).setOrigin(0).setScrollFactor(0).setDepth(20000);
          this.tweens.add({ targets: flash, fillAlpha: 0, duration: 350, onComplete: () => flash.destroy() });
          if (!url) return;
          const id = Date.now().toString(36);
          this.photoStore()[id] = url;
          this.prunePhotos(id);
          const o = this.spawnItem(this.byId.get('photo'), cam.x, cam.y - 6, { photoId: id });
          const walls = [0.12, 0.3, 0.5, 0.7, 0.88].map((f) => room * L.W + Math.round(L.W * f));
          const tx = walls.find((x) => !this.objs.some((p) => p.beh?.photo && p !== o && Math.abs(p.x - x) < 20)) ?? pick(walls);
          this.tweens.add({ targets: o, x: tx, y: L.FLOOR_TOP - 14, duration: 700, ease: 'Quad.easeOut', onComplete: () => { sfx.sparkle(); this.save(); } });
          this.hintDone('photo');
        };
        if (img.complete) finish(); else img.onload = finish;
      };
      try { this.game.renderer.snapshotArea(sx * L.P, 0, cw * L.P, L.ROOM_H * L.P, done); } catch { this.snapping = false; }
    },
    photoStore() {
      if (!this.photos) {
        try { this.photos = JSON.parse(localStorage.getItem('pixel-house-photos')) || {}; } catch { this.photos = {}; }
      }
      return this.photos;
    },
    /** Храним только снимки, что висят в доме (+ новый); не больше 16 — самые старые снимаются со стены. */
    prunePhotos(keep) {
      const store = this.photoStore();
      const hung = this.objs.filter((o) => o.beh?.photo);
      while (hung.length >= 16) { const old = hung.shift(); this.removeObj(old); }
      const used = new Set([keep, ...this.objs.filter((o) => o.beh?.photo).map((o) => o.photoId)]);
      for (const id of Object.keys(store)) if (!used.has(id)) delete store[id];
      try { localStorage.setItem('pixel-house-photos', JSON.stringify(store)); } catch { /* места нет — фото проживёт до перезагрузки */ }
    },
    applyPhotoTex(o) {
      const id = o.photoId;
      const url = id && this.photoStore()[id];
      if (!url) return;
      const key = `photo_${id}`;
      if (this.textures.exists(key)) { o.setTexture(key); return; }
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(key)) this.textures.addImage(key, img);
        for (const p of this.objs) if (p.photoId === id && p.active) p.setTexture(key);
      };
      img.src = url;
    },
  });
}
