import Phaser from 'phaser';
import { sfx, unlockAudio, setMusic, musicPlaying } from './sfx.js';
import { makeCharTextures, ANCHOR, HAIR, DRESS, SKIN, HAIR_STYLE_KEYS, OUTFIT_KEYS } from './character.js';
import { BIG_FURNITURE, makeFurnitureTextures, outline } from './furniture.js';
import { Alchemy } from './alchemy.js';
import { makePotions } from './potions.js';

// =====================================================================
// Геометрия: мир измеряется в «арт-пикселях» (1 = один пиксель спрайта).
// Канвас — в физических пикселях устройства, камера увеличивает мир
// в ЦЕЛОЕ число раз (P). Так каждый пиксель спрайта — ровный квадрат P×P,
// без дробного растяжения и «зернистости». Всё в сцене рисуется с масштабом 1.
// =====================================================================
const L = {};
const DRAWER_H = 40;

function computeLayout() {
  const dpr = window.devicePixelRatio || 1;
  const dw = Math.round(window.innerWidth * dpr);
  const dh = Math.round(window.innerHeight * dpr);
  let P = Math.max(2, Math.round(dh / 135));   // ~135 арт-пикселей по высоте
  while (P > 2 && dh / P < 120) P--;
  while (P > 2 && dw / P < 260) P--;            // чтобы влезли вкладки ящика
  Object.assign(L, { dpr, dw, dh, P, W: Math.ceil(dw / P), H: Math.ceil(dh / P) });
  L.ROOM_H = L.H - DRAWER_H;
  L.FLOOR_D = Phaser.Math.Clamp(Math.round(L.ROOM_H * 0.42), 40, 90);
  L.FLOOR_TOP = L.ROOM_H - L.FLOOR_D;
  L.TAB_Y = L.ROOM_H + 10;
  L.SLOT_Y = L.ROOM_H + 29;
  const wh = Math.min(26, L.FLOOR_TOP - 22);
  L.WINDOW = { x: Math.round(L.W * 0.66), y: Math.max(5, Math.round((L.FLOOR_TOP - 16 - wh) / 2)), w: 30, h: wh };
}
computeLayout();

const SAVE_KEY = 'pixel-house-v3'; // v3: крупная мебель (v2 — арт-пиксели, v1 — старая система координат)

const CAT_ORDER = ['food', 'drink', 'clothing', 'toy', 'animal', 'furniture', 'kitchen', 'garden', 'magic', 'music', 'vehicle'];
const CAT_ICON = {
  food: 'strawberry', drink: 'glass of milk', clothing: 'crown', toy: 'teddy bear', animal: 'kitten',
  furniture: 'sofa', kitchen: 'teapot', garden: 'sunflower', magic: 'potion bottle', music: 'toy piano', vehicle: 'toy car',
};

// Витрина: что показывать первым в каждой вкладке (остальное — следом по алфавиту)
const FAVORITES = {
  food: ['strawberry', 'apple', 'banana', 'cupcake', 'slice of birthday cake', 'glazed donut', 'ice cream cone', 'lollipop',
    'chocolate chip cookie', 'watermelon slice', 'pair of cherries', 'slice of pizza', 'stack of pancakes', 'macaron', 'carrot',
    'croissant', 'cotton candy', 'candy cane', 'heart shaped cookie', 'bunch of grapes', 'peach', 'pear', 'orange',
    'strawberry cupcake', 'swirl lollipop', 'waffle', 'hamburger', 'french fries', 'birthday cake', 'cheese pizza'],
  drink: ['glass of milk', 'glass of orange juice', 'glass of lemonade', 'chocolate milkshake', 'juice box', 'glass of chocolate milk',
    'cup of tea', 'green smoothie'],
  clothing: ['crown', 'tiara', 'party hat', 'flower crown', 'bunny ear headband', 'cat ear headband', 'heart-shaped sunglasses',
    'star-shaped sunglasses', 'sunglasses', 'witch hat', 'wizard hat', 'top hat', 'hair bow ribbon', 'bow tie', 'beret', 'sun hat',
    'chef hat', 'cowboy hat', 'baseball cap', 'propeller beanie', 'necklace', 'heart locket', 'party dress', 'dress'],
  toy: ['teddy bear', 'beach ball', 'rubber duck', 'balloon', 'heart balloon', 'kite', 'yo-yo', 'spinning top', 'toy robot',
    'rag doll', 'nesting doll', 'jack-in-the-box', 'toy castle', 'soccer ball', 'crayon box', 'paint palette', 'pinwheel'],
  animal: ['kitten', 'puppy', 'rabbit', 'hamster', 'duckling', 'hatchling chick', 'unicorn', 'pony', 'panda', 'penguin', 'owl',
    'fox kit', 'piglet', 'lamb', 'goldfish', 'butterfly', 'ladybug', 'hedgehog', 'axolotl', 'red panda', 'koala', 'frog',
    'turtle', 'slime', 'bubble slime', 'winged unicorn', 'teacup pig'],
  furniture: ['sofa', 'armchair', 'bed', 'canopy bed', 'table', 'chair', 'bookshelf', 'wardrobe', 'floor lamp', 'table lamp', 'rug',
    'round rug', 'bean bag chair', 'rocking chair', 'oval mirror', 'vase', 'cradle', 'fireplace', 'grandfather clock', 'cuckoo clock'],
  kitchen: ['teapot', 'teacup and saucer', 'cookie jar', 'refrigerator', 'oven', 'kitchen stove', 'mug', 'plate', 'bowl',
    'picnic basket', 'toaster', 'kettle', 'rolling pin', 'frying pan'],
  garden: ['sunflower', 'tulip', 'rose', 'daisy flower', 'lotus flower', 'apple tree', 'cherry tree', 'watering can', 'seed packet',
    'four leaf clover', 'berry bush', 'barrel cactus', 'bonsai tree'],
  magic: ['potion bottle', 'heart-shaped potion bottle', 'star-shaped potion bottle', 'round potion flask', 'spiral potion bottle',
    'tall potion bottle', 'magic wand', 'star wand', 'heart wand', 'fairy wand', 'crystal ball', 'rainbow', 'star', 'shooting star',
    'crescent moon', 'treasure chest', 'snow globe', 'fairy'],
  music: ['toy piano', 'xylophone', 'acoustic guitar', 'ukulele', 'tambourine', 'toy drum', 'violin', 'flute', 'harp', 'trumpet',
    'pair of maracas'],
  vehicle: ['toy car', 'toy train engine', 'toy sailboat', 'toy airplane', 'hot air balloon', 'bicycle', 'kick scooter', 'skateboard'],
};
// Неаппетитное и странное для 6–7 лет — в ящике не показываем
const HIDE = /apple core|banana peel|wrapper|century egg|cracked egg|sea cucumber|chamber pot|toilet|plunger|jar of beetles|mystery stew|old boot|trash/;

// ---------- поведение предметов по названию ----------
const RX = {
  head: /\b(hat|cap|beanie|beret|bonnet|crown|tiara|headband|circlet)\b|hair (bow|clip)|hairclip|bow ribbon/,
  notHead: /hat (stand|pin)|bottle cap|kneecap/,
  face: /\b(glasses|sunglasses)\b/,
  light: /\b(lamp|lantern|candle|candlestick|chandelier)\b/,
  container: /\b(chest|drawers|wardrobe|refrigerator|fridge|cabinet|basket|crate|dresser|lunchbox|backpack|purse|handbag|nightstand|bookshelf|oven|cookie jar)\b/,
  notPet: /plush|stuffed|figurine|statue|bath|feeder|nest|coop|hutch|wheel|collar|leash|bed|carrier|rocking|hobby|float|carriage|saddle|harness|horn|jar of/,
  dressUp: /\b(wardrobe|mirror)\b/,
  // водные и медленные животные не бегают по полу
  noWalk: /fish|whale|jellyfish|octopus|dolphin|seahorse|starfish|shark|snail|turtle|seal/,
  // украшения на волосы — подгоняются по размеру головы (иконки датасета для них слишком крупные)
  hairAcc: /tiara|circlet|flower crown|hair (bow|clip)|hairclip|bow ribbon/,
  // ободки (часто с ушками): дуга обхватывает голову — концы на уровне глаз, ушки торчат над макушкой
  earBand: /headband|\bears?\b/,
  wall: /window|painting|picture frame|collage|wall clock|cuckoo clock|wall shelf|curtain|chandelier|ceiling lamp|^mirror$|oval mirror|magic mirror|blinds|shutter/,
};

function behaviorOf(rec) {
  const s = rec.subject;
  return {
    edible: rec.tags.includes('edible'),
    drink: rec.cat === 'drink',
    potion: rec.tags.includes('potion'),
    head: RX.head.test(s) && !RX.notHead.test(s),
    face: RX.face.test(s),
    light: RX.light.test(s),
    container: RX.container.test(s) && !rec.tags.includes('edible'),
    music: rec.cat === 'music',
    pet: rec.cat === 'animal' && !RX.notPet.test(s),
    furniture: rec.cat === 'furniture',
    wall: RX.wall.test(s),
    flat: /\b(rug|carpet|mat)\b/.test(s),
    cauldron: /cauldron/.test(s),
    album: s === 'discovery album',
  };
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Рисует пиксельную картинку из строк ('X' = пиксель) в Graphics. */
function pixelMap(g, rows, x, y, color) {
  g.fillStyle(color);
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === 'X') g.fillRect(x + dx, y + dy, 1, 1); }));
}

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
    this.byCat = { furniture: Object.values(this.big), magic: potions.slice() };
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
    this.objs = [];
    this.uidSeq = 1;
    this.night = false;
    this.press = null;

    this.makeTextures();
    makeFurnitureTextures(this);
    this.drawRoom();
    this.makeParticles();

    this.overlay = this.add.rectangle(0, 0, L.W, L.ROOM_H, 0x140c38, 0).setOrigin(0).setDepth(10000);

    this.buildDrawer();
    // котёл: пул результатов для пар без рецепта — волшебное, игрушки и любимая еда
    const favFood = new Set(FAVORITES.food);
    const pool = [...(this.byCat.magic || []), ...(this.byCat.toy || []), ...(this.byCat.food || []).filter((r) => favFood.has(r.subject))];
    this.alchemy = new Alchemy((subj) => this.findRec(subj), pool);
    if (!this.loadState()) this.defaultRoom();
    this.ensureMagic();
    this.applyNight(this.night);

    this.input.on('pointerdown', (p, over) => this.onDown(p, over));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('gameout', () => {
      if (this.press?.moved && this.press.obj) this.drop(this.press.obj, this.pt(this.input.activePointer));
      this.press = null;
    });

    // питомцы оживают: прыгают по полу и находят еду
    this.time.addEvent({ delay: 3500, loop: true, callback: () => this.petTick() });

    // моргание
    this.time.addEvent({
      delay: 1800, loop: true, callback: () => {
        const chars = this.objs.filter((o) => o.kind === 'char' && !o.busy && !o.dragging);
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
    g.generateTexture('note', 5, 7).destroy();
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

  drawRoom() {
    const { W, ROOM_H, FLOOR_TOP } = L;
    const g = this.add.graphics().setDepth(-10);
    // обои в полоску с точками
    g.fillStyle(0xf8dce8).fillRect(0, 0, W, FLOOR_TOP);
    g.fillStyle(0xf2cadb);
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 3, FLOOR_TOP);
    g.fillStyle(0xe6aec7);
    for (let y = 5, r = 0; y < FLOOR_TOP - 16; y += 10, r++) for (let x = r % 2 ? 9 : 1; x < W; x += 16) g.fillRect(x, y, 1, 1);
    // панель снизу стены
    const wy = FLOOR_TOP - 14;
    g.fillStyle(0xe7b6cd).fillRect(0, wy, W, 14);
    g.fillStyle(0xd197b4).fillRect(0, wy - 1, W, 1);
    g.fillStyle(0xdba8c0);
    for (let x = 3; x < W; x += 18) g.fillRect(x, wy + 3, 13, 7);
    // плинтус
    g.fillStyle(0x8d5a78).fillRect(0, FLOOR_TOP - 2, W, 2);
    // пол — доски
    g.fillStyle(0xd39a68).fillRect(0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
    for (let y = FLOOR_TOP, row = 0; y < ROOM_H; y += 6, row++) {
      g.fillStyle(0xdeab7c).fillRect(0, y, W, 1);
      g.fillStyle(0xb98153).fillRect(0, y + 5, W, 1);
      for (let x = (row % 2) * 12; x < W; x += 24) g.fillRect(x, y + 1, 1, 4);
    }
    // небо в окне — отдельный слой, перерисовывается днём/ночью
    this.sky = this.add.graphics().setDepth(-9);
    const f = this.add.graphics().setDepth(-8);
    const { x, y, w, h } = L.WINDOW;
    const mx = x + w / 2;
    const my = y + Math.floor(h / 2);
    f.fillStyle(0xffffff)
      .fillRect(x - 2, y - 2, w + 4, 2).fillRect(x - 2, y + h, w + 4, 2)
      .fillRect(x - 2, y, 2, h).fillRect(x + w, y, 2, h)
      .fillRect(mx - 1, y, 2, h).fillRect(x, my - 1, w, 2);
    f.fillStyle(0xd197b4).fillRect(x - 4, y + h + 2, w + 8, 2); // подоконник
    // занавески
    f.fillStyle(0xfff4a8).fillRect(x - 7, y - 4, 5, h + 7).fillRect(x + w + 2, y - 4, 5, h + 7);
    f.fillStyle(0xf2df7a).fillRect(x - 5, y - 4, 1, h + 7).fillRect(x + w + 4, y - 4, 1, h + 7);
    f.fillStyle(0xc98aa9).fillRect(x - 9, y - 5, w + 18, 1); // карниз
  }

  drawSky() {
    const { x, y, w, h } = L.WINDOW;
    const s = this.sky.clear();
    if (!this.night) {
      s.fillStyle(0x8fd3ff).fillRect(x, y, w, h);
      s.fillStyle(0xffe066).fillRect(x + w - 9, y + 3, 5, 5);
      s.fillStyle(0xffffff).fillRect(x + 3, y + 8, 8, 2).fillRect(x + 5, y + 6, 4, 2)
        .fillRect(x + 17, y + 14, 9, 2).fillRect(x + 19, y + 12, 4, 2);
      s.fillStyle(0x7ccf6a).fillRect(x, y + h - 4, w, 4);
    } else {
      s.fillStyle(0x24205a).fillRect(x, y, w, h);
      s.fillStyle(0xfff6c2).fillRect(x + w - 10, y + 3, 6, 6);
      s.fillStyle(0x24205a).fillRect(x + w - 8, y + 2, 5, 5);
      s.fillStyle(0xffffff);
      [[3, 4], [9, 12], [13, 3], [5, 17], [20, 19], [24, 14], [11, 20]].forEach(([dx, dy]) => s.fillRect(x + dx, y + dy, 1, 1));
      s.fillStyle(0x2f5a4a).fillRect(x, y + h - 4, w, 4);
    }
  }

  makeParticles() {
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
    });
    this.uidSeq = Math.max(this.uidSeq, o.uid + 1);
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
    makeCharTextures(this, key, look);
    const o = this.add.image(x, y, key).setOrigin(0.5, 1).setInteractive();
    Object.assign(o, {
      kind: 'char', uid, key, look, mul: extra.mul || 1, slots: { head: null, face: null, hand: null },
      busy: false, rainbow: 0,
    });
    o.setScale(o.mul);
    this.objs.push(o);
    return o;
  }

  removeObj(o) {
    this.fxPoof.explode(8, o.x, o.y - o.displayHeight / 2);
    sfx.poof();
    this.objs = this.objs.filter((x) => x !== o);
    for (const x of this.objs) if (x.restOn === o) x.restOn = null;
    if (o.owner) o.owner.slots[o.slot] = null;
    o.glow?.destroy();
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
    const g = c.getContext('2d');
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
    big('fridge', W - 44, FLOOR_TOP + 5);
    big('chest', W - 16, ROOM_H - 4);
    big('cauldron', W * 0.4, FLOOR_TOP + 12);
    on(bed, 'teddy bear', -10, 9);
    on(table, 'cupcake', -8, 20);
    on(table, 'apple', 0, 20);
    const album = big('album', table.x + 10, table.y - 20);
    album.restOn = table;
    put('tabby cat', W * 0.47, ROOM_H - 4);
    this.spawnChar(Math.round(W * 0.33), ROOM_H - 4, { hair: HAIR[0], skin: SKIN[0], dress: DRESS[0], hairStyle: 'long', outfit: 'dress' });
    this.spawnChar(Math.round(W * 0.8), ROOM_H - 6, { hair: HAIR[2], skin: SKIN[1], dress: DRESS[1], hairStyle: 'pigtails', outfit: 'pants' });
  }

  // ---------------------------------------------------------------- drawer UI
  buildDrawer() {
    const D = 20000;
    const { W, H, ROOM_H, TAB_Y, SLOT_Y } = L;
    this.add.rectangle(0, ROOM_H, W, H - ROOM_H, 0x4a3157).setOrigin(0).setDepth(D);
    this.add.rectangle(0, ROOM_H, W, 1, 0x2b1d2e).setOrigin(0).setDepth(D);
    this.add.rectangle(0, ROOM_H + 19, W, 1, 0x3a2546).setOrigin(0).setDepth(D);
    this.cat = this.cats[0];
    this.page = 0;
    const n = this.cats.length + 2; // + кнопки сброса и музыки
    const step = Math.min(22, Math.floor((W - 2) / n));
    const x0 = Math.floor((W - step * n) / 2) + Math.floor(step / 2);
    this.tabs = this.cats.map((c, i) => {
      const x = x0 + i * step;
      const bg = this.add.rectangle(x, TAB_Y, step - 2, 18, 0x6b4a7e).setDepth(D).setInteractive();
      bg.ui = { tab: c };
      const rec = this.findRec(CAT_ICON[c]) || this.byCat[c][0];
      this.add.image(x, TAB_Y + 8, rec.cat, rec.frame).setOrigin(0.5, 1).setDepth(D + 1);
      return bg;
    });
    // кнопка сброса (держать 2 секунды) — для взрослых
    const rx = x0 + this.cats.length * step;
    const rb = this.add.rectangle(rx, TAB_Y, step - 2, 18, 0x3a2546).setDepth(D).setInteractive();
    rb.ui = { reset: true };
    const ig = this.add.graphics().setDepth(D + 1);
    pixelMap(ig, ['.XXXX.X', 'X....XX', 'X...XXX', 'X......', 'X.....X', '.XXXXX.'], rx - 3, TAB_Y - 3, 0x8f6fa3);
    // музыка вкл/выкл
    const mx = rx + step;
    this.musicBtn = this.add.rectangle(mx, TAB_Y, step - 2, 18, 0x6b4a7e).setDepth(D).setInteractive();
    this.musicBtn.ui = { music: true };
    this.musicIcon = this.add.graphics().setDepth(D + 1);
    this.musicIconAt = [mx - 3, TAB_Y - 4];
    this.drawMusicIcon();
    // стрелки
    const arrow = (x, dir) => {
      const hit = this.add.rectangle(x, SLOT_Y, 10, 18, 0x6b4a7e).setDepth(D).setInteractive();
      hit.ui = { page: dir };
      const t = this.add.graphics().setDepth(D + 1);
      const rows = dir > 0 ? ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'] : ['...X', '..XX', '.XXX', 'XXXX', '.XXX', '..XX', '...X'];
      pixelMap(t, rows, x - 2, SLOT_Y - 3, 0xffffff);
    };
    arrow(6, -1);
    arrow(W - 6, 1);
    this.perPage = Math.max(1, Math.floor((W - 24) / 20));
    const sx0 = Math.floor((W - this.perPage * 20) / 2) + 10;
    this.slots = [];
    for (let i = 0; i < this.perPage; i++) {
      const x = sx0 + i * 20;
      this.add.rectangle(x, SLOT_Y, 18, 18, 0x5c3f6c).setDepth(D);
      const img = this.add.image(x, SLOT_Y + 8, this.cats[0], 0).setOrigin(0.5, 1).setDepth(D + 1).setInteractive();
      this.slots.push(img);
    }
    this.refreshDrawer();
  }

  drawMusicIcon() {
    const on = musicPlaying();
    this.musicIcon.clear();
    pixelMap(this.musicIcon, ['..XXXX', '..X..X', '..X..X', '..X..X', 'XXX.XX', 'XXX.XX', '.X..X.'], ...this.musicIconAt, on ? 0xfff07a : 0x8f6fa3);
    this.musicBtn.setFillStyle(on ? 0x6b4a7e : 0x3a2546);
  }

  refreshDrawer() {
    const list = this.byCat[this.cat];
    const pages = Math.ceil(list.length / this.perPage);
    this.page = (this.page + pages) % pages;
    this.slots.forEach((img, i) => {
      const rec = list[this.page * this.perPage + i];
      img.setVisible(!!rec);
      if (rec) { if (rec.tex) img.setTexture(`${rec.tex}_icon`); else img.setTexture(rec.cat, rec.frame); img.drawerRec = rec; }
    });
    this.tabs.forEach((t) => t.setFillStyle(t.ui.tab === this.cat ? 0xc48ff2 : 0x6b4a7e));
  }

  // ---------------------------------------------------------------- input
  onDown(p, over) {
    unlockAudio();
    if (!this.musicChecked) {
      this.musicChecked = true;
      let pref = null;
      try { pref = localStorage.getItem('pixel-house-music'); } catch { /* ignore */ }
      if (pref !== '0' && !musicPlaying() && !over[0]?.ui?.music) { setMusic(true); this.drawMusicIcon(); }
    }
    goFullscreen();
    const q = this.pt(p);
    const top = over[0];
    this.press = { sx: q.x, sy: q.y, t: p.downTime, moved: false };
    if (top?.ui) { this.press.ui = top.ui; return; }
    if (top?.drawerRec) { this.press.rec = top.drawerRec; return; }
    if (top?.kind) { this.press.obj = top; this.press.offX = top.x - q.x; this.press.offY = top.y - q.y; }
  }

  onMove(p) {
    const pr = this.press;
    if (!pr || !p.isDown) return;
    const q = this.pt(p);
    if (!pr.moved) {
      if (Phaser.Math.Distance.Between(pr.sx, pr.sy, q.x, q.y) < 3) return;
      if (pr.ui) return;
      if (pr.rec) {
        const o = this.spawnItem(pr.rec, q.x, q.y);
        pr.obj = o; pr.offX = 0; pr.offY = Math.round(o.displayHeight / 2);
      }
      if (!pr.obj) return;
      pr.moved = true;
      this.startDrag(pr.obj);
    }
    const o = pr.obj;
    o.x = Phaser.Math.Clamp(q.x + pr.offX, 4, L.W - 4);
    o.y = Phaser.Math.Clamp(q.y + pr.offY, o.displayHeight * 0.6, L.H + 10);
    // «предвкушение»: персонаж открывает рот, когда к нему несут еду
    for (const c of this.objs) {
      if (c.kind !== 'char' || c.busy || c.dragging) continue;
      const want = o.kind === 'item' && (o.beh.edible || o.beh.potion) && c.getBounds().contains(q.x, q.y);
      c.setTexture(want ? c.key + '_open' : c.key);
    }
  }

  onUp(p) {
    const pr = this.press;
    this.press = null;
    if (!pr) return;
    const q = this.pt(p);
    if (pr.moved && pr.obj) { this.drop(pr.obj, q); return; }
    if (pr.ui && ('albumSel' in pr.ui || pr.ui.albumPage || pr.ui.albumDone)) { this.onAlbumUi(pr.ui); return; }
    if (pr.ui?.dress || pr.ui?.dressDone || pr.ui?.block) { this.onDressUi(pr.ui); return; }
    if (pr.ui) {
      sfx.click();
      if (pr.ui.tab) { this.cat = pr.ui.tab; this.page = 0; this.refreshDrawer(); }
      if (pr.ui.page) { this.page += pr.ui.page; this.refreshDrawer(); }
      if (pr.ui.reset && p.upTime - pr.t > 2000) this.resetRoom();
      if (pr.ui.music) {
        const on = !musicPlaying();
        setMusic(on);
        try { localStorage.setItem('pixel-house-music', on ? '1' : '0'); } catch { /* ignore */ }
        this.drawMusicIcon();
      }
      return;
    }
    if (pr.rec) { this.tossIn(pr.rec); return; }
    if (pr.obj) { this.tap(pr.obj); return; }
    const { x, y, w, h } = L.WINDOW;
    if (q.x >= x && q.x <= x + w && q.y >= y && q.y <= y + h) this.applyNight(!this.night, true);
  }

  startDrag(o) {
    sfx.pick();
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
    o.restOn = null;
    for (const x of this.objs) if (x.restOn === o) { x.restOn = null; this.settle(x); }
    o.dragging = true;
    o.setDepth(5000);
    if (o.walkTween) { o.walkTween.stop(); o.walkTween = null; o.walking = false; }
    this.tweens.killTweensOf(o);
    o.setScale(o.kind === 'char' ? o.mul : 1); // масштаб только целый — без «поднятия» ×1.15
    if (o.kind === 'char') o.setTexture(o.key + '_open');
  }

  drop(o, q) {
    o.dragging = false;
    if (o.kind === 'char') o.setTexture(o.key);
    for (const c of this.objs) if (c.kind === 'char' && !c.busy) c.setTexture(c.key);

    if (o.kind === 'char' && q.y <= L.ROOM_H) {
      const wr = this.objAt(q.x, q.y, (x) => x.kind === 'item' && RX.dressUp.test(x.rec.subject));
      if (wr) {
        o.x = Math.round(Phaser.Math.Clamp(wr.x + wr.displayWidth / 2 + 10, 12, L.W - 12));
        o.y = Math.max(Math.round(o.y), L.FLOOR_TOP + 8);
        this.settle(o);
        this.openDressUp(o);
        this.save();
        return;
      }
    }
    if (q.y > L.ROOM_H) {
      if (o.kind === 'char') { o.y = L.ROOM_H - 3; this.settle(o); } else this.removeObj(o);
      this.save();
      return;
    }
    if (o.kind === 'item') {
      const ch = this.objAt(q.x, q.y, (x) => x.kind === 'char' && x !== o);
      if (ch && !o.beh.furniture) {
        if (o.beh.potion) this.drinkPotion(ch, o);
        else if (o.beh.edible) this.feed(ch, o);
        else if (o.beh.head) this.wear(ch, 'head', o);
        else if (o.beh.face) this.wear(ch, 'face', o);
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
      if (!o.beh.container) {
        const box = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.container && x !== o);
        if (box) { this.putIn(box, o); this.save(); return; }
      }
    }
    sfx.drop();
    this.settle(o);
    this.save();
  }

  objAt(x, y, pred) {
    const list = this.objs.filter((o) => pred(o) && !o.dragging && o.getBounds().contains(x, y));
    list.sort((a, b) => b.depth - a.depth);
    return list[0] || null;
  }

  settle(o) {
    o.restOn = null;
    o.y = Math.round(Math.min(o.y, L.ROOM_H - 1));
    o.x = Math.round(o.x);
    if (o.y >= L.FLOOR_TOP + 1) return;
    if (o.kind === 'item' && o.beh.wall) return;
    const sup = this.objs.find((s) => s !== o && s.kind === 'item' && s.beh.furniture && !s.beh.wall && !s.beh.flat && !s.owner
      && !s.dragging && s.getBounds().contains(o.x, o.y));
    if (sup) { o.restOn = sup; return; }
    const target = Math.round(L.FLOOR_TOP + rnd(2, L.FLOOR_D * 0.35));
    this.tweens.add({
      targets: o, y: target, duration: 250 + (target - o.y) * 4, ease: 'Bounce.easeOut',
      onComplete: () => sfx.thud(),
    });
  }

  // ---------------------------------------------------------------- actions
  tossIn(rec) {
    const o = this.spawnItem(rec, Math.round(rnd(20, L.W - 20)), -4);
    const ty = Math.round(rnd(L.FLOOR_TOP + 4, L.ROOM_H - 3));
    sfx.pick();
    this.tweens.add({ targets: o, y: ty, duration: 600, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } });
  }

  tap(o) {
    if (o.kind === 'char') {
      const held = o.slots.hand;
      if (held && !o.busy && held.beh.potion) { this.drinkPotion(o, held); return; }
      if (held && !o.busy && held.beh.edible) { this.feed(o, held); return; }
      sfx.giggle();
      o.busy = true;
      o.setTexture(o.key + '_blink');
      this.tweens.add({
        targets: o, y: o.y - 7, duration: 160, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => { o.busy = false; o.setTexture(o.key); },
      });
      this.fxHearts.explode(2, o.x, o.y - o.displayHeight);
      return;
    }
    const b = o.beh;
    // еда/зелье в руке у персонажа: тап по ним = укус / глоток (рука закрывает туловище — тапают именно сюда)
    if (o.owner && o.slot === 'hand' && !o.owner.busy) {
      if (b.potion) { this.drinkPotion(o.owner, o); return; }
      if (b.edible) { this.feed(o.owner, o); return; }
    }
    if (b.container && o.contents.length) { this.spill(o); return; }
    if (b.album) { this.openAlbum(); return; }
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
    if (b.light) { o.lit = !o.lit; sfx.click(); this.save(); }
    else if (b.music) { sfx.note(); this.fxNotes.explode(2, o.x, o.y - o.displayHeight); }
    else if (b.pet) { sfx.squeak(); this.fxHearts.explode(1, o.x, o.y - o.displayHeight); }
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
    ch.busy = true;
    const last = (o.bites || 0) + 1 >= this.biteCount(o);
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
    if (last) this.objs = this.objs.filter((x) => x !== o);
    const m = this.mouth(ch);
    const tint = this.itemColor(o);
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
              ch.setTexture(ch.key + '_blink');
              if (last) { sfx.yum(); this.fxHearts.explode(3, m.x, m.y - 10); } else this.fxHearts.explode(1, m.x, m.y - 10);
              if (!last && o.active) { o.eating = false; this.wear(ch, 'hand', o, true); }
              this.time.delayedCall(400, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
            }
          },
        });
      },
    });
  }

  petTick() {
    if (this.dress || this.albumUi || this.press?.moved) return;
    const { W, FLOOR_TOP, ROOM_H } = L;
    const pets = this.objs.filter((o) => o.kind === 'item' && o.beh.pet && !o.owner && !o.dragging && !o.restOn
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
    if (Math.random() < 0.5) return; // не все время в движении
    const p = pick(pets);
    const tx = Math.round(Phaser.Math.Clamp(p.x + rnd(-30, 30), 10, W - 10));
    const ty = Math.round(Phaser.Math.Clamp(p.y + rnd(-6, 6), FLOOR_TOP + 4, ROOM_H - 2));
    this.hopTo(p, tx, ty, () => this.save());
  }

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
  }

  feedPet(pet, o) {
    this.objs = this.objs.filter((x) => x !== o);
    this.tweens.add({
      targets: o, x: pet.x, y: pet.y - 4, duration: 220,
      onComplete: () => {
        o.destroy();
        sfx.chew(); sfx.chew(0.15);
        this.tweens.add({ targets: pet, y: pet.y - 5, duration: 140, yoyo: true, repeat: 1 });
        this.time.delayedCall(320, () => { sfx.squeak(); this.fxHearts.explode(4, pet.x, pet.y - pet.displayHeight); });
      },
    });
  }

  drinkPotion(ch, o) {
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
            makeCharTextures(this, ch.key, ch.look);
          } else if (fx === 'dress') {
            const i = DRESS.indexOf(ch.look.dress);
            ch.look = { ...ch.look, dress: DRESS[(i + 1) % DRESS.length] };
            makeCharTextures(this, ch.key, ch.look);
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
            makeCharTextures(this, ch.key, ch.look);
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
    const ids = box.contents.splice(0);
    ids.forEach((id, i) => {
      const rec = this.recOf(id);
      if (!rec) return;
      const o = this.spawnItem(rec, box.x, box.y - 4);
      o.setAlpha(0);
      const tx = Math.round(Phaser.Math.Clamp(box.x + rnd(-35, 35), 8, L.W - 8));
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
  /** В любой комнате (и в старых сохранениях) должны быть котёл и альбом. */
  ensureMagic() {
    const { W, FLOOR_TOP } = L;
    let pot = this.objs.find((o) => o.kind === 'item' && o.beh.cauldron);
    if (!pot) pot = this.spawnItem(this.big.cauldron, Math.round(W * 0.4), FLOOR_TOP + 12);
    if (!this.objs.some((o) => o.kind === 'item' && o.beh.album)) {
      this.spawnItem(this.big.album, Math.round(Math.min(W - 10, pot.x + 22)), FLOOR_TOP + 14);
    }
    if (pot.contents.length >= 2) this.time.delayedCall(500, () => this.brew(pot));
  }

  recColor(rec) {
    const c = rec.tex ? this.textures.getPixel(8, 8, `${rec.tex}_icon`) : this.textures.getPixel(8, 9, rec.cat, rec.frame);
    return c && c.alpha ? c.color : 0xffffff;
  }

  addToCauldron(pot, o) {
    if (pot.brewing || pot.contents.length >= 2) {
      sfx.boing();
      o.x = Math.round(Phaser.Math.Clamp(pot.x + (o.x < pot.x ? -20 : 20), 8, L.W - 8));
      this.settle(o);
      return;
    }
    this.objs = this.objs.filter((x) => x !== o);
    pot.contents.push(o.rec.id);
    o.glow?.destroy();
    const top = pot.y - pot.displayHeight + 4;
    o.setDepth(pot.depth + 1);
    this.tweens.add({
      targets: o, x: pot.x, y: top + 6, alpha: 0, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => {
        o.destroy();
        sfx.splash();
        this.fxCrumbs.setParticleTint(0x9ff5b8);
        this.fxCrumbs.explode(8, pot.x, top);
        this.tweens.add({ targets: pot, y: pot.y - 2, duration: 80, yoyo: true });
        if (pot.contents.length === 2) this.time.delayedCall(250, () => this.brew(pot));
      },
    });
  }

  brew(pot) {
    if (pot.brewing || !pot.active) return;
    const [a, b] = pot.contents.map((id) => this.recOf(id));
    if (!a || !b) { pot.contents = []; return; }
    pot.brewing = true;
    const top = { x: pot.x, y: pot.y - pot.displayHeight + 4 };
    const steam = this.add.particles(top.x, top.y, 'px', {
      lifespan: 800, speedY: { min: -45, max: -15 }, speedX: { min: -10, max: 10 }, x: { min: -9, max: 9 },
      scale: { start: 2, end: 0 }, tint: [this.recColor(a), this.recColor(b), 0x9ff5b8, 0xffffff], frequency: 35,
    }).setDepth(16000);
    const x0 = pot.x;
    this.tweens.add({ targets: pot, x: x0 + 1, duration: 60, yoyo: true, repeat: 13, onComplete: () => { pot.x = x0; } });
    this.time.addEvent({ delay: 150, repeat: 10, callback: () => sfx.blub() });
    this.time.delayedCall(1800, () => {
      steam.stop();
      this.time.delayedCall(900, () => steam.destroy());
      const { result, isNew } = this.alchemy.brew(a, b);
      pot.contents = [];
      pot.brewing = false;
      const o = this.spawnItem(result, top.x, top.y + 2);
      const tx = Math.round(Phaser.Math.Clamp(top.x + (Math.random() < 0.5 ? -1 : 1) * rnd(16, 30), 10, L.W - 10));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
      sfx.sparkle();
      this.fxSparks.explode(28, top.x, top.y - 10);
      this.tweens.add({ targets: o, x: tx, duration: 750 });
      this.tweens.add({
        targets: o, y: top.y - 30, duration: 320, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 430, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
      });
      if (isNew) {
        // новое открытие: фанфары, сердечки и подпрыгивающий альбом
        this.time.delayedCall(250, () => sfx.fanfare());
        this.fxHearts.explode(6, top.x, top.y - 16);
        const album = this.objs.find((x) => x.kind === 'item' && x.beh.album);
        if (album) {
          this.tweens.add({ targets: album, y: album.y - 6, duration: 140, yoyo: true, repeat: 3, delay: 500 });
          this.time.delayedCall(500, () => this.fxSparks.explode(12, album.x, album.y - album.displayHeight));
        }
      }
      this.save();
    });
  }

  // ---------------------------------------------------------------- альбом открытий
  recImage(rec, x, y) {
    return (rec.tex ? this.add.image(x, y, `${rec.tex}_icon`) : this.add.image(x, y, rec.cat, rec.frame)).setOrigin(0.5, 1);
  }

  openAlbum() {
    if (this.dress || this.albumUi) return;
    sfx.page();
    const bg = this.add.rectangle(0, 0, L.W, L.H, 0x2b1d2e, 0.95).setOrigin(0).setDepth(30000).setInteractive();
    bg.ui = { block: true };
    const entries = this.alchemy.entries();
    const firstFound = entries.findIndex((e) => e.found);
    this.albumUi = { parts: [bg], rows: [], page: 0, sel: Math.max(0, firstFound) };
    this.buildAlbum();
  }

  buildAlbum() {
    const u = this.albumUi;
    u.rows.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
    u.rows = [];
    const D = 30003;
    const { W, H } = L;
    const add = (o) => { u.rows.push(o.setDepth(D)); return o; };
    const hit = (x, y, w, h, ui) => { const r = add(this.add.rectangle(x, y, w, h, 0xffffff, 0.001).setOrigin(0).setInteractive()); r.ui = ui; r.setDepth(D + 5); };
    const entries = this.alchemy.entries();
    const cell = 20;
    const cols = Math.max(1, Math.floor((W - 36) / cell));
    const rowsN = Math.max(1, Math.floor((H - 40) / cell));
    const per = cols * rowsN;
    const pages = Math.max(1, Math.ceil(entries.length / per));
    u.page = (u.page + pages) % pages;
    const x0 = Math.floor((W - cols * cell) / 2);
    const y0 = 5;
    entries.slice(u.page * per, (u.page + 1) * per).forEach((e, i) => {
      const idx = u.page * per + i;
      const cx = x0 + (i % cols) * cell;
      const cy = y0 + Math.floor(i / cols) * cell;
      add(this.add.rectangle(cx, cy, 18, 18, idx === u.sel ? 0xc48ff2 : e.found ? 0x6b4a7e : 0x3a2546).setOrigin(0));
      const img = add(this.recImage(e.result, cx + 9, cy + 17));
      if (!e.found) img.setTintFill(0x1e1424); // ещё не открыто — силуэт
      hit(cx, cy, 18, 18, { albumSel: idx });
    });
    if (pages > 1) {
      for (const dir of [-1, 1]) {
        const ax = dir < 0 ? 7 : W - 7;
        add(this.add.rectangle(ax, y0 + (rowsN * cell) / 2, 10, 18, 0x6b4a7e));
        const g = add(this.add.graphics());
        const rows = dir > 0 ? ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'] : ['...X', '..XX', '.XXX', 'XXXX', '.XXX', '..XX', '...X'];
        pixelMap(g, rows, ax - 2, y0 + (rowsN * cell) / 2 - 3, 0xffffff);
        hit(ax - 6, y0 + (rowsN * cell) / 2 - 10, 12, 20, { albumPage: dir });
      }
    }
    // нижняя строка — рецепт выбранной клетки: A + B = результат (B и результат скрыты, пока не открыто)
    const e = entries[u.sel];
    if (e) {
      const by = H - 6;
      const bx = Math.floor(W / 2) - 44;
      add(this.add.rectangle(bx - 6, by - 21, 100, 24, 0x4a3157).setOrigin(0));
      const g = add(this.add.graphics());
      add(this.recImage(e.a, bx + 8, by));
      pixelMap(g, ['..X..', '..X..', 'XXXXX', '..X..', '..X..'], bx + 19, by - 10, 0xffffff);
      if (e.found) add(this.recImage(e.b, bx + 34, by));
      else pixelMap(g, ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'], bx + 32, by - 11, 0xfff07a);
      pixelMap(g, ['XXXXX', '.....', 'XXXXX'], bx + 45, by - 9, 0xffffff);
      const r = add(this.recImage(e.result, bx + 60, by));
      if (!e.found) r.setTintFill(0x1e1424);
      else this.tweens.add({ targets: r, y: by - 2, duration: 300, yoyo: true, repeat: -1 });
    }
    // «готово»
    const bx = W - 26;
    const by = H - 22;
    add(this.add.rectangle(bx, by, 22, 18, 0x52b893).setOrigin(0));
    add(this.add.rectangle(bx, by + 16, 22, 2, 0x2f7d5f).setOrigin(0));
    const g2 = add(this.add.graphics());
    pixelMap(g2, ['.........XX', '........XX.', '.......XX..', 'XX....XX...', '.XX..XX....', '..XXXX.....', '...XX......'], bx + 5, by + 5, 0xffffff);
    hit(bx - 2, by - 2, 26, 22, { albumDone: true });
  }

  onAlbumUi(ui) {
    const u = this.albumUi;
    if (!u) return;
    if (ui.albumDone) {
      u.rows.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
      u.parts.forEach((o) => o.destroy());
      this.albumUi = null;
      sfx.page();
      return;
    }
    if (ui.albumPage) { u.page += ui.albumPage; sfx.page(); }
    if ('albumSel' in ui) { u.sel = ui.albumSel; sfx.click(); }
    this.buildAlbum();
  }

  // ---------------------------------------------------------------- гардероб (экран переодевания)
  openDressUp(ch) {
    if (this.dress) return;
    sfx.sparkle();
    ch.busy = true;
    ch.setTexture(ch.key);
    const D = 30000;
    const { W, H } = L;
    const bg = this.add.rectangle(0, 0, W, H, 0x2b1d2e, 0.94).setOrigin(0).setDepth(D).setInteractive();
    bg.ui = { block: true };
    const ps = H >= 125 ? 3 : 2;            // крупный предпросмотр — тоже целый масштаб
    const px = Math.round(Math.min(W * 0.2, 60));
    const floor = this.add.rectangle(px, H - 8, 26 * ps, 4, 0x6b4a7e).setDepth(D + 1);
    const preview = this.add.image(px, H - 9, ch.key).setOrigin(0.5, 1).setScale(ps).setDepth(D + 2);
    this.dress = { ch, parts: [bg, floor, preview], preview, rows: [], x0: Math.round(px + 13 * ps + 10) };
    this.buildDressRows();
  }

  buildDressRows() {
    const d = this.dress;
    d.rows.forEach((o) => o.destroy());
    d.rows = [];
    const D = 30003;
    const look = d.ch.look;
    const { W, H } = L;
    const add = (o) => { d.rows.push(o.setDepth(D)); return o; };
    const hit = (x, y, w, h, ui) => { const r = add(this.add.rectangle(x, y, w, h, 0xffffff, 0.001).setOrigin(0).setInteractive()); r.ui = ui; r.setDepth(D + 5); };
    const swatchRow = (y, colors, field) => {
      colors.forEach((c, i) => {
        const x = d.x0 + i * 15;
        if ((look[field] || colors[0]) === c) add(this.add.rectangle(x - 1, y - 1, 13, 13, 0xffffff).setOrigin(0));
        add(this.add.rectangle(x, y, 11, 11, Phaser.Display.Color.HexStringToColor(c).color).setOrigin(0));
        hit(x - 2, y - 2, 15, 15, { dress: { field, value: c } });
      });
    };
    const iconRow = (y, keys, field, cropY, cropH) => {
      keys.forEach((k, i) => {
        const x = d.x0 + i * 26;
        const tex = `dress_${field}_${k}`;
        makeCharTextures(this, tex, { ...look, [field]: k });
        const sel = (look[field] || keys[0]) === k;
        add(this.add.rectangle(x - 1, y - 1, 24, cropH + 2, sel ? 0xffffff : 0x4a3157).setOrigin(0));
        add(this.add.rectangle(x, y, 22, cropH, 0x6b4a7e).setOrigin(0));
        add(this.add.image(x, y - cropY, tex).setOrigin(0).setCrop(0, cropY, 22, cropH)).setDepth(D + 1);
        hit(x - 1, y - 1, 24, cropH + 2, { dress: { field, value: k } });
      });
    };
    let y = 5;
    swatchRow(y, SKIN, 'skin'); y += 16;
    iconRow(y, HAIR_STYLE_KEYS, 'hairStyle', 0, 16); y += 21;
    swatchRow(y, HAIR, 'hair'); y += 16;
    iconRow(y, OUTFIT_KEYS, 'outfit', 14, 22); y += 27;
    swatchRow(y, DRESS, 'dress');
    // кнопка «готово» — большая галочка
    const bx = W - 26;
    const by = H - 22;
    add(this.add.rectangle(bx, by, 22, 18, 0x52b893).setOrigin(0));
    add(this.add.rectangle(bx, by + 16, 22, 2, 0x2f7d5f).setOrigin(0));
    const g = add(this.add.graphics());
    pixelMap(g, ['.........XX', '........XX.', '.......XX..', 'XX....XX...', '.XX..XX....', '..XXXX.....', '...XX......'], bx + 5, by + 5, 0xffffff);
    hit(bx - 2, by - 2, 26, 22, { dressDone: true });
  }

  onDressUi(ui) {
    const d = this.dress;
    if (!d) return;
    if (ui.dressDone) { this.closeDressUp(); return; }
    if (!ui.dress) return;
    const { field, value } = ui.dress;
    if (d.ch.look[field] === value) return;
    d.ch.look = { ...d.ch.look, [field]: value };
    makeCharTextures(this, d.ch.key, d.ch.look);
    d.ch.setTexture(d.ch.key);
    d.preview.setTexture(d.ch.key);
    sfx.wear();
    this.tweens.add({ targets: d.preview, y: d.preview.y - 4, duration: 90, yoyo: true });
    this.buildDressRows();
  }

  closeDressUp() {
    const d = this.dress;
    d.rows.forEach((o) => o.destroy());
    d.parts.forEach((o) => o.destroy());
    this.dress = null;
    d.ch.busy = false;
    d.ch.setTexture(d.ch.key);
    sfx.yum();
    this.fxHearts.explode(3, d.ch.x, d.ch.y - d.ch.displayHeight);
    this.save();
  }

  applyNight(night, withSound = false) {
    if (withSound) (night ? sfx.night : sfx.day)();
    this.night = night;
    this.drawSky();
    const a = night ? 0.55 : 0;
    if (withSound) { this.tweens.add({ targets: this.overlay, fillAlpha: a, duration: 500 }); this.save(); }
    else this.overlay.fillAlpha = a;
  }

  // ---------------------------------------------------------------- frame update
  update(time) {
    for (const o of this.objs) {
      // сняли очки (любым способом) — вернуть исходный спрайт
      if (o.fitted && o.slot !== o.fitted) { o.setTexture(o.rec.cat, o.rec.frame); o.fitted = false; }
    }
    for (const o of this.objs) {
      if (o.kind === 'char' || o.dragging || o.owner) continue;
      o.setDepth(o.beh.flat ? -5 : o.restOn ? o.restOn.depth + 0.5 : o.y); // ковёр всегда снизу
    }
    for (const ch of this.objs) {
      if (ch.kind !== 'char') continue;
      if (!ch.dragging) ch.setDepth(ch.restOn ? ch.restOn.depth + 0.5 : ch.y);
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
  save() {
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => this.saveNow(), 400);
  }

  saveNow() {
    clearTimeout(this.saveT);
    if (!this.objs) return;
    const state = {
      v: 2, night: this.night, W: L.W, ROOM_H: L.ROOM_H, FLOOR_TOP: L.FLOOR_TOP,
      objs: this.objs.filter((o) => o.kind === 'item').map((o) => ({
        uid: o.uid, id: o.rec.id, x: Math.round(o.x), y: Math.round(o.y), lit: o.lit,
        contents: o.contents, owner: o.owner?.uid, slot: o.slot, restOn: o.restOn?.uid, bites: o.bites || 0,
      })),
      chars: this.objs.filter((o) => o.kind === 'char').map((o) => ({
        uid: o.uid, x: Math.round(o.x), y: Math.round(o.y), look: o.look, mul: o.mul, restOn: o.restOn?.uid,
      })),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* приватный режим — играем без сохранения */ }
  }

  loadState() {
    let st;
    try { st = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return false; }
    if (!st || st.v !== 2) return false;
    // экран мог поменяться (поворот, полноэкранный режим) — переносим координаты в новую раскладку
    const fx = (x) => Math.round(Phaser.Math.Clamp(x * L.W / (st.W || L.W), 6, L.W - 6));
    const fy = (y) => {
      const oldFloor = st.FLOOR_TOP || L.FLOOR_TOP;
      const oldRoom = st.ROOM_H || L.ROOM_H;
      const ny = y >= oldFloor
        ? L.FLOOR_TOP + (y - oldFloor) * (L.ROOM_H - L.FLOOR_TOP) / Math.max(1, oldRoom - oldFloor)
        : y * L.FLOOR_TOP / Math.max(1, oldFloor);
      return Math.round(Phaser.Math.Clamp(ny, 4, L.ROOM_H - 1));
    };
    const byUid = new Map();
    for (const c of st.chars) byUid.set(c.uid, this.spawnChar(fx(c.x), fy(c.y), c.look, { uid: c.uid, mul: c.mul }));
    for (const s of st.objs) {
      const rec = this.recOf(s.id);
      if (!rec) continue;
      const contents = (s.contents || []).map((id) => this.recOf(id)?.id).filter(Boolean);
      const it = this.spawnItem(rec, fx(s.x), fy(s.y), { uid: s.uid, lit: s.lit, contents });
      if (s.bites && it.beh.edible) { it.bites = s.bites; this.applyBites(it); }
      byUid.set(s.uid, it);
    }
    for (const s of [...st.objs, ...st.chars]) {
      const o = byUid.get(s.uid);
      if (!o) continue;
      if (s.restOn && byUid.get(s.restOn)) o.restOn = byUid.get(s.restOn);
      if (s.owner && byUid.get(s.owner)) {
        const ch = byUid.get(s.owner);
        ch.slots[s.slot] = o; o.owner = ch; o.slot = s.slot;
      }
    }
    this.night = !!st.night;
    return true;
  }

  resetRoom() {
    clearTimeout(this.saveT);
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.objs = null;
    this.scene.restart();
  }
}

// =====================================================================
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
  scene: [Boot, Room],
});

// Поворот / смена размера окна: пересчитать целый масштаб и перестроить комнату (состояние сохраняется)
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    const prev = `${L.dw}x${L.dh}`;
    computeLayout();
    if (prev === `${L.dw}x${L.dh}`) return;
    game.scale.resize(L.dw, L.dh);
    game.scale.setZoom(1 / L.dpr);
    const room = game.scene.getScene('room');
    if (room?.scene.isActive()) { room.saveNow(); room.scene.restart(); }
  }, 200);
});

// Офлайн-режим: service worker есть только в собранной версии (npm run build)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Отладка в dev-режиме: состояние игры доступно из консоли браузера
if (import.meta.env.DEV) window.__game = game;
