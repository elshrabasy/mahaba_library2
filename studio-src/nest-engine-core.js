'use strict';
// NestEngine core copied from the pinned Mahaba Library baseline.
// The regularSolution path is fully operational without ClipperLib.
// makeN/solve that generate NFPs require the bundled Clipper dependency and remain gated.
const NestEngine=(()=>{
const EPS=1e-7, SAFETY=.10;
const area=p=>Math.abs(p.reduce((s,a,i)=>{let b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0))/2;
const rot=(p,r)=>r===0?p.slice():r===90?[-p[1],p[0]]:r===180?[-p[0],-p[1]]:[p[1],-p[0]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function dist(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],dd=x*x+y*y,t=dd?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/dd)):0;return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y)}
function inside(p,q){let hit=false;for(let i=0,j=q.length-1;i<q.length;j=i++){let a=q[i],b=q[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function makeVariants(T){return [0,90,180,270].map(r=>{
 const q=T.polygon.map(p=>rot(p,r)),min=[Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1]))];
 const tr=p=>{let q=rot(p,r);return [q[0]-min[0],q[1]-min[1]]};
 return {r,min,p:q.map(p=>[p[0]-min[0],p[1]-min[1]]),cuts:T.cuts.map(l=>l.map(tr)),creases:T.creases.map(l=>l.map(tr)),w:Math.max(...q.map(p=>p[0]))-min[0],h:Math.max(...q.map(p=>p[1]))-min[1]};
})}
function makePairNFP(N,vs){const out={};for(let a of vs)for(let b of vs){let edges=N[(b.r-a.r+360)%360].map(e=>e.map(p=>{let q=rot(p,a.r);return [q[0]-a.min[0]+b.min[0],q[1]-a.min[1]+b.min[1]]}));out[a.r+','+b.r]=edges}return out}
function merge(intervals){intervals.sort((a,b)=>a[0]-b[0]);let out=[];for(let a of intervals){const last=out[out.length-1];if(last&&a[0]<=last[1]+1e-5)last[1]=Math.max(last[1],a[1]);else out.push(a.slice())}return out}
function slice(edges,x,radius,swap=false){
 const intervals=[],events=[];
 for(const edge of edges){
  const a=swap?[edge[0][1],edge[0][0]]:edge[0],b=swap?[edge[1][1],edge[1][0]]:edge[1];
  const dx=b[0]-a[0],dy=b[1]-a[1];
  if((a[0]<=x&&x<b[0])||(b[0]<=x&&x<a[0]))events.push([a[1]+(x-a[0])*dy/dx,dx>0?1:-1]);
  if(x<Math.min(a[0],b[0])-radius||x>Math.max(a[0],b[0])+radius)continue;
  for(let p of [a,b]){let dd=radius*radius-(x-p[0])**2;if(dd>=0){let h=Math.sqrt(dd);intervals.push([p[1]-h,p[1]+h])}}
  const len=Math.hypot(dx,dy);if(len<EPS)continue;
  const nx=-dy/len*radius,ny=dx/len*radius,quad=[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]],ys=[];
  for(let i=0;i<4;i++){const u=quad[i],v=quad[(i+1)%4];if(Math.abs(v[0]-u[0])<EPS){if(Math.abs(x-u[0])<EPS)ys.push(u[1],v[1])}else if(x>=Math.min(u[0],v[0])-EPS&&x<=Math.max(u[0],v[0])+EPS)ys.push(u[1]+(x-u[0])*(v[1]-u[1])/(v[0]-u[0]))}
  if(ys.length)intervals.push([Math.min(...ys),Math.max(...ys)]);
 }
 events.sort((a,b)=>a[0]-b[0]);let winding=0,start=0;
 for(let i=0;i<events.length;){let y=events[i][0],sum=0;while(i<events.length&&Math.abs(events[i][0]-y)<1e-5)sum+=events[i++][1];const prev=winding;winding+=sum;if(prev===0&&winding!==0)start=y;if(prev!==0&&winding===0)intervals.push([start,y])}
 return merge(intervals);
}
function dims(layout,vs){if(!layout.length)return {w:0,h:0,area:0};const w=Math.max(...layout.map(a=>a.x+vs[a.r/90].w)),h=Math.max(...layout.map(a=>a.y+vs[a.r/90].h));return {w,h,area:w*h}}
function normalize(layout){if(!layout.length)return layout;const x=Math.min(...layout.map(a=>a.x)),y=Math.min(...layout.map(a=>a.y));return layout.map(a=>({...a,x:a.x-x,y:a.y-y}))}
function compare(a,b,vs){return b.length-a.length||dims(a,vs).area-dims(b,vs).area||dims(a,vs).h-dims(b,vs).h}
function pairCheck(a,b,vs,required,measure=false){
 const va=vs[a.r/90],vb=vs[b.r/90];
 if(!measure&&(b.x-a.x-va.w>=required||a.x-b.x-vb.w>=required||b.y-a.y-va.h>=required||a.y-b.y-vb.h>=required))return {ok:true,d:Infinity};
 const p=va.p.map(q=>[q[0]+a.x,q[1]+a.y]),q=vb.p.map(q=>[q[0]+b.x,q[1]+b.y]);
 if(inside(p[0],q)||inside(q[0],p))return {ok:false,d:0};
 let min=Infinity,closest=null;
 for(let i=0;i<p.length;i++)for(let j=0;j<q.length;j++){
  const u=p[i],v=p[(i+1)%p.length],w=q[j],z=q[(j+1)%q.length];
  if(!measure){
   const dx=Math.max(0,Math.min(u[0],v[0])-Math.max(w[0],z[0]),Math.min(w[0],z[0])-Math.max(u[0],v[0]));
   const dy=Math.max(0,Math.min(u[1],v[1])-Math.max(w[1],z[1]),Math.min(w[1],z[1])-Math.max(u[1],v[1]));
   if(dx*dx+dy*dy>=required*required)continue;
  }
  if(cross(u,v,w)*cross(u,v,z)<-1e-10&&cross(w,z,u)*cross(w,z,v)<-1e-10)return {ok:false,d:0};
  const d=Math.min(dist(u,w,z),dist(v,w,z),dist(w,u,v),dist(z,u,v));
  if(d<min){min=d;closest=[u,w]}
  if(!measure&&min<required-1e-6)return {ok:false,d:min};
 }
 return {ok:min>=required-1e-6,d:min,closest};
}
function validate(layout,vs,c,measure=false){
 let min=Infinity;
 for(let i=0;i<layout.length;i++){
  const a=layout[i],v=vs[a.r/90];
  if(!v||!c.angles.includes(a.r)||!Number.isFinite(a.x+a.y)||a.x<-EPS||a.y<-EPS||a.x+v.w>c.W+EPS||a.y+v.h>c.H+EPS)return {ok:false,reason:'قطعة خارج مساحة التشغيل أو اتجاه غير مسموح',min:0};
  for(let j=0;j<i;j++){const k=pairCheck(a,layout[j],vs,c.clearance+SAFETY,measure);min=Math.min(min,k.d);if(!k.ok)return {ok:false,reason:'تداخل أو فاصل أقل من المطلوب',min:k.d}}
 }
 return {ok:true,min};
}
function makeN(cells,rotations=[0,90,180,270],onProgress=()=>{}){
 if(typeof ClipperLib==='undefined')throw new Error('ClipperLib dependency is required for NFP generation.');
 const hull=points=>{const p=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),l=[],h=[];for(const q of p){while(l.length>1&&cross(l.at(-2),l.at(-1),q)<=1e-8)l.pop();l.push(q)}for(const q of p.slice().reverse()){while(h.length>1&&cross(h.at(-2),h.at(-1),q)<=1e-8)h.pop();h.push(q)}return l.slice(0,-1).concat(h.slice(0,-1))};
 const contains=(p,q)=>{if(p.length<3||cross(p[0],p[1],q)<0||cross(p[0],p.at(-1),q)>0)return false;let lo=1,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(cross(p[0],p[m],q)>=0)lo=m;else hi=m;}return cross(p[lo],p[hi],q)>=0;};
 const ordered=[...cells].sort((a,b)=>area(b)-area(a)),out={0:[],90:[],180:[],270:[]};
 for(let index=0;index<rotations.length;index++){const r=rotations[index],edges=[],polys=[];let dominant=null;onProgress({stage:'تجهيز التعشيق الهندسي · اتجاه '+r+'°',done:index,total:rotations.length,best:0});
  for(const a of ordered)for(const b of ordered){const sums=[];for(const p of a)for(const q of b){const v=rot(q,r);sums.push([Math.round((p[0]-v[0])*10000)/10000,Math.round((p[1]-v[1])*10000)/10000]);}const h=hull(sums);if(h.length<3)continue;if(dominant&&h.every(q=>contains(dominant,q.map(v=>Math.round(v*10000)))))continue;if(!dominant)dominant=h.map(q=>q.map(v=>Math.round(v*10000)));polys.push(h);}
  const clip=new ClipperLib.Clipper();clip.AddPaths(polys.map(p=>p.map(q=>({X:Math.round(q[0]*10000),Y:Math.round(q[1]*10000)}))),ClipperLib.PolyType.ptSubject,true);const solution=[];clip.Execute(ClipperLib.ClipType.ctUnion,solution,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);for(const ring of solution)for(let i=0;i<ring.length;i++)edges.push([[ring[i].X/10000,ring[i].Y/10000],[ring[(i+1)%ring.length].X/10000,ring[(i+1)%ring.length].Y/10000]]);out[r]=edges;
 }
 return out;
}
function regularSolution(T,c){
 const vs=makeVariants(T),radius=c.clearance+SAFETY,results=[];let rectangular=0;
 for(const r of c.angles){const v=vs[r/90],nx=Math.max(0,Math.floor((c.W+radius)/(v.w+radius))),ny=Math.max(0,Math.floor((c.H+radius)/(v.h+radius))),layout=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)layout.push({r,x:i*(v.w+radius),y:j*(v.h+radius)});rectangular=Math.max(rectangular,layout.length);if(layout.length&&validate(layout,vs,c).ok)results.push({layout,name:'تكرار منتظم '+r+'°',...dims(layout,vs)});}
 results.sort((a,b)=>compare(a.layout,b.layout,vs));return {results,rectangular,area:area(T.polygon),safety:SAFETY,variants:vs};
}
function solve(T,N,c,onProgress=()=>{}){
 N=N||(Math.floor(c.W*c.H/area(T.polygon))<=1?{0:[],90:[],180:[],270:[]}:makeN(T.cells,[...new Set(c.angles.flatMap(a=>c.angles.map(b=>(b-a+360)%360)))],onProgress));
 const vs=makeVariants(T),pairs=makePairNFP(N,vs),radius=c.clearance+SAFETY,results=[],cache=new Map(),maxParts=Math.min(80,Math.floor(c.W*c.H/area(T.polygon))),step=c.deep?4:10;
 const getSlice=(ar,br,x,swap)=>{const key=ar+','+br+','+swap+','+x.toFixed(5);if(cache.has(key))return cache.get(key);const v=slice(pairs[ar+','+br],x,radius,swap);if(cache.size>120000)cache.clear();cache.set(key,v);return v;};
 function freeY(layout,r,x,swap){const v=vs[r/90],max=(swap?c.W-v.w:c.H-v.h),ints=[];if(x<-EPS||x>(swap?c.H-v.h:c.W-v.w)+EPS||max<0)return null;for(let a of layout){let ax=swap?a.y:a.x,ay=swap?a.x:a.y;for(let it of getSlice(a.r,r,x-ax,swap))ints.push([it[0]+ay,it[1]+ay])}let y=0;for(let [lo,hi] of merge(ints)){if(hi<y)continue;if(lo>y+1e-6)break;y=Math.max(y,hi+.001)}return y<=max+EPS?y:null;}
 function candidates(layout,r,swap){const v=vs[r/90],max=swap?c.H-v.h:c.W-v.w;if(max<0)return [];const xs=new Set([0,max]);for(let x=step;x<max;x+=step)xs.add(x);for(let a of layout){const av=vs[a.r/90],ax=swap?a.y:a.x,aw=swap?av.h:av.w,vw=swap?v.h:v.w;for(let x of [ax,ax+aw+radius,ax-vw-radius,ax+aw-vw])if(x>=0&&x<=max)xs.add(x);for(let edge of pairs[a.r+','+r]){let x=ax+edge[0][swap?1:0];for(let t of [x,x-radius,x+radius])if(t>=0&&t<=max)xs.add(t)}}let list=[];for(let x of xs){let y=freeY(layout,r,x,swap);if(y!==null)list.push({r,x:swap?y:x,y:swap?x:y})}return list;}
 function score(p,layout,mode){const d=dims([...layout,p],vs);return mode===0?d.area:mode===1?d.h*10000+d.w:d.w*10000+d.h}
 function findBest(layout,swap,mode,preferred){let best=null,bestScore=Infinity,options=[];for(let r of preferred){for(let p of candidates(layout,r,swap)){let s=score(p,layout,mode);options.push({p,s})}}options.sort((a,b)=>a.s-b.s);for(let o of options){if(validate([...layout,o.p],vs,c).ok){best=o.p;bestScore=o.s;break}}if(!best)return null;let x=swap?best.y:best.x;for(let h=step/2;h>=.025;h/=2){let change=true,n=0;while(change&&n++<10){change=false;for(let xx of [x-h,x+h]){let yy=freeY(layout,best.r,xx,swap);if(yy===null)continue;let p={r:best.r,x:swap?yy:xx,y:swap?xx:yy},s=score(p,layout,mode);if(s<bestScore-1e-6&&validate([...layout,p],vs,c).ok){best=p;bestScore=s;x=xx;change=true}}}}return best;}
 function add(layout,name){layout=normalize(layout);if(!layout.length||!validate(layout,vs,c).ok)return;const signature=layout.map(a=>[a.r,a.x.toFixed(1),a.y.toFixed(1)].join(',')).sort().join(';');if(results.some(a=>a.signature===signature))return;results.push({layout,name,signature,...dims(layout,vs)});results.sort((a,b)=>compare(a.layout,b.layout,vs));if(results.length>16)results.pop();}
 let rectangular=0;for(let r of c.angles){const v=vs[r/90],nx=Math.max(0,Math.floor((c.W+radius)/(v.w+radius))),ny=Math.max(0,Math.floor((c.H+radius)/(v.h+radius))),l=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)l.push({r,x:i*(v.w+radius),y:j*(v.h+radius)});rectangular=Math.max(rectangular,l.length);add(l,'تكرار منتظم '+r+'°');}
 const total=c.angles.length*(c.deep?6:4);let done=0;for(let first of c.angles)for(let mode=0;mode<(c.deep?3:2);mode++)for(let swap of [false,true]){let layout=[];const v=vs[first/90];if(v.w<=c.W&&v.h<=c.H)layout.push({r:first,x:0,y:0});const ordered=[first,...c.angles.filter(r=>r!==first)];while(layout.length&&layout.length<maxParts){let p=findBest(layout,swap,mode,ordered);if(!p)break;if(!validate([...layout,p],vs,c).ok)break;layout.push(p);}add(layout,'تعشيق هندسي · '+(swap?'أعمدة':'صفوف')+' · '+first+'°');onProgress({done:++done,total,best:results[0]?.layout.length||0});}
 const seeds=results.slice(0,8).filter(a=>a.layout.length>=2);for(let seed of seeds){let pair=seed.layout.slice(0,2),base=normalize(pair),d=dims(base,vs),layout=[];const nx=Math.floor((c.W+radius)/(d.w+radius)),ny=Math.floor((c.H+radius)/(d.h+radius));for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)for(let a of base)layout.push({...a,x:a.x+x*(d.w+radius),y:a.y+y*(d.h+radius)});if(layout.length){while(layout.length<maxParts){let p=findBest(layout,false,0,c.angles);if(!p||!validate([...layout,p],vs,c).ok)break;layout.push(p)}add(layout,'تعشيق أزواج متكررة')}}
 return {results:results.slice(0,6).map(({signature,...a})=>a),rectangular,area:area(T.polygon),safety:SAFETY,variants:vs};
}
return {regularSolution,makeVariants,makePairNFP,solve,validate,pairCheck,slice,area,dims,SAFETY};
})();
globalThis.MahabaNestEngine=NestEngine;
if(typeof module!=='undefined')module.exports=NestEngine;
