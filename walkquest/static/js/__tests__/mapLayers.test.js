import { describe, expect, it } from 'vitest';
import { buildIdIndex, geojsonBounds, hitBox, hitRadius, nearestHit, routeEndpoints, walkLayers, walksToGeoJSON } from '../utils/mapLayers';

const walks = [
  { id: 'x', walk_name: 'X', latitude: 50.1, longitude: -5.1, difficulty: { level: 2 } },
  { id: 'y', walk_name: 'Y', latitude: 50.2, longitude: -5.2, difficulty: { level: 4 } },
];

describe('walksToGeoJSON', () => {
  it('creates one point per walk with numeric ids and match/favourite flags', () => {
    const data = walksToGeoJSON(walks, { matchIds: new Set(['y']), favoriteIds: new Set(['x']) });
    expect(data.features).toHaveLength(2);
    expect(data.features.map((f) => f.id)).toEqual([1, 2]);
    expect(data.features[0].geometry.coordinates).toEqual([-5.1, 50.1]);
    expect(data.features[0].properties).toMatchObject({ walkId: 'x', match: 0, fav: 1 });
    expect(data.features[1].properties).toMatchObject({ walkId: 'y', match: 1, fav: 0, level: 4 });
  });

  it('treats every walk as matching when no filter is active', () => {
    const data = walksToGeoJSON(walks);
    expect(data.features.every((f) => f.properties.match === 1)).toBe(true);
  });

  it('keeps ids stable for the same walk order', () => {
    expect([...buildIdIndex(walks).entries()]).toEqual([['x', 1], ['y', 2]]);
  });
});

describe('route helpers', () => {
  const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-5, 50], [-4.9, 50.2], [-5.1, 50.1]] } };

  it('computes bounds for features and multilines', () => {
    expect(geojsonBounds(line)).toEqual([[-5.1, 50], [-4.9, 50.2]]);
    expect(geojsonBounds({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, -1], [3, 0]]] })).toEqual([[0, -1], [3, 1]]);
    expect(geojsonBounds(null)).toBeNull();
  });

  it('returns start and end points (one point for circular routes)', () => {
    expect(routeEndpoints(line).features.map((f) => f.properties.kind)).toEqual(['start', 'end']);
    const loop = { type: 'LineString', coordinates: [[0, 0], [1, 1], [0, 0]] };
    expect(routeEndpoints(loop).features).toHaveLength(1);
  });
});

describe('walkLayers', () => {
  it('never clusters and styles by feature-state', () => {
    const layers = walkLayers({ primary: '#000', tertiary: '#111', surface: '#fff', onSurface: '#222' });
    const points = layers.find((l) => l.id === 'walks-points');
    expect(JSON.stringify(points.paint)).toContain('feature-state');
    expect(layers.every((l) => l.source === 'walks')).toBe(true);
  });
});

describe('layer expressions', () => {
  it('keeps zoom interpolation at the top level of every paint/layout value', () => {
    const layers = walkLayers({ primary: '#000', tertiary: '#111', surface: '#fff', onSurface: '#222' });
    const usesZoom = (v) => JSON.stringify(v).includes('["zoom"]');
    for (const layer of layers) {
      for (const value of [...Object.values(layer.paint || {}), ...Object.values(layer.layout || {})]) {
        if (usesZoom(value)) expect(['interpolate', 'step']).toContain(value[0]);
      }
    }
  });
});

describe('tap targets', () => {
  it('uses a finger-sized radius on touch screens', () => {
    expect(hitRadius(true)).toBeGreaterThanOrEqual(24);
    expect(hitRadius(false)).toBeLessThan(hitRadius(true));
    expect(hitBox({ x: 100, y: 50 }, 24)).toEqual([[76, 26], [124, 74]]);
  });

  it('picks the pin closest to the touch point within the radius', () => {
    const candidates = [
      { feature: { id: 1 }, x: 110, y: 110 },
      { feature: { id: 2 }, x: 104, y: 98 },
      { feature: { id: 3 }, x: 160, y: 100 },
    ];
    expect(nearestHit(candidates, { x: 100, y: 100 }, 34).feature.id).toBe(2);
    expect(nearestHit(candidates, { x: 300, y: 300 }, 34)).toBeNull();
  });
});
