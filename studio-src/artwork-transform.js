import {ARTWORK_KINDS,DEFAULT_TRANSFORM,layerTransform,setLayerTransform,artworkFrame,resizeArtwork,rotationDelta} from './artwork-placement.js?v=transform-1';
import {transformPointer} from './dieline-viewport.js?v=transform-1';
import {LatestUpdateQueue} from './studio-auto-updates.js?v=transform-1';

const CORNERS={nw:[-1,-1],ne:[1,-1],se:[1,1],sw:[-1,1]};
const LABELS={ar:{image:'التصميم',foil:'الفويل',uv:'Spot UV',edit:'تحرير الصورة',reset:'إعادة المحاذاة',help:'اسحب الزوايا للتحجيم، والمقبض العلوي للدوران. Shift لتثبيت الدوران كل 15°، وSpace + سحب لتحريك الرسم.'},en:{image:'Artwork',foil:'Foil',uv:'Spot UV',edit:'Edit image',reset:'Reset placement',help:'Drag corners to resize and the top handle to rotate. Shift snaps rotation to 15°. Space + drag pans the drawing.'}};

export function artworkFrameSvg(frame,pixels=1,kind='image',label='Artwork'){
  const number=value=>Number(value.toFixed(5)),halfWidth=frame.width/2,halfHeight=frame.height/2;
  const radius=5*pixels,hit=12*pixels,rotateY=-halfHeight-30*pixels;
  const corners=Object.entries(CORNERS).map(([name,[horizontal,vertical]])=>{
    const centerX=horizontal*halfWidth,centerY=vertical*halfHeight;
    return `<g data-artwork-handle="${name}" class="artwork-resize artwork-${name}" transform="translate(${number(centerX)} ${number(centerY)})"><circle class="artwork-hit" r="${number(hit)}"/><rect x="${number(-radius)}" y="${number(-radius)}" width="${number(radius*2)}" height="${number(radius*2)}" rx="${number(2*pixels)}"/></g>`;
  }).join('');
  return `<g data-artwork-frame="${kind}" class="artwork-frame artwork-frame-${kind}" transform="translate(${number(frame.cx)} ${number(frame.cy)}) rotate(${number(frame.angle)})" aria-label="${label}"><rect data-artwork-handle="move" class="artwork-frame-body" x="${number(-halfWidth)}" y="${number(-halfHeight)}" width="${number(frame.width)}" height="${number(frame.height)}"/><line x1="0" y1="${number(-halfHeight)}" x2="0" y2="${number(rotateY)}"/>${corners}<g data-artwork-handle="rotate" class="artwork-rotate" transform="translate(0 ${number(rotateY)})"><circle class="artwork-hit" r="${number(hit)}"/><circle r="${number(8*pixels)}"/><path d="M${number(-3*pixels)} ${number(2*pixels)}a${number(4*pixels)} ${number(4*pixels)} 0 1 1 ${number(6*pixels)} 0m0 ${number(-4*pixels)}v${number(4*pixels)}h${number(-4*pixels)}"/></g></g>`;
}

export class ArtworkTransform{
  constructor(studio,viewport){
    this.studio=studio;this.viewport=viewport;this.flat=studio.$('flat');this.revision=0;
    studio.artworkTransform=this;
    for(const key of ['scale','x','y','angle'])studio.$(key).step='any';
    this.paint=new LatestUpdateQueue(async context=>{if(context.serial===studio.serial&&Array.from(studio.layers.values()).includes(context.layer)&&context.layer[context.kind]===context.url)await studio.applyAll();},error=>studio.message(error.message));
    this.toolbar=document.createElement('div');this.toolbar.className='artwork-toolbar';this.toolbar.dataset.artworkToolbar='true';
    this.toolbar.innerHTML='<select data-artwork-select></select><output dir="ltr"></output><button type="button" data-artwork-reset>↺</button>';
    this.selector=this.toolbar.querySelector('select');
    for(const kind of ARTWORK_KINDS){const option=document.createElement('option');option.value=kind;this.selector.append(option);}
    this.selector.addEventListener('change',()=>this.choose(this.selector.value));
    const field=document.createElement('div');field.className='field';field.innerHTML='<label></label><select data-id="artworkTarget"></select>';
    studio.$('scale').closest('.field').before(field);this.inspectorLabel=field.querySelector('label');this.inspectorSelector=field.querySelector('select');
    for(const kind of ARTWORK_KINDS){const option=document.createElement('option');option.value=kind;this.inspectorSelector.append(option);}
    this.inspectorSelector.addEventListener('change',()=>this.choose(this.inspectorSelector.value));
    this.toolbar.querySelector('button').addEventListener('click',()=>{
      studio.cancelArtworkUpdate?.();this.endDrag();setLayerTransform(studio.layer(),studio.artworkKind||'image',DEFAULT_TRANSFORM);studio.syncFields();this.sync();this.paint.schedule(this.context(),0);
    });
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])this.flat.addEventListener(type,event=>this[type](event),true);
    this.flat.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&this.drag){event.preventDefault();event.stopImmediatePropagation();this.cancelDrag();}
    },true);
    this.flat.addEventListener('blur',()=>this.endDrag());
  }
  context(){
    const studio=this.studio,layer=studio.layer(),kind=studio.artworkKind||'image';
    return {serial:studio.serial,layer,kind,url:layer[kind],drawing:studio.data?.drawings[Number(studio.$('drawing').value||0)]};
  }
  current(context){
    const active=this.context();
    return context.serial===active.serial&&context.layer===active.layer&&context.kind===active.kind&&context.url===active.url&&context.drawing===active.drawing;
  }
  choose(kind){
    this.studio.cancelArtworkUpdate?.();this.endDrag();this.studio.artworkKind=kind;this.studio.syncFields();this.sync();
  }
  async sync(){
    const revision=++this.revision,svg=this.flat.querySelector('svg'),studio=this.studio;
    const layer=studio.layer(),available=ARTWORK_KINDS.filter(kind=>layer[kind]);
    if(available.length&&!available.includes(studio.artworkKind)){studio.artworkKind=available[0];studio.syncFields();}
    const context=this.context();if(this.drag&&!this.current(this.drag.context))this.endDrag();
    const copy=LABELS[document.documentElement.lang]||LABELS.ar;
    for(const selector of [this.selector,this.inspectorSelector]){
      for(const option of selector.options){if(option.textContent!==copy[option.value])option.textContent=copy[option.value];option.disabled=!layer[option.value];}
      selector.value=context.kind;selector.setAttribute('aria-label',copy.edit);
    }
    if(this.inspectorLabel.textContent!==copy.edit)this.inspectorLabel.textContent=copy.edit;
    for(const [key,label] of [['scale',document.documentElement.lang==='en'?'Size %':'الحجم %'],['angle',document.documentElement.lang==='en'?'Rotation °':'الدوران °']]){
      const element=studio.$(key).closest('.field').querySelector('label');if(element.textContent!==label)element.textContent=label;
    }
    this.toolbar.title=copy.help;
    if(!svg||studio.view==='3d'||!available.length){svg?.querySelector('[data-artwork-frame]')?.remove();this.toolbar.remove();delete this.flat.dataset.artworkSelected;if(this.drag)this.endDrag();return;}
    const reset=this.toolbar.querySelector('button');reset.title=copy.reset;reset.setAttribute('aria-label',copy.reset);
    const transform=layerTransform(layer,context.kind),readout=this.toolbar.querySelector('output');
    readout.textContent=`${Number(transform.scale.toFixed(1))}% · ${Number(transform.angle.toFixed(1))}°`;
    if(this.toolbar.parentElement!==this.flat)this.flat.append(this.toolbar);
    this.flat.dataset.artworkSelected=context.kind;
    try{
      const image=await studio.image(context.url);
      if(revision!==this.revision||svg!==this.flat.querySelector('svg')||!this.current(context)||!context.drawing)return;
      this.frame=artworkFrame(image,context.drawing,layerTransform(layer,context.kind));
      const matrix=svg.getScreenCTM(),scale=matrix?Math.hypot(matrix.a,matrix.b):1;
      this.renderFrame(svg,this.frame,1/(scale||1),context.kind,copy[context.kind]);
    }catch(error){studio.message(error.message);}
  }
  renderFrame(svg,frame,pixels,kind,label){
    const overlay=svg.querySelector('[data-artwork-frame]');
    if(!this.drag||!overlay||overlay.dataset.artworkFrame!==kind){overlay?.remove();svg.insertAdjacentHTML('beforeend',artworkFrameSvg(frame,pixels,kind,label));return;}
    overlay.setAttribute('transform',`translate(${frame.cx} ${frame.cy}) rotate(${frame.angle})`);
    const body=overlay.querySelector('[data-artwork-handle="move"]');
    for(const [key,value] of Object.entries({x:-frame.width/2,y:-frame.height/2,width:frame.width,height:frame.height}))body.setAttribute(key,value);
    for(const [name,[horizontal,vertical]] of Object.entries(CORNERS))overlay.querySelector(`[data-artwork-handle="${name}"]`).setAttribute('transform',`translate(${horizontal*frame.width/2} ${vertical*frame.height/2})`);
    const rotateY=-frame.height/2-30*pixels;
    overlay.querySelector('line').setAttribute('y1',-frame.height/2);overlay.querySelector('line').setAttribute('y2',rotateY);
    overlay.querySelector('[data-artwork-handle="rotate"]').setAttribute('transform',`translate(0 ${rotateY})`);
  }
  pointerdown(event){
    if(this.drag)return;
    if(event.button!==0||this.viewport.space||this.studio.workspace.inert||this.studio.view==='3d'||event.target.closest('[data-artwork-toolbar]'))return;
    const handle=event.target.closest('[data-artwork-handle]')?.dataset.artworkHandle;
    if(!handle&&!event.altKey&&this.viewport.panMode)return;
    const svg=this.flat.querySelector('svg'),context=this.context();if(!svg||!context.url||!this.frame)return;
    const matrix=svg.getScreenCTM();if(!matrix)return;
    event.preventDefault();event.stopImmediatePropagation();this.studio.cancelArtworkUpdate?.();
    const inverse=matrix.inverse(),start=transformPointer(inverse,{x:event.clientX,y:event.clientY});
    this.drag={pointerId:event.pointerId,context,inverse,start,last:start,delta:0,frame:{...this.frame},transform:layerTransform(context.layer,context.kind),handle:handle||'move'};
    this.flat.focus({preventScroll:true});this.flat.setPointerCapture(event.pointerId);this.flat.dataset.artworkDragging='true';
  }
  pointermove(event){
    const drag=this.drag;if(!drag||drag.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!this.current(drag.context)){this.endDrag();return;}
    const point=transformPointer(drag.inverse,{x:event.clientX,y:event.clientY}),delta={x:point.x-drag.start.x,y:point.y-drag.start.y};
    let next={...drag.transform};
    if(CORNERS[drag.handle])next=resizeArtwork(next,drag.frame,CORNERS[drag.handle],delta);
    else if(drag.handle==='rotate'){
      drag.delta+=rotationDelta(drag.frame,drag.last,point);drag.last=point;
      const angle=drag.transform.angle+drag.delta;next.angle=Math.max(-36000,Math.min(36000,event.shiftKey?Math.round(angle/15)*15:angle));
    }else{next.x=Math.max(-2000,Math.min(2000,next.x+delta.x));next.y=Math.max(-2000,Math.min(2000,next.y+delta.y));}
    setLayerTransform(drag.context.layer,drag.context.kind,next);this.studio.syncFields();this.sync();
    if(this.paint.timer==null&&!this.paint.running)this.paint.schedule(drag.context,32);else this.paint.pending=drag.context;
  }
  pointerup(event){if(this.drag?.pointerId===event.pointerId){event.stopImmediatePropagation();this.endDrag();}}
  pointercancel(event){if(this.drag?.pointerId===event.pointerId){event.stopImmediatePropagation();this.cancelDrag();}}
  lostpointercapture(event){if(this.drag?.pointerId===event.pointerId)this.endDrag();}
  cancelDrag(){
    if(this.drag&&this.current(this.drag.context)){setLayerTransform(this.drag.context.layer,this.drag.context.kind,this.drag.transform);this.studio.syncFields();this.sync();this.paint.schedule(this.drag.context,0);}
    this.endDrag();
  }
  endDrag(){
    if(!this.drag)return;
    const pointerId=this.drag.pointerId;this.drag=null;delete this.flat.dataset.artworkDragging;
    if(this.flat.hasPointerCapture(pointerId))this.flat.releasePointerCapture(pointerId);
    this.paint.flush();
  }
}
