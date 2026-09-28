/**
 * Pure builders for the Mapbox walk layer. Every walk is one feature in a
 * single GeoJSON source (no clustering), drawn on the GPU; hover/selection
 * are feature-state changes, so interaction cost doesn't grow with walk count.
 */

export const CORNWALL_BOUNDS = [
  [-6.6, 49.6],
  [-3.9, 51.1],
];
export const CORNWALL_CENTER = [-4.95, 50.4];

/** Stable numeric feature ids (feature-state needs numbers for GeoJSON sources). */
export function buildIdIndex(walks) {
  const index = new Map();
  walks.forEach((walk, i) => index.set(walk.id, i + 1));
  return index;
}

export function walksToGeoJSON(walks, { idIndex, matchIds = null, favoriteIds = null } = {}) {
  const ids = idIndex || buildIdIndex(walks);
  return {
    type: 'FeatureCollection',
    features: walks.map((walk) => ({
      type: 'Feature',
      id: ids.get(walk.id),
      geometry: { type: 'Point', coordinates: [walk.longitude, walk.latitude] },
      properties: {
        walkId: walk.id,
        name: walk.walk_name,
        level: walk.difficulty?.level || 1,
        match: !matchIds || matchIds.has(walk.id) ? 1 : 0,
        fav: favoriteIds?.has(walk.id) ? 1 : 0,
      },
    })),
  };
}

/** Bounding box [[w, s], [e, n]] of any GeoJSON geometry/feature. */
export function geojsonBounds(input) {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
      return;
    }
    coords.forEach(visit);
  };
  const geometries = [];
  const collect = (obj) => {
    if (!obj) return;
    if (obj.type === 'FeatureCollection') obj.features.forEach(collect);
    else if (obj.type === 'Feature') collect(obj.geometry);
    else if (obj.type === 'GeometryCollection') obj.geometries.forEach(collect);
    else if (obj.coordinates) geometries.push(obj);
  };
  collect(input);
  geometries.forEach((g) => visit(g.coordinates));
  return Number.isFinite(w) ? [[w, s], [e, n]] : null;
}

/** First and last coordinate of a (Multi)LineString route, as point features. */
export function routeEndpoints(feature) {
  const geometry = feature?.geometry || feature;
  if (!geometry) return { type: 'FeatureCollection', features: [] };
  const lines = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates];
  const first = lines[0]?.[0];
  const lastLine = lines[lines.length - 1];
  const last = lastLine?.[lastLine.length - 1];
  const features = [];
  if (first) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: first }, properties: { kind: 'start' } });
  if (last && (last[0] !== first?.[0] || last[1] !== first?.[1])) {
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: last }, properties: { kind: 'end' } });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Walk pin geometry in logical px (see design/mapPin.js): a teardrop whose head
 * is centred at (cx, cy) with its tip at tipY, plus room for the ground shadow.
 */
export const PIN = { width: 30, height: 39, cx: 15, cy: 15, r: 12.5, tipY: 35 };
/** icon-size per zoom for a matching walk; filtered-out walks shrink to 72%. */
export const PIN_SIZE_STOPS = [[7, 0.62], [10, 0.78], [13, 0.95], [16, 1.1]];
export const PIN_HOVER_SCALE = 1.2;
export const PIN_SELECTED_SIZE = 1.3;

// Zoom must be the top-level input, so scale each stop by the factor.
function pinSize(factor) {
  return ['interpolate', ['linear'], ['zoom'], ...PIN_SIZE_STOPS.flatMap(([zoom, size]) => [zoom, ['*', size, factor]])];
}

/** Screen px from a pin's anchor (the walk's location) up to the centre of its head. */
export function pinHeadOffset(zoom, scale = 1) {
  const stops = PIN_SIZE_STOPS;
  let size = zoom <= stops[0][0] ? stops[0][1] : stops[stops.length - 1][1];
  for (let i = 1; i < stops.length; i++) {
    const [z0, s0] = stops[i - 1];
    const [z1, s1] = stops[i];
    if (zoom > z0 && zoom <= z1) size = s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0);
  }
  return (PIN.tipY - PIN.cy) * size * scale;
}

const pinLayout = {
  'icon-image': ['case', ['==', ['get', 'fav'], 1], 'walk-pin-fav', 'walk-pin'],
  'icon-anchor': 'bottom',
  // Shift down past the shadow so the tip sits exactly on the walk's location.
  'icon-offset': [0, PIN.height - PIN.tipY],
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
  // Pins lower on screen overlap the ones behind them, like real map pins.
  'symbol-z-order': 'viewport-y',
};

/**
 * Mapbox GL (3.x) throws in updateBuckets when a symbol layer's paint changes
 * while its source has feature-state but the layer itself has no state-dependent
 * paint (it reads `.paint` of an empty layer list). Every symbol layer on the
 * walks source therefore wraps one paint value in this no-op feature-state case.
 */
export function stateDependent(value) {
  return ['case', ['boolean', ['feature-state', 'selected'], false], value, value];
}

/** Layer definitions; colours come from the M3 tokens at runtime. */
export function walkLayers(colors) {
  const selected = ['boolean', ['feature-state', 'selected'], false];
  const hover = ['boolean', ['feature-state', 'hover'], false];
  const matched = ['==', ['get', 'match'], 1];
  return [
    {
      id: 'walks-points',
      type: 'symbol',
      source: 'walks',
      layout: { ...pinLayout, 'icon-size': pinSize(['case', matched, 1, 0.72]) },
      paint: {
        // Hovered/selected pins are redrawn larger by the layers above
        // (feature-state can't drive icon-size, only paint properties).
        'icon-opacity': ['case', selected, 0, hover, 0, matched, 1, 0.5],
        'icon-emissive-strength': 1,
      },
    },
    {
      id: 'walks-hover',
      type: 'symbol',
      source: 'walks',
      filter: ['in', ['get', 'walkId'], ['literal', []]],
      layout: { ...pinLayout, 'icon-size': pinSize(PIN_HOVER_SCALE) },
      paint: {
        'icon-opacity': ['case', selected, 0, 1],
        'icon-emissive-strength': 1,
      },
    },
    {
      id: 'walks-labels',
      type: 'symbol',
      source: 'walks',
      minzoom: 11.5,
      filter: ['==', ['get', 'match'], 1],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': 12,
        'text-offset': [0, 0.5],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-optional': true,
      },
      paint: {
        'text-color': colors.onSurface,
        'text-halo-color': colors.surface,
        'text-halo-width': 1.5,
        'text-opacity': stateDependent(1),
      },
    },
  ];
}

/** The selected walk's pin, above everything; WalkMap animates it dropping in. */
export function selectedPinLayer() {
  return {
    id: 'walks-selected',
    type: 'symbol',
    source: 'walks',
    filter: ['==', ['get', 'walkId'], ''],
    layout: { ...pinLayout, 'icon-size': PIN_SELECTED_SIZE },
    paint: { 'icon-opacity': stateDependent(1), 'icon-emissive-strength': 1 },
  };
}

export function routeLayers(colors) {
  return [
    {
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': colors.surface, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 10], 'line-emissive-strength': 1 },
    },
    {
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': colors.primary, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 6], 'line-emissive-strength': 1 },
    },
    {
      id: 'route-ends',
      type: 'circle',
      source: 'route-ends',
      paint: {
        'circle-radius': 6,
        'circle-color': ['match', ['get', 'kind'], 'start', colors.tertiary, colors.primary],
        'circle-stroke-width': 2,
        'circle-stroke-color': colors.surface,
        'circle-emissive-strength': 1,
        // Faded in once the route has drawn itself on (see WalkMap drawRoute).
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
        'circle-opacity-transition': { duration: 200, delay: 0 },
        'circle-stroke-opacity-transition': { duration: 200, delay: 0 },
      },
    },
  ];
}

/**
 * Tap targets: walk pins are ~12–22px wide, still smaller than a fingertip,
 * so taps are resolved against a box around the touch point (M3 recommends
 * 48dp targets, i.e. a ~24px radius) and the pin whose head is closest wins.
 */
export function hitRadius(coarsePointer) {
  return coarsePointer ? 24 : 8;
}

export function hitBox({ x, y }, radius) {
  return [
    [x - radius, y - radius],
    [x + radius, y + radius],
  ];
}

/** Picks the candidate nearest to `point`; each candidate is { feature, x, y } in screen px. */
export function nearestHit(candidates, point, radius = Infinity) {
  let best = null;
  let bestDistance = radius;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/** Mapbox GL JS v3 needs WebGL 2 (iOS 15+, current Android browsers). */
export function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}
