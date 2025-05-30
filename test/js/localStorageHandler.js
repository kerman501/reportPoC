// js/localStorageHandler.js

const THEME_KEY = "theme";
const SPREADSHEET_ID_KEY = "spreadsheetId";
const SHEET_EMPLOYEE_NAME_KEY = "sheetEmployeeName";
const SHEET_WAREHOUSE_KEY = "sheetWarehouse";

const SHEETS_DATA_CACHE_KEY = "sheetsDataCache";
const SHEETS_CACHE_METADATA_KEY = "sheetsCacheMetadata"; // Stores { cacheDate: "YYYY-MM-DD", sheetName: "MMDDYYYY", lastFetchTimestamp: 123... }
const SHEETS_DISPLAY_PREFS_KEY = "sheetsDisplayPreferences"; // For storing user's column/row preferences { columnsToFetch: "B,C,E", maxRows: "200" }

// --- Existing Theme and User Input Functions ---
function getThemePreference() {
  return localStorage.getItem(THEME_KEY);
}

function saveThemePreference(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function loadSpreadsheetId() {
  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");
  if (spreadsheetIdInput) {
    const savedSpreadsheetId = localStorage.getItem(SPREADSHEET_ID_KEY);
    if (savedSpreadsheetId) {
      spreadsheetIdInput.value = savedSpreadsheetId;
    }
  }
}

function saveSpreadsheetId() {
  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");
  if (spreadsheetIdInput) {
    localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetIdInput.value);
  }
}

function saveSheetDataToLocalStorage() {
  const empNameEl = document.getElementById("sheetEmployeeName");
  const warehouseEl = document.getElementById("sheetWarehouse");
  if (empNameEl) localStorage.setItem(SHEET_EMPLOYEE_NAME_KEY, empNameEl.value);
  if (warehouseEl) localStorage.setItem(SHEET_WAREHOUSE_KEY, warehouseEl.value);
}

function loadSheetDataFromLocalStorage() {
  const savedName = localStorage.getItem(SHEET_EMPLOYEE_NAME_KEY);
  const savedWarehouse = localStorage.getItem(SHEET_WAREHOUSE_KEY);
  const empNameEl = document.getElementById("sheetEmployeeName");
  const warehouseEl = document.getElementById("sheetWarehouse");

  if (empNameEl && savedName) {
    empNameEl.value = savedName;
  }
  if (warehouseEl && savedWarehouse) {
    warehouseEl.value = savedWarehouse;
  }
}

// --- New Google Sheets Cache Functions ---

/**
 * Saves the fetched Google Sheets data and its metadata to local storage.
 * @param {Array<Array<any>>} data - The data array from Google Sheets (e.g., rows of columns B, C, E).
 * @param {string} sheetNameForCache - The name of the sheet the data was fetched from (e.g., "05292025").
 * @param {string} currentDateYYYYMMDD - The current date as "YYYY-MM-DD" for cache validity.
 */
function saveSheetsDataCache(data, sheetNameForCache, currentDateYYYYMMDD) {
  try {
    localStorage.setItem(SHEETS_DATA_CACHE_KEY, JSON.stringify(data));
    const metadata = {
      cacheDate: currentDateYYYYMMDD, // Actual date cache was stored
      sheetName: sheetNameForCache, // Sheet name used for fetching
      lastFetchTimestamp: Date.now(), // Timestamp of this fetch
    };
    localStorage.setItem(SHEETS_CACHE_METADATA_KEY, JSON.stringify(metadata));
    console.log(
      `Sheets cache saved for sheet: ${sheetNameForCache} on ${currentDateYYYYMMDD}`
    );
  } catch (e) {
    console.error("Error saving sheets data cache to localStorage:", e);
    alert("Could not save sheet data to local cache. Storage might be full.");
  }
}

/**
 * Retrieves the cached Google Sheets data.
 * @returns {Array<Array<any>> | null} The cached data array or null.
 */
function getSheetsDataCache() {
  try {
    const cachedData = localStorage.getItem(SHEETS_DATA_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (e) {
    console.error("Error retrieving sheets data cache from localStorage:", e);
    return null;
  }
}

/**
 * Retrieves the metadata associated with the cache.
 * @returns {{cacheDate: string, sheetName: string, lastFetchTimestamp: number} | null}
 */
function getSheetsCacheMetadata() {
  try {
    const metadata = localStorage.getItem(SHEETS_CACHE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : null;
  } catch (e) {
    console.error("Error retrieving sheets cache metadata:", e);
    return null;
  }
}

/**
 * Updates only the last fetch timestamp in the cache metadata.
 */
function updateLastSheetFetchTimestamp() {
  try {
    const metadataString = localStorage.getItem(SHEETS_CACHE_METADATA_KEY);
    if (metadataString) {
      const metadata = JSON.parse(metadataString);
      metadata.lastFetchTimestamp = Date.now();
      localStorage.setItem(SHEETS_CACHE_METADATA_KEY, JSON.stringify(metadata));
    } else {
      // If no metadata, create a basic one just with the timestamp
      // This might happen if cache was cleared or never set
      const newMetadata = {
        cacheDate: null, // Or today's date
        sheetName: null, // Or current sheet name
        lastFetchTimestamp: Date.now(),
      };
      localStorage.setItem(
        SHEETS_CACHE_METADATA_KEY,
        JSON.stringify(newMetadata)
      );
    }
  } catch (e) {
    console.error("Error updating last sheet fetch timestamp:", e);
  }
}

/**
 * Clears all Google Sheets data cache and its metadata.
 */
function clearSheetsDataCache() {
  localStorage.removeItem(SHEETS_DATA_CACHE_KEY);
  localStorage.removeItem(SHEETS_CACHE_METADATA_KEY);
  console.log("Sheets data cache and metadata cleared.");
}

// --- User Preferences for Sheets Display ---

/**
 * Saves user preferences for displaying Google Sheets data.
 * @param {{columnsToFetch: string, maxRows: string}} prefs - Object with columns (e.g., "B,C,E") and rows (e.g., "200").
 */
function saveSheetsDisplayPreferences(prefs) {
  try {
    localStorage.setItem(SHEETS_DISPLAY_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Error saving sheets display preferences:", e);
  }
}

/**
 * Retrieves user preferences for displaying Google Sheets data.
 * @returns {{columnsToFetch: string, maxRows: string} | {columnsToFetch: string, maxRows: string}} Default or saved.
 */
function getSheetsDisplayPreferences() {
  const defaultPrefs = { columnsToFetch: "B,C,E", maxRows: "200" };
  try {
    const prefsString = localStorage.getItem(SHEETS_DISPLAY_PREFS_KEY);
    if (prefsString) {
      const savedPrefs = JSON.parse(prefsString);
      // Basic validation to ensure format is somewhat correct
      if (savedPrefs && savedPrefs.columnsToFetch && savedPrefs.maxRows) {
        return savedPrefs;
      }
    }
    return defaultPrefs;
  } catch (e) {
    console.error(
      "Error retrieving sheets display preferences, returning defaults:",
      e
    );
    return defaultPrefs;
  }
}

// Make functions available for import if using modules, or globally if not.
// Assuming ES Modules for modern practice:
export {
  getThemePreference,
  saveThemePreference,
  loadSpreadsheetId,
  saveSpreadsheetId,
  saveSheetDataToLocalStorage,
  loadSheetDataFromLocalStorage,
  saveSheetsDataCache,
  getSheetsDataCache,
  getSheetsCacheMetadata,
  updateLastSheetFetchTimestamp,
  clearSheetsDataCache,
  saveSheetsDisplayPreferences,
  getSheetsDisplayPreferences,
};
