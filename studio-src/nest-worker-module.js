import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';
import {generatePatternSolutions} from './nest-patterns.js';
import {optimizeProductionRun,compareSheetFormats,buildHalfDieCandidate} from './nest-production-optimizer.js';
import {smartMixedRotationSolutions} from './nest-smart-rotation.js';
import {gaNestingOptimize} from './nest-ga-optimizer.js';

self.onmessage=e=>{
  const {template,config,run={},availableSheets=[],search={}}=e.data||{};
  try{
    const engine=globalThis.MahabaNestEngine;
    if(!engine)throw new Error('محرك المونتاج غير متاح.');
    const T=prepareIrregularTemplate(template);

    const regular=engine.regularSolution(T,config);
    self.postMessage({type:'preview',result:regular});
    const patterns=generatePatternSolutions(engine,T,config);
    if(patterns.results?.length)self.postMessage({type:'preview',result:patterns});

    const halfDie=[];
    for(const base of (patterns.results||[]).slice(0,4)){const h=buildHalfDieCandidate(engine,T,config,base.layout);if(h)halfDie.push(h);}

    const smartRotation=smartMixedRotationSolutions(engine,T,config);
    if(smartRotation.results?.length)self.postMessage({type:'preview',result:smartRotation});

    // SVGnest-inspired evolutionary layer, warm-started from Mahabat's strongest deterministic layouts.
    const gaAngles=search.allowCrossRotation===false?[...new Set(config.angles||[0,180])]:[...new Set([...(config.angles||[0,180]),90,270])];
    const quality=search.quality||'fast';
    const presets={fast:{population:6,generations:3,mutation:.12},balanced:{population:10,generations:7,mutation:.18},deep:{population:16,generations:14,mutation:.22},extreme:{population:24,generations:24,mutation:.26}};
    const qp=presets[quality]||presets.fast;
    const ga=gaNestingOptimize(engine,T,{...config,angles:gaAngles},{...qp,angles:gaAngles,seed:Number(search.seed||20261017),seedLayouts:[...(patterns.results||[]),...halfDie,...(smartRotation.results||[])],onProgress:p=>self.postMessage({type:'progress',phase:'ga',...p})});
    if(ga.results?.length)self.postMessage({type:'preview',result:ga});

    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(T.cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));

    const merged=[...(patterns.results||[]),...halfDie,...(smartRotation.results||[]),...(ga.results||[]),...(result.results||[])];
    const seen=new Set(),results=[];
    for(const r of merged){const key=(r.layout||[]).map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).sort().join('|');if(seen.has(key))continue;seen.add(key);results.push(r);}
    results.sort((a,b)=>(b.layout?.length||0)-(a.layout?.length||0)||(a.area||Infinity)-(b.area||Infinity)||(a.h||Infinity)-(b.h||Infinity));

    const production=optimizeProductionRun(results,T,config,run);
    const sheetOptimization=availableSheets?.length?compareSheetFormats({engine,template:T,baseConfig:config,sheets:availableSheets,patternSolver:generatePatternSolutions,run}):[];
    self.postMessage({type:'result',result:{...result,results:production.results.slice(0,14),patternPair:patterns.pair||null,ga:{generations:ga.generations,population:ga.population,mutation:ga.mutation,best:ga.results?.[0]?.layout?.length||0},productionBest:production.best||null,productionHints:production.hints||[],sheetOptimization}});
  }catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}
};
