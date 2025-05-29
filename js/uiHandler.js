let allDynamicInputElementsForReset = [];

function applyCurrentTheme() {
  const themeToggleCheckbox = document.getElementById("themeToggle");
  const savedTheme = getThemePreference();
  if (themeToggleCheckbox) {
    if (savedTheme === "dark-mode") {
      document.documentElement.classList.add("dark-mode");
      themeToggleCheckbox.checked = true;
    } else {
      document.documentElement.classList.remove("dark-mode");
      themeToggleCheckbox.checked = false;
      if (!savedTheme) saveThemePreference("light-mode"); // Default to light if nothing saved
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
  if (
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
  allDynamicInputElementsForReset = [];
  const fieldContainer = document.getElementById("fields");
  if (!fieldContainer) return;

  fieldContainer.innerHTML = "<h2>Report Details</h2>"; // Clear previous and add title

  questions.forEach((q) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-item";

    const label = document.createElement("label");
    label.htmlFor = q.id;
    label.textContent = "• " + q.text;
    questionDiv.appendChild(label);

    const select = document.createElement("select");
    select.id = q.id;
    select.dataset.itemId = q.id;
    select.dataset.itemName = q.itemName;
    q.options.forEach((optText) => {
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
      setFieldStatus(commentTextarea, "user-modified");
    });

    if (defaultValuesConfig[q.id]) {
      select.value = defaultValuesConfig[q.id];
    }
    setFieldStatus(select, "initial-default");
    setFieldStatus(commentTextarea, "initial-default");

    if (select.value === "NO") {
      select.dispatchEvent(new Event("change")); // Trigger to show comment box if default is "NO"
    }
  });
}

function handleNoSelection(event) {
  const selectElement = event.target;
  const itemId = selectElement.dataset.itemId;
  const itemName = selectElement.dataset.itemName;
  const commentContainer = document.getElementById(
    `no_comment_container_${itemId}`
  );
  const commentTextarea = document.getElementById(
    `no_comment_textarea_${itemId}`
  );
  const noCommentTemplate = `${itemName} (NO): `;

  if (selectElement.value === "NO") {
    if (
      commentTextarea &&
      (commentTextarea.value.trim() === "" ||
        commentTextarea.dataset.status !== "user-modified")
    ) {
      commentTextarea.value = noCommentTemplate;
    }
    if (commentContainer) commentContainer.style.display = "block";
  } else {
    if (commentContainer) commentContainer.style.display = "none";
  }
}

function openPdfModal() {
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
      // Silently ignore pushState errors if they occur (e.g. sandboxed iframe)
    }
  }
  displayPdfPageInModal(currentPageInView);
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
      // Silently ignore history.back errors
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

  if (currentPageNumEl) currentPageNumEl.textContent = currentPageInView;
  if (totalPagesNumEl && loadedPdfDocument)
    totalPagesNumEl.textContent = loadedPdfDocument.numPages;
  if (prevPageBtn) prevPageBtn.disabled = currentPageInView <= 1;
  if (nextPageBtn && loadedPdfDocument)
    nextPageBtn.disabled = currentPageInView >= loadedPdfDocument.numPages;
}

async function displayPdfPageInModal(pageNum) {
  if (!loadedPdfDocument || pageNum < 1 || pageNum > loadedPdfDocument.numPages)
    return;

  currentPageInView = pageNum;
  const viewerContainer = document.getElementById("pdfViewerContainer");
  if (!viewerContainer) return;

  viewerContainer.innerHTML = "";
  const canvas = document.createElement("canvas");
  viewerContainer.appendChild(canvas);

  updatePdfViewerControls();

  try {
    await renderPdfPage(loadedPdfDocument, currentPageInView, canvas);
  } catch (error) {
    console.error("Error rendering PDF page:", error);
    viewerContainer.textContent = "Error rendering PDF page.";
  }
}

function updateStatusMessage(elementId, message, type = "", timeout = 0) {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = type; // 'success' or 'error' or ''
    if (timeout > 0) {
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "";
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
  const isEnabled = getEnablePhotoCommentsState();
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
  const jobNumber = document.getElementById("job").value;
  const clientName = document.getElementById("clientName").value;
  const currentDate = getCurrentDateFormatted("/");

  document.getElementById("palletJobNumber").textContent = jobNumber || "N/A";
  document.getElementById("palletClientName").textContent = clientName || "N/A";
  document.getElementById("palletCurrentDate").textContent = currentDate;
}

function resetUIForClearReport() {
  updateStatusMessage("pdfStatus", "");
  document.getElementById("pdfFile").value = null; // Clear file input

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
  ];
  statusesToClear.forEach((id) => updateStatusMessage(id, ""));

  document.getElementById("generatedHyperlinkOutput").value = "";

  // Reset report button icon if it was loaded
  const reportButtonIcon = document.getElementById("reportButtonIcon");
  if (reportButtonIcon) {
    // Assuming the initial state is display: none or re-check its src
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
    if (el.value === "" || el.dataset.status !== "user-modified") {
      // Only update if not manually changed or empty
      el.value = value;
      setFieldStatus(el, status);
    } else if (!value && el.dataset.status !== "user-modified") {
      // If PDF has no value, but field was not user-modified
      el.value = ""; // Clear it
      setFieldStatus(el, "initial-default"); // Reset status
    }
  }
}

function getCurrentDateFormatted(separator = "") {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}${separator}${month}${separator}${day}`;
}
