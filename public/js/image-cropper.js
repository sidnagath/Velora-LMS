document.addEventListener("DOMContentLoaded", () => {
  let cropper = null;
  let currentFileInput = null;
  let currentPreviewElement = null;
  let originalFormSubmit = null;
  let isAutoSubmit = false;

  const cropperModal = document.getElementById("cropperModal");
  const cropperImage = document.getElementById("cropperImage");
  const cancelBtn1 = document.getElementById("cropperCancelBtn");
  const cancelBtn2 = document.getElementById("cropperCancelBtn2");
  const cropBtn = document.getElementById("cropperCropBtn");

  if (!cropperModal || !cropperImage) return;

  function closeCropperModal() {
    cropperModal.classList.add("hidden");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropperImage.src = "";
    
    // If the user cancelled, we must clear the file input to prevent
    // uploading the uncropped file, unless it's just an edit form where
    // they didn't intend to submit right away. But to be safe, if we cancel
    // cropping, we should reset the input.
    if (currentFileInput) {
       currentFileInput.value = ""; 
    }

    currentFileInput = null;
    currentPreviewElement = null;
    originalFormSubmit = null;
    isAutoSubmit = false;
  }

  cancelBtn1.addEventListener("click", closeCropperModal);
  cancelBtn2.addEventListener("click", closeCropperModal);

  /**
   * Initializes the image cropper on a file input.
   * @param {HTMLInputElement} fileInput - The file input element.
   * @param {string|null} previewElementId - The ID of the image tag to update with the preview (optional).
   * @param {number} aspectRatio - The aspect ratio (e.g. 1 or 16/9).
   * @param {string|null} autoSubmitFormId - The ID of the form to submit immediately after cropping (optional).
   */
  window.initImageCrop = function (fileInput, previewElementId, aspectRatio = 16 / 9, autoSubmitFormId = null) {
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      fileInput.value = "";
      return;
    }

    currentFileInput = fileInput;
    currentPreviewElement = previewElementId ? document.getElementById(previewElementId) : null;
    
    if (autoSubmitFormId) {
      isAutoSubmit = true;
      originalFormSubmit = document.getElementById(autoSubmitFormId);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImage.src = e.target.result;
      cropperModal.classList.remove("hidden");
      
      cropper = new Cropper(cropperImage, {
        aspectRatio: aspectRatio,
        viewMode: 1, 
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
    };
    reader.readAsDataURL(file);
  };

  cropBtn.addEventListener("click", () => {
    if (!cropper || !currentFileInput) return;

    const canvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) {
      alert("Failed to crop image.");
      return;
    }

    const originalFile = currentFileInput.files[0];
    const mimeType = originalFile.type || "image/jpeg";

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Failed to process cropped image.");
        return;
      }

      // Create a new file from the blob
      const croppedFile = new File([blob], originalFile.name, {
        type: mimeType,
        lastModified: Date.now()
      });

      // Override the file input with the new cropped file
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(croppedFile);
        currentFileInput.files = dataTransfer.files;
        
        if (currentFileInput.files.length === 0) {
          console.warn("DataTransfer failed to assign files.");
        }
      } catch (err) {
        console.error("DataTransfer error:", err);
      }

      // Update the visual preview if provided
      if (currentPreviewElement) {
        currentPreviewElement.src = URL.createObjectURL(blob);
        currentPreviewElement.classList.remove('hidden');
        
        // Hide the SVG placeholder if it exists in the parent
        const parent = currentPreviewElement.parentElement;
        if (parent) {
          const placeholder = parent.querySelector('.preview-placeholder');
          if (placeholder) placeholder.classList.add('hidden');
        }
      }

      // Temporarily nullify the input so closeCropperModal doesn't clear it
      const tempInput = currentFileInput;
      currentFileInput = null;
      const formToSubmit = originalFormSubmit;
      const shouldAutoSubmit = isAutoSubmit;

      closeCropperModal();

      // If auto submit is required, submit the form now
      if (shouldAutoSubmit && formToSubmit) {
        setTimeout(() => {
          formToSubmit.submit();
        }, 100);
      }
    }, mimeType, 0.9);
  });
});
