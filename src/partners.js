export const PARTNER_HEADING='PATROCÍNIO E REALIZAÇÃO';

export const PARTNERS=[
  {
    id:'51',
    name:'51',
    alt:'Logo da 51',
    imageUrl:new URL('../assets/optimized/logo-51.png',import.meta.url).href,
    required:true
  },
  {
    id:'new-age',
    name:'NewAge',
    alt:'Logo da NewAge',
    imageUrl:new URL('../assets/optimized/logo-newage.jpeg',import.meta.url).href,
    required:true
  },
  {
    id:'rubao',
    name:'Agregado mais top das galaxias',
    alt:'Logo do Rubao',
    imageUrl:new URL('../assets/optimized/rubao-logo.png',import.meta.url).href,
    required:true
  },
  {
    id:'Amsterdam',
    name:'Amsterdam',
    alt:'Logo da Amsterdam',
    imageUrl:new URL('../assets/optimized/ams-logo.png',import.meta.url).href,
    required:true
  }
];

let cachedRequiredImages;

function loadImage(partner,retry){
  return new Promise((resolve,reject)=>{
    if(typeof Image==='undefined'){
      reject(new Error('Imagens não estão disponíveis neste navegador'));
      return;
    }
    const image=new Image();
    image.onload=()=>resolve({partner,image});
    image.onerror=()=>reject(new Error(`Não foi possível carregar a logo ${partner.name}`));
    const separator=partner.imageUrl.includes('?')?'&':'?';
    image.src=retry?`${partner.imageUrl}${separator}retry=${Date.now()}`:partner.imageUrl;
  });
}

export function loadRequiredPartnerImages({retry=false}={}){
  if(retry||!cachedRequiredImages){
    const required=PARTNERS.filter(partner=>partner.required&&partner.imageUrl);
    cachedRequiredImages=Promise.all(required.map(partner=>loadImage(partner,retry))).catch(error=>{
      cachedRequiredImages=undefined;
      throw new Error(`As marcas obrigatórias não carregaram. ${error.message}`);
    });
  }
  return cachedRequiredImages;
}
