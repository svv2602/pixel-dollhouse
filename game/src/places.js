// Реестр локаций и комнат. Мир — одна лента комнат шириной в экран; локация — её отрезок.
// Камера ходит только внутри своей локации, между локациями — карта, указатель у калитки или повозка.
//
// Комнаты только ДОПИСЫВАЮТСЯ в конец (и новые локации тоже): координаты вещей в сохранении — это место на ленте.
//
// Поля комнаты:
//   key     — имя (R.garden — номер комнаты на ленте);
//   stat    — ячейка времени в статистике родительской зоны (5 занята снами — исторически);
//   music   — номер мелодии в sfx.js;
//   outdoor — на улице: небо во всю стену, солнце/луна (тап меняет день и ночь), зимой снег;
//   icon    — картинка комнаты на карте, colors — [стена или небо, пол] для её карточки;
//   clean   — предмет, которым комната отмечена на странице наклеек «чистюля»;
//   clouds  — где облака на небе уличной комнаты (если не как в саду у дома).
// Поля локации: icon — значок на карте; gate — комната-«калитка»: там стоит указатель (sign — доля ширины комнаты)
// и туда приезжает повозка (cart — доля ширины).
export const PLACES = [
  {
    key: 'home', icon: 'place_home', gate: 'garden', sign: 0.63, cart: 0.48,
    rooms: [
      { key: 'bedroom', stat: 0, music: 0, icon: 'big_bed_icon', colors: [0xf8dce8, 0xd39a68], clean: 'big_bed' },
      { key: 'kitchen', stat: 1, music: 1, icon: 'big_cauldron_icon', colors: [0xe6f6ef, 0xe3cfae], clean: 'big_fridge' },
      { key: 'garden', stat: 2, music: 2, outdoor: true, icon: 'big_tree_icon', colors: [0x9fdcff, 0x8fd16a], clean: 'big_tree' },
      { key: 'bath', stat: 3, music: 3, icon: 'big_tub_icon', colors: [0xdff6fb, 0xd6eef6], clean: 'big_tub' },
      { key: 'hall', stat: 4, music: 4, icon: 'curtain_icon', colors: [0x3b2160, 0xa8683f], clean: 'big_stage' },
    ],
  },
  {
    key: 'village', icon: 'place_village', gate: 'yard', sign: 0.9, cart: 0.84,
    rooms: [
      { key: 'yard', stat: 6, music: 8, outdoor: true, clouds: [[150, 16], [205, 7]], icon: 'coop_icon', colors: [0x9fdcff, 0xd9b77a], clean: 'coop' },
      { key: 'veg', stat: 7, music: 8, outdoor: true, icon: 'scarecrow_icon', colors: [0x9fdcff, 0x8fd16a], clean: 'scarecrow' },
      { key: 'orchard', stat: 8, music: 9, outdoor: true, icon: 'peartree_icon', colors: [0x9fdcff, 0x9ad873], clean: 'peartree' },
      { key: 'field', stat: 9, music: 9, outdoor: true, icon: 'tractor_icon', colors: [0x9fdcff, 0xe8c860], clean: 'tractor' },
    ],
  },
];

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
