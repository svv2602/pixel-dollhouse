// Полноэкранные экраны: альбом открытий и гардероб.
// Методы сцены Room (вынесены из main.js без изменений логики).
import Phaser from 'phaser';
import { sfx } from './sfx.js';
import { makeCharTextures, HAIR, DRESS, SKIN, HAIR_STYLE_KEYS, OUTFIT_KEYS } from './character.js';
import { RECIPE_GROUPS } from './pots.js';
import { L, pixelMap } from './core.js';

export function installScreens(Room) {
  Object.assign(Room.prototype, {
    recImage(rec, x, y) {
      return (rec.tex ? this.add.image(x, y, `${rec.tex}_icon`) : this.add.image(x, y, rec.cat, rec.frame)).setOrigin(0.5, 1);
    },
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
    },
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
      // клетки страницы; у котла они сгруппированы по местам: перед группой — клетка со значком места (дом, село, город, море,
      // «привези издалека», свои открытия) — видно, что ещё не открыто и куда за этим ехать
      let cells = entries.map((e, idx) => ({ e, idx }));
      if (tabs[u.tab].key === 'recipe') {
        const all = cells;
        cells = [];
        for (const [place, mark] of RECIPE_GROUPS) {
          const group = all.filter((c) => (c.e.place || 'home') === place);
          if (group.length) cells.push({ head: mark }, ...group);
        }
      }
      const cell = 20;
      const cols = Math.max(1, Math.floor((W - 36) / cell));
      const y0 = 25;
      const rowsN = Math.max(1, Math.floor((H - y0 - 30) / cell));
      const per = cols * rowsN;
      const pages = Math.max(1, Math.ceil(cells.length / per));
      u.page = (u.page + pages) % pages;
      const x0 = Math.floor((W - cols * cell) / 2);
      cells.slice(u.page * per, (u.page + 1) * per).forEach(({ e, idx, head }, i) => {
        const cx = x0 + (i % cols) * cell;
        const cy = y0 + Math.floor(i / cols) * cell;
        if (head) { add(this.add.rectangle(cx, cy, 18, 18, 0x8a52cc).setOrigin(0)); icon(head, cx + 9, cy + 16); return; }
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
    },
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
    },
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
    },
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
    },
    onDressUi(ui) {
      const d = this.dress;
      if (!d) return;
      if (ui.dressDone) { this.closeDressUp(); return; }
      if (!ui.dress) return;
      const { field, value } = ui.dress;
      if (d.ch.look[field] === value) return;
      d.ch.look = { ...d.ch.look, [field]: value };
      this.charTex(d.ch);
      d.ch.setTexture(d.ch.key);
      d.preview.setTexture(d.ch.key);
      sfx.wear();
      this.tweens.add({ targets: d.preview, y: d.preview.y - 4, duration: 90, yoyo: true });
      this.buildDressRows();
    },
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
    },
  });
}
