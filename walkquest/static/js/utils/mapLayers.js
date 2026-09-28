/**
 * Pure builders for the Mapbox walk layer. Every walk is one feature in a
 * single GeoJSON source (no clustering), drawn on the GPU; hover/selection
 * are feature-state changes, so interaction cost doesn't grow with walk count.
 */
import { walkPinImageExpression } from './mapMarkers';

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

/** Layer definitions; colours come from the M3 tokens at runtime. */
export function walkLayers(colors) {
  const selected = ['boolean', ['feature-state', 'selected'], false];
  const hover = ['boolean', ['feature-state', 'hover'], false];
  const matched = ['==', ['get', 'match'], 1];
  const pin = {
    'icon-image': walkPinImageExpression(),
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  };
  return [
    {
      // M3 state layer: a tonal disc that blooms under hovered/selected pins.
      id: 'walks-halo',
      type: 'circle',
      source: 'walks',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 12, 12, 18, 16, 24],
        'circle-color': colors.primary,
        'circle-opacity': ['case', selected, 0.24, hover, 0.16, 0],
        'circle-opacity-transition': { duration: 150 },
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: 'walks-points',
      type: 'symbol',
      source: 'walks',
      layout: {
        ...pin,
        'icon-size': pinSize(),
        // Matches and favourites draw above filtered-out walks.
        'symbol-sort-key': ['+', ['get', 'match'], ['get', 'fav']],
      },
      paint: {
        // The selected walk gets its own pin (walks-selected); hide the base one.
        'icon-opacity': ['case', selected, 0, matched, 1, 0.4],
        'icon-opacity-transition': { duration: 150 },
      },
    },
    {
      // Symbol layout can't read feature-state, so the enlarged hover pin is a
      // filtered copy; WalkMap sets the filter to the hovered walk ids.
      id: 'walks-hover',
      type: 'symbol',
      source: 'walks',
      filter: ['in', ['get', 'walkId'], ['literal', []]],
      layout: { ...pin, 'icon-size': pinSize(1.35) },
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 11, 15, 13],
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-optional': true,
      },
      paint: {
        'text-color': colors.onSurface,
        'text-halo-color': colors.surface,
        'text-halo-width': 1.75,
        'text-halo-blur': 0.5,
        'text-opacity': ['case', selected, 0, 1],
      },
    },
    {
      // Teardrop pin standing on the selected walk; WalkMap springs its size in.
      id: 'walks-selected',
      type: 'symbol',
      source: 'walks',
      filter: ['==', ['get', 'walkId'], ''],
      layout: {
        'icon-image': 'walk-selected',
        'icon-anchor': 'bottom',
        'icon-size': 1,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    },
  ];
}

/** Pin scale by zoom; the hover layer multiplies it. */
const PIN_SIZES = [[7, 0.6], [10, 0.78], [13, 1], [16, 1.2]];
function pinSize(factor = 1) {
  return ['interpolate', ['linear'], ['zoom'], ...PIN_SIZES.flatMap(([zoom, size]) => [zoom, +(size * factor).toFixed(3)])];
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
      type: 'symbol',
      source: 'route-ends',
      layout: {
        // Badges from utils/mapMarkers: tertiary "play" start, primary flag finish.
        'icon-image': ['match', ['get', 'kind'], 'start', 'route-start', 'route-end'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 15, 1],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-emissive-strength': 1,
        // Faded in once the route has drawn itself on (see WalkMap drawRoute).
        'icon-opacity': 0,
        'icon-opacity-transition': { duration: 200, delay: 0 },
      },
    },
  ];
}

/**
 * Tap targets: walk pins are drawn 13–25px wide, far smaller than a fingertip,
 * so taps are resolved against a box around the touch point (M3 recommends
 * 48dp targets, i.e. a ~24px radius) and the closest pin wins.
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
