(() => {
  const $ = (id) => document.getElementById(id),
    money = (v) =>
      Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
  const dayNames = [
    "DOMINGO",
    "SEGUNDA-FEIRA",
    "TERÇA-FEIRA",
    "QUARTA-FEIRA",
    "QUINTA-FEIRA",
    "SEXTA-FEIRA",
    "SÁBADO",
  ];
  let receipts = [];
  const parseLocal = (s) => new Date(`${s}T12:00:00`),
    iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function selectedDates() {
    return [...document.querySelectorAll(".expense-day input:checked")]
      .map((x) => x.value)
      .sort();
  }
  function buildDays() {
    let a = $("expenseStart").value,
      b = $("expenseEnd").value;
    if (!a || !b) return alert("Informe a data inicial e final.");
    let d = parseLocal(a),
      end = parseLocal(b);
    if (d > end) return alert("A data inicial deve ser anterior à final.");
    let html = "";
    for (let n = 0; d <= end && n < 370; n++, d.setDate(d.getDate() + 1)) {
      let s = iso(d);
      html += `<label class="expense-day"><input type="checkbox" value="${s}" checked><span><strong>${d.toLocaleDateString("pt-BR")}</strong><small>${dayNames[d.getDay()]}</small></span></label>`;
    }
    $("expenseDays").innerHTML =
      html || '<p class="expense-empty">Nenhum dia.</p>';
    summarize();
  }
  function summarize() {
    let days = selectedDates(),
      wd = Number($("expenseWeekdayRate").value || 0),
      we = Number($("expenseWeekendRate").value || 0),
      meals = days.reduce((s, x) => {
        let n = parseLocal(x).getDay();
        return s + (n === 0 || n === 6 ? we : wd);
      }, 0),
      uber = receipts.reduce((s, x) => s + Number(x.value || 0), 0);
    $("expenseSelectedDays").textContent = days.length;
    $("expenseMealTotal").textContent = money(meals);
    $("expenseUberTotal").textContent = money(uber);
    $("expenseGrandTotal").textContent = money(meals + uber);
  }
  function renderReceipts() {
    let body = $("uberReceiptsBody");
    body.innerHTML = receipts.length
      ? receipts
          .map(
            (r, i) =>
              `<tr><td><input class="receipt-date" type="date" data-i="${i}" data-k="date" value="${r.date || ""}"></td><td><input class="receipt-description" data-i="${i}" data-k="description" value="${r.description || "UBER"}"></td><td><input class="receipt-value" type="number" min="0" step="0.01" data-i="${i}" data-k="value" value="${r.value || ""}"></td><td title="${r.name}">${r.name.length > 35 ? r.name.slice(0, 32) + "..." : r.name}</td><td><button class="mini-btn" data-remove-receipt="${i}">Excluir</button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="empty-state">Importe os comprovantes.</td></tr>';
    $("uberImportStatus").textContent = receipts.length
      ? `${receipts.length} PDF(s) importado(s)`
      : "Nenhum PDF importado";
    summarize();
  }
  function detect(text, name) {
    let clean = text.replace(/\s+/g, " "),
      dates = [...clean.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)],
      date = dates[0]
        ? `${dates[0][3]}-${dates[0][2].padStart(2, "0")}-${dates[0][1].padStart(2, "0")}`
        : "";
    let candidates = [
      ...clean.matchAll(
        /(?:total|valor|preço)[^R$]{0,30}R\$\s*([\d.]+,\d{2})/gi,
      ),
    ].map((x) => Number(x[1].replace(/\./g, "").replace(",", ".")));
    if (!candidates.length)
      candidates = [...clean.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map((x) =>
        Number(x[1].replace(/\./g, "").replace(",", ".")),
      );
    if (!date) {
      let m = name.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }
    return {
      date,
      value: candidates.length ? candidates[candidates.length - 1] : "",
      description: "UBER",
    };
  }
  async function importPdfs(files) {
    if (!window.pdfjsLib)
      return alert(
        "Leitor de PDF ainda não carregou. Atualize a página e tente novamente.",
      );
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    $("uberImportStatus").textContent = "Lendo comprovantes...";
    for (const file of files) {
      try {
        let data = await file.arrayBuffer(),
          pdf = await pdfjsLib.getDocument({ data }).promise,
          text = "";
        for (let p = 1; p <= pdf.numPages; p++) {
          let page = await pdf.getPage(p),
            content = await page.getTextContent();
          text += " " + content.items.map((x) => x.str).join(" ");
        }
        receipts.push({ ...detect(text, file.name), name: file.name, file });
      } catch (e) {
        receipts.push({
          date: "",
          value: "",
          description: "UBER",
          name: file.name,
          file,
          error: true,
        });
      }
    }
    renderReceipts();
  }
  const val = (id) => $(id).value.trim();
  async function generate() {
    let days = selectedDates();
    if (!days.length) return alert("Escolha pelo menos um dia.");
    if (!val("expenseClient")) return alert("Informe o cliente.");
    if (!window.ExcelJS)
      return alert(
        "Gerador de Excel ainda não carregou. Atualize a página e tente novamente.",
      );
    let wb = new ExcelJS.Workbook(),
      ws = wb.addWorksheet("Despesas de Viagem", {
        pageSetup: {
          paperSize: 9,
          orientation: "portrait",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
        },
      });
    ws.views = [{ showGridLines: false }];
    ["A", "F", "H", "N", "O", "P", "Q"].forEach(
      (c) => (ws.getColumn(c).width = 2),
    );
    Object.assign(ws.getColumn("B"), { width: 14 });
    Object.assign(ws.getColumn("C"), { width: 19 });
    ["D", "E"].forEach((c) => (ws.getColumn(c).width = 9));
    ws.getColumn("G").width = 12;
    ws.getColumn("I").width = 8;
    ws.getColumn("J").width = 12;
    ws.getColumn("K").width = 12;
    ws.getColumn("L").width = 11;
    ws.getColumn("M").width = 12;
    ws.mergeCells("B2:E2");
    ws.getCell("B2").value = "Relatório de Despesas de Viagem";
    ws.getCell("B2").font = { bold: true, size: 16 };
    ws.getCell("G2").value = `PIX: ${val("expensePix")}`;
    ws.getCell("B4").value = "Consultor:";
    ws.getCell("C4").value = val("expenseConsultant");
    ws.getCell("B5").value = "Cliente:";
    ws.getCell("C5").value = val("expenseClient");
    ws.getCell("B7").value = "Período de:";
    ws.getCell("C7").value = parseLocal(days[0]);
    ws.getCell("D7").value = "Até:";
    ws.getCell("E7").value = parseLocal(days[days.length - 1]);
    ws.getCell("E9").value = "Valor Antecipado pela Sisplan:";
    ws.getCell("G9").value = Number($("expenseAdvance").value || 0);
    ws.getCell("B10").value = "Local Partida:";
    ws.getCell("C10").value = val("expenseOrigin");
    ws.getCell("B11").value = "Local Destino:";
    ws.getCell("C11").value = val("expenseDestination");
    ws.getCell("B12").value = "Meio de Transporte:";
    ws.getCell("C12").value = val("expenseTransport");
    ws.getCell("E10").value = "Reembolso para Sisplan:";
    ws.getCell("E11").value = "Reembolso para Consultor:";
    ws.getCell("E12").value = "Valor a cobrar do Cliente:";
    let headers = [
      "Data",
      "Dia da Semana",
      "Despesa/Observação",
      "",
      "",
      "Fornecedor",
      "",
      "Qtde",
      "Valor Unit.",
      "Valor",
      "Desconto",
      "Reembolso",
    ];
    headers.forEach((x, i) => (ws.getCell(14, i + 2).value = x));
    ws.mergeCells("D14:F14");
    ws.mergeCells("G14:H14");
    let row = 15,
      wd = Number($("expenseWeekdayRate").value || 0),
      we = Number($("expenseWeekendRate").value || 0);
    for (const date of days) {
      let d = parseLocal(date),
        uber = receipts.filter((x) => x.date === date);
      for (const r of uber) {
        ws.getCell(row, 2).value = d;
        ws.getCell(row, 3).value = dayNames[d.getDay()];
        ws.getCell(row, 4).value = r.description || "UBER";
        ws.getCell(row, 9).value = 1;
        ws.getCell(row, 10).value = Number(r.value || 0);
        row++;
      }
      ws.getCell(row, 2).value = d;
      ws.getCell(row, 3).value = dayNames[d.getDay()];
      ws.getCell(row, 4).value = "ALIMENTAÇÃO";
      ws.getCell(row, 9).value = 1;
      ws.getCell(row, 10).value =
        d.getDay() === 0 || d.getDay() === 6 ? we : wd;
      row++;
    }
    for (let r = 15; r < row; r++) {
      ws.mergeCells(r, 4, r, 6);
      ws.getCell(r, 11).value = { formula: `I${r}*J${r}` };
      ws.getCell(r, 12).value = 0;
      ws.getCell(r, 13).value = { formula: `K${r}-L${r}` };
    }
    let totalRow = row + 1;
    ws.mergeCells(totalRow, 2, totalRow + 1, 7);
    ws.getCell(totalRow, 2).value =
      "**** Os cupons fiscais devem ser enviados digitalizados e de forma visível no mesmo e-mail que a planilha acima.";
    ws.mergeCells(totalRow, 8, totalRow, 10);
    ws.getCell(totalRow, 8).value = "Total das Despesas";
    ws.getCell(totalRow, 11).value = { formula: `SUM(K15:K${row - 1})` };
    ws.getCell(totalRow, 12).value = { formula: `SUM(L15:L${row - 1})` };
    ws.getCell(totalRow, 13).value = { formula: `SUM(M15:M${row - 1})` };
    ws.getCell("G10").value = { formula: `G9-M${totalRow}` };
    ws.getCell("G11").value = { formula: `MAX(0,M${totalRow}-G9)` };
    ws.getCell("G12").value = { formula: `M${totalRow}` };
    for (let r = 14; r <= totalRow; r++)
      for (let c = 2; c <= 13; c++) {
        let cell = ws.getCell(r, c);
        cell.border = {
          top: { style: "thin", color: { argb: "FFB8C1CC" } },
          left: { style: "thin", color: { argb: "FFB8C1CC" } },
          bottom: { style: "thin", color: { argb: "FFB8C1CC" } },
          right: { style: "thin", color: { argb: "FFB8C1CC" } },
        };
        cell.alignment = { vertical: "middle", wrapText: true };
      }
    ws.getRow(14).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(14).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    ws.getRow(totalRow).font = { bold: true };
    [...Array(row - 15)].forEach((_, i) => {
      let r = 15 + i;
      if (i % 2)
        ws.getRow(r).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F6FA" },
        };
    });
    ["C7", "E7"].forEach((x) => (ws.getCell(x).numFmt = "dd/mm/yyyy"));
    ["G9", "G10", "G11", "G12"].forEach(
      (x) => (ws.getCell(x).numFmt = "R$ #,##0.00"),
    );
    for (let r = 15; r <= totalRow; r++)
      ["J", "K", "L", "M"].forEach(
        (c) => (ws.getCell(`${c}${r}`).numFmt = "R$ #,##0.00"),
      );
    let buffer = await wb.xlsx.writeBuffer(),
      blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      a = document.createElement("a"),
      name = (val("expenseFilename") || "Despesas de Viagem").replace(
        /[\\/:*?"<>|]/g,
        "-",
      );
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("buildExpenseDays").addEventListener("click", buildDays);
  $("selectAllExpenseDays").addEventListener("click", () => {
    document
      .querySelectorAll(".expense-day input")
      .forEach((x) => (x.checked = true));
    summarize();
  });
  $("expenseDays").addEventListener("change", summarize);
  ["expenseWeekdayRate", "expenseWeekendRate"].forEach((id) =>
    $(id).addEventListener("input", summarize),
  );
  $("uberPdfInput").addEventListener("change", (e) =>
    importPdfs([...e.target.files]),
  );
  $("clearUberReceipts").addEventListener("click", () => {
    receipts = [];
    renderReceipts();
  });
  $("uberReceiptsBody").addEventListener("input", (e) => {
    let i = e.target.dataset.i,
      k = e.target.dataset.k;
    if (i !== undefined) {
      receipts[i][k] =
        e.target.type === "number" ? Number(e.target.value) : e.target.value;
      summarize();
    }
  });
  $("uberReceiptsBody").addEventListener("click", (e) => {
    let i = e.target.dataset.removeReceipt;
    if (i !== undefined) {
      receipts.splice(Number(i), 1);
      renderReceipts();
    }
  });
  $("generateExpenseExcel").addEventListener("click", generate);
  window.renderExpenses = summarize;
})();