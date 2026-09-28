/**
 * Walk map pins: a plump teardrop with a white "face" disc holding a tiny
 * glyph, a soft ground shadow, and a little gloss. Drawn once per theme onto a
 * canvas and handed to Mapbox as images (GPU symbols, no DOM markers).
 */
import collections from '../icons/subset.json';
import { PIN } from '../utils/mapLayers';

/** Glyphs shown inside the pin (also listed here so the icon subset bundles them). */
export const PIN_GLYPHS = {
  walk: 'material-symbols:hiking-rounded',
  favorite: 'material-symbols:favorite-rounded',
};

const SCALE = 4; // drawn at 4x so the enlarged hover/selected pins stay crisp

function glyphPaths(name) {
  const [prefix, icon] = name.split(':');
  const collection = collections.find((c) => c.prefix === prefix);
  const data = collection?.icons[icon] || collection?.icons[collection?.aliases?.[icon]?.parent];
  if (!data) return { paths: [], size: 24 };
  return {
    paths: [...data.body.matchAll(/\sd="([^"]+)"/g)].map((match) => new Path2D(match[1])),
    size: data.width || collection.width || 24,
  };
}

function dropPath(ctx) {
  const { cx, cy, r, tipY } = PIN;
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  // Round shoulders and a short, soft tip: chubbier (cuter) than a classic pin.
  ctx.bezierCurveTo(cx - r * 0.3, tipY - r * 0.35, cx - r, cy + r * 0.95, cx - r, cy);
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(cx + r, cy + r * 0.95, cx + r * 0.3, tipY - r * 0.35, cx, tipY);
  ctx.closePath();
}

/**
 * @param {{ fill: string, surface: string, glyph: string }} options
 * @returns {ImageData} PIN.width × PIN.height at SCALE (register with pixelRatio: SCALE)
 */
export function drawPin({ fill, surface, glyph }) {
  const { width, height, cx, cy, r, tipY } = PIN;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Soft ground shadow under the tip.
  ctx.save();
  ctx.filter = 'blur(1.2px)';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, tipY + 1, 5.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outline: a wide surface-coloured stroke under the fill reads as an outer ring.
  dropPath(ctx);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = surface;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();

  // Gentle depth: the lower half darkens slightly.
  ctx.save();
  dropPath(ctx);
  ctx.clip();
  const shade = ctx.createLinearGradient(0, cy - r, 0, tipY);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Gloss highlight on the upper-left of the head.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.5, cy - r * 0.62, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Face: surface disc with the glyph in the pin colour.
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  const { paths, size } = glyphPaths(glyph);
  const glyphSize = r * 0.95;
  ctx.save();
  ctx.translate(cx - glyphSize / 2, cy - glyphSize / 2);
  ctx.scale(glyphSize / size, glyphSize / size);
  ctx.fillStyle = fill;
  for (const path of paths) ctx.fill(path);
  ctx.restore();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Registers (or refreshes, on theme change) the pin images on a map. */
export function addPinImages(map, colors) {
  const images = {
    'walk-pin': drawPin({ fill: colors.primary, surface: colors.surface, glyph: PIN_GLYPHS.walk }),
    'walk-pin-fav': drawPin({ fill: colors.tertiary, surface: colors.surface, glyph: PIN_GLYPHS.favorite }),
  };
  for (const [id, image] of Object.entries(images)) {
    if (map.hasImage(id)) map.updateImage(id, image);
    else map.addImage(id, image, { pixelRatio: SCALE });
  }
}
