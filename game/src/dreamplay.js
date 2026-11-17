// Жизнь внутри сна — общее для всех миров:
//  • желания жителей: над жителем облачко с картинкой; принесли — фанфары и редкий сувенир;
//  • приманки: то, чего в этом мире ещё не пробовали, подпрыгивает с искорками, пока ребёнок думает;
//  • кукла идёт (плывёт, прыгает) туда, куда тапнули;
//  • событие визита: раз в полминуты через мир кто-нибудь пролетает или пробегает.
// Что мир умеет, он описывает сам (dreamworlds.js): wants, lures, events; жители с желаниями помечены wisher.
import Phaser from 'phaser';

export function installDreamPlay(Dream, ENV) {
  const { rnd, pick, sfx, DREAM_THEMES } = ENV;
  Object.assign(Dream.prototype, {
    /** Вызывается из create(), когда мир уже построен. */
    initPlay() {
      this.wishNow = null;
      this.wishLast = null;
      this.wishes = 0;
      this.lureI = 0;
      this.evLast = -1;
      this.walked = false;
      this.rare = (DREAM_THEMES.find((t) => t.world === this.key)?.rare || []).filter((sub) => this.room.findRec(sub));
      this.time.delayedCall(4500, () => this.nextWish());
      this.time.addEvent({ delay: 2600, loop: true, callback: () => this.lureTick() });
      this.time.delayedCall(rnd(10000, 15000), () => this.worldEvent());
    },

    // ---------------------------------------------------------------- желания жителей
    nextWish() {
      if (this.leaving || this.wishNow) return;
      const all = this.actors.filter((a) => a.active && a.wisher);
      if (!all.length) return;
      const free = all.filter((a) => a.visible && !a.hid && !a.dragging && !a.busy);
      const who = pick(free.filter((a) => a !== this.wishLast?.who)) || pick(free);
      const wants = (this.def.wants || this.souv).filter((sub) => this.room.findRec(sub));
      const sub = pick(wants.filter((x) => x !== this.wishLast?.sub)) || pick(wants);
      if (!who || !sub) { this.time.delayedCall(4000, () => this.nextWish()); return; }
      const rec = this.room.findRec(sub);
      const bubble = this.add.image(who.x, who.y, 'bubble').setOrigin(0.2, 1).setDepth(7000).setScale(0);
      const icon = (rec.tex ? this.add.image(0, 0, `${rec.tex}_icon`) : this.add.image(0, 0, rec.cat, rec.frame)).setDepth(7001).setAlpha(0);
      this.wishNow = { who, sub, rec, bubble, icon };
      sfx.squeak();
      this.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.easeOut', onComplete: () => bubble.setScale(1) });
      this.tweens.add({ targets: icon, alpha: 1, duration: 200, delay: 150 });
      this.jump(who, 4, 130);
    },

    clearWish() {
      const w = this.wishNow;
      if (!w) return;
      this.wishNow = null;
      w.bubble.destroy();
      w.icon.destroy();
    },

    /** Предмет отпустили у жителя с желанием (или прямо на его облачко): это то, что он просил? */
    tryWish(it, q) {
      const w = this.wishNow;
      if (!w || !w.who.active || it.rec?.subject !== w.sub) return false;
      const who = w.who;
      const top = who.y - who.displayHeight;
      if (q.x < who.x - 16 || q.x > who.x + 26 || q.y < top - 30 || q.y > who.y + 10) return false;
      this.grantWish(it);
      return true;
    },

    grantWish(it) {
      const w = this.wishNow;
      const { who, bubble } = w;
      this.fxSparks.explode(12, bubble.x + 8, bubble.y - 12);
      this.clearWish();
      this.wishLast = w;
      this.wishes++;
      this.removeActor(it);
      sfx.fanfare();
      this.fxHearts.explode(6, who.x, who.y - who.displayHeight);
      this.halt(who);
      this.dance(who, 8);
      this.room.stat('dreamwish');
      // благодарность: редкий сувенир — такой в этом мире больше ниоткуда не взять
      this.time.delayedCall(700, () => {
        if (this.leaving || !who.active) return;
        const fresh = this.rare.filter((sub) => !this.room.stickers.has('dream', sub));
        const sub = pick(fresh.length ? fresh : this.rare);
        this.gift(who.x + (who.x < this.W / 2 ? 18 : -18), Math.max(who.y - 10, 20), sub || null, { keep: true, rare: true });
        sfx.sparkle();
      });
      this.time.delayedCall(9000, () => this.nextWish());
    },

    // ---------------------------------------------------------------- приманки
    /** Фичу мира попробовали — больше её не подсказываем (помнится между снами). */
    tried(key) {
      (this.room.flags.dreamTried ||= {})[`${this.key}.${key}`] = true;
    },

    isTried(key) { return !!this.room.flags.dreamTried?.[`${this.key}.${key}`]; },

    lureTick() {
      if (this.leaving || this.press || performance.now() - this.lastInput < 3500) return;
      const list = (this.def.lures || []).filter((l) => !this.isTried(l.key));
      if (!list.length) return;
      const l = list[this.lureI++ % list.length];
      const objs = [].concat(l.who?.(this) || []).filter((a) => a && a.active && a.visible && !a.dragging && !a.busy && !a.moving && !a.jumping && !a.mount);
      objs.forEach((a, i) => this.time.delayedCall(i * 170, () => {
        if (!a.active || a.dragging || a.moving || a.jumping || a.busy) return;
        this.fxSparks.explode(4, a.x, a.y - a.displayHeight);
        this.jump(a, 4, 130);
      }));
      l.show?.(this);
    },

    // ---------------------------------------------------------------- кукла идёт за пальцем
    leadDoll() {
      const d = this.lead?.active ? this.lead : this.dolls[0];
      return d && d.active && !d.dragging && !d.busy && !d.mount && !d.jumping ? d : null;
    },

    /** Тап по пустому месту: мир откликается (пузыри, искорки), а кукла отправляется туда. */
    groundTap(q) {
      this.def.skyTap?.(this, q);
      const d = this.leadDoll();
      if (!d) return;
      if (!this.walked) { this.walked = true; this.room.stat('dreamwalk'); }
      const { W, H, GY } = this;
      const g = this.def.gravity;
      this.halt(d);
      d.plat = null;
      if (g === 'water') {
        this.moveTo(d, q.x, Phaser.Math.Clamp(q.y + d.displayHeight / 2, 34, GY + 4), { speed: 60, wave: 3, done: () => this.bob(d) });
      } else if (g === 'cloud') {
        // прыжок по небу: приземлится на облако под собой
        sfx.whee();
        this.moveTo(d, q.x, Phaser.Math.Clamp(q.y + d.displayHeight / 2, 34, H - 4), { dur: 360, ease: 'Sine.easeOut', done: () => this.settle(d) });
      } else {
        const ar = this.def.walk?.(this) || [16, W - 16, GY + 4, H - 4];
        const moon = g === 'moon';
        this.moveTo(d, Phaser.Math.Clamp(q.x, ar[0], ar[1]), Phaser.Math.Clamp(q.y, ar[2], ar[3]), {
          speed: moon ? 40 : 62, hops: true, hopH: moon ? 7 : 2, hopLen: moon ? 20 : 9, step: () => sfx.step(),
          done: () => this.def.landed?.(this, d),
        });
      }
    },

    // ---------------------------------------------------------------- события визита
    worldEvent() {
      if (this.leaving) return;
      const evs = this.def.events || [];
      if (evs.length) {
        let i = Math.floor(Math.random() * evs.length);
        if (i === this.evLast && evs.length > 1) i = (i + 1) % evs.length;
        this.evLast = i;
        evs[i](this);
      }
      this.time.delayedCall(rnd(30000, 44000), () => this.worldEvent());
    },

    /** Гость события: тап — искорки; первый пойманный из компании дарит подарок. */
    guestTap(grp, a) {
      sfx.sparkle();
      this.fxSparks.explode(8, a.x, a.y - a.displayHeight / 2);
      this.fxHearts.explode(1, a.x, a.y - a.displayHeight);
      if (grp.gifted) return;
      grp.gifted = true;
      this.room.stat('dreamevent');
      this.gift(a.x, Math.max(a.y - 4, 16), grp.gift || null, grp.gift ? { keep: true } : {});
    },

    /**
     * Гости проходят через весь экран: subs — кто (предметы каталога), o.tex — своя текстура вместо каталога,
     * o.y — высота, o.dys — сдвиги по высоте, o.gap — расстояние, o.ground — бегут по земле вприпрыжку.
     */
    flyby(subs, o = {}) {
      const dir = o.dir || (Math.random() < 0.5 ? 1 : -1); // 1 — слева направо
      const grp = { gifted: false, gift: o.gift };
      const gap = o.gap || 18;
      const y0 = o.y ?? 40;
      return subs.map((sub, i) => {
        const x = dir > 0 ? -18 - i * gap : this.W + 18 + i * gap;
        const opt = { kind: 'guest', drag: false, fly: !o.ground, sc: o.sc, noFlip: o.noFlip };
        const a = o.tex ? this.img(o.tex, x, y0 + (o.dys?.[i] ?? 0), opt) : this.spr(sub, x, y0 + (o.dys?.[i] ?? 0), opt);
        a.tap = () => { this.guestTap(grp, a); o.tap?.(a); };
        this.moveTo(a, dir > 0 ? this.W + 24 + (subs.length - i) * gap : -24 - (subs.length - i) * gap, a.y, {
          free: true, ease: 'Linear', speed: o.speed || 40, wave: o.ground ? 0 : o.wave ?? 3, hops: !!o.ground, hopH: o.hopH ?? 3,
          done: () => { if (a.active) this.removeActor(a); },
        });
        o.each?.(a, i);
        return a;
      });
    },

    /** Что-то падает с неба и становится подарком (звезда, большая снежинка). */
    skyfall(subject, o = {}) {
      const x0 = rnd(30, this.W - 30);
      const rec = this.room.findRec(subject);
      const a = rec ? this.add.image(x0 - 60, -10, rec.cat, rec.frame) : this.add.image(x0 - 60, -10, 'star_px');
      a.setDepth(5500);
      const ty = this.GY + this.band * 0.3;
      sfx.sparkle();
      this.tweens.add({
        targets: a, x: x0, y: ty, duration: 1500, ease: 'Quad.easeIn',
        onUpdate: () => { if (Math.random() < 0.5) this.fxSparks.explode(1, a.x, a.y); },
        onComplete: () => {
          a.destroy();
          if (this.leaving) return;
          this.fxSparks.explode(16, x0, ty);
          sfx.pop();
          this.gift(x0, ty, o.gift ?? subject, { keep: true });
        },
      });
    },

    /** Шарики (или что угодно лёгкое) всплывают снизу; тап — хлоп и конфетти, первый лопнутый дарит подарок. */
    floatUp(subs) {
      const grp = { gifted: false };
      subs.forEach((sub, i) => {
        const a = this.spr(sub, rnd(24, this.W - 24), this.H + 20 + i * 14, { kind: 'guest', drag: false, fly: true, noFlip: true });
        a.tap = () => {
          sfx.pop();
          this.fxCrumbs.setParticleTint(pick([0xff5a6f, 0xffd84a, 0x7ad9b5, 0x5ac4f2, 0xc48ff2]));
          this.fxCrumbs.explode(14, a.x, a.y - 8);
          if (!grp.gifted) { grp.gifted = true; this.room.stat('dreamevent'); this.gift(a.x, Math.max(a.y - 4, 16)); }
          this.removeActor(a);
        };
        this.act(a, { y: -24, duration: 9000 + i * 900, ease: 'Sine.easeIn', onComplete: () => { if (a.active) this.removeActor(a); } });
        this.act(a, { x: a.x + rnd(-14, 14), duration: 1600, yoyo: true, repeat: 4, ease: 'Sine.easeInOut' });
      });
    },

    // ---------------------------------------------------------------- кадр
    playUpdate() {
      const w = this.wishNow;
      if (!w) return;
      if (!w.who.active) { this.clearWish(); this.time.delayedCall(3000, () => this.nextWish()); return; }
      const top = w.who.y - w.who.displayHeight;
      w.bubble.x = Math.round(Phaser.Math.Clamp(w.who.x + 3, 8, this.W - 26));
      w.bubble.y = Math.round(Math.max(top + 3, 28));
      w.icon.x = w.bubble.x + 9;
      w.icon.y = w.bubble.y - 14;
    },
  });
}
