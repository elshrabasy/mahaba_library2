export const ARTWORK_KINDS=['image','foil','uv'];
export const DEFAULT_TRANSFORM={scale:100,x:0,y:0,angle:0};

export function validArtworkTransform(value){
  return Boolean(value&&['scale','x','y','angle'].every(key=>Number.isFinite(value[key]))&&value.scale>=5&&value.scale<=500&&Math.abs(value.x)<=2000&&Math.abs(value.y)<=2000&&Math.abs(value.angle)<=36000);
}

export function layerTransform(layer,kind='image'){
  const source=kind==='image'?layer:layer.effectTransforms?.[kind]||layer;
  return Object.fromEntries(['scale','x','y','angle'].map(key=>[key,source[key]]));
}

export function setLayerTransform(layer,kind,values){
  if(!ARTWORK_KINDS.includes(kind)||!validArtworkTransform(values))throw Error('موضع الصورة خارج المجال المسموح.');
  if(kind==='image'){
    for(const effect of ['foil','uv'])if(layer[effect]&&!layer.effectTransforms?.[effect]){
      layer.effectTransforms??={};layer.effectTransforms[effect]=layerTransform(layer);
    }
    Object.assign(layer,layerTransform(values));
  }else{
    layer.effectTransforms??={};layer.effectTransforms[kind]=layerTransform(values);
  }
}

export function artworkFrame(image,drawing,transform){
  const imageWidth=image.naturalWidth||image.width,imageHeight=image.naturalHeight||image.height;
  const fitted=Math.min(drawing.objRectWidth/imageWidth,drawing.objRectHeight/imageHeight)*transform.scale/100;
  return {cx:drawing.objRectWidth/2+transform.x,cy:drawing.objRectHeight/2+transform.y,width:imageWidth*fitted,height:imageHeight*fitted,angle:transform.angle};
}

export function drawPlacedImage(context,image,drawing,canvas,transform){
  if(!image)return;
  const frame=artworkFrame(image,drawing,transform);
  context.save();context.scale(canvas.width/drawing.objRectWidth,canvas.height/drawing.objRectHeight);context.translate(frame.cx,frame.cy);context.rotate(frame.angle*Math.PI/180);
  context.drawImage(image,-frame.width/2,-frame.height/2,frame.width,frame.height);context.restore();
}

export function frameCorner(frame,horizontal,vertical){
  const radians=frame.angle*Math.PI/180,localX=horizontal*frame.width/2,localY=vertical*frame.height/2;
  return {x:frame.cx+localX*Math.cos(radians)-localY*Math.sin(radians),y:frame.cy+localX*Math.sin(radians)+localY*Math.cos(radians)};
}

export function resizeArtwork(transform,frame,corner,delta){
  const anchor=frameCorner(frame,-corner[0],-corner[1]),moving=frameCorner(frame,...corner);
  const diagonal={x:moving.x-anchor.x,y:moving.y-anchor.y};
  const scale=Math.max(5,Math.min(500,transform.scale*(1+(delta.x*diagonal.x+delta.y*diagonal.y)/(diagonal.x**2+diagonal.y**2)))),ratio=scale/transform.scale;
  return {...transform,scale,x:Math.max(-2000,Math.min(2000,transform.x+anchor.x+diagonal.x*ratio/2-frame.cx)),y:Math.max(-2000,Math.min(2000,transform.y+anchor.y+diagonal.y*ratio/2-frame.cy))};
}

export function rotationDelta(center,from,to){
  const degrees=(Math.atan2(to.y-center.cy,to.x-center.cx)-Math.atan2(from.y-center.cy,from.x-center.cx))*180/Math.PI;
  return (degrees+540)%360-180;
}

export function tintMaskPixels(pixels,color){
  const red=parseInt(color.slice(1,3),16),green=parseInt(color.slice(3,5),16),blue=parseInt(color.slice(5,7),16);
  for(let index=0;index<pixels.length;index+=4){
    const alpha=pixels[index];pixels[index]=red;pixels[index+1]=green;pixels[index+2]=blue;pixels[index+3]=alpha;
  }
}

export function normalizeMaskPixels(pixels,useAlpha,invert){
  for(let index=0;index<pixels.length;index+=4){
    const alpha=pixels[index+3]/255,luminance=(pixels[index]*.2126+pixels[index+1]*.7152+pixels[index+2]*.0722)/255;
    const coverage=useAlpha?alpha:(invert?1-luminance:luminance)*alpha;
    const value=Math.round(Math.max(0,Math.min(1,(coverage-.04)/.92))*255);
    pixels[index]=pixels[index+1]=pixels[index+2]=value;pixels[index+3]=255;
  }
}
