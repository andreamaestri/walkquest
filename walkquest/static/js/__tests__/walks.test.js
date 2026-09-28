import { describe, expect, it } from 'vitest';
import {
  buildSearchIndex,
  describeBusAccess,
  describeTrainAccess,
  distanceMiles,
  estimateMinutes,
  filterWalks,
  formatDuration,
  formatMiles,
  normalizeText,
} from '../utils/walks';

const walk = (id, name, extra = {}) => ({
  id,
  walk_id: id,
  walk_name: name,
  latitude: 50.5,
  longitude: -4.7,
  distance: 4,
  difficulty: { level: 2 },
  categories: [],
  points_of_interest: [],
  excerpt: '',
  has_pub: false,
  has_cafe: false,
  has_bus_access: false,
  has_stiles: true,
  ...extra,
});

const walks = [
  walk('a', 'Caradon Hill to Trethevy Quoit', { points_of_interest: ['Trethevy Quoit'], categories: ['circular-walks'], distance: 5 }),
  walk('b', 'St Ives to Zennor', { categories: ['coastal-walks', 'pub-walks'], has_pub: true, latitude: 50.21, longitude: -5.48, distance: 6.5, difficulty: { level: 5 } }),
  walk('c', 'Lanhydrock Café Loop', { categories: ['walks-with-a-cafe'], has_cafe: true, has_stiles: false, distance: 2 }),
];
const index = buildSearchIndex(walks);

describe('normalizeText', () => {
  it('strips accents, apostrophes and punctuation', () => {
    expect(normalizeText("Café’s  Walk!")).toBe('cafes walk');
  });
});

describe('filterWalks', () => {
  it('returns every walk sorted by name when unfiltered', () => {
    const { walks: out } = filterWalks(walks, {}, { searchIndex: index });
    expect(out.map((w) => w.id)).toEqual(['a', 'c', 'b']);
  });

  it('searches names and points of interest, ranking name matches first', () => {
    const { walks: out } = filterWalks(walks, { query: 'quoit' }, { searchIndex: index });
    expect(out.map((w) => w.id)).toEqual(['a']);
    expect(filterWalks(walks, { query: 'cafe' }, { searchIndex: index }).walks.map((w) => w.id)).toEqual(['c']);
  });

  it('requires every search term to match', () => {
    expect(filterWalks(walks, { query: 'zennor quoit' }, { searchIndex: index }).walks).toHaveLength(0);
  });

  it('filters by category, difficulty, amenities and saved', () => {
    expect(filterWalks(walks, { categories: ['coastal-walks'] }).walks.map((w) => w.id)).toEqual(['b']);
    expect(filterWalks(walks, { difficulties: [5] }).walks.map((w) => w.id)).toEqual(['b']);
    expect(filterWalks(walks, { amenities: ['no-stiles'] }).walks.map((w) => w.id)).toEqual(['c']);
    expect(filterWalks(walks, { savedOnly: true }, { favoriteIds: new Set(['b']) }).walks.map((w) => w.id)).toEqual(['b']);
  });

  it('computes distances from an origin, applies the radius and sorts nearest first', () => {
    const origin = { latitude: 50.2, longitude: -5.47 };
    const { walks: out, distances } = filterWalks(walks, { origin, radiusMiles: 10, sort: 'distance' });
    expect(out.map((w) => w.id)).toEqual(['b']);
    expect(distances.get('b')).toBeLessThan(1);
  });

  it('sorts by length', () => {
    expect(filterWalks(walks, { sort: 'shortest' }).walks.map((w) => w.id)).toEqual(['c', 'a', 'b']);
    expect(filterWalks(walks, { sort: 'longest' }).walks.map((w) => w.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('formatting', () => {
  it('measures miles between points', () => {
    // Truro → Falmouth is roughly 7.6 miles as the crow flies.
    expect(distanceMiles(50.263, -5.051, 50.154, -5.071)).toBeCloseTo(7.6, 0);
  });
  it('formats distances and durations', () => {
    expect(formatMiles(5.04)).toBe('5.0 mi');
    expect(formatMiles(12.3)).toBe('12 mi');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatDuration(45)).toBe('45 min');
  });
  it('estimates walking time in 15 minute steps', () => {
    expect(estimateMinutes(5, 1)).toBe(120);
    expect(estimateMinutes(5, 5) % 15).toBe(0);
    expect(estimateMinutes(0)).toBeNull();
  });
});

describe('describeBusAccess', () => {
  const line79 = {
    line: '79', operator: 'Go Cornwall Bus', directions: ['Callington', 'Tavistock'], days: 'Mon–Sat', per_day: 38,
  };
  const stop = (extra) => ({
    atco: 'A', name: 'The Quay', locality: 'Calstock', distance_m: 150, lines: [line79], ...extra,
  });

  it('returns null without transport data', () => {
    expect(describeBusAccess({ transport: null })).toBeNull();
    expect(describeBusAccess(null)).toBeNull();
  });

  it('describes nearby stops and their lines', () => {
    const lines = ['1', '2', '3', '4'].map((line) => ({ ...line79, line, per_day: 1, directions: [] }));
    const info = describeBusAccess({
      transport: {
        start_stop: stop(),
        end_stop: stop({ atco: 'B', name: 'Car Park', locality: 'St Ives', distance_m: 40, lines }),
      },
    });
    expect(info.reachable).toBe(true);
    expect(info.headline).toBe('Buses 2 min walk from the start');
    const [start, finish] = info.stops;
    expect(start.label).toBe('The Quay, Calstock');
    expect(start.lines).toEqual([
      { line: '79', detail: 'Go Cornwall Bus · to Callington, Tavistock · Mon–Sat · ~38 a day' },
    ]);
    expect(finish.lines.map((l) => l.line)).toEqual(['1', '2', '3']);
    expect(finish.lines[0].detail).toBe('Go Cornwall Bus · Mon–Sat · limited service');
    expect(finish.more).toBe(1);
  });

  it('gives the distance to far-off buses', () => {
    const info = describeBusAccess({ transport: { start_stop: stop({ distance_m: 3620 }) } });
    expect(info.reachable).toBe(false);
    expect(info.headline).toBe('Nearest buses 2.2 mi from the start');
  });

  it('says so when no stop nearby has buses', () => {
    const info = describeBusAccess({ transport: { start_stop: stop({ lines: [] }) } });
    expect(info.reachable).toBe(false);
    expect(info.headline).toBe('No buses nearby');
    expect(info.stops).toEqual([]);
  });
});

describe('describeTrainAccess', () => {
  const station = { atco: '9100CALSTCK', name: 'Calstock', distance_m: 1210 };

  it('returns null without a station', () => {
    expect(describeTrainAccess({ transport: { station: null } })).toBeNull();
  });

  it('describes the station, with services once checked', () => {
    expect(describeTrainAccess({ transport: { station } })).toEqual({
      headline: 'Calstock station · 15 min walk from the start',
      detail: '',
    });
    const services = { operators: ['Great Western Railway'], destinations: ['Plymouth', 'Gunnislake'] };
    expect(describeTrainAccess({ transport: { station: { ...station, distance_m: 4000, services } } })).toEqual({
      headline: 'Calstock station · 2.5 mi from the start',
      detail: 'Great Western Railway to Plymouth, Gunnislake',
    });
  });
});
