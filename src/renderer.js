import {GAME} from './config.js';
import {isGrass} from './terrain.js';
import {vehicleMotion,vehicleRims} from './vehicle-motion.js';
import {art, PICKUPS, vehicleArtKey} from './art.js';

// Orthographic ground basis: one camera angle for streets, platforms and feet.
// Rows have more depth than before so tall sprites do not crowd the next lane.
const CAMERA = {yaw:12*Math.PI/180, elevation:55*Math.PI/180, scale:.92, tileDepth:78};
const X_AXIS = {x:Math.cos(CAMERA.yaw)*CAMERA.scale,
  y:Math.sin(CAMERA.yaw)*Math.sin(CAMERA.elevation)*CAMERA.scale};
const FORWARD = {x:Math.sin(CAMERA.yaw)*CAMERA.scale*CAMERA.tileDepth,
  y:-Math.cos(CAMERA.yaw)*Math.sin(CAMERA.elevation)*CAMERA.scale*CAMERA.tileDepth};
const CURB_HEIGHT = 3;
const LOG_HEIGHT = 6;

export function project(x, lane, progress) {
  const depth = lane-progress;
  return {x:GAME.width/2+(x-GAME.width/2)*X_AXIS.x+depth*FORWARD.x,
    y:GAME.startY+(x-GAME.width/2)*X_AXIS.y+depth*FORWARD.y};
}

function rowHeight(row) {
  return row&&['start','sidewalk','rest'].includes(row.kind)?CURB_HEIGHT:0;
}

function playerHeight(scene) {
  const from=scene.rows.get(scene.playerLane);
  const fromHeight=from?.kind==='water'&&(scene.step||scene.supportingLog(from))?LOG_HEIGHT:rowHeight(from);
  if(!scene.step)return fromHeight;
  const to=scene.step.row;
  const toHeight=to.kind==='water'?LOG_HEIGHT:rowHeight(to);
  const progress=scene.step.elapsed/scene.step.duration;
  return fromHeight+(toHeight-fromHeight)*progress;
}

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.fill();
}

function patch(ctx, scene, x, lane, width, depth, color, height = 0) {
  const points = [[x-width/2,lane-depth/2],[x+width/2,lane-depth/2],
    [x+width/2,lane+depth/2],[x-width/2,lane+depth/2]]
    .map(([px, py]) => {const p = project(px, py, scene.worldProgress); p.y -= height; return p;});
  polygon(ctx, points, color);
  return points;
}

function sprite(ctx, image, x, y, width, height, anchor = .88, shear = 0) {
  if (!image) return;
  ctx.save(); ctx.translate(x, y);
  // Left views have the opposite longitudinal slope baked in. This corrects
  // their ground axis without mirroring logos or changing their direction.
  ctx.transform(1, shear, 0, 1, 0, 0);
  ctx.drawImage(image, -width/2, -height*anchor, width, height);
  ctx.restore();
}

function palm(ctx, x, y, small = false) {
  const size = small ? .7 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ctx.fillStyle = '#17152e55'; ctx.beginPath(); ctx.ellipse(12, 5, 20, 6, .2, 0, Math.PI*2); ctx.fill();
  polygon(ctx, [{x:-3,y:2},{x:5,y:2},{x:1,y:-43},{x:-4,y:-43}], '#93604f');
  polygon(ctx, [{x:1,y:2},{x:5,y:2},{x:1,y:-43},{x:-1,y:-43}], '#d58e66');
  const leaves = [[-29,-35],[-26,-52],[-8,-61],[21,-58],[32,-42],[23,-26],[-11,-24]];
  leaves.forEach(([lx,ly],i)=>{
    const base={x:0,y:-43},tip={x:lx,y:ly};
    const bend={x:lx*.55,y:(ly-43)/2-5};
    const width=i%2?5:4;
    polygon(ctx,[base,{x:bend.x-width,y:bend.y-3},tip,{x:bend.x+width,y:bend.y+5}], '#176e67');
    polygon(ctx,[base,{x:bend.x-width,y:bend.y-3},tip,bend],i%2?'#52bc8b':'#3ea580');
    polygon(ctx,[base,bend,tip,{x:bend.x+width,y:bend.y+5}],i%2?'#289b7e':'#208a75');
  });
  ctx.restore();
}

function ground(ctx, scene, row) {
  const lane = row.lane;
  const colors = {road:'#343046', water:'#167e94', sidewalk:'#c99c84', rest:'#bd9688', start:'#d3a589'};
  patch(ctx, scene, 180, lane, 1400, 1.005, colors[row.kind]);
  if (row.kind === 'road') {
    patch(ctx, scene, 180, lane-.47, 1400, .035, '#e78eaa66');
    patch(ctx, scene, 180, lane+.47, 1400, .025, '#17162a');
    for (let x=-120; x<700; x+=78) patch(ctx, scene, x, lane, 33, .035, '#f1c5aa66');
    // Reflections remain below the vehicles, never over collision silhouettes.
    patch(ctx, scene, 65, lane+.2, 100, .025, '#ed459422');
  } else if (row.kind === 'water') {
    patch(ctx, scene, 180, lane-.48, 1400, .045, '#083c56');
    for (let x=-100; x<640; x+=57) {
      const offset = (scene.elapsed * row.logSpeed * .5) % 57;
      patch(ctx, scene, x+offset, lane+.23, 22, .025, '#74dedb66');
      patch(ctx, scene, x-offset, lane-.22, 13, .02, '#b1f1e333');
    }
  } else {
    const front=patch(ctx,scene,180,lane,1400,1.005,colors[row.kind]);
    const raised=front.map(p=>({x:p.x,y:p.y-CURB_HEIGHT}));
    polygon(ctx,[front[0],front[1],raised[1],raised[0]],'#805b68');
    polygon(ctx,raised,colors[row.kind]);
    patch(ctx, scene, 180, lane-.48, 1400, .08, '#886274',CURB_HEIGHT);
    patch(ctx, scene, 180, lane-.40, 1400, .035, '#f3c7ac',CURB_HEIGHT);
    for (let x=-120; x<660; x+=48) patch(ctx, scene, x, lane, 1, .75, '#6e596326',CURB_HEIGHT);
    if (lane === 0) {
      const p = project(180, -.2, scene.worldProgress);
      ctx.save(); ctx.translate(p.x,p.y); ctx.transform(X_AXIS.x,X_AXIS.y,FORWARD.x/CAMERA.tileDepth,FORWARD.y/CAMERA.tileDepth,0,0);
      ctx.fillStyle='#3b293c'; ctx.font='900 12px sans-serif'; ctx.textAlign='center';
      ctx.scale(1,-1);ctx.fillText('NOSTRAVAMOS',0,0); ctx.restore();
    }
  }
  // Short curb caps replace the continuous neon rails that made the road
  // look like a tilted flat board. Decorative palms still mark the edges.
  if(row.kind!=='water'&&row.kind!=='road'){
    patch(ctx,scene,-4,lane,5,.9,'#906b7b',CURB_HEIGHT);
    patch(ctx,scene,364,lane,5,.9,'#906b7b',CURB_HEIGHT);
  }
}

function drawLog(ctx, scene, row, log) {
  const lower = patch(ctx, scene, log.x, row.lane, log.width, .62, '#533142');
  const upper = lower.map(p => ({x:p.x, y:p.y-LOG_HEIGHT}));
  polygon(ctx,[lower[0],lower[1],upper[1],upper[0]],'#634038');
  polygon(ctx,upper,'#bc8555');
  patch(ctx,scene,log.x,row.lane+.08,log.width-18,.035,'#754833',LOG_HEIGHT);
  patch(ctx,scene,log.x-6,row.lane-.13,log.width-27,.025,'#e2b679',LOG_HEIGHT);
  patch(ctx,scene,log.x+log.width/2-8,row.lane,4,.47,'#edc18a',LOG_HEIGHT);
}

function drawPickup(ctx, scene, row) {
  const p = project(row.grain.x, row.lane, scene.worldProgress);
  p.y-=row.kind==='water'?LOG_HEIGHT:rowHeight(row);
  const type = PICKUPS[row.grain.type ?? 0];
  const image = art[type.key];
  const bob = Math.sin(scene.elapsed*3 + row.lane)*2;
  ctx.fillStyle='#ffd86c40'; ctx.beginPath(); ctx.ellipse(p.x,p.y,13,5,.2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#ffe48f99'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(p.x,p.y,12,5,.2,0,Math.PI*2); ctx.stroke();
  if (image) {
    const height = type.key === 'ticket' ? 21 : 29;
    const width = Math.min(33, height*image.width/image.height);
    sprite(ctx,image,p.x,p.y-5+bob,width,height,1);
  } else {
    ctx.fillStyle='#ffda62';ctx.fillRect(p.x-4,p.y-20+bob,8,15);
  }
}

// Recycle only after the entire sprite leaves the viewport, including the
// camera's diagonal offset on distant lanes. Bounds also enclose the playfield.
export function trafficBounds(car,progress) {
  const shift=(car.lane-progress)*FORWARD.x;
  const left=180+(-180-shift)/X_AXIS.x;
  const right=180+(GAME.width-180-shift)/X_AXIS.x;
  const margin=car.width*.85+28;
  return {left:Math.min(0,left)-margin,right:Math.max(GAME.width,right)+margin};
}

function spinningRim(ctx,x,y,radius,angle) {
  ctx.save();ctx.translate(x,y);ctx.scale(.74,1);
  ctx.fillStyle='#3a3c50';ctx.beginPath();ctx.ellipse(0,0,radius,radius,0,0,Math.PI*2);ctx.fill();
  ctx.rotate(angle);ctx.strokeStyle='#cbd0de';ctx.lineWidth=Math.max(.6,radius*.29);
  ctx.beginPath();
  for(let i=0;i<3;i++){
    const phase=i*Math.PI/3,dx=Math.cos(phase)*radius*.83,dy=Math.sin(phase)*radius*.83;
    ctx.moveTo(-dx,-dy);ctx.lineTo(dx,dy);
  }
  ctx.stroke();
  ctx.fillStyle='#f2e9e1';ctx.beginPath();ctx.ellipse(0,0,radius*.24,radius*.24,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawVehicle(ctx, scene, car) {
  const p=project(car.x,car.lane,scene.worldProgress);
  const key=vehicleArtKey(car),image=art[key],motion=vehicleMotion(car);
  // A broad soft-looking base plus a darker contact strip keeps the wheels
  // grounded; neither the hitbox nor the road trajectory follows the bob.
  patch(ctx,scene,car.x+3,car.lane-.06,car.width*.87,.40,'#17112326');
  patch(ctx,scene,car.x,car.lane-.01,car.width*.78,.23,'#17112355');
  if(!image){patch(ctx,scene,car.x,car.lane,car.width,.6,car.color||'#ff4f93',12);return}
  const width=car.width*1.07,height=width*image.height/image.width;
  const roadShear=car.speed<0?.33:0;
  ctx.save();ctx.translate(p.x,p.y+2);
  ctx.transform(1,roadShear,0,1,0,0);
  // Rock around the axle line rather than the top-left image corner. The
  // restrained squash and skew suggest suspension without wobbling the logos.
  ctx.save();ctx.translate(0,-motion.bob);ctx.rotate(motion.pitch);
  ctx.transform(1,0,motion.shearX,motion.scaleY,0,0);
  ctx.drawImage(image,-width/2,-height*.85,width,height);
  ctx.restore();
  for(const rim of vehicleRims(key,image.sourceBounds)){
    const x=(rim.u-.5)*width,y=(rim.v-.85)*height;
    spinningRim(ctx,x,y,width*rim.radius,motion.wheelAngle);
  }
  ctx.restore();
}

export function renderScene(ctx, scene) {
  ctx.save();
  if (scene.cameraShake) ctx.translate((Math.random()-.5)*scene.cameraShake*5,(Math.random()-.5)*scene.cameraShake*5);
  ctx.fillStyle='#36263f'; ctx.fillRect(0,0,GAME.width,GAME.height);
  const rows=[];
  const first = Math.floor(scene.worldProgress)-GAME.lanesBehind;
  const last = Math.ceil(scene.worldProgress)+Math.ceil(GAME.height/-FORWARD.y)+3;
  for (let lane=first;lane<=last;lane++) {
    const row=scene.ensureLane(lane);
    const p=project(180,lane,scene.worldProgress);
    if(p.y>-100&&p.y<GAME.height+140) rows.push(row);
  }
  // Paint distant ground first, then every raised object by its ground depth.
  [...rows].sort((a,b)=>b.lane-a.lane).forEach(row=>ground(ctx,scene,row));
  // Platforms are part of the supporting surface, never foreground actors.
  // Sorting a wide log by its center hid riders standing at its left end.
  for(const row of [...rows].sort((a,b)=>b.lane-a.lane))
    for(const log of row.logs)drawLog(ctx,scene,row,log);
  const objects=[];
  for (const row of rows) {
    for (const car of row.cars) objects.push({y:project(car.x,row.lane,scene.worldProgress).y,draw:()=>drawVehicle(ctx,scene,car)});
    for (const tree of isGrass(row.kind)?row.trees:[]) {
      const p=project(tree.x,row.lane,scene.worldProgress);
      objects.push({y:p.y,draw:()=>palm(ctx,p.x,p.y-rowHeight(row),true)});
    }
    if (isGrass(row.kind)&&row.lane%3===0) for (const x of [-37,397]) {
      const p=project(x,row.lane,scene.worldProgress);
      objects.push({y:p.y,draw:()=>palm(ctx,p.x,p.y)});
    }
    if (row.grain&&!row.grain.collected) objects.push({y:project(row.grain.x,row.lane,scene.worldProgress).y+.5,draw:()=>drawPickup(ctx,scene,row)});
  }
  scene.effects?.drawWorld(ctx, project, scene.worldProgress);
  const player = project(scene.playerX, scene.worldProgress, scene.worldProgress);
  player.y-=playerHeight(scene);
  objects.push({y:player.y+1,draw:()=>{
    ctx.fillStyle='#17112366';ctx.beginPath();ctx.ellipse(player.x,player.y,12,5,.2,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(player.x,player.y+scene.hop);ctx.rotate(scene.playerRotation);ctx.globalAlpha=scene.playerAlpha;
    const image=art.chicken;
    if(image) sprite(ctx,image,0,0,54*image.width/image.height*scene.playerScale,54*scene.playerScale,1);
    else {ctx.fillStyle='#fff1dc';ctx.fillRect(-10,-28,20,28)}
    ctx.restore();
  }});
  objects.sort((a,b)=>a.y-b.y).forEach(object=>object.draw());
  if(scene.messageAlpha>0) {
    ctx.save();ctx.globalAlpha=scene.messageAlpha;ctx.textAlign='center';ctx.font='bold 12px sans-serif';
    ctx.lineWidth=5;ctx.strokeStyle='#26152d';ctx.strokeText(scene.message,180,scene.messageY);
    ctx.fillStyle='#fff1dc';ctx.fillText(scene.message,180,scene.messageY);ctx.restore();
  }
  scene.effects?.drawCelebration(ctx);
  if(scene.flash>0){ctx.fillStyle=`rgba(255,220,195,${scene.flash})`;ctx.fillRect(0,0,GAME.width,GAME.height)}
  ctx.restore();
}
