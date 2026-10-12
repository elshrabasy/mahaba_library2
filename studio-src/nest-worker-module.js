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
    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(T.cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));
    self.postMessage({type:'result',result});
  }catch(error){
    self.postMessage({type:'error',message:error?.message||String(error)});
  }
};
