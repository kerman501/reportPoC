// js/main.js - Финальная, исправленная версия

// --- Глобальные переменные ---
let todaysJobs = [];
let debounceTimer;
const DEBOUNCE_DELAY = 10000; // 10 секунд
let lastFetchTime = 0;
const RATE_LIMIT_MS = 60000; // 1 минута

// --- Точка входа приложения ---
document.addEventListener("DOMContentLoaded", () => {
  // Инициализируем нашу новую логику (загрузка из localStorage, слушатель на ввод)
  initializeAppLogic();

  // Весь твой остальной код инициализации
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

  // Все глобальные слушатели кнопок
  document
    .getElementById("clearReportBtn")
    ?.addEventListener("click", clearReportData);
  document
    .getElementById("pdfFile")
    ?.addEventListener("change", handlePdfFileChange);
  // ... и все остальные твои оригинальные слушатели, если они тут были ...
});

// ===================================================================
// ===== НАШ ЕДИНЫЙ БЛОК ЛОГИКИ ДЛЯ СВЯЗИ С БЭКЕНДОМ ================
// ===================================================================

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
    if (showMessages) showStatusMessage("Job found locally.", false);
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
    const jsonData = await response.json();
    if (!response.ok)
      throw new Error(jsonData.error || `Network error: ${response.status}`);
    todaysJobs = jsonData.data;
    saveJobsToLocalStorage(todaysJobs);
    renderJobsList(todaysJobs);
    const currentJob = todaysJobs.find((job) => job.leadid === jobId);
    if (currentJob) {
      if (showMessages)
        showStatusMessage("Jobs list updated from server.", false);
      populateFormWithJobData(currentJob);
      return true;
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
    container.textContent = "No jobs found.";
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
    if (currentJobId) jobInput.value = currentJobId;
  }
}

function showStatusMessage(message, isError) {
  const statusEl = document.getElementById("job-status-message");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "job-status-message";
  if (isError) statusEl.classList.add("error");
  else statusEl.classList.add("success");
  setTimeout(() => {
    statusEl.textContent = "";
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

// --- ТВОЯ ОРИГИНАЛЬНАЯ ФУНКЦИЯ, ВОЗВРАЩЕННАЯ НА МЕСТО ---
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
