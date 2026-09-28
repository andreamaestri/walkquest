/**
 * M3 Expressive map marker images, drawn to canvas and registered with Mapbox
 * as sprites. Walk pins take an M3E shape per difficulty level (rounder = easier,
 * spikier = harder), so the map reads at a glance without extra chrome.
 * All colours come from the M3 tokens and are redrawn on theme change.
 */
import { radiiToPath, sampleShape } from '../design/shapes';

/** Difficulty level (1–5) → M3E shape, from calm to energetic. */
export const DIFFICULTY_SHAPES = { 1: 'circle', 2: 'cookie4', 3: 'pentagon', 4: 'cookie9', 5: 'softBurst' };

/** Material Symbols (rounded) glyphs on a 24-unit grid. */
const GLYPHS = {
  hiking:
    'm10.9 15l-1.625 7.2q-.075.35-.363.575T8.25 23q-.5 0-.8-.375t-.2-.85L10.075 7.45q.15-.725.675-1.088T11.85 6t1.063.25t.787.75l1 1.6q.45.725 1.163 1.312t1.637.863V9.75q0-.325.213-.537T18.25 9t.538.213t.212.537v12.5q0 .325-.213.538T18.25 23t-.537-.213t-.213-.537v-9.4q-1.2-.275-2.225-.875T13.5 10.5l-.6 3l1.8 1.7q.15.15.225.338t.075.387V22q0 .425-.288.713T14 23t-.712-.288T13 22v-5zm-4.45-2.05l-1.15-.225q-.4-.075-.625-.413t-.15-.762l.75-3.925q.15-.85.9-1.287T7.8 6.075q.425.075.638.413t.137.762l-.95 4.9q-.075.425-.412.65t-.763.15m5.638-8.037Q11.5 4.325 11.5 3.5t.588-1.412T13.5 1.5t1.413.588T15.5 3.5t-.587 1.413T13.5 5.5t-1.412-.587',
  favorite:
    'M11.288 20.2q-.363-.125-.638-.4l-1.725-1.575q-2.65-2.425-4.787-4.812T2 8.15Q2 5.8 3.575 4.225T7.5 2.65q1.325 0 2.5.562t2 1.538q.825-.975 2-1.537t2.5-.563q2.35 0 3.925 1.575T22 8.15q0 2.875-2.125 5.275T15.05 18.25l-1.7 1.55q-.275.275-.637.4t-.713.125t-.712-.125',
  flag: 'M7 14v6q0 .425-.288.713T6 21t-.712-.288T5 20V5q0-.425.288-.712T6 4h7.175q.35 0 .625.225t.35.575L14.4 6H19q.425 0 .713.288T20 7v8q0 .425-.288.713T19 16h-5.175q-.35 0-.625-.225t-.35-.575L12.6 14z',
  play: 'M8 17.175V6.825q0-.425.3-.713t.7-.287q.125 0 .263.037t.262.113l8.15 5.175q.225.15.338.375t.112.475t-.112.475t-.338.375l-8.15 5.175q-.125.075-.262.113T9 18.175q-.4 0-.7-.288t-.3-.712',
};

/** Sprites are drawn at 2× and registered with pixelRatio 2 for crisp edges. */
export const PIXEL_RATIO = 2;

export function walkPinImageId(level, favorite = false) {
  return `walk-pin-${level}${favorite ? '-fav' : ''}`;
}

/** Mapbox expression choosing the pin sprite for a walk feature. */
export function walkPinImageExpression() {
  return ['concat', 'walk-pin-', ['to-string', ['get', 'level']], ['case', ['==', ['get', 'fav'], 1], '-fav', '']];
}

function canvas(width, height) {
  const el = document.createElement('canvas');
  el.width = width * PIXEL_RATIO;
  el.height = height * PIXEL_RATIO;
  const ctx = el.getContext('2d');
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  return ctx;
}

const imageData = (ctx) => ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

function shapePath2D(shape, cx, cy, radius) {
  return new Path2D(radiiToPath(sampleShape(shape, 96), cx, cy, radius));
}

/** Level 1 elevation: soft key shadow under the shape. */
function withShadow(ctx, colors, blur, offsetY, fn) {
  ctx.save();
  ctx.shadowColor = colors.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  fn();
  ctx.restore();
}

function drawGlyph(ctx, name, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(GLYPHS[name]));
  ctx.restore();
}

/** A walk pin: difficulty shape, surface outline, and a centre dot (or heart for favourites). */
export function drawWalkPin(colors, level, favorite) {
  const size = 28;
  const c = size / 2;
  const ctx = canvas(size, size);
  const path = shapePath2D(DIFFICULTY_SHAPES[level] || 'circle', c, c, 10.5);
  withShadow(ctx, colors, 3, 1, () => {
    ctx.fillStyle = colors.surface;
    ctx.fill(path);
  });
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = colors.surface;
  ctx.stroke(path);
  ctx.fillStyle = favorite ? colors.tertiary : colors.primary;
  ctx.fill(path);
  if (favorite) {
    drawGlyph(ctx, 'favorite', c, c + 0.5, 11, colors.onTertiary);
  } else {
    ctx.beginPath();
    ctx.arc(c, c, 2.75, 0, Math.PI * 2);
    ctx.fillStyle = colors.onPrimary;
    ctx.fill();
  }
  return imageData(ctx);
}

/** The selected walk: a large cookie-shaped head on a stem, with the hiking glyph. */
export function drawSelectedPin(colors) {
  const width = 56;
  const height = 68;
  const c = width / 2;
  const headY = 25;
  const ctx = canvas(width, height);
  const head = shapePath2D('cookie9', c, headY, 21);
  const stem = new Path2D();
  stem.moveTo(c - 7, headY + 16);
  stem.quadraticCurveTo(c, headY + 30, c, height - 6);
  stem.quadraticCurveTo(c, headY + 30, c + 7, headY + 16);
  stem.closePath();
  // Ground contact: a small tonal ellipse where the pin touches the map.
  ctx.beginPath();
  ctx.ellipse(c, height - 5, 5, 2.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';
  ctx.fill();
  withShadow(ctx, colors, 8, 3, () => {
    ctx.fillStyle = colors.primary;
    ctx.fill(stem);
    ctx.fill(head);
  });
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors.surface;
  ctx.stroke(head);
  ctx.fillStyle = colors.primary;
  ctx.fill(stem);
  ctx.fill(head);
  drawGlyph(ctx, 'hiking', c, headY, 24, colors.onPrimary);
  return imageData(ctx);
}

/** Route start (tertiary, play) and finish (primary, flag) badges. */
export function drawRouteEnd(colors, kind) {
  const size = 34;
  const c = size / 2;
  const ctx = canvas(size, size);
  const start = kind === 'start';
  const path = shapePath2D(start ? 'circle' : 'cookie4', c, c, 12.5);
  withShadow(ctx, colors, 4, 1.5, () => {
    ctx.fillStyle = colors.surface;
    ctx.fill(path);
  });
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = colors.surface;
  ctx.stroke(path);
  ctx.fillStyle = start ? colors.tertiary : colors.primary;
  ctx.fill(path);
  drawGlyph(ctx, start ? 'play' : 'flag', c + (start ? 0.75 : 0), c, 15, start ? colors.onTertiary : colors.onPrimary);
  return imageData(ctx);
}

/** Every sprite the map uses, keyed by image id. */
export function markerImages(colors) {
  const images = {
    'walk-selected': drawSelectedPin(colors),
    'route-start': drawRouteEnd(colors, 'start'),
    'route-end': drawRouteEnd(colors, 'end'),
  };
  for (const level of Object.keys(DIFFICULTY_SHAPES).map(Number)) {
    images[walkPinImageId(level)] = drawWalkPin(colors, level, false);
    images[walkPinImageId(level, true)] = drawWalkPin(colors, level, true);
  }
  return images;
}

/** Adds the sprites, or redraws them in place (theme change). */
export function syncMarkerImages(map, colors) {
  for (const [id, data] of Object.entries(markerImages(colors))) {
    if (map.hasImage(id)) map.updateImage(id, data);
    else map.addImage(id, data, { pixelRatio: PIXEL_RATIO });
  }
}
