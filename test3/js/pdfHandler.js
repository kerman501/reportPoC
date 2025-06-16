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
  const viewPdfBtn = document.getElementById("viewPdfBtn");

  loadedPdfDocument = null;
  if (viewPdfBtn) viewPdfBtn.style.display = "none";

  if (!file) {
    updateStatusMessage("pdfStatus", "No file selected.");
    return;
  }
  updateStatusMessage("pdfStatus", `Loading ${file.name}...`);

  try {
    // --- ШАГ A: Извлекаем данные из PDF ---
    const rawText = await readPDF(file);
    updateStatusMessage(
      "pdfStatus",
      `Successfully loaded: ${file.name}`,
      "success"
    );
    if (viewPdfBtn) viewPdfBtn.style.display = "inline-block";
    currentPageInView = 1;

    let jobNumberFromPdf = "",
      clientNameFromPdf = "";

    // Твоя логика поиска номера работы в PDF (остается без изменений)
    const jobRegexPatterns = [
      /Shipment Number\s*.*?(\b\d{5,}\b)/i,
      /Job number\s*.*?(\b\d{5,}\b)/i,
    ];
    for (const pattern of jobRegexPatterns) {
      const jobMatch = rawText.match(pattern);
      if (jobMatch && jobMatch[1]) {
        jobNumberFromPdf = jobMatch[1];
        break;
      }
    }
    // ... и остальная твоя сложная логика поиска имени ...
    // (Я ее сократил для примера, но у тебя она останется полной)
    const shipperNameRegex = /(?:S|H)IPPER\s*([A-Za-z][A-Za-z\s'-]*[A-Za-z])/i;
    let nameMatch = rawText.match(shipperNameRegex);
    if (nameMatch && nameMatch[1]) {
      clientNameFromPdf = nameMatch[1].trim();
    }

    // Форматируем имя для красоты
    const formattedClientNameFromPdf = clientNameFromPdf
      ? clientNameFromPdf
          .split(/\s+/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .filter(Boolean)
          .join(" ")
      : "";

    // --- ШАГ B: Запускаем нашу "умную" логику поиска и ЖДЕМ ее завершения ---
    if (jobNumberFromPdf) {
      // Заполняем поле с номером работы сразу
      updateAndSetFieldStatus("job", jobNumberFromPdf, "pdf-informed");

      // Вызываем нашу главную функцию из main.js и ждем, пока она отработает
      await findAndPopulateJob(jobNumberFromPdf);

      // --- ШАГ C: Применяем иерархию данных ---
      // После того как findAndPopulateJob отработал, проверяем, что он в итоге вставил в поле clientName
      const clientNameInput = document.getElementById("clientName");

      // Если поле имени клиента ПУСТОЕ (значит, бэкенд ничего не нашел)
      if (!clientNameInput.value.trim()) {
        console.log(
          "Сервер не нашел данных. Используем имя из PDF как фоллбэк."
        );
        // ...тогда используем имя из PDF как запасной вариант.
        updateAndSetFieldStatus(
          "clientName",
          formattedClientNameFromPdf,
          "pdf-informed"
        );
      } else {
        console.log(
          "Данные успешно заполнены с сервера/локального кеша. Имя из PDF проигнорировано."
        );
      }
    } else {
      // Если номер работы в PDF не найден, просто вставляем имя, если оно есть
      updateAndSetFieldStatus(
        "clientName",
        formattedClientNameFromPdf,
        "pdf-informed"
      );
    }

    // Логика ниже остается без изменений
    const lowerCaseText = rawText.toLowerCase();
    questions.forEach((q) => {
      // ...
    });
  } catch (err) {
    updateStatusMessage("pdfStatus", "Failed to read PDF.", "error");
    console.error("Error reading PDF in handlePdfFileChange:", err);
    alert("Error reading PDF file. Check console for details.");
    if (viewPdfBtn) viewPdfBtn.style.display = "none";
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
