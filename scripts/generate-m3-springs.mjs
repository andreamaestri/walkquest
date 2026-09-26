/**
 * Prints the M3 Expressive motion tokens as CSS `linear()` easings.
 *
 * M3E defines motion as springs (stiffness + damping ratio). CSS can't run a
 * spring, but it can play back a sampled one exactly via `linear()`. This
 * simulates each token over its spec duration and emits the curve, so CSS
 * transitions overshoot and settle like the JS springs in design/motion.js.
 *
 *   node scripts/generate-m3-springs.mjs   # paste output into css/m3e/foundation.css
 */
const tokens = [
  ['fast-spatial', 800, 0.6, 350],
  ['default-spatial', 380, 0.8, 500],
  ['slow-spatial', 200, 0.8, 650],
  ['fast-effects', 3800, 1, 150],
  ['default-effects', 1600, 1, 200],
  ['slow-effects', 800, 1, 300],
];

function sample(stiffness, ratio, durationMs, points) {
  const damping = ratio * 2 * Math.sqrt(stiffness);
  const dt = 1 / 4000;
  const out = [];
  let x = 0;
  let v = 0;
  let t = 0;
  for (let i = 0; i <= points; i++) {
    const target = (i / points) * (durationMs / 1000);
    while (t < target) {
      const a = -stiffness * (x - 1) - damping * v;
      v += a * dt;
      x += v * dt;
      t += dt;
    }
    out.push(x);
  }
  out[out.length - 1] = 1;
  return out;
}

for (const [name, k, ratio, ms] of tokens) {
  const points = ratio < 1 ? 48 : 24;
  const values = sample(k, ratio, ms, points).map((x) => +x.toFixed(3));
  console.log(`  --md-sys-motion-spring-${name}: linear(${values.join(', ')});`);
}
