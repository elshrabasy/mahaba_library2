// Mahabat Engine panel graph -> existing Mahaba Library native 3D schema.
// Reuses native_runtime.js / SharedStudio instead of introducing a second 3D viewer.

const EPS=1e-9;
const signedArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;

function cleanPolygon(poly){
 const out=[];
 for(const p of poly||[]){
  const q=[Number(p[0]),Number(p[1])];
  if(!q.every(Number.isFinite))continue;
  if(!out.length||Math.hypot(q[0]-out.at(-1)[0],q[1]-out.at(-1)[1])>1e-7)out.push(q);
 }
 if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<1e-7)out.pop();
 if(out.length<3)throw new Error('لوحة ثلاثية الأبعاد بلا محيط صالح.');
 return out;
}

function pointInTriangle(p,a,b,c){
 const cross=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);
 const d1=cross(a,b,p),d2=cross(b,c,p),d3=cross(c,a,p),neg=d1<-EPS||d2<-EPS||d3<-EPS,pos=d1>EPS||d2>EPS||d3>EPS;
 return !(neg&&pos);
}

export function triangulatePolygon(source){
 let poly=cleanPolygon(source),order=poly.map((_,i)=>i);
 if(signedArea(poly)<0)order.reverse();
 const triangles=[],cross=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
 let guard=0;
 while(order.length>3&&guard++<10000){
  let found=false;
  for(let i=0;i<order.length;i++){
   const ia=order[(i-1+order.length)%order.length],ib=order[i],ic=order[(i+1)%order.length],a=poly[ia],b=poly[ib],c=poly[ic];
   if(cross(a,b,c)<=EPS)continue;
   if(order.some(j=>j!==ia&&j!==ib&&j!==ic&&pointInTriangle(poly[j],a,b,c)))continue;
   triangles.push([ia,ib,ic]);order.splice(i,1);found=true;break;
  }
  if(!found)throw new Error('تعذر تقسيم إحدى لوحات القالب إلى مثلثات دون تغيير المحيط.');
 }
 if(order.length===3)triangles.push([...order]);
 return {polygon:poly,triangles};
}

function panelGeometry(panel,thickness){
 const {polygon,triangles}=triangulatePolygon(panel.poly),n=polygon.length,z=thickness/2;
 const positions=[],normals=[],index=[],groups=[];
 const push=(p,nrm)=>{positions.push(...p);normals.push(...nrm);return positions.length/3-1;};
 const front=polygon.map(p=>push([p[0],p[1],z],[0,0,1]));
 const back=polygon.map(p=>push([p[0],p[1],-z],[0,0,-1]));
 const fStart=index.length;
 for(const t of triangles)index.push(front[t[0]],front[t[1]],front[t[2]]);
 groups.push({symbol:'OUT',start:fStart,count:index.length-fStart});
 const bStart=index.length;
 for(const t of triangles)index.push(back[t[2]],back[t[1]],back[t[0]]);
 groups.push({symbol:'IN',start:bStart,count:index.length-bStart});
 const eStart=index.length;
 for(let i=0;i<n;i++){
  const a=polygon[i],b=polygon[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nrm=[dy/len,-dx/len,0];
  const v0=push([a[0],a[1],z],nrm),v1=push([b[0],b[1],z],nrm),v2=push([b[0],b[1],-z],nrm),v3=push([a[0],a[1],-z],nrm);
  index.push(v0,v1,v2,v0,v2,v3);
 }
 groups.push({symbol:'EDGE',start:eStart,count:index.length-eStart});
 return {attributes:{POSITION:{array:positions},NORMAL:{array:normals}},index,groups};
}

function interval(stages,name,duration){
 const v=stages?.[name];
 if(Array.isArray(v)&&v.length===2)return v;
 return [0,duration||1];
}

function foldNode(panel,geometryId,stages,duration){
 const node={id:panel.id,geometry:geometryId,children:[],bindings:{OUT:'outside',IN:'inside',EDGE:'edge'},transforms:[],tracks:{}};
 if(!panel.hinge)return node;
 const [a,b]=panel.hinge,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,axis=[dx/len,dy/len,0],range=interval(stages,panel.stage,duration),angle=Number(panel.angle??90);
 node.transforms=[
  {kind:'translate',sid:'hinge-in',value:[a[0],a[1],0]},
  {kind:'rotate',sid:'fold',value:[...axis,0]},
  {kind:'translate',sid:'hinge-out',value:[-a[0],-a[1],0]}
 ];
 node.tracks.fold={times:[range[0],range[1]],values:[...axis,0,...axis,angle],width:4,interpolation:['LINEAR']};
 return node;
}

function materialValues(width,height,side,color){
 const outside=side==='outside',sx=(outside?1:-1)/width,tx=outside?0:1;
 return {
  albedoColor_Uni:[...color,1],orm_Uni:[1,.72,0,1],
  vertexToDesignMatrix_Uni:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  sheetTexMatrix_Uni:[sx,0,0,tx,0,1/height,0,0],
  opDeformType_Uni:[0]
 };
}

export function buildMahabatNative(result){
 const panels=result.panels||result.panelGraph;
 if(!Array.isArray(panels)||!panels.length)throw new Error('Mahabat Engine لم يُرجع panel graph للعرض ثلاثي الأبعاد.');
 const width=Number(result.width),height=Number(result.height),thickness=Number(result.material?.thickness||result.mat?.thickness||.5);
 if(!(width>0&&height>0&&thickness>0))throw new Error('أبعاد أو سماكة النموذج غير صالحة.');
 const geometries={},nodes=new Map(),duration=Number(result.animations?.endTime||5);
 for(const p of panels){const id=`mahaba-panel-${p.id}`,gid=`mahaba-geo-${p.id}`;geometries[gid]=panelGeometry(p,thickness);nodes.set(p.id,foldNode(p,gid,result.stages,duration));}
 const root={id:'__scene',children:[],transforms:[]};
 for(const p of panels){const n=nodes.get(p.id);if(p.parent&&nodes.has(p.parent))nodes.get(p.parent).children.push(n);else root.children.push(n);}
 const kraft=[.69,.51,.31];
 return {
  schema:1,source:'mahabat-engine',code:result.code,templateId:`mahabat:${result.code}`,resourceVariant:'mahabat',
  sourceSHA256:`mahabat:${result.code}:${result.version||'pilot'}`,unitMeter:.001,upAxis:'Z_UP',duration,
  node:root,geometries,
  materials:{
   outside:{values:materialValues(width,height,'outside',kraft),maps:{}},
   inside:{values:materialValues(width,height,'inside',[.76,.62,.44]),maps:{}},
   edge:{values:{albedoColor_Uni:[.42,.29,.16,1],orm_Uni:[1,.92,0,1],opDeformType_Uni:[0]},maps:{}}
  },
  materialInfo:result.material||result.mat||{},
  drawings:[{name:result.name||result.code,objRectWidth:width,objRectHeight:height,available:true,mahabaPartIndex:0,source:'mahabat-engine'}],
  mahabaGeometry:[{name:result.name||result.code,width,height,lines:result.lines,outline:result.outline,panels}],
  parameters:result.parameters,
  requestedParameters:result.input||{},validation:result.validation,
  animations:result.animations||{endTime:duration,phases:[]},stages:result.stages||{},metadata:{dimensionType:result.dimensionType,fluteDirection:result.fluteDirection}
 };
}
