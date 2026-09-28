/**
 * Walk map pins: a round, bubbly drop in a bright colour per difficulty, with a
 * white outline and a white dot (a heart for saved walks). Drawn once onto a
 * canvas per colour and handed to Mapbox as images (GPU symbols, no DOM markers).
 */
import { PIN } from '../utils/mapLayers';

/** Easy → Strenuous: green, teal, amber, coral, magenta. Bright on light and dark maps. */
export const PIN_COLORS = ['#22b573', '#12a4c4', '#f5a623', '#f2643d', '#d8347f'];
const OUTLINE = '#ffffff';
const SCALE = 4; // drawn at 4x so the enlarged hover/selected pins stay crisp

/** Round head with a short, soft point. */
function bubblePath(ctx) {
  const { cx, cy, r, tipY } = PIN;
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.bezierCurveTo(cx - r * 0.2, tipY - r * 0.2, cx - r, cy + r * 0.95, cx - r, cy);
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(cx + r, cy + r * 0.95, cx + r * 0.2, tipY - r * 0.2, cx, tipY);
  ctx.closePath();
}

function heartPath(ctx, x, y, size) {
  // Two lobes and a soft point, in a size × size box centred on (x, y).
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
  const { width, height, cx, cy, r, tipY } = PIN;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Faint ground shadow so pins lift off busy map areas.
  ctx.save();
  ctx.filter = 'blur(1px)';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, tipY + 0.5, 4.5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // White outline (a wide stroke under the fill), then the colour.
  bubblePath(ctx);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.fillStyle = OUTLINE;
  if (favorite) {
    heartPath(ctx, cx, cy + 0.3, r * 0.95);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
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
