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
  // при выгрузке страницы игра дописывает сохранение — для «чистой комнаты» это надо отключить
  await page.evaluate(() => { const s = window.__game?.scene?.getScene('room'); if (s) s.noSave = true; localStorage.clear(); });
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
    garden: s.objs.some((o) => o.beh?.gardenBed) && s.objs.some((o) => o.beh?.appleTree),
    bath: s.objs.some((o) => o.beh?.tub && o.x >= 3 * 293),
    album: s.objs.some((o) => o.beh?.album),
  }));
  assert.equal(st.chars, 5); // две свои куклы + жильцы кухни, ванной и зала
  assert.ok(st.kitchen, 'котёл на кухне');
  assert.ok(st.album, 'альбом в комнате');
  assert.ok(st.garden, 'сад с грядками и яблоней');
  assert.ok(st.bath, 'ванная с ванной');
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
  assert.equal(st.curated[0], 'party cake', 'нарисованные в коде — первыми');
  assert.ok(st.curated.includes('strawberry'), 'любимые — в витрине');
  assert.equal(st.shuffled.length, 24);
  assert.ok(!st.shuffled.includes('strawberry'), 'в случайной подборке нет витринных');
  assert.equal(st.recent[0], 'banana');
  assert.ok(st.perPage >= 10);
});

test('готовка: яйцо на плите превращается в яичницу', async () => {
  await room((s) => {
    const stove = s.objs.find((o) => o.rec?.subject === 'kitchen stove');
    const egg = s.spawnItem(s.findRec('egg'), stove.x, 40);
    s.drop(egg, { x: stove.x, y: stove.y - 10 });
  });
  await waitFor((s) => s.objs.some((o) => o.rec?.subject === 'fried egg'));
});

test('оркестр: два инструмента в комнате играют вместе', async () => {
  const n = await room((s) => {
    const band = s.objs.filter((o) => o.beh?.music && o.x < 293);
    return band.length >= 2 ? s.playBand(band) : 0;
  });
  assert.ok(n >= 2, 'в спальне есть пианино и барабан');
});

test('сон в темноте: ночь + свет выключен -> снится сон', async () => {
  await room((s) => {
    s.applyNight(true);
    for (const o of s.objs) if (o.beh?.light) o.lit = false;
    const c = s.objs.find((o) => o.kind === 'char');
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
  });
  await waitFor((s) => !!s.objs.find((o) => o.kind === 'char').dreamBubble);
  await room((s) => s.applyNight(false, true)); // утро будит
  await waitFor((s) => !s.objs.find((o) => o.kind === 'char').sleeping);
});

test('волшебное желание: подсказка рецепта исполняется варкой', async () => {
  await room((s) => {
    const c = s.objs.filter((o) => o.kind === 'char')[1];
    const key = 'egg + star';
    s.showWish(c, 'magic', null, { key, recipe: s.alchemy.recipes.get(key) });
    const pot = s.objs.find((o) => o.beh?.cauldron);
    pot.brewing = false;
    pot.contents = [s.findRec('egg').id, s.findRec('star').id];
    s.brew(pot);
  });
  await waitFor((s) => s.wish === null && s.alchemy.found['egg + star']?.result === 'golden egg');
});

test('сад: посадить клубнику → полить ×3 → собрать двойной урожай', async () => {
  const before = await room((s) => {
    const bed = s.objs.find((o) => o.beh?.gardenBed && o.plots[0] === null);
    const berry = s.spawnItem(s.findRec('strawberry'), bed.x, 40);
    s.drop(berry, { x: bed.x + -13, y: bed.y - 6 });
    s.testBed = bed;
    return s.objs.filter((o) => o.rec?.subject === 'strawberry').length;
  });
  for (let stage = 1; stage <= 3; stage++) {
    await room((s) => s.waterPlot(s.testBed, 0));
    await waitFor((s, st) => s.testBed.plots[0]?.stage === st, stage);
  }
  // считаем сразу после сбора: кролик в саду может успеть съесть урожай с травы
  const gained = await room((s) => {
    const n = () => s.objs.filter((o) => o.rec?.subject === 'strawberry').length;
    const b = n(); // кролик мог съесть клубнику с травы, пока росло, — считаем от момента сбора
    s.plotTap(s.testBed, s.testBed.x - 13);
    return n() - b;
  });
  assert.ok(before >= 0);
  assert.equal(gained, 2, 'двойной урожай');
  assert.equal(await room((s) => s.testBed.plots[0]), null);
});

test('ванная: лужа пачкает, ванна отмывает, пена и фен', async () => {
  await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const mud = s.objs.find((o) => o.beh?.puddle);
    s.drop(c, { x: mud.x, y: mud.y - 2 });
  });
  await waitFor((s) => !!s.objs.find((o) => o.kind === 'char').stain);
  await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const tub = s.objs.find((o) => o.beh?.tub);
    s.drop(c, { x: tub.x, y: tub.y - 10 });
    const foam = s.spawnItem(s.byId.get('foam-pink'), tub.x, 40);
    s.drop(foam, { x: tub.x + 5, y: tub.y - 10 });
  });
  await waitFor((s) => { const c = s.objs.find((o) => o.kind === 'char'); return !c.stain && c.inTub && s.objs.find((o) => o.beh?.tub).foam; });
  const hs = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const before = c.look.hairStyle;
    const d = s.objs.find((o) => o.rec?.id === 'hair-dryer');
    s.drop(d, { x: c.x, y: c.y - 20 });
    return [before, c.look.hairStyle];
  });
  assert.notEqual(hs[0], hs[1], 'фен меняет причёску');
});

test('день рождения: украсить торт, задуть свечи, открыть подарок', async () => {
  const st = await room((s) => {
    const cake = s.spawnItem(s.byId.get('party-cake'), 120, 85);
    s.drop(s.spawnItem(s.byId.get('icing-blue'), 120, 40), { x: 120, y: 78 });
    s.drop(s.spawnItem(s.byId.get('candles'), 120, 40), { x: 120, y: 78 });
    const lit = cake.deco.lit;
    s.tapPoint = { x: cake.x, y: cake.y - 4 };
    s.tap(cake);
    const c = s.objs.filter((o) => o.kind === 'char')[1];
    if (c.slots.hand) s.removeObj(c.slots.hand);
    s.drop(s.spawnItem(s.byId.get('gift-1'), c.x, 40), { x: c.x, y: c.y - 15 });
    return { frost: cake.deco.frost, lit, after: cake.deco.lit, toy: c.slots.hand?.rec.cat };
  });
  assert.equal(st.frost, 0x9fdcff);
  assert.equal(st.lit, true);
  assert.equal(st.after, false, 'свечи задуты');
  assert.equal(st.toy, 'toy', 'в подарке игрушка');
});

test('сны: с мишкой снятся зверята, утром — сувенир из сна', async () => {
  await room((s) => {
    s.goRoom(0);
    s.applyNight(true);
    for (const o of s.objs) if (o.beh?.light) o.lit = false;
    const c = s.objs.find((o) => o.kind === 'char');
    c.inTub = null; c.awakeUntil = 0;
    if (c.slots.hand) s.removeObj(c.slots.hand);
    s.wear(c, 'hand', s.spawnItem(s.findRec('teddy bear'), c.x, 40), true);
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
  });
  await waitFor((s) => { const c = s.objs.find((o) => o.kind === 'char'); return c.dreamTheme && c.dreamStep >= 2; });
  await room((s) => s.applyNight(false, true));
  await waitFor((s) => {
    const h = s.objs.find((o) => o.kind === 'char').slots.hand;
    return h && ['kitten', 'puppy', 'rabbit', 'panda', 'pony', 'teddy bear'].includes(h.rec.subject) && h.rec.subject !== undefined;
  });
});

test('питомцы: бантик на голову, лежанка — сон, щётка — блеск', async () => {
  const st = await room((s) => {
    s.goRoom(0);
    const pet = s.spawnItem(s.findRec('puppy'), 60, 85);
    s.drop(s.spawnItem(s.findRec('crown'), 60, 40), { x: pet.x, y: pet.y - 8 });
    const bedRec = s.byId.get('big_petbed');
    const pb = s.spawnItem(bedRec, 90, 88);
    s.drop(pet, { x: pb.x, y: pb.y - 4 });
    const cat = s.spawnItem(s.findRec('kitten'), 40, 86);
    s.brushPet(cat);
    s.testPet = pet;
    return { hat: pet.slots.pethat?.rec.subject, fitted: pet.slots.pethat?.fitted, onBed: pet.restOn === pb, shiny: cat.shinyUntil > s.time.now };
  });
  assert.equal(st.hat, 'crown');
  assert.equal(st.onBed, true);
  assert.equal(st.shiny, true);
  await waitFor((s) => s.testPet.sleeping === true);
});

test('сцена: инструменты включают слои джема и выключаются', async () => {
  const st = await room((s) => {
    const band = s.objs.filter((o) => o.beh?.music).slice(0, 2);
    band.forEach((o) => s.toggleJam(o));
    const on = s.jam.size;
    band.forEach((o) => s.toggleJam(o));
    return { on, off: s.jam.size, hasStage: s.objs.some((o) => o.rec?.id === 'big_stage') };
  });
  assert.equal(st.on, 2);
  assert.equal(st.off, 0);
  assert.ok(st.hasStage, 'сцена есть');
});

test('концертный зал: сцена в 5-й комнате, лежанка в спальне, старая сцена из сада переезжает', async () => {
  const st = await room((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const stage = s.objs.find((o) => o.rec?.id === 'big_stage');
    const bed = s.objs.find((o) => o.rec?.id === 'big_petbed');
    const fresh = { stageRoom: Math.floor(stage.x / W), bedRoom: Math.floor(bed.x / W), riders: s.objs.filter((o) => o.restOn === stage).length };
    // имитация старого сохранения: сцена с гитарой в саду, флага зала нет
    stage.x = 2 * W + 40;
    const g = s.objs.find((o) => o.restOn === stage);
    g.x = stage.x + 12;
    s.flags.hall = false;
    s.ensureHall();
    return { ...fresh, migrated: Math.floor(stage.x / W), riderRoom: Math.floor(g.x / W), stages: s.objs.filter((o) => o.rec?.id === 'big_stage').length };
  });
  assert.equal(st.stageRoom, 4);
  assert.equal(st.bedRoom, 0);
  assert.ok(st.riders >= 1, 'инструменты на сцене');
  assert.equal(st.migrated, 4);
  assert.equal(st.riderRoom, 4);
  assert.equal(st.stages, 1);
  await room((s) => s.goRoom(4));
  await waitFor((s) => Math.round(s.cameras.main.scrollX / (s.sys.game.config.width / s.cameras.main.zoom)) === 4);
});

test('кухня: холодильник выдаёт еду, блендер делает коктейль, коктейль оставляет усы', async () => {
  const st = await room((s) => {
    const fr = s.objs.find((o) => o.beh?.fridge);
    const n0 = s.objs.length;
    s.openFridge(fr);
    const popped = s.objs.length - n0;
    const bl = s.objs.find((o) => o.beh?.blender);
    s.addToBlender(bl, s.spawnItem(s.findRec('strawberry'), bl.x, bl.y - 30));
    s.addToBlender(bl, s.spawnItem(s.findRec('banana'), bl.x, bl.y - 30));
    s.testBl = bl;
    return { popped, inside: bl.contents.length };
  });
  assert.equal(st.popped, 1);
  assert.equal(st.inside, 2);
  await room((s) => s.blend(s.testBl));
  await waitFor((s) => !s.testBl.blending && s.objs.some((o) => o.beh?.smoothie));
  const sm = await room((s) => {
    const g = s.objs.find((o) => o.beh?.smoothie);
    const c = s.objs.find((o) => o.kind === 'char' && !o.busy);
    s.testCh = c;
    s.feed(c, g);
    return { color: g.color, empty: s.testBl.contents.length };
  });
  assert.ok(sm.color > 0, 'у коктейля есть цвет');
  assert.equal(sm.empty, 0);
  await waitFor((s) => !!s.testCh.look.mustache && !s.testCh.busy);
});

test('вкусы: нелюбимое — «фу» и отбрасывает, лимон — кисло, перец — горячо и просит молока', async () => {
  const st = await room((s) => {
    const c = s.testCh;
    const bad = ['broccoli', 'onion', 'button mushroom', 'cabbage', 'radish', 'eggplant'].find((x) => s.dislikes(c, x));
    const veg = s.spawnItem(s.findRec(bad), c.x, c.y);
    s.feed(c, veg);
    return { refused: c.texture.key.endsWith('_yuck'), stays: s.objs.includes(veg) };
  });
  assert.equal(st.refused, true);
  assert.equal(st.stays, true);
  await waitFor((s) => !s.testCh.busy);
  await room((s) => { s.clearWish?.(false); s.feed(s.testCh, s.spawnItem(s.findRec('chili pepper'), s.testCh.x, s.testCh.y)); });
  await waitFor((s) => s.testCh.texture.key.endsWith('_hot'));
  await waitFor((s) => s.wish?.ch === s.testCh && s.wish.rec?.subject === 'glass of milk');
});

test('котёл бахает: персонаж рядом в саже и с волосами дыбом, ванна отмывает', async () => {
  await room((s) => {
    const pot = s.objs.find((o) => o.beh?.cauldron);
    const c = s.testCh;
    c.x = pot.x + 10; c.y = pot.y;
    s.potBlast(pot, [0xff0000, 0x00ff00]);
  });
  const st = await room((s) => ({ fr: !!s.testCh.look.frazzled, stain: s.testCh.stain }));
  assert.equal(st.fr, true);
  assert.ok(st.stain);
  await room((s) => { const tub = s.objs.find((o) => o.beh?.tub); s.bathe(s.testCh, tub, tub.x); });
  await waitFor((s) => !s.testCh.look.frazzled && !s.testCh.stain && !s.testCh.look.mustache);
});

test('ванная: косметика, зубная щётка, пузыри и унитаз', async () => {
  const st = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    c.inTub = null;
    s.testCh2 = c;
    const lip = s.objs.find((o) => o.beh?.makeup === 'lips');
    const cat = s.objs.find((o) => o.beh?.makeup === 'whiskers');
    s.applyMakeup(c, lip);
    s.applyMakeup(c, cat);
    const tub = s.objs.find((o) => o.beh?.tub);
    s.blowBubbles(tub);
    const wc = s.objs.find((o) => o.beh?.toilet);
    const ball = s.spawnItem(s.findRec('beach ball'), wc.x, wc.y - 10);
    s.flushItem(wc, ball);
    return {
      mk: c.look.makeup.join(','), flushed: !s.objs.includes(ball),
      brush: !!s.objs.find((o) => o.beh?.toothbrush), bath: [!!wc, !!s.objs.find((o) => o.beh?.makeup === 'freckles')],
    };
  });
  assert.equal(st.mk, 'lips,whiskers');
  assert.equal(st.flushed, true);
  assert.equal(st.brush, true);
  assert.deepEqual(st.bath, [true, true]);
  await waitFor((s) => (s.popBubbles?.length || 0) >= 3);
  const popped = await room((s) => { const n = s.popBubbles.length; s.popBubble(s.popBubbles[0]); return n - s.popBubbles.length; });
  assert.equal(popped, 1);
  await waitFor((s) => !s.testCh2.busy);
  await room((s) => s.brushTeeth(s.testCh2));
  await waitFor((s) => s.testCh2.texture.key.endsWith('_smile'));
});

test('подсказки: в ванной просит щётку — почистили — желание исполнено, фича запомнена', async () => {
  const st = await room((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const c = s.objs.find((o) => o.kind === 'char');
    c.inTub = null; c.x = 3 * W + 60; c.busy = false;
    c.look = { ...c.look, mustache: undefined };
    const bathHints = s.hintsFor(c).sort().join(',');
    c.x = W + 60;
    const kitchenHints = s.hintsFor(c).sort().join(',');
    c.x = 3 * W + 60;
    s.clearWish(false);
    s.showHint(c, 'teeth');
    s.testCh3 = c;
    return { bathHints, kitchenHints, shown: s.wish?.hint };
  });
  assert.equal(st.bathHints, 'bubbles,makeup,teeth,toilet');
  assert.equal(st.kitchenHints, 'cook,fridge,smoothie');
  assert.equal(st.shown, 'teeth');
  await waitFor((s) => !s.testCh3.busy);
  await room((s) => s.brushTeeth(s.testCh3));
  await waitFor((s) => !s.wish && s.flags.tried?.teeth === true);
});

test('потребности: наелась — облачко с унитазом, посадили — исполнено; 3 сладости — щётка', async () => {
  await room((s) => {
    s.clearWish(false);
    const c = s.testCh3;
    c.pottyAt = 3; c.eaten = 2; c.sweets = 2; c.needs?.clear();
    s.afterMeal(c, s.findRec('cupcake'));
  });
  const needs = await room((s) => [...s.testCh3.needs].sort().join(','));
  assert.equal(needs, 'potty,teeth');
  await waitFor((s) => s.wish?.ch === s.testCh3 && s.wish.type === 'hint' && s.wish.need === true);
  await room((s) => { s.clearWish(false); s.showHint(s.testCh3, 'potty'); s.sitOnToilet(s.testCh3, s.objs.find((o) => o.beh?.toilet)); });
  const st = await room((s) => ({ wish: !!s.wish, needs: [...s.testCh3.needs].join(','), eaten: s.testCh3.eaten }));
  assert.equal(st.wish, false);
  assert.equal(st.needs, 'teeth');
  assert.equal(st.eaten, 0);
});

test('концертный зал: зритель на стуле, микрофон — песня и аплодисменты, занавес, диско', async () => {
  const st = await room((s) => {
    s.goRoom(4);
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const inHall = (o) => o.x >= 4 * W && o.x < 5 * W;
    const mic = s.objs.find((o) => o.beh?.mic);
    const ball = s.objs.find((o) => o.beh?.disco);
    const teddySeated = s.objs.some((o) => o.rec?.subject === 'teddy bear' && o.restOn?.beh?.seat && inHall(o));
    const chairs = s.objs.filter((o) => o.beh?.seat && inHall(o)).sort((a, b) => a.x - b.x);
    const c = s.objs.find((o) => o.kind === 'char' && !o.busy);
    c.inTub = null;
    s.sitOn(s.spawnItem(s.findRec('kitten'), chairs[1].x, chairs[1].y), chairs[1]);
    const stage = s.objs.find((o) => o.beh?.stage && inHall(o));
    s.onStage(c, stage, stage.x);
    s.wear(c, 'hand', mic);
    s.lastApplause = 0;
    s.testSinger = c;
    return { mic: !!mic, ball: !!ball, teddySeated, fans: s.audienceIn(4).length, onStage: c.restOn === stage };
  });
  assert.deepEqual(st, { mic: true, ball: true, teddySeated: true, fans: 2, onStage: true });
  await room((s) => s.sing(s.testSinger));
  await waitFor((s) => !s.testSinger.busy && s.lastApplause > 0 && s.flags.tried?.mic);
  const cur = await room((s) => { s.toggleCurtain(); const closed = s.flags.curtainClosed; s.toggleCurtain(); return [closed, s.flags.curtainClosed]; });
  assert.deepEqual(cur, [true, false]);
  const disco = await room((s) => { const b = s.objs.find((o) => o.beh?.disco); s.toggleDisco(b); const on = s.discoSpots?.length; s.toggleDisco(b); return [on, !!s.discoBall]; });
  assert.deepEqual(disco, [8, false]);
});

test('спальня: батут на кровати, сундук с сюрпризом, ночник-звёзды, фото на стену', async () => {
  const st = await room((s) => {
    s.goRoom(0);
    s.applyNight(false);
    const bed = s.objs.find((o) => o.beh?.bigBed);
    const c = s.objs.find((o) => o.kind === 'char');
    c.inTub = null; c.busy = false; c.sleeping = false;
    c.x = bed.x; c.y = Math.round(bed.y - bed.displayHeight * 0.3); c.restOn = bed;
    const bounced = s.bounce(bed);
    const chest = s.objs.find((o) => o.beh?.chest);
    chest.contents = [];
    const n0 = s.objs.length;
    s.openChest(chest);
    const popped = s.objs.length - n0;
    const lamp = s.objs.find((o) => o.beh?.lamp);
    lamp.lit = false;
    s.applyNight(true);
    const stars = s.nightStars?.imgs.length || 0;
    lamp.lit = true;
    s.nightLight();
    const starsOff = !s.nightStars;
    s.applyNight(false);
    s.testBedCh = c;
    return { bounced, popped, stars, starsOff, camera: !!s.objs.find((o) => o.beh?.camera) };
  });
  assert.deepEqual(st, { bounced: true, popped: 1, stars: 14, starsOff: true, camera: true });
  await waitFor((s) => !s.testBedCh.busy);
  await room((s) => { s.photosBefore = s.objs.filter((o) => o.beh?.photo).length; s.takePhoto(s.objs.find((o) => o.beh?.camera)); });
  await waitFor((s) => s.objs.filter((o) => o.beh?.photo).length === s.photosBefore + 1 && !s.snapping);
  const ph = await room((s) => { const p = s.objs.find((o) => o.beh?.photo); return { id: !!p.photoId, stored: !!s.photoStore()[p.photoId] }; });
  assert.deepEqual(ph, { id: true, stored: true });
  await waitFor((s) => s.objs.some((o) => o.beh?.photo && o.texture.key.startsWith('photo_') && o.texture.key !== 'photo_blank'));
});

test('сад: дождь поливает грядки и мочит, качели, бабочка на голову, клад лопаткой', async () => {
  const st = await room((s) => {
    s.goRoom(2);
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    s.cameras.main.scrollX = 2 * W;
    const bed = s.objs.find((o) => o.beh?.gardenBed && o.x >= 2 * W && o.x < 3 * W);
    bed.plots[2] = { id: s.findRec('tulip').id, stage: 0, watered: false };
    const c = s.objs.find((o) => o.kind === 'char');
    c.inTub = null; c.restOn = null; c.x = 2 * W + 100; c.y = 70; c.busy = false;
    if (s.flags.tried) delete s.flags.tried.dryer; // фен ещё не пробовали — мокрый точно попросит фен
    s.rain();
    const sw = s.objs.find((o) => o.beh?.swing);
    const c2 = s.objs.filter((o) => o.kind === 'char')[1];
    c2.inTub = null; c2.busy = false;
    s.sitOn(c2, sw);
    s.testRainBed = bed; s.testRainCh = c; s.testSw = sw; s.testSwCh = c2;
    return { swing: !!sw, onSwing: c2.restOn === sw, shovel: !!s.objs.find((o) => o.beh?.shovel) };
  });
  assert.deepEqual(st, { swing: true, onSwing: true, shovel: true });
  await waitFor((s) => s.testRainBed.plots[2]?.watered || s.testRainBed.plots[2]?.stage >= 1);
  await waitFor((s) => s.testRainCh.wetUntil > s.time.now && s.testRainCh.needs?.has('dryer'));
  const moved = await room((s) => { const x0 = s.testSwCh.x; s.pushSwing(s.testSw); return { amp: s.testSw.amp > 0.3, x0 }; });
  assert.equal(moved.amp, true);
  await waitFor((s, x0) => Math.abs(s.testSwCh.x - x0) >= 2, moved.x0);
  await waitFor((s) => s.butterflies.length > 0 && !!s.digSpot);
  await room((s) => s.catchButterfly(s.butterflies[0]));
  await waitFor((s) => s.butterflies.some((b) => b.onChar));
  await room((s) => {
    s.lastTreasure = null;
    const sh = s.objs.find((o) => o.beh?.shovel);
    s.drop(sh, { x: s.digSpot.x, y: s.digSpot.y });
  });
  // кролик может съесть съедобный клад с травы — проверяем сам факт находки
  await waitFor((s) => !!s.lastTreasure && !s.digSpot && s.flags.tried?.dig);
});

// ------------------------------------------------------------------ волна «качество и жизнь» (2026-11-17)
/** Имитация касания: указатель с id (как у Phaser) и координатами мира. */
const finger = (id, x, y) => ({ id, x: x * 8, y: y * 8, worldX: x, worldY: y, downTime: 1000, upTime: 2000, isDown: true });

test('второй палец не срывает перетаскивание', async () => {
  await freshRoom();
  const st = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const drum = s.objs.find((o) => o.rec?.subject === 'toy drum');
    const x0 = drum.x;
    const p1 = f(1, drum.x, drum.y - 6);
    s.onDown(p1, [drum]);
    Object.assign(p1, f(1, drum.x + 20, drum.y - 30));
    s.onMove(p1);
    const dragging = drum.dragging;
    const p2 = f(2, 60, 20);            // второй палец — на пустой стене
    s.onDown(p2, []);
    Object.assign(p1, f(1, x0 + 50, drum.y));
    s.onMove(p1);                        // первый палец продолжает нести
    const followed = drum.x - x0;
    Object.assign(p2, f(2, 90, 24));
    s.onMove(p2);                        // второй шевельнулся — предмет не прыгает к нему
    const stayed = drum.x - x0;
    s.onUp(p2);
    const stillHeld = drum.dragging;
    s.onUp(p1);
    return { dragging, followed, stayed, stillHeld, dropped: !drum.dragging, press: !!s.press };
  }, finger.toString());
  assert.equal(st.dragging, true);
  assert.ok(st.followed >= 40, `предмет идёт за первым пальцем (${st.followed})`);
  assert.equal(st.stayed, st.followed, 'второй палец предмет не двигает');
  assert.equal(st.stillHeld, true, 'отпустили второй палец — предмет всё ещё в руке');
  assert.equal(st.dropped, true);
  assert.equal(st.press, false);
});

test('занавес зала не заходит в ванную, доеденная еда радует', async () => {
  const st = await room((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const c = s.curtain[0];
    const hearts = [];
    const orig = s.fxHearts.explode.bind(s.fxHearts);
    s.fxHearts.explode = (n, ...a) => { hearts.push(n); return orig(n, ...a); };
    s.heartLog = hearts;
    const ch = s.objs.find((o) => o.kind === 'char');
    ch.busy = false;
    const food = ['glass of milk', 'glass of orange juice'].map((x) => s.findRec(x)).find((r) => r && r.subject !== s.favFood(ch));
    s.feed(ch, s.spawnItem(food, ch.x, ch.y - 20));
    s.testCh = ch;
    return { left: c.x + c._crop.x, hit: c.x + c.input.hitArea.x, hall: 4 * W };
  });
  assert.ok(st.left >= st.hall, `видимая часть занавеса начинается в зале (${st.left} >= ${st.hall})`);
  assert.ok(st.hit >= st.hall, 'и касания в ванной он не ловит');
  await waitFor((s) => !s.testCh.busy);
  assert.ok((await room((s) => s.heartLog)).includes(3), 'доела — три сердечка');
});

test('семья: жильцы в комнатах, портрет зовёт куклу, новая приходит в дом', async () => {
  const st = await room((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const roomOf = (id) => { const c = s.castChar(id); return c ? Math.floor(c.x / W) : -1; };
    s.cat = 'people';
    s.buildView();
    const before = { mia: roomOf('mia'), mom: roomOf('mom'), boy: roomOf('boy'), star: roomOf('star'), dad: roomOf('dad'), view: s.view.length };
    s.callCast('dad');   // папы в доме ещё нет
    s.callCast('star');  // певица — из зала
    return before;
  });
  assert.deepEqual(st, { mia: 0, mom: 1, boy: 3, star: 4, dad: -1, view: 8 });
  await waitFor((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    return ['dad', 'star'].every((id) => { const c = s.castChar(id); return c && !c.walking && c.x > 0 && c.x < W; });
  });
  assert.equal(await room((s) => s.objs.filter((o) => o.kind === 'char').length), 6);
});

test('кукла, с которой играли, идёт следом в соседнюю комнату; сидящая — остаётся', async () => {
  await room((s) => { const c = s.castChar('mia'); s.buddy = c.uid; s.testCh = c; s.goRoom(1); });
  await waitFor((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    return !s.testCh.walking && s.testCh.x > W && s.testCh.x < 2 * W;
  });
  assert.equal(await page.evaluate(() => window.__dev.musicTheme()), 1, 'у кухни своя мелодия');
  await room((s) => {
    s.testCh.restOn = s.objs.find((o) => o.beh?.furniture); // «сидит» — оставили нарочно
    s.goRoom(2);
    s.t0 = s.time.now;
  });
  await waitFor((s) => s.curRoom === 2 && s.time.now > s.t0 + 2500);
  const inKitchen = await room((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const r = Math.floor(s.testCh.x / W);
    s.testCh.restOn = null;
    return r;
  });
  assert.equal(inKitchen, 1);
});

test('гардероб: все причёски и наряды рисуются, портрет в ящике обновляется', async () => {
  const st = await room((s) => {
    const ch = s.castChar('zoe');
    ch.busy = false;
    s.openDressUp(ch);
    const hair = ['bob', 'long', 'pigtails', 'bun', 'short', 'ponytail', 'curly'];
    const outfits = ['dress', 'pants', 'skirt', 'pajamas', 'princess', 'swimsuit', 'overalls', 'shorts'];
    for (const h of hair) s.onDressUi({ dress: { field: 'hairStyle', value: h } });
    for (const o of outfits) s.onDressUi({ dress: { field: 'outfit', value: o } });
    const faces = ['', '_open', '_blink', '_lookl', '_lookr', '_yawn'].every((f) => s.textures.exists(ch.key + f));
    const icons = hair.every((h) => s.textures.exists(`dress_hairStyle_${h}`)) && outfits.every((o) => s.textures.exists(`dress_outfit_${o}`));
    s.closeDressUp();
    return { look: `${ch.look.hairStyle}/${ch.look.outfit}`, faces, icons, icon: s.textures.exists('cast_zoe_icon'), dress: !!s.dress };
  });
  assert.deepEqual(st, { look: 'curly/shorts', faces: true, icons: true, icon: true, dress: false });
});

test('куклы следят глазами за тем, что несут; простой оживает без ошибок', async () => {
  const st = await room((s) => {
    const ch = s.castChar('zoe');
    ch.busy = false; ch.sleeping = false;
    const it = s.spawnItem(s.findRec('teddy bear'), ch.x - 40, ch.y);
    s.gaze(it, { x: it.x, y: it.y });
    const left = ch.texture.key;
    it.x = ch.x + 40;
    s.gaze(it, { x: it.x, y: it.y });
    const right = ch.texture.key;
    s.removeObj(it);
    ch.setTexture(ch.key);
    for (let i = 0; i < 30; i++) s.idleTick();
    return { left: left.endsWith('_lookl'), right: right.endsWith('_lookr') };
  });
  assert.deepEqual(st, { left: true, right: true });
});

test('альбом наклеек: блюдо, урожай, клад и сон дают наклейки на своих страницах', async () => {
  const st = await room((s) => {
    const tabs = s.albumTabs();
    const sizes = tabs.map((t) => `${t.key}:${t.entries.length > 5}`).join(',');
    const rec = s.findRec('fried egg');
    const first = s.sticker('dish', rec, 100, 50);
    const again = s.sticker('dish', rec, 100, 50);
    s.openAlbum();
    const openedOn = s.albumUi.tab;                       // альбом открылся на странице новой наклейки
    for (let i = 0; i < tabs.length; i++) s.onAlbumUi({ albumTab: i });
    const dish = s.albumTabs()[1].entries.find((e) => e.result.subject === 'fried egg');
    s.onAlbumUi({ albumDone: true });
    return { sizes, first, again, openedOn, found: dish?.found, closed: !s.albumUi };
  });
  assert.deepEqual(st, { sizes: 'recipe:true,dish:true,plant:true,treasure:true,dream:true', first: true, again: false, openedOn: 1, found: true, closed: true });
});

test('карта комнат и подсветка желания в ящике', async () => {
  const st = await room((s) => {
    s.clearWish(false);
    s.openMap();
    const cards = s.mapUi.parts.filter((o) => o.ui && 'mapRoom' in o.ui).length;
    s.onMapUi({ mapRoom: 0 });
    const ch = s.objs.find((o) => o.kind === 'char');
    s.cat = 'toy'; s.mode = 'curated'; s.buildView();
    s.showWish(ch, 'food', s.findRec('cupcake'));
    const tabGlow = s.tabGlow.visible;
    s.cat = 'food'; s.buildView();
    const slot = s.slots.find((x) => x.drawerRec?.subject === 'cupcake');
    const res = { cards, closed: !s.mapUi, target: s.targetRoom, tabGlow, slotGlow: s.slotGlow.visible && !!slot, tabOff: !s.tabGlow.visible };
    s.clearWish(false);
    res.cleared = !s.slotGlow.visible;
    return res;
  });
  assert.deepEqual(st, { cards: 5, closed: true, target: 0, tabGlow: true, slotGlow: true, tabOff: true, cleared: true });
});

test('голоса семьи: записанная фраза звучит вместо писка', async () => {
  const ok = await page.evaluate(async () => {
    // короткий WAV (0.1 с тишины), как будто записали в родительской зоне
    const n = 800; const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    const url = `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
    const before = window.__dev.say('yum');
    await window.__dev.setVoice('yum', url);
    const after = window.__dev.say('yum');
    await window.__dev.setVoice('yum', null);
    return { before, after, gone: window.__dev.say('yum') };
  });
  assert.deepEqual(ok, { before: false, after: true, gone: false });
});

test('родительская зона: удержание шестерёнки, громкость, статистика, копия в файл и восстановление, сброс', async () => {
  await room((s) => {
    s.flags.marker = 'до копии';
    s.stat('feed');
    s.saveNow();
    s.press = { id: 1, ui: { gear: true }, t0: performance.now() - 2100 }; // палец держит шестерёнку уже 2 с
  });
  await page.waitForSelector('#parent-zone');
  assert.match(await page.textContent('#pz-stats'), /Спальня[\s\S]*Кормление/);
  await page.locator('#parent-zone [data-act=vol]').fill('30');
  assert.equal(await page.evaluate(() => window.__dev.getVolume()), 0.3);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#parent-zone [data-act=export]')]);
  const file = await download.path();
  await room((s) => { s.flags.marker = 'после копии'; s.saveNow(); });
  await page.setInputFiles('#parent-zone input[type=file]', file);   // восстановление перезагружает игру
  await waitFor((s) => s.objs.length > 10 && s.flags.marker === 'до копии');
  assert.equal(await page.evaluate(() => !!document.getElementById('parent-zone')), false);
  // сброс — долгим удержанием кнопки внутри зоны
  await room((s) => { s.press = { id: 1, ui: { gear: true }, t0: performance.now() - 2100 }; });
  await page.waitForSelector('#parent-zone');
  await page.dispatchEvent('#parent-zone [data-act=reset]', 'pointerdown');
  await waitFor((s) => s.objs.length > 10 && s.flags.marker === undefined, null, 30000);
  await page.evaluate(() => localStorage.setItem('pixel-house-volume', '1'));
});

test('новый день: посылка и подросшие грядки; зимой — ёлка и снег, после праздников ёлка убирается', async () => {
  await freshRoom();
  await room((s) => {
    const bed = s.objs.find((o) => o.beh?.gardenBed);
    bed.plots[0] = { id: s.findRec('strawberry').id, stage: 0, watered: false };
    s.saveNow();
  });
  const day = await room((s) => s.flags.day);
  assert.match(day, /^\d{4}-\d\d-\d\d$/);
  await page.evaluate(() => localStorage.setItem('pixel-house-date', '2026-11-30'));
  await page.reload();
  await waitFor((s) => s.objs.length > 10 && s.objs.some((o) => o.parcel));
  const st = await room((s) => ({ stage: s.objs.find((o) => o.beh?.gardenBed).plots[0].stage, winter: !!s.winter, tree: s.objs.some((o) => o.beh?.nyTree) }));
  assert.deepEqual(st, { stage: 3, winter: false, tree: false });
  await room((s) => s.saveNow());
  await page.evaluate(() => localStorage.setItem('pixel-house-date', '2026-12-24'));
  await page.reload();
  await waitFor((s) => s.objs.length > 10 && s.objs.some((o) => o.beh?.nyTree));
  const w = await room((s) => {
    const tree = s.objs.find((o) => o.beh?.nyTree);
    const t0 = tree.texture.key;
    s.tapTree(tree);
    s.saveNow();
    return { winter: s.winter, snow: !!s.snow, toggled: tree.texture.key !== t0, inDrawer: s.byCat.furniture.some((r) => r.nyTree), room: Math.floor(tree.x / 293) };
  });
  assert.deepEqual(w, { winter: true, snow: true, toggled: true, inDrawer: true, room: 0 });
  await page.evaluate(() => localStorage.setItem('pixel-house-date', '2027-02-01'));
  await page.reload();
  await waitFor((s) => s.objs.length > 10);
  assert.deepEqual(await room((s) => ({ tree: s.objs.some((o) => o.beh?.nyTree), winter: !!s.winter })), { tree: false, winter: false });
  await page.evaluate(() => localStorage.removeItem('pixel-house-date'));
});


test('нет ошибок в консоли', () => {
  assert.deepEqual(errors, []);
});
