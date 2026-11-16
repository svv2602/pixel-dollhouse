// Цветные зелья, нарисованные в коде. У каждого цвета — свой постоянный эффект
// (причина → следствие: ребёнок запоминает, что делает каждое зелье).
import { outline } from './furniture.js';

export const POTIONS = [
  { color: 'pink', liquid: ['#ff7ab8', '#e0559a', '#ffc2de'] },   // розовые волосы
  { color: 'green', liquid: ['#5fe08a', '#38b866', '#b8f7cc'] },  // вырасти / вернуться
  { color: 'yellow', liquid: ['#ffd84a', '#e0b020', '#fff2a8'] }, // взлететь
  { color: 'blue', liquid: ['#5ac4f2', '#2f96cc', '#bfeaff'] },   // замёрзнуть
  { color: 'purple', liquid: ['#b47cf2', '#8a52cc', '#e2ccff'] }, // новый цвет одежды
  { color: 'rainbow', liquid: null },                              // радуга
];

const RAINBOW = ['#ff6b6b', '#ffb84a', '#ffe66b', '#6be08a', '#5ac4f2', '#b47cf2'];

function drawPotion(p) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true }); // контур читает пиксели
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  // пробка и горлышко
  for (let x = 6; x <= 9; x++) { px(x, 1, '#b07a4e'); px(x, 2, '#8d5a3b'); }
  for (let y = 3; y <= 5; y++) for (let x = 6; x <= 9; x++) px(x, y, '#eaf6ff');
  // круглая колба: центр (7.5, 10), радиус 5
  for (let y = 5; y <= 15; y++) {
    for (let x = 1; x <= 14; x++) {
      const d = (x - 7.5) ** 2 + (y - 10) ** 2;
      if (d > 5.6 ** 2 || y > 15) continue;
      let col = '#eaf6ff';                      // пустое стекло сверху
      if (y >= 8) {
        if (p.liquid) col = y >= 13 ? p.liquid[1] : p.liquid[0];
        else col = RAINBOW[Math.min(RAINBOW.length - 1, Math.max(0, Math.floor((x - 2) / 2)))];
      }
      if (y === 8 && p.liquid) col = p.liquid[2]; // поверхность жидкости
      px(x, y, col);
    }
  }
  px(4, 9, '#ffffff'); px(4, 10, '#ffffff'); px(5, 8, '#ffffff'); // блик
  outline(c);
  return c;
}

/** Текстуры и записи каталога для цветных зелий. */
export function makePotions(scene) {
  const recs = [];
  for (const [order, p] of POTIONS.entries()) {
    const key = `potion_${p.color}`;
    if (!scene.textures.exists(key)) {
      const c = drawPotion(p);
      scene.textures.addCanvas(key, c);
      scene.textures.addCanvas(`${key}_icon`, c);
    }
    recs.push({
      id: `potion-${p.color}`, subject: `${p.color} potion`, cat: 'magic', tags: ['magic', 'potion'],
      tex: key, potionColor: p.color, bbox: [0, 0, 15, 15], order,
    });
  }
  return recs;
}
