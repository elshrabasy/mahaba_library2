importScripts('./nest-engine.js?v=20261007-nesting');
self.onmessage=e=>{
 try{
  const {T,N,c}=e.data;
  const preview=NestEngine.regularSolution(T,c);
  postMessage({preview});
  if(!preview.results.length){postMessage({result:preview});return;}
  postMessage({stage:'جارٍ تجهيز حدود التعشيق الهندسية…'});
  const result=NestEngine.solve(T,N,c,p=>postMessage({progress:p}));
  postMessage({result});
 }catch(error){postMessage({error:error.message||String(error)});}
};
