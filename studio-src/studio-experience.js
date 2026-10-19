const COPY={
  ar:{workspace:'مساحة العمل',template:'القالب الحالي',save:'حفظ المشروع',export:'تصدير',vector:'رسم متجهي',print:'طباعة 1:1',journey:'من الفكرة إلى الإنتاج',build:'بناء القالب',design:'التصميم والتشطيب',nest:'المونتاج',production:'الإنتاج',preview:'مساحة المعاينة',subtitle:'تفاصيل أوضح. وقرارات أسهل.',tools:'الأدوات',interactive:'معاينة تفاعلية',gesture:'اسحب للدوران · مرّر للتقريب',flatGesture:'الرسم المسطح · اسحب التصميم لضبط المحاذاة',loading:'نجهّز مساحة إبداعك',ready:'جاهز للمعاينة',error:'تعذّر تجهيز القالب',flat:'مسطّح',closed:'مطويّ',allFolds:'كل الطيات',body:'الجسم',bottom:'القاعدة',top:'الغطاء',fit:'توسيط المجسم · F',focus:'توسيع المعاينة',restore:'العودة لمساحة العمل · Esc',open:'فتح مشروع',close:'إغلاق لوحة الأدوات',views:{'3d':'ثلاثي الأبعاد','2d':'الرسم المسطح',split:'الرسم والمجسم'}},
  en:{workspace:'Workspace',template:'Current template',save:'Save project',export:'Export',vector:'Vector drawing',print:'Print at 1:1',journey:'From idea to production',build:'Build',design:'Design & finish',nest:'Nesting',production:'Production',preview:'Your workbench',subtitle:'Clearer details. Better decisions.',tools:'Tools',interactive:'Interactive preview',gesture:'Drag to orbit · Scroll to zoom',flatGesture:'2D dieline · Drag artwork to align',loading:'Preparing your workspace',ready:'Ready to preview',error:'Could not load template',flat:'Flat',closed:'Folded',allFolds:'All folds',body:'Body',bottom:'Bottom',top:'Top',fit:'Fit model · F',focus:'Expand preview',restore:'Back to workspace · Esc',open:'Open project',close:'Close tools',views:{'3d':'3D preview','2d':'2D dieline',split:'Dieline & model'}}
};

export function workflowStep(pane){
  if(pane==='engineering')return 'production';
  if(['art','finishes','light'].includes(pane))return 'art';
  if(pane==='nest'||pane==='production')return pane;
  return 'dimensions';
}

export function isEditingTarget(target){
  return Boolean(target?.isContentEditable||target?.closest?.('input,select,textarea,[contenteditable="true"]'));
}

export function fitCameraDistance(size,aspect,fovDegrees=32){
  const radius=Math.hypot(...size)/2,verticalAngle=fovDegrees*Math.PI/360;
  const horizontalAngle=Math.atan(Math.tan(verticalAngle)*Math.max(.1,aspect));
  return Math.max(.08,radius/Math.sin(Math.min(verticalAngle,horizontalAngle))*1.12);
}

export class StudioExperience{
  constructor(studio,viewer,ui){
    const stylesheet=document.getElementById('studioExperienceStyles');
    if(stylesheet)document.head.append(stylesheet);
    this.studio=studio;this.viewer=viewer;this.ui=ui;this.ready=false;this.loadedOnce=false;
    this.layout=studio.root.closest('.ms-layout');
    this.mobile=window.matchMedia('(max-width:760px)');
    this.backdrop=document.getElementById('studioBackdrop');
    this.toggle=document.getElementById('studioPanelToggle');
    this.focusButton=document.getElementById('studioFocus');
    this.exportMenu=document.getElementById('studioExportMenu');
    this.installBindings();this.wrapStudio();this.localize();this.syncView();
    if(this.mobile.matches)this.studio.setPane(null);else this.syncPanel();
  }
  copy(){return COPY[document.documentElement.lang]||COPY.ar;}
  setText(element,text){if(element&&element.textContent!==text)element.textContent=text;}
  activatePane(pane){
    if(document.body.classList.contains('atelier-focused'))this.setFocus(false);
    const actualPane=pane==='production'?'engineering':pane;
    const button=this.studio.rail.querySelector(`[data-pane="${actualPane}"]`);
    if(button&&this.studio.panel!==actualPane)button.click();
  }
  installBindings(){
    for(const button of document.querySelectorAll('[data-studio-step]'))button.addEventListener('click',()=>this.activatePane(button.dataset.studioStep));
    this.toggle.addEventListener('click',()=>{
      if(document.body.classList.contains('atelier-focused')){this.setFocus(false);return;}
      this.studio.setPane(this.studio.root.hidden?'dimensions':null);
    });
    this.backdrop.addEventListener('click',()=>this.studio.setPane(null));
    document.getElementById('studioFit').addEventListener('click',()=>this.fitPreview());
    this.focusButton.addEventListener('click',()=>this.setFocus(!document.body.classList.contains('atelier-focused')));
    for(const button of document.querySelectorAll('[data-studio-export]'))button.addEventListener('click',()=>{
      this.studio.$(button.dataset.studioExport==='svg'?'exportSvg':'exportPdf').click();
      this.exportMenu.open=false;
    });
    document.addEventListener('pointerdown',event=>{if(!this.exportMenu.contains(event.target))this.exportMenu.open=false;});
    document.addEventListener('keydown',event=>this.onKey(event));
    this.mobile.addEventListener('change',()=>{this.syncPanel();if(this.mobile.matches&&!this.studio.root.hidden)this.studio.$('closePane').focus({preventScroll:true});});
    window.addEventListener('storage',event=>{if(['mahaba:lang','mahaba:theme'].includes(event.key))this.ui.apply();});
  }
  wrapStudio(){
    const setPane=this.studio.setPane.bind(this.studio);
    this.studio.setPane=pane=>{
      const wasClosed=this.studio.root.hidden;
      if(pane&&wasClosed)this.returnFocus=document.activeElement;
      setPane(pane);this.syncPanel();this.syncStep(pane);
      if(pane&&wasClosed&&this.mobile.matches)this.studio.$('closePane').focus({preventScroll:true});
      if(!pane&&this.mobile.matches)(this.returnFocus?.isConnected?this.returnFocus:this.toggle).focus({preventScroll:true});
    };
    const switchView=this.studio.switchView.bind(this.studio);
    this.studio.switchView=mode=>{switchView(mode);this.syncView();this.syncStep(this.studio.panel);};
    const openNesting=this.studio.openNesting.bind(this.studio);
    this.studio.openNesting=()=>{openNesting();if(!this.studio.workspace.querySelector('.ms-nesting-workspace').hidden)this.syncStep('nest');};
    this.studio.$('backStudio').addEventListener('click',()=>this.syncStep(this.studio.panel));
    const apply=this.ui.apply.bind(this.ui);
    this.ui.apply=(...args)=>{apply(...args);this.localize();};
    const load=this.viewer.load.bind(this.viewer);
    this.viewer.load=async(...args)=>{
      const previousFold=this.loadedOnce?Number(this.viewer.slider.value)/1000:1;
      this.ready=false;this.failed=false;this.layout.setAttribute('aria-busy','true');this.localize();
      try{
      const loaded=await load(...args);
        this.ready=Boolean(loaded);this.failed=!loaded;
        if(loaded){this.loadedOnce=true;this.viewer.seek(previousFold,true);this.updateDimensions();}
        return loaded;
      }finally{
        this.layout.setAttribute('aria-busy','false');this.localize();this.syncPanel();
      }
    };
  }
  syncPanel(){
    const open=!this.studio.root.hidden&&!document.body.classList.contains('atelier-focused');
    const modal=open&&this.mobile.matches;
    this.backdrop.hidden=!modal;
    this.toggle.setAttribute('aria-expanded',String(open));
    this.studio.workspace.inert=modal;
    document.body.classList.toggle('atelier-panel-open',modal);
    if(modal){this.studio.root.setAttribute('role','dialog');this.studio.root.setAttribute('aria-modal','true');}
    else{this.studio.root.removeAttribute('role');this.studio.root.removeAttribute('aria-modal');}
  }
  syncStep(pane){
    const step=workflowStep(pane);
    for(const button of document.querySelectorAll('[data-studio-step]')){
      if(button.dataset.studioStep===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    }
  }
  syncView(){
    const mode=this.studio.view||'3d',copy=this.copy();
    this.studio.workspace.dataset.view=mode;
    for(const [id,view] of [['three','3d'],['two','2d'],['splitView','split']])this.studio.$(id).setAttribute('aria-pressed',String(mode===view));
    this.setText(document.getElementById('studioViewLabel'),copy.views[mode]);
    this.setText(document.querySelector('[data-experience="gesture"]'),mode==='2d'?copy.flatGesture:copy.gesture);
    document.querySelector('.ms-fold-controls').hidden=mode==='2d';
  }
  fitPreview(){
    if(this.studio.view==='2d'){
      const drawing=this.studio.$('flat');drawing.scrollTop=0;drawing.scrollLeft=0;
    }else this.viewer.fit?.();
  }
  setFocus(focused){
    document.body.classList.toggle('atelier-focused',focused);
    this.focusButton.setAttribute('aria-pressed',String(focused));
    this.syncPanel();this.localize();window.dispatchEvent(new Event('resize'));
  }
  updateDimensions(){
    const parameters=this.studio.data?.requestedParameters||{};
    const dimensions=['L','W','H'].map(key=>Number(parameters[key]));
    const text=dimensions.every(value=>Number.isFinite(value)&&value>0)?dimensions.map(value=>Number(value.toFixed(1))).join(' × ')+' mm':this.viewer.currentCode;
    this.setText(document.getElementById('studioDimensionSummary'),text);
  }
  localize(){
    const copy=this.copy();
    for(const element of document.querySelectorAll('[data-experience]')){
      const key=element.dataset.experience;
      if(key!=='gesture'&&key!=='loading'&&copy[key])this.setText(element,copy[key]);
    }
    this.setText(document.getElementById('studioReady'),this.failed?copy.error:this.ready?copy.ready:copy.loading);
    this.setText(document.getElementById('foldFlat'),copy.flat);this.setText(document.getElementById('foldClosed'),copy.closed);
    for(const [value,key] of [['all','allFolds'],['0','body'],['1','bottom'],['2','top']])this.setText(document.querySelector(`#foldPhase option[value="${value}"]`),copy[key]);
    for(const [id,key] of [['headerSave','save'],['headerOpen','open'],['studioFit','fit'],['studioBackdrop','close']]){
      const button=document.getElementById(id);button.setAttribute('aria-label',copy[key]);button.title=copy[key];
    }
    const focusLabel=document.body.classList.contains('atelier-focused')?copy.restore:copy.focus;
    this.focusButton.setAttribute('aria-label',focusLabel);this.focusButton.title=focusLabel;
    this.studio.root.setAttribute('aria-label',copy.tools);
    document.querySelector('.atelier-flow').setAttribute('aria-label',copy.journey);
    this.syncView();
  }
  onKey(event){
    if(event.key==='Escape'){
      this.exportMenu.open=false;
      if(document.body.classList.contains('atelier-focused')){this.setFocus(false);this.focusButton.focus();}
      else if(this.mobile.matches&&!this.studio.root.hidden)this.studio.setPane(null);
      return;
    }
    if(event.code==='KeyF'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!isEditingTarget(event.target)){
      event.preventDefault();this.fitPreview();
    }
    if(event.key==='Tab'&&this.mobile.matches&&!this.studio.root.hidden){
      const controls=[...this.studio.root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(control=>control.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }
}
