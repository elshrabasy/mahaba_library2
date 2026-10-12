import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateMahabat,generateMahabatNative} from '../engine/registry.js';
import {buildNativeModel,setNativeTime,disposeNativeModel,visibleBounds} from '../studio-src/native_runtime.js';
import {buildNestTemplate,buildNestConfig,regularPreview} from '../studio-src/nesting-bridge.js';

const $=id=>document.getElementById(id);
const host=$('view3d'),status=$('status'),fold=$('fold'),facts=$('facts');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=null;
const camera=new THREE.PerspectiveCamera(34,1,.001,50);camera.position.set(.65,.45,.7);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x344451,2.1));
const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(1.5,2,2.5);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xddeeff,1.1);fill.position.set(-2,.6,1);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.ShadowMaterial({opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;scene.add(floor);

let model=null,nativeData=null,engineResult=null,playing=false,playStart=0,currentTexture=null,currentCode='EVC11001';
const materialSet={
 outside:new THREE.MeshStandardMaterial({color:0xb89262,roughness:.7,metalness:0,side:THREE.DoubleSide}),
 inside:new THREE.MeshStandardMaterial({color:0xcdb78f,roughness:.86,metalness:0,side:THREE.DoubleSide}),
 edge:new THREE.MeshStandardMaterial({color:0x7a5736,roughness:.92,metalness:0,side:THREE.DoubleSide})
};

function inputs(){return {L:+$('L').value,W:+$('W').value,H:+$('H').value,DT:+$('DT').value,MAT:+$('MAT').value,FD:+$('FD').value};}
function setStatus(text,error=false){status.textContent=text;status.style.color=error?'#ff9a9a':'#9bc9ad';}
function applyArtworkTexture(){
 const m=materialSet.outside;m.map=currentTexture;m.color.set(currentTexture?0xffffff:0xb89262);
 const finish=$('surfaceFinish')?.value||'matte';m.roughness=finish==='gloss'?.18:finish==='satin'?.42:.72;
 if(currentTexture){
  const scale=Math.max(.01,+$('artScale').value/100),x=+$('artX').value/200,y=+$('artY').value/200,rot=THREE.MathUtils.degToRad(+$('artRot').value);
  currentTexture.center.set(.5,.5);currentTexture.repeat.set(1/scale,1/scale);currentTexture.offset.set(x,y);currentTexture.rotation=rot;currentTexture.needsUpdate=true;
 }
 m.needsUpdate=true;
}
function disposeModel(){if(!model)return;scene.remove(model.root);disposeNativeModel(model);model=null;}
function fit(){if(!model)return;const box=visibleBounds(model);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,.08);controls.target.copy(center);camera.near=Math.max(.0001,radius/1000);camera.far=Math.max(20,radius*50);camera.position.copy(center).add(new THREE.Vector3(1.15,.82,1.25).normalize().multiplyScalar(radius*2.35));camera.updateProjectionMatrix();controls.update();floor.position.y=box.min.y-.002;}
function applyTime(progress){if(!model)return;const t=nativeData.duration*Math.max(0,Math.min(1,progress));setNativeTime(model,t);fold.value=Math.round(progress*1000);}

function draw2D(result){
 const svg=$('dieline'),ns='http://www.w3.org/2000/svg',pad=12;svg.replaceChildren();svg.setAttribute('viewBox',`${-pad} ${-pad} ${result.width+pad*2} ${result.height+pad*2}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const bg=document.createElementNS(ns,'rect');bg.setAttribute('x',0);bg.setAttribute('y',0);bg.setAttribute('width',result.width);bg.setAttribute('height',result.height);bg.setAttribute('fill','#fff');svg.append(bg);
 for(const line of result.lines){const p=document.createElementNS(ns,'path'),[a,b]=[line.a,line.b];let d=`M ${a[0]} ${a[1]} `;
  if(line.arc){const r=line.arc.r,sweep=line.arc.sweep??0;d+=`A ${r} ${r} 0 0 ${sweep} ${b[0]} ${b[1]}`;}else d+=`L ${b[0]} ${b[1]}`;
  p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',line.type==='crease'?'#159447':'#e03434');p.setAttribute('stroke-width',line.type==='crease'?'.65':'.8');p.setAttribute('vector-effect','non-scaling-stroke');if(line.type==='crease')p.setAttribute('stroke-dasharray','3 1.2');svg.append(p);
 }
}

function report(){
 if(!engineResult)return;const cuts=engineResult.lines.filter(x=>x.type==='cut').length,creases=engineResult.lines.filter(x=>x.type==='crease').length;
 facts.innerHTML=`<b>${engineResult.code}</b><br>Blank: ${engineResult.width.toFixed(1)} × ${engineResult.height.toFixed(1)} mm<br>Material: ${engineResult.material.name} · ${engineResult.material.thickness} mm<br>Panels: ${engineResult.panels.length} · Cuts: ${cuts} · Creases: ${creases}<br>Validation: ${engineResult.validation.status}<br><span style="color:#6fae8a">Source: Mahabat Engine</span>`;
}

function rebuild(){
 try{
  playing=false;$('play').textContent='▶ تشغيل';const p=inputs();engineResult=generateMahabat(currentCode,p);nativeData=generateMahabatNative(currentCode,p);disposeModel();applyArtworkTexture();model=buildNativeModel(nativeData,materialSet,{gpu:false});scene.add(model.root);applyTime(+fold.value/1000);draw2D(engineResult);report();fit();updateNestInputPreview();setStatus(`تم بناء ${engineResult.code} من Mahabat Engine · ${engineResult.material.name}`);
 }catch(err){setStatus(err.userMessage||err.message||String(err),true);console.error(err);}
}

function openStudio(code){currentCode=code;$('activeCode').textContent=code;$('libraryScreen').classList.add('hidden');$('studioScreen').classList.remove('hidden');requestAnimationFrame(()=>{resize();rebuild();});}
function backToLibrary(){$('studioScreen').classList.add('hidden');$('libraryScreen').classList.remove('hidden');playing=false;}

document.querySelectorAll('.open-studio').forEach(b=>b.onclick=()=>openStudio(b.dataset.code));
$('backLibrary').onclick=backToLibrary;
$('librarySearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('.template-card').forEach(card=>card.style.display=card.dataset.search.includes(q)?'block':'none');};

document.querySelectorAll('.accordion-title').forEach(btn=>btn.onclick=()=>btn.closest('.accordion').classList.toggle('open'));
$('apply').onclick=rebuild;$('flat').onclick=()=>applyTime(0);$('closed').onclick=()=>applyTime(1);fold.oninput=()=>{playing=false;$('play').textContent='▶ تشغيل';applyTime(+fold.value/1000);};
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'⏸ إيقاف':'▶ تشغيل';playStart=performance.now()-(+fold.value/1000)*5200;};
$('artwork').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file);new THREE.TextureLoader().load(url,tex=>{if(currentTexture)currentTexture.dispose();currentTexture=tex;tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.flipY=false;applyArtworkTexture();URL.revokeObjectURL(url);setStatus('تم تطبيق Artwork على السطح الخارجي للمجسم.');},undefined,err=>{URL.revokeObjectURL(url);setStatus('تعذر قراءة ملف التصميم.',true);console.error(err);});};
$('clearArtwork').onclick=()=>{currentTexture?.dispose();currentTexture=null;applyArtworkTexture();$('artwork').value='';setStatus('تمت إزالة Artwork.');};
for(const id of['artScale','artX','artY','artRot'])$(id).oninput=()=>{if(id==='artScale')$('artScaleVal').textContent=$('artScale').value+'%';if(id==='artRot')$('artRotVal').textContent=$('artRot').value+'°';applyArtworkTexture();};
$('surfaceFinish').onchange=applyArtworkTexture;

$('exportSvg').onclick=()=>{
 if(!engineResult)return;const serializer=new XMLSerializer(),svg=$('dieline').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',engineResult.width+'mm');svg.setAttribute('height',engineResult.height+'mm');svg.setAttribute('viewBox',`0 0 ${engineResult.width} ${engineResult.height}`);const blob=new Blob([serializer.serializeToString(svg)],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${currentCode}-${engineResult.width.toFixed(1)}x${engineResult.height.toFixed(1)}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);setStatus('تم تنزيل SVG من نفس هندسة محرك مهابة بمقياس 1:1.');
};

function nestSettings(){return {sheetWidth:+$('nestW').value,sheetHeight:+$('nestH').value,gripper:+$('nestGrip').value,gap:+$('nestGap').value,rotation:$('nestRotation').value};}
function nestEngine(){return globalThis.NestEngine||null;}
function updateNestInputPreview(){
 if(!engineResult)return;
 try{
  const T=buildNestTemplate(engineResult),c=buildNestConfig(nestSettings());
  $('nestFacts').innerHTML=`<b>${T.code}</b><br>Outline points: ${T.polygon.length}<br>Cut segments: ${T.cuts.length}<br>Creases: ${T.creases.length}<br>Sheet: ${c.sheetWidth} × ${c.sheetHeight} mm<br>Effective: ${c.W.toFixed(1)} × ${c.H.toFixed(1)} mm<br>Gap: ${c.clearance.toFixed(1)} mm<br>Angles: ${c.angles.join('°, ')}°`;
  drawNestSheet(T,c,[]);
 }catch(err){$('nestFacts').textContent=err.message;}
}
function drawNestSheet(T,c,layout){
 const svg=$('nestSvg'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${c.sheetWidth} ${c.sheetHeight}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const sheet=document.createElementNS(ns,'rect');sheet.setAttribute('x',0);sheet.setAttribute('y',0);sheet.setAttribute('width',c.sheetWidth);sheet.setAttribute('height',c.sheetHeight);sheet.setAttribute('fill','#fff');sheet.setAttribute('stroke','#8da2ae');sheet.setAttribute('stroke-width','1');svg.append(sheet);
 const grip=document.createElementNS(ns,'rect');grip.setAttribute('x',0);grip.setAttribute('y',0);grip.setAttribute('width',c.sheetWidth);grip.setAttribute('height',c.offsetY);grip.setAttribute('fill','#f6ede0');svg.append(grip);
 const work=document.createElementNS(ns,'rect');work.setAttribute('x',c.offsetX);work.setAttribute('y',c.offsetY);work.setAttribute('width',c.W);work.setAttribute('height',c.H);work.setAttribute('fill','none');work.setAttribute('stroke','#2f8794');work.setAttribute('stroke-dasharray','6 4');work.setAttribute('stroke-width','1');svg.append(work);
 if(!layout.length){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',T.polygon.map(q=>`${q[0]+c.offsetX},${q[1]+c.offsetY}`).join(' '));p.setAttribute('fill','#d9e8ea');p.setAttribute('stroke','#173d4f');p.setAttribute('stroke-width','1');svg.append(p);return;}
 const vs=nestEngine().makeVariants(T);
 for(const item of layout){const v=vs[item.r/90],p=document.createElementNS(ns,'polygon');p.setAttribute('points',v.p.map(q=>`${q[0]+item.x+c.offsetX},${q[1]+item.y+c.offsetY}`).join(' '));p.setAttribute('fill','#d9e8ea');p.setAttribute('stroke','#173d4f');p.setAttribute('stroke-width','1');svg.append(p);}
}
function runNest(){
 if(!engineResult)return;
 const engine=nestEngine();
 if(!engine){$('nestEngineBadge').textContent='NestEngine المحلي غير موجود';$('nestResult').innerHTML='تم تجهيز الربط والهندسة الحقيقية، لكن ملف <code>studio-src/nest-engine.js</code> الكامل لم يُنسخ بعد إلى المستودع الجديد. لن يتم تشغيل بديل تقريبي.';setStatus('واجهة المونتاج جاهزة، وباقي نسخ NestEngine الأصلي محليًا.',true);return;}
 try{
  const {template,config,result}=regularPreview(engine,engineResult,nestSettings()),best=result.results?.[0];
  if(!best){$('nestResult').textContent='لا يوجد تكرار منتظم صالح بهذه الإعدادات.';drawNestSheet(template,config,[]);return;}
  drawNestSheet(template,config,best.layout);const used=best.layout.length,util=(used*result.area/(config.sheetWidth*config.sheetHeight)*100).toFixed(1);
  $('nestResult').innerHTML=`<b>${used} قطعة / شيت</b><br>${best.name}<br>استغلال مساحة القوالب: ${util}%<br>المساحة المستخدمة: ${best.w.toFixed(1)} × ${best.h.toFixed(1)} mm`;
  $('nestEngineBadge').textContent='NestEngine الأصلي · Regular pass';setStatus(`تم تشغيل NestEngine على Outline الحقيقي: ${used} قطعة/شيت.`);
 }catch(err){$('nestResult').textContent=err.message;setStatus(err.message,true);}
}
$('nestingGate').onclick=()=>{switchView('nest');updateNestInputPreview();};
$('runNest').onclick=runNest;
for(const id of['nestW','nestH','nestGrip','nestGap','nestRotation'])$(id).onchange=updateNestInputPreview;

function switchView(name){document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('view'+name).classList.add('active');resize();}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{switchView(button.dataset.view);if(button.dataset.view==='nest')updateNestInputPreview();};
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);
function frame(now){requestAnimationFrame(frame);if(playing){let p=((now-playStart)/5200);if(p>=1){p=1;playing=false;$('play').textContent='▶ تشغيل';}applyTime(p);}controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);
