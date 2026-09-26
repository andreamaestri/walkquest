/**
 * Place search via the Mapbox Geocoding API (v6), biased to Cornwall.
 * Replaces @mapbox/mapbox-gl-geocoder, which pulled a large SDK into the map chunk.
 */
const ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/forward';
const CORNWALL_BBOX = '-6.5,49.8,-4.05,51.0';
const PROXIMITY = '-4.95,50.4';

const cache = new Map();

export async function searchPlaces(query, token, { signal } = {}) {
  const q = query.trim();
  if (q.length < 3 || !token) return [];
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    q,
    access_token: token,
    country: 'gb',
    bbox: CORNWALL_BBOX,
    proximity: PROXIMITY,
    limit: '5',
    types: 'place,locality,neighborhood,postcode,address,street',
    language: 'en',
  });
  const response = await fetch(`${ENDPOINT}?${params}`, { signal });
  if (!response.ok) return [];
  const data = await response.json();
  const places = (data.features || []).map((feature) => ({
    id: feature.id || feature.properties?.mapbox_id,
    name: feature.properties?.name || feature.properties?.full_address,
    detail: feature.properties?.place_formatted || '',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }));
  cache.set(key, places);
  return places;
}
