import * as THREE from 'three';
import {generateMahabatNative} from '../../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel} from '../../studio-src/native_runtime.js';
import {MahabatSharedStudio} from '../../studio-src/mahabat-shared-studio.js?v=registration-1';
import {newLayer} from '../../studio-src/studio-core.js';

const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(1400,900);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
document.getElementById('renderer').append(renderer.domElement);
const data=generateMahabatNative('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const drawing=data.drawings[0],width=drawing.objRectWidth,height=drawing.objRectHeight;
const canvas=(canvasWidth,canvasHeight)=>{const result=document.createElement('canvas');result.width=canvasWidth;result.height=canvasHeight;return result;};
const artwork=canvas(1200,Math.round(1200*height/width)),artContext=artwork.getContext('2d');
artContext.fillStyle='#dfecf1';artContext.fillRect(0,0,artwork.width,artwork.height);
artContext.fillStyle='#267b8d';artContext.fillRect(0,0,artwork.width/2,artwork.height*.38);
artContext.fillStyle='#bc6458';artContext.fillRect(artwork.width/2,artwork.height*.62,artwork.width/2,artwork.height*.38);
const mask=canvas(200,100),maskContext=mask.getContext('2d');maskContext.fillStyle='#000';maskContext.fillRect(0,0,200,100);maskContext.fillStyle='#fff';maskContext.fillRect(15,10,35,75);maskContext.fillRect(15,55,150,30);maskContext.fillRect(130,10,40,25);
const studio=Object.create(MahabatSharedStudio.prototype);studio.data=data;studio.v={renderer};studio.image=async key=>!key?null:key==='art'?artwork:mask;
const scene=new THREE.Scene();scene.background=new THREE.Color('#172b30');
const results=[];
const cases=[
  {label:'الخارج · الفويل مع إزاحة وتحجيم',side:'outside',kind:'foil',scale:25.5,x:120,y:20,angle:0},
  {label:'الداخل · فويل بدوران 37°',side:'inside',kind:'foil',scale:35,x:65,y:25,angle:37},
  {label:'الخارج · التصميم مع إزاحة ودوران',side:'outside',kind:'image',scale:82,x:18,y:-12,angle:-17},
  {label:'الداخل · قناع UV بدوران 90°',side:'inside',kind:'uv',scale:30,x:-95,y:25,angle:90}
];
try{
  for(const spec of cases){
    const layer={...newLayer(),image:'art'};
    if(spec.kind==='image')Object.assign(layer,{scale:spec.scale,x:spec.x,y:spec.y,angle:spec.angle});
    else{layer[spec.kind]='mask';layer.effectTransforms={[spec.kind]:{scale:spec.scale,x:spec.x,y:spec.y,angle:spec.angle}};}
    const baked=await studio.bake(layer,drawing);
    const materials=Object.fromEntries(Object.keys(data.materials).map(key=>[key,new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.FrontSide,toneMapped:false})]));
    for(const side of ['outside','inside']){
      const material=materials[side];studio.installFinish(material);
      const uniforms=material.userData.studioUniforms,enabled=side===spec.side;
      uniforms.art.value=baked.map;uniforms.artEnabled.value=enabled&&spec.kind!=='uv'?1:0;
      uniforms.foil.value=baked.foil||null;uniforms.foilEnabled.value=enabled&&spec.kind==='foil'?1:0;
      uniforms.uv.value=baked.uv||null;uniforms.uvEnabled.value=enabled&&spec.kind==='uv'?1:0;uniforms.size.value.set(width,height);
      if(spec.kind==='uv'){
        const compile=material.onBeforeCompile;
        material.onBeforeCompile=shader=>{compile(shader);shader.fragmentShader=shader.fragmentShader.replace('vec2 paperMM=','diffuseColor.rgb=vec3(studioU);\nvec2 paperMM=');};
      }
    }
    const model=buildNativeModel(data,materials);setNativeTime(model,0);scene.add(model.root);
    const center=new THREE.Vector3(width/2000,0,-height/2000),camera=new THREE.OrthographicCamera(-width/1800,width/1800,height/1800,-height/1800,.001,10);
    camera.position.copy(center).add(new THREE.Vector3(0,spec.side==='inside'?-2:2,0));camera.up.set(0,0,1);camera.lookAt(center);camera.updateMatrixWorld();
    const target=new THREE.WebGLRenderTarget(1400,900);renderer.setRenderTarget(target);renderer.render(scene,camera);
    const pixels=new Uint8Array(1400*900*4);renderer.readRenderTargetPixels(target,0,0,1400,900,pixels);
    const expected=spec.kind==='uv'?baked.uv.image:baked.canvas,expectedContext=expected.getContext('2d'),expectedPixels=expectedContext.getImageData(0,0,expected.width,expected.height).data;
    let checked=0,mismatches=0,activeMaskSamples=0;
    const failures=[];
    for(const panel of data.mahabaGeometry[0].panels.filter(panel=>/^P[1-4]$/.test(panel.id))){
      const left=Math.min(...panel.poly.map(point=>point[0])),right=Math.max(...panel.poly.map(point=>point[0])),top=Math.min(...panel.poly.map(point=>point[1])),bottom=Math.max(...panel.poly.map(point=>point[1]));
      for(let row=1;row<12;row++)for(let column=1;column<12;column++){
        const sheetX=left+(right-left)*column/12,sheetY=top+(bottom-top)*row/12;
        const imageX=spec.side==='inside'?width-sheetX:sheetX,imageY=sheetY;
        const sourceIndex=(Math.floor(imageY/height*expected.height)*expected.width+Math.floor(imageX/width*expected.width))*4;
        const sourceColor=Array.from(expectedPixels.slice(sourceIndex,sourceIndex+3));
        const neighbors=[-2,2].flatMap(rowOffset=>[-2,2].map(columnOffset=>sourceIndex+(rowOffset*expected.width+columnOffset)*4));
        if(neighbors.some(index=>sourceColor.some((value,channel)=>Math.abs(value-expectedPixels[index+channel])>2)))continue;
        const color=spec.kind==='uv'?sourceColor:sourceColor.map(value=>{const normalized=value/255;return Math.round(255*(normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4));});
        if(spec.kind==='uv'&&color[0]>2&&color[0]<253)continue;
        if(spec.kind!=='image'){
          const maskCanvas=baked[spec.kind].image,maskPixels=maskCanvas.getContext('2d').getImageData(Math.floor(imageX/width*maskCanvas.width),Math.floor(imageY/height*maskCanvas.height),1,1).data;
          if(maskPixels[0]>253)activeMaskSamples++;
        }
        const point=new THREE.Vector3(sheetX,sheetY,(spec.side==='inside'?-1:1)*data.materialInfo.thickness/2).applyMatrix4(model.root.matrixWorld).project(camera);
        const screenX=Math.floor((point.x+1)*700),screenY=Math.floor((point.y+1)*450),renderIndex=(screenY*1400+screenX)*4;
        const actual=Array.from(pixels.slice(renderIndex,renderIndex+3));
        const error=Math.max(...color.map((value,index)=>Math.abs(value-actual[index])));checked++;
        if(error>12){mismatches++;if(failures.length<3)failures.push({panel:panel.id,sheet:[sheetX,sheetY],expected:color,actual});}
      }
    }
    const result={case:spec.label,checked,mismatches,activeMaskSamples,pass:mismatches===0&&(spec.kind==='image'||activeMaskSamples>2),failures};results.push(result);
    renderer.setRenderTarget(null);renderer.render(scene,camera);
    const section=document.createElement('section');section.dataset.pass=String(result.pass);section.innerHTML=`<h2>${result.pass?'✓':'✕'} ${spec.label}</h2><p>${checked} نقطة تحقق · ${mismatches} اختلاف في الموضع</p><figure><img src="${expected.toDataURL()}"><figcaption>خريطة الرسم المسطح</figcaption></figure><figure><img src="${renderer.domElement.toDataURL()}"><figcaption>العرض ثلاثي الأبعاد من نفس محرك المشروع</figcaption></figure><pre>${JSON.stringify(result,null,2)}</pre>`;document.getElementById('results').append(section);
    scene.remove(model.root);disposeNativeModel(model);Object.values(materials).forEach(material=>material.dispose());Object.values(baked).forEach(value=>value?.isTexture&&value.dispose());target.dispose();
  }
  const success=results.every(result=>result.pass);document.body.dataset.result=success?'pass':'fail';document.getElementById('status').textContent=success?'نجح فحص تطابق المواضع في جميع الحالات':'تم رصد اختلاف في خريطة الطباعة';
}catch(error){document.body.dataset.result='error';document.getElementById('status').textContent=error.stack||error.message;throw error;}
