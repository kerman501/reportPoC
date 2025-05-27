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
    const rawText = await readPDF(file);
    updateStatusMessage(
      "pdfStatus",
      `Successfully loaded: ${file.name}`,
      "success"
    );
    if (viewPdfBtn) viewPdfBtn.style.display = "inline-block";
    currentPageInView = 1;

    let jobNumber = "",
      clientName = "";
    const jobRegexPatterns = [
      /Shipment Number\s*.*?(\b\d{5,}\b)/i,
      /Job number\s*.*?(\b\d{5,}\b)/i,
    ];
    for (const pattern of jobRegexPatterns) {
      const jobMatch = rawText.match(pattern);
      if (jobMatch && jobMatch[1]) {
        jobNumber = jobMatch[1];
        break;
      }
    }
    if (!jobNumber) {
      const simpleJobMatch = rawText.match(
        /(?:Shipment Number|Job number)\s*(\d{5,})/i
      );
      if (simpleJobMatch && simpleJobMatch[1]) jobNumber = simpleJobMatch[1];
    }

    const shipperNameRegex =
      /(?:S|H)IPPER\s*([A-Za-z][A-Za-z\s'-]*[A-Za-z])(?=\s*(?:Shipment Number|PIECE OF CAKE|USDOT|\d{2}\/\d{2}\/\d{4}|Origin Loading Address))/i;
    let nameMatch = rawText.match(shipperNameRegex);
    if (nameMatch && nameMatch[1]) {
      clientName = nameMatch[1].replace(/[\n\r]+/g, " ").trim();
    } else if (jobNumber) {
      try {
        const nameBetweenRegex = new RegExp(
          `Shipment\\s*Number\\s*([A-Za-z][A-Za-z\\s'-]*[A-Za-z])\\s*${jobNumber}`,
          "i"
        );
        nameMatch = rawText.match(nameBetweenRegex);
        if (nameMatch && nameMatch[1]) clientName = nameMatch[1].trim();
      } catch (regexError) {
        console.error("Regex error for client name:", regexError);
      }
    }
    if (!clientName) {
      const customerSigRegex =
        /Customer Signature(?:[\s\S]*?Date[\s\S]*?){2}([A-Za-z\s'-]+?)(?:\n|\r|X\s|$)/i;
      nameMatch = rawText.match(customerSigRegex);
      if (nameMatch && nameMatch[1]) {
        let sigName = nameMatch[1]
          .replace(/packer pac/i, "")
          .replace(/Date/i, "")
          .trim();
        if (
          sigName.length > 1 &&
          sigName.toLowerCase() !== "x" &&
          sigName.split(/\s+/).length <= 3
        )
          clientName = sigName;
      }
    }

    const formattedClientName = clientName
      ? clientName
          .split(/\s+/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .filter(Boolean)
          .join(" ")
      : "";
    updateAndSetFieldStatus(
      "clientName",
      formattedClientName,
      clientName ? "pdf-informed" : "initial-default"
    );
    updateAndSetFieldStatus(
      "job",
      jobNumber,
      jobNumber ? "pdf-informed" : "initial-default"
    );

    const lowerCaseText = rawText.toLowerCase();
    questions.forEach((q) => {
      const select = document.getElementById(q.id);
      if (select) {
        if (select.dataset.status === "user-modified") return; // Don't override user changes

        const keywords = keywordMap[q.id] || [];
        let itemFound =
          keywords.length > 0 &&
          keywords.some((kw) => lowerCaseText.includes(kw.toLowerCase()));

        let currentStatus = "pdf-informed";
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
        setFieldStatus(select, currentStatus);
        if (select.value === "NO") {
          select.dispatchEvent(new Event("change"));
        }
      }
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
