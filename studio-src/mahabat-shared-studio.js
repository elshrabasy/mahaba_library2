import {SharedStudio} from './shared-studio.js';

// Keep the original Mahaba Library studio intact. Only replace the sheet source:
// EngView/API-backed drawings -> Mahabat Engine in-memory geometry.
export class MahabatSharedStudio extends SharedStudio {
  async loadSheets(data){
    if(Array.isArray(data.mahabaGeometry)&&data.mahabaGeometry.length){
      return data.mahabaGeometry.map((g,i)=>{
        const cuts=(g.lines||[]).filter(x=>x.type==='cut').map(x=>[x.a,x.b].map(p=>[+p[0],+p[1]]));
        const creases=(g.lines||[]).filter(x=>x.type==='crease').map(x=>[x.a,x.b].map(p=>[+p[0],+p[1]]));
        const polygon=(g.outline||[]).map(p=>[+p[0],+p[1]]);
        const area=Math.abs(polygon.reduce((s,p,j)=>{const q=polygon[(j+1)%polygon.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2);
        return {
          name:g.name||data.drawings?.[i]?.name||data.code,
          width:+g.width,
          height:+g.height,
          polygon,
          cuts,
          creases,
          area,
          nestingSupported:polygon.length>=3,
          sourceBacked:false,
          source:'mahabat-engine'
        };
      });
    }
    return super.loadSheets(data);
  }
}
