import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { useWalksStore } from './walks';
import { filterWalks } from '../utils/walks';

const ORIGIN_KEY = 'walkquest-origin';

function readOrigin() {
  try {
    const value = JSON.parse(localStorage.getItem(ORIGIN_KEY) || 'null');
    return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The single filter pipeline. The list renders `results`; the map dims every
 * pin not in `matchIds`. Everything runs client-side over the in-memory index.
 */
export const useSearchStore = defineStore('search', () => {
  const walksStore = useWalksStore();

  /** 'explore' | 'nearby' | 'saved' */
  const mode = ref('explore');
  const query = ref('');
  const categories = ref([]);
  const difficulties = ref([]);
  const amenities = ref([]);
  const sort = ref('relevance');
  const radiusMiles = ref(10);
  /** { latitude, longitude, label, source: 'gps' | 'place' } */
  const origin = shallowRef(readOrigin());
  const locating = ref(false);
  const error = ref(null);

  const nearbyActive = computed(() => mode.value === 'nearby' && !!origin.value);

  const filters = computed(() => ({
    query: query.value,
    categories: categories.value,
    difficulties: difficulties.value,
    amenities: amenities.value,
    savedOnly: mode.value === 'saved',
    origin: origin.value,
    radiusMiles: nearbyActive.value ? radiusMiles.value : null,
    sort: nearbyActive.value && sort.value === 'relevance' && !query.value.trim() ? 'distance' : sort.value,
  }));

  const pipeline = computed(() =>
    filterWalks(walksStore.walks, filters.value, {
      searchIndex: walksStore.searchIndex,
      favoriteIds: walksStore.favoriteIds,
    }),
  );

  const results = computed(() => pipeline.value.walks);
  const distances = computed(() => pipeline.value.distances);
  const matchIds = computed(() => new Set(results.value.map((walk) => walk.id)));

  const activeFilterCount = computed(
    () =>
      categories.value.length +
      difficulties.value.length +
      amenities.value.length +
      (query.value.trim() ? 1 : 0) +
      (mode.value !== 'explore' ? 1 : 0),
  );
  const isFiltered = computed(() => activeFilterCount.value > 0);

  function setQuery(value) {
    query.value = value || '';
  }

  function toggleIn(listRef, value) {
    listRef.value = listRef.value.includes(value)
      ? listRef.value.filter((item) => item !== value)
      : [...listRef.value, value];
  }

  const toggleCategory = (slug) => toggleIn(categories, slug);
  const toggleDifficulty = (level) => toggleIn(difficulties, level);
  const toggleAmenity = (key) => toggleIn(amenities, key);

  function setMode(next) {
    mode.value = next;
    if (next !== 'nearby' && sort.value === 'distance') sort.value = 'relevance';
  }

  function setOrigin(value) {
    origin.value = value ? Object.freeze({ ...value }) : null;
    try {
      if (value) localStorage.setItem(ORIGIN_KEY, JSON.stringify(value));
      else localStorage.removeItem(ORIGIN_KEY);
    } catch {
      /* ignore storage errors */
    }
  }

  /** Uses the browser location as the origin for "Nearby". */
  function locate() {
    if (!navigator.geolocation) {
      error.value = 'Location is not available in this browser';
      return Promise.reject(new Error(error.value));
    }
    locating.value = true;
    error.value = null;
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          locating.value = false;
          const value = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: 'Your location',
            source: 'gps',
          };
          setOrigin(value);
          setMode('nearby');
          resolve(value);
        },
        (err) => {
          locating.value = false;
          error.value = err.code === 1 ? 'Location permission denied' : 'Could not find your location';
          reject(err);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }

  function clearFilters() {
    query.value = '';
    categories.value = [];
    difficulties.value = [];
    amenities.value = [];
    sort.value = 'relevance';
    mode.value = 'explore';
    error.value = null;
  }

  return {
    mode,
    query,
    categories,
    difficulties,
    amenities,
    sort,
    radiusMiles,
    origin,
    locating,
    error,
    nearbyActive,
    results,
    distances,
    matchIds,
    activeFilterCount,
    isFiltered,
    setQuery,
    toggleCategory,
    toggleDifficulty,
    toggleAmenity,
    setMode,
    setOrigin,
    locate,
    clearFilters,
  };
});
