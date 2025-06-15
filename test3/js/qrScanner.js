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
    startQrScanButton.textContent = "QR";
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
