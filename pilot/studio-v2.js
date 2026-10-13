import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateMahabatNative} from '../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel,visibleBounds} from '../studio-src/native_runtime.js';
import {MahabatSharedStudio} from '../studio-src/mahabat-shared-studio.js?v=20261013-2';

globalThis.MAHABAT_STUDIO_ASSETS={'./assets/studio/nesting.html':'../studio-src/nesting.html?v=20261013-2'};
const first=(o,p)=>Object.entries(o||{}).find(([k,v])=>k.startsWith(p)&&v?.length)?.[1];
const host=document.getElementById('canvas3d'),slider=document.getElementById('fold'),status=document.getElementById('modelStatus');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#09151f',1);host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#09151f');
const camera=new THREE.PerspectiveCamera(32,1,.0001,1000);camera.position.set(.7,.5,.75);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;
const hemi=new THREE.HemisphereLight(0xffffff,0xb8c3ca,1.15),ambient=new THREE.AmbientLight(0xffffff,.22),key=new THREE.DirectionalLight(0xffffff,2.6),fill=new THREE.DirectionalLight(0xffffff,1.15);scene.add(hemi,ambient,key,fill);key.position.set(1.5,2,2.5);fill.position.set(-2,.7,1.2);key.castShadow=true;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x10232c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.visible=false;scene.add(floor);
let model=null,data=null,materials=[],textures=[],currentParams={L:125,W:105,H:88,DT:1,MAT:1,FD:2};
function disposeRenderAssets(){if(model){scene.remove(model.root);disposeNativeModel(model);model=null;}materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());materials=[];textures=[];}
function seededNoise(seed){let x=(seed|0)||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000;};}
function makePaperTexture(rgb,kind='outside'){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),img=ctx.createImageData(size,size),rnd=seededNoise(kind==='inside'?713:kind==='edge'?911:317),base=rgb.map(v=>Math.round(255*Math.max(0,Math.min(1,v))));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,fiber=(rnd()-.5)*10+(Math.sin((x*.19+y*.025))*1.6)+(Math.sin((y*.41))*1.1),speck=rnd()<.012?-(8+rnd()*16):0;img.data[i]=Math.max(0,Math.min(255,base[0]+fiber+speck));img.data[i+1]=Math.max(0,Math.min(255,base[1]+fiber*.92+speck));img.data[i+2]=Math.max(0,Math.min(255,base[2]+fiber*.78+speck));img.data[i+3]=255;}
 ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.channel=3;t.needsUpdate=true;textures.push(t);return t;
}
function makePaperBump(kind='outside'){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),img=ctx.createImageData(size,size),rnd=seededNoise(kind==='inside'?1229:kind==='edge'?1459:1013);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=Math.max(0,Math.min(255,128+(rnd()-.5)*34+Math.sin(x*.34+y*.055)*6+Math.sin(y*.77)*3));img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}
 ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.channel=3;t.needsUpdate=true;textures.push(t);return t;
}
async function buildMaterials(nativeData){const entries=[];for(const id of Object.keys(nativeData.materials)){const v=nativeData.materials[id].values||{},a=first(v,'albedo')||[1,1,1,1],orm=first(v,'orm')||[1,.72,0,1],isFace=id==='outside'||id==='inside',isEdge=id==='edge'||id==='flute';const settings={color:new THREE.Color(0xffffff),roughness:isEdge?.94:orm[1],metalness:0,side:THREE.DoubleSide,clearcoat:0,clearcoatRoughness:.9};if(isFace){const map=makePaperTexture(a.slice(0,3),id),bump=makePaperBump(id);settings.map=map;settings.bumpMap=bump;settings.bumpScale=.000035;settings.roughness=Math.max(.78,orm[1]);}else{settings.color=new THREE.Color().setRGB(a[0],a[1],a[2],THREE.SRGBColorSpace);settings.roughness=.94;}entries.push([id,new THREE.MeshPhysicalMaterial(settings)]);}return Object.fromEntries(entries);}
function fit(){if(!model)return;const b=visibleBounds(model);if(b.isEmpty()){status.textContent='تعذر حساب حدود المجسم.';return;}const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),r=Math.max(s.x,s.y,s.z,.08);controls.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(1.15,.82,1.25).normalize().multiplyScalar(r*2.6));camera.near=Math.max(.0001,r/1000);camera.far=Math.max(20,r*50);camera.updateProjectionMatrix();controls.update();floor.position.y=b.min.y-.002;}
const viewer={host,renderer,scene,camera,controls,floor,slider,status,catalog:[{code:'EVC11001'}],currentCode:'EVC11001',model:null,
 async load(code,_variant='',parameters=null){try{status.textContent='جارٍ بناء القالب…';currentParams=parameters?{...currentParams,...parameters}:{L:125,W:105,H:88,DT:1,MAT:1,FD:2};data=generateMahabatNative(code,currentParams);disposeRenderAssets();const mats=await buildMaterials(data);materials=Object.values(mats);model=buildNativeModel(data,mats,{gpu:false});viewer.model=model;viewer.currentCode=code;scene.add(model.root);slider.value='0';setNativeTime(model,0);fit();await studio.bind(data,model);status.textContent=`${code} · ${data.materialInfo.name} · ${model.meshes.length} panels · Mahabat Engine`;return true;}catch(e){status.textContent='خطأ: '+(e.userMessage||e.message);console.error(e);return false;}},
 seek(v,refit=false){if(!model||!data)return;setNativeTime(model,data.duration*Math.max(0,Math.min(1,v)));slider.value=Math.round(v*1000);if(refit)fit();},
 placeLights(force=false){const mode=studio?.$('sceneMode')?.value||'free',preset=studio?.$('lightPreset')?.value||'soft',a=THREE.MathUtils.degToRad(+(studio?.$('lightAngle')?.value||0));floor.visible=mode==='studio';key.intensity=preset==='contrast'?4:preset==='even'?2.2:2.6;fill.intensity=preset==='contrast'?.7:preset==='even'?1.8:1.15;key.position.set(Math.cos(a)*2,2,Math.sin(a)*2+1.5);if(force)fit();}};
const studio=new MahabatSharedStudio(viewer);viewer.studio=studio;
slider.oninput=()=>viewer.seek(+slider.value/1000,false);slider.onchange=fit;document.getElementById('foldFlat').onclick=()=>viewer.seek(0,true);document.getElementById('foldClosed').onclick=()=>viewer.seek(1,true);document.getElementById('back').onclick=()=>location.href='../';
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
(function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera)})();
viewer.load('EVC11001');