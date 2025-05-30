// js/pdfHandler.js
// No direct imports needed from other custom modules if dependencies are passed in.
// However, if it were to call, for example, a generic updateStatusMessage from uiHandler directly,
// it would need to import it. For now, we'll assume passed dependencies are sufficient.

let loadedPdfDocument = null;
let currentPageInView = 1;

/**
 * Initializes the PDF.js worker.
 * @returns {boolean} True if successful, false otherwise.
 */
function initializePdfJsWorker() {
  if (typeof pdfjsLib === "undefined") {
    console.error("PDF.js library is not loaded!");
    alert("PDF.js library not found. PDF functionality will be impaired."); // [cite: 9]
    return false;
  }
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    return true; // [cite: 10]
  } catch (e) {
    console.error("Error setting PDF.js worker source:", e); // [cite: 11]
    alert(
      "Could not initialize PDF.js worker. PDF functionality may be impaired."
    );
    return false;
  }
}

/**
 * Internal function to read PDF content and extract data.
 * @param {File} file - The PDF file object.
 * @param {function} updateUiAndSetFieldStatus - Function to update field value and status.
 * @param {function} updatePdfItemCountUI - Function to update PDF item count in UI.
 * @param {function} updatePdfMaterialCountsUI - Function to update PDF material counts in UI.
 * @param {Array} questionsConfig - The 'questions' array from config.js.
 * @param {Object} defaultValuesConfig - The 'defaultValuesConfig' object from config.js.
 * @param {Array} attentionFieldIds - The 'attentionFieldIds' array from config.js.
 * @param {Object} keywordMap - The 'keywordMap' from config.js.
 * @returns {Promise<string>} A promise that resolves with the full text of the PDF.
 */
async function readAndProcessPDF(
  file,
  updateUiAndSetFieldStatus,
  updatePdfItemCountUI,
  updatePdfMaterialCountsUI,
  questionsConfig,
  defaultValuesConfig,
  attentionFieldIds,
  keywordMap
) {
  const buffer = await file.arrayBuffer();
  // Store the loaded document at the module level
  loadedPdfDocument = await pdfjsLib.getDocument({ data: buffer }).promise;
  currentPageInView = 1; // Reset to first page whenever a new PDF is loaded

  let fullText = "";
  for (let i = 1; i <= loadedPdfDocument.numPages; i++) {
    const page = await loadedPdfDocument.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(" ") + "\n";
  }

  const inventoryLines = fullText.toLowerCase().split("\n");
  const itemCountMatch = fullText.match(/Number of Pieces\s*:\s*(\d+)/i);

  updatePdfItemCountUI(itemCountMatch ? itemCountMatch[1] : null);
  updateUiAndSetFieldStatus(
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
      cuFtValue = cuFtMatch[1].replace(/,/g, ""); // Remove commas for parsing
      break;
    }
  }
  updateUiAndSetFieldStatus(
    "cuFt",
    cuFtValue,
    cuFtValue ? "pdf-informed" : "initial-default"
  );

  let tvCount = 0,
    wrCount = 0,
    blCount = 0;
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
  updateUiAndSetFieldStatus(
    "sheetMatTV",
    tvCount > 0 ? tvCount : "",
    tvCount > 0 ? "pdf-informed" : "initial-default"
  );
  updateUiAndSetFieldStatus(
    "sheetMatWR",
    wrCount > 0 ? wrCount : "",
    wrCount > 0 ? "pdf-informed" : "initial-default"
  );
  updateUiAndSetFieldStatus(
    "sheetMatBL",
    blCount > 0 ? blCount : "",
    blCount > 0 ? "pdf-informed" : "initial-default"
  );

  // Extract Job Number and Client Name
  let jobNumber = "",
    clientName = "";
  const jobRegexPatterns = [
    /Shipment Number\s*.*?(\b\d{5,}\b)/i,
    /Job number\s*.*?(\b\d{5,}\b)/i,
  ];
  for (const pattern of jobRegexPatterns) {
    const jobMatch = fullText.match(pattern);
    if (jobMatch && jobMatch[1]) {
      jobNumber = jobMatch[1];
      break;
    }
  }
  if (!jobNumber) {
    const simpleJobMatch = fullText.match(
      /(?:Shipment Number|Job number)\s*(\d{5,})/i
    );
    if (simpleJobMatch && simpleJobMatch[1]) jobNumber = simpleJobMatch[1];
  }

  const shipperNameRegex =
    /(?:S|H)IPPER\s*([A-Za-z][A-Za-z\s'-]*[A-Za-z])(?=\s*(?:Shipment Number|PIECE OF CAKE|USDOT|\d{2}\/\d{2}\/\d{4}|Origin Loading Address))/i;
  let nameMatch = fullText.match(shipperNameRegex);
  if (nameMatch && nameMatch[1]) {
    clientName = nameMatch[1].replace(/[\n\r]+/g, " ").trim();
  } else if (jobNumber) {
    try {
      const nameBetweenRegex = new RegExp(
        `Shipment\\s*Number\\s*([A-Za-z][A-Za-z\\s'-]*[A-Za-z])\\s*${jobNumber}`,
        "i"
      );
      nameMatch = fullText.match(nameBetweenRegex);
      if (nameMatch && nameMatch[1]) clientName = nameMatch[1].trim();
    } catch (regexError) {
      console.error("Regex error for client name:", regexError);
    }
  }
  if (!clientName) {
    const customerSigRegex =
      /Customer Signature(?:[\s\S]*?Date[\s\S]*?){2}([A-Za-z\s'-]+?)(?:\n|\r|X\s|$)/i;
    nameMatch = fullText.match(customerSigRegex);
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
  updateUiAndSetFieldStatus(
    "clientName",
    formattedClientName,
    clientName ? "pdf-informed" : "initial-default"
  );
  updateUiAndSetFieldStatus(
    "job",
    jobNumber,
    jobNumber ? "pdf-informed" : "initial-default"
  );

  // Auto-fill question fields based on keywords
  const lowerCaseText = fullText.toLowerCase();
  questionsConfig.forEach((q) => {
    const select = document.getElementById(q.id);
    if (select) {
      if (select.dataset.status === "user-modified") return; // Don't override user changes

      const keywords = keywordMap[q.id] || [];
      let itemFound =
        keywords.length > 0 &&
        keywords.some((kw) => lowerCaseText.includes(kw.toLowerCase()));
      let currentStatus = "pdf-informed";

      if (attentionFieldIds.includes(q.id) && defaultValuesConfig[q.id]) {
        // Check if defaultValuesConfig[q.id] exists
        select.value = defaultValuesConfig[q.id];
      } else if (itemFound) {
        select.value = "YES";
      } else {
        select.value =
          (defaultValuesConfig && defaultValuesConfig[q.id]) || // Check if defaultValuesConfig[q.id] exists
          q.options.find((opt) => opt.startsWith("NO ")) ||
          q.options[1]; // Fallback
      }
      updateUiAndSetFieldStatus(q.id, select.value, currentStatus); // Use updateUiAndSetFieldStatus for consistency
      if (select.value === "NO" && typeof handleNoSelection === "function") {
        // Assuming handleNoSelection is global or passed
        // handleNoSelection({ target: select }); // This function is in uiHandler.js
        // Instead of calling directly, dispatch an event that uiHandler can listen to, or main.js orchestrates
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });

  return fullText;
}

/**
 * Handles the PDF file selection, reads the PDF, and updates UI.
 * @param {Event} e - The file input change event.
 * @param {object} dependencies - Object containing all required functions and configurations.
 * Includes: updateUiAndSetFieldStatus, setUiFieldStatus, updateStatusMessage,
 * updatePdfItemCountUI, updatePdfMaterialCountsUI,
 * questions, defaultValuesConfig, attentionFieldIds, keywordMap,
 * updateSheetOutputString (from formHandler),
 * showViewPdfButton (function to make view PDF button visible)
 */
async function handlePdfFileChange(e, dependencies) {
  const {
    updateUiAndSetFieldStatus,
    updateStatusMessage,
    updatePdfItemCountUI,
    updatePdfMaterialCountsUI,
    questions, // Renamed from questionsConfig for clarity if used directly
    defaultValuesConfig,
    attentionFieldIds,
    keywordMap,
    updateSheetOutputString, // from formHandler, to update sheet string after PDF processing
    showViewPdfButton, // Callback to make the "View PDF" button visible
  } = dependencies;

  const file = e.target.files[0];

  // Reset module-level PDF state
  loadedPdfDocument = null;
  currentPageInView = 1;
  // showViewPdfButton(false); // Hide button initially or until PDF is loaded

  if (!file) {
    updateStatusMessage("pdfStatus", "No file selected.");
    return;
  }
  updateStatusMessage("pdfStatus", `Loading ${file.name}...`);

  try {
    await readAndProcessPDF(
      file,
      updateUiAndSetFieldStatus,
      updatePdfItemCountUI,
      updatePdfMaterialCountsUI,
      questions,
      defaultValuesConfig,
      attentionFieldIds,
      keywordMap
    );
    updateStatusMessage(
      "pdfStatus",
      `Successfully loaded: ${file.name}`,
      "success"
    );
    if (typeof showViewPdfButton === "function") showViewPdfButton(true); // Show View PDF button
    if (typeof updateSheetOutputString === "function")
      updateSheetOutputString(); // Update sheet string as PDF data might affect it
  } catch (err) {
    updateStatusMessage("pdfStatus", "Failed to read PDF.", "error");
    console.error("Error reading PDF in handlePdfFileChange:", err);
    alert("Error reading PDF file. Check console for details.");
    if (typeof showViewPdfButton === "function") showViewPdfButton(false);
    loadedPdfDocument = null; // Ensure it's null on error
  }
}

/**
 * Renders a specific page of the loaded PDF to a canvas.
 * @param {number} pageNum - The page number to render.
 * @param {HTMLCanvasElement} canvas - The canvas element to render to.
 * @returns {Promise<void>}
 */
async function renderPdfPage(pageNum, canvas) {
  if (
    !loadedPdfDocument ||
    pageNum < 1 ||
    pageNum > loadedPdfDocument.numPages ||
    !canvas
  ) {
    console.error(
      "PDF not loaded, invalid page number, or canvas not provided for rendering."
    );
    return;
  }
  try {
    const page = await loadedPdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    };
    await page.render(renderContext).promise;
    currentPageInView = pageNum; // Update current page after successful render
  } catch (error) {
    console.error(`Error rendering PDF page ${pageNum}:`, error);
    // Optionally, display an error on the canvas or a status message
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(`Error rendering page ${pageNum}.`, 10, 50);
  }
}

/**
 * Clears the loaded PDF data and resets page view.
 */
function clearPdfData() {
  loadedPdfDocument = null;
  currentPageInView = 1;
  console.log("PDF data cleared.");
}

/**
 * Gets the currently loaded PDF document.
 * @returns {object|null} The PDFDocumentProxy object or null.
 */
function getLoadedPdfDocument() {
  return loadedPdfDocument;
}

/**
 * Gets the current page number being viewed and total pages.
 * @returns {{current: number, total: number}}
 */
function getCurrentPdfPageInfo() {
  return {
    current: currentPageInView,
    total: loadedPdfDocument ? loadedPdfDocument.numPages : 0,
  };
}

/**
 * Sets the current page to view.
 * @param {number} pageNum
 */
function setCurrentPdfPage(pageNum) {
  if (
    loadedPdfDocument &&
    pageNum >= 1 &&
    pageNum <= loadedPdfDocument.numPages
  ) {
    currentPageInView = pageNum;
  }
}

export {
  initializePdfJsWorker,
  handlePdfFileChange,
  renderPdfPage,
  clearPdfData,
  getLoadedPdfDocument,
  getCurrentPdfPageInfo,
  setCurrentPdfPage,
};
