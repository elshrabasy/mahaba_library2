import * as THREE from 'three';
import {SharedStudio} from './shared-studio.js';

// The UI/artwork/foil/UV/nesting implementation remains the original Mahaba Library studio.
// This subclass only swaps the engineering data source from EngView/API to Mahabat Engine.
export class MahabatSharedStudio extends SharedStudio {
  constructor(viewer){
    super(viewer);
    const nestButton=this.rail?.querySelector('[data-pane="nest"]');
    if(nestButton)nestButton.onclick=()=>{this.setPane(null);this.openNesting();};
    const nestPanel=this.root?.querySelector('[data-panel="nest"]');
    if(nestPanel)nestPanel.hidden=true;
    if(!document.getElementById('mahabatStudioPolish')){
      const style=document.createElement('style');style.id='mahabatStudioPolish';style.textContent=`
      .workspace{position:relative!important;min-height:0!important}
      .ms-nesting-workspace{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;background:#eef3f5!important;z-index:60!important;border-radius:12px!important;overflow:hidden!important;box-shadow:0 12px 35px rgba(5,26,38,.18)!important}
      .ms-nesting-workspace>.toolbar{height:54px!important;display:flex!important;align-items:center!important;gap:12px!important;padding:8px 14px!important;background:#102f3d!important;color:#fff!important;border-bottom:2px solid #c3a45f!important}
      .ms-nesting-workspace>.toolbar button{background:#173e4d!important;color:#fff!important;border:1px solid #43606b!important;border-radius:8px!important;padding:8px 13px!important}
      .ms-nesting-workspace>.toolbar span{font-weight:700!important}
      .ms-nest{display:block!important;flex:1 1 auto!important;width:100%!important;height:calc(100% - 54px)!important;min-height:0!important;border:0!important;background:#eef3f5!important}
      .ms-layout.inspector-closed{grid-template-columns:72px minmax(0,1fr)!important}
      @media(max-width:760px){.ms-layout.inspector-closed{grid-template-columns:56px minmax(0,1fr)!important}.ms-nesting-workspace{border-radius:0!important}}
      `;document.head.append(style);
    }
  }

  async loadSheets(data){
    if(Array.isArray(data.mahabaGeometry)&&data.mahabaGeometry.length){
      return data.mahabaGeometry.map((g,i)=>{
        const cuts=(g.lines||[]).filter(x=>x.type==='cut').map(x=>[x.a,x.b].map(p=>[+p[0],+p[1]]));
        const creases=(g.lines||[]).filter(x=>x.type==='crease').map(x=>[x.a,x.b].map(p=>[+p[0],+p[1]]));
        const polygon=(g.outline||[]).map(p=>[+p[0],+p[1]]);
        const area=Math.abs(polygon.reduce((s,p,j)=>{const q=polygon[(j+1)%polygon.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2);
        return {name:g.name||data.drawings?.[i]?.name||data.code,width:+g.width,height:+g.height,polygon,cuts,creases,area,nestingSupported:polygon.length>=3,sourceBacked:false,source:'mahabat-engine'};
      });
    }
    return super.loadSheets(data);
  }

  renderDimensions(){
    if(this.data?.source!=='mahabat-engine')return super.renderDimensions();
    const p=this.data.requestedParameters||{};
    const fields=this.$('dimensions');fields.replaceChildren();
    const number=(key,label,value,min=.001)=>{const wrap=document.createElement('label');wrap.className='field';wrap.textContent=label;const input=document.createElement('input');input.type='number';input.min=String(min);input.step='any';input.value=value;input.dataset.mahabat=key;input.dir='ltr';wrap.append(input);fields.append(wrap);};
    const select=(key,label,value,items)=>{const wrap=document.createElement('label');wrap.className='field';wrap.textContent=label;const input=document.createElement('select');input.dataset.mahabat=key;for(const [v,text] of items){const o=document.createElement('option');o.value=v;o.textContent=text;o.selected=String(v)===String(value);input.append(o);}wrap.append(input);fields.append(wrap);};
    number('L','الطول L (مم)',p.L||125,40);number('W','العرض W (مم)',p.W||105,30);number('H','الارتفاع H (مم)',p.H||88,30);
    select('DT','نوع القياس',p.DT||1,[[1,'داخلي ID'],[2,'خارجي OD'],[3,'Score to Score']]);
    select('MAT','الخامة',p.MAT||1,[[1,'E Flute · 1.5 mm'],[2,'B Flute · 3 mm'],[3,'C Flute · 4 mm'],[4,'BC Double Wall · 6.5 mm']]);
    select('FD','اتجاه الفلوت',p.FD||2,[[2,'FD_Y'],[1,'FD_X']]);
    this.$('dimensionNote').textContent='الأبعاد والخامة يعاد حسابها من Mahabat Engine؛ واجهة الاستوديو نفسها لم تتغير.';
    const m=this.data.materialInfo;this.$('stockFacts').textContent=m?[m.name,m.thickness+' مم',m.grammage?m.grammage+' جم/م²':''].filter(Boolean).join(' · '):'';
  }

  setReady(ready){
    super.setReady(ready);
    if(this.data?.source==='mahabat-engine')for(const id of ['applyDimensions','resetDimensions']){const el=this.$(id);if(el)el.disabled=!ready||!!this.dimensionsBusy;}
  }

  async applyDimensions(reset=false){
    if(this.data?.source!=='mahabat-engine')return super.applyDimensions(reset);
    const params=reset?null:{...this.data.requestedParameters};
    if(params)for(const el of this.$('dimensions').querySelectorAll('[data-mahabat]')){const k=el.dataset.mahabat,v=Number(el.value);if(!Number.isFinite(v)||v<=0){this.message('أدخل قيمة صحيحة.');el.focus();return false;}params[k]=v;}
    const button=this.$('applyDimensions'),original=this.$('resetDimensions');this.dimensionsBusy=true;button.disabled=original.disabled=true;button.textContent='جارٍ إعادة الحساب…';this.message('جارٍ إعادة بناء القالب من Mahabat Engine…');
    try{const ok=await this.v.load(this.code,'',params,true);if(ok===false)return false;this.message(reset?'تمت استعادة المقاس الأصلي.':'تم تحديث المقاسات والخامة والرسم والمجسم من نفس المصدر.');return true;}
    finally{this.dimensionsBusy=false;button.disabled=original.disabled=false;button.textContent='تطبيق الأبعاد';}
  }

  async bake(s,d){
    const images=await Promise.all(['image','foil','uv'].map(k=>this.image(s[k]))),base=images[0]||images[1]||images[2],result={};
    const ratio=d.objRectWidth/d.objRectHeight,w=Math.round(ratio>=1?1536:1536*ratio),h=Math.round(ratio>=1?1536/ratio:1536),canvases=[];
    const drawPlaced=(ctx,im,baseImage)=>{if(!im||!baseImage)return;const px=w/d.objRectWidth,k=Math.min(d.objRectWidth/baseImage.width,d.objRectHeight/baseImage.height)*px*s.scale/100;ctx.save();ctx.translate(w/2+s.x*px,h/2+s.y*px);ctx.rotate(s.angle*Math.PI/180);ctx.scale(k,k);ctx.drawImage(im,-baseImage.width/2,-baseImage.height/2,baseImage.width,baseImage.height);ctx.restore();};
    for(let i=0;i<3;i++){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=i===0?'#fff':'#000';ctx.fillRect(0,0,w,h);drawPlaced(ctx,images[i],base);canvases.push(c);}
    // Composite foil colour into the printable map as a fallback independent of shader patches.
    if(images[1]){const foil=document.createElement('canvas');foil.width=w;foil.height=h;const fx=foil.getContext('2d');fx.fillStyle=s.foilColor||'#d7ad55';fx.fillRect(0,0,w,h);fx.globalCompositeOperation='destination-in';fx.drawImage(canvases[1],0,0);canvases[0].getContext('2d').drawImage(foil,0,0);}
    for(let i=0;i<3;i++){const t=new THREE.CanvasTexture(canvases[i]);t.channel=3;t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(8,this.v.renderer.capabilities.getMaxAnisotropy());result[['map','foil','uv'][i]]=t;if(i===0)result.canvas=canvases[i];}
    return result;
  }

  async applyAll(){
    await super.applyAll();
    for(const x of this.surfaces){
      const key=`${x.drawing}:${x.side}`,s=this.layers.get(key),b=this.baked.get(key),m=x.mat,o=x.original;
      if(!s||!b){m.clearcoatMap=null;m.metalnessMap=o.metalnessMap||null;m.needsUpdate=true;continue;}
      // Physical-material fallback: UV drives clearcoat, foil drives metalness, while the base map already carries foil colour.
      if(s.uv){m.clearcoat=1;m.clearcoatRoughness=.06;m.clearcoatMap=b.uv;}else{m.clearcoat=.1;m.clearcoatRoughness=.3;m.clearcoatMap=null;}
      if(s.foil){m.metalness=1;m.metalnessMap=b.foil;m.roughness=Math.min(m.roughness,.24);}else{m.metalness=o.metalness;m.metalnessMap=o.metalnessMap;}
      m.needsUpdate=true;
    }
  }

  styleNestingFrame(){
    const frame=this.$('nesting'),doc=frame?.contentDocument;if(!doc||doc.getElementById('mahabatNestTheme'))return;
    const style=doc.createElement('style');style.id='mahabatNestTheme';style.textContent=`
    :root{--navy:#102f3d;--teal:#0e9ea2;--gold:#c3a45f;--bg:#eef3f5;--line:#d3dfe4}
    html,body{height:100%;background:var(--bg)!important;color:#173548!important;font-family:Tahoma,Arial,sans-serif!important}
    .app{min-height:100%!important;grid-template-columns:300px minmax(0,1fr)!important;background:var(--bg)!important}
    .side{background:#fff!important;border-left:1px solid var(--line)!important;padding:18px!important;box-shadow:0 8px 24px rgba(13,47,61,.06)!important}
    .side h2{color:var(--navy)!important;font-size:20px!important}.side h3{color:#6c818c!important}
    .primary{background:var(--teal)!important;border-color:var(--teal)!important;color:#fff!important;border-radius:9px!important;padding:11px!important}
    .field input,.field select,button{border-radius:8px!important;border-color:#c9d7dd!important}
    .stage{background:var(--navy)!important;color:#fff!important;border-bottom:2px solid var(--gold)!important;padding:12px 16px!important}
    .stat{background:#173e4d!important;border-color:#315462!important;color:#fff!important}.stat span{color:#b9cbd3!important}
    .canvasWrap{padding:18px!important}.canvas{border-radius:12px!important;border:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(13,47,61,.06)!important;min-height:calc(100vh - 120px)!important}
    .alts .alt.active{border:2px solid var(--teal)!important;background:#e9f8f8!important}
    @media(max-width:760px){.app{grid-template-columns:1fr!important}.canvas{min-height:420px!important}}
    `;doc.head.append(style);
  }

  openNesting(){
    this.setPane(null);
    super.openNesting();
    const section=this.workspace.querySelector('.ms-nesting-workspace');
    if(!section.hidden){this.styleNestingFrame();requestAnimationFrame(()=>{this.styleNestingFrame();window.dispatchEvent(new Event('resize'));});}
  }
}
