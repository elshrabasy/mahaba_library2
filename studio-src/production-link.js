import './nest-engine-core.js';
import {ProductionValidationEngine} from '../core/validation/engine.js';
import {MachineEngine} from '../core/machines/engine.js';
import {CostEngine} from '../core/cost/engine.js';
import {ProductionOptimizer} from '../engines/production/optimizer.js';
import {DEMO_MACHINE_PROFILES,DEMO_COST_RATES,DEMO_ROUTE_SHEETS,DEFAULT_PRODUCTION_OPTIONS} from './production-profiles.js';

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
  constructor(studio,engineeringPanel=null){
    this.studio=studio;
    this.panel=engineeringPanel;
    this.options={...DEFAULT_PRODUCTION_OPTIONS};
    this.nestingSummary=null;
    if(this.panel)this.panel.productionLink=this;
    this.install();
  }
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
    const baseStore=s.storeNesting?.bind(s);
    if(baseStore)s.storeNesting=(...args)=>{const result=baseStore(...args);this.syncNestingFromStudio();return result;};
    window.addEventListener('message',event=>{
      const msg=event?.data;
      if(msg?.type==='mahabat:nesting-result')this.syncNesting(msg.payload);
    });
  }
  machineProfile(){
    return DEMO_MACHINE_PROFILES.find(m=>m.machine_id===this.options.machine_id)||DEMO_MACHINE_PROFILES[0];
  }
  setProductionOptions(next={}){
    const quantity=Math.max(1,Math.ceil(Number(next.quantity??this.options.quantity)));
    const margin=Number(next.margin_percent??this.options.margin_percent);
    this.options={...this.options,...next,quantity,margin_percent:Number.isFinite(margin)?margin:0};
    this.sync();
  }
  syncNestingFromStudio(){
    const s=this.studio,index=s.activeNest;
    if(index==null)return;
    const stored=s.nestingStates?.get(index);
    if(stored?.summary)this.syncNesting(stored);
  }
  syncNesting(payload){
    const summary=payload?.summary||payload;
    if(!summary)return;
    this.nestingSummary=summary;
    this.sync();
  }
  productionRouteComparison(model){
    const solver=globalThis.MahabaNestEngine||globalThis.NestEngine;
    if(!solver?.regularSolution)return null;
    const current=this.nestingSummary?.sheet_width_mm&&this.nestingSummary?.sheet_height_mm?{
      id:`CURRENT-${this.nestingSummary.sheet_width_mm}x${this.nestingSummary.sheet_height_mm}`,
      sheetWidth:this.nestingSummary.sheet_width_mm,
      sheetHeight:this.nestingSummary.sheet_height_mm
    }:null;
    const sheets=[...(current?[current]:[]),...DEMO_ROUTE_SHEETS].filter((sheet,i,all)=>all.findIndex(x=>x.sheetWidth===sheet.sheetWidth&&x.sheetHeight===sheet.sheetHeight)===i);
    try{
      return ProductionOptimizer.optimize({
        solver,
        model,
        quantity:this.options.quantity,
        sheets,
        machines:DEMO_MACHINE_PROFILES,
        rates:DEMO_COST_RATES,
        margin_percent:this.options.margin_percent,
        waste_percent:Number(model.metrics?.waste_percent??5)
      });
    }catch(error){
      return {error:error.message||String(error),routes:[],recommended:null,comparison:{}};
    }
  }
  sync(){
    const s=this.studio,data=s.data,model=data?.engineeringModel;if(!model)return;
    let foil=0,uv=0;for(const baked of s.baked?.values?.()||[]){foil+=Number(baked.finishMetrics?.foil_area_mm2||0);uv+=Number(baked.finishMetrics?.uv_area_mm2||0);}
    model.metrics={...(model.metrics||{}),foil_area_mm2:foil,uv_area_mm2:uv};
    const n=this.nestingSummary;
    if(n){
      model.metrics={...model.metrics,pieces_per_sheet:n.pieces_per_sheet??null,waste_percent:n.waste_percent??null,utilization:n.utilization??null,sheet_width_mm:n.sheet_width_mm??null,sheet_height_mm:n.sheet_height_mm??null,nesting_spacing_mm:n.spacing_mm??null,nesting_rotations_deg:n.rotations_deg||null};
      model.nesting={...(model.nesting||{}),actual:{...n},minimum_spacing_mm:Number.isFinite(Number(n.spacing_mm))?Number(n.spacing_mm):model.nesting?.minimum_spacing_mm};
    }
    const selected=this.machineProfile();
    const machineMatches=MachineEngine.match(model,DEMO_MACHINE_PROFILES);
    const machineEvaluation=MachineEngine.evaluate(model,selected);
    const cost=CostEngine.estimate(model,{quantity:this.options.quantity,pieces_per_sheet:model.metrics?.pieces_per_sheet,waste_percent:model.metrics?.waste_percent??5,rates:DEMO_COST_RATES,margin_percent:this.options.margin_percent});
    const routeComparison=this.productionRouteComparison(model);
    model.production={...(model.production||{}),quantity:this.options.quantity,margin_percent:this.options.margin_percent,machine_profiles:DEMO_MACHINE_PROFILES,machine_profile:selected,machine_evaluation:machineEvaluation,machine_matches:machineMatches,cost_profile:{id:'mahaba-demo-rates-unapproved',status:'DEMO_UNAPPROVED',rates:DEMO_COST_RATES},cost_estimate:cost,route_comparison:routeComparison};
    model.validation=ProductionValidationEngine.validate(model,{machine:selected});
    data.engineering={...(data.engineering||{}),metrics:model.metrics,validation:model.validation};data.validation=model.validation;
    this.panel?.refresh(data);
  }
}
