// Ящик предметов: вкладки, подборки, «недавние», кнопка музыки.
// Методы сцены Room (вынесены из main.js без изменений логики).
import { musicPlaying } from './sfx.js';
import { L, CAT_ICON, FAVORITES, VIEW_SIZE, seededShuffle, pixelMap } from './core.js';

export function installDrawer(Room) {
  Object.assign(Room.prototype, {
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
    },
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
    },
    addRecent(rec) {
      this.recent = [rec.id, ...this.recent.filter((id) => id !== rec.id)].slice(0, VIEW_SIZE);
      try { localStorage.setItem('pixel-house-recent', JSON.stringify(this.recent)); } catch { /* ignore */ }
    },
    drawMusicIcon() {
      const on = musicPlaying();
      this.musicIcon.clear();
      pixelMap(this.musicIcon, ['..XXXX', '..X..X', '..X..X', '..X..X', 'XXX.XX', 'XXX.XX', '.X..X.'], ...this.musicIconAt, on ? 0xfff07a : 0x8f6fa3);
      this.musicBtn.setFillStyle(on ? 0x6b4a7e : 0x3a2546);
    },
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
    },
  });
}
