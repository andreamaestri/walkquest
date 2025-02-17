`<template>
  <div class="m3-location-search">
    <!-- Location Search Input -->
    <div class="m3-search-field">
      <div class="m3-text-field">
        <input 
          type="text"
          v-model="searchQuery"
          placeholder="Search location or enter postal code"
          @input="handleSearchInput"
          class="m3-text-field__input"
          :disabled="isLoadingLocation"
        >
        <div class="m3-text-field__icon">
          <iconify-icon 
            :icon="isLoadingLocation ? 'mdi:loading' : 'mdi:magnify'" 
            :class="{ 'animate-spin': isLoadingLocation }"
          />
        </div>
      </div>
    </div>

    <!-- Radius Filter -->
    <div class="m3-radius-filter">
      <label class="m3-label">Search radius</label>
      <select 
        v-model="selectedRadius" 
        class="m3-select"
        @change="handleRadiusChange"
      >
        <option v-for="radius in radiusOptions" 
                :key="radius.value" 
                :value="radius.value"
        >
          {{ radius.label }}
        </option>
      </select>
    </div>

    <!-- Get Current Location Button -->
    <button 
      class="m3-button"
      @click="getCurrentLocation"
      :disabled="isLoadingLocation"
    >
      <iconify-icon icon="mdi:crosshairs-gps" class="mr-2" />
      {{ isLoadingLocation ? 'Getting location...' : 'Use my location' }}
    </button>

    <!-- Search Results List -->
    <div v-if="searchResults.length" class="m3-search-results">
      <ul>
        <li v-for="result in searchResults" 
            :key="result.id"
            @click="selectLocation(result)"
            class="m3-search-result-item"
        >
          <iconify-icon icon="mdi:map-marker" class="mr-2" />
          {{ result.name }}
          <span class="text-sm text-gray-600">{{ result.address }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import debounce from 'lodash/debounce'

const locationStore = useLocationStore()

const searchQuery = ref('')
const selectedRadius = ref(10000) // 10km default

const radiusOptions = [
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '25km', value: 25000 },
  { label: '50km', value: 50000 }
]

const isLoadingLocation = computed(() => locationStore.isLoadingLocation)
const searchResults = computed(() => locationStore.searchResults)

// Debounced search handler
const handleSearchInput = debounce(async () => {
  await locationStore.searchLocations(searchQuery.value)
}, 300)

const handleRadiusChange = () => {
  locationStore.setSearchRadius(selectedRadius.value)
}

const getCurrentLocation = async () => {
  await locationStore.getUserLocation()
}

const selectLocation = (location) => {
  searchQuery.value = location.name
  locationStore.searchResults = []
  emit('location-selected', location)
}

// Clean up
onBeforeUnmount(() => {
  handleSearchInput.cancel()
})
</script>
