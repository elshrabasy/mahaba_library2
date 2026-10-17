// Mahabat 2x2 layout-template library inspired by production layout workflows.
// Templates are generic geometric rules, not copied proprietary EngView data.
// Every generated solution must still pass true-polygon NestEngine.validate.

const RULES=[
  {id:'same-0',name:'2×2 · Same direction',rot:[0,0,0,0],shift:[0,0,0,0]},
  {id:'checker-180',name:'2×2 · Checker 0/180',rot:[0,180,180,0],shift:[0,0,0,0]},
  {id:'columns-180',name:'2×2 · Alternate columns',rot:[0,180,0,180],shift:[0,0,0,0]},
  {id:'rows-180',name:'2×2 · Alternate rows',rot:[0,0,180,180],shift:[0,0,0,0]},
  {id:'head-tail',name:'2×2 · Head to tail',rot:[0,180,0,180],shift:[0,.5,0,.5]},
  {id:'brick',name:'2×2 · Staggered brick',rot:[0,0,0,0],shift:[0,0,.5,.5]}
];

const unique=a=>[...new Set(a)];

function normalize(layout){
  if(!layout.length)return layout;
  const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));
  return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));
}

export function layoutTemplateRules(){return RULES.map(x=>({...x,rot:[...x.rot],shift:[...x.shift]}));}

export function generate2x2TemplateSolutions(engine,T,c){
  const vs=engine.makeVariants(T),gap=Number(c.clearance||0)+Number(engine.SAFETY||0),out=[];
  for(const rule of RULES){
    if(unique(rule.rot).some(r=>!c.angles.includes(r)))continue;
    const vv=rule.rot.map(r=>vs[r/90]);
    const colW=[Math.max(vv[0].w,vv[2].w),Math.max(vv[1].w,vv[3].w)];
    const rowH=[Math.max(vv[0].h,vv[1].h),Math.max(vv[2].h,vv[3].h)];
    const pitchX=colW[0]+gap,pitchY=rowH[0]+gap;
    const raw=[
      {r:rule.rot[0],x:0,y:0},
      {r:rule.rot[1],x:pitchX,y:0},
      {r:rule.rot[2],x:rule.shift[2]*pitchX,y:pitchY},
      {r:rule.rot[3],x:pitchX+rule.shift[3]*pitchX,y:pitchY}
    ];
    let layout=normalize(raw);
    let d=engine.dims(layout,vs);
    if(d.w>c.W||d.h>c.H)continue;
    const check=engine.validate(layout,vs,c,true);
    if(!check.ok)continue;

    // Repeat the validated 2x2 cluster across the sheet.
    const clusterW=d.w+gap,clusterH=d.h+gap,all=[];
    const rows=Math.max(1,Math.floor((c.H+gap)/clusterH));
    for(let row=0;row<rows;row++){
      const rowOffset=rule.id==='brick'&&row%2?clusterW/2:0;
      const cols=Math.max(0,Math.floor((c.W-rowOffset+gap)/clusterW));
      for(let col=0;col<cols;col++)for(const p of layout){
        all.push({...p,x:p.x+rowOffset+col*clusterW,y:p.y+row*clusterH});
      }
    }
    if(!all.length)continue;
    const finalCheck=engine.validate(all,vs,c,true);
    if(!finalCheck.ok)continue;
    d=engine.dims(all,vs);
    out.push({layout:all,name:rule.name,recipe:'layout-template',template_id:rule.id,minGap:Number.isFinite(finalCheck.min)?finalCheck.min:null,...d});
  }
  return out;
}
