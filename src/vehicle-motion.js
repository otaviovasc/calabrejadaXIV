// Animation follows travelled distance, not wrapped screen position. A recycled
// vehicle therefore keeps its wheel rotation and suspension phase continuous.
export function vehicleMotion(car) {
  const distance=car.travelled??Math.abs(car.x);
  const phase=distance*.13+(car.motionPhase??car.lane*1.618);
  const intensity=Math.min(1,Math.abs(car.speed)/110);
  return {
    bob:(Math.sin(phase)*.7+Math.sin(phase*.43)*.3)*intensity,
    pitch:Math.sin(phase*.61)*.009*intensity*Math.sign(car.speed),
    scaleY:1+Math.sin(phase+1.2)*.014*intensity,
    shearX:Math.sin(phase*.47)*.006*intensity,
    wheelAngle:distance/7*Math.sign(car.speed),
  };
}

// Rim centers in the original artwork. Convert after transparency trimming so
// the spinning hub overlays stay attached to each specific left/right image.
const RIMS={
  truckRight:[[.182,.724],[.654,.856]],
  truckLeft:[[.340,.856],[.830,.724]],
  newageRight:[[.180,.686],[.613,.862]],
  newageLeft:[[.381,.865],[.820,.689]],
  partyRight:[[.180,.686],[.613,.862]],
  partyLeft:[[.381,.865],[.820,.689]],
};

export function vehicleRims(key,bounds) {
  if(!bounds||!RIMS[key])return [];
  const {left,top,width,height,sourceWidth,sourceHeight}=bounds;
  return RIMS[key].map(([u,v])=>({
    u:(u*sourceWidth-left)/width,
    v:(v*sourceHeight-top)/height,
    radius:sourceWidth*.024/width,
  }));
}
