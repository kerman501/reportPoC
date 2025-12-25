document.addEventListener("DOMContentLoaded", () => {
  const translations = {
    en: {
      appTitle: "Bin Tracker",
      cleanStock: "Clean Bins",
      dirtyStock: "Dirty Bins",
      addEntry: "🚚 Add Truck Entry",
      washBins: "💧 Wash Bins",
      adjustStock: "⚙️ Adjust Stock",
      generateReport: "Generate",
      todaysTransactions: "Today's Transactions",
      newEntryTitle: "New Truck Entry",
      truckNumber: "Truck Number",
      inboundDirty: "📥 Dirty In",
      outboundClean: "📤 Clean Out",
      jobNumber: "Job Number",
      washBinsTitle: "Wash Bins",
      quantityWashed: "Quantity Washed",
      employeeName: "Employee Name",
      comment: "Comment",
      adjustStockTitle: "Adjust Stock",
      newCleanStock: "New Clean Bins Total",
      newDirtyStock: "New Dirty Bins Total",
      reasonForAdjustment: "Reason for Adjustment",
      cancel: "Cancel",
      save: "Save",
      close: "Close",
      reportTitle: "Daily Report",
      copyData: "Copy Report",
      copied: "Copied!",
      initialSetup: "Initial Setup",
      initialSetupText:
        "Please enter the current number of bins in stock to get started.",
      initialClean: "Initial Clean Bins",
      initialDirty: "Initial Dirty Bins",
      saveInitialStock: "Save Initial Stock",
      truck: "Truck",
      received: "Received",
      shipped: "Shipped",
      washed: "Washed",
      adjustment: "Adjustment",
      clean: "Clean",
      dirty: "Dirty",
      reportForDate: "Report for date:",
      backupTitle: "Backup & Restore",
      backupBtn: "Download Backup",
      restoreBtn: "Restore from File",
      fieldRequired: "This field is required.",
      noDataForDate: "No data found for the selected date.",
      activityByUser: "Activity by Employee",
      summaryTitle: "Summary",
      binMovement: "Bin Movement",
      totalReceived: "Total Received",
      totalShipped: "Total Shipped",
      washingSummary: "Washing Summary",
      pinLogin: "PIN Login",
      adminPanel: "Administration",
      userManagement: "User Management",
      userName: "User Name",
      addUser: "Add User",
      logout: "Logout",
      currentUserGreeting: "User:",
      clearPin: "C",
      login: "✔️",
      foremanName: "Foreman Name",
      foreman: "Foreman",
      selectUser: "Select User",
    },
    sr: {
      appTitle: "Praćenje Kanti",
      cleanStock: "Čiste Kante",
      dirtyStock: "Prljave Kante",
      addEntry: "🚚 Dodaj Unos Kamiona",
      washBins: "💧 Operi Kante",
      adjustStock: "⚙️ Podesi Stanje",
      generateReport: "Generiši",
      todaysTransactions: "Današnje Transakcije",
      newEntryTitle: "Novi Unos Kamiona",
      truckNumber: "Broj Kamiona",
      inboundDirty: "📥 Prijem Prljavih",
      outboundClean: "📤 Otprema Čistih",
      jobNumber: "Broj Posla",
      washBinsTitle: "Pranje Kanti",
      quantityWashed: "Oprana Količina",
      employeeName: "Ime Zaposlenog",
      comment: "Komentar",
      adjustStockTitle: "Podešavanje Stanja",
      newCleanStock: "Novo Ukupno Čistih",
      newDirtyStock: "Novo Ukupno Prljavih",
      reasonForAdjustment: "Razlog Podešavanja",
      cancel: "Otkaži",
      save: "Sačuvaj",
      close: "Zatvori",
      reportTitle: "Dnevni Izveštaj",
      copyData: "Kopiraj Izveštaj",
      copied: "Kopirano!",
      initialSetup: "Početno Podešavanje",
      initialSetupText: "Molimo unesite trenutni broj kanti na zalihama.",
      initialClean: "Početni broj čistih kanti",
      initialDirty: "Početni broj prljavih kanti",
      saveInitialStock: "Sačuvaj Početno Stanje",
      truck: "Kamion",
      received: "Primljeno",
      shipped: "Poslato",
      washed: "Oprano",
      adjustment: "Podešavanje",
      clean: "Čiste",
      dirty: "Prljave",
      reportForDate: "Izveštaj za datum:",
      backupTitle: "Bekap i Oporavak",
      backupBtn: "Preuzmi Bekap",
      restoreBtn: "Oporavi iz Fajla",
      fieldRequired: "Ovo polje je obavezno.",
      noDataForDate: "Nema podataka za izabrani datum.",
      activityByUser: "Aktivnost po Zaposlenom",
      summaryTitle: "Rezime",
      binMovement: "Kretanje Kanti",
      totalReceived: "Ukupno Primljeno",
      totalShipped: "Ukupno Poslato",
      washingSummary: "Rezime Pranja",
      pinLogin: "PIN Prijava",
      adminPanel: "Administracija",
      userManagement: "Upravljanje Korisnicima",
      userName: "Ime Korisnika",
      addUser: "Dodaj Korisnika",
      logout: "Odjavi se",
      currentUserGreeting: "Korisnik:",
      clearPin: "C",
      login: "✔️",
      foremanName: "Ime Predradnika",
      foreman: "Predradnik",
      selectUser: "Izaberite Korisnika",
    },
  };

  // --- STATE MANAGEMENT ---
  let state = {
    stock: { clean: 0, dirty: 0 },
    transactions: [],
    users: [],
    foremen: [],
    language: "en",
    location: "Main",
  };

  const ui = {
    appContainer: document.querySelector(".app-container"),
    loginModal: document.getElementById("login-modal"),
    adminModal: document.getElementById("admin-modal"),
    userGrid: document.getElementById("user-login-grid"),
    transactionsContainer: document.getElementById("transactions-container"),
    reportDateInput: document.getElementById("report-date"),
    userInfo: document.getElementById("user-info"),
    currentUserName: document.getElementById("current-user-name"),
    userList: document.getElementById("user-list"),
    qrModal: document.getElementById("qr-modal"),
    syncStatus: document.getElementById("sync-status"),
    locationSelect: document.getElementById("location-select"),
  };

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyIc_oTbjP4WKaATEDpL4Ux11XM5USBLAjP8Sqo1p3BBkNSwonOjj_nwlkRcT8o2BGL/exec";

  let syncTimeout;
  let html5QrCode;
  let jobCounter = 0; // Для уникальных ID полей ввода в мульти-джобах

  // --- CORE FUNCTIONS ---
  const saveState = () => {
    localStorage.setItem("binTrackerState", JSON.stringify(state));
    updateSyncUI("syncing");
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(sendDataToGoogle, 3000);
  };

  const loadState = () => {
    const savedState = localStorage.getItem("binTrackerState");
    if (savedState) {
      state = JSON.parse(savedState);
      if (!state.users) state.users = [];
      if (!state.foremen) state.foremen = [];
      if (!state.stock) state.stock = { clean: 0, dirty: 0 };
      if (!state.location) state.location = "Main";
    }
    if (state.users.length === 0) {
      state.users.push({ id: Date.now(), name: "Admin", pin: "0000" });
      saveState();
    }
    if (ui.locationSelect) ui.locationSelect.value = state.location;
  };

  function updateSyncUI(status) {
    if (!ui.syncStatus) return;
    ui.syncStatus.className = "sync-indicator";
    if (status === "syncing") {
      ui.syncStatus.textContent = "🔄";
      ui.syncStatus.classList.add("syncing");
    } else if (status === "success") {
      ui.syncStatus.textContent = "✅";
      ui.syncStatus.classList.add("success");
      setTimeout(() => {
        ui.syncStatus.className = "sync-indicator";
        ui.syncStatus.textContent = "☁️";
      }, 3000);
    } else if (status === "error") {
      ui.syncStatus.textContent = "⚠️";
      ui.syncStatus.classList.add("error");
    } else {
      ui.syncStatus.textContent = "☁️";
    }
  }

  function sendDataToGoogle() {
    console.log("Sending data to Google...");
    const todayStr = new Date().toLocaleDateString("en-CA");
    const todaysTransactions = state.transactions.filter((t) => {
      const txDate = new Date(t.timestamp).toLocaleDateString("en-CA");
      return txDate === todayStr;
    });

    const payload = {
      authKey: "BinMaster2025",
      location: state.location,
      stock: state.stock,
      transactions: todaysTransactions,
    };

    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(() => {
        console.log("Sent successfully (no-cors)");
        updateSyncUI("success");
      })
      .catch((err) => {
        console.error("Error sending to Google:", err);
        updateSyncUI("error");
      });
  }

  const updateStockDisplay = () => {
    document.getElementById("clean-stock-count").textContent =
      state.stock.clean;
    document.getElementById("dirty-stock-count").textContent =
      state.stock.dirty;
  };

  const T = (key) => translations[state.language][key] || key;

  // --- AUTHENTICATION & SESSION ---
  function handleLogout() {
    sessionStorage.removeItem("currentUser");
    ui.appContainer.classList.add("hidden");
    openModal(ui.loginModal);
    if (ui.userInfo) ui.userInfo.classList.add("hidden");
  }

  function performLogin(user) {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    ui.loginModal.style.display = "none";
    ui.appContainer.classList.remove("hidden");
    ui.userInfo.classList.remove("hidden");
    ui.currentUserName.textContent = user.name;
    document.getElementById("current-user-greeting").textContent = T(
      "currentUserGreeting"
    );
    ui.reportDateInput.valueAsDate = new Date();
    updateStockDisplay();
    renderTransactions();
  }

  function getCurrentUser() {
    const userJson = sessionStorage.getItem("currentUser");
    if (!userJson) return null;
    return JSON.parse(userJson);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sessionStorage.removeItem("currentUser");
      ui.appContainer.classList.add("hidden");
      openModal(ui.loginModal);
    }
  });

  function renderLoginButtons() {
    ui.userGrid.innerHTML = "";
    state.users.forEach((user) => {
      const btn = document.createElement("button");
      btn.className = "user-login-btn";
      btn.textContent = user.name;
      btn.addEventListener("click", () => {
        performLogin(user);
      });
      ui.userGrid.appendChild(btn);
    });
  }

  function renderTransactions() {
    ui.transactionsContainer.innerHTML = "";
    const today = new Date().toLocaleDateString();
    state.transactions
      .filter((t) => new Date(t.timestamp).toLocaleDateString() === today)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach((t) => {
        const div = document.createElement("div");
        div.className = "transaction-item";
        const time = new Date(t.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        let content = "";
        const truckIcon = "🚚";
        const washIcon = "💧";
        const adjIcon = "⚙️";

        switch (t.type) {
          case "truck":
            content = `<div class="icon">${truckIcon}</div><div class="details"><b>${T(
              "truck"
            )} ${t.truckNumber}</b> (Job: ${t.jobNumber || "N/A"}) by <b>${
              t.user
            }</b><br>
                    ${
                      t.foreman
                        ? `<span>Foreman: <b>${t.foreman}</b></span><br>`
                        : ""
                    }
                    ${
                      t.dirtyIn > 0
                        ? `<span style="color:var(--danger-color)">+${
                            t.dirtyIn
                          } ${T("received")}</span>`
                        : ""
                    }
                    ${t.dirtyIn > 0 && t.cleanOut > 0 ? " / " : ""}
                    ${
                      t.cleanOut > 0
                        ? `<span style="color:var(--success-color)">-${
                            t.cleanOut
                          } ${T("shipped")}</span>`
                        : ""
                    }
                    <div class="time">${time}</div></div>`;
            break;
          case "wash":
            content = `<div class="icon">${washIcon}</div><div class="details"><b>+${
              t.quantity
            } ${T("washed")}</b> by <b>${t.user}</b><br>
                    ${
                      t.comment
                        ? `<span class="transaction-comment">${t.comment}</span><br>`
                        : ""
                    }
                    <div class="time">${time}</div></div>`;
            break;
          case "adjust":
            const cleanChange = `${T("clean")}: ${t.oldClean} → <b>${
              t.newClean
            }</b>`;
            const dirtyChange = `${T("dirty")}: ${t.oldDirty} → <b>${
              t.newDirty
            }</b>`;
            content = `<div class="icon">${adjIcon}</div><div class="details"><b>${T(
              "adjustment"
            )}</b> by <b>${t.user}</b> (${cleanChange} / ${dirtyChange})<br>
                    <span class="transaction-comment">${t.reason}</span><br>
                    <div class="time">${time}</div></div>`;
            break;
        }

        content += `<div class="transaction-actions"><button class="edit-btn" data-id="${t.id}">✏️</button><button class="delete-btn" data-id="${t.id}">🗑️</button></div>`;
        div.innerHTML = content;
        ui.transactionsContainer.appendChild(div);
      });
  }

  function setLanguage(lang) {
    state.language = lang;
    document.querySelectorAll("[data-key]").forEach((elem) => {
      const key = elem.dataset.key;
      if (translations[lang][key]) elem.textContent = translations[lang][key];
    });
    Object.values(document.querySelectorAll(".lang-switcher button")).forEach(
      (btn) => btn.classList.remove("active")
    );
    document.getElementById(`lang-${lang}`).classList.add("active");

    const currentUser = sessionStorage.getItem("currentUser");
    if (currentUser) {
      document.getElementById("current-user-greeting").textContent = T(
        "currentUserGreeting"
      );
      document.getElementById("logout-btn").textContent = T("logout");
    }
    renderTransactions();
    saveState();
  }

  const openModal = (modal) => (modal.style.display = "flex");
  const closeModal = (modal) => {
    modal.style.display = "none";
    const form = modal.querySelector(".modal-content");
    if (form) clearValidation(form);
    if (modal.id === "qr-modal" && html5QrCode && html5QrCode.isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          console.log("Camera stopped");
        })
        .catch((err) => console.error(err));
    }
  };

  // --- DYNAMIC FORM HANDLERS (MULTI-JOB) ---

  function createJobRowHtml(index, data = {}) {
    const jobNum = data.jobNumber || "";
    const dirty = data.dirtyIn || 0;
    const clean = data.cleanOut || 0;

    const tJob = T("jobNumber");
    const tIn = T("inboundDirty");
    const tOut = T("outboundClean");

    return `
      <div class="job-card" id="job-card-${index}">
        <div class="job-card-header">
           <span class="job-title">Job #${index + 1}</span>
           ${
             index > 0
               ? `<button class="remove-job-btn" onclick="document.getElementById('job-card-${index}').remove()">✕ Remove</button>`
               : ""
           }
        </div>
        <div class="form-group">
            <label>${tJob}</label>
            <input type="text" class="job-number-input" value="${jobNum}" required placeholder="Job #">
        </div>
        <div class="truck-ops-container">
            <div class="truck-op-section inbound">
                <h3>${tIn}</h3>
                <div class="bin-counter">
                    <span class="bin-count-display dirty-display">${dirty}</span>
                    <div class="bin-quick-btn-group">
                        <button class="bin-quick-btn" data-type="dirty" data-op="add" data-value="25">+25</button>
                        <button class="bin-quick-btn" data-type="dirty" data-op="add" data-value="100">+100</button>
                    </div>
                </div>
            </div>
            <div class="truck-op-section outbound">
                <h3>${tOut}</h3>
                <div class="bin-counter">
                    <span class="bin-count-display clean-display">${clean}</span>
                    <div class="bin-quick-btn-group">
                        <button class="bin-quick-btn" data-type="clean" data-op="add" data-value="25">+25</button>
                        <button class="bin-quick-btn" data-type="clean" data-op="add" data-value="100">+100</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    `;
  }

  function attachJobRowEvents(containerElement) {
    containerElement.querySelectorAll(".bin-counter").forEach((counter) => {
      const span = counter.querySelector(".bin-count-display");

      counter.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON") return;
        let count = parseInt(span.textContent, 10);
        if (e.target.dataset.op === "add")
          count += parseInt(e.target.dataset.value, 10);
        span.textContent = count;
      });

      span.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "bin-count-input";

        input.placeholder = span.textContent;
        input.value = "";

        span.replaceWith(input);
        input.focus();

        const onBlur = () => {
          let val = input.value.trim();
          if (val === "") val = input.placeholder;

          span.textContent = Math.max(0, parseInt(val, 10) || 0);
          input.replaceWith(span);
        };

        input.addEventListener("blur", onBlur);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") e.target.blur();
        });
      });
    });
  }

  function addJobRow(data = {}) {
    const container = document.getElementById("jobs-container");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = createJobRowHtml(jobCounter, data);
    const newRow = tempDiv.firstElementChild;
    container.appendChild(newRow);
    attachJobRowEvents(newRow);
    jobCounter++;
  }

  document.getElementById("add-job-row-btn").addEventListener("click", () => {
    addJobRow();
  });

  document.getElementById("add-entry-btn").addEventListener("click", () => {
    const modal = document.getElementById("entry-modal");
    modal.querySelector("h2").textContent = T("newEntryTitle");
    modal.dataset.editingId = "";

    document.getElementById("truck-number").value = "";
    document.getElementById("foreman-name").value = "";
    document.getElementById("jobs-container").innerHTML = "";

    const foremenList = document.getElementById("foremen-list");
    foremenList.innerHTML = "";
    state.foremen.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      foremenList.appendChild(option);
    });

    jobCounter = 0;
    addJobRow();

    document.getElementById("add-job-row-btn").style.display = "block";

    openModal(modal);
  });

  // --- SAVE LOGIC UPDATED ---
  document.getElementById("save-entry-btn").addEventListener("click", () => {
    const modal = document.getElementById("entry-modal");
    const truckNumber = document.getElementById("truck-number").value.trim();
    const foremanName = document.getElementById("foreman-name").value.trim();

    if (!truckNumber || !foremanName) {
      alert("Please fill Truck Number and Foreman Name");
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const jobCards = modal.querySelectorAll(".job-card");
    const transactionsToAdd = [];
    let isValid = true;

    jobCards.forEach((card) => {
      const jobNum = card.querySelector(".job-number-input").value.trim();
      if (!jobNum) {
        card.querySelector(".job-number-input").classList.add("invalid");
        isValid = false;
      } else {
        card.querySelector(".job-number-input").classList.remove("invalid");
      }

      const dirtyIn = parseInt(
        card.querySelector(".dirty-display").textContent,
        10
      );
      const cleanOut = parseInt(
        card.querySelector(".clean-display").textContent,
        10
      );

      transactionsToAdd.push({
        jobNumber: jobNum,
        dirtyIn,
        cleanOut,
      });
    });

    if (!isValid) {
      alert("Please enter Job Number for all rows.");
      return;
    }

    if (foremanName && !state.foremen.includes(foremanName)) {
      state.foremen.push(foremanName);
    }

    // ИСПРАВЛЕНИЕ: Используем parseFloat для ID, так как они теперь дробные
    const editingId = modal.dataset.editingId
      ? parseFloat(modal.dataset.editingId)
      : null;

    if (editingId) {
      // --- EDIT MODE (Single Entry) ---
      const txIndex = state.transactions.findIndex((t) => t.id === editingId);
      if (txIndex > -1) {
        const oldTx = state.transactions[txIndex];
        const newData = transactionsToAdd[0]; // Берем первую карту (при редактировании она одна)

        state.stock.dirty -= oldTx.dirtyIn;
        state.stock.clean += oldTx.cleanOut;
        state.stock.dirty += newData.dirtyIn;
        state.stock.clean -= newData.cleanOut;

        state.transactions[txIndex] = {
          ...oldTx,
          truckNumber,
          foreman: foremanName,
          jobNumber: newData.jobNumber,
          dirtyIn: newData.dirtyIn,
          cleanOut: newData.cleanOut,
          user: currentUser.name,
        };
      }
    } else {
      // --- CREATE MODE (Multi Entry) ---
      const timestamp = new Date().toISOString();
      transactionsToAdd.forEach((jobData) => {
        state.stock.dirty += jobData.dirtyIn;
        state.stock.clean -= jobData.cleanOut;

        state.transactions.push({
          id: Date.now() + Math.random(),
          type: "truck",
          timestamp: timestamp,
          truckNumber,
          foreman: foremanName,
          user: currentUser.name,
          jobNumber: jobData.jobNumber,
          dirtyIn: jobData.dirtyIn,
          cleanOut: jobData.cleanOut,
        });
      });
    }

    saveState();
    updateStockDisplay();
    renderTransactions();
    closeModal(modal);
  });

  // --- EDIT BUTTON LOGIC ---
  ui.transactionsContainer.addEventListener("click", (e) => {
    const target = e.target.closest(".delete-btn, .edit-btn");
    if (!target) return;
    const id = parseFloat(target.dataset.id);
    const txIndex = state.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) return;
    const tx = state.transactions[txIndex];

    if (target.classList.contains("delete-btn")) {
      if (!confirm("Are you sure you want to delete this entry?")) return;
      if (tx.type === "truck") {
        state.stock.dirty -= tx.dirtyIn;
        state.stock.clean += tx.cleanOut;
      } else if (tx.type === "wash") {
        state.stock.clean -= tx.quantity;
        state.stock.dirty += tx.quantity;
      }
      state.transactions.splice(txIndex, 1);
    } else if (target.classList.contains("edit-btn")) {
      if (tx.type === "adjust") {
        alert("Adjustment entries cannot be edited.");
        return;
      }
      const modal = document.getElementById(
        tx.type === "truck" ? "entry-modal" : "wash-modal"
      );

      modal.dataset.editingId = tx.id;
      modal.querySelector("h2").textContent = `Edit ${tx.type} Entry`;

      if (tx.type === "truck") {
        document.getElementById("jobs-container").innerHTML = "";
        jobCounter = 0;

        document.getElementById("foreman-name").value = tx.foreman || "";
        document.getElementById("truck-number").value = tx.truckNumber;

        const foremenList = document.getElementById("foremen-list");
        foremenList.innerHTML = "";
        state.foremen.forEach((name) => {
          const option = document.createElement("option");
          option.value = name;
          foremenList.appendChild(option);
        });

        // Добавляем одну карточку с существующими данными
        addJobRow({
          jobNumber: tx.jobNumber,
          dirtyIn: tx.dirtyIn,
          cleanOut: tx.cleanOut,
        });

        document.getElementById("add-job-row-btn").style.display = "none";
      } else if (tx.type === "wash") {
        modal.querySelector(".bin-count-display").textContent = tx.quantity;
        document.getElementById("wash-comment").value = tx.comment;
        attachJobRowEvents(modal);
      }
      openModal(modal);
    }
    saveState();
    updateStockDisplay();
    renderTransactions();
  });

  function validateForm(formElement) {
    let isValid = true;
    clearValidation(formElement);
    formElement.querySelectorAll("input[required]").forEach((input) => {
      if (!input.value.trim()) {
        input.classList.add("invalid");
        isValid = false;
      }
    });
    return isValid;
  }

  function clearValidation(formElement) {
    formElement.querySelectorAll("input.invalid").forEach((input) => {
      input.classList.remove("invalid");
    });
  }

  document
    .querySelectorAll(".cancel-btn")
    .forEach((btn) =>
      btn.addEventListener("click", (e) =>
        closeModal(e.target.closest(".modal"))
      )
    );

  document.getElementById("scan-qr-btn").addEventListener("click", () => {
    openModal(ui.qrModal);
    if (html5QrCode) {
      try {
        html5QrCode.clear();
      } catch (e) {}
    }
    html5QrCode = new Html5Qrcode("reader");
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          try {
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
              closeModal(ui.qrModal);
            });
            const data = JSON.parse(decodedText);

            const entryModal = document.getElementById("entry-modal");
            entryModal.querySelector("h2").textContent = T("newEntryTitle");
            entryModal.dataset.editingId = "";
            document.getElementById("add-job-row-btn").style.display = "block";

            document.getElementById("foreman-name").value = data.f || "";
            const truckField = document.getElementById("truck-number");
            truckField.value = !data.t || data.t === "000" ? "" : data.t;

            document.getElementById("jobs-container").innerHTML = "";
            jobCounter = 0;
            addJobRow({
              jobNumber: data.j || "",
              dirtyIn: data.in || 0,
              cleanOut: data.out || 0,
            });

            const foremenList = document.getElementById("foremen-list");
            foremenList.innerHTML = "";
            state.foremen.forEach((name) => {
              const option = document.createElement("option");
              option.value = name;
              foremenList.appendChild(option);
            });

            openModal(entryModal);
          } catch (e) {
            alert("QR Error: Invalid Data Format");
          }
        },
        () => {}
      )
      .catch((err) => {
        console.warn("Back camera failed, trying default...", err);
      });
  });

  attachJobRowEvents(document.getElementById("wash-modal"));

  document.getElementById("wash-bins-btn").addEventListener("click", () => {
    const modal = document.getElementById("wash-modal");
    modal.dataset.editingId = "";
    modal.querySelectorAll("input").forEach((i) => (i.value = ""));
    modal.querySelector(".bin-count-display").textContent = "0";
    openModal(modal);
  });

  document.getElementById("adjust-stock-btn").addEventListener("click", () => {
    const modal = document.getElementById("adjust-modal");
    modal.dataset.editingId = "";
    document.getElementById("adjust-clean").value = state.stock.clean;
    document.getElementById("adjust-dirty").value = state.stock.dirty;
    document.getElementById("adjust-reason").value = "";
    openModal(modal);
  });

  document.getElementById("save-wash-btn").addEventListener("click", () => {
    const modal = document.getElementById("wash-modal");
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const quantity = parseInt(
      modal.querySelector(".bin-count-display").textContent,
      10
    );
    const comment = document.getElementById("wash-comment").value.trim();
    if (quantity === 0) {
      alert("Quantity cannot be zero.");
      return;
    }
    const editingId = modal.dataset.editingId
      ? parseFloat(modal.dataset.editingId)
      : null;

    if (editingId) {
      const txIndex = state.transactions.findIndex((t) => t.id === editingId);
      if (txIndex > -1) {
        const oldTx = state.transactions[txIndex];
        state.stock.dirty += oldTx.quantity;
        state.stock.clean -= oldTx.quantity;
        state.stock.dirty -= quantity;
        state.stock.clean += quantity;
        state.transactions[txIndex] = {
          ...oldTx,
          quantity,
          user: currentUser.name,
          comment,
        };
      }
    } else {
      if (quantity > state.stock.dirty) {
        alert("Cannot wash more bins than are in dirty stock.");
        return;
      }
      state.stock.dirty -= quantity;
      state.stock.clean += quantity;
      state.transactions.push({
        id: Date.now(),
        type: "wash",
        timestamp: new Date().toISOString(),
        quantity,
        user: currentUser.name,
        comment,
      });
    }
    saveState();
    updateStockDisplay();
    renderTransactions();
    closeModal(modal);
  });

  document.getElementById("save-adjust-btn").addEventListener("click", () => {
    const modal = document.getElementById("adjust-modal");
    if (!validateForm(modal)) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const newClean = parseInt(
      document.getElementById("adjust-clean").value,
      10
    );
    const newDirty = parseInt(
      document.getElementById("adjust-dirty").value,
      10
    );
    const reason = document.getElementById("adjust-reason").value.trim();
    const oldClean = state.stock.clean;
    const oldDirty = state.stock.dirty;
    state.stock.clean = newClean;
    state.stock.dirty = newDirty;
    state.transactions.push({
      id: Date.now(),
      type: "adjust",
      timestamp: new Date().toISOString(),
      newClean,
      newDirty,
      oldClean,
      oldDirty,
      reason,
      user: currentUser.name,
    });
    saveState();
    updateStockDisplay();
    renderTransactions();
    closeModal(modal);
  });

  function renderUserList() {
    ui.userList.innerHTML = "";
    state.users.forEach((user) => {
      const li = document.createElement("li");
      li.className = "user-list-item";
      li.innerHTML = `<span>${user.name}</span>`;
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-user-btn";
      deleteBtn.textContent = "🗑️";
      deleteBtn.dataset.id = user.id;
      li.appendChild(deleteBtn);
      ui.userList.appendChild(li);
    });
  }

  document.getElementById("admin-panel-btn").addEventListener("click", () => {
    const pin = prompt("Enter Admin PIN:", "");
    if (pin === "0000") {
      openModal(ui.adminModal);
      renderUserList();
    } else if (pin !== null) {
      alert("Incorrect PIN");
    }
  });

  if (ui.locationSelect) {
    ui.locationSelect.addEventListener("change", (e) => {
      state.location = e.target.value;
      saveState();
      alert(
        `✅ Location saved: ${e.target.options[e.target.selectedIndex].text}`
      );
    });
  }

  document.getElementById("add-user-btn").addEventListener("click", () => {
    const nameInput = document.getElementById("new-user-name");
    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a valid name.");
      return;
    }
    state.users.push({ id: Date.now(), name, pin: "0000" });
    saveState();
    renderUserList();
    renderLoginButtons();
    nameInput.value = "";
  });

  ui.userList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-user-btn")) {
      if (!confirm("Are you sure you want to delete this user?")) return;
      const userId = parseInt(e.target.dataset.id, 10);
      state.users = state.users.filter((u) => u.id !== userId);
      saveState();
      renderUserList();
      renderLoginButtons();
    }
  });

  // --- REPORT GENERATION (Restored Full Version) ---
  document.getElementById("report-btn").addEventListener("click", () => {
    const reportDateVal = ui.reportDateInput.value;
    if (!reportDateVal) {
      alert("Please select a date for the report.");
      return;
    }
    const reportDate = new Date(reportDateVal + "T00:00:00");
    const reportDateStr = reportDate.toLocaleDateString("en-CA");
    const transactionsForDate = state.transactions.filter(
      (t) => new Date(t.timestamp).toLocaleDateString("en-CA") === reportDateStr
    );
    generateReportHtml(transactionsForDate);
  });

  function generateReportHtml(transactionsForDate) {
    if (transactionsForDate.length === 0) {
      alert(T("noDataForDate"));
      return;
    }

    const totalReceived = transactionsForDate
      .filter((t) => t.type === "truck")
      .reduce((sum, t) => sum + (t.dirtyIn || 0), 0);
    const totalShipped = transactionsForDate
      .filter((t) => t.type === "truck")
      .reduce((sum, t) => sum + (t.cleanOut || 0), 0);
    const washedByPerson = transactionsForDate
      .filter((t) => t.type === "wash")
      .reduce((acc, t) => {
        if (t.user) acc[t.user] = (acc[t.user] || 0) + t.quantity;
        return acc;
      }, {});
    const activityByUser = transactionsForDate.reduce((acc, t) => {
      if (t.user) acc[t.user] = (acc[t.user] || 0) + 1;
      return acc;
    }, {});
    const endOfDayClean = state.stock.clean;
    const endOfDayDirty = state.stock.dirty;

    const transactionRowsHtml = transactionsForDate
      .map((t, index) => {
        const d = new Date(t.timestamp);
        const date = d.toLocaleDateString("en-CA");
        const time = d.toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        const rowStyle =
          index % 2 === 0
            ? "background-color: #ffffff;"
            : "background-color: #f3f5f7;";

        let typeCell = "",
          dirtyInCell = "0",
          cleanOutCell = "0",
          qtyCell = "",
          commentCell = "",
          jobNumberCell = "",
          truckCell = "",
          foremanCell = "";

        switch (t.type) {
          case "truck":
            typeCell =
              '<span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 12px; color: white; background-color: #3498db;">truck</span>';
            dirtyInCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px; color: #e74c3c; font-weight: 600;">${
              t.dirtyIn || 0
            }</td>`;
            cleanOutCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px; color: #27ae60; font-weight: 600;">${
              t.cleanOut || 0
            }</td>`;
            qtyCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            commentCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            jobNumberCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
              t.jobNumber || ""
            }</td>`;
            truckCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
              t.truckNumber || ""
            }</td>`;
            foremanCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
              t.foreman || ""
            }</td>`;
            break;
          case "wash":
            typeCell =
              '<span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 12px; color: white; background-color: #2ecc71;">wash</span>';
            dirtyInCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            cleanOutCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            qtyCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${t.quantity}</td>`;
            commentCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
              t.comment || ""
            }</td>`;
            jobNumberCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            truckCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            foremanCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            break;
          case "adjust":
            typeCell =
              '<span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 12px; color: white; background-color: #f39c12;">adjust</span>';
            dirtyInCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            cleanOutCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            qtyCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            commentCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
              t.reason || ""
            }</td>`;
            jobNumberCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            truckCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            foremanCell = `<td style="border: 1px solid #dfe2e5; padding: 10px 15px;"></td>`;
            break;
        }
        return `<tr style="${rowStyle}">
                    <td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${date}</td>
                    <td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${time}</td>
                    <td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${typeCell}</td>
                    <td style="border: 1px solid #dfe2e5; padding: 10px 15px;">${
                      t.user || ""
                    }</td>
                    ${foremanCell} ${jobNumberCell} ${truckCell} ${dirtyInCell} ${cleanOutCell} ${qtyCell} ${commentCell}
                </tr>`;
      })
      .join("");

    // Summary
    const sortedActivity = Object.entries(activityByUser).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const washingEntries = Object.entries(washedByPerson);
    const maxRows = Math.max(washingEntries.length, sortedActivity.length, 2);
    let summaryTableBodyHtml = "";

    for (let i = 0; i < maxRows; i++) {
      let endOfDayHtml =
        i === 0
          ? `<td style="padding: 8px; border-left: 1px solid #dfe2e5; text-align: right; font-weight: bold; color: #27ae60;">${T(
              "cleanStock"
            )}:</td><td style="padding: 8px; border-right: 5px solid #34495e; text-align: left; font-weight: bold; font-size: 16px; color: #27ae60;">${endOfDayClean}</td>`
          : i === 1
          ? `<td style="padding: 8px; border-left: 1px solid #dfe2e5; text-align: right; font-weight: bold; color: #e74c3c;">${T(
              "dirtyStock"
            )}:</td><td style="padding: 8px; border-right: 5px solid #34495e; text-align: left; font-weight: bold; font-size: 16px; color: #e74c3c;">${endOfDayDirty}</td>`
          : `<td style="padding: 8px; border-left: 1px solid #dfe2e5;"></td><td style="padding: 8px; border-right: 5px solid #34495e;"></td>`;
      let movementHtml =
        i === 0
          ? `<td style="padding: 8px; text-align: right;">${T(
              "totalReceived"
            )}:</td><td style="padding: 8px; border-right: 5px solid #34495e; text-align: left;"><b>${totalReceived}</b></td>`
          : i === 1
          ? `<td style="padding: 8px; text-align: right;">${T(
              "totalShipped"
            )}:</td><td style="padding: 8px; border-right: 5px solid #34495e; text-align: left;"><b>${totalShipped}</b></td>`
          : `<td style="padding: 8px;"></td><td style="padding: 8px; border-right: 5px solid #34495e;"></td>`;
      let washingHtml = washingEntries[i]
        ? `<td style="padding: 8px; text-align: right;">${washingEntries[i][0]}:</td><td style="padding: 8px; border-right: 5px solid #34495e; text-align: left;"><b>${washingEntries[i][1]}</b></td>`
        : `<td style="padding: 8px;"></td><td style="padding: 8px; border-right: 5px solid #34495e;"></td>`;
      let activityHtml = sortedActivity[i]
        ? `<td style="padding: 8px; text-align: right;">${sortedActivity[i][0]}:</td><td style="padding: 8px; border-right: 1px solid #dfe2e5; text-align: left;"><b>${sortedActivity[i][1]} op(s)</b></td>`
        : `<td style="padding: 8px;"></td><td style="padding: 8px; border-right: 1px solid #dfe2e5;"></td>`;
      summaryTableBodyHtml += `<tr>${endOfDayHtml}${movementHtml}${washingHtml}${activityHtml}</tr>`;
    }

    const fullHtmlReport = `
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 20px; background-color: #f9f9f9;">
                <h2 style="font-family: inherit; color: #2c3e50;">Operations Log</h2>
                <table style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr style="background-color: #2c3e50; color: #ffffff;">
                            <th style="width: 100px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">Date</th>
                            <th style="width: 90px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">Time</th>
                            <th style="width: 80px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">Type</th>
                            <th style="width: 120px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "employeeName"
                            )}</th>
                            <th style="width: 120px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "foreman"
                            )}</th>
                            <th style="width: 120px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "jobNumber"
                            )}</th>
                            <th style="width: 100px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "truck"
                            )}</th>
                            <th style="width: 80px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "inboundDirty"
                            )}</th>
                            <th style="width: 90px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "outboundClean"
                            )}</th>
                            <th style="width: 80px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "quantityWashed"
                            )}</th>
                            <th style="width: 200px; padding: 12px 15px; border: 1px solid #2c3e50; font-weight: 600; text-transform: uppercase; font-size: 12px; text-align: left;">${T(
                              "comment"
                            )}</th>
                        </tr>
                        </thead>
                    <tbody>${transactionRowsHtml}</tbody>
                </table>
                <br>
                <h2 style="font-family: inherit; color: #2c3e50;">${T(
                  "summaryTitle"
                )}</h2>
                <table style="border-collapse: collapse; border-spacing: 0;">
                    <thead>
                        <tr style="background-color: #34495e; color: #ffffff;">
                            <th colspan="2" style="padding: 12px; border: 1px solid #34495e; border-right-width: 5px; text-align: center; font-size: 13px;">End-of-Day Totals</th>
                            <th colspan="2" style="padding: 12px; border: 1px solid #34495e; border-right-width: 5px; text-align: center; font-size: 13px;">${T(
                              "binMovement"
                            )}</th>
                            <th colspan="2" style="padding: 12px; border: 1px solid #34495e; border-right-width: 5px; text-align: center; font-size: 13px;">${T(
                              "washingSummary"
                            )}</th>
                            <th colspan="2" style="padding: 12px; border: 1px solid #34495e; text-align: center; font-size: 13px;">${T(
                              "activityByUser"
                            )}</th>
                        </tr>
                    </thead>
                    <tbody style="font-size: 14px; background-color: #f3f5f7;">${summaryTableBodyHtml}</tbody>
                </table>
            </body>`;
    document.getElementById("report-html-container").innerHTML = fullHtmlReport;
    document
      .getElementById("copy-report-btn")
      .querySelector("span").textContent = T("copyData");
    openModal(document.getElementById("report-modal"));
  }

  document.getElementById("copy-report-btn").addEventListener("click", () => {
    const reportContainer = document.getElementById("report-html-container");
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(reportContainer);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        const copyButtonSpan = document
          .getElementById("copy-report-btn")
          .querySelector("span");
        const originalText = T("copyData");
        copyButtonSpan.textContent = T("copied");
        setTimeout(() => {
          copyButtonSpan.textContent = originalText;
        }, 2000);
      } else {
        alert("Copy failed.");
      }
    } catch (err) {
      console.error("Failed to copy report: ", err);
      alert("Could not copy report.");
    }
    selection.removeAllRanges();
  });

  document.getElementById("backup-btn").addEventListener("click", () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bintracker_backup_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const restoreInput = document.getElementById("restore-file-input");
  document
    .getElementById("restore-btn")
    .addEventListener("click", () => restoreInput.click());
  restoreInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        state = JSON.parse(event.target.result);
        saveState();
        location.reload();
      } catch (err) {}
    };
    reader.readAsText(file);
  });

  const initializeApp = () => {
    loadState();
    setLanguage(state.language || "en");
    renderLoginButtons();
    const currentUser = sessionStorage.getItem("currentUser");
    if (currentUser) {
      performLogin(JSON.parse(currentUser));
    } else {
      ui.appContainer.classList.add("hidden");
      openModal(ui.loginModal);
    }

    Object.values(document.querySelectorAll(".lang-switcher button")).forEach(
      (btn) =>
        btn.addEventListener("click", () => setLanguage(btn.id.split("-")[1]))
    );
    document
      .getElementById("logout-btn")
      .addEventListener("click", handleLogout);

    document.getElementById("save-setup-btn").addEventListener("click", () => {
      const initialClean = parseInt(
        document.getElementById("initial-clean").value,
        10
      );
      const initialDirty = parseInt(
        document.getElementById("initial-dirty").value,
        10
      );
      state.stock.clean = initialClean;
      state.stock.dirty = initialDirty;
      saveState();
      updateStockDisplay();
      closeModal(document.getElementById("setup-modal"));
    });
  };

  initializeApp();
});
