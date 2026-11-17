// Сны и мечты. Спящей кукле снятся миры: над ней три облачка — тап переносит в мир сна.
// Днём в те же миры ведут «двери-мечты»: качели (облака), ванна (море), холодильник (конфеты и лёд),
// сундук с игрушками (игрушечный мир), яблоня (лес), диско-шар (планета).
// Мир сна — отдельная сцена: дом в это время спит и не меняется; из сна возвращается только сувенир.
import Phaser from 'phaser';
import { ANCHOR } from './character.js';
import { WORLDS, WORLD_KEYS, makeDreamTextures } from './dreamworlds.js';
import { DREAM_MUSIC, setMusicTheme } from './sfx.js';
import { roomAt } from './places.js';
import { installDreamPlay } from './dreamplay.js';

let E = null; // общие помощники из main.js (L, rnd, pick, sfx, …)

const DOOR_HINT = { bed: 'dream', swing: 'dreamsky', tub: 'dreamsea', fridge: 'dreamcandy', chest: 'dreamtoys', tree: 'dreamforest', disco: 'dreamspace' };
const MARK_MS = 60000; // сколько дома держится «след сна»
const RAINBOW = [0xff5a6f, 0xff9a5a, 0xffd84a, 0x7ad9b5, 0x5ac4f2, 0x8fa8f2, 0xc48ff2];

// =====================================================================
// Комната: облачка снов, двери-мечты, вход в сон и пробуждение
// =====================================================================
export function installDream(Room, ENV) {
  E = ENV;
  installDreamPlay(Dream, ENV);
  const { L, rnd, pick, sfx, DREAM_THEMES } = ENV;
  Object.assign(Room.prototype, {
    /** Вызывается из create(): сцена могла быть пересоздана (поворот, полный экран). */
    initDreams() {
      this.dreamGroups = [];
      this.dreaming = null;
      makeDreamTextures(this);
      this.time.addEvent({ delay: 700, loop: true, callback: () => this.doorTick() });
    },

    /** Какие миры предложить спящей: мир по предмету в руке — в середине, дальше — где ещё не бывали. */
    dreamChoices(themed) {
      const seen = this.flags.dreamSeen || {};
      const rest = Phaser.Utils.Array.Shuffle(WORLD_KEYS.filter((w) => w !== themed));
      rest.sort((a, b) => !!seen[a] - !!seen[b]);
      return themed ? [rest[0], themed, rest[1]] : rest.slice(0, 3);
    },

    /** Облачка-двери над куклой или предметом. */
    dreamGroup(kind, owner, worlds, glow = null) {
      const n = worlds.length;
      // below — облачко под предметом (диско-шар висит под самым потолком)
      const g = { kind, owner, at: this.time.now, until: Infinity, half: (n - 1) * 13.5, below: kind === 'disco' };
      g.picks = worlds.map((world, i) => {
        const rec = this.findRec(WORLDS[world].icon);
        const bubble = this.add.image(owner.x, owner.y - owner.displayHeight, 'dream_cloud').setOrigin(0.5, 1).setDepth(10003).setScale(0).setInteractive();
        const icon = (rec ? this.add.image(0, 0, rec.cat, rec.frame) : this.add.image(0, 0, 'star_px')).setDepth(10004).setAlpha(0);
        bubble.dreamPick = { group: g, world };
        // все облачка — сразу: ребёнок не ждёт, пока они выскочат по одному
        this.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.easeOut', onComplete: () => bubble.setScale(1) });
        this.tweens.add({ targets: icon, alpha: 1, duration: 160, delay: 100 });
        const mid = n === 1 || i === (n - 1) / 2;
        return { bubble, icon, world, dx: (i - (n - 1) / 2) * 27, dy: mid ? 0 : 8, glow: world === glow };
      });
      this.dreamGroups.push(g);
      this.updateDreams(this.time.now);
      // облачко-желание над той же куклой уступает место облачку сна
      if (this.wish && this.hasDoor(this.wish.ch)) this.clearWish(false);
      return g;
    },

    /** Над куклой (или над качелями, где она сидит) уже висит облачко сна — желания и подсказки ей не показываем. */
    hasDoor(c) {
      return this.dreamGroups.some((g) => g.owner === c || (g.kind === 'swing' && c.restOn === g.owner));
    },

    closeGroup(g) {
      for (const p of g.picks) {
        p.bubble.disableInteractive();
        this.tweens.add({ targets: [p.bubble, p.icon], alpha: 0, duration: 300, onComplete: () => { p.bubble.destroy(); p.icon.destroy(); } });
      }
      if (g.kind === 'bed') g.owner.dreamPicks = null;
    },

    /** Спящей кукле снятся миры (раз в полторы секунды, пока спит). */
    dream(c) {
      if (this.dreaming || this.bedtime) return; // «спокойной ночи» (bedtime.js): просто спят, без облачков
      if (!c.dreamPicks) {
        const held = c.slots.hand?.rec.subject || '';
        c.dreamTheme = DREAM_THEMES.find((t) => held && t.match.test(held)) || null;
        c.dreamStep = 0;
        const themed = c.dreamTheme?.world;
        c.dreamPicks = this.dreamGroup('bed', c, this.dreamChoices(themed), themed);
        if (this.visible(c)) sfx.dreamIn();
      }
      c.dreamStep++;
      // искорки: над «своим» миром (по предмету в руке) — чаще
      for (const p of c.dreamPicks.picks) if (p.glow || Math.random() < 0.25) this.fxSparks.explode(p.glow ? 2 : 1, p.bubble.x, p.bubble.y - 12);
    },

    endDream(c) {
      const g = c.dreamPicks;
      if (!g) return;
      this.dreamGroups = this.dreamGroups.filter((x) => x !== g);
      this.closeGroup(g);
    },

    /** Дверь-мечта над предметом или куклой: появляется на время ms (повторный вызов продлевает). */
    openDoor(kind, owner, world, ms) {
      let g = this.dreamGroups.find((d) => d.kind === kind && d.owner === owner);
      if (!g) {
        g = this.dreamGroup(kind, owner, [].concat(world));
        if (this.visible(owner)) sfx.sparkle();
      }
      g.until = this.time.now + ms;
      return g;
    },

    swingRider(sw) { return this.objs.find((o) => o.restOn === sw && o.kind === 'char' && !o.dragging) || null; },

    /** Качели: раскачали три раза подряд — над ними облачко в облачную страну. */
    swingDream(sw) {
      const now = this.time.now;
      sw.pushN = now - (sw.pushAt || -1e9) < 3000 ? (sw.pushN || 0) + 1 : 1;
      sw.pushAt = now;
      if (sw.pushN >= 3 && this.swingRider(sw)) this.openDoor('swing', sw, 'clouds', 10000);
    },

    /** Есть ли в комнате предмета неспящая кукла — ей и мечтать. */
    dreamerNear(o) {
      const room = Math.floor(o.x / L.W);
      return this.objs.some((c) => c.kind === 'char' && !c.sleeping && !c.dragging && Math.floor(c.x / L.W) === room);
    },

    /** Холодильник открыли при кукле — над ним два облачка: конфетная страна и ледяной дворец. */
    fridgeDream(fr) {
      if (this.dreamerNear(fr)) this.openDoor('fridge', fr, ['candy', 'ice'], 9000);
    },

    /** Сундук с игрушками, яблоня, диско-шар: тронули при кукле — облачко в свой мир. */
    itemDream(kind, owner, world, ms = 9000) {
      if (this.dreamerNear(owner)) this.openDoor(kind, owner, world, ms);
    },

    doorTick() {
      const now = this.time.now;
      // ванна: кукла посидела в воде — можно нырнуть в море
      for (const c of this.objs) {
        if (c.kind !== 'char') continue;
        if (c.inTub && !c.dragging) { c.tubTicks = (c.tubTicks || 0) + 1; if (c.tubTicks >= 2) this.openDoor('tub', c, 'sea', 1600); } else c.tubTicks = 0;
      }
      this.dreamGroups = this.dreamGroups.filter((g) => {
        const o = g.owner;
        const ok = o.active && (g.kind === 'bed' ? o.sleeping && !o.dragging
          : now < g.until && (g.kind !== 'swing' || this.swingRider(o)) && (g.kind !== 'tub' || (o.inTub && !o.dragging))
            && (g.kind !== 'disco' || this.discoBall === o));
        if (!ok) this.closeGroup(g);
        return ok;
      });
    },

    updateDreams(time) {
      for (const g of this.dreamGroups) {
        const o = g.owner;
        const room = Math.floor(o.x / L.W);
        const ax = Phaser.Math.Clamp(o.x, room * L.W + 35 + g.half, (room + 1) * L.W - 15 - g.half); // слева — кнопка-домик
        const ay = g.below ? o.y + 24 : o.y - o.displayHeight - 1;
        g.picks.forEach((p, i) => {
          p.bubble.x = Math.round(ax + p.dx);
          p.bubble.y = Math.round(Math.max(ay, 24) + p.dy + Math.sin(time / 420 + i * 1.7) * 1.5);
          p.icon.x = p.bubble.x;
          p.icon.y = p.bubble.y - 11;
        });
      }
      this.updateMarks(time);
    },

    /** Кто отправится в мир по этому облачку. */
    dreamerOf(g) {
      if (g.kind === 'bed' || g.kind === 'tub') return g.owner;
      if (g.kind === 'swing') return this.swingRider(g.owner);
      const room = Math.floor(g.owner.x / L.W);
      const chars = this.objs.filter((c) => c.kind === 'char' && !c.dragging && !c.sleeping && Math.floor(c.x / L.W) === room);
      return chars.find((c) => c.uid === this.buddy) || chars.sort((a, b) => Math.abs(a.x - g.owner.x) - Math.abs(b.x - g.owner.x))[0] || null;
    },

    /** Тап по облачку. */
    pickDream({ group, world }) {
      const ch = this.dreamerOf(group);
      if (!ch) { sfx.boing(); return; }
      this.enterDream(ch, world, group.kind);
    },

    /** Кто попадает в сон: сама кукла, те, кто спит рядом, и игрушка из рук (во сне она оживает). */
    dreamCast(ch, kind) {
      const doll = (c) => ({
        kind: 'doll', uid: c.uid, key: c.baseKey, mul: c.mul,
        wear: ['head', 'face'].map((s) => c.slots[s]).filter(Boolean).map((it) => ({
          tex: it.texture.key, frame: it.frame.name, dx: it.x - c.x, dy: it.y - c.y, behind: it.depth < c.depth,
        })),
      });
      const friend = (o) => ({ kind: o.beh.pet ? 'pet' : 'toy', rec: o.rec });
      const dolls = [doll(ch)];
      const extra = [];
      const hand = ch.slots.hand;
      if (hand && (hand.beh.pet || hand.rec.cat === 'toy')) extra.push(friend(hand));
      if (kind === 'bed') {
        const room = Math.floor(ch.x / L.W);
        for (const o of this.objs) {
          if (o === ch || o.dragging) continue;
          if (o.kind === 'char') { if (o.sleeping && o.restOn && o.restOn === ch.restOn) dolls.push(doll(o)); continue; }
          if (o.owner || Math.floor(o.x / L.W) !== room) continue;
          if (o.beh.pet ? o.sleeping : o.rec.cat === 'toy' && o.restOn && o.restOn === ch.restOn) extra.push(friend(o));
        }
      }
      if (kind === 'tub') for (const o of this.objs) if (o.kind === 'item' && o.inTub === ch.inTub && (o.beh.pet || o.rec.cat === 'toy')) extra.push(friend(o));
      return [...dolls.slice(0, 3), ...extra.slice(0, 4)];
    },

    enterDream(ch, world, kind = 'bed') {
      if (this.dreaming || !WORLDS[world] || this.dress || this.albumUi || this.mapUi) return false;
      const cast = this.dreamCast(ch, kind);
      this.dreaming = { uid: ch.uid, world, kind };
      (this.flags.dreamSeen ||= {})[world] = true;
      this.hintDone(DOOR_HINT[kind]);
      this.stat(`w_${world}`);
      for (const g of this.dreamGroups) this.closeGroup(g);
      this.dreamGroups = [];
      if (this.wish) this.clearWish(false);
      if (this.jam?.size) this.jamEnded();
      this.press = null;
      this.saveNow();
      sfx.dreamIn();
      this.fxSparks.explode(24, ch.x, ch.y - ch.displayHeight);
      const cam = this.cameras.main;
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        if (!this.dreaming) return;
        this.scene.launch('dream', { world, cast, kind });
        this.scene.sleep();
      });
      cam.fadeOut(380, 255, 255, 255);
      return true;
    },

    /** Сувенир из сна: появляется прямо в руке, в искорках; новый — наклейка в альбом. */
    giveSouvenir(c, rec) {
      if (!rec || !c.active) return;
      const it = this.spawnItem(rec, c.x, c.y - 20);
      this.wear(c, 'hand', it);
      this.sticker('dream', rec, c.x, c.y - 20);
      this.fxSparks.explode(16, c.x, c.y - c.displayHeight / 2);
      sfx.sparkle();
    },

    /**
     * Солнышко во сне: куклы просыпаются дома, каждая — со своим сувениром и «следом сна».
     * list — [{ uid, rec }], первой идёт та, что открыла сон.
     */
    wakeFromDream(list) {
      const d = this.dreaming;
      if (!d) return;
      this.scene.stop('dream');
      this.scene.wake();
      // первый кадр после пробуждения: часы сцены снова идут
      this.events.once('update', () => {
        this.dreaming = null;
        setMusicTheme(this.night ? 0 : roomAt(this.curRoom || 0).music);
        this.cameras.main.fadeIn(450, 255, 255, 255);
        (list || []).forEach(({ uid, rec }, i) => {
          const c = this.objs.find((o) => o.kind === 'char' && o.uid === uid);
          if (!c) return;
          c.sleeping = false;
          c.awakeUntil = this.time.now + 3000; // ровно чтобы показать сувенир: потом можно в следующий сон
          c.dreamStep = 0;
          c.dreamTheme = null;
          c.tubTicks = -4; // после моря облачко над ванной появится не сразу
          if (!c.busy) c.setTexture(c.key);
          this.time.delayedCall(550 + i * 250, () => {
            if (!c.active) return;
            this.giveSouvenir(c, rec);
            this.dreamMark(c, d.world);
            if (!c.inTub && !c.restOn?.beh?.swing) this.celebrate(c, 2);
            this.save();
          });
        });
      });
    },

    /**
     * След сна: минуту после пробуждения кукла выглядит «оттуда» — хвост русалки, снежная шапка, облачко под ногами,
     * звёздное сияние, светлячки, заводной ключик; из конфетной страны — шоколадные усы (как от коктейля: щётка или ванна).
     * Всё смывается в ванне; в сохранение не попадает (кроме усов).
     */
    dreamMark(c, world) {
      this.clearMark(c);
      if (world === 'candy') {
        c.look = { ...c.look, mustache: '#a8703f' };
        this.charTex(c);
        if (!c.busy) c.setTexture(c.key);
        return;
      }
      const m = { world, until: this.time.now + MARK_MS, parts: [] };
      const add = (tex, frame) => { const im = this.add.image(c.x, c.y, tex, frame).setOrigin(0.5, 1); m.parts.push(im); return im; };
      if (world === 'sea') m.tail = add('dw_tail');
      else if (world === 'ice') m.cap = add('dm_snow');
      else if (world === 'clouds') m.cloud = add('dm_cloud');
      else if (world === 'planet') m.glow = add('glow').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff07a).setAlpha(0.45);
      else if (world === 'forest') m.flies = [0, 1, 2].map(() => add('px').setOrigin(0.5).setScale(2).setTint(0xfff07a));
      else if (world === 'toys') { const k = this.findRec('wind-up key'); if (k) m.key = add(k.cat, k.frame).setOrigin(0.5); }
      if (!m.parts.length) return;
      c.dmark = m;
      c.once('destroy', () => this.clearMark(c));
    },

    clearMark(c, washed = false) {
      const m = c.dmark;
      if (!m) return;
      c.dmark = null;
      for (const p of m.parts) p.destroy();
      if (c.active && this.sys.isActive()) this.fxSparks.explode(washed ? 12 : 6, c.x, c.y - c.displayHeight / 2);
    },

    updateMarks(time) {
      for (const c of this.objs) {
        const m = c.dmark;
        if (!m) continue;
        if (time > m.until) { this.clearMark(c); continue; }
        const k = c.scaleY;
        const d = c.depth;
        for (const p of m.parts) p.setVisible(c.pose !== 'lie'); // под одеялом следа не видно
        if (m.tail) m.tail.setPosition(c.x, c.y + 3 * k).setScale(k).setFlipX(c.flipX).setDepth(d + 0.1);
        if (m.cap) {
          m.cap.setPosition(c.x, Math.round(c.y - (ANCHOR.hatY - 3) * k)).setScale(k).setDepth(d + 0.35);
          if (Math.random() < 0.03) { this.fxCrumbs.setParticleTint(0xffffff); this.fxCrumbs.explode(1, c.x + rnd(-6, 6), c.y - c.displayHeight + 4); }
        }
        if (m.cloud) m.cloud.setPosition(c.x, Math.round(c.y + 3 + Math.sin(time / 380) * 1.2)).setDepth(d + 0.1);
        if (m.glow) {
          m.glow.setPosition(c.x, Math.round(c.y - c.displayHeight / 2)).setDepth(d - 0.05).setAlpha(0.35 + 0.15 * Math.sin(time / 300));
          if (Math.random() < 0.06) this.fxSparks.explode(1, c.x + rnd(-9, 9), c.y - rnd(2, c.displayHeight));
        }
        if (m.flies) m.flies.forEach((f, i) => {
          const a = time / 520 + i * 2.1;
          f.setPosition(Math.round(c.x + Math.cos(a) * 13), Math.round(c.y - c.displayHeight / 2 + Math.sin(a * 1.3) * 11))
            .setDepth(d + (Math.sin(a) > 0 ? 0.4 : -0.05)).setAlpha(0.65 + 0.35 * Math.sin(time / 190 + i * 2));
        });
        if (m.key) m.key.setPosition(c.x - (c.flipX ? -1 : 1) * 10 * k, Math.round(c.y - 15 * k)).setFlipX(Math.floor(time / 280) % 2 === 1).setDepth(d - 0.05);
      }
    },

    /** Сон прерван (сцену пересоздают из-за смены размера экрана): просто вернуться в дом. */
    abortDream() {
      if (!this.dreaming) return;
      this.dreaming = null;
      this.game.scene.stop('dream');
      if (this.scene.isSleeping()) this.game.scene.wake('room');
      this.cameras.main.resetFX();
      setMusicTheme(this.night ? 0 : roomAt(this.curRoom || 0).music);
    },
  });
}

// =====================================================================
// Сцена сна: маленькая песочница на один экран
// =====================================================================
export class Dream extends Phaser.Scene {
  constructor() { super('dream'); }

  init(data) { this.cfg = data || {}; }

  create() {
    const { L } = E;
    this.room = this.scene.get('room');
    this.W = L.W;
    this.H = L.H;
    this.cameras.main.setOrigin(0, 0).setZoom(L.P).setRoundPixels(true);
    makeDreamTextures(this);
    this.key = WORLDS[this.cfg.world] ? this.cfg.world : 'forest';
    this.def = WORLDS[this.key];
    this.GY = Math.round(this.H * this.def.ground); // линия «земли»
    this.band = this.H - this.GY;
    this.souv = (E.DREAM_THEMES.find((t) => t.world === this.key)?.items || E.DREAMS).filter((sub) => this.room.findRec(sub));
    this.actors = [];
    this.dolls = [];
    this.gifts = [];
    this.trail = [];
    this.press = null;
    this.leaving = false;
    this.lead = null;
    // сцену переиспользуют: всё, что миры держат на ней между кадрами, обнуляется здесь
    this.trainRun = false; this.snowman = null; this.rb = null; this.strokes = []; this.found = 0;
    this.statAcc = 0;
    this.lastInput = performance.now();
    this.makeFx();
    this.trailG = this.add.graphics().setDepth(150);
    this.def.build(this, E);
    this.scatter();
    this.spawnCast();
    this.buildExit();
    this.initPlay();
    this.input.on('pointerdown', (p, over) => this.onDown(p, over));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('gameout', () => { if (this.press?.moved) this.drop(this.press.obj, { x: this.press.obj.x, y: this.press.obj.y }); this.press = null; });
    // моргание
    this.time.addEvent({
      delay: 1900, loop: true, callback: () => {
        const d = E.pick(this.dolls);
        if (!d || d.busy || d.dragging || d.jumping || d.texture.key !== d.key) return;
        d.setTexture(d.key + '_blink');
        this.time.delayedCall(140, () => { if (d.active && d.texture.key === d.key + '_blink' && !d.jumping) d.setTexture(d.key); });
      },
    });
    setMusicTheme(DREAM_MUSIC + (this.def.music || 0));
    this.cameras.main.fadeIn(500, 255, 255, 255);
  }

  makeFx() {
    const mk = (tex, cfg) => this.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(6000);
    this.fxHearts = mk('heart', { lifespan: 1000, speedX: { min: -15, max: 15 }, speedY: { min: -35, max: -20 }, alpha: { start: 1, end: 0 } });
    this.fxSparks = mk('spark', { lifespan: 700, speed: { min: 20, max: 55 }, alpha: { start: 1, end: 0 }, tint: [0xfff07a, 0xff9ad5, 0x9ad9ff, 0xb8ff9a, 0xffffff] });
    this.fxPoof = mk('px', { lifespan: 450, speed: { min: 10, max: 35 }, scale: { start: 2, end: 1 }, alpha: { start: 1, end: 0 } });
    this.fxCrumbs = mk('px', { lifespan: 600, speed: { min: 15, max: 45 }, angle: { min: 200, max: 340 }, gravityY: 180 });
    this.fxNotes = mk('note', { lifespan: 1100, speedX: { min: -12, max: 12 }, speedY: { min: -30, max: -18 }, tint: [0x5ac4f2, 0xf27aa6, 0x7ad9b5, 0xc48ff2], alpha: { start: 1, end: 0 } });
    this.fxBub = mk('px', { lifespan: 1400, speedX: { min: -8, max: 8 }, speedY: { min: -40, max: -18 }, scale: { onEmit: () => (Math.random() < 0.4 ? 2 : 1) }, alpha: { start: 0.9, end: 0 } });
  }

  // ---------------------------------------------------------------- актёры
  /** Актёр из текстуры. o: kind, drag, sc, fly, tap, ride, eats, edible, noFlip, ground. */
  img(tex, x, y, o = {}, frame) {
    const a = this.add.image(Math.round(x), Math.round(y), tex, frame).setOrigin(0.5, 1).setInteractive();
    Object.assign(a, { kind: 'res', drag: true, tws: [] }, o);
    if (o.sc) a.setScale(o.sc);
    this.actors.push(a);
    return a;
  }

  /** Актёр из каталога предметов (по названию). Нет такого — звёздочка, чтобы мир не ломался. */
  spr(subject, x, y, o = {}) {
    const rec = typeof subject === 'string' ? this.room.findRec(subject) : subject;
    if (!rec) return this.img('star_px', x, y, o);
    const a = rec.tex ? this.img(rec.tex, x, y, o) : this.img(rec.cat, x, y, o, rec.frame);
    a.rec = rec;
    return a;
  }

  /** Украшение мира: не трогается. */
  deco(subject, x, y, sc = 1, depth = null) {
    const rec = this.room.findRec(subject);
    const d = (rec ? this.add.image(Math.round(x), Math.round(y), rec.cat, rec.frame) : this.add.image(x, y, 'px')).setOrigin(0.5, 1).setScale(sc);
    return d.setDepth(depth ?? d.y);
  }

  addDoll(c, x, y) {
    const d = this.add.image(Math.round(x), Math.round(y), c.key).setOrigin(0.5, 1).setScale(c.mul || 1).setInteractive();
    Object.assign(d, { kind: 'doll', uid: c.uid, key: c.key, baseKey: c.key, mul: c.mul || 1, drag: true, tws: [], hand: null, wear: [] });
    for (const w of c.wear || []) {
      if (!this.textures.exists(w.tex)) continue;
      d.wear.push(Object.assign(this.add.image(x, y, w.tex, w.frame).setOrigin(0.5, 1).setScale(d.mul), { dx: w.dx, dy: w.dy, behind: w.behind }));
    }
    if (this.def.tail) d.tail = this.add.image(x, y, 'dw_tail').setOrigin(0.5, 1).setScale(d.mul);
    this.actors.push(d);
    this.dolls.push(d);
    return d;
  }

  /** Каждый визит жители встречают на новых местах (у кого есть своя область прогулок). */
  scatter() {
    const { rnd } = E;
    for (const a of this.actors) {
      if (!a.area || a.plat) continue;
      a.x = Math.round(rnd(a.area[0], a.area[1]));
      a.y = Math.round(rnd(a.area[2], a.area[3]));
    }
  }

  spawnCast() {
    const { rnd } = E;
    const cast = (this.cfg.cast || []).filter((c) => c.kind !== 'doll' || this.textures.exists(c.key));
    const spots = this.def.start ? this.def.start(this) : null;
    const y0 = spots?.y ?? this.GY + this.band * 0.45;
    let x = spots?.x ?? this.W * 0.34;
    const water = this.def.gravity === 'water';
    const cloud = this.def.gravity === 'cloud';
    for (const c of cast) {
      if (c.kind === 'doll') {
        const d = this.addDoll(c, x, y0);
        // в облаках на первом облаке стоит только главная кукла — остальные приземляются рядом сами
        if (spots?.plat && d === this.dolls[0]) d.plat = spots.plat; else if (cloud) this.settle(d);
        if (water) this.bob(d);
        x += 24;
      } else {
        // питомцы и игрушки из дома: во сне они живые и гуляют сами
        const a = this.spr(c.rec, x + rnd(-6, 6), water ? y0 - rnd(4, 30) : y0 + rnd(2, 8), { kind: c.kind, alive: true, fly: water, tap: (t) => this.cheer(t) });
        const ar = water ? [16, this.W - 16, 24, this.GY - 6] : this.def.walk?.(this) || [16, this.W - 16, this.GY + 4, this.H - 4];
        if (cloud) this.settle(a); else this.wander(a, ar, { hops: !water, wave: water ? 3 : 0, speed: 20 });
        x += 16;
      }
    }
  }

  /** Обычная реакция на тап: подпрыгнуть, сердечко, писк. */
  cheer(a, h = 6) {
    E.sfx.squeak();
    this.fxHearts.explode(1, a.x, a.y - a.displayHeight);
    this.jump(a, h, 140);
  }

  /** Танец: повороты туда-сюда и нотки. */
  dance(a, n = 6) {
    if (a.busy || a.dragging) return;
    a.busy = true;
    this.fxNotes.explode(3, a.x, a.y - a.displayHeight);
    const y0 = a.y;
    this.act(a, {
      y: y0 - 4, duration: 130, yoyo: true, repeat: n - 1, ease: 'Quad.easeOut',
      onYoyo: () => a.setFlipX(!a.flipX),
      onComplete: () => { a.y = y0; a.busy = false; a.setFlipX(false); },
    });
  }

  removeActor(a) {
    this.actors = this.actors.filter((x) => x !== a);
    this.gifts = this.gifts.filter((x) => x !== a);
    if (a.owner) { a.owner.hand = null; a.owner = null; }
    this.halt(a);
    a.destroy();
  }

  vanish(a) {
    this.fxPoof.explode(6, a.x, a.y - a.displayHeight / 2);
    this.removeActor(a);
  }

  // ---------------------------------------------------------------- движение
  /** Твин актёра: запоминается, чтобы остановить, когда актёра берут в руки. */
  act(a, cfg) {
    a.tws = a.tws.filter((t) => !t.isDestroyed());
    const t = this.tweens.add({ targets: a, ...cfg });
    a.tws.push(t);
    return t;
  }

  halt(a) {
    for (const t of a.tws) if (!t.isDestroyed()) t.stop();
    a.tws = [];
    this.tweens.killTweensOf(a);
    a.moving = false; a.jumping = false; a.busy = false; a.flying = false;
  }

  jump(a, h = 6, dur = 150, done) {
    if (a.jumping || a.dragging || a.moving) return false;
    a.jumping = true;
    const y0 = a.y;
    if (a.kind === 'doll') a.setTexture(a.key + '_blink');
    this.act(a, {
      y: y0 - h, duration: dur, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { a.jumping = false; a.y = y0; if (a.kind === 'doll') a.setTexture(a.key); done?.(); },
    });
    return true;
  }

  /** Двигаться к точке: o.hops — вприпрыжку (по земле), o.wave — волной (в воде и в небе). */
  moveTo(a, tx, ty, o = {}) {
    const x0 = a.x;
    const y0 = a.y;
    tx = Math.round(Phaser.Math.Clamp(tx, o.free ? -400 : 8, o.free ? this.W + 400 : this.W - 8));
    ty = Math.round(ty);
    const dist = Math.hypot(tx - x0, ty - y0);
    const dur = o.dur || Math.max(160, dist / (o.speed || 30) * 1000);
    const hops = o.hops ? Math.max(1, Math.round(dist / (o.hopLen || 9))) : 0;
    const hopH = o.hopH ?? 2;
    const wave = o.wave || 0;
    a.moving = true;
    if (Math.abs(tx - x0) > 1 && !a.noFlip) a.setFlipX(a.kind === 'doll' ? tx < x0 : tx > x0);
    a.tws = a.tws.filter((t) => !t.isDestroyed());
    let last = -1;
    a.tws.push(this.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: o.ease || 'Sine.easeInOut',
      onUpdate: (tw) => {
        const k = tw.getValue();
        a.x = Math.round(x0 + (tx - x0) * k);
        const lift = hops ? Math.abs(Math.sin(k * hops * Math.PI)) * hopH : wave ? Math.sin(k * Math.PI * 2) * wave : 0;
        a.y = Math.round(y0 + (ty - y0) * k - lift);
        if (o.step && hops && Math.floor(k * hops) !== last) { last = Math.floor(k * hops); o.step(); }
      },
      onComplete: () => { a.x = tx; a.y = ty; a.moving = false; if (a.kind === 'doll') a.setFlipX(false); o.done?.(); },
    }));
  }

  /** Бродить по области [x0, x1, y0, y1] самому. */
  wander(a, ar, o = {}) {
    const { rnd } = E;
    a.area = ar;
    const ev = this.time.addEvent({
      delay: o.every || 3000, loop: true, startAt: Math.random() * 2500, callback: () => {
        if (!a.active) { ev.remove(); return; }
        if (a.dragging || a.busy || a.moving || a.jumping || a.rider || a.mount || a.owner || a.above || a.plat || a.hid || this.leaving) return;
        if (Math.random() < (o.rest ?? 0.3)) return;
        const tx = Phaser.Math.Clamp(rnd(ar[0], ar[1]), a.x - 70, a.x + 70);
        this.moveTo(a, Phaser.Math.Clamp(tx, ar[0], ar[1]), rnd(ar[2], ar[3]), { speed: o.speed || 20, hops: o.hops, hopH: o.hopH, wave: o.wave });
      },
    });
  }

  /** Покачивание на месте (в воде). */
  bob(a) {
    if (a.dragging || a.moving) return;
    this.act(a, { y: a.y - 3, duration: 1100 + (a.x % 7) * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Отпущенное находит своё место — в каждом мире по-своему. */
  settle(a) {
    const { rnd, sfx } = E;
    const { GY, H } = this;
    a.x = Math.round(Phaser.Math.Clamp(a.x, 6, this.W - 6));
    a.y = Math.round(Math.min(a.y, H - 2));
    a.plat = null;
    const g = this.def.gravity;
    const land = () => { if (a.active && !a.dragging) this.def.landed?.(this, a); };
    if (a.fly && !a.ground) {
      a.y = Math.min(a.y, g === 'water' ? GY - 2 : GY - 6);
      if (g === 'water' && (a.kind === 'doll' || a.alive)) this.bob(a);
      return;
    }
    if (g === 'water') {
      // живое плавает, где отпустили; вещи и те, кто живёт на дне, медленно опускаются на песок
      if (a.kind === 'doll') { a.y = Math.min(a.y, GY + 4); this.bob(a); return; }
      if (a.y >= GY + 2) return;
      this.act(a, { y: Math.round(GY + rnd(3, this.band - 4)), duration: 600 + (GY - a.y) * 22, ease: 'Sine.easeInOut', onComplete: land });
      return;
    }
    if (g === 'cloud') {
      // ближайшее облако под ногами — или облачный пол; всё пружинит
      const below = (this.plats || []).filter((c) => Math.abs(a.x - c.x) < c.displayWidth / 2 - 3 && c.y - 9 >= a.y - 6).sort((p, q) => p.y - q.y)[0];
      const ty = below ? below.y - 9 : Math.max(a.y, Math.round(GY + rnd(4, this.band - 3)));
      const done = () => { a.plat = below || null; sfx.boing(); this.jump(a, 12, 200, () => this.jump(a, 5, 140, land)); };
      if (ty - a.y < 2) { a.y = ty; done(); return; }
      this.act(a, { y: ty, duration: 160 + (ty - a.y) * 5, ease: 'Quad.easeIn', onComplete: done });
      return;
    }
    if (a.y >= GY + 1) { land(); return; }
    const ty = Math.round(GY + rnd(2, this.band * 0.4));
    if (g === 'moon') {
      // слабая гравитация: падает медленно и мягко подпрыгивает
      this.act(a, { y: ty, duration: 700 + (ty - a.y) * 26, ease: 'Sine.easeIn', onComplete: () => { sfx.thud(); this.jump(a, 6, 380, land); } });
      return;
    }
    this.act(a, { y: ty, duration: 250 + (ty - a.y) * 4, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); land(); } });
  }

  at(x, y, pred) {
    const list = this.actors.filter((o) => o.active && o.visible && !o.dragging && pred(o) && o.getBounds().contains(x, y));
    list.sort((a, b) => b.depth - a.depth);
    return list[0] || null;
  }

  nearestDoll(a) {
    return this.dolls.filter((d) => d.active && !d.dragging).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0] || null;
  }

  // ---------------------------------------------------------------- что можно делать
  /** Подарок мира: сувенир выскакивает в искорках; его можно дать кукле в руку — и унести домой. */
  gift(x, y, subject = null, o = {}) {
    const { pick, sfx } = E;
    // житель мира чего-то ждёт — источники подарков чаще дают именно это (o.keep — подарок менять нельзя)
    const w = this.wishNow;
    if (w && !o.keep && Math.random() < 0.6 && !this.gifts.some((g) => g.active && g.rec?.subject === w.sub)) subject = w.sub;
    const fresh = this.souv.filter((sub) => !this.room.stickers.has('dream', sub));
    const rec = this.room.findRec(subject || pick(fresh.length && Math.random() < 0.7 ? fresh : this.souv));
    if (!rec) return null;
    // edible: true — едят все; 'res' — только жители мира (кукла берёт в руку)
    const it = this.spr(rec, Phaser.Math.Clamp(x, 10, this.W - 10), y, { kind: 'item', edible: o.edible ?? rec.tags.includes('edible') });
    this.gifts.push(it);
    const max = this.def.maxGifts || 5;
    while (this.gifts.length > max) {
      const old = this.gifts.find((o) => !o.owner && !o.dragging && o !== it);
      if (!old) break;
      this.vanish(old);
    }
    sfx.pop();
    this.fxSparks.explode(o.rare ? 22 : 8, it.x, it.y - 8);
    this.act(it, { y: it.y - 12, duration: 180, ease: 'Quad.easeOut', onComplete: () => { if (!it.dragging) this.settle(it); } });
    return it;
  }

  hold(d, it) {
    const { sfx } = E;
    this.halt(it);
    if (d.hand && d.hand !== it) {
      const old = d.hand;
      old.owner = null;
      old.x = Phaser.Math.Clamp(d.x + (d.x < this.W / 2 ? 16 : -16), 8, this.W - 8);
      old.y = d.y - 10;
      this.settle(old);
    }
    d.hand = it;
    it.owner = d;
    sfx.wear();
    sfx.giggle();
    this.fxSparks.explode(6, d.x, d.y - d.displayHeight * 0.4);
    this.fxHearts.explode(2, d.x, d.y - d.displayHeight);
  }

  eat(who, it) {
    const { sfx } = E;
    this.halt(it);
    it.disableInteractive();
    this.actors = this.actors.filter((x) => x !== it);
    this.gifts = this.gifts.filter((x) => x !== it);
    who.busy = true;
    const doll = who.kind === 'doll';
    const rec = it.rec;
    const dipped = !!it.dipped;
    it.x = who.x;
    it.y = Math.round(who.y - (doll ? (ANCHOR.mouthY - 8) * who.mul : who.displayHeight * 0.5));
    it.setDepth(who.depth + 1);
    if (doll) { who.setTexture(who.key + '_open'); who.lastAte = it.rec; }
    this.fxCrumbs.setParticleTint(0xffc9a0);
    [0, 220, 440].forEach((ms) => this.time.delayedCall(ms, () => { if (it.active) { sfx.chew(); this.fxCrumbs.explode(3, it.x, it.y - 6); } }));
    this.time.delayedCall(660, () => {
      it.destroy();
      if (!who.active) return;
      who.busy = false;
      sfx.yum();
      this.fxHearts.explode(3, who.x, who.y - who.displayHeight);
      if (doll && !who.dragging) { who.setTexture(who.key + '_smile'); this.time.delayedCall(700, () => { if (who.active && who.texture.key === who.key + '_smile') who.setTexture(who.key); }); }
      else if (!doll) this.jump(who, 5, 130);
      this.def.ate?.(this, who, rec, dipped);
    });
  }

  mount(d, r) {
    const { sfx } = E;
    if (d.mount) d.mount.rider = null;
    this.halt(d);
    d.mount = r;
    r.rider = d;
    d.plat = null;
    d.setFlipX(false);
    sfx.whee();
    sfx.giggle();
    this.fxHearts.explode(2, d.x, r.y - r.displayHeight - 8);
    this.tried(r.ride.key || 'ride');
    r.ride.go?.(r);
  }

  /** Радужный след (единорог) и радуга, нарисованная пальцем (облака). */
  trailAdd(x, y, life = 1400) {
    this.trail.push({ x: Math.round(x), y: Math.round(y), t: this.time.now, life });
    if (this.trail.length > 900) this.trail.shift();
  }

  // ---------------------------------------------------------------- ввод (один палец; см. правило про press.id в комнате)
  onDown(p, over) {
    if (this.leaving) return;
    this.lastInput = performance.now();
    if (this.press && this.press.id !== p.id && this.press.moved) return;
    const q = { x: p.worldX, y: p.worldY };
    const top = over[0] || null;
    this.press = { id: p.id, sx: q.x, sy: q.y, moved: false, far: false, obj: top, offX: top ? top.x - q.x : 0, offY: top ? top.y - q.y : 0 };
    if (!top) this.def.skyDown?.(this, q);
  }

  onMove(p) {
    const pr = this.press;
    if (!pr || pr.id !== p.id || !p.isDown || this.leaving) return;
    const q = { x: p.worldX, y: p.worldY };
    const o = pr.obj;
    if (!o) {
      if (Phaser.Math.Distance.Between(pr.sx, pr.sy, q.x, q.y) > 5) pr.far = true;
      this.def.skyMove?.(this, q);
      return;
    }
    if (!pr.moved) {
      if (Phaser.Math.Distance.Between(pr.sx, pr.sy, q.x, q.y) < 3 || !o.drag || !o.active) return;
      pr.moved = true;
      this.startDrag(o);
    }
    o.x = Math.round(Phaser.Math.Clamp(q.x + pr.offX, 4, this.W - 4));
    o.y = Math.round(Phaser.Math.Clamp(q.y + pr.offY, o.displayHeight * 0.6, this.H + 4));
  }

  onUp(p) {
    const pr = this.press;
    if (!pr || pr.id !== p.id) return;
    this.press = null;
    if (this.leaving) return;
    const q = { x: p.worldX, y: p.worldY };
    const o = pr.obj;
    if (pr.moved) { if (o.active) this.drop(o, q); return; }
    // пустое место: провели пальцем — дело мира (радуга, рыбки); просто тапнули — кукла идёт туда
    if (!o) { if (!pr.far) this.groundTap(q); return; }
    if (o.exit) { this.leave(); return; }
    if (o.active) this.tap(o);
  }

  startDrag(a) {
    E.sfx.pick();
    this.halt(a);
    if (a.owner) { a.owner.hand = null; a.owner = null; }
    if (a.mount) { a.mount.rider = null; a.mount = null; }
    if (a.above) this.def.unstack?.(this, a);
    a.plat = null;
    a.dragging = true;
    a.setDepth(5000);
    if (a.kind === 'doll') { a.setFlipX(false); a.setTexture(a.key + '_open'); this.lead = a; }
  }

  drop(a, q) {
    const { sfx } = E;
    a.dragging = false;
    if (a.kind === 'doll') a.setTexture(a.key);
    const under = (pred) => this.at(q.x, q.y, (x) => x !== a && pred(x));
    if (a.kind === 'doll') {
      // ride.zone — сесть можно только в нижнюю часть (корзина шара), иначе шар «ловил» бы кукол по всему небу
      const r = under((x) => x.ride && !x.rider && (!x.ride.zone || q.y > x.y - x.ride.zone));
      if (r) { this.mount(a, r); return; }
    }
    if (a.kind === 'item') {
      if (this.tryWish(a, q)) return;
      const d = under((x) => x.kind === 'doll' && !x.busy);
      if (d) { if (a.edible === true) this.eat(d, a); else this.hold(d, a); return; }
      const r = a.edible && under((x) => x.eats && !x.busy);
      if (r) { this.eat(r, a); return; }
    }
    if (this.def.drop?.(this, a, q)) return;
    sfx.drop();
    this.settle(a);
  }

  tap(a) {
    const { sfx } = E;
    if (a.kind === 'doll') {
      this.lead = a;
      if (a.busy) return;
      if (a.mount) { if (a.mount.ride.go) a.mount.ride.go(a.mount); else this.cheer(a.mount, 4); return; }
      if (this.def.dollTap?.(this, a)) return;
      sfx.giggle();
      this.fxHearts.explode(2, a.x, a.y - a.displayHeight);
      this.jump(a, 7, 160);
      return;
    }
    // вещь в руке у куклы: тап по ней — как по кукле
    if (a.owner) { this.tap(a.owner); return; }
    if (a.tap) { a.tap(a); return; }
    sfx.boing();
    this.jump(a, 3, 110);
  }

  // ---------------------------------------------------------------- выход
  buildExit() {
    const b = this.add.rectangle(2, 2, 21, 19, 0x8a52cc, 0.9).setOrigin(0).setDepth(19000).setInteractive();
    b.setStrokeStyle(1, 0xffffff, 0.9);
    b.exit = true;
    this.exitBtn = b;
    this.add.image(12, 11, 'dw_sun').setDepth(19001);
    this.tweens.add({ targets: b, fillAlpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Что кукла принесёт домой: вещь из руки, последнее съеденное лакомство или сувенир этого мира (taken — уже разобранные). */
  souvenirOf(d, taken) {
    const mine = d?.hand?.rec || d?.lastAte || null;
    if (mine && !mine.tex) return mine;
    const pool = this.souv.filter((sub) => !taken.has(sub));
    const fresh = pool.filter((sub) => !this.room.stickers.has('dream', sub));
    return this.room.findRec(E.pick(fresh.length ? fresh : pool.length ? pool : this.souv)) || null;
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.press = null;
    // сувенир приносит каждая кукла, что была во сне
    const taken = new Set();
    this.broughtAll = this.dolls.map((d) => {
      const rec = this.souvenirOf(d, taken);
      if (rec) taken.add(rec.subject);
      return { uid: d.uid, rec };
    });
    this.brought = this.broughtAll[0]?.rec || null; // что уносит главная кукла (видно тестам)
    E.sfx.dreamOut();
    this.fxSparks.explode(20, 12, 11);
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.room.wakeFromDream(this.broughtAll));
    cam.fadeOut(420, 255, 255, 255);
  }

  // ---------------------------------------------------------------- кадр
  update(time, delta = 16) {
    this.def.update?.(this, time, delta);
    for (const a of this.actors) {
      if (!a.active) continue;
      if (a.above) { a.x = a.above.x; a.y = a.above.y - a.aboveDy; }
      if (a.dragging) continue;
      if (a.owner) continue;
      a.setDepth(a.mount ? a.mount.depth + (a.mount.ride.over ? 0.1 : -0.1) : a.above ? a.above.depth + 0.1 : a.plat ? a.plat.depth - 0.5 : a.fly ? 300 + a.y * 0.01 : a.y);
    }
    for (const d of this.dolls) {
      if (!d.active) continue;
      const r = d.mount;
      // верхом кукла сидит (русалка с хвостом и пассажир корзины шара — стоят)
      const k = d.baseKey + (r && !d.dragging && !d.tail && !r.ride.over ? 's' : '');
      if (k !== d.key) { const face = d.texture.key.startsWith(d.key) ? d.texture.key.slice(d.key.length) : ''; d.key = k; d.setTexture(k + face); }
      if (r && !d.dragging) {
        if (!r.active) d.mount = null;
        else { d.x = r.x + (r.flipX ? -1 : 1) * (r.ride.dx || 0); d.y = r.y - r.ride.seat; d.setDepth(r.depth + (r.ride.over ? 0.1 : -0.1)); }
      }
      const s = d.mul;
      const side = d.flipX ? -1 : 1;
      const it = d.hand;
      if (it) {
        if (!it.active) d.hand = null;
        else {
          it.x = Math.round(d.x + side * ANCHOR.handX * s);
          it.y = Math.round(d.y - ANCHOR.handY * s + it.displayHeight / 2);
          it.setDepth(d.depth + 0.3);
        }
      }
      for (const w of d.wear) {
        w.x = Math.round(d.x + side * w.dx);
        w.y = Math.round(d.y + w.dy);
        w.setFlipX(d.flipX).setDepth(d.depth + (w.behind ? -0.05 : 0.25));
      }
      if (d.tail) { d.tail.x = d.x; d.tail.y = d.y + 3 * s; d.tail.setFlipX(d.flipX).setDepth(d.depth + 0.1); }
    }
    // радужные следы
    const g = this.trailG.clear();
    if (this.trail.length) {
      this.trail = this.trail.filter((t) => time - t.t < t.life);
      for (const t of this.trail) {
        const al = Math.min(1, (t.life - (time - t.t)) / 500);
        RAINBOW.forEach((c, k) => g.fillStyle(c, al).fillRect(t.x - 1, t.y - 3 + k, 3, 1));
      }
    }
    this.playUpdate(time);
    // статистика для родителей: секунды активной игры во снах (отдельной строкой)
    this.statAcc += delta;
    if (this.statAcc >= 1000) {
      const sec = Math.floor(this.statAcc / 1000);
      this.statAcc -= sec * 1000;
      if (!document.hidden && performance.now() - this.lastInput < 20000) E.statTime(5, sec, E.today());
    }
  }
}
