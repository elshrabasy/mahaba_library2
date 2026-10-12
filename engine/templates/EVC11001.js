// Mahabat Engine native pilot — EVC11001
// Extracted from the current Mahabat parametric engine. No EngView runtime calls.

export class EngineInputError extends Error {
  constructor(message){ super(message); this.name='EngineInputError'; this.userMessage=message; }
}

export const RULES={
 id:'corrugated-default',version:'0.2.0-unapproved',approvedBy:null,family:'corrugated',
 fold90:d=>d/2,lastPanelCorrection:d=>d,glueFlapCorrection:()=>0,
 glueFlapWidth:()=>25,glueFlapAngleDeg:()=>65,slotWidth:d=>2*d,slotExtension:()=>2,
 tuckCorrection:d=>d,lidClearance:()=>1,slitDepth:d=>d/2,dustFlapCorrection:d=>d+d/2,
 reliefRadius:d=>d+2,reliefOffset:()=>1,handleCorrection:d=>d,outsideFold90:d=>d/2,
 doubleCrease:d=>2*d,lidFrontCorrection:d=>d/3,layerStep:d=>d,insideLayer:d=>d,
 rimFold90:d=>1.5*d,rimHeightCorrection:d=>-d/3,rimCreaseGap:d=>d,fittingCreaseGap:d=>d,
 fluteCrease:{along:1,across:1}
};

export const MATERIALS={
 1:{key:'E-flute',family:'corrugated',name:'E Flute',thickness:1.5,types:['E Flute','Corrugated Cardboard']},
 2:{key:'B-flute',family:'corrugated',name:'B Flute',thickness:3,types:['B Flute','Corrugated Cardboard']},
 3:{key:'C-flute',family:'corrugated',name:'C Flute',thickness:4,types:['C Flute','Corrugated Cardboard']},
 4:{key:'BC-double',family:'corrugated',name:'BC Double Wall',thickness:6.5,types:['BC Flute','Double-Wall Board','Corrugated Cardboard']}
};
export const DIMENSION_TYPES={1:{key:'ID',ar:'داخلي'},2:{key:'OD',ar:'خارجي'},3:{key:'SS',ar:'سكور لسكور'}};
export const FLUTE_DIRECTIONS={1:{key:'FD_X',ar:'الفلوت بطول المحور X'},2:{key:'FD_Y',ar:'الفلوت بطول المحور Y'}};

const tan=deg=>Math.tan(deg*Math.PI/180);
const angle=(c,p)=>Math.atan2(p[1]-c[1],p[0]-c[0]);
function arcSweep(c,from,to,positive){let a0=angle(c,from),a1=angle(c,to);if(positive)while(a1<a0)a1+=2*Math.PI;else while(a1>a0)a1-=2*Math.PI;return[a0,a1];}
function arcPoints(c,r,from,to,positive){const[a0,a1]=arcSweep(c,from,to,positive),n=Math.max(1,Math.ceil(Math.abs(a1-a0)/(Math.PI/36))),pts=[];for(let i=1;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push(i===n?to:[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)]);}return pts;}
function upperTangent(P,C,r){const th=angle(C,P),al=Math.acos(r/Math.hypot(P[0]-C[0],P[1]-C[1])),q=[th+al,th-al].map(a=>[C[0]+r*Math.cos(a),C[1]+r*Math.sin(a)]);return q[0][1]>q[1][1]?q[0]:q[1];}
function flipToScreen(lines,panels,outline){const height=Math.max(...outline.map(q=>q[1])),flip=([x,y])=>[x,height-y];for(const l of lines){l.a=flip(l.a);l.b=flip(l.b);if(l.arc){const{c,r,ccw}=l.arc;l.arc={c:flip(c),r,sweep:ccw?0:1};}}for(const q of panels){q.poly=q.poly.map(flip);if(q.hinge)q.hinge=q.hinge.map(flip);}outline.splice(0,outline.length,...outline.map(flip).reverse());return height;}
function orientHinges(panels){for(const p of panels){if(!p.hinge)continue;const[a,b]=p.hinge,c=p.poly.reduce((s,q)=>[s[0]+q[0]/p.poly.length,s[1]+q[1]/p.poly.length],[0,0]);if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0)p.hinge=[b,a];}return panels;}
const lc=(type,d,rules,i,o)=>type==='ID'?i*rules.insideLayer(d):type==='OD'?-o*rules.insideLayer(d):0;

export const TEMPLATE={
 code:'EVC11001',version:'EVC11001@1',name:'Regular Tuck Lock - Snap Lock',
 params:{L:{ar:'الطول',en:'Length',min:40,max:1000,default:125},W:{ar:'العرض',en:'Width',min:30,max:1000,default:105},H:{ar:'الارتفاع',en:'Height',min:30,max:1500,default:88}},
 stages:{glue:[0,1],body:[1,2],'bottom-minor':[2,2.5],'bottom-major':[2.5,3],'bottom-lock':[3,3.5],'top-minor':[3.5,4],lid:[4,4.6],tuck:[4.3,5]},
 animations:{endTime:5,phases:[{Name:'Body',endTime:2,steps:[{endTime:1},{endTime:2}]},{Name:'Bottom',endTime:3.5,steps:[{endTime:.5},{endTime:1},{endTime:1.5}]},{Name:'Top',endTime:5,steps:[{endTime:.5},{endTime:1.5}]}]},
 generate(p,material,rules=RULES,options={}){
  if(p.W>p.L)throw new EngineInputError('في هذا القالب يجب ألا يزيد العرض عن الطول.');
  const d=material.thickness,c90=rules.fold90(d),type=DIMENSION_TYPES[p.DT].key;
  const toSS=v=>type==='ID'?v+2*c90:type==='OD'?v-2*c90:v;
  const Lss=toSS(p.L),Wss=toSS(p.W),Hss=toSS(p.H)+lc(type,d,rules,0,1),GL=rules.glueFlapWidth(d),GLA=75;
  const Lss1=Lss-rules.glueFlapCorrection(d),Wss1=Wss-rules.lastPanelCorrection(d);
  const TEC=rules.tuckCorrection(d),PH=Wss-d-rules.lidClearance(d),SLO=Wss-PH,SLD=rules.slitDepth(d),DFC=rules.dustFlapCorrection(d),R=rules.reliefRadius(d),Off=rules.reliefOffset(d);
  const TEH=p.H/5,TER=TEH+2;
  // Keep source formula by default. proportionSafe is explicit experimental behavior only.
  const DFH=options.proportionSafe?(PH+TEH+rules.layerStep(d))/2:p.L/3+(type==='ID'?c90:type==='OD'?-c90:0);
  const Z=p.L/10,ZZ=3,ZX=5,beta=15,SLL=Z+2;
  const FH=Wss/2,TH=Math.max(.15*Wss,7),DySEB=Wss/3,DxSEB=Wss/2+d,SBHW=Lss-2*DySEB,minorH=Math.min(Lss/2,FH+TH);
  const tuckReach=TER-Math.sqrt(TER*TER-(TEH-SLO)**2),dustTop=Wss-DFC-ZZ-(DFH-Z-ZZ)*tan(beta);
  if(TEH<=SLO+1||Hss<=2*d)throw new EngineInputError('الارتفاع صغير جدًا بالنسبة لسماكة الخامة.');
  if(2*SLL>=Lss1-2||2*(TEC+tuckReach)>=Lss1)throw new EngineInputError('الطول صغير جدًا بالنسبة للارتفاع في هذا القالب.');
  if(dustTop<=ZX+1||DFH<=Z+ZZ+ZX)throw new EngineInputError('الطول كبير جدًا بالنسبة للعرض: لسان الغبار لا يكفي في هذا القالب.');
  if(Wss/2<=2*R+d)throw new EngineInputError('العرض صغير جدًا بالنسبة لسماكة الخامة.');
  const x0=GL,x1=GL+Lss1,x2=x1+Wss,x3=x2+Lss,xE=x3+Wss1,xm=(x2+x3)/2,h=SBHW/2;
  const la=x0,lb=x1,yc=FH+TH,yt=yc+Hss,yL=yt+d,yT=yL+PH,yS=yT+SLO,yTop=yT+TEH,yb1=yc-FH,yb2=yc-minorH,Cy=yc+Off-R,s=Math.sqrt(R*R-(yc-Cy)**2);
  const lines=[],cut=(a,b,role)=>lines.push({type:'cut',a,b,role}),crease=(a,b,role)=>lines.push({type:'crease',a,b,role}),arc=(c,r,a,b,ccw,role)=>lines.push({type:'cut',a,b,role,arc:{c,r,ccw}}),path=(pts,role)=>{for(let i=1;i<pts.length;i++)cut(pts[i-1],pts[i],role);};
  const tangent=(P,C)=>upperTangent(P,C,R),crossing=(P,T,C,side)=>T[1]>=yc?P[0]+(T[0]-P[0])*(yc-P[1])/(T[1]-P[1]):C[0]+side*s;
  const C1=[x1,Cy],C2=[x2,Cy],C3=[x3,Cy],Q1=[x1,yc+Off],Q2=[x2,yc+Off],Q3=[x3,yc+Off];
  const P1=[x1-DySEB,yb1],T1=tangent(P1,C1),P2=[x2-DxSEB,yc-DySEB],T2=tangent(P2,C2),P4=[x3+DxSEB,yc-DySEB],T4=tangent(P4,C3),gdy=GL*tan(90-GLA);
  path([[x0,yc],[0,yc+gdy],[0,yt-gdy],[x0,yt]],'glue-flap');crease([x0,yc],[x0,yt],'glue-fold');
  for(const x of[x1,x2,x3])crease([x,yc+Off],[x,yt],'panel-fold');cut([xE,yb2],[xE,yt],'end-edge');
  cut([la,yt],[la,yS],'lid-edge');cut([lb,yt],[lb,yS],'lid-edge');crease([la,yL],[lb,yL],'lid-fold');
  path([[la,yS],[la+SLL,yS],[la+SLL,yT-SLD]],'slit-lock');path([[lb,yS],[lb-SLL,yS],[lb-SLL,yT-SLD]],'slit-lock');crease([la+SLL,yT],[lb-SLL,yT],'tuck-fold');
  const cL=[la+TEC+TER,yS],cR=[lb-TEC-TER,yS],rise=yTop-yS,run=Math.sqrt(TER*TER-rise*rise),tl=[cL[0]-run,yTop],tr=[cR[0]+run,yTop];
  arc(cR,TER,[lb-TEC,yS],tr,true,'tuck-edge');cut(tr,tl,'tuck-edge');arc(cL,TER,tl,[la+TEC,yS],true,'tuck-edge');
  const dust=(xb,xl)=>{const k=Math.sign(xl-xb);return[[xb,yt],[xb+k*ZX,yt+ZX],[xb+k*ZX,yt+DFH],[xl-k*(ZZ+(DFH-Z-ZZ)*tan(beta)),yt+DFH],[xl-k*ZZ,yt+Z+ZZ],[xl,yt+Z],[xl,yt]];};
  const dust2=dust(x1,x2-DFC),dustRight=dust(xE,x3+DFC);path(dust2,'dust-flap');path(dustRight,'dust-flap');crease([x1,yt],[x2-DFC,yt],'dust-fold');crease([x3+DFC,yt],[xE,yt],'dust-fold');cut([x2-DFC,yt],[x3+DFC,yt],'top-edge');
  path([[x0,yc],[x0+DySEB,yb1],[x0+DySEB,0],[x1-DySEB,0],P1,T1],'snap-lock');arc(C1,R,Q1,T1,true,'relief');
  arc(C1,R,Q1,[x1+R,Cy],false,'relief');path([[x1+R,Cy],[x1+R,yb2],[P2[0],yb2],P2,T2],'snap-lock');arc(C2,R,Q2,T2,true,'relief');
  arc(C2,R,Q2,[x2+R,Cy],false,'relief');path([[x2+R,Cy],[x2+R,0],[xm-h,0],[xm-h,TH],[xm+h,TH],[xm+h,0],[x3-R,0],[x3-R,Cy]],'snap-lock');arc(C3,R,Q3,[x3-R,Cy],true,'relief');
  arc(C3,R,Q3,T4,false,'relief');path([T4,P4,[P4[0],yb2],[xE,yb2]],'snap-lock');
  const k1=crossing(P1,T1,C1,-1),k2a=x1+s,k2b=crossing(P2,T2,C2,-1),k4=crossing(P4,T4,C3,1);crease([x0,yc],[k1,yc],'flap-fold');crease([k2a,yc],[k2b,yc],'flap-fold');crease([x2+s,yc],[x3-s,yc],'flap-fold');crease([k4,yc],[xE,yc],'flap-fold');
  const outline=[[0,yc+gdy],[0,yt-gdy],[x0,yt],[x0,yS],[x0+TEC,yS],...arcPoints(cL,TER,[x0+TEC,yS],tl,false),tr,...arcPoints(cR,TER,tr,[x1-TEC,yS],false),[x1,yS],...dust2,...[...dustRight].reverse(),[xE,yb2],[P4[0],yb2],P4,T4,...arcPoints(C3,R,T4,Q3,true),...arcPoints(C3,R,Q3,[x3-R,Cy],true),[x3-R,0],[xm+h,0],[xm+h,TH],[xm-h,TH],[xm-h,0],[x2+R,0],[x2+R,Cy],...arcPoints(C2,R,[x2+R,Cy],Q2,true),...arcPoints(C2,R,Q2,T2,true),P2,[P2[0],yb2],[x1+R,yb2],[x1+R,Cy],...arcPoints(C1,R,[x1+R,Cy],Q1,true),...arcPoints(C1,R,Q1,T1,true),P1,[x1-DySEB,0],[x0+DySEB,0],[x0+DySEB,yb1],[x0,yc]];
  const rect=(a,b,c,e)=>[[a,b],[c,b],[c,e],[a,e]],below=T=>T[1]<yc?[T]:[];
  const panels=[
   {id:'P1',role:'side',poly:rect(x0,yc,x1,yL),parent:null},{id:'P2',role:'end',poly:rect(x1,yc,x2,yt),parent:'P1',hinge:[[x1,yc],[x1,yt]],stage:'body'},{id:'P3',role:'side',poly:rect(x2,yc,x3,yt),parent:'P2',hinge:[[x2,yc],[x2,yt]],stage:'body'},{id:'P4',role:'end',poly:rect(x3,yc,xE,yt),parent:'P3',hinge:[[x3,yc],[x3,yt]],stage:'body'},
   {id:'G',role:'glue',poly:[[x0,yc],[x0,yt],[0,yt-gdy],[0,yc+gdy]],parent:'P1',hinge:[[x0,yc],[x0,yt]],stage:'glue'},
   {id:'LID',role:'lid',poly:[[la,yL],[lb,yL],[lb,yS],[lb-SLL,yS],[lb-SLL,yT],[la+SLL,yT],[la+SLL,yS],[la,yS]],parent:'P1',hinge:[[la,yL],[lb,yL]],stage:'lid'},
   {id:'TUCK',role:'tuck',poly:[[la+SLL,yT],[lb-SLL,yT],[lb-SLL,yS],[lb-TEC,yS],...arcPoints(cR,TER,[lb-TEC,yS],tr,true),...arcPoints(cL,TER,tl,[la+TEC,yS],true).slice(0,-1),[la+TEC,yS],[la+SLL,yS]],parent:'LID',hinge:[[la+SLL,yT],[lb-SLL,yT]],stage:'tuck'},
   {id:'D2',role:'dust-flap',poly:dust2,parent:'P2',hinge:[[x1,yt],[x2-DFC,yt]],stage:'top-minor'},{id:'D4',role:'dust-flap',poly:dustRight,parent:'P4',hinge:[[x3+DFC,yt],[xE,yt]],stage:'top-minor'},
   {id:'B1',role:'tongue-flap',poly:[[x0,yc],[k1,yc],...below(T1),P1,[x1-DySEB,0],[x0+DySEB,0],[x0+DySEB,yb1]],parent:'P1',hinge:[[x0,yc],[k1,yc]],stage:'bottom-lock',angle:87},
   {id:'B2',role:'minor-flap',poly:[[x1+R,Cy],[k2a,yc],[k2b,yc],...below(T2),P2,[P2[0],yb2],[x1+R,yb2]],parent:'P2',hinge:[[k2a,yc],[k2b,yc]],stage:'bottom-minor'},
   {id:'B3',role:'lock-flap',poly:[[x2+R,Cy],[x2+s,yc],[x3-s,yc],[x3-R,Cy],[x3-R,0],[xm+h,0],[xm+h,TH],[xm-h,TH],[xm-h,0],[x2+R,0]],parent:'P3',hinge:[[x2+s,yc],[x3-s,yc]],stage:'bottom-major'},
   {id:'B4',role:'minor-flap',poly:[[k4,yc],[xE,yc],[xE,yb2],[P4[0],yb2],P4,...below(T4)],parent:'P4',hinge:[[k4,yc],[xE,yc]],stage:'bottom-minor'}
  ];
  const height=flipToScreen(lines,panels,outline);
  return{code:this.code,name:this.name,width:xE,height,lines,outline,panels:orientHinges(panels),material,input:{...p},animations:this.animations,stages:this.stages,derived:{Lss,Wss,Hss,Lss1,Wss1,FH,GL,TEH,TER,DFH,PH,TH,SBHW,c90,inside:{L:Lss-2*c90,W:Wss-2*c90,H:Hss-2*c90},outside:{L:Lss+2*c90,W:Wss+2*c90,H:Hss+2*c90}}};
 }
};

export function generateEVC11001(input={},options={}){
 const p={L:Number(input.L??TEMPLATE.params.L.default),W:Number(input.W??TEMPLATE.params.W.default),H:Number(input.H??TEMPLATE.params.H.default),DT:Number(input.DT??1),MAT:Number(input.MAT??1),FD:Number(input.FD??2)};
 for(const key of['L','W','H']){const spec=TEMPLATE.params[key];if(!Number.isFinite(p[key])||p[key]<spec.min||p[key]>spec.max)throw new EngineInputError(`${key} خارج المجال ${spec.min}–${spec.max} مم.`);}
 if(!DIMENSION_TYPES[p.DT])throw new EngineInputError('نوع القياس غير معروف.');
 if(!MATERIALS[p.MAT])throw new EngineInputError('الخامة غير معروفة.');
 if(!FLUTE_DIRECTIONS[p.FD])throw new EngineInputError('اتجاه الفلوت غير معروف.');
 const g=TEMPLATE.generate(p,MATERIALS[p.MAT],RULES,options);
 return {...g,validation:{status:'PASS',errors:[],warnings:[]},dimensionType:DIMENSION_TYPES[p.DT],fluteDirection:FLUTE_DIRECTIONS[p.FD]};
}
