// Реестр локаций и комнат. Мир — одна лента комнат шириной в экран; локация — её отрезок.
// Камера ходит только внутри своей локации, между локациями — карта, автобусная остановка у калитки или повозка.
//
// Комнаты только ДОПИСЫВАЮТСЯ в конец (и новые локации тоже): координаты вещей в сохранении — это место на ленте.
// Исключение — комнаты из INSERTED (ниже): их вставили в середину ленты, а загрузка старого дома сдвигает всё,
// что правее вставки, на одну комнату (save.js, migrateRooms).
//
// Поля комнаты:
//   key     — имя (R.garden — номер комнаты на ленте);
//   stat    — ячейка времени в статистике родительской зоны (5 занята снами — исторически; подписи — ROOMS в parent.js);
//   music   — номер мелодии в sfx.js;
//   outdoor — на улице: небо во всю стену, солнце/луна (тап меняет день и ночь), зимой снег;
//   icon    — картинка комнаты на карте, colors — [стена или небо, пол] для её карточки;
//   clean   — предмет, которым комната отмечена на странице наклеек «чистюля»;
//   clouds  — где облака на небе уличной комнаты (если не как в саду у дома).
// Поля локации: icon — значок на карте; gate — комната-«калитка»: там автобусная остановка (stop — доля ширины комнаты)
// и туда приезжает повозка (cart — доля ширины); card — открытка, которая один раз зовёт в эту локацию:
// who — кто из кукол на ней нарисован, pics — что ещё (ключи текстур).
export const PLACES = [
  {
    key: 'home', icon: 'place_home', gate: 'garden', stop: 0.63, cart: 0.48,
    rooms: [
      { key: 'bedroom', stat: 0, music: 0, icon: 'big_bed_icon', colors: [0xf8dce8, 0xd39a68], clean: 'big_bed' },
      { key: 'kitchen', stat: 1, music: 1, icon: 'big_cauldron_icon', colors: [0xe6f6ef, 0xe3cfae], clean: 'big_fridge' },
      { key: 'garden', stat: 2, music: 2, outdoor: true, icon: 'big_tree_icon', colors: [0x9fdcff, 0x8fd16a], clean: 'big_tree' },
      { key: 'bath', stat: 3, music: 3, icon: 'big_tub_icon', colors: [0xdff6fb, 0xd6eef6], clean: 'big_tub' },
      { key: 'hall', stat: 4, music: 4, icon: 'curtain_icon', colors: [0x3b2160, 0xa8683f], clean: 'big_stage' },
      { key: 'playroom', stat: 23, music: 10, icon: 'rockhorse_icon', colors: [0xfff0b8, 0x8fd3ff], clean: 'puppets' },
    ],
  },
  {
    key: 'village', icon: 'place_village', gate: 'yard', stop: 0.87, cart: 0.71,
    card: { who: 'granny', pics: ['farm_cow', 'farm_hen', 'coop'] },
    rooms: [
      { key: 'yard', stat: 6, music: 8, outdoor: true, clouds: [[150, 16], [205, 7]], icon: 'coop_icon', colors: [0x9fdcff, 0xd9b77a], clean: 'coop' },
      { key: 'veg', stat: 7, music: 8, outdoor: true, icon: 'scarecrow_icon', colors: [0x9fdcff, 0x8fd16a], clean: 'scarecrow' },
      { key: 'orchard', stat: 8, music: 9, outdoor: true, icon: 'peartree_icon', colors: [0x9fdcff, 0x9ad873], clean: 'peartree' },
      { key: 'field', stat: 9, music: 9, outdoor: true, icon: 'tractor_icon', colors: [0x9fdcff, 0xe8c860], clean: 'tractor' },
    ],
  },
  {
    // город: улица с остановкой (дома стоят слева, справа — сквер: там и солнце, и остановка) и четыре магазина
    key: 'city', icon: 'place_city', gate: 'street', stop: 0.89, cart: 0.7,
    card: { who: 'cook', pics: ['icecart', 'trafficlight', 'car_0'] },
    rooms: [
      { key: 'street', stat: 10, music: 10, outdoor: true, clouds: [[40, 6], [150, 4]], icon: 'trafficlight_icon', colors: [0x9fdcff, 0xc9cede], clean: 'icecart' },
      { key: 'market', stat: 11, music: 11, icon: 'shopcart_icon', colors: [0xfff3d6, 0xd8e6f0], clean: 'checkout' },
      { key: 'cafe', stat: 12, music: 11, icon: 'drinkbar_icon', colors: [0xffe3d0, 0xc98a52], clean: 'showcase' },
      { key: 'clothes', stat: 13, music: 11, icon: 'hatrack_icon', colors: [0xf3e2ff, 0xe8c9d8], clean: 'fitting' },
      { key: 'toyshop', stat: 14, music: 10, icon: 'claw_icon', colors: [0xd6f0ff, 0xf2c94c], clean: 'toystand' },
    ],
  },
  {
    // море: пляж с остановкой, открытая вода, морское дно и остров (под водой неба нет — там звучит «глубокая» мелодия снов)
    key: 'sea', icon: 'place_sea', gate: 'beach', stop: 0.88, cart: 0.66,
    card: { who: 'sailor', pics: ['palm', 'sandcastle_3', 'boat'] },
    rooms: [
      { key: 'beach', stat: 15, music: 12, outdoor: true, clouds: [[40, 8], [130, 5]], icon: 'sandcastle_3_icon', colors: [0x9fdcff, 0xf2dca0], clean: 'sandcastle' },
      { key: 'waves', stat: 16, music: 12, outdoor: true, clouds: [[60, 6], [170, 10]], icon: 'boat_icon', colors: [0x9fdcff, 0x4fb3e8], clean: 'boat' },
      { key: 'deep', stat: 17, music: 6, icon: 'sub_icon', colors: [0x2c6ab0, 0xe8d39a], clean: 'seachest' },
      { key: 'island', stat: 18, music: 12, outdoor: true, clouds: [[30, 9], [150, 6]], icon: 'palm_icon', colors: [0x9fdcff, 0xf2dca0], clean: 'campot' },
    ],
  },
  {
    // парк развлечений: зоопарк с остановкой, аквапарк (нижняя половина пола — бассейн), аттракционы и спортплощадка
    key: 'park', icon: 'place_park', gate: 'zoo', stop: 0.9, cart: 0.77,
    card: { who: 'keeper', pics: ['elephant', 'bamboo', 'carohorse_1'] },
    rooms: [
      { key: 'zoo', stat: 19, music: 13, outdoor: true, clouds: [[36, 5], [150, 3]], icon: 'elephant_icon', colors: [0x9fdcff, 0x9ad873], clean: 'elephant' },
      { key: 'aqua', stat: 20, music: 13, outdoor: true, clouds: [[60, 4], [170, 7]], icon: 'slide_icon', colors: [0x9fdcff, 0x4fc4e8], clean: 'slide' },
      { key: 'rides', stat: 21, music: 14, outdoor: true, clouds: [[120, 3], [200, 6]], icon: 'carousel_icon', colors: [0x9fdcff, 0xe8c9a0], clean: 'carousel' },
      { key: 'sport', stat: 22, music: 13, outdoor: true, clouds: [[30, 4], [140, 6]], icon: 'goal_icon', colors: [0x9fdcff, 0xd9764a], clean: 'goal' },
    ],
  },
  {
    // центр: вокзал с поездом (он возит во все локации), школа, больница и театр
    key: 'center', icon: 'place_center', gate: 'station', stop: 0.86, cart: 0.64,
    card: { who: 'conductor', pics: ['stationclock_0', 'ticketbox'] },
    rooms: [
      { key: 'station', stat: 24, music: 15, outdoor: true, clouds: [[50, 4], [160, 8]], icon: 'train_icon', colors: [0x9fdcff, 0xd9dce8], clean: 'ticketbox' },
      { key: 'school', stat: 25, music: 16, icon: 'globe_0_icon', colors: [0xdff2d8, 0xd9a874], clean: 'globe' },
      { key: 'hospital', stat: 26, music: 15, icon: 'firstaid_icon', colors: [0xe6f6fb, 0xf2f4fa], clean: 'couch' },
      { key: 'theater', stat: 27, music: 4, icon: 'tstage_0_icon', colors: [0x5a2a4a, 0x8d5a3b], clean: 'tstage' },
    ],
  },
];

/**
 * Комнаты, вставленные в середину ленты уже после того, как дома были сохранены (по порядку вставки).
 * В сохранении flags.inserted — список уже учтённых; для остальных загрузка сдвигает вещи правее вставки.
 */
export const INSERTED = ['playroom'];

/** Все комнаты по порядку на ленте: { key, idx, place, … }. */
export const ROOMS = [];
for (const p of PLACES) {
  p.first = ROOMS.length;
  for (const r of p.rooms) ROOMS.push({ ...r, idx: ROOMS.length, place: p.key });
  p.last = ROOMS.length - 1;
}
/** Номер комнаты по имени: R.garden === 2. */
export const R = Object.fromEntries(ROOMS.map((r) => [r.key, r.idx]));
export const DREAM_STAT = 5; // ячейка статистики «сны»

const clampRoom = (idx) => Math.max(0, Math.min(ROOMS.length - 1, idx));
export const roomAt = (idx) => ROOMS[clampRoom(idx)];
export const placeByKey = (key) => PLACES.find((p) => p.key === key);
/** Локация, которой принадлежит комната. */
export const placeOf = (idx) => placeByKey(roomAt(idx).place);
/** Номер комнаты-«калитки» локации: туда приезжает повозка и там стоит указатель. */
export const gateOf = (place) => R[(typeof place === 'string' ? placeByKey(place) : place).gate];
