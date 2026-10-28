// Tiny local Canvas engine: fixed-size scenes, delta-time updates, easing tweens, and drawing helpers.
export class Engine{
  constructor(canvas,scene,width,height){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.scene=scene;this.width=width;this.height=height;this.tweens=[];this.running=false;this.last=0;this.resize=()=>this.fit();window.addEventListener('resize',this.resize);if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(()=>{const width=canvas.parentElement.getBoundingClientRect().width;if(width!==this.observedWidth){this.observedWidth=width;requestAnimationFrame(this.resize)}});this.observer.observe(canvas.parentElement)}this.fit()}
  fit(){const box=this.canvas.parentElement.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);const cssWidth=Math.max(1,box.width);const scale=cssWidth/this.width;this.canvas.width=Math.round(cssWidth*dpr);this.canvas.height=Math.round(cssWidth*this.height/this.width*dpr);this.canvas.style.width=`${cssWidth}px`;this.canvas.style.height=`${cssWidth*this.height/this.width}px`;this.ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0)}
  start(){if(this.running)return;this.running=true;this.last=performance.now();requestAnimationFrame(t=>this.frame(t))}
  stop(){this.running=false}
  tween(target,values,duration,ease='out',complete){const from={};for(const key of Object.keys(values))from[key]=target[key];this.tweens.push({target,from,to:values,duration,elapsed:0,ease,complete})}
  frame(now){if(!this.running)return;const delta=Math.min((now-this.last)/1000,.05);this.last=now;try{this.scene.update(delta);this.updateTweens(delta);this.scene.draw(this.ctx)}catch(error){this.running=false;console.error('Game loop stopped:',error);this.scene.onError?.(error);return}requestAnimationFrame(t=>this.frame(t))}
  updateTweens(delta){for(let i=this.tweens.length-1;i>=0;i--){const t=this.tweens[i];t.elapsed+=delta;const p=Math.min(1,t.elapsed/t.duration),e=t.ease==='inout'?p*p*(3-2*p):1-Math.pow(1-p,3);for(const key of Object.keys(t.to))t.target[key]=t.from[key]+(t.to[key]-t.from[key])*e;if(p===1){this.tweens.splice(i,1);t.complete?.()}}}
  clearTweens(target){this.tweens=this.tweens.filter(t=>t.target!==target)}
}
export function roundedRect(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
