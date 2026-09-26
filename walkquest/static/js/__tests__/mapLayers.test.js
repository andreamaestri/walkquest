import { describe, expect, it } from 'vitest';
import { buildIdIndex, geojsonBounds, routeEndpoints, walkLayers, walksToGeoJSON } from '../utils/mapLayers';

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
