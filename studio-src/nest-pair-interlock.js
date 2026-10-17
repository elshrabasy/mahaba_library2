const EPS=1e-6;
const normalize=layout=>{
  if(!layout.length)return [];
  const minX=Math.min(...layout.map(part=>part.x)),minY=Math.min(...layout.map(part=>part.y));
  return layout.map(part=>({...part,x:part.x-minX,y:part.y-minY}));
};
const signature=layout=>layout.map(part=>`${part.r}:${part.x.toFixed(4)}:${part.y.toFixed(4)}`).sort().join('|');
const difference=(first,second)=>Math.abs(first-second)<=EPS?0:first-second;
const compareDimensions=(first,second)=>difference(first.area,second.area)||difference(first.h,second.h)||difference(first.w,second.w);
const compareCompactness=(first,second)=>compareDimensions(first,second)||(first.contactArea||0)-(second.contactArea||0);

export function compareNestingLayouts(first,second){
  return second.layout.length-first.layout.length||compareDimensions(first,second);
}

function contactVertices(polygon){
  const selected=polygon.filter((point,index)=>{
    const before=polygon[(index+polygon.length-1)%polygon.length],after=polygon[(index+1)%polygon.length];
    const incoming=[point[0]-before[0],point[1]-before[1]],outgoing=[after[0]-point[0],after[1]-point[1]];
    const lengths=Math.hypot(...incoming)*Math.hypot(...outgoing);
    return lengths<EPS||Math.abs(incoming[0]*outgoing[1]-incoming[1]*outgoing[0])/lengths>.15||
      Math.hypot(...incoming)>2||Math.hypot(...outgoing)>2;
  });
  for(let axis=0;axis<2;axis++)for(const direction of [-1,1]){
    const extreme=polygon.reduce((best,point)=>direction*point[axis]>direction*best[axis]?point:best);
    if(!selected.includes(extreme))selected.push(extreme);
  }
  return selected;
}

export function createInterlockSearch(engine,template,config){
  const variants=engine.makeVariants(template),required=config.clearance+engine.SAFETY,contactGap=required+.001;
  const contacts=new Map(),pairs=new Map(),features=variants.map(variant=>contactVertices(variant.p));
  const fills=new Map(),refinements=new Map();
  const maxParts=Math.min(80,Math.floor(config.W*config.H/engine.area(template.polygon)));
  const compactness=layout=>{
    let contactArea=0;
    for(let index=0;index<layout.length;index++)for(let previous=0;previous<index;previous++){
      contactArea+=engine.dims(normalize([layout[index],layout[previous]]),variants).area;
    }
    return {...engine.dims(normalize(layout),variants),contactArea};
  };
  const describe=(layout,name='Interlock Pair',recipe='interlock-pair')=>{
    const normalized=normalize(layout);
    if(!normalized.length||!engine.validate(normalized,variants,config).ok)return null;
    const check=engine.validate(normalized,variants,config,true);
    if(!check.ok)return null;
    return {layout:normalized,name,recipe,minGap:Number.isFinite(check.min)?check.min:null,...engine.dims(normalized,variants)};
  };
  function contactOffsets(firstRotation,secondRotation){
    const key=`${firstRotation},${secondRotation}`;
    if(contacts.has(key))return contacts.get(key);
    const first=variants[firstRotation/90],second=variants[secondRotation/90],offsets=new Map();
    const add=(x,y)=>{
      if(Number.isFinite(x+y))offsets.set(`${x.toFixed(4)},${y.toFixed(4)}`,{x,y});
    };
    for(const fixed of features[firstRotation/90])for(const moving of features[secondRotation/90]){
      const x=fixed[0]-moving[0],y=fixed[1]-moving[1];
      for(const [dx,dy] of [[contactGap,0],[-contactGap,0],[0,contactGap],[0,-contactGap]])add(x+dx,y+dy);
    }
    const addEdgeContacts=(fixedPolygon,movingFeatures,reverse)=>{
      const signedArea=fixedPolygon.reduce((sum,point,index)=>{
        const next=fixedPolygon[(index+1)%fixedPolygon.length];
        return sum+point[0]*next[1]-point[1]*next[0];
      },0);
      for(let index=0;index<fixedPolygon.length;index++){
        const start=fixedPolygon[index],end=fixedPolygon[(index+1)%fixedPolygon.length];
        const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
        if(length<EPS)continue;
        const normalX=Math.sign(signedArea)*dy/length*contactGap,normalY=-Math.sign(signedArea)*dx/length*contactGap;
        for(const point of movingFeatures){
          const startX=start[0]-point[0]+normalX,startY=start[1]-point[1]+normalY;
          const insert=fraction=>{
            if(fraction>=-EPS&&fraction<=1+EPS)add(reverse?-(startX+fraction*dx):startX+fraction*dx,reverse?-(startY+fraction*dy):startY+fraction*dy);
          };
          insert(0);insert(1);
          for(const target of [0,first.w-second.w,config.W-second.w,first.w-config.W])if(Math.abs(dx)>EPS)insert(((reverse?-target:target)-startX)/dx);
          for(const target of [0,first.h-second.h,config.H-second.h,first.h-config.H])if(Math.abs(dy)>EPS)insert(((reverse?-target:target)-startY)/dy);
        }
      }
    };
    addEdgeContacts(first.p,features[secondRotation/90],false);
    addEdgeContacts(second.p,features[firstRotation/90],true);
    for(const x of [0,first.w-second.w,-second.w-contactGap,first.w+contactGap]){
      for(const y of [0,first.h-second.h,-second.h-contactGap,first.h+contactGap])add(x,y);
    }
    const result=[...offsets.values()];
    contacts.set(key,result);
    return result;
  }
  function findPairs(firstRotation=0,secondRotation=180){
    if(!config.angles.includes(firstRotation)||!config.angles.includes(secondRotation))return [];
    const pairKey=`${firstRotation},${secondRotation}`;
    if(pairs.has(pairKey))return pairs.get(pairKey);
    const first=variants[firstRotation/90],second=variants[secondRotation/90];
    const candidates=contactOffsets(firstRotation,secondRotation).map(offset=>{
      const w=Math.max(first.w,offset.x+second.w)-Math.min(0,offset.x);
      const h=Math.max(first.h,offset.y+second.h)-Math.min(0,offset.y);
      return {...offset,w,h,area:w*h};
    }).filter(candidate=>candidate.w<=config.W+EPS&&candidate.h<=config.H+EPS);
    const accepted=new Map(),checked=new Map();
    const rankings=[compareDimensions,(first,second)=>first.w-second.w||compareDimensions(first,second),(first,second)=>first.h-second.h||compareDimensions(first,second)];
    for(const rank of rankings){
      candidates.sort(rank);
      let found=0;
      for(const candidate of candidates){
        const layout=normalize([{r:firstRotation,x:0,y:0},{r:secondRotation,x:candidate.x,y:candidate.y}]),key=signature(layout);
        if(!checked.has(key))checked.set(key,engine.validate(layout,variants,config).ok);
        if(!checked.get(key))continue;
        if(!accepted.has(key))accepted.set(key,describe(layout));
        if(++found>=3)break;
      }
    }
    const result=[...accepted.values()].filter(Boolean).sort(compareNestingLayouts);
    pairs.set(pairKey,result);
    return result;
  }
  function bestPlacement(layout,rotations=config.angles,incumbent=null){
    const candidates=new Map();
    for(const rotation of rotations){
      const variant=variants[rotation/90],maxX=config.W-variant.w,maxY=config.H-variant.h;
      if(maxX<-EPS||maxY<-EPS)continue;
      const add=(x,y)=>{
        if(x<-EPS||y<-EPS||x>maxX+EPS||y>maxY+EPS)return;
        const part={r:rotation,x:Math.max(0,x),y:Math.max(0,y)};
        const dimensions=incumbent?compactness([...layout,part]):engine.dims([...layout,part],variants);
        if(incumbent&&compareCompactness(dimensions,incumbent)>=-EPS)return;
        candidates.set(signature([part]),{part,...dimensions});
      };
      for(const x of [0,maxX])for(const y of [0,maxY])add(x,y);
      if(incumbent)for(const x of [incumbent.part.x,incumbent.part.x-1,incumbent.part.x+1])for(const y of [incumbent.part.y,incumbent.part.y-1,incumbent.part.y+1])add(x,y);
      for(const fixed of layout){
        for(const pair of findPairs(fixed.r,rotation)){
          const [anchor,moving]=pair.layout;
          add(fixed.x+moving.x-anchor.x,fixed.y+moving.y-anchor.y);
        }
        const fixedVariant=variants[fixed.r/90];
        for(const x of [0,maxX,fixed.x,fixed.x+fixedVariant.w-variant.w,fixed.x+fixedVariant.w+required,fixed.x-variant.w-required]){
          for(const y of [0,maxY,fixed.y,fixed.y+fixedVariant.h-variant.h,fixed.y+fixedVariant.h+required,fixed.y-variant.h-required])add(x,y);
        }
      }
    }
    const ordered=[...candidates.values()].sort(compareCompactness);
    for(const candidate of ordered){
      if(layout.every(fixed=>engine.pairCheck(fixed,candidate.part,variants,required).ok)&&engine.validate([...layout,candidate.part],variants,config).ok)return candidate.part;
    }
    return null;
  }
  function residualFill(seed){
    const key=signature(seed);
    if(fills.has(key))return fills.get(key).map(part=>({...part}));
    const layout=seed.map(part=>({...part}));
    if(!engine.validate(layout,variants,config).ok)return layout;
    while(layout.length<maxParts){
      const next=bestPlacement(layout);
      if(!next)break;
      layout.push(next);
    }
    fills.set(key,layout);
    return layout;
  }
  function refine(seed,{fill=true,passes=2}={}){
    let layout=normalize(seed);
    const key=`${signature(layout)}:${fill}:${passes}`;
    if(refinements.has(key))return refinements.get(key);
    if(!engine.validate(layout,variants,config).ok)return null;
    for(let pass=0;pass<passes;pass++){
      let changed=false;
      for(let index=0;index<layout.length;index++){
        const part=layout[index],rest=layout.filter((_,partIndex)=>partIndex!==index);
        const rotations=[part.r,(part.r+180)%360].filter(rotation=>config.angles.includes(rotation));
        const replacement=bestPlacement(rest,rotations,{...compactness(layout),part});
        if(!replacement)continue;
        const trial=normalize(layout.map((current,partIndex)=>partIndex===index?replacement:current));
        if(engine.validate(trial,variants,config).ok&&compareCompactness(compactness(trial),compactness(layout))<-EPS){
          layout=trial;changed=true;
        }
      }
      if(!changed)break;
    }
    if(fill)layout=residualFill(layout);
    const result=describe(layout,'Interlock · local 180° refinement','interlock-refined');
    refinements.set(key,result);
    return result;
  }
  function repeatCluster(cluster){
    const results=[],seen=new Set();
    for(const stagger of [false,true]){
      const pitchX=cluster.w+required,pitchY=cluster.h+required,layout=[];
      const rows=Math.floor((config.H+required)/pitchY);
      for(let row=0;row<rows;row++){
        const offset=stagger&&row%2?pitchX/2:0,columns=Math.floor((config.W-offset+required)/pitchX);
        for(let column=0;column<columns;column++)for(const part of cluster.layout){
          layout.push({...part,x:part.x+offset+column*pitchX,y:part.y+row*pitchY});
        }
      }
      if(!layout.length||!engine.validate(layout,variants,config).ok)continue;
      const key=signature(layout);
      if(seen.has(key))continue;
      seen.add(key);
      const filled=residualFill(layout),candidate=describe(filled,'Interlock Pair · clusters + residual fill');
      if(candidate)results.push({...candidate,clusters:layout.length/2,residualParts:filled.length-layout.length});
    }
    return results;
  }
  return {variants,findPairs,repeatCluster,residualFill,refine,describe};
}

export function refineInterlockSolutions(engine,template,config,seeds,{limit=3,search=createInterlockSearch(engine,template,config)}={}){
  const results=[];
  for(const seed of [...seeds].sort(compareNestingLayouts).slice(0,limit)){
    const refined=search.refine(seed.layout);
    if(refined&&compareNestingLayouts(refined,seed)<0)results.push(refined);
  }
  return results.sort(compareNestingLayouts);
}
