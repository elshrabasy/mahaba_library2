import {SharedStudio} from './shared-studio.js';

// The UI/artwork/foil/UV/nesting implementation remains the original Mahaba Library studio.
// This subclass only swaps the engineering data source from EngView/API to Mahabat Engine.
export class MahabatSharedStudio extends SharedStudio {
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
}
