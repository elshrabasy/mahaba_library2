// Bridge Mahabat Engine drawings into the existing Mahaba Library Studio.
// This deliberately reuses SharedStudio artwork/finishes/nesting instead of rebuilding them.
import {SharedStudio} from './shared-studio.js';
import {studioSheet} from '../engine/mahabat-adapter.js';
import '../engine/registry.js';

const originalLoadSheets=SharedStudio.prototype.loadSheets;
SharedStudio.prototype.loadSheets=async function(data){
  if(data?.source==='mahabat-engine'){
    return data.drawings.map((_,i)=>studioSheet(data,i));
  }
  return originalLoadSheets.call(this,data);
};

const originalExport=SharedStudio.prototype.exportDrawing;
SharedStudio.prototype.exportDrawing=async function(type){
  if(this.data?.source!=='mahabat-engine')return originalExport.call(this,type);
  const i=+this.$('drawing').value,t=this.sheets?.[i];
  if(!t){this.message('انتظر تجهيز الرسم ثم أعد التنزيل.');return;}
  const {svgDrawing,pdfDrawing}=await import('./studio-core.js');
  const pdf=type==='pdf';
  const blob=new Blob([pdf?pdfDrawing(t):svgDrawing(t)],{type:pdf?'application/pdf':'image/svg+xml'});
  this.download(blob,`${this.code}-sheet${i}.${type}`);
  this.message('تم تنزيل رسم Mahabat Engine بمقياس 1:1.');
};

export function mahabaStudioModel(engineResult){
  // Dynamic import avoids creating another Studio implementation.
  return import('../engine/mahabat-adapter.js').then(({toStudioNativeModel})=>toStudioNativeModel(engineResult));
}
