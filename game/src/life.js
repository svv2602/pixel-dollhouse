// Жизнь кукол: идут за игроком в соседнюю комнату, здороваются, глазеют на то, что несут,
// болтают друг с другом, зевают ночью. Ничего не сдвигает расставленное ребёнком: всё — на месте.

export function installLife(Room, { L, rnd, pick, sfx }) {
  Object.assign(Room.prototype, {
    /** Кукла свободна: не ест, не спит, не идёт и её не держат. */
    idle(c) { return c.kind === 'char' && c.active && !c.busy && !c.dragging && !c.sleeping && !c.walking; },

    /** Шагом к точке (лёгкие подскоки, топоток). */
    strollTo(ch, tx, ty, done) {
      ch.walkTween?.stop();
      ch.walking = true;
      ch.setFlipX(tx < ch.x);
      const x0 = ch.x;
      const y0 = ch.y;
      const steps = Math.max(1, Math.round(Math.hypot(tx - x0, ty - y0) / 9));
      let last = -1;
      ch.walkTween = this.tweens.addCounter({
        from: 0, to: 1, duration: steps * 170,
        onUpdate: (tw) => {
          const k = tw.getValue();
          const ph = k * steps;
          ch.x = Math.round(x0 + (tx - x0) * k);
          ch.y = Math.round(y0 + (ty - y0) * k - Math.abs(Math.sin(ph * Math.PI)) * 2);
          if (Math.floor(ph) !== last) { last = Math.floor(ph); if (this.visible(ch)) sfx.step(); }
        },
        onComplete: () => {
          ch.x = Math.round(tx);
          ch.y = Math.round(ty);
          ch.walking = false;
          ch.walkTween = null;
          ch.setFlipX(false);
          done?.();
        },
      });
    },

    /** «Привет!»: подпрыгнуть и помахать сердечком. */
    wave(ch, quiet = false) {
      if (!this.idle(ch)) return;
      if (!quiet) sfx.hello();
      ch.greetedAt = this.time.now;
      this.fxHearts.explode(1, ch.x, ch.y - ch.displayHeight);
      ch.setTexture(ch.key + '_blink');
      const y0 = ch.y;
      this.tweens.add({
        targets: ch, y: y0 - 5, duration: 130, yoyo: true, repeat: 1, ease: 'Quad.easeOut',
        onComplete: () => { ch.y = y0; if (this.idle(ch)) ch.setTexture(ch.key); },
      });
    },

    /** Игрок перешёл в другую комнату: местные здороваются, а кукла, с которой играли последней, идёт следом. */
    onRoomEnter(room, prev) {
      const here = this.objs.filter((c) => this.idle(c) && !c.inTub && Math.floor(c.x / L.W) === room
        && this.time.now - (c.greetedAt || -1e9) > 20000);
      here.slice(0, 3).forEach((c, i) => this.time.delayedCall(250 + i * 200, () => this.wave(c, i > 0)));
      this.time.delayedCall(650, () => {
        const cam = this.cameras.main;
        if (this.targetRoom !== room || Math.abs(cam.scrollX - room * L.W) > 2) return; // уже листают дальше
        if (this.press?.moved || this.dress || this.albumUi || this.mapUi) return;
        const chars = this.objs.filter((c) => c.kind === 'char');
        const buddy = chars.find((c) => c.uid === this.buddy) || chars.sort((a, b) => a.uid - b.uid)[0];
        if (!buddy || Math.floor(buddy.x / L.W) === room) return;
        // сидит, спит, купается — не тревожим: её оставили там нарочно
        if (!this.idle(buddy) || buddy.restOn || buddy.inTub || buddy.y < L.FLOOR_TOP) return;
        this.enterRoom(buddy, room, room > prev, () => this.wave(buddy));
      });
    },

    /** Выражение лица на время (если кукла ничем не занята). */
    face(ch, suffix, ms) {
      if (!this.idle(ch)) return;
      const key = ch.key + suffix;
      ch.setTexture(key);
      this.time.delayedCall(ms, () => { if (this.idle(ch) && ch.texture.key === key) ch.setTexture(ch.key); });
    },

    /** Куклы следят глазами за тем, что несут мимо (а к еде — открывают рот). */
    gaze(o, q) {
      for (const c of this.objs) {
        if (c.kind !== 'char' || c.busy || c.dragging || c.sleeping || c === o) continue;
        const want = o.kind === 'item' && (o.beh.edible || o.beh.potion) && c.getBounds().contains(q.x, q.y);
        let suf = '';
        if (want) suf = '_open';
        else if (!c.walking && Math.abs(o.x - c.x) < L.W * 0.7) suf = o.x < c.x - 14 ? '_lookl' : o.x > c.x + 14 ? '_lookr' : '';
        const key = c.key + suf;
        if (c.texture.key !== key) c.setTexture(key);
      }
    },

    /** Раз в несколько секунд кто-нибудь оживает: зевает ночью, болтает с соседом или озирается. */
    idleTick() {
      if (this.dress || this.albumUi || this.mapUi || this.press?.moved) return;
      const chars = this.objs.filter((c) => this.idle(c) && this.visible(c) && c.texture.key === c.key);
      if (!chars.length || Math.random() < 0.3) return;
      const c = pick(chars);
      if (this.night && Math.random() < 0.5) {
        sfx.yawn();
        this.face(c, '_yawn', 1100);
        this.fxZ.explode(1, c.x + 6, c.y - c.displayHeight + 4);
        return;
      }
      const near = this.objs.find((o) => o !== c && Math.abs(o.x - c.x) < 46 && Math.abs(o.x - c.x) > 6 && Math.abs(o.y - c.y) < 26
        && (o.kind === 'char' ? this.idle(o) : o.beh?.pet && !o.dragging && !o.owner && !o.walking && !o.sleeping));
      if (near && Math.random() < 0.65) {
        // «разговор»: повернулись друг к другу, по очереди подпрыгнули, между ними — нотка или сердечко
        const toward = (a, b) => (b.x < a.x ? '_lookl' : '_lookr');
        this.face(c, toward(c, near), 1300);
        this.tweens.add({ targets: c, y: c.y - 2, duration: 110, yoyo: true });
        const mx = (c.x + near.x) / 2;
        const top = Math.min(c.y - c.displayHeight, near.y - near.displayHeight) + 4;
        (Math.random() < 0.5 ? this.fxNotes : this.fxHearts).explode(1, mx, top);
        sfx.titter();
        this.time.delayedCall(450, () => {
          if (!near.active || near.dragging) return;
          if (near.kind === 'char') { if (this.idle(near)) { this.face(near, toward(near, c), 900); this.tweens.add({ targets: near, y: near.y - 2, duration: 110, yoyo: true }); } }
          else { sfx.squeak(); this.tweens.add({ targets: near, y: near.y - 4, duration: 110, yoyo: true }); }
        });
        return;
      }
      this.face(c, '_lookl', 450);
      this.time.delayedCall(520, () => this.face(c, '_lookr', 450));
    },
  });
}
