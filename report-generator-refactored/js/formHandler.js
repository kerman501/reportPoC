function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);

  const paramsToSet = {
    spreadsheetId: urlParams.get("spreadsheetId"),
    sheetName: urlParams.get("sheetName"),
    row: urlParams.get("row"),
    leadId: urlParams.get("leadId"),
    customerName: urlParams.get("customerName"),
    volume: urlParams.get("volume"),
  };

  if (paramsToSet.spreadsheetId)
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
  const sheetName = document.getElementById("sheetNameInput").value;
  const startRow = document.getElementById("startRowInput").value;

  if (!startRow || parseInt(startRow) < 1) {
    // alert("Please enter a valid Start Row number (e.g., 6).");
    // return; // Allow empty/invalid for now, formula will be incomplete
  }
  const leadIdCellRef = `B${startRow}`;
  const customerNameCellRef = `C${startRow}`;
  const volumeCellRef = `E${startRow}`;
  const selfRowCellRef = `A${startRow}`; // Assuming formula is in column A

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

function copySheetString() {
  const sheetOutputEl = document.getElementById("sheetOutputString");
  const textToCopy = sheetOutputEl ? sheetOutputEl.value : "";

  if (!textToCopy) {
    updateStatusMessage("sheetDataStatus", "Nothing to copy.", "error", 2000);
    return;
  }
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      updateStatusMessage(
        "sheetDataStatus",
        "Sheet string copied!",
        "success",
        2000
      );
    })
    .catch((err) => {
      console.error("Sheet string copy failed:", err);
      updateStatusMessage(
        "sheetDataStatus",
        "Copy failed. Try manual.",
        "error",
        3000
      );
    });
}

function copyPalletDataToClipboard() {
  const jobNumber = document.getElementById("job").value;
  const clientName = document.getElementById("clientName").value;
  const currentDate = getCurrentDateFormatted("/");
  const dataToCopy = `${jobNumber}\t${clientName}\t${currentDate}`;

  if (!jobNumber && !clientName) {
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
      updateStatusMessage(
        "palletDataStatus",
        "Pallet paper data copied!",
        "success",
        2000
      );
    })
    .catch((err) => {
      console.error("Pallet data copy failed:", err);
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
    const selectElement = document.getElementById(q.id);
    const commentTextarea = document.getElementById(
      `no_comment_textarea_${q.id}`
    );
    if (commentTextarea)
      commentTextarea.style.borderColor = "var(--input-border)"; // Reset border

    if (selectElement && selectElement.value === "NO") {
      const itemName = selectElement.dataset.itemName;
      const templatePrefix = `${itemName} (NO): `;
      const currentComment = commentTextarea
        ? commentTextarea.value.trim()
        : "";
      if (currentComment === "" || currentComment === templatePrefix.trim()) {
        allNoCommentsValid = false;
        missingCommentsMessages.push(
          `Comment for "${q.itemName}" (NO) is required.`
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
      setFieldStatus(element, "initial-default");
    }
  });

  // Reset dynamically created question fields
  allDynamicInputElementsForReset.forEach((element) => {
    if (element.tagName === "SELECT") {
      const questionConfig = questions.find((q) => q.id === element.id);
      if (questionConfig) {
        element.value =
          defaultValuesConfig[element.id] || questionConfig.options[0];
        if (element.value === "NO") {
          handleNoSelection({ target: element });
        } else {
          const commentContainer = document.getElementById(
            `no_comment_container_${element.id}`
          );
          if (commentContainer) commentContainer.style.display = "none";
        }
      } else {
        element.selectedIndex = 0;
      }
    } else {
      // Textareas for comments
      element.value = "";
    }
    setFieldStatus(element, "initial-default");
  });

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
    // Only if empty
    sheetNameInput.value = getCurrentDateFormatted("/");
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
      element.addEventListener(eventType, () =>
        setFieldStatus(element, "user-modified")
      );
    }
  });

  // Event listeners for sheet data inputs
  sheetDataInputIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", updateSheetOutputString);
      element.addEventListener("change", updateSheetOutputString);
      if (id === "sheetEmployeeName" || id === "sheetWarehouse") {
        element.addEventListener("change", saveSheetDataToLocalStorage);
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
        setFieldStatus(sheetAddressInput, "user-modified");
      } else {
        sheetAddressInput.value = "";
        sheetAddressInput.disabled = false;
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
    spreadsheetIdInput.addEventListener("input", saveSpreadsheetId);
  }
}
