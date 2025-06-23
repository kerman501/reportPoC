async function generatePdfWithPhotos() {
  const validationResult = validateNoOptionComments();

  if (!validationResult.isValid) {
    updateStatusMessage(
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
    alert("Error: jsPDF library not loaded.");
    updateStatusMessage(
      "pdfGenerateStatus",
      "Error: jsPDF library not loaded.",
      "error",
      5000
    );
    return;
  }
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  toggleLoader("pdfGenerateLoader", true);
  updateStatusMessage("pdfGenerateStatus", "Generating PDF...");
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = doc.internal.pageSize.width - margin * 2;
    const lineHeight = 7;
    let hasNoAnswers = false;

    const rootStyles = getComputedStyle(document.documentElement);
    const orangeAccent =
      rootStyles.getPropertyValue("--knicks-orange-accent").trim() || "#F58426";

    function addTextToPdf(text, x, currentY, options = {}) {
      if (currentY > pageHeight - margin - lineHeight) {
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
      if (options.fontStyle) doc.setFont(undefined, "normal");
      return (
        currentY + lineHeight * ((options.size || originalSize) / originalSize)
      );
    }
    function addBoldTextToPdf(text, x, currentY, options = {}) {
      return addTextToPdf(text, x, currentY, { ...options, fontStyle: "bold" });
    }

    doc.setFontSize(16);
    yPos = addBoldTextToPdf(
      `Client: ${document.getElementById("clientName").value || "N/A"}`,
      margin,
      yPos
    );
    yPos = addBoldTextToPdf(
      `Job #: ${document.getElementById("job").value || "N/A"}`,
      margin,
      yPos
    );
    const cuFtInputVal = document.getElementById("cuFt").value.trim();
    if (cuFtInputVal) {
      yPos = addBoldTextToPdf(`CuFt: ${cuFtInputVal}`, margin, yPos);
    }
    yPos += lineHeight * 0.5;

    doc.setFontSize(10);
    yPos = addBoldTextToPdf("Report Details:", margin, yPos);
    questions.forEach((q) => {
      const selectVal = document.getElementById(q.id).value;
      let textOptions = {};
      if (selectVal === "NO") {
        textOptions.color = "red";
        hasNoAnswers = true;
      }
      yPos = addTextToPdf(`• ${q.text}`, margin, yPos, textOptions);
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
          commentTextarea.value.trim() !== `${q.itemName} (NO):` &&
          commentTextarea.value.trim() !== ""
        ) {
          const commentLines = doc.splitTextToSize(
            `    Comment: ${commentTextarea.value.trim()}`,
            contentWidth - 10
          );
          commentLines.forEach((line) => {
            yPos = addTextToPdf(line, margin + 7, yPos, { color: "red" });
          });
        }
      }
    });

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
        let cuFtPalletAttentionColor = "#000000";

        if (palletsParsed > 0) {
          const difference = palletsParsed * 100 - cuFtParsed;
          if (difference > 100) {
            cuFtPalletAttentionText = `Pallet/CuFt Check: ATTENTION - Difference (${difference.toFixed(
              1
            )}) > 100. Formula: (Pallets * 100) - CuFt.`;
            cuFtPalletAttentionColor = "#FF0000";
          } else if (difference < 0) {
            cuFtPalletAttentionText = `Pallet/CuFt Check: OK - Difference (${difference.toFixed(
              1
            )}) is negative. Formula: (Pallets * 100) - CuFt.`;
          } else {
            cuFtPalletAttentionText = `Pallet/CuFt Check: OK - Difference (${difference.toFixed(
              1
            )}) not over 100 & non-negative. Formula: (Pallets * 100) - CuFt.`;
          }
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
    if (ratingValue < 4) {
      ratingTextOptions.color = "#FF0000";
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
      yPos = addBoldTextToPdf("Attached Photos:", margin, yPos);
      for (const photo of selectedPhotos) {
        if (yPos > pageHeight - margin - 50) {
          doc.addPage();
          yPos = margin;
        }
        try {
          const temp_dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(photo.blob);
          });

          const imgDataUrl = await compressImageForPdf(temp_dataUrl, 1024, 0.7);

          const img = new Image();
          img.src = imgDataUrl;
          await new Promise((r) => (img.onload = r));

          let imgWidth = img.width,
            imgHeight = img.height;
          const maxImgWidth = contentWidth;
          let maxImgHeight = pageHeight - yPos - margin - 5;
          if (photo.comment) maxImgHeight -= 11 * 0.352778 * 2;

          if (imgWidth > maxImgWidth) {
            const r = maxImgWidth / imgWidth;
            imgWidth = maxImgWidth;
            imgHeight *= r;
          }
          if (imgHeight > maxImgHeight) {
            const r = maxImgHeight / imgHeight;
            imgHeight = maxImgHeight;
            imgWidth *= r;
          }
          if (imgHeight <= 0 || imgWidth <= 0) {
            console.warn(
              "Skipping image due to zero dimension:",
              photo.file.name
            );
            continue;
          }

          if (
            yPos + imgHeight + (photo.comment ? 11 * 0.352778 * 2 : 0) >
            pageHeight - margin
          ) {
            doc.addPage();
            yPos = margin;
          }

          const xCentered = (doc.internal.pageSize.width - imgWidth) / 2;
          doc.addImage(
            imgDataUrl,
            "JPEG",
            xCentered,
            yPos,
            imgWidth,
            imgHeight
          );
          yPos += imgHeight + 2;

          if (photo.comment && photo.comment.trim() !== "") {
            if (yPos > pageHeight - margin - 11 * 0.352778 * 2) {
              doc.addPage();
              yPos = margin;
            }
            doc.setFillColor(orangeAccent);
            doc.rect(margin, yPos, 3, 3, "F");
            const commentX = margin + 5;
            const commentMaxWidth = contentWidth - 5;
            doc.setFontSize(11);
            const commentLines = doc.splitTextToSize(
              photo.comment.trim(),
              commentMaxWidth
            );
            commentLines.forEach((line) => {
              if (yPos + 11 * 0.352778 > pageHeight - margin - 5) {
                doc.addPage();
                yPos = margin;
                doc.setFillColor(orangeAccent);
                doc.rect(margin, yPos, 3, 3, "F");
              }
              doc.text(line, commentX, yPos + 2.5);
              yPos += 11 * 0.352778;
            });
            doc.setFontSize(10);
            yPos += 2;
          }
          yPos += 3;
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

    let fileName = `Report-${document.getElementById("job").value || "Custom"}`;
    if (hasNoAnswers) fileName += "_ATTENTION-NO";
    if (ratingValue < 4) fileName += "_RatingLow";
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
          "PDF shared! Also downloading.",
          "success",
          5000
        );
        shared = true;
      } catch (shareError) {
        console.error("Share PDF error:", shareError);
        if (shareError.name !== "AbortError") {
          updateStatusMessage(
            "pdfGenerateStatus",
            "Share failed. Downloading.",
            "error",
            5000
          );
        } else {
          updateStatusMessage(
            "pdfGenerateStatus",
            "Share canceled. Downloading.",
            "success",
            3000
          );
        }
      }
    }

    doc.save(fileName);
    if (!shared) {
      updateStatusMessage(
        "pdfGenerateStatus",
        "PDF downloaded!",
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
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
