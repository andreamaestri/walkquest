import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as api from '../services/api';
import { latestLogFor } from '../utils/adventureLog';

/** The signed-in user's logged walks, newest walk first. */
export const useAdventureStore = defineStore('adventure', () => {
  const adventures = ref([]);
  const loaded = ref(false);
  const isLoading = ref(false);
  const error = ref(null);
  let inflight = null;

  const byNewest = (list) =>
    [...list].sort(
      (a, b) => b.start_date.localeCompare(a.start_date) || b.created_at.localeCompare(a.created_at),
    );

  function load({ force = false } = {}) {
    if (loaded.value && !force) return Promise.resolve(adventures.value);
    if (inflight) return inflight;
    isLoading.value = true;
    error.value = null;
    inflight = api
      .fetchAdventures()
      .then((list) => {
        adventures.value = byNewest(list);
        loaded.value = true;
        return adventures.value;
      })
      .catch((e) => {
        error.value = e.message || 'Your adventures could not be loaded.';
        throw e;
      })
      .finally(() => {
        isLoading.value = false;
        inflight = null;
      });
    return inflight;
  }

  async function create(payload) {
    const entry = await api.logAdventure(payload);
    adventures.value = byNewest([entry, ...adventures.value]);
    return entry;
  }

  async function update(id, changes) {
    const entry = await api.updateAdventure(id, changes);
    adventures.value = byNewest(adventures.value.map((a) => (a.id === id ? entry : a)));
    return entry;
  }

  async function remove(id) {
    await api.deleteAdventure(id);
    adventures.value = adventures.value.filter((a) => a.id !== id);
  }

  /** Signing out (or in as someone else) must not leave the last user's log behind. */
  function clear() {
    adventures.value = [];
    loaded.value = false;
    error.value = null;
  }

  const latestFor = (walkId) => latestLogFor(adventures.value, walkId);
  const count = computed(() => adventures.value.length);

  return { adventures, loaded, isLoading, error, count, load, create, update, remove, clear, latestFor };
});
