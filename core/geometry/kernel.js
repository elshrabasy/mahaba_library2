// Mahabat Engineering Core V1 — deterministic 2D geometry primitives.
// No DOM, Three.js or Studio dependencies. Units are millimetres.
const EPS=1e-9;
export const point=(x,y)=>[Number(x),Number(y)];
export const clonePoint=p=>[Number(p[0]),Number(p[1])];
export const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export const line=(a,b,meta={})=>({a:clonePoint(a),b:clonePoint(b),...meta});
export const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(clonePoint);
export function bbox(points=[]){if(!points.length)return {minX:0,minY:0,maxX:0,maxY:0,width:0,height:0};const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};}
export function signedArea(poly=[]){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;}
export const area=poly=>Math.abs(signedArea(poly));
export function perimeter(poly=[]){let n=0;for(let i=0;i<poly.length;i++)n+=dist(poly[i],poly[(i+1)%poly.length]);return n;}
export function pathLength(path={}){if(Array.isArray(path.points)){let n=0;for(let i=1;i<path.points.length;i++)n+=dist(path.points[i-1],path.points[i]);if(path.closed&&path.points.length>2)n+=dist(path.points.at(-1),path.points[0]);return n;}if(path.arc){const a0=Math.atan2(path.a[1]-path.arc.c[1],path.a[0]-path.arc.c[0]),a1=Math.atan2(path.b[1]-path.arc.c[1],path.b[0]-path.arc.c[0]);let d=a1-a0;const sweep=path.arc.sweep??0;if(sweep){while(d<0)d+=Math.PI*2;}else{while(d>0)d-=Math.PI*2;}return Math.abs(d)*path.arc.r;}return path.a&&path.b?dist(path.a,path.b):0;}
function orient(a,b,c){const v=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);return Math.abs(v)<EPS?0:Math.sign(v);}
function onSegment(a,b,p){return Math.min(a[0],b[0])-EPS<=p[0]&&p[0]<=Math.max(a[0],b[0])+EPS&&Math.min(a[1],b[1])-EPS<=p[1]&&p[1]<=Math.max(a[1],b[1])+EPS&&orient(a,b,p)===0;}
export function segmentsIntersect(a,b,c,d,{allowTouch=true}={}){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);if(o1!==o2&&o3!==o4)return true;if(!allowTouch)return false;return (o1===0&&onSegment(a,b,c))||(o2===0&&onSegment(a,b,d))||(o3===0&&onSegment(c,d,a))||(o4===0&&onSegment(c,d,b));}
export function selfIntersections(poly=[]){const hits=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];for(let j=i+1;j<poly.length;j++){if(j===i||j===(i+1)%poly.length||(j+1)%poly.length===i)continue;const c=poly[j],d=poly[(j+1)%poly.length];if(segmentsIntersect(a,b,c,d,{allowTouch:false}))hits.push([i,j]);}}return hits;}
export function validatePolygon(poly,{minArea=.001}={}){const errors=[];if(!Array.isArray(poly)||poly.length<3)errors.push('polygon.requires_three_points');else{if(poly.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(+p[0])||!Number.isFinite(+p[1])))errors.push('polygon.invalid_point');if(area(poly)<minArea)errors.push('polygon.zero_area');if(selfIntersections(poly).length)errors.push('polygon.self_intersection');}return {ok:errors.length===0,errors};}
export function normalizeClockwise(poly=[]){const out=poly.map(clonePoint);return signedArea(out)>0?out.reverse():out;}
export function polygonCentroid(poly=[]){const A=signedArea(poly);if(Math.abs(A)<EPS){const b=bbox(poly);return [b.minX+b.width/2,b.minY+b.height/2];}let cx=0,cy=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],f=p[0]*q[1]-q[0]*p[1];cx+=(p[0]+q[0])*f;cy+=(p[1]+q[1])*f;}return [cx/(6*A),cy/(6*A)];}
export function polyline(points,meta={}){const out=[];for(let i=1;i<points.length;i++)out.push(line(points[i-1],points[i],meta));return out;}
export const GeometryKernel={EPS,point,line,rect,bbox,signedArea,area,perimeter,pathLength,segmentsIntersect,selfIntersections,validatePolygon,normalizeClockwise,polygonCentroid,polyline};