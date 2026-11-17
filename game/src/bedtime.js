// Мягкий таймер сна (родительская зона): «через N минут — спокойной ночи».
// Время идёт, только пока игра на экране. За минуту до конца куклы начинают зевать; когда время вышло —
// наступает ночь, звучит колыбельная, игра сама переходит в спальню (из другой локации — едет домой),
// кукла, с которой играли, и те, кто уже в спальне, ложатся в кровать. Облачка снов, желания, приманки
// и автобус в это время молчат. Ничего не запрещается: утро (тап по окну) будит дом, и отсчёт идёт заново.
import { R, placeOf } from './places.js';
import { RX } from './core.js';

const KEY = 'pixel-house-bedtime';
export const BEDTIME_CHOICES = [0, 10, 15, 20, 30, 45, 60];

/** Сколько минут до сна выбрано в родительской зоне (0 — выключено). */
export function getBedtime() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}
export function setBedtime(min) {
  try { if (min) localStorage.setItem(KEY, String(min)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  played = 0; // новый выбор — отсчёт с начала
}

// секунды игры с запуска (переживают перестройку сцены при повороте; перезапуск приложения — заново)
let played = 0;
/** Сколько секунд осталось до сна (null — таймер выключен). */
export function bedtimeLeft() {
  const m = getBedtime();
  return m ? Math.max(0, m * 60 - played) : null;
}

export function installBedtime(Room, { L, sfx, statHit }) {
  const roomOf = (o) => Math.floor(o.x / L.W);
  Object.assign(Room.prototype, {
    /** Вызывается из create(). */
    initBedtime() {
      this.bedtime = false;
      this.time.addEvent({ delay: 1000, loop: true, callback: () => this.bedtimeTick() });
    },

    bedtimeTick() {
      const m = getBedtime();
      if (!m || this.bedtime || document.hidden || document.getElementById('parent-zone')) return;
      played += 1;
      const left = m * 60 - played;
      // последняя минута: куклы на экране по очереди зевают
      if (left > 0 && left <= 60 && left % 12 === 0) {
        const c = this.objs.find((o) => o.kind === 'char' && this.visible(o) && this.idle(o));
        if (c) { sfx.yawn(); this.face(c, '_yawn', 1100); }
      }
      if (left <= 0) this.startBedtime();
    },

    /** Время вышло: ночь, колыбельная, домой в спальню и в кровать. */
    startBedtime() {
      if (this.bedtime) return;
      this.bedtime = true;
      statHit('bedtime');
      if (this.dreaming) this.abortDream?.();
      this.closeChoices?.();
      if (this.dress) this.closeDressUp();
      // после поездки можно оказаться у калитки (повозка с грузом) — тогда ещё дойти до спальни
      const tuck = () => {
        if (this.curRoom !== R.bedroom) this.goRoom(R.bedroom);
        this.time.delayedCall(700, () => this.tuckIn());
      };
      if (placeOf(this.curRoom ?? 0).key !== 'home') {
        this.travel(R.bedroom);
        this.time.delayedCall(2600, tuck);
      } else {
        this.goRoom(R.bedroom);
        tuck();
      }
    },

    /** Ночь в спальне: кукла, с которой играли, и кто уже здесь — в кровать (по двое-трое на кровать). */
    tuckIn() {
      if (!this.bedtime || !this.objs) return;
      this.applyNight(true, true);
      const room = R.bedroom;
      const beds = this.objs.filter((o) => o.kind === 'item' && roomOf(o) === room && RX.bedLike.test(o.rec.subject) && !o.dragging);
      if (!beds.length) return;
      const buddy = this.objs.find((o) => o.kind === 'char' && o.uid === this.buddy);
      const here = this.objs.filter((o) => o.kind === 'char' && roomOf(o) === room && o !== buddy);
      const sleepers = [buddy, ...here].filter((c) => c && !c.dragging && !c.inTub && !c.sleeping).slice(0, beds.length * 3);
      sleepers.forEach((c, i) => {
        const bed = beds[Math.floor(i / 3) % beds.length];
        if (roomOf(c) !== room) return; // кукла ещё не дошла (идёт следом) — ляжет сама, когда её уложат
        const k = i % 3;
        c.x = Math.round(bed.x - bed.displayWidth / 2 + 8 + k * Math.max(4, (bed.displayWidth - 16) / 2));
        c.y = Math.round(bed.y - bed.displayHeight * 0.3);
        c.restOn = bed;
        c.awakeUntil = this.time.now + 450 + i * 300;
      });
      this.save();
    },

    /** Утро после «спокойной ночи»: всё снова как обычно, отсчёт — с начала. */
    bedtimeOver() {
      if (!this.bedtime) return;
      this.bedtime = false;
      played = 0;
    },
  });
}
