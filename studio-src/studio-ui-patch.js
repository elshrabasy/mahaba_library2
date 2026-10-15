const STRINGS={
 ar:{dimensions:'المقاسات والخامة',art:'التصميم',finishes:'التشطيبات',light:'الإضاءة',nest:'المونتاج',project:'المشروع',control:'لوحة التحكم',material:'الخامة',materialAppearance:'مظهر الخامة',surfaceFinish:'تشطيب السطح',source:'خامة المصدر',white:'كرتون أبيض',kraft:'كرافت',matte:'مطفي',satin:'ساتان',gloss:'لامع',materialNote:'مظهر الخامة للمعاينة؛ السماكة وتعويضات الثني تأتي من المحرك الهندسي.',back:'العودة'},
 en:{dimensions:'Dimensions & Material',art:'Artwork',finishes:'Finishes',light:'Lighting',nest:'Nesting',project:'Project',control:'Controls',material:'Material',materialAppearance:'Material appearance',surfaceFinish:'Surface finish',source:'Source material',white:'White board',kraft:'Kraft',matte:'Matte',satin:'Satin',gloss:'Gloss',materialNote:'Material appearance is visual; thickness and fold compensation come from the engineering engine.',back:'Back'}
};
const q=(root,s)=>root?.querySelector?.(s)||null;
export function installStudioUIPatch(studio){
 if(!studio?.root||studio.root.dataset.mahabaUiPatched)return;
 studio.root.dataset.mahabaUiPatched='1';
 const dimensions=q(studio.root,'[data-panel="dimensions"]'),stockPane=q(studio.root,'[data-panel="stock"]');
 const stockButton=q(studio.rail,'[data-pane="stock"]');
 if(dimensions&&stockPane){
  const materialBlock=document.createElement('div');materialBlock.className='mahaba-material-inline';materialBlock.dataset.materialInline='1';
  materialBlock.innerHTML='<div class="mahaba-inline-divider"><span data-ui="materialTitle">الخامة</span></div>';
  while(stockPane.firstChild)materialBlock.append(stockPane.firstChild);
  const actions=q(dimensions,'[data-id="applyDimensions"]');
  dimensions.insertBefore(materialBlock,actions||null);
  stockPane.remove();
 }
 stockButton?.remove();
 const style=document.createElement('style');style.id='mahabaStudioUIPatchStyle';style.textContent=`
 .mahaba-material-inline{margin-top:14px;padding-top:4px}.mahaba-inline-divider{display:flex;align-items:center;gap:8px;margin:10px 0 8px;color:var(--text,#eaf3f5);font-size:11px;font-weight:700}.mahaba-inline-divider:before,.mahaba-inline-divider:after{content:"";height:1px;flex:1;background:var(--line,#29434f)}
 .mahaba-prefs{display:flex;gap:6px;align-items:center;margin-inline-start:6px}.mahaba-prefs button{min-width:36px;height:31px;border:1px solid var(--line,#29434f);border-radius:9px;background:var(--panel,#122631);color:var(--text,#eaf3f5);font:700 10px Tahoma,Arial;cursor:pointer}
 html[data-theme="light"]{--bg:#eef3f5;--panel:#fff;--line:#cad7dc;--text:#17313b;--muted:#6f8791;--teal:#1aa99f;--gold:#a88635}html[data-theme="light"] body{background:#eef3f5!important;color:#17313b!important}html[data-theme="light"] .mahaba-head{background:linear-gradient(180deg,#fff,#edf3f5)!important;border-color:#d5e0e4!important}html[data-theme="light"] .mahaba-brand{color:#17313b}html[data-theme="light"] .mahaba-template-switch,html[data-theme="light"] .mahaba-template-switch select,html[data-theme="light"] .mahaba-back,html[data-theme="light"] .mahaba-prefs button{background:#fff!important;color:#17313b!important;border-color:#c9d8dd!important}html[data-theme="light"] .ms-layout #studioInspector{background:linear-gradient(160deg,#fff,#edf3f5)!important;color:#17313b!important}html[data-theme="light"] .ms-layout #studioRail{background:#fff!important;border-color:#cad7dc!important}html[data-theme="light"] .ms-layout #studioRail button{color:#55717b!important}html[data-theme="light"] .ms-layout #studioRail button.active{color:#087f86!important;background:#e2f7f4!important}html[data-theme="light"] .ms-layout .workspace>.view,html[data-theme="light"] .ms-layout .panel-toolbar,html[data-theme="light"] .ms-layout .ms-fold-controls{background:#f8fbfc!important;border-color:#cad7dc!important;color:#17313b!important}html[data-theme="light"] #canvas3d{background:#eef3f5!important}
 @media(max-width:760px){.mahaba-prefs{margin-inline-start:0}.mahaba-prefs button{min-width:30px;height:30px;padding:0!important}.mahaba-material-inline{margin-top:9px}.mahaba-inline-divider{margin:7px 0 5px}.ms-layout #studioRail button{flex-basis:58px!important}}
 `;document.head.append(style);
 const head=document.querySelector('.mahaba-head');let prefs=head?.querySelector('.mahaba-prefs');if(head&&!prefs){prefs=document.createElement('div');prefs.className='mahaba-prefs';prefs.innerHTML='<button type="button" data-pref="lang">EN</button><button type="button" data-pref="theme">☀</button>';const back=document.getElementById('back');head.insertBefore(prefs,back||null);}
 const getPrefs=()=>({lang:localStorage.getItem('mahaba:lang')||'ar',theme:localStorage.getItem('mahaba:theme')||'dark'});
 const apply=()=>{const p=getPrefs(),s=STRINGS[p.lang]||STRINGS.ar;document.documentElement.lang=p.lang;document.documentElement.dir=p.lang==='ar'?'rtl':'ltr';document.documentElement.dataset.theme=p.theme;const labels={dimensions:s.dimensions,art:s.art,finishes:s.finishes,light:s.light,nest:s.nest,project:s.project};for(const [k,v] of Object.entries(labels)){const b=q(studio.rail,`[data-pane="${k}"] span`);if(b)b.textContent=v;const btn=q(studio.rail,`[data-pane="${k}"]`);if(btn)btn.title=v;}const title=q(studio.root,'[data-id="title"]');if(title&&studio.panel)title.textContent=labels[studio.panel]||s.dimensions;const kicker=q(studio.root,'.inspector-heading small');if(kicker)kicker.textContent=s.control;const mt=q(studio.root,'[data-ui="materialTitle"]');if(mt)mt.textContent=s.material;const stock=q(studio.root,'[data-id="stock"]'),finish=q(studio.root,'[data-id="finish"]');if(stock){const vals={source:s.source,white:s.white,kraft:s.kraft};[...stock.options].forEach(o=>o.textContent=vals[o.value]||o.textContent);}if(finish){const vals={matte:s.matte,satin:s.satin,gloss:s.gloss};[...finish.options].forEach(o=>o.textContent=vals[o.value]||o.textContent);}const back=document.getElementById('back');if(back)back.textContent=s.back;if(prefs){q(prefs,'[data-pref="lang"]').textContent=p.lang==='ar'?'EN':'ع';q(prefs,'[data-pref="theme"]').textContent=p.theme==='dark'?'☀':'◐';}const iframe=studio.$?.('nesting');iframe?.contentWindow?.postMessage?.({type:'mahaba:preferences',...p},'*');window.dispatchEvent(new Event('resize'));};
 prefs?.querySelector('[data-pref="lang"]')?.addEventListener('click',()=>{const p=getPrefs();localStorage.setItem('mahaba:lang',p.lang==='ar'?'en':'ar');apply();});
 prefs?.querySelector('[data-pref="theme"]')?.addEventListener('click',()=>{const p=getPrefs();localStorage.setItem('mahaba:theme',p.theme==='dark'?'light':'dark');apply();});
 const oldSetPane=studio.setPane;studio.setPane=key=>{oldSetPane(key);apply();};
 window.addEventListener('message',e=>{if(e.data?.type==='mahaba:nesting-ready')apply();});
 apply();
}
