import { describe, expect, it } from 'vitest';
import {
  buildSearchIndex,
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
