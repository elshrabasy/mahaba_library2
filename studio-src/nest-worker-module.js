import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';
import {generatePatternSolutions} from './nest-patterns.js';
import {optimizeProductionRun,compareSheetFormats,buildHalfDieCandidate} from './nest-production-optimizer.js';
import {smartMixedRotationSolutions} from './nest-smart-rotation.js';

self.onmessage=e=>{
  const {template,config,run={},availableSheets=[]}=e.data||{};
  try{
    const engine=globalThis.MahabaNestEngine;
    if(!engine)throw new Error('محرك المونتاج غير متاح.');
    const T=prepareIrregularTemplate(template);

    const regular=engine.regularSolution(T,config);
    self.postMessage({type:'preview',result:regular});

    const patterns=generatePatternSolutions(engine,T,config);
    if(patterns.results?.length)self.postMessage({type:'preview',result:patterns});

    const halfDie=[];
    for(const base of (patterns.results||[]).slice(0,4)){
      const h=buildHalfDieCandidate(engine,T,config,base.layout);
      if(h)halfDie.push(h);
    }

    const smartRotation=smartMixedRotationSolutions(engine,T,config);
    if(smartRotation.results?.length)self.postMessage({type:'preview',result:smartRotation});

    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(T.cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));

    const merged=[...(patterns.results||[]),...halfDie,...(smartRotation.results||[]),...(result.results||[])];
    const seen=new Set(),results=[];
    for(const r of merged){
      const key=(r.layout||[]).map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).sort().join('|');
      if(seen.has(key))continue;
      seen.add(key);
      results.push(r);
    }
    results.sort((a,b)=>(b.layout?.length||0)-(a.layout?.length||0)||(a.area||Infinity)-(b.area||Infinity)||(a.h||Infinity)-(b.h||Infinity));

    const production=optimizeProductionRun(results,T,config,run);
    const sheetOptimization=availableSheets?.length?compareSheetFormats({
      engine,
      template:T,
      baseConfig:config,
      sheets:availableSheets,
      patternSolver:generatePatternSolutions,
      run
    }):[];

    self.postMessage({
      type:'result',
      result:{
        ...result,
        results:production.results.slice(0,12),
        patternPair:patterns.pair||null,
        productionBest:production.best||null,
        productionHints:production.hints||[],
        sheetOptimization
      }
    });
  }catch(error){
    self.postMessage({type:'error',message:error?.message||String(error)});
  }
};
