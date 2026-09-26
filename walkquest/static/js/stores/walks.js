import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';
import { openDB } from 'idb';
import {
  fetchFavoriteIds,
  fetchTags,
  fetchWalkDetail,
  fetchWalkIndex,
  toggleFavorite as apiToggleFavorite,
} from '../services/api';
import { buildSearchIndex } from '../utils/walks';
import { useToastStore } from './toast';

const DB_NAME = 'walkquest';
const STORE = 'kv';
const INDEX_KEY = 'walk-index:v1';

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE);
      },
    }).catch(() => null); // private mode / blocked storage: run without a cache
  }
  return dbPromise;
}

async function readCache() {
  try {
    return (await (await db())?.get(STORE, INDEX_KEY)) || null;
  } catch {
    return null;
  }
}

async function writeCache(value) {
  try {
    await (await db())?.put(STORE, value, INDEX_KEY);
  } catch {
    /* quota exceeded or storage unavailable — the network copy still works */
  }
}

/**
 * The whole walk index lives in memory (it's small), so every list, filter
 * and the map work off one array. Walk objects are frozen and held in a
 * shallowRef: Vue never deep-proxies hundreds of records.
 */
export const useWalksStore = defineStore('walks', () => {
  const walks = shallowRef([]);
  const etag = ref(null);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref(null);
  const categoryNames = shallowRef(new Map());
  const categoryUsage = shallowRef([]);
  const favoriteIds = shallowRef(new Set());
  const pendingFavorites = shallowRef(new Set());
  const details = shallowRef(new Map());

  const byId = computed(() => new Map(walks.value.map((walk) => [walk.id, walk])));
  const bySlug = computed(() => new Map(walks.value.map((walk) => [walk.walk_id, walk])));
  const searchIndex = computed(() => buildSearchIndex(walks.value, categoryNames.value));

  function setWalks(list) {
    walks.value = Object.freeze(list.map((walk) => Object.freeze(walk)));
  }

  let inflight = null;
  /** Stale-while-revalidate: render the cached index instantly, then revalidate with the ETag. */
  function loadWalks() {
    if (inflight) return inflight;
    inflight = (async () => {
      loading.value = !walks.value.length;
      error.value = null;
      try {
        if (!walks.value.length) {
          const cached = await readCache();
          if (cached?.walks?.length) {
            setWalks(cached.walks);
            etag.value = cached.etag;
            loaded.value = true;
            loading.value = false;
          }
        }
        const result = await fetchWalkIndex({ etag: etag.value });
        if (!result.notModified) {
          setWalks(result.walks);
          etag.value = result.etag;
          writeCache({ walks: result.walks, etag: result.etag, savedAt: Date.now() });
        }
        loaded.value = true;
      } catch (err) {
        error.value = err.message || 'Failed to load walks';
        if (!walks.value.length) throw err;
      } finally {
        loading.value = false;
        inflight = null;
      }
      return walks.value;
    })();
    return inflight;
  }

  async function loadTags() {
    if (categoryNames.value.size) return;
    try {
      const tags = await fetchTags();
      const categories = tags.filter((tag) => tag.type === 'category');
      categoryNames.value = new Map(categories.map((tag) => [tag.slug, tag.name]));
      categoryUsage.value = categories.sort((a, b) => b.usage_count - a.usage_count).map((tag) => tag.slug);
    } catch {
      /* chips fall back to slugs */
    }
  }

  async function loadFavorites() {
    try {
      favoriteIds.value = new Set(await fetchFavoriteIds());
    } catch {
      favoriteIds.value = new Set();
    }
  }

  function clearFavorites() {
    favoriteIds.value = new Set();
  }

  const isFavorite = (id) => favoriteIds.value.has(id);
  const isPendingFavorite = (id) => pendingFavorites.value.has(id);

  /** Optimistic toggle; rolls back if the API rejects it. */
  async function toggleFavorite(walkOrId) {
    const id = typeof walkOrId === 'object' ? walkOrId?.id : walkOrId;
    if (!id || pendingFavorites.value.has(id)) return;
    const toast = useToastStore();
    const walk = byId.value.get(id);
    const wasFavorite = favoriteIds.value.has(id);

    const setFavorite = (value) => {
      const next = new Set(favoriteIds.value);
      if (value) next.add(id);
      else next.delete(id);
      favoriteIds.value = next;
    };

    setFavorite(!wasFavorite);
    pendingFavorites.value.add(id);
    triggerRef(pendingFavorites);
    try {
      const result = await apiToggleFavorite(id);
      setFavorite(result.isFavorite);
      toast.show(`${walk?.walk_name || 'Walk'} ${result.isFavorite ? 'saved' : 'removed from saved walks'}`, 'success', 3000);
    } catch (err) {
      setFavorite(wasFavorite);
      const message = err.status === 401 || err.status === 403 ? 'Sign in to save walks' : 'Could not update saved walks';
      toast.show(message, 'error', 4000);
    } finally {
      pendingFavorites.value.delete(id);
      triggerRef(pendingFavorites);
    }
  }

  /** Full details (photos, pubs, trail notes…) for one walk, memoised. */
  async function fetchDetail(walk) {
    if (!walk) return null;
    if (details.value.has(walk.id)) return details.value.get(walk.id);
    const detail = await fetchWalkDetail(walk.walk_id || walk.id);
    const next = new Map(details.value);
    next.set(walk.id, Object.freeze(detail));
    details.value = next;
    return detail;
  }

  function prefetchDetail(walk) {
    if (walk && !details.value.has(walk.id)) fetchDetail(walk).catch(() => {});
  }

  const getWalkById = (id) => byId.value.get(id);
  const getWalkBySlug = (slug) => bySlug.value.get(slug);

  return {
    walks,
    etag,
    loading,
    loaded,
    error,
    categoryNames,
    categoryUsage,
    favoriteIds,
    details,
    byId,
    bySlug,
    searchIndex,
    loadWalks,
    loadTags,
    loadFavorites,
    clearFavorites,
    isFavorite,
    isPendingFavorite,
    toggleFavorite,
    fetchDetail,
    prefetchDetail,
    getWalkById,
    getWalkBySlug,
  };
});
