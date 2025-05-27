document.addEventListener("DOMContentLoaded", () => {
  // Initialization
  applyCurrentTheme();
  setupThemeToggle();
  createQuestionFields();

  if (!initializePdfJsWorker()) {
    console.warn(
      "PDF.js worker initialization failed. PDF viewing/processing might be affected."
    );
  }

  loadSheetDataFromLocalStorage();
  loadSpreadsheetId();
  populateInitialFormValues();
  processUrlParameters(); // Process after defaults are set, so URL can override

  initializePhotoHandling();
  setupFormEventListeners(); // Sets up listeners for inputs that affect sheet string, etc.

  updateSheetOutputString(); // Initial generation
  generateSheetFormula(); // Initial generation

  // Setup for Create Report button icon
  const reportButtonIcon = document.getElementById("reportButtonIcon");
  if (reportButtonIcon) {
    const iconImagePreloader = new Image();
    iconImagePreloader.onload = function () {
      reportButtonIcon.src = "assets/logo.png"; // Ensure path is correct
      reportButtonIcon.style.display = "inline";
    };
    iconImagePreloader.onerror = function () {
      reportButtonIcon.style.display = "none"; // Hide if logo fails to load
    };
    iconImagePreloader.src = "assets/logo.png"; // Path to your logo
  }

  // Global Event Listeners for buttons
  const clearReportBtn = document.getElementById("clearReportBtn");
  if (clearReportBtn) clearReportBtn.addEventListener("click", clearReportData);

  const pdfFileInput = document.getElementById("pdfFile");
  if (pdfFileInput)
    pdfFileInput.addEventListener("change", handlePdfFileChange);

  const viewPdfBtn = document.getElementById("viewPdfBtn");
  if (viewPdfBtn) viewPdfBtn.addEventListener("click", openPdfModal);

  const closePdfModalBtn = document.getElementById("closePdfModalBtn");
  if (closePdfModalBtn)
    closePdfModalBtn.addEventListener("click", closePdfModalWithHistory);

  const prevPageBtn = document.getElementById("prevPage");
  if (prevPageBtn)
    prevPageBtn.addEventListener("click", () => {
      if (currentPageInView > 1) displayPdfPageInModal(currentPageInView - 1);
    });
  const nextPageBtn = document.getElementById("nextPage");
  if (nextPageBtn)
    nextPageBtn.addEventListener("click", () => {
      if (loadedPdfDocument && currentPageInView < loadedPdfDocument.numPages)
        displayPdfPageInModal(currentPageInView + 1);
    });

  const generateSheetFormulaBtn = document.getElementById(
    "generateSheetFormulaBtn"
  );
  if (generateSheetFormulaBtn)
    generateSheetFormulaBtn.addEventListener("click", generateSheetFormula);

  const copySheetStringBtn = document.getElementById("copySheetStringBtn");
  if (copySheetStringBtn)
    copySheetStringBtn.addEventListener("click", copySheetString);

  const createShareReportBtn = document.getElementById("createShareReportBtn");
  if (createShareReportBtn)
    createShareReportBtn.addEventListener("click", generatePdfWithPhotos);

  const copyPalletDataBtn = document.getElementById("copyPalletDataBtn");
  if (copyPalletDataBtn)
    copyPalletDataBtn.addEventListener("click", () => {
      updatePalletPaperDisplay(); // Ensure display is up-to-date
      copyPalletDataToClipboard();
    });

  window.addEventListener("popstate", function (event) {
    const pdfModal = document.getElementById("pdfModal");
    if (
      pdfModal &&
      pdfModal.style.display === "flex" &&
      event.state &&
      event.state.pdfModalOpen === false
    ) {
      // This logic might be tricky if popstate is for other things.
      // The closePdfModal checks history.back() itself.
      // The main purpose here is if user uses browser back AND modal was open.
      closePdfModal(false); // Don't manage history again, popstate did.
    } else if (
      pdfModal &&
      pdfModal.style.display === "flex" &&
      (!event.state || !event.state.pdfModalOpen)
    ) {
      // If modal is open, but history state doesn't reflect it (e.g. user navigated back past #pdf)
      closePdfModal(false);
    }
  });
});

function clearReportData() {
  if (!confirm("Are you sure you want to clear all report data?")) {
    return;
  }

  resetFormFields(); // Handles all form inputs, including dynamic ones via allDynamicInputElementsForReset
  clearPhotoData(); // Clears photo previews and related data
  clearPdfData(); // Resets PDF document state
  resetUIForClearReport(); // Resets other UI elements like statuses, PDF viewer button

  // Re-initialize certain parts that depend on cleared/reset values
  updateSheetOutputString();
  generateSheetFormula();
  updatePalletPaperDisplay(); // Clear pallet paper display

  alert("Report data has been cleared.");
}
