import { cubicBezier } from 'motion-v';

/**
 * Material 3 Expressive motion for JavaScript animations (motion-v / Mapbox).
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

/** Easing functions for code that takes `t => t` (Mapbox camera, manual tweens). */
export const ease = {
  standard: cubicBezier(...easing.standard),
  emphasized: cubicBezier(...easing.emphasized),
  emphasizedDecelerate: cubicBezier(...easing.emphasizedDecelerate),
  emphasizedAccelerate: cubicBezier(...easing.emphasizedAccelerate),
};

/**
 * Camera motion. Maps travel further than UI, so camera moves use the M3
 * emphasized curve with extra-long durations; reduced motion jumps instead.
 */
export function cameraMotion(duration = 1000, curve = 'emphasized') {
  return prefersReducedMotion() ? { duration: 0 } : { duration, easing: ease[curve], essential: true };
}

/**
 * M3 shared-axis X transition for hierarchical navigation (list ⇄ detail).
 * `direction` is 1 going deeper, -1 going back; pass it as AnimatePresence
 * `custom` so the leaving view reads the latest value.
 */
export const sharedAxisX = {
  initial: (direction = 1) => ({ opacity: 0, x: 32 * direction }),
  enter: { opacity: 1, x: 0, transition: { x: springs.fastSpatial, opacity: { ...springs.defaultEffects, delay: 0.05 } } },
  // The outgoing view leaves quickly so the incoming one can take over.
  exit: (direction = 1) => ({
    opacity: 0,
    x: -32 * direction,
    transition: { duration: 0.12, ease: easing.emphasizedAccelerate },
  }),
};

/** Staggered "fade up" for content sections arriving in a view. */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  shown: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { y: { ...springs.defaultSpatial, delay: 0.04 * index }, opacity: { ...springs.defaultEffects, delay: 0.04 * index } },
  }),
};
