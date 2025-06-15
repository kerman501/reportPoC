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

  // --- Global Event Listeners for buttons ---

  document
    .getElementById("clearReportBtn")
    ?.addEventListener("click", clearReportData);

  document
    .getElementById("copyJobNumberBtn")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      const copyBtn = event.currentTarget;
      const jobNumberInput = document.getElementById("job");

      if (jobNumberInput && jobNumberInput.value) {
        navigator.clipboard
          .writeText(jobNumberInput.value)
          .then(() => {
            const originalIcon = copyBtn.innerHTML;

            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.854 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg>`;
            copyBtn.classList.add("success");

            setTimeout(() => {
              copyBtn.innerHTML = originalIcon;
              copyBtn.classList.remove("success");
            }, 1500);
          })
          .catch((err) => {
            console.error("Failed to copy job number: ", err);
          });
      }
    });

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
      fetchAndDisplayJobs();
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
// ===== НАША НОВАЯ ФУНКЦИЯ ДЛЯ РАБОТЫ С БЭКЕНДОМ =====

async function fetchAndDisplayJobs() {
  // URL нашего бэкенда. Убедись, что он правильный!
  // Мы запрашиваем таблицу 'in' по умолчанию.
  const apiUrl = "https://backend-test-pi-three.vercel.app/api/data";

  const container = document.getElementById("jobs-list-container");
  if (!container) return;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const jsonData = await response.json();
    const jobs = jsonData.data;

    // Очищаем контейнер от загрузчика
    container.innerHTML = "";

    if (jobs && jobs.length > 0) {
      jobs.forEach((job) => {
        // Создаем кнопку для каждой работы
        const jobButton = document.createElement("button");
        jobButton.className = "job-button"; // Добавим класс для стилизации
        jobButton.innerHTML = `
          <span class="job-button-leadid">${job.leadid}</span>
          <span class="job-button-customer">${job.customerfullname}</span>
          <span class="job-button-cuft">${job.inventoryvolumecuft} CuFt</span>
        `;

        // Добавляем обработчик клика на кнопку
        jobButton.addEventListener("click", () => {
          // Заполняем поля формы данными из выбранной работы
          document.getElementById("clientName").value =
            job.customerfullname || "";
          document.getElementById("job").value = job.leadid || "";
          document.getElementById("cuFt").value = job.inventoryvolumecuft || "";

          // Опционально: прокручиваем страницу наверх к форме
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        // Добавляем созданную кнопку в контейнер на странице
        container.appendChild(jobButton);
      });
    } else {
      container.textContent = "No jobs found for today.";
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    container.textContent = "Error loading jobs. Please try again later.";
    container.style.color = "var(--color-error)";
  }
}
