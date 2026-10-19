export function drawingPathPoints(line){
  const start=[...line.a],end=[...line.b];
  if(!line.arc)return [start,end];
  const {c,r}=line.arc;
  const startAngle=Math.atan2(start[1]-c[1],start[0]-c[0]);
  let sweep=Math.atan2(end[1]-c[1],end[0]-c[0])-startAngle;
  while(sweep>Math.PI)sweep-=Math.PI*2;
  while(sweep<-Math.PI)sweep+=Math.PI*2;
  const steps=Math.max(3,Math.ceil(Math.abs(sweep)/(Math.PI/36))),points=[start];
  for(let index=1;index<steps;index++){
    const angle=startAngle+sweep*index/steps;
    points.push([c[0]+r*Math.cos(angle),c[1]+r*Math.sin(angle)]);
  }
  points.push(end);return points;
}
