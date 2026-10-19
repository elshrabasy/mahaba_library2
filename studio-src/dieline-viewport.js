export function zoomViewBox(view,base,factor,anchor){
  const zoom=Math.max(.25,Math.min(16,base.width/view.width*factor));
  const width=base.width/zoom,ratio=width/view.width;
  return {x:anchor.x+(view.x-anchor.x)*ratio,y:anchor.y+(view.y-anchor.y)*ratio,width,height:view.height*ratio};
}

export function panViewBox(view,deltaX,deltaY){
  return {...view,x:view.x+deltaX,y:view.y+deltaY};
}

export function wheelZoomFactor(event,pageHeight){
  const multiplier=event.deltaMode===1?16:event.deltaMode===2?pageHeight:1;
  const delta=Math.max(-1000,Math.min(1000,event.deltaY*multiplier));
  return Math.exp(-delta*.0018);
}

export function transformPointer(matrix,point){
  return {x:matrix.a*point.x+matrix.c*point.y+matrix.e,y:matrix.b*point.x+matrix.d*point.y+matrix.f};
}

export class DielineViewport{
  constructor(studio,onChange){
    this.studio=studio;this.onChange=onChange;this.flat=studio.$('flat');this.panMode=true;this.space=false;
    this.flat.tabIndex=0;
    this.flat.addEventListener('wheel',event=>this.onWheel(event),{passive:false});
    this.flat.addEventListener('pointerdown',event=>this.onPointerDown(event),true);
    this.flat.addEventListener('pointermove',event=>this.onPointerMove(event),true);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.flat.addEventListener(type,event=>this.endDrag(event),true);
    this.flat.addEventListener('keydown',event=>this.onKey(event));
    this.flat.addEventListener('keyup',event=>{if(event.code==='Space')this.space=false;});
    this.flat.addEventListener('blur',()=>{this.space=false;this.endDrag();});
    this.updateCursor();
  }
  sync(){
    const svg=this.flat.querySelector('svg');
    if(!svg){this.svg=null;return;}
    if(svg===this.svg)return;
    this.endDrag();this.svg=svg;
    const values=svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
    if(values.length!==4||!values.every(Number.isFinite)||values[2]<=0||values[3]<=0){this.svg=null;return;}
    const key=JSON.stringify([this.studio.data?.code,this.studio.$('drawing').value,this.studio.data?.requestedParameters,values]);
    this.base={x:values[0],y:values[1],width:values[2],height:values[3]};
    if(key!==this.key||!this.view)this.view={...this.base};
    this.key=key;this.write(false);this.updateCursor();
  }
  write(notify=true){
    if(!this.svg||!this.view)return;
    this.svg.setAttribute('viewBox',[this.view.x,this.view.y,this.view.width,this.view.height].join(' '));
    this.flat.dataset.zoom=String(Number((this.base.width/this.view.width).toFixed(3)));
    if(notify)this.onChange();
  }
  active(){return this.svg&&this.studio.view!=='3d'&&!this.studio.workspace.inert;}
  fit(){if(this.svg){this.view={...this.base};this.write();}}
  setPanMode(value){this.panMode=value;this.updateCursor();}
  updateCursor(){this.flat.dataset.panMode=String(this.panMode||!this.studio.layer()?.image);}
  onWheel(event){
    if(!this.active())return;
    if(event.target?.closest('[data-artwork-toolbar]'))return;
    if(this.studio.artworkTransform?.drag){event.preventDefault();return;}
    const matrix=this.svg.getScreenCTM();if(!matrix)return;
    event.preventDefault();event.stopPropagation();
    const anchor=transformPointer(matrix.inverse(),{x:event.clientX,y:event.clientY});
    this.view=zoomViewBox(this.view,this.base,wheelZoomFactor(event,this.flat.clientHeight),anchor);this.write();
  }
  onPointerDown(event){
    if(!this.active()||![0,1].includes(event.button))return;
    if(this.studio.artworkTransform?.drag)return;
    if(event.target?.closest('[data-artwork-toolbar]'))return;
    if(event.button===0&&!this.space&&event.target?.closest('[data-artwork-handle]'))return;
    if(this.studio.artworkTransform&&event.button===0&&!this.space&&event.altKey)return;
    const pan=event.button===1||this.space||(!event.altKey&&(this.panMode||!this.studio.layer()?.image));
    if(!pan)return;
    const matrix=this.svg.getScreenCTM();if(!matrix)return;
    event.preventDefault();event.stopImmediatePropagation();
    this.flat.focus({preventScroll:true});
    const inverse=matrix.inverse(),start=transformPointer(inverse,{x:event.clientX,y:event.clientY});
    this.drag={pointerId:event.pointerId,inverse,start,view:{...this.view}};
    this.flat.dataset.dragging='true';this.flat.setPointerCapture(event.pointerId);
  }
  onPointerMove(event){
    if(!this.drag||event.pointerId!==this.drag.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    const current=transformPointer(this.drag.inverse,{x:event.clientX,y:event.clientY});
    this.view=panViewBox(this.drag.view,this.drag.start.x-current.x,this.drag.start.y-current.y);this.write();
  }
  endDrag(event){
    if(!this.drag||(event&&event.pointerId!==this.drag.pointerId))return;
    const pointerId=this.drag.pointerId;this.drag=null;delete this.flat.dataset.dragging;
    if(this.flat.hasPointerCapture(pointerId))this.flat.releasePointerCapture(pointerId);
  }
  onKey(event){
    if(!this.active()||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target?.closest('[data-artwork-toolbar]'))return;
    if(event.code==='Space'){this.space=true;event.preventDefault();return;}
    const bounds=this.flat.getBoundingClientRect();
    const step=40*Math.max(this.view.width/Math.max(1,bounds.width),this.view.height/Math.max(1,bounds.height));
    const arrows={ArrowLeft:[step,0],ArrowRight:[-step,0],ArrowUp:[0,step],ArrowDown:[0,-step]};
    if(arrows[event.key])this.view=panViewBox(this.view,...arrows[event.key]);
    else if(['+','=','-'].includes(event.key))this.view=zoomViewBox(this.view,this.base,event.key==='-'?1/1.2:1.2,{x:this.view.x+this.view.width/2,y:this.view.y+this.view.height/2});
    else if(['0','Home'].includes(event.key))this.view={...this.base};
    else return;
    event.preventDefault();event.stopPropagation();this.write();
  }
}
