import Phaser from 'phaser';
import { sfx, unlockAudio, setMusic, musicPlaying, setJamLayer, stopJam, jamActive, onJamStep, setMusicTheme, musicTheme, setVoice, say, getVolume } from './sfx.js';
import { makeCharTextures, ANCHOR, HAIR, DRESS, SKIN, HAIR_STYLE_KEYS, OUTFIT_KEYS } from './character.js';
import { BIG_FURNITURE, makeFurnitureTextures, outline } from './furniture.js';
import { Alchemy, recipeKey } from './alchemy.js';
import { makePotions } from './potions.js';
import { makeBath } from './bath.js';
import { makeParty, BIRTHDAY_TUNE } from './party.js';
import { makeSalon, blenderTex, smoothieTex } from './salon.js';
import { makePlay, rainbowTex, makePhoto } from './play.js';
import { installCast } from './cast.js';
import { installLife } from './life.js';
import { installNav } from './nav.js';
import { makeSeason, installSeason, today, isWinter } from './season.js';
import { Stickers, installStickers } from './stickers.js';
import { openParent, statHit, statTime, flushStats, getStats, exportData } from './parent.js';
import { installRepair } from './repair.js';
import { installDream, Dream } from './dream.js';
import { makeTidy, installTidy, RAKES } from './tidy.js';
import { makeClean, installClean } from './clean.js';

// =====================================================================
// Геометрия: мир измеряется в «арт-пикселях» (1 = один пиксель спрайта).
// Канвас — в физических пикселях устройства, камера увеличивает мир
// в ЦЕЛОЕ число раз (P). Так каждый пиксель спрайта — ровный квадрат P×P,
// без дробного растяжения и «зернистости». Всё в сцене рисуется с масштабом 1.
// =====================================================================
const L = {};
const DRAWER_H = 40;

/** Размер канваса в физических пикселях. Игра всегда альбомная: в портрете экран закрыт просьбой
 *  повернуть телефон, а раскладку считаем сразу как для повёрнутого — координаты вещей не зависят от поворота. */
function screenSize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(window.innerWidth, window.innerHeight);
  const h = Math.min(window.innerWidth, window.innerHeight);
  return { dpr, dw: Math.round(w * dpr), dh: Math.round(h * dpr), h };
}

function computeLayout() {
  const { dpr, dw, dh } = screenSize();
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
  // мир — две комнаты по ширине экрана: спальня [0, W) и алхимическая кухня [W, 2W)
  L.ROOMS = 5; // спальня, алхимическая кухня, сад, ванная, концертный зал
  L.WORLD = L.W * L.ROOMS;
  L.WINDOWS = [L.WINDOW, { ...L.WINDOW, x: L.W + L.WINDOW.x }];
  L.SUN = { x: 2 * L.W + L.W - 26, y: 5, w: 14, h: 14 }; // солнце/луна в саду: тап меняет день и ночь
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
// Желания персонажей (пузырёк с картинкой) — необязательные поводы для игры, без очков и таймеров
const WISH_FOOD = ['cupcake', 'apple', 'strawberry', 'ice cream cone', 'chocolate chip cookie', 'banana', 'slice of pizza', 'glazed donut', 'watermelon slice'];
const WISH_WEAR = ['crown', 'tiara', 'party hat', 'flower crown', 'bunny ear headband'];
const WISH_PET = ['kitten', 'puppy', 'rabbit', 'hamster'];

// Плита/духовка: что во что превращается (сырое -> приготовленное)
const COOK = {
  'egg': 'fried egg', 'brown egg': 'fried egg', 'potato': 'baked potato', 'ear of corn': 'buttered corn cob',
  'slice of bread': 'slice of toast', 'chicken drumstick': 'fried chicken drumstick', 'apple': 'slice of apple pie',
  'pair of cherries': 'cherry pie', 'cherry': 'cherry pie', 'blueberry': 'blueberry muffin', 'banana': 'banana bread loaf',
  'wedge of cheese': 'grilled cheese sandwich', 'sack of rice': 'bowl of white rice', 'pumpkin': 'pumpkin pie',
  'tomato': 'bowl of tomato soup', 'onion': 'bowl of onion soup', 'button mushroom': 'bowl of mushroom soup',
  'loaf of bread': 'garlic bread', 'sausage link': 'hot dog', 'strawberry': 'strawberry rhubarb pie', 'peach': 'peach cobbler',
  'sweet potato': 'potato wedges', 'hamburger patty': 'hamburger', 'broccoli': 'steamed broccoli',
  'cabbage': 'bowl of vegetable soup', 'carrot': 'bowl of vegetable soup', 'lemon': 'lemon tart',
};
// Сад: что можно посадить (вырастет то же самое); пакетик семян — сюрприз из этого списка
const GROW = ['strawberry', 'apple', 'carrot', 'tomato', 'pumpkin', 'potato', 'banana', 'watermelon', 'pear', 'peach',
  'pair of cherries', 'ear of corn', 'eggplant', 'onion', 'broccoli', 'lemon', 'orange', 'bunch of grapes', 'blueberry',
  'cabbage', 'radish', 'pineapple', 'sunflower', 'tulip', 'rose', 'daisy flower', 'button mushroom'];
const SEEDS = /seed packet|seed pouch|\bseeds?\b/;
const PLOT_DX = [-13, 0, 13];
// Холодильник: что выпадает по тапу (сырое для плиты, фрукты для блендера, немного кислого и острого)
const FRIDGE = ['egg', 'glass of milk', 'wedge of cheese', 'tomato', 'carrot', 'apple', 'strawberry', 'banana', 'lemon',
  'pair of cherries', 'potato', 'broccoli', 'sausage link', 'slice of bread', 'blueberry', 'watermelon slice', 'peach',
  'orange', 'onion', 'button mushroom', 'chili pepper', 'pineapple', 'mango', 'pear', 'bunch of grapes', 'lime'];
// Вкусы: кислое морщит, острое обжигает, а у каждого персонажа есть два нелюбимых овоща («фу!»)
const SOUR = /\b(lemon|lime|grapefruit|pickle)\b/;
const HOT = /chili|jalapeno|hot sauce|wasabi/;
const DISLIKE = ['broccoli', 'onion', 'button mushroom', 'cabbage', 'radish', 'eggplant'];
// Подсказки-облачка «что взять → куда»: персонаж просит о том, чего ещё не пробовали в его комнате.
// room — номер комнаты; seq — картинки по очереди (id/предмет каталога или 'tex:ключ текстуры).
const HINTS = {
  fridge: { room: 1, seq: (s) => ['big_fridge', pick(s.fridgeRecs())] },
  smoothie: { room: 1, seq: () => [pick(['strawberry', 'banana', 'peach']), 'blender', 'smoothie'] },
  cook: { room: 1, seq: () => ['egg', 'big_stove', 'fried egg'] },
  makeup: { room: 3, seq: () => [pick(['lipstick', 'blush', 'paint-whiskers', 'paint-hearts', 'paint-freckles'])] },
  teeth: { room: 3, seq: () => ['toothbrush'] },
  bubbles: { room: 3, seq: () => ['big_tub', 'tex:bubble_big'] },
  toilet: { room: 3, seq: () => ['big_toilet', 'tex:bubble_big'] },
  // потребности (room: null) — появляются по состоянию персонажа, а не по комнате
  bounce: { room: 0, seq: () => ['big_bed'] },
  chest: { room: 0, seq: () => ['big_chest'] },
  photo: { room: 0, seq: () => ['camera'] },
  stars: { room: 0, night: true, seq: () => ['big_lamp', 'tex:star_px'] },
  rain: { room: 2, seq: () => ['tex:raincloud'] },
  swing: { room: 2, seq: () => ['big_swing'] },
  butterfly: { room: 2, seq: () => ['butterfly'] },
  dig: { room: 2, seq: () => ['shovel', 'tex:dig_x'] },
  // сны и мечты: облачко-дверь над спящей куклой, качелями, ванной, холодильником, сундуком, яблоней и диско-шаром
  dream: { room: 0, seq: () => ['big_bed', 'tex:dream_cloud_icon', 'unicorn'] },
  dreamsky: { room: 2, seq: () => ['big_swing', 'tex:dream_cloud_icon', 'rainbow'] },
  dreamsea: { room: 3, seq: () => ['big_tub', 'tex:dream_cloud_icon', 'goldfish'] },
  dreamcandy: { room: 1, seq: () => ['big_fridge', 'tex:dream_cloud_icon', pick(['cupcake', 'penguin'])] },
  dreamtoys: { room: 0, seq: () => ['big_chest', 'tex:dream_cloud_icon', 'teddy bear'] },
  dreamforest: { room: 2, seq: () => ['big_tree', 'tex:dream_cloud_icon', 'unicorn'] },
  dreamspace: { room: 4, seq: () => ['disco-ball', 'tex:dream_cloud_icon', 'flying saucer'] },
  // уборка: робот-пылесос в спальне, стиральная машина в ванной
  robot: { room: 0, seq: () => ['robo-vac'] },
  wash: { room: 3, seq: () => [pick(['teddy bear', 'sock', 'rag doll']), 'washer'] },
  mic: { room: 4, seq: () => ['microphone'] },
  audience: { room: 4, seq: () => ['chair', 'teddy bear'] },
  curtain: { room: 4, seq: () => ['tex:curtain_icon'] },
  disco: { room: 4, seq: () => ['disco-ball'] },
  potty: { room: null, seq: () => ['big_toilet'] },   // наелась — пора на горшок
  dryer: { room: null, seq: () => ['hair-dryer'] },   // мокрая после ванны
};
// Облачка с кроватью («хочу спать», сон, прыжки на кровати) — после показа берут паузу, см. noteBed()
const BED_HINTS = new Set(['dream', 'bounce']);
const SWEET = /cake|cookie|candy|lollipop|donut|cupcake|ice cream|chocolate|macaron|muffin|\bpie\b|waffle|pancake|\btart\b|cobbler/;
// Что подпрыгивает с искорками, пока его ни разу не трогали (ключ — как в HINTS)
const LURES = [['fridge', (b) => b.fridge], ['smoothie', (b) => b.blender], ['bubbles', (b) => b.tub], ['toilet', (b) => b.toilet],
  ['makeup', (b) => !!b.makeup], ['teeth', (b) => b.toothbrush], ['mic', (b) => b.mic], ['disco', (b) => b.disco],
  ['robot', (b) => b.robot], ['wash', (b) => b.washer], ['bounce', (b) => b.bigBed], ['chest', (b) => b.chest], ['photo', (b) => b.camera], ['swing', (b) => b.swing], ['dig', (b) => b.shovel]];
// Сундук с сюрпризами: что выскакивает по тапу
const TOYBOX = ['teddy bear', 'beach ball', 'rubber duck', 'kite', 'yo-yo', 'spinning top', 'toy robot', 'rag doll', 'nesting doll',
  'jack-in-the-box', 'toy castle', 'soccer ball', 'pinwheel', 'toy car', 'balloon', 'toy train engine', 'toy sailboat'];
// Клад в саду
const TREASURE = ['seashell', 'pearl', 'diamond', 'ruby', 'emerald', 'amethyst', 'four leaf clover', 'starfish', 'treasure chest',
  'bag of gold coins', 'crystal apple', 'crystal egg', 'toy robot', 'spinning top'];
// Любимые игрушки питомцев (у каждого своя — по номеру)
const PET_TOYS = ['beach ball', 'ball of yarn', 'rubber duck', 'teddy bear', 'soccer ball', 'balloon'];

// Темы снов: что персонаж держит в руке, засыпая, — тот мир и снится первым (world — ключ мира в dreamworlds.js);
// items — сувениры этого мира: их приносят из сна, они же — страница альбома наклеек;
// rare — редкие сувениры: их дарит только житель мира, чьё желание исполнили
const DREAM_THEMES = [
  { world: 'sea', match: /fish|shell|whale|octopus|starfish|seahorse|boat|duck|crab|dolphin|jellyfish|pearl/, items: ['goldfish', 'whale', 'octopus', 'seashell', 'starfish', 'seahorse', 'dolphin', 'pearl'], rare: ['black pearl', 'crystal turtle', 'sea turtle'] },
  { world: 'planet', match: /star|moon|wand|rocket|comet|planet|orb|saucer|robot/, items: ['star', 'crescent moon', 'shooting star', 'toy rocket', 'crystal ball', 'flying saucer', 'moon rabbit', 'jar of stardust'], rare: ['star crystal', 'star-shaped medal', 'morning star'] },
  { world: 'forest', match: /book|crown|tiara|fairy|castle|unicorn|potion|album|mushroom|flower/, items: ['unicorn', 'fairy', 'crown', 'toy castle', 'magic wand', 'tiara', 'glowcap mushroom'], rare: ['golden acorn', 'fairy queen', 'flower crown'] },
  { world: 'candy', match: /cake|cookie|candy|lollipop|donut|cupcake|ice cream|chocolate|macaron/, items: ['cupcake', 'lollipop', 'cotton candy', 'candy cane', 'macaron', 'glazed donut'], rare: ['candy necklace', 'ice cream sundae', 'golden apple'] },
  { world: 'toys', match: /teddy|plush|kitten|puppy|cat|dog|rabbit|bunny|pony|panda|hamster|owl|doll|toy|ball/, items: ['kitten', 'puppy', 'rabbit', 'panda', 'pony', 'teddy bear', 'toy robot', 'toy train engine'], rare: ['puzzle cube', 'medal on ribbon', 'balloon dog'] },
  { world: 'ice', match: /snow|\bice\b|penguin|polar|sled|mitten|scarf|frost/, items: ['snowflake', 'penguin', 'snow globe', 'ice crystal', 'sled', 'polar bear'], rare: ['snowy owl', 'arctic fox', 'snowflake ornament'] },
  { world: 'clouds', match: /cloud|kite|balloon|bird|rainbow|feather|\bsun\b|airplane|pinwheel/, items: ['rainbow', 'cloud sheep', 'bluebird', 'kite', 'sun', 'hot air balloon'], rare: ['pot of gold', 'winged bunny', 'sky jellyfish'] },
];

// Утренний сувенир, если заснули без предмета в руке
const DREAMS = ['unicorn', 'rainbow', 'star', 'cupcake', 'kitten', 'crown', 'shooting star', 'teddy bear', 'butterfly'];

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
  // на чём можно спать
  bedLike: /\b(bed|sofa|crib|cradle|hammock|couch)\b/,
  cooker: /\b(stove|oven|toaster|microwave|hot plate)\b/,
  drum: /drum|tambourine|maracas|cymbal|triangle/,
  bell: /piano|xylophone|bell|music box|harp/,
  string: /guitar|ukulele|violin|cello|banjo/,
  // водные и медленные животные не бегают по полу
  noWalk: /fish|whale|jellyfish|octopus|dolphin|seahorse|starfish|shark|snail|turtle|seal/,
  // украшения на волосы — подгоняются по размеру головы (иконки датасета для них слишком крупные)
  hairAcc: /tiara|circlet|flower crown|hair (bow|clip)|hairclip|bow ribbon/,
  // ободки (часто с ушками): дуга обхватывает голову — концы на уровне глаз, ушки торчат над макушкой
  earBand: /headband|\bears?\b/,
  shelf: /\bshelf\b/,
  wall: /garland|window|painting|picture frame|collage|wall clock|cuckoo clock|wall shelf|curtain|chandelier|ceiling lamp|^mirror$|oval mirror|magic mirror|blinds|shutter/,
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
    wall: RX.wall.test(s) || !!rec.wall,
    flat: /\b(rug|carpet|mat|puddle)\b/.test(s),
    tub: s === 'clawfoot bathtub' && !!rec.tex,
    puddle: s === 'mud puddle',
    paint: /paint (can|bucket|tube|palette)|jar of paint|watercolor paint set/.test(s),
    foam: rec.foam || 0,
    dryer: !!rec.dryer,
    cake: !!rec.cake, icing: rec.icing || 0, sprinkles: !!rec.sprinkles, candles: !!rec.candles, gift: !!rec.gift,
    gardenBed: s === 'veggie patch',
    appleTree: s === 'apple tree' && !!rec.tex,
    shelf: rec.cat === 'furniture' && RX.shelf.test(s),
    cauldron: /cauldron/.test(s),
    album: s === 'discovery album',
    fridge: s === 'refrigerator' && !!rec.tex,
    blender: !!rec.blender,
    smoothie: !!rec.smoothie,
    makeup: rec.makeup || null,
    toothbrush: !!rec.toothbrush,
    toilet: s === 'flush toilet',
    mic: !!rec.mic,
    disco: !!rec.disco,
    stage: s === 'music stage',
    seat: rec.cat === 'furniture' && /\b(chair|stool|bench)\b/.test(s) && !RX.bedLike.test(s),
    chest: s === 'toy chest' && !!rec.tex,
    bigBed: rec.id === 'big_bed',
    swing: s === 'garden swing',
    camera: !!rec.camera,
    photo: !!rec.photo,
    shovel: s === 'shovel',
    lamp: RX.light.test(s) && /lamp/.test(s),
    nyTree: !!rec.nyTree,
    bin: !!rec.bin,
    sweeper: !!rec.sweeper || RAKES.test(s),
    robot: !!rec.robot, mop: !!rec.mop, washer: !!rec.washer, compost: !!rec.compost, fertilizer: !!rec.fertilizer,
  };
}

const rnd = (a, b) => a + Math.random() * (b - a);
/** Цвет, наполовину смешанный с белым, как строка '#rrggbb' (пенка коктейля). */
const lightHex = (c) => `#${[16, 8, 0].map((sh) => Math.round((((c >> sh) & 255) + 255) / 2).toString(16).padStart(2, '0')).join('')}`;
const VIEW_SIZE = 24; // предметов в одной подборке вкладки = 2 страницы по 12

/** Детерминированное перемешивание (одна и та же витрина при каждом запуске). */
function seededShuffle(arr, seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
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
    const clean = makeClean(this); // робот и швабра — в игрушках, стиральная машина — в мебели, компост — в саду
    for (const r of clean) this.byId.set(r.id, r);
    this.winter = isWinter(today());
    const season = makeSeason(this); // ёлка — во вкладке мебели, только зимой
    for (const r of season) this.byId.set(r.id, r);
    this.byCat = {
      furniture: [...Object.values(this.big), ...clean.filter((r) => r.cat === 'furniture'), ...(this.winter ? season : [])], magic: potions.slice(),
      garden: clean.filter((r) => r.cat === 'garden' && !r.hidden),
      kitchen: salon.filter((r) => r.cat === 'kitchen'),
      food: party.filter((r) => r.cat === 'food'),
      toy: [...party.filter((r) => r.cat === 'toy'), ...bath.filter((r) => r.cat === 'toy'), ...salon.filter((r) => r.cat === 'toy'), ...play.filter((r) => !r.hidden), ...tidy, ...clean.filter((r) => r.cat === 'toy')],
      animal: bath.filter((r) => r.cat === 'animal'),
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
    if (!this.loadState()) this.defaultRoom();
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
    this.ensureTidy();
    this.ensureClean();
    this.initClean();
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

  drawRoom() {
    const { W, ROOM_H, FLOOR_TOP } = L;
    const g = this.add.graphics().setDepth(-10);
    // ===== спальня [0, W): обои в полоску с точками
    g.fillStyle(0xf8dce8).fillRect(0, 0, W, FLOOR_TOP);
    g.fillStyle(0xf2cadb);
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 3, FLOOR_TOP);
    g.fillStyle(0xe6aec7);
    for (let y = 5, r = 0; y < FLOOR_TOP - 16; y += 10, r++) for (let x = r % 2 ? 9 : 1; x < W; x += 16) g.fillRect(x, y, 1, 1);
    const wy = FLOOR_TOP - 14;
    g.fillStyle(0xe7b6cd).fillRect(0, wy, W, 14);
    g.fillStyle(0xd197b4).fillRect(0, wy - 1, W, 1);
    g.fillStyle(0xdba8c0);
    for (let x = 3; x < W - 14; x += 18) g.fillRect(x, wy + 3, 13, 7);
    g.fillStyle(0x8d5a78).fillRect(0, FLOOR_TOP - 2, W, 2);
    // пол — доски
    g.fillStyle(0xd39a68).fillRect(0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
    for (let y = FLOOR_TOP, row = 0; y < ROOM_H; y += 6, row++) {
      g.fillStyle(0xdeab7c).fillRect(0, y, W, 1);
      g.fillStyle(0xb98153).fillRect(0, y + 5, W, 1);
      for (let x = (row % 2) * 12; x < W; x += 24) g.fillRect(x, y + 1, 1, 4);
    }
    // ===== кухня [W, 2W): мятная стена, плитка-фартук, пол в клетку
    const k = W;
    g.fillStyle(0xe6f6ef).fillRect(k, 0, W, FLOOR_TOP);
    g.fillStyle(0xcdeee0);
    for (let y = 6, r = 0; y < FLOOR_TOP - 26; y += 9, r++) for (let x = k + (r % 2 ? 10 : 2); x < k + W; x += 16) g.fillRect(x, y, 2, 2);
    const ty = FLOOR_TOP - 24;
    g.fillStyle(0xd8f3e8).fillRect(k, ty, W, 22);
    g.fillStyle(0xbfe6d5);
    for (let y = ty; y < FLOOR_TOP - 2; y += 6) g.fillRect(k, y, W, 1);
    for (let y = ty, r = 0; y < FLOOR_TOP - 2; y += 6, r++) for (let x = k + (r % 2) * 3; x < k + W; x += 6) g.fillRect(x, y, 1, 6);
    g.fillStyle(0x5f9c85).fillRect(k, FLOOR_TOP - 2, W, 2);
    for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 6, r++) {
      for (let x = k, c = r % 2; x < k + W; x += 6, c ^= 1) g.fillStyle(c ? 0xf4ead8 : 0xe3cfae).fillRect(x, y, 6, 6);
    }
    // проём между комнатами
    g.fillStyle(0xc9a3b9).fillRect(W - 2, 0, 4, FLOOR_TOP - 2);
    g.fillStyle(0xa77f97).fillRect(W + 1, 0, 1, FLOOR_TOP - 2);
    // ===== ванная [3W, 4W): голубая плитка, пол в крупную клетку
    const bx = 3 * W;
    g.fillStyle(0xdff6fb).fillRect(bx, 0, W, FLOOR_TOP);
    g.fillStyle(0xc2e6f0);
    for (let y = 0; y < FLOOR_TOP; y += 8) g.fillRect(bx, y, W, 1);
    for (let x = bx; x < bx + W; x += 8) g.fillRect(x, 0, 1, FLOOR_TOP);
    g.fillStyle(0xb7e0ec).fillRect(bx, FLOOR_TOP - 16, W, 14);
    g.fillStyle(0x9fd2e2);
    for (let x = bx; x < bx + W; x += 8) g.fillRect(x, FLOOR_TOP - 16, 1, 14);
    g.fillStyle(0x7fbfd2).fillRect(bx, FLOOR_TOP - 17, W, 1).fillRect(bx, FLOOR_TOP - 2, W, 2);
    for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 8, r++) {
      for (let x = bx, c = r % 2; x < bx + W; x += 8, c ^= 1) g.fillStyle(c ? 0xffffff : 0xd6eef6).fillRect(x, y, 8, 8);
    }
    g.fillStyle(0xb0d8e4).fillRect(bx - 2, 0, 4, FLOOR_TOP);
    // ===== концертный зал [4W, 5W): тёмная стена со звёздочками, бархатный занавес, паркет
    const hx = 4 * W;
    g.fillStyle(0x3b2160).fillRect(hx, 0, W, FLOOR_TOP);
    g.fillStyle(0xffd84a);
    for (let y = 6, r = 0; y < FLOOR_TOP - 20; y += 11, r++) for (let x = hx + (r % 2 ? 12 : 4); x < hx + W; x += 17) {
      g.fillRect(x, y, 1, 1); if ((x + y) % 3 === 0) g.fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3);
    }
    const cw = Math.round(W * 0.16);
    for (const [x1, dir] of [[hx, 1], [hx + W - cw, -1]]) {
      g.fillStyle(0xb8264a).fillRect(x1, 0, cw, FLOOR_TOP);
      g.fillStyle(0x8e1838);
      for (let x = 3; x < cw; x += 6) g.fillRect(x1 + x, 0, 2, FLOOR_TOP);
      g.fillStyle(0xd8406a);
      for (let x = 1; x < cw; x += 6) g.fillRect(x1 + x, 0, 1, FLOOR_TOP);
      g.fillStyle(0xffd84a).fillRect(dir > 0 ? x1 + cw - 3 : x1, Math.round(FLOOR_TOP * 0.55), 3, 3); // подхват
    }
    g.fillStyle(0xb8264a).fillRect(hx, 0, W, 8);
    g.fillStyle(0x8e1838);
    for (let x = hx; x < hx + W; x += 12) g.fillRect(x, 8, 12, 2).fillRect(x + 3, 10, 6, 1);
    g.fillStyle(0xffd84a).fillRect(hx, 7, W, 1);
    g.fillStyle(0x24123c).fillRect(hx, FLOOR_TOP - 2, W, 2);
    for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 4, r++) {
      g.fillStyle(r % 2 ? 0x9a5a3a : 0xa8683f).fillRect(hx, y, W, 4);
      g.fillStyle(0x7d4529);
      for (let x = hx + (r % 3) * 7; x < hx + W; x += 21) g.fillRect(x, y, 1, 4);
    }
    g.fillStyle(0x6e3a8a).fillRect(hx - 2, 0, 4, FLOOR_TOP);
    // ===== сад [2W, 3W): трава (небо, холмы и забор — на своих слоях)
    const gx = 2 * W;
    const snowy = this.winter; // зимой сад в снегу
    g.fillStyle(snowy ? 0xf4f9ff : 0x8fd16a).fillRect(gx, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
    for (let y = FLOOR_TOP + 2, r = 0; y < ROOM_H; y += 5, r++) {
      g.fillStyle(snowy ? 0xd9e8f5 : 0x7cc25a);
      for (let x = gx + (r % 2) * 5; x < gx + W; x += 10) { g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y + 1, 1, 1); }
    }
    g.fillStyle(snowy ? 0xffffff : 0xb5e38f).fillRect(gx, FLOOR_TOP, W, 1);
    // дверной косяк между кухней и садом
    g.fillStyle(0x8d5a3b).fillRect(gx - 2, 0, 4, FLOOR_TOP);
    g.fillStyle(0xa8714d).fillRect(gx - 2, 0, 1, FLOOR_TOP);
    // холмы и белый заборчик — поверх неба
    const hz = this.add.graphics().setDepth(-8);
    for (let x = gx; x < gx + W; x++) {
      const hgt = Math.round(7 + 4 * Math.sin((x - gx) / 23) + 2 * Math.sin((x - gx) / 9));
      hz.fillStyle(snowy ? 0xd3e3f2 : 0x7cc25a).fillRect(x, FLOOR_TOP - hgt, 1, hgt);
    }
    hz.fillStyle(0xfff8f0);
    for (let x = gx + 3; x < gx + W; x += 8) { hz.fillRect(x, FLOOR_TOP - 13, 3, 13); hz.fillRect(x + 1, FLOOR_TOP - 14, 1, 1); }
    hz.fillRect(gx, FLOOR_TOP - 10, W, 2).fillRect(gx, FLOOR_TOP - 5, W, 2);
    hz.fillStyle(0xe0d6cc);
    for (let x = gx + 5; x < gx + W; x += 8) hz.fillRect(x, FLOOR_TOP - 13, 1, 13);
    // окна: небо — отдельный слой (перерисовывается днём/ночью), рамы — поверх
    this.sky = this.add.graphics().setDepth(-9);
    const f = this.add.graphics().setDepth(-8);
    L.WINDOWS.forEach(({ x, y, w, h }, i) => {
      const mx = x + w / 2;
      const my = y + Math.floor(h / 2);
      f.fillStyle(0xffffff)
        .fillRect(x - 2, y - 2, w + 4, 2).fillRect(x - 2, y + h, w + 4, 2)
        .fillRect(x - 2, y, 2, h).fillRect(x + w, y, 2, h)
        .fillRect(mx - 1, y, 2, h).fillRect(x, my - 1, w, 2);
      if (i === 0) {
        f.fillStyle(0xd197b4).fillRect(x - 4, y + h + 2, w + 8, 2); // подоконник
        f.fillStyle(0xfff4a8).fillRect(x - 7, y - 4, 5, h + 7).fillRect(x + w + 2, y - 4, 5, h + 7);
        f.fillStyle(0xf2df7a).fillRect(x - 5, y - 4, 1, h + 7).fillRect(x + w + 4, y - 4, 1, h + 7);
        f.fillStyle(0xc98aa9).fillRect(x - 9, y - 5, w + 18, 1); // карниз
      } else {
        // кухня: короткая занавеска-«кафе» в клетку
        f.fillStyle(0x5f9c85).fillRect(x - 4, y + h + 2, w + 8, 2);
        for (let cx = 0; cx < w; cx += 2) for (let cy = 0; cy < 6; cy += 2) {
          f.fillStyle((cx + cy) % 4 ? 0xff9ab8 : 0xffffff).fillRect(x + cx, y - 1 + cy, 2, 2);
        }
      }
    });
  }

  drawSky() {
    const s = this.sky.clear();
    for (const win of L.WINDOWS) this.drawSkyIn(s, win);
    // небо сада: днём — голубое с солнцем и облаками, ночью — тёмное с луной и звёздами
    const gx = 2 * L.W;
    const { x: sx, y: sy } = L.SUN;
    if (!this.night) {
      s.fillStyle(0x9fdcff).fillRect(gx, 0, L.W, L.FLOOR_TOP);
      s.fillStyle(0xc8ecff).fillRect(gx, L.FLOOR_TOP - 22, L.W, 22);
      s.fillStyle(0xffe066).fillRect(sx + 2, sy, 10, 14).fillRect(sx, sy + 2, 14, 10);
      s.fillStyle(0xfff4a8).fillRect(sx + 3, sy + 3, 4, 4);
      s.fillStyle(0xffffff);
      for (const [cx, cy] of [[30, 10], [110, 18], [190, 8]]) {
        s.fillRect(gx + cx, cy, 16, 4).fillRect(gx + cx + 3, cy - 3, 8, 3).fillRect(gx + cx + 9, cy - 2, 5, 2);
      }
    } else {
      s.fillStyle(0x24205a).fillRect(gx, 0, L.W, L.FLOOR_TOP);
      s.fillStyle(0xfff6c2).fillRect(sx + 2, sy, 10, 14).fillRect(sx, sy + 2, 14, 10);
      s.fillStyle(0x24205a).fillRect(sx + 6, sy - 1, 9, 12);
      s.fillStyle(0xffffff);
      for (let i = 0; i < 40; i++) s.fillRect(gx + ((i * 73 + i * i * 29) % L.W), (i * 37 + i * i * 13) % (L.FLOOR_TOP - 16), 1, 1); // разбросанные звёзды
    }
  }

  drawSkyIn(s, { x, y, w, h }) {
    if (!this.night) {
      s.fillStyle(0x8fd3ff).fillRect(x, y, w, h);
      s.fillStyle(0xffe066).fillRect(x + w - 9, y + 3, 5, 5);
      s.fillStyle(0xffffff).fillRect(x + 3, y + 8, 8, 2).fillRect(x + 5, y + 6, 4, 2)
        .fillRect(x + 17, y + 14, 9, 2).fillRect(x + 19, y + 12, 4, 2);
      s.fillStyle(this.winter ? 0xf4f9ff : 0x7ccf6a).fillRect(x, y + h - 4, w, 4);
    } else {
      s.fillStyle(0x24205a).fillRect(x, y, w, h);
      s.fillStyle(0xfff6c2).fillRect(x + w - 10, y + 3, 6, 6);
      s.fillStyle(0x24205a).fillRect(x + w - 8, y + 2, 5, 5);
      s.fillStyle(0xffffff);
      [[3, 4], [9, 12], [13, 3], [5, 17], [20, 19], [24, 14], [11, 20]].forEach(([dx, dy]) => s.fillRect(x + dx, y + dy, 1, 1));
      s.fillStyle(this.winter ? 0x9aa8c8 : 0x2f5a4a).fillRect(x, y + h - 4, w, 4);
    }
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
      slots: beh.pet ? { pethat: null } : undefined,
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
    makeCharTextures(this, key, look);
    const o = this.add.image(x, y, key).setOrigin(0.5, 1).setInteractive();
    Object.assign(o, {
      kind: 'char', uid, key, look, mul: extra.mul || 1, slots: { head: null, face: null, hand: null }, cast: extra.cast || null,
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
    if (this.objs.some((o) => o.x >= L.W && o.x < 2 * L.W)) return;
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

  /** Сад: появляется и в старых сохранениях (если третья комната пуста). */
  ensureGarden() {
    if (this.objs.some((o) => o.x >= 2 * L.W && o.x < 3 * L.W)) return;
    const { W, FLOOR_TOP, ROOM_H } = L;
    const x0 = 2 * W;
    const big = (key, fx, y) => this.spawnItem(this.big[key], Math.round(x0 + W * fx), Math.round(y));
    const put = (subj, fx, y) => { const r = this.findRec(subj); return r ? this.spawnItem(r, Math.round(x0 + W * fx), Math.round(y)) : null; };
    big('tree', 0.14, FLOOR_TOP + 10);
    const bed1 = big('gardenbed', 0.45, FLOOR_TOP + 14);
    big('gardenbed', 0.72, FLOOR_TOP + 26);
    // подсолнух уже пророс и ждёт полива — механика понятна сразу
    const sun = this.findRec('sunflower');
    if (sun) bed1.plots[1] = { id: sun.id, stage: 1, watered: false };
    put('watering can', 0.3, ROOM_H - 6);
    put('seed packet', 0.58, ROOM_H - 3);
    put('strawberry', 0.88, ROOM_H - 8);
    put('rabbit', 0.6, FLOOR_TOP + 36);
    this.save();
  }

  growRec(rec) {
    if (SEEDS.test(rec.subject)) return true;
    return GROW.includes(rec.subject);
  }

  plotAt(bed, x) {
    let best = 0;
    PLOT_DX.forEach((dx, i) => { if (Math.abs(bed.x + dx - x) < Math.abs(bed.x + PLOT_DX[best] - x)) best = i; });
    return best;
  }

  /** Посадить: в лунку под пальцем (или любую свободную). Из клубники вырастет клубника, из семян — сюрприз. */
  plant(bed, o, x) {
    let i = this.plotAt(bed, x);
    if (bed.plots[i]) i = bed.plots.findIndex((p) => !p);
    if (i < 0) return false;
    let rec = o.rec;
    if (SEEDS.test(rec.subject)) rec = this.findRec(pick(GROW.filter((g) => this.findRec(g)))) || rec;
    bed.plots[i] = { id: rec.id, stage: 0, watered: false };
    this.stat('plant');
    this.objs = this.objs.filter((x2) => x2 !== o);
    const px = bed.x + PLOT_DX[i];
    this.tweens.add({
      targets: o, x: px, y: bed.y - bed.displayHeight + 4, alpha: 0, duration: 260,
      onComplete: () => { o.destroy(); this.renderPlots(bed); },
    });
    sfx.drop();
    this.fxCrumbs.setParticleTint(0x6b4a32);
    this.fxCrumbs.explode(5, px, bed.y - bed.displayHeight + 4);
    return true;
  }

  waterPlot(bed, i) {
    const p = bed.plots[i];
    if (!p || p.stage >= 3 || p.watered) return;
    p.watered = true;
    sfx.splash();
    this.renderPlots(bed);
    this.growLater(bed, i);
    this.save();
  }

  /** Политое растение подрастает через пару секунд: семечко → росток → кустик → урожай. */
  growLater(bed, i) {
    const p = bed.plots[i];
    this.time.delayedCall(2500, () => {
      if (!bed.active || bed.plots[i] !== p || !p.watered) return;
      p.stage += 1;
      p.watered = false;
      const px = bed.x + PLOT_DX[i];
      this.fxSparks.explode(p.stage === 3 ? 16 : 6, px, bed.y - bed.displayHeight - 4);
      if (p.stage === 3) sfx.sparkle(); else sfx.squeak();
      this.renderPlots(bed);
      const img = bed.plantImgs[i];
      if (img) this.tweens.add({ targets: img, y: img.y - 3, duration: 120, yoyo: true });
      this.save();
    });
  }

  /** Тап по грядке: созрело — собрать урожай (вдвойне); нужно полить — капля подпрыгивает. */
  plotTap(bed, x) {
    const i = this.plotAt(bed, x);
    const p = bed.plots[i];
    if (!p) { sfx.boing(); return; }
    if (p.stage < 3) {
      const drop = bed.dropImgs[i];
      if (drop) { sfx.blub(); this.tweens.add({ targets: drop, scale: 1.0, y: drop.y - 4, duration: 120, yoyo: true }); }
      return;
    }
    const rec = this.recOf(p.id);
    bed.plots[i] = null;
    this.renderPlots(bed);
    if (!rec) return;
    sfx.chestOut();
    this.stat('harvest');
    this.sticker('plant', rec, bed.x + PLOT_DX[i], bed.y - bed.displayHeight);
    const px = bed.x + PLOT_DX[i];
    for (let k = 0; k < 2; k++) {
      const o = this.spawnItem(rec, Math.round(px), Math.round(bed.y - bed.displayHeight));
      const tx = Math.round(Phaser.Math.Clamp(px + (k ? 1 : -1) * rnd(10, 22), 2 * L.W + 8, L.WORLD - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 2));
      this.tweens.add({ targets: o, x: tx, duration: 500, delay: k * 120 });
      this.tweens.add({
        targets: o, y: o.y - 18, duration: 220, delay: k * 120, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 360, ease: 'Bounce.easeOut' }),
      });
    }
    this.fxHearts.explode(3, px, bed.y - 14);
    this.time.delayedCall(900, () => this.save());
  }

  /** Картинки растений и капель на грядке по её состоянию. */
  renderPlots(bed) {
    bed.plantImgs ||= [null, null, null];
    bed.dropImgs ||= [null, null, null];
    bed.plots.forEach((p, i) => {
      bed.plantImgs[i]?.destroy();
      bed.dropImgs[i]?.destroy();
      bed.plantImgs[i] = null;
      bed.dropImgs[i] = null;
      if (!p) return;
      const rec = this.recOf(p.id);
      let img;
      if (p.stage === 0) img = this.add.image(0, 0, 'plant_seed');
      else if (p.stage === 1) img = this.add.image(0, 0, 'plant_sprout');
      else if (p.stage === 2) img = this.add.image(0, 0, 'plant_bush');
      else img = rec ? this.recImage(rec, 0, 0) : this.add.image(0, 0, 'plant_bush');
      bed.plantImgs[i] = img.setOrigin(0.5, 1);
      if (p.stage < 3 && !p.watered) bed.dropImgs[i] = this.add.image(0, 0, 'water_drop').setOrigin(0.5, 1);
    });
  }

  /** Тап по яблоне: дерево качается, падает яблоко. */
  shakeTree(tree) {
    const x0 = tree.x;
    this.tweens.add({ targets: tree, x: x0 + 1, duration: 60, yoyo: true, repeat: 3, onComplete: () => { tree.x = x0; } });
    this.itemDream('tree', tree, 'forest');
    this.leafFall(tree);
    const rec = this.findRec('apple');
    if (!rec) return;
    const o = this.spawnItem(rec, Math.round(tree.x + rnd(-10, 10)), Math.round(tree.y - tree.displayHeight * 0.55));
    const ty = Math.round(Phaser.Math.Clamp(tree.y + rnd(2, 14), L.FLOOR_TOP + 4, L.ROOM_H - 2));
    sfx.pick();
    this.tweens.add({ targets: o, y: ty, duration: 520, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } });
  }

  // ---------------------------------------------------------------- день рождения
  /** Праздничный набор один раз появляется в спальне (и в старых сохранениях). */
  ensureParty() {
    if (this.flags.party) return;
    this.flags.party = true;
    const { W, ROOM_H } = L;
    this.spawnItem(this.byId.get('party-cake'), Math.round(W * 0.53), ROOM_H - 9, { deco: { frost: 0xff9ac8, sprinkles: true, candles: true, lit: true } });
    this.spawnItem(this.byId.get('gift-0'), Math.round(W * 0.73), ROOM_H - 3);
    this.spawnItem(this.byId.get('garland'), Math.round(W * 0.18), 14);
    this.save();
  }

  renderCake(o) {
    if (!o.active) return;
    if (!o.cakeLayers) {
      o.cakeLayers = {
        fr: this.add.image(o.x, o.y, 'cake_frost').setOrigin(0.5, 1),
        sp: this.add.image(o.x, o.y, 'cake_sprinkles').setOrigin(0.5, 1),
        ca: this.add.image(o.x, o.y, 'cake_candles').setOrigin(0.5, 1),
        fl: this.add.image(o.x, o.y, 'cake_flames').setOrigin(0.5, 1),
      };
    }
    const d = o.deco;
    const L2 = o.cakeLayers;
    L2.fr.setVisible(!!d.frost).setTint(d.frost || 0xffffff);
    L2.sp.setVisible(!!d.sprinkles);
    L2.ca.setVisible(!!d.candles);
    L2.fl.setVisible(!!(d.candles && d.lit));
  }

  /** Украсить торт: глазурь (цвет), посыпка, свечи (сразу горят). Инструмент остаётся рядом. */
  decorate(cake, o) {
    const d = cake.deco;
    if (o.beh.icing) d.frost = o.beh.icing;
    if (o.beh.sprinkles) d.sprinkles = true;
    if (o.beh.candles) { d.candles = true; d.lit = true; }
    this.renderCake(cake);
    sfx.wear(); sfx.sparkle();
    this.fxSparks.explode(10, cake.x, cake.y - 10);
    this.tweens.add({ targets: cake, y: cake.y - 2, duration: 90, yoyo: true });
    o.x = Math.round(cake.x + (o.x < cake.x ? -14 : 14));
    this.settle(o);
  }

  /** Задуть свечи: дымок, конфетти, мелодия, все в комнате танцуют. */
  blowCandles(cake) {
    cake.deco.lit = false;
    this.renderCake(cake);
    sfx.poof();
    this.fxPoof.explode(10, cake.x, cake.y - 18);
    this.time.delayedCall(300, () => {
      this.fxSparks.explode(40, cake.x, cake.y - 20);
      this.fxHearts.explode(8, cake.x, cake.y - 24);
      sfx.tune(BIRTHDAY_TUNE);
      const room = Math.floor(cake.x / L.W);
      for (const c of this.objs) {
        if (c.kind !== 'char' || Math.floor(c.x / L.W) !== room) continue;
        this.checkWish(c, 'party');
        if (!c.sleeping) this.celebrate(c, 6);
      }
    });
    this.save();
  }

  lightCandles(cake) {
    cake.deco.lit = true;
    this.renderCake(cake);
    sfx.click();
    this.fxSparks.explode(4, cake.x, cake.y - 18);
    this.save();
  }

  /** Подарок персонажу: коробка открывается, внутри — игрушка прямо в руки. */
  openGift(ch, gift) {
    this.stat('gift');
    const x = gift.x;
    const y = gift.y;
    this.removeObj(gift);
    const toys = (FAVORITES.toy || []).map((sub) => this.findRec(sub)).filter(Boolean);
    const rec = pick(toys);
    this.fxSparks.explode(20, ch.x, ch.y - ch.displayHeight / 2);
    sfx.fanfare();
    if (!rec) return;
    const toy = this.spawnItem(rec, Math.round(x), Math.round(y));
    this.wear(ch, 'hand', toy);
    this.celebrate(ch, 3);
  }

  // ---------------------------------------------------------------- уход за питомцами
  favToy(p) { return PET_TOYS[(p.uid * 5) % PET_TOYS.length]; }

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
  }

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
    }
  }

  /** Поиграть с игрушкой: игрушка подпрыгивает, питомец скачет вокруг. */
  playWith(p, t) {
    if (!t.active || t.owner || t.dragging) return;
    const fav = t.rec.subject === this.favToy(p);
    this.tweens.add({ targets: t, y: t.y - 8, duration: 160, yoyo: true, repeat: fav ? 2 : 0, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: p, y: p.y - 5, duration: 130, yoyo: true, repeat: 2, onRepeat: () => p.setFlipX(!p.flipX) });
    this.fxHearts.explode(fav ? 5 : 1, p.x, p.y - p.displayHeight);
    sfx.squeak();
    if (fav) this.time.delayedCall(300, () => sfx.squeak());
  }

  // ---------------------------------------------------------------- сцена и джем
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
  }

  jamEnded() {
    const room = Math.round(this.cameras.main.scrollX / L.W);
    if (this.jam?.size && this.time.now - (this.jamStartedAt || 0) > 3000) this.applause(room);
    stopJam();
    this.jam?.clear();
    if (this.lullabyWas) { setMusic(true); this.drawMusicIcon(); this.lullabyWas = false; }
    if (this.spots) { this.spots.forEach((sp) => sp.destroy()); this.spots = null; }
  }

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
  }

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
  }

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
  }

  /** Концертный зал (5-я комната): сцена с инструментами и зрительские стулья.
   *  В старых сохранениях сцена стояла в саду — переносим её сюда вместе с инструментами на ней. */
  ensureHall() {
    if (this.flags.hall) return;
    this.flags.hall = true;
    const { W, FLOOR_TOP, ROOM_H } = L;
    const x0 = 4 * W;
    const cx = Math.round(x0 + W * 0.5);
    const sy = FLOOR_TOP + 6;
    let stage = this.flags.stage && this.objs.find((o) => o.rec?.id === 'big_stage' && o.x >= 2 * W && o.x < 3 * W);
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
  }

  /** Лежанка для питомцев один раз появляется в спальне (если её ещё нигде нет). */
  ensurePetBed() {
    if (this.flags.petbed) return;
    this.flags.petbed = true;
    if (!this.objs.some((o) => o.rec?.id === 'big_petbed')) this.spawnItem(this.big.petbed, Math.round(L.W * 0.14), L.ROOM_H - 2);
    this.save();
  }

  // ---------------------------------------------------------------- ванная
  /** Ванная (4-я комната) и лужа грязи в саду — появляются и в старых сохранениях. */
  ensureBath() {
    const { W, FLOOR_TOP, ROOM_H } = L;
    if (!this.objs.some((o) => o.beh?.puddle)) this.spawnItem(this.big.puddle, Math.round(2 * W + W * 0.22), FLOOR_TOP + 32);
    if (this.objs.some((o) => o.x >= 3 * W && o.x < 4 * W)) return;
    const x0 = 3 * W;
    const big = (key, fx, y) => this.spawnItem(this.big[key], Math.round(x0 + W * fx), Math.round(y));
    const tub = big('tub', 0.52, FLOOR_TOP + 20);
    const sink = big('sink', 0.17, FLOOR_TOP + 12);
    const mirror = this.findRec('oval mirror');
    if (mirror) this.spawnItem(mirror, Math.round(x0 + W * 0.17), FLOOR_TOP - 24);
    this.spawnItem(this.byId.get('hair-dryer'), Math.round(sink.x + 18), FLOOR_TOP + 14); // фен — на полу у раковины
    const shelf = big('shelf', 0.82, FLOOR_TOP - 28);
    ['pink', 'blue', 'green'].forEach((c, i) => {
      const b = this.spawnItem(this.byId.get(`foam-${c}`), Math.round(shelf.x - 12 + i * 12), shelf.y - 4);
      b.restOn = shelf;
    });
    const duck = this.findRec('rubber duck');
    if (duck) { const d = this.spawnItem(duck, tub.x, tub.y); d.inTub = tub; d.tubDx = 10; }
    const towelRec = this.findRec('laundry basket');
    if (towelRec) this.spawnItem(towelRec, Math.round(x0 + W * 0.85), ROOM_H - 4);
    this.save();
  }

  /** Пятна грязи/краски поверх персонажа или питомца (тонированная накладка, смывается в ванне). */
  stain(o, color, quiet = false) {
    o.stain = color;
    if (!o.stainImg) o.stainImg = this.add.image(o.x, o.y, o.kind === 'char' ? 'stain_char' : 'stain_pet').setOrigin(0.5, 1);
    o.stainImg.setTint(color);
    if (quiet) return;
    this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
    // персонаж просит искупаться
    if (o.kind === 'char') this.time.delayedCall(1500, () => { if (o.stain && !this.wish && !o.inTub) this.showWish(o, 'bath'); });
  }

  clean(o) {
    this.clearMark?.(o, true);
    o.stain = null;
    o.stainImg?.destroy();
    o.stainImg = null;
    if (o.kind === 'char') {
      // вода смывает и волшебство: радугу, заморозку, розовые волосы
      o.rainbow = 0; o.ice = 0; o.clearTint();
      const lk = o.look;
      const pinkHair = lk.prevHair && lk.hair === HAIR[6];
      if (pinkHair || lk.makeup?.length || lk.mustache || lk.frazzled) {
        o.look = { ...lk, makeup: [], mustache: undefined, frazzled: undefined };
        if (pinkHair) o.look = { ...o.look, hair: lk.prevHair, prevHair: undefined };
        makeCharTextures(this, o.key, o.look);
        o.setTexture(o.key);
      }
    }
  }

  /** Опустить в ванну: персонаж/питомец по пояс в воде, игрушки плавают. Через секунду — чистые. */
  bathe(o, tub, x) {
    if (o.kind === 'char') this.stat('bathe');
    o.inTub = tub;
    o.tubDx = Math.round(Phaser.Math.Clamp(x - tub.x, -tub.displayWidth / 2 + 9, tub.displayWidth / 2 - 9));
    o.restOn = null;
    o.sleeping = false;
    sfx.splash();
    this.fxCrumbs.setParticleTint(0x9fdcff);
    this.fxCrumbs.explode(12, tub.x + o.tubDx, tub.y - tub.displayHeight + 2);
    if (o.kind !== 'char' && !o.beh.pet) { if (/duck/.test(o.rec.subject)) sfx.squeak(); return; }
    this.bubbles(tub, 10);
    if (o.kind === 'char') this.checkWish(o, 'bath');
    this.time.delayedCall(1200, () => {
      if (o.inTub !== tub) return;
      const was = o.stain || o.rainbow || o.ice || o.look?.prevHair || o.look?.makeup?.length || o.look?.mustache;
      this.clean(o);
      this.bubbles(tub, 14);
      sfx.sparkle();
      this.fxHearts.explode(was ? 4 : 2, o.x, o.y - o.displayHeight);
      if (o.kind === 'char') sfx.giggle(); else sfx.squeak();
      this.save();
    });
  }

  renderFoam(tub) {
    if (!tub.foamImg) tub.foamImg = this.add.image(tub.x, tub.y, 'foam').setOrigin(0.5, 1);
    tub.foamImg.setTint(tub.foam);
  }

  bubbles(tub, n) {
    const top = tub.y - tub.displayHeight + 2;
    for (let i = 0; i < n; i++) {
      const b = this.add.image(tub.x + rnd(-18, 18), top, 'bubble_p').setDepth(16000).setTint(tub.foam || 0xffffff);
      this.tweens.add({ targets: b, y: top - rnd(10, 30), x: b.x + rnd(-6, 6), alpha: 0, duration: rnd(700, 1400), delay: i * 40, onComplete: () => b.destroy() });
    }
  }

  bathTick() {
    this.nightLight();
    const now = this.time.now;
    for (const o of this.objs) {
      if (o.beh?.tub && this.visible(o) && (o.foam || this.objs.some((x) => x.inTub === o && (x.kind === 'char' || x.beh?.pet)))) {
        this.bubbles(o, 2);
        if (Math.random() < 0.25 && (this.popBubbles?.length || 0) < 10) this.spawnBubble(o.x + rnd(-16, 16), o.y - o.displayHeight + 2, o.foam || 0xffffff);
      }
      if (o.shinyUntil > now && Math.random() < 0.6) this.fxSparks.explode(1, o.x + rnd(-6, 6), o.y - rnd(2, o.displayHeight));
      if (o.wetUntil > now && !o.inTub) {
        this.fxCrumbs.setParticleTint(0x9fdcff);
        this.fxCrumbs.explode(1, o.x + rnd(-4, 4), o.y - o.displayHeight * 0.6);
      }
    }
  }

  /** Фен: сушит и делает новую причёску. */
  blowDry(ch) {
    ch.wetUntil = 0;
    this.hintDone('dryer', ch);
    const i = HAIR_STYLE_KEYS.indexOf(ch.look.hairStyle || 'bob');
    ch.look = { ...ch.look, hairStyle: HAIR_STYLE_KEYS[(i + 1) % HAIR_STYLE_KEYS.length] };
    makeCharTextures(this, ch.key, ch.look);
    ch.setTexture(ch.key);
    sfx.poof(); sfx.sparkle();
    this.fxPoof.explode(12, ch.x - 8, ch.y - ch.displayHeight + 6);
    this.fxSparks.explode(8, ch.x, ch.y - ch.displayHeight);
    this.celebrate(ch, 2);
  }

  // ---------------------------------------------------------------- кухня: холодильник, блендер, вкусы
  /** Блендер на тумбе (кухня) — появляется и в старых сохранениях. */
  ensureKitchen2() {
    if (this.flags.kitchen2) return;
    this.flags.kitchen2 = true;
    if (!this.objs.some((o) => o.beh?.blender)) {
      const { W, FLOOR_TOP } = L;
      const counter = this.objs.find((o) => o.rec?.id === 'big_counter' && o.x >= W && o.x < 2 * W) || this.objs.find((o) => o.rec?.id === 'big_counter');
      if (counter) {
        // то, что стояло посередине тумбы, переезжает на пол перед ней
        for (const x of this.objs) {
          if (x.restOn === counter && Math.abs(x.x - counter.x) < 7) { x.restOn = null; x.x = counter.x + 6; x.y = Math.min(L.ROOM_H - 2, counter.y + 8); }
        }
        const bl = this.spawnItem(this.byId.get('blender'), counter.x, counter.y - 20);
        bl.restOn = counter;
      } else this.spawnItem(this.byId.get('blender'), Math.round(1.25 * W), FLOOR_TOP + 20);
    }
    this.save();
  }

  /** Тап по холодильнику: дверца открывается, выпадает продукт (или то, что туда положили). */
  openFridge(fr) {
    sfx.chestOut();
    fr.setTexture('big_fridgeOpen');
    this.hintDone('fridge');
    this.fridgeDream(fr);
    this.time.delayedCall(650, () => { if (fr.active) fr.setTexture('big_fridge'); });
    if (fr.contents.length) { this.spill(fr); return; }
    const room = Math.floor(fr.x / L.W);
    const loose = this.objs.filter((x) => x.kind === 'item' && !x.beh.furniture && Math.floor(x.x / L.W) === room).length;
    if (loose > 40) { sfx.boing(); return; } // и так всё завалено
    this.fridgeList ||= FRIDGE.map((sub) => this.findRec(sub)).filter(Boolean);
    // если кто-то хочет есть — холодильник иногда «угадывает» желание
    const rec = this.wish?.type === 'food' && this.wish.rec && Math.random() < 0.4 ? this.wish.rec : pick(this.fridgeList);
    const o = this.spawnItem(rec, fr.x, Math.round(fr.y - 20));
    const dir = fr.x - room * L.W > L.W / 2 ? -1 : 1;
    const tx = Math.round(Phaser.Math.Clamp(fr.x + dir * rnd(16, 60), room * L.W + 8, (room + 1) * L.W - 8));
    const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
    this.tweens.add({ targets: o, x: tx, duration: 550 });
    this.tweens.add({
      targets: o, y: o.y - 14, duration: 220, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
    });
  }

  /** Средний «яркий» цвет спрайта (без контура и тёмных пикселей) — для коктейля. */
  avgColor(rec) {
    this.colorCache ||= new Map();
    if (this.colorCache.has(rec.id)) return this.colorCache.get(rec.id);
    const key = rec.tex ? `${rec.tex}_icon` : rec.cat;
    const frame = rec.tex ? undefined : rec.frame;
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = this.textures.getPixel(x, y, key, frame);
        if (!c || c.alpha < 128 || c.red + c.green + c.blue < 200) continue;
        r += c.red; g += c.green; b += c.blue; n++;
      }
    }
    const col = n ? ((Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)) : 0xff9ac8;
    this.colorCache.set(rec.id, col);
    return col;
  }

  renderBlender(bl, mixed = null) {
    const cols = bl.contents.map((id) => this.recOf(id)).filter(Boolean).map((r) => this.avgColor(r));
    bl.setTexture(blenderTex(this, cols, mixed));
  }

  addToBlender(bl, o) {
    if (bl.blending || bl.contents.length >= 3) {
      sfx.boing();
      o.x = Math.round(Phaser.Math.Clamp(bl.x + (o.x < bl.x ? -14 : 14), 8, L.WORLD - 8));
      this.settle(o);
      return;
    }
    this.objs = this.objs.filter((x) => x !== o);
    bl.contents.push(o.rec.id);
    o.glow?.destroy();
    o.setDepth(bl.depth + 1);
    this.tweens.add({
      targets: o, x: bl.x, y: bl.y - bl.displayHeight + 4, alpha: 0, duration: 220,
      onComplete: () => {
        o.destroy();
        sfx.blub();
        this.renderBlender(bl);
        this.tweens.add({ targets: bl, y: bl.y - 2, duration: 80, yoyo: true });
      },
    });
  }

  /** Тап по блендеру: жужжит, трясётся, слои смешиваются — выскакивает коктейль цвета смеси. */
  blend(bl) {
    if (bl.blending) return;
    if (!bl.contents.length) { sfx.click(); this.tweens.add({ targets: bl, y: bl.y - 1, duration: 60, yoyo: true }); return; }
    bl.blending = true;
    const cols = bl.contents.map((id) => this.recOf(id)).filter(Boolean).map((r) => this.avgColor(r));
    const mixed = cols.length ? [16, 8, 0].reduce((acc, sh) => acc | (Math.round(cols.reduce((t, c) => t + ((c >> sh) & 255), 0) / cols.length) << sh), 0) : 0xff9ac8;
    sfx.blend();
    const x0 = bl.x;
    this.tweens.add({ targets: bl, x: x0 + 1, duration: 50, yoyo: true, repeat: 13, onComplete: () => { bl.x = x0; } });
    let k = 0;
    this.time.addEvent({ delay: 130, repeat: 8, callback: () => { if (bl.active) bl.setTexture(blenderTex(this, ++k % 2 ? cols.slice().reverse() : cols)); } });
    this.time.delayedCall(1300, () => { if (bl.active) this.renderBlender(bl, mixed); });
    this.time.delayedCall(1800, () => {
      bl.blending = false;
      if (!bl.active) return;
      bl.contents = [];
      this.renderBlender(bl);
      const top = bl.y - bl.displayHeight;
      const g = this.spawnItem(this.byId.get('smoothie'), bl.x, top + 4, { color: mixed });
      sfx.ding();
      this.fxSparks.explode(10, bl.x, top);
      const room = Math.floor(bl.x / L.W);
      const tx = Math.round(Phaser.Math.Clamp(bl.x + (Math.random() < 0.5 ? -1 : 1) * rnd(14, 28), room * L.W + 8, (room + 1) * L.W - 8));
      const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
      this.tweens.add({ targets: g, x: tx, duration: 600 });
      this.tweens.add({
        targets: g, y: top - 12, duration: 250, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: g, y: ty, duration: 400, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
      });
      this.save();
    });
  }

  /** Два нелюбимых овоща у каждого персонажа (свои у каждого — по номеру). */
  dislikes(ch, subj) {
    const i = (ch.uid * 5) % DISLIKE.length;
    return subj === DISLIKE[i] || subj === DISLIKE[(i + 3) % DISLIKE.length];
  }

  /** «Фу!» — язык наружу, мотает головой и отбрасывает еду. */
  refuse(ch, o) {
    ch.busy = true;
    ch.sleeping = false;
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; o.slot = null; }
    ch.setTexture(ch.key + '_yuck');
    sfx.yuck();
    let n = 0;
    this.time.addEvent({ delay: 120, repeat: 5, callback: () => { ch.setFlipX(!ch.flipX); if (++n === 6) ch.setFlipX(false); } });
    const room = Math.floor(ch.x / L.W);
    const tx = Math.round(Phaser.Math.Clamp(ch.x + (o.x < ch.x ? -1 : 1) * rnd(22, 34), room * L.W + 8, (room + 1) * L.W - 8));
    const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
    o.restOn = null;
    this.tweens.add({ targets: o, x: tx, duration: 500 });
    this.tweens.add({
      targets: o, y: o.y - 14, duration: 200, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 350, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() }),
    });
    this.time.delayedCall(1100, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
  }

  /** Кислое: морщится и дрожит. Острое: краснеет, пышет огнём, прыгает — и просит молока. */
  tasteReact(ch, taste) {
    const m = this.mouth(ch);
    if (taste === 'sour') {
      sfx.sour();
      const x0 = ch.x;
      this.tweens.add({ targets: ch, x: x0 + 1, duration: 60, yoyo: true, repeat: 7, onComplete: () => { ch.x = x0; } });
      return;
    }
    sfx.spicy();
    if (!ch.rainbow && !ch.ice) ch.setTint(0xff9a8a);
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 260, () => {
        this.fxPoof.setParticleTint(i % 2 ? 0xffd84a : 0xff6a2a);
        this.fxPoof.explode(8, m.x + (ch.flipX ? -3 : 3), m.y - 1);
        this.fxPoof.setParticleTint(0xffffff);
      });
    }
    this.tweens.add({ targets: ch, y: ch.y - 7, duration: 150, yoyo: true, repeat: 2 });
    this.time.delayedCall(1500, () => {
      if (!ch.rainbow && !ch.ice) ch.clearTint();
      const milk = this.findRec('glass of milk');
      // «дайте молока!» важнее чужого случайного желания (как и остальные потребности)
      if (milk && !this.wish?.need) { this.showWish(ch, 'food', milk); this.wish.need = true; }
    });
  }

  /** Котёл бахает цветным дымом; кто стоит рядом — в саже и с волосами дыбом (до купания). */
  potBlast(pot, cols) {
    const top = { x: pot.x, y: pot.y - pot.displayHeight + 4 };
    sfx.boom();
    cols.forEach((c, i) => {
      this.fxPoof.setParticleTint(c);
      this.fxPoof.explode(16, top.x, top.y - 4 - i * 4);
    });
    this.fxPoof.setParticleTint(0xffffff);
    for (const ch of this.objs) {
      if (ch.kind !== 'char' || ch.inTub || ch.dragging || Math.abs(ch.x - pot.x) > 40 || Math.abs(ch.y - pot.y) > 30) continue;
      ch.look = { ...ch.look, frazzled: true };
      makeCharTextures(this, ch.key, ch.look);
      ch.setTexture(ch.key + '_open');
      this.stain(ch, 0x3a3340);
      this.time.delayedCall(700, () => { if (!ch.busy && ch.active) ch.setTexture(ch.key); sfx.giggle(); });
    }
  }

  // ---------------------------------------------------------------- ванная: косметика, щётка, пузыри, унитаз
  /** Унитаз, полка с аквагримом, помада и румяна на раковине, зубная щётка — и в старых сохранениях. */
  ensureBath2() {
    if (this.flags.bath2) return;
    this.flags.bath2 = true;
    const { W, FLOOR_TOP } = L;
    const x0 = 3 * W;
    if (!this.objs.some((o) => o.beh?.toilet)) this.spawnItem(this.big.toilet, Math.round(x0 + W * 0.9), FLOOR_TOP + 12);
    const shelf = this.spawnItem(this.big.shelf, Math.round(x0 + W * 0.36), FLOOR_TOP - 28);
    ['paint-whiskers', 'paint-hearts', 'paint-freckles'].forEach((id, i) => {
      const b = this.spawnItem(this.byId.get(id), Math.round(shelf.x - 12 + i * 12), shelf.y - 4);
      b.restOn = shelf;
    });
    const sink = this.objs.find((o) => o.rec?.id === 'big_sink' && o.x >= x0 && o.x < x0 + W);
    if (sink) {
      for (const [id, dx] of [['lipstick', -5], ['blush', 5]]) {
        const it = this.spawnItem(this.byId.get(id), sink.x + dx, sink.y - sink.displayHeight + 7);
        it.restOn = sink;
      }
      this.spawnItem(this.byId.get('toothbrush'), Math.max(x0 + 10, sink.x - 16), FLOOR_TOP + 18);
    } else {
      ['lipstick', 'blush', 'toothbrush'].forEach((id, i) => this.spawnItem(this.byId.get(id), Math.round(x0 + W * (0.1 + i * 0.07)), FLOOR_TOP + 18));
    }
    this.save();
  }

  applyMakeup(ch, o) {
    const mk = new Set(ch.look.makeup || []);
    mk.delete(o.beh.makeup);
    mk.add(o.beh.makeup); // последняя — поверх остальных
    ch.look = { ...ch.look, makeup: [...mk] };
    makeCharTextures(this, ch.key, ch.look);
    this.hintDone('makeup', ch);
    ch.busy = true;
    ch.setTexture(ch.key + '_blink');
    sfx.wear(); sfx.sparkle();
    const m = this.mouth(ch);
    this.fxSparks.explode(8, m.x, m.y - 3);
    this.time.delayedCall(450, () => {
      ch.busy = false;
      ch.setTexture(ch.key + '_smile');
      this.fxHearts.explode(2, ch.x, ch.y - ch.displayHeight);
      sfx.giggle();
      this.time.delayedCall(700, () => { if (!ch.busy) ch.setTexture(ch.key); });
    });
  }

  /** Чистим зубы: пена у рта, шорох щётки — и сияющая улыбка (заодно смываются «усы»). */
  brushTeeth(ch) {
    ch.busy = true;
    ch.sleeping = false;
    const m = this.mouth(ch);
    let i = 0;
    this.time.addEvent({
      delay: 140, repeat: 9, callback: () => {
        ch.setTexture(ch.key + (i % 2 ? '_open' : '_blink'));
        sfx.scrub();
        this.fxCrumbs.setParticleTint(0xffffff);
        this.fxCrumbs.explode(2, m.x + rnd(-2, 2), m.y);
        if (++i < 10) return;
        if (ch.look.mustache) { ch.look = { ...ch.look, mustache: undefined }; makeCharTextures(this, ch.key, ch.look); }
        ch.sweets = 0;
        this.hintDone('teeth', ch);
        ch.setTexture(ch.key + '_smile');
        sfx.ding();
        this.fxSparks.explode(8, m.x, m.y);
        this.time.delayedCall(1200, () => { ch.busy = false; ch.setTexture(ch.key); this.save(); });
      },
    });
  }

  /** Тап по ванне — вверх летят большие пузыри (их можно лопать пальцем). */
  blowBubbles(tub, n = 6) {
    if ((this.popBubbles?.length || 0) > 24) return;
    sfx.splash();
    const top = tub.y - tub.displayHeight + 2;
    for (let i = 0; i < n; i++) this.time.delayedCall(i * 110, () => this.spawnBubble(tub.x + rnd(-16, 16), top, tub.foam || 0xffffff));
  }

  spawnBubble(x, y, tint) {
    this.popBubbles ||= [];
    const b = this.add.image(Math.round(x), Math.round(y), 'bubble_big').setDepth(16001).setTint(tint).setInteractive();
    b.bubble = true;
    this.popBubbles.push(b);
    this.tweens.add({ targets: b, x: b.x + rnd(-5, 5), duration: rnd(500, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: b, y: Math.max(8, y - rnd(22, 45)), duration: rnd(2500, 4000), ease: 'Sine.easeOut',
      onComplete: () => this.time.delayedCall(rnd(1200, 2600), () => this.popBubble(b, true)),
    });
  }

  popBubble(b, auto = false) {
    if (!b.active) return;
    this.popBubbles = (this.popBubbles || []).filter((x) => x !== b);
    this.tweens.killTweensOf(b);
    sfx.pop();
    if (!auto) { this.fxSparks.explode(5, b.x, b.y); this.hintDone('bubbles'); }
    b.destroy();
  }

  /** Смыв: журчание, вода закручивается, унитаз чуть подпрыгивает. */
  flushFx(wc) {
    sfx.flush();
    this.hintDone('toilet');
    this.fxCrumbs.setParticleTint(0x9fdcff);
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 180, () => this.fxCrumbs.explode(4, wc.x + rnd(-5, 5), wc.y - wc.displayHeight + 11));
    this.tweens.add({ targets: wc, y: wc.y - 1, duration: 70, yoyo: true, repeat: 2 });
  }

  /** Предмет в унитаз: закручивается и уплывает. Питомцев и мебель не смываем. */
  flushItem(wc, o) {
    this.objs = this.objs.filter((x) => x !== o);
    for (const x of this.objs) if (x.restOn === o) x.restOn = null;
    if (o.owner) { o.owner.slots[o.slot] = null; o.owner = null; }
    o.glow?.destroy();
    o.setDepth(wc.depth + 1);
    this.flushFx(wc);
    this.tweens.add({ targets: o, x: wc.x, y: wc.y - wc.displayHeight + 13, angle: 720, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
  }

  sitOnToilet(ch, wc) {
    ch.eaten = 0;
    this.hintDone('potty', ch);
    ch.x = Math.round(wc.x);
    ch.y = Math.round(wc.y - 7);
    ch.restOn = wc;
    sfx.drop();
    this.time.delayedCall(900, () => {
      if (ch.restOn !== wc) return;
      this.flushFx(wc);
      sfx.giggle();
      this.fxHearts.explode(2, ch.x, ch.y - ch.displayHeight);
    });
  }

  // ---------------------------------------------------------------- концертный зал: микрофон, зрители, занавес, диско
  /** Микрофон на сцене, диско-шар под потолком и мишка-зритель на стуле — и в старых сохранениях. */
  ensureHall2() {
    if (this.flags.hall2) return;
    this.flags.hall2 = true;
    const { W, FLOOR_TOP } = L;
    const x0 = 4 * W;
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
  }

  /** Сесть на стул: персонаж, питомец или игрушка — в зале они становятся зрителями. */
  sitOn(o, seat, quiet = false) {
    o.x = Math.round(seat.x);
    o.y = Math.round(seat.y - (o.kind === 'char' ? 4 : 6));
    o.restOn = seat;
    o.inTub = null;
    if (seat.beh.swing) seat.amp = Math.max(seat.amp || 0, 0.3);
    if (quiet) return;
    sfx.drop();
    if (seat.beh.swing) { sfx.whee(); this.hintDone('swing'); if (o.kind === 'char') this.time.delayedCall(300, () => sfx.giggle()); return; }
    this.tweens.add({ targets: o, y: o.y - 3, duration: 100, yoyo: true });
    if (Math.floor(seat.x / L.W) === 4) this.hintDone('audience');
  }

  audienceIn(room) {
    return this.objs.filter((o) => o.restOn?.beh?.seat && Math.floor(o.x / L.W) === room && !o.dragging);
  }

  /** Выйти на сцену: персонаж встаёт на помост; с микрофоном в руке — сразу поёт. */
  onStage(ch, stage, x) {
    ch.x = Math.round(Phaser.Math.Clamp(x, stage.x - stage.displayWidth / 2 + 8, stage.x + stage.displayWidth / 2 - 8));
    ch.y = Math.round(stage.y - 9);
    ch.restOn = stage;
    sfx.drop();
    if (ch.slots.hand?.beh.mic) this.time.delayedCall(300, () => this.sing(ch));
  }

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
  }

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
  }

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
    const x0 = 4 * W;
    this.curtainCw = Math.round(W * 0.16);
    this.curtain = [0, 1].map((i) => {
      const img = this.add.image(0, 10, key).setOrigin(0, 0).setDepth(FLOOR_TOP + 6.9).setInteractive();
      img.curtain = true;
      return img;
    });
    this.curtain[1].setFlipX(true);
    this.placeCurtain(!!this.flags.curtainClosed);
  }

  placeCurtain(closed, animate = false) {
    const { W } = L;
    const x0 = 4 * W;
    const hw = this.curtain[0].width;
    const pos = closed ? [x0 + W / 2 - hw, x0 + W / 2] : [x0 + this.curtainCw - hw, x0 + W - this.curtainCw];
    this.curtain.forEach((c, i) => {
      this.tweens.killTweensOf(c);
      if (animate) this.tweens.add({ targets: c, x: Math.round(pos[i]), duration: 750, ease: 'Sine.easeInOut', onUpdate: () => this.clipCurtain() });
      else c.x = Math.round(pos[i]);
    });
    this.clipCurtain();
  }

  /** Левая половина открытого занавеса шире кулисы: всё, что левее зала, не рисуется и не ловит касания. */
  clipCurtain() {
    const c = this.curtain?.[0];
    if (!c) return;
    const cut = Phaser.Math.Clamp(Math.ceil(4 * L.W - c.x), 0, c.width);
    c.setCrop(cut, 0, c.width - cut, c.height);
    c.input?.hitArea.setTo(cut, 0, c.width - cut, c.height);
  }

  toggleCurtain() {
    const closed = !this.flags.curtainClosed;
    this.flags.curtainClosed = closed;
    this.placeCurtain(closed, true);
    sfx.swish();
    this.hintDone('curtain');
    if (!closed) {
      // начало концерта: фанфары, конфетти, зрители хлопают
      const { W } = L;
      const cx = 4 * W + W / 2;
      this.time.delayedCall(450, () => {
        sfx.fanfare();
        for (let i = 0; i < 5; i++) this.time.delayedCall(i * 120, () => this.fxSparks.explode(10, cx + rnd(-W * 0.35, W * 0.35), rnd(14, 34)));
        this.applause(4);
      });
    }
    this.save();
  }

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
  }

  discoOff() {
    if (this.discoBall?.active) this.discoBall.setTexture('disco_ball');
    this.discoBall = null;
    this.discoSpots?.forEach((s) => s.destroy());
    this.discoSpots = null;
    const dim = this.discoDim;
    this.discoDim = null;
    if (dim) this.tweens.add({ targets: dim, fillAlpha: 0, duration: 300, onComplete: () => dim.destroy() });
  }

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
  }

  // ---------------------------------------------------------------- спальня: батут, сундук, ночник, фотоаппарат
  /** Фотоаппарат в спальне — и в старых сохранениях. */
  ensureBedroom2() {
    if (this.flags.bed2) return;
    this.flags.bed2 = true;
    if (!this.objs.some((o) => o.beh?.camera)) this.spawnItem(this.byId.get('camera'), Math.round(L.W * 0.76), L.FLOOR_TOP + 20);
    this.save();
  }

  /** Тап по кровати с персонажем: прыгает всё выше, летят пёрышки, на третьем прыжке — сальто. */
  bounce(bed) {
    const riders = this.objs.filter((o) => o.restOn === bed && (o.kind === 'char' || o.beh?.pet) && !o.dragging);
    if (!riders.length) return false;
    const now = this.time.now;
    this.bounceN = now - (this.lastBounce || 0) < 1600 ? (this.bounceN || 0) + 1 : 1;
    this.lastBounce = now;
    this.fxCrumbs.setParticleTint(0xffffff);
    this.fxCrumbs.explode(4, bed.x - bed.displayWidth / 2 + 9, bed.y - bed.displayHeight + 8);
    for (const r of riders) {
      if (r.sleeping) { // спит — только ворочается
        const x0 = r.x;
        this.tweens.add({ targets: r, x: x0 + 1, duration: 90, yoyo: true, repeat: 1, onComplete: () => { r.x = x0; } });
        continue;
      }
      r.awakeUntil = now + 6000;
      r.bounceY0 ??= r.y;
      this.tweens.killTweensOf(r);
      r.y = r.bounceY0;
      const h = 8 + 5 * Math.min(this.bounceN, 4);
      const flip = this.bounceN >= 3;
      if (r.kind === 'char') { r.busy = true; r.setTexture(r.key + '_open'); }
      sfx.boing();
      if (flip) {
        sfx.whee();
        this.time.addEvent({ delay: 70, repeat: 5, callback: () => r.setFlipX(!r.flipX) });
        this.fxSparks.explode(6, r.x, r.y - r.displayHeight - h);
      }
      this.tweens.add({
        targets: r, y: r.bounceY0 - h, duration: 180 + h * 4, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => {
          r.y = r.bounceY0; r.bounceY0 = undefined; r.setFlipX(false);
          if (r.kind === 'char') { r.busy = false; r.setTexture(r.key); if (flip) sfx.giggle(); }
        },
      });
    }
    this.hintDone('bounce');
    return true;
  }

  /** Тап по сундуку: крышка откидывается, выскакивает игрушка (или то, что туда положили). */
  openChest(box) {
    sfx.chestOut();
    box.setTexture('big_chestOpen');
    this.time.delayedCall(650, () => { if (box.active) box.setTexture('big_chest'); });
    this.hintDone('chest');
    this.itemDream('chest', box, 'toys');
    if (box.contents.length) { this.spill(box); return; }
    const room = Math.floor(box.x / L.W);
    const loose = this.objs.filter((x) => x.kind === 'item' && !x.beh.furniture && Math.floor(x.x / L.W) === room).length;
    if (loose > 40) { sfx.boing(); return; }
    this.toyList ||= TOYBOX.map((sub) => this.findRec(sub)).filter(Boolean);
    const rec = pick(this.toyList);
    const o = this.spawnItem(rec, box.x, Math.round(box.y - 14));
    const dir = box.x - room * L.W > L.W / 2 ? -1 : 1;
    const tx = Math.round(Phaser.Math.Clamp(box.x + dir * rnd(16, 55), room * L.W + 8, (room + 1) * L.W - 8));
    const ty = Math.round(rnd(L.FLOOR_TOP + 6, L.ROOM_H - 3));
    this.fxSparks.explode(8, box.x, box.y - 16);
    this.tweens.add({ targets: o, x: tx, duration: 550 });
    this.tweens.add({
      targets: o, y: o.y - 18, duration: 230, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
    });
  }

  /** Ночник: ночью выключенная лампа превращается в проектор — по стенам плывут звёзды и луна. */
  nightLight() {
    const lamp = this.objs?.find((o) => o.kind === 'item' && o.beh.lamp && !o.dragging && !o.owner);
    const on = !!(lamp && this.night && !lamp.lit);
    const room = lamp ? Math.floor(lamp.x / L.W) : -1;
    if (this.nightStars && (!on || this.nightStars.room !== room)) {
      const old = this.nightStars.imgs;
      this.nightStars = null;
      this.tweens.add({ targets: old, alpha: 0, duration: 500, onComplete: () => old.forEach((i) => i.destroy()) });
    }
    if (!on || this.nightStars) return;
    const x0 = room * L.W;
    const imgs = [];
    for (let i = 0; i < 14; i++) {
      const im = this.add.image(Math.round(x0 + rnd(8, L.W - 8)), Math.round(rnd(4, L.FLOOR_TOP - 6)), i === 0 ? 'moon_px' : 'star_px').setDepth(10001).setAlpha(0);
      im.setTint(pick([0xfff6a8, 0xffffff, 0x9fdcff, 0xffc0e0]));
      if (i === 0) im.clearTint();
      this.tweens.add({ targets: im, alpha: 0.9, duration: 700, delay: i * 60 });
      this.tweens.add({ targets: im, x: im.x + rnd(-10, 10), duration: rnd(5000, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (i) this.tweens.add({ targets: im, scale: 1, alpha: { from: 0.9, to: 0.35 }, duration: rnd(900, 1600), yoyo: true, repeat: -1, delay: 800 });
      imgs.push(im);
    }
    this.nightStars = { room, imgs };
    sfx.sparkle();
    this.hintDone('stars');
  }

  /** Фотоаппарат: щёлк — вспышка, и на стене появляется пиксельная фотография того, что в кадре. */
  takePhoto(cam) {
    if (this.snapping) return;
    this.snapping = true;
    sfx.shutter();
    this.tweens.add({ targets: cam, y: cam.y - 2, duration: 80, yoyo: true });
    const cw = Math.min(120, L.W);
    const sx = Math.round((L.W - cw) / 2);
    const room = Math.round(this.cameras.main.scrollX / L.W);
    const done = (img) => {
      const finish = () => {
        let url = null;
        try { url = makePhoto(img, cw, L.ROOM_H); } catch { url = null; }
        this.snapping = false;
        // вспышка поверх всего экрана
        const flash = this.add.rectangle(0, 0, L.W, L.H, 0xffffff, 0.9).setOrigin(0).setScrollFactor(0).setDepth(20000);
        this.tweens.add({ targets: flash, fillAlpha: 0, duration: 350, onComplete: () => flash.destroy() });
        if (!url) return;
        const id = Date.now().toString(36);
        this.photoStore()[id] = url;
        this.prunePhotos(id);
        const o = this.spawnItem(this.byId.get('photo'), cam.x, cam.y - 6, { photoId: id });
        const walls = [0.12, 0.3, 0.5, 0.7, 0.88].map((f) => room * L.W + Math.round(L.W * f));
        const tx = walls.find((x) => !this.objs.some((p) => p.beh?.photo && p !== o && Math.abs(p.x - x) < 20)) ?? pick(walls);
        this.tweens.add({ targets: o, x: tx, y: L.FLOOR_TOP - 14, duration: 700, ease: 'Quad.easeOut', onComplete: () => { sfx.sparkle(); this.save(); } });
        this.hintDone('photo');
      };
      if (img.complete) finish(); else img.onload = finish;
    };
    try { this.game.renderer.snapshotArea(sx * L.P, 0, cw * L.P, L.ROOM_H * L.P, done); } catch { this.snapping = false; }
  }

  photoStore() {
    if (!this.photos) {
      try { this.photos = JSON.parse(localStorage.getItem('pixel-house-photos')) || {}; } catch { this.photos = {}; }
    }
    return this.photos;
  }

  /** Храним только снимки, что висят в доме (+ новый); не больше 16 — самые старые снимаются со стены. */
  prunePhotos(keep) {
    const store = this.photoStore();
    const hung = this.objs.filter((o) => o.beh?.photo);
    while (hung.length >= 16) { const old = hung.shift(); this.removeObj(old); }
    const used = new Set([keep, ...this.objs.filter((o) => o.beh?.photo).map((o) => o.photoId)]);
    for (const id of Object.keys(store)) if (!used.has(id)) delete store[id];
    try { localStorage.setItem('pixel-house-photos', JSON.stringify(store)); } catch { /* места нет — фото проживёт до перезагрузки */ }
  }

  applyPhotoTex(o) {
    const id = o.photoId;
    const url = id && this.photoStore()[id];
    if (!url) return;
    const key = `photo_${id}`;
    if (this.textures.exists(key)) { o.setTexture(key); return; }
    const img = new Image();
    img.onload = () => {
      if (!this.textures.exists(key)) this.textures.addImage(key, img);
      for (const p of this.objs) if (p.photoId === id && p.active) p.setTexture(key);
    };
    img.src = url;
  }

  // ---------------------------------------------------------------- сад: тучка и радуга, качели, бабочки, клад
  /** Качели и лопатка в саду — и в старых сохранениях. */
  ensureGarden2() {
    if (this.flags.garden2) return;
    this.flags.garden2 = true;
    const { W, FLOOR_TOP, ROOM_H } = L;
    if (!this.objs.some((o) => o.beh?.swing)) this.spawnItem(this.big.swing, Math.round(2 * W + W * 0.88), FLOOR_TOP + 12);
    const sh = this.findRec('shovel');
    if (sh && !this.objs.some((o) => o.beh?.shovel)) this.spawnItem(sh, Math.round(2 * W + W * 0.38), ROOM_H - 4);
    this.save();
  }

  /** Тучка над садом — тап вызывает дождь (живёт на слое неба, не предмет). */
  buildCloud() {
    const x = Math.round(2 * L.W + L.W * 0.42);
    this.cloud = this.add.image(x, 14, 'raincloud').setDepth(-8.5).setInteractive();
    this.cloud.raincloud = true;
    this.tweens.add({ targets: this.cloud, x: x + 14, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cloud.setVisible(!this.night);
  }

  /** Дождь: поливает все грядки, мочит всех в саду (→ фен); днём после дождя — радуга. */
  rain() {
    if (this.raining || this.night) return;
    this.raining = true;
    this.hintDone('rain');
    const gx = 2 * L.W;
    sfx.rain();
    this.cloud.setTint(0xaab3c5);
    const dim = this.add.rectangle(gx, 0, L.W, L.ROOM_H, 0x5a6a8a, 0).setOrigin(0).setDepth(9998);
    this.tweens.add({ targets: dim, fillAlpha: 0.18, duration: 400 });
    const drops = this.add.particles(gx, 4, 'raindrop', {
      x: { min: 0, max: L.W }, speedY: { min: 150, max: 190 }, speedX: -10, lifespan: (L.ROOM_H / 160) * 1000,
      tint: [0x7fbfff, 0xb8e0ff], alpha: 0.85, frequency: 12, quantity: 2,
    }).setDepth(9999);
    this.time.delayedCall(900, () => {
      for (const bed of this.objs) {
        if (!bed.beh?.gardenBed || Math.floor(bed.x / L.W) !== 2) continue;
        bed.plots.forEach((p, i) => { if (p && p.stage < 3 && !p.watered) this.waterPlot(bed, i); });
      }
      for (const o of this.objs) {
        if (Math.floor(o.x / L.W) !== 2 || o.inTub) continue;
        if (o.kind === 'char') { o.wetUntil = this.time.now + 20000; if (!this.flags.tried?.dryer || Math.random() < 0.5) this.addNeed(o, 'dryer', 2500); }
        else if (o.beh?.pet) o.wetUntil = this.time.now + 7000;
      }
    });
    this.time.delayedCall(3400, () => {
      drops.stop();
      this.time.delayedCall(800, () => drops.destroy());
      this.cloud.clearTint();
      this.tweens.add({ targets: dim, fillAlpha: 0, duration: 500, onComplete: () => dim.destroy() });
      this.raining = false;
      if (this.night) return;
      const bow = this.add.image(gx + L.W / 2, L.FLOOR_TOP - 6, rainbowTex(this, Math.round(L.W * 0.8), Math.max(16, L.FLOOR_TOP - 12))).setOrigin(0.5, 1).setDepth(-8.7).setAlpha(0);
      sfx.sparkle();
      this.tweens.add({ targets: bow, alpha: 0.85, duration: 900, hold: 8000, yoyo: true, onComplete: () => bow.destroy() });
    });
  }

  pushSwing(sw) {
    sw.amp = Math.min(0.6, (sw.amp || 0) + 0.2);
    sfx.whee();
    const rider = this.objs.find((o) => o.restOn === sw);
    if (rider?.kind === 'char') { sfx.giggle(); this.fxHearts.explode(1, rider.x, rider.y - rider.displayHeight); }
    this.swingDream(sw);
  }

  /** Качели: сиденье на верёвках — маятник; седок качается вместе с ним. */
  updateSwings(time, delta) {
    const g = this.swingG;
    if (!g) return;
    g.clear();
    for (const sw of this.objs) {
      if (!sw.beh?.swing || !sw.active) continue;
      const rider = this.objs.find((o) => o.restOn === sw && !o.dragging);
      const base = rider ? 0.22 : 0;
      sw.amp = (sw.amp || 0) > base ? sw.amp * Math.pow(0.9993, delta) : Math.min(base, (sw.amp || 0) + 0.002 * delta);
      sw.phase = (sw.phase || 0) + delta * 0.0034;
      const top = sw.y - sw.displayHeight + 4;
      const len = sw.displayHeight - 14;
      const th = sw.amp * Math.sin(sw.phase);
      const sx = Math.round(sw.x + len * Math.sin(th));
      const sy = Math.round(top + len * Math.cos(th));
      g.setDepth(sw.depth + 0.3);
      g.lineStyle(1, 0x7a4a32, 1);
      g.lineBetween(sw.x - 5, top, sx - 5, sy);
      g.lineBetween(sw.x + 5, top, sx + 5, sy);
      g.fillStyle(0x2b1d2e).fillRect(sx - 8, sy - 1, 16, 5);
      g.fillStyle(0xf27aa6).fillRect(sx - 7, sy, 14, 3);
      g.fillStyle(0xffb0d0).fillRect(sx - 7, sy, 14, 1);
      if (rider) { rider.x = sx; rider.y = sy + (rider.kind === 'char' ? 8 : 1); }
    }
  }

  /** Раз в полторы секунды: бабочки над садом (больше — над выросшими цветами) и блестящий крестик-клад. */
  gardenTick() {
    const inGarden = Math.round(this.cameras.main.scrollX / L.W) === 2 && !this.dress && !this.albumUi;
    if (this.cloud) this.cloud.setVisible(!this.night);
    this.butterflies = this.butterflies.filter((b) => b.active);
    if (!inGarden || this.night) {
      for (const b of this.butterflies) if (!b.onChar) b.destroy();
      this.butterflies = this.butterflies.filter((b) => b.active);
    } else {
      const want = Math.min(3, 1 + this.ripeFlowers().length);
      const rec = this.findRec('butterfly');
      if (rec && this.butterflies.filter((b) => !b.onChar).length < want) {
        const b = this.add.image(2 * L.W + (Math.random() < 0.5 ? 4 : L.W - 4), Math.round(rnd(10, L.FLOOR_TOP)), rec.cat, rec.frame).setDepth(15000).setInteractive();
        b.butterfly = true;
        this.butterflies.push(b);
        this.flutter(b);
      }
    }
    // клад: крестик на траве появляется время от времени и поблёскивает
    if (inGarden && !this.digSpot && this.time.now > (this.nextDigAt || 0)) {
      const x = Math.round(2 * L.W + L.W * rnd(0.3, 0.8));
      const y = Math.round(rnd(L.FLOOR_TOP + 10, L.ROOM_H - 6));
      this.digSpot = this.add.image(x, y, 'dig_x').setDepth(-4.9);
    }
    if (this.digSpot && Math.random() < 0.5) this.fxSparks.explode(2, this.digSpot.x, this.digSpot.y - 2);
  }

  ripeFlowers() {
    const out = [];
    for (const bed of this.objs) {
      if (!bed.beh?.gardenBed) continue;
      bed.plots.forEach((p, i) => {
        const r = p && p.stage >= 3 && this.recOf(p.id);
        if (r && /sunflower|tulip|rose|daisy|flower/.test(r.subject)) out.push({ x: bed.x + PLOT_DX[i], y: bed.y - bed.displayHeight - 8 });
      });
    }
    return out;
  }

  /** Бабочка летает от точки к точке (чаще — к цветам). */
  flutter(b) {
    if (!b.active || b.onChar) return;
    const fl = this.ripeFlowers();
    const t = fl.length && Math.random() < 0.6 ? pick(fl) : { x: 2 * L.W + rnd(12, L.W - 12), y: rnd(10, L.FLOOR_TOP + 16) };
    b.setFlipX(t.x < b.x);
    this.tweens.add({ targets: b, x: Math.round(t.x + rnd(-4, 4)), y: Math.round(t.y + rnd(-4, 2)), duration: rnd(1600, 2600), ease: 'Sine.easeInOut', onComplete: () => this.flutter(b) });
  }

  /** Поймали бабочку: она садится на голову ближайшему персонажу и через время улетает. */
  catchButterfly(b) {
    this.tweens.killTweensOf(b);
    this.hintDone('butterfly');
    sfx.sparkle();
    const chars = this.objs.filter((c) => c.kind === 'char' && this.visible(c) && !c.inTub);
    if (!chars.length) { this.fxSparks.explode(4, b.x, b.y); this.flutter(b); return; }
    chars.sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x));
    const ch = chars[0];
    b.disableInteractive();
    this.tweens.add({
      targets: b, x: ch.x + 2, y: ch.y - ch.displayHeight - 3, duration: 600, ease: 'Sine.easeInOut',
      onComplete: () => {
        b.onChar = ch;
        b.until = this.time.now + 12000;
        sfx.giggle();
        this.fxHearts.explode(3, ch.x, ch.y - ch.displayHeight);
      },
    });
  }

  updateButterflies(time) {
    for (const b of this.butterflies || []) {
      const ch = b.onChar;
      if (!ch || !b.active) continue;
      if (!ch.active || time > b.until) {
        b.onChar = null;
        this.tweens.add({ targets: b, y: -12, x: b.x + rnd(-30, 30), duration: 1400, onComplete: () => b.destroy() });
        continue;
      }
      b.x = Math.round(ch.x + 2);
      b.y = Math.round(ch.y - ch.displayHeight - 3 + Math.sin(time / 300)); // на макушке, не на лице
      b.setDepth(ch.depth + 0.3);
    }
  }

  /** Лопатку — на крестик: копает, и из ямки выскакивает клад. */
  digTreasure(shovel) {
    const spot = this.digSpot;
    this.digSpot = null;
    this.nextDigAt = this.time.now + 15000; // новый крестик — не сразу, а после паузы
    const { x, y } = spot;
    shovel.x = x + 7; shovel.y = y + 2;
    shovel.restOn = null;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 260, () => {
        sfx.dig();
        this.tweens.add({ targets: shovel, y: shovel.y - 4, duration: 110, yoyo: true });
        this.fxCrumbs.setParticleTint(0x7a5232);
        this.fxCrumbs.explode(5, x, y);
      });
    }
    this.time.delayedCall(850, () => {
      spot.destroy();
      const hole = this.add.ellipse(x, y - 1, 10, 4, 0x5a3a22).setDepth(-4.9);
      this.tweens.add({ targets: hole, alpha: 0, delay: 3000, duration: 800, onComplete: () => hole.destroy() });
      this.treasureList ||= TREASURE.map((sub) => this.findRec(sub)).filter(Boolean);
      const rec = pick(this.treasureList);
      if (!rec) return;
      const o = this.spawnItem(rec, x, y - 2);
      this.lastTreasure = rec.subject;
      this.sticker('treasure', rec, x, y - 6);
      const tx = Math.round(Phaser.Math.Clamp(x + rnd(-20, 20), 2 * L.W + 8, 3 * L.W - 8));
      const ty = Math.round(Phaser.Math.Clamp(y + rnd(-4, 6), L.FLOOR_TOP + 6, L.ROOM_H - 2));
      sfx.fanfare();
      this.fxSparks.explode(16, x, y - 6);
      this.tweens.add({ targets: o, x: tx, duration: 600 });
      this.tweens.add({
        targets: o, y: y - 26, duration: 280, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: o, y: ty, duration: 380, ease: 'Bounce.easeOut', onComplete: () => { sfx.thud(); this.save(); } }),
      });
      this.hintDone('dig');
    });
  }

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
    if (this.jam?.size && Phaser.Math.Clamp(idx, 0, L.ROOMS - 1) !== Math.round(this.cameras.main.scrollX / L.W)) this.jamEnded();
    this.targetRoom = Phaser.Math.Clamp(idx, 0, L.ROOMS - 1);
    const target = this.targetRoom * L.W;
    if (Math.abs(cam.scrollX - target) > 1) sfx.pick();
    this.tweens.add({ targets: cam, scrollX: target, duration: 350, ease: 'Sine.easeInOut', onComplete: () => { this.save(); this.potHello(); this.arrived(); } });
  }

  /** Камера встала в комнате: своя мелодия, местные здороваются, любимая кукла идёт следом. */
  arrived() {
    const prev = this.curRoom ?? 0;
    if (this.targetRoom === prev) return;
    this.curRoom = this.targetRoom;
    setMusicTheme(this.night ? 0 : this.curRoom);
    this.onRoomEnter(this.curRoom, prev);
  }

  /** Котёл тихо булькает, пока его видно. */
  potIdle() {
    if (this.dress || this.albumUi) return;
    for (const pot of this.objs) {
      if (pot.kind !== 'item' || !pot.beh.cauldron || pot.brewing || !this.visible(pot)) continue;
      this.fxCrumbs.setParticleTint(0x9ff5b8);
      this.fxCrumbs.explode(2, pot.x + rnd(-6, 6), pot.y - pot.displayHeight + 3);
      if (Math.random() < 0.3) sfx.blub();
    }
    // неопробованное подпрыгивает с искорками — «потрогай меня»
    if (Math.random() < 0.5) return;
    const tried = this.flags.tried || {};
    if (!tried.rain && this.cloud && !this.night && Math.round(this.cameras.main.scrollX / L.W) === 2 && Math.random() < 0.4) {
      this.tweens.add({ targets: this.cloud, y: this.cloud.y - 2, duration: 140, yoyo: true, repeat: 1 });
      this.fxCrumbs.setParticleTint(0x7fbfff);
      this.fxCrumbs.explode(3, this.cloud.x, this.cloud.y + 6);
      return;
    }
    if (!tried.curtain && this.curtain && Math.round(this.cameras.main.scrollX / L.W) === 4 && Math.random() < 0.4) {
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
    this.goRoom(Math.round(cam.scrollX / L.W + bias));
  }

  // ---------------------------------------------------------------- drawer UI
  buildDrawer() {
    const D = 20000;
    const { W, H, ROOM_H, TAB_Y, SLOT_Y } = L;
    this.add.rectangle(0, ROOM_H, W, H - ROOM_H, 0x4a3157).setOrigin(0).setDepth(D);
    this.add.rectangle(0, ROOM_H, W, 1, 0x2b1d2e).setOrigin(0).setDepth(D);
    this.add.rectangle(0, ROOM_H + 19, W, 1, 0x3a2546).setOrigin(0).setDepth(D);
    try { this.recent = JSON.parse(localStorage.getItem('pixel-house-recent')) || []; } catch { this.recent = []; }
    this.cat = this.cats[0];
    this.page = 0;
    this.mode = 'curated';
    const tabsAll = ['recent', 'people', ...this.cats];
    const n = tabsAll.length + 2; // + кнопки сброса и музыки
    const step = Math.min(22, Math.floor((W - 2) / n));
    const x0 = Math.floor((W - step * n) / 2) + Math.floor(step / 2);
    this.tabs = tabsAll.map((c, i) => {
      const x = x0 + i * step;
      const bg = this.add.rectangle(x, TAB_Y, step - 2, 18, 0x6b4a7e).setDepth(D).setInteractive();
      bg.ui = { tab: c };
      if (c === 'recent') {
        // часы — «недавние»
        const g = this.add.graphics().setDepth(D + 1);
        pixelMap(g, ['...XXXXX...', '..X.....X..', '.X...X...X.', 'X....X....X', 'X....X....X', 'X....XXX..X', 'X.........X', '.X.......X.', '..X.....X..', '...XXXXX...'], x - 5, TAB_Y - 5, 0xffffff);
      } else if (c === 'people') {
        this.add.image(x, TAB_Y + 8, 'cast_mia_icon').setOrigin(0.5, 1).setDepth(D + 1); // семья: позвать куклу в комнату
      } else {
        const rec = this.findRec(CAT_ICON[c]) || this.byCat[c][0];
        this.add.image(x, TAB_Y + 8, rec.cat, rec.frame).setOrigin(0.5, 1).setDepth(D + 1);
      }
      return bg;
    });
    // родительская зона — для взрослых: удерживать 2 секунды (полоска показывает, сколько осталось)
    const rx = x0 + tabsAll.length * step;
    const rb = this.add.rectangle(rx, TAB_Y, step - 2, 18, 0x3a2546).setDepth(D).setInteractive();
    rb.ui = { gear: true };
    this.gearIcon = this.add.graphics().setDepth(D + 1);
    this.gearIcon.x = rx;
    this.gearIcon.y = TAB_Y - 1;
    pixelMap(this.gearIcon, ['..X.X..', '.XXXXX.', 'XX...XX', '.X...X.', 'XX...XX', '.XXXXX.', '..X.X..'], -3, -3, 0x8f6fa3);
    this.gearBar = this.add.rectangle(rx - 7, TAB_Y + 7, 14, 2, 0xfff07a).setOrigin(0, 0.5).setDepth(D + 1).setVisible(false);
    // музыка вкл/выкл
    const mx = rx + step;
    this.musicBtn = this.add.rectangle(mx, TAB_Y, step - 2, 18, 0x6b4a7e).setDepth(D).setInteractive();
    this.musicBtn.ui = { music: true };
    this.musicIcon = this.add.graphics().setDepth(D + 1);
    this.musicIconAt = [mx - 3, TAB_Y - 4];
    this.drawMusicIcon();
    // стрелки страниц
    const arrow = (x, dir) => {
      const hit = this.add.rectangle(x, SLOT_Y, 10, 18, 0x6b4a7e).setDepth(D).setInteractive();
      hit.ui = { page: dir };
      const t = this.add.graphics().setDepth(D + 1);
      const rows = dir > 0 ? ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'] : ['...X', '..XX', '.XXX', 'XXXX', '.XXX', '..XX', '...X'];
      pixelMap(t, rows, x - 2, SLOT_Y - 3, 0xffffff);
    };
    arrow(6, -1);
    arrow(W - 6, 1);
    // ячейки: последняя — кубик «перемешать»
    const cells = Math.max(2, Math.floor((W - 24) / 20));
    this.perPage = Math.min(12, cells - 1);
    const sx0 = Math.floor((W - (this.perPage + 1) * 20) / 2) + 10;
    this.slots = [];
    for (let i = 0; i < this.perPage; i++) {
      const x = sx0 + i * 20;
      this.add.rectangle(x, SLOT_Y, 18, 18, 0x5c3f6c).setDepth(D);
      const img = this.add.image(x, SLOT_Y + 8, this.cats[0], 0).setOrigin(0.5, 1).setDepth(D + 1).setInteractive();
      this.slots.push(img);
    }
    const dx = sx0 + this.perPage * 20;
    this.diceBg = this.add.rectangle(dx, SLOT_Y, 18, 18, 0x8a52cc).setDepth(D).setInteractive();
    this.diceBg.ui = { dice: true };
    this.dice = this.add.graphics().setDepth(D + 1);
    this.dice.x = dx;
    this.dice.y = SLOT_Y;
    pixelMap(this.dice, ['.XXXXXXXXX.', 'XXXXXXXXXXX', 'XX.XXXXX.XX', 'XXXXXXXXXXX', 'XXXXX.XXXXX', 'XXXXXXXXXXX', 'XX.XXXXX.XX', 'XXXXXXXXXXX', '.XXXXXXXXX.'], -5, -4, 0xffffff);
    pixelMap(this.dice, ['..X.....X..', '...........', '.....X.....', '...........', '..X.....X..'], -5, -2, 0x4a3157);
    // точки страниц — на линии между рядами
    this.pageDots = this.add.graphics().setDepth(D + 1);
    this.buildGlow();
    this.buildView();
  }

  /** Подборка предметов текущей вкладки: витрина / случайная / недавние (не больше VIEW_SIZE). */
  buildView() {
    if (this.cat === 'recent') {
      this.view = this.recent.map((id) => this.recOf(id)).filter(Boolean).slice(0, VIEW_SIZE);
    } else if (this.cat === 'people') {
      this.view = this.castRecs();
    } else {
      const list = this.byCat[this.cat];
      const fav = new Set(FAVORITES[this.cat] || []);
      const top = list.filter((r) => r.tex || fav.has(r.subject));
      const rest = list.filter((r) => !(r.tex || fav.has(r.subject)));
      this.view = this.mode === 'shuffle'
        ? seededShuffle(rest, `${this.cat}-${Math.random()}`).slice(0, VIEW_SIZE)
        : top.concat(seededShuffle(rest, this.cat)).slice(0, VIEW_SIZE);
    }
    this.page = 0;
    // то, о чём просит кукла, всегда есть в подборке своей вкладки, и ящик открывается на нужной странице
    const want = this.wishTarget();
    if (want && want.cat === this.cat) {
      let i = this.view.findIndex((r) => r.id === want.id);
      if (i < 0) { this.view = [want, ...this.view].slice(0, VIEW_SIZE); i = 0; }
      this.page = Math.floor(i / this.perPage);
    }
    this.refreshDrawer();
  }

  addRecent(rec) {
    this.recent = [rec.id, ...this.recent.filter((id) => id !== rec.id)].slice(0, VIEW_SIZE);
    try { localStorage.setItem('pixel-house-recent', JSON.stringify(this.recent)); } catch { /* ignore */ }
  }

  drawMusicIcon() {
    const on = musicPlaying();
    this.musicIcon.clear();
    pixelMap(this.musicIcon, ['..XXXX', '..X..X', '..X..X', '..X..X', 'XXX.XX', 'XXX.XX', '.X..X.'], ...this.musicIconAt, on ? 0xfff07a : 0x8f6fa3);
    this.musicBtn.setFillStyle(on ? 0x6b4a7e : 0x3a2546);
  }

  refreshDrawer() {
    const list = this.view || [];
    const pages = Math.max(1, Math.ceil(list.length / this.perPage));
    this.page = (this.page + pages) % pages;
    this.slots.forEach((img, i) => {
      const rec = list[this.page * this.perPage + i];
      img.setVisible(!!rec);
      img.drawerRec = rec || null;
      if (rec) { if (rec.tex) img.setTexture(`${rec.tex}_icon`); else img.setTexture(rec.cat, rec.frame); }
    });
    const showDice = this.cat !== 'recent' && this.cat !== 'people';
    this.diceBg.setVisible(showDice);
    this.dice.setVisible(showDice);
    this.diceBg.setFillStyle(this.mode === 'shuffle' ? 0xc48ff2 : 0x8a52cc);
    this.tabs.forEach((t) => t.setFillStyle(t.ui.tab === this.cat ? 0xc48ff2 : 0x6b4a7e));
    // точки страниц
    const g = this.pageDots.clear();
    if (pages > 1) {
      const w = pages * 6 - 2;
      const x0 = Math.floor((L.W - w) / 2);
      for (let i = 0; i < pages; i++) g.fillStyle(i === this.page ? 0xffffff : 0x8f6fa3).fillRect(x0 + i * 6, L.ROOM_H + 18, 4, 2);
    }
    this.updateWishGlow();
  }

  // ---------------------------------------------------------------- input
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
    if (this.dreaming) return; // уже улетаем в сон
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
    if (top?.ui) { this.press.ui = top.ui; this.press.t0 = performance.now(); return; }
    if (top?.drawerRec?.cast) { this.press.ui = { cast: top.drawerRec.cast }; return; } // портрет: позвать куклу
    if (top?.drawerRec) { this.press.rec = top.drawerRec; return; }
    if (top && 'drawerRec' in top) return; // пустая ячейка
    if (top?.kind) { this.press.obj = top; this.press.offX = top.x - q.x; this.press.offY = top.y - q.y; return; }
    // пустое место комнаты: возможный свайп между комнатами
    if (!top && q.y <= L.ROOM_H) this.press.swipe = { sx: p.x, cam: this.cameras.main.scrollX };
  }

  onMove(p) {
    const pr = this.press;
    if (!pr || pr.id !== p.id || !p.isDown) return;
    if (pr.swipe) {
      const dx = (p.x - pr.swipe.sx) / L.P;
      if (!pr.scrolling && Math.abs(dx) < 4) return;
      pr.scrolling = true;
      const cam = this.cameras.main;
      this.tweens.killTweensOf(cam);
      cam.scrollX = Phaser.Math.Clamp(pr.swipe.cam - dx, 0, L.WORLD - L.W);
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
    o.x = Phaser.Math.Clamp(q.x + pr.offX, 4, L.WORLD - 4);
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
  }

  onUp(p) {
    const pr = this.press;
    if (!pr || pr.id !== p.id) return; // отпустили другой палец
    this.press = null;
    const q = this.pt(p);
    if (pr.scrolling) {
      // свайп на 15% экрана — перелистнуть комнату
      const dx = (p.x - pr.swipe.sx) / L.P;
      const from = Math.round(pr.swipe.cam / L.W);
      this.goRoom(dx < -L.W * 0.15 ? from + 1 : dx > L.W * 0.15 ? from - 1 : from);
      return;
    }
    if (pr.moved && pr.obj) { this.drop(pr.obj, q); if (this.edgeScrolled) { this.edgeScrolled = false; this.snapCamera(); } return; }
    if (pr.ui?.nav) { this.goRoom(Math.round(this.cameras.main.scrollX / L.W) + pr.ui.nav); return; }
    if (pr.ui && (pr.ui.map || pr.ui.mapClose || 'mapRoom' in pr.ui)) { this.onMapUi(pr.ui); return; }
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
    if ([...L.WINDOWS, L.SUN].some(({ x, y, w, h }) => q.x >= x - 2 && q.x <= x + w + 2 && q.y >= y - 2 && q.y <= y + h + 2)) this.applyNight(!this.night, true);
  }

  startDrag(o) {
    sfx.pick();
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
  }

  drop(o, q) {
    o.dragging = false;
    if (o.kind === 'char') o.setTexture(o.key);
    for (const c of this.objs) if (c.kind === 'char' && !c.busy && !c.sleeping) c.setTexture(c.key);

    // в урну: предмет исчезает (питомец выскакивает обратно)
    if (o.kind === 'item' && q.y <= L.ROOM_H) {
      const bin = this.objAt(q.x, q.y, (x) => x.kind === 'item' && x.beh.bin && x !== o);
      if (bin && this.binEat(bin, o)) { this.save(); return; }
    }
    // робот, стиральная машина, компост, удобрение, лужа для вещей
    if (this.cleanDrop(o, q)) { this.save(); return; }
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
    const sup = this.objs.find((s) => s !== o && s.kind === 'item' && s.beh.furniture && (!s.beh.wall || s.beh.shelf) && !s.beh.flat && !s.owner
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
    if (b.appleTree) { this.shakeTree(o); return; }
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
      sfx.squeak();
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
                makeCharTextures(this, ch.key, ch.look);
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
    if (this.dress || this.albumUi) return;
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
      const open = [...this.alchemy.recipes.entries()].filter(([k]) => !this.alchemy.found[k]);
      if (!open.length) return;
      const [key, recipe] = pick(open);
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
    return Object.keys(HINTS).filter((k) => HINTS[k].room === room && !!HINTS[k].night === !!this.night);
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
        this.fxZ.explode(1, c.x + 6, c.y - c.displayHeight + 4);
      }
      // спящей снятся миры: над ней облачка — тап переносит в сон (см. dream.js)
      if (c.sleeping) this.dream(c); else if (c.dreamPicks) this.endDream(c);
    }
  }

  // ---------------------------------------------------------------- готовка и оркестр
  /** Положить еду на плиту: шипит, пар, через пару секунд — готовое блюдо (если есть рецепт). */
  cook(stove, o) {
    o.x = Math.round(stove.x);
    o.y = Math.round(stove.y - stove.displayHeight + 3);
    o.restOn = stove;
    o.cooking = true;
    const steam = this.add.particles(o.x, o.y - 6, 'px', {
      lifespan: 900, speedY: { min: -22, max: -10 }, speedX: { min: -5, max: 5 }, x: { min: -4, max: 4 },
      scale: { start: 2, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 120,
    }).setDepth(16000);
    this.time.addEvent({ delay: 280, repeat: 7, callback: () => sfx.sizzle() });
    this.time.delayedCall(2400, () => {
      steam.stop();
      this.time.delayedCall(1000, () => steam.destroy());
      o.cooking = false;
      // сняли с плиты раньше времени — ничего не готовим
      if (!o.active || o.restOn !== stove || !this.objs.includes(o)) return;
      const to = COOK[o.rec.subject] && this.findRec(COOK[o.rec.subject]);
      sfx.ding();
      if (!to) { this.fxHearts.explode(2, o.x, o.y - 10); return; } // просто тёплое
      const x = o.x;
      const y = o.y;
      this.removeObj(o);
      const n = this.spawnItem(to, x, y);
      n.restOn = stove;
      this.sticker('dish', to, x, y - 8);
      this.hintDone('cook');
      this.fxSparks.explode(14, x, y - 8);
      this.tweens.add({ targets: n, y: y - 4, duration: 120, yoyo: true });
      this.save();
    });
  }

  instrumentKind(o) {
    const s = o.rec.subject;
    return RX.drum.test(s) ? 'drum' : RX.bell.test(s) ? 'bell' : RX.string.test(s) ? 'string' : 'wind';
  }

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
  }

  danceTick() {
    if (!(musicPlaying() || this.discoBall) || this.dress || this.albumUi || Math.random() < 0.4) return;
    const chars = this.objs.filter((c) => c.kind === 'char' && !c.busy && !c.dragging && !c.sleeping && this.visible(c));
    if (chars.length) this.celebrate(pick(chars), 2);
  }

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
      o.x = Math.round(Phaser.Math.Clamp(pot.x + (o.x < pot.x ? -20 : 20), 8, L.WORLD - 8));
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
    this.stat('brew');
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
      if (this.wish?.type === 'magic') this.checkWish(this.wish.ch, 'magic', recipeKey(a.subject, b.subject));
      pot.contents = [];
      pot.brewing = false;
      this.potBlast(pot, [this.recColor(a), this.recColor(b)]);
      const o = this.spawnItem(result, top.x, top.y + 2);
      const tx = Math.round(Phaser.Math.Clamp(top.x + (Math.random() < 0.5 ? -1 : 1) * rnd(16, 30), 10, L.WORLD - 10));
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
        this.flyToAlbum(result, top.x, top.y - 10);
        this.lastStickerTab = 'recipe';
      }
      this.save();
    });
  }

  /** Новое открытие: копия иконки летит из котла к альбому (или к краю экрана в его сторону). */
  flyToAlbum(rec, x, y) {
    const album = this.objs.find((o) => o.kind === 'item' && o.beh.album);
    const cam = this.cameras.main;
    let tx = cam.scrollX + L.W - 10;
    let ty = 12;
    if (album) {
      tx = album.x;
      ty = album.y - album.displayHeight / 2;
      if (!this.visible(album)) tx = album.x < cam.scrollX ? cam.scrollX + 6 : cam.scrollX + L.W - 6;
    }
    const icon = this.recImage(rec, x, y).setOrigin(0.5).setDepth(16001);
    this.time.delayedCall(450, () => {
      this.tweens.add({ targets: icon, x: tx, duration: 900, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: icon, y: Math.min(y, ty) - 25, duration: 450, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({
          targets: icon, y: ty, duration: 450, ease: 'Quad.easeIn',
          onComplete: () => {
            icon.destroy();
            sfx.page();
            this.fxSparks.explode(14, tx, ty);
            if (album) this.tweens.add({ targets: album, y: album.y - 6, duration: 140, yoyo: true, repeat: 3 });
          },
        }),
      });
    });
  }

  // ---------------------------------------------------------------- альбом открытий
  recImage(rec, x, y) {
    return (rec.tex ? this.add.image(x, y, `${rec.tex}_icon`) : this.add.image(x, y, rec.cat, rec.frame)).setOrigin(0.5, 1);
  }

  openAlbum() {
    if (this.dress || this.albumUi || this.mapUi) return;
    sfx.page();
    this.stat('album');
    const bg = this.add.rectangle(0, 0, L.W, L.H, 0x2b1d2e, 0.95).setOrigin(0).setDepth(30000).setInteractive();
    bg.ui = { block: true };
    // открываем на странице, где появилась последняя наклейка
    const tabs = this.albumTabs();
    const tab = Math.max(0, tabs.findIndex((t) => t.key === this.lastStickerTab));
    this.lastStickerTab = null;
    this.albumUi = { parts: [bg], rows: [], page: 0, tab, sel: Math.max(0, tabs[tab].entries.findIndex((e) => e.found)) };
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
    // картинка записи: предмет каталога или ключ текстуры-подсказки (плита, грядка, сон…)
    const icon = (e, x, y) => add(typeof e === 'string' ? this.add.image(x, y, e).setOrigin(0.5, 1) : this.recImage(e, x, y));
    const tabs = this.albumTabs();
    u.tab = Phaser.Math.Clamp(u.tab || 0, 0, tabs.length - 1);
    const entries = tabs[u.tab].entries;
    // страницы альбома: котёл, плита, грядка, клад, сны — под иконкой полоска «сколько собрано»
    const tw = 24;
    const tx0 = Math.floor((W - tabs.length * tw) / 2);
    tabs.forEach((t, i) => {
      const x = tx0 + i * tw;
      const total = t.entries.length;
      const n = t.entries.filter((e) => e.found).length;
      add(this.add.rectangle(x, 1, 22, 21, i === u.tab ? 0xc48ff2 : 0x6b4a7e).setOrigin(0));
      icon(t.icon, x + 11, 18);
      add(this.add.rectangle(x + 2, 19, 18, 2, 0x2b1d2e).setOrigin(0));
      if (n) add(this.add.rectangle(x + 2, 19, Math.max(1, Math.round(18 * n / total)), 2, n === total ? 0xffd84a : 0x7ad9b5).setOrigin(0));
      hit(x, 1, 22, 21, { albumTab: i });
    });
    const cell = 20;
    const cols = Math.max(1, Math.floor((W - 36) / cell));
    const y0 = 25;
    const rowsN = Math.max(1, Math.floor((H - y0 - 30) / cell));
    const per = cols * rowsN;
    const pages = Math.max(1, Math.ceil(entries.length / per));
    u.page = (u.page + pages) % pages;
    const x0 = Math.floor((W - cols * cell) / 2);
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
    // нижняя строка — как получить выбранную наклейку: A + B = результат.
    // У котла B и результат скрыты, пока не открыто; на остальных страницах путь виден сразу, скрыт только результат
    const e = entries[u.sel];
    if (e) {
      const by = H - 6;
      const bx = Math.floor(W / 2) - 44;
      add(this.add.rectangle(bx - 6, by - 21, 100, 24, 0x4a3157).setOrigin(0));
      const g = add(this.add.graphics());
      icon(e.a, bx + 8, by);
      pixelMap(g, ['..X..', '..X..', 'XXXXX', '..X..', '..X..'], bx + 19, by - 10, 0xffffff);
      if (e.found || e.plain) icon(e.b, bx + 34, by);
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
    if ('albumTab' in ui) {
      u.tab = ui.albumTab;
      u.page = 0;
      u.sel = Math.max(0, this.albumTabs()[u.tab]?.entries.findIndex((e) => e.found) ?? 0);
      sfx.page();
    }
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
      // много вариантов — клетки плотнее (картинка обрезается по краям на пиксель-другой)
      const step = Math.min(26, Math.floor((W - d.x0 - 1) / keys.length));
      const w = Math.min(22, step - 3);
      const cx = Math.floor((22 - w) / 2);
      keys.forEach((k, i) => {
        const x = d.x0 + i * step;
        const tex = `dress_${field}_${k}`;
        makeCharTextures(this, tex, { ...look, [field]: k }, true);
        const sel = (look[field] || keys[0]) === k;
        add(this.add.rectangle(x - 1, y - 1, w + 2, cropH + 2, sel ? 0xffffff : 0x4a3157).setOrigin(0));
        add(this.add.rectangle(x, y, w, cropH, 0x6b4a7e).setOrigin(0));
        add(this.add.image(x - cx, y - cropY, tex).setOrigin(0).setCrop(cx, cropY, w, cropH)).setDepth(D + 1);
        hit(x - 1, y - 1, w + 2, cropH + 2, { dress: { field, value: k } });
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
    this.stat('dressup');
    this.refreshCastIcons(); // портрет в ящике и на карте — по новому виду
    sfx.yum();
    this.fxHearts.explode(3, d.ch.x, d.ch.y - d.ch.displayHeight);
    this.save();
  }

  applyNight(night, withSound = false) {
    if (withSound) (night ? sfx.night : sfx.day)();
    if (withSound && !night) {
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
    setMusicTheme(night ? 0 : (this.curRoom || 0)); // ночью везде колыбельная
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
    const plain = !this.dress && !this.albumUi && !this.mapUi; // нет открытых экранов поверх комнаты
    if (this.nav) {
      this.nav[0].forEach((o) => o.setVisible(cam.scrollX > 2 && plain));
      this.nav[1].forEach((o) => o.setVisible(cam.scrollX < L.WORLD - L.W - 2 && plain));
    }
    this.mapBtn?.forEach((o) => o.setVisible(plain));
    // статистика для родителей: секунды активной игры по комнатам (экран трогали в последние 20 с)
    this.statAcc = (this.statAcc || 0) + delta;
    if (this.statAcc >= 1000) {
      const sec = Math.floor(this.statAcc / 1000);
      this.statAcc -= sec * 1000;
      if (!document.hidden && performance.now() - (this.lastInput || -1e9) < 20000) statTime(Math.round(cam.scrollX / L.W), sec, today());
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
        cam.scrollX = Phaser.Math.Clamp(cam.scrollX + v, 0, L.WORLD - L.W);
        pr.obj.x = Phaser.Math.Clamp(cam.scrollX + sx + pr.offX, 4, L.WORLD - 4);
        this.edgeScrolled = true;
      }
    }
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
    if (!this.objs || this.noSave) return;
    const state = {
      v: 2, night: this.night, W: L.W, ROOM_H: L.ROOM_H, FLOOR_TOP: L.FLOOR_TOP,
      room: this.targetRoom ?? Math.round(this.cameras.main.scrollX / L.W),
      flags: this.flags, buddy: this.buddy || undefined,
      objs: this.objs.filter((o) => o.kind === 'item').map((o) => ({
        uid: o.uid, id: o.rec.id, x: Math.round(o.x), y: Math.round(o.y), lit: o.lit, plots: o.plots || undefined,
        dirty: o.dirty || undefined, contents: o.contents, owner: o.owner?.uid, slot: o.slot, restOn: o.restOn?.uid, bites: o.bites || 0,
        stain: o.stain || undefined, foam: o.foam || undefined, inTub: o.inTub?.uid, tubDx: o.tubDx, deco: o.deco || undefined,
        color: o.color, photoId: o.photoId,
      })),
      chars: this.objs.filter((o) => o.kind === 'char').map((o) => ({
        uid: o.uid, cast: o.cast || undefined, x: Math.round(o.x), y: Math.round(o.y), look: o.look, mul: o.mul, restOn: o.restOn?.uid,
        stain: o.stain || undefined, inTub: o.inTub?.uid, tubDx: o.tubDx,
      })),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* приватный режим — играем без сохранения */ }
  }

  loadState() {
    let st;
    this.rawSave = null;
    try { this.rawSave = localStorage.getItem(SAVE_KEY); st = JSON.parse(this.rawSave); } catch { return false; }
    if (!st || st.v !== 2) return false;
    // Старая ошибка поворота экрана могла записать размеры портретной раскладки рядом с координатами альбомной.
    // Признак: по записанным размерам до пола не достаёт ни одна вещь. Тогда размерам не верим — координаты уже наши.
    const ys = [...st.objs.filter((o) => !o.owner), ...st.chars].map((o) => o.y);
    if (ys.length >= 6 && Math.max(...ys) < (st.FLOOR_TOP || 0) * 0.6) { st.W = L.W; st.ROOM_H = L.ROOM_H; st.FLOOR_TOP = L.FLOOR_TOP; }
    // экран мог поменяться (полноэкранный режим, другое устройство) — переносим координаты в новую раскладку
    const fx = (x) => Math.round(Phaser.Math.Clamp(x * L.W / (st.W || L.W), 6, L.WORLD - 6));
    this.roomIdx = Phaser.Math.Clamp(st.room || 0, 0, L.ROOMS - 1);
    this.flags = st.flags || {};
    this.buddy = st.buddy || null;
    const fy = (y) => {
      const oldFloor = st.FLOOR_TOP || L.FLOOR_TOP;
      const oldRoom = st.ROOM_H || L.ROOM_H;
      const ny = y >= oldFloor
        ? L.FLOOR_TOP + (y - oldFloor) * (L.ROOM_H - L.FLOOR_TOP) / Math.max(1, oldRoom - oldFloor)
        : y * L.FLOOR_TOP / Math.max(1, oldFloor);
      return Math.round(Phaser.Math.Clamp(ny, 4, L.ROOM_H - 1));
    };
    const byUid = new Map();
    for (const c of st.chars) byUid.set(c.uid, this.spawnChar(fx(c.x), fy(c.y), c.look, { uid: c.uid, mul: c.mul, cast: c.cast }));
    for (const s of st.objs) {
      const rec = this.recOf(s.id);
      if (!rec) continue;
      const contents = (s.contents || []).map((id) => this.recOf(id)?.id).filter(Boolean);
      const it = this.spawnItem(rec, fx(s.x), fy(s.y), { uid: s.uid, lit: s.lit, contents, plots: s.plots, deco: s.deco, color: s.color, photoId: s.photoId });
      if (s.bites && it.beh.edible) { it.bites = s.bites; this.applyBites(it); }
      byUid.set(s.uid, it);
    }
    for (const s of [...st.objs, ...st.chars]) {
      const o = byUid.get(s.uid);
      if (!o) continue;
      if (s.restOn && byUid.get(s.restOn)) o.restOn = byUid.get(s.restOn);
      if (s.stain) this.stain(o, s.stain, true);
      if (s.dirty && o.kind === 'item') { o.dirty = true; o.setTint(0x9a7a5a); }
      if (s.foam) { o.foam = s.foam; this.renderFoam(o); }
      if (s.inTub && byUid.get(s.inTub)) { o.inTub = byUid.get(s.inTub); o.tubDx = s.tubDx || 0; }
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

// Крупные блоки вынесены в отдельные файлы и подключаются как методы сцены
const ENV = { L, rnd, pick, pixelMap, sfx, statHit, statTime, today, COOK, GROW, TREASURE, DREAMS, DREAM_THEMES };
installCast(Room, ENV);
installLife(Room, ENV);
installNav(Room, ENV);
installSeason(Room, ENV);
installStickers(Room, ENV);
installRepair(Room, ENV);
installDream(Room, ENV);
installTidy(Room, ENV);
installClean(Room, ENV);

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
if (import.meta.env.DEV) { window.__game = game; window.__dev = { musicTheme, setVoice, say, getVolume, getStats, exportData }; }
