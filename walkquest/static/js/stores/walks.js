import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { WalksAPI } from '../services/api'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    selectedWalkId: null,
    pendingFavorites: new Set(),
    error: null,
    loading: false
  }),

  getters: {
    selectedWalk: (state) => state.walks.find(walk => walk.id === state.selectedWalkId),
    getWalkBySlug: (state) => (slug) => state.walks.find(walk => walk.slug === slug),
  },

  actions: {
    async loadWalks() {
      if (this.loading) return;
      this.loading = true;
      this.error = null;

      try {
        const walks = await WalksAPI.filterWalks();
        this.walks = walks;
        return walks;
      } catch (err) {
        console.error('Failed to load walks:', err);
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    setSelectedWalk(walkId) {
      this.selectedWalkId = walkId;
    },

    getWalkById(id) {
      return this.walks.find(walk => walk.id === id);
    },

    isPendingFavorite(walkId) {
      return this.pendingFavorites.has(walkId);
    },

    async toggleFavorite(walkId) {
      if (this.pendingFavorites.has(walkId)) return;
      
      const uiStore = useUiStore();
      this.pendingFavorites.add(walkId);
      
      try {
        const walk = this.walks.find(w => w.id === walkId);
        if (!walk) throw new Error('Walk not found');

        const result = await WalksAPI.toggleFavorite(walkId);
        walk.is_favorite = result.is_favorite;
        
        // Show success message
        const action = walk.is_favorite ? 'added to' : 'removed from';
        uiStore.showSnackbar(`${walk.walk_name} ${action} favorites`);
      } catch (error) {
        console.error('Error toggling favorite:', error);
        uiStore.showSnackbar('Failed to update favorite', 'error');
        throw error;
      } finally {
        this.pendingFavorites.delete(walkId);
      }
    },

    async loadWalksInArea(bounds, options = {}) {
      const {
        limit = 50,
        offset = 0,
        forceRefresh = false
      } = options;

      try {
        // Use the updated API method with location parameters
        const walks = await WalksAPI.filterWalks({
          latitude: bounds.north,
          longitude: bounds.west,
          radius: 5000, // 5km radius
          limit
        });
        
        // Merge with existing walks to avoid duplicates
        this.walks = [...new Map([...this.walks, ...walks].map(walk => [walk.id, walk])).values()];
        
        return walks;
      } catch (error) {
        console.error('Error loading walks in area:', error);
        throw error;
      }
    },

    setLoading(status) {
      this.loading = status;
      if (status) {
        this.error = null;
      }
    }
  }
});