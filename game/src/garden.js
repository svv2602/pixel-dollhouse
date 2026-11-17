// Сад и огород: грядки (посадить → полить → собрать), яблоня и фруктовые деревья, тучка с дождём и радугой,
// качели, бабочки, клад. Грядки и деревья работают в любой комнате (в селе — свой огород и фруктовый сад);
// тучка, бабочки и клад живут только в саду у дома.
import Phaser from 'phaser';
import { rainbowTex } from './play.js';
import { R } from './places.js';

// Сад: что можно посадить (вырастет то же самое); пакетик семян — сюрприз из этого списка
export const GROW = ['strawberry', 'apple', 'carrot', 'tomato', 'pumpkin', 'potato', 'banana', 'watermelon', 'pear', 'peach',
  'pair of cherries', 'ear of corn', 'eggplant', 'onion', 'broccoli', 'lemon', 'orange', 'bunch of grapes', 'blueberry',
  'cabbage', 'radish', 'pineapple', 'sunflower', 'tulip', 'rose', 'daisy flower', 'button mushroom'];
export const SEEDS = /seed packet|seed pouch|\bseeds?\b/;
export const PLOT_DX = [-13, 0, 13];
// Клад в саду
export const TREASURE = ['seashell', 'pearl', 'diamond', 'ruby', 'emerald', 'amethyst', 'four leaf clover', 'starfish', 'treasure chest',
  'bag of gold coins', 'crystal apple', 'crystal egg', 'toy robot', 'spinning top'];

export function installGarden(Room, { L, rnd, pick, sfx }) {
  Object.assign(Room.prototype, {
    /** Сад: появляется и в старых сохранениях (если третья комната пуста). */
    ensureGarden() {
      if (this.objs.some((o) => o.x >= R.garden * L.W && o.x < (R.garden + 1) * L.W)) return;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const x0 = R.garden * W;
      const big = (key, fx, y) => this.spawnItem(this.big[key], Math.round(x0 + W * fx), Math.round(y));
      const put = (subj, fx, y) => { const r = this.findRec(subj); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y)) : null; };
      big('tree', 0.14, FLOOR_TOP + 10);
      const bed1 = big('gardenbed', 0.45, FLOOR_TOP + 14);
      big('gardenbed', 0.72, FLOOR_TOP + 26);
      // подсолнух уже пророс и ждёт полива — механика понятна сразу
      const sun = this.findRec('sunflower');
      if (sun) bed1.plots[1] = { id: sun.id, stage: 1, watered: false };
      put('watering can', 0.3, ROOM_H - 6);
      put('seed packet', 0.58, ROOM_H - 3);
      put('strawberry', 0.88, ROOM_H - 8);
      put('rabbit', 0.6, FLOOR_TOP + 36);
      this.save();
    },

    growRec(rec) {
      if (SEEDS.test(rec.subject)) return true;
      return GROW.includes(rec.subject);
    },

    plotAt(bed, x) {
      let best = 0;
      PLOT_DX.forEach((dx, i) => { if (Math.abs(bed.x + dx - x) < Math.abs(bed.x + PLOT_DX[best] - x)) best = i; });
      return best;
    },

    /** Посадить: в лунку под пальцем (или любую свободную). Из клубники вырастет клубника, из семян — сюрприз. */
    plant(bed, o, x) {
      let i = this.plotAt(bed, x);
      if (bed.plots[i]) i = bed.plots.findIndex((p) => !p);
      if (i < 0) return false;
      let rec = o.rec;
      if (SEEDS.test(rec.subject)) rec = this.findRec(pick(GROW.filter((g) => this.findRec(g)))) || rec;
      bed.plots[i] = { id: rec.id, stage: 0, watered: false };
      this.stat('plant');
      this.objs = this.objs.filter((x2) => x2 !== o);
      const px = bed.x + PLOT_DX[i];
      this.tweens.add({
        targets: o, x: px, y: bed.y - bed.displayHeight + 4, alpha: 0, duration: 260,
        onComplete: () => { o.destroy(); this.renderPlots(bed); },
      });
      sfx.drop();
      this.fxCrumbs.setParticleTint(0x6b4a32);
      this.fxCrumbs.explode(5, px, bed.y - bed.displayHeight + 4);
      return true;
    },

    waterPlot(bed, i) {
      const p = bed.plots[i];
      if (!p || p.stage >= 3 || p.watered) return;
      p.watered = true;
      sfx.splash();
      this.renderPlots(bed);
      this.growLater(bed, i);
      this.save();
    },

    /** Политое растение подрастает через пару секунд: семечко → росток → кустик → урожай. */
    growLater(bed, i) {
      const p = bed.plots[i];
      this.time.delayedCall(2500, () => {
        if (!bed.active || bed.plots[i] !== p || !p.watered) return;
        p.stage += 1;
        p.watered = false;
        const px = bed.x + PLOT_DX[i];
        this.fxSparks.explode(p.stage === 3 ? 16 : 6, px, bed.y - bed.displayHeight - 4);
        if (p.stage === 3) sfx.sparkle(); else sfx.squeak();
        this.renderPlots(bed);
        const img = bed.plantImgs[i];
        if (img) this.tweens.add({ targets: img, y: img.y - 3, duration: 120, yoyo: true });
        this.save();
      });
    },

    /** Тап по грядке: созрело — собрать урожай (вдвойне); нужно полить — капля подпрыгивает. */
    plotTap(bed, x) {
      const i = this.plotAt(bed, x);
      const p = bed.plots[i];
      if (!p) { sfx.boing(); return; }
      if (p.stage < 3) {
        const drop = bed.dropImgs[i];
        if (drop) { sfx.blub(); this.tweens.add({ targets: drop, scale: 1.0, y: drop.y - 4, duration: 120, yoyo: true }); }
        return;
      }
      const rec = this.recOf(p.id);
      bed.plots[i] = null;
      this.renderPlots(bed);
      if (!rec) return;
      sfx.chestOut();
      this.stat('harvest');
      this.sticker('plant', rec, bed.x + PLOT_DX[i], bed.y - bed.displayHeight);
      const px = bed.x + PLOT_DX[i];
      const x0 = Math.floor(bed.x / L.W) * L.W; // урожай остаётся в комнате своей грядки
      for (let k = 0; k < 2; k++) {
        const o = this.spawnItem(rec, Math.round(px), Math.round(bed.y - bed.displayHeight));
        const tx = Math.round(Phaser.Math.Clamp(px + (k ? 1 : -1) * rnd(10, 22), x0 + 8, x0 + L.W - 8));
        const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 2));
        this.tweens.add({ targets: o, x: tx, duration: 500, delay: k * 120 });
        this.tweens.add({
          targets: o, y: o.y - 18, duration: 220, delay: k * 120, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 360, ease: 'Bounce.easeOut' }),
        });
      }
      this.fxHearts.explode(3, px, bed.y - 14);
      this.time.delayedCall(900, () => this.save());
    },

    /** Картинки растений и капель на грядке по её состоянию. */
    renderPlots(bed) {
      bed.plantImgs ||= [null, null, null];
      bed.dropImgs ||= [null, null, null];
      bed.plots.forEach((p, i) => {
        bed.plantImgs[i]?.destroy();
        bed.dropImgs[i]?.destroy();
        bed.plantImgs[i] = null;
        bed.dropImgs[i] = null;
        if (!p) return;
        const rec = this.recOf(p.id);
        let img;
        if (p.stage === 0) img = this.add.image(0, 0, 'plant_seed');
        else if (p.stage === 1) img = this.add.image(0, 0, 'plant_sprout');
        else if (p.stage === 2) img = this.add.image(0, 0, 'plant_bush');
        else img = rec ? this.recImage(rec, 0, 0) : this.add.image(0, 0, 'plant_bush');
        bed.plantImgs[i] = img.setOrigin(0.5, 1);
        if (p.stage < 3 && !p.watered) bed.dropImgs[i] = this.add.image(0, 0, 'water_drop').setOrigin(0.5, 1);
      });
    },

    /** Тап по яблоне (или груше, вишне, сливе в селе): дерево качается, падает плод. */
    shakeTree(tree) {
      const x0 = tree.x;
      this.tweens.add({ targets: tree, x: x0 + 1, duration: 60, yoyo: true, repeat: 3, onComplete: () => { tree.x = x0; } });
      if (tree.beh.appleTree) this.itemDream('tree', tree, 'forest');
      this.leafFall(tree);
      const rec = this.findRec(tree.beh.fruit || 'apple');
      if (!rec) return;
      if (tree.beh.fruit) { this.hintDone('fruit'); this.sticker('farm', rec, tree.x, tree.y - tree.displayHeight * 0.55); }
      const o = this.spawnItem(rec, Math.round(tree.x + rnd(-10, 10)), Math.round(tree.y - tree.displayHeight * 0.55));
      const ty = Math.round(Phaser.Math.Clamp(tree.y + rnd(2, 14), L.FLOOR_TOP + 4, L.ROOM_H - 2));
      sfx.pick();
      this.tweens.add({ targets: o, y: ty, duration: 520, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } });
    },

    /** Качели и лопатка в саду — и в старых сохранениях. */
    ensureGarden2() {
      if (this.flags.garden2) return;
      this.flags.garden2 = true;
      const { W, FLOOR_TOP, ROOM_H } = L;
      if (!this.objs.some((o) => o.beh?.swing)) this.spawnItem(this.big.swing, Math.round(R.garden * W + W * 0.88), FLOOR_TOP + 12);
      const sh = this.findRec('shovel');
      if (sh && !this.objs.some((o) => o.beh?.shovel)) this.spawnItem(sh, Math.round(R.garden * W + W * 0.38), ROOM_H - 4);
      this.save();
    },

    /** Тучка над садом — тап вызывает дождь (живёт на слое неба, не предмет). */
    buildCloud() {
      const x = Math.round(R.garden * L.W + L.W * 0.42);
      this.cloud = this.add.image(x, 14, 'raincloud').setDepth(-8.5).setInteractive();
      this.cloud.raincloud = true;
      this.tweens.add({ targets: this.cloud, x: x + 14, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.cloud.setVisible(!this.night);
    },

    /** Дождь: поливает все грядки, мочит всех в саду (→ фен); днём после дождя — радуга. */
    rain() {
      if (this.raining || this.night) return;
      this.raining = true;
      this.hintDone('rain');
      const gx = R.garden * L.W;
      sfx.rain();
      this.cloud.setTint(0xaab3c5);
      const dim = this.add.rectangle(gx, 0, L.W, L.ROOM_H, 0x5a6a8a, 0).setOrigin(0).setDepth(9998);
      this.tweens.add({ targets: dim, fillAlpha: 0.18, duration: 400 });
      const drops = this.add.particles(gx, 4, 'raindrop', {
        x: { min: 0, max: L.W }, speedY: { min: 150, max: 190 }, speedX: -10, lifespan: (L.ROOM_H / 160) * 1000,
        tint: [0x7fbfff, 0xb8e0ff], alpha: 0.85, frequency: 12, quantity: 2,
      }).setDepth(9999);
      this.time.delayedCall(900, () => {
        for (const bed of this.objs) {
          if (!bed.beh?.gardenBed || Math.floor(bed.x / L.W) !== R.garden) continue;
          bed.plots.forEach((p, i) => { if (p && p.stage < 3 && !p.watered) this.waterPlot(bed, i); });
        }
        for (const o of this.objs) {
          if (Math.floor(o.x / L.W) !== R.garden || o.inTub) continue;
          if (o.kind === 'char') { o.wetUntil = this.time.now + 20000; if (!this.flags.tried?.dryer || Math.random() < 0.5) this.addNeed(o, 'dryer', 2500); }
          else if (o.beh?.pet) o.wetUntil = this.time.now + 7000;
        }
      });
      this.time.delayedCall(3400, () => {
        drops.stop();
        this.time.delayedCall(800, () => drops.destroy());
        this.cloud.clearTint();
        this.tweens.add({ targets: dim, fillAlpha: 0, duration: 500, onComplete: () => dim.destroy() });
        this.raining = false;
        if (this.night) return;
        const bow = this.add.image(gx + L.W / 2, L.FLOOR_TOP - 6, rainbowTex(this, Math.round(L.W * 0.8), Math.max(16, L.FLOOR_TOP - 12))).setOrigin(0.5, 1).setDepth(-8.7).setAlpha(0);
        sfx.sparkle();
        this.tweens.add({ targets: bow, alpha: 0.85, duration: 900, hold: 8000, yoyo: true, onComplete: () => bow.destroy() });
      });
    },

    pushSwing(sw) {
      sw.amp = Math.min(0.6, (sw.amp || 0) + 0.2);
      sfx.whee();
      const rider = this.objs.find((o) => o.restOn === sw);
      if (rider?.kind === 'char') { sfx.giggle(); this.fxHearts.explode(1, rider.x, rider.y - rider.displayHeight); }
      this.swingDream(sw);
    },

    /** Качели: сиденье на верёвках — маятник; седок качается вместе с ним. */
    updateSwings(time, delta) {
      const g = this.swingG;
      if (!g) return;
      g.clear();
      for (const sw of this.objs) {
        if (!sw.beh?.swing || !sw.active) continue;
        const rider = this.objs.find((o) => o.restOn === sw && !o.dragging);
        const base = rider ? 0.22 : 0;
        sw.amp = (sw.amp || 0) > base ? sw.amp * Math.pow(0.9993, delta) : Math.min(base, (sw.amp || 0) + 0.002 * delta);
        sw.phase = (sw.phase || 0) + delta * 0.0034;
        const top = sw.y - sw.displayHeight + 4;
        const len = sw.displayHeight - 14;
        const th = sw.amp * Math.sin(sw.phase);
        const sx = Math.round(sw.x + len * Math.sin(th));
        const sy = Math.round(top + len * Math.cos(th));
        g.setDepth(sw.depth + 0.3);
        g.lineStyle(1, 0x7a4a32, 1);
        g.lineBetween(sw.x - 5, top, sx - 5, sy);
        g.lineBetween(sw.x + 5, top, sx + 5, sy);
        g.fillStyle(0x2b1d2e).fillRect(sx - 8, sy - 1, 16, 5);
        g.fillStyle(0xf27aa6).fillRect(sx - 7, sy, 14, 3);
        g.fillStyle(0xffb0d0).fillRect(sx - 7, sy, 14, 1);
        if (rider) { rider.x = sx; rider.y = sy + (rider.kind === 'char' ? 8 : 1); }
      }
    },

    /** Раз в полторы секунды: бабочки над садом (больше — над выросшими цветами) и блестящий крестик-клад. */
    gardenTick() {
      const inGarden = Math.round(this.cameras.main.scrollX / L.W) === R.garden && !this.dress && !this.albumUi;
      if (this.cloud) this.cloud.setVisible(!this.night);
      this.butterflies = this.butterflies.filter((b) => b.active);
      if (!inGarden || this.night) {
        for (const b of this.butterflies) if (!b.onChar) b.destroy();
        this.butterflies = this.butterflies.filter((b) => b.active);
      } else {
        const want = Math.min(3, 1 + this.ripeFlowers().length);
        const rec = this.findRec('butterfly');
        if (rec && this.butterflies.filter((b) => !b.onChar).length < want) {
          const b = this.add.image(R.garden * L.W + (Math.random() < 0.5 ? 4 : L.W - 4), Math.round(rnd(10, L.FLOOR_TOP)), rec.cat, rec.frame).setDepth(15000).setInteractive();
          b.butterfly = true;
          this.butterflies.push(b);
          this.flutter(b);
        }
      }
      // клад: крестик на траве появляется время от времени и поблёскивает
      if (inGarden && !this.digSpot && this.time.now > (this.nextDigAt || 0)) {
        const x = Math.round(R.garden * L.W + L.W * rnd(0.3, 0.8));
        const y = Math.round(rnd(L.FLOOR_TOP + 10, L.ROOM_H - 6));
        this.digSpot = this.add.image(x, y, 'dig_x').setDepth(-4.9);
      }
      if (this.digSpot && Math.random() < 0.5) this.fxSparks.explode(2, this.digSpot.x, this.digSpot.y - 2);
    },

    ripeFlowers() {
      const out = [];
      for (const bed of this.objs) {
        if (!bed.beh?.gardenBed) continue;
        bed.plots.forEach((p, i) => {
          const r = p && p.stage >= 3 && this.recOf(p.id);
          if (r && /sunflower|tulip|rose|daisy|flower/.test(r.subject)) out.push({ x: bed.x + PLOT_DX[i], y: bed.y - bed.displayHeight - 8 });
        });
      }
      return out;
    },

    /** Бабочка летает от точки к точке (чаще — к цветам). */
    flutter(b) {
      if (!b.active || b.onChar) return;
      const fl = this.ripeFlowers();
      const t = fl.length && Math.random() < 0.6 ? pick(fl) : { x: R.garden * L.W + rnd(12, L.W - 12), y: rnd(10, L.FLOOR_TOP + 16) };
      b.setFlipX(t.x < b.x);
      this.tweens.add({ targets: b, x: Math.round(t.x + rnd(-4, 4)), y: Math.round(t.y + rnd(-4, 2)), duration: rnd(1600, 2600), ease: 'Sine.easeInOut', onComplete: () => this.flutter(b) });
    },

    /** Поймали бабочку: она садится на голову ближайшему персонажу и через время улетает. */
    catchButterfly(b) {
      this.tweens.killTweensOf(b);
      this.hintDone('butterfly');
      sfx.sparkle();
      const chars = this.objs.filter((c) => c.kind === 'char' && this.visible(c) && !c.inTub);
      if (!chars.length) { this.fxSparks.explode(4, b.x, b.y); this.flutter(b); return; }
      chars.sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x));
      const ch = chars[0];
      b.disableInteractive();
      this.tweens.add({
        targets: b, x: ch.x + 2, y: ch.y - ch.displayHeight - 3, duration: 600, ease: 'Sine.easeInOut',
        onComplete: () => {
          b.onChar = ch;
          b.until = this.time.now + 12000;
          sfx.giggle();
          this.fxHearts.explode(3, ch.x, ch.y - ch.displayHeight);
        },
      });
    },

    updateButterflies(time) {
      for (const b of this.butterflies || []) {
        const ch = b.onChar;
        if (!ch || !b.active) continue;
        if (!ch.active || time > b.until) {
          b.onChar = null;
          this.tweens.add({ targets: b, y: -12, x: b.x + rnd(-30, 30), duration: 1400, onComplete: () => b.destroy() });
          continue;
        }
        b.x = Math.round(ch.x + 2);
        b.y = Math.round(ch.y - ch.displayHeight - 3 + Math.sin(time / 300)); // на макушке, не на лице
        b.setDepth(ch.depth + 0.3);
      }
    },

    /** Лопатку — на крестик: копает, и из ямки выскакивает клад. */
    digTreasure(shovel) {
      const spot = this.digSpot;
      this.digSpot = null;
      this.nextDigAt = this.time.now + 15000; // новый крестик — не сразу, а после паузы
      const { x, y } = spot;
      shovel.x = x + 7; shovel.y = y + 2;
      shovel.restOn = null;
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 260, () => {
          sfx.dig();
          this.tweens.add({ targets: shovel, y: shovel.y - 4, duration: 110, yoyo: true });
          this.fxCrumbs.setParticleTint(0x7a5232);
          this.fxCrumbs.explode(5, x, y);
        });
      }
      this.time.delayedCall(850, () => {
        spot.destroy();
        const hole = this.add.ellipse(x, y - 1, 10, 4, 0x5a3a22).setDepth(-4.9);
        this.tweens.add({ targets: hole, alpha: 0, delay: 3000, duration: 800, onComplete: () => hole.destroy() });
        this.treasureList ||= TREASURE.map((sub) => this.findRec(sub)).filter(Boolean);
        const rec = pick(this.treasureList);
        if (!rec) return;
        const o = this.spawnItem(rec, x, y - 2);
        this.lastTreasure = rec.subject;
        this.sticker('treasure', rec, x, y - 6);
        const tx = Math.round(Phaser.Math.Clamp(x + rnd(-20, 20), R.garden * L.W + 8, (R.garden + 1) * L.W - 8));
        const ty = Math.round(Phaser.Math.Clamp(y + rnd(-4, 6), L.FLOOR_TOP + 6, L.ROOM_H - 2));
        sfx.fanfare();
        this.fxSparks.explode(16, x, y - 6);
        this.tweens.add({ targets: o, x: tx, duration: 600 });
        this.tweens.add({
          targets: o, y: y - 26, duration: 280, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
        });
        this.hintDone('dig');
      });
    },
  });
}
