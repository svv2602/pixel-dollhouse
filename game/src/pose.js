// Позы кукол и уход из дома.
//  • сидит: на стуле, качелях, унитазе и на кровати, пока не уснула, — рисунок без голеней (туфли сразу под подолом).
//    Голова и руки остаются на месте, поэтому шапки, очки и вещи в руке не сдвигаются;
//  • лежит: уснула на кровати или диване — голова на подушке, остальное под одеялом. Перед сном раздевается:
//    шапка, очки и вещь из руки ложатся у кровати (игрушка или питомец — в ногах, на кровати, и идут с ней в сон);
//  • питомец, уснувший на лежанке, утопает в ней;
//  • куклу можно отпустить из дома: открыть вкладку «люди» и утащить куклу вниз, в ящик. Её вид запоминается,
//    тап по портрету возвращает её.
// Поза выбирается каждый кадр по тому, где кукла и что делает (poseOf) — отдельного «сесть/лечь» в коде комнат нет.
import Phaser from 'phaser';
import { CHAR_W, CHAR_H, makeCharTextures } from './character.js';
import { canvasFor } from './furniture.js';

const HEAD_ROWS = 16;  // сколько строк рисунка видно у лежащей: голова и шея
const NEST = 5;        // на сколько пикселей питомец утопает в лежанке

export function makePose(scene) {
  if (scene.textures.exists('bed_blanket')) return;
  // одеяло «с человеком под ним»: горбик поверх кровати
  scene.textures.addCanvas('bed_blanket', canvasFor(25, 10, (r) => {
    r(2, 2, 23, 8, '#f27aa6'); r(0, 4, 25, 6, '#f27aa6'); r(4, 0, 17, 2, '#f27aa6');
    r(4, 0, 17, 1, '#f8a8c4'); r(2, 2, 2, 1, '#f8a8c4'); r(21, 2, 3, 1, '#f8a8c4'); r(0, 4, 2, 1, '#f8a8c4');
    r(0, 9, 25, 1, '#d85a8a'); r(0, 4, 1, 6, '#d85a8a');
    for (let x = 4; x < 23; x += 4) { r(x, 4, 1, 1, '#f8a8c4'); r(x + 2, 7, 1, 1, '#f8a8c4'); }
  }));
}

export function installPose(Room, { L, sfx, RX }) {
  const isBed = (o) => !!o && RX.bedLike.test(o.rec?.subject || '');
  Object.assign(Room.prototype, {
    /** Текстуры куклы в обеих позах: стоя (baseKey) и сидя (baseKey + 's'). После вызова рисунку нужен setTexture(). */
    charTex(ch) {
      makeCharTextures(this, ch.baseKey, ch.look);
      makeCharTextures(this, `${ch.baseKey}s`, ch.look, false, 'sit');
    },

    /** Какая поза сейчас положена кукле. */
    poseOf(ch) {
      const on = ch.restOn;
      if (ch.dragging || ch.walking || !on || !on.active) return 'stand';
      if (isBed(on)) return ch.sleeping ? 'lie' : 'sit';
      return on.beh?.seat || on.beh?.swing || on.beh?.toilet ? 'sit' : 'stand';
    },

    /** Каждый кадр: поза по обстоятельствам; лежащая — на подушке под одеялом. */
    updatePose(ch) {
      const pose = this.poseOf(ch);
      if (pose !== (ch.pose || 'stand')) this.setPose(ch, pose);
      if (ch.pose !== 'lie') return;
      // Сама кукла остаётся там, где её усадили (x, y не трогаем: на них завязаны прыжки, сохранение, облачка снов), —
      // сдвигается только рисунок: его точка привязки уезжает так, чтобы голова оказалась на подушке
      const lie = ch.lie;
      const s = ch.mul;
      const ox = CHAR_W / 2 - (lie.x - ch.x) / s;
      const oy = CHAR_H - (lie.y - ch.y) / s;
      ch.setDisplayOrigin(ox, oy);
      lie.blanket.setPosition(lie.bx, lie.by).setDepth(ch.depth + 0.1);
      if (ch.stainImg) { ch.stainImg.setCrop(0, 0, CHAR_W, HEAD_ROWS); ch.stainImg.setDisplayOrigin(ox, oy); }
    },

    setPose(ch, pose) {
      const prev = ch.pose || 'stand';
      const face = ch.texture.key.startsWith(ch.key) ? ch.texture.key.slice(ch.key.length) : '';
      ch.pose = pose;
      ch.key = ch.baseKey + (pose === 'sit' ? 's' : '');
      ch.setTexture(ch.key + face);
      if (prev === 'lie') this.leaveLie(ch);
      if (pose === 'lie') this.enterLie(ch);
    },

    /** Уснула: раздевается, ложится головой на подушку, сверху — одеяло. */
    enterLie(ch) {
      const bed = ch.restOn;
      this.undress(ch, bed);
      const w = bed.displayWidth;
      const h = bed.displayHeight;
      const big = bed.rec.id === 'big_bed';
      // вторая и третья кукла на той же кровати — рядом на подушке
      const n = this.objs.filter((o) => o !== ch && o.kind === 'char' && o.pose === 'lie' && o.restOn === bed).length;
      const s = ch.mul;
      // макушка — на 36 строк выше «ног» рисунка; подбородок (строка 14) должен лечь на матрас
      const mattress = big ? bed.y - 14 : Math.round(bed.y - h * 0.45);
      const hx = big ? bed.x - 8 : Math.round(bed.x - w * 0.22);
      ch.lie = {
        bed,
        x: hx + n * 8, y: mattress + (36 - 14) * s - n * 2,
        bx: big ? bed.x + 5 : Math.round(bed.x + w * 0.14), by: big ? bed.y - 7 : Math.round(bed.y - h * 0.25),
      };
      ch.setCrop(0, 0, CHAR_W, HEAD_ROWS);
      ch.setFlipX(false);
      ch.lie.blanket = this.add.image(ch.lie.bx, ch.lie.by, 'bed_blanket').setOrigin(0.5, 1);
      ch.once('destroy', () => ch.lie?.blanket.destroy());
    },

    leaveLie(ch) {
      const lie = ch.lie;
      if (!lie) return;
      ch.lie = null;
      lie.blanket.destroy();
      ch.setCrop();
      ch.setOrigin(0.5, 1);
      if (ch.stainImg) { ch.stainImg.setCrop(); ch.stainImg.setOrigin(0.5, 1); }
    },

    /** Перед сном (и уходя из дома) кукла снимает всё с себя: вещи ложатся рядом. bed — кровать, если есть. */
    undress(ch, bed = null) {
      const items = ['head', 'face', 'hand'].map((slot) => ch.slots[slot]).filter(Boolean);
      const room = Math.floor(ch.x / L.W);
      items.forEach((it, i) => {
        ch.slots[it.slot] = null;
        it.owner = null;
        it.slot = null;
        it.setScale(1);
        const friend = bed && (it.beh.pet || it.rec.cat === 'toy');
        if (friend) {
          // игрушка и питомец спят в ногах — и попадают в сон вместе с ней
          it.restOn = bed;
          it.x = Math.round(bed.x + bed.displayWidth / 2 - 9);
          it.y = Math.round(bed.y - bed.displayHeight * 0.35);
          if (it.beh.pet) it.awakeUntil = 0;
        } else {
          it.restOn = null;
          const x0 = bed ? bed.x - 10 : ch.x - 12;
          it.x = Math.round(Phaser.Math.Clamp(x0 + i * 13, room * L.W + 8, (room + 1) * L.W - 8));
          it.y = Math.round(Math.min((bed ? bed.y : ch.y) + 5, L.ROOM_H - 2));
        }
      });
      if (items.length) { sfx.wear(); this.save(); }
      return items.length;
    },

    /** Питомец, уснувший на лежанке или кровати, утопает в ней (рисунок без нижних строк, сам — ниже). */
    updateNest(p) {
      const nest = !!(p.sleeping && !p.dragging && p.restOn && isBed(p.restOn));
      if (nest === !!p.nest) return;
      p.nest = nest;
      // сдвигается рисунок, а не сам питомец: нижние строки скрыты, остальное опущено на их место
      if (nest) {
        p.nestOrigin = [p.originX, p.originY];
        p.setCrop(0, 0, p.width, p.height - NEST);
        p.setDisplayOrigin(p.displayOriginX, p.displayOriginY - NEST);
      } else {
        p.setCrop();
        p.setOrigin(...p.nestOrigin);
      }
    },

    /** Куклу утащили в ящик при открытой вкладке «люди»: она уходит из дома. Вид запоминается, портрет вернёт её. */
    castLeave(ch) {
      this.undress(ch);
      (this.flags.castLook ||= {})[ch.cast] = ch.look;
      if (this.wish?.ch === ch) this.clearWish(false);
      this.endDream(ch);
      if (this.buddy === ch.uid) this.buddy = null;
      this.stat('castleave');
      sfx.hello();
      this.fxHearts.explode(3, ch.x, L.ROOM_H - 10);
      this.removeObj(ch);
      this.refreshCastIcons();
      this.save();
    },
  });
}
