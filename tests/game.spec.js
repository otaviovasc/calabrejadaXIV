import {test,expect} from '@playwright/test';

test('renders the game, starts a run, advances score, and toggles sound',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  // Start keeps focus on its button; game keys must still be handled globally.
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
  await expect(page.getByRole('button',{name:'SOM: LIGADO'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'SOM: LIGADO'}).click();
  await expect(page.getByRole('button',{name:'SOM: DESLIGADO'})).toHaveAttribute('aria-pressed','false');
  expect(errors).toEqual([]);
});

test('a rapid second command is buffered once and executes after landing',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await page.evaluate(()=>{
    for(let i=0;i<5;i++) window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
  });
  await expect(page.locator('#distance')).toHaveText('2');
  await page.waitForTimeout(200);
  await expect(page.locator('#distance')).toHaveText('2');
  await expect(page.locator('#score')).toHaveText('2');
});

test('arrow key starts the game and immediately moves one tile',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
});

test('start button enters the playing state and allows movement',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
});

test('opening traffic leaves enough time for the first two forward steps',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await page.waitForTimeout(140);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('2');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
});

test('side steps and backing up do not add score',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(190);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(190);
  await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('#distance')).toHaveText('0');
});

test('touch control advances the player on mobile',async({page},testInfo)=>{
  test.skip(!testInfo.project.use.isMobile,'mobile project only');
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).tap();
  await page.getByRole('button',{name:'Avançar'}).tap();
  await expect(page.locator('#distance')).toHaveText('1');
});

for (const items of [15,16,17]) {
  test(`death result uses ${items} actual collected items and exports a Story`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
    await expect(page.getByRole('button',{name:/vamos atravessar/i})).toBeEnabled();
    await page.evaluate(async count=>{
      const {GameScene}=await import('/src/main.js');
      const game=new GameScene();game.assetsLoaded=true;
      game.engine={clearTweens(){},tween(){}};
      game.start();game.score=count+25;game.crossed=25;game.bankedGrain=count;game.die();
    },items);
    await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#result-items')).toHaveText(`${items}/16`);
    if(items>=16)await expect(page.locator('#result-card')).toHaveClass(/goal-reached/);
    else await expect(page.locator('#description')).toContainText('Faltaram 1 item');
    await expect(page.locator('#result-partners')).toBeVisible();
    await expect(page.locator('#result-partners img:visible')).toHaveCount(4);
    await expect(page.locator('.partner-slot-empty img')).not.toBeVisible();
    const marksLoaded=await page.locator('#result-partners img:visible').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0));
    expect(marksLoaded).toBe(true);
    await expect(page.locator('#share-callout')).toContainText('@repnostravamos');
    await expect(page.locator('#share-callout')).toContainText('@calabrejadadalarapius');
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:/baixar resultado/i}).click();
    const download=await downloadPromise;
    expect(download.suggestedFilename()).toBe(`calabrejada-xvi-${items}-itens.png`);
    const {readFile}=await import('node:fs/promises');
    const png=await readFile(await download.path());
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
    await page.getByRole('button',{name:/jogar de novo/i}).click();
    await expect(page.locator('#items')).toHaveText('0');
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    expect(errors).toEqual([]);
  });
}


test('mandatory sponsor image failure blocks export and can be retried',async({page})=>{
  const logoPattern='**/logo-51.png*';
  await page.route(logoPattern,route=>route.abort());
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await expect(page.getByRole('button',{name:/vamos atravessar/i})).toBeEnabled();
  await page.evaluate(async()=>{
    const {GameScene}=await import('/src/main.js');
    const game=new GameScene();game.assetsLoaded=true;game.engine={clearTweens(){},tween(){}};
    game.start();game.bankedGrain=16;game.die();
  });
  await expect(page.locator('#partner-error')).toBeVisible();
  await expect(page.getByRole('button',{name:/tentar carregar logos/i})).toBeEnabled();
  await page.unroute(logoPattern);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/tentar carregar logos/i}).click();
  expect((await downloadPromise).suggestedFilename()).toBe('calabrejada-xvi-16-itens.png');
  await expect(page.locator('#partner-logo-51')).toBeVisible();
});

test('soundtrack loops, respects mute on restart, and pauses in background', async ({page}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const media = new NativeAudio(...args);
      window.__soundtrack = media;
      return media;
    };
  });
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button', {name: /vamos atravessar/i}).click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__soundtrack?.loop && !window.__soundtrack.paused && window.__soundtrack.currentTime > 0))).toBe(true);
  await page.getByRole('button', {name: 'SOM: LIGADO'}).click();
  expect(await page.evaluate(() => window.__soundtrack.paused)).toBe(true);
  await page.evaluate(async () => {
    const {GameScene} = await import('/src/main.js');
    const game = new GameScene(); game.assetsLoaded = true;
    game.engine = {clearTweens(){}, tween(){}}; game.start();
  });
  await expect(page.getByRole('button', {name: 'SOM: DESLIGADO'})).toBeVisible();
  expect(await page.evaluate(() => window.__soundtrack.paused)).toBe(true);
  await page.getByRole('button', {name: 'SOM: DESLIGADO'}).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.__soundtrack.paused)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => !window.__soundtrack.paused)).toBe(true);
});

for (const [width, height] of [[320,568], [390,664], [430,932], [844,390], [1440,900]]) {
  test(`game fits viewport ${width}x${height} with reachable controls`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
    await page.getByRole('button', {name:/vamos atravessar/i}).click();
    const canvas = await page.locator('#game-canvas').boundingBox();
    const controls = await page.locator('.controls').boundingBox();
    expect(canvas.width).toBeGreaterThan(width < 500 ? width * .78 : height * .4);
    expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(height);
    expect(controls.y + controls.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(canvas.width / canvas.height).toBeCloseTo(2/3, 2);
  });
}

test('individual vehicle voices pan across screen and horns have a cooldown', async ({page}) => {
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  const result=await page.evaluate(async()=>{
    const {AudioKit}=await import('/src/audio.js');
    const kit=new AudioKit();kit.setMuted(false);
    await kit.context.resume();
    await new Promise(resolve=>setTimeout(resolve,70));
    let horns=0;const horn=kit.horn.bind(kit);
    kit.horn=(...args)=>{horns++;horn(...args)};
    const car={x:80,lane:0,speed:80,type:'van'};
    const scene={mode:'playing',cars:[car],playerX:180,worldProgress:0,rows:new Map()};
    kit.update(scene);kit.update(scene);
    await new Promise(resolve=>setTimeout(resolve,160));
    const voice=kit.voices.find(voice=>voice.car===car);
    const left=voice.pan.pan.value;
    car.x=280;kit.update(scene);
    await new Promise(resolve=>setTimeout(resolve,180));
    const right=voice.pan.pan.value;
    scene.mode='dead';kit.update(scene);
    await new Promise(resolve=>setTimeout(resolve,350));
    const stopped=voice.gain.gain.value<.001;
    kit.setMuted(true);await kit.context.close();
    return {horns,left,right,stopped,voices:kit.voices.length};
  });
  expect(result.horns).toBe(1);
  expect(result.left).toBeLessThan(0);
  expect(result.right).toBeGreaterThan(0);
  expect(result.stopped).toBe(true);
  expect(result.voices).toBe(6);
});

test('goal celebration renders during play and respects reduced motion', async ({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.locator('#nickname').fill('Galinho');
  await page.locator('#nickname').blur();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  const result=await page.evaluate(async()=>{
    const {GameScene}=await import('/src/main.js');
    const {Engine}=await import('/src/engine.js');
    const game=new GameScene();game.assetsLoaded=true;
    const canvas=document.querySelector('#game-canvas');
    const engine=new Engine(canvas,game,360,540);game.attach(engine);game.start();game.cars=[];
    game.rows.set(1,{lane:1,kind:'rest',cars:[],logs:[],trees:[],grain:{x:180,collected:false,type:0}});
    game.bankedGrain=15;game.move('up');
    for(let i=0;i<8;i++)game.update(.015);
    game.draw(engine.ctx);
    return {items:game.bankedGrain,mode:game.mode,celebration:game.effects.celebrationRemaining,
      reduced:game.effects.reducedMotion,particles:game.effects.particles.length};
  });
  expect(result.items).toBe(16);expect(result.mode).toBe('playing');
  expect(result.celebration).toBeGreaterThan(0);
  expect(result.reduced).toBe(true);expect(result.particles).toBe(0);
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#items')).toHaveText('16');
  expect(errors).toEqual([]);
});


test('opening requires a nickname and preserves identity in the death result',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#intro-prize')).toContainText('concorrer a um ingresso');
  await expect(page.locator('#intro-prize')).toContainText('@repnostravamos');
  await expect(page.locator('#intro-prize')).toContainText('@calabrejadadalarapius');
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
  await page.locator('#nickname').fill('   ');
  await page.locator('#nickname').blur();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('0');
  await page.locator('#nickname').fill('Pintinho');
  await page.locator('#republic').fill('República Exemplo');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
  await page.locator('#republic').press('Enter');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await page.evaluate(async()=>{const {showGameOver}=await import('/src/ui.js');showGameOver(32,20,16)});
  await expect(page.locator('#result-nickname')).toHaveText('Pintinho');
  await expect(page.locator('#result-republic')).toHaveText('República Exemplo');
  await expect(page.locator('#gameover-chicken')).toBeVisible();
  await expect(page.locator('#share-callout')).toContainText('concorrer a um ingresso');
  await page.getByRole('button',{name:/jogar de novo/i}).click();
  await page.evaluate(async()=>{const {showGameOver}=await import('/src/ui.js');showGameOver(2,2,0)});
  await expect(page.locator('#result-nickname')).toHaveText('Pintinho');
});

test('republic is optional and player text is rendered safely',async({page})=>{
  await page.goto('/');
  await page.locator('#nickname').fill('<b>Galinho</b>');
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await page.evaluate(async()=>{const {showGameOver}=await import('/src/ui.js');showGameOver(0,0,0)});
  await expect(page.locator('#result-nickname')).toHaveText('<b>Galinho</b>');
  await expect(page.locator('#result-nickname b')).toHaveCount(0);
  await expect(page.locator('#result-republic')).toBeHidden();
});
