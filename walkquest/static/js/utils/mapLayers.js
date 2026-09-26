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

/** Layer definitions; colours come from the M3 tokens at runtime. */
export function walkLayers(colors) {
  const selected = ['boolean', ['feature-state', 'selected'], false];
  const hover = ['boolean', ['feature-state', 'hover'], false];
  const matched = ['==', ['get', 'match'], 1];
  return [
    {
      id: 'walks-halo',
      type: 'circle',
      source: 'walks',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 16, 16, 22],
        'circle-color': colors.primary,
        'circle-opacity': ['case', selected, 0.28, hover, 0.2, 0],
        'circle-opacity-transition': { duration: 150 },
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: 'walks-points',
      type: 'circle',
      source: 'walks',
      paint: {
        // Zoom must be the top-level input, so scale each stop by the state factor.
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          ...[[7, 4.5], [10, 6.5], [13, 8.5], [16, 11]].flatMap(([zoom, radius]) => [
            zoom,
            ['*', radius, ['case', selected, 1.35, hover, 1.25, matched, 1, 0.7]],
          ]),
        ],
        'circle-color': ['case', ['==', ['get', 'fav'], 1], colors.tertiary, colors.primary],
        'circle-opacity': ['case', matched, 1, 0.35],
        'circle-stroke-width': ['case', selected, 3, 2],
        'circle-stroke-color': colors.surface,
        'circle-stroke-opacity': ['case', matched, 1, 0.35],
        'circle-pitch-alignment': 'map',
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
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-optional': true,
      },
      paint: {
        'text-color': colors.onSurface,
        'text-halo-color': colors.surface,
        'text-halo-width': 1.5,
      },
    },
  ];
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
      },
    },
  ];
}
