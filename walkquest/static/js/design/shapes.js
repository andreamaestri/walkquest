/**
 * M3 Expressive shape library (subset), expressed as polar radius functions
 * so any two shapes can be morphed point-by-point.
 */
const TAU = Math.PI * 2;

const lobes = (count, depth) => (t) => 1 - depth + depth * Math.cos(count * t);
const polygon = (sides, rounding = 0.2) => (t) => {
  const segment = TAU / sides;
  const local = ((t % segment) + segment) % segment - segment / 2;
  const sharp = Math.cos(Math.PI / sides) / Math.cos(local);
  return sharp * (1 - rounding) + rounding * 0.92;
};
const ellipse = (a, b) => (t) => (a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
const superellipse = (a, b, n) => (t) =>
  1 / ((Math.abs(Math.cos(t) / a) ** n + Math.abs(Math.sin(t) / b) ** n) ** (1 / n));

export const SHAPES = {
  softBurst: lobes(10, 0.1),
  cookie9: lobes(9, 0.08),
  pentagon: polygon(5, 0.35),
  pill: superellipse(1, 0.62, 3),
  sunny: lobes(8, 0.06),
  cookie4: lobes(4, 0.12),
  oval: ellipse(1, 0.72),
  circle: () => 1,
  cookie12: lobes(12, 0.06),
  clover4: (t) => 0.72 + 0.28 * Math.abs(Math.cos(2 * t)),
};

/** The loading indicator's sequence, per the M3 Expressive spec. */
export const LOADING_SEQUENCE = ['softBurst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval'];

/** Samples a shape into `count` radii, normalised so the largest radius is 1. */
export function sampleShape(name, count = 72) {
  const fn = SHAPES[name] || SHAPES.circle;
  const radii = Array.from({ length: count }, (_, i) => fn((i / count) * TAU - Math.PI / 2));
  const max = Math.max(...radii);
  return radii.map((r) => r / max);
}

/** Builds an SVG path for radii centred at (cx, cy) with radius `size`, rotated by `rotation` radians. */
export function radiiToPath(radii, cx, cy, size, rotation = 0) {
  const count = radii.length;
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU - Math.PI / 2 + rotation;
    const x = cx + Math.cos(angle) * radii[i] * size;
    const y = cy + Math.sin(angle) * radii[i] * size;
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

export function shapePath(name, size = 50, count = 72) {
  return radiiToPath(sampleShape(name, count), size, size, size);
}
