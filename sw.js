const CACHE='controles-sisplan-v2';
const ASSETS=['./','index.html','styles.css','app.js','clientes.js','manifest.webmanifest','icon.svg','assets/FichaTecnica.fr3'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
