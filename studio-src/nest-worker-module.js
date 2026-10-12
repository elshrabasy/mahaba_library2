import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';

self.onmessage=e=>{
  const {template,config}=e.data||{};
  try{
    const engine=globalThis.MahabaNestEngine;
    if(!engine)throw new Error('محرك المونتاج غير متاح.');
    const T=prepareIrregularTemplate(template);
    const preview=engine.regularSolution(T,config);
    self.postMessage({type:'preview',result:preview});

    // Balanced mode must stay interactive. It uses the original regular/rotation
    // optimiser only and returns immediately; irregular NFP is explicit Deep mode.
    if(!config?.deep){
      self.postMessage({type:'result',result:preview,mode:'balanced'});
      return;
    }

    const cells=T.cells||[];
    if(cells.length>90){
      self.postMessage({type:'error',message:`الوضع الموسع يحتاج تبسيط حدود هذا القالب قبل NFP (${cells.length} خلية). استخدم متوازن الآن بدون تهنيج.`});
      return;
    }
    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));
    self.postMessage({type:'result',result,mode:'deep'});
  }catch(error){
    self.postMessage({type:'error',message:error?.message||String(error)});
  }
};
