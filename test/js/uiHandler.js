// js/uiHandler.js
import {
  getThemePreference,
  saveThemePreference,
} from "./localStorageHandler.js";
import { questions, defaultValuesConfig, attentionFieldIds } from "./config.js"; // Assuming config.js will also be a module or its vars global

// This array is managed here and will be reset by createQuestionFields or a dedicated reset function.
let allDynamicInputElementsForReset = [];

// --- Existing Theme and Basic UI Functions ---
function applyCurrentTheme() {
  const themeToggleCheckbox = document.getElementById("themeToggle");
  const savedTheme = getThemePreference(); // [cite: 16]
  if (themeToggleCheckbox) {
    if (savedTheme === "dark-mode") {
      document.documentElement.classList.add("dark-mode");
      themeToggleCheckbox.checked = true;
    } else {
      document.documentElement.classList.remove("dark-mode");
      themeToggleCheckbox.checked = false;
      if (!savedTheme) saveThemePreference("light-mode"); // Default to light [cite: 16]
    }
  }
}

function setupThemeToggle() {
  const themeToggleCheckbox = document.getElementById("themeToggle");
  if (themeToggleCheckbox) {
    themeToggleCheckbox.addEventListener("change", function () {
      if (this.checked) {
        document.documentElement.classList.add("dark-mode");
        saveThemePreference("dark-mode");
      } else {
        document.documentElement.classList.remove("dark-mode");
        saveThemePreference("light-mode");
      }
    });
  }
}

function applyAttentionHighlight(element) {
  if (!element) return;
  element.classList.remove("field-requires-attention");
  // Ensure attentionFieldIds is defined (e.g., from config.js)
  if (
    typeof attentionFieldIds !== "undefined" &&
    attentionFieldIds.includes(element.id) &&
    element.value === "YES" &&
    element.dataset.status !== "user-modified"
  ) {
    element.classList.add("field-requires-attention");
  }
}

function setFieldStatus(element, status) {
  if (!element) {
    return;
  }
  element.classList.remove(
    "field-initial-default",
    "field-pdf-informed",
    "field-user-modified",
    "field-requires-attention"
  );
  if (status) element.classList.add(`field-${status}`);
  element.dataset.status = status;
  applyAttentionHighlight(element);
}

function createQuestionFields() {
  allDynamicInputElementsForReset = []; // Reset the list
  const fieldContainer = document.getElementById("fields");
  if (!fieldContainer) return;

  fieldContainer.innerHTML = "<h2>Report Details</h2>"; // Clear previous and add title

  questions.forEach((q) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-item";

    const label = document.createElement("label");
    label.htmlFor = q.id;
    label.textContent = "• " + q.text; // [cite: 3]
    questionDiv.appendChild(label);

    const select = document.createElement("select");
    select.id = q.id;
    select.dataset.itemId = q.id;
    select.dataset.itemName = q.itemName; // [cite: 3]
    q.options.forEach((optText) => {
      // [cite: 3]
      const o = document.createElement("option");
      o.text = optText;
      o.value = optText;
      select.add(o);
    });
    questionDiv.appendChild(select);
    allDynamicInputElementsForReset.push(select);

    const commentContainer = document.createElement("div");
    commentContainer.id = `no_comment_container_${q.id}`;
    commentContainer.className = "no-comment-container";
    commentContainer.style.display = "none";

    const commentTextarea = document.createElement("textarea");
    commentTextarea.id = `no_comment_textarea_${q.id}`;
    commentTextarea.className = "no-comment-input";
    commentTextarea.placeholder = `Details for ${q.itemName} (NO)...`;
    commentContainer.appendChild(commentTextarea);
    questionDiv.appendChild(commentContainer);
    allDynamicInputElementsForReset.push(commentTextarea);

    fieldContainer.appendChild(questionDiv);

    select.addEventListener("change", (event) => {
      handleNoSelection(event);
      setFieldStatus(select, "user-modified");
    });
    commentTextarea.addEventListener("input", () => {
      // When user types in a NO comment, mark textarea as user-modified
      setFieldStatus(commentTextarea, "user-modified");
      // Also mark the parent select as user-modified if it's 'NO'
      if (select.value === "NO") {
        setFieldStatus(select, "user-modified");
      }
    });

    if (defaultValuesConfig && defaultValuesConfig[q.id]) {
      select.value = defaultValuesConfig[q.id];
    } else {
      // Fallback if no default is specified, pick the first option
      if (q.options.length > 0) select.value = q.options[0];
    }
    setFieldStatus(select, "initial-default");
    setFieldStatus(commentTextarea, "initial-default"); // Comment textarea starts as default

    if (select.value === "NO") {
      // If default is NO, show comment box and prefill if not already user-modified
      handleNoSelection({ target: select }); // Pass the select element itself
    }
  });
}

/**
 * Resets the dynamically created question fields to their default values and states.
 * This is the function formHandler.js can call.
 */
function resetDynamicQuestionFields() {
  allDynamicInputElementsForReset.forEach((element) => {
    const questionId =
      element.tagName === "SELECT"
        ? element.id
        : element.id.replace("no_comment_textarea_", "");
    const questionConfig = questions.find((q) => q.id === questionId);

    if (element.tagName === "SELECT") {
      if (
        questionConfig &&
        defaultValuesConfig &&
        defaultValuesConfig[element.id]
      ) {
        element.value = defaultValuesConfig[element.id];
      } else if (questionConfig && questionConfig.options.length > 0) {
        element.value = questionConfig.options[0]; // Fallback to first option
      } else {
        element.selectedIndex = 0; // Generic fallback
      }
      setFieldStatus(element, "initial-default");
      if (element.value === "NO") {
        handleNoSelection({ target: element });
      } else {
        const commentContainer = document.getElementById(
          `no_comment_container_${element.id}`
        );
        if (commentContainer) commentContainer.style.display = "none";
      }
    } else if (element.tagName === "TEXTAREA") {
      // Comment textarea
      element.value = "";
      setFieldStatus(element, "initial-default");
      // Hide its container if the corresponding select is not "NO"
      const selectElement = document.getElementById(questionId);
      if (selectElement && selectElement.value !== "NO") {
        const commentContainer = document.getElementById(
          `no_comment_container_${questionId}`
        );
        if (commentContainer) commentContainer.style.display = "none";
      } else if (selectElement && selectElement.value === "NO") {
        handleNoSelection({ target: selectElement }); // Re-apply NO logic for comment placeholder
      }
    }
  });
}

function handleNoSelection(event) {
  const selectElement = event.target; // This is the <select> element
  const itemId = selectElement.dataset.itemId;
  const itemName = selectElement.dataset.itemName;
  const commentContainer = document.getElementById(
    `no_comment_container_${itemId}`
  );
  const commentTextarea = document.getElementById(
    `no_comment_textarea_${itemId}`
  );

  if (!commentContainer || !commentTextarea) return;

  const noCommentTemplate = `${itemName} (NO): `;

  if (selectElement.value === "NO") {
    commentContainer.style.display = "block";
    // Only prefill if textarea is empty or still has the default template from a previous "NO" selection
    // and importantly, if it hasn't been explicitly modified by the user for this item.
    if (
      commentTextarea.dataset.status !== "user-modified" ||
      commentTextarea.value.trim() === "" ||
      commentTextarea.value.trim() === noCommentTemplate.trim()
    ) {
      commentTextarea.value = noCommentTemplate;
      // If we prefill, it's not "user-modified" yet unless they type more.
      // However, the select changing to NO is a user action.
      // We should ensure the textarea is not 'initial-default' if its 'NO' parent makes it appear
      if (commentTextarea.dataset.status === "initial-default") {
        // setFieldStatus(commentTextarea, 'pdf-informed'); // Or a similar non-user status
      }
    }
  } else {
    commentContainer.style.display = "none";
    // If user changes from NO to something else, and the comment was just the template, clear it.
    if (commentTextarea.value === noCommentTemplate) {
      // commentTextarea.value = ""; // Optional: clear if only template
    }
  }
}

function openPdfModal() {
  const loadedPdfDocument = window.loadedPdfDocument; // Assuming loadedPdfDocument is global from pdfHandler.js
  if (!loadedPdfDocument) {
    alert("Please upload a PDF file first.");
    return;
  }
  const modalEl = document.getElementById("pdfModal");
  if (modalEl) {
    modalEl.style.display = "flex";
    try {
      history.pushState({ pdfModalOpen: true }, "PDF Viewer", "#pdf");
    } catch (e) {
      // Silently ignore
    }
  }
  // displayPdfPageInModal is also from pdfHandler.js context
  if (typeof displayPdfPageInModal === "function") {
    displayPdfPageInModal(window.currentPageInView || 1);
  }
}

function closePdfModal(manageHistory = true) {
  const modalEl = document.getElementById("pdfModal");
  if (modalEl) modalEl.style.display = "none";
  const viewerEl = document.getElementById("pdfViewerContainer");
  if (viewerEl) viewerEl.innerHTML = "";
  if (manageHistory && window.location.hash === "#pdf") {
    try {
      history.back();
    } catch (e) {
      // Silently ignore
    }
  }
}

function closePdfModalWithHistory() {
  closePdfModal(true);
}

function updatePdfViewerControls() {
  const currentPageNumEl = document.getElementById("currentPageNum");
  const totalPagesNumEl = document.getElementById("totalPagesNum");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const loadedPdfDocument = window.loadedPdfDocument; // Assuming global
  const currentPageInView = window.currentPageInView || 1; // Assuming global

  if (currentPageNumEl) currentPageNumEl.textContent = currentPageInView;
  if (totalPagesNumEl && loadedPdfDocument)
    totalPagesNumEl.textContent = loadedPdfDocument.numPages;
  if (prevPageBtn) prevPageBtn.disabled = currentPageInView <= 1;
  if (nextPageBtn && loadedPdfDocument)
    nextPageBtn.disabled = currentPageInView >= loadedPdfDocument.numPages;
}

// displayPdfPageInModal and renderPdfPage are primarily in pdfHandler.js context.
// For modularity, pdfHandler.js would export them if uiHandler needs to call them.
// Or, pdfHandler listens to events that uiHandler might trigger.
// For now, assuming they might be global or called from main.js event listeners.

function updateStatusMessage(elementId, message, type = "", timeout = 0) {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`; // Add base class for consistent styling
    if (timeout > 0) {
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "status-message";
      }, timeout);
    }
  }
}

function toggleLoader(loaderId, show) {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }
}

function togglePhotoCommentFieldsDOM() {
  const photoPreviewsContainer = document.getElementById("photoPreviews");
  // getEnablePhotoCommentsState is expected from photoHandler.js
  const isEnabled =
    typeof getEnablePhotoCommentsState === "function"
      ? getEnablePhotoCommentsState()
      : false;
  if (photoPreviewsContainer) {
    const items =
      photoPreviewsContainer.getElementsByClassName("photo-preview-item");
    for (let item of items) {
      if (isEnabled) {
        item.classList.add("comments-enabled");
      } else {
        item.classList.remove("comments-enabled");
      }
    }
  }
}

function updatePalletPaperDisplay() {
  const jobNumber = document.getElementById("job")?.value || "N/A";
  const clientName = document.getElementById("clientName")?.value || "N/A";
  const currentDate = getCurrentDateFormatted("/"); // Uses the function below

  document.getElementById("palletJobNumber").textContent = jobNumber;
  document.getElementById("palletClientName").textContent = clientName;
  document.getElementById("palletCurrentDate").textContent = currentDate;
}

function resetUIForClearReport() {
  updateStatusMessage("pdfStatus", "");
  const pdfFileEl = document.getElementById("pdfFile");
  if (pdfFileEl) pdfFileEl.value = null;

  const viewPdfBtn = document.getElementById("viewPdfBtn");
  if (viewPdfBtn) viewPdfBtn.style.display = "none";
  closePdfModal(false);

  const pdfItemCountEl = document.getElementById("pdfItemCount");
  if (pdfItemCountEl) pdfItemCountEl.textContent = "";
  const pdfMaterialCountsEl = document.getElementById("pdfMaterialCounts");
  if (pdfMaterialCountsEl) pdfMaterialCountsEl.textContent = "";

  const statusesToClear = [
    "pdfGenerateStatus",
    "sheetDataStatus",
    "palletDataStatus",
    "qrScanStatus", // Added new status
    "sheetsDataStatus", // Added for table display
  ];
  statusesToClear.forEach((id) => updateStatusMessage(id, ""));

  const genHyperlinkOutputEl = document.getElementById(
    "generatedHyperlinkOutput"
  );
  if (genHyperlinkOutputEl) genHyperlinkOutputEl.value = "";

  const reportButtonIcon = document.getElementById("reportButtonIcon");
  if (reportButtonIcon && reportButtonIcon.src.includes("assets/logo.png")) {
    // Check if it's already the logo
    // Potentially re-check its display if it was hidden due to error
    if (
      reportButtonIcon.style.display === "none" &&
      reportButtonIcon.dataset.srcSet === "true"
    ) {
      reportButtonIcon.style.display = "inline";
    }
  } else if (reportButtonIcon) {
    // If it's not the logo or src is different, attempt to load
    const iconImagePreloader = new Image();
    iconImagePreloader.onload = function () {
      reportButtonIcon.src = "assets/logo.png";
      reportButtonIcon.style.display = "inline";
      reportButtonIcon.dataset.srcSet = "true";
    };
    iconImagePreloader.onerror = function () {
      reportButtonIcon.style.display = "none";
      reportButtonIcon.dataset.srcSet = "false";
    };
    iconImagePreloader.src = "assets/logo.png";
  }
}

function updatePdfItemCountUI(count) {
  const pdfItemCountEl = document.getElementById("pdfItemCount");
  if (pdfItemCountEl) {
    pdfItemCountEl.textContent = count
      ? `(PDF says: ${count} pieces)`
      : "(Item count not found in PDF)";
  }
}

function updatePdfMaterialCountsUI(tv, wr, bl) {
  const pdfMaterialCountsEl = document.getElementById("pdfMaterialCounts");
  if (pdfMaterialCountsEl) {
    pdfMaterialCountsEl.textContent = `(Approx. PACK TYPES: ${tv} TV Box, ${wr} Wardrobe Box, ${bl} Blanket-Wrapped Items)`;
  }
}

function updateAndSetFieldStatus(elementId, value, status) {
  const el = document.getElementById(elementId);
  if (el) {
    // Only update if field is empty, or was not user-modified, or new value is different
    if (
      el.value === "" ||
      el.dataset.status !== "user-modified" ||
      el.value !== value
    ) {
      el.value = value;
      setFieldStatus(el, status);
    } else if (!value && el.dataset.status !== "user-modified") {
      el.value = "";
      setFieldStatus(el, "initial-default");
    }
  }
}

function getCurrentDateFormatted(separator = "") {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  if (separator === "YYYY-MM-DD") {
    // Specific format for cache date comparison
    return `${year}-${month}-${day}`;
  }
  return `${year}${separator}${month}${separator}${day}`;
}

// --- New Functions for Google Sheets Table Display ---

/**
 * Displays the Google Sheets data in the designated table.
 * @param {Array<Array<any>>} dataRows - Array of rows from the cache.
 * @param {string} columnsToDisplay - Comma-separated string of column letters (e.g., "B,C,E").
 * @param {string|null} cacheTimestamp - ISO string of when the cache was last updated.
 */
function displaySheetsDataTable(dataRows, columnsToDisplay, cacheTimestamp) {
  const tableContainer = document.getElementById("sheetsDataTableContainer");
  const table = document.getElementById("sheetsDataTable");
  const tableHead = table.querySelector("thead");
  const tableBody = table.querySelector("tbody");
  const statusEl = document.getElementById("sheetsDataStatus");
  const timestampEl = document.getElementById("sheetsDataTimestamp");

  if (
    !table ||
    !tableHead ||
    !tableBody ||
    !statusEl ||
    !tableContainer ||
    !timestampEl
  ) {
    console.error("Sheets data table elements not found in DOM.");
    return;
  }

  // Clear previous content
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  statusEl.textContent = "";
  table.style.display = "none"; // Hide table initially

  if (cacheTimestamp) {
    try {
      const date = new Date(cacheTimestamp);
      timestampEl.textContent = `(Cache last updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
    } catch (e) {
      timestampEl.textContent = "(Cache timestamp unreadable)";
    }
  } else {
    timestampEl.textContent = "(No cache data)";
  }

  if (!dataRows || dataRows.length === 0) {
    statusEl.textContent = "No data available in the local cache to display.";
    statusEl.style.display = "block";
    return;
  }

  statusEl.style.display = "none";
  table.style.display = ""; // Show table

  // Create table headers from column letters
  const headerRow = tableHead.insertRow();
  const columnLetters = columnsToDisplay
    .split(",")
    .map((c) => c.trim().toUpperCase());
  columnLetters.forEach((letter) => {
    const th = document.createElement("th");
    th.textContent = `Column ${letter}`; // Or more meaningful names if known
    headerRow.appendChild(th);
  });

  // Populate table body
  dataRows.forEach((rowData) => {
    if (!rowData) return; // Skip empty rows if any
    const row = tableBody.insertRow();
    // We assume rowData directly corresponds to the selected columns in order
    rowData.forEach((cellData) => {
      const cell = row.insertCell();
      cell.textContent =
        cellData !== null && cellData !== undefined ? String(cellData) : "";
    });
  });
}

/**
 * Updates the status message within the Sheets data table section.
 * @param {string} message
 * @param {"info"|"error"|"success"} type
 * @param {number} timeout
 */
function updateSheetsTableStatus(message, type = "info", timeout = 0) {
  const statusEl = document.getElementById("sheetsDataStatus");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = "block"; // Make sure it's visible
    const table = document.getElementById("sheetsDataTable");
    if (table) table.style.display = "none"; // Hide table when status is shown

    if (timeout > 0) {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          // Clear only if message hasn't changed
          statusEl.textContent = "";
          statusEl.className = "status-message";
          statusEl.style.display = "none";
        }
      }, timeout);
    }
  }
}

export {
  applyCurrentTheme,
  setupThemeToggle,
  setFieldStatus,
  updateAndSetFieldStatus,
  createQuestionFields,
  resetDynamicQuestionFields, // Exporting for formHandler
  handleNoSelection,
  openPdfModal,
  closePdfModal,
  closePdfModalWithHistory,
  updatePdfViewerControls,
  updateStatusMessage,
  toggleLoader,
  togglePhotoCommentFieldsDOM,
  updatePalletPaperDisplay,
  resetUIForClearReport,
  updatePdfItemCountUI,
  updatePdfMaterialCountsUI,
  getCurrentDateFormatted,
  displaySheetsDataTable, // New export
  updateSheetsTableStatus, // New export
};
