const BODY_PANELS={
  EVC11001:{L:'P1',W:'P2',H:'P3'},
  'MAH-FEC-STE-001':{L:'P_BACK',W:'P_SIDE_R',H:'P_FRONT'}
};

function panelBounds(panel){
  const points=panel?.poly;
  if(!Array.isArray(points)||points.length<3||points.some(point=>!Array.isArray(point)||!point.slice(0,2).every(Number.isFinite)))return null;
  const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  return right>left&&bottom>top?{left,right,top,bottom}:null;
}

export function boxDimensionGuides(data,partIndex=0,side='outside'){
  const mapping=BODY_PANELS[data?.code],part=data?.mahabaGeometry?.[partIndex];
  if(!mapping||!part||!Number.isFinite(part.width)||part.width<=0)return [];
  const mode=data.metadata?.dimensionType?.key;
  const dimensionMode=['ID','OD','SS'].includes(mode)?mode:'';
  return Object.entries(mapping).flatMap(([axis,panelId])=>{
    const value=Number(data.requestedParameters?.[axis]);
    const bounds=panelBounds(part.panels?.find(panel=>panel.id===panelId));
    if(!bounds||!Number.isFinite(value)||value<=0)return [];
    const centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2;
    const vertical=axis==='H';
    const from=vertical?[centerX,bounds.top]:[bounds.left,centerY];
    const to=vertical?[centerX,bounds.bottom]:[bounds.right,centerY];
    if(side==='inside'){
      from[0]=part.width-from[0];to[0]=part.width-to[0];
      if(!vertical)[from[0],to[0]]=[to[0],from[0]];
    }
    return [{axis,value,mode:dimensionMode,vertical,from,to,labelSpan:bounds.right-bounds.left}];
  });
}

export function dimensionViewportScale(viewBox,width,height){
  const scale=Math.min(width/viewBox.width,height/viewBox.height);
  return Number.isFinite(scale)&&scale>0?scale:1;
}

export function dimensionGuidesSvg(guides,scale=1){
  if(!guides.length)return '';
  const pixels=1/(Number.isFinite(scale)&&scale>0?scale:1);
  const number=value=>Number(value.toFixed(4));
  const format=value=>String(Number(value.toFixed(3)));
  const content=guides.map(guide=>{
    const {axis,value,mode,vertical,from,to}=guide;
    const text=`${axis} ${format(value)}`;
    const fontSize=Math.min(12*pixels,guide.labelSpan*.86/(text.length*.56+2.8));
    const unitSize=fontSize*.72,labelWidth=(text.length*.56+2.8)*fontSize,labelHeight=fontSize*2;
    const centerX=(from[0]+to[0])/2,centerY=(from[1]+to[1])/2;
    const labelY=vertical?centerY:centerY-15*pixels;
    const length=Math.hypot(to[0]-from[0],to[1]-from[1]);
    const arrow=Math.min(4.5*pixels,length/8),wing=arrow*.48,tick=4*pixels;
    const path=vertical
      ?`M${number(from[0]-tick)} ${number(from[1])}h${number(tick*2)}M${number(to[0]-tick)} ${number(to[1])}h${number(tick*2)}`
      :`M${number(from[0])} ${number(from[1]-tick)}v${number(tick*2)}M${number(to[0])} ${number(to[1]-tick)}v${number(tick*2)}`;
    const arrows=vertical
      ?`M${number(from[0])} ${number(from[1])}l${number(-wing)} ${number(arrow)}h${number(wing*2)}ZM${number(to[0])} ${number(to[1])}l${number(-wing)} ${number(-arrow)}h${number(wing*2)}Z`
      :`M${number(from[0])} ${number(from[1])}l${number(arrow)} ${number(-wing)}v${number(wing*2)}ZM${number(to[0])} ${number(to[1])}l${number(-arrow)} ${number(-wing)}v${number(wing*2)}Z`;
    return `<g class="box-dimension" data-axis="${axis}" data-value="${value}" role="img" aria-label="${axis} ${format(value)} mm${mode?' · '+mode:''}"><title>${axis} = ${format(value)} mm${mode?' · '+mode:''}</title><path class="box-dimension-ticks" d="${path}"/><line x1="${number(from[0])}" y1="${number(from[1])}" x2="${number(to[0])}" y2="${number(to[1])}"/><path class="box-dimension-arrows" d="${arrows}"/><g class="box-dimension-label"><rect x="${number(centerX-labelWidth/2)}" y="${number(labelY-labelHeight/2)}" width="${number(labelWidth)}" height="${number(labelHeight)}" rx="${number(fontSize*.55)}"/><text x="${number(centerX)}" y="${number(labelY)}" font-size="${number(fontSize)}" direction="ltr" unicode-bidi="isolate" text-anchor="middle" dominant-baseline="central"><tspan font-weight="600">${axis}</tspan><tspan> ${format(value)}</tspan><tspan font-size="${number(unitSize)}"> mm</tspan></text></g></g>`;
  }).join('');
  return `<g class="box-dimensions" data-box-dimensions="true" pointer-events="none">${content}</g>`;
}
