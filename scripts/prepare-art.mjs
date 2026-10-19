// Optional artwork preparation. Requires ffmpeg; committed outputs are ready to use.
// Resizes delivery copies only. Original campaign artwork is never overwritten.
import {mkdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files={
  'chicken-nostra-back':384,'chicken-gameover':512,
  'pickup-29':256,'pickup-55':256,'pickup-ticket':256,
  'truck-29-right':512,'truck-29-left':512,
  'van-newage-right':512,'van-newage-left':512,
  'van-calabrejada-right':512,'van-calabrejada-left':512,
  'campaign-background':720,'logo-nostravamos':512,
};
mkdirSync('assets/optimized',{recursive:true});
let before=0,after=0;
for(const [name,width]of Object.entries(files)){
  const input=name==='logo-nostravamos'?'assets/raw-assets/logo-nostravamos.png':`assets/${name}.png`,output=`assets/optimized/${name}.png`;
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',`scale=${width}:-1:flags=lanczos`,'-frames:v','1','-compression_level','9',output],{encoding:'utf8'});
  if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr);
  before+=statSync(input).size;after+=statSync(output).size;
}
console.log(`Artwork: ${(before/1e6).toFixed(2)} MB → ${(after/1e6).toFixed(2)} MB. Originals preserved.`);
