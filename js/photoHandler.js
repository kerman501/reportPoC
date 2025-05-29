let selectedPhotos = [];
let cameraPhotoCounter = 0;

function initializePhotoHandling() {
  const takePhotoButton = document.getElementById("takePhotoButton");
  const cameraPhotoInput = document.getElementById("cameraPhotoInput");
  const uploadPhotosButton = document.getElementById("uploadPhotosButton");
  const galleryPhotoInput = document.getElementById("galleryPhotoInput");
  const enablePhotoCommentsToggle = document.getElementById(
    "enablePhotoCommentsToggle"
  );

  if (takePhotoButton) {
    takePhotoButton.addEventListener("click", () => {
      const jobInput = document.getElementById("job");
      if (!jobInput || !jobInput.value.trim()) {
        alert("Please enter a Job Number before taking a photo.");
        return;
      }
      cameraPhotoInput.click();
    });
  }
  if (cameraPhotoInput) {
    cameraPhotoInput.addEventListener("change", (event) =>
      processSelectedFiles(event, true)
    );
  }
  if (uploadPhotosButton) {
    uploadPhotosButton.addEventListener("click", () =>
      galleryPhotoInput.click()
    );
  }
  if (galleryPhotoInput) {
    galleryPhotoInput.addEventListener("change", (event) =>
      processSelectedFiles(event, false)
    );
  }
  if (enablePhotoCommentsToggle) {
    enablePhotoCommentsToggle.addEventListener(
      "change",
      togglePhotoCommentFieldsDOM
    );
  }
}

function getEnablePhotoCommentsState() {
  const toggle = document.getElementById("enablePhotoCommentsToggle");
  return toggle ? toggle.checked : false;
}

function processSelectedFiles(event, isCameraCapture) {
  const files = event.target.files;
  const previewsContainer = document.getElementById("photoPreviews");
  const commentsEnabled = getEnablePhotoCommentsState();

  if (!previewsContainer) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) {
      continue;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const photoId = `photo-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newPhoto = {
        id: photoId,
        file: file,
        originalDataUrl: e.target.result,
        compressedDataUrl: null,
        width: 0,
        height: 0,
        comment: "",
      };
      selectedPhotos.push(newPhoto);

      const previewItem = document.createElement("div");
      previewItem.className = "photo-preview-item";
      if (commentsEnabled) {
        previewItem.classList.add("comments-enabled");
      }
      previewItem.id = photoId;

      const img = document.createElement("img");
      img.src = e.target.result;
      img.onload = () => {
        newPhoto.width = img.naturalWidth;
        newPhoto.height = img.naturalHeight;
      };
      previewItem.appendChild(img);

      const commentTextarea = document.createElement("textarea");
      commentTextarea.className = "photo-comment-textarea";
      commentTextarea.placeholder = "Add a comment...";
      commentTextarea.oninput = (event) => {
        const photoToUpdate = selectedPhotos.find((p) => p.id === photoId);
        if (photoToUpdate) {
          photoToUpdate.comment = event.target.value;
        }
      };
      previewItem.appendChild(commentTextarea);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-photo-button";
      deleteBtn.title = "Delete photo";
      deleteBtn.type = "button";
      deleteBtn.onclick = function () {
        deletePhoto(photoId);
      };
      previewItem.appendChild(deleteBtn);
      previewsContainer.appendChild(previewItem);

      if (isCameraCapture) {
        const filename = generatePhotoFilename(file, true);
        compressAndDownloadImage(file, filename);
      }
    };
    reader.readAsDataURL(file);
  }
  if (event.target) event.target.value = null;
}

function deletePhoto(photoId) {
  selectedPhotos = selectedPhotos.filter((p) => p.id !== photoId);
  const itemToRemove = document.getElementById(photoId);
  if (itemToRemove) itemToRemove.remove();
}

function generatePhotoFilename(originalFile, isCameraCapture) {
  if (!isCameraCapture) return originalFile.name;

  cameraPhotoCounter++;
  const jobNum = document.getElementById("job")?.value.trim() || "NoJob";
  const clientNameRaw = document.getElementById("clientName")?.value.trim();
  const clientName = clientNameRaw
    ? clientNameRaw.replace(/\s+/g, "_")
    : "NoClient";
  const dateStr = getCurrentDateFormatted();
  const extension = originalFile.name.includes(".")
    ? originalFile.name.substring(originalFile.name.lastIndexOf(".") + 1)
    : "jpg";

  return `${jobNum}_${clientName}_${dateStr}_${cameraPhotoCounter}.${extension}`;
}

function triggerPhotoDownload(fileOrBlob, filename) {
  const objectUrl = URL.createObjectURL(fileOrBlob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

async function compressAndDownloadImage(file, filename) {
  const MAX_SIZE_NO_COMPRESSION_KB = 500;
  const MAX_DIM_NO_COMPRESSION_PX = 1920;
  const TARGET_MAX_DIM_PX = 2000;
  const JPEG_QUALITY = 0.8;

  if (file.size / 1024 < MAX_SIZE_NO_COMPRESSION_KB) {
    triggerPhotoDownload(file, filename);
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = async function () {
      const originalWidth = img.width;
      const originalHeight = img.height;

      if (Math.max(originalWidth, originalHeight) < MAX_DIM_NO_COMPRESSION_PX) {
        triggerPhotoDownload(file, filename);
        return;
      }

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (originalWidth > originalHeight) {
        if (originalWidth > TARGET_MAX_DIM_PX) {
          targetHeight = Math.round(
            originalHeight * (TARGET_MAX_DIM_PX / originalWidth)
          );
          targetWidth = TARGET_MAX_DIM_PX;
        }
      } else {
        if (originalHeight > TARGET_MAX_DIM_PX) {
          targetWidth = Math.round(
            originalWidth * (TARGET_MAX_DIM_PX / originalHeight)
          );
          targetHeight = TARGET_MAX_DIM_PX;
        }
      }

      if (targetWidth > originalWidth) targetWidth = originalWidth;
      if (targetHeight > originalHeight) targetHeight = originalHeight;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        function (blob) {
          if (blob) {
            if (blob.size > file.size) {
              triggerPhotoDownload(file, filename);
            } else {
              triggerPhotoDownload(blob, filename);
            }
          } else {
            triggerPhotoDownload(file, filename);
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = function () {
      triggerPhotoDownload(file, filename);
    };
    img.src = event.target.result;
  };
  reader.onerror = function () {
    triggerPhotoDownload(file, filename);
  };
  reader.readAsDataURL(file);
}

function clearPhotoData() {
  selectedPhotos = [];
  cameraPhotoCounter = 0;
  const photoPreviewsContainer = document.getElementById("photoPreviews");
  if (photoPreviewsContainer) photoPreviewsContainer.innerHTML = "";

  const enablePhotoCommentsToggle = document.getElementById(
    "enablePhotoCommentsToggle"
  );
  if (enablePhotoCommentsToggle) enablePhotoCommentsToggle.checked = false;
  togglePhotoCommentFieldsDOM();
}

function getPhotoComment(photoId) {
  const photo = selectedPhotos.find((p) => p.id === photoId);
  return photo ? photo.comment : "";
}
