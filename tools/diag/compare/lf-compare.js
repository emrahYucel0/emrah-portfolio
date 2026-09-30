// The comparison page's driver, in its own file rather than inline: the served build carries the site's real
// Content-Security-Policy, which names exactly one inline script by hash and refuses every other one.
// Inline, this never ran and window.__pair was simply not there.
// BOTH SIDES OFF ONE CLOCK. Same origin, so each is driven directly rather than by two separate sweeps that
// would drift apart — the point of the comparison is the MOTION, and that only survives a shared clock.
//
// Since Phase C the right-hand side is the site itself rather than a debug entry, so it has to be sent to the
// passage first and its own chrome taken out of the frame; what is being compared is the material.
const A=document.getElementById('a'), B=document.getElementById('b'), P=document.getElementById('p')
const ready=(f,k)=>new Promise(r=>{const go=()=>{try{if(f.contentWindow[k])return r(f.contentWindow)}catch(e){}setTimeout(go,120)};go()})
window.__pair=async()=>{
  const da=await ready(A,'__demo'), db=await ready(B,'__lab')
  try{da.document.getElementById('dock').classList.add('hidden')}catch(e){}
  await new Promise(r=>setTimeout(r,1800))
  db.__lab.go(db.__lab.STOP.linefield)
  await new Promise(r=>setTimeout(r,1600))
  try{db.document.querySelectorAll('.layer, .strip').forEach(e=>{e.style.visibility='hidden'})}catch(e){}
  window.__set=(v)=>{da.__demo.setProgress(v);db.__lab.lfSet(v);P.textContent=Math.round(v*100)+'%'}
  window.__sweep=(from,to,ms)=>new Promise(res=>{const t0=performance.now();const s=()=>{const k=Math.min(1,(performance.now()-t0)/ms);window.__set(from+(to-from)*k);k<1?requestAnimationFrame(s):res()};s()})
  return true
}
