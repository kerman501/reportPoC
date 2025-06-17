// js/main.js - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

// ===================================================================
// ===== БЛОК ЛОГИКИ ДЛЯ СВЯЗИ С БЭКЕНДОМ (С УЛУЧШЕННОЙ ОТЛАДКОЙ) ====
// ===================================================================

let todaysJobs = [];
let debounceTimer;
const DEBOUNCE_DELAY = 10000;
let lastFetchTime = 0;
const RATE_LIMIT_MS = 60000;

function initializeAppLogic() {
  loadJobsFromLocalStorage();
  const jobInput = document.getElementById("job");
  const debounceIndicator = document.getElementById("debounce-indicator");
  if (jobInput && debounceIndicator) {
    jobInput.addEventListener("input", (e) => {
      const jobId = e.target.value.trim();
      clearTimeout(debounceTimer);
      debounceIndicator.style.transition = "none";
      debounceIndicator.classList.remove("active");
      requestAnimationFrame(() => {
        debounceIndicator.style.transition = `width ${
          DEBOUNCE_DELAY / 1000
        }s linear`;
        if (jobId && jobId.length > 5) {
          debounceIndicator.classList.add("active");
          debounceTimer = setTimeout(() => {
            findAndPopulateJob(jobId, {
              clearFieldsOnFail: true,
              showMessages: true,
            });
            debounceIndicator.classList.remove("active");
          }, DEBOUNCE_DELAY);
        }
      });
    });
  }
}

async function findAndPopulateJob(jobId, options = {}) {
  const { clearFieldsOnFail = false, showMessages = false } = options;
  if (clearFieldsOnFail) {
    populateFormWithJobData(null, jobId);
  }
  const foundJob = todaysJobs.find((job) => job.leadid === jobId);
  if (foundJob) {
    if (showMessages) showStatusMessage("Job found locally.", "success");
    populateFormWithJobData(foundJob);
    return true;
  }
  const now = Date.now();
  if (now - lastFetchTime < RATE_LIMIT_MS) {
    const remaining = Math.round(
      (RATE_LIMIT_MS - (now - lastFetchTime)) / 1000
    );
    if (showMessages)
      showStatusMessage(
        `Please wait ${remaining}s for a new server search.`,
        true
      );
    return false;
  }
  lastFetchTime = now;
  if (showMessages) showStatusMessage("Searching on server...", false);
  const apiUrl = `https://backend-test-pi-three.vercel.app/api/get-daily-jobs?jobId=${jobId}`;
  try {
    const response = await fetch(apiUrl);
    // *** УЛУЧШЕННАЯ ОБРАБОТКА ОШИБОК ***
    if (!response.ok) {
      const errorText = await response.text(); // Читаем ответ как текст
      try {
        // Пытаемся парсить как JSON, если это возможно
        const jsonData = JSON.parse(errorText);
        throw new Error(jsonData.error || `Server error: ${response.status}`);
      } catch (e) {
        // Если парсинг не удался, значит пришел HTML. Показываем его в консоли.
        console.error("Server returned non-JSON response:", errorText);
        throw new Error(
          `Server error: ${response.status}. Check console for HTML response.`
        );
      }
    }
    const jsonData = await response.json();
    todaysJobs = jsonData.data;
    saveJobsToLocalStorage(todaysJobs);
    renderJobsList(todaysJobs);
    const currentJob = todaysJobs.find((job) => job.leadid === jobId);
    if (currentJob) {
      if (showMessages)
        showStatusMessage("Jobs list updated from server.", "success");
      populateFormWithJobData(currentJob);
      return true;
    } else {
      if (showMessages)
        showStatusMessage(`Job ${jobId} not found on server.`, true);
    }
  } catch (error) {
    console.error("Ошибка при загрузке работ с сервера:", error);
    if (showMessages) showStatusMessage(error.message, true);
  }
  if (clearFieldsOnFail) {
    populateFormWithJobData(null, jobId);
  }
  return false;
}

// ... остальные функции из этого блока (renderJobsList, populateFormWithJobData и т.д.) без изменений ...
function renderJobsList(jobs) {
  const container = document.getElementById("jobs-list-container");
  if (!container) return;
  container.innerHTML = "";
  if (jobs && jobs.length > 0) {
    jobs.forEach((job) => {
      const jobButton = document.createElement("button");
      jobButton.className = "job-button";
      jobButton.innerHTML = `<span>${job.leadid}</span><span>${job.customerfullname}</span>`;
      jobButton.addEventListener("click", () => populateFormWithJobData(job));
      container.appendChild(jobButton);
    });
  } else {
    container.textContent = "No jobs found for today.";
  }
}

function populateFormWithJobData(job, currentJobId = null) {
  const clientNameInput = document.getElementById("clientName");
  const cuFtInput = document.getElementById("cuFt");
  const jobInput = document.getElementById("job");

  if (job) {
    clientNameInput.value = job.customerfullname || "";
    jobInput.value = job.leadid || "";
    cuFtInput.value = job.inventoryvolumecuft || "";
  } else {
    clientNameInput.value = "";
    cuFtInput.value = "";
    if (currentJobId) {
      jobInput.value = currentJobId;
    }
  }
  updatePalletPaperDisplay();
}

function showStatusMessage(message, type) {
  const statusEl = document.getElementById("job-status-message");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "job-status-message";
  if (type === true || type === "error") {
    statusEl.classList.add("error");
  } else if (type === false || type === "success") {
    statusEl.classList.add("success");
  }
  setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "job-status-message";
  }, 5000);
}

function saveJobsToLocalStorage(jobs) {
  const today = new Date().toLocaleDateString();
  const dataToStore = { savedDate: today, jobs: jobs };
  localStorage.setItem("dailyJobsData", JSON.stringify(dataToStore));
}

function loadJobsFromLocalStorage() {
  const storedData = localStorage.getItem("dailyJobsData");
  if (storedData) {
    const parsedData = JSON.parse(storedData);
    const today = new Date().toLocaleDateString();
    if (parsedData.savedDate === today) {
      todaysJobs = parsedData.jobs;
      renderJobsList(todaysJobs);
    } else {
      localStorage.removeItem("dailyJobsData");
    }
  }
}

// --- Точка входа приложения ---
document.addEventListener("DOMContentLoaded", () => {
  initializeAppLogic();

  applyCurrentTheme();
  setupThemeToggle();
  createQuestionFields();
  initializePdfJsWorker();

  populateInitialFormValues();
  const savedState = loadFormState();
  if (savedState) {
    applyStateToFields(savedState);
  }
  processUrlParameters();

  initializePhotoHandling();
  setupFormEventListeners();

  if (typeof setupQrScanner === "function") {
    setupQrScanner();
  }

  updateSheetOutputString();
  generateSheetFormula();
  updateWarehouseHighlight();
  updatePalletPaperDisplay();

  // *** ВОЗВРАЩАЕМ КОД ДЛЯ ИКОНКИ КНОПКИ ***
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

  // --- ВОССТАНОВЛЕННЫЕ ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ КНОПОК ---
  document
    .getElementById("clearReportBtn")
    ?.addEventListener("click", clearReportData);
  document
    .getElementById("printPalletBtn")
    ?.addEventListener("click", printPalletPaper);
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
    ?.addEventListener(
      "click",
      () => typeof openPdfModal === "function" && openPdfModal()
    );

  document
    .getElementById("closePdfModalBtn")
    ?.addEventListener(
      "click",
      () =>
        typeof closePdfModalWithHistory === "function" &&
        closePdfModalWithHistory()
    );

  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (typeof currentPageInView !== "undefined" && currentPageInView > 1) {
      if (typeof displayPdfPageInModal === "function")
        displayPdfPageInModal(currentPageInView - 1);
    }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (
      typeof loadedPdfDocument !== "undefined" &&
      loadedPdfDocument &&
      typeof currentPageInView !== "undefined" &&
      currentPageInView < loadedPdfDocument.numPages
    )
      if (typeof displayPdfPageInModal === "function")
        displayPdfPageInModal(currentPageInView + 1);
  });
  document
    .getElementById("generateSheetFormulaBtn")
    ?.addEventListener("click", generateSheetFormula);

  document
    .getElementById("copySheetStringBtn")
    ?.addEventListener(
      "click",
      () => typeof copySheetString === "function" && copySheetString()
    );

  document
    .getElementById("createShareReportBtn")
    ?.addEventListener(
      "click",
      () =>
        typeof generatePdfWithPhotos === "function" && generatePdfWithPhotos()
    );

  document
    .getElementById("copyPalletDataBtn")
    ?.addEventListener("click", () => {
      updatePalletPaperDisplay();
      if (typeof copyPalletDataToClipboard === "function")
        copyPalletDataToClipboard();
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

  if (typeof clearPartialFormState === "function") clearPartialFormState();
  if (typeof clearPhotoData === "function") clearPhotoData();
  if (typeof clearPdfData === "function") clearPdfData();
  if (typeof resetUIForClearReport === "function") resetUIForClearReport();
  if (typeof resetFormFields === "function") resetFormFields();
  const preservedState =
    typeof loadFormState === "function" ? loadFormState() : null;
  if (preservedState) {
    if (typeof applyStateToFields === "function")
      applyStateToFields(preservedState);
  }
  if (typeof updateSheetOutputString === "function") updateSheetOutputString();
  if (typeof generateSheetFormula === "function") generateSheetFormula();
  if (typeof updatePalletPaperDisplay === "function")
    updatePalletPaperDisplay();
  if (typeof updateWarehouseHighlight === "function")
    updateWarehouseHighlight();

  alert("Report data has been cleared.");
}

// ЗАМЕНИТЬ В main.js

function printPalletPaper() {
  // Шаг 1: Собираем данные из полей формы
  const clientName = document.getElementById("clientName").value;
  const jobNumber = document.getElementById("job").value;
  const items = document.getElementById("sheetItems").value;
  const pallets = document.getElementById("sheetPallets").value;
  const blankets = document.getElementById("sheetMatBL").value;
  const wardrobes = document.getElementById("sheetMatWR").value;
  const tvBox = document.getElementById("sheetMatTV").value;
  // Функция getCurrentDateFormatted() уже существует в uiHandler.js
  const currentDate =
    typeof getCurrentDateFormatted === "function"
      ? getCurrentDateFormatted("/")
      : new Date().toLocaleDateString();

  if (!clientName && !jobNumber) {
    alert("Please enter a Client Name or Job Number before printing.");
    return;
  }

  // Шаг 2: Заполняем наш обновленный скрытый HTML-шаблон
  document.getElementById("print-client-name").textContent = clientName || " ";
  document.getElementById("print-current-date").textContent = currentDate;
  document.getElementById("print-job-number").textContent = `#${
    jobNumber || " "
  }`;

  // Заполняем разделенные поля
  document.getElementById("print-items").textContent = `Items: ${
    items || "___"
  }`;
  // \u00A0 - это неразрывный пробел, чтобы сохранить отступы
  document.getElementById(
    "print-pallets"
  ).textContent = `Pallets:\u00A0\u00A0\u00A0\u00A0/ ${pallets || ""}`;

  // Заполняем материалы
  document.getElementById("print-blankets").textContent = `BLANKETS: ${
    blankets || "___"
  }`;
  document.getElementById("print-wardrobes").textContent = `WARDROBES: ${
    wardrobes || "___"
  }`;
  document.getElementById("print-tvbox").textContent = `TV BOX: ${
    tvBox || "___"
  }`;

  // Шаг 3: Вызываем системное окно печати
  window.print();
}
