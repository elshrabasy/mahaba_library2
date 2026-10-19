import {validArtworkTransform} from './artwork-placement.js?v=transform-1';

// Shared contract between CAD models, artwork, project files and nesting.
export const FORMAT='MahabatLibraryStudio/1';
export function resolveSurface(values,data){
 const m=values.sheetTexMatrix_Uni;if(!m||m.length!==8||!m.every(Number.isFinite))return null;
 const sx=Math.hypot(...m.slice(0,3)),sy=Math.hypot(...m.slice(4,7)),unit=data.unitMeter*1000;if(sx<=0||sy<=0)return null;
 const width=unit/sx,height=unit/sy;
 const matches=data.drawings.map((d,i)=>({i,error:Math.max(Math.abs(width-d.objRectWidth),Math.abs(height-d.objRectHeight))})).filter(x=>x.error<.1);
 if(matches.length!==1)return null;
 const determinant=m[0]*m[5]-m[1]*m[4];if(Math.abs(determinant)<1e-12)return null;
 return {drawing:matches[0].i,side:determinant>0?'outside':'inside',width,height};
}
export function newLayer(){return {image:null,foil:null,uv:null,scale:100,x:0,y:0,angle:0,finish:'satin',foilColor:'#d7ad55',stock:'source'};}
export function layerKey(drawing,side){return drawing+':'+side;}
// Merge adjacent triangulation faces only when their exact union is convex.
// Coordinates and outer cut contour remain unchanged; no bounding-box approximation.
export function convexPartition(polygon,triangles){
 let faces=triangles.map(t=>[...t]);
 const convex=ids=>{let sign=0;for(let i=0;i<ids.length;i++){const a=polygon[ids[i]],b=polygon[ids[(i+1)%ids.length]],c=polygon[ids[(i+2)%ids.length]],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<1e-10)continue;const s=Math.sign(cross);if(sign&&sign!==s)return false;sign=s;}return !!sign;};
 for(;;){const edges=new Map();let merged=false;
  outer:for(let f=0;f<faces.length;f++){const a=faces[f];for(let i=0;i<a.length;i++){const u=a[i],v=a[(i+1)%a.length],opposite=edges.get(v+':'+u);if(opposite){const [g,j]=opposite,b=faces[g],ids=[];for(let k=1;k<=a.length;k++)ids.push(a[(i+k)%a.length]);for(let k=2;k<b.length;k++)ids.push(b[(j+k)%b.length]);if(new Set(ids).size===ids.length&&convex(ids)){faces[g]=ids;faces.splice(f,1);merged=true;break outer;}}edges.set(u+':'+v,[f,i]);}}
  if(!merged)break;
 }
 return faces.map(ids=>ids.map(i=>polygon[i]));
}
export function validateProject(p){
 if(!p||p.format!==FORMAT||typeof p.code!=='string'||!/^[-A-Za-z0-9_.#]{1,100}$/.test(p.code)||!Array.isArray(p.layers))throw Error('صيغة المشروع أو القالب غير صالحة.');
 if(p.parameters!==undefined&&(!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters)||Object.entries(p.parameters).some(([k,v])=>!/^[A-Za-z0-9_.]+$/.test(k)||!Number.isFinite(v)||v<=0)))throw Error('مقاسات المشروع غير صالحة.');
 if(p.layers.length>512)throw Error('عدد الأجزاء غير صالح.');
 const seen=new Set();for(const [key,s] of p.layers){if(typeof key!=='string'||!/^\d+:(outside|inside)$/.test(key)||seen.has(key)||!s)throw Error('بيانات الأجزاء غير صالحة.');seen.add(key);
 for(const k of ['scale','x','y','angle'])if(!Number.isFinite(s[k]))throw Error('موضع التصميم غير صالح.');
 if(s.scale<5||s.scale>500||Math.abs(s.x)>2000||Math.abs(s.y)>2000||Math.abs(s.angle)>36000)throw Error('موضع التصميم خارج المجال.');
 if(s.effectTransforms!==undefined&&(!s.effectTransforms||typeof s.effectTransforms!=='object'||Array.isArray(s.effectTransforms)||Object.entries(s.effectTransforms).some(([kind,transform])=>!['foil','uv'].includes(kind)||!validArtworkTransform(transform))))throw Error('موضع التشطيب غير صالح.');
 if(!['matte','satin','gloss'].includes(s.finish)||!['source','white','kraft'].includes(s.stock)||!/^#[a-f\d]{6}$/i.test(s.foilColor))throw Error('إعداد الخامة غير صالح.');
 for(const k of ['image','foil','uv'])if(s[k]!==null&&(typeof s[k]!=='string'||!/^data:image\/(png|jpeg);base64,/.test(s[k])||s[k].length>15000000))throw Error('الصورة المحفوظة غير صالحة.');}
 if(p.camera&&(!Array.isArray(p.camera.position)||p.camera.position.length!==3||!p.camera.position.every(Number.isFinite)||!Array.isArray(p.camera.target)||p.camera.target.length!==3||!p.camera.target.every(Number.isFinite)||!Array.isArray(p.camera.up)||p.camera.up.length!==3||!p.camera.up.every(Number.isFinite)))throw Error('الكاميرا غير صالحة.');
 if(p.camera?.pivot&&(!Array.isArray(p.camera.pivot)||p.camera.pivot.length!==3||!p.camera.pivot.every(Number.isFinite)))throw Error('محور الدوران غير صالح.');
 if(p.phase!==undefined&&!['all','0','1','2','3','4'].includes(p.phase))throw Error('مرحلة الطي غير صالحة.');
 if(p.fold!==undefined&&(!Number.isFinite(p.fold)||p.fold<0||p.fold>1))throw Error('حالة الطي غير صالحة.');return p;
}

export function mainParameters(parameters){const map=parameters?.paramMap||{},keys=new Set();for(const d of parameters?.drawInfos||[])for(const g of d.groups||[])if(g.groupId==='main')for(const k of g.paramKeys||[])keys.add(k);return [...keys].map(key=>({key,...map[key]})).filter(p=>!p.values&&Number.isFinite(p.value)&&p.value>0);}
export function svgDrawing(t){const lines=(a,color)=>a.map(p=>`<polyline fill="none" stroke="${color}" stroke-width="0.2" points="${p.map(q=>q.join(',')).join(' ')}"/>`).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}mm" height="${t.height}mm" viewBox="0 0 ${t.width} ${t.height}">${lines(t.cuts,'#ed2525')}${lines(t.creases,'#13a454')}</svg>`;}
export function pdfDrawing(t){const k=72/25.4,w=t.width*k,h=t.height*k;let stream='0.3 w\n';for(const [list,color] of [[t.cuts,'1 0 0'],[t.creases,'0 .6 0']]){stream+=color+' RG\n';for(const p of list){stream+=p.map((q,i)=>`${(q[0]*k).toFixed(4)} ${(h-q[1]*k).toFixed(4)} ${i?'l':'m'}`).join('\n')+'\nS\n';}}const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(4)} ${h.toFixed(4)}] /Resources << >> /Contents 4 0 R >>`,`<< /Length ${stream.length} >>\nstream\n${stream}endstream`];let out='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=out.length;out+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;return out;}
export function extractCadSheet(text,d){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml'),svg=document.importNode(doc.documentElement,true);svg.style.cssText='position:fixed;left:-100000px;visibility:hidden';document.body.append(svg);const cuts=[],creases=[];
 try{for(const el of svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')){let style=el.getAttribute('ev-style')||el.closest('[ev-style-name]')?.getAttribute('ev-style-name')||'';if(!style){for(let n=el;n&&n!==svg;n=n.parentElement)style+=' '+[...n.attributes].filter(a=>/style.*name/i.test(a.name)).map(a=>a.value).join(' ');}if(/annotation/i.test(style)||el.closest('[ev-style-annotation="true"]'))continue;const target=/Creasing|V-Cut/i.test(style)?creases:/Cutting|Bevel Cut/i.test(style)?cuts:null;if(!target||!el.getTotalLength)continue;const len=el.getTotalLength();if(!Number.isFinite(len)||len<=1e-10)continue;const steps=el.tagName==='line'?1:Math.max(1,Math.ceil(len/.5)),points=[];for(let i=0;i<=steps;i++){let q=el.getPointAtLength(len*i/steps);const matrix=el.getCTM?.();if(matrix){q={x:matrix.a*q.x+matrix.c*q.y+matrix.e,y:matrix.b*q.x+matrix.d*q.y+matrix.f};}points.push([q.x,q.y]);}target.push(points);}}
 finally{svg.remove();}
 // getCTM already converts the source CAD axes into SVG screen coordinates.
 // Normalize that orientation without applying a second vertical reflection.
 if(!cuts.length)throw Error('لم يُعثر على خطوط القص في الرسم.');const ps=cuts.flat(),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),w=d.objRectWidth,h=d.objRectHeight;for(const list of [cuts,creases])for(const p of list)for(const q of p){q[0]=(q[0]-xmin)*w/(xmax-xmin);q[1]=(q[1]-ymin)*h/(ymax-ymin);}
 // Recover planar faces from source cut segments; select the outer occupied face.
 const nodes=[],edges=new Set(),node=p=>{let i=nodes.findIndex(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<.035);if(i<0){i=nodes.length;nodes.push(p);}return i;};for(const line of cuts)for(let i=1;i<line.length;i++){const a=node(line[i-1]),b=node(line[i]);if(a!==b)edges.add([Math.min(a,b),Math.max(a,b)].join(':'));}const split=new Set();for(const e of edges){const [u,v]=e.split(':').map(Number),a=nodes[u],b=nodes[v],dx=b[0]-a[0],dy=b[1]-a[1],dd=dx*dx+dy*dy,ps=[[0,u],[1,v]];nodes.forEach((q,i)=>{const t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/dd;if(t>.00001&&t<.99999&&Math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy)<.035)ps.push([t,i]);});ps.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ps.length;i++)split.add([Math.min(ps[i-1][1],ps[i][1]),Math.max(ps[i-1][1],ps[i][1])].join(':'));}
 const ns=nodes.map(()=>[]);for(const e of split){const [a,b]=e.split(':').map(Number);ns[a].push(b);ns[b].push(a);}ns.forEach((a,u)=>a.sort((x,y)=>Math.atan2(nodes[x][1]-nodes[u][1],nodes[x][0]-nodes[u][0])-Math.atan2(nodes[y][1]-nodes[u][1],nodes[y][0]-nodes[u][0])));const seen=new Set(),loops=[],area=p=>Math.abs(p.reduce((s,q,i)=>{const r=p[(i+1)%p.length];return s+q[0]*r[1]-r[0]*q[1];},0)/2);for(const e of split)for(const start of [e.split(':').map(Number),e.split(':').map(Number).reverse()]){let [a,b]=start,path=[];for(let i=0;i<split.size*2+1;i++){const k=a+':'+b;if(seen.has(k))break;seen.add(k);path.push(nodes[a]);const list=ns[b],c=list[(list.indexOf(a)-1+list.length)%list.length];a=b;b=c;if(a===start[0]&&b===start[1]){if(area(path)>.01)loops.push(path);break;}}}loops.sort((a,b)=>area(b)-area(a));if(!loops.length)throw Error('محيط القص غير مغلق.');let polygon=loops[0];for(let i=0;i<polygon.length;i++)for(let j=i+2;j<polygon.length;j++)if(Math.hypot(polygon[i][0]-polygon[j][0],polygon[i][1]-polygon[j][1])<.035&&area(polygon.slice(i,j))<area(polygon)/2){polygon=polygon.slice(0,i+1).concat(polygon.slice(j+1));i=-1;break;}return {name:d.name,width:w,height:h,polygon,cuts,creases,area:area(polygon),nestingSupported:loops.filter(p=>area(p)>.1).length<=2};
}
