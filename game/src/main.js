import Phaser from 'phaser';
import { sfx, stopJam, setMusicTheme, musicTheme, setVoice, say, getVolume } from './sfx.js';
import { ANCHOR, HAIR, DRESS, SKIN } from './character.js';
import { BIG_FURNITURE, makeFurnitureTextures, outline } from './furniture.js';
import { Alchemy } from './alchemy.js';
import { makePotions } from './potions.js';
import { makeBath } from './bath.js';
import { makeParty } from './party.js';
import { makeSalon, smoothieTex } from './salon.js';
import { makePlay } from './play.js';
import { installCast } from './cast.js';
import { installLife } from './life.js';
import { installNav } from './nav.js';
import { makeSeason, installSeason, today, isWinter } from './season.js';
import { Stickers, installStickers } from './stickers.js';
import { openParent, statHit, statTime, flushStats, getStats, exportData } from './parent.js';
import { installRepair } from './repair.js';
import { installDream, Dream } from './dream.js';
import { makeTidy, installTidy } from './tidy.js';
import { makeClean, installClean } from './clean.js';
import { makePose, installPose } from './pose.js';
import { R, roomAt, placeOf, INSERTED } from './places.js';
import { installGarden, GROW, PLOT_DX, TREASURE } from './garden.js';
import { installScenery } from './scenery.js';
import { installTravel } from './travel.js';
import { makeVillage, installVillage } from './village.js';
import { makeCity, installCity } from './city.js';
import { makeSea, installSea } from './sea.js';
import { makePark, installPark } from './park.js';
import { makeCenter, installCenter } from './center.js';
import { makePots, installPots } from './pots.js';
import { makePlayroom, installPlayroom } from './playroom.js';
import { installDecor } from './decor.js';
import { installBedtime } from './bedtime.js';
import { L, screenSize, computeLayout, CAT_ORDER, FAVORITES, WISH_FOOD, WISH_WEAR, WISH_PET, COOK, FRIDGE, SOUR, HOT, HINTS, BED_HINTS, SWEET, LURES, PET_TOYS, DREAM_THEMES, DREAMS, HIDE, RX, behaviorOf, rnd, lightHex, pick, pixelMap } from './core.js';
import { installInput } from './input.js';
import { installSave } from './save.js';
import { installDrawer } from './drawer.js';
import { installScreens } from './screens.js';
import { installPets } from './pets.js';
import { installHall } from './hall.js';
import { installBathroom } from './bathroom.js';
import { installKitchen } from './kitchen.js';
import { installBedroom } from './bedroom.js';
// =====================================================================
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() { this.load.json('items', 'assets/items/items.json'); }
  create() { this.scene.start('room'); }
}

// =====================================================================
class Room extends Phaser.Scene {
  constructor() { super('room'); }

  preload() {
    const data = this.cache.json.get('items');
    this.tile = data.tile;
    this.items = data.items;
    this.byId = new Map(this.items.map((r) => [r.id, r]));
    this.aliases = data.aliases || {}; // старые id -> текущие (сохранения переживают перегенерацию атласов)
    // крупная мебель (рисуется в коде) заменяет в ящике свои 16×16-аналоги из датасета
    this.big = {};
    const bigSubjects = new Set(BIG_FURNITURE.map((b) => b.icon));
    for (const [order, b] of BIG_FURNITURE.entries()) {
      const icon = this.items.find((r) => r.subject === b.icon);
      const rec = { id: `big_${b.key}`, subject: b.subject, cat: 'furniture', tags: ['furniture'], tex: `big_${b.key}`, icon, order };
      this.big[b.key] = rec;
      this.byId.set(rec.id, rec);
    }
    // цветные зелья (рисуются в коде): у каждого цвета свой постоянный эффект
    const potions = makePotions(this);
    for (const r of potions) this.byId.set(r.id, r);
    const bath = makeBath(this); // фен и пена для ванны — во вкладке игрушек
    for (const r of bath) this.byId.set(r.id, r);
    const party = makeParty(this); // торт, глазурь, посыпка, свечи — в еде; подарки и гирлянда — в игрушках
    for (const r of party) this.byId.set(r.id, r);
    const salon = makeSalon(this); // блендер — в кухне; косметика и зубная щётка — в игрушках; коктейль только из блендера
    for (const r of salon) this.byId.set(r.id, r);
    const play = makePlay(this); // фотоаппарат — в игрушках; фото на стене — только из фотоаппарата
    for (const r of play) this.byId.set(r.id, r);
    const tidy = makeTidy(this); // урна и метла — в игрушках
    for (const r of tidy) this.byId.set(r.id, r);
    makePose(this);
    const clean = makeClean(this); // робот и швабра — в игрушках, стиральная машина — в мебели, компост — в саду
    for (const r of clean) this.byId.set(r.id, r);
    const village = makeVillage(this); // животные села — во вкладке зверей, постройки и техника — в мебели
    for (const r of village) this.byId.set(r.id, r);
    const city = makeCity(this); // прилавки, касса, автоматы города — в мебели
    for (const r of city) this.byId.set(r.id, r);
    const sea = [...makeSea(this), ...makePark(this), ...makeCenter(this), ...makePots(this), ...makePlayroom(this)]; // пальма, лодка, сундук моря, слон и карусель парка, котлы локаций, вещи игровой — в мебели
    for (const r of sea) this.byId.set(r.id, r);
    this.winter = isWinter(today());
    const season = makeSeason(this); // ёлка — во вкладке мебели, только зимой
    for (const r of season) this.byId.set(r.id, r);
    this.byCat = {
      furniture: [...Object.values(this.big), ...clean.filter((r) => r.cat === 'furniture'), ...village.filter((r) => r.cat === 'furniture'), ...city.filter((r) => r.cat === 'furniture'), ...sea.filter((r) => r.cat === 'furniture'), ...(this.winter ? season : [])], magic: potions.slice(),
      garden: clean.filter((r) => r.cat === 'garden' && !r.hidden),
      kitchen: salon.filter((r) => r.cat === 'kitchen'),
      food: party.filter((r) => r.cat === 'food'),
      toy: [...party.filter((r) => r.cat === 'toy'), ...bath.filter((r) => r.cat === 'toy'), ...salon.filter((r) => r.cat === 'toy'), ...play.filter((r) => !r.hidden), ...tidy, ...clean.filter((r) => r.cat === 'toy' && !r.hidden)],
      animal: [...bath.filter((r) => r.cat === 'animal'), ...village.filter((r) => r.cat === 'animal')],
    };
    for (const r of this.items) {
      if (HIDE.test(r.subject) || bigSubjects.has(r.subject)) continue;
      (this.byCat[r.cat] ||= []).push(r);
    }
    for (const [c, list] of Object.entries(this.byCat)) {
      const fav = FAVORITES[c] || [];
      // свои предметы (нарисованные в коде) — первыми и в заданном порядке
      const rank = (r) => { if (r.tex) return -1000 + (r.order || 0); const i = fav.indexOf(r.subject); return i < 0 ? 1e6 : i; };
      list.sort((a, b) => rank(a) - rank(b) || a.subject.localeCompare(b.subject));
    }
    this.cats = CAT_ORDER.filter((c) => this.byCat[c]);
    for (const c of this.cats) {
      if (!this.textures.exists(c)) this.load.spritesheet(c, `assets/items/${c}.png`, { frameWidth: this.tile, frameHeight: this.tile });
    }
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(L.P).setRoundPixels(true);
    // всё, что создают эти функции, — интерфейс: закрепить на экране (не прокручивается вместе с комнатами)
    for (const name of ['buildDrawer', 'buildNav', 'openDressUp', 'buildDressRows', 'openAlbum', 'buildAlbum']) {
      const orig = Room.prototype[name];
      this[name] = (...args) => {
        const before = new Set(this.children.list);
        const res = orig.apply(this, args);
        for (const o of this.children.list) if (!before.has(o)) o.setScrollFactor?.(0);
        return res;
      };
    }
    stopJam(); // перестройка сцены (поворот, полный экран) — джем начинается заново
    this.objs = [];
    this.flags = {};
    this.uidSeq = 1;
    // временные эффекты прошлой сцены (поворот экрана пересоздаёт сцену)
    this.discoBall = null; this.discoSpots = null; this.discoDim = null; this.popBubbles = [];
    this.butterflies = []; this.digSpot = null; this.nightStars = null; this.raining = false; this.snapping = false;
    this.night = false;
    this.press = null;
    // состояние прошлой сцены (объекты уже уничтожены): открытые экраны, желание, вкладка ящика
    this.dress = null; this.albumUi = null; this.mapUi = null; this.wish = null; this.cat = null;
    this.snow = null; this.buddy = null; this.albumDefs = null; this.castList = null;
    this.stickers = new Stickers();

    this.makeTextures();
    makeFurnitureTextures(this);
    this.drawRoom();
    this.makeParticles();
    this.initDreams();
    this.initTidy();

    this.overlay = this.add.rectangle(0, 0, L.WORLD, L.ROOM_H, 0x140c38, 0).setOrigin(0).setDepth(10000);

    this.refreshCastIcons(); // портреты нужны вкладке «люди» ещё до загрузки дома
    this.buildDrawer();
    this.buildNav();
    this.buildMapBtn();
    // котёл: пул результатов для пар без рецепта — волшебное, игрушки и любимая еда
    const favFood = new Set(FAVORITES.food);
    const pool = [...(this.byCat.magic || []), ...(this.byCat.toy || []), ...(this.byCat.food || []).filter((r) => favFood.has(r.subject))];
    this.alchemy = new Alchemy((subj) => this.findRec(subj), pool);
    if (!this.loadState()) { this.defaultRoom(); this.flags.inserted = [...INSERTED]; } // новый дом: вставленные комнаты уже на местах
    else this.repairLayout(); // дом, пострадавший от старой ошибки поворота экрана, возвращается на место
    this.ensureKitchen();
    this.ensureGarden();
    this.ensureBath();
    this.ensureParty();
    this.ensureHall();
    this.ensurePetBed();
    this.ensureKitchen2();
    this.ensureBath2();
    this.ensureHall2();
    this.ensureBedroom2();
    this.ensureGarden2();
    this.ensurePlayroom(); // до урн: в игровой урна своя
    this.ensureTidy();
    this.ensureClean();
    this.initClean();
    this.ensureVillage();
    this.initVillage();
    this.ensureCity();
    this.initCity();
    this.ensureSea();
    this.initSea();
    this.ensurePark();
    this.initPark();
    this.ensureCenter();
    this.initCenter();
    this.ensurePots();
    this.initPots();
    this.initTravel();
    this.initDecor(); // обои и полы, выбранные валиком
    this.initBedtime();
    this.ensureCast();
    this.dailyVisit();
    this.ensureWinter();
    this.buildCurtain();
    this.buildCloud();
    this.swingG = this.add.graphics();
    for (const o of this.objs) if (o.plots) { this.renderPlots(o); o.plots.forEach((p, i) => { if (p?.watered) this.growLater(o, i); }); }
    this.ensureMagic();
    this.cameras.main.scrollX = (this.roomIdx || 0) * L.W;
    this.curRoom = this.targetRoom = this.roomIdx || 0;
    this.applyNight(this.night);

    this.input.on('pointerdown', (p, over) => this.onDown(p, over));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('gameout', () => {
      if (this.press?.moved && this.press.obj) this.drop(this.press.obj, this.pt(this.press.p));
      this.press = null;
    });

    // питомцы оживают: прыгают по полу и находят еду
    this.time.addEvent({ delay: 3500, loop: true, callback: () => this.petTick() });

    // жизнь персонажей: желания, сон, танцы под музыку
    this.wish = null;
    this.bedTalkN = 0; this.bedTalkUntil = 0;
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.wishTick() });
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.sleepTick() });
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.dozeTick() });
    this.time.addEvent({ delay: 6000, loop: true, callback: () => this.danceTick() });
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.potIdle() });
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.idleTick() });
    if (this.winter) this.time.addEvent({ delay: 800, loop: true, callback: () => this.seasonTick() });
    this.time.addEvent({ delay: 600, loop: true, callback: () => this.bathTick() });
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.gardenTick() });

    // моргание
    this.time.addEvent({
      delay: 1800, loop: true, callback: () => {
        const chars = this.objs.filter((o) => o.kind === 'char' && !o.busy && !o.dragging && !o.sleeping);
        if (!chars.length) return;
        const c = pick(chars);
        c.setTexture(c.key + '_blink');
        this.time.delayedCall(140, () => { if (!c.busy) c.setTexture(c.key); });
      },
    });
  }

  /** Координаты указателя в мире (арт-пикселях). */
  pt(p) { return { x: p.worldX, y: p.worldY, t: p.upTime }; }

  // ---------------------------------------------------------------- textures
  makeTextures() {
    if (this.textures.exists('glow')) return; // повторный create() после сброса/поворота
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRect(0, 0, 1, 1).generateTexture('px', 1, 1).clear();
    pixelMap(g, ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], 0, 0, 0xff6b9a);
    g.generateTexture('heart', 7, 6).clear();
    pixelMap(g, ['..X..', '..X..', 'XXXXX', '..X..', '..X..'], 0, 0, 0xffffff);
    g.generateTexture('spark', 5, 5).clear();
    pixelMap(g, ['..XXX', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..', '.X...'], 0, 0, 0xffffff);
    g.generateTexture('note', 5, 7).clear();
    pixelMap(g, ['XXXXX', '...X.', '..X..', '.X...', 'XXXXX'], 0, 0, 0xffffff);
    g.generateTexture('zzz', 5, 5).clear();
    // стадии растения и капля «полей меня»
    pixelMap(g, ['..XXX..', '.XXXXX.', 'XXXXXXX'], 0, 0, 0x4f3524);
    pixelMap(g, ['...X...'], 0, 0, 0x8fd16a);
    g.generateTexture('plant_seed', 7, 3).clear();
    pixelMap(g, ['X.....X', 'XX...XX', '.XX.XX.', '..XXX..', '...X...', '...X...', '...X...'], 0, 0, 0x5fbf4a);
    g.generateTexture('plant_sprout', 7, 7).clear();
    pixelMap(g, ['...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..XXXXXXX..', '....XXX....', '.....X.....', '.....X.....', '.....X.....'], 0, 0, 0x4fa83d);
    pixelMap(g, ['...XX......', '.XX........', 'X..........'], 1, 1, 0x8fe07a);
    g.generateTexture('plant_bush', 11, 10).clear();
    pixelMap(g, ['..X..', '..X..', '.XXX.', 'XXXXX', 'XXXXX', 'XXXXX', '.XXX.'], 0, 0, 0x5ac4f2);
    pixelMap(g, ['.....', '.....', '.....', '.X...'], 0, 0, 0xffffff);
    g.generateTexture('water_drop', 5, 7).clear();
    // иконки желаний «музыка» и «спать» (12×12)
    pixelMap(g, ['....XXXXXXX', '....XXXXXXX', '....X.....X', '....X.....X', '....X.....X', '....X.....X',
      '..XXX...XXX', '.XXXX..XXXX', '.XXXX..XXXX', '..XX....XX.'], 0, 1, 0x8a52cc);
    g.generateTexture('wish_music', 12, 12).clear();
    pixelMap(g, ['...XXXX.....', '..XXX.......', '.XXX........', '.XXX........', 'XXX.........', 'XXX.........',
      'XXX.........', '.XXX......X.', '.XXXX....XX.', '..XXXXXXXX..', '....XXXX....'], 0, 1, 0xf2c94c);
    pixelMap(g, ['XXX', '..X', '.X.', 'XXX'], 8, 1, 0x5a7fd9);
    g.generateTexture('wish_sleep', 12, 12).destroy();
    // облачко-мысль 26×22 с «хвостиком» из кружков
    const bc = document.createElement('canvas');
    bc.width = 28; bc.height = 24;
    const bg = bc.getContext('2d', { willReadFrequently: true });
    bg.fillStyle = '#ffffff';
    for (let y = 0; y < 24; y++) for (let x = 0; x < 28; x++) {
      const inMain = ((x - 15) / 12) ** 2 + ((y - 9.5) / 8.6) ** 2 <= 1;
      const inT1 = (x - 6) ** 2 + (y - 19) ** 2 <= 4.5;
      const inT2 = (x - 2.5) ** 2 + (y - 22) ** 2 <= 1.6;
      if (inMain || inT1 || inT2) bg.fillRect(x, y, 1, 1);
    }
    outline(bc);
    this.textures.addCanvas('bubble', bc);
    // мягкое свечение лампы — единственный «не пиксельный» элемент (свет и должен быть мягким)
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const cx = c.getContext('2d');
    const grd = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,240,190,0.9)');
    grd.addColorStop(1, 'rgba(255,240,190,0)');
    cx.fillStyle = grd;
    cx.fillRect(0, 0, 64, 64);
    this.textures.addCanvas('glow', c);
  }

  makeParticles() {
    this.fxZ = this.add.particles(0, 0, 'zzz', {
      lifespan: 1600, speedX: { min: 4, max: 10 }, speedY: { min: -14, max: -9 },
      tint: [0x8fa8f2, 0xffffff], alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(10005);
    this.fxCrumbs = this.add.particles(0, 0, 'px', {
      lifespan: 600, speed: { min: 15, max: 45 }, angle: { min: 200, max: 340 }, gravityY: 180, emitting: false,
    }).setDepth(16000);
    this.fxHearts = this.add.particles(0, 0, 'heart', {
      lifespan: 1000, speedX: { min: -15, max: 15 }, speedY: { min: -35, max: -20 },
      alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(16000);
    this.fxSparks = this.add.particles(0, 0, 'spark', {
      lifespan: 700, speed: { min: 20, max: 55 }, alpha: { start: 1, end: 0 },
      tint: [0xfff07a, 0xff9ad5, 0x9ad9ff, 0xb8ff9a, 0xffffff], emitting: false,
    }).setDepth(16000);
    this.fxPoof = this.add.particles(0, 0, 'px', {
      lifespan: 400, speed: { min: 10, max: 35 }, scale: { start: 2, end: 1 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(16000);
    this.fxNotes = this.add.particles(0, 0, 'note', {
      lifespan: 1100, speedX: { min: -12, max: 12 }, speedY: { min: -30, max: -18 },
      tint: [0x5ac4f2, 0xf27aa6, 0x7ad9b5, 0xc48ff2], alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(16000);
  }

  // ---------------------------------------------------------------- objects
  spawnItem(rec, x, y, extra = {}) {
    const beh = behaviorOf(rec);
    const o = (rec.tex ? this.add.image(x, y, rec.tex) : this.add.image(x, y, rec.cat, rec.frame))
      .setOrigin(0.5, 1).setInteractive();
    Object.assign(o, {
      kind: 'item', uid: extra.uid || this.uidSeq++, rec, beh,
      contents: extra.contents || [], lit: extra.lit ?? true, owner: null, slot: null, restOn: null,
      plots: beh.gardenBed ? (extra.plots || [null, null, null]) : null,
      deco: beh.cake ? (extra.deco || {}) : null,
      stage: beh.sand ? (extra.stage || 0) : undefined, // замок из песка: сколько уже построено
      slots: beh.pet || beh.scarecrow || beh.mannequin || beh.hatter ? { pethat: null } : undefined, // шапка на питомце, пугале, манекене или обезьянке
    });
    this.uidSeq = Math.max(this.uidSeq, o.uid + 1);
    // накладки (слои торта, пятна, пена, свечение) исчезают вместе с предметом, как бы он ни был уничтожен
    o.once('destroy', () => {
      if (o.cakeLayers) Object.values(o.cakeLayers).forEach((l) => l.destroy());
      o.stainImg?.destroy(); o.foamImg?.destroy();
    });
    if (beh.cake) this.time.delayedCall(0, () => this.renderCake(o));
    if (beh.smoothie) { o.color = extra.color ?? 0xff9ac8; o.setTexture(smoothieTex(this, o.color)); }
    if (beh.blender) this.time.delayedCall(0, () => { if (o.active) this.renderBlender(o); });
    if (beh.photo) { o.photoId = extra.photoId; this.applyPhotoTex(o); }
    if (beh.light) {
      o.glow = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(10001).setVisible(false);
    }
    this.objs.push(o);
    return o;
  }

  spawnChar(x, y, look, extra = {}) {
    const uid = extra.uid || this.uidSeq++;
    this.uidSeq = Math.max(this.uidSeq, uid + 1);
    const key = `char${uid}`;
    this.charTex({ baseKey: key, look }); // стоя и сидя
    const o = this.add.image(x, y, key).setOrigin(0.5, 1).setInteractive();
    Object.assign(o, {
      kind: 'char', uid, key, baseKey: key, pose: 'stand', look, mul: extra.mul || 1, slots: { head: null, face: null, hand: null }, cast: extra.cast || null,
      busy: false, rainbow: 0,
    });
    o.setScale(o.mul);
    this.objs.push(o);
    return o;
  }

  removeObj(o, quiet = false) {
    if (!quiet) {
      this.fxPoof.explode(8, o.x, o.y - o.displayHeight / 2);
      sfx.poof();
    }
    this.objs = this.objs.filter((x) => x !== o);
    for (const x of this.objs) if (x.restOn === o) x.restOn = null;
    if (o.owner) o.owner.slots[o.slot] = null;
    o.glow?.destroy();
    o.plantImgs?.forEach((x) => x?.destroy());
    o.stainImg?.destroy();
    o.foamImg?.destroy();
    o.dropImgs?.forEach((x) => x?.destroy());
    o.destroy();
  }

  findRec(subject) { return this.items.find((r) => r.subject === subject); }

  /** Уменьшенная по пикселям копия спрайта, вписанная в maxW×maxH (null — если и так помещается). */
  fitTex(rec, maxW, maxH) {
    if (rec.tex || !rec.bbox) return null;
    const [x0, y0, x1, y1] = rec.bbox;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    if (bw <= maxW && bh <= maxH) return null;
    const key = `fit_${rec.id}_${maxW}x${maxH}`;
    if (this.textures.exists(key)) return key;
    const fr = this.textures.getFrame(rec.cat, rec.frame);
    // внутренность без старого контура -> масштаб -> новый контур
    const sc = Math.min((maxW - 2) / Math.max(1, bw - 2), (maxH - 2) / Math.max(1, bh - 2));
    const dw = Math.max(1, Math.round((bw - 2) * sc));
    const dh = Math.max(1, Math.round((bh - 2) * sc));
    const c = document.createElement('canvas');
    c.width = dw + 2;
    c.height = dh + 2;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(fr.source.image, fr.cutX + x0 + 1, fr.cutY + y0 + 1, bw - 2, bh - 2, 1, 1, dw, dh);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 127 ? 255 : 0;
    g.putImageData(d, 0, 0);
    outline(c);
    this.textures.addCanvas(key, c);
    return key;
  }

  recOf(id) { return this.byId.get(id) || this.byId.get(this.aliases[id]) || null; }

  defaultRoom() {
    const { W, FLOOR_TOP, ROOM_H } = L;
    const put = (subj, x, y) => { const r = this.findRec(subj); return r ? this.spawnItem(r, Math.round(x), Math.round(y)) : null; };
    const big = (key, x, y) => this.spawnItem(this.big[key], Math.round(x), Math.round(y));
    const on = (base, subj, dx, dy) => { const o = put(subj, base.x + dx, base.y - dy); if (o) o.restOn = base; return o; };
    big('rug', W * 0.45, ROOM_H - 5);
    const bed = big('bed', 25, FLOOR_TOP + 15);
    big('wardrobe', 66, FLOOR_TOP + 5);
    put('cuckoo clock', W * 0.42, FLOOR_TOP - 22);
    const table = big('table', W * 0.56, FLOOR_TOP + 17);
    big('lamp', W * 0.69, FLOOR_TOP + 7);
    big('sofa', W - 50, FLOOR_TOP + 12);
    big('chest', W - 16, ROOM_H - 4);
    on(bed, 'teddy bear', -10, 9);
    on(table, 'cupcake', -8, 20);
    on(table, 'apple', 0, 20);
    const album = big('album', table.x + 10, table.y - 20);
    album.restOn = table;
    put('tabby cat', W * 0.47, ROOM_H - 4);
    put('toy piano', W * 0.6, ROOM_H - 3);
    put('toy drum', W * 0.67, ROOM_H - 2);
    this.spawnChar(Math.round(W * 0.33), ROOM_H - 4, { hair: HAIR[0], skin: SKIN[0], dress: DRESS[0], hairStyle: 'long', outfit: 'dress' });
    this.spawnChar(Math.round(W * 0.8), ROOM_H - 6, { hair: HAIR[2], skin: SKIN[1], dress: DRESS[1], hairStyle: 'pigtails', outfit: 'pants' });
  }

  /** Алхимическая кухня: появляется и в старых сохранениях (если во второй комнате пусто). */
  ensureKitchen() {
    if (this.objs.some((o) => o.x >= R.kitchen * L.W && o.x < (R.kitchen + 1) * L.W)) return;
    const { W, FLOOR_TOP } = L;
    const x0 = W;
    const big = (key, fx, y) => this.spawnItem(this.big[key], Math.round(x0 + W * fx), Math.round(y));
    const onRec = (base, rec, dx, dy) => { if (!rec) return null; const o = this.spawnItem(rec, base.x + dx, base.y - dy); o.restOn = base; return o; };
    const counter = big('counter', 0.18, FLOOR_TOP + 14);
    onRec(counter, this.findRec('teapot'), -13, 20);
    onRec(counter, this.findRec('star'), 0, 20);
    onRec(counter, this.findRec('feather'), 11, 20);
    big('stove', 0.4, FLOOR_TOP + 12);
    const s1 = big('shelf', 0.3, FLOOR_TOP - 30);
    const s2 = big('shelf', 0.55, FLOOR_TOP - 30);
    ['pink', 'green', 'yellow'].forEach((c, i) => onRec(s1, this.byId.get(`potion-${c}`), -12 + i * 12, 4));
    ['blue', 'purple', 'rainbow'].forEach((c, i) => onRec(s2, this.byId.get(`potion-${c}`), -12 + i * 12, 4));
    // котёл — сердце алхимической кухни: переносим существующий (пустой) или ставим новый
    const pot = this.objs.find((o) => o.kind === 'item' && o.beh.cauldron && !o.contents.length);
    const px = Math.round(x0 + W * 0.53);
    if (pot) { pot.x = px; pot.y = FLOOR_TOP + 22; pot.restOn = null; } else big('cauldron', 0.53, FLOOR_TOP + 22);
    big('fridge', (W - 28) / W, FLOOR_TOP + 5);
    this.save();
  }

  // ---------------------------------------------------------------- день рождения

  // ---------------------------------------------------------------- уход за питомцами
  favToy(p) { return PET_TOYS[(p.uid * 5) % PET_TOYS.length]; }

  // ---------------------------------------------------------------- сцена и джем

  /** Лежанка для питомцев один раз появляется в спальне (если её ещё нигде нет). */
  ensurePetBed() {
    if (this.flags.petbed) return;
    this.flags.petbed = true;
    if (!this.objs.some((o) => o.rec?.id === 'big_petbed')) this.spawnItem(this.big.petbed, Math.round(L.W * 0.14), L.ROOM_H - 2);
    this.save();
  }

  // ---------------------------------------------------------------- ванная

  // ---------------------------------------------------------------- кухня: холодильник, блендер, вкусы

  // ---------------------------------------------------------------- ванная: косметика, щётка, пузыри, унитаз

  // ---------------------------------------------------------------- концертный зал: микрофон, зрители, занавес, диско

  // ---------------------------------------------------------------- спальня: батут, сундук, ночник, фотоаппарат

  // ---------------------------------------------------------------- сад: тучка и радуга, качели, бабочки, клад
  // ---------------------------------------------------------------- навигация между комнатами
  buildNav() {
    const { W, ROOM_H } = L;
    const y = Math.round(ROOM_H / 2);
    this.nav = [-1, 1].map((dir) => {
      const x = dir < 0 ? 8 : W - 8;
      // крупная яркая кнопка-стрелка с мягкой пульсацией — заметна ребёнку
      const hit = this.add.rectangle(x, y, 15, 30, 0x8a52cc, 0.9).setDepth(19000).setInteractive();
      hit.setStrokeStyle(1, 0xffffff, 0.9);
      hit.ui = { nav: dir };
      const g = this.add.graphics().setDepth(19001);
      const rows = dir > 0
        ? ['X.....', 'XX....', 'XXX...', 'XXXX..', 'XXXXX.', 'XXXXXX', 'XXXXX.', 'XXXX..', 'XXX...', 'XX....', 'X.....']
        : ['.....X', '....XX', '...XXX', '..XXXX', '.XXXXX', 'XXXXXX', '.XXXXX', '..XXXX', '...XXX', '....XX', '.....X'];
      pixelMap(g, rows, x - 3, y - 5, 0xffffff);
      this.tweens.add({ targets: hit, fillAlpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return [hit, g];
    });
  }

  goRoom(idx) {
    const cam = this.cameras.main;
    idx = Phaser.Math.Clamp(idx, 0, L.ROOMS - 1);
    if (placeOf(idx) !== this.placeNow()) { this.travel(idx); return; } // комната другой локации — туда едут (travel.js)
    if (this.jam?.size && idx !== Math.round(this.cameras.main.scrollX / L.W)) this.jamEnded();
    this.targetRoom = idx;
    const target = this.targetRoom * L.W;
    if (Math.abs(cam.scrollX - target) > 1) sfx.pick();
    this.tweens.add({ targets: cam, scrollX: target, duration: 350, ease: 'Sine.easeInOut', onComplete: () => { this.save(); this.potHello(); this.arrived(); } });
  }

  /** Камера встала в комнате: своя мелодия, местные здороваются, любимая кукла идёт следом. */
  arrived() {
    const prev = this.curRoom ?? 0;
    if (this.targetRoom === prev) return;
    this.curRoom = this.targetRoom;
    setMusicTheme(this.night ? 0 : roomAt(this.curRoom).music);
    this.onRoomEnter(this.curRoom, prev);
  }

  /** Котёл тихо булькает, пока его видно. */
  potIdle() {
    if (this.dress || this.albumUi || this.bedtime) return;
    for (const pot of this.objs) {
      if (pot.kind !== 'item' || !pot.beh.cauldron || pot.brewing || !this.visible(pot)) continue;
      this.fxCrumbs.setParticleTint(0x9ff5b8);
      this.fxCrumbs.explode(2, pot.x + rnd(-6, 6), pot.y - pot.displayHeight + 3);
      if (Math.random() < 0.3) sfx.blub();
    }
    // неопробованное подпрыгивает с искорками — «потрогай меня»
    if (Math.random() < 0.5) return;
    const tried = this.flags.tried || {};
    if (!tried.rain && this.cloud && !this.night && Math.round(this.cameras.main.scrollX / L.W) === R.garden && Math.random() < 0.4) {
      this.tweens.add({ targets: this.cloud, y: this.cloud.y - 2, duration: 140, yoyo: true, repeat: 1 });
      this.fxCrumbs.setParticleTint(0x7fbfff);
      this.fxCrumbs.explode(3, this.cloud.x, this.cloud.y + 6);
      return;
    }
    if (!tried.curtain && this.curtain && Math.round(this.cameras.main.scrollX / L.W) === R.hall && Math.random() < 0.4) {
      for (const [i, c] of this.curtain.entries()) this.tweens.add({ targets: c, x: c.x + (i ? -2 : 2), duration: 140, yoyo: true, repeat: 1, onUpdate: () => this.clipCurtain() });
      return;
    }
    const lure = LURES.filter(([k]) => !tried[k])
      .flatMap(([, f]) => this.objs.filter((o) => o.kind === 'item' && f(o.beh) && !o.dragging && !o.owner && !o.blending && this.visible(o)));
    if (!lure.length) return;
    const o = pick(lure);
    this.fxSparks.explode(4, o.x, o.y - o.displayHeight);
    this.tweens.add({ targets: o, y: o.y - 3, duration: 120, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  /** Первый за сеанс приход в комнату с котлом: котёл «здоровается» фонтанчиком. */
  potHello() {
    if (this.potGreeted) return;
    const pot = this.objs.find((o) => o.kind === 'item' && o.beh.cauldron && this.visible(o));
    if (!pot) return;
    this.potGreeted = true;
    this.fxSparks.explode(16, pot.x, pot.y - pot.displayHeight);
    this.fxCrumbs.setParticleTint(0x9ff5b8);
    this.fxCrumbs.explode(10, pot.x, pot.y - pot.displayHeight + 3);
    [0, 0.15, 0.3].forEach((d) => this.time.delayedCall(d * 1000, () => sfx.blub()));
    this.tweens.add({ targets: pot, y: pot.y - 4, duration: 120, yoyo: true, repeat: 1 });
  }

  /** Довести камеру до ближайшей комнаты (после свайпа или переноса предмета к краю). */
  snapCamera(bias = 0) {
    const cam = this.cameras.main;
    this.goRoom(this.inPlace(Math.round(cam.scrollX / L.W + bias)));
  }

  // ---------------------------------------------------------------- drawer UI

  // ---------------------------------------------------------------- input

  // ---------------------------------------------------------------- actions
  tossIn(rec) {
    this.addRecent(rec);
    const o = this.spawnItem(rec, Math.round(this.cameras.main.scrollX + rnd(20, L.W - 20)), -4); // в комнату, которую видно
    const ty = Math.round(rnd(L.FLOOR_TOP + 4, L.ROOM_H - 3));
    sfx.pick();
    this.tweens.add({ targets: o, y: ty, duration: 600, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } });
  }

  tap(o) {
    if (o.kind === 'char') {
      this.buddy = o.uid; // с кем играли последней — та и пойдёт следом в другую комнату
      const held = o.slots.hand;
      if (held && !o.busy && held.beh.potion) { this.drinkPotion(o, held); return; }
      if (held && !o.busy && held.beh.edible) { this.feed(o, held); return; }
      if (held && !o.busy && held.beh.mic) { this.sing(o); return; }
      if (o.sleeping) { o.sleeping = false; o.awakeUntil = this.time.now + 8000; }
      // смех заразителен: соседка рядом тоже смеётся
      for (const c of this.objs) {
        if (c === o || c.kind !== 'char' || c.busy || c.sleeping || Math.abs(c.x - o.x) > 45 || Math.abs(c.y - o.y) > 30) continue;
        this.time.delayedCall(220, () => {
          if (c.busy) return;
          sfx.giggle();
          c.setTexture(c.key + '_blink');
          this.tweens.add({ targets: c, y: c.y - 6, duration: 150, yoyo: true, onComplete: () => { if (!c.busy) c.setTexture(c.key); } });
          this.fxHearts.explode(1, c.x, c.y - c.displayHeight);
        });
      }
      sfx.giggle();
      o.busy = true;
      o.hopBusy = true;
      o.setTexture(o.key + '_blink');
      this.tweens.add({
        targets: o, y: o.y - 7, duration: 160, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => { o.busy = false; o.hopBusy = false; o.setTexture(o.key); },
      });
      this.fxHearts.explode(2, o.x, o.y - o.displayHeight);
      return;
    }
    const b = o.beh;
    // еда/зелье в руке у персонажа: тап по ним = укус / глоток (рука закрывает туловище — тапают именно сюда)
    if (o.owner && o.slot === 'hand' && !o.owner.busy) {
      if (b.potion) { this.drinkPotion(o.owner, o); return; }
      if (b.edible) { this.feed(o.owner, o); return; }
      if (b.mic) { this.sing(o.owner); return; }
    }
    if (this.villageTap(o)) return;
    if (this.cityTap(o)) return;
    if (this.seaTap(o)) return;
    if (this.parkTap(o)) return;
    if (this.centerTap(o)) return;
    if (this.playroomTap(o)) return;
    if (b.disco) { this.toggleDisco(o); return; }
    if (b.bin) { this.binTap(o); return; }
    if (b.robot) { this.robotTap(o); return; }
    if (b.washer) { this.washerTap(o); return; }
    if (b.fridge) { this.openFridge(o); return; }
    if (b.blender) { this.blend(o); return; }
    if (b.tub) { this.blowBubbles(o); return; }
    if (b.toilet) { this.flushFx(o); return; }
    if (b.chest) { this.openChest(o); return; }
    if (b.camera) { this.takePhoto(o); return; }
    if (b.swing) { this.pushSwing(o); return; }
    if (b.nyTree) { this.tapTree(o); return; }
    if (b.furniture && RX.bedLike.test(o.rec.subject) && this.bounce(o)) return;
    if (b.container && o.contents.length) { this.spill(o); return; }
    if (b.album) { this.openAlbum(); return; }
    if (b.cake && o.deco.candles) { if (o.deco.lit) this.blowCandles(o); else this.lightCandles(o); return; }
    if (b.gardenBed) { this.plotTap(o, this.tapPoint?.x ?? o.x); return; }
    if (b.appleTree || b.fruit) { this.shakeTree(o); return; }
    if (b.cauldron) {
      sfx.blub();
      this.fxSparks.explode(4, o.x, o.y - o.displayHeight);
      this.tweens.add({ targets: o, y: o.y - 2, duration: 90, yoyo: true });
      return;
    }
    if (RX.dressUp.test(o.rec.subject)) {
      // пустой шкаф / зеркало -> переодеть ближайшего персонажа
      const chars = this.objs.filter((c) => c.kind === 'char');
      if (chars.length) {
        chars.sort((a, c) => Math.abs(a.x - o.x) - Math.abs(c.x - o.x));
        this.openDressUp(chars[0]);
        return;
      }
    }
    if (b.light) {
      o.lit = !o.lit;
      sfx.click();
      this.nightLight();
      if (!o.lit && this.objs.some((c) => c.kind === 'char' && c.sleeping)) sfx.shh();
      this.save();
    }
    else if (b.music) {
      this.toggleJam(o);
      for (const c of this.objs) if (c.kind === 'char' && Math.floor(c.x / L.W) === Math.floor(o.x / L.W)) this.checkWish(c, 'music');
    }
    else if (b.pet) {
      if (o.sleeping) { o.sleeping = false; o.awakeUntil = this.time.now + 8000; }
      this.petVoice(o); // корова мычит, собака лает; у остальных — писк
      this.fxHearts.explode(1, o.x, o.y - o.displayHeight);
    }
    else sfx.boing();
    // подпрыгивание вместо дробного «сплющивания» — пиксели остаются ровными
    this.tweens.add({ targets: o, y: o.y - (b.pet ? 5 : 3), duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }

  mouth(ch) { return { x: ch.x, y: ch.y - ANCHOR.mouthY * ch.scaleY }; }

  itemColor(o) {
    const c = this.textures.getPixel(8, 9, o.texture.key, o.frame.name) || this.textures.getPixel(8, 8, o.texture.key, o.frame.name);
    return c && c.alpha ? c.color : 0xd9a066;
  }

  /** Сколько укусов до конца: мелкое (вишенка, конфетка) — 1, остальное — 3; напитки — сразу. */
  biteCount(o) {
    if (o.beh.drink || !o.rec.bbox || o.rec.tex) return 1;
    const [x0, y0, x1, y1] = o.rec.bbox;
    return (x1 - x0 + 1) * (y1 - y0 + 1) < 70 ? 1 : 3;
  }

  /** Текстура надкусанной еды: n полукруглых укусов, светлая «мякоть» и тёмный край. */
  biteTex(rec, n) {
    const key = `bite_${rec.id}_${n}`;
    if (this.textures.exists(key)) return key;
    const fr = this.textures.getFrame(rec.cat, rec.frame);
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(fr.source.image, fr.cutX, fr.cutY, 16, 16, 0, 0, 16, 16);
    const img = g.getImageData(0, 0, 16, 16);
    const d = img.data;
    const A = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15 ? 0 : d[(y * 16 + x) * 4 + 3]);
    const [, y0, , y1] = rec.bbox;
    const h = y1 - y0 + 1;
    const r = Math.max(3, Math.round(h * 0.27));
    // край еды на нужной высоте: правый (1-й укус) и левый (2-й укус)
    const edge = (row, side) => {
      const y = Math.round(row);
      for (let i = 0; i < 16; i++) { const x = side > 0 ? 15 - i : i; if (A(x, y)) return x + side; }
      return side > 0 ? 16 : -1;
    };
    const bites = [[edge(y0 + h * 0.38, 1), y0 + h * 0.38], [edge(y0 + h * 0.62, -1), y0 + h * 0.62]];
    const cut = new Uint8Array(256);
    const hole = (cx, cy, rr) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rr * rr + 0.3 && A(x, y)) { d[(y * 16 + x) * 4 + 3] = 0; cut[y * 16 + x] = 1; }
      }
    };
    for (let k = 0; k < n && k < bites.length; k++) {
      const [bx, by] = bites[k];
      // «мультяшный» укус: два перекрывающихся кружка — зубчик посередине
      hole(bx, by - r * 0.45, r * 0.8);
      hole(bx, by + r * 0.45, r * 0.8);
    }
    const near = (x, y, test) => test(x + 1, y) || test(x - 1, y) || test(x, y + 1) || test(x, y - 1);
    const isCut = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && cut[y * 16 + x] === 1;
    const flesh = [];
    const rim = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (A(x, y) && near(x, y, isCut)) flesh.push([x, y]);
      else if (isCut(x, y) && near(x, y, A)) rim.push([x, y]);
    }
    for (const [x, y] of flesh) {
      const i = (y * 16 + x) * 4;
      d[i] = Math.round(d[i] + (255 - d[i]) * 0.6);
      d[i + 1] = Math.round(d[i + 1] + (244 - d[i + 1]) * 0.6);
      d[i + 2] = Math.round(d[i + 2] + (222 - d[i + 2]) * 0.6);
    }
    for (const [x, y] of rim) {
      const i = (y * 16 + x) * 4;
      d[i] = 43; d[i + 1] = 29; d[i + 2] = 46; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.textures.addCanvas(key, c);
    return key;
  }

  applyBites(o) {
    if (o.bites > 0) o.setTexture(this.biteTex(o.rec, o.bites));
  }

  /** Укус (или съесть целиком, если укус последний). Недоеденное персонаж держит в руке. */
  feed(ch, o) {
    if (this.dislikes(ch, o.rec.subject)) { this.refuse(ch, o); return; }
    this.stat('feed');
    this.checkWish(ch, 'food', o.rec);
    ch.sleeping = false;
    ch.busy = true;
    const last = (o.bites || 0) + 1 >= this.biteCount(o);
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
    if (last) this.objs = this.objs.filter((x) => x !== o);
    const m = this.mouth(ch);
    const tint = this.itemColor(o);
    const taste = SOUR.test(o.rec.subject) ? 'sour' : HOT.test(o.rec.subject) ? 'hot' : null;
    o.setDepth(ch.depth + 1);
    o.eating = true;
    this.tweens.add({
      targets: o, x: m.x, y: m.y + 8, duration: 200,
      onComplete: () => {
        if (last) o.destroy();
        else { o.bites = (o.bites || 0) + 1; this.applyBites(o); }
        const steps = last ? 6 : 4;
        let i = 0;
        this.time.addEvent({
          delay: 150, repeat: steps - 1, callback: () => {
            const open = i % 2 === 0;
            ch.setTexture(open ? ch.key + '_open' : ch.key);
            if (open) {
              if (o.beh.drink) sfx.gulp(); else sfx.chew();
              this.fxCrumbs.setParticleTint(tint);
              if (!o.beh.drink) this.fxCrumbs.explode(4, m.x, m.y);
            }
            if (++i === steps) {
              if (last && o.beh.smoothie) {
                // коктейль оставляет «усы» — смываются в ванне или зубной щёткой
                ch.look = { ...ch.look, mustache: lightHex(o.color) };
                this.charTex(ch);
                this.hintDone('smoothie', ch);
              }
              ch.setTexture(ch.key + (taste ? `_${taste}` : '_blink'));
              if (taste) this.tasteReact(ch, taste);
              if (last) {
                this.afterMeal(ch, o.rec);
                if (!taste) { sfx.yum(); this.fxHearts.explode(3, m.x, m.y - 10); }
              } else this.fxHearts.explode(1, m.x, m.y - 10);
              if (o.rec.subject === this.favFood(ch)) {
                // любимая еда: больше сердечек и радостный прыжок
                sfx.yum();
                this.fxHearts.explode(5, m.x, m.y - 12);
                this.tweens.add({ targets: ch, y: ch.y - 6, duration: 140, yoyo: true, repeat: 1 });
              }
              if (!last && o.active) { o.eating = false; this.wear(ch, 'hand', o, true); }
              this.time.delayedCall(taste ? 1500 : 400, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
            }
          },
        });
      },
    });
  }

  // ---------------------------------------------------------------- жизнь персонажей
  /** Любимая еда — постоянная для каждого персонажа (по его номеру). */
  favFood(ch) { return WISH_FOOD[(ch.uid * 7) % WISH_FOOD.length]; }

  visible(o) {
    const cx = this.cameras.main.scrollX;
    return o.x > cx + 8 && o.x < cx + L.W - 8;
  }

  wishTick() {
    if (this.dress || this.albumUi || this.bedtime) return;
    if (this.wish) {
      if (this.time.now > this.wish.until || !this.wish.ch.active) this.clearWish(false);
      return;
    }
    const chars = this.objs.filter((c) => c.kind === 'char' && !c.busy && !c.dragging && !c.sleeping && this.visible(c) && !this.hasDoor(c));
    if (!chars.length) return;
    for (const c of chars) if (c.needs?.has('dryer') && !(c.wetUntil > this.time.now)) c.needs.delete('dryer'); // высохла сама
    const needy = chars.filter((c) => c.needs?.size);
    if (needy.length && Math.random() < 0.5) { const c = pick(needy); this.showHint(c, pick([...c.needs])); return; }
    const tried = (this.flags.tried ||= {});
    // про кровать недавно уже напоминали — пока молчим о ней (и подсказки, и «хочу спать»)
    const quiet = this.bedQuiet();
    const hintsOf = (c) => this.hintsFor(c).filter((h) => !(quiet && BED_HINTS.has(h)));
    const fresh = (c) => hintsOf(c).filter((h) => !tried[h]);
    // есть чему научить — облачка появляются чаще
    if (Math.random() > (chars.some((c) => fresh(c).length) ? 0.5 : 0.22)) return;
    const ch = pick(chars);
    const hs = hintsOf(ch);
    const fr = fresh(ch);
    if (hs.length && Math.random() < (fr.length ? 0.75 : 0.2)) { this.showHint(ch, pick(fr.length ? fr : hs)); return; }
    const r = Math.random();
    const kinds = this.night ? ['sleep', 'sleep', 'food', 'music', 'magic'] : ['food', 'food', 'wear', 'pet', 'music', 'food', 'wear', 'sleep', 'magic', 'magic', 'party'];
    const type = kinds[Math.floor(r * kinds.length)];
    if (type === 'sleep') { if (quiet) return; this.noteBed(); }
    if (type === 'magic') {
      // подсказка неоткрытого рецепта: ингредиент → ингредиент → котёл
      const hint = this.magicPick();
      if (!hint) return;
      const [key, recipe] = hint;
      this.showWish(ch, 'magic', null, { key, recipe });
      return;
    }
    let rec = null;
    if (type === 'food') rec = this.findRec(Math.random() < 0.5 ? this.favFood(ch) : pick(WISH_FOOD));
    if (type === 'wear') rec = this.findRec(pick(WISH_WEAR));
    if (type === 'pet') rec = this.findRec(pick(WISH_PET));
    if ((type === 'food' || type === 'wear' || type === 'pet') && !rec) return;
    this.showWish(ch, type, rec);
  }

  /**
   * Неоткрытый рецепт для подсказки-облачка: сначала — из того, что лежит в этой локации,
   * иногда — «привези издалека» (ингредиенты из двух разных мест). Возвращает [ключ, рецепт] или null.
   */
  magicPick() {
    const open = [...this.alchemy.recipes.entries()].filter(([k]) => !this.alchemy.found[k]);
    if (!open.length) return null;
    const here = this.placeNow().key;
    const near = open.filter(([, r]) => r.place === here);
    const far = open.filter(([, r]) => r.place === 'far');
    return pick(near.length && Math.random() < 0.8 ? near : far.length && Math.random() < 0.7 ? far : near.length ? near : open);
  }

  /** Про кровать недавно напоминали? */
  bedQuiet() { return this.time.now < (this.bedTalkUntil || 0); }

  /**
   * Показали облачко с кроватью (или послушались его — done): следующее такое — не раньше чем через 2 минуты;
   * если не слушают, пауза растёт: 2, 4, 6, 8 минут.
   */
  noteBed(done = false) {
    this.bedTalkN = done ? 0 : (this.bedTalkN || 0) + 1;
    this.bedTalkUntil = this.time.now + Phaser.Math.Clamp(this.bedTalkN, 1, 4) * 120000;
  }

  /** Подсказки для персонажа: «усы» — всегда щётка; иначе — то, что есть в его комнате. */
  hintsFor(ch) {
    if (ch.needs?.size) return [...ch.needs];
    if (ch.look.mustache) return ['teeth'];
    const room = Math.floor(ch.x / L.W);
    const here = (r) => r === room || (r === 'home' && placeOf(room).key === 'home') || (Array.isArray(r) && r.includes(room)); // 'home' — в любой комнате дома
    return Object.keys(HINTS).filter((k) => here(HINTS[k].room) && !!HINTS[k].night === !!this.night && HINTS[k].when?.(this) !== false); // when — подсказка уместна только сейчас
  }

  fridgeRecs() {
    this.fridgeList ||= FRIDGE.map((sub) => this.findRec(sub)).filter(Boolean);
    return this.fridgeList;
  }

  /** Картинка для облачка: предмет каталога (id или название) или 'tex:ключ'. */
  hintIcon(e) {
    if (!e) return null;
    if (typeof e !== 'string') return e;
    if (e.startsWith('tex:')) return e.slice(4);
    return this.byId.get(e) || this.findRec(e);
  }

  /** Потребность персонажа: облачко сразу (если свободно) и потом снова, пока не исполнят. */
  addNeed(ch, name, delay = 2000) {
    (ch.needs ||= new Set()).add(name);
    this.time.delayedCall(delay, () => {
      // потребность важнее чужого случайного желания (кукол в доме много): она его вытесняет
      if (!ch.active || !ch.needs?.has(name) || ch.sleeping || this.dress || this.albumUi) return;
      if (this.wish?.need) return;
      this.showHint(ch, name);
      if (this.wish) this.wish.need = true;
    });
  }

  /** После еды: 3–5 съеденных — на горшок; три сладости — почистить зубы. */
  afterMeal(ch, rec) {
    ch.eaten = (ch.eaten || 0) + 1;
    ch.pottyAt ||= 3 + Math.floor(Math.random() * 3);
    if (ch.eaten >= ch.pottyAt) { ch.eaten = 0; ch.pottyAt = 0; this.addNeed(ch, 'potty', 2500); }
    if (SWEET.test(rec.subject)) {
      ch.sweets = (ch.sweets || 0) + 1;
      if (ch.sweets >= 3) { ch.sweets = 0; this.addNeed(ch, 'teeth', 3500); }
    }
  }

  showHint(ch, name) {
    if (this.hasDoor(ch)) return; // над ней облачко сна — два облачка друг на друге не читаются
    const seq = HINTS[name].seq(this).map((e) => this.hintIcon(e)).filter(Boolean);
    if (!seq.length) return;
    this.showWish(ch, 'hint', null, null, seq);
    this.wish.hint = name;
    if (name === 'travel') this.buddy = ch.uid; // попросилась в дорогу — она и пойдёт следом
    if (BED_HINTS.has(name)) this.noteBed();
  }

  /** Фичу попробовали: запоминаем; если именно о ней просили — желание исполнено. */
  /** Локальная статистика «чем пользуется» (видна только в родительской зоне). */
  stat(name) { statHit(name); }

  hintDone(name, ch = null) {
    this.stat(name);
    ch?.needs?.delete(name);
    const tried = (this.flags.tried ||= {});
    if (!tried[name]) { tried[name] = true; this.save(); }
    if (BED_HINTS.has(name)) this.noteBed(true);
    const w = this.wish;
    if (!w || w.type !== 'hint' || w.hint !== name || (ch && ch !== w.ch)) return;
    this.clearWish(true);
    sfx.fanfare();
    this.fxHearts.explode(6, w.ch.x, w.ch.y - w.ch.displayHeight);
    this.celebrate(w.ch);
  }

  showWish(ch, type, rec, magic = null, seq = null) {
    if (this.wish) this.clearWish(false);
    const bubble = this.add.image(ch.x, ch.y, 'bubble').setOrigin(0.2, 1).setDepth(10003).setScale(0);
    const key = rec ? (rec.tex ? `${rec.tex}_icon` : rec.cat) : type === 'music' ? 'wish_music' : type === 'magic' ? 'big_cauldron_icon' : type === 'bath' ? 'big_tub_icon' : type === 'party' ? 'candle_box_icon' : 'wish_sleep';
    const icon = (rec && !rec.tex ? this.add.image(0, 0, key, rec.frame) : this.add.image(0, 0, key)).setDepth(10004).setAlpha(0);
    this.wish = { ch, type, rec, bubble, icon, until: this.time.now + (magic ? 60000 : 30000), key: magic?.key };
    // картинки по очереди: рецепт — ингредиент → ингредиент → котёл; купание — ванна → мыло; подсказки — свои цепочки
    if (magic) seq = [magic.recipe.a, magic.recipe.b, 'big_cauldron_icon'];
    else if (!seq && type === 'bath') seq = [this.big.tub, this.byId.get('foam-pink')].filter(Boolean);
    if (seq?.length) {
      let i = 0;
      const show = () => {
        const r = seq[i++ % seq.length];
        if (!icon.active || !r) return;
        if (typeof r === 'string') icon.setTexture(r);
        else if (r.tex) icon.setTexture(`${r.tex}_icon`);
        else icon.setTexture(r.cat, r.frame);
      };
      show();
      if (seq.length > 1) this.wish.timer = this.time.addEvent({ delay: 900, loop: true, callback: show });
    }
    sfx.squeak();
    this.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.easeOut', onComplete: () => bubble.setScale(1) });
    this.tweens.add({ targets: icon, alpha: 1, duration: 200, delay: 150 });
    this.updateWishGlow();
  }

  clearWish(happy) {
    const w = this.wish;
    if (!w) return;
    this.wish = null;
    w.timer?.remove();
    this.updateWishGlow();
    if (happy) {
      this.fxSparks.explode(12, w.bubble.x + 8, w.bubble.y - 12);
      w.bubble.destroy();
      w.icon.destroy();
      return;
    }
    this.tweens.add({ targets: [w.bubble, w.icon], alpha: 0, duration: 600, onComplete: () => { w.bubble.destroy(); w.icon.destroy(); } });
  }

  /** Проверить, исполнилось ли желание персонажа (питомец — любой, остальное — именно то, что на картинке). */
  checkWish(ch, type, rec) {
    const w = this.wish;
    if (!w || w.ch !== ch || w.type !== type) return false;
    if ((type === 'food' || type === 'wear') && rec?.subject !== w.rec.subject) return false;
    if (type === 'pet' && !(rec && behaviorOf(rec).pet)) return false;
    if (type === 'magic' && rec !== w.key) return false; // для «магии» rec — ключ сваренного рецепта
    this.clearWish(true);
    this.stat('wish');
    sfx.fanfare();
    this.fxHearts.explode(6, ch.x, ch.y - ch.displayHeight);
    this.celebrate(ch);
    return true;
  }

  /** Радость: танец с поворотами (ждёт, пока персонаж доест/допьёт). */
  celebrate(ch, hops = 4) {
    if (!ch.active) return;
    if (ch.busy) { this.time.delayedCall(250, () => this.celebrate(ch, hops)); return; }
    ch.busy = true;
    ch.hopBusy = true; // занята только прыжками: взяли в руки — прыжки обрываются, и она свободна
    ch.sleeping = false;
    ch.setTexture(ch.key + '_blink');
    let n = 0;
    const y0 = ch.y;
    this.tweens.add({
      targets: ch, y: y0 - 6, duration: 150, yoyo: true, repeat: hops - 1, ease: 'Quad.easeOut',
      onYoyo: () => { ch.setFlipX(!ch.flipX); if (n++ % 2 === 0) sfx.giggle(); },
      onComplete: () => { ch.y = y0; ch.setFlipX(false); ch.busy = false; ch.hopBusy = false; ch.setTexture(ch.key); },
    });
  }

  /**
   * Кто лежит на кровати и уже может уснуть — засыпает, и над ней сразу облачка снов.
   * Проверяется часто: sleepTick идёт раз в полторы секунды, а ждать облачков ребёнку не нужно.
   */
  dozeTick() {
    for (const c of this.objs) {
      if (c.kind !== 'char' || c.dragging || c.sleeping || c.busy) continue;
      if (!c.restOn || !RX.bedLike.test(c.restOn.rec?.subject || '') || this.time.now <= (c.awakeUntil || 0)) continue;
      c.sleeping = true;
      c.setTexture(c.key + '_blink');
      this.dream(c);
    }
  }

  sleepTick() {
    for (const p of this.objs) {
      if (!p.beh?.pet || p.dragging) continue;
      const onBed = p.restOn && RX.bedLike.test(p.restOn.rec?.subject || '');
      p.sleeping = !!onBed && this.time.now > (p.awakeUntil || 0);
      if (p.sleeping) this.fxZ.explode(1, p.x + 4, p.y - p.displayHeight + 2);
    }
    for (const c of this.objs) {
      if (c.kind !== 'char' || c.dragging) continue;
      const onBed = c.restOn && RX.bedLike.test(c.restOn.rec?.subject || '');
      const should = onBed && !c.busy && this.time.now > (c.awakeUntil || 0);
      if (should && !c.sleeping) { c.sleeping = true; c.setTexture(c.key + '_blink'); }
      if (!should && c.sleeping && !c.busy) { c.sleeping = false; c.setTexture(c.key); }
      if (c.sleeping) {
        c.setTexture(c.key + '_blink');
        if (c.lie) this.fxZ.explode(1, c.lie.x + 6, c.lie.y - c.displayHeight + 4); // «Z» — над головой на подушке
        else this.fxZ.explode(1, c.x + 6, c.y - c.displayHeight + 4);
      }
      // спящей снятся миры: над ней облачка — тап переносит в сон (см. dream.js)
      if (c.sleeping) this.dream(c); else if (c.dreamPicks) this.endDream(c);
    }
  }

  // ---------------------------------------------------------------- готовка и оркестр

  drinkPotion(ch, o) {
    this.stat('potion');
    ch.busy = true;
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
    this.objs = this.objs.filter((x) => x !== o);
    const m = this.mouth(ch);
    this.tweens.add({
      targets: o, x: m.x, y: m.y + 8, duration: 220,
      onComplete: () => {
        o.destroy();
        sfx.gulp();
        ch.setTexture(ch.key + '_open');
        this.time.delayedCall(350, () => {
          sfx.sparkle();
          this.fxSparks.explode(16, ch.x, ch.y - ch.displayHeight / 2);
          // цветное зелье -> всегда свой эффект; зелья из датасета -> «сюрприз»
          const BY_COLOR = { pink: 'pinkHair', green: 'grow', yellow: 'float', blue: 'ice', purple: 'dress', rainbow: 'rainbow' };
          const fx = BY_COLOR[o.rec.potionColor] || pick(['grow', 'color', 'rainbow', 'float', 'ice'].filter((e) => e !== ch.lastFx));
          ch.lastFx = fx;
          // только целые масштабы: «вырасти» = ×2, повторно — обратно ×1
          if (fx === 'pinkHair') {
            const PINK = HAIR[6];
            if (ch.look.hair === PINK) ch.look = { ...ch.look, hair: ch.look.prevHair || HAIR[0] };
            else ch.look = { ...ch.look, prevHair: ch.look.hair, hair: PINK };
            this.charTex(ch);
          } else if (fx === 'dress') {
            const i = DRESS.indexOf(ch.look.dress);
            ch.look = { ...ch.look, dress: DRESS[(i + 1) % DRESS.length] };
            this.charTex(ch);
          } else if (fx === 'ice') {
            ch.ice = this.time.now + 5000;
            const x0 = ch.x;
            this.tweens.add({ targets: ch, x: x0 + 1, duration: 50, yoyo: true, repeat: 24, onComplete: () => { ch.x = x0; } });
            this.fxPoof.explode(14, ch.x, ch.y - ch.displayHeight);
          } else if (fx === 'grow') {
            ch.mul = ch.mul > 1 ? 1 : 2;
            ch.setScale(ch.mul);
            this.tweens.add({ targets: ch, y: ch.y - 4, duration: 120, yoyo: true });
          } else if (fx === 'color') {
            ch.look = { ...ch.look, hair: pick(HAIR.filter((h) => h !== ch.look.hair)), dress: pick(DRESS.filter((d) => d !== ch.look.dress)) };
            this.charTex(ch);
          } else if (fx === 'rainbow') {
            ch.rainbow = this.time.now + 6000;
          } else if (fx === 'float') {
            this.tweens.add({ targets: ch, y: ch.y - 20, duration: 800, yoyo: true, hold: 1200, ease: 'Sine.easeInOut' });
          }
          ch.setTexture(ch.key + '_blink');
          this.time.delayedCall(500, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
        });
      },
    });
  }

  wear(ch, slot, o, quiet = false) {
    if (!quiet) this.stat('wear');
    const old = ch.slots[slot];
    if (old) {
      old.owner = null; old.slot = null;
      old.setScale(1);
      old.x = ch.x + (Math.random() < 0.5 ? -14 : 14);
      old.y = ch.y - 10;
      this.settle(old);
    }
    ch.slots[slot] = o;
    o.owner = ch; o.slot = slot;
    if (quiet) return;
    if (slot === 'head') this.checkWish(ch, 'wear', o.rec);
    if (slot === 'hand' && (o.beh.pet || o.rec.cat === 'toy')) {
      // подарок: игрушка или питомец в руки — радость
      this.checkWish(ch, 'pet', o.rec);
      this.time.delayedCall(150, () => { sfx.giggle(); this.fxHearts.explode(2, ch.x, ch.y - ch.displayHeight); });
    }
    sfx.wear();
    this.fxSparks.explode(6, ch.x, ch.y - ch.displayHeight * (slot === 'hand' ? 0.4 : 0.85));
    this.tweens.add({ targets: ch, y: ch.y - 3, duration: 120, yoyo: true });
  }

  putIn(box, o) {
    this.objs = this.objs.filter((x) => x !== o);
    box.contents.push(o.rec.id);
    o.glow?.destroy();
    this.tweens.add({
      targets: o, x: box.x, y: box.y - 4, alpha: 0, duration: 220,
      onComplete: () => o.destroy(),
    });
    sfx.chestIn();
    this.tweens.add({ targets: box, y: box.y - 3, duration: 100, yoyo: true });
  }

  spill(box) {
    sfx.chestOut();
    // не больше восьми за раз: робот-пылесос складывает сюда всё подряд, и разом вернулся бы тот же беспорядок
    const ids = box.contents.splice(-8);
    ids.forEach((id, i) => {
      const rec = this.recOf(id);
      if (!rec) return;
      const o = this.spawnItem(rec, box.x, box.y - 4);
      o.setAlpha(0);
      const tx = Math.round(Phaser.Math.Clamp(box.x + rnd(-35, 35), 8, L.WORLD - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 4, L.ROOM_H - 2));
      this.tweens.add({ targets: o, alpha: 1, duration: 150, delay: i * 80 });
      this.tweens.add({ targets: o, x: tx, duration: 500, delay: i * 80 });
      this.tweens.add({
        targets: o, y: o.y - 25, duration: 220, delay: i * 80, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut' }),
      });
    });
    this.time.delayedCall(ids.length * 80 + 700, () => this.save());
  }

  // ---------------------------------------------------------------- волшебный котёл

  // ---------------------------------------------------------------- альбом открытий

  // ---------------------------------------------------------------- гардероб (экран переодевания)

  applyNight(night, withSound = false) {
    if (withSound) (night ? sfx.night : sfx.day)();
    if (withSound && !night) {
      this.bedtimeOver(); // утро после «спокойной ночи» — игра снова как обычно
      // утро: спящие просыпаются, потягиваются и радуются
      for (const c of this.objs) {
        if (c.kind !== 'char' || !c.sleeping) continue;
        const dreamed = (c.dreamStep || 0) >= 2;
        const pool = c.dreamTheme ? c.dreamTheme.items : DREAMS;
        c.sleeping = false;
        c.awakeUntil = this.time.now + 12000;
        this.endDream(c);
        c.dreamStep = 0;
        this.time.delayedCall(300 + Math.random() * 400, () => {
          // проспала до утра, не заходя в сон, — сувенир всё равно появляется в руке
          if (dreamed) this.giveSouvenir(c, this.findRec(pick(pool.filter((sub) => this.findRec(sub)))));
          this.celebrate(c, 2);
        });
        c.dreamTheme = null;
      }
    }
    this.night = night;
    setMusicTheme(night ? 0 : roomAt(this.curRoom || 0).music); // ночью везде колыбельная
    this.drawSky();
    this.nightLight?.();
    this.cloud?.setVisible(!night);
    const a = night ? 0.55 : 0;
    if (withSound) { this.tweens.add({ targets: this.overlay, fillAlpha: a, duration: 500 }); this.save(); }
    else this.overlay.fillAlpha = a;
  }

  // ---------------------------------------------------------------- frame update
  update(time, delta = 16) {
    const cam = this.cameras.main;
    this.updateSwings(time, delta);
    this.updateButterflies(time);
    if (this.wish) {
      const { ch, bubble, icon } = this.wish;
      const s = ch.scaleY;
      bubble.x = Math.round(ch.x + 3 * s);
      bubble.y = Math.round(ch.y - ch.displayHeight + 3 * s);
      icon.x = Math.round(bubble.x - 6 + 15);
      icon.y = Math.round(bubble.y - 14); // центр облачка (у иконки центр по середине)
    }
    for (const o of this.objs) {
      if (o.inTub && !o.dragging) {
        const tub = o.inTub;
        if (!tub.active) { o.inTub = null; continue; }
        const rim = tub.y - tub.displayHeight + 3;
        const sink = o.kind === 'char' ? Math.round(o.displayHeight * 0.45) : Math.round(o.displayHeight * 0.4);
        o.x = Math.round(tub.x + o.tubDx);
        o.y = Math.round(rim + sink + (o.kind === 'item' && !o.beh.pet ? Math.sin(time / 300 + o.uid) * 1 : 0)); // игрушки покачиваются
        o.restOn = null;
      }
      if (o.stainImg) {
        o.stainImg.x = o.x; o.stainImg.y = o.y;
        o.stainImg.setScale(o.scaleX, o.scaleY).setFlipX(o.flipX);
        o.stainImg.setDepth(o.depth + 0.05);
      }
      if (o.cakeLayers) {
        let k = 1;
        for (const [name, l] of Object.entries(o.cakeLayers)) {
          l.x = o.x; l.y = o.y; l.setDepth(o.depth + 0.01 * k++);
          if (name === 'fl') l.setAlpha(0.75 + 0.25 * Math.sin(time / 90 + o.uid));
        }
      }
      if (o.foamImg) { o.foamImg.x = o.x; o.foamImg.y = o.y - o.displayHeight + 6; o.foamImg.setDepth(o.depth + 0.1); }
    }
    // наряды питомцев: уменьшенная копия на макушке, с учётом поворота
    for (const pet of this.objs) {
      const hat = pet.slots?.pethat;
      if (!hat || pet.kind === 'char') continue;
      if (!pet.active) continue;
      if (!hat.fitted) { const key = this.fitTex(hat.rec, 10, 8); if (key) hat.setTexture(key); hat.fitted = 'pethat'; } // после загрузки
      const [bx0, by0, bx1] = pet.rec.bbox || [0, 0, 15, 15];
      const cx = ((bx0 + bx1) / 2 - 7.5) * (pet.flipX ? -1 : 1);
      hat.x = Math.round(pet.x + cx);
      hat.y = Math.round(pet.y - (16 - by0) + 4);
      hat.setDepth(pet.depth + 0.2);
    }
    this.updateSpotlights(time);
    this.updateDisco(time);
    for (const bed of this.objs) {
      if (!bed.plots || !bed.plantImgs) continue;
      bed.plots.forEach((p, i) => {
        const img = bed.plantImgs[i];
        const drop = bed.dropImgs[i];
        const px = Math.round(bed.x + PLOT_DX[i]);
        const py = Math.round(bed.y - bed.displayHeight + 5);
        if (img) { img.x = px; img.y = py; img.setDepth(bed.depth + 0.4); }
        if (drop) { drop.x = px; drop.y = Math.round(py - (img ? img.displayHeight : 3) - 4 + Math.sin(time / 250) * 1.5); drop.setDepth(bed.depth + 0.45); }
      });
    }
    this.updateDreams(time);
    this.updateClean(); // седоки робота-пылесоса и следы испачканной куклы
    this.updateVillage(); // повозка с грузом, седоки трактора
    this.updateCity(); // тележка и пакет с покупками, облачко покупателя
    this.updateSea(); // замок из песка, круг на кукле в воде, хвост под водой
    this.updatePark(time, delta); // карусель, седоки слона, плота, гусеницы и самокатов
    this.updateCenter(); // занавес театра, луч прожектора, пластыри на куклах
    const plain = !this.dress && !this.albumUi && !this.mapUi && !this.cardUi; // нет открытых экранов поверх комнаты
    const [camLo, camHi] = this.camRange(); // стрелки ведут только по комнатам своей локации
    if (this.nav) {
      this.nav[0].forEach((o) => o.setVisible(cam.scrollX > camLo + 2 && plain));
      this.nav[1].forEach((o) => o.setVisible(cam.scrollX < camHi - 2 && plain));
    }
    this.mapBtn?.forEach((o) => o.setVisible(plain));
    this.mapDot?.setVisible(plain && !!this.unseenPlace()); // есть локация, где ещё не были
    // статистика для родителей: секунды активной игры по комнатам (экран трогали в последние 20 с)
    this.statAcc = (this.statAcc || 0) + delta;
    if (this.statAcc >= 1000) {
      const sec = Math.floor(this.statAcc / 1000);
      this.statAcc -= sec * 1000;
      if (!document.hidden && performance.now() - (this.lastInput || -1e9) < 20000) statTime(roomAt(Math.round(cam.scrollX / L.W)).stat, sec, today());
    }
    // шестерёнка: удержание 2 секунды открывает родительскую зону
    if (this.press?.ui?.gear) {
      const k = (performance.now() - this.press.t0) / 2000;
      this.gearBar.setVisible(true).setScale(Math.min(1, k), 1);
      if (k >= 1) { this.press = null; this.gearBar.setVisible(false); openParent(this); }
    } else if (this.gearBar?.visible) this.gearBar.setVisible(false);
    // перенос предмета к краю экрана: камера едет в соседнюю комнату
    const pr = this.press;
    if (pr?.moved && pr.obj) {
      const p = pr.p;
      const sx = p.x / L.P;
      const sy = p.y / L.P;
      const v = sy > L.ROOM_H ? 0 : sx < 12 ? -3 : sx > L.W - 12 ? 3 : 0;
      if (v) {
        cam.scrollX = Phaser.Math.Clamp(cam.scrollX + v, camLo, camHi);
        pr.obj.x = Phaser.Math.Clamp(cam.scrollX + sx + pr.offX, camLo + 4, camHi + L.W - 4);
        this.edgeScrolled = true;
      }
    }
    for (const o of this.objs) {
      // сняли очки (любым способом) — вернуть исходный спрайт
      if (o.fitted && o.slot !== o.fitted) { o.setTexture(o.rec.cat, o.rec.frame); o.fitted = false; }
    }
    for (const o of this.objs) {
      if (o.kind === 'char' || o.dragging || o.owner) continue;
      o.setDepth(o.beh.flat ? -5 : o.restOn ? o.restOn.depth + this.restLayer(o.restOn, o) : o.y); // ковёр всегда снизу
      if (o.beh.pet) this.updateNest(o);
    }
    for (const ch of this.objs) {
      if (ch.kind !== 'char') continue;
      if (!ch.dragging) ch.setDepth(ch.restOn ? ch.restOn.depth + this.restLayer(ch.restOn, ch) : ch.y);
      this.updatePose(ch); // стоит, сидит или лежит под одеялом
      const s = ch.mul;
      for (const [slot, it] of Object.entries(ch.slots)) {
        if (!it) continue;
        it.setScale(s);
        if (slot === 'head' && RX.hairAcc.test(it.rec.subject)) {
          // крупные тиары/банты/венки -> подогнанная копия (уменьшение по пикселям + новый контур, без дробного масштаба).
          // Очки НЕ уменьшаем: в уменьшенном виде они нечитаемы (решение после проверки на телефоне)
          if (!it.fitted) {
            const key = this.fitTex(it.rec, 14, 8);
            if (key) { it.setTexture(key); it.fitted = slot; }
          }
        }
        if (slot === 'head' && it.fitted) {
          it.x = Math.round(ch.x);
          it.y = Math.round(ch.y - (ANCHOR.hatY - 1) * s); // ободок ложится на волосы, а не стоит на макушке
          it.setDepth(ch.depth + 0.25);
          continue;
        }
        // посадка по видимым пикселям спрайта (bbox), а не по рамке 16×16
        const [bx0, by0, bx1, by1] = it.rec.bbox || [0, 0, 15, 15];
        const cx = (bx0 + bx1) / 2;
        const cy = (by0 + by1) / 2;
        const ax = slot === 'hand' ? ANCHOR.handX : 0;
        it.x = Math.round(ch.x + (ax - (cx - 7.5)) * s);
        if (slot === 'head') {
          const line = RX.earBand.test(it.rec.subject) ? ANCHOR.faceY : ANCHOR.hatY + 1;
          it.y = Math.round(ch.y - line * s + (15 - by1) * s); // низ шапки — на линии лба, ободка — на уровне глаз
        }
        if (slot === 'face') it.y = Math.round(ch.y - ANCHOR.faceY * s + (15.5 - cy) * s);
        if (slot === 'hand') it.y = Math.round(ch.y - ANCHOR.handY * s + (15.5 - cy) * s);
        // ободок с ушками — позади головы: дуга прячется за волосами, видны только ушки
        const behind = slot === 'head' && RX.earBand.test(it.rec.subject);
        it.setDepth(ch.depth + (behind ? -0.1 : slot === 'hand' ? 0.3 : slot === 'face' ? 0.2 : 0.25));
      }
      if (ch.ice > time) ch.setTint(0x9ad9ff);                     // голубое зелье: «замёрзла»
      else if (ch.rainbow > time) ch.setTint(Phaser.Display.Color.HSVToRGB((time / 600) % 1, 0.45, 1).color);
      else if (ch.rainbow || ch.ice) { ch.rainbow = 0; ch.ice = 0; ch.clearTint(); }
    }
    for (const o of this.objs) {
      if (!o.glow) continue;
      o.glow.setVisible(this.night && o.lit);
      o.glow.x = o.x;
      o.glow.y = o.y - o.displayHeight + Math.min(8, o.displayHeight * 0.4);
      o.glow.setScale(1.3);
    }
  }

  // ---------------------------------------------------------------- save / load

}

// Крупные блоки вынесены в отдельные файлы и подключаются как методы сцены
const ENV = { L, rnd, pick, pixelMap, sfx, statHit, statTime, today, COOK, GROW, TREASURE, DREAMS, DREAM_THEMES, RX };
installInput(Room);
installSave(Room);
installDrawer(Room);
installScreens(Room);
installPets(Room);
installHall(Room);
installBathroom(Room);
installKitchen(Room);
installBedroom(Room);
installCast(Room, ENV);
installLife(Room, ENV);
installNav(Room, ENV);
installSeason(Room, ENV);
installStickers(Room, ENV);
installRepair(Room, ENV);
installDream(Room, ENV);
installTidy(Room, ENV);
installClean(Room, ENV);
installPose(Room, ENV);
installGarden(Room, ENV);
installScenery(Room, ENV);
installTravel(Room, ENV);
installVillage(Room, ENV);
installCity(Room, ENV);
installSea(Room, ENV);
installPark(Room, ENV);
installCenter(Room, ENV);
installPots(Room, ENV);
installPlayroom(Room, ENV);
installDecor(Room, ENV);
installBedtime(Room, ENV);

// =====================================================================

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: L.dw,
  height: L.dh,
  backgroundColor: '#2b1d2e',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / L.dpr },
  input: { activePointers: 2 },
  scene: [Boot, Room, Dream],
});

// Смена размера окна (полный экран, адресная строка): пересчитать целый масштаб и перестроить комнату.
// Порядок важен: сначала сохранить дом в СТАРОЙ раскладке, потом сменить раскладку — тогда загрузка
// правильно перенесёт координаты. (Раньше было наоборот, и после поворота вещи могли уехать под потолок.)
let resizeT;
function relayout() {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    // свёрнутое приложение получает случайные размеры (экран блокировки, сплит) — не реагируем
    if (document.hidden) return;
    const next = screenSize();
    if (next.h < 150 || (next.dw === L.dw && next.dh === L.dh)) return;
    const room = game.scene.getScene('room');
    room?.abortDream?.(); // сон не переживает смену раскладки: кукла просто просыпается дома
    const live = room?.scene.isActive();
    if (live) room.saveNow();
    computeLayout();
    game.scale.resize(L.dw, L.dh);
    game.scale.setZoom(1 / L.dpr);
    if (live) room.scene.restart();
  }, 200);
}
window.addEventListener('resize', relayout);
document.addEventListener('visibilitychange', () => { if (!document.hidden) relayout(); });

// Приложение свернули или закрыли: дописать сохранение и статистику сразу, не дожидаясь задержки
const flushAll = () => { game.scene.getScene('room')?.saveNow?.(); flushStats(); };
window.addEventListener('pagehide', flushAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushAll(); });

// Офлайн-режим: service worker есть только в собранной версии (npm run build)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // пришла новая версия игры (новый service worker взял управление) -> один раз перезагрузиться,
  // иначе установленное приложение показывало бы старую версию до следующего запуска
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    game.scene.getScene('room')?.saveNow?.();
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // приложение вернули из фона — проверить обновление
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}

// Отладка в dev-режиме: состояние игры доступно из консоли браузера
if (import.meta.env.DEV) { window.__game = game; window.__dev = { musicTheme, setVoice, say, getVolume, getStats, exportData, R }; } // R — номера комнат по именам (для тестов)
