import { describe, expect, it } from 'vitest';
import { springFromRatio, springs } from '../design/motion';
import { LOADING_SEQUENCE, radiiToPath, sampleShape } from '../design/shapes';

describe('M3 Expressive springs', () => {
  it('converts a damping ratio to an absolute damping coefficient', () => {
    // critically damped: c = 2·√(k·m)
    expect(springFromRatio(1600, 1).damping).toBe(80);
    expect(springs.fastSpatial).toMatchObject({ type: 'spring', stiffness: 800 });
    expect(springs.fastSpatial.damping).toBeCloseTo(33.94, 1);
  });
});

describe('shape library', () => {
  it('samples every loading shape to the same number of normalised radii', () => {
    for (const name of LOADING_SEQUENCE) {
      const radii = sampleShape(name, 48);
      expect(radii).toHaveLength(48);
      expect(Math.max(...radii)).toBeCloseTo(1);
      expect(Math.min(...radii)).toBeGreaterThan(0.4);
    }
  });

  it('builds a closed SVG path', () => {
    const d = radiiToPath(sampleShape('cookie9', 12), 50, 50, 40);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});
