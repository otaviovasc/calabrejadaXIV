import assert from 'node:assert/strict';

const noop=()=>{};
const context=new Proxy({}, {get:(target,key)=>key in target?target[key]:noop,set:(target,key,value)=>(target[key]=value,true)});
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',style:{},classList:{values:new Set(),add(value){this.values.add(value)},remove(value){this.values.delete(value)},contains(value){return this.values.has(value)}},addEventListener:noop,setAttribute:noop,getBoundingClientRect:()=>({width:430,height:645})});return elements.get(id)}
const canvas=element('canvas');canvas.parentElement=element('game');canvas.getContext=()=>context;
globalThis.document={querySelector:selector=>selector==='#game-canvas'?canvas:element(selector),querySelectorAll:()=>[]};
globalThis.window={devicePixelRatio:1,addEventListener:noop};
globalThis.localStorage={getItem:()=>null,setItem:noop};
globalThis.requestAnimationFrame=()=>1;

const [{GameScene},{Engine}]=await Promise.all([import('../src/main.js'),import('../src/engine.js')]);
const scene=new GameScene(),engine=new Engine(canvas,scene,360,540);
scene.attach(engine);
assert.equal(scene.ensureLane(0).kind,'start','the chicken must start on a safe tile');
const nativeRandom=Math.random;Math.random=()=>1/4294967296;scene.start();Math.random=nativeRandom;
assert.equal(scene.mode,'playing','start must leave the scene ready state');
assert.equal(scene.rows.get(0).kind,'start','run reset must preserve the safe spawn');
const drawnLanes=[];
const originalEnsureLane=scene.ensureLane.bind(scene);
scene.ensureLane=lane=>{drawnLanes.push(lane);return originalEnsureLane(lane)};
scene.draw(context);
assert.ok(Math.max(...drawnLanes)>=10,'rendering must generate lanes through the top of the playfield');
const safeRow=[...scene.rows.values()].find(row=>row.kind==='sidewalk'||row.kind==='rest');
assert.ok(safeRow.trees.length>=1&&safeRow.trees.length<=2,'safe lanes should contain a small number of trees');
assert.equal(safeRow.trees.some(tree=>Math.abs(tree.x-180)<21),false,'tree placement must preserve a clear central route');

function stepForward(){scene.move('up');for(let frame=0;frame<3;frame++){scene.update(.05);scene.draw(context)}}
function stepDirection(direction){scene.move(direction);for(let frame=0;frame<3;frame++){scene.update(.05);scene.draw(context)}}
stepForward();
assert.equal(scene.playerLane,1,'first forward move must land on the next lane');
assert.equal(scene.score,1,'first forward move must score one tile');
assert.equal(scene.step,null,'movement must unlock after its animation');
const car=scene.cars.find(candidate=>candidate.lane===2);
const carX=car.x;
scene.update(.05);
assert.notEqual(car.x,carX,'traffic must continue moving during a run');
stepForward();
assert.equal(scene.mode,'playing','opening traffic should leave the first two moves playable');
assert.equal(scene.playerLane,2);
assert.equal(scene.score,2);
const bonusRow=scene.ensureLane(3);bonusRow.kind='rest';bonusRow.cars=[];bonusRow.trees=[];bonusRow.grain={x:scene.playerX,collected:false};
stepForward();
assert.equal(scene.crossed,3,'a forward move must add exactly one distance tile');
assert.equal(scene.score,4,'a forward move that collects grain must award two total points');
assert.equal(bonusRow.grain.collected,true,'grain should be collected when the player crosses its tile');
assert.equal(scene.bankedGrain,1,'collected grain should be banked once');
const nextSafe=scene.ensureLane(4);nextSafe.kind='rest';nextSafe.cars=[];nextSafe.trees=[];nextSafe.grain={x:228,collected:false};
stepForward();
assert.equal(scene.score,5,'a new forward tile should award one point');
stepDirection('right');
assert.equal(scene.score,6,'grain should also be collectible by stepping sideways onto it');
assert.equal(scene.bankedGrain,2);
stepDirection('down');stepForward();
assert.equal(scene.score,6,'backtracking and revisiting a lane must not award points or grain twice');
assert.equal(scene.crossed,4,'distance should remain the furthest lane reached');
for(let lane=10;lane<=150;lane++)scene.ensureLane(lane);
const generated=[...scene.rows.values()].filter(row=>row.lane>4&&row.lane<150);
assert.ok(new Set(generated.map(row=>row.kind)).size>=2,'generated lanes should not settle into a single repeating type');
let longestRoadRun=0,currentRoadRun=0;
for(const row of [...generated].sort((a,b)=>a.lane-b.lane)){currentRoadRun=row.kind==='road'?currentRoadRun+1:0;longestRoadRun=Math.max(longestRoadRun,currentRoadRun)}
assert.ok(longestRoadRun<=3,'the generator must keep safe breaks between road runs');
assert.ok(scene.difficultyAt(80).speed>scene.difficultyAt(0).speed,'traffic speed must rise with distance');
assert.ok(scene.difficultyAt(80).trafficChance>scene.difficultyAt(0).trafficChance,'traffic density must rise with distance');
for(const row of generated){if(row.grain)assert.equal(row.trees.some(tree=>Math.abs(tree.x-row.grain.x)<24),false,'grain must never share a tree tile')}
const crowdedRoad={lane:100,kind:'road',cars:[],trees:[]};scene.createTraffic(crowdedRoad);
for(let frame=0;frame<120;frame++){for(const car of crowdedRoad.cars)car.x+=car.speed/60;scene.keepTrafficSpaced(crowdedRoad);for(let i=0;i<crowdedRoad.cars.length;i++)for(let j=i+1;j<crowdedRoad.cars.length;j++){const a=crowdedRoad.cars[i],b=crowdedRoad.cars[j];assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2+21,'cars should preserve visible clearance while moving')}}
scene.seed=1;scene.rows.clear();scene.cars.length=0;scene.roadStreak=0;scene.lastLaneKind='start';scene.seedRows();const firstPattern=[...scene.rows.values()].filter(row=>row.lane>=5&&row.lane<20).map(row=>row.kind).join(',');
scene.seed=987654321;scene.rows.clear();scene.cars.length=0;scene.roadStreak=0;scene.lastLaneKind='start';scene.seedRows();
const secondPattern=[...scene.rows.values()].filter(row=>row.lane>=5&&row.lane<20).map(row=>row.kind).join(',');
assert.notEqual(firstPattern,secondPattern,'different run seeds should produce different lane patterns');
console.log('Game scene check passed: run starts, two steps complete, score increments, traffic moves.');

// River rules use isolated rows so traffic and random generation cannot mask failures.
function riverScene(speed=24){
  const game=new GameScene();game.attach(new Engine(canvas,game,360,540));game.start();game.cars=[];game.rows.clear();
  const bank={lane:0,kind:'sidewalk',cars:[],logs:[],trees:[],grain:null};
  const log={x:180,width:148,speed};
  const river={lane:1,kind:'water',cars:[],logs:[log],trees:[],grain:null,logCycle:600};
  game.rows.set(0,bank);game.rows.set(1,river);return{game,river,log};
}
function completeMove(game,direction){game.move(direction);for(let i=0;i<7;i++)game.update(.015)}
{
  const {game,river,log}=riverScene();river.grain={x:180,log,collected:false};
  completeMove(game,'up');assert.equal(game.mode,'playing','landing on a log must be safe');
  assert.equal(game.score,2,'landing on grain must award one bonus point');
  const before=game.playerX;game.update(.05);
  assert.ok(Math.abs(game.playerX-before-1.2)<1e-8,'a log must carry the resting player');
  assert.equal(river.grain.x,log.x,'grain must follow its log');
  completeMove(game,'right');assert.equal(game.mode,'playing','side jumps on a wide log must be safe');
  assert.equal(game.bankedGrain,1,'log grain must only be collected once');
  completeMove(game,'down');assert.equal(game.playerLane,0,'the player must be able to jump back to shore');
  assert.equal(game.mode,'playing');
}
{
  const {game,log}=riverScene();log.x=30;completeMove(game,'up');
  assert.equal(game.mode,'dead','landing in open water must kill immediately');
  assert.equal(game.score,0,'a fatal landing must not award distance points');
}
{
  const {game,log}=riverScene();completeMove(game,'up');game.playerX=350;log.x=350;log.speed=58;
  game.update(.2);assert.equal(game.mode,'dead','being carried beyond the screen must kill without wrapping the player');
}
{
  const {game,river,log}=riverScene(-24);completeMove(game,'up');const before=game.playerX;game.update(.05);
  assert.ok(game.playerX<before,'left-moving logs must carry the player left');
  log.x=-log.width/2+1;game.playerLane=0;river.grain={x:log.x,log,collected:false};game.update(.1);
  assert.ok(log.x>0,'logs must recycle after leaving the screen');assert.equal(river.grain.x,log.x);
}
let riverCount=0,riverGrainCount=0;
for(let seed=1;seed<=20;seed++){
  const game=new GameScene();game.seed=seed;
  for(let lane=0;lane<200;lane++){
    const row=game.ensureLane(lane);if(row.kind!=='water')continue;riverCount++;
    assert.ok(lane>=9,'rivers must preserve the opening lanes');
    assert.ok(row.riverDepth<=game.riverDifficulty(lane).maxRows,'river length must respect difficulty');
    if(row.riverDepth===1)assert.ok(['sidewalk','rest'].includes(game.rows.get(lane-1).kind),'rivers must start at a safe bank');
    if(row.grain){riverGrainCount++;assert.equal(row.grain.x,row.grain.log.x,'grain must spawn at the center of a log')}
    assert.ok(row.logs.every(log=>log.width>=100&&Math.abs(log.speed)<=58),'river difficulty must stay bounded');
  }
}
assert.ok(riverCount>100,'rivers must appear across generated runs');
assert.ok(riverGrainCount>0&&riverGrainCount/riverCount<.12,'grain on logs must be possible but rare');
console.log('River checks passed: landing, drowning, carrying, jumps, grain, recycling, generation and difficulty.');

{
  const {game}=riverScene();completeMove(game,'up');
  const opposite={x:game.playerX,width:120,speed:-30};
  game.rows.set(2,{lane:2,kind:'water',cars:[],logs:[opposite],trees:[],grain:null,logCycle:600});
  completeMove(game,'up');assert.equal(game.mode,'playing','jumps between logs moving in opposite directions must work');
  assert.equal(game.playerLane,2);assert.equal(game.crossed,2);
  const before=game.playerX;game.update(.05);assert.ok(game.playerX<before,'landing must switch the carrying direction');
  game.rows.get(2).logs[0].width=40;completeMove(game,'right');
  assert.equal(game.mode,'dead','jumping sideways off a log must drown the player');
  game.start();assert.equal(game.mode,'playing');assert.equal(game.playerLane,0);
  assert.equal(game.bankedGrain,0,'restart must clear river rewards');assert.equal(game.step,null);
}
console.log('River transition and restart checks passed.');

// Campaign counters and product identity must remain independent of distance.
const {ui,showGameOver,showReady}=await import('../src/ui.js');
const {PICKUPS,VEHICLES,vehicleArtKey}=await import('../src/art.js');
const {project}=await import('../src/renderer.js');
{
  const game=new GameScene();game.attach(new Engine(canvas,game,360,540));game.start();game.cars=[];
  for(let lane=1;lane<=17;lane++){
    const row={lane,kind:'rest',cars:[],logs:[],trees:[],grain:{x:180,collected:false,type:(lane-1)%3}};
    game.rows.set(lane,row);completeMove(game,'up');
    assert.equal(game.bankedGrain,lane,'only collected items must increment the campaign counter');
    assert.equal(Number(ui.items.textContent),lane,'HUD must receive actual item totals');
    if(lane===15||lane===16||lane===17){
      showGameOver(game.score,game.crossed,game.bankedGrain);
      assert.equal(ui.card.classList.contains('goal-reached'),lane>=16,'goal threshold must be exactly 16');
      assert.equal(ui.resultItems.textContent,`${lane}/16`);
      assert.equal(ui.overlay.inert,false,'result actions must be keyboard accessible');
    }
  }
  const before=game.bankedGrain;game.collectGrain(game.rows.get(17));
  assert.equal(game.bankedGrain,before,'collected product must not be counted twice');
  game.start();assert.equal(game.bankedGrain,0);assert.equal(Number(ui.items.textContent),0);
  assert.equal(ui.overlay.inert,true,'hidden result buttons must not stay in the tab order');
  showGameOver(100,100,0);assert.equal(ui.card.classList.contains('goal-reached'),false,'points and distance must not unlock the item goal');showReady();
}
{
  const game=new GameScene();game.seed=424242;
  const pickups=[],sponsors=[];
  for(let lane=0;lane<400;lane++){
    const row=game.ensureLane(lane);if(row.grain)pickups.push(row.grain.type);
    for(const car of row.cars)sponsors.push(car.sponsor);
  }
  assert.ok(pickups.length>=25,'campaign must provide enough collectible opportunities');
  pickups.forEach((type,i)=>assert.equal(type,i%PICKUPS.length,'spawned products must rotate and retain their own identity'));
  sponsors.forEach((brand,i)=>assert.equal(brand,VEHICLES[i%VEHICLES.length],'vehicle sponsors must rotate'));
  const reference=game.ensureLane(4).grain.type;game.bankedGrain=7;
  assert.equal(game.ensureLane(4).grain.type,reference,'collecting elsewhere must not change a visible product');
  for(const sponsor of VEHICLES){
    assert.equal(vehicleArtKey({sponsor,speed:1}),`${sponsor}Right`);
    assert.equal(vehicleArtKey({sponsor,speed:-1}),`${sponsor}Left`);
  }
  const left=project(80,5,5),right=project(280,5,5),ahead=project(180,6,5);
  assert.ok(right.x>left.x&&right.y>left.y,'lane edges must slope with the vehicle ground axis');
  assert.ok(ahead.y<project(180,5,5).y,'forward must project toward the top of the screen');
}
// Exercise the downloadable result using an actual Blob and a recording canvas.
{
  const texts=[],downloads=[],drawnImages=[],logoSizes=[],nativeCreate=document.createElement;
  const exportContext=new Proxy(context,{get(target,key){if(key==='createLinearGradient')return()=>({addColorStop:noop});if(key==='fillText')return text=>texts.push(text);if(key==='drawImage')return(image,...bounds)=>{drawnImages.push(image.url);if(/logo/.test(image.url))logoSizes.push({width:bounds[2],height:bounds[3]})};return target[key]}});
  document.createElement=tag=>tag==='canvas'?{getContext:()=>exportContext,toBlob:callback=>callback(new Blob(['test'],{type:'image/png'}))}:{click(){downloads.push(this.download)}};
  globalThis.Image=class{naturalWidth=1080;naturalHeight=1920;set src(value){this.url=value;queueMicrotask(()=>this.onload())}};
  const {downloadResult}=await import('../src/share.js');
  await downloadResult({score:33,distance:17,items:16});
  assert.ok(texts.includes('META ALCANÇADA!'));assert.ok(texts.includes('16/16'));
  assert.ok(texts.includes('@repnostravamos'));assert.ok(texts.includes('@calabrejadadalarapius'));
  assert.equal(downloads[0],'calabrejada-xvi-16-itens.png');
  assert.equal(logoSizes.length,3);
  assert.ok(logoSizes.every(size=>size.height>=180),'download must give the logos a large, readable area');
  assert.ok(drawnImages.some(url=>url.includes('logo-51.png')),'export must include the 51 logo');
  assert.ok(drawnImages.some(url=>url.includes('logo-newage.jpeg')),'export must include the NewAge logo');
  assert.ok(drawnImages.some(url=>url.includes('logo-nostravamos.png')),'export must include the organizer logo');
  const {PARTNERS,loadRequiredPartnerImages}=await import('../src/partners.js');
  assert.equal(PARTNERS.length,4,'result must reserve exactly four logo slots');
  assert.equal(PARTNERS[3].imageUrl,null,'fourth logo slot must initially remain blank');
  texts.length=0;globalThis.Image=class{set src(value){queueMicrotask(()=>this.onerror())}};
  await downloadResult({score:20,distance:20,items:15});
  assert.ok(texts.includes('QUASE LÁ!'),'missing art must still allow a correct fallback result');
  assert.ok(texts.includes('15/16'));
  // A decoration failure can fall back, but a fresh mandatory logo failure
  // must block the download rather than export an unbranded campaign result.
  await assert.rejects(loadRequiredPartnerImages({retry:true}),/marcas obrigatórias/);
  const countBefore=downloads.length;
  await assert.rejects(downloadResult({items:16}),/marcas obrigatórias/);
  assert.equal(downloads.length,countBefore,'missing required logos must prevent file download');
  globalThis.Image=class{naturalWidth=200;naturalHeight=200;set src(value){this.url=value;queueMicrotask(()=>this.onload())}};
  await loadRequiredPartnerImages({retry:true});
  await downloadResult({items:16});
  assert.equal(downloads.length,countBefore+1,'a successful logo retry must restore downloads');
  document.createElement=nativeCreate;delete globalThis.Image;
}
console.log('Campaign checks passed: threshold, HUD, reset, stable product rotation, sponsor directions, projection and result download.');

// A rider must be painted after the whole platform at either end of a log.
{
  const {art}=await import('../src/art.js');
  const savedChicken=art.chicken;
  const chicken={width:100,height:100};art.chicken=chicken;
  try{
    for(const speed of [-24,24])for(const x of [118,180,242]){
      const game=new GameScene();game.worldProgress=1;game.playerLane=1;game.playerX=x;
      const log={x:180,width:148,speed};
      const river={lane:1,kind:'water',logs:[log],logSpeed:speed,cars:[],trees:[],grain:null};
      game.rows.set(1,river);
      game.ensureLane=lane=>lane===1?river:{lane,kind:'start',logs:[],cars:[],trees:[],grain:null};
      assert.ok(game.supportingLog(river),'fixture must keep the player supported by the log');
      const commands=[];let fillStyle='';
      const recording=new Proxy(context,{get(target,key){
        if(key==='fill')return()=>{if(fillStyle==='#bc8555')commands.push('platform')};
        if(key==='drawImage')return image=>{if(image===chicken)commands.push('player')};
        return target[key];
      },set(target,key,value){if(key==='fillStyle')fillStyle=value;return true}});
      game.draw(recording);
      assert.ok(commands.indexOf('platform')<commands.indexOf('player'),`player must stay above log at x=${x}, speed=${speed}; got ${commands.join(',')}`);
    }
  }finally{art.chicken=savedChicken}
}
console.log('Platform draw order check passed at left, center and right, in both directions.');

{
  let eligible=0,spawned=0;
  for(let seed=1;seed<=40;seed++){
    const game=new GameScene();game.seed=seed;
    for(let lane=0;lane<250;lane++){
      const row=game.ensureLane(lane);
      if(lane>4&&['sidewalk','rest'].includes(row.kind)){
        eligible++;if(row.grain)spawned++;
      }
    }
  }
  const ratio=spawned/eligible;
  assert.ok(ratio>.19&&ratio<.31,`land item density must stay near 25% (got ${ratio})`);
}
console.log('Reduced item density check passed across 40 seeded runs.');

// Both collidable and decorative trees must have their roots on grass.
{
  const {isGrass}=await import('../src/terrain.js');
  for(const kind of ['road','water','start','sidewalk','rest']){
    const game=new GameScene();
    const row={lane:3,kind,trees:[],logs:[],cars:[],grain:null,logSpeed:24};
    game.createTrees(row);
    assert.equal(row.trees.length>0,isGrass(kind),'tree generation must respect safe grass terrain');
    // Even malformed stale tree data must not draw trees on a road or river.
    row.trees=[{x:180}];game.rows.set(0,{...row,lane:0});
    game.ensureLane=lane=>({...row,lane});
    let fill='',trunks=0;
    const recording=new Proxy(context,{get(target,key){if(key==='fill')return()=>{if(fill==='#93604f')trunks++};return target[key]},set(target,key,value){if(key==='fillStyle')fill=value;return true}});
    game.draw(recording);
    assert.equal(trunks>0,isGrass(kind),'decorative and collidable trees must render only on grass');
  }
}
console.log('Grass-only tree generation and rendering checks passed.');

{
  const {vehicleMotion,vehicleRims}=await import('../src/vehicle-motion.js');
  const {trafficBounds,project}=await import('../src/renderer.js');
  for(const direction of [-1,1]){
    const game=new GameScene();game.attach(new Engine(canvas,game,360,540));game.start();game.rows.clear();game.cars=[];
    game.rows.set(0,{lane:0,kind:'start',cars:[],logs:[],trees:[],grain:null});
    const cars=[120,290].map((x,i)=>({x,lane:8,width:80,speed:direction*75,travelled:0,motionPhase:i*2.4,sponsor:'newage'}));
    game.rows.set(8,{lane:8,kind:'road',cars,logs:[],trees:[],grain:null});game.cars=cars;
    let wraps=0;
    for(let frame=0;frame<800;frame++){
      const before=cars.map(car=>car.x),distances=cars.map(car=>car.travelled);
      game.update(.05);
      cars.forEach((car,i)=>{
        assert.ok(Math.abs(car.travelled-distances[i]-3.75)<1e-8,'wheel distance must advance continuously');
        const expected=before[i]+direction*3.75;
        if(Math.abs(car.x-expected)>1){
          wraps++;const screen=project(expected,car.lane,game.worldProgress);
          assert.ok(direction>0?screen.x-car.width*.75>360:screen.x+car.width*.75<0,'recycling must happen completely outside the viewport');
        }
        const motion=vehicleMotion(car);
        assert.ok(Math.abs(motion.bob)<=1&&Math.abs(motion.pitch)<.01,'suspension must stay subtle');
        assert.ok(motion.scaleY>.98&&motion.scaleY<1.02,'sponsor marks must not be excessively distorted');
      });
      assert.ok(Math.abs(cars[0].x-cars[1].x)>=102,'steady traffic must retain clearance without visible corrections');
    }
    assert.ok(wraps>2,'fixture must exercise repeated recycling in each direction');
    const car=cars[0],motion=vehicleMotion(car);car.x=trafficBounds(car,0).left;
    assert.deepEqual(vehicleMotion(car),motion,'wrapping must not reset wheel or suspension phase');
  }
  const game=new GameScene();game.seed=4242;
  for(let lane=60;lane<80;lane++){
    const row={lane,kind:'road',cars:[],logs:[],trees:[],grain:null};game.createTraffic(row);
    assert.equal(new Set(row.cars.map(car=>car.speed)).size,1,'cars sharing a lane must not catch and snap backwards');
  }
  for(const key of ['truckRight','truckLeft','newageRight','newageLeft','partyRight','partyLeft']){
    const rims=vehicleRims(key,{left:0,top:0,width:512,height:341,sourceWidth:512,sourceHeight:341});
    assert.equal(rims.length,2);
    assert.ok(rims.every(rim=>rim.u>0&&rim.u<1&&rim.v>.6&&rim.v<1),'rim overlays must stay inside the wheel area');
  }
}
console.log('Vehicle checks passed: smooth lane speeds, invisible recycling, continuous animation and rim placement.');
