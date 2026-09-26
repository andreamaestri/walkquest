/**
 * WalkQuest API client (fetch-based).
 *
 * The walk list is loaded once as a compact index (see walks store); heavier
 * details and route geometry are fetched on demand and memoised here.
 */

function csrfToken() {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='));
  if (cookie) return decodeURIComponent(cookie.split('=')[1]);
  return (
    document.querySelector('meta[name="csrf-token"]')?.content ||
    document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
    ''
  );
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRFToken': csrfToken() } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

async function json(path, options) {
  const response = await request(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, response.status);
  }
  return response.json();
}

/**
 * Loads the compact index of every walk. Pass the last ETag to revalidate:
 * resolves `{ notModified: true }` on 304, otherwise `{ walks, etag }`.
 */
export async function fetchWalkIndex({ etag, signal } = {}) {
  const response = await request('walks', {
    signal,
    headers: etag ? { 'If-None-Match': etag } : {},
  });
  if (response.status === 304) return { notModified: true, etag };
  if (!response.ok) throw new ApiError(`Failed to load walks (${response.status})`, response.status);
  return { walks: await response.json(), etag: response.headers.get('ETag') };
}

export async function fetchFavoriteIds() {
  const data = await json('walks/favorites');
  return data.ids || [];
}

const detailCache = new Map();
export function fetchWalkDetail(identifier) {
  if (!detailCache.has(identifier)) {
    const promise = json(`walks/${encodeURIComponent(identifier)}`).catch((error) => {
      detailCache.delete(identifier);
      throw error;
    });
    detailCache.set(identifier, promise);
  }
  return detailCache.get(identifier);
}

const geometryCache = new Map();
export function getGeometry(walkId) {
  if (!geometryCache.has(walkId)) {
    const promise = json(`walks/${walkId}/geometry`).catch((error) => {
      geometryCache.delete(walkId);
      throw error;
    });
    geometryCache.set(walkId, promise);
  }
  return geometryCache.get(walkId);
}

export async function toggleFavorite(walkId) {
  const data = await json(`walks/${walkId}/favorite`, { method: 'POST' });
  if (data.status !== 'success') throw new ApiError(data.message || 'Failed to update favourite', 401);
  return { walkId: data.walk_id, isFavorite: data.is_favorite };
}

export function fetchTags() {
  return json('tags');
}

export const WalksAPI = {
  fetchWalkIndex,
  fetchFavoriteIds,
  fetchWalkDetail,
  getGeometry,
  toggleFavorite,
  fetchTags,
};

export default WalksAPI;
