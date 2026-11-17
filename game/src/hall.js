// Концертный зал: джем, танцы, прожекторы, микрофон, зрители, занавес, диско-шар.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx, setMusic, musicPlaying, setJamLayer, stopJam, jamActive, onJamStep } from './sfx.js';
import { R } from './places.js';
import { L, RX, rnd, pick } from './core.js';

export function installHall(Room) {
  Object.assign(Room.prototype, {
    /** Тап по инструменту: включить/выключить его партию в общем такте. */
    toggleJam(o) {
      this.stat('jam');
      this.jam ||= new Set();
      const kind = this.instrumentKind(o);
      if (this.jam.has(o)) {
        this.jam.delete(o);
        setJamLayer(kind, false);
        sfx.instrument(kind, 0);
        if (!this.jam.size) this.jamEnded();
        return;
      }
      if (!this.jam.size) {
        // колыбельная уступает место джему
        this.lullabyWas = musicPlaying();
        if (this.lullabyWas) { setMusic(false); this.drawMusicIcon(); }
        onJamStep((kinds) => this.onJamBeat(kinds));
        this.jamStartedAt = this.time.now;
      }
      this.jam.add(o);
      setJamLayer(kind, true);
      this.fxNotes.explode(3, o.x, o.y - o.displayHeight);
      this.tweens.add({ targets: o, y: o.y - 4, duration: 100, yoyo: true });
      for (const c of this.objs) if (c.kind === 'char' && Math.floor(c.x / L.W) === Math.floor(o.x / L.W)) this.checkWish(c, 'music');
    },
    jamEnded() {
      const room = Math.round(this.cameras.main.scrollX / L.W);
      if (this.jam?.size && this.time.now - (this.jamStartedAt || 0) > 3000) this.applause(room);
      stopJam();
      this.jam?.clear();
      if (this.lullabyWas) { setMusic(true); this.drawMusicIcon(); this.lullabyWas = false; }
      if (this.spots) { this.spots.forEach((sp) => sp.destroy()); this.spots = null; }
    },
    /** На каждый удар: играющие инструменты подпрыгивают, персонажи в комнате танцуют. */
    onJamBeat(kinds) {
      if (!this.jam) return;
      for (const o of this.jam) {
        if (!o.active || !this.objs.includes(o)) { this.jam.delete(o); continue; }
        if (!kinds.includes(this.instrumentKind(o))) continue;
        if (!o.dragging) { o.y += 0; this.tweens.add({ targets: o, y: o.y - 2, duration: 70, yoyo: true }); }
        if (Math.random() < 0.35) this.fxNotes.explode(1, o.x, o.y - o.displayHeight);
      }
      if (!this.jam.size) { this.jamEnded(); return; }
      this.jamBeat = (this.jamBeat || 0) + 1;
      if (this.jamBeat % 4 === 0) {
        // зрители на стульях качаются в такт
        for (const a of this.audienceIn(Math.round(this.cameras.main.scrollX / L.W))) {
          if (!a.busy && !a.dragging) this.tweens.add({ targets: a, y: a.y - 2, duration: 90, yoyo: true });
        }
      }
      if (this.jamBeat % 6 === 0) {
        const chars = this.objs.filter((c) => c.kind === 'char' && !c.busy && !c.dragging && !c.sleeping && !c.inTub && this.visible(c));
        if (chars.length) this.dance(pick(chars), pick(['hop', 'spin', 'sway']));
      }
    },
    /** Танец в разных стилях. */
    dance(ch, style) {
      if (style === 'hop') { this.celebrate(ch, 2); return; }
      ch.busy = true;
      ch.setTexture(ch.key + '_blink');
      const done = () => { ch.busy = false; ch.hopBusy = false; ch.setFlipX(false); ch.setTexture(ch.key); };
      // покачивание — твин: взяли куклу в руки, и он обрывается без onComplete; hopBusy снимает «занятость» в startDrag
      if (style !== 'spin') ch.hopBusy = true;
      if (style === 'spin') {
        let n = 0;
        this.time.addEvent({ delay: 110, repeat: 5, callback: () => { ch.setFlipX(!ch.flipX); if (++n === 6) done(); } });
      } else {
        const x0 = ch.x;
        this.tweens.add({ targets: ch, x: x0 + 2, duration: 160, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { ch.x = x0; done(); } });
      }
    },
    /** Прожекторы над сценой, пока играет музыка. */
    updateSpotlights(time) {
      const stage = this.objs.find((o) => o.rec?.id === 'big_stage' && this.visible(o));
      if (!stage || !jamActive()) {
        if (this.spots && !jamActive()) { this.spots.forEach((sp) => sp.destroy()); this.spots = null; }
        if (this.spots && !stage) this.spots.forEach((sp) => sp.setVisible(false));
        return;
      }
      if (!this.spots) {
        this.spots = [0xff7ab8, 0x5ac4f2, 0xffd84a].map((c) => this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.65).setDepth(10002));
      }
      this.spots.forEach((sp, i) => {
        sp.setVisible(true);
        sp.x = stage.x + Math.sin(time / 500 + i * 2.1) * 22;
        sp.y = stage.y - 26 + Math.cos(time / 700 + i) * 4;
        sp.setAlpha(this.night ? 0.9 : 0.45);
      });
    },
    /** Концертный зал (5-я комната): сцена с инструментами и зрительские стулья.
     *  В старых сохранениях сцена стояла в саду — переносим её сюда вместе с инструментами на ней. */
    ensureHall() {
      if (this.flags.hall) return;
      this.flags.hall = true;
      const { W, FLOOR_TOP, ROOM_H } = L;
      const x0 = R.hall * W;
      const cx = Math.round(x0 + W * 0.5);
      const sy = FLOOR_TOP + 6;
      let stage = this.flags.stage && this.objs.find((o) => o.rec?.id === 'big_stage' && o.x >= R.garden * W && o.x < (R.garden + 1) * W);
      if (stage) {
        const dx = cx - stage.x, dy = sy - stage.y;
        for (const o of this.objs) if (o.restOn === stage) { o.x += dx; o.y += dy; }
        stage.x = cx; stage.y = sy;
      } else {
        stage = this.spawnItem(this.big.stage, cx, sy);
        for (const [sub, dx] of [['xylophone', -14], ['acoustic guitar', 12]]) {
          const r = this.findRec(sub);
          if (r) { const it = this.spawnItem(r, stage.x + dx, stage.y - 9); it.restOn = stage; }
        }
      }
      this.flags.stage = true;
      const put = (subj, fx, y) => { const r = this.findRec(subj); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y)) : null; };
      put('drum set', 0.22, FLOOR_TOP + 10);
      put('tambourine', 0.78, FLOOR_TOP + 12);
      for (const fx of [0.3, 0.42, 0.58, 0.7]) put('chair', fx, ROOM_H - 3);
      put('heart balloon', 0.9, FLOOR_TOP + 4);
      this.save();
    },
    /** Микрофон на сцене, диско-шар под потолком и мишка-зритель на стуле — и в старых сохранениях. */
    ensureHall2() {
      if (this.flags.hall2) return;
      this.flags.hall2 = true;
      const { W, FLOOR_TOP } = L;
      const x0 = R.hall * W;
      const inHall = (o) => o.x >= x0 && o.x < x0 + W;
      const stage = this.objs.find((o) => o.beh?.stage && inHall(o));
      if (!this.objs.some((o) => o.beh?.mic)) {
        const mic = stage ? this.spawnItem(this.byId.get('microphone'), stage.x, stage.y - 9) : this.spawnItem(this.byId.get('microphone'), Math.round(x0 + W * 0.5), FLOOR_TOP + 16);
        if (stage) mic.restOn = stage;
      }
      if (!this.objs.some((o) => o.beh?.disco)) this.spawnItem(this.byId.get('disco-ball'), Math.round(x0 + W * 0.7), 31);
      const chair = this.objs.filter((o) => o.beh?.seat && inHall(o)).sort((a, b) => a.x - b.x)[0];
      const teddy = this.findRec('teddy bear');
      if (chair && teddy && !this.objs.some((o) => o.restOn === chair)) this.sitOn(this.spawnItem(teddy, chair.x, chair.y), chair, true);
      this.save();
    },
    /** Сесть на стул: персонаж, питомец или игрушка — в зале они становятся зрителями. */
    sitOn(o, seat, quiet = false) {
      o.x = Math.round(seat.x);
      o.y = Math.round(seat.y - (o.kind === 'char' ? 2 : 6)); // кукла сидит: подол на сиденье, туфли свисают
      o.restOn = seat;
      o.inTub = null;
      if (seat.beh.swing) seat.amp = Math.max(seat.amp || 0, 0.3);
      if (quiet) return;
      sfx.drop();
      if (seat.beh.swing) { sfx.whee(); this.hintDone('swing'); if (o.kind === 'char') this.time.delayedCall(300, () => sfx.giggle()); return; }
      this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
      if (Math.floor(seat.x / L.W) === R.hall) this.hintDone('audience');
    },
    audienceIn(room) {
      return this.objs.filter((o) => o.restOn?.beh?.seat && Math.floor(o.x / L.W) === room && !o.dragging);
    },
    /** Выйти на сцену: персонаж встаёт на помост; с микрофоном в руке — сразу поёт. */
    onStage(ch, stage, x) {
      ch.x = Math.round(Phaser.Math.Clamp(x, stage.x - stage.displayWidth / 2 + 8, stage.x + stage.displayWidth / 2 - 8));
      ch.y = Math.round(stage.y - 9);
      ch.restOn = stage;
      sfx.drop();
      if (ch.slots.hand?.beh.mic) this.time.delayedCall(300, () => this.sing(ch));
    },
    /** Спеть в микрофон: «ля-ля» по нотам, рот открывается, летят нотки; зрители хлопают. */
    sing(ch) {
      if (ch.busy || ch.sleeping) return;
      ch.busy = true;
      const dur = sfx.sing(7) * 1000;
      const m = this.mouth(ch);
      let i = 0;
      const ev = this.time.addEvent({
        delay: 140, loop: true, callback: () => {
          ch.setTexture(ch.key + (i++ % 2 ? '_blink' : '_open'));
          if (i % 2) this.fxNotes.explode(1, m.x + (ch.flipX ? -3 : 3), m.y - 2);
        },
      });
      this.tweens.add({ targets: ch, y: ch.y - 2, duration: 280, yoyo: true, repeat: Math.max(0, Math.round(dur / 560) - 1), ease: 'Sine.easeInOut' });
      this.time.delayedCall(dur + 100, () => {
        ev.remove();
        ch.busy = false;
        ch.setTexture(ch.key + '_smile');
        this.time.delayedCall(600, () => { if (!ch.busy) ch.setTexture(ch.key); });
        this.hintDone('mic', ch);
        this.checkWish(ch, 'music');
        this.applause(Math.floor(ch.x / L.W));
      });
    },
    /** Аплодисменты: зрители на стульях подпрыгивают, на сцену летят цветы и сердечки. */
    applause(room) {
      const fans = this.audienceIn(room);
      if (!fans.length || this.time.now - (this.lastApplause || 0) < 2500) return;
      this.lastApplause = this.time.now;
      sfx.applause();
      const stage = this.objs.find((o) => o.beh?.stage && Math.floor(o.x / L.W) === room);
      const tx = stage ? stage.x : room * L.W + L.W / 2;
      const ty = stage ? stage.y - 12 : L.FLOOR_TOP;
      const flowers = ['rose', 'tulip', 'daisy flower', 'sunflower'].map((sub) => this.findRec(sub)).filter(Boolean);
      fans.forEach((a, i) => {
        this.time.delayedCall(i * 90, () => {
          if (!a.active) return;
          if (a.kind === 'char' && !a.busy) { a.setTexture(a.key + '_smile'); this.time.delayedCall(1300, () => { if (!a.busy) a.setTexture(a.key); }); }
          this.tweens.add({ targets: a, y: a.y - 4, duration: 110, yoyo: true, repeat: 3 });
          this.fxHearts.explode(2, a.x, a.y - a.displayHeight);
          const r = flowers.length ? pick(flowers) : null;
          if (!r) return;
          // цветок летит дугой на сцену и тает (только эффект — не предмет)
          const f = this.add.image(a.x, a.y - a.displayHeight, r.cat, r.frame).setDepth(16000);
          const fx = tx + rnd(-18, 18);
          this.tweens.add({ targets: f, x: fx, duration: 700 });
          this.tweens.add({
            targets: f, y: Math.min(f.y, ty) - 20, duration: 320, ease: 'Quad.easeOut',
            onComplete: () => this.tweens.add({ targets: f, y: ty, duration: 380, ease: 'Quad.easeIn', onComplete: () => this.tweens.add({ targets: f, alpha: 0, delay: 900, duration: 400, onComplete: () => f.destroy() }) }),
          });
        });
      });
    },
    /** Занавес из двух половин: открыт — видны только края, закрыт — сходится посередине перед сценой. */
    buildCurtain() {
      const { W, FLOOR_TOP } = L;
      const hw = Math.ceil(W / 2) + 1;
      const h = FLOOR_TOP + 6 - 10;
      const key = `hall_curtain_${hw}x${h}`;
      if (!this.textures.exists(key)) {
        const c = document.createElement('canvas');
        c.width = hw; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#b8264a'; g.fillRect(0, 0, hw, h);
        for (let x = 0; x < hw; x += 6) { g.fillStyle = '#8e1838'; g.fillRect(x + 3, 0, 2, h); g.fillStyle = '#d8406a'; g.fillRect(x + 1, 0, 1, h); }
        g.fillStyle = '#ffd84a'; g.fillRect(0, h - 2, hw, 1);
        for (let x = 1; x < hw; x += 3) g.fillRect(x, h - 1, 1, 1); // бахрома
        this.textures.addCanvas(key, c);
      }
      const x0 = R.hall * W;
      this.curtainCw = Math.round(W * 0.16);
      this.curtain = [0, 1].map((i) => {
        const img = this.add.image(0, 10, key).setOrigin(0, 0).setDepth(FLOOR_TOP + 6.9).setInteractive();
        img.curtain = true;
        return img;
      });
      this.curtain[1].setFlipX(true);
      this.placeCurtain(!!this.flags.curtainClosed);
    },
    placeCurtain(closed, animate = false) {
      const { W } = L;
      const x0 = R.hall * W;
      const hw = this.curtain[0].width;
      const pos = closed ? [x0 + W / 2 - hw, x0 + W / 2] : [x0 + this.curtainCw - hw, x0 + W - this.curtainCw];
      this.curtain.forEach((c, i) => {
        this.tweens.killTweensOf(c);
        if (animate) this.tweens.add({ targets: c, x: Math.round(pos[i]), duration: 750, ease: 'Sine.easeInOut', onUpdate: () => this.clipCurtain() });
        else c.x = Math.round(pos[i]);
      });
      this.clipCurtain();
    },
    /** Половины открытого занавеса шире кулис: всё, что левее и правее зала, не рисуется и не ловит касания. */
    clipCurtain() {
      const [c, r] = this.curtain || [];
      if (!c) return;
      const cut = Phaser.Math.Clamp(Math.ceil(R.hall * L.W - c.x), 0, c.width);
      c.setCrop(cut, 0, c.width - cut, c.height);
      c.input?.hitArea.setTo(cut, 0, c.width - cut, c.height);
      // правая половина: за залом на ленте теперь двор села — туда она заходить не должна
      const keep = Phaser.Math.Clamp(Math.floor((R.hall + 1) * L.W - r.x), 0, r.width);
      r.setCrop(r.width - keep, 0, keep, r.height); // картинка отражена: обрезка задаётся в координатах текстуры
      r.input?.hitArea.setTo(0, 0, keep, r.height);
    },
    toggleCurtain() {
      const closed = !this.flags.curtainClosed;
      this.flags.curtainClosed = closed;
      this.placeCurtain(closed, true);
      sfx.swish();
      this.hintDone('curtain');
      if (!closed) {
        // начало концерта: фанфары, конфетти, зрители хлопают
        const { W } = L;
        const cx = R.hall * W + W / 2;
        this.time.delayedCall(450, () => {
          sfx.fanfare();
          for (let i = 0; i < 5; i++) this.time.delayedCall(i * 120, () => this.fxSparks.explode(10, cx + rnd(-W * 0.35, W * 0.35), rnd(14, 34)));
          this.applause(4);
        });
      }
      this.save();
    },
    /** Диско-шар: тап — крутится, свет приглушается, по залу бегают цветные зайчики. */
    toggleDisco(ball) {
      if (this.discoBall) { this.discoOff(); sfx.click(); return; }
      this.discoBall = ball;
      this.hintDone('disco');
      this.itemDream('disco', ball, 'planet', 14000);
      sfx.sparkle();
      const room = Math.floor(ball.x / L.W);
      this.discoDim = this.add.rectangle(room * L.W, 0, L.W, L.ROOM_H, 0x140c38, 0).setOrigin(0).setDepth(10000);
      this.tweens.add({ targets: this.discoDim, fillAlpha: 0.4, duration: 400 });
      const cols = [0xff7ab8, 0x5ac4f2, 0xffd84a, 0x7ad9b5, 0xc48ff2, 0xff9a5a, 0xffffff, 0x9fdcff];
      this.discoSpots = cols.map((c) => this.add.image(ball.x, ball.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.3).setDepth(10002).setAlpha(0.85));
      for (const c of this.objs) if (c.kind === 'char' && this.visible(c)) this.time.delayedCall(rnd(200, 900), () => { if (!c.busy && !c.sleeping) this.dance(c, pick(['hop', 'spin', 'sway'])); });
    },
    discoOff() {
      if (this.discoBall?.active) this.discoBall.setTexture('disco_ball');
      this.discoBall = null;
      this.discoSpots?.forEach((s) => s.destroy());
      this.discoSpots = null;
      const dim = this.discoDim;
      this.discoDim = null;
      if (dim) this.tweens.add({ targets: dim, fillAlpha: 0, duration: 300, onComplete: () => dim.destroy() });
    },
    updateDisco(time) {
      const ball = this.discoBall;
      if (!ball) return;
      if (!ball.active || !this.objs.includes(ball)) { this.discoOff(); return; }
      ball.setTexture(Math.floor(time / 220) % 2 ? 'disco_ball_b' : 'disco_ball');
      const x0 = Math.floor(ball.x / L.W) * L.W;
      this.discoSpots.forEach((sp, i) => {
        sp.x = x0 + L.W * (0.5 + 0.45 * Math.sin(time / 900 + i * 0.8));
        sp.y = 14 + (L.ROOM_H - 20) * (0.5 + 0.5 * Math.sin(time / 650 + i * 1.7));
      });
    },
    instrumentKind(o) {
      const s = o.rec.subject;
      return RX.drum.test(s) ? 'drum' : RX.bell.test(s) ? 'bell' : RX.string.test(s) ? 'string' : 'wind';
    },
    /** Все инструменты комнаты играют вместе: аккорд-арпеджио, каждый своим тембром, персонажи танцуют. */
    playBand(band) {
      const chords = [[0, 2, 4, 7], [1, 3, 5, 7], [2, 4, 6, 9], [0, 3, 5, 7]];
      const chord = pick(chords);
      band.sort((a, b) => a.x - b.x).forEach((o, i) => {
        const delay = i * 0.14;
        sfx.instrument(this.instrumentKind(o), chord[i % chord.length], delay);
        this.time.delayedCall(delay * 1000, () => {
          this.fxNotes.explode(2, o.x, o.y - o.displayHeight);
          this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
        });
      });
      const room = Math.floor(band[0].x / L.W);
      for (const c of this.objs) {
        if (c.kind === 'char' && !c.busy && !c.sleeping && Math.floor(c.x / L.W) === room) this.celebrate(c, 2);
      }
      return band.length;
    },
    danceTick() {
      if (!(musicPlaying() || this.discoBall) || this.dress || this.albumUi || Math.random() < 0.4) return;
      const chars = this.objs.filter((c) => c.kind === 'char' && !c.busy && !c.dragging && !c.sleeping && this.visible(c));
      if (chars.length) this.celebrate(pick(chars), 2);
    },
  });
}
