// Fixed scenes for repeatable screenshots: ?shot=editor shows the editor with
// sample photos loaded, ?shot=cover draws the cover full-bleed.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') || 'pier';
  const photo2 = query.get('photo2') || 'boulevard';
  const caption = query.get('caption') || 'Sunset Heist';
  const subtitle = query.get('subtitle') || 'PALM SHORES · AFTER DARK';
  await load(photo, photo2, caption, subtitle, query);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
