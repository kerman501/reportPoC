document.addEventListener("DOMContentLoaded", () => {
  // Initial UI setup
  applyCurrentTheme();
  setupThemeToggle();
  createQuestionFields();

  // Initialize PDF.js worker
  if (!initializePdfJsWorker()) {
    console.warn(
      "PDF.js worker initialization failed. PDF viewing/processing might be affected."
    );
  }

  // Populate form: Defaults -> Saved State -> URL Params
  populateInitialFormValues();
  const savedState = loadFormState();
  if (savedState) {
    applyStateToFields(savedState);
  }
  processUrlParameters();

  // Initialize handlers and listeners
  initializePhotoHandling();
  setupFormEventListeners();

  // Initialize QR Scanner
  if (typeof setupQrScanner === "function") {
    setupQrScanner();
  } else {
    console.error(
      "setupQrScanner function not found. Ensure qrScanner.js is loaded correctly."
    );
  }

  // Final UI updates on load
  updateSheetOutputString();
  generateSheetFormula();
  updateWarehouseHighlight();
  updatePalletPaperDisplay();

  // Setup for Create Report button icon
  const reportButtonIcon = document.getElementById("reportButtonIcon");
  if (reportButtonIcon) {
    const iconImagePreloader = new Image();
    iconImagePreloader.onload = function () {
      reportButtonIcon.src = "assets/logo.png";
      reportButtonIcon.style.display = "inline";
    };
    iconImagePreloader.onerror = function () {
      reportButtonIcon.style.display = "none";
    };
    iconImagePreloader.src = "assets/logo.png";
  }

  // Global Event Listeners for buttons
  document
    .getElementById("clearReportBtn")
    ?.addEventListener("click", clearReportData);
  document
    .getElementById("pdfFile")
    ?.addEventListener("change", handlePdfFileChange);
  document
    .getElementById("viewPdfBtn")
    ?.addEventListener("click", openPdfModal);
  document
    .getElementById("closePdfModalBtn")
    ?.addEventListener("click", closePdfModalWithHistory);
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPageInView > 1) displayPdfPageInModal(currentPageInView - 1);
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (loadedPdfDocument && currentPageInView < loadedPdfDocument.numPages)
      displayPdfPageInModal(currentPageInView + 1);
  });
  document
    .getElementById("generateSheetFormulaBtn")
    ?.addEventListener("click", generateSheetFormula);
  document
    .getElementById("copySheetStringBtn")
    ?.addEventListener("click", copySheetString);
  document
    .getElementById("createShareReportBtn")
    ?.addEventListener("click", generatePdfWithPhotos);
  document
    .getElementById("copyPalletDataBtn")
    ?.addEventListener("click", () => {
      updatePalletPaperDisplay();
      copyPalletDataToClipboard();
    });

  // Listener for browser back button to close PDF modal
  window.addEventListener("popstate", function (event) {
    const pdfModal = document.getElementById("pdfModal");
    if (pdfModal && pdfModal.style.display === "flex") {
      closePdfModal(false);
    }
  });
});

function clearReportData() {
  if (
    !confirm(
      "Are you sure you want to clear report data? This will reset all fields except for Employee Name, Warehouse, and Spreadsheet ID."
    )
  ) {
    return;
  }

  // 1. Clear data from localStorage, except for preserved fields
  clearPartialFormState();

  // 2. Clear visual data from the page
  clearPhotoData();
  clearPdfData();
  resetUIForClearReport();

  // 3. Reset form fields to their defaults (respecting exclusions)
  resetFormFields();

  // 4. Re-apply any preserved values that might have been visually cleared by reset
  const preservedState = loadFormState();
  if (preservedState) {
    applyStateToFields(preservedState);
  }

  // 5. Update derived UI components
  updateSheetOutputString();
  generateSheetFormula();
  updatePalletPaperDisplay();
  updateWarehouseHighlight();

  alert("Report data has been cleared.");
}
