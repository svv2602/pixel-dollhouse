// Локации и дорога между ними. Мир — одна лента комнат (см. places.js); камера, свайпы и стрелки ходят
// только по комнатам своей локации. В другую локацию ведут:
//  • указатель у калитки (в саду у дома и во дворе села) — тап, и едем;
//  • карта (кнопка-домик): значки локаций сверху, под ними комнаты выбранной;
//  • повозка: она всегда переезжает вместе с игроком и встаёт у калитки. Всё, что в неё положили,
//    и все, кто на ней сидит, приезжают с ней — так урожай из села попадает на кухню.
// Кукла, с которой играли последней, приходит следом сама (как и между комнатами дома).
import Phaser from 'phaser';
import { PLACES, placeOf, placeByKey, gateOf } from './places.js';

export function installTravel(Room, { L, sfx }) {
  Object.assign(Room.prototype, {
    /** Локация, в которой сейчас игрок. */
    placeNow() { return placeOf(this.targetRoom ?? 0); },

    /** Границы прокрутки камеры: только комнаты своей локации. */
    camRange() { const p = this.placeNow(); return [p.first * L.W, p.last * L.W]; },

    /** Номер комнаты, прижатый к своей локации (свайп и стрелки за её край не выводят). */
    inPlace(idx) { const p = this.placeNow(); return Phaser.Math.Clamp(idx, p.first, p.last); },

    /** Вызывается из create(): указатели у калиток (не предметы — их нельзя унести или убрать). */
    initTravel() {
      this.travelling = false;
      this.portals = [];
      for (const p of PLACES) {
        const others = PLACES.filter((x) => x !== p);
        const s = this.add.image(Math.round(gateOf(p) * L.W + L.W * p.sign), L.FLOOR_TOP + 3, `sign_${others[0].key}`)
          .setOrigin(0.5, 1).setDepth(-7.5).setInteractive();
        s.portal = others.length === 1 ? others[0].key : 'map'; // локаций больше двух — указатель открывает карту
        this.portals.push(s);
      }
      // пока никуда не ездили — указатель подпрыгивает с искорками
      this.time.addEvent({
        delay: 3100, loop: true, callback: () => {
          if (this.flags.tried?.travel || this.travelling || this.dress || this.albumUi || this.mapUi) return;
          const s = this.portals.find((x) => this.visible(x));
          if (!s || Math.random() < 0.4) return;
          this.tweens.add({ targets: s, y: s.y - 3, duration: 130, yoyo: true, repeat: 1, onComplete: () => { s.y = L.FLOOR_TOP + 3; } });
          this.fxSparks.explode(4, s.x, s.y - s.displayHeight);
        },
      });
    },

    portalTap(s) {
      if (s.portal === 'map') this.openMap(); else this.goPlace(s.portal);
    },

    /** В другую локацию — к её калитке. */
    goPlace(key) {
      const p = placeByKey(key);
      if (p && p !== this.placeNow()) this.travel(gateOf(p));
    },

    /** Повозка переезжает к калитке локации вместе с седоками (груз лежит внутри). */
    cartMove(dest) {
      const cart = this.objs.find((o) => o.beh?.cart && !o.dragging);
      if (!cart) return null;
      const riders = this.objs.filter((o) => o.restOn === cart);
      const x = Math.round(gateOf(dest) * L.W + L.W * dest.cart);
      const y = Math.round(Phaser.Math.Clamp(cart.y, L.FLOOR_TOP + 16, L.ROOM_H - 1));
      for (const r of riders) { r.x += x - cart.x; r.y += y - cart.y; }
      cart.x = x;
      cart.y = y;
      return { cart, loaded: riders.length > 0 || cart.contents.length > 0 };
    },

    /**
     * Дорога в комнату другой локации: экран темнеет, по нему катится повозка, светлеет уже на месте.
     * Если повозка едет не пустой, приезжаем к калитке — туда, где она встанет: груз и седоки на виду.
     */
    travel(idx) {
      if (this.travelling) return;
      const dest = placeOf(idx);
      const from = this.placeNow();
      if (dest === from) { this.goRoom(idx); return; }
      this.travelling = true;
      this.press = null;
      this.closeMap();
      if (this.jam?.size) this.jamEnded();
      if (this.wish) this.clearWish(false);
      const { W, H } = L;
      const back = dest.first < from.first; // обратно — повозка катится влево
      const D = 29000;
      const fix = (o, d = 1) => o.setDepth(D + d).setScrollFactor(0);
      const shade = fix(this.add.rectangle(0, 0, W, H, 0x2b1d2e, 0).setOrigin(0), 0);
      this.tweens.add({
        targets: shade, fillAlpha: 1, duration: 250,
        onComplete: () => {
          const moved = this.cartMove(dest);
          const room = moved?.loaded ? gateOf(dest) : idx;
          const cam = this.cameras.main;
          this.tweens.killTweensOf(cam);
          cam.scrollX = room * W;
          this.targetRoom = room;
          const y = Math.round(H * 0.6);
          const road = fix(this.add.rectangle(0, y, W, 2, 0x6b4a7e).setOrigin(0));
          const icon = fix(this.add.image(Math.round(W / 2), y - 40, dest.icon).setScale(3));
          const wagon = fix(this.add.image(back ? W + 30 : -30, y, moved?.loaded ? 'cart_full' : 'cart').setOrigin(0.5, 1).setFlipX(back), 2);
          sfx.clop();
          this.tweens.add({
            targets: wagon, x: back ? -30 : W + 30, duration: 900,
            onUpdate: () => { wagon.y = y - (Math.floor(wagon.x / 7) % 2 ? 1 : 0); }, // потряхивает на кочках
            onComplete: () => {
              road.destroy(); icon.destroy(); wagon.destroy();
              this.tweens.add({
                targets: shade, fillAlpha: 0, duration: 250,
                onComplete: () => {
                  shade.destroy();
                  this.travelling = false;
                  this.arrived();
                  this.hintDone('travel');
                  if (moved?.loaded) this.hintDone('cart');
                  this.save();
                },
              });
            },
          });
        },
      });
    },
  });
}
