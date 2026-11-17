// Игровая — шестая комната дома (на ленте сразу за концертным залом; старые дома сдвигаются, см. INSERTED
// в places.js). Фон — в scenery.js, рисунки и записи — в playroomart.js. Что там можно делать:
//  • лошадка-качалка: куклу, питомца или игрушку — в седло, тап — качается и ржёт;
//  • шалаш: забраться внутрь (видно только макушку), тап — «ку-ку!» и огоньки-гирлянда;
//  • сухой бассейн: куклу — в шарики (брызги шариков), тап — шарики летят, иногда выныривает игрушка;
//  • кукольный театр: тап — занавес открывается, зайка и мишка пляшут, куклы в комнате хлопают;
//  • валик: красит стены и пол комнат дома (decor.js).
import { R } from './places.js';
import { makePlayroomArt, BALLS } from './playroomart.js';

/** Что выныривает из сухого бассейна. */
const PIT_TOYS = ['rubber duck', 'beach ball', 'toy building block', 'spinning top', 'yo-yo', 'rubber ball'];

export const PLAYROOM_HINTS = {
  rockhorse: { room: R.playroom, seq: () => ['rockhorse'] },
  tent: { room: R.playroom, seq: () => ['tent'] },
  ballpit: { room: R.playroom, seq: () => ['ballpit', 'rubber duck'] },
  puppets: { room: R.playroom, seq: () => ['puppets'] },
  decor: { room: [R.bedroom, R.kitchen, R.bath, R.playroom], when: (s) => !!s.objs.some((o) => o.beh?.roller), seq: () => ['paint roller', 'tex:decor_icon'] },
};
export const PLAYROOM_LURES = [['rockhorse', (b) => b.rocker], ['tent', (b) => b.tent], ['ballpit', (b) => b.pit], ['puppets', (b) => b.puppets],
  ['decor', (b) => b.roller]];

export function makePlayroom(scene) { return makePlayroomArt(scene); }

export function installPlayroom(Room, { L, rnd, pick, sfx }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    /** Игровая один раз обставляется — и в старых сохранениях (комната появляется пустой, вещи ставятся тут). */
    ensurePlayroom() {
      if (this.flags.playroom) return;
      this.flags.playroom = 1;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const x0 = R.playroom * W;
      const put = (id, fx, y) => { const r = this.byId.get(id) || this.findRec(id); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y)) : null; };
      put('tidy-bin', 12 / W, ROOM_H - 2);
      put('tent', 0.17, FLOOR_TOP + 12);
      put('rockhorse', 0.4, FLOOR_TOP + 16);
      put('puppets', 0.6, FLOOR_TOP + 6);
      put('ballpit', 0.83, ROOM_H - 6);
      put('paint roller', 0.5, ROOM_H - 3);
      put('toy building block', 0.27, ROOM_H - 4);
      put('teddy bear', 0.7, ROOM_H - 9);
      put('spinning top', 0.33, ROOM_H - 10);
      this.save();
    },

    /** Тап по вещи игровой. true — обработан. */
    playroomTap(o) {
      const b = o.beh;
      if (b.rocker) { this.rockHorse(o); return true; }
      if (b.tent) { this.tentTap(o); return true; }
      if (b.pit) { this.pitTap(o); return true; }
      if (b.puppets) { this.puppetShow(o); return true; }
      return false;
    },

    /** Кого-то посадили на вещь игровой (зовётся из perchOn). */
    playroomPerch(o, p) {
      if (p.beh.pit) {
        this.ballSplash(p, o.x, 10);
        if (o.kind === 'char') this.time.delayedCall(200, () => sfx.giggle());
        this.stat('ballpit'); this.hintDone('ballpit');
      } else if (p.beh.tent) {
        this.time.delayedCall(150, () => sfx.shh());
      } else if (p.beh.rocker) {
        sfx.neigh();
      }
    },

    ridersOf(p) { return this.objs.filter((x) => x.restOn === p && !x.dragging); },

    /** Лошадка качается вперёд-назад, седок покачивается вместе с ней. */
    rockHorse(h) {
      if (h.rocking) return;
      h.rocking = true;
      const riders = this.ridersOf(h);
      sfx.neigh(); sfx.clop();
      this.time.delayedCall(450, () => sfx.clop());
      this.time.delayedCall(900, () => sfx.clop());
      this.tweens.add({ targets: h, angle: { from: -7, to: 7 }, duration: 260, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { h.angle = 0; h.rocking = false; } });
      for (const r of riders) {
        const y0 = r.y;
        this.tweens.add({ targets: r, y: y0 - 2, duration: 130, yoyo: true, repeat: 5, onComplete: () => { r.y = y0; } });
        if (r.kind === 'char') this.time.delayedCall(300, () => sfx.giggle());
      }
      this.stat('rockhorse'); this.hintDone('rockhorse');
    },

    /** Шалаш: гирлянда загорается или гаснет; кто внутри — выглядывает «ку-ку!». */
    tentTap(t) {
      t.lightsOn = !t.lightsOn;
      t.setTexture(t.lightsOn ? 'tent_b' : 'tent');
      sfx.jingle();
      this.fxSparks.explode(8, t.x, t.y - t.displayHeight * 0.6);
      for (const r of this.ridersOf(t)) {
        const y0 = r.y;
        this.tweens.add({ targets: r, y: y0 - 6, duration: 160, yoyo: true, hold: 260, onComplete: () => { r.y = y0; } });
        this.time.delayedCall(120, () => (r.kind === 'char' ? sfx.titter() : sfx.squeak()));
      }
      this.stat('tent'); this.hintDone('tent');
    },

    /** Шарики разлетаются из бассейна разноцветными брызгами. */
    ballSplash(pit, x, n) {
      for (const c of BALLS) {
        this.fxCrumbs.setParticleTint(Number(`0x${c.slice(1)}`));
        this.fxCrumbs.explode(Math.max(1, Math.round(n / 3)), x + rnd(-6, 6), pit.y - pit.displayHeight + 3);
      }
      sfx.pop();
    },

    /** Тап по бассейну: шарики летят, сидящие подпрыгивают; иногда выныривает игрушка. */
    pitTap(p) {
      if (this.time.now < (p.busyUntil || 0)) return;
      p.busyUntil = this.time.now + 500;
      this.ballSplash(p, p.x, 18);
      for (const r of this.ridersOf(p)) {
        const y0 = r.y;
        this.tweens.add({ targets: r, y: y0 - 4, duration: 140, yoyo: true, onComplete: () => { r.y = y0; } });
      }
      p.taps = (p.taps || 0) + 1;
      if (p.taps % 3 === 0 && this.countIn(roomOf(p), (x) => PIT_TOYS.includes(x.rec.subject)) < 6) {
        const rec = this.findRec(pick(PIT_TOYS));
        if (rec) { sfx.chestOut(); this.popItem(rec, p.x + rnd(-10, 10), p.y - p.displayHeight); }
      }
      this.stat('ballpit'); this.hintDone('ballpit');
    },

    /** Кукольный театр: занавес открывается, зайка и мишка пляшут, потом поклон — и куклы в комнате хлопают. */
    puppetShow(b) {
      if (b.showing) return;
      b.showing = true;
      b.setTexture('puppets_open');
      sfx.swish();
      const top = b.y - b.displayHeight;
      const mk = (key, dx) => this.add.image(Math.round(b.x + dx), Math.round(top + 19), key).setOrigin(0.5, 1).setDepth(b.depth + 0.1);
      const bunny = mk('puppet_bunny', -6);
      const bear = mk('puppet_bear', 6);
      const show = [bunny, bear];
      show.forEach((p, i) => this.tweens.add({ targets: p, y: p.y - 4, duration: 220, yoyo: true, repeat: 6, delay: i * 220 }));
      const tune = [0, 350, 700, 1050, 1400, 1750, 2100];
      tune.forEach((t, i) => this.time.delayedCall(t, () => (i % 2 ? sfx.squeak() : sfx.note(i))));
      this.fxNotes?.explode?.(6, b.x, top + 4);
      this.time.delayedCall(3000, () => {
        show.forEach((p) => p.destroy());
        b.setTexture('puppets');
        b.showing = false;
        sfx.applause();
        const room = roomOf(b);
        for (const c of this.objs) if (c.kind === 'char' && roomOf(c) === room && this.idle?.(c)) this.celebrate(c, 2);
        this.save();
      });
      this.stat('puppets'); this.hintDone('puppets');
    },
  });
}
