/**
 * The grain tile: one square of white noise, drawn once at boot and handed to
 * the stack as a data URI. Procedural rather than an asset, because a request
 * and a cache entry are a lot to pay for something a canvas can make in half a
 * millisecond — and because the tile is meant to be different every visit.
 */
export function drawGrainTile(size = 128): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = (Math.random() * 255) | 0;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Only when the layer is actually on the stack — otherwise nothing reads it. */
export function mountGrain(): void {
  const root = document.documentElement;
  if (!(root.getAttribute('data-fx') ?? '').split(/\s+/).includes('grain')) return;
  const tile = drawGrainTile();
  if (tile) root.style.setProperty('--fx-grain-src', `url("${tile}")`);
}
