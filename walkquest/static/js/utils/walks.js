/**
 * Pure helpers for the walk index: search, filtering, sorting and formatting.
 * Kept framework-free so they're cheap to run on every keystroke and easy to test.
 */

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles. */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Lowercase, strip accents/punctuation so "Café" matches "cafe". */
export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Precomputes lowercase search fields once per walk index so filtering is a
 * handful of `includes` calls per walk.
 */
export function buildSearchIndex(walks, categoryNames = new Map()) {
  const index = new Map();
  for (const walk of walks) {
    index.set(walk.id, {
      name: normalizeText(walk.walk_name),
      pois: normalizeText((walk.points_of_interest || []).join(' ')),
      text: normalizeText(
        [walk.excerpt, ...(walk.categories || []).map((slug) => categoryNames.get(slug) || slug)].join(' '),
      ),
    });
  }
  return index;
}

/** Relevance of a walk for a query (0 = no match). Every term must match somewhere. */
export function scoreWalk(entry, terms) {
  if (!entry) return 0;
  let score = 0;
  for (const term of terms) {
    if (entry.name.startsWith(term)) score += 8;
    else if (entry.name.includes(` ${term}`)) score += 6;
    else if (entry.name.includes(term)) score += 4;
    else if (entry.pois.includes(term)) score += 3;
    else if (entry.text.includes(term)) score += 1;
    else return 0;
  }
  return score;
}

export const AMENITY_FILTERS = {
  pub: (walk) => walk.has_pub,
  cafe: (walk) => walk.has_cafe,
  bus: (walk) => walk.has_bus_access,
  'no-stiles': (walk) => !walk.has_stiles,
};

/**
 * Runs the whole filter/sort pipeline.
 *
 * @returns {{ walks: object[], distances: Map<string, number> }}
 */
export function filterWalks(walks, filters, { searchIndex, favoriteIds } = {}) {
  const {
    query = '',
    categories = [],
    difficulties = [],
    amenities = [],
    savedOnly = false,
    origin = null,
    radiusMiles = null,
    sort = 'relevance',
  } = filters;

  const terms = normalizeText(query).split(' ').filter(Boolean);
  const categorySet = new Set(categories);
  const difficultySet = new Set(difficulties);
  const distances = new Map();
  const scores = new Map();
  const out = [];

  for (const walk of walks) {
    if (savedOnly && !favoriteIds?.has(walk.id)) continue;
    if (categorySet.size && !(walk.categories || []).some((slug) => categorySet.has(slug))) continue;
    if (difficultySet.size && !difficultySet.has(walk.difficulty?.level)) continue;
    if (amenities.length && !amenities.every((key) => AMENITY_FILTERS[key]?.(walk))) continue;

    if (origin) {
      const miles = distanceMiles(origin.latitude, origin.longitude, walk.latitude, walk.longitude);
      if (radiusMiles && miles > radiusMiles) continue;
      distances.set(walk.id, miles);
    }

    if (terms.length) {
      const score = scoreWalk(searchIndex?.get(walk.id), terms);
      if (!score) continue;
      scores.set(walk.id, score);
    }
    out.push(walk);
  }

  const byName = (a, b) => a.walk_name.localeCompare(b.walk_name);
  const comparators = {
    distance: (a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity) || byName(a, b),
    shortest: (a, b) => (a.distance ?? 0) - (b.distance ?? 0) || byName(a, b),
    longest: (a, b) => (b.distance ?? 0) - (a.distance ?? 0) || byName(a, b),
    name: byName,
    relevance: (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || byName(a, b),
  };
  let key = sort;
  if (sort === 'relevance' && !terms.length) key = origin ? 'distance' : 'name';
  out.sort(comparators[key] || byName);

  return { walks: out, distances };
}

/** "5.1 mi" */
export function formatMiles(miles, digits = 1) {
  if (miles == null || Number.isNaN(miles)) return '–';
  return `${Number(miles).toFixed(miles >= 10 ? 0 : digits)} mi`;
}

/**
 * Rough walking time for Cornish paths: 2.5 mph plus a little extra per
 * difficulty level, rounded to 15 minutes. Presented as an estimate.
 */
export function estimateMinutes(miles, level = 1) {
  if (!miles) return null;
  const minutes = (miles / 2.5) * 60 * (1 + (Math.max(1, level) - 1) * 0.08);
  return Math.max(15, Math.round(minutes / 15) * 15);
}

const BUS_WALK_RADIUS_M = 800;

function stopLabel(stop) {
  const name = stop.name || 'Bus stop';
  return stop.locality && !name.includes(stop.locality) ? `${name}, ${stop.locality}` : name;
}

// Up to ~20 minutes on foot reads better as time than distance.
const WALKABLE_M = 1600;
const MAX_LINES_SHOWN = 3;

function walkingDistance(metres) {
  if (metres <= WALKABLE_M) return `${Math.max(1, Math.round(metres / 80))} min walk`;
  return formatMiles(metres / 1609.34);
}

function joinTowns(towns) {
  return towns?.length ? `to ${towns.join(', ')}` : '';
}

function describeLine(line) {
  const often = line.per_day > 2 ? `~${line.per_day} a day` : 'limited service';
  return {
    line: line.line,
    detail: [line.operator, joinTowns(line.directions), line.days, often].filter(Boolean).join(' · '),
  };
}

function describeStop(role, stop) {
  const lines = stop.lines || [];
  return {
    role,
    label: stopLabel(stop),
    distance: walkingDistance(stop.distance_m),
    lines: lines.slice(0, MAX_LINES_SHOWN).map(describeLine),
    more: Math.max(0, lines.length - MAX_LINES_SHOWN),
  };
}

/**
 * Bus summary from a walk detail's `transport`: the nearest stop with buses
 * (NaPTAN + BODS timetables) at the start, and at the finish of linear walks.
 * Returns null when there's no data.
 *
 * @returns {{ reachable: boolean, headline: string, stops: object[] } | null}
 */
export function describeBusAccess(detail) {
  const start = detail?.transport?.start_stop;
  if (!start) return null;
  const end = detail.transport.end_stop;
  const served = Boolean(start.lines?.length);
  const reachable = served && start.distance_m <= BUS_WALK_RADIUS_M;

  let headline;
  if (!served) headline = 'No buses nearby';
  else if (reachable) headline = `Buses ${walkingDistance(start.distance_m)} from the start`;
  else headline = `Nearest buses ${walkingDistance(start.distance_m)} from the start`;

  const stops = [describeStop('Start', start)];
  if (end && end.atco !== start.atco) stops.push(describeStop('Finish', end));
  return { reachable, headline, stops: served ? stops : [] };
}

/**
 * Nearest rail station (within 5 km of the start), with operator and
 * destinations once TransportAPI has been checked. Null when there's none.
 */
export function describeTrainAccess(detail) {
  const station = detail?.transport?.station;
  if (!station) return null;
  const services = station.services;
  return {
    headline: `${station.name} station · ${walkingDistance(station.distance_m)} from the start`,
    detail: services
      ? [services.operators?.[0], joinTowns(services.destinations)].filter(Boolean).join(' ')
      : '',
  };
}

export function formatDuration(minutes) {
  if (!minutes) return '–';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Icons and short labels for the category chips (slugs from /api/tags). */
export const CATEGORY_META = {
  'circular-walks': { icon: 'material-symbols:sync-rounded', label: 'Circular' },
  'coastal-walks': { icon: 'material-symbols:waves-rounded', label: 'Coastal' },
  'pub-walks': { icon: 'material-symbols:sports-bar-rounded', label: 'Pub' },
  'walks-with-a-cafe': { icon: 'material-symbols:local-cafe-rounded', label: 'Café' },
  'walks-with-a-beach': { icon: 'material-symbols:beach-access-rounded', label: 'Beach' },
  'woodland-walks': { icon: 'material-symbols:forest-rounded', label: 'Woodland' },
  'riverside-walks': { icon: 'material-symbols:water-rounded', label: 'Riverside' },
  'walks-visiting-a-church': { icon: 'material-symbols:church-rounded', label: 'Church' },
  'walks-without-stiles': { icon: 'material-symbols:accessible-forward-rounded', label: 'No stiles' },
  'moorland-walks': { icon: 'material-symbols:landscape-rounded', label: 'Moorland' },
  'walks-with-a-fishing-village': { icon: 'material-symbols:phishing-rounded', label: 'Fishing village' },
  'walks-with-a-lighthouse-or-daymark': { icon: 'material-symbols:light-rounded', label: 'Lighthouse' },
  'walks-with-a-shipwreck': { icon: 'material-symbols:sailing-rounded', label: 'Shipwreck' },
  'walks-with-miningquarrying-heritage': { icon: 'material-symbols:hardware-rounded', label: 'Mining heritage' },
  'walks-with-prehistoric-remains': { icon: 'material-symbols:account-balance-rounded', label: 'Prehistoric' },
  'walks-with-a-holy-well': { icon: 'material-symbols:water-drop-rounded', label: 'Holy well' },
  'walks-with-nice-autumn-colours': { icon: 'material-symbols:eco-rounded', label: 'Autumn colours' },
  'walks-off-the-beaten-track': { icon: 'material-symbols:explore-rounded', label: 'Off the beaten track' },
  'walks-with-a-good-degree-of-shade': { icon: 'material-symbols:park-rounded', label: 'Shady' },
  'walks-least-likely-to-have-deep-mud': { icon: 'material-symbols:dry-rounded', label: 'Less muddy' },
  'one-way-coastal-walks': { icon: 'material-symbols:trending-flat-rounded', label: 'One-way coastal' },
  'walks-including-the-saints-way': { icon: 'material-symbols:signpost-rounded', label: "Saints' Way" },
  'walks-on-the-mining-trails': { icon: 'material-symbols:route-rounded', label: 'Mining Trails' },
  'walks-on-the-clay-trails': { icon: 'material-symbols:route-rounded', label: 'Clay Trails' },
};

export function categoryLabel(slug, names) {
  return CATEGORY_META[slug]?.label || names?.get(slug) || slug.replace(/-/g, ' ');
}

export function categoryIcon(slug) {
  return CATEGORY_META[slug]?.icon || 'material-symbols:label-rounded';
}
