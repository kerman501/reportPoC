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
  if (!files) return;

  const persistedState = loadFormState();
  const persistedComments = persistedState ? persistedState.photoComments : {};

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue;
    }

    const photoId = `photo-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const previewUrl = URL.createObjectURL(file);

    const newPhoto = {
      id: photoId,
      file: file, // Keep original file for its name
      blob: file,
      previewUrl: previewUrl,
      comment: persistedComments[file.name] || "", // Restore comment if filename matches
    };
    selectedPhotos.push(newPhoto);
    createPhotoPreviewDOM(newPhoto);

    if (isCameraCapture) {
      const filename = generatePhotoFilename(file, true);
      compressAndDownloadImage(file, filename);
      // We are not downloading the photo automatically anymore to avoid confusion.
      // The photo is in the report. If needed, a manual download button could be added per photo.
    }
  }

  if (event.target) event.target.value = null; // Reset file input
  triggerStateSave();
}

function createPhotoPreviewDOM(photo) {
  const previewsContainer = document.getElementById("photoPreviews");
  if (!previewsContainer) return;
  const commentsEnabled = getEnablePhotoCommentsState();

  const previewItem = document.createElement("div");
  previewItem.className = "photo-preview-item";
  if (commentsEnabled) {
    previewItem.classList.add("comments-enabled");
  }
  previewItem.id = photo.id;

  const img = document.createElement("img");
  img.src = photo.previewUrl;
  previewItem.appendChild(img);

  const commentTextarea = document.createElement("textarea");
  commentTextarea.className = "photo-comment-textarea";
  commentTextarea.placeholder = "Add a comment...";
  commentTextarea.value = photo.comment;
  commentTextarea.oninput = () => {
    photo.comment = commentTextarea.value;
    triggerStateSave();
  };
  previewItem.appendChild(commentTextarea);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-photo-button";
  deleteBtn.title = "Delete photo";
  deleteBtn.type = "button";
  deleteBtn.onclick = function () {
    deletePhoto(photo.id);
  };
  previewItem.appendChild(deleteBtn);
  previewsContainer.appendChild(previewItem);
}

function deletePhoto(photoId) {
  const photoIndex = selectedPhotos.findIndex((p) => p.id === photoId);
  if (photoIndex > -1) {
    const photoToDelete = selectedPhotos[photoIndex];
    URL.revokeObjectURL(photoToDelete.previewUrl);
    selectedPhotos.splice(photoIndex, 1);
  }

  const itemToRemove = document.getElementById(photoId);
  if (itemToRemove) itemToRemove.remove();
  triggerStateSave();
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

function clearPhotoData() {
  selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  selectedPhotos = [];
  cameraPhotoCounter = 0;
  const photoPreviewsContainer = document.getElementById("photoPreviews");
  if (photoPreviewsContainer) photoPreviewsContainer.innerHTML = "";

  const enablePhotoCommentsToggle = document.getElementById(
    "enablePhotoCommentsToggle"
  );
  if (enablePhotoCommentsToggle) {
    enablePhotoCommentsToggle.checked = false;
    togglePhotoCommentFieldsDOM();
  }
}

function getPhotoCommentsByFilename() {
  const commentsMap = {};
  selectedPhotos.forEach((photo) => {
    if (photo.file && photo.file.name && photo.comment.trim() !== "") {
      commentsMap[photo.file.name] = photo.comment;
    }
  });
  return commentsMap;
}
