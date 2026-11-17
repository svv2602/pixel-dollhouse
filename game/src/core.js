// Общие таблицы и правила игры: раскладка экрана (L), поведение предметов по названию (RX, behaviorOf),
// подсказки, желания, рецепты плиты, мелкие помощники. Без сцены — их читают main.js и модули-примеси.
import Phaser from 'phaser';
import { RAKES } from './tidy.js';
import { ROOMS, R } from './places.js';
import { VILLAGE_HINTS, VILLAGE_LURES } from './village.js';
import { CITY_HINTS, CITY_LURES } from './city.js';
import { SEA_HINTS, SEA_LURES } from './sea.js';
import { PARK_HINTS, PARK_LURES } from './park.js';
import { PLAYROOM_HINTS, PLAYROOM_LURES } from './playroom.js';


// =====================================================================
// Геометрия: мир измеряется в «арт-пикселях» (1 = один пиксель спрайта).
// Канвас — в физических пикселях устройства, камера увеличивает мир
// в ЦЕЛОЕ число раз (P). Так каждый пиксель спрайта — ровный квадрат P×P,
// без дробного растяжения и «зернистости». Всё в сцене рисуется с масштабом 1.
// =====================================================================
export const L = {};
export const DRAWER_H = 40;

/** Размер канваса в физических пикселях. Игра всегда альбомная: в портрете экран закрыт просьбой
 *  повернуть телефон, а раскладку считаем сразу как для повёрнутого — координаты вещей не зависят от поворота. */
export function screenSize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(window.innerWidth, window.innerHeight);
  const h = Math.min(window.innerWidth, window.innerHeight);
  return { dpr, dw: Math.round(w * dpr), dh: Math.round(h * dpr), h };
}

export function computeLayout() {
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
  // мир — лента комнат шириной в экран: комнаты дома, за ними — комнаты других локаций (см. places.js)
  L.ROOMS = ROOMS.length;
  L.WORLD = L.W * L.ROOMS;
  L.WINDOWS = [L.WINDOW, { ...L.WINDOW, x: L.W + L.WINDOW.x }, { ...L.WINDOW, x: R.playroom * L.W + L.WINDOW.x }]; // окна спальни, кухни и игровой
  // солнце/луна в каждой уличной комнате: тап меняет день и ночь
  L.SUNS = ROOMS.filter((r) => r.outdoor).map((r) => ({ x: r.idx * L.W + L.W - 26, y: 5, w: 14, h: 14 }));
  L.SUN = L.SUNS[0]; // сад у дома
}
computeLayout();

export const SAVE_KEY = 'pixel-house-v3'; // v3: крупная мебель (v2 — арт-пиксели, v1 — старая система координат)

export const CAT_ORDER = ['food', 'drink', 'clothing', 'toy', 'animal', 'furniture', 'kitchen', 'garden', 'magic', 'music', 'vehicle'];
export const CAT_ICON = {
  food: 'strawberry', drink: 'glass of milk', clothing: 'crown', toy: 'teddy bear', animal: 'kitten',
  furniture: 'sofa', kitchen: 'teapot', garden: 'sunflower', magic: 'potion bottle', music: 'toy piano', vehicle: 'toy car',
};

// Витрина: что показывать первым в каждой вкладке (остальное — следом по алфавиту)
export const FAVORITES = {
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
export const WISH_FOOD = ['cupcake', 'apple', 'strawberry', 'ice cream cone', 'chocolate chip cookie', 'banana', 'slice of pizza', 'glazed donut', 'watermelon slice'];
export const WISH_WEAR = ['crown', 'tiara', 'party hat', 'flower crown', 'bunny ear headband'];
export const WISH_PET = ['kitten', 'puppy', 'rabbit', 'hamster'];

// Плита/духовка: что во что превращается (сырое -> приготовленное)
export const COOK = {
  'egg': 'fried egg', 'brown egg': 'fried egg', 'potato': 'baked potato', 'ear of corn': 'buttered corn cob',
  'slice of bread': 'slice of toast', 'chicken drumstick': 'fried chicken drumstick', 'apple': 'slice of apple pie',
  'pair of cherries': 'cherry pie', 'cherry': 'cherry pie', 'blueberry': 'blueberry muffin', 'banana': 'banana bread loaf',
  'wedge of cheese': 'grilled cheese sandwich', 'sack of rice': 'bowl of white rice', 'pumpkin': 'pumpkin pie',
  'tomato': 'bowl of tomato soup', 'onion': 'bowl of onion soup', 'button mushroom': 'bowl of mushroom soup',
  'loaf of bread': 'garlic bread', 'sausage link': 'hot dog', 'strawberry': 'strawberry rhubarb pie', 'peach': 'peach cobbler',
  'sweet potato': 'potato wedges', 'hamburger patty': 'hamburger', 'broccoli': 'steamed broccoli',
  'cabbage': 'bowl of vegetable soup', 'carrot': 'bowl of vegetable soup', 'lemon': 'lemon tart',
};
// Холодильник: что выпадает по тапу (сырое для плиты, фрукты для блендера, немного кислого и острого)
export const FRIDGE = ['egg', 'glass of milk', 'wedge of cheese', 'tomato', 'carrot', 'apple', 'strawberry', 'banana', 'lemon',
  'pair of cherries', 'potato', 'broccoli', 'sausage link', 'slice of bread', 'blueberry', 'watermelon slice', 'peach',
  'orange', 'onion', 'button mushroom', 'chili pepper', 'pineapple', 'mango', 'pear', 'bunch of grapes', 'lime'];
// Вкусы: кислое морщит, острое обжигает, а у каждого персонажа есть два нелюбимых овоща («фу!»)
export const SOUR = /\b(lemon|lime|grapefruit|pickle)\b/;
export const HOT = /chili|jalapeno|hot sauce|wasabi/;
export const DISLIKE = ['broccoli', 'onion', 'button mushroom', 'cabbage', 'radish', 'eggplant'];
// Подсказки-облачка «что взять → куда»: персонаж просит о том, чего ещё не пробовали в его комнате.
// room — номер комнаты (или список номеров, или 'home' — любая комната дома); seq — картинки по очереди (id/предмет каталога или 'tex:ключ текстуры).
export const HINTS = {
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
Object.assign(HINTS, VILLAGE_HINTS, CITY_HINTS, SEA_HINTS, PARK_HINTS, PLAYROOM_HINTS); // подсказки села, города, моря и парка — рядом с их механиками
// Облачка с кроватью («хочу спать», сон, прыжки на кровати) — после показа берут паузу, см. noteBed()
export const BED_HINTS = new Set(['dream', 'bounce']);
export const SWEET = /cake|cookie|candy|lollipop|donut|cupcake|ice cream|chocolate|macaron|muffin|\bpie\b|waffle|pancake|\btart\b|cobbler/;
// Что подпрыгивает с искорками, пока его ни разу не трогали (ключ — как в HINTS)
export const LURES = [['fridge', (b) => b.fridge], ['smoothie', (b) => b.blender], ['bubbles', (b) => b.tub], ['toilet', (b) => b.toilet],
  ['makeup', (b) => !!b.makeup], ['teeth', (b) => b.toothbrush], ['mic', (b) => b.mic], ['disco', (b) => b.disco],
  ['robot', (b) => b.robot], ['wash', (b) => b.washer], ['bounce', (b) => b.bigBed], ['chest', (b) => b.chest], ['photo', (b) => b.camera], ['swing', (b) => b.swing], ['dig', (b) => b.shovel]];
LURES.push(...VILLAGE_LURES, ...CITY_LURES, ...SEA_LURES, ...PARK_LURES, ...PLAYROOM_LURES);
// Сундук с сюрпризами: что выскакивает по тапу
export const TOYBOX = ['teddy bear', 'beach ball', 'rubber duck', 'kite', 'yo-yo', 'spinning top', 'toy robot', 'rag doll', 'nesting doll',
  'jack-in-the-box', 'toy castle', 'soccer ball', 'pinwheel', 'toy car', 'balloon', 'toy train engine', 'toy sailboat'];
// Любимые игрушки питомцев (у каждого своя — по номеру)
export const PET_TOYS = ['beach ball', 'ball of yarn', 'rubber duck', 'teddy bear', 'soccer ball', 'balloon'];

// Темы снов: что персонаж держит в руке, засыпая, — тот мир и снится первым (world — ключ мира в dreamworlds.js);
// items — сувениры этого мира: их приносят из сна, они же — страница альбома наклеек;
// rare — редкие сувениры: их дарит только житель мира, чьё желание исполнили
export const DREAM_THEMES = [
  { world: 'sea', match: /fish|shell|whale|octopus|starfish|seahorse|boat|duck|crab|dolphin|jellyfish|pearl/, items: ['goldfish', 'whale', 'octopus', 'seashell', 'starfish', 'seahorse', 'dolphin', 'pearl'], rare: ['black pearl', 'crystal turtle', 'sea turtle'] },
  { world: 'planet', match: /star|moon|wand|rocket|comet|planet|orb|saucer|robot/, items: ['star', 'crescent moon', 'shooting star', 'toy rocket', 'crystal ball', 'flying saucer', 'moon rabbit', 'jar of stardust'], rare: ['star crystal', 'star-shaped medal', 'morning star'] },
  { world: 'forest', match: /book|crown|tiara|fairy|castle|unicorn|potion|album|mushroom|flower/, items: ['unicorn', 'fairy', 'crown', 'toy castle', 'magic wand', 'tiara', 'glowcap mushroom'], rare: ['golden acorn', 'fairy queen', 'flower crown'] },
  { world: 'candy', match: /cake|cookie|candy|lollipop|donut|cupcake|ice cream|chocolate|macaron/, items: ['cupcake', 'lollipop', 'cotton candy', 'candy cane', 'macaron', 'glazed donut'], rare: ['candy necklace', 'ice cream sundae', 'golden apple'] },
  { world: 'toys', match: /teddy|plush|kitten|puppy|cat|dog|rabbit|bunny|pony|panda|hamster|owl|doll|toy|ball/, items: ['kitten', 'puppy', 'rabbit', 'panda', 'pony', 'teddy bear', 'toy robot', 'toy train engine'], rare: ['puzzle cube', 'medal on ribbon', 'balloon dog'] },
  { world: 'ice', match: /snow|\bice\b|penguin|polar|sled|mitten|scarf|frost/, items: ['snowflake', 'penguin', 'snow globe', 'ice crystal', 'sled', 'polar bear'], rare: ['snowy owl', 'arctic fox', 'snowflake ornament'] },
  { world: 'clouds', match: /cloud|kite|balloon|bird|rainbow|feather|\bsun\b|airplane|pinwheel/, items: ['rainbow', 'cloud sheep', 'bluebird', 'kite', 'sun', 'hot air balloon'], rare: ['pot of gold', 'winged bunny', 'sky jellyfish'] },
];

// Утренний сувенир, если заснули без предмета в руке
export const DREAMS = ['unicorn', 'rainbow', 'star', 'cupcake', 'kitten', 'crown', 'shooting star', 'teddy bear', 'butterfly'];

// Неаппетитное и странное для 6–7 лет — в ящике не показываем
export const HIDE = /apple core|banana peel|wrapper|century egg|cracked egg|sea cucumber|chamber pot|toilet|plunger|jar of beetles|mystery stew|old boot|trash/;

// ---------- поведение предметов по названию ----------
export const RX = {
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

/**
 * Запись каталога: спрайт из датасета (items.json) или предмет, нарисованный в коде (у него есть tex).
 * @typedef {object} ItemRec
 * @property {string} id          стабильный: slug(subject)-sourceRow, у нарисованных — своё имя ('rockhorse')
 * @property {string} subject     английское название; по словам в нём behaviorOf выводит поведение
 * @property {string} cat         вкладка ящика: food, drink, clothing, toy, animal, furniture, kitchen, garden, magic, music, vehicle, people
 * @property {string[]} tags      edible, potion, furniture…
 * @property {number} [frame]     кадр в атласе категории (у спрайтов датасета)
 * @property {string} [tex]       ключ текстуры (у нарисованных в коде)
 * @property {number[]} [bbox]    [x0, y0, x1, y1] непрозрачной области — посадка шапок
 * @property {number} [order]     порядок среди своих предметов в ящике
 * @property {boolean} [hidden]   в ящике не показывается (появляется только в игре)
 * @property {Partial<Behavior>} [beh] поведение, заданное прямо в записи; кладётся поверх выведенного
 */

/**
 * Поведение предмета (o.beh). Основные флаги — ниже; модули локаций добавляют свои (coop, elephant, rocker…).
 * @typedef {object} Behavior
 * @property {boolean} edible   еда и напитки
 * @property {boolean} potion   зелье: эффект по цвету
 * @property {boolean} head     надевается на голову
 * @property {boolean} face     очки
 * @property {boolean} container кладут внутрь, тап высыпает
 * @property {boolean} pet      питомец: ходит, ест с пола, носит шапки
 * @property {boolean} furniture мебель (на неё ставят, урна её не берёт)
 * @property {boolean} wall     висит на стене
 * @property {boolean} flat     ковёр, лужа — всегда снизу
 * @property {boolean} cauldron котёл (в каждой локации свой вид)
 * @property {{dy: number, lo: number, hi: number, behind?: boolean, stand?: boolean}} [perch]
 *   на это садятся: dy — высота сиденья, lo..hi — где по ширине, behind — седок позади стенки, stand — стоят
 */

/**
 * @param {ItemRec} rec
 * @returns {Behavior}
 */
export function behaviorOf(rec) {
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
    ...rec.beh, // у предметов, нарисованных в коде, поведение можно задать прямо в записи (см. villageart.js)
  };
}

export const rnd = (a, b) => a + Math.random() * (b - a);
/** Цвет, наполовину смешанный с белым, как строка '#rrggbb' (пенка коктейля). */
export const lightHex = (c) => `#${[16, 8, 0].map((sh) => Math.round((((c >> sh) & 255) + 255) / 2).toString(16).padStart(2, '0')).join('')}`;
export const VIEW_SIZE = 24; // предметов в одной подборке вкладки = 2 страницы по 12

/** Детерминированное перемешивание (одна и та же витрина при каждом запуске). */
export function seededShuffle(arr, seedStr) {
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
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Рисует пиксельную картинку из строк ('X' = пиксель) в Graphics. */
export function pixelMap(g, rows, x, y, color) {
  g.fillStyle(color);
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === 'X') g.fillRect(x + dx, y + dy, 1, 1); }));
}
