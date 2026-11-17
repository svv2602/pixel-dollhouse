// Ванная: ванна, пятна, пена, фен, косметика, щётка, пузыри, унитаз.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx } from './sfx.js';
import { HAIR, HAIR_STYLE_KEYS } from './character.js';
import { R } from './places.js';
import { L, rnd } from './core.js';

export function installBathroom(Room) {
  Object.assign(Room.prototype, {
    /** Ванная (4-я комната) и лужа грязи в саду — появляются и в старых сохранениях. */
    ensureBath() {
      const { W, FLOOR_TOP, ROOM_H } = L;
      if (!this.objs.some((o) => o.beh?.puddle)) this.spawnItem(this.big.puddle, Math.round(R.garden * W + W * 0.22), FLOOR_TOP + 32);
      if (this.objs.some((o) => o.x >= R.bath * W && o.x < (R.bath + 1) * W)) return;
      const x0 = R.bath * W;
      const big = (key, fx, y) => this.spawnItem(this.big[key], Math.round(x0 + W * fx), Math.round(y));
      const tub = big('tub', 0.52, FLOOR_TOP + 20);
      const sink = big('sink', 0.17, FLOOR_TOP + 12);
      const mirror = this.findRec('oval mirror');
      if (mirror) this.spawnItem(mirror, Math.round(x0 + W * 0.17), FLOOR_TOP - 24);
      this.spawnItem(this.byId.get('hair-dryer'), Math.round(sink.x + 18), FLOOR_TOP + 14); // фен — на полу у раковины
      const shelf = big('shelf', 0.82, FLOOR_TOP - 28);
      ['pink', 'blue', 'green'].forEach((c, i) => {
        const b = this.spawnItem(this.byId.get(`foam-${c}`), Math.round(shelf.x - 12 + i * 12), shelf.y - 4);
        b.restOn = shelf;
      });
      const duck = this.findRec('rubber duck');
      if (duck) { const d = this.spawnItem(duck, tub.x, tub.y); d.inTub = tub; d.tubDx = 10; }
      const towelRec = this.findRec('laundry basket');
      if (towelRec) this.spawnItem(towelRec, Math.round(x0 + W * 0.85), ROOM_H - 4);
      this.save();
    },
    /** Пятна грязи/краски поверх персонажа или питомца (тонированная накладка, смывается в ванне). */
    stain(o, color, quiet = false) {
      o.stain = color;
      if (!o.stainImg) o.stainImg = this.add.image(o.x, o.y, o.kind === 'char' ? 'stain_char' : 'stain_pet').setOrigin(0.5, 1);
      o.stainImg.setTint(color);
      if (quiet) return;
      this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
      // персонаж просит искупаться
      if (o.kind === 'char') this.time.delayedCall(1500, () => { if (o.stain && !this.wish && !o.inTub) this.showWish(o, 'bath'); });
    },
    clean(o) {
      this.clearMark?.(o, true);
      o.stain = null;
      o.stainImg?.destroy();
      o.stainImg = null;
      if (o.kind === 'char') {
        // вода смывает и волшебство: радугу, заморозку, розовые волосы
        o.rainbow = 0; o.ice = 0; o.clearTint();
        const lk = o.look;
        const pinkHair = lk.prevHair && lk.hair === HAIR[6];
        if (pinkHair || lk.makeup?.length || lk.mustache || lk.frazzled) {
          o.look = { ...lk, makeup: [], mustache: undefined, frazzled: undefined };
          if (pinkHair) o.look = { ...o.look, hair: lk.prevHair, prevHair: undefined };
          this.charTex(o);
          o.setTexture(o.key);
        }
      }
    },
    /** Опустить в ванну: персонаж/питомец по пояс в воде, игрушки плавают. Через секунду — чистые. */
    bathe(o, tub, x) {
      if (o.kind === 'char') this.stat('bathe');
      o.inTub = tub;
      o.tubDx = Math.round(Phaser.Math.Clamp(x - tub.x, -tub.displayWidth / 2 + 9, tub.displayWidth / 2 - 9));
      o.restOn = null;
      o.sleeping = false;
      sfx.splash();
      this.fxCrumbs.setParticleTint(0x9fdcff);
      this.fxCrumbs.explode(12, tub.x + o.tubDx, tub.y - tub.displayHeight + 2);
      if (o.kind !== 'char' && !o.beh.pet) { if (/duck/.test(o.rec.subject)) sfx.squeak(); return; }
      this.bubbles(tub, 10);
      if (o.kind === 'char') this.checkWish(o, 'bath');
      this.time.delayedCall(1200, () => {
        if (o.inTub !== tub) return;
        const was = o.stain || o.rainbow || o.ice || o.look?.prevHair || o.look?.makeup?.length || o.look?.mustache;
        this.clean(o);
        this.bubbles(tub, 14);
        sfx.sparkle();
        this.fxHearts.explode(was ? 4 : 2, o.x, o.y - o.displayHeight);
        if (o.kind === 'char') sfx.giggle(); else sfx.squeak();
        this.save();
      });
    },
    renderFoam(tub) {
      if (!tub.foamImg) tub.foamImg = this.add.image(tub.x, tub.y, 'foam').setOrigin(0.5, 1);
      tub.foamImg.setTint(tub.foam);
    },
    bubbles(tub, n) {
      const top = tub.y - tub.displayHeight + 2;
      for (let i = 0; i < n; i++) {
        const b = this.add.image(tub.x + rnd(-18, 18), top, 'bubble_p').setDepth(16000).setTint(tub.foam || 0xffffff);
        this.tweens.add({ targets: b, y: top - rnd(10, 30), x: b.x + rnd(-6, 6), alpha: 0, duration: rnd(700, 1400), delay: i * 40, onComplete: () => b.destroy() });
      }
    },
    bathTick() {
      this.nightLight();
      const now = this.time.now;
      for (const o of this.objs) {
        if (o.beh?.tub && this.visible(o) && (o.foam || this.objs.some((x) => x.inTub === o && (x.kind === 'char' || x.beh?.pet)))) {
          this.bubbles(o, 2);
          if (Math.random() < 0.25 && (this.popBubbles?.length || 0) < 10) this.spawnBubble(o.x + rnd(-16, 16), o.y - o.displayHeight + 2, o.foam || 0xffffff);
        }
        if (o.shinyUntil > now && Math.random() < 0.6) this.fxSparks.explode(1, o.x + rnd(-6, 6), o.y - rnd(2, o.displayHeight));
        if (o.wetUntil > now && !o.inTub) {
          this.fxCrumbs.setParticleTint(0x9fdcff);
          this.fxCrumbs.explode(1, o.x + rnd(-4, 4), o.y - o.displayHeight * 0.6);
        }
      }
    },
    /** Фен: сушит и делает новую причёску. */
    blowDry(ch) {
      ch.wetUntil = 0;
      this.hintDone('dryer', ch);
      const i = HAIR_STYLE_KEYS.indexOf(ch.look.hairStyle || 'bob');
      ch.look = { ...ch.look, hairStyle: HAIR_STYLE_KEYS[(i + 1) % HAIR_STYLE_KEYS.length] };
      this.charTex(ch);
      ch.setTexture(ch.key);
      sfx.poof(); sfx.sparkle();
      this.fxPoof.explode(12, ch.x - 8, ch.y - ch.displayHeight + 6);
      this.fxSparks.explode(8, ch.x, ch.y - ch.displayHeight);
      this.celebrate(ch, 2);
    },
    /** Унитаз, полка с аквагримом, помада и румяна на раковине, зубная щётка — и в старых сохранениях. */
    ensureBath2() {
      if (this.flags.bath2) return;
      this.flags.bath2 = true;
      const { W, FLOOR_TOP } = L;
      const x0 = R.bath * W;
      if (!this.objs.some((o) => o.beh?.toilet)) this.spawnItem(this.big.toilet, Math.round(x0 + W * 0.9), FLOOR_TOP + 12);
      const shelf = this.spawnItem(this.big.shelf, Math.round(x0 + W * 0.36), FLOOR_TOP - 28);
      ['paint-whiskers', 'paint-hearts', 'paint-freckles'].forEach((id, i) => {
        const b = this.spawnItem(this.byId.get(id), Math.round(shelf.x - 12 + i * 12), shelf.y - 4);
        b.restOn = shelf;
      });
      const sink = this.objs.find((o) => o.rec?.id === 'big_sink' && o.x >= x0 && o.x < x0 + W);
      if (sink) {
        for (const [id, dx] of [['lipstick', -5], ['blush', 5]]) {
          const it = this.spawnItem(this.byId.get(id), sink.x + dx, sink.y - sink.displayHeight + 7);
          it.restOn = sink;
        }
        this.spawnItem(this.byId.get('toothbrush'), Math.max(x0 + 10, sink.x - 16), FLOOR_TOP + 18);
      } else {
        ['lipstick', 'blush', 'toothbrush'].forEach((id, i) => this.spawnItem(this.byId.get(id), Math.round(x0 + W * (0.1 + i * 0.07)), FLOOR_TOP + 18));
      }
      this.save();
    },
    applyMakeup(ch, o) {
      const mk = new Set(ch.look.makeup || []);
      mk.delete(o.beh.makeup);
      mk.add(o.beh.makeup); // последняя — поверх остальных
      ch.look = { ...ch.look, makeup: [...mk] };
      this.charTex(ch);
      this.hintDone('makeup', ch);
      ch.busy = true;
      ch.setTexture(ch.key + '_blink');
      sfx.wear(); sfx.sparkle();
      const m = this.mouth(ch);
      this.fxSparks.explode(8, m.x, m.y - 3);
      this.time.delayedCall(450, () => {
        ch.busy = false;
        ch.setTexture(ch.key + '_smile');
        this.fxHearts.explode(2, ch.x, ch.y - ch.displayHeight);
        sfx.giggle();
        this.time.delayedCall(700, () => { if (!ch.busy) ch.setTexture(ch.key); });
      });
    },
    /** Чистим зубы: пена у рта, шорох щётки — и сияющая улыбка (заодно смываются «усы»). */
    brushTeeth(ch) {
      ch.busy = true;
      ch.sleeping = false;
      const m = this.mouth(ch);
      let i = 0;
      this.time.addEvent({
        delay: 140, repeat: 9, callback: () => {
          ch.setTexture(ch.key + (i % 2 ? '_open' : '_blink'));
          sfx.scrub();
          this.fxCrumbs.setParticleTint(0xffffff);
          this.fxCrumbs.explode(2, m.x + rnd(-2, 2), m.y);
          if (++i < 10) return;
          if (ch.look.mustache) { ch.look = { ...ch.look, mustache: undefined }; this.charTex(ch); }
          ch.sweets = 0;
          this.hintDone('teeth', ch);
          ch.setTexture(ch.key + '_smile');
          sfx.ding();
          this.fxSparks.explode(8, m.x, m.y);
          this.time.delayedCall(1200, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
        },
      });
    },
    /** Тап по ванне — вверх летят большие пузыри (их можно лопать пальцем). */
    blowBubbles(tub, n = 6) {
      if ((this.popBubbles?.length || 0) > 24) return;
      sfx.splash();
      const top = tub.y - tub.displayHeight + 2;
      for (let i = 0; i < n; i++) this.time.delayedCall(i * 110, () => this.spawnBubble(tub.x + rnd(-16, 16), top, tub.foam || 0xffffff));
    },
    spawnBubble(x, y, tint) {
      this.popBubbles ||= [];
      const b = this.add.image(Math.round(x), Math.round(y), 'bubble_big').setDepth(16001).setTint(tint).setInteractive();
      b.bubble = true;
      this.popBubbles.push(b);
      this.tweens.add({ targets: b, x: b.x + rnd(-5, 5), duration: rnd(500, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: b, y: Math.max(8, y - rnd(22, 45)), duration: rnd(2500, 4000), ease: 'Sine.easeOut',
        onComplete: () => this.time.delayedCall(rnd(1200, 2600), () => this.popBubble(b, true)),
      });
    },
    popBubble(b, auto = false) {
      if (!b.active) return;
      this.popBubbles = (this.popBubbles || []).filter((x) => x !== b);
      this.tweens.killTweensOf(b);
      sfx.pop();
      if (!auto) { this.fxSparks.explode(5, b.x, b.y); this.hintDone('bubbles'); }
      b.destroy();
    },
    /** Смыв: журчание, вода закручивается, унитаз чуть подпрыгивает. */
    flushFx(wc) {
      sfx.flush();
      this.hintDone('toilet');
      this.fxCrumbs.setParticleTint(0x9fdcff);
      for (let i = 0; i < 4; i++) this.time.delayedCall(i * 180, () => this.fxCrumbs.explode(4, wc.x + rnd(-5, 5), wc.y - wc.displayHeight + 11));
      this.tweens.add({ targets: wc, y: wc.y - 1, duration: 70, yoyo: true, repeat: 2 });
    },
    /** Предмет в унитаз: закручивается и уплывает. Питомцев и мебель не смываем. */
    flushItem(wc, o) {
      this.objs = this.objs.filter((x) => x !== o);
      for (const x of this.objs) if (x.restOn === o) x.restOn = null;
      if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; }
      o.glow?.destroy();
      o.setDepth(wc.depth + 1);
      this.flushFx(wc);
      this.tweens.add({ targets: o, x: wc.x, y: wc.y - wc.displayHeight + 13, angle: 720, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
    },
    sitOnToilet(ch, wc) {
      ch.eaten = 0;
      this.hintDone('potty', ch);
      ch.x = Math.round(wc.x);
      ch.y = Math.round(wc.y - 7);
      ch.restOn = wc;
      sfx.drop();
      this.time.delayedCall(900, () => {
        if (ch.restOn !== wc) return;
        this.flushFx(wc);
        sfx.giggle();
        this.fxHearts.explode(2, ch.x, ch.y - ch.displayHeight);
      });
    },
  });
}
