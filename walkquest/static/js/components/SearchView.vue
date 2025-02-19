<template>
  <div class="search-view">
    <div class="search-container">
      <Transition
        enter-active-class="search-enter"
        leave-active-class="search-leave"
        mode="out-in"
      >
        <div :key="searchMode" class="search-bar" :class="{ 
          'is-error': hasError,
          'location-mode': searchMode === 'locations'
        }">
          <div class="search-input-wrapper">
            <Icon 
              :icon="searchMode === 'locations' ? 'material-symbols:location-on' : 'material-symbols:search'" 
              class="search-icon"
              width="24" 
              height="24" 
            />
            <input
              ref="searchInput"
              v-model="searchQuery"
              class="search-input"
              type="text"
              :placeholder="searchPlaceholder"
              :aria-label="searchMode === 'locations' ? 'Search for a location' : 'Search walks'"
              @input="handleInput"
              @focus="handleFocus"
              @blur="handleBlur"
              @keydown.down.prevent="handleKeyDown"
              @keydown.up.prevent="handleKeyUp"
              @keydown.enter.prevent="handleEnter"
              @keydown.esc.prevent="handleEscape"
            />
            
            <div class="input-actions">
              <div v-if="isLoading" class="loading-indicator">
                <Icon icon="eos-icons:loading" width="24" height="24" class="animate-spin" />
              </div>
              <button v-if="canClear" class="clear-button" @click="clearSearch" title="Clear search">
                <Icon icon="material-symbols:close" width="24" height="24" />
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="hasError" class="search-error">
        {{ errorMessage }}
      </div>

      <Transition
        enter-active-class="animate-in"
        leave-active-class="animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="showSuggestions && searchMode === 'locations'" class="suggestions-dropdown">
          <template v-if="suggestions.length > 0">
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.id || index"
              class="suggestion-item"
              :class="{ 'is-selected': index === selectedIndex }"
              @mousedown.prevent="selectSuggestion(suggestion)"
              @mouseover="selectedIndex = index"
            >
              <Icon icon="material-symbols:location-on" width="24" height="24" />
              <div class="suggestion-content">
                <span class="suggestion-title">{{ getSuggestionText(suggestion) }}</span>
              </div>
            </button>
          </template>
          <div v-else-if="searchQuery && !isLoading" class="empty-state">
            <div class="suggestion-item">
              <Icon icon="material-symbols:search-off" width="24" height="24" />
              <span>No locations found</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <slot name="meta"></slot>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useWalksStore } from '../stores/walks'

const props = defineProps({
  searchMode: {
    type: String,
    default: 'walks',
    validator: (value) => ['walks', 'locations'].includes(value)
  }
})

const emit = defineEmits(['update:search-mode', 'location-selected', 'walk-selected'])

const searchStore = useSearchStore()
const walksStore = useWalksStore()
const searchInput = ref(null)
const selectedIndex = ref(-1)
const showSuggestions = ref(false)

// Update searchQuery to use computed with two-way binding to store
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
})

// Computed properties
const searchModeIcon = computed(() => 
  props.searchMode === 'walks' ? 'material-symbols:search' : 'material-symbols:location-on'
)

const searchModeTitle = computed(() => 
  props.searchMode === 'walks' ? 'Switch to location search' : 'Switch to walk search'
)

const searchPlaceholder = computed(() => 
  props.searchMode === 'locations' ? 'Search for a location...' : 'Search walks...'
)

const suggestions = computed(() => {
  if (props.searchMode === 'locations') {
    return searchStore.locationSuggestions
  }
  return [] // Don't show suggestions in walks mode
})

const isLoading = computed(() => searchStore.isLoading)
const hasError = computed(() => !!searchStore.error)
const errorMessage = computed(() => searchStore.error)
const canClear = computed(() => searchQuery.value.length > 0)

// Methods
const handleInput = (event) => {
  searchQuery.value = event.target.value
  if (props.searchMode === 'locations' && searchQuery.value.trim()) {
    searchStore.searchLocations(searchQuery.value)
  }
}

const handleFocus = () => {
  showSuggestions.value = true
}

const handleBlur = () => {
  // Delay hiding suggestions to allow click events to fire
  setTimeout(() => {
    showSuggestions.value = false
    selectedIndex.value = -1
  }, 200)
}

const handleKeyDown = () => {
  if (selectedIndex.value < suggestions.value.length - 1) {
    selectedIndex.value++
  }
}

const handleKeyUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const handleEnter = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    selectSuggestion(suggestions.value[selectedIndex.value])
  }
}

const handleEscape = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
  searchInput.value?.blur()
}

const clearSearch = () => {
  searchQuery.value = ''
  searchStore.clearSearch()
  if (props.searchMode === 'locations') {
    searchStore.clearLocationSuggestions()
  }
  searchInput.value?.focus()
}

const toggleSearchMode = () => {
  const newMode = props.searchMode === 'walks' ? 'locations' : 'walks'
  emit('update:search-mode', newMode)
  clearSearch()
}

const selectSuggestion = (suggestion) => {
  if (props.searchMode === 'locations') {
    searchQuery.value = suggestion.place_name
    emit('location-selected', suggestion)
  } else {
    searchQuery.value = suggestion.walk_name || suggestion.title
    emit('walk-selected', suggestion)
  }
  showSuggestions.value = false
  selectedIndex.value = -1
}

const getSuggestionIcon = (suggestion) => {
  if (props.searchMode === 'locations') {
    return 'material-symbols:location-on'
  }
  return 'material-symbols:search'
}

const getSuggestionText = (suggestion) => {
  if (props.searchMode === 'locations') {
    return suggestion.place_name
  }
  return suggestion.walk_name || suggestion.title
}

const onTransitionComplete = () => {
  if (!showSuggestions.value) {
    selectedIndex.value = -1
  }
}

// Watch for search mode changes
watch(() => props.searchMode, (newMode) => {
  clearSearch()
  nextTick(() => {
    searchInput.value?.focus()
  })
})
</script>

<style scoped>
.search-view {
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
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 28px;
  padding: 4px 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--md-sys-elevation-1);
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 16px;
  caret-color: rgb(var(--md-sys-color-primary));
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-input:focus {
  outline: none;
}

.search-input::placeholder {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.icon-button, .clear-button, .mode-toggle {
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

.icon-button:hover, .clear-button:hover, .mode-toggle:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
  color: rgb(var(--md-sys-color-on-surface));
}

.icon-button:active, .clear-button:active, .mode-toggle:active {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.12);
}

.search-meta {
  padding: 0 8px;
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  transform-origin: top;
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.animate-in {
  animation: dropdownEnter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-out {
  animation: dropdownLeave 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdownEnter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dropdownLeave {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
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

.suggestion-item.is-selected,
.suggestion-item:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.suggestion-item Icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 20px;
}

.search-bar.is-error {
  background: rgb(var(--md-sys-color-error-container));
}

.search-error {
  padding: 8px 16px;
  color: rgb(var(--md-sys-color-error));
  font-size: 0.875rem;
  background: rgb(var(--md-sys-color-error-container));
  border-radius: 8px;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-indicator {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.empty-state {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-style: italic;
  padding: 16px;
  text-align: center;
}

.empty-state .suggestion-item {
  cursor: default;
}

.empty-state .suggestion-item:hover {
  background: transparent;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.suggestion-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.suggestion-title {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.suggestion-subtitle {
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.search-enter {
  animation: searchEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-leave {
  animation: searchLeave 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes searchEnter {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes searchLeave {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

.search-bar.location-mode {
  background: rgb(var(--md-sys-color-surface-container));
  box-shadow: var(--md-sys-elevation-2);
}

.search-icon {
  color: rgb(var(--md-sys-color-on-surface-variant));
  flex-shrink: 0;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

/* Update suggestion styles for location mode */
.suggestions-dropdown {
  margin: 0 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.suggestion-item {
  padding: 16px;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.08);
}

.suggestion-item:last-child {
  border-bottom: none;
}
</style>
