// Сквозные тесты ключевых сценариев. Запуск: npm run test:e2e
// Поднимает dev-сервер (порт 5319), открывает игру в Chrome с эмуляцией Galaxy S22
// и проверяет сценарии через состояние сцены (window.__game доступен только в dev-сборке).
//
// Браузер: системный Chrome (CHROME=/путь, по умолчанию /usr/bin/google-chrome) — или браузер
// playwright, если установлен (npx playwright install chromium).
// В headless программный рендер даёт ~5 кадров/с, и игровые таймеры идут в ~10 раз медленнее,
// поэтому ожидания — по условию (waitFor), а не по времени.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 5319;
const URL = `http://localhost:${PORT}/`;
let server;
let browser;
let page;
const errors = [];

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(URL)).ok) return; } catch { /* ещё стартует */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev-сервер не поднялся');
}

/** Выполнить функцию в сцене комнаты: fn(scene) -> значение. */
const room = (fn, arg) => page.evaluate(([src, a]) => {
  const s = window.__game.scene.getScene('room');
  return new Function('s', 'a', `return (${src})(s, a);`)(s, a);
}, [fn.toString(), arg]);

/** Ждать, пока fn(scene) не станет истинным. */
const waitFor = (fn, arg, timeout = 90000) => page.waitForFunction(([src, a]) => {
  const s = window.__game?.scene?.getScene('room');
  return s && s.objs && new Function('s', 'a', `return (${src})(s, a);`)(s, a);
}, [fn.toString(), arg], { timeout, polling: 250 });

async function freshRoom() {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor((s) => s.objs.length > 10);
}

before(async () => {
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
  await waitServer();
  const exe = process.env.CHROME || '/usr/bin/google-chrome';
  browser = await chromium.launch({
    executablePath: existsSync(exe) ? exe : undefined,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  page = await (await browser.newContext({ viewport: { width: 780, height: 360 }, deviceScaleFactor: 3 })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
  await page.goto(URL);
  await freshRoom();
});

after(async () => {
  await browser?.close();
  if (server) try { process.kill(-server.pid); } catch { /* уже остановлен */ }
});

test('комната загружается: персонажи, кухня, котёл, альбом', async () => {
  const st = await room((s) => ({
    chars: s.objs.filter((o) => o.kind === 'char').length,
    kitchen: s.objs.some((o) => o.x >= 293 && o.beh?.cauldron),
    album: s.objs.some((o) => o.beh?.album),
  }));
  assert.equal(st.chars, 2);
  assert.ok(st.kitchen, 'котёл на кухне');
  assert.ok(st.album, 'альбом в комнате');
});

test('еда по кусочку: укус, остаток в руке', async () => {
  await room((s) => { const c = s.objs.find((o) => o.kind === 'char'); s.feed(c, s.spawnItem(s.findRec('apple'), 60, 80)); });
  await waitFor((s) => s.objs.find((o) => o.kind === 'char').slots.hand?.bites === 1);
});

test('надеть корону на голову', async () => {
  const ok = await room((s) => {
    const c = s.objs.filter((o) => o.kind === 'char')[1];
    s.wear(c, 'head', s.spawnItem(s.findRec('crown'), c.x, 40));
    return c.slots.head?.rec.subject;
  });
  assert.equal(ok, 'crown');
});

test('розовое зелье красит волосы в розовый', async () => {
  await room((s) => { const c = s.objs.filter((o) => o.kind === 'char')[1]; s.drinkPotion(c, s.spawnItem(s.byId.get('potion-pink'), 200, 80)); });
  await waitFor((s) => s.objs.filter((o) => o.kind === 'char')[1].look.hair === '#f28fb5');
});

test('котёл: яблоко + звезда = золотое яблоко, запись в альбоме', async () => {
  await room((s) => {
    const pot = s.objs.find((o) => o.beh?.cauldron);
    pot.contents = [s.findRec('apple').id, s.findRec('star').id];
    s.brew(pot);
  });
  await waitFor((s) => s.alchemy.found['apple + star']?.result === 'golden apple');
});

test('переход на кухню и сохранение комнаты после перезагрузки', async () => {
  await room((s) => s.goRoom(1));
  await waitFor((s) => Math.round(s.cameras.main.scrollX) === Math.round(s.sys.game.config.width / s.cameras.main.zoom));
  await room((s) => s.saveNow());
  await page.reload();
  await waitFor((s) => s.objs.length > 10 && s.cameras.main.scrollX > 0);
});

test('желание: хочет кекс — дали кекс — желание исполнено и танец', async () => {
  await room((s) => s.goRoom(0));
  await waitFor((s) => s.cameras.main.scrollX < 1);
  await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    if (c.slots.hand) { s.removeObj(c.slots.hand); }
    s.showWish(c, 'food', s.findRec('cupcake'));
    s.feed(c, s.spawnItem(s.findRec('cupcake'), c.x, 80));
  });
  await waitFor((s) => s.wish === null);
});

test('сон: персонаж на кровати засыпает', async () => {
  await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
  });
  await waitFor((s) => s.objs.find((o) => o.kind === 'char').sleeping === true);
});

test('желание питомца: любой питомец в руки исполняет желание', async () => {
  await room((s) => {
    const c = s.objs.filter((o) => o.kind === 'char')[1];
    s.showWish(c, 'pet', s.findRec('kitten'));
    const pup = s.spawnItem(s.findRec('puppy'), c.x, c.y - 10);
    s.drop(pup, { x: c.x, y: c.y - 12 });
  });
  await waitFor((s) => s.wish === null);
});

test('каталог: витрина 2 страницы, кубик перемешивает, «недавние» запоминают', async () => {
  const st = await room((s) => {
    s.cat = 'food'; s.mode = 'curated'; s.buildView();
    const curated = s.view.map((r) => r.subject);
    s.mode = 'shuffle'; s.buildView();
    const shuffled = s.view.map((r) => r.subject);
    s.tossIn(s.findRec('banana'));
    s.cat = 'recent'; s.buildView();
    return { curated, shuffled, recent: s.view.map((r) => r.subject), perPage: s.perPage };
  });
  assert.equal(st.curated.length, 24);
  assert.equal(st.curated[0], 'strawberry');
  assert.equal(st.shuffled.length, 24);
  assert.ok(!st.shuffled.includes('strawberry'), 'в случайной подборке нет витринных');
  assert.equal(st.recent[0], 'banana');
  assert.ok(st.perPage >= 10);
});

test('нет ошибок в консоли', () => {
  assert.deepEqual(errors, []);
});
