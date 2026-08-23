
const DB_NAME = 'controles-sisplan-db';
const DB_VERSION = 1;
const STORE = 'reports';

const initialReport = {
  id: 'ficha-tecnica-inicial',
  screenName: 'APP - FICHA TÉCNICA',
  formName: 'FichaTecnica',
  category: 'Relatórios / Telas',
  tags: ['ficha técnica', 'produto', 'app'],
  notes: 'Relatório inicial cadastrado a partir do arquivo FichaTecnica.fr3 enviado para criação do sistema.',
  favorite: true,
  createdAt: new Date().toISOString(),
  builtIn: true,
  fr3Url: 'assets/FichaTecnica.fr3',
  fr3Name: 'FichaTecnica.fr3',
  imageData: null
};

let reports = [];
let selectedId = null;
let sortAsc = true;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE,{keyPath:'id'});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function getAllReports(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function putReport(report){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(report);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function deleteReport(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

async function ensureInitial(){
  const all=await getAllReports();
  if(!all.some(r=>r.id===initialReport.id)){
    await putReport(initialReport);
  }
}
function escapeHtml(str=''){
  return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function acronym(name){
  return name.replace(/APP\s*-\s*/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'FR';
}
async function refresh(){
  reports=await getAllReports();
  const q=document.querySelector('#globalSearch').value.trim().toLowerCase();
  let filtered=reports.filter(r=>{
    const hay=[r.screenName,r.formName,r.category,r.notes,(r.tags||[]).join(' ')].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });
  filtered.sort((a,b)=>sortAsc?a.screenName.localeCompare(b.screenName):b.screenName.localeCompare(a.screenName));
  document.querySelector('#reportCount').textContent=`${filtered.length} ${filtered.length===1?'item':'itens'}`;
  const list=document.querySelector('#reportList');
  list.innerHTML=filtered.map(r=>`
    <button class="report-item ${r.id===selectedId?'active':''}" data-id="${escapeHtml(r.id)}">
      <span class="report-badge">${acronym(r.screenName)}</span>
      <span class="report-copy">
        <strong>${escapeHtml(r.screenName)}</strong>
        <small>${escapeHtml(r.formName||'Sem nome de form')}</small>
      </span>
      <span class="star ${r.favorite?'on':''}" data-star="${escapeHtml(r.id)}" title="Favorito">★</span>
    </button>`).join('');
  if(!selectedId || !reports.some(r=>r.id===selectedId)) selectedId=filtered[0]?.id || reports[0]?.id || null;
  renderDetail();
  renderFavorites();
}
function renderDetail(){
  const panel=document.querySelector('#reportDetail');
  const r=reports.find(x=>x.id===selectedId);
  if(!r){
    panel.innerHTML=`<div class="empty-state"><div class="empty-icon">▣</div><h2>Nenhum relatório cadastrado</h2><p>Clique em “Novo relatório” para começar.</p></div>`;
    return;
  }
  const fileButton = r.fr3Data
    ? `<button class="secondary" id="downloadFr3">Baixar .FR3</button>`
    : r.fr3Url
      ? `<a class="secondary" href="${r.fr3Url}" download="${escapeHtml(r.fr3Name||'relatorio.fr3')}" style="text-decoration:none">Baixar .FR3</a>`
      : '';
  panel.innerHTML=`
    <div class="detail-header">
      <div>
        <span class="muted-label">${escapeHtml(r.category||'RELATÓRIOS / TELAS')}</span>
        <h2>${escapeHtml(r.screenName)}</h2>
        <p>Arquivo e referência visual organizados em um único lugar.</p>
      </div>
      <div class="detail-actions">
        <button class="secondary" id="favDetail">${r.favorite?'★ Favorito':'☆ Favoritar'}</button>
        ${fileButton}
        ${r.builtIn?'':`<button class="secondary danger" id="deleteReport">Excluir</button>`}
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-card"><span>Nome do Form</span><strong>${escapeHtml(r.formName||'Não informado')}</strong></div>
      <div class="meta-card"><span>Arquivo FR3</span><strong>${escapeHtml(r.fr3Name||'Não anexado')}</strong></div>
      <div class="meta-card"><span>Categoria</span><strong>${escapeHtml(r.category||'Relatórios / Telas')}</strong></div>
    </div>
    <div class="preview-wrap">
      ${r.imageData?`<img src="${r.imageData}" alt="Print do relatório ${escapeHtml(r.screenName)}" />`:
      `<div class="no-preview"><div class="symbol">▧</div><strong>Sem print cadastrado</strong><p>Use “Novo relatório” para adicionar imagem nos próximos relatórios.</p></div>`}
    </div>
    ${r.notes?`<div class="notes-box"><span class="muted-label">OBSERVAÇÕES</span><p>${escapeHtml(r.notes)}</p></div>`:''}
    ${(r.tags||[]).length?`<div class="tag-row">${r.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`:''}
  `;
}
function renderFavorites(){
  const favs=reports.filter(r=>r.favorite);
  const target=document.querySelector('#favoritesList');
  if(!favs.length){target.innerHTML='<p>Nenhum favorito ainda.</p>'; return;}
  target.innerHTML=favs.map(r=>`<button class="favorite-card" data-favopen="${escapeHtml(r.id)}"><strong>${escapeHtml(r.screenName)}</strong><br><small>${escapeHtml(r.formName||'')}</small></button>`).join('');
}
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>resolve(fr.result);
    fr.onerror=()=>reject(fr.error);
    fr.readAsDataURL(file);
  });
}
function fileToText(file){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>resolve(fr.result);
    fr.onerror=()=>reject(fr.error);
    fr.readAsText(file);
  });
}
function downloadText(text, name, type='text/plain'){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}

document.addEventListener('click',async e=>{
  const reportBtn=e.target.closest('.report-item');
  if(reportBtn && !e.target.matches('[data-star]')){
    selectedId=reportBtn.dataset.id; await refresh(); return;
  }
  const star=e.target.closest('[data-star]');
  if(star){
    e.stopPropagation();
    const r=reports.find(x=>x.id===star.dataset.star);
    r.favorite=!r.favorite; await putReport(r); await refresh(); return;
  }
  if(e.target.id==='favDetail'){
    const r=reports.find(x=>x.id===selectedId); r.favorite=!r.favorite; await putReport(r); await refresh();
  }
  if(e.target.id==='downloadFr3'){
    const r=reports.find(x=>x.id===selectedId);
    if(r?.fr3Data) downloadText(r.fr3Data,r.fr3Name||'relatorio.fr3','application/octet-stream');
  }
  if(e.target.id==='deleteReport'){
    const r=reports.find(x=>x.id===selectedId);
    if(r && confirm(`Excluir "${r.screenName}"?`)){ await deleteReport(r.id); selectedId=null; await refresh(); }
  }
  const favOpen=e.target.closest('[data-favopen]');
  if(favOpen){
    selectedId=favOpen.dataset.favopen;
    document.querySelector('[data-section="reports"]').click();
    await refresh();
  }
});

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  const section=btn.dataset.section;
  document.querySelectorAll('.section').forEach(x=>x.classList.add('hidden'));
  document.querySelector(`#${section}Section`).classList.remove('hidden');
  document.querySelector('#pageTitle').textContent=section==='reports'?'Relatórios / Telas':section==='favorites'?'Favoritos':'Backup';
  document.querySelector('#newReportBtn').style.display=section==='reports'?'inline-block':'none';
}));

document.querySelector('#globalSearch').addEventListener('input',refresh);
document.querySelector('#sortBtn').addEventListener('click',()=>{sortAsc=!sortAsc;refresh()});

const modal=document.querySelector('#reportModal');
document.querySelector('#newReportBtn').addEventListener('click',()=>modal.showModal());
document.querySelector('#closeModal').addEventListener('click',()=>modal.close());
document.querySelector('#cancelModal').addEventListener('click',()=>modal.close());

document.querySelector('#reportForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const fr3=document.querySelector('#fr3File').files[0];
  const img=document.querySelector('#imageFile').files[0];
  const report={
    id:'r-'+Date.now(),
    screenName:document.querySelector('#screenName').value.trim(),
    formName:document.querySelector('#formName').value.trim(),
    category:document.querySelector('#category').value.trim()||'Relatórios / Telas',
    tags:document.querySelector('#tags').value.split(',').map(x=>x.trim()).filter(Boolean),
    notes:document.querySelector('#notes').value.trim(),
    favorite:false,
    createdAt:new Date().toISOString(),
    fr3Name:fr3?.name||null,
    fr3Data:fr3?await fileToText(fr3):null,
    imageData:img?await fileToDataURL(img):null
  };
  await putReport(report);
  selectedId=report.id;
  e.target.reset();
  document.querySelector('#category').value='Relatórios / Telas';
  modal.close();
  await refresh();
});

document.querySelector('#exportBtn').addEventListener('click',async()=>{
  const data=await getAllReports();
  downloadText(JSON.stringify({app:'Controles Sisplan',version:1,exportedAt:new Date().toISOString(),reports:data},null,2),'controles-sisplan-backup.json','application/json');
});

document.querySelector('#importBackup').addEventListener('change',async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed.reports)) throw new Error('Formato inválido');
    for(const r of parsed.reports) await putReport(r);
    alert('Backup importado com sucesso.');
    await refresh();
  }catch(err){alert('Não foi possível importar o backup.');}
  e.target.value='';
});

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

(async()=>{
  await ensureInitial();
  reports=await getAllReports();
  selectedId=initialReport.id;
  await refresh();
})();
