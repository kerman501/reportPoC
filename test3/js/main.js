// js/main.js - ИСПРАВЛЕННАЯ И ОБЪЕДИНЕННАЯ ВЕРСИЯ

// ===================================================================
// ===== НОВЫЙ БЛОК ЛОГИКИ ДЛЯ СВЯЗИ С БЭКЕНДОМ (ИЗ НОВОЙ ВЕРСИИ) ====
// ===================================================================

// --- Глобальные переменные для бэкенда ---
let todaysJobs = [];
let debounceTimer;
const DEBOUNCE_DELAY = 10000; // 10 секунд
let lastFetchTime = 0;
const RATE_LIMIT_MS = 60000; // 1 минута

/**
 * Инициализирует основную логику приложения: загружает работы из localStorage
 * и устанавливает слушатель на поле ввода номера работы с задержкой (debounce).
 */
function initializeAppLogic() {
  loadJobsFromLocalStorage();
  const jobInput = document.getElementById("job");
  const debounceIndicator = document.getElementById("debounce-indicator");

  if (jobInput && debounceIndicator) {
    jobInput.addEventListener("input", (e) => {
      const jobId = e.target.value.trim();
      clearTimeout(debounceTimer);

      // Сброс анимации индикатора
      debounceIndicator.style.transition = "none";
      debounceIndicator.classList.remove("active");

      // Используем requestAnimationFrame для плавного рестарта анимации
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

/**
 * Находит работу: сначала локально, потом на сервере.
 * @param {string} jobId - Номер работы для поиска.
 * @param {object} options - Опции (clearFieldsOnFail, showMessages).
 * @returns {Promise<boolean>} - true, если работа найдена.
 */
async function findAndPopulateJob(jobId, options = {}) {
  const { clearFieldsOnFail = false, showMessages = false } = options;

  if (clearFieldsOnFail) {
    // Предварительно очищаем поля, чтобы не было старых данных
    populateFormWithJobData(null, jobId);
  }

  // 1. Поиск в локальном кэше
  const foundJob = todaysJobs.find((job) => job.leadid === jobId);
  if (foundJob) {
    if (showMessages) showStatusMessage("Job found locally.", "success");
    populateFormWithJobData(foundJob);
    return true;
  }

  // 2. Проверка ограничения на частоту запросов к серверу
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

  // 3. Запрос на сервер
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

  // 4. Если ничего не найдено
  if (clearFieldsOnFail) {
    populateFormWithJobData(null, jobId);
  }
  return false;
}

/**
 * Отображает список работ в виде кнопок.
 * @param {Array} jobs - Массив объектов работ.
 */
function renderJobsList(jobs) {
  const container = document.getElementById("jobs-list-container");
  if (!container) return;
  container.innerHTML = ""; // Очищаем контейнер

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

/**
 * Заполняет ключевые поля формы данными из объекта работы.
 * @param {object|null} job - Объект работы или null для очистки.
 * @param {string|null} currentJobId - Текущий номер работы для сохранения в поле.
 */
function populateFormWithJobData(job, currentJobId = null) {
  const clientNameInput = document.getElementById("clientName");
  const cuFtInput = document.getElementById("cuFt");
  const jobInput = document.getElementById("job");

  if (job) {
    // Используем || "" на случай, если данные с бэка придут null
    clientNameInput.value = job.customerfullname || "";
    jobInput.value = job.leadid || "";
    cuFtInput.value = job.inventoryvolumecuft || "";
  } else {
    // Очистка полей
    clientNameInput.value = "";
    cuFtInput.value = "";
    // Если передали currentJobId, оставляем его в поле, чтобы пользователь видел, что искал
    if (currentJobId) {
      jobInput.value = currentJobId;
    }
  }
  // После любого изменения данных нужно обновить зависимые элементы
  updatePalletPaperDisplay();
}

/**
 * Показывает статусное сообщение под полем "Job number".
 * @param {string} message - Текст сообщения.
 * @param {boolean|string} type - 'error' (или true), 'success' (или false).
 */
function showStatusMessage(message, type) {
  const statusEl = document.getElementById("job-status-message");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "job-status-message"; // Сброс классов
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

// --- КОНЕЦ НОВОГО БЛОКА ЛОГИКИ ---

// ===================================================================
// ===== СТАРЫЙ КОД ИНИЦИАЛИЗАЦИИ И СЛУШАТЕЛЕЙ (ВОССТАНОВЛЕН) ========
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
  // === ДОБАВЛЕН ВЫЗОВ ИНИЦИАЛИЗАЦИИ НОВОЙ ЛОГИКИ ===
  initializeAppLogic();

  // Initial UI setup (старый код)
  applyCurrentTheme();
  setupThemeToggle();
  createQuestionFields();
  initializePdfJsWorker();

  // Populate form: Defaults -> Saved State -> URL Params (старый код)
  populateInitialFormValues();
  const savedState = loadFormState();
  if (savedState) {
    applyStateToFields(savedState);
  }
  processUrlParameters();

  // Initialize handlers and listeners (старый код)
  initializePhotoHandling();
  setupFormEventListeners();

  if (typeof setupQrScanner === "function") {
    setupQrScanner();
  }

  // Final UI updates on load (старый код)
  updateSheetOutputString();
  generateSheetFormula();
  updateWarehouseHighlight();
  updatePalletPaperDisplay();

  // === ВОССТАНОВЛЕНЫ ВСЕ СЛУШАТЕЛИ КНОПОК ===

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

  // Этот слушатель уже есть в новой версии pdfHandler.js, но на всякий случай оставляем
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

// --- Оригинальная функция очистки (она была и в старой, и в новой версии) ---
function clearReportData() {
  if (
    !confirm(
      "Are you sure you want to clear report data? This will reset all fields except for Employee Name, Warehouse, and Spreadsheet ID."
    )
  ) {
    return;
  }

  // 1. Очищаем localStorage, кроме сохраняемых полей
  if (typeof clearPartialFormState === "function") clearPartialFormState();

  // 2. Очищаем визуальные данные
  if (typeof clearPhotoData === "function") clearPhotoData();
  if (typeof clearPdfData === "function") clearPdfData();
  if (typeof resetUIForClearReport === "function") resetUIForClearReport();

  // 3. Сбрасываем поля формы к значениям по умолчанию
  if (typeof resetFormFields === "function") resetFormFields();

  // 4. Возвращаем сохраненные значения (имя, склад и т.д.)
  const preservedState =
    typeof loadFormState === "function" ? loadFormState() : null;
  if (preservedState) {
    if (typeof applyStateToFields === "function")
      applyStateToFields(preservedState);
  }

  // 5. Обновляем производные UI компоненты
  if (typeof updateSheetOutputString === "function") updateSheetOutputString();
  if (typeof generateSheetFormula === "function") generateSheetFormula();
  if (typeof updatePalletPaperDisplay === "function")
    updatePalletPaperDisplay();
  if (typeof updateWarehouseHighlight === "function")
    updateWarehouseHighlight();

  alert("Report data has been cleared.");
}
