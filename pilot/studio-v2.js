import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateMahabatNative} from '../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel,visibleBounds} from '../studio-src/native_runtime.js';
import {MahabatSharedStudio} from '../studio-src/mahabat-shared-studio.js';

const host=document.getElementById('view3d'),slider=document.getElementById('fold'),status=document.getElementById('modelStatus');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ecef');
const camera=new THREE.PerspectiveCamera(34,1,.001,50);camera.position.set(.7,.5,.75);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshStandardMaterial({color:'#10232c',roughness:.95,metalness:0}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.visible=false;scene.add(floor);
const hemi=new THREE.HemisphereLight(0xffffff,0x425461,1.8),key=new THREE.DirectionalLight(0xffffff,3),fill=new THREE.DirectionalLight(0xddeeff,1.1);scene.add(hemi,key,fill);key.position.set(1.5,2,2.5);fill.position.set(-2,.7,1.2);key.castShadow=true;

function paperTexture(base='#b9915d',fiber='#d3b27e'){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,512,512);for(let i=0;i<9000;i++){const a=Math.random()*.08+.015;x.fillStyle=`rgba(255,255,255,${a})`;x.fillRect(Math.random()*512,Math.random()*512,Math.random()*3+.4,Math.random()*1.2+.2)}x.strokeStyle=fiber;x.globalAlpha=.12;for(let y=0;y<512;y+=14){x.beginPath();x.moveTo(0,y+Math.random()*3);x.lineTo(512,y+Math.random()*3);x.stroke()}x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const kraft=paperTexture(),insideTex=paperTexture('#c9ae82','#e2c79a');
const materialSet={
 outside:new THREE.MeshPhysicalMaterial({color:0xffffff,map:kraft,roughness:.72,metalness:0,clearcoat:.03,side:THREE.DoubleSide}),
 inside:new THREE.MeshPhysicalMaterial({color:0xffffff,map:insideTex,roughness:.86,metalness:0,side:THREE.DoubleSide}),
 edge:new THREE.MeshStandardMaterial({color:0x76502f,roughness:.95,metalness:0,side:THREE.DoubleSide})
};
let model=null,data=null,currentParams={L:125,W:105,H:88,DT:1,MAT:1,FD:2};
function fit(){if(!model)return;const b=visibleBounds(model);if(b.isEmpty())return;const center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),r=Math.max(size.x,size.y,size.z,.08);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(1.15,.82,1.25).normalize().multiplyScalar(r*2.45));camera.near=Math.max(.0001,r/1000);camera.far=Math.max(20,r*50);camera.updateProjectionMatrix();controls.update();floor.position.y=b.min.y-.002;}
function dispose(){if(model){scene.remove(model.root);disposeNativeModel(model);model=null;}}
const viewer={
 host,renderer,scene,camera,controls,floor,slider,status,catalog:[{code:'EVC11001'}],currentCode:'EVC11001',
 async load(code,_variant='',parameters=null){try{currentParams=parameters?{...currentParams,...parameters}:{L:125,W:105,H:88,DT:1,MAT:1,FD:2};data=generateMahabatNative(code,currentParams);dispose();model=buildNativeModel(data,materialSet,{gpu:false});scene.add(model.root);viewer.model=model;viewer.currentCode=code;slider.value='1000';setNativeTime(model,data.duration);fit();await studio.bind(data,model);status.textContent=`${code} · ${data.materialInfo.name} · Mahabat Engine`;return true}catch(e){status.textContent=e.userMessage||e.message;return false}},
 seek(v){if(!model||!data)return;setNativeTime(model,data.duration*Math.max(0,Math.min(1,v)));slider.value=Math.round(v*1000)},
 placeLights(force=false){const mode=studio?.$('sceneMode')?.value||'free',preset=studio?.$('lightPreset')?.value||'soft',a=THREE.MathUtils.degToRad(+(studio?.$('lightAngle')?.value||0));floor.visible=mode==='studio';key.intensity=preset==='contrast'?4:preset==='even'?2.2:3;fill.intensity=preset==='contrast'?.55:preset==='even'?1.8:1.1;key.position.set(Math.cos(a)*2,2,Math.sin(a)*2+1.5);if(force)fit()}
};
const studio=new MahabatSharedStudio(viewer);viewer.studio=studio;
slider.oninput=()=>viewer.seek(+slider.value/1000);document.getElementById('foldFlat').onclick=()=>viewer.seek(0);document.getElementById('foldClosed').onclick=()=>viewer.seek(1);document.getElementById('back').onclick=()=>location.href='./';
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);
(function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera)})();
viewer.load('EVC11001');
