// js/qrScanner.js
import {
  getSheetsDataCache,
  getSheetsCacheMetadata,
  saveSheetsDataCache,
  updateLastSheetFetchTimestamp,
  // No need for clearSheetsDataCache directly here, managed elsewhere
} from "./localStorageHandler.js";
import {
  fetchSheetData,
  getCurrentDateSheetName,
} from "./googleSheetHandler.js"; // Assuming gapi is initialized
import { updateStatusMessage, updateAndSetFieldStatus } from "./uiHandler.js";

// Debounce/throttle: Minimum 60 seconds between fetches
const MIN_FETCH_INTERVAL_MS = 60 * 1000;

async function findJobInCache(jobNumber, cache) {
  if (!cache || !cache.data || !Array.isArray(cache.data)) {
    console.log("findJobInCache: Cache or cache.data is invalid/empty.");
    return null;
  }
  console.log(
    `findJobInCache: Searching for jobNumber '${jobNumber}' in cache with ${cache.data.length} rows.`
  );

  // Range B1:E500 means:
  // row[0] = Column B (Job Number)
  // row[1] = Column C (Client Name)
  // row[2] = Column D (Intermediate, not explicitly named in columnsToFetch)
  // row[3] = Column E (Volume)
  for (const row of cache.data) {
    if (
      row &&
      row.length > 0 &&
      String(row[0]).trim() === String(jobNumber).trim()
    ) {
      // Проверяем только первую колонку для совпадения номера
      // Убедимся, что у нас есть данные для clientName и volume
      const clientName = row.length > 1 ? row[1] || "" : "";
      const volume = row.length > 3 ? row[3] || "" : ""; // Volume из колонки E (индекс 3)
      console.log(
        `findJobInCache: Found potential match. Row B: ${row[0]}, C: ${clientName}, E: ${volume}`
      );
      return {
        clientName: clientName,
        volume: volume,
      };
    }
  }
  console.log(`findJobInCache: JobNumber '${jobNumber}' not found.`);
  return null;
}

async function handleScannedJobNumber(jobNumber) {
  const clientNameInput = document.getElementById("clientName");
  const cuFtInput = document.getElementById("cuFt");
  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");

  if (!clientNameInput || !cuFtInput || !spreadsheetIdInput) {
    console.error(
      "Required input fields (clientName, cuFt, or spreadsheetIdInput) not found."
    );
    return;
  }

  const spreadsheetId = spreadsheetIdInput.value;
  if (!spreadsheetId) {
    alert("Spreadsheet ID is not set. Please configure it first.");
    return;
  }

  const currentDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const sheetNameForToday = getCurrentDateSheetName(); // MMDDYYYY format for sheet name

  let cache = getSheetsDataCache();
  let metadata = getSheetsCacheMetadata();
  let jobData = null;
  let needsFetch = false;
  let cacheIsCurrent =
    metadata &&
    metadata.cacheDate === currentDateStr &&
    metadata.sheetName === sheetNameForToday;

  if (cache && cacheIsCurrent) {
    jobData = await findJobInCache(jobNumber, { data: cache }); // Pass cache.data
  }

  if (jobData) {
    updateAndSetFieldStatus("clientName", jobData.clientName, "pdf-informed"); // or a new status like "qr-informed"
    updateAndSetFieldStatus("cuFt", jobData.volume, "pdf-informed");
    console.log(
      `Job ${jobNumber} found in current cache. Client: ${jobData.clientName}, Volume: ${jobData.volume}`
    );
    return; // Found in current and valid cache
  }

  // If not found in current cache, or cache is outdated/not for today's sheet
  if (!cacheIsCurrent || !jobData) {
    console.log(
      `Job ${jobNumber} not found in current cache or cache is outdated. Attempting fetch.`
    );
    needsFetch = true;
  }

  if (needsFetch) {
    const lastFetchTimestamp = metadata ? metadata.lastFetchTimestamp : 0;
    if (Date.now() - lastFetchTimestamp < MIN_FETCH_INTERVAL_MS) {
      console.warn(
        `Skipping fetch for job ${jobNumber} due to rate limit. Last fetch was too recent.`
      );
      alert(
        "Searched cache, but a new data fetch is rate-limited (1 min). Try again shortly or refresh manually if needed."
      );
      if (!jobData && cache) {
        // If job wasn't found, but there *was* some cache (maybe old)
        alert(
          `Job number ${jobNumber} not found in the available (possibly outdated) local data.`
        );
      }
      return;
    }

    try {
      // Default columns "B,C,E" and a reasonable number of rows. This should match `getSheetsDisplayPreferences` defaults
      // Or, ideally, use getSheetsDisplayPreferences() here. For now, hardcoding for simplicity of this step.
      const columnsToFetch = "B,C,E"; // Corresponds to Job No, Client Name, Volume
      const maxRowsToFetch = "500"; // Fetch more rows for QR lookup than default display if needed
      const range = `${columnsToFetch.split(",")[0]}1:${columnsToFetch
        .split(",")
        .pop()}${maxRowsToFetch}`;

      updateStatusMessage(
        "qrScanStatus",
        `Fetching latest data for ${sheetNameForToday}...`,
        "info"
      ); // Assuming you add a qrScanStatus element
      const freshData = await fetchSheetData(
        spreadsheetId,
        sheetNameForToday,
        range
      );
      console.log("Fresh data from Google Sheets:", JSON.stringify(freshData));
      updateLastSheetFetchTimestamp(); // Record successful fetch attempt *before* saving cache
      saveSheetsDataCache(freshData, sheetNameForToday, currentDateStr);

      jobData = await findJobInCache(jobNumber, { data: freshData });
      updateStatusMessage(
        "qrScanStatus",
        `Data refreshed. Searching for ${jobNumber}...`,
        "info",
        2000
      );

      if (jobData) {
        updateAndSetFieldStatus(
          "clientName",
          jobData.clientName,
          "pdf-informed"
        );
        updateAndSetFieldStatus("cuFt", jobData.volume, "pdf-informed");
        console.log(
          `Job ${jobNumber} found after fetch. Client: ${jobData.clientName}, Volume: ${jobData.volume}`
        );
      } else {
        console.log(
          `Job ${jobNumber} not found even after fetching fresh data from sheet '${sheetNameForToday}'.`
        );
        alert(
          `Job number ${jobNumber} not found in the latest data from Google Sheets.`
        );
      }
    } catch (error) {
      console.error("Error fetching sheet data during QR scan:", error);
      updateStatusMessage(
        "qrScanStatus",
        `Error fetching sheet data. ${error.message || ""}`,
        "error",
        5000
      );
      // No alert here as fetchSheetData likely already alerted
    }
  }
}

function setupQrScanner() {
  const startQrScanButton = document.getElementById("startQrScanBtn");
  const closeQrScanButton = document.getElementById("closeQrScanBtn");
  const qrReaderElement = document.getElementById("qrReader");
  const jobNumberInput = document.getElementById("job");
  const qrScannerContainer = document.getElementById("qrScannerContainer");

  if (
    !startQrScanButton ||
    !qrReaderElement ||
    !jobNumberInput ||
    !closeQrScanButton ||
    !qrScannerContainer
  ) {
    console.error("QR Scanner UI elements not found in the DOM.");
    return;
  }

  let html5QrCode = null;

  startQrScanButton.addEventListener("click", () => {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qrReader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }

    qrScannerContainer.style.display = "block";
    qrReaderElement.style.display = "block";
    closeQrScanButton.style.display = "inline-flex";
    startQrScanButton.textContent = "Initializing...";
    startQrScanButton.disabled = true;

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      console.log(`QR Code detected: ${decodedText}`, decodedResult);
      stopScanner(); // Stop camera immediately after successful scan

      try {
        const parts = decodedText.split("-"); // Assuming job number is before the first hyphen
        const jobNum = parts.length > 0 ? parts[0].trim() : decodedText.trim();

        if (jobNum) {
          jobNumberInput.value = jobNum;
          const event = new Event("input", { bubbles: true, cancelable: true });
          jobNumberInput.dispatchEvent(event);

          if (typeof updateSheetOutputString === "function") {
            updateSheetOutputString();
          }
          if (typeof updatePalletPaperDisplay === "function") {
            updatePalletPaperDisplay();
          }

          jobNumberInput.classList.add("scan-successful");
          setTimeout(() => {
            jobNumberInput.classList.remove("scan-successful");
          }, 1500);

          // New logic: attempt to find job details
          handleScannedJobNumber(jobNum).catch((err) => {
            console.error("Error in handleScannedJobNumber:", err);
            alert(
              "An unexpected error occurred while processing QR code data."
            );
          });
        } else {
          console.warn(
            "Scanned QR code did not yield a job number:",
            decodedText
          );
          alert("Could not extract a job number from the QR code.");
        }
      } catch (error) {
        console.error("Error processing scanned QR code:", error);
        alert("Error processing scanned QR data.");
      }
    };

    const qrCodeErrorCallback = (errorMessage) => {
      // console.warn(`QR Scan Error: ${errorMessage}`); // Can be noisy
    };

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      )
      .then(() => {
        startQrScanButton.textContent = "Scanning...";
      })
      .catch((err) => {
        console.error(`Unable to start QR scanner: ${err}`);
        alert(
          `Error starting QR scanner: ${err}. Ensure camera permissions are granted and camera is not in use.`
        );
        stopScanner(); // Clean up UI if scanner fails to start
      });
  });

  closeQrScanButton.addEventListener("click", () => {
    stopScanner();
  });

  function stopScanner() {
    startQrScanButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-qr-code-scan" viewBox="0 0 16 16" style="margin-right: 8px;">
                <path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 0 .5M4 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 4 0m7 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 11 0m3 .5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M0 4a.5.5 0 0 1 .5-.5H1a.5.5 0 0 1 0 1H.5A.5.5 0 0 1 0 4m3 0a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1h-.5A.5.5 0 0 1 3 4m1 0h1v1H4zm1 1H4v1h1zm0 1H4v1h1zm1 0h1v1H5zm1 1H5v1h1zm0 1H5v1h1zm1 0h1v1H6zm1 1H6v1h1zm0 1H6v1h1zm1 0h1v1H7zm1 1H7v1h1zm0 1H7v1h1zm1-5h1v1H8zm1 1H8v1h1zm0 1H8v1h1zm1 0h1v1H9zm1 1H9v1h1zm0 1H9v1h1zm1 0h1v1h-1zm1 1h-1v1h1zm0 1h-1v1h1zm1-5h1v1h-1zm1 1h-1v1h1zm0 1h-1v1h1zm1 0h1v1h-1zm1 1h-1v1h1zm0 1h-1v1h1zM15 4a.5.5 0 0 1 .5-.5h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 1-.5-.5m-3 0a.5.5 0 0 1 .5-.5H13a.5.5 0 0 1 0 1h-.5a.5.5 0 0 1-.5-.5m1 11.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5m-3 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5M0 11.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 0 11.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5M7 4h1v1H7zm1 1H7v1h1zm-1 3h1v1H7zm1 1H7v1h1z"/>
                <path d="M2 2h2v2H2zM3 3V2H2v1zM2 3h1V2H2zM12 2h2v2h-2zM13 3V2h-1v1zM12 3h1V2h-1zM2 12h2v2H2zM3 13v-1H2v1zM2 13h1v-1H2zM12 12h2v2h-2zM13 13v-1h-1v1zM12 13h1v-1h-1z"/>
            </svg>
            Scan QR`;
    startQrScanButton.disabled = false;
    qrScannerContainer.style.display = "none";

    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          console.log("QR Code scanning stopped successfully.");
        })
        .catch((err) => {
          console.error("Error stopping QR Code scanner: ", err);
        });
    }
  }
}
export { setupQrScanner };
// Make sure these functions are available globally or imported where needed in main.js
// For now, assuming setupQrScanner is called from main.js
// If you're using modules strictly, you'd export setupQrScanner and import it in main.js.
// For this project structure, it seems setupQrScanner is expected to be globally available.

// For functions like updateAndSetFieldStatus and updateStatusMessage,
// they are expected to be globally available from uiHandler.js or similar.
// If using modules, they'd need to be imported.
// This example assumes they are global for now, matching the existing structure.
// Example import if uiHandler was a module:
// import { updateAndSetFieldStatus, updateStatusMessage } from './uiHandler.js';

// No direct export needed if main.js just calls setupQrScanner()
