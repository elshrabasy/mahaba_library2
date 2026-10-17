import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';
import {generatePatternSolutions} from './nest-patterns.js?v=20261017-4';
import {optimizeProductionRun,compareSheetFormats,buildHalfDieCandidate} from './nest-production-optimizer.js';
import {smartMixedRotationSolutions} from './nest-smart-rotation.js';
import {gaNestingOptimize} from './nest-ga-optimizer.js';
import {createInterlockSearch,refineInterlockSolutions,compareNestingLayouts} from './nest-pair-interlock.js?v=20261017-4';

self.onmessage=e=>{
  const {template,config,run={},availableSheets=[],search={}}=e.data||{};
  try{
    const engine=globalThis.MahabaNestEngine;
    if(!engine)throw new Error('محرك المونتاج غير متاح.');
    const T=prepareIrregularTemplate(template);
    const angles=search.allowCrossRotation===false?[...new Set(config.angles||[0,180])]:[...new Set([...(config.angles||[0,180]),90,270])];
    const effectiveConfig={...config,angles};
    const interlockSearch=createInterlockSearch(engine,T,effectiveConfig);

    const regular=engine.regularSolution(T,effectiveConfig);
    self.postMessage({type:'preview',result:regular});
    self.postMessage({type:'progress',phase:'interlock',stage:'البحث عن أزواج متعشقة · 0° / 180°',done:0,total:1});
    const patterns=generatePatternSolutions(engine,T,effectiveConfig,{interlockSearch});
    if(patterns.results?.length)self.postMessage({type:'preview',result:patterns});

    const halfDie=[];
    for(const base of (patterns.results||[]).slice(0,4)){const h=buildHalfDieCandidate(engine,T,effectiveConfig,base.layout);if(h)halfDie.push(h);}

    const smartRotation={results:smartMixedRotationSolutions(engine,T,effectiveConfig).results.filter(candidate=>engine.validate(candidate.layout,interlockSearch.variants,effectiveConfig).ok)};
    if(smartRotation.results?.length)self.postMessage({type:'preview',result:smartRotation});

    const deterministic=[...(regular.results||[]),...(patterns.results||[]),...halfDie,...(smartRotation.results||[])];
    const initialRefined=refineInterlockSolutions(engine,T,effectiveConfig,deterministic,{limit:2,search:interlockSearch});
    if(initialRefined.length)self.postMessage({type:'preview',result:{...patterns,results:[...deterministic,...initialRefined].sort(compareNestingLayouts)}});
    const quality=search.quality||'fast';
    const presets={fast:{population:6,generations:3,mutation:.12},balanced:{population:10,generations:7,mutation:.18},deep:{population:16,generations:14,mutation:.22},extreme:{population:24,generations:24,mutation:.26}};
    const qp=presets[quality]||presets.fast;
    const ga=gaNestingOptimize(engine,T,effectiveConfig,{...qp,angles,seed:Number(search.seed||20261017),seedLayouts:[...deterministic,...initialRefined],onProgress:p=>self.postMessage({type:'progress',phase:'ga',...p})});
    if(ga.results?.length)self.postMessage({type:'preview',result:ga});

    const rel=relativeRotations(config.angles||[0,180]);
    const N=buildConvexNFP(T.cells,rel,p=>self.postMessage({type:'progress',phase:'nfp',...p}));
    const result=engine.solve(T,N,config,p=>self.postMessage({type:'progress',phase:'solve',...p}));

    const candidates=[...deterministic,...initialRefined,...(ga.results||[]),...(result.results||[])];
    self.postMessage({type:'progress',phase:'refine',stage:'تحسين محلي · قلب 180° وإزاحات التماس',done:0,total:1});
    const refined=refineInterlockSolutions(engine,T,effectiveConfig,candidates,{limit:2,search:interlockSearch});
    const merged=[...candidates,...refined];
    const seen=new Set(),results=[];
    for(const r of merged){if(!r.layout?.length||!engine.validate(r.layout,interlockSearch.variants,effectiveConfig,true).ok)continue;const key=r.layout.map(a=>`${a.r}:${a.x.toFixed(4)}:${a.y.toFixed(4)}`).sort().join('|');if(seen.has(key))continue;seen.add(key);results.push({...r,...engine.dims(r.layout,interlockSearch.variants)});}
    results.sort(compareNestingLayouts);

    const production=optimizeProductionRun(results,T,effectiveConfig,run);
    const sheetOptimization=availableSheets?.length?compareSheetFormats({engine,template:T,baseConfig:effectiveConfig,sheets:availableSheets,patternSolver:generatePatternSolutions,run}):[];
    const productionByLayout=new Map(production.results.map(candidate=>[candidate.layout,candidate]));
    self.postMessage({type:'result',result:{...result,results:results.slice(0,14).map(candidate=>productionByLayout.get(candidate.layout)),config:effectiveConfig,patternPair:patterns.pair||null,interlock:{pairs:patterns.pairs?.length||0,refined:initialRefined.length+refined.length},ga:{generations:ga.generations,population:ga.population,mutation:ga.mutation,best:ga.results?.[0]?.layout?.length||0},productionBest:production.best||null,productionHints:production.hints||[],sheetOptimization}});
  }catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}
};
