let stateSaveTimeout;

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

  const loadedState = loadFormState() || { fields: {} };

  // Set fields only if they are not already set by localStorage
  if (!loadedState.fields.spreadsheetId && paramsToSet.spreadsheetId)
    updateAndSetFieldStatus(
      "spreadsheetIdInput",
      paramsToSet.spreadsheetId,
      "pdf-informed"
    );
  if (!loadedState.fields.sheetName && paramsToSet.sheetName)
    updateAndSetFieldStatus(
      "sheetNameInput",
      paramsToSet.sheetName,
      "pdf-informed"
    );
  if (!loadedState.fields.startRowInput && paramsToSet.row)
    updateAndSetFieldStatus("startRowInput", paramsToSet.row, "pdf-informed");
  if (!loadedState.fields.job && paramsToSet.leadId)
    updateAndSetFieldStatus("job", paramsToSet.leadId, "pdf-informed");
  if (!loadedState.fields.clientName && paramsToSet.customerName)
    updateAndSetFieldStatus(
      "clientName",
      paramsToSet.customerName,
      "pdf-informed"
    );
  if (!loadedState.fields.cuFt && paramsToSet.volume)
    updateAndSetFieldStatus("cuFt", paramsToSet.volume, "pdf-informed");

  // After processing URL params, save the state so they persist on reload.
  triggerStateSave();
}

function generateSheetFormula() {
  const baseUrl = window.location.href.split("?")[0];
  const spreadsheetId = document.getElementById("spreadsheetIdInput").value;
  const sheetName = document.getElementById("sheetNameInput").value;
  const startRow = document.getElementById("startRowInput").value;

  if (!startRow || parseInt(startRow) < 1) {
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
  const useLoadingDock = document.getElementById("useLoadingDock")?.checked;
  const address = document.getElementById("sheetAddress")?.value.trim() || "";
  const palletsVal = document.getElementById("sheetPallets")?.value || "";
  const pallets =
    palletsVal && parseInt(palletsVal) > 0 ? `${palletsVal}pal` : "";
  const itemsVal = document.getElementById("sheetItems")?.value || "";
  const items = itemsVal ? `${itemsVal}itm` : "";
  const employeeName =
    document.getElementById("sheetEmployeeName")?.value.trim() || "";

  // New logic for Masp2/3
  let finalWarehouse = warehouse;
  if (useLoadingDock && (warehouse === "Masp2" || warehouse === "Masp3")) {
    finalWarehouse = "Masp2/3";
  }

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
    finalWarehouse, // Use the new variable here
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

  triggerStateSave();
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
      const currentComment = commentTextarea
        ? commentTextarea.value.trim()
        : "";
      if (currentComment === "" || currentComment.endsWith("(NO):")) {
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
  // Reset all fields except those excluded
  ALL_FIELDS_TO_PERSIST.forEach((id) => {
    if (FIELDS_TO_EXCLUDE_FROM_CLEAR.includes(id)) {
      return; // Skip this field
    }

    const element = document.getElementById(id);
    if (element) {
      if (element.tagName === "SELECT") {
        const questionConfig = questions.find((q) => q.id === element.id);
        if (questionConfig) {
          // It's a dynamic question select
          element.value =
            defaultValuesConfig[element.id] || questionConfig.options[0];
          element.dispatchEvent(new Event("change"));
        } else {
          // It's a static select like warehouse
          element.selectedIndex = 0;
        }
      } else if (element.type === "checkbox") {
        element.checked = id === "sheetBingoStatusOK"; // Specific default
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

  const bingoDetailsContainerEl = document.getElementById(
    "sheetBingoDetailsContainer"
  );
  if (bingoDetailsContainerEl) bingoDetailsContainerEl.style.display = "none";

  const sheetAddressInput = document.getElementById("sheetAddress");
  if (sheetAddressInput) sheetAddressInput.disabled = false;

  // After resetting, repopulate specific fields and save the new (cleared) state
  populateInitialFormValues();
  triggerStateSave();
  updateSheetOutputString();
  generateSheetFormula();
}

function populateInitialFormValues() {
  const sheetNameInput = document.getElementById("sheetNameInput");
  if (sheetNameInput && !sheetNameInput.value) {
    sheetNameInput.value = getCurrentDateFormatted("/");
  }
  const startRowInput = document.getElementById("startRowInput");
  if (startRowInput && startRowInput.value === "") {
    startRowInput.value = "6";
  }
}

function collectAndSaveFullFormState() {
  const state = {
    fields: {},
    photoComments: {},
  };

  // 1. Collect all form field values
  ALL_FIELDS_TO_PERSIST.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      if (element.type === "checkbox") {
        state.fields[id] = element.checked;
      } else {
        state.fields[id] = element.value;
      }
    }
  });

  // 2. Collect all photo comments by filename
  state.photoComments = getPhotoCommentsByFilename();

  // 3. Save the entire state object
  saveFormState(state);
}

function triggerStateSave() {
  clearTimeout(stateSaveTimeout);
  stateSaveTimeout = setTimeout(collectAndSaveFullFormState, 200); // Debounce save
}

function setupFormEventListeners() {
  ALL_FIELDS_TO_PERSIST.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      const eventType =
        element.tagName === "SELECT" ||
        element.type === "checkbox" ||
        element.type === "radio"
          ? "change"
          : "input";

      // *** ИСПРАВЛЕННАЯ ЛОГИКА ***
      // Мы убрали некорректное условие if (element.dataset.status !== "pdf-informed")
      // Теперь любое изменение пользователем будет корректно перекрашивать поле в синий.
      element.addEventListener(eventType, () => {
        setFieldStatus(element, "user-modified"); // Всегда устанавливаем синий статус при вводе
        triggerStateSave(); // Сохраняем состояние
      });
    }
  });

  // Остальные слушатели остаются без изменений
  sheetDataInputIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", updateSheetOutputString);
      element.addEventListener("change", updateSheetOutputString);
    }
  });

  const warehouseEl = document.getElementById("sheetWarehouse");
  if (warehouseEl) {
    warehouseEl.addEventListener("change", updateWarehouseHighlight);
  }

  const useLoadingDockCheckbox = document.getElementById("useLoadingDock");
  const sheetAddressInput = document.getElementById("sheetAddress");
  if (useLoadingDockCheckbox && sheetAddressInput) {
    useLoadingDockCheckbox.addEventListener("change", function () {
      if (this.checked) {
        sheetAddressInput.value = "loading dock";
        sheetAddressInput.disabled = true;
      } else {
        if (sheetAddressInput.value === "loading dock") {
          sheetAddressInput.value = "";
        }
        sheetAddressInput.disabled = false;
      }
      updateSheetOutputString();
      triggerStateSave();
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
      triggerStateSave();
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
}
