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

const PORT = Number(process.env.E2E_PORT) || 5319; // другой порт — чтобы два прогона не мешали друг другу
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

/** Тапнуть облачко выбора с этой картинкой; возвращает картинки всех облачков (кроме «выгрузить»). */
const choose = (icon) => room((s, icon) => {
  const picks = s.choices.parts.filter((o) => o.choice);
  const all = picks.map((o) => o.choice.icon).filter((k) => k !== 'unload').join();
  const { act } = picks.find((o) => o.choice.icon === icon).choice;
  s.closeChoices();
  act();
  return all;
}, icon);

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
  assert.equal(st.chars, 20); // две свои куклы + жильцы кухни, ванной, зала и игровой + трое в селе + трое в городе + двое у моря + двое в парке + четверо в центре
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

test('сон ночью: над спящей появляются облачка снов, утро будит', async () => {
  await room((s) => {
    s.applyNight(true);
    for (const o of s.objs) if (o.beh?.light) o.lit = false;
    const c = s.objs.find((o) => o.kind === 'char');
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
  });
  await waitFor((s) => !!s.objs.find((o) => o.kind === 'char').dreamPicks);
  await room((s) => s.applyNight(false, true)); // утро будит
  await waitFor((s) => { const c = s.objs.find((o) => o.kind === 'char'); return !c.sleeping && !c.dreamPicks && !s.dreamGroups.length; });
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
    return h && ['kitten', 'puppy', 'rabbit', 'panda', 'pony', 'teddy bear', 'toy robot', 'toy train engine'].includes(h.rec.subject);
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
    // не та, что лежит в кровати: после «сна ночью» Мия снова засыпает, и её облачка вытесняют облачка снов
    const c = s.objs.find((o) => o.kind === 'char' && !o.busy && !o.sleeping && !o.restOn);
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
    s.doorTick(); // вынули из ванны — облачко «нырнуть в море» над ней закрывается
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
  assert.equal(st.bathHints, 'bubbles,decor,dreamsea,makeup,teeth,toilet,travel,wash'); // decor — валик красит стены в комнатах дома // «в село» просятся в любой комнате дома
  assert.equal(st.kitchenHints, 'cook,decor,dreamcandy,fridge,smoothie,travel');
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
    s.castLeave(s.castChar('kid')); // малыш ушёл из дома (и из села) совсем
    s.callCast('kid');   // …и возвращается: приходит в комнату, где игрок
    s.callCast('dad');   // папа живёт в селе, в поле — придёт оттуда
    s.callCast('star');  // певица — из зала
    return before;
  });
  assert.deepEqual(st, { mia: 0, mom: 1, boy: 3, star: 4, dad: 9, view: 20 });
  await waitFor((s) => {
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    return ['dad', 'star', 'kid'].every((id) => { const c = s.castChar(id); return c && !c.walking && c.x > 0 && c.x < W; });
  });
  assert.equal(await room((s) => s.objs.filter((o) => o.kind === 'char').length), 20);
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
    const sizes = tabs.map((t) => `${t.key}:${t.entries.length}`).join(',').replace(/(recipe|dish|plant|treasure|dream):\d+/g, (m, k) => `${k}:${+m.split(':')[1] > 5}`); // «чистюля» — по наклейке на комнату (5 дома + 4 в селе), «село» — 13
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
  assert.deepEqual(st, { sizes: 'recipe:true,dish:true,plant:true,treasure:true,tidy:27,farm:13,city:19,sea:24,park:22,center:23,dream:true', first: true, again: false, openedOn: 1, found: true, closed: true });
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
  assert.deepEqual(st, { cards: 6, closed: true, target: 0, tabGlow: true, slotGlow: true, tabOff: true, cleared: true });
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
  // справка для родителей: разделы по комнатам и мирам снов; отметка «пробовали» берётся из статистики
  const help = await page.evaluate(() => {
    const row = (text) => [...document.querySelectorAll('#pz-help li')].find((li) => li.textContent.includes(text))?.querySelector('i').className;
    return {
      groups: [...document.querySelectorAll('#pz-help details')].map((d) => d.dataset.help),
      rows: document.querySelectorAll('#pz-help li').length,
      fed: row('Еду — кукле'), slide: row('Отпустить куклу на радугу'), note: row('Всё можно таскать пальцем'),
      count: document.querySelector('#pz-help details summary span').textContent,
    };
  });
  assert.equal(help.groups.length, 39);
  for (const g of ['Общее', 'Уборка', 'Спальня', 'Кухня', 'Сад', 'Ванная', 'Концертный зал', 'Дорога: село, город, море, парк, центр', 'Центр: вокзал', 'Центр: театр', 'Село: двор', 'Село: поле', 'Город: улица', 'Город: кафе', 'Город: магазин игрушек', 'Котёл везде', 'Море: пляж', 'Море: остров', 'Парк: зоопарк', 'Парк: спортплощадка', 'Сон: игрушечный мир']) assert.ok(help.groups.includes(g), `раздел справки: ${g}`);
  assert.match(await page.textContent('#pz-stats'), /Село: двор[\s\S]*Село: поле[\s\S]*Город: улица[\s\S]*Город: игрушки[\s\S]*Море: пляж[\s\S]*Море: остров/);
  assert.ok(help.rows > 80, `строк справки: ${help.rows}`);
  assert.deepEqual({ fed: help.fed, slide: help.slide, note: help.note }, { fed: 'ok', slide: 'no', note: 'na' });
  assert.match(help.count, /пробовали \d+ из \d+/);
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
    const tree = s.objs.find((o) => o.beh?.nyTree && Math.floor(o.x / 293) === 0);
    const t0 = tree.texture.key;
    s.tapTree(tree);
    s.saveNow();
    const trees = s.objs.filter((o) => o.beh?.nyTree).map((o) => Math.floor(o.x / 293)).sort((a, b) => a - b).join();
    return { winter: s.winter, snow: !!s.snow, toggled: tree.texture.key !== t0, inDrawer: s.byCat.furniture.some((r) => r.nyTree), trees, zooTex: s.textures.exists('bg_zoo') };
  });
  assert.deepEqual(w, { winter: true, snow: true, toggled: true, inDrawer: true, trees: `0,${await page.evaluate(() => window.__dev.R.street)}`, zooTex: true });
  await page.evaluate(() => localStorage.setItem('pixel-house-date', '2027-02-01'));
  await page.reload();
  await waitFor((s) => s.objs.length > 10);
  assert.deepEqual(await room((s) => ({ tree: s.objs.some((o) => o.beh?.nyTree), winter: !!s.winter })), { tree: false, winter: false });
  await page.evaluate(() => localStorage.removeItem('pixel-house-date'));
});


// ------------------------------------------------------------------ раскладка и поворот экрана (сбой 2026-11-17)
const spots = () => room((s) => {
  const at = (sub) => { const o = s.objs.find((x) => x.rec?.subject === sub); return o ? [Math.round(o.x), Math.round(o.y)] : null; };
  const ch = s.castChar('mia');
  return { bed: at('bed'), wardrobe: at('wardrobe'), clock: at('cuckoo clock'), fridge: at('refrigerator'), tub: at('clawfoot bathtub'),
    chairs: s.objs.filter((x) => x.rec?.subject === 'chair').map((x) => Math.round(x.x)).sort((a, b) => a - b),
    balloon: at('balloon'), kite: at('kite'), mia: [Math.round(ch.x), Math.round(ch.y)], roomH: s.overlay.height, repaired: s.flags.repaired || 0 };
});
/** Перезагрузить игру с подменённым сохранением (текущая страница ничего не дописывает при выгрузке). */
async function reloadWith(mutate) {
  await page.evaluate((src) => {
    const s = window.__game.scene.getScene('room');
    s.saveNow();
    s.noSave = true;
    const st = JSON.parse(localStorage.getItem('pixel-house-v3'));
    new Function('st', `(${src})(st)`)(st);
    localStorage.setItem('pixel-house-v3', JSON.stringify(st));
  }, mutate.toString());
  await page.reload();
  await waitFor((s) => s.objs.length > 10);
}

test('поворот телефона не меняет раскладку; сохранение со старой ошибкой поворота загружается как было', async () => {
  await freshRoom();
  await room((s) => {
    const ch = s.castChar('mia');
    ch.x = 140; ch.y = 88;                                             // свои перестановки: кукла и новая игрушка
    s.spawnItem(s.findRec('kite'), 210, 81);
  });
  const before = await spots();
  await page.setViewportSize({ width: 360, height: 780 });             // телефон повернули вертикально
  await page.waitForTimeout(1200);
  assert.deepEqual(await spots(), before, 'в портрете раскладка и координаты те же');
  await page.setViewportSize({ width: 780, height: 360 });
  await page.waitForTimeout(1200);
  assert.deepEqual(await spots(), before);
  // сохранение, записанное старой версией при повороте: размеры портретные, координаты альбомные
  await reloadWith((st) => { st.W = 270; st.ROOM_H = 545; st.FLOOR_TOP = 455; });
  assert.deepEqual(await spots(), before, 'размерам не верим — вещи на своих местах, починка не нужна');
});

test('дом, уехавший под потолок, сам возвращается на место; снимок «до починки» сохраняется', async () => {
  const before = await spots();
  // то, что сделала старая ошибка: всё растянуто по ширине и сжато к потолку — и уже сохранено.
  // Сбой случался до появления других локаций: в таком сохранении есть только дом, а село, город и море обставляются уже после починки
  await reloadWith((st) => {
    st.objs = st.objs.filter((o) => o.x < 5 * 293);
    st.chars = st.chars.filter((o) => o.x < 5 * 293);
    for (const k of ['village', 'cast3', 'city', 'cast4', 'sea', 'cast5', 'park', 'cast6', 'pots', 'inserted', 'playroom', 'cast7']) delete st.flags[k]; // и игровой тогда ещё не было
    for (const o of [...st.objs, ...st.chars]) {
      o.x = Math.round(Math.max(6, Math.min(5 * 293 - 6, o.x * 293 / 270)));
      o.y = Math.round(Math.max(4, Math.min(94, o.y * 55 / 455)));
    }
  });
  const after = await spots();
  assert.equal(after.repaired, 1);
  // село и город появились в починенном доме: всё на своих местах, повозка — в саду
  const farm = await room((s) => {
    const at = (pred) => { const o = s.objs.find(pred); return o ? [Math.floor(o.x / 293), o.y > 55] : null; };
    return { coop: at((o) => o.beh?.coop), mill: at((o) => o.beh?.mill), cart: at((o) => o.beh?.cart), granny: at((o) => o.cast === 'granny'), bins: s.objs.filter((o) => o.beh?.bin).length, claw: at((o) => o.beh?.claw), cook: at((o) => o.cast === 'cook'),
      sub: at((o) => o.beh?.sub), pots: s.objs.filter((o) => o.beh?.cauldron).map((o) => Math.floor(o.x / 293)).sort((a, b) => a - b).join() };
  });
  assert.deepEqual(farm, { coop: [6, true], mill: [9, true], cart: [2, true], granny: [6, true], bins: 23, claw: [14, true], cook: [12, true], sub: [17, true], pots: '1,6,12,18,21,24' });
  // стулья и шарик у правой стены зала при сбое упёрлись в край мира — и всё равно встают на свои места
  for (const k of ['bed', 'wardrobe', 'clock', 'fridge', 'tub', 'chairs', 'balloon']) assert.deepEqual(after[k], before[k], `${k} — точно на прежнем месте`);
  for (const k of ['kite', 'mia']) {
    assert.ok(Math.abs(after[k][0] - before[k][0]) <= 2, `${k}: по горизонтали почти точно (${after[k][0]} / ${before[k][0]})`);
    assert.ok(Math.abs(after[k][1] - before[k][1]) <= 6, `${k}: по высоте — на полу рядом с прежним местом (${after[k][1]} / ${before[k][1]})`);
  }
  const snaps = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('pixel-house-snapshots') || '{}')));
  assert.ok(snaps.some((k) => k.startsWith('repair-')), 'снимок до починки есть');
  // второй вариант сбоя: всё на нижней кромке пола, включая полки
  await reloadWith((st) => { for (const o of [...st.objs, ...st.chars]) { o.x = Math.round(o.x * 270 / 293); o.y = 94; } });
  const again = await spots();
  assert.equal(again.repaired, 2);
  for (const k of ['bed', 'wardrobe', 'clock', 'fridge', 'tub']) assert.deepEqual(again[k], before[k], `${k} — снова на месте`);
  // обычный дом починка не трогает
  await reloadWith(() => {});
  assert.equal((await spots()).repaired, 2);
});


// ---------------------------------------------------------------- сны и мечты
/** Выполнить функцию в сцене сна: fn(dream) -> значение. */
const dream = (fn, arg) => page.evaluate(([src, a]) => {
  const d = window.__game.scene.getScene('dream');
  return new Function('d', 'a', `return (${src})(d, a);`)(d, a);
}, [fn.toString(), arg]);

/** Ждать, пока сцена сна активна и fn(dream) истинно. */
const waitDream = (fn, arg, timeout = 120000) => page.waitForFunction(([src, a]) => {
  const g = window.__game;
  const d = g?.scene?.getScene('dream');
  return d && g.scene.isActive('dream') && d.actors?.length && new Function('d', 'a', `return (${src})(d, a);`)(d, a);
}, [fn.toString(), arg], { timeout, polling: 250 });

/** Ждать возвращения домой: сцена сна остановлена, дом проснулся. */
const waitHome = () => page.waitForFunction(() => {
  const g = window.__game;
  const s = g.scene.getScene('room');
  return g.scene.isActive('room') && !g.scene.isActive('dream') && !s.dreaming;
}, null, { timeout: 120000, polling: 250 });

/** Солнышко: проснуться; вернуть, что кукла принесла из сна. */
async function wakeUp(uid) {
  const sub = await dream((d) => { d.leave(); return d.brought?.subject; });
  await waitHome();
  await waitFor((s, a) => s.objs.find((o) => o.uid === a.uid)?.slots.hand?.rec.subject === a.sub, { uid, sub });
  return sub;
}

test('сон: над спящей — три облачка миров; тап по облачку переносит в сон, солнышко будит с сувениром', async () => {
  await freshRoom();
  const uid = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    s.wear(c, 'hand', s.spawnItem(s.findRec('seashell'), c.x, 40), true); // с ракушкой снится море
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
    // пауза перед сном — полсекунды (а не 1,5–3 с): дальше её усыпляет частая проверка dozeTick, не дожидаясь sleepTick
    c.pause = Math.round(c.awakeUntil - s.time.now);
    c.early = !!c.sleeping;
    c.awakeUntil = s.time.now - 1;
    s.dozeTick();
    c.dozed = c.sleeping && !!c.dreamPicks;
    return c.uid;
  });
  await waitFor((s, id) => s.objs.find((o) => o.uid === id).dreamPicks?.picks.every((p) => p.bubble.scale === 1), uid);
  const st = await room((s, id) => {
    const c = s.objs.find((o) => o.uid === id);
    const g = c.dreamPicks;
    const b = g.picks[1].bubble;
    const k = s.cameras.main.zoom / window.devicePixelRatio;
    return { night: s.night, pause: c.pause, early: c.early, dozed: c.dozed, worlds: g.picks.map((p) => p.world), xs: g.picks.map((p) => p.bubble.x), tap: { x: b.x * k, y: (b.y - 10) * k } };
  }, uid);
  assert.equal(st.night, false, 'облачка появляются и днём');
  assert.deepEqual({ pause: st.pause, early: st.early, dozed: st.dozed }, { pause: 450, early: false, dozed: true }, 'засыпает через полсекунды, облачка — сразу');
  assert.equal(st.worlds.length, 3);
  assert.equal(new Set(st.worlds).size, 3, 'три разных мира');
  assert.equal(st.worlds[1], 'sea', 'мир по предмету в руке — в середине');
  assert.ok(st.xs.every((x) => x - 14 >= 20 && x + 14 <= 293), `облачка не залезают на кнопку-домик и за край: ${st.xs}`);
  await page.mouse.click(st.tap.x, st.tap.y); // настоящее касание
  await waitDream((d) => d.key === 'sea' && d.dolls.length === 1);
  const inside = await dream((d) => ({ tail: !!d.dolls[0].tail, exit: !!d.exitBtn, roomAsleep: window.__game.scene.isSleeping('room') }));
  assert.deepEqual(inside, { tail: true, exit: true, roomAsleep: true });
  // ракушка на дне открывается — подарок можно дать кукле в руку и унести домой
  const gift = await dream((d) => {
    d.actors.find((a) => a.texture.key === 'dw_clam').tap();
    const it = d.gifts.at(-1);
    d.startDrag(it);
    const doll = d.dolls[0];
    it.x = doll.x; it.y = doll.y - 10;
    d.drop(it, { x: doll.x, y: doll.y - 10 });
    return { held: doll.hand === it, sub: it.rec.subject };
  });
  assert.ok(gift.held, 'подарок у куклы в руке');
  const brought = await wakeUp(uid);
  assert.equal(brought, gift.sub, 'домой приносят то, что держали во сне');
  const after = await room((s, a) => {
    const c = s.objs.find((o) => o.uid === a.uid);
    return { sticker: s.stickers.has('dream', a.sub), seen: s.flags.dreamSeen.sea, tried: s.flags.tried.dream, tail: !!c.dmark?.tail, pause: Math.round((c.awakeUntil - s.time.now) / 1000) <= 3 };
  }, { uid, sub: brought });
  assert.deepEqual(after, { sticker: true, seen: true, tried: true, tail: true, pause: true });
  // осталась на кровати — через три секунды снова спит, и облачка возвращаются (раньше ждали 20 секунд)
  await waitFor((s, id) => { const c = s.objs.find((o) => o.uid === id); return c.sleeping && !!c.dreamPicks; }, uid);
});

test('миры снов: в каждом из семи работает своя механика, из каждого возвращаются с сувениром', async () => {
  const uid = await room((s) => s.objs.find((o) => o.kind === 'char').uid);
  const enter = async (w) => {
    assert.ok(await room((s, a) => s.enterDream(s.objs.find((o) => o.uid === a.uid), a.w, 'bed'), { uid, w }), `вход в ${w}`);
    await waitDream((d, k) => d.key === k && d.dolls.length > 0, w);
  };
  const giftsOf = () => dream((d) => d.gifts.length);

  // лес: фея поднимает куклу в воздух; четыре гриба зажжены — подарок; единорог катает с радужным следом
  await enter('forest');
  await dream((d) => { d.y0 = d.dolls[0].y; d.tap(d.actors.find((a) => a.rec?.subject === 'fairy')); });
  await waitDream((d) => d.dolls[0].y < d.y0 - 12);
  await dream((d) => { d.halt(d.dolls[0]); d.dolls[0].y = d.y0; for (const m of d.mush) m.tap(); });
  assert.equal(await giftsOf(), 1, 'все грибы зажжены — подарок');
  // тап по поляне — кукла идёт туда; стоит она ниже грибов и не закрывает их
  const walk = await dream((d) => { const doll = d.dolls[0]; const low = doll.y > d.mush[1].y + 20; d.groundTap({ x: 250, y: 125 }); return { low, moving: doll.moving }; });
  assert.deepEqual(walk, { low: true, moving: true });
  await waitDream((d) => Math.abs(d.dolls[0].x - 250) < 3 && !d.dolls[0].moving);
  // прятки: двое сидят за кустами; тап по кусту — зверёк выскакивает; пустой куст роняет ягоду
  const fo = await dream((d) => {
    const hidden = d.critters.filter((a) => a.hid).length;
    const b = d.bushes.find((x) => x.hides);
    const a = b.hides;
    d.tap(b);
    const out = !a.hid && a.visible && !b.hides;
    const n0 = d.gifts.length;
    d.tap(b);
    const berry = d.gifts.at(-1);
    return { hidden, out, more: d.gifts.length - n0, berry: berry.rec.subject, edible: berry.edible, tried: d.isTried('bush') && d.isTried('mush') };
  });
  assert.deepEqual({ ...fo, berry: ['strawberry', 'blueberry', 'pair of cherries'].includes(fo.berry) }, { hidden: 2, out: true, more: 1, berry: true, edible: true, tried: true });
  // желание жителя: над ним облачко с картинкой; принесли это — редкий сувенир
  const wi = await dream((d) => {
    d.clearWish();
    d.nextWish();
    const w = d.wishNow;
    if (!w) return { had: false };
    const it = d.gift(100, 60, w.sub, { keep: true });
    d.halt(it);
    d.startDrag(it);
    it.x = w.who.x; it.y = w.who.y - 6;
    d.drop(it, { x: w.who.x, y: w.who.y - 6 });
    return { had: true, bubble: w.bubble.texture.key, granted: !d.wishNow && d.wishes === 1, gone: !it.active, rare: d.rare.length };
  });
  assert.deepEqual(wi, { had: true, bubble: 'bubble', granted: true, gone: true, rare: 3 });
  await waitDream((d) => d.gifts.some((g) => d.rare.includes(g.rec.subject)));
  // событие визита: бабочки летят через поляну; первая пойманная дарит подарок
  const ev = await dream((d) => {
    const n0 = d.actors.length;
    d.def.events[1](d);
    const guests = d.actors.filter((a) => a.kind === 'guest');
    const came = d.actors.length - n0;
    const g0 = d.gifts.length;
    d.tap(guests[0]); d.tap(guests[1]);
    return { came, moving: guests.every((a) => a.moving), gifts: d.gifts.length - g0 };
  });
  assert.deepEqual(ev, { came: 5, moving: true, gifts: 1 });
  await dream((d) => d.mount(d.dolls[0], d.uni));
  await waitDream((d) => d.trail.length > 3 && d.dolls[0].mount === d.uni && Math.abs(d.dolls[0].x - d.uni.x) < 2);
  await wakeUp(uid);

  // планета: кратер дарит подарок; инопланетяне повторяют прыжок; тарелка поднимает лучом; ракета взлетает
  await enter('planet');
  await dream((d) => { d.actors.find((a) => a.texture.key === 'dw_crater').tap(); d.tap(d.dolls[0]); });
  assert.equal(await giftsOf(), 1);
  await waitDream((d) => d.aliens.some((a) => a.jumping));
  await waitDream((d) => !d.dolls[0].jumping);
  await dream((d) => { d.y0 = d.dolls[0].y; d.ufo.tap(); });
  await waitDream((d) => d.ufo.lift && d.dolls[0].y < d.y0 - 6);
  await dream((d) => { d.ufo.cancel(); d.dolls[0].y = d.y0; d.rocket.tap(d.rocket); });
  await waitDream((d) => d.rocket.flying && d.rocket.y < d.GY - 10);
  // мелодия из трёх нот: не та нота сбрасывает, верный порядок — подарок
  const tn = await dream((d) => {
    const seq = [...d.tune.seq];
    d.tune.playing = false; d.tune.got = [];
    d.tap(d.aliens[(seq[0] + 1) % 3]);
    const wrong = d.tune.got.length;
    for (const i of seq) d.tap(d.aliens[i]);
    return { len: seq.length, wrong, n0: d.gifts.length };
  });
  assert.deepEqual({ len: tn.len, wrong: tn.wrong }, { len: 3, wrong: 0 });
  await waitDream((d, n) => d.isTried('tune') && d.gifts.length > n && !d.tune.playing, tn.n0);
  await wakeUp(uid);

  // море: рыбки плывут за пальцем; кит катает
  await enter('sea');
  await dream((d) => { d.fx0 = d.fish.map((f) => f.x); d.def.skyDown(d, { x: 30, y: 40 }); });
  // палец остаётся на воде (рыбки, доплыв, разбредаются; на загруженной машине они не успевали собраться все разом)
  await waitDream((d) => { d.def.skyMove(d, { x: 30, y: 40 }); return d.fish.every((f) => Math.abs(f.x - 30) < 30); });
  await dream((d) => d.mount(d.dolls[0], d.actors.find((a) => a.rec?.subject === 'whale')));
  await waitDream((d) => d.dolls[0].mount && Math.abs(d.dolls[0].y - (d.dolls[0].mount.y - 13)) < 2);
  // сундук заперт, ключ у краба: тап по крабу — ключ падает; ключ на сундук — он открывается, первой выпадает жемчужина
  const ch = await dream((d) => {
    const k = d.ckey;
    const carried = k.carrier === d.crab;
    d.tap(d.chest);
    const shut = !d.chest.open;
    d.tap(d.crab);
    const dropped = !k.carrier;
    d.halt(k);
    d.startDrag(k);
    k.x = d.chest.x0; k.y = d.chest.y - 8;
    d.drop(k, { x: d.chest.x0, y: d.chest.y - 8 });
    return { world: d.key, carried, shut, dropped, open: d.chest.open, key: !!d.ckey };
  });
  assert.deepEqual(ch, { world: 'sea', carried: true, shut: true, dropped: true, open: true, key: false });
  await waitDream((d) => d.gifts.some((g) => g.rec.subject === 'pearl'));
  await wakeUp(uid);

  // облака: кукла стоит на облаке; облако-батут подбрасывает; звезда падает подарком; пальцем рисуется радуга
  await enter('clouds');
  const cl = await dream((d) => {
    const doll = d.dolls[0];
    const on = doll.plat === d.plats[0];
    d.plats[0].tap();
    const jumped = doll.jumping;
    d.actors.find((a) => a.rec?.subject === 'star').tap();
    d.def.skyDown(d, { x: 100, y: 30 });
    d.def.skyMove(d, { x: 140, y: 36 });
    return { on, jumped, gifts: d.gifts.length, trail: d.trail.length };
  });
  assert.ok(cl.on && cl.jumped, 'кукла на облаке и прыгает вместе с ним');
  assert.equal(cl.gifts, 1);
  assert.ok(cl.trail >= 10, 'радуга нарисована');
  await waitDream((d) => !d.dolls[0].jumping);
  // отпустили куклу в небе над другим облаком — она приземляется на него
  await dream((d) => { const doll = d.dolls[0]; const p = d.plats[2]; d.startDrag(doll); doll.x = p.x; doll.y = p.y - 30; d.drop(doll, { x: 5, y: 5 }); });
  await waitDream((d) => d.dolls[0].plat === d.plats[2] && !d.dolls[0].jumping);
  // воздушный шар: сесть можно только в корзину (не «ловит» кукол по всему небу); кукла — перед шаром, за стенкой корзины
  const bl = await dream((d) => {
    const doll = d.dolls[0];
    d.strokes.length = 0;
    d.startDrag(doll); doll.x = d.bal.x; doll.y = d.bal.y - 50;
    d.drop(doll, { x: d.bal.x, y: d.bal.y - 55 });
    const high = doll.mount === d.bal;
    d.halt(doll);
    d.startDrag(doll); doll.x = d.bal.x; doll.y = d.bal.y - 4;
    d.drop(doll, { x: d.bal.x, y: d.bal.y - 10 });
    return { high, inBasket: doll.mount === d.bal, over: d.bal.ride.over, front: d.balFront.texture.key };
  });
  assert.deepEqual(bl, { high: false, inBasket: true, over: true, front: 'dw_basket' });
  // радуга-горка: нарисовали пальцем, отпустили куклу на неё — съезжает вниз
  await dream((d) => {
    const doll = d.dolls[0];
    d.startDrag(doll);
    for (const a of d.actors) if (a.ride) { d.halt(a); a.x = 290; a.y = 124; } // чтобы под рукой не оказалось, на чём кататься
    d.def.skyDown(d, { x: 60, y: 30 });
    d.def.skyMove(d, { x: 120, y: 80 });
    doll.x = 70; doll.y = 41; d.x0 = 70;
    d.drop(doll, { x: 70, y: 38 });
  });
  await waitDream((d) => d.isTried('slide') && d.isTried('rainbow') && d.dolls[0].x > d.x0 + 30 && !d.dolls[0].busy);
  await wakeUp(uid);

  // конфеты: от домика откусывают; сладость съедают — её же и приносят домой; тучка сыплет конфеты
  await enter('candy');
  const cd = await dream((d) => {
    const house = d.actors.find((a) => a.texture.key === 'dw_house_0');
    house.tap();
    const it = d.gifts.at(-1);
    const doll = d.dolls[0];
    d.startDrag(it);
    it.x = doll.x; it.y = doll.y - 12;
    d.drop(it, { x: doll.x, y: doll.y - 12 });
    return { bites: house.bites, tex: house.texture.key, edible: it.edible, ate: doll.lastAte?.subject, sub: it.rec.subject };
  });
  assert.deepEqual({ bites: cd.bites, tex: cd.tex, edible: cd.edible }, { bites: 1, tex: 'dw_house_1', edible: true });
  assert.equal(cd.ate, cd.sub);
  await waitDream((d) => !d.dolls[0].busy);
  await dream((d) => d.actors.find((a) => a.texture.key === 'dw_cloud').tap());
  await waitDream((d) => d.gifts.length >= 4);
  // шоколадный фонтан: шоколадку окунули — мишка её съел и стал шоколадным; на сладкой тучке катаются
  const ca = await dream((d) => {
    const f = d.fountain;
    const bear = d.actors.find((a) => a.gummy);
    f.cool = 0;
    d.tap(f);
    const choc = d.gifts.at(-1);
    d.halt(choc);
    d.startDrag(choc); choc.x = f.x; choc.y = f.y - 10;
    d.drop(choc, { x: f.x, y: f.y - 10 });
    const dipped = !!choc.dipped && choc.isTinted;
    d.halt(bear); bear.x = 30; bear.y = d.H - 6;
    d.halt(choc);
    d.startDrag(choc); choc.x = bear.x; choc.y = bear.y - 6;
    d.drop(choc, { x: bear.x, y: bear.y - 6 });
    d.mount(d.dolls[0], d.candyCloud);
    return { sub: choc.rec.subject, dipped, eating: bear.busy, riding: d.dolls[0].mount === d.candyCloud, tried: d.isTried('fountain') && d.isTried('cloud') };
  });
  assert.deepEqual(ca, { sub: 'chocolate bar', dipped: true, eating: true, riding: true, tried: true });
  await waitDream((d) => d.actors.some((a) => a.gummy && a.texture.key.startsWith('dw_hue_')));
  assert.equal(await wakeUp(uid), cd.sub, 'съеденное во сне лакомство — утром в руке');
  assert.ok(await room((s, id) => !!s.objs.find((o) => o.uid === id).look.mustache, uid), 'из конфетной страны — с шоколадными усами');

  // лёд: снеговик собирается по порядку; на катке скользят
  await enter('ice');
  const ice = await dream((d) => {
    const { base, mid, head } = d.snow;
    const put = (b) => { d.startDrag(b); b.x = base.x; b.y = base.y - 10; d.drop(b, { x: base.x, y: base.y - 10 }); };
    put(head);
    const early = { level: base.level, bounced: head.active && !head.above };
    put(mid);
    const two = base.level;
    put(head);
    return { early, two, man: !!d.snowman, balls: [base, mid, head].some((b) => b.active) };
  });
  assert.deepEqual(ice, { early: { level: 1, bounced: true }, two: 2, man: true, balls: false });
  await waitDream((d) => d.gifts.length >= 1);
  await dream((d) => { const doll = d.dolls[0]; const p = d.pond; d.startDrag(doll); doll.x = p.cx - p.rx * 0.6; doll.y = p.cy; d.x0 = doll.x; d.drop(doll, { x: 5, y: 5 }); });
  await waitDream((d) => d.dolls[0].x > d.x0 + 30);
  // лунка: выпрыгивает рыбка — её ест пингвин (кукла рыбку не ест); дверь дворца открывается, фея выносит подарок
  const ic = await dream((d) => {
    d.hole.cool = 0;
    d.tap(d.hole);
    const fish = d.gifts.at(-1);
    const p = d.actors.find((a) => a.eats && a.rec?.subject === 'penguin');
    d.halt(p); p.x = 40; p.y = d.H - 8;
    d.halt(fish);
    d.startDrag(fish); fish.x = p.x; fish.y = p.y - 6;
    d.drop(fish, { x: p.x, y: p.y - 6 });
    d.g0 = d.gifts.length;
    d.tap(d.door);
    return { fish: fish.rec.subject, edible: fish.edible, eaten: !d.actors.includes(fish), door: d.door.texture.key, busy: d.door.busy };
  });
  assert.deepEqual(ic, { fish: 'fish', edible: 'res', eaten: true, door: 'dw_door_open', busy: true });
  await waitDream((d) => !d.door.busy && d.door.texture.key === 'dw_door' && d.isTried('door') && d.isTried('hole') && d.isTried('snowman'));
  await wakeUp(uid);

  // игрушки: сундук дарит подарок; паровозик везёт куклу
  await enter('toys');
  const ty = await dream((d) => {
    d.actors.find((a) => a.texture.key === 'big_chest').tap();
    d.x0 = d.train[1].x;
    d.mount(d.dolls[0], d.train[1]);
    return { gifts: d.gifts.length, run: d.trainRun };
  });
  assert.deepEqual(ty, { gifts: 1, run: true });
  await waitDream((d) => d.train[1].x < d.x0 - 20 && Math.abs(d.dolls[0].x - d.train[1].x) < 2);
  // кубики: башня строится, верхний снимается, башня из всех пяти — подарок, тап — рассыпается
  const bk = await dream((d) => {
    const [a, b, c, e, f] = d.blocks;
    const put = (x, on) => { d.startDrag(x); x.x = on.x; x.y = on.y - 13; d.drop(x, { x: on.x, y: on.y - 13 }); };
    put(b, a); put(c, b);
    const tower = b.above === a && c.above === b;
    d.startDrag(c); c.x = 200; c.y = 110;
    d.drop(c, { x: 200, y: 110 });
    const off = !c.above && !b.topB;
    const g0 = d.gifts.length;
    put(c, b); put(e, c); put(f, e);
    const all = f.above === e && d.gifts.length === g0 + 1;
    d.tap(a);
    return { tower, off, all, fallen: d.blocks.every((x) => !x.above && !x.topB), tried: d.isTried('blocks') };
  });
  assert.deepEqual(bk, { tower: true, off: true, all: true, fallen: true, tried: true });
  await wakeUp(uid);
  // ушли, пока паровозик ехал, — в следующий раз он снова заводится
  await enter('toys');
  assert.equal(await dream((d) => d.trainRun), false, 'паровозик не остался «в пути» с прошлого сна');
  await wakeUp(uid);

  const end = await room((s) => ({ seen: Object.keys(s.flags.dreamSeen).sort().join(), chars: s.objs.filter((o) => o.kind === 'char').length }));
  assert.equal(end.seen, 'candy,clouds,forest,ice,planet,sea,toys');
  assert.equal(end.chars, 20, 'все куклы на месте'); // пятеро в доме, трое в селе, трое в городе и двое у моря
  const stats = await page.evaluate(() => window.__dev.getStats());
  for (const w of ['forest', 'planet', 'sea', 'clouds', 'candy', 'ice', 'toys']) assert.ok(stats.feats[`w_${w}`] >= 1, `счётчик мира ${w}`);
});

test('куклу взяли в руки посреди прыжков радости — она не остаётся «занятой» и засыпает на кровати', async () => {
  await freshRoom();
  await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    s.celebrate(c, 4);
    if (!c.busy) throw new Error('кукла должна прыгать');
    s.startDrag(c);
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    s.drop(c, { x: bed.x, y: bed.y - 8 });
    if (c.busy) throw new Error('осталась занятой');
  });
  await waitFor((s) => { const c = s.objs.find((o) => o.kind === 'char'); return c.sleeping && !!c.dreamPicks; });
});

test('двери-мечты: качели ведут в облака, ванна — в море, холодильник — в конфетную страну; друзья попадают в сон вместе', async () => {
  await freshRoom();
  // качели: три толчка подряд — облачко над качелями
  const uid = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const sw = s.objs.find((o) => o.beh?.swing);
    s.goRoom(2);
    c.x = sw.x; c.y = sw.y;
    s.sitOn(c, sw, true);
    s.pushSwing(sw); s.pushSwing(sw);
    const two = s.dreamGroups.length;
    s.pushSwing(sw);
    if (two !== 0) throw new Error('облачко появилось раньше третьего толчка');
    return c.uid;
  });
  // облачко-желание над той же куклой не мешает: его убирают и новых не показывают
  const clash = await room((s, id) => {
    const c = s.objs.find((o) => o.uid === id);
    s.showHint(c, 'swing');
    s.addNeed(c, 'dryer', 0);
    return { door: s.hasDoor(c), wish: s.wish?.ch === c };
  }, uid);
  assert.deepEqual(clash, { door: true, wish: false });
  const sky = await room((s) => { const g = s.dreamGroups.find((x) => x.kind === 'swing'); s.pickDream(g.picks[0].bubble.dreamPick); return { world: g.picks[0].world, to: s.dreaming?.world }; });
  assert.deepEqual(sky, { world: 'clouds', to: 'clouds' });
  await waitDream((d) => d.key === 'clouds' && d.dolls.length === 1);
  await wakeUp(uid);
  assert.ok(await room((s, id) => !!s.objs.find((o) => o.uid === id).restOn?.beh.swing && s.flags.tried.dreamsky, uid), 'кукла вернулась на качели');

  // ванна: кукла посидела в воде с уточкой — облачко над ней; уточка плывёт в море вместе с ней
  await room((s, id) => {
    const c = s.objs.find((o) => o.uid === id);
    const tub = s.objs.find((o) => o.beh?.tub);
    s.goRoom(3);
    s.startDrag(c); c.dragging = false;
    s.bathe(c, tub, tub.x - 6);
    const duck = s.spawnItem(s.findRec('rubber duck'), tub.x, tub.y);
    s.bathe(duck, tub, tub.x + 8);
  }, uid);
  await waitFor((s) => s.dreamGroups.some((g) => g.kind === 'tub'));
  await room((s) => s.pickDream(s.dreamGroups.find((g) => g.kind === 'tub').picks[0].bubble.dreamPick));
  await waitDream((d) => d.key === 'sea' && d.dolls.length === 1);
  assert.ok(await dream((d) => d.actors.some((a) => a.alive && a.rec?.subject === 'rubber duck')), 'уточка из ванны — во сне, живая');
  await wakeUp(uid);
  assert.ok(await room((s, id) => !!s.objs.find((o) => o.uid === id).inTub, uid), 'кукла снова в ванне');

  // холодильник: открыли при кукле — облачко над ним; в конфетную страну идёт кукла из кухни
  const mom = await room((s) => {
    s.goRoom(1);
    const fr = s.objs.find((o) => o.beh?.fridge);
    s.openFridge(fr);
    const g = s.dreamGroups.find((x) => x.kind === 'fridge');
    const who = s.dreamerOf(g);
    const worlds = g.picks.map((p) => p.world).join();
    s.pickDream(g.picks[0].bubble.dreamPick);
    return { uid: who.uid, room: Math.floor(who.x / 293), to: s.dreaming?.world, worlds };
  });
  assert.deepEqual({ room: mom.room, to: mom.to, worlds: mom.worlds }, { room: 1, to: 'candy', worlds: 'candy,ice' });
  await waitDream((d) => d.key === 'candy');
  await wakeUp(mom.uid);

  // сундук с игрушками — в игрушечный мир, яблоня — в лес, диско-шар — на планету (облачко висит под шаром)
  for (const [kind, n, world, hint] of [['chest', 0, 'toys', 'dreamtoys'], ['tree', 2, 'forest', 'dreamforest'], ['disco', 4, 'planet', 'dreamspace']]) {
    const dr = await room((s, a) => {
      const o = s.objs.find((x) => (a.kind === 'chest' ? x.beh?.chest : a.kind === 'tree' ? x.beh?.appleTree : x.beh?.disco));
      const c = s.objs.find((x) => x.kind === 'char' && x.uid === a.uid);
      s.goRoom(a.n);
      // без куклы в комнате дверь не открывается
      for (const x of s.objs) if (x.kind === 'char' && Math.floor(x.x / 293) === a.n) x.sleeping = true;
      const act = () => (a.kind === 'chest' ? s.openChest(o) : a.kind === 'tree' ? s.shakeTree(o) : s.toggleDisco(o));
      act();
      const alone = s.dreamGroups.some((g) => g.kind === a.kind);
      if (a.kind === 'disco') s.discoOff();
      for (const x of s.objs) if (x.kind === 'char') x.sleeping = false;
      s.startDrag(c); c.dragging = false; c.x = o.x + (o.x % 293 > 146 ? -30 : 30); c.y = 100;
      act();
      const g = s.dreamGroups.find((x) => x.kind === a.kind);
      s.updateDreams(s.time.now);
      const below = g.picks[0].bubble.y > o.y;
      s.pickDream(g.picks[0].bubble.dreamPick);
      return { alone, world: g.picks[0].world, to: s.dreaming?.world, below };
    }, { kind, n, uid: mom.uid });
    assert.deepEqual(dr, { alone: false, world, to: world, below: kind === 'disco' }, `дверь: ${kind}`);
    await waitDream((d, w) => d.key === w, world);
    await wakeUp(mom.uid);
    assert.ok(await room((s, h) => s.flags.tried[h], hint), `подсказка ${hint} запомнена`);
  }
  await room((s) => s.discoOff());
  // куклу взяли в руки посреди танца (покачивание) — она не остаётся «занятой» навсегда
  const freed = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char' && !o.inTub && !o.sleeping);
    s.tweens.killTweensOf(c); c.busy = false; c.hopBusy = false;
    s.dance(c, 'sway');
    const dancing = c.busy;
    s.startDrag(c); c.dragging = false;
    return { dancing, busy: c.busy };
  });
  assert.deepEqual(freed, { dancing: true, busy: false });

  // сон вдвоём: вторая кукла спит на той же кровати — во сне они обе
  await room((s) => {
    s.goRoom(0);
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    const [a, b] = s.objs.filter((o) => o.kind === 'char' && !o.inTub);
    for (const [c, dx] of [[a, -8], [b, 8]]) { s.startDrag(c); c.awakeUntil = 0; s.drop(c, { x: bed.x + dx, y: bed.y - 8 }); }
  });
  await waitFor((s) => s.objs.filter((o) => o.kind === 'char' && o.sleeping && o.dreamPicks).length >= 2);
  const two = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char' && o.dreamPicks);
    s.pickDream(c.dreamPicks.picks[0].bubble.dreamPick);
    return c.uid;
  });
  await waitDream((d) => d.dolls.length === 2);
  // сувенир приносит каждая — и обе просыпаются
  const all = await dream((d) => { d.leave(); return d.broughtAll.map((b) => ({ uid: b.uid, sub: b.rec?.subject })); });
  assert.equal(all.length, 2);
  assert.equal(all[0].uid, two, 'первой — та, что открыла сон');
  assert.notEqual(all[0].sub, all[1].sub, 'сувениры разные');
  await waitHome();
  await waitFor((s, list) => list.every((b) => { const c = s.objs.find((o) => o.uid === b.uid); return c?.slots.hand?.rec.subject === b.sub && !!c.dmark; }), all);
});

test('след сна: дома кукла минуту выглядит «оттуда»; ванна смывает, время тоже', async () => {
  await freshRoom();
  const uid = await room((s) => s.objs.find((o) => o.kind === 'char').uid);
  for (const [w, part] of [['ice', 'cap'], ['clouds', 'cloud'], ['planet', 'glow'], ['forest', 'flies'], ['toys', 'key']]) {
    await room((s, a) => s.enterDream(s.objs.find((o) => o.uid === a.uid), a.w, 'bed'), { uid, w });
    await waitDream((d, k) => d.key === k && d.dolls.length > 0, w);
    await wakeUp(uid);
    const m = await room((s, id) => { const c = s.objs.find((o) => o.uid === id); return { world: c.dmark?.world, parts: c.dmark?.parts.length, left: Math.round((c.dmark?.until - s.time.now) / 1000) }; }, uid);
    assert.equal(m.world, w);
    assert.ok(m.parts >= 1 && m.left > 50 && m.left <= 60, `след мира ${w}: ${JSON.stringify(m)}`);
    assert.ok(await room((s, a) => !!s.objs.find((o) => o.uid === a.uid).dmark[a.part], { uid, part }), `часть следа: ${part}`);
  }
  // ванна смывает след
  const washed = await room((s, id) => { const c = s.objs.find((o) => o.uid === id); s.clean(c); return !c.dmark; }, uid);
  assert.ok(washed, 'ванна смывает след сна');
  // время вышло — след исчезает сам
  await room((s, id) => { const c = s.objs.find((o) => o.uid === id); s.dreamMark(c, 'sea'); c.dmark.until = s.time.now + 200; }, uid);
  await waitFor((s, id) => !s.objs.find((o) => o.uid === id).dmark, uid);
});

test('облачка с кроватью берут паузу: «хочу спать» и подсказки про кровать не идут подряд, пауза растёт', async () => {
  await freshRoom();
  const st = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    const min = () => Math.round((s.bedTalkUntil - s.time.now) / 60000);
    s.clearWish(false);
    s.showHint(c, 'dream');
    const p1 = min();
    // пока пауза — ни подсказок с кроватью, ни «хочу спать» (ни днём, ни ночью)
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      s.night = i >= 250;
      s.clearWish(false);
      s.wishTick();
      if (s.wish) seen.add(s.wish.hint || s.wish.type);
    }
    s.night = false;
    s.clearWish(false);
    s.showHint(c, 'bounce');
    const p2 = min();
    s.hintDone('bounce'); // послушались — счётчик сброшен, но две минуты про кровать всё равно тишина
    const p3 = min();
    // пауза прошла — кровать снова можно предлагать
    s.bedTalkUntil = 0;
    let again = false;
    for (let i = 0; i < 2000 && !again; i++) { s.clearWish(false); s.wishTick(); again = ['dream', 'bounce', 'sleep'].includes(s.wish?.hint || s.wish?.type); }
    s.clearWish(false);
    return { p1, p2, p3, bed: ['dream', 'bounce', 'sleep'].filter((k) => seen.has(k)), other: seen.size > 0, again };
  });
  assert.deepEqual(st, { p1: 2, p2: 4, p3: 2, bed: [], other: true, again: true });
});

test('сон и смена размера экрана: кукла просто просыпается дома, дом цел', async () => {
  await freshRoom();
  const before = await room((s) => s.objs.length);
  await room((s) => s.enterDream(s.objs.find((o) => o.kind === 'char'), 'forest', 'bed'));
  await waitDream((d) => d.key === 'forest');
  await page.setViewportSize({ width: 700, height: 330 });
  await waitHome();
  await waitFor((s, n) => s.objs.length === n && s.scene.isActive(), before);
  await page.setViewportSize({ width: 780, height: 360 });
  await page.waitForTimeout(1200);
  await waitFor((s, n) => s.objs.length === n && s.cameras.main.zoom === 8, before);
  // после этого сон снова открывается и закрывается как обычно
  const uid = await room((s) => { const c = s.objs.find((o) => o.kind === 'char'); s.enterDream(c, 'toys', 'bed'); return c.uid; });
  await waitDream((d) => d.key === 'toys');
  await wakeUp(uid);
});

test('уборка: урна в каждой комнате ест брошенное; тап собирает лишнее с пола и возвращает обратно; метла сметает в урну', async () => {
  await freshRoom();
  const st = await room((s) => {
    const bins = s.objs.filter((o) => o.beh?.bin);
    const bin = bins.find((b) => Math.floor(b.x / 293) === 0);
    const y = bin.y - 3;
    const mk = (sub, x) => s.spawnItem(s.findRec(sub), x, y);
    const l0 = s.litter(0).length;
    const apple = mk('apple', 120);
    const cake = mk('cupcake', 140);
    const kitten = mk('kitten', 160);
    const furniture = s.objs.filter((o) => o.beh?.furniture).length;
    // яблоко бросили в урну — его больше нет; котёнка урна не берёт
    s.startDrag(apple); apple.x = bin.x; apple.y = bin.y - 4;
    s.drop(apple, { x: bin.x, y: bin.y - 6 });
    s.startDrag(kitten);
    s.drop(kitten, { x: bin.x, y: bin.y - 6 });
    const eaten = !s.objs.includes(apple);
    const pet = s.objs.includes(kitten);
    // тап: всё лишнее с пола — в урну (пирожное и мячик), но не питомец и не мебель
    const ball = mk('beach ball', 180);
    s.tap(bin);
    const swept = { n: bin.stash.length - l0, tex: bin.texture.key, gone: !s.objs.includes(cake) && !s.objs.includes(ball), pet: s.objs.includes(kitten) };
    // передумали: повторный тап возвращает всё на место
    s.tap(bin);
    const back = s.objs.includes(cake) && s.objs.includes(ball) && !bin.stash && bin.texture.key === 'bin' && cake.input.enabled;
    s.tap(bin); // снова собрали — и больше не трогаем
    return {
      rooms: bins.map((b) => Math.floor(b.x / 293)).sort((a, b) => a - b).join(), eaten, pet, swept, back, // по урне в каждой комнате дома, села и города
      furniture: s.objs.filter((o) => o.beh?.furniture).length === furniture,
      tools: !!s.objs.find((o) => o.rec?.id === 'broom') && s.objs.some((o) => o.rec?.subject === 'leaf rake' && o.beh.sweeper),
    };
  });
  assert.deepEqual(st, { rooms: '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26', eaten: true, pet: true, swept: { n: 2, tex: 'bin_full', gone: true, pet: true }, back: true, furniture: true, tools: true });
  // через несколько секунд собранное исчезает насовсем, урна снова пустая
  await waitFor((s) => { const bin = s.objs.find((o) => o.beh?.bin && o.x < 293); return !bin.stash && bin.texture.key === 'bin'; });
  // метла: провели по предмету на полу — он улетел в урну; лопатку и лейку уборка не трогает
  const sw = await room((s) => {
    const bin = s.objs.find((o) => o.beh?.bin && o.x < 293);
    const it = s.spawnItem(s.findRec('apple'), 150, bin.y - 3);
    const shovel = s.spawnItem(s.findRec('shovel'), 170, bin.y - 3);
    const broom = s.objs.find((o) => o.rec?.id === 'broom');
    s.startDrag(broom);
    broom.x = 150; broom.y = bin.y - 3;
    s.sweepAtT = 0;
    s.sweepAt(broom);
    broom.x = 170;
    s.sweepAtT = 0;
    s.sweepAt(broom);
    s.drop(broom, { x: 200, y: bin.y - 3 });
    return { flung: !s.objs.includes(it), tool: s.objs.includes(shovel), litter: s.isLitter(shovel) };
  });
  assert.deepEqual(sw, { flung: true, tool: true, litter: false });
  const stats = await page.evaluate(() => window.__dev.getStats().feats);
  assert.ok(stats.trash >= 1 && stats.tidy >= 2 && stats.sweep >= 1, 'счётчики уборки');
});

test('уборка, вторая волна: робот разносит вещи по местам и катает питомца; лужа пачкает, машина стирает; следы и швабра; компост и удобрение; наклейки «чистюля»', async () => {
  await freshRoom();
  // робот-пылесос приезжает по кнопке: еда — в холодильник, одежда — в шкаф, игрушка — в сундук; кукла едет сверху
  const rb = await room((s) => {
    const y = s.objs.find((o) => o.beh?.bin).y;
    const out = { none: !s.objs.some((o) => o.beh?.robot), drawer: !(s.byCat.toy || []).some((r) => r.id === 'robo-vac') };
    for (const [sub, x] of [['apple', 110], ['cupcake', 150], ['sock', 190], ['beach ball', 230], ['kite', 250]]) s.spawnItem(s.findRec(sub), x, y - 6);
    out.dot = s.litter(0).length >= 5;
    s.callRobot();
    const r = s.robot;
    out.running = r.running;
    s.saveNow();
    out.saved = JSON.parse(localStorage.getItem('pixel-house-v3')).objs.some((o) => o.id === 'robo-vac');
    return out;
  });
  assert.deepEqual(rb, { none: true, drawer: true, dot: true, running: true, saved: false });
  // въехал — сажаем куклу
  await waitFor((s) => s.robot && !s.robot.entering, null, 20000);
  const ride = await room((s) => {
    const r = s.robot;
    const c = s.objs.find((o) => o.kind === 'char' && o.x < r.x + 200 && !o.restOn && !o.sleeping);
    s.startDrag(c);
    s.drop(c, { x: r.x, y: r.y - 3 });
    return { rider: c.restOn === r, sit: s.poseOf(c) };
  });
  assert.deepEqual(ride, { rider: true, sit: 'sit' });
  await waitFor((s) => !s.robot, null, 240000);
  const done = await room((s) => {
    const subs = (o) => o.contents.map((id) => s.recOf(id).subject).sort().join();
    const chest = s.objs.find((o) => o.beh?.chest);
    const out = {
      litter: s.litter(0).length, gone: !s.objs.some((o) => o.beh?.robot),
      fridge: subs(s.objs.find((o) => o.beh?.fridge)), wardrobe: subs(s.objs.find((o) => o.rec.id === 'big_wardrobe')), chest: subs(chest),
      sticker: s.stickers.has('tidy', 'bed'),
      unloaded: !s.objs.some((o) => o.restOn?.beh?.robot),
    };
    // ничего не потеряно: тап по сундуку высыпает убранное обратно
    const n0 = s.objs.length;
    s.tap(chest);
    out.back = s.objs.length - n0;
    return out;
  });
  assert.deepEqual(done, { litter: 0, gone: true, fridge: 'apple,cupcake', wardrobe: 'sock', chest: 'beach ball,kite', sticker: true, unloaded: true, back: 2 });
  // в море робот приплывает в надувном круге и уезжает по второму нажатию
  await room((s) => { s.travel(window.__dev.R.waves); return true; });
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.waves, null, 20000);
  const wet = await room((s) => {
    s.callRobot();
    s.updateClean();
    const key = s.robot.texture.key;
    s.callRobot(); // ещё раз — уезжает
    return { ring: key.startsWith('robovacr'), leaving: s.robot.leaving };
  });
  assert.deepEqual(wet, { ring: true, leaving: true });
  await room((s) => { s.travel(0); return true; });
  await waitFor((s) => !s.travelling && s.curRoom === 0, null, 20000);

  // сад: мишка в луже пачкается; испачканная кукла оставляет следы; швабра их стирает — комната чистая
  const gd = await room((s) => {
    s.goRoom(2);
    const mud = s.objs.find((o) => o.beh?.puddle);
    const c = s.objs.find((o) => o.kind === 'char');
    s.removeObj(s.objs.find((o) => o.beh?.cart), true); // повозка стоит рядом с лужей: кукла, брошенная на неё, села бы в повозку
    const teddy = s.spawnItem(s.findRec('teddy bear'), mud.x, mud.y - 20);
    s.startDrag(teddy);
    s.drop(teddy, { x: mud.x, y: mud.y - 2 });
    s.startDrag(c); c.x = mud.x; c.y = mud.y - 2;
    s.drop(c, { x: mud.x, y: mud.y - 2 });
    s.updateClean();
    const dir = mud.x % 293 > 146 ? -1 : 1;
    for (let i = 1; i <= 4; i++) { s.startDrag(c); c.x = mud.x + i * 20 * dir; c.y = mud.y - 2; s.drop(c, { x: c.x, y: c.y }); s.updateClean(); }
    const prints = s.flags.prints.length;
    const mop = s.objs.find((o) => o.beh?.mop);
    s.startDrag(mop);
    for (const p of [...s.flags.prints]) { mop.x = p[0]; mop.y = p[1]; s.mopAt(mop); }
    s.drop(mop, { x: mop.x, y: mop.y });
    s.testTeddy = teddy;
    return { dirty: teddy.dirty && teddy.isTinted, stained: !!c.stain, prints, left: s.flags.prints.length, sticker: s.stickers.has('tidy', 'apple tree') };
  });
  assert.deepEqual(gd, { dirty: true, stained: true, prints: 4, left: 0, sticker: true });

  // компост: два листа и яблоко — мешочек удобрения; удобрение на грядку — подсолнух созревает сразу
  await room((s) => {
    const comp = s.objs.find((o) => o.beh?.compost);
    for (const sub of ['maple leaf', 'apple', 'oak leaf']) { const it = s.spawnItem(s.findRec(sub), comp.x, comp.y - 30); s.startDrag(it); s.drop(it, { x: comp.x, y: comp.y - 5 }); }
    if (comp.contents.length !== 3 || comp.texture.key !== 'compost_3') throw new Error(`куча: ${comp.contents.length} ${comp.texture.key}`);
  });
  await waitFor((s) => s.objs.some((o) => o.beh?.fertilizer) && !s.objs.find((o) => o.beh?.compost).contents.length);
  const fz = await room((s) => {
    const f = s.objs.find((o) => o.beh?.fertilizer);
    const bed = s.objs.find((o) => o.beh?.gardenBed && o.plots.some((p) => p && p.stage < 3));
    const before = bed.plots.find((p) => p).stage;
    s.tweens.killTweensOf(f);
    s.startDrag(f);
    s.drop(f, { x: bed.x, y: bed.y - 6 });
    return { before, ripe: bed.plots.filter((p) => p).every((p) => p.stage === 3), used: !s.objs.includes(f) };
  });
  assert.deepEqual(fz, { before: 1, ripe: true, used: true });

  // стиральная машина: грязный мишка — в барабан, тап — стирка; выходит чистым
  const ws = await room((s) => {
    s.goRoom(3);
    const w = s.objs.find((o) => o.beh?.washer);
    const teddy = s.testTeddy;
    const kitten = s.spawnItem(s.findRec('kitten'), w.x, w.y - 30);
    s.startDrag(kitten);
    s.drop(kitten, { x: w.x, y: w.y - 10 });
    s.startDrag(teddy);
    s.drop(teddy, { x: w.x, y: w.y - 10 });
    const loaded = w.contents.length;
    // машину с вещью внутри передвинули — вещь в окошке едет вместе с ней, и стирка идёт там, где машина стоит теперь
    const move = (dx) => { s.startDrag(w); w.x += dx; s.drop(w, { x: w.x, y: w.y - 10 }); s.updateClean(); };
    const inWindow = () => Math.abs(w.peek.x - w.x) <= 1 && w.peek.y === w.y - 12;
    move(-40);
    const moved = inWindow();
    s.tap(w);
    const x1 = w.x;
    // и во время стирки её можно двигать: она не отскакивает на прежнее место
    s.startDrag(w); w.x += 25;
    s.dbgWash = { w, x: w.x };
    return { loaded, pet: s.objs.includes(kitten), washing: w.washing, peek: !!w.peek, moved, x1: x1 !== w.x };
  });
  assert.deepEqual(ws, { loaded: 1, pet: true, washing: true, peek: true, moved: true, x1: true });
  await page.waitForTimeout(600); // несколько оборотов барабана, пока машину держат в руке
  const held = await room((s) => {
    const { w, x } = s.dbgWash;
    s.updateClean();
    const out = { stays: w.x === x, peek: Math.abs(w.peek.x - w.x) <= 1 && w.peek.y === w.y - 12 };
    s.drop(w, { x: w.x, y: w.y - 10 });
    return out;
  });
  assert.deepEqual(held, { stays: true, peek: true }, 'машина во время стирки остаётся там, куда её несут, вещь — в окошке');
  await waitFor((s) => { const w = s.objs.find((o) => o.beh?.washer); return !w.washing && s.objs.some((o) => o.rec?.subject === 'teddy bear' && !o.dirty && !o.isTinted && Math.abs(o.x - w.x) < 40 && !o.restOn); });
  const stats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['robot', 'roboride', 'mop', 'compost', 'wash', 'clean']) assert.ok(stats[k] >= 1, `счётчик ${k}`);
});

test('позы: на стуле кукла сидит, в кровати раздевается и лежит под одеялом, питомец утопает в лежанке; куклу можно отпустить из дома и вернуть', async () => {
  await freshRoom();
  const st = await room((s) => {
    const [a, b] = s.objs.filter((o) => o.kind === 'char');
    const bed = s.objs.find((o) => o.rec?.subject === 'bed');
    const crown = s.spawnItem(s.findRec('crown'), a.x, 40);
    const teddy = s.spawnItem(s.findRec('teddy bear'), a.x, 40);
    s.wear(a, 'head', crown, true);
    s.wear(a, 'hand', teddy, true);
    // стул: кукла сидит — рисунок без голеней, ключ текстур «сидячий»; гримасы работают как обычно
    const chair = s.spawnItem(s.findRec('chair'), 130, bed.y);
    s.startDrag(b); b.x = chair.x; b.y = chair.y - 8;
    s.drop(b, { x: chair.x, y: chair.y - 8 });
    s.updatePose(b);
    const sit = { pose: b.pose, key: b.texture.key === `${b.baseKey}s`, on: b.restOn === chair };
    b.setTexture(b.key + '_smile');
    s.startDrag(b); s.updatePose(b);
    const up = { pose: b.pose, face: b.texture.key === `${b.baseKey}_open` }; // взяли в руки — рот открыт, рисунок уже «стоячий»
    s.drop(b, { x: 200, y: 110 });
    // кровать: сначала сидит, уснула — раздевается и ложится; сама при этом остаётся там, где её усадили
    s.startDrag(a); a.x = bed.x; a.y = bed.y - 10;
    s.drop(a, { x: bed.x, y: bed.y - 10 });
    s.updatePose(a);
    const onBed = { pose: a.pose, dressed: !!a.slots.head && !!a.slots.hand };
    const at = [a.x, a.y];
    a.awakeUntil = s.time.now - 1;
    s.dozeTick();
    s.updatePose(a);
    const lie = {
      pose: a.pose, naked: !Object.values(a.slots).some(Boolean), cropped: a.isCropped, blanket: a.lie.blanket.active,
      crown: !crown.owner && !crown.restOn && s.objs.includes(crown), teddy: teddy.restOn === bed && !teddy.owner,
      theme: a.dreamTheme?.world, clouds: !!a.dreamPicks, stays: a.x === at[0] && a.y === at[1],
      head: a.getTopLeft().x > bed.x - 21 && a.getTopLeft().x < bed.x - 5,
    };
    const blanket = a.lie.blanket;
    // разбудили тапом — садится, одеяло пропадает
    s.tap(a);
    s.updatePose(a);
    const woke = {
      pose: a.pose, cropped: a.isCropped, blanket: blanket.active, origin: `${a.originX},${a.originY}`,
      // проснулась — снова в короне и с мишкой в руке
      dressed: a.slots.head === crown && a.slots.hand === teddy && crown.owner === a && !teddy.restOn,
    };
    // снова уснула; пока спит, корону унесли — проснувшись, наденет только то, что осталось (мишку)
    s.tweens.killTweensOf(a); a.busy = false; a.hopBusy = false; // прыжок от тапа уже не мешает уснуть
    a.awakeUntil = s.time.now - 1;
    s.dozeTick();
    s.updatePose(a);
    const asleep = a.pose === 'lie' && !a.slots.head && !a.slots.hand;
    s.saveNow();
    const saved = JSON.parse(localStorage.getItem('pixel-house-v3')).objs.filter((o) => o.took).map((o) => o.took[1]).sort().join();
    s.startDrag(crown); crown.x = 200; crown.y = 110;
    s.drop(crown, { x: 200, y: 110 });
    s.tap(a);
    s.updatePose(a);
    const again = { asleep, saved, crown: !crown.owner && !a.slots.head, teddy: a.slots.hand === teddy };
    // питомец на лежанке: уснул — утопает в ней; взяли в руки — снова целиком
    const pb = s.objs.find((o) => o.rec?.id === 'big_petbed');
    const k = s.spawnItem(s.findRec('kitten'), pb.x, pb.y - 20);
    s.startDrag(k); k.x = pb.x; k.y = pb.y - 6;
    s.drop(k, { x: pb.x, y: pb.y - 6 });
    k.awakeUntil = 0;
    s.sleepTick();
    s.updateNest(k);
    const nest = { on: k.restOn === pb, nest: k.nest, cropped: k.isCropped };
    s.startDrag(k); s.updateNest(k);
    const out = { nest: k.nest, cropped: k.isCropped, origin: `${k.originX},${k.originY}` };
    s.drop(k, { x: 220, y: 110 });
    // уход из дома: только при открытой вкладке «люди»; вид запоминается, портрет возвращает
    const cast = b.cast;
    const look = JSON.stringify(b.look);
    s.cat = 'recent'; s.startDrag(b); s.drop(b, { x: b.x, y: 400 });
    const bounced = s.objs.includes(b);
    s.cat = 'people'; s.startDrag(b); s.drop(b, { x: b.x, y: 400 });
    const gone = !s.objs.includes(b) && !s.castChar(cast);
    s.callCast(cast);
    const back = s.castChar(cast);
    return { sit, up, onBed, lie, woke, again, nest, out, leave: { bounced, gone, back: !!back, look: JSON.stringify(back?.look) === look } };
  });
  assert.deepEqual(st.sit, { pose: 'sit', key: true, on: true });
  assert.deepEqual(st.up, { pose: 'stand', face: true });
  assert.deepEqual(st.onBed, { pose: 'sit', dressed: true });
  assert.deepEqual(st.lie, { pose: 'lie', naked: true, cropped: true, blanket: true, crown: true, teddy: true, theme: 'toys', clouds: true, stays: true, head: true });
  assert.deepEqual(st.woke, { pose: 'sit', cropped: false, blanket: false, origin: '0.5,1', dressed: true });
  assert.deepEqual(st.again, { asleep: true, saved: 'hand,head', crown: true, teddy: true });
  assert.deepEqual(st.nest, { on: true, nest: true, cropped: true });
  assert.deepEqual(st.out, { nest: false, cropped: false, origin: '0.5,1' });
  assert.deepEqual(st.leave, { bounced: true, gone: true, back: true, look: true });
  // рисунок куклы пересоздали, пока она «занята» (шоколадные усы после конфетной страны посреди прыжков) — картинка не остаётся на удалённой текстуре
  const tex = await room((s) => {
    const c = s.objs.find((o) => o.kind === 'char');
    s.tweens.killTweensOf(c); c.busy = false; c.hopBusy = false;
    s.celebrate(c, 4);
    const face = c.texture.key;
    s.dreamMark(c, 'candy');
    return { busy: c.busy, face: c.texture.key === face, alive: !!c.frame?.glTexture || !!c.frame?.source, h: c.displayHeight > 0, mustache: !!c.look.mustache };
  });
  assert.deepEqual(tex, { busy: true, face: true, alive: true, h: true, mustache: true });
  // во сне верхом кукла тоже сидит
  const uid = await room((s) => { const c = s.objs.find((o) => o.kind === 'char'); s.startDrag(c); c.dragging = false; s.enterDream(c, 'forest', 'bed'); return c.uid; });
  await waitDream((d) => d.key === 'forest' && d.dolls.length > 0);
  await dream((d) => d.mount(d.dolls[0], d.uni));
  await waitDream((d) => d.dolls[0].texture.key.startsWith(`${d.dolls[0].baseKey}s`));
  await dream((d) => d.startDrag(d.dolls[0]));
  await waitDream((d) => !d.dolls[0].texture.key.startsWith(`${d.dolls[0].baseKey}s`));
  await dream((d) => { const doll = d.dolls[0]; d.drop(doll, { x: 5, y: 5 }); });
  await wakeUp(uid);
  const stats = await page.evaluate(() => window.__dev.getStats().feats);
  assert.ok(stats.castleave >= 1, 'счётчик ухода из дома');
});

test('локации: камера не выходит из своей локации; карта, указатель и повозка везут в село и обратно; место запоминается', async () => {
  await freshRoom();
  const st0 = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const at = (pred) => { const o = s.objs.find(pred); return o ? Math.floor(o.x / W) : -1; };
    s.goRoom(4);
    return {
      chars: s.objs.filter((o) => o.kind === 'char').length,
      granny: at((o) => o.cast === 'granny'), dad: at((o) => o.cast === 'dad'), kid: at((o) => o.cast === 'kid'),
      coop: at((o) => o.beh?.coop), well: at((o) => o.beh?.well), hive: at((o) => o.beh?.hive), mill: at((o) => o.beh?.mill),
      cart: at((o) => o.beh?.cart), bins: s.objs.filter((o) => o.beh?.bin).length,
      signs: s.portals.map((p) => `${Math.floor(p.x / W)}>${p.portal}`).join(), cook: at((o) => o.cast === 'cook'), claw: at((o) => o.beh?.claw),
      place: s.placeNow().key, range: s.camRange().map((x) => x / W).join(), edge: s.inPlace(5),
    };
  });
  assert.deepEqual(st0, {
    chars: 20, granny: 6, dad: 9, kid: 8, coop: 6, well: 7, hive: 8, mill: 9, cart: 2, bins: 27,
    signs: '2>choose,6>choose,10>choose,15>choose,19>choose,23>choose', cook: 12, claw: 14, place: 'home', range: '0,5', edge: 5, // мест три — остановка предлагает выбор
  });
  await waitFor((s) => s.curRoom === 4);
  // занавес зала не заходит во двор села (он справа от зала на ленте)
  const curtain = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const r = s.curtain[1];
    // картинка правой половины отражена: видимой остаётся правая часть текстуры шириной до края зала
    return r.x + r.input.hitArea.width <= 5 * W && r.isCropped && r._crop.x === r.width - r._crop.width && r.x + r._crop.width <= 5 * W;
  });
  assert.ok(curtain, 'правая половина занавеса обрезана по краю зала');
  // карта: значки локаций и комнаты выбранной
  const map = await room((s) => {
    s.openMap();
    const cards = () => s.mapUi.parts.filter((o) => o.ui && 'mapRoom' in o.ui).map((o) => o.ui.mapRoom).join();
    const res = { tabs: s.mapUi.parts.filter((o) => o.ui && 'mapPlace' in o.ui).length, home: cards() };
    s.onMapUi({ mapPlace: 'village' });
    res.village = cards();
    res.view = s.mapUi.place;
    s.onMapUi({ mapRoom: window.__dev.R.orchard }); // фруктовый сад — в другой локации: едем
    res.travelling = s.travelling;
    res.closed = !s.mapUi;
    return res;
  });
  assert.deepEqual(map, { tabs: 6, home: '0,1,2,3,4,5', village: '6,7,8,9', view: 'village', travelling: true, closed: true });
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.orchard);
  const st1 = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const cart = s.objs.find((o) => o.beh?.cart);
    // в повозку — морковку, на повозку — куклу; и домой по указателю
    s.putIn(cart, s.spawnItem(s.findRec('carrot'), cart.x, cart.y - 30));
    const kid = s.castChar('kid');
    s.startDrag(kid);
    s.drop(kid, { x: cart.x, y: cart.y - 8 });
    const res = {
      cam: s.cameras.main.scrollX / W, place: s.placeNow().key, range: s.camRange().map((x) => x / W).join(),
      cartRoom: Math.floor(cart.x / W), tried: !!s.flags.tried.travel, onCart: kid.restOn === cart, edge: s.inPlace(4),
    };
    s.testCart = cart; s.testKid = kid;
    return res;
  });
  assert.deepEqual(st1, { cam: 8, place: 'village', range: '6,9', cartRoom: 6, tried: true, onCart: true, edge: 6 });
  assert.equal(await page.evaluate(() => window.__dev.musicTheme()), 9, 'в саду села — своя мелодия');
  await waitFor((s) => s.testKid.pose === 'sit' && s.testCart.texture.key === 'cart_full');
  await room((s) => s.goRoom(window.__dev.R.yard));
  await waitFor((s) => s.curRoom === window.__dev.R.yard);
  await room((s) => s.portalTap(s.stopHere())); // остановка: облачка с местами — выбираем дом
  assert.equal(await choose('place_home'), 'place_home,place_city,place_sea,place_park,place_center');
  await waitFor((s) => !s.travelling && s.placeNow().key === 'home');
  const st2 = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const { testCart: cart, testKid: kid } = s;
    return { room: s.curRoom, cart: Math.floor(cart.x / W), kid: Math.floor(kid.x / W), on: kid.restOn === cart, load: cart.contents.length, cartStat: !!s.flags.tried.cart };
  });
  assert.deepEqual(st2, { room: 2, cart: 2, kid: 2, on: true, load: 1, cartStat: true }); // приехали к калитке — в сад у дома
  // в село — и перезагрузка: игра открывается там же, груз и седок на месте
  await room((s) => s.goPlace('village'));
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.yard);
  await room((s) => s.saveNow());
  await page.reload();
  await waitFor((s) => s.objs.length > 10 && s.curRoom === window.__dev.R.yard);
  const st3 = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const cart = s.objs.find((o) => o.beh?.cart);
    const kid = s.castChar('kid');
    return { place: s.placeNow().key, cam: s.cameras.main.scrollX / W, cart: Math.floor(cart.x / W), on: kid.restOn === cart, load: cart.contents.length };
  });
  assert.deepEqual(st3, { place: 'village', cam: 6, cart: 6, on: true, load: 1 });
});

test('дорога: открытка зовёт в село; автобус и остановка; повозка — тапом, с грузом — выбор; кукла просится в дорогу; звёздочка на карте', async () => {
  await freshRoom();
  // открытка из села сама прилетает в дом; пока в селе не были — на кнопке карты звёздочка
  await waitFor((s) => s.objs.some((o) => o.beh?.postcard) && s.mapDot.visible);
  // пока никуда не ездили, к остановке в саду подъезжает автобус-приманка
  await room((s) => s.goRoom(2));
  await waitFor((s) => s.curRoom === 2);
  assert.equal(await room((s) => { const r = Math.random; Math.random = () => 0; s.busAfter = 0; s.busTick(); Math.random = r; return !!s.bus; }), true);
  const card = await room((s) => {
    const pc = s.objs.find((o) => o.beh?.postcard);
    const unseen = s.unseenPlace()?.key;
    s.tap(pc);
    const res = { unseen, open: s.cardUi?.place, sent: s.flags.cards.village, go: s.cardUi.parts.filter((o) => o.ui && 'cardGo' in o.ui).length };
    s.onCardUi({ cardGo: 'village' });
    return { ...res, closed: !s.cardUi, travelling: s.travelling };
  });
  assert.deepEqual(card, { unseen: 'village', open: 'village', sent: 1, go: 1, closed: true, travelling: true });
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.yard);
  await waitFor((s) => s.flags.seen.village && s.unseenPlace()?.key === 'city' && s.mapDot.visible); // в селе побывали, город ещё ждёт
  // съездили — автобус больше не приманка: следующий придёт через три минуты, и тогда уже наверняка
  const calm = await room((s) => {
    const wait = Math.round((s.busAfter - s.time.now) / 60000);
    s.busTick();
    const early = !!s.bus;
    const r = Math.random; Math.random = () => 0.99; s.busAfter = s.time.now - 1; s.busTick(); Math.random = r;
    return { wait, early, came: !!s.bus };
  });
  assert.deepEqual(calm, { wait: 3, early: false, came: true });
  // тап по автобусу у остановки во дворе везёт домой, в сад
  await waitFor((s) => s.bus?.waiting);
  const bus = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const stop = s.stopHere();
    const res = { at: Math.abs(s.bus.x - stop.x) <= 3, to: s.bus.portal };
    s.onDown(f(1, s.bus.x, s.bus.y - 6), [s.bus]); // настоящий тап: автобус — не предмет
    return { ...res, asks: !!s.choices, press: !!s.press };
  }, finger.toString());
  assert.deepEqual(bus, { at: true, to: 'choose', asks: true, press: false }); // мест несколько — автобус спрашивает куда
  assert.equal(await choose('place_home'), 'place_home,place_city,place_sea,place_park,place_center');
  await waitFor((s) => !s.travelling && s.curRoom === 2 && !s.bus);
  // повозка: тап — облачка с местами; с грузом — ещё и «выгрузить»
  await room((s) => s.tap(s.objs.find((o) => o.beh?.cart)));
  assert.equal(await choose('place_village'), 'place_village,place_city,place_sea,place_park,place_center');
  assert.equal(await room((s) => s.travelling), true);
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.yard);
  const loaded = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const cart = s.objs.find((o) => o.beh?.cart);
    s.putIn(cart, s.spawnItem(s.findRec('carrot'), cart.x, cart.y - 30));
    s.tap(cart);
    const picks = s.choices.parts.filter((o) => o.choice);
    const res = { travelling: s.travelling, icons: picks.map((o) => o.choice.icon).join() };
    const unload = picks.find((o) => o.choice.icon === 'unload');
    s.onDown(f(1, unload.x, unload.y - 8), [unload]);
    return { ...res, closed: !s.choices, left: cart.contents.length };
  }, finger.toString());
  assert.deepEqual(loaded, { travelling: false, icons: 'place_home,place_city,place_sea,place_park,place_center,unload', closed: true, left: 0 });
  // выбор из нескольких мест: облачка целиком на экране, даже когда их четыре; тап мимо их убирает
  const many = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    let went = '';
    s.showChoices(s.stopHere(), ['a', 'b', 'c', 'd'].map((k) => ({ icon: 'place_home', act: () => { went = k; } })));
    const picks = s.choices.parts.filter((o) => o.choice);
    const cam = s.cameras.main.scrollX;
    const res = { n: picks.length, inside: picks.every((o) => o.x - 12 >= cam && o.x + 12 <= cam + W && o.y - 20 >= 0) };
    s.onDown(f(1, cam + 20, 70), []);
    res.dismissed = !s.choices;
    s.press = null;
    s.showChoices(s.stopHere(), ['a', 'b', 'c'].map((k) => ({ icon: 'place_home', act: () => { went = k; } })));
    const third = s.choices.parts.filter((o) => o.choice)[2];
    s.onDown(f(1, third.x, third.y - 8), [third]);
    return { ...res, went };
  }, finger.toString());
  assert.deepEqual(many, { n: 4, inside: true, dismissed: true, went: 'c' });
  // домой — по остановке; кукла в спальне просится в село: поехали — желание исполнено, она приходит следом
  await room((s) => s.portalTap(s.stopHere()));
  await choose('place_home');
  await waitFor((s) => !s.travelling && s.curRoom === 2);
  await room((s) => s.goRoom(0));
  await waitFor((s) => s.curRoom === 0);
  await waitFor((s) => { const m = s.castChar('mia'); return !m.walking && m.x > 0 && m.x < Math.ceil(s.sys.game.config.width / s.cameras.main.zoom); }); // кукла, с которой ездили, дошла до спальни
  const ask = await room((s) => {
    const mia = s.castChar('mia');
    s.clearWish(false);
    const can = s.hintsFor(mia).includes('travel') && !s.hintsFor(s.castChar('granny')).includes('travel');
    s.showHint(mia, 'travel');
    const res = { can, hint: s.wish?.hint, buddy: s.buddy === mia.uid };
    s.goPlace('village');
    return { ...res, wish: !!s.wish, travelling: s.travelling };
  });
  assert.deepEqual(ask, { can: true, hint: 'travel', buddy: true, wish: false, travelling: true });
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.yard);
  await waitFor((s) => { const m = s.castChar('mia'); return !m.walking && Math.floor(m.x / Math.ceil(s.sys.game.config.width / s.cameras.main.zoom)) === window.__dev.R.yard; });
  const feats = await page.evaluate(() => window.__dev.getStats().feats);
  assert.ok(feats.postcard >= 1 && feats.travel >= 5, `счётчики: открытка ${feats.postcard}, поездки ${feats.travel}`);
});

test('село: курятник, корова и овца, колодец, пугало и вороны, фруктовые деревья, улей, скворечник, гамак, стог, трактор, мельница', async () => {
  await freshRoom();
  await room((s) => s.goRoom(window.__dev.R.yard));
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.yard);
  const count = (sub) => room((s, sub) => s.objs.filter((o) => o.rec?.subject === sub).length, sub);
  // ---- двор
  const yard = await room((s) => {
    const cow = s.objs.find((o) => o.beh?.farm === 'cow');
    const sheep = s.objs.find((o) => o.beh?.farm === 'sheep');
    const eggs0 = s.objs.filter((o) => /egg$/.test(o.rec?.subject || '')).length;
    s.coopTap(s.objs.find((o) => o.beh?.coop));
    s.feedPet(cow, s.spawnItem(s.findRec('ear of corn'), cow.x, cow.y));
    for (let i = 0; i < 4; i++) { sheep.brushT = 0; s.brushPet(sheep); }
    const hat = s.spawnItem(s.findRec('cowboy hat'), cow.x, cow.y - 10);
    s.petWear(cow, hat);
    s.petVoice(cow);
    return { eggs: s.objs.filter((o) => /egg$/.test(o.rec?.subject || '')).length - eggs0, coop: !!s.flags.tried.coop, wool: !!s.flags.tried.wool, hat: cow.slots.pethat === hat };
  });
  assert.deepEqual(yard, { eggs: 1, coop: true, wool: true, hat: true });
  await waitFor((s) => s.objs.some((o) => o.rec?.subject === 'glass bottle of milk') && s.flags.tried.farmfood);
  assert.equal(await count('ball of yarn'), 1);
  // ---- огород
  await room((s) => s.goRoom(window.__dev.R.veg));
  await waitFor((s) => s.curRoom === window.__dev.R.veg);
  const dry = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const beds = s.objs.filter((o) => o.beh?.gardenBed && Math.floor(o.x / W) === window.__dev.R.veg);
    s.testBeds = beds;
    s.wellTap(s.objs.find((o) => o.beh?.well));
    return beds.flatMap((b) => b.plots).filter((p) => p && p.stage < 3 && !p.watered).length;
  });
  assert.ok(dry >= 4, 'на огороде есть что поливать');
  await waitFor((s) => s.flags.tried.well && s.testBeds.flatMap((b) => b.plots).every((p) => !p || p.stage >= 3 || p.watered || p.stage > 1));
  await room((s) => { const rnd = Math.random; Math.random = () => 0.99; s.villageTick(); s.villageTick(); Math.random = rnd; });
  await waitFor((s) => s.crows.length === 2 && s.crows.every((c) => c.landed));
  const veg = await room((s) => {
    const sc = s.objs.find((o) => o.beh?.scarecrow);
    const hat = s.spawnItem(s.findRec('cowboy hat'), sc.x, sc.y - 20);
    s.startDrag(hat);
    s.drop(hat, { x: sc.x, y: sc.y - 14 });
    const [a, b] = s.crows;
    s.shooCrow(a);
    s.scarecrowTap(sc);
    return { hat: sc.slots.pethat === hat, gone: a.gone && b.gone, scare: !!s.flags.tried.scarecrow };
  });
  assert.deepEqual(veg, { hat: true, gone: true, scare: true });
  await waitFor((s) => s.crows.every((c) => !c.active));
  // ---- фруктовый сад
  await room((s) => s.goRoom(window.__dev.R.orchard));
  await waitFor((s) => s.curRoom === window.__dev.R.orchard);
  const orchard = await room((s) => {
    const trees = s.objs.filter((o) => o.beh?.fruit && !o.beh.palm); // пальмы у моря — тоже «деревья с плодами», но не села
    const fruit0 = s.objs.filter((o) => ['pear', 'pair of cherries', 'plum'].includes(o.rec?.subject)).length;
    for (const t of trees) s.tap(t);
    s.tap(s.objs.find((o) => o.beh?.hive));
    s.tap(s.objs.find((o) => o.beh?.birdhouse));
    const ham = s.objs.find((o) => o.rec?.id === 'hammock');
    const kid = s.castChar('kid');
    s.startDrag(kid);
    s.drop(kid, { x: ham.x, y: ham.y - 10 });
    s.testKid = kid;
    return {
      trees: trees.length, fruit: s.objs.filter((o) => ['pear', 'pair of cherries', 'plum'].includes(o.rec?.subject)).length - fruit0,
      tried: ['fruit', 'hive', 'birdhouse'].every((k) => s.flags.tried[k]), inHammock: kid.restOn === ham,
    };
  });
  assert.deepEqual(orchard, { trees: 3, fruit: 3, tried: true, inHammock: true });
  await waitFor((s) => s.objs.some((o) => o.rec?.subject === 'jar of honey'));
  await waitFor((s) => s.testKid.sleeping && s.testKid.pose === 'lie' && s.testKid.dreamPicks); // в гамаке спят и видят сны
  await room((s) => { s.startDrag(s.testKid); s.drop(s.testKid, { x: s.testKid.x - 60, y: 90 }); });
  // ---- поле
  await room((s) => s.goRoom(window.__dev.R.field));
  await waitFor((s) => s.curRoom === window.__dev.R.field);
  const field = await room((s) => {
    const hay = s.objs.find((o) => o.beh?.hay);
    const n0 = s.objs.length;
    s.tap(hay);
    const popped = s.objs.length - n0;
    const dad = s.castChar('dad');
    s.startDrag(dad);
    s.drop(dad, { x: hay.x, y: hay.y - 10 });
    const onHay = dad.restOn === hay;
    hay.busyUntil = 0;
    s.tap(hay); // с куклой наверху — подбрасывает
    const bounced = dad.busy;
    s.testDad = dad;
    return { popped, onHay, bounced, hay: !!s.flags.tried.hay };
  });
  assert.deepEqual(field, { popped: 1, onHay: true, bounced: true, hay: true });
  await waitFor((s) => !s.testDad.busy);
  const drive = await room((s) => {
    const t = s.objs.find((o) => o.beh?.tractor);
    const dad = s.testDad;
    s.startDrag(dad);
    s.drop(dad, { x: t.x - 10, y: t.y - 12 });
    s.testT = t;
    const res = { on: dad.restOn === t, dx: dad.x - t.x, x0: t.x, sheaves: s.objs.filter((o) => o.beh?.sheaf).length };
    s.tap(t);
    return { ...res, driving: t.driving };
  });
  assert.deepEqual({ on: drive.on, dx: drive.dx, driving: drive.driving, sheaves: drive.sheaves }, { on: true, dx: -10, driving: true, sheaves: 1 });
  await waitFor((s) => !s.testT.driving && s.testT.flipX);
  const after = await room((s) => {
    const t = s.testT;
    const sheaf = s.objs.find((o) => o.beh?.sheaf);
    const mill = s.objs.find((o) => o.beh?.mill);
    const res = { moved: t.x - s.testDad.x, far: t.x, sheaves: s.objs.filter((o) => o.beh?.sheaf).length, sit: s.testDad.pose };
    s.startDrag(sheaf);
    s.drop(sheaf, { x: mill.x, y: mill.y - 10 });
    res.spin = mill.spinUntil > s.time.now;
    return res;
  });
  assert.ok(after.far > drive.x0 + 100, 'трактор проехал через поле');
  assert.deepEqual({ moved: after.moved, sheaves: after.sheaves, sit: after.sit, spin: after.spin }, { moved: -10, sheaves: 2, sit: 'sit', spin: true }); // развернулся — седок с другой стороны
  await waitFor((s) => s.objs.some((o) => /bread/.test(o.rec?.subject || '')) && s.flags.tried.mill);
  // ---- альбом: страница «село», справка и статистика
  const album = await room((s) => {
    const tab = s.albumTabs().find((t) => t.key === 'farm');
    return { n: tab.entries.length, found: tab.entries.filter((e) => e.found).map((e) => e.result.subject).sort().join('|') };
  });
  assert.equal(album.n, 13);
  for (const sub of ['egg', 'glass bottle of milk', 'ball of yarn', 'jar of honey', 'pear', 'plum', 'pair of cherries']) assert.ok(album.found.includes(sub), `наклейка «${sub}»: ${album.found}`);
  const feats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['travel', 'coop', 'farmfood', 'wool', 'well', 'scarecrow', 'crow', 'fruit', 'hive', 'birdhouse', 'hay', 'tractor', 'mill']) assert.ok(feats[k] >= 1, `счётчик ${k}`);
});

test('город: магазины на улице, светофор, мороженое, фонтан и монетка; прилавки, касса и пакет, тележка; покупатель; примерочная, манекен, подиум; хваталка, капсулы, подарок', async () => {
  await freshRoom();
  await room((s) => s.goPlace('city'));
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.street);
  // ---- улица
  const street = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    s.tap(find((b) => b.stock === 'ice'));
    const ice = s.objs.length - n0;
    const light = find((b) => b.traffic);
    s.tap(light);
    const fountain = find((b) => b.fountain);
    s.tap(fountain);
    const coin = s.objs.find((o) => o.rec?.subject === 'coin' && Math.floor(o.x / W) === window.__dev.R.street);
    s.startDrag(coin);
    s.drop(coin, { x: fountain.x, y: fountain.y - 8 });
    const doors = s.children.list.filter((o) => 'shopDoor' in o && Math.floor(o.x / W) === window.__dev.R.street); // магазины на улице
    return {
      ice, green: light.texture.key, coinGone: !s.objs.includes(coin), tried: ['icecart', 'traffic', 'fountain', 'wishcoin'].every((k) => s.flags.tried[k]),
      stop: s.stopHere()?.portal, doors: doors.map((d) => d.shopDoor).join(), cart: Math.floor(find((b) => b.cart).x / W), music: window.__dev.musicTheme(),
    };
  }, finger.toString());
  assert.deepEqual(street, { ice: 1, green: 'trafficlight_g', coinGone: true, tried: true, stop: 'choose', doors: '11,12,13,14', cart: 10, music: 10 });
  // машины едут на зелёный; тап по машине — сигналит; монетка в фонтане превращается в талисман
  await waitFor((s) => s.cars.length > 0);
  await room((s, mk) => { const f = new Function(`return ${mk}`)(); const c = s.cars[0]; s.onDown(f(1, c.x, c.y - 5), [c]); }, finger.toString());
  await waitFor((s) => s.objs.some((o) => ['lucky charm', 'four leaf clover', 'heart crystal'].includes(o.rec?.subject)));
  // тап по магазину — входим; свайп, начатый на магазине, листает комнаты, как по пустому месту
  const door = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const z = s.children.list.find((o) => o.shopDoor === window.__dev.R.market);
    s.onDown(f(1, z.x + 20, z.y + 20), [z]);
    const swipe = !!s.press.swipe;
    s.onUp(f(1, z.x + 20, z.y + 20));
    return { swipe, target: s.targetRoom, travelling: s.travelling };
  }, finger.toString());
  assert.deepEqual(door, { swipe: true, target: 11, travelling: false });
  await waitFor((s) => s.curRoom === window.__dev.R.market);
  // в каждом магазине — дверь на улицу; из дальнего магазина игрушек она тоже ведёт прямо на улицу
  const exit = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const exits = s.children.list.filter((o) => o.shopDoor === window.__dev.R.street).map((o) => Math.floor(o.x / W)).sort((a, b) => a - b).join();
    const z = s.children.list.find((o) => o.shopDoor === window.__dev.R.street && Math.floor(o.x / W) === window.__dev.R.toyshop);
    s.onDown(f(1, z.x + 6, z.y + 10), [z]);
    s.onUp(f(1, z.x + 6, z.y + 10));
    return { exits, target: s.targetRoom };
  }, finger.toString());
  assert.deepEqual(exit, { exits: '11,12,13,14', target: 10 });
  await waitFor((s) => s.curRoom === window.__dev.R.street);
  await room((s) => s.goRoom(window.__dev.R.market));
  await waitFor((s) => s.curRoom === window.__dev.R.market);
  // ---- супермаркет
  const market = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    for (const k of ['fruit', 'bread', 'dairy']) s.tap(find((b) => b.stock === k));
    const popped = s.objs.length - n0;
    const co = find((b) => b.checkout);
    const apple = s.objs.find((o) => o.rec?.subject === 'apple' && Math.floor(o.x / W) === window.__dev.R.market && o.y > 80);
    s.startDrag(apple);
    s.drop(apple, { x: co.x - 8, y: co.y - 10 });
    const bag = s.objs.find((o) => o.beh?.bag);
    const t = find((b) => b.trolley);
    const bread = s.objs.find((o) => o.rec?.subject === 'baguette' && o.y > 80);
    s.startDrag(bread);
    s.drop(bread, { x: t.x, y: t.y - 8 }); // еда — в тележку, как в корзину
    const loaded = t.contents.length;
    s.tap(t); // без седока тап высыпает покупки
    const spilled = t.contents.length === 0;
    const mia = s.castChar('mia');
    s.startDrag(mia);
    s.drop(mia, { x: t.x, y: t.y - 8 });
    Object.assign(s, { testBag: bag, testT: t, testMia: mia, testX0: t.x });
    s.tap(t); // с куклой — катится через зал
    return { popped, scanned: !s.objs.includes(apple), bag: bag?.contents.length, loaded, spilled, on: mia.restOn === t, rolling: !!t.rolling };
  });
  assert.deepEqual(market, { popped: 3, scanned: true, bag: 1, loaded: 1, spilled: true, on: true, rolling: true });
  await waitFor((s) => s.testBag.texture.key === 'paperbag_full' && s.stickers.has('city', 'paper shopping bag'));
  await waitFor((s) => !s.testT.rolling && Math.abs(s.testT.x - s.testX0) > 100 && s.testMia.restOn === s.testT && Math.abs(s.testMia.x - s.testT.x) <= 4 && s.testMia.pose === 'sit');
  await room((s) => { s.startDrag(s.testMia); s.drop(s.testMia, { x: s.testT.x - 30, y: 92 }); });
  // ---- кафе: витрина, стойка и покупатель
  await room((s) => s.goRoom(window.__dev.R.cafe));
  await waitFor((s) => s.curRoom === window.__dev.R.cafe);
  const cafe = await room((s) => {
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    s.tap(find((b) => b.stock === 'pastry'));
    s.tap(find((b) => b.stock === 'drink'));
    const popped = s.objs.length - n0;
    const quiet = s.hintsFor(s.castChar('cook')).includes('guest');
    const r = Math.random; Math.random = () => 0.99; s.guestAfter = 0; s.guestTick(); Math.random = r;
    return { popped, quiet, guest: s.guest?.room, music: window.__dev.musicTheme() };
  });
  assert.deepEqual(cafe, { popped: 2, quiet: false, guest: 12, music: 11 });
  await waitFor((s) => s.guest?.arrived && s.guest.bubble?.scale === 1);
  const serve = await room((s) => {
    const g = s.guest;
    const asks = s.hintsFor(s.castChar('cook')).includes('guest'); // кукла подсказывает, что ему дать
    const wrong = s.spawnItem(s.findRec('teddy bear'), g.x, g.y - 20);
    s.startDrag(wrong);
    s.drop(wrong, { x: g.x, y: g.y - 8 });
    const refused = s.objs.includes(wrong) && !g.served;
    const right = s.spawnItem(g.want, g.x, g.y - 20);
    s.startDrag(right);
    s.drop(right, { x: g.x, y: g.y - 8 });
    s.testCoins = s.objs.filter((o) => o.rec?.subject === 'coin').length;
    return { asks, refused, served: g.served, taken: !s.objs.includes(right), bubble: !g.bubble, tried: !!s.flags.tried.guest };
  });
  assert.deepEqual(serve, { asks: true, refused: true, served: true, taken: true, bubble: true, tried: true });
  await waitFor((s) => s.objs.filter((o) => o.rec?.subject === 'coin').length === s.testCoins + 1 && !s.guest); // оставил монетку и ушёл
  // ---- магазин одежды
  await room((s) => s.goRoom(window.__dev.R.clothes));
  await waitFor((s) => s.curRoom === window.__dev.R.clothes);
  const shop = await room((s) => {
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    s.tap(find((b) => b.stock === 'hat'));
    s.tap(find((b) => b.stock === 'acc'));
    const popped = s.objs.length - n0;
    const man = find((b) => b.mannequin);
    const hat = s.objs.find((o) => o.rec?.subject === 'sun hat');
    s.startDrag(hat);
    s.drop(hat, { x: man.x, y: man.y - 20 });
    const model = s.castChar('model');
    const pod = find((b) => b.podium);
    s.startDrag(model);
    s.drop(model, { x: pod.x, y: pod.y - 4 });
    const onPodium = model.restOn === pod;
    s.tap(pod);
    Object.assign(s, { testModel: model, testLook: { ...model.look }, testPod: pod, testBooth: find((b) => b.fitting) });
    return { popped, hat: man.slots.pethat === hat, onPodium, mirror: s.objs.some((o) => o.rec?.id === 'shopmirror') };
  });
  assert.deepEqual(shop, { popped: 2, hat: true, onPodium: true, mirror: true });
  await waitFor((s) => s.time.now > s.testPod.busyUntil && s.testPod.texture.key === 'podium');
  const fit = await room((s) => {
    const m = s.testModel;
    const stood = m.pose !== 'sit'; // на подиуме стоят
    s.startDrag(m);
    s.drop(m, { x: s.testBooth.x, y: s.testBooth.y - 10 });
    return { stood, closed: s.testBooth.texture.key, hidden: !m.visible, busy: m.busy, tried: ['hats', 'mannequin', 'podium', 'fitting'].every((k) => s.flags.tried[k]) };
  });
  assert.deepEqual(fit, { stood: true, closed: 'fitting_closed', hidden: true, busy: true, tried: true });
  await waitFor((s) => s.testModel.visible && !s.testModel.busy && s.testBooth.texture.key === 'fitting');
  const out = await room((s) => {
    const m = s.testModel;
    return { outfit: m.look.outfit !== s.testLook.outfit, dress: m.look.dress !== s.testLook.dress, hair: m.look.hair === s.testLook.hair, tex: m.texture.key.startsWith(m.key), beside: Math.abs(m.x - s.testBooth.x) > 10 };
  });
  assert.deepEqual(out, { outfit: true, dress: true, hair: true, tex: true, beside: true });
  // ---- магазин игрушек
  await room((s) => s.goRoom(window.__dev.R.toyshop));
  await waitFor((s) => s.curRoom === window.__dev.R.toyshop);
  const toys = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    s.tap(find((b) => b.stock === 'toy'));
    const popped = s.objs.length - n0;
    const claw = find((b) => b.claw);
    s.tap(claw);
    const gum = find((b) => b.gumball);
    const coin = s.objs.find((o) => o.rec?.subject === 'coin' && Math.floor(o.x / W) === window.__dev.R.toyshop);
    s.startDrag(coin);
    s.drop(coin, { x: gum.x, y: gum.y - 10 });
    const table = find((b) => b.giftwrap);
    const doll = s.spawnItem(s.findRec('rag doll'), table.x, table.y - 30);
    s.startDrag(doll);
    s.drop(doll, { x: table.x, y: table.y - 10 });
    const gift = s.objs.filter((o) => o.beh?.gift).pop(); // только что упакованный (в спальне есть свой подарок)
    Object.assign(s, { testClaw: claw, testGift: gift });
    return { popped, clawBusy: claw.clawBusy, coinGone: !s.objs.includes(coin), wrapped: !s.objs.includes(doll), inside: gift?.contents.join() === doll.rec.id };
  });
  assert.deepEqual(toys, { popped: 1, clawBusy: true, coinGone: true, wrapped: true, inside: true });
  await waitFor((s) => !s.testClaw.clawBusy && s.objs.some((o) => /^plush /.test(o.rec?.subject || '')));
  await waitFor((s) => s.objs.some((o) => ['glass marble', 'bouncy ball', 'puzzle cube'].includes(o.rec?.subject))); // первые капсулы — те, чьих наклеек ещё нет
  await waitFor((s) => s.testGift.alpha === 1 && s.stickers.has('city', 'gift box'));
  // подарок — кукле: в коробке именно та игрушка, которую упаковали
  const opened = await room((s) => {
    const man = s.castChar('toyman');
    s.startDrag(s.testGift);
    s.drop(s.testGift, { x: man.x, y: man.y - 12 });
    return man.slots.hand?.rec.subject;
  });
  assert.equal(opened, 'rag doll');
  // ---- покупки едут домой: пакет — на повозку, и в сад у дома
  await room((s) => s.goRoom(window.__dev.R.street));
  await waitFor((s) => s.curRoom === window.__dev.R.street);
  await room((s) => {
    const cart = s.objs.find((o) => o.beh?.cart);
    const bag = s.testBag;
    s.startDrag(bag);
    bag.x = cart.x;
    s.drop(bag, { x: cart.x, y: cart.y - 8 });
    s.testCart = cart;
    s.portalTap(s.stopHere());
  });
  assert.equal(await choose('place_home'), 'place_home,place_village,place_sea,place_park,place_center');
  await waitFor((s) => !s.travelling && s.curRoom === 2);
  const home = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    return { bag: Math.floor(s.testBag.x / W), on: s.testBag.restOn === s.testCart, load: s.testBag.contents.length, seen: Object.keys(s.flags.seen).sort().join() };
  });
  assert.deepEqual(home, { bag: 2, on: true, load: 1, seen: 'city,home' });
  // ---- альбом: страница «город», статистика
  const album = await room((s) => {
    const tab = s.albumTabs().find((t) => t.key === 'city');
    return { n: tab.entries.length, found: tab.entries.filter((e) => e.found).map((e) => e.result.subject) };
  });
  assert.equal(album.n, 19);
  for (const sub of ['coin', 'paper shopping bag', 'gift box']) assert.ok(album.found.includes(sub), `наклейка «${sub}»: ${album.found}`);
  assert.ok(album.found.some((x) => /^plush /.test(x)) && album.found.some((x) => ['glass marble', 'bouncy ball', 'puzzle cube'].includes(x))
    && album.found.some((x) => ['lucky charm', 'four leaf clover', 'heart crystal'].includes(x)), `плюшевая игрушка, капсула и талисман: ${album.found}`);
  const feats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['travel', 'shopdoor', 'icecart', 'traffic', 'fountain', 'wishcoin', 'shelf', 'checkout', 'trolley', 'pastry', 'guest', 'hats', 'mannequin', 'podium',
    'fitting', 'toystand', 'claw', 'gumball', 'giftwrap']) assert.ok(feats[k] >= 1, `счётчик ${k}`);
});

test('море: волна, замок из песка, пальма, кабинка; лодка, удочка, дельфин, бутылка; ракушка, сундук, подлодка, пузыри, хвост; гнездо и клад; котёл в каждой локации', async () => {
  await freshRoom();
  await room((s) => s.goPlace('sea'));
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.beach);
  // ---- пляж
  const beach = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const count = (subs) => s.objs.filter((o) => subs.includes(o.rec?.subject)).length;
    const shellSubs = ['seashell', 'conch shell', 'scallop shell', 'spiral shell', 'starfish'];
    const z = s.children.list.find((o) => o.seaWave === window.__dev.R.beach);
    const shells0 = count(shellSubs);
    s.onDown(f(1, z.x + 100, z.y + 5), [z]); // настоящий тап по морю у горизонта
    const swipe = !!s.press.swipe;
    s.onUp(f(1, z.x + 100, z.y + 5));
    const c = find((b) => b.sand);
    for (let i = 0; i < 3; i++) { c.busyUntil = 0; s.tap(c); }
    const stage = c.stage;
    c.busyUntil = 0;
    s.tap(c); // из готового замка — краб
    const nuts0 = count(['coconut']);
    s.tap(find((b) => b.palm));
    const sailor = s.castChar('sailor');
    const cab = find((b) => b.cabin);
    s.startDrag(sailor);
    s.drop(sailor, { x: cab.x, y: cab.y - 10 });
    Object.assign(s, { testSailor: sailor, testCab: cab, testCastle: c });
    return {
      swipe, shells: count(shellSubs) - shells0, stage, crab: count(['crab']), nuts: count(['coconut']) - nuts0, closed: cab.texture.key, was: sailor.look.outfit,
      stop: s.stopHere()?.portal, cart: Math.floor(find((b) => b.cart).x / W), music: window.__dev.musicTheme(),
      tried: ['wave', 'sandcastle', 'palm', 'cabin'].every((k) => s.flags.tried[k]),
    };
  }, finger.toString());
  assert.deepEqual(beach, { swipe: true, shells: 1, stage: 3, crab: 1, nuts: 1, closed: 'cabin_closed', was: 'shorts', stop: 'choose', cart: 15, music: 12, tried: true });
  await waitFor((s) => s.testSailor.visible && !s.testSailor.busy && s.testCab.texture.key === 'cabin');
  assert.deepEqual(await room((s) => ({ outfit: s.testSailor.look.outfit, wore: s.testSailor.look.wore, castle: s.testCastle.texture.key })), { outfit: 'swimsuit', wore: 'shorts', castle: 'sandcastle_3' });
  await room((s) => { s.startDrag(s.testSailor); s.drop(s.testSailor, { x: s.testCab.x, y: s.testCab.y - 10 }); });
  await waitFor((s) => s.testSailor.visible && !s.testSailor.busy && s.testSailor.look.outfit === 'shorts'); // ещё раз в кабинку — снова в своём
  // замок переживает перезагрузку
  await room((s) => s.saveNow());
  await page.reload();
  await waitFor((s) => s.objs.length > 10 && s.curRoom === window.__dev.R.beach);
  await waitFor((s) => { const c = s.objs.find((o) => o.beh?.sand); return c.stage === 3 && c.texture.key === 'sandcastle_3'; });
  // ---- в море
  await room((s) => s.goRoom(window.__dev.R.waves));
  await waitFor((s) => s.curRoom === window.__dev.R.waves);
  const waves = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    s.tap(find((b) => b.fishing));
    const sailor = s.castChar('sailor');
    const boat = find((b) => b.boat);
    s.startDrag(sailor);
    s.drop(sailor, { x: boat.x, y: boat.y - 10 });
    const aboard = sailor.restOn === boat;
    const x0 = boat.x;
    s.tap(boat);
    const mia = s.castChar('mia');
    s.startDrag(mia);
    s.drop(mia, { x: window.__dev.R.waves * W + 150, y: 90 }); // куклу — в воду
    s.dolphinJump();
    const d = s.dolphin;
    s.onDown(f(1, d.x, d.y - 6), [d]); // настоящий тап: дельфин — не предмет
    const bottle = s.spawnItem(s.findRec('message in a bottle'), window.__dev.R.waves * W + 200, 88);
    s.tap(bottle);
    Object.assign(s, { testSailor: sailor, testBoat: boat, testX0: x0, testMia: mia });
    return { aboard, rolling: !!boat.rolling, gave: d.gave, press: !!s.press, uncorked: !s.objs.includes(bottle), map: s.objs.some((o) => o.rec?.subject === 'treasure map') };
  }, finger.toString());
  assert.deepEqual(waves, { aboard: true, rolling: true, gave: true, press: false, uncorked: true, map: true });
  await waitFor((s) => s.objs.some((o) => /fish$/.test(o.rec?.subject || '')) && s.objs.some((o) => o.rec?.subject === 'inflatable swim ring'));
  await waitFor((s) => !s.testBoat.rolling && Math.abs(s.testBoat.x - s.testX0) > 80 && s.testSailor.restOn === s.testBoat && Math.abs(s.testSailor.x - s.testBoat.x) <= 13);
  await waitFor((s) => s.testMia.ringImg?.visible && !s.testSailor.ringImg?.visible); // в воде — в круге, в лодке — без него
  // ---- под водой
  await room((s) => s.goRoom(window.__dev.R.deep));
  await waitFor((s) => s.curRoom === window.__dev.R.deep);
  const deep = await room((s, mk) => {
    const f = new Function(`return ${mk}`)();
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    const n0 = s.objs.length;
    s.tap(find((b) => b.clam));
    s.tap(find((b) => b.seachest));
    const popped = s.objs.length - n0;
    s.tap(find((b) => b.vent));
    const sub = find((b) => b.sub);
    const mermaid = s.castChar('mermaid');
    const tail = !!mermaid.tailImg?.visible;
    s.startDrag(mermaid);
    s.drop(mermaid, { x: sub.x + 3, y: sub.y - 12 });
    const x0 = sub.x;
    s.tap(sub);
    s.fishSwim();
    const fish = s.shoal[0];
    const dir = fish.dir;
    s.onDown(f(1, fish.x, fish.y), [fish]);
    Object.assign(s, { testSub: sub, testX0: x0, testMermaid: mermaid });
    return {
      popped, clam: find((b) => b.clam).texture.key, chest: find((b) => b.seachest).texture.key, tail, aboard: mermaid.restOn === sub, rolling: !!sub.rolling,
      turned: fish.dir === -dir, music: window.__dev.musicTheme(), tried: ['clam', 'seachest', 'vent', 'sub'].every((k) => s.flags.tried[k]),
    };
  }, finger.toString());
  assert.deepEqual(deep, { popped: 2, clam: 'giantclam_open', chest: 'seachest_open', tail: true, aboard: true, rolling: true, turned: true, music: 6, tried: true });
  await waitFor((s) => (s.popBubbles?.length || 0) > 0);
  await waitFor((s) => !s.testSub.rolling && Math.abs(s.testSub.x - s.testX0) > 80 && s.testMermaid.restOn === s.testSub && !s.testMermaid.tailImg.visible);
  // ---- остров: гнездо, клад по карте, котелок на костре
  await room((s) => s.goRoom(window.__dev.R.island));
  await waitFor((s) => s.curRoom === window.__dev.R.island);
  const island = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    s.tap(find((b) => b.nest));
    const x = find((b) => b.xmark);
    const map = s.objs.find((o) => o.rec?.subject === 'treasure map');
    const at = { x: x.x, y: x.y };
    s.startDrag(map);
    s.drop(map, { x: x.x, y: x.y - 4 });
    // котелок на костре — тот же котёл: ракушка + морская звезда = жемчужина
    const pot = s.objs.find((o) => o.beh?.cauldron && Math.floor(o.x / W) === window.__dev.R.island);
    for (const sub of ['seashell', 'starfish']) { const o = s.spawnItem(s.findRec(sub), pot.x, pot.y - 30); s.startDrag(o); s.drop(o, { x: pot.x, y: pot.y - 12 }); }
    // подсказка рецепта — из того, что лежит в этой локации
    const r = Math.random; Math.random = () => 0; const hint = s.magicPick(); Math.random = r;
    Object.assign(s, { testX: x, testAt: at, testPot: pot });
    const places = {};
    for (const rec of s.alchemy.recipes.values()) places[rec.place] = (places[rec.place] || 0) + 1;
    return {
      dug: !s.objs.includes(map), digging: x.digging, inPot: pot.contents.length, hint: hint[1].place, places,
      pots: s.objs.filter((o) => o.beh?.cauldron).map((o) => Math.floor(o.x / W)).sort((a, b) => a - b).join(), // кухня, двор села, кафе, остров
    };
  });
  assert.deepEqual(island, { dug: true, digging: true, inPot: 2, hint: 'sea', places: { home: 20, village: 7, city: 6, sea: 7, park: 7, center: 8, far: 13 }, pots: '1,6,12,18,21,24' });
  await waitFor((s) => s.objs.some((o) => o.rec?.subject === 'sea turtle') && s.objs.some((o) => o.rec?.subject === 'diamond'));
  await waitFor((s) => !s.testX.digging && (s.testX.x !== s.testAt.x || s.testX.y !== s.testAt.y)); // крестик переехал
  await waitFor((s) => !s.testPot.brewing && s.alchemy.found['seashell + starfish']?.result === 'pearl');
  // ---- котлы села и города варят так же; альбом котла знает место рецепта
  const pots = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const brewIn = (room, a, b) => {
      const pot = s.objs.find((o) => o.beh?.cauldron && Math.floor(o.x / W) === room);
      pot.contents = [s.findRec(a).id, s.findRec(b).id];
      s.brew(pot);
      return pot.rec.id;
    };
    const ids = [brewIn(window.__dev.R.yard, 'glass bottle of milk', 'egg'), brewIn(window.__dev.R.cafe, 'top hat', 'coin')].join();
    const entry = s.alchemy.entries().find((e) => e.key === 'seashell + starfish');
    return { ids, place: entry.place, found: entry.found };
  });
  assert.deepEqual(pots, { ids: 'ironpot,cafepot', place: 'sea', found: true });
  await waitFor((s) => s.alchemy.found['egg + glass bottle of milk']?.result === 'stack of pancakes' && s.alchemy.found['coin + top hat']?.result === 'rabbit');
  // ---- альбом: страница «море», статистика
  const album = await room((s) => {
    const tab = s.albumTabs().find((t) => t.key === 'sea');
    s.openAlbum();
    s.onAlbumUi({ albumTab: 0 }); // страница котла со значками мест рисуется без ошибок
    const heads = s.albumUi.rows.length > 0;
    s.onAlbumUi({ albumDone: true });
    return { n: tab.entries.length, found: tab.entries.filter((e) => e.found).map((e) => e.result.subject), heads };
  });
  assert.equal(album.n, 24);
  assert.ok(album.heads);
  for (const sub of ['coconut', 'crab', 'inflatable swim ring', 'treasure map', 'pearl', 'diamond', 'sea turtle']) assert.ok(album.found.includes(sub), `наклейка «${sub}»: ${album.found}`);
  assert.ok(album.found.some((x) => /fish$/.test(x)) && album.found.some((x) => ['ruby', 'sapphire', 'emerald'].includes(x)), `рыбка и самоцвет: ${album.found}`);
  const feats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['travel', 'wave', 'sandcastle', 'palm', 'cabin', 'boat', 'fishing', 'dolphin', 'bottle', 'clam', 'seachest', 'sub', 'vent', 'treasure', 'nest', 'brew']) assert.ok(feats[k] >= 1, `счётчик ${k}`);
});

test('парк: роща и скала, слон, обезьянка; горка, бассейн, плот, фонтанчик, ведро; карусель, гусеница, силомер, ларёк, котёл; ворота, кольцо, батут, пьедестал, скейт', async () => {
  await freshRoom();
  await room((s) => s.goPlace('park'));
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.zoo);
  // ---- зоопарк
  const zoo = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && pred(o.beh));
    s.tap(find((b) => b.bamboo));
    s.tap(find((b) => b.icepool));
    const el = find((b) => b.elephant);
    s.tap(el); // без седока — трубит и брызгает
    const sprayed = el.texture.key;
    const tree = find((b) => b.monkey);
    s.tap(tree);
    const hat = s.spawnItem(s.findRec('top hat'), tree.x, tree.y - 40);
    s.startDrag(hat);
    s.drop(hat, { x: tree.x + 8, y: tree.y - 30 });
    const food = s.spawnItem(s.findRec('apple'), el.x, el.y - 40);
    s.startDrag(food);
    s.drop(food, { x: el.x, y: el.y - 12 });
    const keeper = s.castChar('keeper');
    // открытка парка и карта с пятью местами рисуются
    const card = s.spawnItem(s.byId.get('postcard-park'), el.x, 90);
    s.tap(card);
    const cardOf = s.cardUi?.place;
    s.closeCard();
    s.removeObj(card, true);
    s.openMap('park');
    const map = !!s.mapUi;
    s.closeMap();
    Object.assign(s, { testEl: el, testKeeper: keeper });
    return {
      sprayed, hat: tree.slots.pethat === hat, fed: !s.objs.includes(food), cardOf, map, stop: s.stopHere()?.portal, cart: Math.floor(find((b) => b.cart).x / W),
      keeper: Math.floor(keeper.x / W), champ: Math.floor(s.castChar('champ').x / W), music: window.__dev.musicTheme(),
      tried: ['bamboo', 'icepool', 'elephant', 'monkey', 'zoofeed'].every((k) => s.flags.tried[k]),
    };
  });
  assert.deepEqual(zoo, { sprayed: 'elephant_b', hat: true, fed: true, cardOf: 'park', map: true, stop: 'choose', cart: 19, keeper: 19, champ: 22, music: 13, tried: true });
  await waitFor((s) => {
    const has = (subs) => s.objs.some((o) => subs.includes(o.rec?.subject));
    return has(['panda', 'red panda', 'koala']) && has(['penguin', 'emperor penguin', 'harp seal']) && has(['banana']);
  });
  // слон с седоком идёт через комнату
  await waitFor((s) => s.testEl.texture.key === 'elephant');
  const ride = await room((s) => {
    const { testEl: el, testKeeper: keeper } = s;
    s.startDrag(keeper);
    s.drop(keeper, { x: el.x - 3, y: el.y - 24 });
    s.testX0 = el.x;
    s.tap(el);
    return { aboard: keeper.restOn === el, rolling: !!el.rolling };
  });
  assert.deepEqual(ride, { aboard: true, rolling: true });
  await waitFor((s) => !s.testEl.rolling && Math.abs(s.testEl.x - s.testX0) > 60 && s.testKeeper.restOn === s.testEl && Math.abs(s.testKeeper.x - s.testEl.x) <= 12 && s.testKeeper.pose === 'sit');
  // ---- аквапарк
  await room((s) => s.goRoom(window.__dev.R.aqua));
  await waitFor((s) => s.curRoom === window.__dev.R.aqua);
  const aqua = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && Math.floor(o.x / W) === window.__dev.R.aqua && pred(o.beh));
    const toys = ['rubber duck', 'swim cap', 'bubble wand', 'inflatable flamingo float'];
    const toys0 = s.objs.filter((o) => toys.includes(o.rec?.subject)).length;
    const sl = find((b) => b.slide);
    const mia = s.castChar('mia');
    s.startDrag(mia);
    s.drop(mia, { x: sl.x - 10, y: sl.y - 30 }); // на горку
    const sliding = !!mia.sliding && mia.y < sl.y - 20;
    s.tap(find((b) => b.geyser));
    s.tap(find((b) => b.tipbucket));
    const raft = find((b) => b.raft);
    const zoe = s.castChar('zoe');
    s.startDrag(zoe);
    s.drop(zoe, { x: raft.x, y: raft.y - 4 });
    const x0 = raft.x;
    s.tap(raft);
    Object.assign(s, { testMia: mia, testZoe: zoe, testRaft: raft, testX0: x0, testToys: toys, testToys0: toys0 });
    return { sliding, aboard: zoe.restOn === raft, rolling: !!raft.rolling, cabin: !!find((b) => b.cabin), tried: ['slide', 'geyser', 'tipbucket', 'raft'].every((k) => s.flags.tried[k]) };
  });
  assert.deepEqual(aqua, { sliding: true, aboard: true, rolling: true, cabin: true, tried: true });
  await waitFor((s) => !s.testMia.sliding && !s.testMia.busy && s.inPool(s.testMia) && s.testMia.ringImg?.visible); // съехала в бассейн — и в круге
  await waitFor((s) => s.objs.filter((o) => s.testToys.includes(o.rec?.subject)).length > s.testToys0);
  await waitFor((s) => !s.testRaft.rolling && Math.abs(s.testRaft.x - s.testX0) > 80 && s.testZoe.restOn === s.testRaft && !s.testZoe.ringImg?.visible);
  // ---- аттракционы
  await room((s) => s.goRoom(window.__dev.R.rides));
  await waitFor((s) => s.curRoom === window.__dev.R.rides);
  const rides = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && Math.floor(o.x / W) === window.__dev.R.rides && pred(o.beh));
    const prizes = ['balloon', 'heart balloon', 'balloon dog'];
    const prizes0 = s.objs.filter((o) => prizes.includes(o.rec?.subject)).length;
    const car = find((b) => b.carousel);
    const boy = s.castChar('boy');
    s.startDrag(boy);
    s.drop(boy, { x: car.x, y: car.y - 20 });
    s.tap(car);
    const co = find((b) => b.coaster);
    const mom = s.castChar('mom');
    s.startDrag(mom);
    s.drop(mom, { x: co.x - 4, y: co.y - 6 });
    const x0 = co.x;
    const y0 = co.y;
    s.tap(co);
    const ham = find((b) => b.hammer);
    s.tap(ham);
    const r = Math.random; Math.random = () => 0; s.tap(find((b) => b.treats)); Math.random = r; // первой — сладкая вата
    const pot = find((b) => b.cauldron);
    pot.contents = [s.findRec('cotton candy').id, s.findRec('balloon').id];
    s.brew(pot);
    Object.assign(s, { testCar: car, testBoy: boy, testBoyX: boy.x, testCo: co, testMom: mom, testX0: x0, testY0: y0, testHam: ham, testPrizes: prizes, testPrizes0: prizes0 });
    return {
      aboard: boy.restOn === car, spinning: car.spinUntil > s.time.now, mom: mom.restOn === co, rolling: !!co.rolling, hammer: !!ham.hamBusy, pot: pot.rec.id,
      music: window.__dev.musicTheme(), tried: ['carousel', 'coaster', 'hammer', 'treats'].every((k) => s.flags.tried[k]),
    };
  });
  assert.deepEqual(rides, { aboard: true, spinning: true, mom: true, rolling: true, hammer: true, pot: 'fairpot', music: 14, tried: true });
  await waitFor((s) => s.testCar.horses?.length === 3 && s.testBoy.pose === 'sit' && s.testBoy.x !== s.testBoyX && Math.abs(s.testBoy.x - s.testCar.x) <= 19); // лошадка везёт по кругу
  await room((s) => { s.testCar.spinUntil = s.time.now; });
  await waitFor((s) => !s.testCar.wasSpinning && s.testCar.texture.key === 'carousel');
  await waitFor((s) => !s.testHam.hamBusy);
  await room((s) => s.tap(s.testHam)); // второй удар — точно до колокола
  await waitFor((s) => s.objs.filter((o) => s.testPrizes.includes(o.rec?.subject)).length > s.testPrizes0);
  await waitFor((s) => !s.testCo.rolling && Math.abs(s.testCo.x - s.testX0) > 80 && s.testCo.y === s.testY0 && s.testMom.restOn === s.testCo && Math.abs(s.testMom.x - s.testCo.x) <= 18);
  await waitFor((s) => s.objs.some((o) => o.rec?.subject === 'cotton candy') && s.alchemy.found['balloon + cotton candy']?.result === 'cloud sheep');
  // ---- спортплощадка
  await room((s) => s.goRoom(window.__dev.R.sport));
  await waitFor((s) => s.curRoom === window.__dev.R.sport);
  const sport = await room((s) => {
    const W = Math.ceil(s.sys.game.config.width / s.cameras.main.zoom);
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && Math.floor(o.x / W) === window.__dev.R.sport && pred(o.beh));
    s.tap(find((b) => b.goal)); // ближайший мяч — в ворота
    s.tap(find((b) => b.hoop)); // следующий — в кольцо
    const flying = s.objs.filter((o) => o.flyUntil > s.time.now).length;
    const tr = find((b) => b.trampoline);
    const champ = s.castChar('champ');
    s.startDrag(champ);
    s.drop(champ, { x: tr.x, y: tr.y - 6 });
    const onTr = champ.restOn === tr;
    s.tap(tr);
    const ped = find((b) => b.pedestal);
    const star = s.castChar('star');
    s.startDrag(star);
    s.drop(star, { x: ped.x, y: ped.y - 10 });
    const first = ped.y - star.y;
    s.tap(ped);
    const sk = s.objs.find((o) => o.rec?.subject === 'skateboard');
    const x0 = sk.x;
    s.tap(sk);
    Object.assign(s, { testSk: sk, testX0: x0 });
    return { flying, onTr, jumping: champ.busy, first, pose: s.poseOf(star), skate: !!sk.rolling, tried: ['trampoline', 'winners', 'wheels'].every((k) => s.flags.tried[k]) };
  });
  assert.deepEqual(sport, { flying: 2, onTr: true, jumping: true, first: 18, pose: 'stand', skate: true, tried: true });
  await waitFor((s) => s.flags.tried.goal && s.flags.tried.hoop && ['victory cup', 'loving cup'].every((sub) => s.objs.some((o) => o.rec?.subject === sub)));
  await waitFor((s) => s.objs.some((o) => ['medal on ribbon', 'star-shaped medal', 'prize ribbon rosette'].includes(o.rec?.subject)));
  await waitFor((s) => !s.testSk.rolling && Math.abs(s.testSk.x - s.testX0) > 60);
  // ---- альбом: страница «парк», статистика
  const album = await room((s) => {
    const tab = s.albumTabs().find((t) => t.key === 'park');
    return { n: tab.entries.length, found: tab.entries.filter((e) => e.found).map((e) => e.result.subject) };
  });
  assert.equal(album.n, 22);
  for (const sub of ['banana', 'cotton candy', 'victory cup', 'loving cup']) assert.ok(album.found.includes(sub), `наклейка «${sub}»: ${album.found}`);
  for (const group of [['panda', 'red panda', 'koala'], ['penguin', 'emperor penguin', 'harp seal'], ['rubber duck', 'swim cap', 'bubble wand', 'inflatable flamingo float'],
    ['balloon', 'heart balloon', 'balloon dog'], ['medal on ribbon', 'star-shaped medal', 'prize ribbon rosette']]) assert.ok(album.found.some((x) => group.includes(x)), `наклейка из «${group}»: ${album.found}`);
  const feats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['travel', 'bamboo', 'icepool', 'elephant', 'monkey', 'zoofeed', 'slide', 'raft', 'geyser', 'tipbucket', 'carousel', 'coaster', 'hammer', 'treats',
    'goal', 'hoop', 'trampoline', 'winners', 'wheels', 'brew']) assert.ok(feats[k] >= 1, `счётчик ${k}`);
});

// ------------------------------------------------------------------ игровая, обои, таймер сна (2026-11-18)
test('игровая: шестая комната дома; лошадка, шалаш, сухой бассейн, театр; подружка живёт здесь', async () => {
  await freshRoom();
  const R = await page.evaluate(() => window.__dev.R);
  assert.equal(R.playroom, 5, 'игровая сразу за залом');
  assert.equal(R.yard, 6, 'село сдвинулось на одну комнату');
  await room((s, R) => s.goRoom(R.playroom), R);
  await waitFor((s, R) => s.curRoom === R.playroom, R);
  const st = await room((s, R) => {
    const here = (o) => Math.floor(o.x / 293) === R.playroom;
    const find = (pred) => s.objs.find((o) => o.kind === 'item' && here(o) && pred(o.beh));
    const pip = s.castChar('pip');
    const pit = find((b) => b.pit); const tent = find((b) => b.tent); const horse = find((b) => b.rocker); const show = find((b) => b.puppets);
    const bear = s.spawnItem(s.findRec('teddy bear'), horse.x + 30, 100);
    // кукла — в бассейн, мишка — на лошадку, Мия — в шалаш (обычным броском)
    s.startDrag(pip); s.drop(pip, { x: pit.x, y: pit.y - 6 });
    s.startDrag(bear); s.drop(bear, { x: horse.x, y: horse.y - 10 });
    const mia = s.castChar('mia');
    mia.x = tent.x + 40; s.startDrag(mia); s.drop(mia, { x: tent.x, y: tent.y - 6 });
    // тап: бассейн трижды — выныривает игрушка
    const before = s.objs.length;
    for (let i = 0; i < 3; i++) { pit.busyUntil = 0; s.pitTap(pit); }
    s.tap(horse); s.tap(tent); s.tap(show);
    return {
      bin: !!find((b) => b.bin), roller: s.objs.some((o) => o.beh?.roller && here(o)),
      pip: here(pip), inPit: pip.restOn === pit, onHorse: bear.restOn === horse, inTent: mia.restOn === tent,
      toy: s.objs.length > before, rocking: !!horse.rocking, lights: tent.texture.key, showing: !!show.showing,
    };
  }, R);
  assert.deepEqual(st, { bin: true, roller: true, pip: true, inPit: true, onHorse: true, inTent: true, toy: true, rocking: true, lights: 'tent_b', showing: true });
  await waitFor((s, R) => { const b = s.objs.find((o) => o.beh?.puppets); const h = s.objs.find((o) => o.beh?.rocker); return !b.showing && !h.rocking && h.angle === 0; }, R);
  // в шалаше кукла позади его стенки (видна только макушка) — глубина обновляется в кадре
  await waitFor((s) => { const t = s.objs.find((o) => o.beh?.tent); return s.castChar('mia').depth < t.depth; });
  const tried = await room((s) => ['rockhorse', 'tent', 'ballpit', 'puppets'].filter((k) => s.flags.tried?.[k]).join());
  assert.equal(tried, 'rockhorse,tent,ballpit,puppets');
  // окно игровой меняет день и ночь
  const night = await room((s, R) => {
    const p = { worldX: R.playroom * 293 + Math.round(293 * 0.66) + 10, worldY: 15, id: 1, downTime: 0, upTime: 0, x: 0, y: 0, isDown: true };
    s.press = null; s.onDown(p, []); s.onUp(p);
    return s.night;
  }, R);
  assert.equal(night, true);
  await room((s) => s.applyNight(false));
});

test('старый дом без игровой: всё правее зала сдвигается на комнату, игровая обставляется, комната на экране та же', async () => {
  await freshRoom();
  const R = await page.evaluate(() => window.__dev.R);
  await room((s, R) => { s.goRoom(R.yard); }, R);
  await waitFor((s, R) => s.curRoom === R.yard && !s.travelling, R);
  const was = await room((s) => {
    const at = (pred) => { const o = s.objs.find(pred); return [Math.round(o.x), Math.round(o.y)]; };
    s.flags.prints = [[s.objs.find((o) => o.beh?.coop).x - 10, 100]];
    return { coop: at((o) => o.beh?.coop), elephant: at((o) => o.beh?.elephant), granny: at((o) => o.cast === 'granny'), print: s.flags.prints[0][0] };
  });
  // так выглядело сохранение до игровой: ленты на комнату короче, отметок о вставке нет
  await reloadWith(new Function('st', `
    const W = st.W, at = ${R.playroom} * W;
    const inPlay = (o) => o.x >= at && o.x < at + W;
    st.objs = st.objs.filter((o) => !inPlay(o));
    st.chars = st.chars.filter((o) => !inPlay(o));
    for (const o of [...st.objs, ...st.chars]) if (o.x >= at + W) o.x -= W;
    for (const p of st.flags.prints) p[0] -= W;
    st.room -= 1;
    delete st.flags.inserted; delete st.flags.playroom; delete st.flags.cast7;
  `));
  const now = await room((s) => {
    const at = (pred) => { const o = s.objs.find(pred); return [Math.round(o.x), Math.round(o.y)]; };
    return {
      coop: at((o) => o.beh?.coop), elephant: at((o) => o.beh?.elephant), granny: at((o) => o.cast === 'granny'), print: s.flags.prints[0][0],
      room: s.curRoom, inserted: s.flags.inserted.join(), pip: !!s.castChar('pip'), tent: s.objs.some((o) => o.beh?.tent),
    };
  });
  assert.deepEqual(now, { ...was, room: R.yard, inserted: 'playroom', pip: true, tent: true });
});

test('обои и пол: валик на стену — новые обои, на пол — новый пол, по кругу; в саду не красит; после перезагрузки на месте', async () => {
  await freshRoom();
  const R = await page.evaluate(() => window.__dev.R);
  const st = await room((s, R) => {
    const roller = s.objs.find((o) => o.beh?.roller);
    // свободное место на стене (у самого потолка) или на полу — где нет мебели
    const free = (room, y) => {
      for (let x = room * 293 + 20; x < (room + 1) * 293 - 20; x += 7) if (!s.objAt(x, y, (o) => o.kind === 'item' && o.beh.furniture && !o.beh.flat)) return { x, y };
      return null;
    };
    const wall = (room) => free(room, 3);
    const floor = (room) => free(room, s.overlay.height - 2);
    s.startDrag(roller); s.drop(roller, wall(R.bedroom));
    const one = [...s.flags.decor.bedroom];
    s.startDrag(roller); s.drop(roller, floor(R.bedroom));
    const two = [...s.flags.decor.bedroom];
    for (let i = 0; i < 6; i++) { s.startDrag(roller); s.drop(roller, wall(R.kitchen)); } // 6 обоев + «как было»
    const kitchen = [...s.flags.decor.kitchen];
    s.startDrag(roller); s.drop(roller, wall(R.garden));
    return { one, two, kitchen, garden: !s.flags.decor.garden, img: !!s.decorImgs.bedroom?.active, kimg: !!s.decorImgs.kitchen, tried: !!s.flags.tried?.decor };
  }, R);
  assert.deepEqual(st, { one: [1, 0], two: [1, 1], kitchen: [6, 0], garden: true, img: true, kimg: true, tried: true });
  await room((s) => s.saveNow());
  await page.reload();
  await waitFor((s) => s.objs.length > 10);
  assert.deepEqual(await room((s) => ({ bed: s.flags.decor.bedroom, img: s.decorImgs.bedroom?.texture.key })), { bed: [1, 1], img: 'decor_bedroom' });
});

test('таймер сна: время вышло — ночь, домой в спальню, кукла в кровати, без облачков снов и автобуса; утро — всё как обычно; настройка в родительской зоне', async () => {
  await freshRoom();
  const R = await page.evaluate(() => window.__dev.R);
  await room((s, R) => { s.buddy = s.castChar('mia').uid; s.goRoom(R.street); }, R);
  await waitFor((s, R) => s.curRoom === R.street && !s.travelling, R);
  await room((s) => s.startBedtime());
  await waitFor((s, R) => s.bedtime && s.curRoom === R.bedroom && s.night && s.objs.some((o) => o.kind === 'char' && o.sleeping), R);
  const st = await room((s) => {
    s.sleepTick(); s.wishTick();
    const sleepers = s.objs.filter((o) => o.kind === 'char' && o.sleeping);
    return { clouds: sleepers.some((c) => c.dreamPicks), wish: !!s.wish, bus: s.bus === null || !s.bus };
  });
  assert.deepEqual(st, { clouds: false, wish: false, bus: true });
  await room((s) => s.applyNight(false, true));
  assert.equal(await room((s) => s.bedtime), false);
  // родительская зона: выбор таймера и место в хранилище
  await room((s) => { s.press = { id: 1, ui: { gear: true }, t0: performance.now() - 2100 }; }); // палец держит шестерёнку 2 с
  await page.waitForSelector('#parent-zone');
  const pz = await page.evaluate(() => {
    const sel = document.querySelector('#pz-bedtime select');
    sel.value = '20'; sel.dispatchEvent(new Event('input', { bubbles: true }));
    const r = { saved: localStorage.getItem('pixel-house-bedtime'), text: document.querySelector('#pz-bedtime small').textContent, storage: document.querySelector('#pz-storage .val').textContent };
    const sel2 = document.querySelector('#pz-bedtime select'); // после выбора блок перерисован
    sel2.value = '0'; sel2.dispatchEvent(new Event('input', { bubbles: true }));
    r.off = localStorage.getItem('pixel-house-bedtime');
    document.querySelector('#parent-zone [data-act=close]').click();
    return r;
  });
  assert.equal(pz.saved, '20');
  assert.match(pz.text, /Осталось примерно 20 мин/);
  assert.match(pz.storage, /КБ|МБ/);
  assert.equal(pz.off, null);
});

test('центр: поезд везёт куда угодно, билет, часы; доска с мелом, звонок, глобус, счёты, котёл-колба; кушетка, рентген, пластырь и ушиб, шкафчик, скорая; занавес и декорации, аплодисменты, прожектор, костюмы, ширма', async () => {
  await freshRoom();
  const R = await page.evaluate(() => window.__dev.R);
  await room((s, R) => { s.travel(R.station); return true; }, R);
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.station, null, 20000);
  // вокзал: жители на местах, поезд — облачка со всеми местами, билет на поезд — тоже
  const st = await room((s) => {
    const R = window.__dev.R;
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    const at = (id) => { const c = s.castChar(id); return c ? Math.floor(c.x / W) : -1; };
    const out = { cast: [at('conductor'), at('teacher'), at('doctor'), at('actress')].join() === [R.station, R.school, R.hospital, R.theater].join(), train: !!s.trainImg };
    s.trainTap(s.trainImg);
    out.places = s.choices.parts.filter((o) => o.choice).map((o) => o.choice.icon).join();
    s.closeChoices();
    const box = s.objs.find((o) => o.beh?.tickets);
    s.tap(box);
    const clock = s.objs.find((o) => o.beh?.sclock);
    s.tap(clock);
    out.ticking = !!clock.ticking;
    return out;
  });
  assert.deepEqual(st, { cast: true, train: true, places: 'place_home,place_village,place_city,place_sea,place_park', ticking: true });
  await waitFor((s) => s.objs.some((o) => o.beh?.ticket), null, 5000);
  const tk = await room((s) => {
    const t = s.objs.find((o) => o.beh?.ticket);
    s.startDrag(t);
    s.drop(t, { x: s.trainImg.x, y: s.trainImg.y - 10 });
    const n = s.choices?.parts.filter((o) => o.choice).length;
    // едем поездом на море
    s.choices.parts.find((o) => o.choice?.icon === 'place_sea').choice.act();
    return { n, sticker: s.stickers.has('center', 'train ticket'), via: s.viaTrain };
  });
  assert.deepEqual(tk, { n: 5, sticker: true, via: true });
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.beach, null, 20000);
  assert.equal(await room((s) => s.viaTrain), false);
  await room((s, R) => { s.travel(R.school); return true; }, R);
  await waitFor((s) => !s.travelling && s.curRoom === window.__dev.R.school, null, 20000);
  // школа: мел по доске (и губка), звонок — урок и перемена, глобус, счёты, котёл-колба
  const sc = await room((s) => {
    const b = s.board;
    const out = {};
    s.chalkDown({ x: b.x0 + 10, y: b.y + 8 });
    for (let i = 0; i < 20; i++) s.chalkAt({ x: b.x0 + 10 + i, y: b.y + 8 + (i % 5) });
    s.chalkEnd();
    out.strokes = s.flags.board.length;
    out.points = s.flags.board[0].p.length > 20;
    s.saveNow();
    out.saved = JSON.parse(localStorage.getItem('pixel-house-v3')).flags.board.length;
    const W = Math.round(s.sys.game.config.width / s.cameras.main.zoom);
    s.tap(s.objs.find((o) => o.beh?.sbell)); // урок: куклы в классе садятся за парты
    out.pot = s.objs.some((o) => o.rec?.id === 'flaskpot' && Math.floor(o.x / W) === s.curRoom);
    return out;
  });
  assert.deepEqual(sc, { strokes: 1, points: true, saved: 1, pot: true });
  await waitFor((s) => s.objs.some((o) => o.kind === 'char' && o.restOn?.beh?.desk), null, 5000);
  const sc2 = await room((s) => {
    const bell = s.objs.find((o) => o.beh?.sbell);
    bell.ringing = false;
    s.tap(bell); // перемена: встают из-за парт
    const out = { seated: s.objs.filter((o) => o.kind === 'char' && o.restOn?.beh?.desk).length };
    const g = s.objs.find((o) => o.beh?.globe);
    s.tap(g);
    const a = s.objs.find((o) => o.beh?.abacus);
    for (let i = 0; i < 5; i++) s.tap(a);
    out.abacus = a.texture.key;
    // губка в конце полочки стирает доску
    const b = s.board;
    const slot = Math.floor(b.w / 5);
    s.chalkDown({ x: b.x0 + 4 + 4 * slot + 3, y: b.y + b.h + 1 });
    out.wiped = s.flags.board.length;
    return out;
  });
  assert.deepEqual(sc2, { seated: 0, abacus: 'abacus_5', wiped: 0 });
  await waitFor((s) => Object.keys(s.stickers.found.center || {}).length >= 2, null, 5000); // билет и зверь с глобуса
  // больница: рентген, пластырь на ушибленную куклу, кушетка, шкафчик, скорая
  await room((s) => { s.goRoom(window.__dev.R.hospital); return true; });
  await waitFor((s) => s.curRoom === window.__dev.R.hospital);
  const hs = await room((s) => {
    const doc = s.castChar('doctor');
    const x = s.objs.find((o) => o.beh?.xray);
    s.startDrag(doc);
    s.drop(doc, { x: x.x, y: x.y - 8 });
    const out = { xray: x.texture.key, hidden: !doc.visible };
    s.tap(s.objs.find((o) => o.beh?.firstaid));
    s.tap(s.objs.find((o) => o.beh?.medcab));
    const amb = s.objs.find((o) => o.beh?.ambulance);
    s.tap(amb);
    out.amb = !!amb.rolling;
    return out;
  });
  assert.deepEqual(hs, { xray: 'xray_doll', hidden: true, amb: true });
  await waitFor((s) => s.castChar('doctor').visible && s.objs.some((o) => o.beh?.plaster), null, 6000);
  await room((s) => { s.ouch(s.castChar('doctor')); return true; });
  await waitFor((s) => s.castChar('doctor').needs?.has('ouch'), null, 5000);
  const pl2 = await room((s) => {
    const doc = s.castChar('doctor');
    const p = s.objs.find((o) => o.beh?.plaster);
    s.startDrag(p);
    s.drop(p, { x: doc.x, y: doc.y - 10 });
    s.updateCenter();
    const couch = s.objs.find((o) => o.beh?.couch);
    const kit = s.findRec('kitten');
    const k = s.spawnItem(kit, couch.x, couch.y + 6);
    s.startDrag(k);
    s.drop(k, { x: couch.x, y: couch.y - 6 });
    s.tap(couch);
    return { need: doc.needs.has('ouch'), on: !!doc.plasterImg?.visible, gone: !s.objs.some((o) => o.beh?.plaster && o.restOn === null && Math.abs(o.x - doc.x) < 3), rider: k.restOn === couch, xray: s.objs.find((o) => o.beh?.xray).texture.key };
  });
  assert.deepEqual(pl2, { need: false, on: true, gone: true, rider: true, xray: 'xray' });
  // театр: занавес, декорации, аплодисменты, прожектор, костюмы, ширма
  await room((s) => { s.goRoom(window.__dev.R.theater); return true; });
  await waitFor((s) => s.curRoom === window.__dev.R.theater);
  const th = await room((s) => {
    const st = s.objs.find((o) => o.beh?.tstage);
    const a = s.castChar('actress');
    s.startDrag(a);
    s.drop(a, { x: st.x, y: st.y - 10 });
    // открыть — через настоящий ввод (нажал и отпустил), а не прямым вызовом: так нашлось, что поле
    // с картинкой занавеса, названное «curtain», уводило касание в занавес концертного зала
    const p = { id: 7, x: 0, y: 0, worldX: st.x, worldY: st.y - 20, downTime: s.time.now, upTime: s.time.now + 80, isDown: true };
    s.onDown(p, [st]);
    p.isDown = false;
    s.onUp(p);
    const out = { onStage: a.restOn === st, open: !!st.open };
    st.busyUntil = 0;
    s.tap(st); // задёрнуть — декорации сменятся
    s.tap(s.objs.find((o) => o.beh?.spot));
    out.beam = !!s.spotBeam;
    s.tap(s.objs.find((o) => o.beh?.costumes));
    return out;
  });
  assert.deepEqual(th, { onStage: true, open: true, beam: true });
  await waitFor((s) => s.objs.find((o) => o.beh?.tstage).scene_k === 1, null, 3000);
  const th2 = await room((s) => {
    const scr = s.objs.find((o) => o.rec?.id === 'tscreen');
    const a = s.castChar('actress');
    const before = a.look.outfit + a.look.dress;
    s.startDrag(a);
    s.drop(a, { x: scr.x, y: scr.y - 10 });
    return { before, closed: scr.texture.key };
  });
  assert.equal(th2.closed, 'tscreen_closed');
  await waitFor((s) => { const a = s.castChar('actress'); return a.visible && !a.busy; }, null, 5000);
  const fin = await room((s) => {
    const a = s.castChar('actress');
    s.updateCenter();
    return {
      changed: a.look.outfit + a.look.dress,
      stage: s.objs.find((o) => o.beh?.tstage).texture.key,
      costume: s.objs.some((o) => o.kind === 'item' && ['tiara', 'jester hat', 'wizard hat', "king's crown", 'tricorne hat', 'feathered hat', 'top hat', 'flower crown'].includes(o.rec.subject)),
    };
  });
  assert.notEqual(fin.changed, th2.before);
  assert.deepEqual({ stage: fin.stage, costume: fin.costume }, { stage: 'tstage_1', costume: true });
  const stats = await page.evaluate(() => window.__dev.getStats().feats);
  for (const k of ['train', 'ticket', 'sclock', 'chalk', 'sbell', 'globe', 'abacus', 'couch', 'xray', 'plaster', 'ouch', 'medcab', 'ambulance', 'tstage', 'spot', 'costumes', 'tscreen']) assert.ok(stats[k] >= 1, `счётчик ${k}`);
});

test('нет ошибок в консоли', () => {
  assert.deepEqual(errors, []);
});
