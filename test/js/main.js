// js/main.js
import {
  GOOGLE_API_DISCOVERY_DOCS,
  GOOGLE_API_SCOPES,
  initializeGoogleApi,
  fetchSheetData,
  getCurrentDateSheetName as getSheetNameForToday,
} from "./googleSheetHandler.js";
import {
  getThemePreference,
  loadSpreadsheetId,
  saveSheetDataToLocalStorage,
  loadSheetDataFromLocalStorage,
  getSheetsDataCache,
  saveSheetsDataCache,
  getSheetsCacheMetadata,
  updateLastSheetFetchTimestamp,
  getSheetsDisplayPreferences,
  saveSheetsDisplayPreferences,
  clearSheetsDataCache,
} from "./localStorageHandler.js";
import {
  applyCurrentTheme,
  setupThemeToggle,
  createQuestionFields,
  resetUIForClearReport,
  updateStatusMessage,
  toggleLoader,
  displaySheetsDataTable,
  updateSheetsTableStatus,
  updatePalletPaperDisplay,
  getCurrentDateFormatted,
  setFieldStatus as setUiFieldStatus,
  updateAndSetFieldStatus as updateUiAndSetFieldStatus,
  openPdfModal as uiOpenPdfModal,
  closePdfModal as uiClosePdfModal,
  closePdfModalWithHistory as uiClosePdfModalWithHistory,
  updatePdfViewerControls as uiUpdatePdfViewerControls,
  updatePdfItemCountUI as uiUpdatePdfItemCountUI,
  updatePdfMaterialCountsUI as uiUpdatePdfMaterialCountsUI,
} from "./uiHandler.js";
import {
  initializePhotoHandling,
  clearPhotoData,
  getEnablePhotoCommentsState,
} from "./photoHandler.js";
import {
  initializePdfJsWorker,
  handlePdfFileChange,
  renderPdfPage,
  clearPdfData,
  getLoadedPdfDocument,
  getCurrentPdfPageInfo,
  setCurrentPdfPage,
} from "./pdfHandler.js";
import {
  processUrlParameters,
  generateSheetFormula,
  updateSheetOutputString,
  handleFillSheetAndCopy,
  copyPalletDataToClipboard,
  resetFormFields,
  populateInitialFormValues,
  setupFormEventListeners,
  validateNoOptionComments,
} from "./formHandler.js";
import { generatePdfWithPhotos } from "./reportGenerator.js";
import {
  questions,
  defaultValuesConfig,
  attentionFieldIds,
  keywordMap,
} from "./config.js";
import { setupQrScanner } from "./qrScanner.js";

// --- Google API & Auth Configuration ---
const CLIENT_ID =
  "890349689891-pbm8otbvsd218fg48d3jqv7l4evlkrrn.apps.googleusercontent.com"; // <<< ВАЖНО: Замените на ваш реальный Client ID
let tokenClient;
let gapiInited = false; // Флаг, что gapi.client.init() успешно завершился
let gisInited = false; // Флаг, что GIS (Google Identity Services) загружен и tokenClient создан

// --- Google API Initialization Callbacks ---
window.gapiLoaded = () => {
  console.log("gapi.js script loaded.");
  gapi.load("client", initializeGapiClient); // Загружаем gapi.client, затем инициализируем
};

async function initializeGapiClient() {
  try {
    console.log("Attempting gapi.client.init()...");
    await gapi.client.init({
      // apiKey: API_KEY, // Не нужен для OAuth2
      discoveryDocs: GOOGLE_API_DISCOVERY_DOCS,
    });
    gapiInited = true; // Устанавливаем флаг после успешной инициализации
    initializeGoogleApi(gapi.client); // Передаем gapi.client в googleSheetHandler
    console.log("gapi.client.init() successful. gapiInited = true.");
    maybeEnableAuthDependentFeatures(); // Проверяем, можно ли активировать функции, зависящие от API
  } catch (e) {
    console.error("Error initializing GAPI client:", e);
    updateStatusMessage(
      "sheetDataStatus",
      `Error initializing Google API client: ${e.message || e}`,
      "error"
    );
    gapiInited = false; // Убедимся, что флаг сброшен при ошибке
  }
}

window.gisLoaded = () => {
  console.log("gis.js script loaded.");
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: GOOGLE_API_SCOPES,
    callback: gisAccessTokenCallback, // Этот callback будет вызван после получения токена
  });
  gisInited = true; // GIS загружен и tokenClient создан
  console.log("GIS tokenClient initialized. gisInited = true.");

  // Инициализация кнопки "Sign In With Google"
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleGoogleSignInCredentialResponse, // Callback для ID токена
  });
  const signInButton = document.getElementById("googleSignInButtonContainer");
  if (signInButton) {
    google.accounts.id.renderButton(signInButton, {
      theme: "outline",
      size: "large",
      type: "standard",
    });
  } else {
    console.warn("Google Sign-In button container not found during GIS load.");
  }
  maybeEnableAuthDependentFeatures(); // Проверяем, можно ли активировать функции
};

// Callback для GIS tokenClient (когда получен access_token)
function gisAccessTokenCallback(tokenResponse) {
  if (tokenResponse.error) {
    console.error("GIS Access Token Error:", tokenResponse);
    updateAuthUI(false);
    updateStatusMessage(
      "sheetDataStatus",
      `Sign-in error: ${
        tokenResponse.error_description || tokenResponse.error
      }`,
      "error"
    );
    return;
  }
  // gapi.client.setToken(tokenResponse); // GIS обычно делает это автоматически с tokenClient
  console.log("Access token received via GIS Token Client.", tokenResponse);

  // Теперь, когда у нас есть токен, ПРОВЕРЯЕМ, готов ли gapi.client
  if (!gapiInited) {
    console.warn(
      "GIS token received, but GAPI client (gapi.client) not yet initialized. Waiting for gapi.client.init()..."
    );
    updateAuthUI(true); // Пользователь вошел через GIS, но gapi.client еще не готов
    updateStatusMessage(
      "sheetDataStatus",
      "Signed in. Google API client is initializing, please wait or try again shortly.",
      "info",
      5000
    );
    // Можно установить флаг, чтобы maybeEnableAuthDependentFeatures позже подхватил,
    // или просто подождать - maybeEnableAuthDependentFeatures вызовется из initializeGapiClient.
    return; // Выходим, так как gapi.client еще не готов для API вызовов
  }

  // Если и GIS токен есть, и gapi.client инициализирован
  updateAuthUI(true);
  console.log("Both GIS token and gapi.client are ready. Loading sheet data.");
  loadAndDisplaySheetsData(true); // Принудительно обновить данные
}

// Callback для кнопки "Sign In With Google" (когда получен ID токен)
function handleGoogleSignInCredentialResponse(credentialResponse) {
  console.log(
    "ID Token received from Sign In With Google button:",
    credentialResponse.credential
  );
  // Если gapi.client еще не готов, нет смысла пытаться получить access_token для него
  if (!gapiInited) {
    console.warn(
      "ID token from GSI button received, but gapi.client not ready. Deferring access token request."
    );
    // Можно сохранить ID токен и попытаться получить access_token позже,
    // когда gapi.client будет готов, или просто положиться на то, что пользователь
    // нажмет кнопку "Connect" (если такая есть) или что gapi.client.init() скоро завершится.
    // На данный момент, просто выведем сообщение.
    updateStatusMessage(
      "sheetDataStatus",
      "Signed in with Google. API client is initializing...",
      "info",
      3000
    );
    // Попытка обновить UI, показывая, что начальный этап входа пройден
    const signOutButton = document.getElementById("googleSignOutButton");
    const signInContainer = document.getElementById(
      "googleSignInButtonContainer"
    );
    if (signOutButton) signOutButton.style.display = "inline-flex"; // Показать кнопку выхода
    if (signInContainer) signInContainer.style.display = "none"; // Скрыть кнопку входа GSI
    return;
  }

  // Если gapi.client готов, проверяем, есть ли уже access_token
  const currentToken = gapi.client.getToken();
  if (!currentToken || currentToken.expires_at < Date.now()) {
    console.log(
      "No valid GAPI access token found, requesting one using tokenClient."
    );
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: "consent" }); // Запрашиваем access_token
    } else {
      console.error(
        "tokenClient not ready in handleGoogleSignInCredentialResponse."
      );
      updateStatusMessage(
        "sheetDataStatus",
        "Sign-in component not ready. Please refresh.",
        "error"
      );
    }
  } else {
    console.log("GAPI access token already exists and is valid.");
    updateAuthUI(true); // Уже есть access_token
    loadAndDisplaySheetsData(false); // Загружаем данные без принудительного обновления сети
  }
}

// Эта функция вызывается и из initializeGapiClient, и из gisLoaded
function maybeEnableAuthDependentFeatures() {
  console.log(
    `maybeEnableAuthDependentFeatures called. gapiInited: ${gapiInited}, gisInited: ${gisInited}`
  );
  if (gapiInited && gisInited) {
    // Только если ОБА API готовы
    console.log(
      "Both GAPI client and GIS are initialized. Checking auth status for GAPI client."
    );
    const currentGapiToken = gapi.client.getToken(); // Это проверит токен, установленный через tokenClient
    const isSignedIn =
      currentGapiToken !== null && currentGapiToken.expires_at > Date.now();
    console.log(
      "Current GAPI token state:",
      currentGapiToken,
      "Is signedIn:",
      isSignedIn
    );
    updateAuthUI(isSignedIn);

    if (isSignedIn) {
      console.log(
        "User is signed in with a valid GAPI access token. Loading initial sheet data."
      );
      loadAndDisplaySheetsData(false); // Загрузить данные, если пользователь уже вошел в систему
    } else {
      console.log(
        "User is not signed in with a valid GAPI access token. Prompting to sign in."
      );
      displaySheetsDataTable(
        null,
        getSheetsDisplayPreferences().columnsToFetch,
        null
      ); // Очистить таблицу
      updateSheetsTableStatus(
        "Please sign in to access Google Sheets data.",
        "info"
      );
    }
  } else {
    console.log("Waiting for both GAPI client and GIS to initialize.");
  }
}

// Вызывается, если пользователь нажимает кастомную кнопку "Войти/Подключить таблицы"
function handleSignInClick() {
  if (!gisInited || !tokenClient) {
    console.error(
      "GIS or tokenClient not initialized. Cannot initiate sign-in."
    );
    alert("Google Sign-In is not ready. Please try again in a moment.");
    return;
  }
  if (!gapiInited) {
    console.warn(
      "gapi.client not initialized. Sign-in might grant token, but API calls will wait for GAPI init."
    );
    // Можно показать сообщение пользователю
  }
  console.log("Requesting access token via tokenClient...");
  tokenClient.requestAccessToken({ prompt: "consent" }); // Запрос токена с возможным диалогом согласия
}

function handleSignOutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      // Отзываем токен
      gapi.client.setToken(""); // Очищаем токен в gapi.client
      updateAuthUI(false);
      clearSheetsDataCache();
      displaySheetsDataTable(
        null,
        getSheetsDisplayPreferences().columnsToFetch,
        null
      );
      updateSheetsTableStatus(
        "Signed out. Please sign in to access Google Sheets data.",
        "info"
      );
      console.log("User signed out and token revoked.");
    });
  } else {
    console.log("Already signed out or no token to revoke for GAPI client.");
    updateAuthUI(false); // Убедимся, что UI обновлен
  }
}

function updateAuthUI(isSignedIn) {
  const signOutButton = document.getElementById("googleSignOutButton");
  const signInContainer = document.getElementById(
    "googleSignInButtonContainer"
  );
  const fillSheetBtn = document.getElementById("fillSheetBtn");
  const refreshSheetsDataBtn = document.getElementById("refreshSheetsDataBtn");
  console.log(`Updating Auth UI. isSignedIn: ${isSignedIn}`);

  if (isSignedIn) {
    if (signOutButton) signOutButton.style.display = "inline-flex";
    if (signInContainer) signInContainer.style.display = "none";
    if (fillSheetBtn) fillSheetBtn.disabled = false;
    if (refreshSheetsDataBtn) refreshSheetsDataBtn.disabled = false;
  } else {
    if (signOutButton) signOutButton.style.display = "none";
    if (signInContainer) signInContainer.style.display = "block";
    if (fillSheetBtn) fillSheetBtn.disabled = true;
    if (refreshSheetsDataBtn) refreshSheetsDataBtn.disabled = true;
  }
}

async function loadAndDisplaySheetsData(forceRefresh = false) {
  console.log(
    `loadAndDisplaySheetsData called. forceRefresh: ${forceRefresh}, gapiInited: ${gapiInited}`
  );
  if (!gapiInited) {
    // Дополнительная проверка здесь, хотя gisAccessTokenCallback тоже проверяет
    updateSheetsTableStatus(
      "Google API client is not ready. Cannot load Sheets data.",
      "error"
    );
    console.warn("Attempted to load sheet data, but gapi.client not ready.");
    return;
  }
  const currentGapiToken = gapi.client.getToken();
  if (!currentGapiToken || currentGapiToken.expires_at < Date.now()) {
    updateSheetsTableStatus(
      "Please sign in to load Google Sheets data.",
      "info"
    );
    displaySheetsDataTable(
      null,
      getSheetsDisplayPreferences().columnsToFetch,
      null
    );
    updateAuthUI(false);
    console.warn(
      "Attempted to load sheet data, but no valid GAPI access token."
    );
    return;
  }

  const prefs = getSheetsDisplayPreferences();
  const columnsToFetch = prefs.columnsToFetch;
  const maxRows = prefs.maxRows;
  const spreadsheetId = document.getElementById("spreadsheetIdInput").value;

  if (!spreadsheetId) {
    updateSheetsTableStatus(
      "Spreadsheet ID is not set. Cannot load data.",
      "error"
    );
    displaySheetsDataTable(null, columnsToFetch, null);
    return;
  }

  const currentSheetName = getSheetNameForToday();
  const currentDateYYYYMMDD = getCurrentDateFormatted("YYYY-MM-DD");
  let cachedData = getSheetsDataCache();
  let cacheMeta = getSheetsCacheMetadata();
  let displayableData = null;
  let cacheTimestamp = null;
  const isCacheValid =
    cacheMeta &&
    cacheMeta.cacheDate === currentDateYYYYMMDD &&
    cacheMeta.sheetName === currentSheetName &&
    cachedData;

  if (isCacheValid && !forceRefresh) {
    console.log(
      "Displaying data from valid local cache for sheet:",
      currentSheetName
    );
    displayableData = cachedData;
    cacheTimestamp = cacheMeta.lastFetchTimestamp
      ? new Date(cacheMeta.lastFetchTimestamp).toISOString()
      : null;
    updateSheetsTableStatus(
      "Displayed data from local cache.",
      "success",
      2000
    );
  } else {
    console.log(
      forceRefresh
        ? "Forcing refresh..."
        : "Cache invalid or not found, or forced refresh. Fetching from Google Sheets..."
    );
    const lastFetch = cacheMeta ? cacheMeta.lastFetchTimestamp : 0;
    if (Date.now() - lastFetch < 60000 && !forceRefresh) {
      console.warn(
        "Fetch skipped due to rate limit (1 min). Using existing cache if available."
      );
      updateSheetsTableStatus(
        "Fetch rate limited (1 min). Using older cache if available or try refreshing again in a moment.",
        "info",
        4000
      );
      if (cachedData) {
        displayableData = cachedData;
        cacheTimestamp = cacheMeta
          ? new Date(cacheMeta.lastFetchTimestamp).toISOString()
          : null;
      }
    } else {
      try {
        updateSheetsTableStatus(
          `Fetching data from Google Sheets (${currentSheetName})...`,
          "info"
        );
        toggleLoader("pdfGenerateLoader", true);
        const firstCol = columnsToFetch.split(",")[0].trim();
        const lastCol = columnsToFetch.split(",").pop().trim();
        const range = `${firstCol}1:${lastCol}${maxRows}`;

        console.log("Calling fetchSheetData from loadAndDisplaySheetsData...");
        const freshData = await fetchSheetData(
          spreadsheetId,
          currentSheetName,
          range
        );

        updateLastSheetFetchTimestamp();
        saveSheetsDataCache(freshData, currentSheetName, currentDateYYYYMMDD);
        displayableData = freshData;
        cacheTimestamp = new Date().toISOString();
        updateSheetsTableStatus(
          "Data refreshed from Google Sheets.",
          "success",
          3000
        );
      } catch (error) {
        console.error(
          "Error fetching or displaying sheet data in loadAndDisplaySheetsData:",
          error
        );
        updateSheetsTableStatus(
          `Error loading data: ${
            error.message || "Unknown error"
          }. Using stale cache if available.`,
          "error",
          5000
        );
        if (error.message === "GAPI_NOT_READY") {
          // Если ошибка именно из-за неготовности GAPI
          updateAuthUI(false); // Может потребоваться повторная аутентификация или ожидание
        }
        if (cachedData) {
          displayableData = cachedData;
          cacheTimestamp = cacheMeta
            ? new Date(cacheMeta.lastFetchTimestamp).toISOString()
            : null;
        }
      } finally {
        toggleLoader("pdfGenerateLoader", false);
      }
    }
  }
  displaySheetsDataTable(displayableData, columnsToFetch, cacheTimestamp);
}

function showViewPdfButtonCallback(show) {
  const viewPdfBtn = document.getElementById("viewPdfBtn");
  if (viewPdfBtn) {
    viewPdfBtn.style.display = show ? "inline-block" : "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyCurrentTheme();
  setupThemeToggle();
  createQuestionFields();

  if (!initializePdfJsWorker()) {
    console.warn("PDF.js worker initialization failed.");
  }

  loadSheetDataFromLocalStorage();
  loadSpreadsheetId();
  populateInitialFormValues();
  processUrlParameters();
  initializePhotoHandling();
  setupFormEventListeners();
  setupQrScanner(); // Импортирована и вызывается напрямую

  updateSheetOutputString();
  generateSheetFormula();
  updatePalletPaperDisplay();

  const reportButtonIcon = document.getElementById("reportButtonIcon");
  if (reportButtonIcon) {
    const iconImagePreloader = new Image();
    iconImagePreloader.onload = () => {
      reportButtonIcon.src = "assets/logo.png";
      reportButtonIcon.style.display = "inline";
      reportButtonIcon.dataset.srcSet = "true";
    };
    iconImagePreloader.onerror = () => {
      reportButtonIcon.style.display = "none";
      reportButtonIcon.dataset.srcSet = "false";
    };
    iconImagePreloader.src = "assets/logo.png";
  }

  const clearReportBtn = document.getElementById("clearReportBtn");
  if (clearReportBtn)
    clearReportBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to clear all report data?")) return;
      resetFormFields();
      clearPhotoData();
      clearPdfData();
      resetUIForClearReport();
      clearSheetsDataCache();
      const prefs = getSheetsDisplayPreferences();
      displaySheetsDataTable(null, prefs.columnsToFetch, null);
      updateSheetsTableStatus("Report data cleared. Cache emptied.", "info");
      updateSheetOutputString();
      generateSheetFormula();
      updatePalletPaperDisplay();
      alert("Report data has been cleared.");
    });

  const pdfFileInput = document.getElementById("pdfFile");
  if (pdfFileInput) {
    pdfFileInput.addEventListener("change", (event) => {
      const dependencies = {
        updateUiAndSetFieldStatus: updateUiAndSetFieldStatus,
        setUiFieldStatus: setUiFieldStatus,
        updateStatusMessage: updateStatusMessage,
        updatePdfItemCountUI: uiUpdatePdfItemCountUI,
        updatePdfMaterialCountsUI: uiUpdatePdfMaterialCountsUI,
        questions: questions,
        defaultValuesConfig: defaultValuesConfig,
        attentionFieldIds: attentionFieldIds,
        keywordMap: keywordMap,
        updateSheetOutputString: updateSheetOutputString,
        showViewPdfButton: showViewPdfButtonCallback,
      };
      handlePdfFileChange(event, dependencies);
    });
  }

  const viewPdfBtn = document.getElementById("viewPdfBtn");
  if (viewPdfBtn) viewPdfBtn.addEventListener("click", uiOpenPdfModal);

  const closePdfModalBtn = document.getElementById("closePdfModalBtn");
  if (closePdfModalBtn)
    closePdfModalBtn.addEventListener("click", uiClosePdfModalWithHistory);

  const prevPageBtn = document.getElementById("prevPage");
  if (prevPageBtn)
    prevPageBtn.addEventListener("click", () => {
      const pageInfo = getCurrentPdfPageInfo();
      if (pageInfo.current > 1) {
        const newPageNum = pageInfo.current - 1;
        setCurrentPdfPage(newPageNum);
        const canvas = document.querySelector("#pdfViewerContainer canvas");
        const loadedPdf = getLoadedPdfDocument();
        if (canvas && loadedPdf) renderPdfPage(newPageNum, canvas);
        uiUpdatePdfViewerControls();
      }
    });

  const nextPageBtn = document.getElementById("nextPage");
  if (nextPageBtn)
    nextPageBtn.addEventListener("click", () => {
      const pageInfo = getCurrentPdfPageInfo();
      if (pageInfo.current < pageInfo.total) {
        const newPageNum = pageInfo.current + 1;
        setCurrentPdfPage(newPageNum);
        const canvas = document.querySelector("#pdfViewerContainer canvas");
        const loadedPdf = getLoadedPdfDocument();
        if (canvas && loadedPdf) renderPdfPage(newPageNum, canvas);
        uiUpdatePdfViewerControls();
      }
    });

  const generateSheetFormulaBtn = document.getElementById(
    "generateSheetFormulaBtn"
  );
  if (generateSheetFormulaBtn)
    generateSheetFormulaBtn.addEventListener("click", generateSheetFormula);

  const fillSheetBtn = document.getElementById("fillSheetBtn");
  if (fillSheetBtn)
    fillSheetBtn.addEventListener("click", handleFillSheetAndCopy);

  const createShareReportBtn = document.getElementById("createShareReportBtn");
  if (createShareReportBtn)
    createShareReportBtn.addEventListener("click", () => {
      const validation = validateNoOptionComments();
      if (!validation.isValid) {
        alert(
          "Please provide valid comments for all items marked 'NO':\n\n" +
            validation.messages.join("\n")
        );
        updateStatusMessage(
          "pdfGenerateStatus",
          "Validation failed. Check comments.",
          "error",
          5000
        );
        return;
      }
      generatePdfWithPhotos();
    });

  const copyPalletDataBtn = document.getElementById("copyPalletDataBtn");
  if (copyPalletDataBtn)
    copyPalletDataBtn.addEventListener("click", () => {
      updatePalletPaperDisplay();
      copyPalletDataToClipboard();
    });

  const refreshBtn = document.getElementById("refreshSheetsDataBtn");
  if (refreshBtn)
    refreshBtn.addEventListener("click", () => loadAndDisplaySheetsData(true));

  const columnsInput = document.getElementById("sheetsColumnsToDisplay");
  const rowsInput = document.getElementById("sheetsRowsToDisplay");
  const saveAndReloadPrefs = () => {
    if (columnsInput && rowsInput) {
      saveSheetsDisplayPreferences({
        columnsToFetch: columnsInput.value,
        maxRows: rowsInput.value,
      });
      loadAndDisplaySheetsData(false);
    }
  };
  if (columnsInput) columnsInput.addEventListener("change", saveAndReloadPrefs);
  if (rowsInput) rowsInput.addEventListener("change", saveAndReloadPrefs);

  const displayPrefs = getSheetsDisplayPreferences();
  if (columnsInput) columnsInput.value = displayPrefs.columnsToFetch;
  if (rowsInput) rowsInput.value = displayPrefs.maxRows;

  window.addEventListener("popstate", (event) => {
    const pdfModal = document.getElementById("pdfModal");
    if (pdfModal && pdfModal.style.display === "flex") {
      if (
        (event.state && event.state.pdfModalOpen === false) ||
        !event.state ||
        !event.state.pdfModalOpen
      ) {
        uiClosePdfModal(false);
      }
    }
  });

  const signOutButton = document.getElementById("googleSignOutButton");
  if (signOutButton)
    signOutButton.addEventListener("click", handleSignOutClick);

  updateAuthUI(false); // Начальное состояние UI - не аутентифицирован
});
