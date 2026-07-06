const storeKey = "food-daily-widget-records-v3";
const backgroundKey = "food-daily-widget-background";
const legacyKeys = ["inspiration-album-records-v2", "food-cutout-records-v1"];

const $ = (selector) => document.querySelector(selector);
const homeScreen = $("#homeScreen");
const timelineScreen = $("#timelineScreen");
const captureScreen = $("#captureScreen");
const currentDateTitle = $("#currentDateTitle");
const recordCount = $("#recordCount");
const todayKcal = $("#todayKcal");
const todayItems = $("#todayItems");
const stickerLayer = $("#stickerLayer");
const emptyBoard = $("#emptyBoard");
const widgetBoard = $("#widgetBoard");
const monthTitle = $("#monthTitle");
const monthSubtitle = $("#monthSubtitle");
const monthGrid = $("#monthGrid");
const monthCupCount = $("#monthCupCount");
const monthShopCount = $("#monthShopCount");
const monthStickerStrip = $("#monthStickerStrip");
const dailyWall = $("#dailyWall");
const activityDateStrip = $("#activityDateStrip");
const calendarPanel = $("#calendarPanel");
const activityTitle = $("#activityTitle");
const activitySubtitle = $("#activitySubtitle");
const backgroundPicker = $("#backgroundPicker");
const activityToolPanel = $("#activityToolPanel");
const timelineList = $("#timelineList");
const editDialog = $("#editDialog");
const recordForm = $("#recordForm");
const editForm = $("#editForm");
const saveRecord = $("#saveRecord");
const camera = $("#camera");
const emptyState = $("#emptyState");
const canvas = $("#captureCanvas");
const cameraAction = $("#cameraAction");
const fileInput = $("#fileInput");
const cutoutPreview = $("#cutoutPreview");
const smartBadge = $("#smartBadge");
const recordDate = $("#recordDate");
const recordTitle = $("#recordTitle");
const recordKcal = $("#recordKcal");
const recordShop = $("#recordShop");

let selectedDate = today();
let displayMonth = selectedDate.slice(0, 7);
let cameraStream = null;
let currentOriginal = "";
let currentCutout = "";
let captureReady = false;
let dragState = null;
let currentBackground = localStorage.getItem(backgroundKey) || "garden";

migrateRecords();
recordDate.value = selectedDate;
backgroundPicker.value = currentBackground;
applyBackground();
renderAll();

bind("#prevDay", "click", () => changeDay(-1));
bind("#nextDay", "click", () => changeDay(1));
bind("#openTimeline", "click", showTimeline);
bind("#timelineNav", "click", showTimeline);
bind("#homeNav", "click", showHome);
bind("#backHome", "click", showHome);
bind("#openCapture", "click", openCapture);
bind("#closeCapture", "click", closeCapture);
bind("#clearForm", "click", resetCaptureForm);
bind("#exportToday", "click", exportTodayImage);
bind("#exportMonth", "click", exportMonthImage);
bind("#toggleTools", "click", () => activityToolPanel.classList.toggle("tools-open"));
bind("#prevMonth", "click", () => changeMonth(-1));
bind("#nextMonth", "click", () => changeMonth(1));
bind("#clearToday", "click", clearTodayRecords);
bind("#deleteEdit", "click", deleteEditingRecord);
bind("#toggleCalendar", "click", toggleCalendarPanel);
backgroundPicker.addEventListener("change", updateBackground);

cameraAction.addEventListener("click", async () => {
  if (captureReady) {
    resetCapturedPreview();
    await openCamera();
    return;
  }
  if (!cameraStream) {
    await openCamera();
    return;
  }
  await captureFromCamera();
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFile(file);
  await processSelectedImage(await compressDataUrl(dataUrl, 1300, 0.84));
});

recordTitle.addEventListener("input", updateSmartKcal);
recordKcal.addEventListener("input", () => {
  smartBadge.textContent = `${Number(recordKcal.value || 0)} kcal`;
  smartBadge.hidden = !recordKcal.value;
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentCutout) {
    alert("请先拍照或上传照片。");
    return;
  }
  saveRecord.disabled = true;
  saveRecord.textContent = "保存中";
  try {
    const title = recordTitle.value.trim() || "未命名";
    const kcal = Number(recordKcal.value || estimateCalories(title));
    const storedImage = await compressDataUrl(currentCutout, 680, 0.82);
    const records = loadRecords();
    const placement = nextStickerPlacement(recordsForDate(recordDate.value || selectedDate).length);
    records.unshift({
      id: crypto.randomUUID(),
      date: recordDate.value || selectedDate,
      title,
      kcal,
      shop: recordShop.value.trim(),
      background: currentBackground,
      cutout: storedImage,
      createdAt: new Date().toISOString(),
      x: placement.x,
      y: placement.y,
      rotate: placement.rotate,
    });
    saveRecords(records);
    selectedDate = recordDate.value || selectedDate;
    closeCapture();
    renderAll();
  } catch (error) {
    console.error(error);
    alert("保存失败，请换一张较小的图片再试。");
  } finally {
    saveRecord.disabled = false;
    saveRecord.textContent = "加入今日";
  }
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#editId").value;
  const records = loadRecords().map((record) => record.id === id ? {
    ...record,
    date: $("#editDate").value,
    title: $("#editTitle").value.trim(),
    kcal: Number($("#editKcal").value || 0),
    shop: $("#editShop").value.trim(),
  } : record);
  saveRecords(records);
  editDialog.close();
  renderAll();
});

widgetBoard.addEventListener("pointermove", handleDragMove);
widgetBoard.addEventListener("pointerup", endDrag);
widgetBoard.addEventListener("pointercancel", endDrag);
stickerLayer.addEventListener("pointerdown", startDrag);
stickerLayer.addEventListener("dblclick", (event) => {
  const sticker = event.target.closest(".food-sticker");
  if (sticker) openEdit(sticker.dataset.id);
});
timelineList.addEventListener("click", (event) => {
  const item = event.target.closest(".timeline-item[data-id]");
  if (item) openEdit(item.dataset.id);
});
activityDateStrip.addEventListener("click", (event) => {
  const item = event.target.closest("button[data-date]");
  if (!item) return;
  selectedDate = item.dataset.date;
  displayMonth = selectedDate.slice(0, 7);
  renderAll();
});
monthGrid.addEventListener("click", (event) => {
  const item = event.target.closest("button[data-date]");
  if (!item) return;
  selectedDate = item.dataset.date;
  displayMonth = selectedDate.slice(0, 7);
  renderAll();
});

function renderAll() {
  renderHeader();
  renderStickers();
  renderMonthCalendar();
  renderActivityDateStrip();
  renderDailyWall();
  renderTimeline();
}

function renderHeader() {
  const records = recordsForDate(selectedDate);
  currentDateTitle.textContent = dateTitle(selectedDate);
  recordCount.textContent = String(records.length);
  todayKcal.textContent = `${totalKcal(records)} kcal`;
  todayItems.textContent = String(records.length);
}

function renderStickers() {
  const records = recordsForDate(selectedDate);
  emptyBoard.hidden = records.length > 0;
  stickerLayer.innerHTML = records.map((record) => `
    <article class="food-sticker" data-id="${record.id}" style="left:${record.x ?? 30}%; top:${record.y ?? 30}%; --rotate:${record.rotate ?? 0}deg; transform: rotate(var(--rotate));">
      <div class="sticker-image-wrap"><img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" /></div>
    </article>`).join("");
}

function renderMonthCalendar() {
  const records = loadRecords();
  const monthDate = new Date(`${displayMonth}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthRecords = records.filter((record) => record.date?.startsWith(displayMonth));
  const daysWithRecords = new Set(monthRecords.map((record) => record.date));
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < startDay; i += 1) cells.push(`<span class="month-cell empty-cell"></span>`);
  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${displayMonth}-${String(day).padStart(2, "0")}`;
    const dayRecords = recordsForDate(date);
    const active = date === selectedDate ? " active" : "";
    cells.push(`<button class="month-cell${active}" type="button" data-date="${date}">${renderCalendarScene(dayRecords, day)}${dayRecords.length ? `<i>${dayRecords.length}</i>` : ""}</button>`);
  }
  monthTitle.textContent = `${year}年${month + 1}月`;
  monthSubtitle.textContent = `${daysWithRecords.size} 天有记录 · ${monthRecords.length} 张贴纸`;
  monthCupCount.textContent = String(monthRecords.length);
  monthShopCount.textContent = `${daysWithRecords.size} 天有记录`;
  monthStickerStrip.innerHTML = monthRecords.slice(0, 10).map((record) => `<img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" />`).join("");
  monthGrid.innerHTML = cells.join("");
}

function renderCalendarScene(records, day, background = dayBackground(records)) {
  const stickers = records.slice(0, 6).map((record, index) => {
    const fallback = nextStickerPlacement(index);
    const x = record.x ?? fallback.x;
    const y = record.y ?? fallback.y;
    const rotate = record.rotate ?? fallback.rotate;
    return `<img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" style="left:${x}%; top:${y}%; transform: rotate(${rotate}deg);" />`;
  }).join("");
  return `<div class="month-day-scene" data-bg="${escapeAttr(background)}"><span class="month-day-number">${day}</span><div class="month-scene-stickers">${stickers}</div></div>`;
}

function renderActivityDateStrip() {
  activityDateStrip.innerHTML = weekDates(selectedDate).map((date) => {
    const dateValue = toDateInputValue(date);
    const records = recordsForDate(dateValue);
    const active = dateValue === selectedDate ? " active" : "";
    const hasRecords = records.length ? " has-records" : "";
    return `<button class="activity-date-pill${active}${hasRecords}" type="button" data-date="${dateValue}"><i>${records.length ? "✓" : ""}</i><span>${weekday(date)}</span><strong>${date.getDate()}</strong></button>`;
  }).join("");
}

function renderDailyWall() {
  const records = recordsForDate(selectedDate);
  activityTitle.textContent = `${formatMonthDay(selectedDate)} 活动动态`;
  activitySubtitle.textContent = records.length ? `${records.length} 张贴纸` : "这一天还没有活动贴纸。";
  dailyWall.innerHTML = records.map((record, index) => {
    const fallback = nextStickerPlacement(index);
    const x = record.x ?? fallback.x;
    const y = record.y ?? fallback.y;
    const rotate = record.rotate ?? fallback.rotate;
    return `<article class="daily-wall-sticker" style="left:${x}%; top:${y}%; --rotate:${rotate}deg; transform: rotate(var(--rotate));"><img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" /></article>`;
  }).join("");
}

function renderTimeline() {
  const records = recordsForDate(selectedDate);
  timelineList.innerHTML = records.length ? records.map((record) => `
    <article class="timeline-item" data-id="${record.id}" role="button" tabindex="0">
      <div><time class="timeline-time">${formatMonthDay(record.date)} ${timeText(record.createdAt)}</time>${record.title ? `<strong class="timeline-title">${escapeHtml(record.title)}</strong>` : ""}${record.shop ? `<p class="timeline-note">${escapeHtml(record.shop)}</p>` : ""}</div>
      <div class="timeline-image"><img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" /><span class="timeline-kcal">${record.kcal || 0} kcal</span></div>
    </article>`).join("") : '<p class="timeline-note empty-timeline">这一天还没有活动记录。</p>';
}

function openCapture() {
  recordDate.value = selectedDate;
  homeScreen.hidden = true;
  timelineScreen.hidden = true;
  captureScreen.hidden = false;
  $("#homeNav").classList.remove("nav-active");
  $("#timelineNav").classList.remove("nav-active");
}

function closeCapture() {
  stopCamera();
  resetCaptureForm();
  showHome();
}

function showHome() {
  stopCamera();
  captureScreen.hidden = true;
  homeScreen.hidden = false;
  timelineScreen.hidden = true;
  $("#homeNav").classList.add("nav-active");
  $("#timelineNav").classList.remove("nav-active");
}

function showTimeline() {
  stopCamera();
  captureScreen.hidden = true;
  homeScreen.hidden = true;
  timelineScreen.hidden = false;
  displayMonth = selectedDate.slice(0, 7);
  $("#homeNav").classList.remove("nav-active");
  $("#timelineNav").classList.add("nav-active");
  renderAll();
}

function resetCaptureForm() {
  recordForm.reset();
  recordDate.value = selectedDate;
  currentOriginal = "";
  currentCutout = "";
  captureReady = false;
  cutoutPreview.removeAttribute("src");
  cutoutPreview.classList.remove("has-image");
  smartBadge.hidden = true;
  saveRecord.disabled = true;
  cameraAction.disabled = false;
  cameraAction.textContent = "打开相机";
  fileInput.value = "";
}

function resetCapturedPreview() {
  currentOriginal = "";
  currentCutout = "";
  captureReady = false;
  cutoutPreview.removeAttribute("src");
  cutoutPreview.classList.remove("has-image");
  smartBadge.hidden = true;
  saveRecord.disabled = true;
  cameraAction.textContent = "打开相机";
}

async function openCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    camera.srcObject = cameraStream;
    camera.classList.add("active");
    cutoutPreview.classList.remove("has-image");
    emptyState.hidden = true;
    cameraAction.textContent = "拍照";
  } catch (error) {
    alert("无法打开相机，请检查权限，或改用上传照片。");
  }
}

async function captureFromCamera() {
  if (!camera.videoWidth) return;
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  await processSelectedImage(await compressDataUrl(dataUrl, 1300, 0.84));
}

function stopCamera(resetLabel = true) {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  camera.srcObject = null;
  camera.classList.remove("active");
  emptyState.hidden = false;
  if (resetLabel) cameraAction.textContent = "打开相机";
}

async function processSelectedImage(dataUrl) {
  currentOriginal = dataUrl;
  currentCutout = await makeCutout(dataUrl);
  cutoutPreview.src = currentCutout;
  cutoutPreview.classList.add("has-image");
  captureReady = true;
  cameraAction.textContent = "重拍";
  stopCamera(false);
  updateSmartKcal();
  saveRecord.disabled = false;
}

function updateSmartKcal() {
  const title = recordTitle.value.trim() || "未命名";
  if (!recordKcal.value) recordKcal.value = estimateCalories(title);
  smartBadge.textContent = `${recordKcal.value} kcal`;
  smartBadge.hidden = false;
}

function openEdit(id) {
  const record = loadRecords().find((item) => item.id === id);
  if (!record) return;
  $("#editId").value = record.id;
  $("#editDate").value = record.date;
  $("#editTitle").value = record.title || "";
  $("#editKcal").value = record.kcal || 0;
  $("#editShop").value = record.shop || record.notes || "";
  $("#editPreview").src = recordImage(record);
  editDialog.showModal();
}

function clearTodayRecords() {
  const count = recordsForDate(selectedDate).length;
  if (!count || !confirm(`确定删除 ${dateTitle(selectedDate)} 的 ${count} 条记录吗？`)) return;
  saveRecords(loadRecords().filter((record) => record.date !== selectedDate));
  renderAll();
}

function deleteEditingRecord() {
  const id = $("#editId").value;
  if (!id || !confirm("确定删除这条记录吗？")) return;
  saveRecords(loadRecords().filter((record) => record.id !== id));
  editDialog.close();
  renderAll();
}

function startDrag(event) {
  const sticker = event.target.closest(".food-sticker");
  if (!sticker) return;
  const board = stickerLayer.getBoundingClientRect();
  const rect = sticker.getBoundingClientRect();
  dragState = { id: sticker.dataset.id, pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, board };
  sticker.setPointerCapture(event.pointerId);
}

function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const sticker = stickerLayer.querySelector(`[data-id="${dragState.id}"]`);
  if (!sticker) return;
  const x = clamp(((event.clientX - dragState.board.left - dragState.offsetX) / dragState.board.width) * 100, 0, 78);
  const y = clamp(((event.clientY - dragState.board.top - dragState.offsetY) / dragState.board.height) * 100, 0, 78);
  sticker.style.left = `${x}%`;
  sticker.style.top = `${y}%`;
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const sticker = stickerLayer.querySelector(`[data-id="${dragState.id}"]`);
  if (sticker) {
    saveRecords(loadRecords().map((record) => record.id === dragState.id ? { ...record, x: parseFloat(sticker.style.left), y: parseFloat(sticker.style.top) } : record));
  }
  dragState = null;
}

function changeMonth(delta) {
  const date = new Date(`${displayMonth}-01T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  displayMonth = toDateInputValue(date).slice(0, 7);
  selectedDate = `${displayMonth}-01`;
  renderAll();
}

function changeDay(delta) {
  const date = new Date(`${selectedDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  selectedDate = toDateInputValue(date);
  recordDate.value = selectedDate;
  renderAll();
}

function toggleCalendarPanel() {
  calendarPanel.hidden = !calendarPanel.hidden;
  $("#toggleCalendar").textContent = calendarPanel.hidden ? "日历" : "收起日历";
}

function updateBackground() {
  currentBackground = backgroundPicker.value;
  localStorage.setItem(backgroundKey, currentBackground);
  applyBackground();
  renderAll();
}

function applyBackground() {
  document.documentElement.dataset.boardBg = currentBackground;
}

function loadRecords() {
  return JSON.parse(localStorage.getItem(storeKey) || "[]");
}

function saveRecords(records) {
  localStorage.setItem(storeKey, JSON.stringify(records));
}

function migrateRecords() {
  if (localStorage.getItem(storeKey)) return;
  for (const key of legacyKeys) {
    const legacy = JSON.parse(localStorage.getItem(key) || "[]");
    if (!legacy.length) continue;
    saveRecords(legacy.map((record, index) => ({
      id: record.id || crypto.randomUUID(),
      date: record.date || today(),
      title: record.title || record.food || "未命名",
      kcal: Number(record.kcal || String(record.badge || "").match(/\d+/)?.[0] || 0),
      shop: record.shop || record.place || record.notes || "",
      cutout: record.cutout || record.image || record.original || "",
      createdAt: record.createdAt || new Date().toISOString(),
      ...nextStickerPlacement(index),
    })));
    return;
  }
}

function recordsForDate(date) {
  return loadRecords().filter((record) => record.date === date).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function totalKcal(records) {
  return records.reduce((sum, record) => sum + Number(record.kcal || 0), 0);
}

function recordImage(record) {
  return record?.cutout || record?.image || record?.original || record?.photo || record?.src || "";
}

function dayBackground(records) {
  return records.find((record) => record.background)?.background || currentBackground;
}

function estimateCalories(title) {
  const text = String(title || "");
  const rules = [[/奶茶|拿铁|咖啡|饮品/, 280], [/饭|面|粉|汉堡|披萨/, 620], [/蛋糕|甜品/, 430], [/沙拉|轻食|蔬菜/, 260]];
  return rules.find(([regex]) => regex.test(text))?.[1] || 360;
}

async function makeCutout(src) {
  return src;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
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

async function exportTodayImage() {
  const records = recordsForDate(selectedDate);
  if (!records.length) return alert("今天还没有活动贴纸。");
  const out = document.createElement("canvas");
  out.width = 1080;
  out.height = 1500;
  const ctx = out.getContext("2d");
  drawSceneBackground(ctx, out.width, out.height, dayBackground(records));
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "900 58px Microsoft YaHei, sans-serif";
  ctx.fillText(`${formatMonthDay(selectedDate)} 活动贴纸`, 70, 110);
  await drawRecordStickers(ctx, records, out.width, out.height, 160, 1320, 1.5);
  downloadCanvas(out, `activity-${selectedDate}.png`);
}

async function exportMonthImage() {
  const monthRecords = loadRecords().filter((record) => record.date?.startsWith(displayMonth));
  if (!monthRecords.length) return alert("这个月还没有记录。");
  const out = document.createElement("canvas");
  out.width = 1400;
  out.height = 1700;
  const ctx = out.getContext("2d");
  drawPaperBackground(ctx, out.width, out.height);
  const monthDate = new Date(`${displayMonth}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  ctx.fillStyle = "#3b2a24";
  ctx.font = "900 76px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${year}年${month + 1}月`, out.width / 2, 120);
  const left = 90, top = 250, gap = 18, cell = 160;
  for (let day = 1; day <= totalDays; day += 1) {
    const index = startDay + day - 1;
    const x = left + (index % 7) * (cell + gap);
    const y = top + Math.floor(index / 7) * (cell + gap);
    await drawCalendarCell(ctx, x, y, cell, day, recordsForDate(`${displayMonth}-${String(day).padStart(2, "0")}`));
  }
  downloadCanvas(out, `activity-month-${displayMonth}.png`);
}

function drawPaperBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff8ed");
  gradient.addColorStop(1, "#eef6ea");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawSceneBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff8ec");
  gradient.addColorStop(0.6, "#edf3df");
  gradient.addColorStop(1, "#ffc078");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function drawRecordStickers(ctx, records, width, height, minY, maxY, scale = 1) {
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const fallback = nextStickerPlacement(index);
    const image = await loadImage(recordImage(record));
    const x = ((record.x ?? fallback.x) / 100) * width;
    const y = minY + ((record.y ?? fallback.y) / 100) * (maxY - minY);
    const size = 118 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((record.rotate ?? fallback.rotate) * Math.PI) / 180);
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

async function drawCalendarCell(ctx, x, y, size, day, records) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,255,255,.78)";
  roundRect(ctx, 0, 0, size, size, 28);
  ctx.fill();
  ctx.fillStyle = "#53473f";
  ctx.font = "800 22px Microsoft YaHei, sans-serif";
  ctx.fillText(String(day), size / 2, 34);
  for (let index = 0; index < records.slice(0, 4).length; index += 1) {
    const image = await loadImage(recordImage(records[index]));
    ctx.drawImage(image, 24 + index * 30, 58, 48, 48);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function downloadCanvas(canvasOut, filename) {
  const link = document.createElement("a");
  link.href = canvasOut.toDataURL("image/png");
  link.download = filename;
  link.click();
}

function bind(selector, event, handler) { $(selector).addEventListener(event, handler); }
function today() { return toDateInputValue(new Date()); }
function toDateInputValue(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function dateTitle(dateValue) { const d = new Date(`${dateValue}T00:00:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; }
function formatMonthDay(dateValue) { return dateTitle(dateValue); }
function timeText(value) { const d = value ? new Date(value) : new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function weekDates(dateValue) { const d = new Date(`${dateValue}T00:00:00`); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return Array.from({ length: 7 }, (_, i) => { const next = new Date(d); next.setDate(d.getDate() + i); return next; }); }
function weekday(date) { return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]; }
function nextStickerPlacement(index) {
  const spots = [{ x: 12, y: 10, rotate: -10 }, { x: 58, y: 12, rotate: 8 }, { x: 36, y: 34, rotate: -4 }, { x: 68, y: 48, rotate: 10 }, { x: 12, y: 56, rotate: -8 }, { x: 42, y: 66, rotate: 6 }, { x: 72, y: 18, rotate: -6 }, { x: 22, y: 34, rotate: 7 }];
  const base = spots[index % spots.length];
  const round = Math.floor(index / spots.length);
  return { x: clamp(base.x + round * 3, 4, 76), y: clamp(base.y + round * 4, 4, 76), rotate: base.rotate };
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(value) { return escapeHtml(value).replaceAll("`", "&#096;"); }
