// js/pdfHandler.js - Финальная версия с полной логикой

let loadedPdfDocument = null;
let currentPageInView = 1;

function initializePdfJsWorker() {
  if (typeof pdfjsLib === "undefined") {
    console.error("PDF.js library is not loaded!");
    alert("PDF.js library not found. PDF functionality will be impaired.");
    return false;
  }
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    return true;
  } catch (e) {
    console.error("Error setting PDF.js worker source:", e);
    alert(
      "Could not initialize PDF.js worker. PDF functionality may be impaired."
    );
    return false;
  }
}

async function readPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  loadedPdfDocument = pdfDoc;
  let fullText = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(" ") + "\n";
  }

  // Этот блок - твоя оригинальная логика, которая заполняет вторичные поля. Мы ее не трогаем.
  const inventoryLines = fullText.toLowerCase().split("\n");
  const itemCountMatch = fullText.match(/Number of Pieces\s*:\s*(\d+)/i);

  updatePdfItemCountUI(itemCountMatch ? itemCountMatch[1] : null);
  updateAndSetFieldStatus(
    "sheetItems",
    itemCountMatch ? itemCountMatch[1] : "",
    itemCountMatch ? "pdf-informed" : "initial-default"
  );

  const cuFtRegexPatterns = [
    /Total Cu\. Ft\.\s*:\s*([\d,]+\.?\d*)/i,
    /Est\. Total Cu\. Ft\.\s*:\s*([\d,]+\.?\d*)/i,
    /CUFT\s*[:\s]*([\d,]+\.?\d*)/i,
    /Volume\s*[:\s]*([\d,]+\.?\d*)\s*CuFt/i,
  ];
  let cuFtValue = "";
  for (const pattern of cuFtRegexPatterns) {
    const cuFtMatch = fullText.match(pattern);
    if (cuFtMatch && cuFtMatch[1]) {
      cuFtValue = cuFtMatch[1];
      break;
    }
  }
  updateAndSetFieldStatus(
    "cuFt",
    cuFtValue,
    cuFtValue ? "pdf-informed" : "initial-default"
  );

  let tvCount = 0;
  let wrCount = 0;
  let blCount = 0;
  inventoryLines.forEach((line) => {
    if (
      /\b(tv box|tvbox)\b/i.test(line) &&
      !/content|description|header/i.test(line.substring(0, 30))
    )
      tvCount++;
    if (
      /\b(wardrobe box)\b/i.test(line) &&
      !/content|description|header/i.test(line.substring(0, 30))
    )
      wrCount++;
    if (
      /\b(blanket|blankets)\b/i.test(line) &&
      (line.includes("pack type") || line.split(/\s\s+/).length > 3) &&
      !/content|description|header/i.test(line.substring(0, 30))
    )
      blCount++;
  });

  updatePdfMaterialCountsUI(tvCount, wrCount, blCount);
  updateAndSetFieldStatus(
    "sheetMatTV",
    tvCount > 0 ? tvCount : "",
    tvCount > 0 ? "pdf-informed" : "initial-default"
  );
  updateAndSetFieldStatus(
    "sheetMatWR",
    wrCount > 0 ? wrCount : "",
    wrCount > 0 ? "pdf-informed" : "initial-default"
  );
  updateAndSetFieldStatus(
    "sheetMatBL",
    blCount > 0 ? blCount : "",
    blCount > 0 ? "pdf-informed" : "initial-default"
  );

  updateSheetOutputString();
  return fullText; // Возвращаем полный текст для дальнейшей обработки
}

// --- ГЛАВНАЯ ФУНКЦИЯ-ОБРАБОТЧИК PDF (полностью переписана с новой логикой) ---
async function handlePdfFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const viewPdfBtn = document.getElementById("viewPdfBtn");
  updateStatusMessage("pdfStatus", `Loading ${file.name}...`, false);

  try {
    // ШАГ 1: Вызываем твою оригинальную функцию readPDF.
    // Она, как и раньше, заполнит все поля с материалами, CuFt и т.д.
    const rawText = await readPDF(file);
    updateStatusMessage(
      "pdfStatus",
      `Successfully loaded: ${file.name}`,
      "success"
    );
    if (viewPdfBtn) viewPdfBtn.style.display = "inline-block";

    // ШАГ 2: Извлекаем ТОЛЬКО номер работы и имя клиента из текста PDF, используя твою логику.
    let pdfJobId = "";
    const jobRegexPatterns = [
      /Shipment Number\s*.*?(\b\d{5,}\b)/i,
      /Job number\s*.*?(\b\d{5,}\b)/i,
    ];
    for (const pattern of jobRegexPatterns) {
      const jobMatch = rawText.match(pattern);
      if (jobMatch && jobMatch[1]) {
        pdfJobId = jobMatch[1];
        break;
      }
    }

    let pdfClientName = "";
    // Возвращаем старое, более точное регулярное выражение с "заглядыванием вперед"
    const shipperNameRegex =
      /(?:S|H)IPPER\s*([A-Za-z][A-Za-z\s'-]*[A-Za-z])(?=\s*(?:Shipment Number|PIECE OF CAKE|USDOT|\d{2}\/\d{2}\/\d{4}|Origin Loading Address))/i;
    let nameMatch = rawText.match(shipperNameRegex);

    if (nameMatch && nameMatch[1]) {
      // Очищаем и форматируем имя
      pdfClientName = nameMatch[1]
        .replace(/[\n\r]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    }

    // Если номер работы не найден в PDF, мы не можем продолжить основную логику.
    if (!pdfJobId) {
      showStatusMessage("Could not find Job Number in PDF.", true);
      // Но мы все равно пытаемся вставить имя клиента, если оно нашлось
      document.getElementById("clientName").value = pdfClientName;
      return;
    }

    // ШАГ 3: Запускаем "Дерево Решений"
    const formJobInput = document.getElementById("job");
    const formJobId = formJobInput.value.trim();

    // Сценарий A: Поле "Job Number" на форме пустое
    if (!formJobId) {
      formJobInput.value = pdfJobId; // Вставляем номер из PDF
      const wasFound = await findAndPopulateJob(pdfJobId, {
        clearFieldsOnFail: false,
        showMessages: true,
      });
      // Если бэкенд/локальный кеш ничего не нашел, используем имя из PDF как запасной вариант
      if (!wasFound) {
        document.getElementById("clientName").value = pdfClientName;
      }
    }
    // Сценарий Б: Номера на форме и в PDF совпадают
    else if (formJobId === pdfJobId) {
      // Ничего не делаем с ключевыми полями. readPDF уже заполнил все остальное.
      showStatusMessage("PDF data matches current job.", false);
    }
    // Сценарий В: Конфликт номеров
    else {
      showStatusMessage(
        `PDF job (${pdfJobId}) does not match current job (${formJobId}). Please clear report.`,
        true
      );
    }

    // ШАГ 4: Запускаем твою оригинальную логику заполнения чек-листа
    // Этот код взят из твоего файла, чтобы эта фича не сломалась.
    const lowerCaseText = rawText.toLowerCase();
    questions.forEach((q) => {
      const select = document.getElementById(q.id);
      if (select) {
        if (select.dataset.status === "user-modified") return;

        const keywords = keywordMap[q.id] || [];
        let itemFound =
          keywords.length > 0 &&
          keywords.some((kw) => lowerCaseText.includes(kw.toLowerCase()));

        if (attentionFieldIds.includes(q.id)) {
          select.value = defaultValuesConfig[q.id];
        } else if (itemFound) {
          select.value = "YES";
        } else {
          select.value =
            defaultValuesConfig[q.id] ||
            q.options.find((opt) => opt.startsWith("NO ")) ||
            q.options[1];
        }
        setFieldStatus(select, "pdf-informed");
        if (select.value === "NO") {
          select.dispatchEvent(new Event("change"));
        }
      }
    });
  } catch (err) {
    console.error("Error processing PDF file:", err);
    showStatusMessage("Failed to process PDF.", true);
  }
}

// --- Эти функции мы также не трогаем ---

async function renderPdfPage(pdfDoc, pageNum, canvas) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  const renderContext = {
    canvasContext: canvas.getContext("2d"),
    viewport: viewport,
  };
  await page.render(renderContext).promise;
}

function clearPdfData() {
  loadedPdfDocument = null;
  currentPageInView = 1;
}
