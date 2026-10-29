import {PARTNER_HEADING,PARTNERS,loadRequiredPartnerImages} from './partners.js';

const WIDTH=1080,HEIGHT=1920,GOAL=16;
const BACKGROUND_URL=new URL('../assets/campaign-background.png',import.meta.url).href;
const CHICKEN_URL=new URL('../assets/optimized/chicken-gameover.png',import.meta.url).href;

function loadImage(src){
  return new Promise((resolve,reject)=>{
    if(typeof Image==='undefined'){reject(new Error('Imagens não estão disponíveis neste navegador'));return}
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error(`Não foi possível carregar ${src}`));
    image.src=src;
  });
}

function cover(ctx,image,x,y,width,height){
  const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
  const sourceWidth=width/scale,sourceHeight=height/scale;
  const sourceX=(image.naturalWidth-sourceWidth)/2,sourceY=(image.naturalHeight-sourceHeight)/2;
  ctx.drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,x,y,width,height);
}

function contain(ctx,image,x,y,width,height,padding=0){
  const availableWidth=width-padding*2,availableHeight=height-padding*2;
  const scale=Math.min(availableWidth/image.naturalWidth,availableHeight/image.naturalHeight);
  const drawWidth=image.naturalWidth*scale,drawHeight=image.naturalHeight*scale;
  ctx.drawImage(image,x+(width-drawWidth)/2,y+(height-drawHeight)/2,drawWidth,drawHeight);
}

function roundedRect(ctx,x,y,width,height,radius,fill,stroke){
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+width,y,x+width,y+height,radius);ctx.arcTo(x+width,y+height,x,y+height,radius);ctx.arcTo(x,y+height,x,y,radius);ctx.arcTo(x,y,x+width,y,radius);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}
}

function centeredText(ctx,text,y,font,color){ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,WIDTH/2,y,900)}

export async function downloadResult({score=0,distance=0,items=0,nickname='',republic=''}={}){
  if(!globalThis.document?.createElement)throw new Error('Download indisponível neste navegador');
  await document.fonts?.ready;
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível montar o resultado');
  const [decorationResults,partnerImages]=await Promise.all([
    Promise.allSettled([loadImage(BACKGROUND_URL),loadImage(CHICKEN_URL)]),
    loadRequiredPartnerImages()
  ]);
  const [backgroundResult,chickenResult]=decorationResults;
  const reached=items>=GOAL;
  const gradient=ctx.createLinearGradient(0,0,0,HEIGHT);gradient.addColorStop(0,'#fb6e77');gradient.addColorStop(.48,'#682452');gradient.addColorStop(1,'#17102c');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(backgroundResult.status==='fulfilled')cover(ctx,backgroundResult.value,0,0,WIDTH,HEIGHT);
  ctx.fillStyle='rgba(18,7,34,.32)';ctx.fillRect(0,0,WIDTH,HEIGHT);
  const shade=ctx.createLinearGradient(0,500,0,HEIGHT);shade.addColorStop(0,'rgba(17,7,31,0)');shade.addColorStop(.58,'rgba(17,7,31,.75)');shade.addColorStop(1,'rgba(17,7,31,.96)');ctx.fillStyle=shade;ctx.fillRect(0,0,WIDTH,HEIGHT);

  centeredText(ctx,'REPÚBLICA NOSTRAVAMOS',122,'700 34px "Space Grotesk", sans-serif','#38e1d2');
  centeredText(ctx,'CALABREJADA · EDIÇÃO XVI',180,'500 25px "DM Mono", monospace','#fff4d6');
  if(chickenResult.status==='fulfilled'){ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=28;ctx.drawImage(chickenResult.value,370,215,340,340);ctx.restore()}

  centeredText(ctx,reached?'META ALCANÇADA!':'QUASE LÁ!',650,'800 82px "Space Grotesk", sans-serif',reached?'#38e1d2':'#ffcf55');
  centeredText(ctx,reached?'Você coletou 16 ou mais itens na mesma partida.':`Faltaram ${GOAL-items} ${GOAL-items===1?'item':'itens'} para a meta simbólica.`,710,'500 29px "Space Grotesk", sans-serif','#fff4d6');

  centeredText(ctx,nickname,747,'700 30px "Space Grotesk", sans-serif','#ffe66a');
  if(republic)centeredText(ctx,republic,783,'500 25px "Space Grotesk", sans-serif','#fff4d6');

  const boxes=[{x:95,label:'ITENS',value:`${items}/16`,accent:reached?'#38e1d2':'#ffe66a'},{x:385,label:'CASAS',value:String(distance),accent:'#fff4d6'},{x:675,label:'PONTOS',value:String(score),accent:'#fff4d6'}];
  for(const box of boxes){roundedRect(ctx,box.x,805,250,135,34,'rgba(24,12,43,.88)','rgba(255,255,255,.18)');ctx.textAlign='center';ctx.fillStyle=box.accent;ctx.font='800 64px "Space Grotesk", sans-serif';ctx.fillText(box.value,box.x+125,865);ctx.fillStyle='#dcb9cf';ctx.font='500 24px "DM Mono", monospace';ctx.fillText(box.label,box.x+125,915)}

  centeredText(ctx,PARTNER_HEADING,995,'500 22px "DM Mono", monospace','#f4dbe8');
  const partnerById=new Map(partnerImages.map(entry=>[entry.partner.id,entry.image]));
  const slotWidth=430,slotHeight=216,slotGap=24,slotStart=98;
  for(const [index,partner] of PARTNERS.entries()){
    const x=slotStart+(index%2)*(slotWidth+slotGap);
    const y=1035+Math.floor(index/2)*(slotHeight+slotGap);
    roundedRect(ctx,x,y,slotWidth,slotHeight,20,'#ffffff','rgba(255,255,255,.62)');
    const image=partnerById.get(partner.id);
    if(image)contain(ctx,image,x,y,slotWidth,slotHeight,12);
  }

  roundedRect(ctx,90,1530,900,265,38,'rgba(23,12,42,.9)',reached?'#38e1d2':'#ff4b91');
  centeredText(ctx,'AGORA É COM VOCÊ',1595,'800 42px "Space Grotesk", sans-serif','#fff4d6');
  centeredText(ctx,reached?'Poste para concorrer ao ingresso da Calabrejada:':'Chegue a 16 itens e poste marcando:',1650,'500 27px "Space Grotesk", sans-serif','#f4dbe8');
  centeredText(ctx,'@repnostravamos',1710,'800 36px "Space Grotesk", sans-serif','#ffe66a');
  centeredText(ctx,'@calabrejadadalarapius',1765,'800 36px "Space Grotesk", sans-serif','#ffe66a');
  centeredText(ctx,'CALABREJADA XVI · EVENTO +18',1820,'500 23px "DM Mono", monospace','#dcb9cf');
  centeredText(ctx,'BEBA COM MODERAÇÃO',1862,'500 21px "DM Mono", monospace','#dcb9cf');

  const blob=canvas.toBlob?await new Promise(resolve=>canvas.toBlob(resolve,'image/png')):null;
  const link=document.createElement('a');link.download=`calabrejada-xvi-${items}-itens.png`;
  if(blob&&globalThis.URL?.createObjectURL){const url=URL.createObjectURL(blob);link.href=url;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else{link.href=canvas.toDataURL('image/png');link.click()}
}
