// ============================================
// Element references
// ============================================
const imageInput = document.getElementById("imageInput");
const originalPreview = document.getElementById("originalPreview");
const processedPreview = document.getElementById("processedPreview");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

const grayscaleBtn = document.getElementById("grayscaleBtn");
const infoBtn = document.getElementById("infoBtn");
const imageInfoBox = document.getElementById("imageInfoBox");

const threshold1 = document.getElementById("threshold1");
const threshold2 = document.getElementById("threshold2");
const t1Val = document.getElementById("t1Val");
const t2Val = document.getElementById("t2Val");
const edgeBtn = document.getElementById("edgeBtn");

const kernelSize = document.getElementById("kernelSize");
const kernelVal = document.getElementById("kernelVal");
const gaussianBtn = document.getElementById("gaussianBtn");
const medianBtn = document.getElementById("medianBtn");

// ============================================
// Pipeline state
// ============================================
let originalFile = null;
let currentImage = null;
let history = [];

function updateButtons() {
  undoBtn.disabled = history.length === 0;
}

// ============================================
// Upload handler
// ============================================
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file.");
    imageInput.value = "";
    return;
  }

  originalFile = file;
  currentImage = file;
  history = [];
  imageInfoBox.innerHTML = "";
  histogramImg.style.display = "none";

  originalPreview.src = URL.createObjectURL(file);
  processedPreview.src = URL.createObjectURL(file);
  updateButtons();
});

// ============================================
// Undo / Reset
// ============================================
undoBtn.addEventListener("click", () => {
  if (history.length === 0) return;
  currentImage = history.pop();
  processedPreview.src = URL.createObjectURL(currentImage);
  updateButtons();
});

resetBtn.addEventListener("click", () => {
  if (!originalFile) return;
  currentImage = originalFile;
  history = [];
  processedPreview.src = URL.createObjectURL(originalFile);
  updateButtons();
});

// ============================================
// Loading overlay helpers
// ============================================
const loadingOverlay = document.getElementById("loadingOverlay");
let activeRequests = 0;

function showLoading() {
  activeRequests++;
  loadingOverlay.style.display = "flex";
}

function hideLoading() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    loadingOverlay.style.display = "none";
  }
}

async function extractErrorMessage(res) {
  try {
    const data = await res.json();
    return data.detail || data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

// ============================================
// Shared processing function
// ============================================
async function processImage(url) {
  if (!currentImage) {
    alert("Please upload an image first.");
    return;
  }

  showLoading();
  try {
    const formData = new FormData();
    formData.append("file", currentImage, "image.png");

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert(await extractErrorMessage(res));
      return;
    }

    const blob = await res.blob();

    history.push(currentImage);
    currentImage = blob;
    processedPreview.src = URL.createObjectURL(blob);
    updateButtons();
  } catch (err) {
    alert("Network error: could not reach the server. Is it still running?");
  } finally {
    hideLoading();
  }
}

// ============================================
// Live Preview (debounced, does NOT commit to pipeline)
// ============================================
function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function previewImage(url) {
  if (!currentImage) return;

  showLoading();
  try {
    const formData = new FormData();
    formData.append("file", currentImage, "image.png");

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return;

    const blob = await res.blob();
    processedPreview.src = URL.createObjectURL(blob);
    // Note: currentImage and history are NOT touched here — this is preview-only
  } catch (err) {
    // Silent fail on live preview — the Apply click will surface real errors
  } finally {
    hideLoading();
  }
}

const debouncedPreview = debounce(previewImage, 150);

// ============================================
// Grayscale
// ============================================
grayscaleBtn.addEventListener("click", () => {
  processImage("/grayscale");
});

// ============================================
// Image Info (always reflects current pipeline state)
// ============================================
infoBtn.addEventListener("click", async () => {
  if (!currentImage) {
    alert("Please upload an image first.");
    return;
  }

  showLoading();
  try {
    const formData = new FormData();
    formData.append("file", currentImage, "image.png");

    const res = await fetch("/image-info", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert(await extractErrorMessage(res));
      return;
    }

    const data = await res.json();

    imageInfoBox.innerHTML = `
      <b>Width:</b> ${data.width}px<br/>
      <b>Height:</b> ${data.height}px<br/>
      <b>Resolution:</b> ${data.resolution}<br/>
      <b>File size:</b> ${data.file_size_kb} KB<br/>
      <b>Channels:</b> ${data.channels}
    `;
  } catch (err) {
    alert("Network error: could not reach the server.");
  } finally {
    hideLoading();
  }
});

// ============================================
// Edge Detection (Canny)
// ============================================
threshold1.addEventListener("input", () => {
  t1Val.textContent = threshold1.value;
});

threshold2.addEventListener("input", () => {
  t2Val.textContent = threshold2.value;
});

edgeBtn.addEventListener("click", () => {
  processImage(`/edge-detection?threshold1=${threshold1.value}&threshold2=${threshold2.value}`);
});

// ============================================
// Blur Filters
// ============================================
kernelSize.addEventListener("input", () => {
  kernelVal.textContent = kernelSize.value;
});

gaussianBtn.addEventListener("click", () => {
  processImage("/blur/gaussian?kernel_size=" + kernelSize.value);
});

medianBtn.addEventListener("click", () => {
  processImage("/blur/median?kernel_size=" + kernelSize.value);
});

// ============================================
// Thresholding
// ============================================
const threshValue = document.getElementById("threshValue");
const threshVal = document.getElementById("threshVal");
const binaryThreshBtn = document.getElementById("binaryThreshBtn");

const blockSize = document.getElementById("blockSize");
const blockVal = document.getElementById("blockVal");
const cValue = document.getElementById("cValue");
const cVal = document.getElementById("cVal");
const adaptiveThreshBtn = document.getElementById("adaptiveThreshBtn");

threshValue.addEventListener("input", () => {
  threshVal.textContent = threshValue.value;
});

blockSize.addEventListener("input", () => {
  blockVal.textContent = blockSize.value;
});

cValue.addEventListener("input", () => {
  cVal.textContent = cValue.value;
});

binaryThreshBtn.addEventListener("click", () => {
  processImage(`/threshold/binary?thresh_value=${threshValue.value}`);
});

adaptiveThreshBtn.addEventListener("click", () => {
  processImage(`/threshold/adaptive?block_size=${blockSize.value}&c=${cValue.value}`);
});

// ============================================
// Crop state (declared BEFORE Drawing Tools, since
// the drawing listeners below need to check cropModeToggle)
// ============================================
const cropModeToggle = document.getElementById("cropModeToggle");
const applyCropBtn = document.getElementById("applyCropBtn");

let cropBox = null; // {x1, y1, x2, y2} in canvas coordinates
let isCropping = false;

// ============================================
// Drawing Tools
// ============================================
const drawCanvas = document.getElementById("drawCanvas");
const ctx = drawCanvas.getContext("2d");
const shapeType = document.getElementById("shapeType");
const drawColor = document.getElementById("drawColor");
const drawThickness = document.getElementById("drawThickness");
const textInputWrapper = document.getElementById("textInputWrapper");
const drawText = document.getElementById("drawText");

shapeType.addEventListener("change", () => {
  textInputWrapper.style.display = shapeType.value === "text" ? "block" : "none";
});

let isDrawing = false;
let startX = 0, startY = 0;

// Keep canvas sized exactly like the displayed image
function syncCanvasSize() {
  drawCanvas.width = processedPreview.clientWidth;
  drawCanvas.height = processedPreview.clientHeight;
}
processedPreview.addEventListener("load", syncCanvasSize);

drawCanvas.addEventListener("mousedown", (e) => {
  if (cropModeToggle.checked) return;

  const rect = drawCanvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  if (shapeType.value === "text") {
    submitDrawing(startX, startY, startX, startY);
    return;
  }

  isDrawing = true;
});

drawCanvas.addEventListener("mousemove", (e) => {
  if (cropModeToggle.checked) return;
  if (!isDrawing) return;

  const rect = drawCanvas.getBoundingClientRect();
  const curX = e.clientX - rect.left;
  const curY = e.clientY - rect.top;

  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.strokeStyle = drawColor.value;
  ctx.lineWidth = drawThickness.value;

  if (shapeType.value === "rectangle") {
    ctx.strokeRect(startX, startY, curX - startX, curY - startY);
  } else if (shapeType.value === "circle") {
    const radius = Math.hypot(curX - startX, curY - startY);
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shapeType.value === "line") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
  }
});

drawCanvas.addEventListener("mouseup", (e) => {
  if (cropModeToggle.checked) return;
  if (!isDrawing) return;

  isDrawing = false;

  const rect = drawCanvas.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  submitDrawing(startX, startY, endX, endY);
});

async function submitDrawing(x1, y1, x2, y2) {
  // Scale canvas coordinates to actual image pixel coordinates
  const scaleX = processedPreview.naturalWidth / drawCanvas.width;
  const scaleY = processedPreview.naturalHeight / drawCanvas.height;

  const rx1 = Math.round(x1 * scaleX);
  const ry1 = Math.round(y1 * scaleY);
  const rx2 = Math.round(x2 * scaleX);
  const ry2 = Math.round(y2 * scaleY);

  const color = drawColor.value.replace("#", "");
  const thickness = drawThickness.value;

  let url;
  if (shapeType.value === "rectangle") {
    url = `/draw/rectangle?x1=${rx1}&y1=${ry1}&x2=${rx2}&y2=${ry2}&color=${color}&thickness=${thickness}`;
  } else if (shapeType.value === "circle") {
    const radius = Math.round(Math.hypot(rx2 - rx1, ry2 - ry1));
    url = `/draw/circle?cx=${rx1}&cy=${ry1}&radius=${radius}&color=${color}&thickness=${thickness}`;
  } else if (shapeType.value === "line") {
    url = `/draw/line?x1=${rx1}&y1=${ry1}&x2=${rx2}&y2=${ry2}&color=${color}&thickness=${thickness}`;
  } else if (shapeType.value === "text") {
    const text = encodeURIComponent(drawText.value);
    url = `/draw/text?text=${text}&x=${rx1}&y=${ry1}&color=${color}&font_scale=1.0&thickness=${thickness}`;
  }

  await processImage(url);
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); // clear the temp preview shape
}

// ============================================
// Cropping (reuses drawCanvas)
// ============================================
drawCanvas.addEventListener("mousedown", (e) => {
  if (!cropModeToggle.checked) return;

  const rect = drawCanvas.getBoundingClientRect();
  cropBox = {
    x1: e.clientX - rect.left,
    y1: e.clientY - rect.top,
    x2: e.clientX - rect.left,
    y2: e.clientY - rect.top,
  };
  isCropping = true;
});

drawCanvas.addEventListener("mousemove", (e) => {
  if (!cropModeToggle.checked || !isCropping || !cropBox) return;

  const rect = drawCanvas.getBoundingClientRect();
  cropBox.x2 = e.clientX - rect.left;
  cropBox.y2 = e.clientY - rect.top;

  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(
    cropBox.x1,
    cropBox.y1,
    cropBox.x2 - cropBox.x1,
    cropBox.y2 - cropBox.y1
  );
  ctx.setLineDash([]);
});

drawCanvas.addEventListener("mouseup", () => {
  if (!cropModeToggle.checked) return;
  isCropping = false;
});

applyCropBtn.addEventListener("click", () => {
  if (!cropBox) {
    alert("Enable crop mode and drag a selection on the image first.");
    return;
  }

  const scaleX = processedPreview.naturalWidth / drawCanvas.width;
  const scaleY = processedPreview.naturalHeight / drawCanvas.height;

  const rx1 = Math.round(Math.min(cropBox.x1, cropBox.x2) * scaleX);
  const ry1 = Math.round(Math.min(cropBox.y1, cropBox.y2) * scaleY);
  const rx2 = Math.round(Math.max(cropBox.x1, cropBox.x2) * scaleX);
  const ry2 = Math.round(Math.max(cropBox.y1, cropBox.y2) * scaleY);

  processImage(`/crop?x1=${rx1}&y1=${ry1}&x2=${rx2}&y2=${ry2}`);

  cropBox = null;
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  cropModeToggle.checked = false;
});

// ============================================
// Image Saving
// ============================================
const downloadBtn = document.getElementById("downloadBtn");

downloadBtn.addEventListener("click", () => {
  if (!currentImage) {
    alert("Please upload an image first.");
    return;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(currentImage);
  link.download = `vision-toolkit-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ============================================
// Brightness / Contrast
// ============================================
const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const brightVal = document.getElementById("brightVal");
const contrastVal = document.getElementById("contrastVal");
const adjustBtn = document.getElementById("adjustBtn");

function updateBrightContrastPreview() {
  brightVal.textContent = brightness.value;
  contrastVal.textContent = contrast.value;
  debouncedPreview(`/adjust?brightness=${brightness.value}&contrast=${contrast.value}`);
}

brightness.addEventListener("input", updateBrightContrastPreview);
contrast.addEventListener("input", updateBrightContrastPreview);

adjustBtn.addEventListener("click", () => {
  processImage(`/adjust?brightness=${brightness.value}&contrast=${contrast.value}`);
});

// ============================================
// Rotate & Resize
// ============================================
const rotateAngle = document.getElementById("rotateAngle");
const rotateVal = document.getElementById("rotateVal");
const rotateBtn = document.getElementById("rotateBtn");

const resizeScale = document.getElementById("resizeScale");
const resizeVal = document.getElementById("resizeVal");
const resizeBtn = document.getElementById("resizeBtn");

rotateAngle.addEventListener("input", () => {
  rotateVal.textContent = rotateAngle.value;
  debouncedPreview(`/rotate?angle=${rotateAngle.value}`);
});

resizeScale.addEventListener("input", () => {
  resizeVal.textContent = resizeScale.value;
  debouncedPreview(`/resize?scale_percent=${resizeScale.value}`);
});

rotateBtn.addEventListener("click", () => {
  processImage(`/rotate?angle=${rotateAngle.value}`);
});

resizeBtn.addEventListener("click", () => {
  processImage(`/resize?scale_percent=${resizeScale.value}`);
});

// ============================================
// Histogram
// ============================================
const histogramBtn = document.getElementById("histogramBtn");
const histogramImg = document.getElementById("histogramImg");

histogramBtn.addEventListener("click", async () => {
  if (!currentImage) {
    alert("Please upload an image first.");
    return;
  }

  showLoading();
  try {
    const formData = new FormData();
    formData.append("file", currentImage, "image.png");

    const res = await fetch("/histogram", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert(await extractErrorMessage(res));
      return;
    }

    const blob = await res.blob();
    histogramImg.src = URL.createObjectURL(blob);
    histogramImg.style.display = "block";
  } catch (err) {
    alert("Network error: could not reach the server.");
  } finally {
    hideLoading();
  }
});

// ============================================
// Webcam Capture
// ============================================
const webcamVideo = document.getElementById("webcamVideo");
const webcamCanvas = document.getElementById("webcamCanvas");
const startWebcamBtn = document.getElementById("startWebcamBtn");
const captureBtn = document.getElementById("captureBtn");
const stopWebcamBtn = document.getElementById("stopWebcamBtn");

let webcamStream = null;

startWebcamBtn.addEventListener("click", async () => {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamVideo.srcObject = webcamStream;
    webcamVideo.style.display = "block";
    captureBtn.style.display = "block";
    stopWebcamBtn.style.display = "block";
    startWebcamBtn.style.display = "none";
  } catch (err) {
    alert("Could not access webcam: " + err.message);
  }
});

captureBtn.addEventListener("click", () => {
  webcamCanvas.width = webcamVideo.videoWidth;
  webcamCanvas.height = webcamVideo.videoHeight;
  const ctx2 = webcamCanvas.getContext("2d");
  ctx2.drawImage(webcamVideo, 0, 0);

  webcamCanvas.toBlob((blob) => {
    originalFile = blob;
    currentImage = blob;
    history = [];

    originalPreview.src = URL.createObjectURL(blob);
    processedPreview.src = URL.createObjectURL(blob);
    updateButtons();
  }, "image/png");
});

stopWebcamBtn.addEventListener("click", () => {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
  }
  webcamVideo.style.display = "none";
  captureBtn.style.display = "none";
  stopWebcamBtn.style.display = "none";
  startWebcamBtn.style.display = "block";
});