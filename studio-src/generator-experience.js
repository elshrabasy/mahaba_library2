import * as THREE from 'three';

// Vector-style interaction layer for ONE frozen Mahabat template.
// Presentation only: it never calculates or mutates cut/crease geometry directly.
const PANEL_COLOR=0x50e3d4;
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
const boundsOf=poly=>{if(!Array.isArray(poly)||!poly.length)return null;const xs=poly.map(p=>Number(p[0])),ys=poly.map(p=>Number(p[1]));return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};};
const statusClass=s=>s==='PASS'?'pass':s==='FAIL'?'fail':'review';

export class GeneratorExperience{
  constructor(viewer,studio){
    this.v=viewer;this.s=studio;this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.highlight=null;this.guides=null;this.selectedMesh=null;this.selectedPanelId=null;this.live=true;this.timer=null;this.down=null;this.labels=[];this.install();this.annotationLoop();
  }
  install(){
    if(!document.getElementById('mahabaGeneratorExperienceStyle')){
      const style=document.createElement('style');style.id='mahabaGeneratorExperienceStyle';style.textContent=`
      .mgx-card{border:1px solid #2a4b55;background:linear-gradient(145deg,#102a34,#0d2029);border-radius:12px;padding:10px;margin:8px 0;box-shadow:inset 0 1px 0 #ffffff08}.mgx-kicker{font-size:8px;color:#7c9aa5;letter-spacing:.07em;text-transform:uppercase}.mgx-title{font-size:12px;font-weight:700;color:#eef7f8;margin:3px 0 9px}.mgx-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.mgx-segment button{border:1px solid #31515d!important;background:#112832!important;color:#8ba5ae!important;padding:7px 4px!important}.mgx-segment button.active{background:#16433f!important;border-color:#2ba99e!important;color:#83eee2!important;box-shadow:inset 0 0 0 1px #32c8ba55}.mgx-live{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:9px;font-size:9px;color:#93abb3}.mgx-live input{accent-color:#35c8ba}.mgx-status{margin-top:7px;font-size:8.5px;line-height:1.6;color:#718f99}.mgx-status strong{color:#66d4c7}.mgx-warning{padding:7px 8px;border-radius:8px;margin-top:6px;font-size:8.5px;line-height:1.55;border:1px solid #2d4852;background:#10262f}.mgx-warning.pass{border-color:#285b4b;color:#86deb8}.mgx-warning.review{border-color:#665628;color:#dfc270}.mgx-warning.fail{border-color:#6b3434;color:#ff9b9b}.mgx-panel-card{position:absolute;z-index:42;left:16px;bottom:16px;width:min(300px,calc(100% - 32px));padding:11px 12px;border:1px solid #31515d;border-radius:13px;background:#0b1e27ef;backdrop-filter:blur(14px);box-shadow:0 15px 40px #0007;color:#eaf4f5;pointer-events:auto}.mgx-panel-card[hidden]{display:none}.mgx-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.mgx-panel-head b{font-size:12px}.mgx-panel-head button{border:0!important;background:transparent!important;color:#72909b!important;padding:2px 5px!important;font-size:16px!important}.mgx-panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.mgx-panel-metric{padding:7px;border:1px solid #294650;border-radius:8px;background:#102831}.mgx-panel-metric small{display:block;color:#7896a1;font-size:8px;margin-bottom:3px}.mgx-panel-metric span{font-size:9px;font-weight:700;color:#eef7f8}.mgx-panel-note{font-size:8px;line-height:1.55;color:#75919b;margin-top:8px}.mgx-edit{margin-top:9px;padding-top:9px;border-top:1px dashed #2b4650}.mgx-edit-title{font-size:8px;color:#83a2ad;margin-bottom:6px}.mgx-edit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.mgx-edit-grid label{font-size:7.5px;color:#7796a0}.mgx-edit-grid input{width:100%;min-height:30px!important;margin-top:3px!important;padding:5px 6px!important;font-size:9px!important}.mgx-edit-actions{display:flex;justify-content:flex-end;gap:5px;margin-top:6px}.mgx-edit-actions button{font-size:8px!important;padding:6px 8px!important}.mgx-selected-flat{fill:#4be0d51f;stroke:#45d6ca!important;stroke-width:.8!important;vector-effect:non-scaling-stroke}.mgx-hover{cursor:pointer}.mgx-annotation-layer{position:absolute;inset:0;z-index:41;pointer-events:none;overflow:hidden}.mgx-dim-label{position:absolute;transform:translate(-50%,-50%);padding:4px 6px;border-radius:999px;background:#0a2029e8;border:1px solid #3a6a73;color:#b9fff8;font-size:8px;font-weight:700;white-space:nowrap;box-shadow:0 4px 16px #0008}.mgx-dim-label::before{content:'';position:absolute;inset:-3px;border:1px solid #50e3d433;border-radius:999px}.mgx-panel-id{font-size:8px;color:#6f909a;margin-top:2px}
      @media(max-width:760px){.mgx-panel-card{left:10px;bottom:10px;width:min(260px,calc(100% - 20px));padding:9px}.mgx-panel-grid,.mgx-edit-grid{gap:4px}.mgx-panel-metric{padding:6px}}
      `;document.head.append(style);
    }
    this.annotationLayer=document.createElement('div');this.annotationLayer.className='mgx-annotation-layer';this.v.host.append(this.annotationLayer);
    this.card=document.createElement('div');this.card.className='mgx-panel-card';this.card.hidden=true;this.card.innerHTML=`<div class="mgx-panel-head"><div><b data-mgx-name>Panel</b><div class="mgx-panel-id" data-mgx-id></div></div><button type="button" data-mgx-close>×</button></div><div class="mgx-panel-grid"><div class="mgx-panel-metric"><small>Width</small><span data-mgx-w>—</span></div><div class="mgx-panel-metric"><small>Height</small><span data-mgx-h>—</span></div><div class="mgx-panel-metric"><small>Fold</small><span data-mgx-fold>—</span></div><div class="mgx-panel-metric"><small>Parent</small><span data-mgx-parent>—</span></div></div><div class="mgx-edit"><div class="mgx-edit-title">Box dimensions · Mahabat Engine</div><div class="mgx-edit-grid"><label>L<input type="number" step="1" data-mgx-param="L"></label><label>W<input type="number" step="1" data-mgx-param="W"></label><label>H<input type="number" step="1" data-mgx-param="H"></label></div><div class="mgx-edit-actions"><button type="button" data-mgx-apply>تطبيق</button></div></div><div class="mgx-panel-note">التعديل يغيّر بارامترات القالب فقط ثم يعيد التوليد من Mahabat Engine؛ لا يتم تحريك نقاط القص أو التكسير يدويًا.</div>`;
    this.card.querySelector('.mgx-edit-actions').remove();
    this.v.host.append(this.card);this.card.querySelector('[data-mgx-close]').onclick=()=>this.clearSelection();
    for(const input of this.card.querySelectorAll('[data-mgx-param]'))input.addEventListener('input',()=>this.applyCardDimensions());
    const canvas=this.v.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY,t:performance.now()};});
    canvas.addEventListener('pointerup',e=>{if(!this.down)return;const d=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y),dt=performance.now()-this.down.t;this.down=null;if(d<6&&dt<700)this.pick(e);});
    canvas.addEventListener('pointermove',e=>this.hover(e));canvas.addEventListener('pointerleave',()=>canvas.classList.remove('mgx-hover'));
  }
  active(){return this.v.currentCode==='EVC11001';}
  engineeringModel(){return this.s.data?.engineeringModel||null;}
  panels(){return this.engineeringModel()?.panels||this.s.data?.mahabaGeometry?.[0]?.panels||[];}
  panelById(id){return this.panels().find(p=>p.panel_id===id||p.id===id)||null;}
  meshEntryFromEvent(e){if(!this.active()||!this.v.model)return null;const r=this.v.renderer.domElement.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;this.ray.setFromCamera(this.pointer,this.v.camera);const entries=this.v.model.meshes||[],hits=this.ray.intersectObjects(entries.map(x=>x.mesh),false);if(!hits.length)return null;return entries.find(x=>x.mesh===hits[0].object)||null;}
  hover(e){this.v.renderer.domElement.classList.toggle('mgx-hover',!!this.meshEntryFromEvent(e));}
  pick(e){const entry=this.meshEntryFromEvent(e);if(!entry)return;this.selectPanel(entry.source?.id,entry.mesh);}
  selectPanel(id,mesh){if(!id||!mesh)return;this.clearHighlight();this.selectedPanelId=id;this.selectedMesh=mesh;const edges=new THREE.EdgesGeometry(mesh.geometry,20),mat=new THREE.LineBasicMaterial({color:PANEL_COLOR,transparent:true,opacity:.95,depthTest:false});this.highlight=new THREE.LineSegments(edges,mat);this.highlight.renderOrder=999;mesh.add(this.highlight);this.highlight.userData.mgx=true;const p=this.panelById(id),b=boundsOf(p?.polygon||p?.poly);this.installDimensionGuides(mesh,b);this.card.hidden=false;this.card.querySelector('[data-mgx-name]').textContent=p?.name||p?.role||'Panel';this.card.querySelector('[data-mgx-id]').textContent=p?.panel_id||p?.id||id;this.card.querySelector('[data-mgx-w]').textContent=b?`${fmt(b.w)} mm`:'—';this.card.querySelector('[data-mgx-h]').textContent=b?`${fmt(b.h)} mm`:'—';const foldText=p?.stage?`${p.stage}${p?.angle!=null?` · ${fmt(p.angle,0)}°`:''}`:(p?.angle!=null?`${fmt(p.angle,0)}°`:'Fixed');this.card.querySelector('[data-mgx-fold]').textContent=foldText;this.card.querySelector('[data-mgx-parent]').textContent=p?.parent_panel||p?.parent||'Root';this.syncCardDimensions();this.highlightFlat(p);}
  installDimensionGuides(mesh,b){if(!b)return;const z=(mesh.geometry.boundingBox||(()=>{mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox;})())?.max?.z||0;const off=Math.max(1,Math.min(b.w,b.h)*.035),pts=[b.minX,b.minY-off,z,b.maxX,b.minY-off,z,b.minX-off,b.minY,z,b.minX-off,b.maxY,z,b.minX,b.minY-off*1.5,z,b.minX,b.minY-off*.5,z,b.maxX,b.minY-off*1.5,z,b.maxX,b.minY-off*.5,z,b.minX-off*1.5,b.minY,z,b.minX-off*.5,b.minY,z,b.minX-off*1.5,b.maxY,z,b.minX-off*.5,b.maxY,z];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const m=new THREE.LineBasicMaterial({color:PANEL_COLOR,transparent:true,opacity:.8,depthTest:false});this.guides=new THREE.LineSegments(g,m);this.guides.renderOrder=998;mesh.add(this.guides);this.labels=[this.makeLabel(`${fmt(b.w)} mm`,new THREE.Vector3((b.minX+b.maxX)/2,b.minY-off,z)),this.makeLabel(`${fmt(b.h)} mm`,new THREE.Vector3(b.minX-off,(b.minY+b.maxY)/2,z))];}
  makeLabel(text,local){const el=document.createElement('div');el.className='mgx-dim-label';el.textContent=text;this.annotationLayer.append(el);return {el,local};}
  annotationLoop(){requestAnimationFrame(()=>this.annotationLoop());if(!this.selectedMesh||!this.labels.length||this.card.hidden)return;const rect=this.v.renderer.domElement.getBoundingClientRect();for(const x of this.labels){const p=x.local.clone().applyMatrix4(this.selectedMesh.matrixWorld).project(this.v.camera);if(p.z<-1||p.z>1){x.el.style.display='none';continue;}x.el.style.display='block';x.el.style.left=`${(p.x*.5+.5)*rect.width}px`;x.el.style.top=`${(-p.y*.5+.5)*rect.height}px`;}}
  clearHighlight(){if(this.highlight){const parent=this.highlight.parent;parent?.remove(this.highlight);this.highlight.geometry?.dispose();this.highlight.material?.dispose();this.highlight=null;}if(this.guides){this.guides.parent?.remove(this.guides);this.guides.geometry?.dispose();this.guides.material?.dispose();this.guides=null;}for(const x of this.labels)x.el.remove();this.labels=[];this.selectedMesh=null;this.removeFlatHighlight();}
  clearSelection(){this.clearHighlight();this.selectedPanelId=null;this.card.hidden=true;}
  removeFlatHighlight(){this.s.$?.('flat')?.querySelector?.('[data-mgx-selected]')?.remove();}
  highlightFlat(panel){this.removeFlatHighlight();const poly=panel?.polygon||panel?.poly;if(!Array.isArray(poly)||poly.length<3)return;const svg=this.s.$?.('flat')?.querySelector?.('svg');if(!svg)return;const ns='http://www.w3.org/2000/svg',el=document.createElementNS(ns,'polygon');el.setAttribute('points',poly.map(p=>`${p[0]},${p[1]}`).join(' '));el.setAttribute('class','mgx-selected-flat');el.dataset.mgxSelected='1';svg.append(el);}
  dimensionField(key){return this.s.$?.('dimensions')?.querySelector?.(`[data-mahabat="${key}"]`)||null;}
  syncCardDimensions(){for(const key of ['L','W','H']){const el=this.card.querySelector(`[data-mgx-param="${key}"]`),src=this.dimensionField(key);if(el&&src)el.value=src.value;}}
  applyCardDimensions(){if(!this.active())return;for(const key of ['L','W','H']){const src=this.dimensionField(key),edit=this.card.querySelector(`[data-mgx-param="${key}"]`);if(src&&edit)src.value=edit.value;}this.schedule(450);}
  validationChecks(){return this.engineeringModel()?.validation?.checks||this.s.data?.validation?.checks||[];}
  warningsHtml(){const checks=this.validationChecks(),important=checks.filter(x=>x.status!=='PASS').slice(0,4);if(!important.length)return '<div class="mgx-warning pass">✓ لا توجد تحذيرات هندسية حالية في الفحوصات المتاحة.</div>';return important.map(x=>`<div class="mgx-warning ${statusClass(x.status)}"><b>${x.status==='FAIL'?'✕':'⚠'} ${x.status}</b><br>${x.message||x.id}</div>`).join('');}
  updateWarnings(){const holder=this.s.$?.('dimensions')?.querySelector?.('[data-mgx-warnings]');if(holder)holder.innerHTML=this.warningsHtml();}
  enhanceDimensions(){
    if(!this.active())return;
    const fields=this.s.$?.('dimensions');if(!fields)return;
    if(!fields.querySelector('[data-mgx-generator]')){
      const dt=fields.querySelector('[data-mahabat="DT"]');if(!dt)return;
      const card=document.createElement('div');card.className='mgx-card';card.dataset.mgxGenerator='1';
      card.innerHTML='<div class="mgx-kicker">Quick Generator</div><div class="mgx-title">طريقة القياس</div><div class="mgx-segment"><button type="button" data-mode="1">Internal</button><button type="button" data-mode="2">External</button><button type="button" data-mode="3">Score</button></div><div class="mgx-status">غيّر L / W / H أو الخامة، وسيُعاد الحساب من <strong>Mahabat Engine</strong> نفسه بدون أي Scale للمجسم.</div><div data-mgx-warnings></div>';
      fields.prepend(card);const field=dt.closest('.field');if(field)field.style.display='none';
      const sync=()=>card.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===String(dt.value)));
      sync();
      card.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
        dt.value=button.dataset.mode;dt.dispatchEvent(new Event('change',{bubbles:true}));sync();
        if(!this.s.scheduleDimensionUpdate)this.schedule(80);
      });
    }
    this.updateWarnings();
  }
  schedule(delay=500){
    if(this.s.scheduleDimensionUpdate)return this.s.scheduleDimensionUpdate(delay);
    clearTimeout(this.timer);this.timer=setTimeout(()=>this.s.applyDimensions(false).catch(error=>this.s.message(error.message)),delay);
  }
  refresh(){clearTimeout(this.timer);this.clearSelection();queueMicrotask(()=>{this.enhanceDimensions();this.updateWarnings();});}
}
