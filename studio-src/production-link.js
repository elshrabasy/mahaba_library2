import {ProductionValidationEngine} from '../core/validation/engine.js';

// Connects visual Studio finishes to deterministic production metrics without
// changing SharedStudio. Foil/UV masks are clipped to the true dieline polygon
// before their physical area is measured.
const grayArea=(canvas,rectAreaMm2)=>{
  if(!canvas?.width||!canvas?.height||!Number.isFinite(rectAreaMm2))return 0;
  const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  let sum=0;for(let i=0;i<d.length;i+=4)sum+=d[i]/255;
  return rectAreaMm2*(sum/(d.length/4));
};
function clipCanvas(canvas,sheet){
  if(!canvas||!sheet?.polygon?.length)return;
  const sx=canvas.width/sheet.width,sy=canvas.height/sheet.height,ctx=canvas.getContext('2d');
  ctx.save();ctx.globalCompositeOperation='destination-in';ctx.fillStyle='#fff';ctx.beginPath();
  sheet.polygon.forEach((p,i)=>{const x=p[0]*sx,y=p[1]*sy;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();ctx.restore();
}
export class StudioProductionLink{
  constructor(studio,engineeringPanel=null){this.studio=studio;this.panel=engineeringPanel;this.install();}
  install(){
    const s=this.studio,baseBake=s.bake.bind(s),baseApply=s.applyAll.bind(s);
    s.bake=async(layer,drawing)=>{
      const out=await baseBake(layer,drawing),i=s.data?.drawings?.indexOf(drawing)??-1,sheet=s.sheets?.[i]||null,rectArea=Number(drawing?.objRectWidth)*Number(drawing?.objRectHeight);
      const foilCanvas=out.foil?.image?.getContext?out.foil.image:null,uvCanvas=out.uv?.image?.getContext?out.uv.image:null;
      if(sheet){if(foilCanvas)clipCanvas(foilCanvas,sheet);if(uvCanvas)clipCanvas(uvCanvas,sheet);if(out.foil)out.foil.needsUpdate=true;if(out.uv)out.uv.needsUpdate=true;}
      out.finishMetrics={foil_area_mm2:foilCanvas?grayArea(foilCanvas,rectArea):0,uv_area_mm2:uvCanvas?grayArea(uvCanvas,rectArea):0};
      return out;
    };
    s.applyAll=async(...args)=>{const result=await baseApply(...args);this.sync();return result;};
  }
  sync(){
    const s=this.studio,data=s.data,model=data?.engineeringModel;if(!model)return;
    let foil=0,uv=0;for(const baked of s.baked?.values?.()||[]){foil+=Number(baked.finishMetrics?.foil_area_mm2||0);uv+=Number(baked.finishMetrics?.uv_area_mm2||0);}
    model.metrics={...(model.metrics||{}),foil_area_mm2:foil,uv_area_mm2:uv};
    model.validation=ProductionValidationEngine.validate(model);
    data.engineering={...(data.engineering||{}),metrics:model.metrics,validation:model.validation};data.validation=model.validation;
    this.panel?.refresh(data);
  }
}
