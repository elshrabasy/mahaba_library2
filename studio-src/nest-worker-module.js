import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';
import {generatePatternSolutions} from './nest-patterns.js';

self.onmessage=e=>{
  const {template,config}=e.data||{};
  try{
    const engine=globalThis.MahabaNestEngine;
    if(!engine)throw new Error('محرك المونتاج غير متاح.');
    const T=prepareIrregularTemplate(template);

    const regular=engine.regularSolution(T,config);
    self.postMessage({type:'preview',result:regular});

    const patterns=generatePatternSolutions(engine,T,config);
    if(patterns.results?.length)self.postMessage({type:'preview',result:patterns});

    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(T.cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));

    const merged=[...(patterns.results||[]),...(result.results||[])];
    const seen=new Set(),results=[];
    for(const r of merged){
      const key=(r.layout||[]).map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).join('|');
      if(seen.has(key))continue;seen.add(key);results.push(r);
    }
    results.sort((a,b)=>(b.layout?.length||0)-(a.layout?.length||0)||(a.area||Infinity)-(b.area||Infinity)||(a.h||Infinity)-(b.h||Infinity));
    self.postMessage({type:'result',result:{...result,results:results.slice(0,10),patternPair:patterns.pair||null}});
  }catch(error){
    self.postMessage({type:'error',message:error?.message||String(error)});
  }
};
