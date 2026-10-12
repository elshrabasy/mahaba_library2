import * as T from 'three';
// Independent implementation of the source deformation data. Shared with the
// depth/distance pass so the folded silhouette also produces the correct shadow.
const code=`
attribute vec4 crA;attribute vec4 crB;attribute vec4 crC;attribute vec4 crD;
attribute vec4 cvAB;attribute vec4 cvCD;
attribute vec4 cnA;attribute vec4 cnB;attribute vec4 cnC;
uniform vec2 evPoints[64];uniform vec3 evProps[16];
uniform float evType;uniform vec4 evCylinder;uniform vec4 evCone;uniform float evBend;uniform vec4 evCurved;
vec3 evRotate(vec3 p,vec3 a,float t){a=normalize(a);return p*cos(t)+cross(a,p)*sin(t)+a*dot(a,p)*(1.-cos(t));}
void evCrease(vec4 info,vec3 norm,inout vec3 delta,inout vec3 normals,inout float weight){
 int i=int(floor(info.w+.5));if(i<0||i>=16)return;vec3 prop=evProps[i];
 if(info.z<=prop.x||info.z>prop.y||prop.y<=prop.x)return;
 float t=(info.z-prop.x)/(prop.y-prop.x),u=1.-t;int k=i*4;
 vec2 p=u*u*u*evPoints[k]+3.*u*u*t*evPoints[k+1]+3.*u*t*t*evPoints[k+2]+t*t*t*evPoints[k+3];
 vec2 d=-3.*u*u*evPoints[k]+(3.*u*u-6.*u*t)*evPoints[k+1]+(6.*u*t-3.*t*t)*evPoints[k+2]+3.*t*t*evPoints[k+3];
 float x=p.x-(info.z-prop.x)*prop.z;delta+=t*(vec3(info.xy*x,0.)+p.y*norm);weight+=t;
 vec3 n=vec3(-d.y*info.xy,0.)+d.x*norm;float len=length(n);normals+=n/max(len,1.e-12);
}
void evCurve(vec2 info,vec3 ni,float angle,vec3 norm,inout float dz,inout float lo,inout float hi,inout vec3 sum){
 if(angle==0.)return;float d=info.x*tan(abs(angle-3.141592653589793)<1.e-8?0.:angle*.5);
 dz+=info.y*d;lo=min(lo,d);hi=max(hi,d);float w=info.y*sin(angle);
 if(w!=0.){vec3 tangent=vec3(0.,cos(ni.x),sin(ni.x));vec3 bitangent=normalize(vec3(ni.y==0.?1.:ni.y,0.,ni.y==0.?0.:info.y*d*sign(norm.z)));vec3 modified=evRotate(cross(bitangent,tangent),vec3(0.,0.,1.),ni.z)*sign(norm.z);sum+=mix(norm,modified,w);}
}
void evEvaluate(vec3 original,vec3 origNormal,out vec3 p,out vec3 n){
 vec3 delta=vec3(0.),normals=vec3(0.);float weight=0.;
 evCrease(crA,origNormal,delta,normals,weight);evCrease(crB,origNormal,delta,normals,weight);evCrease(crC,origNormal,delta,normals,weight);evCrease(crD,origNormal,delta,normals,weight);
 p=original+(weight>0.?delta/weight:vec3(0.));n=weight>0.?normals/max(length(normals),1.e-12):origNormal;
 if(evType==1.&&abs(evCylinder.w)>1.e-12){float dist=dot(original.xy,evCylinder.xy)-evCylinder.z;float angle=dist*evCylinder.w;vec3 base=vec3(original.xy-evCylinder.xy*(dist-sin(angle)/evCylinder.w),(1.-cos(angle))/evCylinder.w);vec3 axis=vec3(-evCylinder.y,evCylinder.x,0.);p=evRotate(p-vec3(original.xy,0.),axis,-angle)+base;n=evRotate(n,axis,-angle);}
 else if(evType==3.){vec2 v=original.xy-evCone.xy;float cb=cos(evBend);if(dot(v,v)>1.e-6&&abs(cb)>1.e-7){v=normalize(v);float angle=atan(-v.x*evCone.w+v.y*evCone.z,dot(v,evCone.zw));vec3 center=vec3(evCone.xy,0.);p=evRotate(p-center,vec3(0.,0.,1.),-angle);n=evRotate(n,vec3(0.,0.,1.),-angle);vec3 axis=vec3(-evCone.zw*sin(evBend),cb);p=evRotate(p,axis,angle/cb)+center;n=evRotate(n,axis,angle/cb);}}
 else if(evType==2.){vec3 sum=evCurved.x!=0.?n:vec3(0.);float dz=0.,lo=0.,hi=0.;evCurve(cvAB.xy,cnA.xyz,evCurved.x,n,dz,lo,hi,sum);evCurve(cvAB.zw,vec3(cnA.w,cnB.xy),evCurved.y,n,dz,lo,hi,sum);evCurve(cvCD.xy,vec3(cnB.zw,cnC.x),evCurved.z,n,dz,lo,hi,sum);evCurve(cvCD.zw,cnC.yzw,evCurved.w,n,dz,lo,hi,sum);p.z+=clamp(dz,lo,hi);n=normalize(n+sum);}
 n=n/max(length(n),1.e-12);
}`;
const get=(v,k,n,def=0)=>{const a=v[k+'_Uni']||[];return Array.from({length:n},(_,i)=>a[i]??def)};
export function gpuUniforms(values){return {evPoints:{value:Array.from({length:64},(_,i)=>new T.Vector2(...get(values,'BezierPoints',128).slice(i*2,i*2+2)))},evProps:{value:Array.from({length:16},(_,i)=>new T.Vector3(...get(values,'BezierProps',48).slice(i*3,i*3+3)))},evType:{value:get(values,'opDeformType',1)[0]},evCylinder:{value:new T.Vector4(...get(values,'cylinderData',4))},evCone:{value:new T.Vector4(...get(values,'coneDesignPos',4))},evBend:{value:get(values,'coneBending',1)[0]},evCurved:{value:new T.Vector4(...get(values,'curvedData',4))}};}
export function updateGpu(uniforms,values){const p=get(values,'BezierPoints',128),b=get(values,'BezierProps',48);uniforms.evPoints.value.forEach((v,i)=>v.fromArray(p,i*2));uniforms.evProps.value.forEach((v,i)=>v.fromArray(b,i*3));uniforms.evType.value=get(values,'opDeformType',1)[0];uniforms.evCylinder.value.fromArray(get(values,'cylinderData',4));uniforms.evCone.value.fromArray(get(values,'coneDesignPos',4));uniforms.evBend.value=get(values,'coneBending',1)[0];uniforms.evCurved.value.fromArray(get(values,'curvedData',4));}
export function attachGpu(mesh,attributes,values){
 const count=attributes.POSITION.array.length/3;const g=mesh.geometry;
 for(let c=0;c<4;c++){const a=attributes['crInfo'+c]?.array||Array.from({length:count*4},(_,i)=>i%4===3?-1:0);g.setAttribute(['crA','crB','crC','crD'][c],new T.Float32BufferAttribute(a,4));}
 const cv=new Float32Array(count*8),cn=new Float32Array(count*12);
 for(let i=0;i<count;i++)for(let c=0;c<4;c++){for(let k=0;k<2;k++)cv[i*8+c*2+k]=attributes['curvedInfo'+c]?.array[i*2+k]||0;for(let k=0;k<3;k++)cn[i*12+c*3+k]=attributes['curvedNormInfo'+c]?.array[i*3+k]||0;}
 for(let j=0;j<2;j++)g.setAttribute(['cvAB','cvCD'][j],new T.Float32BufferAttribute(Array.from({length:count*4},(_,k)=>cv[Math.floor(k/4)*8+j*4+k%4]),4));
 for(let j=0;j<3;j++)g.setAttribute(['cnA','cnB','cnC'][j],new T.Float32BufferAttribute(Array.from({length:count*4},(_,k)=>cn[Math.floor(k/4)*12+j*4+k%4]),4));
 const uniforms=gpuUniforms(values);const patch=m=>{m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=code+'\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 evP,evN;evEvaluate(position,normal,evP,evN);objectNormal=evN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 evPos,evNor;evEvaluate(position,normal,evPos,evNor);transformed=evPos;');};m.customProgramCacheKey=()=> 'mahabat-native-independent-v1';return m;};
 mesh.material=mesh.material.map(m=>patch(m.clone()));mesh.customDepthMaterial=patch(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));mesh.customDistanceMaterial=patch(new T.MeshDistanceMaterial());mesh.frustumCulled=false;return uniforms;
}
