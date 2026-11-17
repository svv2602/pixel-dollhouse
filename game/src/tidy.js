// Уборка: урна в каждой комнате, метла и грабли.
//  • предмет бросили в урну — она его съедает (как если бы утащили вниз, в ящик);
//  • тап по урне — втягивает всё лишнее с пола своей комнаты; пока она «полная» (несколько секунд),
//    повторный тап вытряхивает всё обратно — на случай, если убрали нужное;
//  • метлой или граблями проводят по полу — что задели, то летит в урну;
//  • в саду с яблони иногда падают листья: их сгребают граблями.
// «Лишнее» — мелкие предметы каталога, лежащие на полу. Мебель, инструменты игры (нарисованные в коде),
// питомцы, музыкальные инструменты, всё, что на полках, в руках, в ванне и на плите, уборка не трогает.
import Phaser from 'phaser';
import { canvasFor } from './furniture.js';

const tex = (scene, key, canvas) => {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  return key;
};

const UNDO_MS = 8000; // сколько урна держит собранное, прежде чем оно исчезнет насовсем
export const LEAVES = ['maple leaf', 'oak leaf', 'ginkgo leaf'];
export const RAKES = /^(leaf|garden) rake$/;

const binCanvas = (full) => canvasFor(13, 17, (r) => {
  const up = full ? 0 : 2;
  // из полной урны торчит собранное
  if (full) { r(2, 3, 3, 3, '#ff7ab8'); r(6, 2, 3, 4, '#ffd84a'); r(9, 4, 2, 2, '#5ac4f2'); }
  r(5, up, 3, 2, '#3f9a80'); r(0, up + 2, 13, 3, '#52b893'); r(0, up + 2, 13, 1, '#8fe0c4');
  for (let y = 7; y < 17; y++) { const k = y > 12 ? 2 : 1; r(k, y, 13 - k * 2, 1, '#7ad9b5'); }
  r(3, 8, 1, 8, '#52b893'); r(9, 8, 1, 8, '#52b893'); r(1, 7, 11, 1, '#52b893');
  // мордочка: урна «ест» мусор
  r(4, 10, 1, 2, '#2b1d2e'); r(8, 10, 1, 2, '#2b1d2e'); r(5, 13, 3, 1, '#2b1d2e');
});

export function makeTidy(scene) {
  const add = (key, canvas) => { tex(scene, key, canvas); tex(scene, `${key}_icon`, canvas); };
  add('bin', binCanvas(false));
  tex(scene, 'bin_full', binCanvas(true));
  add('broom', canvasFor(9, 21, (r) => {
    r(4, 0, 1, 13, '#b8743a'); r(3, 0, 1, 2, '#8d5a3b');
    r(2, 12, 5, 2, '#ef5a6f');
    r(1, 14, 7, 7, '#ffd84a'); r(0, 17, 9, 4, '#ffd84a');
    for (const x of [1, 3, 5, 7]) r(x, 15, 1, 6, '#d8b030');
  }));
  return [
    { id: 'tidy-bin', subject: 'tidy bin', cat: 'toy', tags: ['toy'], tex: 'bin', bin: true, bbox: [0, 0, 15, 15], order: 30 },
    { id: 'broom', subject: 'sweeping broom', cat: 'toy', tags: ['toy'], tex: 'broom', sweeper: true, bbox: [0, 0, 15, 15], order: 31 },
  ];
}

export function installTidy(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    /** Урны (по одной на комнату), метла в спальне и грабли в саду один раз появляются в доме — и в старых сохранениях. */
    ensureTidy() {
      if (this.flags.tidy) return;
      this.flags.tidy = true;
      const bin = this.byId.get('tidy-bin');
      const rooms = Math.round(L.WORLD / L.W);
      for (let k = 0; k < rooms; k++) {
        if (this.objs.some((o) => o.beh?.bin && roomOf(o) === k)) continue;
        this.spawnItem(bin, k * L.W + 12, L.ROOM_H - 2);
      }
      if (!this.objs.some((o) => o.rec?.id === 'broom')) this.spawnItem(this.byId.get('broom'), 26, L.ROOM_H - 1);
      const rake = this.findRec('leaf rake');
      if (rake && !this.objs.some((o) => RAKES.test(o.rec?.subject || ''))) this.spawnItem(rake, 2 * L.W + 28, L.ROOM_H - 1);
      this.save();
    },

    /** Вызывается из create(): сцена могла быть пересоздана. */
    initTidy() {
      this.sweepAtT = 0;
      // в комнате накидано много — урна подпрыгивает: «я могу это убрать»
      this.time.addEvent({
        delay: 7000, loop: true, callback: () => {
          if (this.dress || this.albumUi || this.mapUi || this.press) return;
          const bin = this.objs.find((o) => o.beh?.bin && !o.stash && !o.dragging && this.visible(o));
          if (!bin || this.litter(roomOf(bin)).length < 8) return;
          this.tweens.add({ targets: bin, y: bin.y - 3, duration: 120, yoyo: true, repeat: 1 });
          this.fxSparks.explode(4, bin.x, bin.y - bin.displayHeight);
        },
      });
    },

    /** Можно ли убрать этот предмет уборкой (тап по урне, метла). */
    isLitter(o) {
      const b = o.beh;
      return o.kind === 'item' && o.active && !o.dragging && !o.owner && !o.restOn && !o.inTub && !o.cooking && !o.rec.tex
        && !b.furniture && !b.pet && !b.music && !b.wall && !b.flat && !b.sweeper && !o.contents?.length
        // инструменты игры из каталога: лопатка, лейка, лампы, корзины, котёл, альбом
        && !b.shovel && !b.light && !b.container && !b.cauldron && !b.album && !/watering can/.test(o.rec.subject)
        && o.y > L.FLOOR_TOP && o.y <= L.ROOM_H;
    },

    litter(room) { return this.objs.filter((o) => this.isLitter(o) && roomOf(o) === room); },

    binOf(room) { return this.objs.find((o) => o.beh?.bin && !o.dragging && roomOf(o) === room) || null; },

    /** Предмет больше не в доме: его не видно, не сохранить и не тронуть — но он ещё не уничтожен. */
    takeOut(o) {
      this.objs = this.objs.filter((x) => x !== o);
      for (const x of this.objs) if (x.restOn === o) x.restOn = null;
      o.disableInteractive();
      this.tweens.killTweensOf(o);
    },

    gulp(bin) {
      if (!bin.active) return;
      sfx.gulp();
      this.tweens.add({ targets: bin, y: bin.y - 2, duration: 80, yoyo: true });
      this.fxCrumbs.setParticleTint(0x7ad9b5);
      this.fxCrumbs.explode(3, bin.x, bin.y - bin.displayHeight);
    },

    /** Предмет летит в урну дугой и пропадает насовсем. */
    flingToBin(o, bin, done = null) {
      this.takeOut(o);
      o.setDepth(15000);
      const x0 = o.x;
      const y0 = o.y;
      const ty = bin.y - bin.displayHeight + 2;
      this.tweens.addCounter({
        from: 0, to: 1, duration: 320, ease: 'Sine.easeIn',
        onUpdate: (tw) => {
          const k = tw.getValue();
          o.x = Math.round(x0 + (bin.x - x0) * k);
          o.y = Math.round(y0 + (ty - y0) * k - Math.sin(k * Math.PI) * 22);
        },
        onComplete: () => { this.removeObj(o, true); if (done) done(); else this.gulp(bin); },
      });
    },

    /** Предмет бросили в урну. Питомца и мебель она не берёт. */
    binEat(bin, o) {
      if (o.beh.furniture || o.beh.bin) return false;
      if (o.beh.pet) {
        // питомец выскакивает обратно
        sfx.squeak(); sfx.boing();
        o.x = Math.round(Phaser.Math.Clamp(bin.x + 18, roomOf(bin) * L.W + 8, (roomOf(bin) + 1) * L.W - 8));
        o.y = bin.y;
        this.tweens.add({ targets: o, y: o.y - 8, duration: 140, yoyo: true });
        return true;
      }
      this.stat('trash');
      this.takeOut(o);
      this.removeObj(o, true);
      this.gulp(bin);
      return true;
    },

    /** Тап по урне: собрать всё лишнее с пола комнаты; пока урна полная — вытряхнуть обратно. */
    binTap(bin) {
      if (bin.stash) { this.binUndo(bin); return; }
      const list = this.litter(roomOf(bin));
      if (!list.length) { sfx.boing(); this.tweens.add({ targets: bin, y: bin.y - 3, duration: 110, yoyo: true }); return; }
      this.stat('tidy');
      sfx.whee();
      const ty = bin.y - bin.displayHeight + 2;
      bin.stash = list.map((o) => ({ o, x: o.x, y: o.y, depth: o.depth }));
      list.forEach((o, i) => {
        this.takeOut(o);
        o.setDepth(15000);
        this.tweens.add({
          targets: o, x: bin.x, y: ty, duration: 260, delay: Math.min(i * 35, 700), ease: 'Quad.easeIn',
          onComplete: () => { o.setVisible(false); if (i % 3 === 0) sfx.pop(); },
        });
      });
      bin.setTexture('bin_full');
      bin.stashT = this.time.delayedCall(UNDO_MS + Math.min(list.length * 35, 700), () => this.binEmpty(bin));
      bin.once('destroy', () => this.binEmpty(bin));
      if (list.length >= 3) this.roomClean(roomOf(bin), bin);
      this.save();
    },

    /** Передумали: всё, что урна только что собрала, выскакивает на свои места. */
    binUndo(bin) {
      const stash = bin.stash;
      bin.stash = null;
      bin.stashT?.remove();
      if (bin.active) bin.setTexture('bin');
      sfx.chestOut();
      for (const { o, x, y, depth } of stash) {
        if (!o.active) continue;
        this.tweens.killTweensOf(o);
        o.setVisible(true).setInteractive().setDepth(depth);
        this.objs.push(o);
        this.tweens.add({ targets: o, x, y, duration: 300, ease: 'Back.easeOut' });
      }
      this.save();
    },

    /** Время вышло: собранное исчезает насовсем. */
    binEmpty(bin) {
      const stash = bin.stash;
      if (!stash) return;
      bin.stash = null;
      bin.stashT?.remove();
      for (const { o } of stash) if (o.active) this.removeObj(o, true);
      if (!bin.active || !this.sys.isActive()) return;
      bin.setTexture('bin');
      this.gulp(bin);
      this.fxSparks.explode(8, bin.x, bin.y - bin.displayHeight);
    },

    /** Метлой или граблями ведут по полу: всё лишнее, что задели, летит в урну этой комнаты (нет урны — просто исчезает). */
    sweepAt(tool) {
      if (this.time.now < this.sweepAtT) return;
      this.sweepAtT = this.time.now + 60;
      const hit = this.objs.filter((o) => this.isLitter(o) && Math.abs(o.x - tool.x) < 11 && Math.abs(o.y - tool.y) < 12);
      if (!hit.length) return;
      const bin = this.binOf(roomOf(tool));
      if (!tool.swept) { tool.swept = true; this.stat('sweep'); }
      sfx.step();
      this.fxCrumbs.setParticleTint(0xe8d8b8);
      this.fxCrumbs.explode(3, tool.x, tool.y);
      const heap = this.compostOf(roomOf(tool));
      for (const o of hit) {
        // в саду листья и объедки летят в компост, остальное — в урну
        if (heap && this.compostTakes(o)) this.flingToBin(o, heap, () => this.compostAdd(heap, o.rec));
        else if (bin && !bin.stash) this.flingToBin(o, bin);
        else { this.takeOut(o); this.removeObj(o); }
      }
      this.save();
    },

    /** С яблони иногда слетает лист (не больше пяти в саду) — есть что сгребать граблями. */
    leafFall(tree) {
      if (Math.random() > 0.4) return;
      const room = roomOf(tree);
      if (this.objs.filter((o) => LEAVES.includes(o.rec?.subject) && roomOf(o) === room).length >= 5) return;
      const rec = this.findRec(pick(LEAVES));
      if (!rec) return;
      const x = Math.round(Phaser.Math.Clamp(tree.x + rnd(-26, 26), room * L.W + 8, (room + 1) * L.W - 8));
      const o = this.spawnItem(rec, x, Math.round(tree.y - tree.displayHeight * 0.6));
      const ty = Math.round(Phaser.Math.Clamp(tree.y + rnd(2, 16), L.FLOOR_TOP + 4, L.ROOM_H - 2));
      this.tweens.add({ targets: o, y: ty, duration: 1100, ease: 'Sine.easeInOut', onComplete: () => this.save() });
      this.tweens.add({ targets: o, x: x + (Math.random() < 0.5 ? -7 : 7), duration: 370, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    },
  });
}
