// Навигация: кнопка-домик открывает карту — локации и их комнаты (видно, где какая кукла; тап — перейти),
// а ящик подсвечивает вкладку и ячейку с тем, о чём кукла просит в облачке.

import { PLACES, ROOMS, placeByKey } from './places.js';

export function installNav(Room, { L, pixelMap, sfx, statHit }) {
  Object.assign(Room.prototype, {
    buildMapBtn() {
      const b = this.add.rectangle(2, 2, 17, 15, 0x8a52cc, 0.9).setOrigin(0).setDepth(19000).setScrollFactor(0).setInteractive();
      b.setStrokeStyle(1, 0xffffff, 0.9);
      b.ui = { map: true };
      const g = this.add.graphics().setDepth(19001).setScrollFactor(0);
      pixelMap(g, ['.....X.....', '....XXX....', '...XXXXX...', '..XXXXXXX..', '.XXXXXXXXX.', '..XXXXXXX..', '..XX.X.XX..', '..XX.X.XX..', '..XXXXXXX..'], 5, 5, 0xffffff);
      this.mapBtn = [b, g];
    },

    /** Карта: сверху значки локаций, под ними — комнаты той, что выбрана (по умолчанию — где сейчас игрок). */
    openMap(view = null) {
      if (this.dress || this.albumUi || this.mapUi || this.travelling) return;
      sfx.page();
      statHit('map');
      const { W, H } = L;
      const place = placeByKey(view) || this.placeNow();
      const parts = [];
      const add = (o, d = 30001) => { parts.push(o.setDepth(d).setScrollFactor(0)); return o; };
      const bg = add(this.add.rectangle(0, 0, W, H, 0x2b1d2e, 0.9).setOrigin(0).setInteractive(), 30000);
      bg.ui = { mapClose: true };
      // локации
      const tw = 34;
      const tx0 = Math.floor((W - tw * PLACES.length - 6 * (PLACES.length - 1)) / 2);
      PLACES.forEach((p, k) => {
        const x = tx0 + k * (tw + 6);
        const tab = add(this.add.rectangle(x, 3, tw, 28, p === place ? 0xc48ff2 : 0x4a3157).setOrigin(0).setInteractive());
        tab.setStrokeStyle(1, p === this.placeNow() ? 0xfff07a : 0xffffff, 0.9);
        tab.ui = { mapPlace: p.key };
        add(this.add.image(x + tw / 2, 17, p.icon).setScale(2), 30002);
      });
      // комнаты выбранной локации
      const rooms = ROOMS.filter((r) => r.place === place.key);
      const n = rooms.length;
      const gap = 4;
      const cw = Math.min(64, Math.floor((W - 12 - gap * (n - 1)) / n));
      const ch = Math.min(66, H - 44);
      const x0 = Math.floor((W - cw * n - gap * (n - 1)) / 2);
      const y0 = 34 + Math.floor((H - 38 - ch) / 2);
      const cur = Math.round(this.cameras.main.scrollX / W);
      rooms.forEach((r, i) => {
        const x = x0 + i * (cw + gap);
        add(this.add.rectangle(x - 2, y0 - 2, cw + 4, ch + 4, r.idx === cur ? 0xffffff : 0x4a3157).setOrigin(0));
        const wallH = Math.round(ch * 0.62);
        add(this.add.rectangle(x, y0, cw, wallH, r.colors[0]).setOrigin(0));
        add(this.add.rectangle(x, y0 + wallH, cw, ch - wallH, r.colors[1]).setOrigin(0));
        add(this.add.image(x + Math.floor(cw / 2), y0 + wallH + 2, r.icon).setOrigin(0.5, 1).setScale(2), 30002);
        // кто сейчас в комнате — портреты внизу карточки
        const who = this.objs.filter((c) => c.kind === 'char' && c.cast && Math.floor(c.x / W) === r.idx).slice(0, 3);
        who.forEach((c, k) => add(this.add.image(x + 10 + k * 14, y0 + ch - 1, `cast_${c.cast}_icon`).setOrigin(0.5, 1), 30003 + k));
        const hit = add(this.add.rectangle(x - 2, y0 - 2, cw + 4, ch + 4, 0xffffff, 0.001).setOrigin(0).setInteractive(), 30010);
        hit.ui = { mapRoom: r.idx };
      });
      this.mapUi = { parts, place: place.key };
    },

    closeMap() {
      if (!this.mapUi) return;
      this.mapUi.parts.forEach((o) => o.destroy());
      this.mapUi = null;
    },

    onMapUi(ui) {
      if (ui.map) { this.openMap(); return; }
      this.closeMap();
      if ('mapPlace' in ui) this.openMap(ui.mapPlace); // другая локация: показать её комнаты
      else if ('mapRoom' in ui) this.goRoom(ui.mapRoom); // комната другой локации — туда едут (см. travel.js)
      else sfx.page();
    },

    // ------------------------------------------------------------ подсветка желания в ящике
    buildGlow() {
      const mk = () => {
        const r = this.add.rectangle(0, 0, 18, 18).setStrokeStyle(1, 0xfff07a).setDepth(20002).setVisible(false);
        r.isFilled = false;
        this.tweens.add({ targets: r, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
        return r;
      };
      this.tabGlow = mk();
      this.slotGlow = mk();
    },

    /** Предмет каталога, который кукла просит прямо сейчас (еда, украшение, питомец). */
    wishTarget() {
      const w = this.wish;
      return w && w.rec && !w.rec.tex && ['food', 'wear', 'pet'].includes(w.type) ? w.rec : null;
    },

    updateWishGlow() {
      if (!this.tabGlow || !this.tabs) return;
      const rec = this.wishTarget();
      const tab = rec && this.cat !== rec.cat ? this.tabs.find((t) => t.ui.tab === rec.cat) : null;
      this.tabGlow.setVisible(!!tab);
      if (tab) this.tabGlow.setPosition(tab.x, tab.y).setSize(tab.width + 2, 20).setOrigin(0.5);
      const slot = rec ? this.slots.find((s) => s.visible && s.drawerRec?.id === rec.id) : null;
      this.slotGlow.setVisible(!!slot);
      if (slot) this.slotGlow.setPosition(slot.x, L.SLOT_Y).setSize(20, 20).setOrigin(0.5);
    },
  });
}
