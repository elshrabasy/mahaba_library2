import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_TRANSFORM,validArtworkTransform,layerTransform,setLayerTransform,artworkFrame,drawPlacedImage,frameCorner,resizeArtwork,rotationDelta,tintMaskPixels,normalizeMaskPixels} from '../studio-src/artwork-placement.js';
import {ArtworkTransform,artworkFrameSvg} from '../studio-src/artwork-transform.js';
import {FORMAT,newLayer,validateProject,svgDrawing,pdfDrawing} from '../studio-src/studio-core.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const drawing={objRectWidth:500,objRectHeight:300},image={naturalWidth:1000,naturalHeight:400};
const transform={scale:80,x:12,y:-7,angle:30},frame=artworkFrame(image,drawing,transform);
assert.deepEqual(frame,{cx:262,cy:143,width:400,height:160,angle:30});
assert.deepEqual(artworkFrame({width:200,height:1000},drawing,DEFAULT_TRANSFORM),{cx:250,cy:150,width:60,height:300,angle:0});
for(const corner of [[-1,-1],[1,-1],[1,1],[-1,1]]){
  const before=frameCorner(frame,...corner),anchor=frameCorner(frame,-corner[0],-corner[1]);
  const next=resizeArtwork(transform,frame,corner,{x:(before.x-anchor.x)*.25,y:(before.y-anchor.y)*.25});
  near(next.scale,100);
  const resized=artworkFrame(image,drawing,next),fixed=frameCorner(resized,-corner[0],-corner[1]);
  near(fixed.x,anchor.x);near(fixed.y,anchor.y);near(resized.width/resized.height,frame.width/frame.height);
  assert.equal(next.angle,30);
}
assert.equal(resizeArtwork(transform,frame,[1,1],{x:1e8,y:1e8}).scale,500);
assert.equal(resizeArtwork(transform,frame,[1,1],{x:-1e8,y:-1e8}).scale,5);
for(let index=0;index<100;index++){
  const scaled={...transform,scale:5+index*4.95},scaledFrame=artworkFrame(image,drawing,scaled);
  assert.ok(validArtworkTransform(resizeArtwork(scaled,scaledFrame,[1,1],{x:1e8,y:1e8})),'Floating-point rounding must not exceed the 500% validation limit');
}
const polar=degrees=>({x:Math.cos(degrees*Math.PI/180),y:Math.sin(degrees*Math.PI/180)});
near(rotationDelta({cx:0,cy:0},polar(179),polar(-179)),2);
near(rotationDelta({cx:0,cy:0},polar(0),polar(90)),90);
for(const bad of [{...transform,scale:0},{...transform,scale:501},{...transform,x:Infinity},{...transform,y:2001},{...transform,angle:NaN},null])assert.equal(validArtworkTransform(bad),false);

const outside={...newLayer(),image:'data:image/png;base64,AA==',foil:'data:image/png;base64,AA==',uv:'data:image/png;base64,AA==',...transform},inside=newLayer();
assert.deepEqual(layerTransform(outside,'foil'),transform,'Legacy projects must retain their initial aligned mask positions');
setLayerTransform(outside,'image',{...transform,scale:60});
assert.deepEqual(layerTransform(outside,'foil'),transform,'Artwork edits must not move an existing foil mask');
assert.deepEqual(layerTransform(outside,'uv'),transform);
setLayerTransform(outside,'foil',{...transform,angle:-45,x:-80});
assert.equal(outside.scale,60);assert.equal(layerTransform(outside,'foil').angle,-45);assert.deepEqual(inside,newLayer());
const project={format:FORMAT,code:'EVC11001',layers:[['0:outside',outside],['0:inside',inside]]};
assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project,'Independent transforms survive project save/open');
const legacy={...project,layers:[['0:outside',newLayer()]]};assert.equal(validateProject(legacy),legacy);
for(const bad of [null,[],{foil:{...transform,scale:-1}},{foil:{...transform,angle:Infinity}},{image:transform},{foil:{...transform,x:2001}}]){
  assert.throws(()=>validateProject({...project,layers:[['0:outside',{...outside,effectTransforms:bad}]]}),/موضع التشطيب/);
}
const calls=[],context=Object.fromEntries(['save','scale','translate','rotate','drawImage','restore'].map(method=>[method,(...values)=>calls.push([method,...values])]));
drawPlacedImage(context,image,drawing,{width:1536,height:922},transform);
assert.deepEqual(calls[1],['scale',1536/500,922/300]);assert.deepEqual(calls[2],['translate',frame.cx,frame.cy]);near(calls[3][1],Math.PI/6);
assert.deepEqual(calls[4],['drawImage',image,-frame.width/2,-frame.height/2,frame.width,frame.height]);
const maskPixels=new Uint8ClampedArray([0,0,0,255,128,128,128,255,255,255,255,255]);tintMaskPixels(maskPixels,'#d7ad55');
assert.deepEqual([...maskPixels],[215,173,85,0,215,173,85,128,215,173,85,255],'Foil preview must use mask luminance as coverage, not make the entire sheet gold');
const inverted=new Uint8ClampedArray([0,0,0,0,255,255,255,255,0,0,0,255]);normalizeMaskPixels(inverted,false,true);
assert.deepEqual([...inverted],[0,0,0,255,0,0,0,255,255,255,255,255],'Rotated/resized white-background masks must not activate foil outside their image bounds');
const markup=artworkFrameSvg(frame,2,'foil','Foil');
assert.equal((markup.match(/data-artwork-handle="(?:nw|ne|se|sw)"/g)||[]).length,4);
assert.match(markup,/data-artwork-handle="rotate"/);assert.match(markup,/data-artwork-handle="move"/);
assert.doesNotMatch(markup,/clip-path|scale\(-1|NaN|Infinity/,'Inside artwork uses the same unmirrored sheet coordinate system as the baked texture');
const sheet={width:500,height:300,cuts:[[[0,0],[500,0]]],creases:[]};
assert.doesNotMatch(svgDrawing(sheet),/artwork-frame|artwork-handle/);assert.doesNotMatch(pdfDrawing(sheet),/artwork-frame/);

let scheduled=0,cancelled=0,fieldSyncs=0,capture=false;
const flat={dataset:{},focus(){},setPointerCapture(){capture=true;},hasPointerCapture:()=>capture,releasePointerCapture(){capture=false;},querySelector:()=>({getScreenCTM:()=>({inverse:()=>({a:.5,b:0,c:0,d:.5,e:0,f:0})})})};
const studio={serial:1,artworkKind:'foil',layers:new Map([['0:outside',outside]]),data:{drawings:[drawing]},workspace:{inert:false},view:'2d',layer:()=>outside,$:()=>({value:'0'}),syncFields(){fieldSyncs++;},cancelArtworkUpdate(){cancelled++;}};
const controller=Object.create(ArtworkTransform.prototype);Object.assign(controller,{studio,flat,frame,viewport:{panMode:true,space:false},sync(){},paint:{schedule(){scheduled++;},flush(){}}});
const event=(extra={})=>({button:0,pointerId:5,clientX:500,clientY:280,preventDefault(){},stopImmediatePropagation(){this.stopped=true;},target:{closest:selector=>selector==='[data-artwork-handle]'?{dataset:{artworkHandle:'move'}}:null},...extra});
const before=layerTransform(outside,'foil'),originalArtwork=layerTransform(outside);
controller.pointerdown(event());assert.ok(capture);assert.equal(cancelled,1);
controller.pointermove(event({clientX:540,clientY:300}));
near(layerTransform(outside,'foil').x,before.x+20);near(layerTransform(outside,'foil').y,before.y+10);
assert.deepEqual(layerTransform(outside),originalArtwork,'Moving foil must never alter the artwork');
controller.cancelDrag();assert.deepEqual(layerTransform(outside,'foil'),before);assert.equal(capture,false);
controller.pointerdown(event());studio.serial++;controller.pointermove(event({clientX:700}));assert.equal(controller.drag,null);assert.deepEqual(layerTransform(outside,'foil'),before);
studio.serial--;controller.viewport.space=true;controller.pointerdown(event());assert.equal(controller.drag,null,'Space-drag must be reserved for panning');
controller.viewport.space=false;controller.pointerdown(event({button:1}));assert.equal(controller.drag,null,'Middle-button panning must remain available');
assert.ok(scheduled>=2&&fieldSyncs>=2);
const nodes=new Map(),node=()=>({attributes:{},setAttribute(key,value){this.attributes[key]=value;}});
for(const selector of ['[data-artwork-handle="move"]','[data-artwork-handle="nw"]','[data-artwork-handle="ne"]','[data-artwork-handle="sw"]','[data-artwork-handle="se"]','[data-artwork-handle="rotate"]','line'])nodes.set(selector,node());
const overlay={...node(),dataset:{artworkFrame:'foil'},querySelector:selector=>nodes.get(selector)};
controller.drag={};controller.renderFrame({querySelector:()=>overlay,insertAdjacentHTML(){assert.fail('Keep the same handles and SVG nodes during a live drag');}},frame,1,'foil','Foil');controller.drag=null;
assert.equal(nodes.get('[data-artwork-handle="move"]').attributes.width,frame.width);
const adapter=fs.readFileSync(new URL('../studio-src/mahabat-shared-studio.js',import.meta.url),'utf8');
assert.match(adapter,/drawPlaced\('foil'\)/);assert.match(adapter,/drawPlaced\('uv'\)/);
console.log(JSON.stringify({ok:true,corners:4,aspectRatioPreserved:true,rotation:true,independentMasks:true,insideOutside:true,legacyProjects:true,previewOnly:true,staleGesturesProtected:true}));
