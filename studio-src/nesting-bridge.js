// Mahabat Engine -> Mahaba NestEngine contract.
// The bridge uses the exact Mahabat outline/cut/crease geometry.
// No bounding-box replacement is permitted.
import './nest-engine-core.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from './nfp-lite.js';
import {drawingPathPoints} from '../core/geometry/path-points.js';

if(typeof globalThis!=='undefined'&&globalThis.MahabaNestEngine&&!globalThis.NestEngine){
  globalThis.NestEngine=globalThis.MahabaNestEngine;
}

const clonePoint=p=>[Number(p[0]),Number(p[1])];

export function buildNestTemplate(engineResult){
  if(!engineResult)throw new Error('لا توجد هندسة من Mahabat Engine.');
  const polygon=(engineResult.outline||[]).map(clonePoint);
  if(polygon.length<3)throw new Error('محيط القالب غير صالح للمونتاج.');
  const cuts=(engineResult.lines||[]).filter(x=>x.type==='cut').map(drawingPathPoints);
  const creases=(engineResult.lines||[]).filter(x=>x.type==='crease').map(drawingPathPoints);
  if(!cuts.length)throw new Error('لا توجد خطوط قص في القالب.');
  return {
    code:engineResult.code,
    polygon,
    cuts,
    creases,
    width:Number(engineResult.width),
    height:Number(engineResult.height),
    source:'mahabat-engine'
  };
}

export function buildNestConfig({sheetWidth=1000,sheetHeight=690,gripper=10,marginTop=5,marginRight=5,marginBottom=5,marginLeft=5,gap=3,bleed=0,rotation='half',deep=false}={}){
  const W=Number(sheetWidth)-Number(marginLeft)-Number(marginRight);
  const top=Math.max(Number(gripper),Number(marginTop));
  const H=Number(sheetHeight)-top-Number(marginBottom);
  if(!(W>0&&H>0))throw new Error('مساحة الفرخ الفعلية غير صالحة.');
  const clearance=Math.max(0,Number(gap))+2*Math.max(0,Number(bleed));
  const angles=rotation==='all'?[0,90,180,270]:rotation==='none'?[0]:[0,180];
  return {W,H,clearance,angles,offsetX:Number(marginLeft),offsetY:top,sheetWidth:Number(sheetWidth),sheetHeight:Number(sheetHeight),gripper:Number(gripper),bleed:Number(bleed),deep:Boolean(deep)};
}

export function regularPreview(NestEngine,engineResult,settings={}){
  if(!NestEngine?.regularSolution)throw new Error('NestEngine الأصلي غير محمّل.');
  const T=buildNestTemplate(engineResult),config=buildNestConfig(settings);
  return {template:T,config,result:NestEngine.regularSolution(T,config)};
}

export function prepareNFP(engineResult,settings={},onProgress=()=>{}){
  const template=prepareIrregularTemplate(buildNestTemplate(engineResult));
  const config=buildNestConfig(settings);
  const rotations=relativeRotations(config.angles);
  const nfp=buildConvexNFP(template.cells,rotations,onProgress);
  return {template,config,nfp};
}

export function solveNesting(NestEngine,engineResult,nfp,settings={},onProgress=()=>{}){
  if(!NestEngine?.solve)throw new Error('NestEngine الأصلي غير محمّل.');
  let template,config;
  if(nfp){template=prepareIrregularTemplate(buildNestTemplate(engineResult));config=buildNestConfig(settings);}
  else{
    const prepared=prepareNFP(engineResult,settings,onProgress);
    template=prepared.template;config=prepared.config;nfp=prepared.nfp;
  }
  const result=NestEngine.solve(template,nfp,config,onProgress);
  return {template,config,nfp,result};
}
