// js/reportGenerator.js
import { validateNoOptionComments } from "./formHandler.js";
import { updateStatusMessage, toggleLoader } from "./uiHandler.js";
import { questions } from "./config.js";
import { selectedPhotos } from "./photoHandler.js"; // Assuming selectedPhotos array is exported

// compressImageForPdf can remain a local helper function
async function compressImageForPdf(dataUrl, maxWidthOrHeight, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidthOrHeight) {
          height = Math.round(height * (maxWidthOrHeight / width));
          width = maxWidthOrHeight;
        }
      } else {
        if (height > maxWidthOrHeight) {
          width = Math.round(width * (maxWidthOrHeight / height));
          height = maxWidthOrHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality)); // Force JPEG for PDF
    };
    img.onerror = (err) => {
      // Pass error to reject
      console.error("Image load error in compressImageForPdf", err);
      reject(new Error("Image load error for PDF compression"));
    };
    img.src = dataUrl;
  });
}

async function generatePdfWithPhotos() {
  const validationResult = validateNoOptionComments(); // Imported

  if (!validationResult.isValid) {
    updateStatusMessage(
      // Imported
      "pdfGenerateStatus",
      "Validation failed. Please check comments.",
      "error",
      5000
    );
    alert(
      "Please provide valid comments for all items marked 'NO':\n\n" +
        validationResult.messages.join("\n")
    );
    return;
  }

  if (typeof jspdf === "undefined" || typeof jspdf.jsPDF === "undefined") {
    // jspdf still global
    alert("Error: jsPDF library not loaded.");
    updateStatusMessage(
      // Imported
      "pdfGenerateStatus",
      "Error: jsPDF library not loaded.",
      "error",
      5000
    );
    return;
  }
  const { jsPDF } = jspdf; // jspdf still global
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  toggleLoader("pdfGenerateLoader", true); // Imported
  updateStatusMessage("pdfGenerateStatus", "Generating PDF..."); // Imported
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = doc.internal.pageSize.width - margin * 2;
    const lineHeight = 7; // Base line height for 10pt font
    let hasNoAnswers = false;

    const rootStyles = getComputedStyle(document.documentElement);
    const orangeAccent =
      rootStyles.getPropertyValue("--knicks-orange-accent").trim() || "#F58426";

    function addTextToPdf(text, x, currentY, options = {}) {
      const effectiveLineHeight = options.lineHeightFactor
        ? lineHeight * options.lineHeightFactor
        : lineHeight;
      if (currentY > pageHeight - margin - effectiveLineHeight) {
        // Check for page break
        doc.addPage();
        currentY = margin;
      }
      const originalColor = doc.getTextColor();
      const originalSize = doc.getFontSize();
      if (options.color) doc.setTextColor(options.color);
      if (options.size) doc.setFontSize(options.size);
      if (options.fontStyle) doc.setFont(undefined, options.fontStyle);

      doc.text(text, x, currentY, {
        maxWidth: options.maxWidth || contentWidth,
      });

      if (options.color) doc.setTextColor(originalColor);
      if (options.size) doc.setFontSize(originalSize);
      if (options.fontStyle) doc.setFont(undefined, "normal"); // Reset font style
      // Calculate advance based on actual text height if possible, or approximate
      // For simplicity, using a factor of the base lineHeight. SplitTextToSize might be better for precision.
      const lines = doc.splitTextToSize(text, options.maxWidth || contentWidth);
      return (
        currentY +
        lines.length *
          effectiveLineHeight *
          ((options.size || originalSize) / 10)
      ); // Adjust based on 10pt baseline
    }
    function addBoldTextToPdf(text, x, currentY, options = {}) {
      return addTextToPdf(text, x, currentY, { ...options, fontStyle: "bold" });
    }

    // === PDF Content Generation ===
    doc.setFontSize(16);
    yPos = addBoldTextToPdf(
      `Client: ${document.getElementById("clientName").value || "N/A"}`,
      margin,
      yPos,
      { lineHeightFactor: 1.2 }
    );
    yPos = addBoldTextToPdf(
      `Job #: ${document.getElementById("job").value || "N/A"}`,
      margin,
      yPos,
      { lineHeightFactor: 1.2 }
    );
    const cuFtInputVal = document.getElementById("cuFt").value.trim();
    if (cuFtInputVal) {
      yPos = addBoldTextToPdf(`CuFt: ${cuFtInputVal}`, margin, yPos, {
        lineHeightFactor: 1.2,
      });
    }
    yPos += lineHeight * 0.5; // Extra space

    doc.setFontSize(10); // Default text size
    yPos = addBoldTextToPdf("Report Details:", margin, yPos);
    questions.forEach((q) => {
      // `questions` is imported
      const selectEl = document.getElementById(q.id);
      const selectVal = selectEl ? selectEl.value : "N/A";
      let textOptions = {};
      if (selectVal === "NO") {
        textOptions.color = "#FF0000"; // Red color for "NO"
        hasNoAnswers = true;
      }
      yPos = addTextToPdf(`• ${q.text}`, margin, yPos, textOptions); // Question text

      // Answer, potentially split
      const answerLines = doc.splitTextToSize(
        `  ${selectVal}`,
        contentWidth - 5
      );
      answerLines.forEach((line) => {
        yPos = addTextToPdf(line, margin + 5, yPos, textOptions);
      });

      if (selectVal === "NO") {
        const commentTextarea = document.getElementById(
          `no_comment_textarea_${q.id}`
        );
        if (
          commentTextarea &&
          commentTextarea.value.trim() !== `${q.itemName} (NO):` && // Ensure it's not just the template
          commentTextarea.value.trim() !== ""
        ) {
          const commentPrefix = "    Comment: ";
          const commentContent = commentTextarea.value.trim();
          const commentFullText = `${commentPrefix}${commentContent}`;
          const commentLines = doc.splitTextToSize(
            commentFullText,
            contentWidth - 10 // Indented further
          );
          commentLines.forEach((line) => {
            // Ensure each line respects yPos and page breaks
            yPos = addTextToPdf(line, margin + 7, yPos, { color: "#FF0000" });
          });
        }
      }
    });
    yPos += lineHeight * 0.25; // Space after questions section

    // Pallet/CuFt Check
    const cuFtFromInput = document.getElementById("cuFt").value.trim();
    const palletsFromSheet = document
      .getElementById("sheetPallets")
      .value.trim();
    if (cuFtFromInput && palletsFromSheet) {
      const cuFtParsed = parseFloat(cuFtFromInput.replace(/,/g, ""));
      const palletsParsed = parseInt(palletsFromSheet, 10);

      if (!isNaN(cuFtParsed) && !isNaN(palletsParsed) && palletsParsed >= 0) {
        yPos += lineHeight * 0.25;
        let cuFtPalletAttentionText = "";
        let cuFtPalletAttentionColor = "#000000"; // Default black

        if (palletsParsed > 0) {
          const difference = palletsParsed * 100 - cuFtParsed;
          if (difference > 100) {
            cuFtPalletAttentionText = `Pallet/CuFt Check: ATTENTION - Difference (${difference.toFixed(
              1
            )}) > 100.`;
            cuFtPalletAttentionColor = "#FF0000"; // Red
          } else if (difference < 0) {
            cuFtPalletAttentionText = `Pallet/CuFt Check: OK - Difference (${difference.toFixed(
              1
            )}) is negative.`;
          } else {
            cuFtPalletAttentionText = `Pallet/CuFt Check: OK - Difference (${difference.toFixed(
              1
            )}) not over 100.`;
          }
          cuFtPalletAttentionText += ` Formula: (Pallets * 100) - CuFt.`;
        }

        if (cuFtPalletAttentionText) {
          yPos = addTextToPdf(`• ${cuFtPalletAttentionText}`, margin, yPos, {
            color: cuFtPalletAttentionColor,
          });
        }
        yPos += lineHeight * 0.25;
      }
    }

    yPos += lineHeight * 0.5;
    yPos = addBoldTextToPdf("General Comments:", margin, yPos);
    const generalComments = document
      .getElementById("generalComments")
      .value.trim();
    if (generalComments) {
      const commentLines = doc.splitTextToSize(generalComments, contentWidth);
      commentLines.forEach((line) => {
        yPos = addTextToPdf("• " + line, margin, yPos);
      });
    } else {
      yPos = addTextToPdf("• None", margin, yPos);
    }
    yPos += lineHeight * 0.5;

    const ratingValue = parseFloat(document.getElementById("rating").value);
    let ratingTextOptions = {};
    if (ratingValue < 4.0) {
      // Be explicit with float comparison
      ratingTextOptions.color = "#FF0000"; // Red
    }
    yPos = addBoldTextToPdf(
      `Rating: ${ratingValue.toFixed(1)}`,
      margin,
      yPos,
      ratingTextOptions
    );
    yPos += lineHeight * 0.5;

    yPos = addBoldTextToPdf("Google Sheets Data String:", margin, yPos);
    const sheetString = document.getElementById("sheetOutputString").value;
    const sheetStringLines = doc.splitTextToSize(sheetString, contentWidth);
    sheetStringLines.forEach((line) => {
      yPos = addTextToPdf(line, margin, yPos);
    });
    yPos += lineHeight;

    if (selectedPhotos.length > 0) {
      // `selectedPhotos` is imported
      yPos = addBoldTextToPdf("Attached Photos:", margin, yPos);
      for (const photo of selectedPhotos) {
        if (yPos > pageHeight - margin - 50) {
          // Min space for an image
          doc.addPage();
          yPos = margin;
        }
        try {
          const imgDataUrl = await compressImageForPdf(
            // Local helper
            photo.originalDataUrl,
            1024,
            0.7
          );
          // photo.compressedDataUrl = imgDataUrl; // Not strictly needed if only used here

          const img = new Image();
          img.src = imgDataUrl;
          // Wait for image to load to get dimensions
          await new Promise((r, j) => {
            img.onload = r;
            img.onerror = (err) => {
              console.error("Image load error for PDF:", err);
              j(err);
            };
          });

          let imgWidth = img.width;
          let imgHeight = img.height;
          const maxImgWidth = contentWidth;
          // Calculate maxImgHeight dynamically based on remaining page space
          let maxImgHeightOnPage =
            pageHeight - yPos - margin - (photo.comment ? 10 : 5); // Approx height for comment + spacing

          if (imgWidth <= 0 || imgHeight <= 0) {
            // Skip if image dimensions are invalid
            console.warn(
              "Skipping image due to zero/negative dimension:",
              photo.file?.name
            );
            continue;
          }

          let ratio = 1;
          if (imgWidth > maxImgWidth) {
            ratio = maxImgWidth / imgWidth;
          }
          if (imgHeight * ratio > maxImgHeightOnPage) {
            ratio = maxImgHeightOnPage / (imgHeight * ratio); //This ratio logic might be tricky
          }
          // Simpler ratio calculation:
          const widthRatio = maxImgWidth / imgWidth;
          const heightRatio = maxImgHeightOnPage / imgHeight;
          ratio = Math.min(1, widthRatio, heightRatio); // Ensure it doesn't upscale, and fits both width and height

          imgWidth *= ratio;
          imgHeight *= ratio;

          if (
            imgHeight <= 0 ||
            imgWidth <= 0 ||
            yPos + imgHeight > pageHeight - margin
          ) {
            doc.addPage();
            yPos = margin;
            // Recalculate maxImgHeightOnPage for new page
            maxImgHeightOnPage =
              pageHeight - yPos - margin - (photo.comment ? 10 : 5);
            const newHeightRatio = maxImgHeightOnPage / img.height; // original img.height
            ratio = Math.min(1, maxImgWidth / img.width, newHeightRatio);
            imgWidth = img.width * ratio;
            imgHeight = img.height * ratio;
          }

          const xCentered = margin + (contentWidth - imgWidth) / 2; // Center within contentWidth
          doc.addImage(
            imgDataUrl,
            "JPEG",
            xCentered,
            yPos,
            imgWidth,
            imgHeight
          );
          yPos += imgHeight + 2; // Space after image

          if (photo.comment && photo.comment.trim() !== "") {
            const commentLineHeight = 4; // Smaller line height for comments
            if (yPos + commentLineHeight > pageHeight - margin - 5) {
              // Check space for comment
              doc.addPage();
              yPos = margin;
            }
            doc.setFillColor(orangeAccent); // Use the theme color
            doc.rect(margin, yPos, 3, 3, "F"); // Small colored square
            const commentX = margin + 5;
            const commentMaxWidth = contentWidth - 5;
            doc.setFontSize(9); // Smaller font for comments
            const commentLines = doc.splitTextToSize(
              photo.comment.trim(),
              commentMaxWidth
            );
            commentLines.forEach((line) => {
              if (yPos + commentLineHeight > pageHeight - margin - 2) {
                // New page if comment overflows
                doc.addPage();
                yPos = margin;
                doc.setFillColor(orangeAccent);
                doc.rect(margin, yPos, 3, 3, "F");
              }
              doc.text(line, commentX, yPos + 2.5); // Adjust y for text alignment with rect
              yPos += commentLineHeight;
            });
            doc.setFontSize(10); // Reset font size
            yPos += 2; // Extra space after comment
          }
          yPos += 3; // Space between photos
        } catch (imgError) {
          console.error(
            "Error processing image for PDF:",
            photo.file?.name || "unknown file",
            imgError
          );
          yPos = addTextToPdf(
            `[Error embedding image: ${photo.file?.name || "unknown file"}]`,
            margin,
            yPos
          );
        }
      }
    }

    // --- PDF Saving and Sharing ---
    let fileName = `Report-${document.getElementById("job").value || "Custom"}`;
    if (hasNoAnswers) fileName += "_ATTENTION-NO";
    if (ratingValue < 4.0) fileName += "_RatingLow"; // Explicit float
    fileName += ".pdf";
    const pdfOutput = doc.output("blob");
    let shared = false;

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({
        files: [new File([pdfOutput], fileName, { type: "application/pdf" })],
      })
    ) {
      try {
        await navigator.share({
          files: [new File([pdfOutput], fileName, { type: "application/pdf" })],
          title: fileName,
          text: `Report for Job #${
            document.getElementById("job").value || "Custom"
          }`,
        });
        updateStatusMessage(
          "pdfGenerateStatus",
          "PDF shared successfully!",
          "success",
          5000
        ); // Updated message
        shared = true;
      } catch (shareError) {
        // Don't log error if it's AbortError (user cancelled share)
        if (shareError.name !== "AbortError") {
          console.error("Share PDF error:", shareError);
          updateStatusMessage(
            "pdfGenerateStatus",
            "Share failed. Downloading instead.",
            "error",
            5000
          );
        } else {
          updateStatusMessage(
            "pdfGenerateStatus",
            "Share cancelled. Downloading.",
            "info",
            3000
          );
        }
      }
    }

    // Always offer download, especially if sharing is not supported or fails
    if (!shared || (navigator.share && !shared)) {
      // Download if not shared OR if share was available but failed/cancelled
      doc.save(fileName);
      updateStatusMessage(
        "pdfGenerateStatus",
        shared ? "PDF also downloaded." : "PDF downloaded.",
        "success",
        5000
      );
    }
  } catch (error) {
    console.error("Generate PDF error:", error);
    updateStatusMessage(
      "pdfGenerateStatus",
      "Error creating PDF. See console.",
      "error",
      5000
    );
    alert("Error creating PDF: " + error.message);
  } finally {
    toggleLoader("pdfGenerateLoader", false);
  }
}

export { generatePdfWithPhotos };
