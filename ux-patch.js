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
