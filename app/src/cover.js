// Cover renderer: draws a multi-panel poster cover onto any 2D canvas.
// Layouts are panel rectangles in fractions of the canvas; each panel draws
// one photo with its own crop (zoom + offset), then a colour grade, a
// sunset sun and palm silhouettes, grain, a vignette and the title block.

export const GRADES = {
  sunset: { filter: 'saturate(1.35) contrast(1.1) brightness(1.02)', wash: ['#ff7a2f', '#ff2e88', '#7b2ff7'], washAlpha: 0.28 },
  neon: { filter: 'saturate(1.5) contrast(1.18)', wash: ['#ff2e88', '#22d3ee', '#7b2ff7'], washAlpha: 0.34 },
  palm: { filter: 'saturate(1.25) contrast(1.06) sepia(0.25)', wash: ['#f7b733', '#2a9d8f', '#1d3557'], washAlpha: 0.22 },
  dusk: { filter: 'saturate(1.2) contrast(1.1) brightness(0.95)', wash: ['#8338ec', '#3a0ca3', '#ff006e'], washAlpha: 0.3 },
  plain: { filter: 'none', wash: ['#ffffff', '#ffffff', '#ffffff'], washAlpha: 0 },
};

export function panelRects(layout, w, h) {
  const tall = h >= w;
  if (layout === 'full') return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (layout === 'grid4') {
    return [
      { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ];
  }
  if (layout === 'nine') {
    const out = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      out.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3 });
    return out;
  }
  // hero: one big panel plus three small ones.
  if (tall) return [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.62, w: 1 / 3, h: 0.38 }, { x: 1 / 3, y: 0.62, w: 1 / 3, h: 0.38 },
    { x: 2 / 3, y: 0.62, w: 1 / 3, h: 0.38 },
  ];
  return [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 1 / 3 }, { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3 },
    { x: 0.62, y: 2 / 3, w: 0.38, h: 1 / 3 },
  ];
}

function drawPhotoInto(ctx, img, rect, crop) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (crop.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (crop.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (crop.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function seededRandom(seed) {
  let s = seed >>> 0 || 7;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function drawPalm(ctx, x, y, size, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = 'rgba(10,6,18,0.85)';
  ctx.lineWidth = size * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.08, -size * 0.55, size * 0.22, -size * 0.95);
  ctx.stroke();
  ctx.translate(size * 0.22, -size * 0.95);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3 - size * 0.08,
      Math.cos(a) * size * 0.52, Math.sin(a) * size * 0.52 + size * 0.16);
    ctx.stroke();
  }
  ctx.restore();
}

function fitTitle(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", "Segoe UI", sans-serif`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px "Arial Black", "Segoe UI", sans-serif`;
  }
  return size;
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = panelRects(state.layout, w, h);
  const gap = Math.max(3, Math.round(w * 0.006));

  ctx.fillStyle = '#120a1e';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((f, i) => {
    const rect = { x: f.x * w + gap, y: f.y * h + gap, w: f.w * w - gap * 2, h: f.h * h - gap * 2 };
    const crop = state.crops[i] || { photo: 0, zoom: 1.15, ox: 0, oy: 0 };
    const img = state.photos[crop.photo];
    if (img) {
      ctx.filter = grade.filter;
      drawPhotoInto(ctx, img, rect, crop);
      ctx.filter = 'none';
    } else {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3b1d5e');
      g.addColorStop(1, '#120a1e');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // Warm wash over each panel.
    if (grade.washAlpha > 0) {
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, grade.wash[0]);
      wash.addColorStop(0.55, grade.wash[1]);
      wash.addColorStop(1, grade.wash[2]);
      ctx.save();
      ctx.globalAlpha = grade.washAlpha * 0.55;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Retro striped sunset sun over the hero / first panel (skipped on the
  // nine-grid, where the first panel is too small to hold it).
  if (state.layout !== 'nine') {
  const hero = rects[0];
  const sunR = Math.min(w, h) * 0.1;
  const sunX = hero.x * w + hero.w * w * 0.74;
  const sunY = hero.y * h + hero.h * h * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
  sun.addColorStop(0, '#ffe98a');
  sun.addColorStop(0.55, '#ff8c3c');
  sun.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) {
    const sy = sunY + sunR * (0.05 + i * 0.24);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * (0.05 + i * 0.03));
  }
  ctx.restore();
  }

  // Palm silhouettes in the bottom corners of the cover.
  const palmSize = Math.min(w, h) * 0.22;
  drawPalm(ctx, w * 0.02, h * 0.99, palmSize, 0.12);
  drawPalm(ctx, w * 0.98, h * 0.99, palmSize * 0.8, -0.14);

  // Grain: deterministic, so the same settings always render the same cover.
  const rand = seededRandom(20261119 + w + h);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 1400; i++) ctx.fillRect(rand() * w, rand() * h, 2, 2);
  ctx.restore();

  // Vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,16,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // White poster frame.
  const frame = Math.max(6, Math.round(w * 0.011));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);

  // Title block: dark band, big gradient title, subtitle, heat stars.
  const bandH = h * 0.17;
  const bandY = h - bandH - frame;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, 'rgba(10,4,20,0)');
  band.addColorStop(0.35, 'rgba(10,4,20,0.82)');
  band.addColorStop(1, 'rgba(10,4,20,0.94)');
  ctx.fillStyle = band;
  ctx.fillRect(frame, bandY, w - frame * 2, bandH + frame);

  const title = (state.caption || 'SUNSET HEIST').trim().toUpperCase();
  const titleSize = fitTitle(ctx, title, w * 0.86, h * 0.105);
  ctx.save();
  ctx.translate(w / 2, bandY + bandH * 0.62);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(titleSize * 0.04)}px`; } catch (e) { /* older canvas */ }
  const fill = state.titleStyle === 'white'
    ? '#ffffff'
    : state.titleStyle === 'neon'
      ? (() => { const g = ctx.createLinearGradient(0, -titleSize / 2, 0, titleSize / 2);
          g.addColorStop(0, '#ffe259'); g.addColorStop(0.5, '#ff2e88'); g.addColorStop(1, '#b537f2'); return g; })()
      : (() => { const g = ctx.createLinearGradient(0, -titleSize / 2, 0, titleSize / 2);
          g.addColorStop(0, '#fff3a6'); g.addColorStop(0.45, '#ff9a3d'); g.addColorStop(1, '#ff2e88'); return g; })();
  ctx.lineWidth = Math.max(4, titleSize * 0.14);
  ctx.strokeStyle = '#12061f';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,46,136,0.65)';
  ctx.shadowBlur = titleSize * 0.25;
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  const sub = (state.subtitle || '').trim().toUpperCase();
  if (sub) {
    ctx.save();
    ctx.font = `700 ${Math.round(h * 0.021)}px "Segoe UI", system-ui, sans-serif`;
    try { ctx.letterSpacing = '4px'; } catch (e) { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(sub, w / 2, bandY + bandH * 0.92);
    ctx.restore();
  }

  // Top ribbon: badge + heat meter.
  const ribbonY = frame + h * 0.028;
  ctx.save();
  ctx.font = `800 ${Math.round(h * 0.02)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const badge = '★ PALM SHORES ★';
  const bw = ctx.measureText(badge).width + h * 0.03;
  ctx.fillStyle = 'rgba(10,4,20,0.78)';
  ctx.beginPath();
  ctx.roundRect(frame + w * 0.015, ribbonY - h * 0.018, bw, h * 0.036, h * 0.018);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.fillText(badge, frame + w * 0.015 + h * 0.015, ribbonY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HEAT ★★★★★', w - frame - w * 0.015, ribbonY);
  ctx.restore();
}
