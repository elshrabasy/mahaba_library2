import assert from 'node:assert/strict';
import {generateMahabatNative} from '../engine/registry.js';
import {svgDrawing} from '../studio-src/studio-core.js';
import {boxDimensionGuides,dimensionGuidesSvg,dimensionViewportScale} from '../studio-src/dieline-dimensions.js';
import {StudioExperience} from '../studio-src/studio-experience.js';

for(const [code,parameters] of [
  ['EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2}],
  ['EVC11001',{L:180.5,W:95.25,H:120.75,DT:2,MAT:2,FD:1}],
  ['EVC11001',{L:190,W:110,H:95,DT:3,MAT:3,FD:2}],
  ['STE',{L:215,W:80,H:45,dimension_mode:'ID'}],
  ['STE',{L:240.5,W:90.25,H:70.75,dimension_mode:'OD'}]
]){
  const data=generateMahabatNative(code,parameters),before=JSON.stringify(data);
  const guides=boxDimensionGuides(data),inside=boxDimensionGuides(data,0,'inside');
  assert.deepEqual(guides.map(guide=>guide.axis),['L','W','H']);
  for(const [index,guide] of guides.entries()){
    assert.equal(guide.value,parameters[guide.axis],'Labels must use live requested box dimensions, not compensated panel sizes');
    assert.equal(guide.mode,data.metadata.dimensionType.key);
    assert.ok(guide.from.every(Number.isFinite)&&guide.to.every(Number.isFinite));
    if(guide.vertical){
      assert.equal(inside[index].from[0],data.mahabaGeometry[0].width-guide.from[0]);
      assert.equal(inside[index].from[1],guide.from[1]);
    }else{
      assert.equal(inside[index].from[0],data.mahabaGeometry[0].width-guide.to[0]);
      assert.equal(inside[index].to[0],data.mahabaGeometry[0].width-guide.from[0]);
    }
  }
  const markup=dimensionGuidesSvg(guides,1.6);
  assert.match(markup,/data-box-dimensions="true"/);
  assert.doesNotMatch(markup,/NaN|Infinity|scale\(-1/,'Mirroring must keep labels readable');
  assert.equal((markup.match(/class="box-dimension"/g)||[]).length,3);
  assert.equal(JSON.stringify(data),before,'Annotations must never mutate frozen geometry or parameters');
  const part=data.mahabaGeometry[0],sheet={width:part.width,height:part.height,cuts:part.lines.filter(line=>line.type==='cut').map(line=>[line.a,line.b]),creases:part.lines.filter(line=>line.type==='crease').map(line=>[line.a,line.b])};
  assert.doesNotMatch(svgDrawing(sheet),/box-dimension/,'Production exports must stay annotation-free');
}

const initial=generateMahabatNative('EVC11001',{L:125,W:105,H:88});
const changed=generateMahabatNative('EVC11001',{L:160,W:100,H:110});
assert.notDeepEqual(boxDimensionGuides(initial).map(guide=>guide.to),boxDimensionGuides(changed).map(guide=>guide.to),'Guide endpoints must follow rebuilt geometry');
const body=initial.mahabaGeometry[0].panels.find(panel=>panel.id==='P1');
assert.equal(boxDimensionGuides(initial)[0].from[0],Math.min(...body.poly.map(point=>point[0])));
assert.equal(boxDimensionGuides(initial)[0].to[0],Math.max(...body.poly.map(point=>point[0])));
assert.deepEqual(boxDimensionGuides(null),[]);
assert.deepEqual(boxDimensionGuides({code:'unsupported'}),[]);
assert.deepEqual(boxDimensionGuides(initial,1),[],'Never annotate the wrong drawing');
assert.equal(dimensionGuidesSvg([]),'');
assert.equal(dimensionViewportScale({width:500,height:300},1000,300),1);
assert.equal(dimensionViewportScale({width:500,height:300},0,0),1);
const missing=structuredClone(initial);missing.mahabaGeometry[0].panels=[];
assert.deepEqual(boxDimensionGuides(missing),[],'Missing panel metadata must not invent measurement anchors');
const experience=Object.create(StudioExperience.prototype);
let overlay='',removals=0;
const svg={viewBox:{baseVal:{width:500,height:300}},getBoundingClientRect:()=>({width:800,height:450}),querySelector:()=>overlay?{remove(){overlay='';removals++;}}:null,insertAdjacentHTML(position,markup){assert.equal(position,'beforeend');overlay=markup;}};
experience.showDimensions=true;
experience.studio={data:initial,view:'2d',$:key=>key==='flat'?{querySelector:()=>svg}:{value:key==='side'?'outside':'0'}};
experience.drawDimensions();assert.match(overlay,/data-axis="L" data-value="125"/);
experience.studio.data=changed;experience.drawDimensions();
assert.match(overlay,/data-axis="L" data-value="160"/);
assert.doesNotMatch(overlay,/data-value="125"/,'Rebuilding the box must replace stale labels');
experience.showDimensions=false;experience.drawDimensions();assert.equal(overlay,'');
experience.showDimensions=true;experience.studio.view='3d';experience.drawDimensions();assert.equal(overlay,'');
experience.studio.view='split';experience.drawDimensions();assert.match(overlay,/data-value="110"/);
assert.equal(removals,2,'A redraw must replace, not duplicate, the overlay');
console.log(JSON.stringify({ok:true,dimensions:['L','W','H'],cases:5,mirroring:true,frozenGeometry:true,productionExportsUnchanged:true}));
