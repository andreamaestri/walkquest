/**
 * Material 3 Expressive motion for JavaScript animations (motion's `animate`).
 *
 * M3E specifies springs by stiffness and damping *ratio*; motion expects an
 * absolute damping coefficient, so convert: c = ζ · 2·√(k·m).
 * CSS equivalents live in css/m3e/foundation.css (--md-sys-motion-spring-*).
 */
export function springFromRatio(stiffness, dampingRatio, mass = 1) {
  return {
    type: 'spring',
    stiffness,
    damping: +(dampingRatio * 2 * Math.sqrt(stiffness * mass)).toFixed(2),
    mass,
  };
}

/** Expressive scheme (used for hero moments and spatial movement). */
export const springs = {
  fastSpatial: springFromRatio(800, 0.6),
  defaultSpatial: springFromRatio(380, 0.8),
  slowSpatial: springFromRatio(200, 0.8),
  fastEffects: springFromRatio(3800, 1),
  defaultEffects: springFromRatio(1600, 1),
  slowEffects: springFromRatio(800, 1),
};

/** Standard scheme (calmer, for utilitarian UI). */
export const standardSprings = {
  fastSpatial: springFromRatio(1400, 0.9),
  defaultSpatial: springFromRatio(700, 0.9),
  slowSpatial: springFromRatio(300, 0.9),
};

/** Legacy M3 easing curves for tween animations. */
export const easing = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.2, 0, 0, 1],
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Returns the spring, or an instant transition when the user prefers reduced motion. */
export function spring(name = 'defaultSpatial') {
  return prefersReducedMotion() ? { duration: 0 } : springs[name];
}
