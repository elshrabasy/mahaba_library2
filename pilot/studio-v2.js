import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateMahabatNative} from '../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel,visibleBounds} from '../studio-src/native_runtime.js';
import {MahabatSharedStudio} from '../studio-src/mahabat-shared-studio.js';

// Preserve the first Mahaba Library Studio paths. The only replacement is the geometry provider.
globalThis.MAHABAT_STUDIO_ASSETS={
 './assets/studio/gallery-theme.css':'../assets/studio/gallery-theme.css',
 './assets/studio/nesting.html':'../assets/studio/nesting.html'
};

const first=(object,prefix)=>Object.entries(object||{}).find(([k,v])=>k.startsWith(prefix)&&v?.length)?.[1];
const host=document.getElementById('canvas3d'),slider=document.getElementById('fold'),status=document.getElementById('modelStatus');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#09151f');
const camera=new THREE.PerspectiveCamera(32,1,.0001,1000);camera.position.set(.7,.5,.75);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.target.set(0,0,0);
const hemi=new THREE.HemisphereLight(0xffffff,0xffffff,.6),ambient=new THREE.AmbientLight(0xffffff,0),key=new THREE.DirectionalLight(0xffffff,2.1),fill=new THREE.DirectionalLight(0xffffff,.75),rim=new THREE.DirectionalLight(0xffffff,0);scene.add(hemi,ambient,key,fill,rim);key.position.set(1.5,2,2.5);fill.position.set(-2,.7,1.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;key.shadow.normalBias=.00003;hemi.groundColor.set('#e3e7ed');
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x10232c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.visible=false;scene.add(floor);

let environmentTarget=null;
function loadEnvironment(){
 const w=512,h=256,pixels=new Float32Array(w*h*4),panels=[[-1,.45,.32,.48,5.5],[1.6,.2,.26,.65,3.3],[.2,1.1,.8,.2,3.8],[-2.8,-.1,.4,.7,1.4]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const longitude=x/w*Math.PI*2-Math.PI,latitude=(.5-y/h)*Math.PI;let intensity=.22;for(const [px,py,sx,sy,p] of panels){let dx=Math.abs(longitude-px);dx=Math.min(dx,Math.PI*2-dx);intensity+=p*Math.exp(-Math.pow(dx/sx,6)-Math.pow((latitude-py)/sy,6));}const i=(y*w+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=intensity;pixels[i+3]=1;}
 const texture=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat,THREE.FloatType);texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;const generator=new THREE.PMREMGenerator(renderer);try{environmentTarget=generator.fromEquirectangular(texture);scene.environment=environmentTarget.texture;scene.environmentIntensity=.8;}finally{texture.dispose();generator.dispose();}
}
loadEnvironment();

let model=null,data=null,materials=[],textures=[],materialEntries={},currentParams={L:125,W:105,H:88,DT:1,MAT:1,FD:2};
function disposeRenderAssets(){if(model){scene.remove(model.root);disposeNativeModel(model);model=null;}materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());materials=[];textures=[];materialEntries={};}
async function buildOriginalMaterials(nativeData){
 const loader=new THREE.TextureLoader(),cache=new Map(),loaded=[];
 const texture=(file,channel,color=false,height=false)=>{
  const keyName=[file,channel,color,height].join(':');if(!cache.has(keyName))cache.set(keyName,(async()=>{
   const fname=file.replace(/^\.\//,'');const sha=nativeData.textureFiles?.[fname];let t;if(sha)t=await loader.loadAsync('../native_textures/'+sha+'.png');else t=await loader.loadAsync(fname);
   if(height){const canvas=document.createElement('canvas');canvas.width=t.image.width;canvas.height=t.image.height;const ctx=canvas.getContext('2d');ctx.drawImage(t.image,0,0);const px=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<px.data.length;i+=4)px.data[i]=px.data[i+1]=px.data[i+2];ctx.putImageData(px,0,0);t.dispose();t=new THREE.CanvasTexture(canvas);}
   t.wrapS=t.wrapT=THREE.RepeatWrapping;t.channel=channel;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=THREE.SRGBColorSpace;loaded.push(t);return t;
  })());return cache.get(keyName);
 };
 const entries=await Promise.all(Object.keys(nativeData.materials).map(async id=>{
  const spec=nativeData.materials[id],values=spec.values||{},maps=spec.maps||{},albedo=first(values,'albedo')||[1,1,1,1],orm=first(values,'orm')||[1,.72,0,1],alpha=(albedo[3]??1)*(values.fMasterOpacity_Uni?.[0]??1),find=prefix=>Object.entries(maps).find(([k])=>k.startsWith(prefix))?.[1];
  let map=null,normalMap=null,ormMap=null,bumpMap=null;try{[map,normalMap,ormMap,bumpMap]=await Promise.all([find('matDiff')?texture(find('matDiff'),0,true):null,find('appBump')?texture(find('appBump'),1):null,find('matORM')?texture(find('matORM'),2):null,find('MChannel')?texture(find('MChannel'),3,false,true):null]);}catch(error){console.warn('Native material texture fallback',id,error);}
  const settings={color:new THREE.Color().setRGB(albedo[0],albedo[1],albedo[2],THREE.SRGBColorSpace),map,roughness:orm[1],metalness:orm[2],opacity:alpha,transparent:alpha<.999,normalMap,roughnessMap:ormMap,metalnessMap:ormMap,aoMap:ormMap,aoMapIntensity:orm[0],bumpMap,bumpScale:(values.HeightMapUnitScale0_Uni?.[0]||0)*nativeData.unitMeter,side:THREE.DoubleSide};
  if(normalMap)settings.normalScale=new THREE.Vector2(values.BumpIntensity1_Uni?.[0]??1,values.BumpIntensity1_Uni?.[0]??1);
  return [id,new THREE.MeshPhysicalMaterial({...settings,clearcoat:.1,clearcoatRoughness:.3})];
 }));
 textures=loaded;materials=entries.map(([,m])=>m);return Object.fromEntries(entries);
}

function fit(){if(!model)return;const b=visibleBounds(model);if(b.isEmpty())return;const center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),r=Math.max(size.x,size.y,size.z,.08);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(1.15,.82,1.25).normalize().multiplyScalar(r*2.45));camera.near=Math.max(.0001,r/1000);camera.far=Math.max(20,r*50);camera.updateProjectionMatrix();controls.update();floor.position.y=b.min.y-.002;}

const viewer={
 host,renderer,scene,camera,controls,floor,slider,status,catalog:[{code:'EVC11001'}],currentCode:'EVC11001',model:null,
 async load(code,_variant='',parameters=null){try{
   currentParams=parameters?{...currentParams,...parameters}:{L:125,W:105,H:88,DT:1,MAT:1,FD:2};const nextData=generateMahabatNative(code,currentParams);const nextMaterials=await buildOriginalMaterials(nextData);disposeRenderAssets();data=nextData;materialEntries=nextMaterials;materials=Object.values(nextMaterials);model=buildNativeModel(data,materialEntries,{gpu:false});viewer.model=model;viewer.currentCode=code;scene.add(model.root);slider.value='1000';setNativeTime(model,data.duration);fit();await studio.bind(data,model);status.textContent=`${code} · ${data.materialInfo.name} · Mahabat Engine`;return true;
  }catch(e){status.textContent=e.userMessage||e.message;console.error(e);return false;}},
 seek(v){if(!model||!data)return;setNativeTime(model,data.duration*Math.max(0,Math.min(1,v)));slider.value=Math.round(v*1000);},
 placeLights(force=false){const mode=studio?.$('sceneMode')?.value||'free',preset=studio?.$('lightPreset')?.value||'soft',a=THREE.MathUtils.degToRad(+(studio?.$('lightAngle')?.value||0));floor.visible=mode==='studio';key.intensity=preset==='contrast'?4:preset==='even'?2.2:2.1;fill.intensity=preset==='contrast'?.55:preset==='even'?1.8:.75;key.position.set(Math.cos(a)*2,2,Math.sin(a)*2+1.5);if(force)fit();}
};
const studio=new MahabatSharedStudio(viewer);viewer.studio=studio;
slider.oninput=()=>viewer.seek(+slider.value/1000);document.getElementById('foldFlat').onclick=()=>viewer.seek(0);document.getElementById('foldClosed').onclick=()=>viewer.seek(1);document.getElementById('back').onclick=()=>location.href='../';
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
(function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);})();
viewer.load('EVC11001');
