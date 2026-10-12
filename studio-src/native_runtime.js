import * as THREE from 'three';
import {attachGpu,updateGpu} from './native_gpu.js';
export function sampleTrack(track,time){
 const {times,values,width,interpolation}=track;
 let i=0;while(i<times.length-1&&times[i+1]<=time)i++;
 if(i===times.length-1)return values.slice(i*width,(i+1)*width);
 const dt=times[i+1]-times[i],alpha=interpolation[i]==='STEP'||dt===0?0:Math.max(0,(time-times[i])/dt);
 return Array.from({length:width},(_,k)=>values[i*width+k]+(values[(i+1)*width+k]-values[i*width+k])*alpha);
}
export function deformVertex(position,normal,infos,points,props){
 let weight=0,offset=[0,0,0],norm=[0,0,0];
 for(let c=0;c<4;c++){
  const a=infos[c*4],b=infos[c*4+1],s=infos[c*4+2],idx=Math.round(infos[c*4+3]);
  if(idx<0)continue;const lower=props[idx*3],upper=props[idx*3+1],span=props[idx*3+2];
  if(s<=lower||s>upper||upper<=lower)continue;
  const t=(s-lower)/(upper-lower),u=1-t;
  const basis=[u*u*u,3*u*u*t,3*u*t*t,t*t*t],deriv=[-3*u*u,3*u*u-6*u*t,6*u*t-3*t*t,3*t*t];
  let x=0,y=0,tx=0,ty=0;
  for(let j=0;j<4;j++){x+=basis[j]*points[idx*8+j*2];y+=basis[j]*points[idx*8+j*2+1];tx+=deriv[j]*points[idx*8+j*2];ty+=deriv[j]*points[idx*8+j*2+1];}
  const d=x-(s-lower)*span;
  offset[0]+=t*(d*a+y*normal[0]);offset[1]+=t*(d*b+y*normal[1]);offset[2]+=t*y*normal[2];weight+=t;
  const n=[-ty*a+tx*normal[0],-ty*b+tx*normal[1],tx*normal[2]],len=Math.hypot(...n)||1;
  for(let k=0;k<3;k++)norm[k]+=n[k]/len;
 }
 if(!weight)return {delta:[0,0,0],normal};
 const length=Math.hypot(...norm)||1;
 return {delta:offset.map(x=>x/weight),normal:norm.map(x=>x/length)};
}
const axis=new THREE.Vector3(),quaternion=new THREE.Quaternion();
const get=(values,name,fallback=[])=>values[name+'_Uni']?.length?values[name+'_Uni']:fallback;
export function extraDeformation(position,normal,original,attributes,index,values){
 const type=get(values,'opDeformType',[0])[0];if(type===0)return {position,normal};const p=new THREE.Vector3(...position),n=new THREE.Vector3(...normal);
 if(type===1){
  const [dx,dy,origin,curvature]=get(values,'cylinderData',[0,0,0,0]);
  if(Math.abs(curvature)>1e-12){const distance=original[0]*dx+original[1]*dy-origin,angle=distance*curvature;
   const base=new THREE.Vector3(original[0]-dx*(distance-Math.sin(angle)/curvature),original[1]-dy*(distance-Math.sin(angle)/curvature),(1-Math.cos(angle))/curvature);
   axis.set(-dy,dx,0).normalize();quaternion.setFromAxisAngle(axis,-angle);
   p.sub(new THREE.Vector3(original[0],original[1],0)).applyQuaternion(quaternion).add(base);n.applyQuaternion(quaternion);
  }
 }else if(type===3){
  const [cx,cy,dx,dy]=get(values,'coneDesignPos',[0,0,1,0]),bend=get(values,'coneBending',[0])[0],cos=Math.cos(bend);
  const v=new THREE.Vector2(original[0]-cx,original[1]-cy);
  if(v.lengthSq()>1e-6&&Math.abs(cos)>1e-7){v.normalize();const angle=Math.atan2(-v.x*dy+v.y*dx,v.x*dx+v.y*dy),center=new THREE.Vector3(cx,cy,0);
   p.sub(center);axis.set(0,0,1);quaternion.setFromAxisAngle(axis,-angle);p.applyQuaternion(quaternion);n.applyQuaternion(quaternion);
   axis.set(-dx*Math.sin(bend),-dy*Math.sin(bend),cos).normalize();quaternion.setFromAxisAngle(axis,angle/cos);p.applyQuaternion(quaternion).add(center);n.applyQuaternion(quaternion);
  }
 }else if(type===2){
  const angles=get(values,'curvedData',[0,0,0,0]),sum=angles[0]?n.clone():new THREE.Vector3();let displacement=0,low=0,high=0;
  for(let c=0;c<4;c++){
   const info=attributes['curvedInfo'+c],ni=attributes['curvedNormInfo'+c],angle=angles[c];if(!angle||!info||!ni)continue;
   const [offset,weight]=info.array.slice(index*2,index*2+2),d=offset*Math.tan(Math.abs(angle-Math.PI)<1e-8?0:angle/2);
   displacement+=weight*d;low=Math.min(low,d);high=Math.max(high,d);
   const w=weight*Math.sin(angle);if(w){const [tilt,length,heading]=ni.array.slice(index*3,index*3+3),sign=Math.sign(normal[2]),tangent=new THREE.Vector3(0,Math.cos(tilt),Math.sin(tilt)),bitangent=new THREE.Vector3(length||1,0,length?weight*d*sign:0).normalize();
    const modified=bitangent.cross(tangent).applyAxisAngle(new THREE.Vector3(0,0,1),heading).multiplyScalar(sign);sum.add(n.clone().lerp(modified,w));}
  }
  p.z+=Math.max(low,Math.min(high,displacement));n.add(sum).normalize();
 }else if(type!==0)throw Error('Unsupported deformation type '+type);
 return {position:p.toArray(),normal:n.normalize().toArray()};
}
function transform(kind,values){
 const m=new THREE.Matrix4();
 if(kind==='matrix')return m.set(...values);
 if(kind==='translate')return m.makeTranslation(...values);
 if(kind==='scale')return m.makeScale(...values);
 if(kind==='rotate'){axis.set(...values.slice(0,3));if(axis.lengthSq())m.makeRotationAxis(axis.normalize(),values[3]*Math.PI/180);}
 return m;
}
export function buildNativeModel(data,materials,{gpu=false}={}){
 const root=new THREE.Group();root.scale.setScalar(data.unitMeter);
 if(data.upAxis==='Z_UP')root.rotation.x=-Math.PI/2;else if(data.upAxis==='X_UP')root.rotation.z=Math.PI/2;
 const nodes=[],meshes=[];
 function walk(source,parent){
  const group=new THREE.Group();group.name=source.id;group.matrixAutoUpdate=false;parent.add(group);nodes.push({source,group});
  if(source.geometry){
   const original=data.geometries[source.geometry],geometry=new THREE.BufferGeometry(),attributes=original.attributes;
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(attributes.POSITION.array,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(attributes.NORMAL.array,3));geometry.setIndex(original.index);
   const slots=Object.keys(source.bindings),count=attributes.POSITION.array.length/3,uvs=Array.from({length:4},()=>new Float32Array(count*2));
   const meshMaterials=slots.map(symbol=>materials[source.bindings[symbol]]);
   for(const part of original.groups){const slot=slots.indexOf(part.symbol);if(slot<0)throw Error('Missing material binding: '+part.symbol);geometry.addGroup(part.start,part.count,slot);
    const mat=data.materials[source.bindings[part.symbol]],values=mat.values,design=get(values,'vertexToDesignMatrix',[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    const matrix=new THREE.Matrix4().set(...design),keys=Object.keys(values),pick=prefix=>values[keys.find(k=>k.startsWith(prefix)&&k.includes('TexMatrix'))];
    const mapping=[pick('matDiff'),pick('appBump'),pick('matORM'),values.sheetTexMatrix_Uni];
    for(let j=part.start;j<part.start+part.count;j++){
     const i=original.index[j],p=new THREE.Vector3().fromArray(attributes.POSITION.array,i*3).applyMatrix4(matrix);
     for(let k=0;k<4;k++){const m=mapping[k];if(m?.length===8){uvs[k][i*2]=m[0]*p.x+m[1]*p.y+m[2]*p.z+m[3];uvs[k][i*2+1]=m[4]*p.x+m[5]*p.y+m[6]*p.z+m[7];}}
    }
   }
   for(let i=0;i<4;i++)geometry.setAttribute(i?'uv'+i:'uv',new THREE.BufferAttribute(uvs[i],2));
   const mesh=new THREE.Mesh(geometry,meshMaterials);mesh.name=source.geometry;mesh.castShadow=meshMaterials.some(m=>!m.transparent);mesh.receiveShadow=true;group.add(mesh);
   const values=data.materials[source.bindings[slots[0]]].values;const active=[];for(let i=0;i<count;i++)if([0,1,2,3].some(c=>(attributes['crInfo'+c]?.array[i*4+3]??-1)>=0))active.push(i);const uniforms=gpu?attachGpu(mesh,attributes,values):null;meshes.push({source,mesh,original,values,active,uniforms});
  }
  for(const child of source.children)walk(child,group);
 }
 walk(data.node,root);const model={root,nodes,meshes,data,gpu};setNativeTime(model,data.duration);return model;
}
export function setNativeTime(model,time){
 model.time=time;
 for(const {source,group} of model.nodes){
  group.visible=source.tracks?.visibility?sampleTrack(source.tracks.visibility,time)[0]>.5:true;
  group.matrix.identity();const used=new Set(),tracks=source.tracks||{};
  for(const t of source.transforms||[]){const key=tracks[t.sid]?t.sid:tracks[t.kind]?t.kind:null;const values=key?sampleTrack(tracks[key],time):t.value;if(key)used.add(key);group.matrix.multiply(transform(t.kind,values));}
  for(const key of ['matrix','translate','rotate','scale'])if(tracks[key]&&!used.has(key))group.matrix.multiply(transform(key,sampleTrack(tracks[key],time)));
  group.matrixWorldNeedsUpdate=true;
 }
 model.root.updateMatrixWorld(true);
}
export function disposeNativeModel(model){model.root.traverse(o=>{o.geometry?.dispose();if(model.gpu&&o.isMesh){o.material.forEach(m=>m.dispose());o.customDepthMaterial?.dispose();o.customDistanceMaterial?.dispose();}});}
export function visibleBounds(model){const box=new THREE.Box3();model.root.updateMatrixWorld(true);model.root.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o)});return box;}
