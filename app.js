const categories = {
  food: {
    name: "美食",
    icon: "🍜",
    title: "今天吃了什么",
    copy: "拍照或上传菜品，自动保留整盘菜，并在右下角生成卡路里角标。",
    card: "整盘菜 + 卡路里",
    bg: "linear-gradient(160deg, #fff0cf, #ffd8bd)",
    emptyTitle: "拍下整盘菜",
    emptyHint: "让盘子在画面中央，系统会尽量保留整盘菜。",
    titlePlaceholder: "例如：番茄牛腩饭",
    placeLabel: "来自哪家店",
    placePlaceholder: "例如：街角小馆",
    extraLabel: "份量/口味",
    extraPlaceholder: "例如：正常份、少油",
    resultCaption: "整盘抠图",
  },
  tea: {
    name: "奶茶",
    icon: "🧋",
    title: "今天喝点甜的",
    copy: "记录奶茶照片，自动生成甜度、冰量和心情标签，做一张饮品小卡。",
    card: "甜度 + 冰量",
    bg: "linear-gradient(160deg, #ffe2ed, #dff3e3)",
    emptyTitle: "拍下这杯奶茶",
    emptyHint: "让杯身露完整，角标会生成今日饮品状态。",
    titlePlaceholder: "例如：茉莉奶绿",
    placeLabel: "来自哪家店",
    placePlaceholder: "例如：喜茶、古茗、楼下奶茶店",
    extraLabel: "糖冰偏好",
    extraPlaceholder: "例如：三分糖、少冰",
    resultCaption: "饮品抠图",
  },
  person: {
    name: "人物",
    icon: "🧑‍🎨",
    title: "今天的我/朋友",
    copy: "保存人物照片，生成氛围标签，适合做穿搭、发型或聚会记录。",
    card: "氛围标签",
    bg: "linear-gradient(160deg, #e5e4ff, #f9dfc9)",
    emptyTitle: "拍下人物瞬间",
    emptyHint: "人物居中会更好，系统会保留中间主体。",
    titlePlaceholder: "例如：周末穿搭",
    placeLabel: "地点",
    placePlaceholder: "例如：咖啡店、公司楼下",
    extraLabel: "氛围",
    extraPlaceholder: "例如：松弛、复古、通勤",
    resultCaption: "人物抠图",
  },
  life: {
    name: "小物",
    icon: "🎁",
    title: "今天遇见的小物",
    copy: "拍下香水、书、礼物或可爱小东西，生成收藏标签。",
    card: "收藏标签",
    bg: "linear-gradient(160deg, #dcefff, #fff3b8)",
    emptyTitle: "拍下小物件",
    emptyHint: "把物品放在干净背景上，卡片会更漂亮。",
    titlePlaceholder: "例如：新买的杯子",
    placeLabel: "来自哪里",
    placePlaceholder: "例如：商场、朋友送的、网购",
    extraLabel: "收藏理由",
    extraPlaceholder: "例如：颜色好看、很实用",
    resultCaption: "小物抠图",
  },
};

const camera = document.querySelector("#camera");
const emptyState = document.querySelector("#emptyState");
const toggleCamera = document.querySelector("#toggleCamera");
const takePhoto = document.querySelector("#takePhoto");
const fileInput = document.querySelector("#fileInput");
const autoCutout = document.querySelector("#autoCutout");
const canvas = document.querySelector("#captureCanvas");
const originalPreview = document.querySelector("#originalPreview");
const cutoutPreview = document.querySelector("#cutoutPreview");
const smartBadge = document.querySelector("#smartBadge");
const recordDate = document.querySelector("#recordDate");
const recordForm = document.querySelector("#recordForm");
const clearForm = document.querySelector("#clearForm");
const saveButton = recordForm.querySelector("button[type=\"submit\"]");
const savedRecordsEl = document.querySelector("#savedRecords");
const homeView = document.querySelector("#homeView");
const studioView = document.querySelector("#studioView");
const savedView = document.querySelector("#savedView");
const categoryGrid = document.querySelector("#categoryGrid");
const studioKicker = document.querySelector("#studioKicker");
const studioTitle = document.querySelector("#studioTitle");
const studioCopy = document.querySelector("#studioCopy");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyHint = document.querySelector("#emptyHint");
const resultCaption = document.querySelector("#resultCaption");
const recordTitle = document.querySelector("#recordTitle");
const recordPlace = document.querySelector("#recordPlace");
const recordExtra = document.querySelector("#recordExtra");
const placeLabel = document.querySelector("#placeLabel");
const extraLabel = document.querySelector("#extraLabel");
const exportJson = document.querySelector("#exportJson");
const editDialog = document.querySelector("#editDialog");
const editForm = document.querySelector("#editForm");
const cancelEdit = document.querySelector("#cancelEdit");

const storeKey = "inspiration-album-records-v2";
let activeCategory = "food";
let previousView = "home";
let cameraStream = null;
let currentOriginal = "";
let currentCutout = "";
let currentBadge = "";

recordDate.value = today();
renderCategories();
renderRecords();

categoryGrid.addEventListener("click", (event) => {
  const card = event.target.closest("button[data-category]");
  if (!card) return;
  openStudio(card.dataset.category);
});

document.querySelector("#backHome").addEventListener("click", showHome);
document.querySelector("#openSavedFromHome").addEventListener("click", () => showSaved("home"));
document.querySelector("#openSavedFromStudio").addEventListener("click", () => showSaved("studio"));
document.querySelector("#backFromSaved").addEventListener("click", () => {
  if (previousView === "studio") showStudioOnly();
  else showHome();
});

toggleCamera.addEventListener("click", async () => {
  if (cameraStream) {
    stopCamera();
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    camera.srcObject = cameraStream;
    camera.classList.add("active");
    emptyState.hidden = true;
    takePhoto.disabled = false;
    toggleCamera.textContent = "关闭相机";
  } catch (error) {
    alert("无法打开相机，请检查浏览器权限，或改用上传照片。");
  }
});

takePhoto.addEventListener("click", () => {
  if (!camera.videoWidth) return;
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
  setImage(canvas.toDataURL("image/jpeg", 0.92), today());
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFile(file);
  const compactUrl = await compressDataUrl(dataUrl, 1200, 0.82);
  setImage(compactUrl, toDateInputValue(new Date(file.lastModified || Date.now())));
});

autoCutout.addEventListener("click", async () => {
  if (!currentOriginal) return;
  autoCutout.disabled = true;
  autoCutout.textContent = "处理中";
  try {
    const result = await makeCutout(currentOriginal, activeCategory);
    currentCutout = result.image;
    currentBadge = createBadge(activeCategory, recordTitle.value);
    cutoutPreview.src = currentCutout;
    smartBadge.textContent = currentBadge;
    smartBadge.hidden = false;
  } finally {
    autoCutout.disabled = false;
    autoCutout.textContent = "自动抠图";
  }
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentOriginal) {
    alert("请先拍照或上传照片。");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "保存中";

  try {
    if (!currentCutout) {
      const result = await makeCutout(currentOriginal, activeCategory);
      currentCutout = result.image;
    }
    if (!currentBadge) currentBadge = createBadge(activeCategory, recordTitle.value);
    const storedImage = await compressDataUrl(currentCutout || currentOriginal, 720, 0.78);

  const form = new FormData(recordForm);
  const title = String(form.get("recordTitle") || "").trim() || defaultTitle(activeCategory);
  const record = {
    id: crypto.randomUUID(),
    category: activeCategory,
    date: form.get("recordDate"),
    title,
    place: String(form.get("recordPlace") || "").trim(),
    extra: String(form.get("recordExtra") || "").trim(),
    notes: String(form.get("recordNotes") || "").trim(),
    badge: currentBadge,
    original: "",
    cutout: storedImage,
    createdAt: new Date().toISOString(),
  };

  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
  resetCapture();
  renderRecords();
  showSaved("studio");
  } catch (error) {
    console.error(error);
    alert("保存失败：图片太大或浏览器存储空间不足。请刷新页面后重试，或先删除一些旧记录。");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "保存这张";
  }
});

clearForm.addEventListener("click", () => {
  recordForm.reset();
  recordDate.value = today();
  applyCategory(activeCategory);
});

savedRecordsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const records = loadRecords();
  const record = records.find((item) => item.id === id);
  if (!record) return;

  if (button.dataset.action === "edit") {
    document.querySelector("#editId").value = record.id;
    document.querySelector("#editDate").value = record.date;
    document.querySelector("#editTitle").value = record.title;
    document.querySelector("#editPlace").value = record.place;
    document.querySelector("#editExtra").value = record.extra;
    document.querySelector("#editNotes").value = record.notes;
    editDialog.showModal();
  }

  if (button.dataset.action === "delete") {
    saveRecords(records.filter((item) => item.id !== id));
    renderRecords();
  }
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.querySelector("#editId").value;
  const records = loadRecords().map((record) => {
    if (record.id !== id) return record;
    return {
      ...record,
      date: document.querySelector("#editDate").value,
      title: document.querySelector("#editTitle").value.trim() || defaultTitle(record.category),
      place: document.querySelector("#editPlace").value.trim(),
      extra: document.querySelector("#editExtra").value.trim(),
      notes: document.querySelector("#editNotes").value.trim(),
    };
  });
  saveRecords(records);
  editDialog.close();
  renderRecords();
});

cancelEdit.addEventListener("click", () => editDialog.close());

exportJson.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadRecords(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inspiration-records-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

function renderCategories() {
  categoryGrid.innerHTML = Object.entries(categories)
    .map(([key, category]) => `
      <button class="category-card" type="button" data-category="${key}" data-icon="${category.icon}" style="--card-bg: ${category.bg}">
        <span class="category-pill">${escapeHtml(category.card)}</span>
        <div>
          <h3>${escapeHtml(category.name)}</h3>
          <p>${escapeHtml(category.copy)}</p>
        </div>
      </button>`)
    .join("");
}

function openStudio(categoryKey) {
  activeCategory = categoryKey;
  applyCategory(categoryKey);
  showStudioOnly();
}

function applyCategory(categoryKey) {
  const category = categories[categoryKey];
  studioKicker.textContent = category.name;
  studioTitle.textContent = category.title;
  studioCopy.textContent = category.copy;
  emptyTitle.textContent = category.emptyTitle;
  emptyHint.textContent = category.emptyHint;
  resultCaption.textContent = category.resultCaption;
  recordTitle.placeholder = category.titlePlaceholder;
  recordPlace.placeholder = category.placePlaceholder;
  recordExtra.placeholder = category.extraPlaceholder;
  placeLabel.textContent = category.placeLabel;
  extraLabel.textContent = category.extraLabel;
}

function showHome() {
  previousView = "home";
  homeView.hidden = false;
  studioView.hidden = true;
  savedView.hidden = true;
}

function showStudioOnly() {
  previousView = "studio";
  homeView.hidden = true;
  studioView.hidden = false;
  savedView.hidden = true;
}

function showSaved(from) {
  previousView = from;
  renderRecords();
  homeView.hidden = true;
  studioView.hidden = true;
  savedView.hidden = false;
}

function setImage(dataUrl, dateValue) {
  currentOriginal = dataUrl;
  currentCutout = "";
  currentBadge = "";
  originalPreview.src = dataUrl;
  cutoutPreview.removeAttribute("src");
  smartBadge.hidden = true;
  recordDate.value = dateValue;
  autoCutout.disabled = false;
}

function resetCapture() {
  recordForm.reset();
  recordDate.value = today();
  currentOriginal = "";
  currentCutout = "";
  currentBadge = "";
  originalPreview.removeAttribute("src");
  cutoutPreview.removeAttribute("src");
  smartBadge.hidden = true;
  autoCutout.disabled = true;
  fileInput.value = "";
  applyCategory(activeCategory);
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  camera.srcObject = null;
  camera.classList.remove("active");
  emptyState.hidden = false;
  takePhoto.disabled = true;
  toggleCamera.textContent = "打开相机";
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressDataUrl(src, maxSize = 1200, quality = 0.82) {
  const image = await loadImage(src);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function makeCutout(src, categoryKey) {
  const image = await loadImage(src);
  const maxSize = 1000;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const subjectGuard = getSubjectGuard(data, width, height, categoryKey);
  const backgroundMask = traceConnectedBackground(data, width, height, subjectGuard);
  clearProtectedMask(backgroundMask, width, height, subjectGuard);

  for (let i = 0; i < backgroundMask.length; i += 1) {
    if (backgroundMask[i]) data[i * 4 + 3] = 0;
  }

  featherBackgroundEdge(data, backgroundMask, width, height);
  ctx.putImageData(imageData, 0, 0);
  const webp = canvas.toDataURL("image/webp", 0.86);
  return { image: webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png") };
}

function getSubjectGuard(data, width, height, categoryKey) {
  if (categoryKey === "food") {
    const detected = detectPlateBounds(data, width, height, edgeSamples(data, width, height));
    return {
      cx: detected.cx,
      cy: detected.cy,
      rx: Math.max(detected.rx, width * 0.43),
      ry: Math.max(detected.ry, height * 0.4),
    };
  }
  return defaultSubjectBounds(width, height, categoryKey);
}

function clearProtectedMask(mask, width, height, guard) {
  if (!guard) return;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isProtectedSubjectPoint(x, y, guard)) mask[y * width + x] = 0;
    }
  }
}
function traceConnectedBackground(data, width, height, subjectGuard) {
  const total = width * height;
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = [];
  const samples = collectBorderSamples(data, width, height);
  const threshold = estimateBackgroundThreshold(samples);

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const point = y * width + x;
    if (visited[point]) return;
    visited[point] = 1;
    const index = point * 4;
    if (isBackgroundPixel(data, index, samples, threshold)) {
      mask[point] = 1;
      queue.push(point);
    }
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const point = queue[cursor];
    cursor += 1;
    const x = point % width;
    const y = Math.floor(point / width);
    visitNeighbor(x + 1, y);
    visitNeighbor(x - 1, y);
    visitNeighbor(x, y + 1);
    visitNeighbor(x, y - 1);
  }

  const removedRatio = mask.reduce((sum, value) => sum + value, 0) / total;
  if (removedRatio > 0.82) {
    return traceConnectedBackgroundConservative(data, width, height, samples, subjectGuard);
  }

  function visitNeighbor(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const point = y * width + x;
    if (visited[point]) return;
    visited[point] = 1;
    const index = point * 4;
    if (isBackgroundPixel(data, index, samples, threshold)) {
      mask[point] = 1;
      queue.push(point);
    }
  }

  return mask;
}

function traceConnectedBackgroundConservative(data, width, height, samples, subjectGuard) {
  const total = width * height;
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = [];
  const threshold = 30;

  function enqueue(x, y) {
    const point = y * width + x;
    if (visited[point]) return;
    visited[point] = 1;
    const index = point * 4;
    if (isBackgroundPixel(data, index, samples, threshold)) {
      mask[point] = 1;
      queue.push(point);
    }
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const point = queue[cursor];
    cursor += 1;
    const x = point % width;
    const y = Math.floor(point / width);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nextPoint = ny * width + nx;
      if (visited[nextPoint]) continue;
      visited[nextPoint] = 1;
      const index = nextPoint * 4;
      if (isBackgroundPixel(data, index, samples, threshold)) {
        mask[nextPoint] = 1;
        queue.push(nextPoint);
      }
    }
  }

  return mask;
}
function isProtectedSubjectPoint(x, y, guard) {
  if (!guard) return false;
  const dx = (x - guard.cx) / (guard.rx * 0.92);
  const dy = (y - guard.cy) / (guard.ry * 0.92);
  return dx * dx + dy * dy <= 1;
}
function collectBorderSamples(data, width, height) {
  const samples = [];
  const step = Math.max(4, Math.floor(Math.min(width, height) / 80));
  for (let x = 0; x < width; x += step) {
    pushSample(x, 0);
    pushSample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    pushSample(0, y);
    pushSample(width - 1, y);
  }

  function pushSample(x, y) {
    const index = (y * width + x) * 4;
    samples.push([data[index], data[index + 1], data[index + 2]]);
  }

  return samples;
}

function estimateBackgroundThreshold(samples) {
  if (samples.length < 2) return 48;
  const center = samples.reduce(
    (sum, sample) => [sum[0] + sample[0], sum[1] + sample[1], sum[2] + sample[2]],
    [0, 0, 0],
  ).map((value) => value / samples.length);
  const averageDistance = samples.reduce((sum, sample) => {
    const dr = sample[0] - center[0];
    const dg = sample[1] - center[1];
    const db = sample[2] - center[2];
    return sum + Math.sqrt(dr * dr + dg * dg + db * db);
  }, 0) / samples.length;
  return Math.max(28, Math.min(54, 26 + averageDistance * 0.28));
}

function isBackgroundPixel(data, index, samples, threshold) {
  let nearest = Infinity;
  for (const sample of samples) {
    nearest = Math.min(nearest, colorDistance(data, index, sample));
    if (nearest <= threshold) return true;
  }
  return false;
}

function isLowDetailPixel(data, x, y, width, height) {
  if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return true;
  const index = (y * width + x) * 4;
  const right = (y * width + x + 1) * 4;
  const down = ((y + 1) * width + x) * 4;
  const horizontal = colorDistance(data, index, [data[right], data[right + 1], data[right + 2]]);
  const vertical = colorDistance(data, index, [data[down], data[down + 1], data[down + 2]]);
  return horizontal + vertical < 42;
}

function featherBackgroundEdge(data, mask, width, height) {
  const originalAlpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < originalAlpha.length; i += 1) originalAlpha[i] = data[i * 4 + 3];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const point = y * width + x;
      if (mask[point]) continue;
      const nearBackground =
        mask[point - 1] + mask[point + 1] + mask[point - width] + mask[point + width] +
        mask[point - width - 1] + mask[point - width + 1] + mask[point + width - 1] + mask[point + width + 1];
      if (nearBackground > 0) {
        data[point * 4 + 3] = Math.max(80, Math.round(originalAlpha[point] * (1 - nearBackground * 0.055)));
      }
    }
  }
}
function defaultSubjectBounds(width, height, categoryKey) {
  const presets = {
    tea: { rx: 0.43, ry: 0.49, cy: 0.52 },
    person: { rx: 0.42, ry: 0.5, cy: 0.5 },
    life: { rx: 0.43, ry: 0.43, cy: 0.52 },
  };
  const preset = presets[categoryKey] || { rx: 0.4, ry: 0.42, cy: 0.5 };
  return { cx: width / 2, cy: height * preset.cy, rx: width * preset.rx, ry: height * preset.ry };
}

function detectPlateBounds(data, width, height, samples) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  const step = Math.max(3, Math.floor(Math.min(width, height) / 180));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const centerBias = distanceFromCenter(x, y, width, height);
      const differsFromBackground = samples.every((sample) => colorDistance(data, index, sample) > 38);
      if (differsFromBackground && centerBias < 0.55) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
  }

  if (count < 80) return { cx: width / 2, cy: height / 2, rx: width * 0.43, ry: height * 0.43 };
  const pad = Math.min(width, height) * 0.13;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.min(width * 0.49, Math.max((maxX - minX) / 2 + pad, width * 0.28)),
    ry: Math.min(height * 0.49, Math.max((maxY - minY) / 2 + pad, height * 0.28)),
  };
}

function defaultTitle(categoryKey) {
  const names = {
    food: "未命名美食",
    tea: "未命名奶茶",
    person: "未命名人物",
    life: "未命名小物",
  };
  return names[categoryKey] || "未命名记录";
}
function createBadge(categoryKey, title) {
  if (categoryKey === "food") return `${estimateCalories(title)} kcal`;
  if (categoryKey === "tea") return pick(["三分糖", "少冰", "今日续命", "清爽杯", "甜度刚好"]);
  if (categoryKey === "person") return pick(["松弛感", "今日穿搭", "氛围感", "好状态", "出片"]);
  return pick(["新收藏", "可爱小物", "灵感+1", "值得留下", "心动"]);
}

function estimateCalories(title) {
  const text = String(title || "");
  const rules = [
    [/炸|薯|汉堡|披萨|烤肉|火锅/, 760],
    [/饭|面|粉|拉面|盖浇|炒饭/, 620],
    [/牛|羊|鸡|肉|排骨|鱼/, 520],
    [/沙拉|轻食|蔬菜|水果/, 280],
    [/甜品|蛋糕|冰淇淋|奶油/, 430],
    [/粥|汤|豆腐/, 260],
  ];
  const match = rules.find(([regex]) => regex.test(text));
  const base = match ? match[1] : 480;
  return base + Math.floor(Math.random() * 61) - 30;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function edgeSamples(data, width, height) {
  return [
    [0.04, 0.04], [0.5, 0.04], [0.96, 0.04], [0.04, 0.5],
    [0.96, 0.5], [0.04, 0.96], [0.5, 0.96], [0.96, 0.96],
  ].map(([px, py]) => {
    const x = Math.floor(width * px);
    const y = Math.floor(height * py);
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  });
}

function colorDistance(data, index, sample) {
  const dr = data[index] - sample[0];
  const dg = data[index + 1] - sample[1];
  const db = data[index + 2] - sample[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function distanceFromCenter(x, y, width, height) {
  const dx = (x - width / 2) / width;
  const dy = (y - height / 2) / height;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointInEllipse(x, y, ellipse) {
  const dx = (x - ellipse.cx) / ellipse.rx;
  const dy = (y - ellipse.cy) / ellipse.ry;
  return dx * dx + dy * dy <= 1;
}

function ellipseFade(x, y, ellipse) {
  const dx = (x - ellipse.cx) / ellipse.rx;
  const dy = (y - ellipse.cy) / ellipse.ry;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.9) return 1;
  return Math.max(0, 1 - (distance - 0.9) / 0.1);
}

function softenAlpha(data, width, height) {
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const avg = (alpha[i] + alpha[i - 1] + alpha[i + 1] + alpha[i - width] + alpha[i + width]) / 5;
      data[i * 4 + 3] = avg;
    }
  }
}

function loadRecords() {
  const current = JSON.parse(localStorage.getItem(storeKey) || "[]");
  if (current.length) return current;

  const legacy = JSON.parse(localStorage.getItem("food-cutout-records-v1") || "[]");
  if (!legacy.length) return [];

  const migrated = legacy.map((record) => ({
    id: record.id || crypto.randomUUID(),
    category: "food",
    date: record.date,
    title: record.food || "未命名美食",
    place: record.shop || "",
    extra: record.notes || "",
    notes: record.notes || "",
    badge: record.badge || `${estimateCalories(record.food)} kcal`,
    original: record.original,
    cutout: record.cutout || record.original,
    createdAt: record.createdAt || new Date().toISOString(),
  }));
  localStorage.setItem(storeKey, JSON.stringify(migrated));
  return migrated;
}

function saveRecords(records) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(records));
  } catch (error) {
    const compactRecords = records.map((record, index) => ({
      ...record,
      original: "",
      cutout: index === 0 ? record.cutout : "",
    }));
    localStorage.setItem(storeKey, JSON.stringify(compactRecords));
  }
}

function renderRecords() {
  const records = loadRecords();
  savedRecordsEl.innerHTML = records.length ? records.map(recordTemplate).join("") : '<p class="record-text">还没有保存记录。</p>';
}

function recordTemplate(record) {
  const category = categories[record.category] || categories.food;
  return `
    <article class="record-card">
      <div class="record-image-wrap">
        <img src="${escapeAttr(record.cutout || record.original)}" alt="${escapeAttr(record.title)}" />
        <span class="record-badge">${escapeHtml(record.badge || "已记录")}</span>
      </div>
      <div class="record-body">
        <div class="record-meta">
          <span>${escapeHtml(category.icon)} ${escapeHtml(category.name)}</span>
          <time>${escapeHtml(record.date)}</time>
        </div>
        <strong class="record-title">${escapeHtml(record.title)}</strong>
        <p class="record-text">${escapeHtml(record.place || "未填写来源")}</p>
        <p class="record-text">${escapeHtml(record.extra || record.notes || "无备注")}</p>
        <div class="record-actions">
          <button type="button" data-action="edit" data-id="${record.id}">编辑</button>
          <button type="button" data-action="delete" data-id="${record.id}">删除</button>
        </div>
      </div>
    </article>`;
}

function today() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
















