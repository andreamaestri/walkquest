<template>
  <div class="location-search">
    <MapboxGeocoder
      :access-token="mapboxToken"
      :zoom="14"
      :placeholder="'Search locations...'"
      :countries="['GB']"
      :bbox="[-5.7, 49.9, -4.2, 50.9]"
      :language="'en-GB'"
      :limit="5"
      :types="['place', 'address', 'poi']"
      @result="handleGeocodeResult"
      @error="handleGeocodeError"
      @loading="handleGeocodeLoading"
      @clear="handleGeocodeClear"
    />

    <div v-if="searchStore.error" class="search-error" role="alert">
      {{ searchStore.error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useUiStore } from '../stores/ui'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  }
})

const searchStore = useSearchStore()
const uiStore = useUiStore()

const handleGeocodeResult = (result) => {
  if (result && result.result) {
    searchStore.handleLocationSelected(result.result)
    searchStore.setSearchMode('locations')
  }
}

const handleGeocodeError = (error) => {
  console.error('Geocoding error:', error)
  searchStore.setError(error.message)
}

const handleGeocodeLoading = (isLoading) => {
  uiStore.setLoadingState('location', isLoading)
}

const handleGeocodeClear = () => {
  searchStore.clearSearch()
}
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
