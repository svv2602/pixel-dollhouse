// Питомцы: наряды, щётка, игры, прыжки по полу и еда.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx } from './sfx.js';
import { L, RX, rnd, pick } from './core.js';

export function installPets(Room) {
  Object.assign(Room.prototype, {
    /** Надеть на питомца шапку/бантик/ушки — уменьшенной копией (по пикселям). */
    petWear(pet, o) {
      const old = pet.slots.pethat;
      if (old) { old.owner = null; old.slot = null; old.x = pet.x + 14; this.settle(old); }
      pet.slots.pethat = o;
      o.owner = pet;
      o.slot = 'pethat';
      const key = this.fitTex(o.rec, 10, 8);
      if (key) { o.setTexture(key); o.fitted = 'pethat'; }
      sfx.wear(); sfx.squeak();
      this.fxSparks.explode(6, pet.x, pet.y - pet.displayHeight);
      this.tweens.add({ targets: pet, y: pet.y - 4, duration: 120, yoyo: true });
    },
    /** Расчёсывание: урчание, искорки, сердечки; шёрстка блестит какое-то время. */
    brushPet(pet) {
      const now = this.time.now;
      if (now < (pet.brushT || 0)) return;
      pet.brushT = now + 260;
      pet.shinyUntil = now + 9000;
      pet.strokes = (pet.strokes || 0) + 1;
      sfx.purr();
      this.fxSparks.explode(2, pet.x + rnd(-5, 5), pet.y - pet.displayHeight * 0.6);
      if (pet.strokes % 4 === 0) {
        this.fxHearts.explode(3, pet.x, pet.y - pet.displayHeight);
        if (!pet.walking) this.tweens.add({ targets: pet, y: pet.y - 4, duration: 120, yoyo: true });
        this.farmBrushed(pet); // с овцы — клубок шерсти
      }
    },
    /** Поиграть с игрушкой: игрушка подпрыгивает, питомец скачет вокруг. */
    playWith(p, t) {
      if (!t.active || t.owner || t.dragging) return;
      const fav = t.rec.subject === this.favToy(p);
      this.tweens.add({ targets: t, y: t.y - 8, duration: 160, yoyo: true, repeat: fav ? 2 : 0, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: p, y: p.y - 5, duration: 130, yoyo: true, repeat: 2, onRepeat: () => p.setFlipX(!p.flipX) });
      this.fxHearts.explode(fav ? 5 : 1, p.x, p.y - p.displayHeight);
      sfx.squeak();
      if (fav) this.time.delayedCall(300, () => sfx.squeak());
    },
    petTick() {
      if (this.dress || this.albumUi || this.press?.moved) return;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const pets = this.objs.filter((o) => o.kind === 'item' && o.beh.pet && !o.owner && !o.dragging && !o.restOn && !o.inTub
        && !o.walking && o.y >= FLOOR_TOP && !RX.noWalk.test(o.rec.subject));
      if (!pets.length) return;
      // еда на полу рядом -> подбежать и съесть
      const food = this.objs.filter((f) => f.kind === 'item' && f.beh.edible && !f.owner && !f.dragging && !f.restOn
        && !f.eating && f.y >= FLOOR_TOP);
      for (const p of pets) {
        const f = food.find((it) => Math.abs(it.x - p.x) < 70 && Math.abs(it.y - p.y) < 30);
        if (f && Math.random() < 0.6) {
          this.hopTo(p, f.x + (p.x < f.x ? -8 : 8), f.y, () => {
            if (f.active && !f.owner && !f.dragging && this.objs.includes(f)) { this.feedPet(p, f); this.save(); }
          });
          return;
        }
      }
      // игрушка на полу рядом -> подбежать и поиграть (любимая — больше радости)
      const toys = this.objs.filter((t) => t.kind === 'item' && t.rec.cat === 'toy' && !t.owner && !t.dragging && !t.restOn && !t.inTub && t.y >= FLOOR_TOP);
      for (const p of pets) {
        const t = toys.find((it) => Math.abs(it.x - p.x) < 60 && Math.abs(it.y - p.y) < 30 && Math.floor(it.x / W) === Math.floor(p.x / W));
        if (t && Math.random() < 0.45) {
          this.hopTo(p, t.x + (p.x < t.x ? -9 : 9), t.y, () => this.playWith(p, t));
          return;
        }
      }
      // двое питомцев рядом иногда играют друг с другом
      if (pets.length >= 2 && Math.random() < 0.3) {
        const a = pick(pets);
        const b = pets.find((x) => x !== a && Math.abs(x.x - a.x) < 50 && Math.abs(x.y - a.y) < 25);
        if (b) {
          const mx = Math.round((a.x + b.x) / 2);
          this.hopTo(a, mx - 6, a.y, () => { a.setFlipX(false); this.fxHearts.explode(2, mx, a.y - 14); sfx.squeak(); });
          this.hopTo(b, mx + 6, b.y, () => b.setFlipX(true));
          return;
        }
      }
      if (Math.random() < 0.5) return; // не все время в движении
      const p = pick(pets);
      const rx0 = Math.floor(p.x / W) * W; // своя комната
      const tx = Math.round(Phaser.Math.Clamp(p.x + rnd(-30, 30), rx0 + 10, rx0 + W - 10));
      const ty = Math.round(Phaser.Math.Clamp(p.y + rnd(-6, 6), FLOOR_TOP + 4, ROOM_H - 2));
      this.hopTo(p, tx, ty, () => this.save());
    },
    /** Прыжками к точке: x/y плавно, сверху — подскоки по 3 пикселя. */
    hopTo(p, tx, ty, done) {
      p.walking = true;
      p.setFlipX(tx < p.x);
      const hops = Math.max(1, Math.round(Math.hypot(tx - p.x, ty - p.y) / 7));
      const dur = hops * 200;
      const base = { y: p.y };
      this.tweens.add({ targets: p, x: tx, duration: dur });
      this.tweens.add({ targets: base, y: ty, duration: dur });
      p.walkTween = this.tweens.addCounter({
        from: 0, to: hops * Math.PI, duration: dur,
        onUpdate: (tw) => { p.y = Math.round(base.y - Math.abs(Math.sin(tw.getValue())) * 3); },
        onComplete: () => {
          p.y = Math.round(ty);
          p.walking = false;
          p.walkTween = null;
          if (Math.random() < 0.3) sfx.squeak();
          done?.();
        },
      });
    },
    feedPet(pet, o) {
      this.objs = this.objs.filter((x) => x !== o);
      this.tweens.add({
        targets: o, x: pet.x, y: pet.y - 4, duration: 220,
        onComplete: () => {
          o.destroy();
          sfx.chew(); sfx.chew(0.15);
          this.tweens.add({ targets: pet, y: pet.y - 5, duration: 140, yoyo: true, repeat: 1 });
          this.time.delayedCall(320, () => { sfx.squeak(); this.fxHearts.explode(4, pet.x, pet.y - pet.displayHeight); });
          this.farmFed(pet); // корова после еды даёт молоко, курица — яйцо
        },
      });
    },
  });
}
