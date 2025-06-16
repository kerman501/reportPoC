let todaysJobs = []; // Здесь будет храниться список работ на день
let debounceTimer; // Таймер для отложенного запроса
const DEBOUNCE_DELAY = 1000; // Задержка в мс (1 секунда)

document.addEventListener("DOMContentLoaded", () => {
  initializeAppLogic();
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

function initializeAppLogic() {
  // 1. Пытаемся загрузить работы из localStorage при старте
  loadJobsFromLocalStorage();

  // 2. Вешаем "слушателя" на поле ввода номера работы
  const jobInput = document.getElementById("job");
  // Находим наш новый индикатор
  const debounceIndicator = document.getElementById("debounce-indicator");

  if (jobInput && debounceIndicator) {
    jobInput.addEventListener("input", (e) => {
      const jobId = e.target.value.trim();

      // Сбрасываем предыдущий таймер и анимацию
      clearTimeout(debounceTimer);
      debounceIndicator.classList.remove("active");
      // Этот трюк с reflow нужен, чтобы анимация могла запуститься заново
      void debounceIndicator.offsetWidth;

      if (jobId && jobId.length > 5) {
        // Запускаем новый таймер и анимацию
        debounceIndicator.classList.add("active");

        debounceTimer = setTimeout(() => {
          debounceIndicator.classList.remove("active");
          handleJobIdInput(jobId);
        }, DEBOUNCE_DELAY);
      }
    });
  }
}

// --- Функции для работы с localStorage ---

function saveJobsToLocalStorage(jobs) {
  const today = new Date().toLocaleDateString(); // "6/15/2025"
  const dataToStore = {
    savedDate: today,
    jobs: jobs,
  };
  localStorage.setItem("dailyJobsData", JSON.stringify(dataToStore));
  console.log(`Сохранено ${jobs.length} работ на дату ${today}`);
}

function loadJobsFromLocalStorage() {
  const storedData = localStorage.getItem("dailyJobsData");
  if (storedData) {
    const parsedData = JSON.parse(storedData);
    const today = new Date().toLocaleDateString();

    // Проверяем, что сохраненные данные - сегодняшние
    if (parsedData.savedDate === today) {
      todaysJobs = parsedData.jobs;
      console.log(
        `Загружено ${todaysJobs.length} работ из localStorage за сегодня.`
      );
      // Сразу отрисовываем список
      renderJobsList(todaysJobs);
    } else {
      console.log("Найдены устаревшие данные, очищаем localStorage.");
      localStorage.removeItem("dailyJobsData");
    }
  }
}

// --- Логика обработки ввода и запроса к API ---

function handleJobIdInput(jobId) {
  // Сначала ищем в уже загруженных данных
  const foundJob = todaysJobs.find((job) => job.leadid === jobId);

  if (foundJob) {
    console.log(`Работа ${jobId} найдена локально. Запрос к API не требуется.`);
    populateFormWithJobData(foundJob);
  } else {
    // Если не нашли локально (или массив пуст), идем на сервер
    console.log(
      `Работа ${jobId} не найдена локально. Отправляем запрос к API.`
    );
    fetchJobsFromServer(jobId);
  }
}

async function fetchJobsFromServer(jobId) {
  const container = document.getElementById("jobs-list-container");
  container.innerHTML = '<div class="loader"></div>'; // Показываем загрузчик

  const apiUrl = `https://backend-test-pi-three.vercel.app/api/get-daily-jobs?jobId=${jobId}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      // Получаем текст ошибки с сервера, если он есть
      const errorData = await response.json();
      throw new Error(errorData.error || `Network error: ${response.status}`);
    }

    const jsonData = await response.json();
    todaysJobs = jsonData.data; // Обновляем наш глобальный массив

    saveJobsToLocalStorage(todaysJobs); // Сохраняем в localStorage
    renderJobsList(todaysJobs); // Отрисовываем список

    // После успешной загрузки всего списка, найдем и заполним форму для текущего jobId
    const currentJob = todaysJobs.find((job) => job.leadid === jobId);
    if (currentJob) {
      populateFormWithJobData(currentJob);
    }
  } catch (error) {
    console.error("Ошибка при загрузке работ с сервера:", error);
    container.innerHTML = `<p style="color: var(--color-error);">${error.message}</p>`;
  }
}

// --- Функции для отрисовки и заполнения ---

function renderJobsList(jobs) {
  const container = document.getElementById("jobs-list-container");
  container.innerHTML = ""; // Очищаем

  if (jobs && jobs.length > 0) {
    jobs.forEach((job) => {
      const jobButton = document.createElement("button");
      jobButton.className = "job-button";
      jobButton.innerHTML = `
        <span class="job-button-leadid">${job.leadid}</span>
        <span class="job-button-customer">${job.customerfullname}</span>
        <span class="job-button-cuft">${job.inventoryvolumecuft} CuFt</span>
      `;
      jobButton.addEventListener("click", () => populateFormWithJobData(job));
      container.appendChild(jobButton);
    });
  } else {
    container.textContent = "No jobs found.";
  }
}

function populateFormWithJobData(job) {
  // Очищаем поля перед заполнением
  document.getElementById("clientName").value = "";
  // document.getElementById('job').value = ''; // Не очищаем поле, по которому искали
  document.getElementById("cuFt").value = "";

  // Заполняем
  document.getElementById("clientName").value = job.customerfullname || "";
  document.getElementById("job").value = job.leadid || "";
  document.getElementById("cuFt").value = job.inventoryvolumecuft || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}
