import {downloadResult} from './share.js';
import {PARTNERS,loadRequiredPartnerImages} from './partners.js';

const GOAL=16;
let player={nickname:'',republic:''};
let currentResult={score:0,distance:0,items:0};

export const ui={
  form:document.querySelector('#player-form'),nickname:document.querySelector('#nickname'),republic:document.querySelector('#republic'),introPrize:document.querySelector('#intro-prize'),
  resultPlayer:document.querySelector('#result-player'),resultNickname:document.querySelector('#result-nickname'),resultRepublic:document.querySelector('#result-republic'),shareInstruction:document.querySelector('#share-instruction'),
  score:document.querySelector('#score'),best:document.querySelector('#best'),distance:document.querySelector('#distance'),items:document.querySelector('#items'),
  overlay:document.querySelector('#overlay'),start:document.querySelector('#start'),overline:document.querySelector('#overline'),headline:document.querySelector('#headline'),description:document.querySelector('#description'),
  card:document.querySelector('#result-card'),chicken:document.querySelector('#gameover-chicken'),resultStats:document.querySelector('#result-stats'),
  resultItems:document.querySelector('#result-items'),resultDistance:document.querySelector('#result-distance'),resultScore:document.querySelector('#result-score'),
  shareCallout:document.querySelector('#share-callout'),download:document.querySelector('#download-result'),
  partners:document.querySelector('#result-partners'),partnerError:document.querySelector('#partner-error'),
  partnerImages:{
    '51':document.querySelector('#partner-logo-51'),
    'new-age':document.querySelector('#partner-logo-new-age'),
    rubao:document.querySelector('#partner-logo-rubao'),
    future:document.querySelector('#partner-logo-future')
  }
};

let partnerLogosReady=false;

for(const partner of PARTNERS){
  const image=ui.partnerImages[partner.id];
  if(image&&partner.imageUrl){image.src=partner.imageUrl;image.alt=partner.alt;image.hidden=false;image.parentElement?.setAttribute('aria-label',partner.alt)}
}

async function preparePartnerLogos(retry=false){
  ui.partnerError.hidden=true;
  try{
    const loaded=await loadRequiredPartnerImages({retry});
    for(const {partner,image} of loaded){
      const visibleImage=ui.partnerImages[partner.id];
      if(visibleImage)visibleImage.src=image.src;
    }
    partnerLogosReady=true;
    return true;
  }catch(error){
    partnerLogosReady=false;
    ui.partnerError.hidden=false;
    console.error(error);
    return false;
  }
}

if(typeof Image!=='undefined')preparePartnerLogos();

export function setRunStats(score,best,distance,items=0){
  ui.score.textContent=score;ui.best.textContent=best;ui.distance.textContent=distance;ui.items.textContent=items;
  ui.items.closest?.('.stat-items')?.classList.toggle('goal-complete',items>=GOAL);
}

export function capturePlayer(){
  const nickname=(ui.nickname.value||'').trim();
  ui.nickname.setCustomValidity(nickname?'':'Preencha seu apelido para jogar.');
  if(!ui.form.reportValidity())return false;
  player={nickname,republic:(ui.republic.value||'').trim()};
  ui.nickname.value=nickname;
  return true;
}
ui.nickname.addEventListener('input',()=>ui.nickname.setCustomValidity(''));

export function showReady(){
  currentResult={score:0,distance:0,items:0};
  ui.overline.textContent='CALABREJADA · EDIÇÃO XVI';
  ui.headline.innerHTML='PEGUE<br>16 ITENS.';
  ui.description.textContent='Atravesse as ruas e os rios sem ser atingido nem cair na água. Colete 16 itens na mesma partida!';
  ui.form.hidden=true;ui.introPrize.hidden=true;ui.resultPlayer.hidden=true;
  ui.start.textContent='VAMOS ATRAVESSAR →';
  ui.card.classList.remove('goal-reached');ui.card.classList.remove('result-visible');ui.chicken.hidden=true;ui.resultStats.hidden=true;ui.partners.hidden=true;ui.shareCallout.hidden=true;ui.download.hidden=true;
  ui.overlay.classList.remove('result-overlay');ui.overlay.inert=true;ui.overlay.classList.add('hidden');
}

export function showGameOver(score,distance,items=0){
  currentResult={score,distance,items,...player};
  ui.form.hidden=true;ui.introPrize.hidden=true;ui.resultPlayer.hidden=false;
  ui.resultNickname.textContent=player.nickname;ui.resultRepublic.textContent=player.republic;ui.resultRepublic.hidden=!player.republic;
  const reached=items>=GOAL,remaining=Math.max(0,GOAL-items);
  ui.overline.textContent='FIM DE JOGO · CALABREJADA XVI';
  ui.headline.innerHTML=reached?'META<br>ALCANÇADA!':'DEU RUIM<br>NA TRAVESSIA!';
  ui.description.textContent=reached?'Meta de 16 itens alcançada! Poste para concorrer ao ingresso.':`Faltaram ${remaining} ${remaining===1?'item':'itens'}. Bora tentar de novo?`;
  ui.shareInstruction.textContent=reached?'Você bateu a meta! Poste este resultado no Instagram para concorrer a um ingresso da Calabrejada e marque:':'Chegue a 16 itens na mesma partida para concorrer a um ingresso da Calabrejada. Depois, poste o resultado marcando:';
  ui.resultItems.textContent=`${items}/16`;ui.resultDistance.textContent=distance;ui.resultScore.textContent=score;
  ui.start.textContent='JOGAR DE NOVO →';
  ui.overlay.classList.add('result-overlay');
  ui.card.classList.add('result-visible');ui.card.classList[reached?'add':'remove']('goal-reached');ui.chicken.hidden=false;ui.resultStats.hidden=false;ui.partners.hidden=false;ui.shareCallout.hidden=false;ui.download.hidden=false;
  if(!partnerLogosReady&&typeof Image!=='undefined'){
    ui.download.disabled=true;ui.download.textContent='CARREGANDO MARCAS…';
    preparePartnerLogos().then(ready=>{ui.download.disabled=false;ui.download.textContent=ready?'BAIXAR RESULTADO ↓':'TENTAR CARREGAR LOGOS ↻'});
  }
  ui.overlay.inert=false;ui.overlay.classList.remove('hidden');
}

export function showRuntimeError(error){
  ui.overline.textContent='ERRO NO JOGO';ui.headline.textContent='JOGO PAUSADO';
  ui.description.textContent=`${error?.message||'Erro desconhecido'}. Recarregue para tentar de novo.`;
  ui.start.textContent='RECARREGAR JOGO';ui.start.onclick=()=>location.reload();
  ui.chicken.hidden=true;ui.resultStats.hidden=true;ui.partners.hidden=true;ui.shareCallout.hidden=true;ui.download.hidden=true;ui.overlay.inert=false;ui.overlay.classList.remove('hidden');
}

ui.chicken.addEventListener('error',()=>{ui.chicken.hidden=true});
ui.download.addEventListener('click',async()=>{
  ui.download.disabled=true;ui.download.textContent='MONTANDO IMAGEM…';
  try{
    if(!partnerLogosReady&&!(await preparePartnerLogos(true)))throw new Error('As marcas obrigatórias não carregaram');
    await downloadResult(currentResult);ui.download.textContent='RESULTADO BAIXADO ✓';
    setTimeout(()=>{ui.download.disabled=false;ui.download.textContent='BAIXAR RESULTADO ↓'},1800);
  }catch(error){
    ui.partnerError.hidden=false;ui.download.disabled=false;ui.download.textContent='TENTAR CARREGAR LOGOS ↻';console.error(error);
  }
});
