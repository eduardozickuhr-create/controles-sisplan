(()=>{
  const rawClients = window.SISPLAN_CLIENTES || [];
  const clients = rawClients.map(c => Array.isArray(c)
    ? {codigo:String(c[0]||''), fantasia:String(c[1]||''), cidade:String(c[2]||''), uf:String(c[3]||''), nome:String(c[4]||'')}
    : {codigo:String(c.codigo||''), fantasia:String(c.fantasia||''), cidade:String(c.cidade||''), uf:String(c.uf||''), nome:String(c.nome||'')});

  const hourOriginal = document.getElementById('hourQty');
  const clientOriginal = document.getElementById('hourClient');
  const hourForm = document.getElementById('hourForm');
  const modal = document.getElementById('hourModal');
  if(!hourOriginal || !clientOriginal || !hourForm || !modal) return;

  function decimalToClock(value){
    const n = Number(value || 0);
    if(!Number.isFinite(n) || n <= 0) return '';
    let h = Math.floor(n);
    let m = Math.round((n - h) * 60);
    if(m === 60){ h++; m = 0; }
    return `${h}:${String(m).padStart(2,'0')}`;
  }

  function clockToDecimal(value){
    const s = String(value || '').trim().replace(',', '.');
    if(!s) return null;
    if(/^\d+(\.\d+)?$/.test(s)) return Number(s);
    const m = s.match(/^(\d{1,3})\s*:\s*(\d{1,2})$/);
    if(!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    if(min < 0 || min > 59) return null;
    return h + min / 60;
  }

  hourOriginal.type = 'hidden';
  hourOriginal.removeAttribute('required');
  const timeInput = document.createElement('input');
  timeInput.id = 'hourQtyTime';
  timeInput.type = 'text';
  timeInput.inputMode = 'numeric';
  timeInput.autocomplete = 'off';
  timeInput.placeholder = 'Ex.: 9:15';
  timeInput.required = true;
  hourOriginal.before(timeInput);

  const helper = document.createElement('small');
  helper.id = 'hourConversionHint';
  helper.className = 'field-helper';
  helper.textContent = 'Digite horas:minutos. Ex.: 9:15 = 9,25 horas decimais.';
  hourOriginal.after(helper);

  function syncTimeToDecimal(showError=false){
    const decimal = clockToDecimal(timeInput.value);
    if(decimal === null){
      hourOriginal.value = '';
      helper.textContent = showError ? 'Formato inválido. Use, por exemplo, 9:15.' : 'Digite horas:minutos. Ex.: 9:15 = 9,25 horas decimais.';
      helper.classList.toggle('error', showError);
      hourOriginal.dispatchEvent(new Event('input',{bubbles:true}));
      return false;
    }
    hourOriginal.value = String(decimal);
    const h = Math.floor(decimal), min = Math.round((decimal-h)*60);
    helper.textContent = `${h}:${String(min).padStart(2,'0')} → ${min}/60 = ${(min/60).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}; total decimal = ${decimal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})} h.`;
    helper.classList.remove('error');
    hourOriginal.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }
  timeInput.addEventListener('input',()=>syncTimeToDecimal(false));
  timeInput.addEventListener('blur',()=>syncTimeToDecimal(true));

  clientOriginal.style.display = 'none';
  clientOriginal.removeAttribute('required');
  const combo = document.createElement('div');
  combo.className = 'client-combo';
  const search = document.createElement('input');
  search.id = 'hourClientSearch';
  search.type = 'text';
  search.autocomplete = 'off';
  search.placeholder = 'Digite código, cliente, razão social ou cidade...';
  search.required = true;
  const results = document.createElement('div');
  results.className = 'client-results';
  results.hidden = true;
  combo.append(search, results);
  clientOriginal.before(combo);

  function clientLabel(c){ return `${c.codigo} — ${c.fantasia} — ${c.cidade}/${c.uf}`; }
  function normalize(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function selectClient(c){
    clientOriginal.value = c.codigo;
    search.value = clientLabel(c);
    search.dataset.selectedCode = c.codigo;
    results.hidden = true;
    clientOriginal.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function renderResults(term){
    const t = normalize(term).trim();
    if(!t){ results.hidden = true; results.innerHTML=''; return; }
    const filtered = clients.filter(c => normalize([c.codigo,c.fantasia,c.nome,c.cidade,c.uf].join(' ')).includes(t)).slice(0,40);
    results.innerHTML = filtered.length ? filtered.map(c => `<button type="button" class="client-option" data-code="${c.codigo.replace(/"/g,'&quot;')}"><strong>${c.codigo} — ${c.fantasia}</strong><span>${c.nome || ''}</span><small>${c.cidade}/${c.uf}</small></button>`).join('') : '<div class="client-empty">Nenhum cliente encontrado.</div>';
    results.hidden = false;
  }
  search.addEventListener('input',()=>{
    search.dataset.selectedCode='';
    clientOriginal.value='';
    renderResults(search.value);
  });
  search.addEventListener('focus',()=>{ if(search.value && !search.dataset.selectedCode) renderResults(search.value); });
  results.addEventListener('click',e=>{
    const btn=e.target.closest('[data-code]'); if(!btn) return;
    const c=clients.find(x=>x.codigo===btn.dataset.code); if(c) selectClient(c);
  });
  document.addEventListener('click',e=>{ if(!combo.contains(e.target)) results.hidden=true; });

  const observer = new MutationObserver(()=>{
    if(!modal.open) return;
    setTimeout(()=>{
      timeInput.value = decimalToClock(hourOriginal.value);
      syncTimeToDecimal(false);
      const code = clientOriginal.value;
      const c = clients.find(x=>x.codigo===code);
      if(c) selectClient(c); else { search.value=''; search.dataset.selectedCode=''; }
    },0);
  });
  observer.observe(modal,{attributes:true,attributeFilter:['open']});

  hourForm.addEventListener('submit',e=>{
    if(!syncTimeToDecimal(true)){
      e.preventDefault(); e.stopImmediatePropagation(); timeInput.focus(); return;
    }
    if(!clientOriginal.value){
      e.preventDefault(); e.stopImmediatePropagation();
      search.setCustomValidity('Selecione um cliente da lista.'); search.reportValidity(); search.setCustomValidity(''); search.focus();
    }
  },true);
})();


/* QUICK IMAGE CAPTURE V1 */
(()=>{
  const modal=document.getElementById('reportModal');
  const form=document.getElementById('reportForm');
  const input=document.getElementById('imageFile');
  const hint=document.getElementById('imageHint');
  const screenName=document.getElementById('screenName');
  const box=input?.closest('.upload-box');
  if(!modal||!form||!input||!hint||!box) return;

  box.classList.add('paste-image-box');
  const title=box.querySelector('strong');
  if(title) title.textContent='Print / imagem — cole aqui';
  input.setAttribute('title','Escolher imagem ou colar com Ctrl + V');

  const preview=document.createElement('div');
  preview.className='paste-preview';
  preview.hidden=true;
  box.append(preview);

  let previewUrl='';
  function showFile(file,source='selecionada'){
    if(!file||!file.type.startsWith('image/')) return false;
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=URL.createObjectURL(file);
    preview.innerHTML='<img alt="Pré-visualização da imagem"><button type="button" aria-label="Remover imagem" title="Remover imagem">×</button>';
    preview.querySelector('img').src=previewUrl;
    preview.hidden=false;
    hint.textContent=`Imagem ${source}: ${file.name||'print da área de transferência'}`;
    box.classList.add('has-image');
    return true;
  }
  function attachFile(file,source){
    const ext=(file.type.split('/')[1]||'png').replace('jpeg','jpg');
    const named=file.name?file:new File([file],`print-${new Date().toISOString().replace(/[:.]/g,'-') }.${ext}`,{type:file.type});
    const transfer=new DataTransfer();
    transfer.items.add(named);
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    showFile(named,source);
  }
  function clipboardImage(event){
    return [...(event.clipboardData?.items||[])].find(item=>item.type.startsWith('image/'))?.getAsFile();
  }
  document.addEventListener('paste',event=>{
    if(!modal.open) return;
    const file=clipboardImage(event);
    if(!file) return;
    event.preventDefault();
    attachFile(file,'colada');
  });
  input.addEventListener('change',()=>{ if(input.files[0]) showFile(input.files[0],'selecionada'); });
  preview.addEventListener('click',event=>{
    if(!event.target.closest('button')) return;
    input.value='';
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl='';
    preview.hidden=true;
    box.classList.remove('has-image');
    hint.textContent='Pressione Ctrl + V, arraste ou clique para escolher';
  });
  ['dragenter','dragover'].forEach(type=>box.addEventListener(type,event=>{
    event.preventDefault();
    box.classList.add('is-dragging');
  }));
  ['dragleave','drop'].forEach(type=>box.addEventListener(type,event=>{
    event.preventDefault();
    box.classList.remove('is-dragging');
  }));
  box.addEventListener('drop',event=>{
    const file=[...(event.dataTransfer?.files||[])].find(item=>item.type.startsWith('image/'));
    if(file) attachFile(file,'arrastada');
  });
  document.addEventListener('keydown',event=>{
    if(!modal.open) return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
      event.preventDefault();
      form.requestSubmit();
    }
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){
      event.preventDefault();
      form.requestSubmit();
    }
  });
  const observer=new MutationObserver(()=>{
    if(!modal.open) return;
    input.value='';
    preview.hidden=true;
    box.classList.remove('has-image','is-dragging');
    hint.textContent='Pressione Ctrl + V, arraste ou clique para escolher';
    requestAnimationFrame(()=>screenName.focus());
  });
  observer.observe(modal,{attributes:true,attributeFilter:['open']});
})();


/* FR3 VISUAL PREVIEW V1 */
(()=>{
  const detail=document.getElementById('reportDetail');
  if(!detail) return;
  const num=value=>Number(String(value||'0').replace(',','.'))||0;
  const attr=(node,name,fallback='')=>node.getAttribute(name)??fallback;
  const mmToPx=mm=>num(mm)*3.7795275591;
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const color=value=>{
    const n=Number(value);
    if(!Number.isFinite(n)||n===-16777208||n===536870911) return '';
    const v=n<0?0:n;
    const r=v&255,g=(v>>8)&255,b=(v>>16)&255;
    return `rgb(${r},${g},${b})`;
  };
  const fieldLabel=(node,text)=>{
    const field=attr(node,'DataField');
    const dataset=attr(node,'DataSetName')||attr(node,'DataSet');
    if(field) return dataset?`<${dataset}.${field}>`:`<${field}>`;
    return String(text||'')
      .replace(/\[([^\]]+)\]/g,(_,v)=>`<${v.replace(/&quot;|"/g,'')}>`)
      .replace(/<([^>]+)>/g,(_,v)=>`<${v.replace(/&quot;|"/g,'')}>`) || '';
  };
  function memoHtml(node,bandTop){
    const x=num(attr(node,'Left')),y=bandTop+num(attr(node,'Top'));
    const w=Math.max(1,num(attr(node,'Width'))),h=Math.max(1,num(attr(node,'Height')));
    const text=fieldLabel(node,attr(node,'Text')).replace(/\r\n|\n/g,' ');
    const font=Math.max(7,Math.min(26,Math.abs(num(attr(node,'Font.Height','-12')))*.78));
    const fg=color(attr(node,'Font.Color'));
    const bg=color(attr(node,'Fill.BackColor'));
    const bold=(num(attr(node,'Font.Style'))&1)!==0;
    const italic=(num(attr(node,'Font.Style'))&2)!==0;
    const underline=(num(attr(node,'Font.Style'))&4)!==0;
    const align={haCenter:'center',haRight:'right',haBlock:'justify'}[attr(node,'HAlign')]||'left';
    const valign={vaCenter:'center',vaBottom:'flex-end'}[attr(node,'VAlign')]||'flex-start';
    const frame=num(attr(node,'Frame.Typ'))!==0;
    const radius=node.tagName.includes('Shape')?3:0;
    const style=[
      `left:${x}px`,`top:${y}px`,`width:${w}px`,`height:${h}px`,
      `font-size:${font}px`,`font-family:${escapeHtml(attr(node,'Font.Name','Arial'))}`,
      `font-weight:${bold?700:400}`,`font-style:${italic?'italic':'normal'}`,
      `text-decoration:${underline?'underline':'none'}`,`text-align:${align}`,
      `align-items:${valign}`,fg?`color:${fg}`:'',bg?`background:${bg}`:'',
      frame?'border:1px solid #626b78':'',`border-radius:${radius}px`
    ].filter(Boolean).join(';');
    const title=escapeHtml(attr(node,'Name'));
    return `<div class="fr3-object fr3-memo" style="${style}" title="${title}">${escapeHtml(text)}</div>`;
  }
  function visualHtml(node,bandTop){
    const x=num(attr(node,'Left')),y=bandTop+num(attr(node,'Top'));
    const w=Math.max(8,num(attr(node,'Width'))),h=Math.max(8,num(attr(node,'Height')));
    if(node.tagName.includes('Line')){
      return `<div class="fr3-line" style="left:${x}px;top:${y}px;width:${w}px;height:${Math.max(1,h)}px"></div>`;
    }
    if(node.tagName.includes('Picture')){
      return `<div class="fr3-object fr3-picture" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px" title="${escapeHtml(attr(node,'Name'))}"><span>▧</span><small>IMAGEM</small></div>`;
    }
    return memoHtml(node,bandTop);
  }
  function bandPriority(tag){
    const order=['ReportTitle','PageHeader','ColumnHeader','GroupHeader','MasterData','DetailData','SubdetailData','GroupFooter','ReportSummary','PageFooter'];
    const i=order.findIndex(x=>tag.includes(x));
    return i<0?50:i;
  }
  function renderPage(page,index){
    const paperW=mmToPx(attr(page,'PaperWidth','210'));
    const paperH=mmToPx(attr(page,'PaperHeight','297'));
    const marginL=mmToPx(attr(page,'LeftMargin','10'));
    const marginR=mmToPx(attr(page,'RightMargin','10'));
    const contentW=Math.max(200,paperW-marginL-marginR);
    const bands=[...page.children].filter(n=>/Header|Footer|Data|Title|Summary/.test(n.tagName)&&n.tagName!=='TfrxDataPage');
    bands.sort((a,b)=>bandPriority(a.tagName)-bandPriority(b.tagName));
    let top=mmToPx(attr(page,'TopMargin','10'));
    const objects=[];
    const bandMarks=[];
    for(const band of bands){
      const h=Math.max(1,num(attr(band,'Height')));
      bandMarks.push(`<div class="fr3-band-mark" style="top:${top}px;height:${h}px"><span>${escapeHtml(band.tagName.replace('Tfrx',''))}</span></div>`);
      for(const node of [...band.children]){
        if(/MemoView|PictureView|LineView|ShapeView|CheckBoxView|RichView/.test(node.tagName)) objects.push(visualHtml(node,top));
      }
      top+=h;
    }
    const marginBottom=mmToPx(attr(page,'BottomMargin','10'));
    const canvasH=Math.max(paperH,top+marginBottom);
    return `<section class="fr3-sheet-wrap"><div class="fr3-page-label">Página ${index+1} · ${escapeHtml(attr(page,'Name',`Page${index+1}`))}</div><div class="fr3-sheet" style="width:${paperW}px;height:${canvasH}px"><div class="fr3-content-boundary" style="left:${marginL}px;width:${contentW}px"></div>${bandMarks.join('')}${objects.join('')}</div></section>`;
  }
  async function getFr3(report){
    if(report.fr3Data) return report.fr3Data;
    if(report.fr3Url){
      const response=await fetch(report.fr3Url);
      if(!response.ok) throw new Error('Não foi possível abrir o arquivo FR3.');
      return response.text();
    }
    throw new Error('Este cadastro não possui um arquivo FR3.');
  }
  async function openPreview(report,button){
    const area=detail.querySelector('.preview-wrap');
    if(!area) return;
    const original=button.textContent;
    button.disabled=true;button.textContent='Lendo FR3...';
    area.innerHTML='<div class="fr3-loading"><span></span><strong>Montando protótipo do relatório...</strong></div>';
    try{
      const source=await getFr3(report);
      const xml=new DOMParser().parseFromString(source,'application/xml');
      const error=xml.querySelector('parsererror');
      if(error) throw new Error('O arquivo não possui uma estrutura XML válida.');
      const pages=[...xml.querySelectorAll('TfrxReportPage')];
      if(!pages.length) throw new Error('Nenhuma página de relatório foi encontrada no FR3.');
      area.innerHTML=`<div class="fr3-viewer"><div class="fr3-toolbar"><div><strong>Prévia estrutural do FR3</strong><small>Campos são demonstrativos; dados reais aparecem no Sisplan.</small></div><div class="fr3-zoom"><button type="button" data-zoom="-">−</button><span>60%</span><button type="button" data-zoom="+">+</button><button type="button" data-zoom="fit">Ajustar</button></div></div><div class="fr3-stage"><div class="fr3-pages">${pages.map(renderPage).join('')}</div></div></div>`;
      let zoom=.6;
      const pagesEl=area.querySelector('.fr3-pages');
      const zoomText=area.querySelector('.fr3-zoom span');
      const apply=()=>{pagesEl.style.setProperty('--fr3-zoom',zoom);zoomText.textContent=`${Math.round(zoom*100)}%`;};
      apply();
      area.querySelector('.fr3-zoom').addEventListener('click',event=>{
        const action=event.target.dataset.zoom;if(!action)return;
        if(action==='+')zoom=Math.min(1.5,zoom+.1);
        if(action==='-')zoom=Math.max(.2,zoom-.1);
        if(action==='fit'){
          const sheet=area.querySelector('.fr3-sheet');
          zoom=Math.max(.2,Math.min(1,(area.querySelector('.fr3-stage').clientWidth-48)/(sheet?.offsetWidth||1000)));
        }
        apply();
      });
    }catch(error){
      area.innerHTML=`<div class="fr3-error"><strong>Não consegui montar a prévia</strong><p>${escapeHtml(error.message)}</p></div>`;
    }finally{button.disabled=false;button.textContent=original;}
  }
  function enhance(){
    const report=typeof reports!=='undefined'?reports.find(item=>item.id===selected):null;
    const actions=detail.querySelector('.detail-actions');
    if(!report||!actions||actions.querySelector('#previewFr3')||(!report.fr3Data&&!report.fr3Url)) return;
    const button=document.createElement('button');
    button.type='button';button.id='previewFr3';button.className='secondary fr3-preview-btn';
    button.innerHTML='▣ VISUALIZAR FR3';
    const download=actions.querySelector('#downloadFr3, a[download]');
    if(download) download.after(button); else actions.append(button);
    button.addEventListener('click',()=>openPreview(report,button));
  }
  new MutationObserver(enhance).observe(detail,{childList:true,subtree:true});
  enhance();
})();
