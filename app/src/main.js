// Palm Shores cover studio: wires the editor controls to the cover renderer.
// Photos come from the file picker or the bundled samples; every panel keeps
// its own crop (photo, zoom, x/y offset) and the preview redraws live.

import { drawCover, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const layoutInput = document.getElementById('layout');
const gradeInput = document.getElementById('grade');
const sizeInput = document.getElementById('size');
const titleStyleInput = document.getElementById('titleStyle');
const panelPhotoSelect = document.getElementById('panelPhoto');
const panelZoomInput = document.getElementById('panelZoom');
const statusEl = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const panelLabel = document.getElementById('panelLabel');

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  photos: [],
  photoNames: [],
  crops: [],
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'Sunset Heist',
  subtitle: 'PALM SHORES · AFTER DARK',
  titleStyle: 'sunset',
  selected: 0,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function ensureCrops() {
  const count = panelRects(state.layout, 100, 100).length;
  while (state.crops.length < count) {
    const i = state.crops.length;
    state.crops.push({ photo: i < state.photos.length ? i : 0, zoom: 1.15, ox: 0, oy: 0 });
  }
  state.crops.length = count;
  if (state.selected >= count) state.selected = 0;
}

function refreshPanelPhotoOptions() {
  panelPhotoSelect.innerHTML = '';
  state.photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1} — ${state.photoNames[i] || 'upload'}`;
    panelPhotoSelect.appendChild(opt);
  });
  if (state.photos.length) {
    panelPhotoSelect.value = String(state.crops[state.selected]?.photo || 0);
    panelZoomInput.value = String(state.crops[state.selected]?.zoom || 1.15);
  }
  panelLabel.textContent = state.photos.length
    ? `Panel ${state.selected + 1} of ${state.crops.length} selected — drag to move the photo`
    : 'Load a photo to begin — or try a sample.';
}

function redraw() {
  ensureCrops();
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  sizeLabel.textContent = `${w} × ${h}`;
}

function addPhoto(img, name) {
  state.photos.push(img);
  state.photoNames.push(name);
  refreshPanelPhotoOptions();
  redraw();
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  addPhoto(img, name);
  statusEl.textContent = `Loaded sample photo: ${name}.`;
}

document.getElementById('photoFiles').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch (e) { statusEl.textContent = `Could not read ${file.name}.`; }
  }
  if (files.length) statusEl.textContent = `Loaded ${files.length} photo${files.length > 1 ? 's' : ''} from your machine.`;
});

document.getElementById('samples').addEventListener('click', async (event) => {
  const sample = event.target.closest('[data-sample]');
  if (sample) {
    try { await loadSample(sample.dataset.sample); }
    catch (e) { statusEl.textContent = 'Sample photo failed to load.'; }
  }
  if (event.target.id === 'fillAll') {
    ensureCrops();
    state.crops.forEach((crop) => { crop.photo = 0; });
    refreshPanelPhotoOptions();
    redraw();
    statusEl.textContent = 'Every panel now uses photo 1.';
  }
});

panelPhotoSelect.addEventListener('change', () => {
  ensureCrops();
  state.crops[state.selected].photo = Number(panelPhotoSelect.value);
  redraw();
});
panelZoomInput.addEventListener('input', () => {
  ensureCrops();
  state.crops[state.selected].zoom = Number(panelZoomInput.value);
  redraw();
});
document.getElementById('zoomIn').addEventListener('click', () => {
  ensureCrops();
  const crop = state.crops[state.selected];
  crop.zoom = Math.min(3, crop.zoom + 0.2);
  panelZoomInput.value = String(crop.zoom);
  redraw();
});
document.getElementById('zoomOut').addEventListener('click', () => {
  ensureCrops();
  const crop = state.crops[state.selected];
  crop.zoom = Math.max(1, crop.zoom - 0.2);
  panelZoomInput.value = String(crop.zoom);
  redraw();
});
document.getElementById('centrePhoto').addEventListener('click', () => {
  ensureCrops();
  state.crops[state.selected].ox = 0;
  state.crops[state.selected].oy = 0;
  redraw();
});

layoutInput.addEventListener('change', () => { state.layout = layoutInput.value; redraw(); });
gradeInput.addEventListener('change', () => { state.grade = gradeInput.value; redraw(); });
sizeInput.addEventListener('change', () => { state.size = sizeInput.value; redraw(); });
titleStyleInput.addEventListener('change', () => { state.titleStyle = titleStyleInput.value; redraw(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

// Pick a panel by clicking the preview, then drag to pan its photo.
let dragging = false;
let lastX = 0;
let lastY = 0;
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const fx = (clientX - box.left) / box.width;
  const fy = (clientY - box.top) / box.height;
  const rects = panelRects(state.layout, 1, 1);
  const hit = rects.findIndex((r) => fx >= r.x && fx < r.x + r.w && fy >= r.y && fy < r.y + r.h);
  return hit === -1 ? 0 : hit;
}
canvas.addEventListener('pointerdown', (event) => {
  ensureCrops();
  state.selected = panelAt(event.clientX, event.clientY);
  refreshPanelPhotoOptions();
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const box = canvas.getBoundingClientRect();
  const crop = state.crops[state.selected];
  crop.ox += (event.clientX - lastX) / box.width;
  crop.oy += (event.clientY - lastY) / box.height;
  crop.ox = Math.max(-1, Math.min(1, crop.ox));
  crop.oy = Math.max(-1, Math.min(1, crop.oy));
  lastX = event.clientX;
  lastY = event.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = false; });

document.getElementById('exportBtn').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palm-shores-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved palm-shores-${state.size}.png (${state.size.replace('x', ' × ')}).`;
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  if (query.get('layout')) { state.layout = query.get('layout'); layoutInput.value = state.layout; }
  if (query.get('grade')) { state.grade = query.get('grade'); gradeInput.value = state.grade; }
  if (query.get('size')) { state.size = query.get('size'); sizeInput.value = state.size; }
  if (query.get('titleStyle')) { state.titleStyle = query.get('titleStyle'); titleStyleInput.value = state.titleStyle; }
  runShot(shot, query, async (photo, photo2, caption, subtitle) => {
    state.photos = [];
    state.photoNames = [];
    state.crops = [];
    state.photos.push(await loadImage(`samples/${photo}.jpg`));
    state.photoNames.push(photo);
    if (photo2 && photo2 !== photo) {
      state.photos.push(await loadImage(`samples/${photo2}.jpg`));
      state.photoNames.push(photo2);
    }
    state.caption = caption;
    state.subtitle = subtitle;
    captionInput.value = caption;
    subtitleInput.value = subtitle;
    ensureCrops();
    // Spread the two samples across the panels, hero first.
    state.crops.forEach((crop, i) => { crop.photo = i % state.photos.length; });
    refreshPanelPhotoOptions();
    redraw();
  });
} else {
  redraw();
}
