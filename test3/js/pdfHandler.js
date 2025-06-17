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
  return fullText;
}

async function handlePdfFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  updateStatusMessage("pdfStatus", `Loading ${file.name}...`, false);

  try {
    // ШАГ 1: Позволяем readPDF заполнить все "вторичные" поля (материалы, кол-во итемов и т.д.)
    const rawText = await readPDF(file);
    updateStatusMessage(
      "pdfStatus",
      `Successfully loaded: ${file.name}`,
      "success"
    );

    // ШАГ 2: Извлекаем ключевые данные (номер работы и имя) из текста PDF
    let pdfJobId = "";
    const jobRegex = /Shipment Number\s*.*?(\b\d{5,}\b)/i;
    const jobMatch = rawText.match(jobRegex);
    if (jobMatch && jobMatch[1]) {
      pdfJobId = jobMatch[1];
    }

    let pdfClientName = "";
    const shipperNameRegex = /(?:S|H)IPPER\s*([A-Za-z][A-Za-z\s'-]*[A-Za-z])/i;
    const nameMatch = rawText.match(shipperNameRegex);
    if (nameMatch && nameMatch[1]) {
      pdfClientName = nameMatch[1]
        .trim()
        .split(/\s+/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    }

    if (!pdfJobId) {
      showStatusMessage("Could not find Job Number in PDF.", true);
      return;
    }

    // ШАГ 3: Запускаем "Дерево Решений" на основе твоей логики
    const formJobInput = document.getElementById("job");
    const formJobId = formJobInput.value.trim();

    // Сценарий 1: Поле работы пустое
    if (!formJobId) {
      console.log("Сценарий PDF: Поле работы пустое.");
      formJobInput.value = pdfJobId; // Вставляем номер из PDF
      const wasFound = await findAndPopulateJob(pdfJobId, {
        clearFieldsOnFail: false,
        showMessages: true,
      });
      if (!wasFound) {
        // Если бэкенд ничего не нашел, используем имя из PDF как фоллбэк
        document.getElementById("clientName").value = pdfClientName;
      }
    }
    // Сценарий 2: Номера совпадают
    else if (formJobId === pdfJobId) {
      console.log(
        "Сценарий PDF: Номера работ совпадают. Заполняем только доп. инфо."
      );
      // Ничего не делаем с ключевыми полями. Они уже заполнены.
      // readPDF уже заполнил все остальное.
      showStatusMessage("PDF data matches current job.", false);
    }
    // Сценарий 3: Конфликт номеров
    else {
      console.log("Сценарий PDF: Конфликт номеров работ.");
      showStatusMessage(
        `PDF job (${pdfJobId}) does not match current job (${formJobId}). Please clear report.`,
        true
      );
    }
  } catch (err) {
    console.error("Error processing PDF file:", err);
    showStatusMessage("Failed to process PDF.", true);
  }
}

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
