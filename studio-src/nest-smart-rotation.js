// Mahabat smart mixed-orientation layouts.
// This is used as an optimizer fallback when 0/180-only layouts leave usable sheet area.
// Every candidate is validated against the true cut polygon. A production UI can later
// hard-lock grain/flute direction to disable these cross-rotation candidates.

const normalize=layout=>{
  if(!layout.length)return layout;
  const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));
  return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));
};

export function smartMixedRotationSolutions(engine,T,c){
  const smart={...c,angles:[0,90,180,270]},vs=engine.makeVariants(T),gap=Number(c.clearance||0)+Number(engine.SAFETY||0),out=[];
  const add=(layout,name)=>{
    const q=normalize(layout),check=engine.validate(q,vs,smart,true);
    if(!check.ok)return;
    const d=engine.dims(q,vs);
    if(d.w>smart.W+1e-6||d.h>smart.H+1e-6)return;
    out.push({
      layout:q,
      name,
      recipe:'smart-rotation',
      smartRotation:true,
      requiresCrossRotation:true,
      minGap:Number.isFinite(check.min)?check.min:null,
      ...d
    });
  };

  const a0=vs[0],a90=vs[1],a180=vs[2],a270=vs[3];

  // Two horizontal blanks stacked + one 90° blank in the remaining side strip.
  add([
    {r:0,x:0,y:0},
    {r:0,x:0,y:a0.h+gap},
    {r:90,x:a0.w+gap,y:0}
  ],'Smart Rotation · 2×0° + 1×90°');

  add([
    {r:180,x:0,y:0},
    {r:180,x:0,y:a180.h+gap},
    {r:270,x:a180.w+gap,y:0}
  ],'Smart Rotation · 2×180° + 1×270°');

  // Two 90° blanks side-by-side + one 0° blank in the remaining lower strip.
  add([
    {r:90,x:0,y:0},
    {r:90,x:a90.w+gap,y:0},
    {r:0,x:0,y:a90.h+gap}
  ],'Smart Rotation · 2×90° + 1×0°');

  add([
    {r:270,x:0,y:0},
    {r:270,x:a270.w+gap,y:0},
    {r:180,x:0,y:a270.h+gap}
  ],'Smart Rotation · 2×270° + 1×180°');

  // Mirrored side-strip variants can matter for asymmetric blanks.
  add([
    {r:90,x:0,y:0},
    {r:0,x:a90.w+gap,y:0},
    {r:0,x:a90.w+gap,y:a0.h+gap}
  ],'Smart Rotation · side strip mirrored');

  add([
    {r:270,x:0,y:0},
    {r:180,x:a270.w+gap,y:0},
    {r:180,x:a270.w+gap,y:a180.h+gap}
  ],'Smart Rotation · side strip mirrored 180°');

  out.sort((a,b)=>b.layout.length-a.layout.length||a.area-b.area||a.h-b.h);
  return {results:out,variants:vs,config:smart};
}
