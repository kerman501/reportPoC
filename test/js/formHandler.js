// js/formHandler.js
import {
  updateSheetCell,
  getCurrentDateSheetName,
} from "./googleSheetHandler.js"; // For filling the sheet
import {
  updateAndSetFieldStatus, // from uiHandler.js (assuming global or imported in uiHandler)
  setFieldStatus, // from uiHandler.js
  updateStatusMessage, // from uiHandler.js - will be used for sheetDataStatus
} from "./uiHandler.js"; // Assuming uiHandler will export these
import {
  questions,
  defaultValuesConfig,
  ALL_INPUT_IDS_FOR_RESET_STATIC,
  sheetDataInputIds,
} from "./config.js";
import {
  saveSpreadsheetId,
  loadSheetDataFromLocalStorage,
  loadSpreadsheetId,
} from "./localStorageHandler.js"; // Assuming these are still relevant and exported

// It seems updateStatusMessage is used from uiHandler.js, so ensure it's available.
// If uiHandler.js is a module, it should export updateStatusMessage and formHandler.js should import it.
// For now, assuming it might become globally available or handled within uiHandler's scope.

function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);

  const paramsToSet = {
    spreadsheetId: urlParams.get("spreadsheetId"), // [cite: 4]
    sheetName: urlParams.get("sheetName"), // [cite: 4]
    row: urlParams.get("row"), // [cite: 4]
    leadId: urlParams.get("leadId"), // [cite: 4]
    customerName: urlParams.get("customerName"), // [cite: 4]
    volume: urlParams.get("volume"), // [cite: 4]
  };

  if (paramsToSet.spreadsheetId)
    // [cite: 5]
    updateAndSetFieldStatus(
      "spreadsheetIdInput",
      paramsToSet.spreadsheetId,
      "pdf-informed"
    );
  if (paramsToSet.sheetName)
    updateAndSetFieldStatus(
      "sheetNameInput",
      paramsToSet.sheetName,
      "pdf-informed"
    );
  if (paramsToSet.row)
    updateAndSetFieldStatus("startRowInput", paramsToSet.row, "pdf-informed");
  if (paramsToSet.leadId)
    updateAndSetFieldStatus("job", paramsToSet.leadId, "pdf-informed");
  if (paramsToSet.customerName)
    updateAndSetFieldStatus(
      "clientName",
      paramsToSet.customerName,
      "pdf-informed"
    );
  if (paramsToSet.volume)
    updateAndSetFieldStatus("cuFt", paramsToSet.volume, "pdf-informed");
}

function generateSheetFormula() {
  const baseUrl = window.location.href.split("?")[0];
  const spreadsheetId = document.getElementById("spreadsheetIdInput").value;
  let sheetName = document.getElementById("sheetNameInput").value;
  const startRow = document.getElementById("startRowInput").value;

  if (!sheetName) {
    // Default to current date if sheet name is empty
    sheetName = getCurrentDateSheetName(); // MMDDYYYY format
    // Optionally update the input field as well
    // const sheetNameInputEl = document.getElementById("sheetNameInput");
    // if (sheetNameInputEl) sheetNameInputEl.value = sheetName;
  }

  if (!startRow || parseInt(startRow) < 1) {
    // alert("Please enter a valid Start Row number (e.g., 6).");
    // return; // Allow empty/invalid for now, formula will be incomplete
  }
  const leadIdCellRef = `B${startRow || "ROW_PLACEHOLDER"}`; // Use placeholder if startRow is empty
  const customerNameCellRef = `C${startRow || "ROW_PLACEHOLDER"}`;
  const volumeCellRef = `E${startRow || "ROW_PLACEHOLDER"}`;
  const selfRowCellRef = `A${startRow || "ROW_PLACEHOLDER"}`;

  const googleSheetsFormula = `=HYPERLINK("${baseUrl}?spreadsheetId="&ENCODEURL("${spreadsheetId}")&"&sheetName="&ENCODEURL("${sheetName}")&"&row="&ROW(${selfRowCellRef})&"&leadId="&ENCODEURL(${leadIdCellRef})&"&customerName="&ENCODEURL(${customerNameCellRef})&"&volume="&ENCODEURL(${volumeCellRef}), "Open ("&${leadIdCellRef}&")")`;

  document.getElementById("generatedHyperlinkOutput").value =
    googleSheetsFormula;
}

function updateSheetOutputString() {
  const warehouse = document.getElementById("sheetWarehouse")?.value || "";
  const address = document.getElementById("sheetAddress")?.value.trim() || "";
  const palletsVal = document.getElementById("sheetPallets")?.value || "";
  const pallets =
    palletsVal && parseInt(palletsVal) > 0 ? `${palletsVal}pal` : "";
  const itemsVal = document.getElementById("sheetItems")?.value || "";
  const items = itemsVal ? `${itemsVal}itm` : "";
  const employeeName =
    document.getElementById("sheetEmployeeName")?.value.trim() || "";

  let bingoStatus;
  const bingoStatusOkEl = document.getElementById("sheetBingoStatusOK");
  const bingoDetailsEl = document.getElementById("sheetBingoDetails");
  if (bingoStatusOkEl && bingoStatusOkEl.checked) {
    bingoStatus = "Bingo";
  } else {
    bingoStatus = bingoDetailsEl
      ? bingoDetailsEl.value.trim()
      : "issue_not_specified";
    if (bingoStatus === "") bingoStatus = "issue_not_specified";
  }

  const matTV = document.getElementById("sheetMatTV")?.value || "";
  const matWR = document.getElementById("sheetMatWR")?.value || "";
  const matBL = document.getElementById("sheetMatBL")?.value || "";
  let materialsArray = [];
  if (matTV && parseInt(matTV) > 0) materialsArray.push(`${matTV}tv`);
  if (matWR && parseInt(matWR) > 0) materialsArray.push(`${matWR}wr`);
  if (matBL && parseInt(matBL) > 0) materialsArray.push(`${matBL}bl`);
  const materialsString = materialsArray.join(",");

  const outputArray = [
    warehouse,
    address,
    pallets,
    items,
    employeeName,
    bingoStatus,
    materialsString,
  ];
  const sheetOutputEl = document.getElementById("sheetOutputString");
  if (sheetOutputEl)
    sheetOutputEl.value = outputArray
      .filter((s) => s && s.trim() !== "")
      .join(" | ");
}

async function handleFillSheetAndCopy() {
  const sheetOutputEl = document.getElementById("sheetOutputString");
  const textToCopy = sheetOutputEl ? sheetOutputEl.value : "";
  const sheetDataStatusEl = document.getElementById("sheetDataStatus"); // For displaying messages

  // Always try to copy to clipboard first
  if (!textToCopy) {
    if (sheetDataStatusEl)
      updateStatusMessage("sheetDataStatus", "Nothing to copy.", "error", 2000);
  } else {
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (sheetDataStatusEl)
        updateStatusMessage(
          "sheetDataStatus",
          "Sheet string copied to clipboard!",
          "success",
          2000
        );
    } catch (err) {
      console.error("Sheet string copy failed:", err);
      if (sheetDataStatusEl)
        updateStatusMessage(
          "sheetDataStatus",
          "Copy to clipboard failed. Try manual.",
          "error",
          3000
        );
    }
  }

  // Now, proceed with filling the sheet
  const clientName = document.getElementById("clientName")?.value.trim();
  const jobNumber = document.getElementById("job")?.value.trim();
  const spreadsheetId = document
    .getElementById("spreadsheetIdInput")
    ?.value.trim();
  let sheetName = document.getElementById("sheetNameInput")?.value.trim();

  if (!spreadsheetId) {
    alert("Spreadsheet ID is not configured. Cannot fill sheet.");
    return;
  }
  if (!clientName || !jobNumber) {
    alert("Client Name and Job Number are required to fill the sheet.");
    return;
  }
  if (!textToCopy) {
    alert("Formatted string is empty. Nothing to fill in the sheet.");
    return;
  }

  if (!sheetName) {
    sheetName = getCurrentDateSheetName(); // MMDDYYYY format
    console.log(`Sheet name was empty, using default: ${sheetName}`);
    // Optionally update the input field:
    // const sheetNameInputEl = document.getElementById("sheetNameInput");
    // if (sheetNameInputEl) sheetNameInputEl.value = sheetName;
  }

  const confirmationMessage = `You are about to update the Google Sheet for:\nClient: ${clientName}\nJob Number: ${jobNumber}\nSheet Name: ${sheetName}\n\nWith data: "${textToCopy}"\n\nAre you sure you want to proceed?`;

  if (!confirm(confirmationMessage)) {
    if (sheetDataStatusEl)
      updateStatusMessage(
        "sheetDataStatus",
        "Sheet update cancelled by user.",
        "info",
        3000
      );
    return;
  }

  if (sheetDataStatusEl)
    updateStatusMessage(
      "sheetDataStatus",
      `Attempting to update sheet for Job: ${jobNumber}...`,
      "info"
    );
  document.getElementById("pdfGenerateLoader").style.display = "block"; // Show a general loader

  try {
    const result = await updateSheetCell(
      spreadsheetId,
      sheetName,
      jobNumber,
      clientName,
      textToCopy
    );
    if (result.success) {
      if (sheetDataStatusEl)
        updateStatusMessage(
          "sheetDataStatus",
          `Sheet successfully updated! Range: ${result.updatedRange || ""}`,
          "success",
          5000
        );
    } else {
      if (sheetDataStatusEl)
        updateStatusMessage(
          "sheetDataStatus",
          `Failed to update sheet: ${result.message}`,
          "error",
          7000
        );
      alert(`Failed to update sheet: ${result.message}`); // Also show an alert for critical failures
    }
  } catch (error) {
    console.error("Error during updateSheetCell call:", error);
    if (sheetDataStatusEl)
      updateStatusMessage(
        "sheetDataStatus",
        `Error updating sheet: ${error.message || "Unknown error"}`,
        "error",
        7000
      );
    alert(
      `An error occurred while trying to update the sheet: ${
        error.message || "Please check console."
      }`
    );
  } finally {
    document.getElementById("pdfGenerateLoader").style.display = "none";
  }
}

function copyPalletDataToClipboard() {
  const jobNumber = document.getElementById("job").value;
  const clientName = document.getElementById("clientName").value;
  // getCurrentDateFormatted is expected to be in uiHandler.js or globally available
  const currentDate =
    typeof getCurrentDateFormatted === "function"
      ? getCurrentDateFormatted("/")
      : new Date().toLocaleDateString(); // Fallback
  const dataToCopy = `${jobNumber}\t${clientName}\t${currentDate}`;
  const palletDataStatusEl = document.getElementById("palletDataStatus");

  if (!jobNumber && !clientName) {
    if (palletDataStatusEl)
      updateStatusMessage(
        "palletDataStatus",
        "No data in Job# or Client Name to copy.",
        "error",
        3000
      );
    return;
  }

  navigator.clipboard
    .writeText(dataToCopy)
    .then(() => {
      if (palletDataStatusEl)
        updateStatusMessage(
          "palletDataStatus",
          "Pallet paper data copied!",
          "success",
          2000
        );
    })
    .catch((err) => {
      console.error("Pallet data copy failed:", err);
      if (palletDataStatusEl)
        updateStatusMessage(
          "palletDataStatus",
          "Copy failed. Try manual.",
          "error",
          3000
        );
    });
}

function validateNoOptionComments() {
  let allNoCommentsValid = true;
  let missingCommentsMessages = [];
  questions.forEach((q) => {
    // [cite: 3]
    const selectElement = document.getElementById(q.id);
    const commentTextarea = document.getElementById(
      `no_comment_textarea_${q.id}`
    );
    if (commentTextarea)
      commentTextarea.style.borderColor = "var(--input-border)"; // Reset border

    if (selectElement && selectElement.value === "NO") {
      const itemName = selectElement.dataset.itemName || q.itemName; // [cite: 3]
      const templatePrefix = `${itemName} (NO): `;
      const currentComment = commentTextarea
        ? commentTextarea.value.trim()
        : "";
      if (currentComment === "" || currentComment === templatePrefix.trim()) {
        allNoCommentsValid = false;
        missingCommentsMessages.push(
          `Comment for "${q.itemName}" (NO) is required.` // [cite: 3]
        );
        if (commentTextarea)
          commentTextarea.style.borderColor = "var(--danger-red)";
      }
    }
  });
  return { isValid: allNoCommentsValid, messages: missingCommentsMessages };
}

function resetFormFields() {
  // Reset static fields
  ALL_INPUT_IDS_FOR_RESET_STATIC.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      if (element.tagName === "SELECT") {
        element.selectedIndex = 0; // Or set to a specific default if needed
      } else if (element.type === "checkbox") {
        if (id === "sheetBingoStatusOK")
          element.checked = true; // Specific default
        else element.checked = false;
      } else if (element.type === "file") {
        element.value = null;
      } else if (id === "rating") {
        element.value = "4.0"; // Specific default
      } else {
        element.value = "";
      }
      if (typeof setFieldStatus === "function")
        setFieldStatus(element, "initial-default");
    }
  });

  // Reset dynamically created question fields from uiHandler's allDynamicInputElementsForReset
  // This assumes allDynamicInputElementsForReset is managed by uiHandler and potentially exposed or reset via a uiHandler function
  // For now, if createQuestionFields (from uiHandler) re-populates this array, calling it might be part of reset.
  // Or uiHandler needs to expose a reset function for its dynamic elements.
  // This part might need coordination with uiHandler.js structure.
  if (typeof window.resetDynamicQuestionFields === "function") {
    // Assuming uiHandler will expose such a function
    window.resetDynamicQuestionFields();
  }

  const bingoDetailsContainerEl = document.getElementById(
    "sheetBingoDetailsContainer"
  );
  if (bingoDetailsContainerEl) bingoDetailsContainerEl.style.display = "none";

  const sheetAddressInput = document.getElementById("sheetAddress");
  if (sheetAddressInput) sheetAddressInput.disabled = false;

  populateInitialFormValues(); // Repopulate things like date
  loadSheetDataFromLocalStorage(); // Names, warehouse
  loadSpreadsheetId(); // Spreadsheet ID
  updateSheetOutputString();
  generateSheetFormula();
}

function populateInitialFormValues() {
  const sheetNameInput = document.getElementById("sheetNameInput");
  if (sheetNameInput && !sheetNameInput.value) {
    // Only if empty. Uses MMDDYYYY format from googleSheetHandler
    sheetNameInput.value = getCurrentDateSheetName();
  }
  const startRowInput = document.getElementById("startRowInput");
  if (startRowInput && startRowInput.value === "") {
    // Only if empty or reset
    startRowInput.value = "6";
  }
}

function setupFormEventListeners() {
  // Event listeners for static inputs
  const staticInputs = [
    "clientName",
    "job",
    "cuFt",
    "generalComments",
    "rating",
  ];
  staticInputs.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      const eventType =
        element.tagName === "SELECT" || element.type === "number"
          ? "change"
          : "input";
      element.addEventListener(eventType, () => {
        if (typeof setFieldStatus === "function")
          setFieldStatus(element, "user-modified");
      });
    }
  });

  // Event listeners for sheet data inputs
  sheetDataInputIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", updateSheetOutputString);
      element.addEventListener("change", updateSheetOutputString);
      if (id === "sheetEmployeeName" || id === "sheetWarehouse") {
        element.addEventListener("change", () => {
          // saveSheetDataToLocalStorage is already defined and exported from localStorageHandler
          // but this file is also named localStorageHandler.js in the prompt.
          // Assuming saveSheetDataToLocalStorage is the correct function.
          if (typeof saveSheetDataToLocalStorage === "function")
            saveSheetDataToLocalStorage();
        });
      }
    }
  });

  const useLoadingDockCheckbox = document.getElementById("useLoadingDock");
  const sheetAddressInput = document.getElementById("sheetAddress");
  if (useLoadingDockCheckbox && sheetAddressInput) {
    useLoadingDockCheckbox.addEventListener("change", function () {
      if (this.checked) {
        sheetAddressInput.value = "loading dock";
        sheetAddressInput.disabled = true;
        if (typeof setFieldStatus === "function")
          setFieldStatus(sheetAddressInput, "user-modified");
      } else {
        sheetAddressInput.value = "";
        sheetAddressInput.disabled = false;
        if (typeof setFieldStatus === "function")
          setFieldStatus(sheetAddressInput, "initial-default");
      }
      updateSheetOutputString();
    });
  }

  const bingoCheckbox = document.getElementById("sheetBingoStatusOK");
  if (bingoCheckbox) {
    bingoCheckbox.addEventListener("change", function () {
      const detailsContainer = document.getElementById(
        "sheetBingoDetailsContainer"
      );
      const detailsInput = document.getElementById("sheetBingoDetails");
      if (detailsContainer)
        detailsContainer.style.display = this.checked ? "none" : "block";
      if (this.checked && detailsInput) {
        detailsInput.value = "";
      }
      updateSheetOutputString();
    });
    // Initial state check for bingo details container
    const detailsContainer = document.getElementById(
      "sheetBingoDetailsContainer"
    );
    if (detailsContainer)
      detailsContainer.style.display = !bingoCheckbox.checked
        ? "block"
        : "none";
  }

  const spreadsheetIdInput = document.getElementById("spreadsheetIdInput");
  if (spreadsheetIdInput) {
    spreadsheetIdInput.addEventListener("input", saveSpreadsheetId); // saveSpreadsheetId from localStorageHandler
  }
}

// Export functions that will be called from main.js or other modules
export {
  processUrlParameters,
  generateSheetFormula,
  updateSheetOutputString,
  handleFillSheetAndCopy, // Renamed from copySheetString
  copyPalletDataToClipboard,
  validateNoOptionComments,
  resetFormFields,
  populateInitialFormValues,
  setupFormEventListeners,
};
