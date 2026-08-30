const DB = "controles-sisplan-db",
  VER = 3,
  R = "reports",
  H = "hours",
  S = "settings",
  P = "projects";
const CLIENTS = (window.SISPLAN_CLIENTES || []).map((c) =>
  Array.isArray(c)
    ? { codigo: c[0], fantasia: c[1], cidade: c[2], uf: c[3], nome: c[4] }
    : c,
);
let reports = [],
  hours = [],
  projects = [],
  selected = null,
  selectedProject = null,
  asc = true;
const q = (s) => document.querySelector(s),
  qa = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );
const brl = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
  fh = (v) =>
    `${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h`;
function db() {
  return new Promise((res, rej) => {
    let x = indexedDB.open(DB, VER);
    x.onupgradeneeded = (e) => {
      let d = e.target.result;
      [R, H, S, P].forEach((n) => {
        if (!d.objectStoreNames.contains(n))
          d.createObjectStore(n, { keyPath: n === S ? "key" : "id" });
      });
    };
    x.onsuccess = () => res(x.result);
    x.onerror = () => rej(x.error);
  });
}
async function all(st) {
  let d = await db();
  return new Promise((res, rej) => {
    let x = d.transaction(st, "readonly").objectStore(st).getAll();
    x.onsuccess = () => res(x.result);
    x.onerror = () => rej(x.error);
  });
}
async function put(st, o) {
  let d = await db();
  return new Promise((res, rej) => {
    let t = d.transaction(st, "readwrite");
    t.objectStore(st).put(o);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}
async function del(st, id) {
  let d = await db();
  return new Promise((res, rej) => {
    let t = d.transaction(st, "readwrite");
    t.objectStore(st).delete(id);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}
async function getSet(k, f = "") {
  let a = await all(S),
    x = a.find((i) => i.key === k);
  return x?.value ?? f;
}
const setSet = (k, v) => put(S, { key: k, value: v });
const byCode = (c) => CLIENTS.find((x) => String(x.codigo) === String(c));
const total = (e) =>
  Number(e.hours || 0) *
  (Number(e.hourRate || 0) + (e.travel ? Number(e.travelRate || 0) : 0));
const dateBR = (s) => {
  if (!s) return "";
  let [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
const toText = (f) =>
  new Promise((r, j) => {
    let x = new FileReader();
    x.onload = () => r(x.result);
    x.onerror = () => j(x.error);
    x.readAsText(f);
  });
const toData = (f) =>
  new Promise((r, j) => {
    let x = new FileReader();
    x.onload = () => r(x.result);
    x.onerror = () => j(x.error);
    x.readAsDataURL(f);
  });
function dl(txt, n, type = "text/plain") {
  let u = URL.createObjectURL(new Blob([txt], { type })),
    a = document.createElement("a");
  a.href = u;
  a.download = n;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}
async function seed() {
  reports = await all(R);
  if (!reports.some((x) => x.id === "ficha-tecnica-inicial"))
    await put(R, {
      id: "ficha-tecnica-inicial",
      screenName: "APP - FICHA TÉCNICA",
      formName: "FichaTecnica",
      category: "Relatórios / Telas",
      tags: ["ficha técnica", "produto", "app"],
      notes:
        "Relatório inicial cadastrado a partir do arquivo FichaTecnica.fr3.",
      favorite: true,
      builtIn: true,
      fr3Url: "assets/FichaTecnica.fr3",
      fr3Name: "FichaTecnica.fr3",
      createdAt: new Date().toISOString(),
    });
}
function renderReports() {
  let term = q("#globalSearch").value.toLowerCase();
  let list = reports
    .filter((r) =>
      [r.screenName, r.formName, r.notes, (r.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
    .sort((a, b) =>
      asc
        ? a.screenName.localeCompare(b.screenName)
        : b.screenName.localeCompare(a.screenName),
    );
  q("#reportCount").textContent =
    `${list.length} ${list.length === 1 ? "item" : "itens"}`;
  if (!selected) selected = list[0]?.id;
  q("#reportList").innerHTML = list
    .map(
      (r) =>
        `<button class="report-item ${r.id === selected ? "active" : ""}" data-r="${r.id}"><span class="report-badge">${esc(
          r.screenName
            .replace(/APP\s*-\s*/i, "")
            .split(/\s+/)
            .slice(0, 2)
            .map((x) => x[0])
            .join("")
            .toUpperCase(),
        )}</span><span class="report-copy"><strong>${esc(r.screenName)}</strong><small>${esc(r.formName || "Sem form")}</small></span><span class="star ${r.favorite ? "on" : ""}" data-star="${r.id}">★</span></button>`,
    )
    .join("");
  renderDetail();
  renderFav();
}
function renderDetail() {
  let r = reports.find((x) => x.id === selected),
    p = q("#reportDetail");
  if (!r) {
    p.innerHTML = '<div class="empty-state"><h2>Nenhum relatório</h2></div>';
    return;
  }
  p.dataset.inlineCore = "true";
  p.innerHTML = `<div class="detail-header"><div class="inline-title-group"><span class="muted-label">NOME DA TELA</span><input class="inline-core-title" data-report-field="screenName" value="${esc(r.screenName)}" aria-label="Nome da tela"><p>Todos os campos abaixo salvam automaticamente.</p></div><div class="detail-actions"><span id="coreAutoSaveStatus" class="core-save-status"></span><button class="secondary" id="favDetail">${r.favorite ? "★ Favorito" : "☆ Favoritar"}</button>${r.fr3Data ? '<button class="secondary" id="downloadFr3">Baixar .FR3</button>' : r.fr3Url ? `<a class="secondary" href="${r.fr3Url}" download style="text-decoration:none">Baixar .FR3</a>` : ""}${r.builtIn ? "" : '<button class="secondary danger" id="deleteReport">Excluir</button>'}</div></div>
  <div class="meta-grid inline-core-grid">
    <label class="meta-card"><span>NOME DO FORM</span><input data-report-field="formName" value="${esc(r.formName || "")}" placeholder="Nome do formulário"></label>
    <label class="meta-card inline-core-file"><span>ARQUIVO FR3</span><input data-report-field="fr3Name" value="${esc(r.fr3Name || "")}" placeholder="Nome do arquivo"><input id="directFr3File" type="file" accept=".fr3" hidden><button type="button" id="directFr3Button">Trocar arquivo</button></label>
    <label class="meta-card"><span>CATEGORIA</span><input data-report-field="category" value="${esc(r.category || "Relatórios / Telas")}" placeholder="Categoria"></label>
  </div>
  <div class="inline-core-secondary">
    <label class="inline-core-card"><span>TAGS</span><input data-report-field="tags" value="${esc((r.tags || []).join(", "))}" placeholder="Ex.: PCP, expedição, etiqueta"><small>Separe as tags por vírgulas.</small></label>
    <label class="inline-core-card"><span>OBSERVAÇÕES</span><textarea data-report-field="notes" rows="3" placeholder="Digite suas observações...">${esc(r.notes || "")}</textarea></label>
  </div>
  <div class="preview-wrap direct-image-area">${r.imageData ? `<img src="${r.imageData}">` : '<div class="no-preview"><div class="symbol">▧</div><strong>Sem print cadastrado</strong><p>Cole com Ctrl + V, arraste uma imagem ou clique no botão.</p></div>'}<input id="directImageFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><button type="button" id="directImageButton">${r.imageData ? "Trocar print" : "Adicionar print"} · Ctrl + V</button></div>`;
}
function openReport(r) {
  q("#reportForm").reset();
  q("#editingReportId").value = r?.id || "";
  q("#reportModalTitle").textContent = r
    ? "Alterar relatório / tela"
    : "Novo relatório / tela";
  q("#screenName").value = r?.screenName || "";
  q("#formName").value = r?.formName || "";
  q("#category").value = r?.category || "Relatórios / Telas";
  q("#tags").value = (r?.tags || []).join(", ");
  q("#notes").value = r?.notes || "";
  q("#fr3Hint").textContent = r?.fr3Name
    ? `Atual: ${r.fr3Name}`
    : "Selecione o relatório original";
  q("#imageHint").textContent = r?.imageData
    ? "Imagem cadastrada; escolha outra para substituir"
    : "PNG, JPG ou WEBP";
  q("#reportModal").showModal();
}
function renderFav() {
  let a = reports.filter((x) => x.favorite);
  q("#favoritesList").innerHTML = a.length
    ? a
        .map(
          (r) =>
            `<button class="favorite-card" data-fav="${r.id}"><strong>${esc(r.screenName)}</strong><br><small>${esc(r.formName || "")}</small></button>`,
        )
        .join("")
    : "<p>Nenhum favorito ainda.</p>";
}
function fillClients() {
  let opts = CLIENTS.map(
    (c) =>
      `<option value="${esc(c.codigo)}">${esc(c.fantasia)} — ${esc(c.cidade)}/${esc(c.uf)}</option>`,
  ).join("");
  q("#hourClient").innerHTML = '<option value="">Selecione...</option>' + opts;
  q("#projectClient").innerHTML =
    '<option value="">Selecione...</option>' + opts;
  q("#clientFilter").innerHTML = '<option value="">Todos</option>' + opts;
  let cities = [
    ...new Set(
      CLIENTS.map((c) => `${c.cidade}/${c.uf}`).filter((x) => x != "/"),
    ),
  ].sort();
  q("#cityFilter").innerHTML =
    '<option value="">Todas</option>' +
    cities.map((x) => `<option>${esc(x)}</option>`).join("");
  let ufs = [...new Set(CLIENTS.map((c) => c.uf).filter(Boolean))].sort();
  q("#ufClientFilter").innerHTML =
    '<option value="">Todas</option>' +
    ufs.map((x) => `<option>${x}</option>`).join("");
  updateClientCities();
}

function projectClient(p) {
  return (
    byCode(p.clientCode) || {
      fantasia: p.clientName || "Cliente",
      cidade: p.city || "",
      uf: p.uf || "",
    }
  );
}
function projectStats(p) {
  const demands = (p.sectors || []).flatMap((s) => s.demands || []);
  const done = demands.filter((d) => d.done).length;
  return {
    total: demands.length,
    done,
    pending: demands.length - done,
    percent: demands.length ? Math.round((done / demands.length) * 100) : 0,
  };
}
function renderProjects() {
  const ordered = [...projects].sort((a, b) =>
    projectClient(a).fantasia.localeCompare(projectClient(b).fantasia),
  );
  if (!selectedProject || !projects.some((p) => p.id === selectedProject))
    selectedProject = ordered[0]?.id || null;
  q("#projectCount").textContent =
    `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`;
  q("#projectList").innerHTML = ordered.length
    ? ordered
        .map((p) => {
          const c = projectClient(p),
            s = projectStats(p);
          return `<button class="project-list-item ${p.id === selectedProject ? "active" : ""}" data-project="${p.id}"><span class="project-avatar">${esc(c.fantasia.slice(0, 2).toUpperCase())}</span><span><strong>${esc(c.fantasia)}</strong><small>${s.pending} pendentes · ${s.done} concluídas</small><i><b style="width:${s.percent}%"></b></i></span></button>`;
        })
        .join("")
    : '<div class="project-empty-small">Nenhum projeto criado.</div>';
  renderProjectDetail();
}
function renderProjectDetail() {
  const p = projects.find((x) => x.id === selectedProject),
    el = q("#projectDetail");
  if (!p) {
    el.innerHTML =
      '<div class="project-empty"><div class="empty-icon">◆</div><h2>Comece pelo cliente</h2><p>Crie um projeto e organize as demandas por setor.</p><button class="primary" id="emptyNewProject">+ Novo projeto</button></div>';
    return;
  }
  const c = projectClient(p),
    st = projectStats(p);
  el.innerHTML = `<div class="project-head"><div><span class="muted-label">PROJETO DO CLIENTE</span><h2>${esc(c.fantasia)}</h2><p>${esc(c.nome || "")} ${c.cidade ? `· ${esc(c.cidade)}/${esc(c.uf)}` : ""}</p></div><div class="detail-actions"><button class="primary" id="newSectorBtn">+ Novo setor</button><button class="secondary danger" id="deleteProjectBtn">Excluir projeto</button></div></div><div class="project-summary"><div><span>Pendentes</span><strong>${st.pending}</strong></div><div><span>Concluídas</span><strong>${st.done}</strong></div><div><span>Progresso</span><strong>${st.percent}%</strong></div><i><b style="width:${st.percent}%"></b></i></div><div class="sector-grid">${(p.sectors || []).length ? p.sectors.map(renderSector).join("") : '<div class="project-empty sectors-empty"><h3>Nenhum setor ainda</h3><p>Adicione o primeiro setor para começar.</p></div>'}</div>`;
}
function renderSector(s) {
  const ds = s.demands || [],
    done = ds.filter((d) => d.done).length;
  return `<article class="sector-card"><header><div><span class="muted-label">SETOR</span><h3>${esc(s.name)}</h3><small>${done} de ${ds.length} concluídas</small></div><div><button class="mini-btn" data-add-demand="${s.id}">+ Demanda</button><button class="mini-btn danger" data-delete-sector="${s.id}" title="Excluir setor">×</button></div></header><div class="demand-list">${ds.length ? ds.map((d) => `<div class="demand-row ${d.done ? "done" : ""}"><button class="demand-check" data-toggle-demand="${s.id}|${d.id}" aria-label="${d.done ? "Reabrir" : "Concluir"} demanda">${d.done ? "✓" : ""}</button><span>${esc(d.text)}</span><button class="demand-delete" data-delete-demand="${s.id}|${d.id}" aria-label="Excluir demanda">×</button></div>`).join("") : '<div class="no-demands">Nenhuma demanda neste setor.</div>'}</div></article>`;
}
async function saveProject(p) {
  await put(P, p);
  projects = await all(P);
  renderProjects();
}
function filtered() {
  let p = q("#periodFilter").value,
    m = q("#monthFilter").value,
    cl = q("#clientFilter").value,
    ci = q("#cityFilter").value,
    tr = q("#travelFilter").checked,
    now = new Date(),
    yr = String(now.getFullYear()),
    mo = `${yr}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return hours
    .filter((e) => {
      let c = byCode(e.clientCode) || {},
        k = `${c.cidade || e.city || ""}/${c.uf || e.uf || ""}`;
      return (
        !(p === "month" && !e.date.startsWith(m || mo)) &&
        !(p === "year" && !e.date.startsWith(yr)) &&
        (!cl || String(e.clientCode) === cl) &&
        (!ci || k === ci) &&
        (!tr || e.travel)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
function renderHours() {
  let a = filtered(),
    sum = a.reduce((s, e) => s + total(e), 0),
    hs = a.reduce((s, e) => s + Number(e.hours || 0), 0);
  q("#sumBilling").textContent = brl(sum);
  q("#sumHours").textContent = fh(hs);
  q("#sumDays").textContent = new Set(a.map((e) => e.date)).size;
  q("#sumCities").textContent = new Set(
    a.map((e) => {
      let c = byCode(e.clientCode) || {};
      return `${c.cidade || e.city}/${c.uf || e.uf}`;
    }),
  ).size;
  q("#hoursCount").textContent = `${a.length} registros`;
  q("#hoursTableBody").innerHTML = a.length
    ? a
        .map((e) => {
          let c = byCode(e.clientCode) || {
            fantasia: e.clientName,
            cidade: e.city,
            uf: e.uf,
          };
          return `<tr><td>${dateBR(e.date)}</td><td><strong>${esc(c.fantasia)}</strong></td><td>${esc(c.cidade)}/${esc(c.uf)}</td><td>${fh(e.hours)}</td><td>${brl(e.hourRate)}</td><td><span class="pill ${e.travel ? "travel" : ""}">${e.travel ? "SIM" : "NÃO"}</span></td><td>${e.travel ? brl(e.travelRate) : "—"}</td><td class="money">${brl(total(e))}</td><td><div class="row-actions"><button class="mini-btn" data-eh="${e.id}">Alterar</button><button class="mini-btn" data-dh="${e.id}">Excluir</button></div></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="9" class="empty-state">Nenhum lançamento.</td></tr>';
  let g = {};
  a.forEach((e) => {
    let c = byCode(e.clientCode) || {},
      k = `${c.cidade || e.city}/${c.uf || e.uf}`;
    g[k] ??= { h: 0, t: 0, n: 0 };
    g[k].h += Number(e.hours);
    g[k].t += total(e);
    g[k].n++;
  });
  q("#citySummaryBody").innerHTML =
    Object.entries(g)
      .sort((a, b) => b[1].t - a[1].t)
      .map(
        ([k, v]) =>
          `<tr><td><strong>${esc(k)}</strong></td><td>${fh(v.h)}</td><td class="money">${brl(v.t)}</td><td>${v.n}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="4" class="empty-state">Sem dados.</td></tr>';
}
async function openHour(e) {
  q("#hourForm").reset();
  q("#editingHourId").value = e?.id || "";
  q("#hourModalTitle").textContent = e ? "Alterar lançamento" : "Lançar horas";
  q("#hourDate").value = e?.date || new Date().toISOString().slice(0, 10);
  q("#hourClient").value = e?.clientCode || "";
  q("#hourQty").value = e?.hours || "";
  q("#hourRate").value = e?.hourRate ?? (await getSet("hourlyRate", ""));
  q("#travelRate").value = e?.travelRate ?? (await getSet("travelRate", ""));
  q("#isTravel").checked = !!e?.travel;
  q("#hourNotes").value = e?.notes || "";
  calcPreview();
  q("#hourModal").showModal();
}
function calcPreview() {
  q("#travelLabel").textContent = q("#isTravel").checked ? "Sim" : "Não";
  q("#hourCalcPreview").textContent =
    `Total do lançamento: ${brl(Number(q("#hourQty").value || 0) * (Number(q("#hourRate").value || 0) + (q("#isTravel").checked ? Number(q("#travelRate").value || 0) : 0)))}`;
}
function updateClientCities() {
  let uf = q("#ufClientFilter").value,
    a = [
      ...new Set(
        CLIENTS.filter((c) => !uf || c.uf === uf)
          .map((c) => c.cidade)
          .filter(Boolean),
      ),
    ].sort();
  q("#cityClientFilter").innerHTML =
    '<option value="">Todas</option>' +
    a.map((x) => `<option>${esc(x)}</option>`).join("");
}
function renderClients() {
  let t = q("#clientSearch").value.toLowerCase(),
    uf = q("#ufClientFilter").value,
    ci = q("#cityClientFilter").value,
    a = CLIENTS.filter(
      (c) =>
        (!t ||
          [c.codigo, c.fantasia, c.nome, c.cidade, c.uf]
            .join(" ")
            .toLowerCase()
            .includes(t)) &&
        (!uf || c.uf === uf) &&
        (!ci || c.cidade === ci),
    );
  q("#clientBaseInfo").textContent =
    `Base carregada com ${CLIENTS.length.toLocaleString("pt-BR")} clientes ativos.`;
  q("#clientCount").textContent =
    `${a.length.toLocaleString("pt-BR")} clientes`;
  q("#clientsTableBody").innerHTML = a
    .slice(0, 500)
    .map(
      (c) =>
        `<tr><td>${esc(c.codigo)}</td><td>${esc(c.fantasia)}</td><td>${esc(c.nome)}</td><td>${esc(c.cidade)}</td><td>${esc(c.uf)}</td></tr>`,
    )
    .join("");
}

/* CORE INLINE EDIT + HOURS PASSWORD V1 */
let coreSaveTimer = null;
function coreSaveStatus(text, type = "") {
  const el = q("#coreAutoSaveStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "core-save-status " + type;
}
async function saveDirectReport(report) {
  clearTimeout(coreSaveTimer);
  coreSaveStatus("Salvando...", "saving");
  report.updatedAt = new Date().toISOString();
  await put(R, report);
  const row = document.querySelector(`[data-r="${CSS.escape(report.id)}"]`);
  if (row) {
    const title = row.querySelector(".report-copy strong");
    const form = row.querySelector(".report-copy small");
    if (title) title.textContent = report.screenName;
    if (form) form.textContent = report.formName || "Sem form";
  }
  coreSaveStatus("✓ Salvo automaticamente", "saved");
  setTimeout(() => { if (q("#coreAutoSaveStatus")?.textContent.includes("Salvo")) coreSaveStatus(""); }, 1600);
}
function scheduleDirectReportSave(report, immediate = false) {
  clearTimeout(coreSaveTimer);
  coreSaveStatus("Alteração pendente...", "saving");
  coreSaveTimer = setTimeout(() => saveDirectReport(report), immediate ? 0 : 550);
}
function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  return bytesToHex(await crypto.subtle.digest("SHA-256", data));
}
function openHoursPasswordDialog(firstAccess) {
  return new Promise((resolve) => {
    const modal = q("#hoursPasswordModal");
    const form = q("#hoursPasswordForm");
    const title = q("#hoursPasswordTitle");
    const message = q("#hoursPasswordMessage");
    const password = q("#hoursPasswordInput");
    const confirmWrap = q("#hoursPasswordConfirmWrap");
    const confirmation = q("#hoursPasswordConfirm");
    const error = q("#hoursPasswordError");
    title.textContent = firstAccess ? "Criar senha do Controle de Horas" : "Acessar Controle de Horas";
    message.textContent = firstAccess ? "Cadastre uma senha com pelo menos 6 caracteres." : "Informe sua senha para abrir esta área.";
    confirmWrap.hidden = !firstAccess;
    password.value = "";
    confirmation.value = "";
    error.textContent = "";
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      modal.close();
      form.removeEventListener("submit", submit);
      modal.removeEventListener("cancel", cancel);
      resolve(value);
    };
    const cancel = (event) => { event.preventDefault(); finish(null); };
    const submit = (event) => {
      event.preventDefault();
      if (password.value.length < 6) { error.textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
      if (firstAccess && password.value !== confirmation.value) { error.textContent = "As senhas não são iguais."; return; }
      finish(password.value);
    };
    form.addEventListener("submit", submit);
    modal.addEventListener("cancel", cancel);
    modal.showModal();
    setTimeout(() => password.focus(), 30);
  });
}
async function requireHoursPassword() {
  const storedHash = await getSet("hoursPasswordHash", "");
  const storedSalt = await getSet("hoursPasswordSalt", "");
  const firstAccess = !storedHash || !storedSalt;
  const password = await openHoursPasswordDialog(firstAccess);
  if (password === null) return false;
  if (firstAccess) {
    const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
    await setSet("hoursPasswordSalt", salt);
    await setSet("hoursPasswordHash", await passwordHash(password, salt));
    return true;
  }
  const valid = (await passwordHash(password, storedSalt)) === storedHash;
  if (!valid) {
    alert("Senha incorreta.");
    return false;
  }
  return true;
}

function nav(sec) {
  qa(".nav-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.section === sec),
  );
  qa(".section").forEach((x) => x.classList.add("hidden"));
  q(`#${sec}Section`).classList.remove("hidden");
  q("#pageTitle").textContent = {
    reports: "Relatórios / Telas",
    projects: "Projetos",
    hours: "Controle de Horas",
    expenses: "Gastos",
    clients: "Clientes Sisplan",
    favorites: "Favoritos",
    backup: "Backup",
  }[sec];
  q("#reportsTopActions").style.display = sec === "reports" ? "flex" : "none";
  if (sec === "projects") renderProjects();
  if (sec === "hours") renderHours();
  if (sec === "expenses" && window.renderExpenses) window.renderExpenses();
  if (sec === "clients") renderClients();
}
document.addEventListener("click", async (e) => {
  let n = e.target.closest(".nav-item");
  if (n) { const section = n.dataset.section; if (section === "hours" && !(await requireHoursPassword())) return; nav(section); }
  let rb = e.target.closest("[data-r]");
  if (rb && !e.target.closest("[data-star]")) {
    selected = rb.dataset.r;
    renderReports();
  }
  let st = e.target.closest("[data-star]");
  if (st) {
    let r = reports.find((x) => x.id === st.dataset.star);
    r.favorite = !r.favorite;
    await put(R, r);
    reports = await all(R);
    renderReports();
  }
  if (e.target.id === "newReportBtn") openReport();
  if (e.target.id === "editReport")
    openReport(reports.find((x) => x.id === selected));
  if (e.target.id === "favDetail") {
    let r = reports.find((x) => x.id === selected);
    r.favorite = !r.favorite;
    await put(R, r);
    reports = await all(R);
    renderReports();
  }
  if (e.target.id === "deleteReport" && confirm("Excluir este relatório?")) {
    await del(R, selected);
    reports = await all(R);
    selected = null;
    renderReports();
  }
  if (e.target.id === "downloadFr3") {
    let r = reports.find((x) => x.id === selected);
    if (r?.fr3Data) dl(r.fr3Data, r.fr3Name || "relatorio.fr3");
  }
  let f = e.target.closest("[data-fav]");
  if (f) {
    selected = f.dataset.fav;
    nav("reports");
    renderReports();
  }
  if (e.target.id === "newHourBtn") openHour();
  let eh = e.target.closest("[data-eh]");
  if (eh) openHour(hours.find((x) => x.id === eh.dataset.eh));
  let dh = e.target.closest("[data-dh]");
  if (dh && confirm("Excluir lançamento?")) {
    await del(H, dh.dataset.dh);
    hours = await all(H);
    renderHours();
  }
  let c = e.target.closest("[data-close]");
  if (c) q("#" + c.dataset.close).close();
});

/* DIRECT REPORT FIELD EVENTS */
q("#reportDetail").addEventListener("input", (event) => {
  const field = event.target.dataset.reportField;
  if (!field) return;
  const report = reports.find((item) => item.id === selected);
  if (!report) return;
  report[field] = field === "tags" ? event.target.value.split(",").map(v => v.trim()).filter(Boolean) : event.target.value;
  scheduleDirectReportSave(report);
});
q("#reportDetail").addEventListener("change", async (event) => {
  const report = reports.find((item) => item.id === selected);
  if (!report) return;
  if (event.target.id === "directFr3File" && event.target.files[0]) {
    const file = event.target.files[0];
    report.fr3Name = file.name;
    report.fr3Data = await toText(file);
    report.fr3Url = null;
    await saveDirectReport(report);
    renderReports();
  }
  if (event.target.id === "directImageFile" && event.target.files[0]) {
    report.imageData = await toData(event.target.files[0]);
    await saveDirectReport(report);
    renderReports();
  }
});
q("#reportDetail").addEventListener("click", (event) => {
  if (event.target.id === "directFr3Button") q("#directFr3File").click();
  if (event.target.id === "directImageButton") q("#directImageFile").click();
});
q("#reportDetail").addEventListener("paste", async (event) => {
  const file = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith("image/"))?.getAsFile();
  if (!file) return;
  event.preventDefault();
  const report = reports.find((item) => item.id === selected);
  report.imageData = await toData(file);
  await saveDirectReport(report);
  renderReports();
});
q("#reportDetail").addEventListener("dragover", (event) => {
  if ([...(event.dataTransfer?.items || [])].some(item => item.type.startsWith("image/"))) {
    event.preventDefault();
    q(".direct-image-area")?.classList.add("is-dragging");
  }
});
q("#reportDetail").addEventListener("drop", async (event) => {
  const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith("image/"));
  q(".direct-image-area")?.classList.remove("is-dragging");
  if (!file) return;
  event.preventDefault();
  const report = reports.find((item) => item.id === selected);
  report.imageData = await toData(file);
  await saveDirectReport(report);
  renderReports();
});

q("#globalSearch").addEventListener("input", renderReports);
q("#sortBtn").addEventListener("click", () => {
  asc = !asc;
  renderReports();
});
q("#reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  let id = q("#editingReportId").value,
    old = reports.find((x) => x.id === id) || {},
    fr = q("#fr3File").files[0],
    im = q("#imageFile").files[0],
    r = {
      ...old,
      id: id || "r-" + Date.now(),
      screenName: q("#screenName").value.trim(),
      formName: q("#formName").value.trim(),
      category: q("#category").value.trim() || "Relatórios / Telas",
      tags: q("#tags")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      notes: q("#notes").value.trim(),
      favorite: old.favorite || false,
      createdAt: old.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fr3Name: fr?.name || old.fr3Name || null,
      fr3Data: fr ? await toText(fr) : old.fr3Data || null,
      fr3Url: fr ? null : old.fr3Url || null,
      imageData: im ? await toData(im) : old.imageData || null,
    };
  await put(R, r);
  reports = await all(R);
  selected = r.id;
  q("#reportModal").close();
  renderReports();
});
q("#saveRatesBtn").addEventListener("click", async () => {
  await setSet("hourlyRate", q("#defaultHourlyRate").value);
  await setSet("travelRate", q("#defaultTravelRate").value);
  alert("Valores padrão salvos.");
});
["hourQty", "hourRate", "travelRate"].forEach((id) =>
  q("#" + id).addEventListener("input", calcPreview),
);
q("#isTravel").addEventListener("change", calcPreview);
q("#hourForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  let code = q("#hourClient").value,
    c = byCode(code) || {},
    o = {
      id: q("#editingHourId").value || "h-" + Date.now(),
      date: q("#hourDate").value,
      clientCode: code,
      clientName: c.fantasia || "",
      city: c.cidade || "",
      uf: c.uf || "",
      hours: Number(q("#hourQty").value),
      hourRate: Number(q("#hourRate").value),
      travel: q("#isTravel").checked,
      travelRate: Number(q("#travelRate").value || 0),
      notes: q("#hourNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };
  await put(H, o);
  hours = await all(H);
  q("#hourModal").close();
  renderHours();
});
[
  "periodFilter",
  "monthFilter",
  "clientFilter",
  "cityFilter",
  "travelFilter",
].forEach((id) => q("#" + id).addEventListener("change", renderHours));
q("#ufClientFilter").addEventListener("change", () => {
  updateClientCities();
  renderClients();
});
q("#cityClientFilter").addEventListener("change", renderClients);
q("#clientSearch").addEventListener("input", renderClients);
document.addEventListener("click", async (e) => {
  if (e.target.id === "newProjectBtn" || e.target.id === "emptyNewProject") {
    q("#projectForm").reset();
    q("#projectModal").showModal();
  }
  const item = e.target.closest("[data-project]");
  if (item) {
    selectedProject = item.dataset.project;
    renderProjects();
  }
  if (e.target.id === "newSectorBtn") {
    q("#sectorForm").reset();
    q("#sectorModal").showModal();
  }
  if (
    e.target.id === "deleteProjectBtn" &&
    confirm("Excluir este projeto com todos os setores e demandas?")
  ) {
    await del(P, selectedProject);
    projects = await all(P);
    selectedProject = null;
    renderProjects();
  }
  const add = e.target.closest("[data-add-demand]");
  if (add) {
    q("#demandForm").reset();
    q("#demandSectorId").value = add.dataset.addDemand;
    q("#demandModal").showModal();
  }
  const toggle = e.target.closest("[data-toggle-demand]");
  if (toggle) {
    const [sid, did] = toggle.dataset.toggleDemand.split("|");
    const p = projects.find((x) => x.id === selectedProject),
      s = p.sectors.find((x) => x.id === sid),
      d = s.demands.find((x) => x.id === did);
    d.done = !d.done;
    d.completedAt = d.done ? new Date().toISOString() : null;
    await saveProject(p);
  }
  const removeDemand = e.target.closest("[data-delete-demand]");
  if (removeDemand && confirm("Excluir esta demanda?")) {
    const [sid, did] = removeDemand.dataset.deleteDemand.split("|");
    const p = projects.find((x) => x.id === selectedProject),
      s = p.sectors.find((x) => x.id === sid);
    s.demands = s.demands.filter((x) => x.id !== did);
    await saveProject(p);
  }
  const removeSector = e.target.closest("[data-delete-sector]");
  if (removeSector && confirm("Excluir este setor e todas as suas demandas?")) {
    const p = projects.find((x) => x.id === selectedProject);
    p.sectors = p.sectors.filter(
      (x) => x.id !== removeSector.dataset.deleteSector,
    );
    await saveProject(p);
  }
});
q("#projectForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = q("#projectClient").value,
    c = byCode(code);
  if (projects.some((p) => String(p.clientCode) === String(code))) {
    alert("Este cliente já possui um projeto.");
    return;
  }
  const p = {
    id: "p-" + Date.now(),
    clientCode: code,
    clientName: c?.fantasia || "",
    city: c?.cidade || "",
    uf: c?.uf || "",
    sectors: [],
    createdAt: new Date().toISOString(),
  };
  await put(P, p);
  projects = await all(P);
  selectedProject = p.id;
  q("#projectModal").close();
  renderProjects();
});
q("#sectorForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = projects.find((x) => x.id === selectedProject);
  p.sectors ||= [];
  p.sectors.push({
    id: "s-" + Date.now(),
    name: q("#sectorName").value.trim(),
    demands: [],
  });
  await saveProject(p);
  q("#sectorModal").close();
});
q("#demandForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = projects.find((x) => x.id === selectedProject),
    s = p.sectors.find((x) => x.id === q("#demandSectorId").value);
  s.demands ||= [];
  s.demands.push({
    id: "d-" + Date.now(),
    text: q("#demandText").value.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  });
  await saveProject(p);
  q("#demandModal").close();
});
q("#exportBtn").addEventListener("click", async () =>
  dl(
    JSON.stringify(
      {
        app: "Controles Sisplan",
        version: 3,
        reports: await all(R),
        hours: await all(H),
        projects: await all(P),
        settings: {
          hourlyRate: await getSet("hourlyRate", ""),
          travelRate: await getSet("travelRate", ""),
        },
      },
      null,
      2,
    ),
    "controles-sisplan-backup.json",
    "application/json",
  ),
);
q("#importBackup").addEventListener("change", async (e) => {
  try {
    let p = JSON.parse(await e.target.files[0].text());
    for (let r of p.reports || []) await put(R, r);
    for (let h of p.hours || []) await put(H, h);
    for (let x of p.projects || []) await put(P, x);
    if (p.settings) {
      await setSet("hourlyRate", p.settings.hourlyRate || "");
      await setSet("travelRate", p.settings.travelRate || "");
    }
    reports = await all(R);
    hours = await all(H);
    projects = await all(P);
    renderReports();
    renderHours();
    renderProjects();
    alert("Backup importado.");
  } catch {
    alert("Backup inválido.");
  }
  e.target.value = "";
});
(async () => {
  await seed();
  reports = await all(R);
  hours = await all(H);
  projects = await all(P);
  selected = reports[0]?.id;
  fillClients();
  q("#defaultHourlyRate").value = await getSet("hourlyRate", "");
  q("#defaultTravelRate").value = await getSet("travelRate", "");
  let d = new Date();
  q("#monthFilter").value =
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  renderReports();
  renderProjects();
  renderHours();
  renderClients();
})();