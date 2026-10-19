import {setLayerTransform} from './artwork-placement.js?v=transform-1';

export class LatestUpdateQueue{
  constructor(run,onError,{setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=timer=>clearTimeout(timer)}={}){
    this.run=run;this.onError=onError;this.setTimer=setTimer;this.clearTimer=clearTimer;this.pending=null;this.running=false;this.timer=null;
  }
  schedule(value,delay){
    this.pending=value;this.clearTimer(this.timer);
    this.timer=this.setTimer(()=>{this.timer=null;this.flush();},delay);
  }
  cancel(){this.clearTimer(this.timer);this.timer=null;this.pending=null;}
  async flush(){
    if(this.running||this.pending===null)return;
    this.clearTimer(this.timer);this.timer=null;this.running=true;
    try{
      while(this.pending!==null){
        const value=this.pending;this.pending=null;
        try{await this.run(value);}catch(error){this.onError(error);}
        if(this.timer!==null)break;
      }
    }finally{this.running=false;}
  }
}

export function readDimensionInputs(studio){
  if(studio.data?.source!=='mahabat-engine')return null;
  const parameters={...studio.data.requestedParameters};
  for(const field of studio.$('dimensions').querySelectorAll('[data-mahabat]')){
    if(field.value.trim()===''||!field.checkValidity())return null;
    const value=field.dataset.mahabatType==='number'?Number(field.value):field.value;
    if(typeof value==='number'&&!Number.isFinite(value))return null;
    parameters[field.dataset.mahabat]=value;
  }
  return parameters;
}

export function readArtworkInputs(studio){
  const values={};
  for(const key of ['scale','x','y','angle']){
    const field=studio.$(key);
    if(field.value.trim()===''||!field.checkValidity())return null;
    values[key]=Number(field.value);
  }
  if(!Object.values(values).every(Number.isFinite)||values.scale<5||values.scale>500||Math.abs(values.x)>2000||Math.abs(values.y)>2000||Math.abs(values.angle)>36000)return null;
  return values;
}

export class StudioAutoUpdates{
  constructor(studio){
    this.studio=studio;
    const onError=error=>studio.message(error.userMessage||error.message);
    this.dimensions=new LatestUpdateQueue(async update=>{
      if(studio.data?.code!==update.code)return;
      await studio.applyDimensions(false,update.parameters);
    },onError);
    this.artwork=new LatestUpdateQueue(async update=>{
      if(studio.serial!==update.serial||!Array.from(studio.layers.values()).includes(update.layer))return;
      setLayerTransform(update.layer,update.kind,update.values);await studio.applyAll();studio.artworkTransform?.sync();
    },onError);
    studio.scheduleDimensionUpdate=delay=>this.scheduleDimensions(delay);
    studio.cancelArtworkUpdate=()=>this.artwork.cancel();
    const fields=studio.$('dimensions');
    for(const type of ['input','change'])fields.addEventListener(type,event=>{
      const field=event.target.closest('[data-mahabat]');
      if(field)this.scheduleDimensions(field.tagName==='SELECT'?120:500);
    });
    for(const key of ['scale','x','y','angle'])studio.$(key).addEventListener('input',()=>this.scheduleArtwork());
    studio.root.addEventListener('click',event=>{
      if(event.target.closest('[data-id="resetArt"],[data-id="remove"],[data-id="clearFoil"],[data-id="clearUV"]'))this.artwork.cancel();
    },true);
    studio.root.addEventListener('change',event=>{
      if(event.target.matches('[data-id="image"],[data-id="foil"],[data-id="uv"]'))this.artwork.cancel();
      if(event.target.matches('[data-id="open"]'))this.cancel();
    },true);
    document.getElementById('templateSwitch')?.addEventListener('change',()=>this.cancel(),true);
  }
  scheduleDimensions(delay=500){
    const parameters=readDimensionInputs(this.studio);
    if(!parameters){this.dimensions.cancel();return;}
    if(!this.studio.dimensionsBusy&&Object.entries(parameters).every(([key,value])=>this.studio.data.requestedParameters[key]===value)){this.dimensions.cancel();return;}
    this.dimensions.schedule({code:this.studio.data.code,parameters},delay);
  }
  scheduleArtwork(){
    const values=readArtworkInputs(this.studio);
    if(!values){this.artwork.cancel();return;}
    this.artwork.schedule({serial:this.studio.serial,layer:this.studio.layer(),kind:this.studio.artworkKind||'image',values},180);
  }
  cancel(){this.dimensions.cancel();this.artwork.cancel();}
}
