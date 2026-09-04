(()=>{
  let valuesVisible=false;
  const VALUE_SELECTORS=['#csBankFinal','#csBankInitial','#csBankIncome','#csBankExpense','#csBankFinal2','.cs-bank-value'];
  const masked='••••••';
  function ensureStyle(){
    if(document.getElementById('csBankPrivacyStyle')) return;
    const s=document.createElement('style');
    s.id='csBankPrivacyStyle';
    s.textContent=`
      .cs-bank-privacy-btn{margin-left:auto;width:42px;height:42px;border:0;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;font-size:20px;cursor:pointer;flex:0 0 42px}
      .cs-bank-privacy-btn:active{transform:scale(.96);background:rgba(255,255,255,.2)}
      .cs-bank-private-value{letter-spacing:.08em!important;color:inherit!important}
      .cs-bank-private-value.cs-bank-value{font-size:13px!important}
    `;
    document.head.appendChild(s);
  }
  function eyeIcon(){
    return valuesVisible
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.3 17.3 0 0 1-2.1 3.2"/><path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8c1.5 0 2.8-.4 4-.9"/></svg>';
  }
  function ensureEye(){
    ensureStyle();
    const hero=document.querySelector('.cs-bank-hero');
    const account=hero?.querySelector('.cs-bank-account');
    if(!account || document.getElementById('csBankPrivacyBtn')) return;
    const b=document.createElement('button');
    b.type='button'; b.id='csBankPrivacyBtn'; b.className='cs-bank-privacy-btn';
    b.setAttribute('aria-label','Mostrar valores'); b.title='Mostrar/ocultar valores';
    b.innerHTML=eyeIcon();
    b.addEventListener('click',()=>{valuesVisible=!valuesVisible;applyPrivacy();});
    account.appendChild(b);
  }
  function rememberRealValue(el){
    if(el.dataset.csRealValue==null && el.textContent.trim() && el.textContent.trim()!==masked){
      el.dataset.csRealValue=el.textContent;
    }
  }
  function applyPrivacy(){
    ensureEye();
    document.querySelectorAll(VALUE_SELECTORS.join(',')).forEach(el=>{
      if(valuesVisible){
        if(el.dataset.csRealValue!=null) el.textContent=el.dataset.csRealValue;
        el.classList.remove('cs-bank-private-value');
      }else{
        rememberRealValue(el);
        el.textContent=masked;
        el.classList.add('cs-bank-private-value');
      }
    });
    const b=document.getElementById('csBankPrivacyBtn');
    if(b){ b.innerHTML=eyeIcon(); b.setAttribute('aria-label',valuesVisible?'Ocultar valores':'Mostrar valores'); }
  }
  function resetHidden(){ valuesVisible=false; applyPrivacy(); }
  const obs=new MutationObserver(()=>{
    ensureEye();
    if(!valuesVisible) applyPrivacy();
    else document.querySelectorAll(VALUE_SELECTORS.join(',')).forEach(rememberRealValue);
  });
  function start(){
    ensureEye(); resetHidden();
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) valuesVisible=false; else resetHidden(); });
    window.addEventListener('pageshow',resetHidden);
    document.addEventListener('click',e=>{ if(e.target.closest?.('[data-section="bank"]')) resetHidden(); },true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
