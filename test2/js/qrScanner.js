// js/qrScanner.js
function setupQrScanner() {
  const startQrScanButton = document.getElementById("startQrScanBtn");
  const closeQrScanButton = document.getElementById("closeQrScanBtn");
  const qrReaderElement = document.getElementById("qrReader");
  const jobNumberInput = document.getElementById("job"); // ID confirmed from index.html

  // QR Reader container that will be shown/hidden
  const qrScannerContainer = document.getElementById("qrScannerContainer");

  if (
    !startQrScanButton ||
    !qrReaderElement ||
    !jobNumberInput ||
    !closeQrScanButton ||
    !qrScannerContainer
  ) {
    console.error(
      "QR Scanner UI elements (start button, close button, reader element, job number input, or scanner container) not found in the DOM."
    );
    return;
  }

  let html5QrCode = null; // To hold the scanner instance

  startQrScanButton.addEventListener("click", () => {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qrReader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
    }

    // Prepare UI for scanning
    qrScannerContainer.style.display = "block"; // Show the container for reader and close button
    qrReaderElement.style.display = "block"; // Ensure reader div itself is visible if it was hidden separately
    closeQrScanButton.style.display = "inline-flex";
    startQrScanButton.textContent = "Initializing..."; // Text for the header button
    startQrScanButton.disabled = true;

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      console.log(`QR Code detected: ${decodedText}`, decodedResult);
      try {
        const parts = decodedText.split("-");
        if (parts.length > 0) {
          const jobNum = parts[0].trim();
          jobNumberInput.value = jobNum;

          // Dispatch an 'input' event to ensure any listeners on the job field are triggered
          const event = new Event("input", { bubbles: true, cancelable: true });
          jobNumberInput.dispatchEvent(event);

          // If there's a specific function to update other parts of the UI based on this field, call it.
          if (typeof updateSheetOutputString === "function") {
            updateSheetOutputString();
          }
          if (typeof updatePalletPaperDisplay === "function") {
            updatePalletPaperDisplay();
          }

          // Visual feedback for successful scan
          jobNumberInput.classList.add("scan-successful");
          setTimeout(() => {
            jobNumberInput.classList.remove("scan-successful");
          }, 1500); // Remove highlight after 1.5 seconds
        } else {
          console.warn(
            "Scanned QR code does not contain a hyphen:",
            decodedText
          );
          // Removed alert for unexpected format to avoid interrupting flow if not critical
        }
      } catch (error) {
        console.error("Error processing scanned QR code:", error);
        // Removed alert for processing error
      } finally {
        stopScanner(); // Stop and clean up scanner UI
      }
    };

    const qrCodeErrorCallback = (errorMessage) => {
      // This callback is called frequently if no QR code is found.
      // console.warn(`QR Scan Error: ${errorMessage}`);
    };

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      )
      .then(() => {
        startQrScanButton.textContent = "Scanning..."; // Update header button text
      })
      .catch((err) => {
        console.error(`Unable to start QR scanner: ${err}`);
        alert(
          `Error starting QR scanner: ${err}. Please ensure camera permissions are granted and the camera is not in use by another application.`
        );
        stopScanner();
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
            Scan QR`; // Restore original button text with SVG
    startQrScanButton.disabled = false;
    qrScannerContainer.style.display = "none"; // Hide the container for reader and close button
    // qrReaderElement.style.display = 'none'; // Already part of qrScannerContainer
    // closeQrScanButton.style.display = 'none'; // Already part of qrScannerContainer

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
