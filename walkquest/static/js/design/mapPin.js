/**
 * Walk map pins, M3 Expressive style: the "asymmetric corner" drop — a rounded
 * square with three fully round corners and one small, soft corner, turned 45°
 * so the soft corner points at the walk. Filled in a bright colour per
 * difficulty with a tonal centre dot (a heart for saved walks), lifted off the
 * map by a soft elevation shadow instead of an outline.
 * Drawn once per colour onto a canvas and handed to Mapbox as GPU symbols.
 */
import { PIN } from '../utils/mapLayers';

/** Easy → Strenuous: green, teal, amber, coral, magenta. */
export const PIN_COLORS = ['#1fae6c', '#0f9fbf', '#f29d12', '#ef5b36', '#d42f7c'];
const SCALE = 4; // drawn at 4x so the enlarged hover/selected pins stay crisp
const TIP_RADIUS = 0.22; // soft tip corner, as a fraction of the head radius

/** Mix a hex colour towards white (M3 tonal "container" tint). */
function tint(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function dropPath(ctx) {
  const { cx, cy, r } = PIN;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4); // bottom-right corner → straight down
  ctx.beginPath();
  ctx.roundRect(-r, -r, r * 2, r * 2, [r, r, r * TIP_RADIUS, r]);
  ctx.restore();
}

function heartPath(ctx, x, y, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.75, y - s * 1.05, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.75, y - s * 1.05, x + s * 1.25, y + s * 0.05, x, y + s * 0.85);
  ctx.closePath();
}

/**
 * @param {{ fill: string, favorite?: boolean }} options
 * @returns {ImageData} PIN.width × PIN.height at SCALE (register with pixelRatio: SCALE)
 */
export function drawPin({ fill, favorite = false }) {
  const { width, height, cx, cy, r } = PIN;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Soft elevation (M3 level 2-ish): key + ambient shadow. Shadow units ignore
  // the canvas transform, so scale them by hand.
  ctx.save();
  ctx.fillStyle = fill;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 3 * SCALE;
  ctx.shadowOffsetY = 1.5 * SCALE;
  dropPath(ctx);
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 1 * SCALE;
  ctx.shadowOffsetY = 0.5 * SCALE;
  ctx.fill();
  ctx.restore();

  // Tonal centre: a pale tint of the pin colour.
  ctx.fillStyle = tint(fill, 0.88);
  if (favorite) {
    heartPath(ctx, cx, cy + 0.4, r * 0.95);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  }
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Registers the pin images on a map: `walk-pin-<level>` and `walk-pin-<level>-fav`. */
export function addPinImages(map) {
  PIN_COLORS.forEach((fill, i) => {
    for (const favorite of [false, true]) {
      const id = `walk-pin-${i + 1}${favorite ? '-fav' : ''}`;
      if (!map.hasImage(id)) map.addImage(id, drawPin({ fill, favorite }), { pixelRatio: SCALE });
    }
  });
}
