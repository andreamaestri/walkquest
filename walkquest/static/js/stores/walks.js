import { defineStore } from 'pinia'
import { WalksAPI } from '../services/api'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    selectedWalk: null,
    expandedWalkId: null,
    pendingFavorites: new Set(),
    loading: false,
    filters: {
      search: '',
      categories: [],
      features: [],
      difficulty: null,
      hasStiles: null,
      hasBus: null
    }
  }),

  actions: {
    async fetchWalks() {
      this.loading = true
      try {
        const params = {
          search: this.filters.search || undefined,
          categories: this.filters.categories.length ? this.filters.categories.join(',') : undefined,
          features: this.filters.features.length ? this.filters.features.join(',') : undefined,
          difficulty: this.filters.difficulty || undefined,
          has_stiles: this.filters.hasStiles,
          has_bus: this.filters.hasBus
        }
        this.walks = await WalksAPI.list(params)
      } catch (error) {
        console.error('Error fetching walks:', error)
      } finally {
        this.loading = false
      }
    },

    async toggleFavorite(walkId) {
      if (this.pendingFavorites.has(walkId)) return
      
      this.pendingFavorites.add(walkId)
      try {
        const result = await WalksAPI.toggleFavorite(walkId)
        const walk = this.walks.find(w => w.id === walkId)
        if (walk) {
          walk.is_favorite = result.is_favorite
        }
      } catch (error) {
        console.error('Error toggling favorite:', error)
      } finally {
        this.pendingFavorites.delete(walkId)
      }
    },

    setSelectedWalk(walk) {
      this.selectedWalk = walk
    },

    expandWalk(walkId) {
      this.expandedWalkId = this.expandedWalkId === walkId ? null : walkId
    },

    updateFilters(newFilters) {
      this.filters = { ...this.filters, ...newFilters }
      this.fetchWalks()
    },

    resetFilters() {
      this.filters = {
        search: '',
        categories: [],
        features: [],
        difficulty: null,
        hasStiles: null,
        hasBus: null
      }
      this.fetchWalks()
    }
  }
})