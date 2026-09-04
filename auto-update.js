(()=>{
  if(!('serviceWorker' in navigator)) return;
  let reloading=false;
  const reloadOnce=()=>{ if(reloading) return; reloading=true; location.reload(); };
  const register=async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await reg.update();
      if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        if(!worker) return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed' && navigator.serviceWorker.controller){
            if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange',reloadOnce);
      document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') reg.update().catch(()=>{}); });
      window.addEventListener('focus',()=>reg.update().catch(()=>{}));
      setInterval(()=>reg.update().catch(()=>{}),15*60*1000);
    }catch(e){ console.warn('CS auto-update:',e); }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',register,{once:true}); else register();
})();
