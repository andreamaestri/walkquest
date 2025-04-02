<template>
  <div class="walk-list-container" :class="{ 'is-compact': isCompact }" ref="listContainer">
    <!-- Walk Content Area -->
    <div class="walks-section" :class="{
      'location-mode': searchMode === 'locations',
      'categories-mode': searchMode === 'categories'
    }">
      <!-- Category Selection UI -->
      <div v-if="searchMode === 'categories'" class="category-selection">
        <div class="category-header">
          <span v-if="selectedCategory" class="result-count">
            {{ resultCountText }}
          </span>
        </div>

        <!-- Category Cards Grid -->
        <div v-if="!selectedCategory" class="category-cards-direct">
          <button 
            v-for="category in availableCategories"
            :key="typeof category === 'string' ? category : (category.id || category.name || JSON.stringify(category))"
            class="category-card"
            :class="[
              getCategoryColorClass(category),
              { 'is-active': isCategoryActive(category), 'is-hovered': isCategoryHovered(category) }
            ]"
            @click="selectCategory(category)"
            @mouseenter="handleCategoryMouseEnter(category)"
            @mouseleave="handleCategoryMouseLeave"
          >
            <div class="category-card-icon">
              <Icon :icon="getCategoryIcon(category)" />
            </div>
            <span class="category-card-name">{{ formatCategoryName(category) }}</span>
          </button>
        </div>

        <!-- Selected Category Info Bar -->
        <div v-if="selectedCategory" class="selected-category-info" :class="getCategoryColorClass(selectedCategory)">
          <div class="selected-category">
            <Icon :icon="getCategoryIcon(selectedCategory)" />
            <span>{{ formatCategoryName(selectedCategory) }}</span>
          </div>
          <button class="clear-category" @click="clearCategory">
            <Icon icon="mdi:close" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <!-- Search Error Messages -->
      <div v-if="searchError" class="error-message" role="alert">
        {{ searchError }}
      </div>
      
      <!-- Dynamic Scroller for Walk Cards - Always present but conditionally populated -->
      <DynamicScroller 
        v-if="filteredResults.length > 0"
        ref="scroller" 
        class="scroller" 
        :items="filteredResults" 
        :min-item-size="isCompact ? 56 : 180"
        key-field="id" 
        :buffer="500" 
        :emit-update="true" 
        @update="handleScrollerUpdate" 
        role="list"
        aria-label="List of walks"
      >
        <template #default="{ item, index, active }">
          <DynamicScrollerItem 
            :item="item" 
            :active="active" 
            :data-index="index" 
            :size-dependencies="[
              item.walk_name,
              item.location,
              item.description,
              item.related_categories?.length,
              isCompact,
              selectedWalkId === item.id,
            ]" 
            :watch-data="false" 
            :emit-resize="true" 
            @resize="handleScrollerUpdate"
            role="listitem"
          >
            <div class="walk-card-wrapper">
              <WalkCard 
                :walk="item" 
                :is-compact="isCompact" 
                :is-selected="selectedWalkId === item.id"
                @walk-selected="handleWalkSelection"
              >
                <template v-if="searchMode === 'locations'" #meta>
                  <div class="distance-badge" :title="'Distance from selected location'">
                    <Icon icon="mdi:map-marker-distance" />
                    {{ locationStore.getFormattedDistance(item.id) }}
                  </div>
                </template>
              </WalkCard>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>

      <!-- Empty State Messages - Unified for all search modes -->
      <div v-else class="empty-state" role="status">
        <!-- Location mode empty states -->
        <div v-if="searchMode === 'locations'" class="empty-message">
          <Icon v-if="userLocation && !nearbyWalks.length" icon="mdi:map-marker-off" class="empty-icon" />
          <Icon v-else icon="mdi:map-marker-search" class="empty-icon" />
          <span v-if="userLocation && !nearbyWalks.length">No walks found near this location</span>
          <span v-else>Select a location to find nearby walks</span>
        </div>
        
        <!-- Category mode empty states -->
        <div v-else-if="searchMode === 'categories'" class="empty-message">
          <Icon v-if="selectedCategory" icon="mdi:tag-off" class="empty-icon" />
          <Icon v-else-if="!availableCategories.length" icon="mdi:tag-multiple" class="empty-icon" />
          <span v-if="selectedCategory">No walks found in this category</span>
          <span v-else-if="!availableCategories.length">No categories available</span>
        </div>
        
        <!-- Default empty states -->
        <div v-else class="empty-message">
          <Icon icon="mdi:hiking" class="empty-icon" />
          <span>No walks available</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { useMap } from '../composables/useMap'
import WalkCard from './WalkCard.vue'
import SearchView from './SearchView.vue'
import { useLocationStore } from '../stores/locationStore'
import { useSearchStore } from '../stores/searchStore'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'

const props = defineProps({
  walks: {
    type: Array,
    required: true,
  },
  selectedWalkId: {
    type: [String, Number],
    default: null,
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['walk-selected', 'location-selected'])

// UI interaction refs
const scroller = shallowRef(null)
const listContainer = shallowRef(null)
const hoverCategory = ref(null) // Track hovered category for visual feedback
const resizeObserver = shallowRef(null) // Define resizeObserver as a ref

// Initialize stores with storeToRefs for reactivity
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const { flyToLocation } = useMap()

// Extract reactive state from stores
const { searchQuery, searchMode, error: searchError, selectedCategory, availableCategories } = storeToRefs(searchStore)
const { userLocation, nearbyWalks } = storeToRefs(locationStore)

// Use shallowRef to optimize large data structures more specific icons
const filteredResults = shallowRef([])

// Updated category icons mapping to support all categories with more specific icons
const categoryIcons = {
  // Standard walk types
  'circular walks': 'mdi:rotate-right',
  'coastal walks': 'mdi:waves',
  'linear walks': 'mdi:arrow-right',
  'moorland walks': 'maki:wetland',
  'one-way coastal walks': 'mdi:waves-arrow-right',
  'mountain walks': 'mdi:mountain',
  'riverside walks': 'mdi:water',
  'woodland walks': 'maki:natural',
  
  // Amenities walks
  'pub walks': 'mdi:glass-mug-variant',
  'walks with a pub': 'mdi:glass-mug-variant',
  'walks with a café': 'mdi:coffee',
  'walks with a beach': 'mdi:beach',
  'walks with a fishing village': 'mdi:anchor',
  'walks with a lighthouse or daymark': 'mdi:lighthouse',
  'walks with a shipwreck': 'mdi:ship',
  
  // Heritage & special features
  'walks visiting a church': 'mdi:church',
  'walks including the saints way': 'mdi:church-outline',
  'walks with a holy well': 'mdi:water-well-outline',
  'walks with prehistoric remains': 'mdi:cross-celtic',
  'walks with mining/quarrying heritage': 'bitcoin-icons:mining-filled',
  'walks on the mining trails': 'healthicons:miner-worker-alt',
  'walks on the clay trails': 'mdi:terrain',
  'walks with nice autumn colours': 'stash:leaf-solid',
  
  // Accessibility & convenience
  'dog friendly walks': 'mdi:dog-side',
  'walks least likely to have deep mud': 'mdi:shoe-print',
  'walks without stiles': 'mdi:gate-open',
  'walks with a good degree of shade': 'mdi:weather-sunny-off',
  'walks off the beaten track': 'fa-solid:hiking',
  'family friendly walks': 'mdi:human-male-female-child',
  'accessible walks': 'mdi:wheelchair-accessibility',
  
  // Nature walks
  'walks with historical sites': 'mdi:castle',
  'walks with waterfalls': 'mdi:waterfall',
  'walks with wildlife': 'mdi:duck',
  
  // Default icon for unknown categories
  'default': 'mdi:tag-multiple'
}

// Category color groups for better theming - assign color classes based on category type
const getCategoryColorClass = (category) => {
  if (!category) return 'nature-category';
  
  const lowerCategory = typeof category === 'string' ? 
                        category.toLowerCase() : 
                        (category.name ? category.name.toLowerCase() : '');
  
  // Coastal & Water related
  if (lowerCategory.includes('coastal') || 
      lowerCategory.includes('beach') || 
      lowerCategory.includes('fishing') ||
      lowerCategory.includes('lighthouse') ||
      lowerCategory.includes('shipwreck') ||
      lowerCategory.includes('river') ||
      lowerCategory.includes('water')) {
    return 'water-category';
  }
  
  // Nature & Woodland
  if (lowerCategory.includes('woodland') || 
      lowerCategory.includes('tree') ||
      lowerCategory.includes('autumn') ||
      lowerCategory.includes('shade') ||
      lowerCategory.includes('mud') ||
      lowerCategory.includes('wildlife')) {
    return 'nature-category';
  }
  
  // Heritage & History
  if (lowerCategory.includes('church') || 
      lowerCategory.includes('mining') ||
      lowerCategory.includes('quarrying') ||
      lowerCategory.includes('historical') ||
      lowerCategory.includes('prehistoric') ||
      lowerCategory.includes('heritage') ||
      lowerCategory.includes('saints')) {
    return 'heritage-category';
  }
  
  // Amenities
  if (lowerCategory.includes('pub') || 
      lowerCategory.includes('café') ||
      lowerCategory.includes('cafe')) {
    return 'amenity-category';
  }
  
  // Hills & Mountains
  if (lowerCategory.includes('mountain') || 
      lowerCategory.includes('moorland')) {
    return 'mountain-category';
  }
  
  // Accessibility
  if (lowerCategory.includes('without stiles') || 
      lowerCategory.includes('accessible') ||
      lowerCategory.includes('family')) {
    return 'access-category';
  }
  
  // Default for others
  return 'default-category';
};

// Helper functions for categories
function getCategoryIcon(category) {
  if (!category) return categoryIcons.default;
  
  const categoryName = typeof category === 'string' ? category.toLowerCase() : 
                      (category.name ? category.name.toLowerCase() : '');
  
  return categoryIcons[categoryName] || categoryIcons.default;
}

function formatCategoryName(category) {
  if (!category) return '';
  // Capitalize first letter of each word
  return category.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Enhanced category interaction functions
function handleCategoryMouseEnter(category) {
  hoverCategory.value = category;
}

function handleCategoryMouseLeave() {
  hoverCategory.value = null;
}

function isCategoryActive(category) {
  return selectedCategory.value === category;
}

function isCategoryHovered(category) {
  return hoverCategory.value === category;
}

// More efficient computation of filtered results
const updateFilteredResults = () => {
  let results = props.walks;

  if (searchMode.value === 'locations' && userLocation.value) {
    filteredResults.value = nearbyWalks.value;
    return;
  }

  if (searchMode.value === 'categories' && selectedCategory.value) {
    console.log('Filtering by category:', selectedCategory.value);
    
    // Convert the selected category to lowercase for case-insensitive comparison
    const selectedCategoryLower = typeof selectedCategory.value === 'string' 
      ? selectedCategory.value.toLowerCase() 
      : selectedCategory.value.name?.toLowerCase() || '';
    
    filteredResults.value = results.filter(walk => {
      // Handle different category structures
      if (!walk.related_categories && !walk.categories) {
        return false;
      }
      
      // Try to match in related_categories first
      if (Array.isArray(walk.related_categories)) {
        const match = walk.related_categories.some(cat => {
          if (typeof cat === 'string') {
            return cat.toLowerCase().includes(selectedCategoryLower);
          } else if (cat && typeof cat === 'object') {
            if (cat.name) {
              return cat.name.toLowerCase().includes(selectedCategoryLower);
            } else if (cat.slug) {
              return cat.slug.replace(/-/g, ' ').toLowerCase().includes(selectedCategoryLower);
            }
          }
          return false;
        });
        
        if (match) return true;
      }
      
      // Try to match in categories as fallback
      if (Array.isArray(walk.categories)) {
        return walk.categories.some(cat => {
          if (typeof cat === 'string') {
            return cat.toLowerCase().includes(selectedCategoryLower);
          } else if (cat && typeof cat === 'object') {
            if (cat.name) {
              return cat.name.toLowerCase().includes(selectedCategoryLower);
            } else if (cat.slug) {
              return cat.slug.replace(/-/g, ' ').toLowerCase().includes(selectedCategoryLower);
            }
          }
          return false;
        });
      }
      
      return false;
    });
    
    console.log(`Found ${filteredResults.value.length} walks for category: ${selectedCategory.value}`);
    return;
  }

  const query = searchQuery.value?.toLowerCase().trim();
  if (!query) {
    filteredResults.value = results;
    return;
  }

  filteredResults.value = results.filter(walk => {
    const searchableText = [
      walk.walk_name,
      walk.title,
      walk.location,
      walk.description
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(query);
  });
}

// Handle location selection with improved error handling
const handleLocationSelected = async (location) => {
  if (!location) {
    console.warn('Invalid location data received');
    return;
  }

  try {
    // Update search mode and location
    searchStore.setSearchMode('locations');
    await locationStore.setUserLocation(location);
    emit('location-selected', location);
  } catch (error) {
    console.error('Error setting location:', error);
    searchStore.setError('Unable to process location');
  }
}

// Enhanced category selection handler with animation
const selectCategory = async (category) => {
  if (selectedCategory.value === category) {
    await animateCategorySelection(category, 'bounce');
    clearCategory();
    return;
  }
  await animateCategorySelection(category, 'pulse');
  searchStore.setSelectedCategory(category);
}

// Animate category selection
async function animateCategorySelection(category, animationType) {
  const categoryButtons = document.querySelectorAll('.category-card');
  const targetButton = Array.from(categoryButtons).find(btn => {
    const btnText = btn.querySelector('.category-card-name')?.textContent;
    return btnText && formatCategoryName(category) === btnText.trim();
  });

  if (!targetButton) return;

  try {
    // Use standard CSS easing functions instead of cubic-bezier arrays
    if (animationType === 'pulse') {
      await targetButton.animate(
        {
          scale: [1, 1.05, 1],
          backgroundColor: [
            'rgb(var(--md-sys-color-surface-container))',
            'rgb(var(--md-sys-color-primary-container))',
            'rgb(var(--md-sys-color-surface-container))'
          ]
        },
        {
          duration: 500,
          easing: 'ease-in-out'
        }
      ).finished;
    } else if (animationType === 'bounce') {
      await targetButton.animate(
        {
          scale: [1, 0.95, 1.05, 1],
          rotate: ['0deg', '-1deg', '1deg', '0deg']
        },
        {
          duration: 500,
          easing: 'ease-in-out'
        }
      ).finished;
    }
  } catch (error) {
    console.error('Animation error:', error);
    // Continue with selection even if animation fails
  }
}

// Clear category selection with safer animation
const clearCategory = async () => {
  if (selectedCategory.value) {
    const selectedCategoryInfoElement = document.querySelector('.selected-category-info');
    if (selectedCategoryInfoElement) {
      try {
        await selectedCategoryInfoElement.animate(
          {
            opacity: [1, 0],
            scale: [1, 0.95],
            transform: ['translateY(0px)', 'translateY(10px)']
          },
          {
            duration: 300,
            easing: 'ease-out'
          }
        ).finished;
      } catch (error) {
        console.error('Animation error:', error);
        // Continue with clearing even if animation fails
      }
    }
    searchStore.setSelectedCategory(null);
    updateFilteredResults();
  }
}

// Debounced search mode change for better UX
const handleSearchModeChange = debounce((mode) => {
  searchStore.setSearchMode(mode);
  // Clear any existing search when switching modes
  clearFilters();
  // Focus the search input after mode change
  nextTick(() => {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.focus();
    }
  });
}, 150);

// Optimized scroller update with microtask timing
const handleScrollerUpdate = () => {
  if (!scroller.value?.updateSize) return;
  // Use microtask for better performance than nextTick
  queueMicrotask(() => {
    scroller.value.updateSize();
  });
}

// Walk selection handler with improved error handling
const handleWalkSelection = async (walk) => {
  if (!walk) return;
  emit('walk-selected', walk);
}

// Helper function for debounced operations
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Improved computed properties
const showFilterStatus = computed(() => {
  return searchQuery.value || hasFilters.value || maxDistance.value;
})

const hasFilters = computed(() => {
  return searchMode.value === 'locations' && userLocation.value;
})

const maxDistance = computed(() => {
  return searchMode.value === 'locations' ? locationStore.searchRadius : null;
})

const resultCountText = computed(() => {
  const count = filteredResults.value.length;
  return `${count} ${count === 1 ? 'walk' : 'walks'} found`;
})

// Helper method
const formatDistance = (distance) => {
  if (!distance) return '';
  return `${distance / 1000}km radius`;
}

const clearFilters = () => {
  searchStore.clearSearch();
  locationStore.clearLocation();
  clearCategory();
}

// Animation handler for selected category display with safer animation
const animateSelectedCategoryAppearance = () => {
  const selectedCategoryInfoElement = document.querySelector('.selected-category-info');
  if (selectedCategoryInfoElement) {
    try {
      selectedCategoryInfoElement.animate(
        {
          opacity: [0, 1],
          scale: [0.95, 1],
          transform: ['translateY(10px)', 'translateY(0px)']
        },
        {
          duration: 400,
          easing: 'ease-out'
        }
      ).finished;
    } catch (error) {
      console.error('Animation error:', error);
      // Animation is non-essential, so continue if it fails
    }
  }
}

// Better lifecycle management
onMounted(() => {
  // Initial filtered results
  updateFilteredResults();

  // Debug categories data
  console.log('Available categories:', availableCategories.value);
  console.log('Search mode:', searchMode.value);
  
  // Setup ResizeObserver for responsive updates
  if (listContainer.value && window.ResizeObserver) {
    resizeObserver.value = new ResizeObserver(debounce(() => {
      handleScrollerUpdate();
    }, 100));
    
    resizeObserver.value.observe(listContainer.value);
  }

  // Prepare animation function for Motion with proper promise handling
  if (typeof window !== 'undefined') {
    if (!window.Motion) {
      window.Motion = {
        animate: (element, keyframes, options) => {
          try {
            const animation = element.animate(keyframes, options);
            // Safely handle .finished promise
            if (animation.finished) {
              return animation;
            } else {
              animation.finished = new Promise((resolve) => {
                animation.onfinish = resolve;
              });
              return animation;
            }
          } catch (error) {
            console.error('Animation API error:', error);
            // Return a mock animation object with a resolved promise
            return {
              finished: Promise.resolve(),
              cancel: () => { }
            };
          }
        }
      }
    }
  }
})

// Clean up on unmount
onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
})

// More efficient watchers
// Watch for changes to walks props
watch(() => props.walks, () => {
  updateFilteredResults();
  handleScrollerUpdate();
}, { immediate: true })

// Watch for query changes with debounce
watch(searchQuery, debounce(() => {
  updateFilteredResults();
  handleScrollerUpdate();
}, 100))

// Watch for search mode changes
watch(searchMode, (newMode) => {
  // Reset scroll position when changing modes
  updateFilteredResults();
  nextTick(() => {
    if (scroller.value?.$el) {
      scroller.value.$el.scrollTop = 0;
      handleScrollerUpdate();
    }
  });
})

// Watch for location changes
watch(userLocation, () => {
  if (searchMode.value === 'locations') {
    updateFilteredResults();
    handleScrollerUpdate();
  }
})

// Watch for nearby walks changes
watch(nearbyWalks, () => {
  if (searchMode.value === 'locations') {
    updateFilteredResults();
    handleScrollerUpdate();
  }
})

// Watch for category selection changes
watch(selectedCategory, (newCategory) => {
  if (searchMode.value === 'categories') {
    updateFilteredResults();
    handleScrollerUpdate();

    // Animate new category selection appearance
    if (newCategory) {
      nextTick(() => {
        animateSelectedCategoryAppearance();
      });
    }
  }
})
</script>

<style scoped>

.walk-list-container {
  color: rgb(var(--md-sys-color-on-surface));
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  
  @media (max-width: 768px) {
    height: 100%;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    background: rgb(var(--md-sys-color-surface));
    overflow: hidden;
        
    .walk-card-wrapper {
      padding: 4px;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    
    .category-selection {
      padding: 12px;
      border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
    }
  }
}

/* Search Wrapper Styles */
.search-wrapper {
  flex-shrink: 0;
  padding: 8px;
  min-height: 200px;
  background: rgb(var(--md-sys-color-on-surface-variant));
  /* More specific background */
  z-index: 1;
  border-radius: 12px;
}

/* Walks Section Styles */
.walks-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  text-align: center;
  min-height: 0;
  /* Important for flex-child scrolling */
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Empty Icon Style */
.empty-icon {
  font-size: 48px;
  height: 100%;
}
/* Scroller Styles */
.scroller {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgb(var(--md-sys-color-surface-container-low));
  height: 100%;
  color: rgb(var(--md-sys-color-on-surface));
  padding: 0;
  border-radius: 8px;
}

/* Walk Card Wrapper Styles */
.walk-card-wrapper {
  padding: 4px 0;
  width: 100%;
  box-sizing: border-box;
}

/* Location Info Styles */
.location-info {
  gap: 4px;
  padding: 8px 16px;
  color: rgb(var(--md-sys-color-primary));
  background: rgb(var(--md-sys-color-surface-container));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  display: flex;
  justify-content: space-between;
}

/* Distance Badge Icon Styles */
.distance-badge Icon {
  align-items: center;
  flex-shrink: 0;
}

/* Compact Mode Adjustments */
.walk-list-container.is-compact .walk-card-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--md-sys-color-on-surface));
  flex-direction: row;
  /* Adjusted to row for compact layout */
}

.walk-list-container.is-compact .search-wrapper {
  font-size: 0.875rem;
  padding: 4px;
  /* Reduced padding for compact mode */
}

/* Selected Location Icon Styles */
.selected-location Icon {
  color: rgb(var(--md-sys-color-primary));
  /* Location mode adjustment */
}

/* Search Wrapper in Location Mode Styles */
.search-wrapper.location-mode {
  font-size: 18px;
  padding: 8px 16px;
  /* Standard padding for location mode */
  isolation: isolate;
}

/* Clear Location Button Styles */
.clear-location {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.75rem;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  transition: all 0.2s ease;
  overflow-y: auto;
  /* Consider removing if not needed for clear-location itself */
}

.clear-location:hover {
  background: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  /* Added cursor for better UX */
}

/* Walks Section in Location Mode Styles */
.walks-section.location-mode {
  padding-top: 0;
  /* Reset padding top in location mode if needed */
}

/* Empty State Styles */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  height: 100%;
  color: rgb(var(--md-sys-color-on-surface));
  min-height: 200px;
  margin: 0;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 12px;
}

/* Empty Message Styles */
.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Empty Icon in Empty Message Styles */
.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

/* Error Message Styles */
.error-message {
  padding: 16px;
  margin: 8px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  background: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 8px;
  font-size: 0.875rem;
}

/* Distance Badge Styles */
.distance-badge {
  display: flex;
  align-items: center;
  /* Vertically center items in distance badge */
  gap: 4px;
  /* Spacing between icon and text */
  color: rgb(var(--md-sys-color-primary));
  font-size: 0.875rem;
}

.distance-badge Icon {
  font-size: 16px;
  /* Icon size inside distance badge */
}

/* RDS Direct Styles - Consider renaming for clarity */
.rds-direct {
  display: grid;
  /* Use grid for layout */
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  align-items: start;
  /* Align items to the start of the grid area */
}

/* Categories UI Styles */
.category-selection {
  padding: 16px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  overflow-y: auto;
  max-height: 100%;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.category-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
  position: relative;
}

.category-title::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: 0;
  bottom: -4px;
  width: 40px;
  height: 3px;
  background: linear-gradient(to right, rgb(var(--md-sys-color-primary)), rgb(var(--md-sys-color-tertiary)));
  opacity: 0.8;
  /* Added some opacity to the underline */
  transition: opacity 0.3s ease;
  /* Smooth opacity transition */
}

.result-count {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  padding: 4px 10px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  /* Prevent text from wrapping */
}


/* Category Cards Direct Layout */
.category-cards-direct {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  /* Adjusted size */
  gap: 12px;
  padding: 8px 0;
  font-size: 24px;
  justify-content: center;
  /* Center cards in the container */
}

/* Category Card Base Styles with Enhanced MD3 Color System */
.category-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  text-align: center;
  max-width: 100%;
  min-height: 130px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-1);
  will-change: transform, box-shadow;
  border: 1px solid transparent;
  background: linear-gradient(to bottom right, 
    rgb(var(--md-sys-color-surface-container-high)),
    rgb(var(--md-sys-color-surface-container)));
}

.category-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--md-sys-elevation-2);
}

/* Card backgrounds with hex values */
.category-card.water-category {
  background-color: #cce5ff;
  border-color: #99ccff;
}

.category-card.nature-category {
  background-color: #d7f0db;
  border-color: #b3e6b8;
}

.category-card.heritage-category {
  background-color: #ead6fd;
  border-color: #d4acfc;
}

.category-card.amenity-category {
  background-color: #ffd6d6;
  border-color: #ffb3b3;
}

.category-card.mountain-category {
  background-color: #e6d9d6;
  border-color: #ccb4ac;
}

.category-card.access-category {
  background-color: #fff2cc;
  border-color: #ffe699;
}

.category-card.default-category {
  background-color: #e0e0e0;
  border-color: #cccccc;
}

/* Enhanced MD3 Category Icons with vibrant solid colors */
.category-card-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-bottom: 12px;
  font-size: 28px;
  box-shadow: var(--md-sys-elevation-1);
  background: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}
/* Icon backgrounds with very saturated hex colors */
.category-card.water-category .category-card-icon {
  background-color: #00c8ff;
  color: #ffffff;
}

.category-card.nature-category .category-card-icon {
  background-color: #00e676;
  color: #003b1f;
}

.category-card.heritage-category .category-card-icon {
  background-color: #d500f9;
  color: #ffffff;
}

.category-card.amenity-category .category-card-icon {
  background-color: #ff3d00;
  color: #ffffff;
}

.category-card.mountain-category .category-card-icon {
  background-color: #8d6e63;
  color: #ffffff;
}

.category-card.access-category .category-card-icon {
  background-color: #ffab00;
  color: #3e2e00;
}

.category-card.default-category .category-card-icon {
  background-color: #37474f;
  color: #ffffff;
}

/* Active state styles for stronger visual feedback */
.category-card.is-active {
  box-shadow: var(--md-sys-elevation-2);
}

.category-card.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background-color: rgb(var(--md-sys-color-primary));
  border-radius: 0 0 16px 16px;
}

.category-card.water-category.is-active {
  background-color: rgba(var(--md-sys-color-tertiary-container), 0.35);
}

.category-card.nature-category.is-active {
  background-color: rgba(var(--md-sys-color-primary-container), 0.35);
}

.category-card.heritage-category.is-active {
  background-color: rgba(var(--md-sys-color-secondary-container), 0.35);
}

.category-card.amenity-category.is-active {
  background-color: rgba(var(--md-sys-color-error-container), 0.35);
}

.category-card.mountain-category.is-active {
  background-color: rgba(var(--md-sys-color-tertiary), 0.25);
}

.category-card.access-category.is-active {
  background-color: rgba(var(--md-sys-color-primary), 0.25);
}

.category-card.is-active::before {
  height: 6px;
}


.category-card-name {
  font-size: 0.9375rem;
  color: rgb(var(--md-sys-color-on-surface));
  line-height: 1.3;
  font-weight: 500;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  transition: color 0.3s ease;
  margin-top: 8px;
  /* Spacing between icon and text */
}

.category-card:hover .category-card-name {
  color: rgb(var(--md-sys-color-primary));
  /* Name color on hover */
}


/* Animated Selected Category Info */
.selected-category-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(to right,
      rgb(var(--md-sys-color-surface-container-high)),
      rgb(var(--md-sys-color-surface-container)));
  border-radius: 12px;
  margin-top: 16px;
  position: relative;
  overflow: hidden;
  animation: slide-in 0.4s cubic-bezier(0, 0, 0.2, 1);
  /* Slide-in animation */
  z-index: 1;
  /* Ensure it's above pseudo-elements */
}

.selected-category-info:hover .selected-category Icon {
  transform: scale(1.1) rotate(5deg);
  /* Icon hover animation */
}

@keyframes slide-in {
  from {
    transform: translateY(10px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}


.selected-category-info::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: none;
  /* Override base styles to remove generic gradient */
}


/* Highlight effect on selected category */
.selected-category-info::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right,
      rgba(var(--md-sys-color-primary), 0.1),
      rgba(var(--md-sys-color-tertiary), 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  /* Behind content */
  border-radius: inherit;
  /* Match container border-radius */
}

.selected-category-info:hover::after {
  opacity: 1;
  /* Show highlight on hover */
}


/* Clear Category Button Styles */
.clear-category {
  position: relative;
  /* For pseudo-element positioning */
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-primary));
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  /* Ensure text is above pseudo-element */
  overflow: hidden;
  /* Clip inner content for border-radius effect */
}

.clear-category::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--md-sys-color-primary), 0.1);
  border-radius: inherit;
  /* Match button border-radius */
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  /* Behind text */
}

.clear-category:hover::before {
  opacity: 1;
  /* Show background on hover */
}

.clear-category:hover {
  transform: translateY(-1px);
  /* Slight lift on hover */
}

.clear-category:active {
  transform: translateY(1px);
  /* Slight press effect */
}

.clear-category:hover Icon {
  transform: rotate(90deg);
  /* Example icon rotation on hover */
}

.clear-category Icon {
  font-size: 18px;
  /* Icon size */
  transition: transform 0.3s ease;
  /* Icon transition */
}

.selected-category {
  display: flex;
  align-items: center;
  gap: 14px; /* Increased spacing between icon and text */
  position: relative; /* For potential pseudo-elements */
  transition: transform 0.2s ease-out;
}

.selected-category:hover {
  transform: translateX(4px); /* Slight shift on hover */
}

.selected-category Icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 22px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px; /* Squared corners for more modern look */
  background: linear-gradient(135deg, 
    rgba(var(--md-sys-color-primary), 0.15),
    rgba(var(--md-sys-color-tertiary), 0.1));
  box-shadow: 0 2px 6px rgba(var(--md-sys-color-primary), 0.15);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy animation */
  flex-shrink: 0; /* Prevent icon from shrinking */
}

.selected-category span {
  font-weight: 500;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  color: rgb(var(--md-sys-color-on-surface));
  position: relative;
  padding-bottom: 2px; /* Space for underline */
}

.selected-category span::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 0;
  height: 2px;
  background: rgb(var(--md-sys-color-primary));
  transition: width 0.3s ease;
}

.selected-category:hover span::after {
  width: 100%; /* Animate underline on hover */
}

.selected-category-info:hover .selected-category Icon {
  transform: scale(1.1) rotate(5deg);
  /* Icon hover animation in selected info */
}


/* Media Queries for Responsiveness */
@media (max-width: 600px) {
  .category-cards-direct {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    /* Smaller cards on smaller screens */
    font-size: 1rem;
    /* Adjust font size if needed */
  }

  .selected-category {
    gap: 8px;
    /* Reduced gap in selected category for smaller screens */
  }

  .selected-category Icon {
    font-size: 20px;
    /* Smaller icon in selected category for smaller screens */
    width: 40px;
    height: 40px;
  }
}

/* Animation for Search Mode - Consider if these are actually used */
.search-mode-enter-active,
.search-mode-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
  /* Combined transitions */
}

.search-mode-enter-from,
.search-mode-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.search-mode-enter-to,
.search-mode-leave-from {
  opacity: 1;
  transform: translateY(0);
}


/* Category Color Themes */
/* Water Category */
.category-card.water-category .category-card-icon {
  background: linear-gradient(135deg, #0288d1, #4fc3f7);
  color: #fff;
}

.category-card.water-category:hover {
  border-color: rgba(2, 136, 209, 0.5);
}

.category-card.water-category:hover .category-card-name {
  color: #0288d1;
}

.selected-category-info.water-category {
  border-left: 4px solid #0288d1;
}

/* Nature Category */
.category-card.nature-category .category-card-icon {
  background: linear-gradient(135deg, #2e7d32, #66bb6a);
  color: #fff;
}

.category-card.nature-category:hover {
  border-color: rgba(46, 125, 50, 0.5);
}

.category-card.nature-category:hover .category-card-name {
  color: #2e7d32;
}

.selected-category-info.nature-category {
  border-left: 4px solid #2e7d32;
}

/* Heritage Category */
.category-card.heritage-category .category-card-icon {
  background: linear-gradient(135deg, #6a1b9a, #ab47bc);
  color: #fff;
}

.category-card.heritage-category:hover {
  border-color: rgba(106, 27, 154, 0.5);
}

.category-card.heritage-category:hover .category-card-name {
  color: #6a1b9a;
}

.selected-category-info.heritage-category {
  border-left: 4px solid #6a1b9a;
}

/* Amenity Category */
.category-card.amenity-category .category-card-icon {
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
}

.category-card.amenity-category:hover {
  border-color: rgba(198, 40, 40, 0.5);
}

.category-card.amenity-category:hover .category-card-name {
  color: #c62828;
}

.selected-category-info.amenity-category {
  border-left: 4px solid #c62828;
}

/* Mountain Category */
.category-card.mountain-category .category-card-icon {
  background: linear-gradient(135deg, #4e342e, #8d6e63);
  color: #fff;
}

.category-card.mountain-category:hover {
  border-color: rgba(78, 52, 46, 0.5);
}

.category-card.mountain-category:hover .category-card-name {
  color: #4e342e;
}

.selected-category-info.mountain-category {
  border-left: 4px solid #4e342e;
}

/* Access Category */
.category-card.access-category .category-card-icon {
  background: linear-gradient(135deg, #e65100, #ff9800);
  color: #fff;
}

.category-card.access-category:hover {
  border-color: rgba(230, 81, 0, 0.5);
}

.category-card.access-category:hover .category-card-name {
  color: #e65100;
}

.selected-category-info.access-category {
  border-left: 4px solid #e65100;
}

/* Default Category */
.category-card.default-category .category-card-icon {
  background: linear-gradient(135deg, #37474f, #78909c);
  color: #fff;
}

.category-card.default-category:hover {
  border-color: rgba(55, 71, 79, 0.5);
}

.category-card.default-category:hover .category-card-name {
  color: #37474f;
}

.selected-category-info.default-category {
  border-left: 4px solid #37474f;
}

/* Enhanced Media Queries for Responsiveness */
@media (max-width: 600px) {
  .category-cards-direct {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    /* Smaller cards on smaller screens */
    gap: 8px;
    padding: 4px 0;
  }

  .category-card {
    min-height: 100px; /* Reduce height on mobile */
    padding: 12px 8px; /* Reduce padding on mobile */
  }

  .category-card-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .category-card-name {
    font-size: 0.8125rem;
    margin-top: 6px;
  }

  .selected-category {
    gap: 8px;
    /* Reduced gap in selected category for smaller screens */
  }

  .selected-category Icon {
    font-size: 18px;
    /* Smaller icon in selected category for smaller screens */
    width: 32px;
    height: 32px;
  }

  .selected-category-info {
    padding: 8px 12px;
    margin-top: 12px;
  }

  .clear-category {
    padding: 6px 12px;
    font-size: 0.75rem;
  }

  .clear-category Icon {
    font-size: 14px;
  }

  .category-header {
    margin-bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .category-title {
    font-size: 1.125rem;
  }

  .result-count {
    font-size: 0.75rem;
    padding: 2px 8px;
  }

  .walk-list-container.is-compact .search-wrapper {
    padding: 2px;
    min-height: 160px;
  }

  .empty-state {
    min-height: 160px;
    padding: 16px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-message {
    gap: 12px;
    font-size: 0.875rem;
  }

  .error-message {
    padding: 12px;
    margin: 6px;
    font-size: 0.8125rem;
  }

  .category-selection {
    padding: 12px;
  }

  .distance-badge {
    font-size: 0.75rem;
  }

  .distance-badge Icon {
    font-size: 14px;
  }
}

/* Additional mobile breakpoint for extra small screens */
@media (max-width: 375px) {
  .category-cards-direct {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 6px;
  }
  .category-card {
    min-height: 90px;
    padding: 10px 6px;
  }
  .category-card-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  .category-card-name {
    font-size: 0.75rem;
    margin-top: 4px;
  }
  .category-title {
    font-size: 1rem;
  }
  .selected-category-info {
    padding: 6px 10px;
  }
  .selected-category span {
    font-size: 0.875rem;
  }
  .clear-category {
    padding: 4px 8px;
    font-size: 0.6875rem;
  }
  /* Improve touch targets on very small screens */
  .walk-card-wrapper {
    padding: 4px 2px;
    width: 100%;
  }
}

/* Add landscape orientation styles for better horizontal layout */
@media (max-height: 500px) and (orientation: landscape) {
  .category-cards-direct {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    max-height: 200px;
    overflow-y: auto;
  }

  .category-selection {
    max-height: 260px;
    overflow-y: auto;
  }

  .category-card {
    min-height: 100px;
  }

  .empty-state {
    min-height: 120px;
  }

  /* Use horizontal layout for some elements to maximize space */
  .empty-message {
    flex-direction: row;
    gap: 16px;
  }

  .category-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

/* Improve scroller touch interaction on mobile */
@media (hover: none) and (pointer: coarse) {
  .scroller {
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    scroll-behavior: smooth;
  }

  /* Increase touch targets */
  .category-card {
    transition: background-color 0.3s ease;
  }

  /* Active state for touch devices */
  .category-card:active {
    background-color: rgb(var(--md-sys-color-surface-container-high));
  }

  /* Remove hover effects that don't work well on touch */
  .category-card:hover {
    transform: none;
  }

  .category-card:hover .category-card-icon {
    transform: none;
  }

  /* Provide visual feedback on touch instead */
  .category-card:active .category-card-icon {
    transform: scale(1.05);
  }

  /* Better feedback for buttons on touch */
  .clear-category:active {
    opacity: 0.8;
  }
}
</style>