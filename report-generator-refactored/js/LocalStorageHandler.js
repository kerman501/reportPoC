function getThemePreference() {
  return localStorage.getItem("theme");
}

function saveThemePreference(theme) {
  localStorage.setItem("theme", theme);
}

function loadSpreadsheetId() {
  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");
  if (spreadsheetIdInput) {
    const savedSpreadsheetId = localStorage.getItem("spreadsheetId");
    if (savedSpreadsheetId) {
      spreadsheetIdInput.value = savedSpreadsheetId;
    }
  }
}

function saveSpreadsheetId() {
  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");
  if (spreadsheetIdInput) {
    localStorage.setItem("spreadsheetId", spreadsheetIdInput.value);
  }
}

function saveSheetDataToLocalStorage() {
  const empNameEl = document.getElementById("sheetEmployeeName");
  const warehouseEl = document.getElementById("sheetWarehouse");
  if (empNameEl) localStorage.setItem("sheetEmployeeName", empNameEl.value);
  if (warehouseEl) localStorage.setItem("sheetWarehouse", warehouseEl.value);
}

function loadSheetDataFromLocalStorage() {
  const savedName = localStorage.getItem("sheetEmployeeName");
  const savedWarehouse = localStorage.getItem("sheetWarehouse");
  const empNameEl = document.getElementById("sheetEmployeeName");
  const warehouseEl = document.getElementById("sheetWarehouse");
  if (savedName && empNameEl) empNameEl.value = savedName;
  if (savedWarehouse && warehouseEl) warehouseEl.value = savedWarehouse;
}
