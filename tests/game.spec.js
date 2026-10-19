import {test,expect} from '@playwright/test';

test('renders the game, starts a run, advances score, and toggles sound',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  // Start keeps focus on its button; game keys must still be handled globally.
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
  await page.getByRole('button',{name:'SOM: DESLIGADO'}).click();
  await expect(page.getByRole('button',{name:'SOM: LIGADO'})).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});

test('movement animates and a run can restart',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await page.keyboard.press('ArrowUp');
  // Input is locked during the step animation, so a second input cannot skip a lane.
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('2');
  await expect(page.locator('#score')).toHaveText('2');
});

test('arrow key starts the game and immediately moves one tile',async({page})=>{
  await page.goto('/');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
});

test('start button enters the playing state and allows movement',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/vamos atravessar/i}).click();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('1');
});

test('opening traffic leaves enough time for the first two forward steps',async({page})=>{
  await page.goto('/');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('1');
  await page.waitForTimeout(140);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#distance')).toHaveText('2');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
});

test('side steps and backing up do not add score',async({page})=>{
  await page.goto('/');
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
  await page.getByRole('button',{name:/vamos atravessar/i}).tap();
  await page.getByRole('button',{name:'Avançar'}).tap();
  await expect(page.locator('#distance')).toHaveText('1');
});

for (const items of [15,16,17]) {
  test(`death result uses ${items} actual collected items and exports a Story`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/');
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
    await expect(page.locator('#result-partners img:visible')).toHaveCount(3);
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
