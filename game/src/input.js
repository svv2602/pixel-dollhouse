// Ввод: нажатие, перетаскивание, отпускание (порядок проверок — раздел 5.2 спецификации), посадка на поверхность.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx, unlockAudio, setMusic, musicPlaying } from './sfx.js';
import { DRESS } from './character.js';
import { L, RX, rnd, pick } from './core.js';

// Полноэкранный режим и альбомная ориентация на телефоне (по первому касанию)
let fsTried = false;
function goFullscreen() {
  if (fsTried || !window.matchMedia('(pointer: coarse)').matches) return;
  fsTried = true;
  const el = document.documentElement;
  if (!el.requestFullscreen || document.fullscreenElement) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
    .catch(() => {});
}

export function installInput(Room) {
  Object.assign(Room.prototype, {
    onDown(p, over) {
      unlockAudio();
      this.lastInput = performance.now();
      if (!this.musicChecked) {
        this.musicChecked = true;
        let pref = null;
        try { pref = localStorage.getItem('pixel-house-music'); } catch { /* ignore */ }
        if (pref !== '0' && !musicPlaying() && !over[0]?.ui?.music) { setMusic(true); this.drawMusicIcon(); }
      }
      goFullscreen();
      if (this.dreaming || this.travelling) return; // уже улетаем в сон или едем в другую локацию
      const q = this.pt(p);
      const top = over[0];
      // второй палец (ладонь, палец держащей руки): начатое перетаскивание/свайп не трогаем;
      // а «лежащий» без дела первый палец уступает новому касанию
      if (this.press && this.press.id !== p.id && (this.press.moved || this.press.scrolling)) return;
      this.press = { id: p.id, p, sx: q.x, sy: q.y, t: p.downTime, moved: false };
      if (top?.dreamPick) { this.pickDream(top.dreamPick); this.press = null; return; }
      if (top?.bubble) { this.popBubble(top); this.press = null; return; }
      if (top?.curtain) { this.toggleCurtain(); this.press = null; return; }
      if (top?.raincloud) { this.rain(); this.press = null; return; }
      if (top?.butterfly) { this.catchButterfly(top); this.press = null; return; }
      if (top?.choice) { const c = top.choice; this.closeChoices(); c.act(); this.press = null; return; }
      this.closeChoices(); // тап мимо облачков выбора — они исчезают
      if (top?.crow) { this.shooCrow(top); this.press = null; return; }
      if (top?.portal) { this.portalTap(top); this.press = null; return; }
      if (top?.train) { this.trainTap(top); this.press = null; return; } // поезд на вокзале: везёт в любую локацию
      if (top?.chalk) { if (this.chalkDown(q)) this.press.chalk = true; else this.press = null; return; } // доска в школе: рисуем мелом
      if (top?.guest) { this.guestTap(top); this.press = null; return; }
      if (top?.car) { this.carTap(top); this.press = null; return; }
      if (top?.dolphin) { this.dolphinTap(top); this.press = null; return; }
      if (top?.fish) { this.fishTap(top); this.press = null; return; }
      // море у горизонта: тап — волна, а свайп по нему листает комнаты
      if (top && 'seaWave' in top) { this.press.wave = top.seaWave; this.press.swipe = { sx: p.x, cam: this.cameras.main.scrollX }; return; }
      // магазин на улице: тап — войти, а свайп по нему листает комнаты, как по пустому месту
      if (top && 'shopDoor' in top) { this.press.door = top.shopDoor; this.press.swipe = { sx: p.x, cam: this.cameras.main.scrollX }; return; }
      if (top?.ui) { this.press.ui = top.ui; this.press.t0 = performance.now(); return; }
      if (top?.drawerRec?.cast) { this.press.ui = { cast: top.drawerRec.cast }; return; } // портрет: позвать куклу
      if (top?.drawerRec) { this.press.rec = top.drawerRec; return; }
      if (top && 'drawerRec' in top) return; // пустая ячейка
      if (top?.kind) { this.press.obj = top; this.press.offX = top.x - q.x; this.press.offY = top.y - q.y; return; }
      // пустое место комнаты: возможный свайп между комнатами
      if (!top && q.y <= L.ROOM_H) this.press.swipe = { sx: p.x, cam: this.cameras.main.scrollX };
    },
    onMove(p) {
      const pr = this.press;
      if (!pr || pr.id !== p.id || !p.isDown) return;
      if (pr.chalk) { this.chalkAt(this.pt(p)); return; }
      if (pr.swipe) {
        const dx = (p.x - pr.swipe.sx) / L.P;
        if (!pr.scrolling && Math.abs(dx) < 4) return;
        pr.scrolling = true;
        const cam = this.cameras.main;
        this.tweens.killTweensOf(cam);
        cam.scrollX = Phaser.Math.Clamp(pr.swipe.cam - dx, ...this.camRange()); // только по комнатам своей локации
        return;
      }
      const q = this.pt(p);
      if (!pr.moved) {
        if (Phaser.Math.Distance.Between(pr.sx, pr.sy, q.x, q.y) < 3) return;
        if (pr.ui) return;
        if (pr.rec) {
          this.addRecent(pr.rec);
          const o = this.spawnItem(pr.rec, q.x, q.y);
          pr.obj = o; pr.offX = 0; pr.offY = Math.round(o.displayHeight / 2);
        }
        if (!pr.obj) return;
        pr.moved = true;
        this.startDrag(pr.obj);
      }
      const o = pr.obj;
      const [lo, hi] = this.camRange();
      o.x = Phaser.Math.Clamp(q.x + pr.offX, lo + 4, hi + L.W - 4);
      o.y = Phaser.Math.Clamp(q.y + pr.offY, o.displayHeight * 0.6, L.H + 10);
      // метла и грабли: что задели на полу — летит в урну
      if (o.kind === 'item' && o.beh.sweeper) this.sweepAt(o);
      if (o.kind === 'item' && o.beh.mop) this.mopAt(o);
      // щётка над питомцем — расчёсывание
      if (o.kind === 'item' && o.rec.id === 'pet-brush') {
        const pet = this.objAt(q.x, q.y + 4, (x) => x !== o && x.beh?.pet);
        if (pet) this.brushPet(pet);
      }
      // лейка над грядкой — поливает лунку под носиком
      if (o.kind === 'item' && /watering can/.test(o.rec.subject)) {
        const bed = this.objs.find((x) => x.beh?.gardenBed && Math.abs(x.x - o.x) < 24 && o.y < x.y && o.y > x.y - 26);
        if (bed) {
          const i = this.plotAt(bed, o.x);
          this.fxCrumbs.setParticleTint(0x5ac4f2);
          if (Math.random() < 0.5) this.fxCrumbs.explode(2, o.x, o.y - 4);
          this.waterPlot(bed, i);
        }
      }
      // котёл «ждёт» ингредиент: подпрыгивает, когда к нему подносят предмет
      if (o.kind === 'item' && !o.beh.furniture) {
        const pot = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.cauldron);
        if (pot && this.hoverPot !== pot && !pot.brewing) { sfx.blub(); this.tweens.add({ targets: pot, y: pot.y - 2, duration: 90, yoyo: true }); }
        this.hoverPot = pot;
      }
      // «предвкушение» и взгляд: к еде открывают рот, за остальным следят глазами
      this.gaze(o, q);
    },
    onUp(p) {
      const pr = this.press;
      if (!pr || pr.id !== p.id) return; // отпустили другой палец
      this.press = null;
      const q = this.pt(p);
      if (pr.chalk) { this.chalkEnd(); return; }
      if (pr.scrolling) {
        // свайп на 15% экрана — перелистнуть комнату
        const dx = (p.x - pr.swipe.sx) / L.P;
        const from = Math.round(pr.swipe.cam / L.W);
        this.goRoom(this.inPlace(dx < -L.W * 0.15 ? from + 1 : dx > L.W * 0.15 ? from - 1 : from));
        return;
      }
      if (pr.door !== undefined) { this.shopEnter(pr.door); return; }
      if (pr.wave !== undefined) { this.waveTap(pr.wave, q.x); return; }
      if (pr.moved && pr.obj) { this.drop(pr.obj, q); if (this.edgeScrolled) { this.edgeScrolled = false; this.snapCamera(); } return; }
      if (pr.ui?.nav) { this.goRoom(this.inPlace(Math.round(this.cameras.main.scrollX / L.W) + pr.ui.nav)); return; }
      if (pr.ui?.robot) { this.callRobot(); return; }
      if (pr.ui && (pr.ui.map || pr.ui.mapClose || 'mapRoom' in pr.ui || 'mapPlace' in pr.ui)) { this.onMapUi(pr.ui); return; }
      if (pr.ui && (pr.ui.cardClose || 'cardGo' in pr.ui)) { this.onCardUi(pr.ui); return; }
      if (pr.ui && ('albumSel' in pr.ui || 'albumTab' in pr.ui || pr.ui.albumPage || pr.ui.albumDone)) { this.onAlbumUi(pr.ui); return; }
      if (pr.ui?.dress || pr.ui?.dressDone || pr.ui?.block) { this.onDressUi(pr.ui); return; }
      if (pr.ui) {
        sfx.click();
        if (pr.ui.tab) { this.cat = pr.ui.tab; this.mode = 'curated'; this.buildView(); }
        if (pr.ui.dice) {
          // «перемешать»: новая случайная подборка
          this.mode = 'shuffle';
          this.buildView();
          sfx.chew(); sfx.chew(0.08); sfx.chew(0.16);
          this.tweens.add({ targets: this.dice, angle: 360, duration: 300, onComplete: () => { this.dice.angle = 0; } });
        }
        if (pr.ui.page) { this.page += pr.ui.page; this.refreshDrawer(); }
        if (pr.ui.cast) this.callCast(pr.ui.cast);
        // шестерёнка открывается только удержанием (см. update) — короткий тап лишь покачивает её
        if (pr.ui.gear) this.tweens.add({ targets: this.gearIcon, angle: 25, duration: 90, yoyo: true, repeat: 1, onComplete: () => { this.gearIcon.angle = 0; } });
        if (pr.ui.music) {
          const on = !musicPlaying();
          setMusic(on);
          try { localStorage.setItem('pixel-house-music', on ? '1' : '0'); } catch { /* ignore */ }
          this.drawMusicIcon();
        }
        return;
      }
      if (pr.rec) { this.tossIn(pr.rec); return; }
      if (pr.obj) { this.tapPoint = q; this.tap(pr.obj); return; }
      if ([...L.WINDOWS, ...L.SUNS].some(({ x, y, w, h }) => q.x >= x - 2 && q.x <= x + w + 2 && q.y >= y - 2 && q.y <= y + h + 2)) this.applyNight(!this.night, true);
    },
    startDrag(o) {
      sfx.pick();
      o.tookBy = null; // вещь, снятую куклой перед сном, унесли — проснувшись, она её уже не наденет
      if (o.inTub) {
        if (o.beh?.pet) o.wetUntil = this.time.now + 7000; // с питомца капает
        if (o.kind === 'char') {
          // с персонажа капает, и он просит фен (всегда — пока фен не пробовали, потом иногда)
          o.wetUntil = this.time.now + 20000;
          if (!this.flags.tried?.dryer || Math.random() < 0.4) this.addNeed(o, 'dryer', 1500);
        }
        o.inTub = null;
      }
      if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
      o.restOn = null;
      for (const x of this.objs) if (x.restOn === o) { x.restOn = null; this.settle(x); }
      o.dragging = true;
      o.setDepth(5000);
      if (o.walkTween) { o.walkTween.stop(); o.walkTween = null; o.walking = false; }
      this.tweens.killTweensOf(o);
      // прыжки радости оборвались вместе с анимацией — иначе кукла навсегда осталась бы «занятой» (не спит, не просит)
      if (o.hopBusy) { o.hopBusy = false; o.busy = false; }
      o.setScale(o.kind === 'char' ? o.mul : 1); // масштаб только целый — без «поднятия» ×1.15
      if (o.kind === 'char') { o.sleeping = false; o.setFlipX(false); o.setTexture(o.key + '_open'); this.buddy = o.uid; }
    },
    drop(o, q) {
      o.dragging = false;
      if (o.kind === 'char') o.setTexture(o.key);
      for (const c of this.objs) if (c.kind === 'char' && !c.busy && !c.sleeping) c.setTexture(c.key);

      // в урну: предмет исчезает (питомец выскакивает обратно)
      if (o.kind === 'item' && q.y <= L.ROOM_H) {
        const bin = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.bin && x !== o);
        if (bin && this.binEat(bin, o)) { this.save(); return; }
      }
      // валик: новые обои или пол в комнате дома
      if (this.decorDrop(o, q)) { this.save(); return; }
      // робот, стиральная машина, компост, удобрение, лужа для вещей
      if (this.cleanDrop(o, q)) { this.save(); return; }
      // город: покупатель, касса, примерочная, манекен, фонтан, автомат с капсулами, стол упаковки
      if (this.cityDrop(o, q)) { this.save(); return; }
      // море: карта сокровищ или лопатка — на крестик
      if (this.seaDrop(o, q)) { this.save(); return; }
      // парк: горка, пьедестал, мяч в ворота и в кольцо, угощение слону и обезьянке
      if (this.parkDrop(o, q)) { this.save(); return; }
      // центр: билет на поезд, пластырь на куклу, кукла или питомец на рентген
      if (this.centerDrop(o, q)) { this.save(); return; }
      // село: стог, трактор, повозка, пугало, мельница
      if (this.villageDrop(o, q)) { this.save(); return; }
      if ((o.beh?.pet || o.rec?.cat === 'toy') && !o.beh.mic && !o.beh.disco && q.y <= L.ROOM_H) {
        const seat = this.objAt(q.x, q.y, (x) => x.kind === 'item' && (x.beh.seat || x.beh.swing) && x !== o);
        if (seat) { this.sitOn(o, seat); this.save(); return; }
      }
      if (o.beh?.pet && q.y <= L.ROOM_H) {
        const bed = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x !== o && RX.bedLike.test(x.rec.subject));
        if (bed) {
          // питомец сворачивается на лежанке и засыпает
          o.x = Math.round(Phaser.Math.Clamp(q.x, bed.x - bed.displayWidth / 2 + 6, bed.x + bed.displayWidth / 2 - 6));
          o.y = Math.round(bed.y - bed.displayHeight * 0.35);
          o.restOn = bed;
          o.awakeUntil = this.time.now + 1500;
          sfx.squeak();
          this.save();
          return;
        }
      }
      if ((o.kind === 'char' || o.beh?.pet) && q.y <= L.ROOM_H) {
        const tub = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.tub);
        if (tub) { this.bathe(o, tub, q.x); this.save(); return; }
        const mud = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.puddle);
        if (mud) {
          o.x = Math.round(q.x); o.y = Math.round(Math.max(q.y, mud.y - 2));
          this.stain(o, 0x7a5232);
          sfx.splash();
          this.fxCrumbs.setParticleTint(0x7a5232);
          this.fxCrumbs.explode(10, o.x, o.y - 2);
          this.save();
          return;
        }
      }
      if (o.kind === 'char' && q.y <= L.ROOM_H) {
        const wc = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.toilet);
        if (wc) { this.sitOnToilet(o, wc); this.save(); return; }
        const seat = this.objAt(q.x, q.y, (x) => x.kind === 'item' && (x.beh.seat || x.beh.swing));
        if (seat) { this.sitOn(o, seat); this.save(); return; }
        const stage = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.stage);
        if (stage) { this.onStage(o, stage, q.x); this.save(); return; }
        const bed = this.objAt(q.x, q.y, (x) => x.kind === 'item' && RX.bedLike.test(x.rec.subject));
        if (bed) {
          // сесть/лечь на кровать: персонаж на матрасе и почти сразу засыпает
          o.x = Math.round(Phaser.Math.Clamp(q.x, bed.x - bed.displayWidth / 2 + 8, bed.x + bed.displayWidth / 2 - 8));
          o.y = Math.round(bed.y - bed.displayHeight * 0.3);
          o.restOn = bed;
          // засыпает через полсекунды (и сразу видит сны) — см. dozeTick
          o.awakeUntil = this.time.now + 450;
          this.noteBed(true); // уложили — про кровать больше не напоминаем
          sfx.drop();
          this.checkWish(o, 'sleep');
          this.save();
          return;
        }
        const wr = this.objAt(q.x, q.y, (x) => x.kind === 'item' && RX.dressUp.test(x.rec.subject));
        if (wr) {
          o.x = Math.round(Phaser.Math.Clamp(wr.x + wr.displayWidth / 2 + 10, 12, L.WORLD - 12));
          o.y = Math.max(Math.round(o.y), L.FLOOR_TOP + 8);
          this.settle(o);
          this.openDressUp(o);
          this.save();
          return;
        }
      }
      if (q.y > L.ROOM_H) {
        // куклу в ящик можно утащить только при открытой вкладке «люди» — тогда она уходит из дома (портрет вернёт её)
        if (o.kind === 'char' && this.cat === 'people' && o.cast) { this.castLeave(o); return; }
        if (o.kind === 'char') { o.y = L.ROOM_H - 3; this.settle(o); } else this.removeObj(o);
        this.save();
        return;
      }
      if (o.kind === 'item' && (o.beh.icing || o.beh.sprinkles || o.beh.candles)) {
        const cake = this.objAt(q.x, q.y, (x) => x !== o && x.beh?.cake);
        if (cake) { this.decorate(cake, o); this.save(); return; }
      }
      if (o.kind === 'item' && (o.beh.head || o.beh.face)) {
        const pet = this.objAt(q.x, q.y, (x) => x !== o && x.beh?.pet && x.slots);
        if (pet) { this.petWear(pet, o); this.save(); return; }
      }
      if (o.kind === 'item' && o.beh.gift) {
        const ch = this.objAt(q.x, q.y, (x) => x.kind === 'char');
        if (ch) { this.openGift(ch, o); this.save(); return; }
      }
      if (o.kind === 'item' && (o.beh.paint || o.beh.dryer)) {
        const t = this.objAt(q.x, q.y, (x) => x !== o && (x.kind === 'char' || (o.beh.paint && x.beh?.pet)));
        if (t) {
          if (o.beh.paint) {
            this.stain(t, Phaser.Display.Color.HexStringToColor(pick(DRESS)).color);
            sfx.splash();
          } else if (t.kind === 'char') this.blowDry(t);
          o.x = Math.round(t.x + (o.x < t.x ? -16 : 16));
          this.settle(o);
          this.save();
          return;
        }
      }
      if (o.kind === 'item' && o.beh.shovel && this.digSpot && Math.hypot(q.x - this.digSpot.x, q.y - this.digSpot.y) < 14) {
        this.digTreasure(o);
        this.save();
        return;
      }
      if (o.kind === 'item' && (o.beh.makeup || o.beh.toothbrush)) {
        const ch = this.objAt(q.x, q.y, (x) => x.kind === 'char');
        if (ch && !ch.busy) {
          if (o.beh.makeup) this.applyMakeup(ch, o); else this.brushTeeth(ch);
          o.x = Math.round(Phaser.Math.Clamp(ch.x + (o.x < ch.x ? -16 : 16), 8, L.WORLD - 8));
          this.settle(o);
          this.save();
          return;
        }
      }
      if (o.kind === 'item' && o.beh.edible && !o.beh.smoothie) {
        const bl = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.blender);
        if (bl) { this.addToBlender(bl, o); this.save(); return; }
      }
      if (o.kind === 'item' && !o.beh.furniture && !o.beh.pet) {
        const wc = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.toilet);
        if (wc) { this.flushItem(wc, o); this.save(); return; }
      }
      if (o.kind === 'item' && !o.beh.furniture && !o.beh.pet) {
        const tub = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.tub);
        if (tub) {
          if (o.beh.foam) {
            // вылить пену: шапка пены цвета бутылочки, бутылочка остаётся рядом
            tub.foam = o.beh.foam;
            this.renderFoam(tub);
            sfx.splash(); sfx.sparkle();
            this.bubbles(tub, 12);
            o.x = Math.round(tub.x + tub.displayWidth / 2 + 8);
            this.settle(o);
          } else this.bathe(o, tub, q.x); // уточка и прочие игрушки плавают
          this.save();
          return;
        }
      }
      if (o.kind === 'item') {
        const ch = this.objAt(q.x, q.y, (x) => x.kind === 'char' && x !== o);
        if (ch && !o.beh.furniture) {
          if (o.beh.potion) this.drinkPotion(ch, o);
          else if (o.beh.edible) this.feed(ch, o);
          else if (o.beh.head) this.wear(ch, 'head', o);
          else if (o.beh.face) this.wear(ch, 'face', o);
          else if (o.beh.mic) { this.wear(ch, 'hand', o); this.time.delayedCall(350, () => this.sing(ch)); }
          else this.wear(ch, 'hand', o);
          this.save();
          return;
        }
        if (o.beh.edible) {
          const pet = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.pet && x !== o);
          if (pet) { this.feedPet(pet, o); this.save(); return; }
        }
        if (!o.beh.furniture) {
          const pot = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.cauldron);
          if (pot) { this.addToCauldron(pot, o); this.save(); return; }
        }
        if (this.growRec(o.rec)) {
          const bed = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.gardenBed)
            || this.objs.find((x) => x.beh?.gardenBed && Math.abs(x.x - q.x) < 24 && q.y < x.y && q.y > x.y - 22);
          if (bed && this.plant(bed, o, q.x)) { this.save(); return; }
        }
        if (o.beh.edible) {
          const stove = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.furniture && RX.cooker.test(x.rec.subject));
          if (stove) { this.cook(stove, o); this.save(); return; }
        }
        if (!o.beh.container) {
          const box = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.container && x !== o);
          if (box) { this.putIn(box, o); this.save(); return; }
        }
      }
      sfx.drop();
      this.settle(o);
      if (o.kind === 'item' && o.beh.pet) {
        for (const c of this.objs) if (c.kind === 'char' && Math.abs(c.x - o.x) < 28 && Math.abs(c.y - o.y) < 24) this.checkWish(c, 'pet', o.rec);
      }
      this.save();
    },
    objAt(x, y, pred) {
      const list = this.objs.filter((o) => pred(o) && !o.dragging && o.getBounds().contains(x, y));
      list.sort((a, b) => b.depth - a.depth);
      return list[0] || null;
    },
    settle(o) {
      o.restOn = null;
      o.y = Math.round(Math.min(o.y, L.ROOM_H - 1));
      o.x = Math.round(o.x);
      if (o.y >= L.FLOOR_TOP + 1) return;
      if (o.kind === 'item' && o.beh.wall) return;
      const sup = this.objs.find((s) => s !== o && s.kind === 'item' && s.beh.furniture && (!s.beh.wall || s.beh.shelf) && !s.beh.flat && !s.owner
        && !s.dragging && s.getBounds().contains(o.x, o.y));
      if (sup) { o.restOn = sup; return; }
      const target = Math.round(L.FLOOR_TOP + rnd(2, L.FLOOR_D * 0.35));
      this.tweens.add({
        targets: o, y: target, duration: 250 + (target - o.y) * 4, ease: 'Bounce.easeOut',
        onComplete: () => sfx.thud(),
      });
    },
  });
}
