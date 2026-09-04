const CACHE='controles-sisplan-v3.1';
const ASSETS=['./','index.html','styles.css','v2.css','ux-patch.css','gastos.css','client-loader.js','app-v2.js','ux-patch.js','gastos.js','bank-privacy.js','auto-update.js','manifest.webmanifest','icon.svg','assets/FichaTecnica.fr3'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))])));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING') self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const req=e.request;
  e.respondWith(fetch(req).then(async r=>{
    let response=r;
    try{
      const type=r.headers.get('content-type')||'';
      if(req.mode==='navigate'&&type.includes('text/html')){
        let html=await r.clone().text();
        if(!html.includes('bank-privacy.js')) html=html.replace('</body>','<script src="bank-privacy.js?v=3.1"></script></body>');
        if(!html.includes('auto-update.js')) html=html.replace('</body>','<script src="auto-update.js?v=3.1"></script></body>');
        response=new Response(html,{status:r.status,statusText:r.statusText,headers:r.headers});
      }
      const c=response.clone(); caches.open(CACHE).then(x=>x.put(req,c));
    }catch{}
    return response;
  }).catch(()=>caches.match(req)));
});
