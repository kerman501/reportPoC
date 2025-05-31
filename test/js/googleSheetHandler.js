// js/googleSheetHandler.js

const GOOGLE_API_DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];
// Ensure this scope is requested during OAuth
const GOOGLE_API_SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let gapiInstance = null; // Will be set after GAPI is loaded and initialized

/**
 * Initializes the Google API client.
 * This should be called after the GAPI script has loaded.
 * @param {object} gapiClient - The GAPI client library instance.
 */
function initializeGoogleApi(gapiClient) {
  gapiInstance = gapiClient;
}

/**
 * Fetches data from a Google Sheet.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {string} range - The A1 notation of the range to retrieve (e.g., "B:E" or "Sheet1!A1:E200").
 * @returns {Promise<Array<Array<any>>>} A promise that resolves with an array of rows.
 */
async function fetchSheetData(spreadsheetId, sheetName, range = "B:E") {
  // gapiInstance это gapi.client, переданный из main.js
  // Проверяем, что gapiInstance (т.е. gapi.client) существует и
  // что API для Google Sheets (gapi.client.sheets) загружено и доступно.
  if (
    !gapiInstance ||
    !gapiInstance.sheets ||
    !gapiInstance.sheets.spreadsheets
  ) {
    console.error(
      "GAPI client not initialized, user not signed in, or Sheets API not ready.",
      "gapiInstance:",
      gapiInstance,
      "gapiInstance.sheets:",
      gapiInstance ? gapiInstance.sheets : "N/A"
    );
    throw new Error("GAPI_NOT_READY_OR_SHEETS_API_UNAVAILABLE");
  }

  const fullRange = `${sheetName}!${range}`;
  console.log(`Fetching data from: ${spreadsheetId}, range: ${fullRange}`);

  try {
    // Используем gapiInstance напрямую, так как это и есть gapi.client
    const response = await gapiInstance.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: fullRange,
    });
    console.log("Sheet data fetched successfully:", response.result.values);
    return response.result.values || [];
  } catch (err) {
    // ... (остальная часть обработчика ошибок без изменений)
    console.error("Error fetching sheet data. Raw error object:", err);
    let userMessage = "Error fetching data from Google Sheets.";
    if (err.result && err.result.error) {
      console.error("Detailed Google API Error:", err.result.error);
      userMessage += ` Details: ${err.result.error.message}`;
      if (err.result.error.status === "PERMISSION_DENIED") {
        userMessage =
          "Permission denied. Ensure you have access to the sheet and the correct API scopes are enabled.";
      } else if (err.result.error.status === "NOT_FOUND") {
        console.error(
          "Unknown error structure during fetchSheetData:",
          err.message
        );
        userMessage = `Sheet or range not found. Please check Spreadsheet ID, Sheet Name ('${sheetName}') and Range ('${range}').`;
      }
    }
    // alert(userMessage); // Consider if alert is needed here or should be handled by caller
    throw err;
  }
}

/**
 * Updates a cell in a Google Sheet.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the sheet (e.g., current date MMDDYYYY).
 * @param {string} jobNumber - The job number to find in column B.
 * @param {string} clientName - The client name to verify in column C.
 * @param {string} valueToFill - The string to write into column F of the found row.
 * @returns {Promise<{success: boolean, message: string, updatedRange?: string}>}
 */
async function updateSheetCell(
  spreadsheetId,
  sheetName,
  jobNumber,
  clientName,
  valueToFill
) {
  if (!gapiInstance || !gapiInstance.client) {
    console.error("GAPI client not initialized or user not signed in.");
    // alert("Google API not ready. Please sign in first.");
    return { success: false, message: "Google API not ready. Please sign in." };
  }

  if (!spreadsheetId || !sheetName || !jobNumber || !clientName) {
    return {
      success: false,
      message: "Missing required parameters for updating sheet.",
    };
  }

  try {
    // 1. Fetch columns B (Job Number) and C (Client Name) to find the row
    // We fetch a reasonable number of rows, e.g., 1000. Adjust if your sheets are larger.
    const rangeToSearch = `${sheetName}!B1:C1000`;
    const response = await gapiInstance.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: rangeToSearch,
    });

    const rows = response.result.values;
    let targetRowIndex = -1;

    if (rows && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const currentJobNumber = rows[i][0]; // Column B
        const currentClientName = rows[i][1]; // Column C
        if (
          String(currentJobNumber).trim() === String(jobNumber).trim() &&
          String(currentClientName).trim().toLowerCase() ===
            String(clientName).trim().toLowerCase()
        ) {
          targetRowIndex = i + 1; // Google Sheets rows are 1-indexed
          break;
        }
      }
    }

    if (targetRowIndex === -1) {
      console.log(
        `Job Number '${jobNumber}' and Client Name '${clientName}' not found in sheet '${sheetName}'.`
      );
      return {
        success: false,
        message: `Job Number '${jobNumber}' with Client '${clientName}' not found in sheet '${sheetName}'.`,
      };
    }

    // 2. Update column F for the found row
    const targetCell = `${sheetName}!F${targetRowIndex}`;
    const updateResponse =
      await gapiInstance.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: targetCell,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[valueToFill]],
        },
      });

    console.log("Sheet cell updated successfully:", updateResponse.result);
    return {
      success: true,
      message: `Sheet updated successfully at ${targetCell}.`,
      updatedRange: updateResponse.result.updatedRange,
    };
  } catch (err) {
    console.error("Error updating sheet cell:", err);
    let userMessage = "Error updating Google Sheet.";
    if (err.result && err.result.error) {
      userMessage += ` Details: ${err.result.error.message}`;
      if (err.result.error.status === "PERMISSION_DENIED") {
        userMessage =
          "Permission denied to update the sheet. Check sheet permissions and API scopes.";
      }
    }
    // alert(userMessage); // Alerting here might be too noisy, handle in UI
    return { success: false, message: userMessage };
  }
}

/**
 * Gets the current date formatted as MMDDYYYY for sheet names.
 * @returns {string}
 */
function getCurrentDateSheetName() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  return `${month}/${day}/${year}`; // Corrected: Returns "MM/DD/YYYY"
}

// You might also need functions to handle sign-in and sign-out
// e.g., handleAuthClick, handleSignoutClick, updateSigninStatus
// These would typically interact with gapi.auth2 or the new Google Identity Services (GIS)

export {
  initializeGoogleApi,
  fetchSheetData,
  updateSheetCell,
  getCurrentDateSheetName,
  GOOGLE_API_DISCOVERY_DOCS,
  GOOGLE_API_SCOPES,
};
