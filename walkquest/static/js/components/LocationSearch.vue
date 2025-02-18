<template>
  <div class="location-search">
    <div class="search-container">
      <div class="search-bar" :class="{ 'is-error': searchStore.error }">
        <div class="search-input-wrapper">
          <input
            type="text"
            placeholder="Search locations..."
            :value="searchStore.searchQuery"
            @input="handleInput"
            class="search-input"
            aria-label="Search for a location"
            :disabled="isLoading"
          />
          
          <div class="input-actions">
            <div v-if="isLoading" class="loading-indicator">
              <iconify-icon icon="mdi:loading" class="animate-spin" />
            </div>
            
            <button 
              v-else-if="searchStore.searchQuery"
              @click="searchStore.clearSearch()" 
              class="clear-button"
              aria-label="Clear search"
            >
              <iconify-icon icon="mdi:close" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="searchStore.error" class="search-error" role="alert">
        {{ searchStore.error }}
      </div>
    </div>

    <!-- Location suggestions -->
    <div v-if="suggestions.length > 0" class="suggestions-list" role="listbox">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="suggestion-item"
        role="option"
        @click="handleLocationSelect(suggestion)"
      >
        <iconify-icon icon="mdi:map-marker" />
        <span>{{ suggestion.place_name }}</span>
      </button>
    </div>

    <!-- Empty state -->
    <div 
      v-else-if="searchStore.searchQuery && !isSearching && !suggestions.length" 
      class="empty-state"
      role="status"
    >
      <iconify-icon icon="mdi:map-marker-off" />
      <span>No locations found</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useSearchStore } from '../stores/searchStore'
import { useUiStore } from '../stores/ui'

const searchStore = useSearchStore()
const uiStore = useUiStore()
const emit = defineEmits(['location-selected'])

const suggestions = ref([])
const isSearching = ref(false)

// Add loading state computed property
const isLoading = computed(() => 
  searchStore.isLoading || 
  isSearching.value || 
  uiStore.loadingStates.location
)

const handleInput = (e) => {
  const value = e.target.value
  searchStore.debouncedSearch(value)
  
  if (value) {
    uiStore.setLoadingState('search', true)
    searchLocations(value)
  } else {
    suggestions.value = []
  }
}

const searchLocations = useDebounceFn(async (query) => {
  if (!query) {
    suggestions.value = []
    uiStore.setLoadingState('search', false)
    return
  }

  isSearching.value = true
  uiStore.setLoadingState('location', true)
  try {
    const bounds = '-5.7,49.9,-4.2,50.9'
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&country=GB&bbox=${bounds}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch location suggestions')
    }
    
    const data = await response.json()
    suggestions.value = data.features
  } catch (error) {
    console.error('Error fetching location suggestions:', error)
    suggestions.value = []
    searchStore.setError(error.message)
  } finally {
    isSearching.value = false
    uiStore.setLoadingState('location', false)
    uiStore.setLoadingState('search', false)
  }
}, 300)

const handleLocationSelect = (location) => {
  emit('location-selected', location)
  suggestions.value = []
  // Let the parent handle the search mode
}

// Clear suggestions when search is cleared
watch(() => searchStore.searchQuery, (newValue) => {
  if (!newValue) {
    suggestions.value = []
  }
})
</script>

<style scoped>
.location-search {
  position: relative;
  width: 100%;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 28px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 16px;
}

.search-input:focus {
  outline: none;
}

.suggestions-list {
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-style: italic;
}

.search-error {
  padding: 4px 8px;
  color: rgb(var(--md-sys-color-error));
  font-size: 0.875rem;
}

.loading-indicator {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  border-radius: 24px;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
}
</style>
