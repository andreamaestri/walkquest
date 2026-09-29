import { describe, expect, it } from 'vitest';
import { PIN, PIN_SIZE_STOPS, basemapAtmosphere, buildIdIndex, geojsonBounds, hitBox, hitRadius, nearestHit, pinHeadOffset, routeEndpoints, routeEndPaint, routeLayers, routePalette, selectedPinLayer, walkLayers, walksToGeoJSON } from '../utils/mapLayers';

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

describe('walk pins', () => {
  const colors = { primary: '#000', tertiary: '#111', surface: '#fff', onSurface: '#222' };

  it('draws every walk layer as a tip-anchored pin symbol', () => {
    const pins = [...walkLayers(colors), selectedPinLayer()].filter((l) => l.layout?.['icon-image']);
    expect(pins.map((l) => l.id)).toEqual(['walks-points', 'walks-hover', 'walks-selected']);
    for (const layer of pins) {
      expect(layer.type).toBe('symbol');
      expect(layer.layout['icon-anchor']).toBe('bottom');
      expect(layer.layout['icon-offset']).toEqual([0, PIN.height - PIN.tipY]);
    }
  });

  it('puts the head above the location, growing with zoom and scale', () => {
    const [[minZoom, minSize]] = PIN_SIZE_STOPS;
    const [maxZoom, maxSize] = PIN_SIZE_STOPS[PIN_SIZE_STOPS.length - 1];
    expect(pinHeadOffset(minZoom - 1)).toBeCloseTo((PIN.tipY - PIN.cy) * minSize);
    expect(pinHeadOffset(maxZoom + 1)).toBeCloseTo((PIN.tipY - PIN.cy) * maxSize);
    expect(pinHeadOffset(11.5)).toBeGreaterThan(pinHeadOffset(10));
    expect(pinHeadOffset(11.5)).toBeLessThan(pinHeadOffset(13));
    expect(pinHeadOffset(12, 1.2)).toBeCloseTo(pinHeadOffset(12) * 1.2);
  });
});

describe('route styling', () => {
  const colors = { primary: '#1a696c', surface: '#0a0f0f', onSurface: '#dce8e8' };

  it('uses a white casing on a light basemap and the surface colour on a dark one', () => {
    expect(routePalette(colors, false).casing).toBe('#ffffff');
    expect(routePalette(colors, true).casing).toBe(colors.surface);
  });

  it('draws the shadow, casing and line bottom-up, then the endpoints', () => {
    expect(routeLayers(colors).map((layer) => layer.id)).toEqual(['route-shadow', 'route-casing', 'route-line', 'route-ends']);
  });

  it('draws the start as a ring and the finish as a solid dot', () => {
    const paint = routeEndPaint(routePalette(colors, false));
    expect(paint['circle-color']).toEqual(['case', ['==', ['get', 'kind'], 'start'], '#ffffff', colors.primary]);
    expect(paint['circle-stroke-color']).toEqual(['case', ['==', ['get', 'kind'], 'start'], colors.primary, '#ffffff']);
  });
});

describe('basemapAtmosphere', () => {
  it('replaces the style lights with neutral day or dark night lights', () => {
    const day = basemapAtmosphere(false);
    const night = basemapAtmosphere(true);
    expect(day.lights.map((light) => light.id)).toEqual(['ambient', 'directional']);
    expect(day.lights[1].properties.color).toBe('hsl(0, 0%, 100%)');
    expect(night.lights[0].properties.color).toBe('hsl(217, 100%, 11%)');
    expect(night.fog['star-intensity']).toBeGreaterThan(0);
  });
});
