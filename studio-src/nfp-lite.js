// Convex-cell NFP generator for Mahabat irregular nesting.
// It deliberately keeps every convex Minkowski boundary instead of requiring
// Clipper union. NestEngine.validate remains the final acceptance guard.

const EPS=1e-8;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const signedArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2;
const rot=(p,r)=>r===0?[p[0],p[1]]:r===90?[-p[1],p[0]]:r===180?[-p[0],-p[1]]:[p[1],-p[0]];

function cleanPolygon(points){
  const out=[];
  for(const p of points||[]){
    const q=[Number(p[0]),Number(p[1])];
    if(!Number.isFinite(q[0]+q[1]))continue;
    if(!out.length||Math.hypot(q[0]-out.at(-1)[0],q[1]-out.at(-1)[1])>1e-6)out.push(q);
  }
  if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<1e-6)out.pop();
  let changed=true;
  while(changed&&out.length>3){
    changed=false;
    for(let i=0;i<out.length;i++){
      const a=out[(i-1+out.length)%out.length],b=out[i],c=out[(i+1)%out.length];
      if(Math.abs(cross(a,b,c))<1e-7){out.splice(i,1);changed=true;break;}
    }
  }
  return signedArea(out)<0?out.reverse():out;
}

const inTriangle=(p,a,b,c)=>{
  const c1=cross(a,b,p),c2=cross(b,c,p),c3=cross(c,a,p);
  return c1>=-EPS&&c2>=-EPS&&c3>=-EPS;
};

export function triangulatePolygon(points){
  const p=cleanPolygon(points);
  if(p.length<3)throw new Error('محيط القالب غير صالح لتجهيز NFP.');
  const ids=p.map((_,i)=>i),triangles=[];
  let guard=0;
  while(ids.length>3&&guard++<p.length*p.length*2){
    let ear=-1;
    for(let k=0;k<ids.length;k++){
      const ia=ids[(k-1+ids.length)%ids.length],ib=ids[k],ic=ids[(k+1)%ids.length],a=p[ia],b=p[ib],c=p[ic];
      if(cross(a,b,c)<=EPS)continue;
      let hit=false;
      for(const id of ids){if(id===ia||id===ib||id===ic)continue;if(inTriangle(p[id],a,b,c)){hit=true;break;}}
      if(!hit){ear=k;triangles.push([a,b,c].map(q=>q.slice()));break;}
    }
    if(ear<0)throw new Error('تعذر تقسيم محيط القالب إلى خلايا محدبة بشكل آمن.');
    ids.splice(ear,1);
  }
  if(ids.length===3)triangles.push(ids.map(i=>p[i].slice()));
  if(!triangles.length)throw new Error('لم يتم إنشاء خلايا NFP.');
  return triangles;
}

function hull(points){
  const pts=[...new Map(points.map(p=>[`${p[0].toFixed(6)},${p[1].toFixed(6)}`,p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(pts.length<=2)return pts;
  const lo=[],hi=[];
  for(const q of pts){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),q)<=EPS)lo.pop();lo.push(q);}
  for(const q of [...pts].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),q)<=EPS)hi.pop();hi.push(q);}
  return lo.slice(0,-1).concat(hi.slice(0,-1));
}

export function buildConvexNFP(cells,rotations=[0,90,180,270],onProgress=()=>{}){
  if(!Array.isArray(cells)||!cells.length)throw new Error('خلايا القالب غير متاحة للمونتاج غير المنتظم.');
  const out={0:[],90:[],180:[],270:[]};
  for(let ri=0;ri<rotations.length;ri++){
    const r=rotations[ri],edges=[];
    onProgress({stage:`تجهيز NFP · ${r}°`,done:ri,total:rotations.length,best:0});
    for(const a of cells)for(const b of cells){
      const sums=[];
      for(const p of a)for(const q of b){const v=rot(q,r);sums.push([p[0]-v[0],p[1]-v[1]]);}
      const h=hull(sums);if(h.length<3)continue;
      for(let i=0;i<h.length;i++)edges.push([h[i].slice(),h[(i+1)%h.length].slice()]);
    }
    out[r]=edges;
  }
  return out;
}

export function prepareIrregularTemplate(template){
  const cells=template.cells?.length?template.cells.map(c=>c.map(p=>[+p[0],+p[1]])):triangulatePolygon(template.polygon);
  return {...template,cells};
}

export function relativeRotations(angles){
  return [...new Set(angles.flatMap(a=>angles.map(b=>(b-a+360)%360)))];
}
