import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateMahabatNative} from '../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel,visibleBounds} from '../studio-src/native_runtime.js';

const host=document.getElementById('view');
const status=document.getElementById('status');
const slider=document.getElementById('fold');
const foldValue=document.getElementById('foldValue');
const ids=['W','H','D','top_depth','lower_depth','bottom_h','hole_d'];

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.setClearColor('#09151f',1);
host.append(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#09151f');
const camera=new THREE.PerspectiveCamera(32,1,.0001,1000);
camera.position.set(.8,.55,.9);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.075;
scene.add(new THREE.HemisphereLight(0xffffff,0x52636b,1.35));
const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(2,3,2);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,.9);fill.position.set(-2,1,1);scene.add(fill);

let model=null,data=null,materials=[];

function readParams(){
  return Object.fromEntries(ids.map(id=>[id,Number(document.getElementById(id).value)]));
}
function makeMaterials(nativeData){
  const result={};
  for(const id of Object.keys(nativeData.materials||{})){
    const mat=new THREE.MeshPhysicalMaterial({color:0xf7f3e8,roughness:.68,metalness:0,side:THREE.DoubleSide});
    mat.transparent=false;
    result[id]=mat;
    materials.push(mat);
  }
  return result;
}
function dispose(){
  if(model){scene.remove(model.root);disposeNativeModel(model);model=null;}
  materials.forEach(m=>m.dispose());materials=[];
}
function fit(){
  if(!model)return;
  const b=visibleBounds(model);if(b.isEmpty())return;
  const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),r=Math.max(s.x,s.y,s.z,.08);
  controls.target.copy(c);
  camera.position.copy(c).add(new THREE.Vector3(1.1,.8,1.2).normalize().multiplyScalar(r*2.7));
  camera.near=Math.max(.0001,r/1000);camera.far=Math.max(20,r*50);camera.updateProjectionMatrix();controls.update();
}
function showFold(v){
  if(!model||!data)return;
  const t=Math.max(0,Math.min(1,v));
  setNativeTime(model,data.duration*t);
  slider.value=Math.round(t*1000);
  foldValue.textContent=`${Math.round(t*100)}%`;
}
async function rebuild(){
  try{
    status.textContent='جارٍ بناء قالب ويكلي داخل Mahabat Engine…';
    const params=readParams();
    data=generateMahabatNative('WEEKLY',params);
    dispose();
    const mats=makeMaterials(data);
    model=buildNativeModel(data,mats,{gpu:false});
    scene.add(model.root);
    showFold(0);
    fit();
    const validation=data.engineeringModel?.validation?.status||data.validation?.status||'UNVALIDATED';
    status.textContent=`${data.code||'WEEKLY'} · ${model.meshes.length} panels · ${validation} · Prototype from PDF`;
  }catch(e){
    console.error(e);
    status.textContent='خطأ: '+(e.userMessage||e.message);
  }
}

document.getElementById('rebuild').onclick=rebuild;
document.getElementById('flat').onclick=()=>showFold(0);
document.getElementById('closed').onclick=()=>showFold(1);
slider.oninput=()=>showFold(Number(slider.value)/1000);

function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);
(function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera)})();
rebuild();
