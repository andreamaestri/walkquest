import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../services/api';

/** The people the signed-in user has walked with (picked when logging a walk). */
export const useCompanionsStore = defineStore('companions', () => {
  const userCompanions = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  async function fetchUserCompanions() {
    isLoading.value = true;
    error.value = null;
    try {
      userCompanions.value = await api.fetchCompanions();
    } catch (e) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  /** Adds (or re-finds, if the name exists) a companion; resolves to it. */
  async function addCompanion(name) {
    const companion = await api.createCompanion(name);
    if (!userCompanions.value.some((c) => c.id === companion.id)) {
      userCompanions.value = [...userCompanions.value, companion];
    }
    return companion;
  }

  return { userCompanions, isLoading, error, fetchUserCompanions, addCompanion };
});
