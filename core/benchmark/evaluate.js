export function evaluateCheck(check){
  const out={...check};
  if(out.actual===null||out.actual===undefined||out.expected===null||out.expected===undefined){
    out.error=out.error??null;
    out.status='NEEDS_REVIEW';
    return out;
  }
  if(typeof out.expected==='number'&&typeof out.actual==='number'){
    out.error=out.actual-out.expected;
    if(typeof out.tolerance!=='number'){
      out.status='NEEDS_REVIEW';
      return out;
    }
    out.status=Math.abs(out.error)<=out.tolerance?'PASS':'FAIL';
    return out;
  }
  out.error=null;
  out.status=Object.is(out.expected,out.actual)?'PASS':'FAIL';
  return out;
}

export function evaluateBenchmark(benchmark){
  const cases=(benchmark.cases||[]).map(c=>({...c,checks:(c.checks||[]).map(evaluateCheck)}));
  const statuses=cases.flatMap(c=>c.checks.map(x=>x.status));
  const status=statuses.includes('FAIL')?'FAIL':statuses.includes('NEEDS_REVIEW')?'NEEDS_REVIEW':'PASS';
  return {...benchmark,cases,status};
}
