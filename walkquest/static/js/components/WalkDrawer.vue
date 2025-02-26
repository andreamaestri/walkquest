<template>
  <!-- Drawer with sliding animation, positioned to dock next to sidebar -->
  <aside 
    ref="drawerRef" 
    class="walk-drawer flex flex-col h-full fixed top-0 bottom-0 max-w-full z-[40] pointer-events-auto drawer-transition"
    :class="{ 'is-open': isOpen }"
    :style="{
      left: `var(--md-sys-sidebar-collapsed)`,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
    }"
  >
    <!-- Mapbox logo position adjuster -->
    <div 
      v-if="isOpen" 
      class="mapboxgl-logo-adjuster"
    ></div>
    <!-- Header -->
    <header ref="headerRef" 
            class="sticky top-0 z-10 flex items-center min-h-[64px] px-4 bg-surface-container-highest"
            style="box-shadow: var(--md-sys-elevation-level1);">
      <button 
        ref="backButtonRef" 
        class="m3-icon-button shrink-0" 
        @click="$emit('close')"
      >
        <div class="m3-state-layer">
          <Icon icon="mdi:arrow-back" class="text-2xl" />
        </div>
      </button>
      <h2 ref="titleRef" class="m3-headline-small text-on-surface pt-4 pr-4 mb-4 break-words">
        {{ walk.title || walk.walk_name }}
      </h2>
    </header>
    
    <!-- Main content -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-6">
        <!-- Key Info with proper layout -->
        <div ref="keyInfoRef" class="flex items-center gap-6">
          <div v-if="walk.distance" class="m3-label-large flex items-center gap-2">
            <Icon icon="mdi:map-marker-distance" class="text-xl text-primary" />
            <span>{{ walk.distance }} km</span>
          </div>
          <div v-if="walk.steepness" class="m3-label-large flex items-center gap-2">
            <Icon icon="mdi:trending-up" class="text-xl text-primary" />
            <span>{{ walk.steepness }}</span>
          </div>
        </div>

        <!-- Amenities Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div v-if="walk.has_pub" class="flex items-center gap-2 m3-label-large text-on-surface">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high">
              <Icon icon="mdi:glass-mug-variant" class="text-xl text-primary" />
            </div>
            <span>Pub Available</span>
            <Icon icon="mdi:check-circle" class="text-success ml-auto" />
          </div>
          <div v-if="walk.has_cafe" class="flex items-center gap-2 m3-label-large text-on-surface">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high">
              <Icon icon="mdi:tea" class="text-xl text-primary" />
            </div>
            <span>Café Available</span>
            <Icon icon="mdi:check-circle" class="text-success ml-auto" />
          </div>
          <div v-if="walk.has_stiles" class="flex items-center gap-2 m3-label-large text-on-surface">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high">
              <Icon icon="mdi:gate-alert" class="text-xl text-primary" />
            </div>
            <span>Has Stiles</span>
            <Icon icon="mdi:check-circle" class="text-success ml-auto" />
          </div>
          <div v-if="walk.has_bus_access" class="flex items-center gap-2 m3-label-large text-on-surface">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high">
              <Icon icon="mdi:bus" class="text-xl text-primary" />
            </div>
            <span>Bus Access</span>
            <Icon icon="mdi:check-circle" class="text-success ml-auto" />
          </div>
          <div v-if="walk.is_favorite" class="flex items-center gap-2 m3-label-large text-on-surface">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high">
              <Icon icon="mdi:heart" class="text-xl text-primary" />
            </div>
            <span>Favorite Walk</span>
            <Icon icon="mdi:check-circle" class="text-success ml-auto" />
          </div>
        </div>

        <!-- Action Buttons with proper layout -->
        <div ref="buttonsContainerRef" class="flex flex-col gap-3">
          <!-- Primary action -->
          <button
            :ref="el => buttonRefs[0] = el"
            class="m3-button m3-filled-button w-full h-10"
          >
            <div class="m3-button-state-layer">
              <div class="flex items-center justify-center gap-2">
                <Icon icon="mdi:play-circle" class="text-xl" />
                <span class="m3-label-large">Start Walk</span>
              </div>
            </div>
          </button>
          
          <!-- Secondary actions in a row -->
          <div class="flex gap-2">
            <button
              :ref="el => buttonRefs[1] = el"
              class="m3-button m3-tonal-button flex-1 h-10"
            >
              <div class="m3-button-state-layer">
                <div class="flex items-center justify-center gap-2">
                  <Icon icon="mdi:navigation" class="text-xl" />
                  <span class="m3-label-large">Directions</span>
                </div>
              </div>
            </button>
            
            <button
              :ref="el => buttonRefs[2] = el"
              class="m3-button m3-outlined-button w-10 h-10 !p-0"
            >
              <div class="m3-button-state-layer">
                <Icon icon="mdi:heart" class="text-xl" />
              </div>
            </button>
            
            <button
              :ref="el => buttonRefs[3] = el"
              class="m3-button m3-outlined-button w-10 h-10 !p-0"
            >
              <div class="m3-button-state-layer">
                <Icon icon="mdi:share" class="text-xl" />
              </div>
            </button>
          </div>
        </div>

        <!-- Content sections with proper spacing -->
        <div class="space-y-4">
          <!-- Description -->
          <section 
            v-if="walk.description" 
            :ref="el => sectionRefs[0] = el" 
            class="m3-surface-container-low rounded-xl p-4 space-y-3"
          >
            <h3 class="m3-title-medium text-on-surface">About</h3>
            <p class="m3-body-medium text-on-surface-variant">{{ walk.description }}</p>
          </section>

          <!-- Highlights -->
          <section 
            v-if="parsedHighlights.length" 
            :ref="el => sectionRefs[1] = el" 
            class="m3-surface-container-low rounded-xl p-4 space-y-3"
          >
            <h3 class="m3-title-medium text-on-surface">Highlights</h3>
            <ul class="list-disc pl-6 space-y-2">
              <li 
                v-for="highlight in parsedHighlights" 
                :key="highlight" 
                class="m3-body-medium text-on-surface-variant"
              >
                {{ highlight }}
              </li>
            </ul>
          </section>

          <!-- Points of Interest -->
          <section 
            v-if="parsedPOIs.length" 
            :ref="el => sectionRefs[2] = el" 
            class="m3-surface-container-low rounded-xl p-4 space-y-3"
          >
            <h3 class="m3-title-medium text-on-surface">Points of Interest</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="poi in parsedPOIs"
                :key="poi"
                class="m3-assist-chip"
              >
                {{ poi }}
              </span>
            </div>
          </section>

          <!-- Features & Categories -->
          <section 
            v-if="walk.features?.length || walk.categories?.length" 
            :ref="el => sectionRefs[3] = el"
            class="m3-surface-container-low rounded-xl p-4 space-y-3"
          >
            <h3 class="m3-title-medium text-on-surface">Trail Features</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="feature in walk.features"
                :key="feature.name"
                class="m3-filter-chip"
              >
                {{ feature.name }}
              </span>
              <span
                v-for="category in walk.categories"
                :key="category.name"
                class="m3-filter-chip"
              >
                {{ category.name }}
              </span>
            </div>
          </section>

          <!-- Pubs List -->
          <section 
            v-if="walk.pubs_list?.length" 
            class="m3-surface-container-low rounded-xl p-4 space-y-4"
          >
            <h3 class="m3-title-medium text-on-surface flex items-center gap-2">
              <Icon icon="mdi:beer" class="text-xl text-primary" />
              Nearby Pubs
              <span class="m3-label-small text-on-surface-variant ml-auto">{{ walk.pubs_list.length }} found</span>
            </h3>
            
            <div class="space-y-3">
              <div
                v-for="pub in walk.pubs_list"
                :key="pub.name"
                class="pub-card relative overflow-hidden"
              >
                <button
                  class="w-full group"
                  @click="openInGoogleMaps(pub)"
                >
                  <!-- Main pub info -->
                  <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-highest transition-all duration-200">
                    <!-- Pub icon container -->
                    <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                      <Icon 
                        icon="mdi:glass-mug-variant" 
                        class="text-2xl text-primary" 
                      />
                    </div>
                    
                    <!-- Pub details -->
                    <div class="flex-grow text-left">
                      <div class="flex items-center gap-2">
                        <h4 class="m3-title-small text-on-surface group-hover:text-primary transition-colors">
                          {{ pub.name }}
                        </h4>
                        <Icon 
                          v-if="pub.is_dog_friendly"
                          icon="mdi:dog" 
                          class="text-lg text-primary" 
                          title="Dog Friendly"
                        />
                      </div>
                      
                      <!-- Additional pub info -->
                      <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <div v-if="pub.distance" class="flex items-center gap-1">
                          <Icon icon="mdi:map-marker-distance" class="text-sm text-primary" />
                          <span class="m3-label-small text-on-surface-variant">{{ pub.distance }} km</span>
                        </div>
                        <div v-if="pub.rating" class="flex items-center gap-1">
                          <Icon icon="mdi:star" class="text-sm text-primary" />
                          <span class="m3-label-small text-on-surface-variant">{{ pub.rating }}/5</span>
                        </div>
                        <div v-if="pub.price_level" class="flex items-center gap-1">
                          <Icon icon="mdi:currency-gbp" class="text-sm text-primary" />
                          <span class="m3-label-small text-on-surface-variant">
                            {{ '£'.repeat(pub.price_level) }}
                          </span>
                        </div>
                      </div>
                      
                      <!-- Opening hours preview -->
                      <div v-if="pub.opening_hours" class="mt-2">
                        <p class="m3-label-small text-on-surface-variant flex items-center gap-1">
                          <Icon 
                            :icon="pub.opening_hours.open_now ? 'mdi:clock' : 'mdi:clock-outline'" 
                            class="text-sm"
                            :class="pub.opening_hours.open_now ? 'text-primary' : 'text-error'"
                          />
                          {{ pub.opening_hours.open_now ? 'Open Now' : 'Closed' }}
                        </p>
                      </div>
                    </div>
                    
                    <!-- Action icon -->
                    <div class="flex-shrink-0 self-center">
                      <Icon 
                        icon="mdi:open-in-new" 
                        class="text-lg text-on-surface-variant opacity-0 group-hover:opacity-100 transition-all duration-200" 
                      />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </section>

          <!-- Practical Information -->
          <section 
            v-if="walk.footwear_category || walk.trail_considerations" 
            :ref="el => sectionRefs[4] = el" 
            class="m3-surface-container-low rounded-xl p-4 space-y-3"
          >
            <h3 class="m3-title-medium text-on-surface">Practical Information</h3>
            <div class="space-y-4">
              <div v-if="walk.footwear_category" class="space-y-2">
                <strong class="m3-title-small text-on-surface">Recommended Footwear</strong>
                <p class="m3-body-medium text-on-surface-variant">{{ walk.footwear_category }}</p>
                <!-- Collapsible details for recommended footwear with animated open/close -->
                <details 
                  v-if="walk.recommended_footwear" 
                  class="m3-body-small text-on-surface-variant" 
                  ref="footwearDetailsRef" 
                  @toggle="toggleFootwearDetails"
                >
                  <summary>Show Details</summary>
                  <div class="details-content">
                    <p>{{ walk.recommended_footwear }}</p>
                  </div>
                </details>
              </div>
              <div v-if="walk.trail_considerations" class="space-y-2">
                <!-- Dog badge with enhanced styling -->
                <div v-if="dogConsiderations.length" class="mb-4">
                  <div class="m3-assist-chip-container">
                    <div class="m3-assist-chip-header flex items-center gap-2 mb-2">
                      <Icon icon="mdi:dog" class="text-xl text-primary" />
                      <span class="m3-title-small text-on-surface">Dogs</span>
                    </div>
                    <div class="m3-assist-chip-content pl-8">
                      <p class="m3-body-medium text-on-surface-variant">
                        {{ dogCombinedText }}
                      </p>
                    </div>
                  </div>
                </div>
                <!-- List of non-dog considerations -->
                <ul class="list-disc pl-6 space-y-2">
                  <li 
                    v-for="item in nonDogConsiderations" 
                    :key="item.text" 
                    class="m3-body-medium text-on-surface-variant"
                  >
                    {{ item.text }}
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { animate } from 'motion'
import { Icon } from '@iconify/vue'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  sidebarWidth: {
    type: Number,
    default: 80 // Default collapsed sidebar width (--md-sys-sidebar-collapsed)
  }
})

// Refs for animation targets
const drawerRef = ref(null)
const headerRef = ref(null)
const backButtonRef = ref(null)
const titleRef = ref(null)
const keyInfoRef = ref(null)
const buttonsContainerRef = ref(null)
const buttonRefs = ref([])
const sectionRefs = ref([])

// New ref for recommended footwear details element
const footwearDetailsRef = ref(null)

// Ref for tracking mapboxgl logo element
const mapboxLogoElement = ref(null)

// Enhanced animation configurations
const animationConfigs = {
  fluid: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
    restSpeed: 0.01,
    restDelta: 0.01
  },
  fluidFast: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.6,
    restSpeed: 0.01,
    restDelta: 0.01
  },
  easeOut: {
    easing: [0.22, 1, 0.36, 1],
    duration: 0.6
  }
}

// Initialize drawer position and animation
onMounted(() => {
  // Set initial position
  if (drawerRef.value) {
    drawerRef.value.style.width = '320px'
  }
  
  // Find mapboxgl logo element
  mapboxLogoElement.value = document.querySelector('.mapboxgl-ctrl-logo')
  
  // Adjust mapbox logo position when drawer opens/closes
  updateMapboxLogoPosition()
  
  // Add resize listener to handle responsive adjustments
  window.addEventListener('resize', updateMapboxLogoPosition)
})

// Clean up event listeners
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMapboxLogoPosition)
})

// Watch for changes in isOpen prop to trigger animations
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    openDrawer()
  } else {
    closeDrawer()
  }
}, { immediate: true })

// Function to open drawer with animation
function openDrawer() {
  if (!drawerRef.value) return
  
  // Animate drawer sliding in (now handled by CSS transitions through :style binding)
  
  // Update mapbox logo position
  updateMapboxLogoPosition()
}

// Function to close drawer with animation
function closeDrawer() {
  if (!drawerRef.value) return
  
  // Animation now handled by CSS transitions through :style binding
  
  // Reset mapbox logo position
  updateMapboxLogoPosition(true)
}

// Animation helper specifically for drawer elements
async function animateDrawerElement(el, animation, config = {}) {
  if (!el) return
  return animate(el, animation, {
    ...animationConfigs.fluid,
    ...config
  })
}

// Typography animation helper
function animateDrawerTypography() {
  const typographyElements = document.querySelectorAll(
    '.m3-headline-small, .m3-title-medium, .m3-title-small'
  )
  typographyElements.forEach(el => {
    el.style.opacity = '0'
    animateDrawerElement(el, {
      letterSpacing: ['-2px', '0px'],
      opacity: [0, 1]
    }, {
      duration: 0.4,
      easing: 'ease-out'
    })
  })
}

// Update animation sequence helper
async function runAnimationSequence(elements, animations, onComplete) {
  const promises = elements.map((el, i) => {
    if (!el) return Promise.resolve();
    return animate(
      el,
      animations[i].keyframes,
      {
        ...animationConfigs.fluid,
        ...animations[i].options,
        delay: (animations[i].options?.delay || 0) + (i * 0.05)
      }
    ).finished;
  });
  
  await Promise.all(promises);
  onComplete?.();
}

// Function to update mapboxgl-ctrl-logo position
function updateMapboxLogoPosition(isClosing = false) {
  if (!mapboxLogoElement.value) {
    mapboxLogoElement.value = document.querySelector('.mapboxgl-ctrl-logo')
    if (!mapboxLogoElement.value) return
  }
  
  // Calculate the total width of sidebar + drawer
  const sidebarWidth = props.sidebarWidth || 80
  const drawerWidth = drawerRef.value ? drawerRef.value.offsetWidth : 320
  const totalWidth = props.isOpen && !isClosing ? sidebarWidth + drawerWidth : sidebarWidth
  
  // Adjust logo position based on sidebar + drawer width
  if (props.isOpen && !isClosing) {
    // Move logo to the right of the drawer + sidebar
    mapboxLogoElement.value.style.left = `${totalWidth + 10}px`
    mapboxLogoElement.value.style.right = 'auto'
    mapboxLogoElement.value.style.transition = 'left 0.3s ease'
  } else {
    // Position logo to the right of sidebar when drawer is closed
    mapboxLogoElement.value.style.left = `${sidebarWidth + 10}px`
    mapboxLogoElement.value.style.right = 'auto'
  }
}

// Parse highlights with proper null checks
const parsedHighlights = computed(() => {
  const highlights = props.walk?.highlights;
  if (!highlights) return [];
  if (Array.isArray(highlights)) {
    return highlights.filter(h => h && h.length > 0);
  }
  if (typeof highlights === 'string') {
    return highlights.split(';')
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  return [];
})

// Parse POIs using semicolon as separator
const parsedPOIs = computed(() => {
  // Handle cases where points_of_interest could be null, undefined, or not an array
  const pois = props.walk?.points_of_interest;
  if (!pois) return [];
  
  // If it's already an array, filter it
  if (Array.isArray(pois)) {
    return pois.filter(poi => poi && poi.length > 0);
  }
  
  // If it's a string, split and filter
  if (typeof pois === 'string') {
    return pois.split(';')
      .map(poi => poi.trim())
      .filter(poi => poi.length > 0);
  }
  
  return [];
})

// Add new computed property for trail considerations
const parsedConsiderations = computed(() => {
  const considerations = props.walk?.trail_considerations;
  if (!considerations || !Array.isArray(considerations)) return [];
  
  return considerations
    .filter(consideration => consideration && consideration.length > 0)
    .map(consideration => processDogConsiderations(consideration));
})

// New computed properties to separate dog items from others
const dogConsiderations = computed(() => {
  return parsedConsiderations.value.filter(item => item.isDog);
});
const nonDogConsiderations = computed(() => {
  return parsedConsiderations.value.filter(item => !item.isDog);
});
const dogCombinedText = computed(() => {
  return dogConsiderations.value.map(item => item.text).join('; ');
});

// List of keys already displayed
const displayedKeys = ['title', 'walk_name', 'description', 'difficulty', 'distance', 'highlights', 'features', 'categories', 'points_of_interest']

// Compute additional info not explicitly displayed in the main section
const walkExtra = computed(() => {
  return Object.fromEntries(
    Object.entries(props.walk).filter(
      ([key, value]) =>
        !displayedKeys.includes(key) &&
        value !== null &&
        value !== '' &&
        (Array.isArray(value) ? value.length > 0 : true)
    )
  )
})

// Check if any additional info exists
const hasExtraInfo = computed(() => Object.keys(walkExtra.value).length > 0)

// Helper to format value if array or object
function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ')
  } else if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  } else {
    return value
  }
}

// Helper function to process dog considerations
function processDogConsiderations(consideration) {
  if (!consideration) return { text: '', isDog: false };
  const trimmed = consideration.trim();
  const startsWithDogs = trimmed.toLowerCase().startsWith('dogs');
  if (!startsWithDogs) return { text: consideration, isDog: false };
  const remainingText = trimmed.replace(/^dogs\s*[:,-]?\s*/i, '').trim();
  return { text: remainingText, isDog: true };
}

// Add new function to handle opening locations in Google Maps
function openInGoogleMaps(pub) {
  let mapsUrl = "";

  if (pub.name) {
    // If we have a pub name, that's our primary search term
    const searchQuery = encodeURIComponent(pub.name);

    if (props.walk.latitude && props.walk.longitude) {
      // Add coordinates to help locate the specific pub
      const latitude = props.walk.latitude;
      const longitude = props.walk.longitude;
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}&query=${encodeURIComponent(`places near ${latitude},${longitude}`)}`;
    } else {
      // Just search for the pub name if no coordinates
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    }
    //if you have the place id, you can add it here
    //mapsUrl += `&query_place_id=${encodeURIComponent(pub.place_id)}`;
  } else if (props.walk.latitude && props.walk.longitude) {
    // If we only have coordinates, we'll search for places near those coordinates
    const latitude = props.walk.latitude;
    const longitude = props.walk.longitude;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`places near ${latitude},${longitude}`)}`;
  }

  // Open the URL in a new tab/window
  if (mapsUrl) {
    window.open(mapsUrl, '_blank');
  }
}

// New function to animate details open/close changes
function toggleFootwearDetails(e) {
  const detail = e.target;
  const content = detail.querySelector('.details-content');
  if (detail.open) {
    // Expand: Animate from 0 to content scrollHeight then clear explicit height
    content.style.height = '0px';
    content.style.overflow = 'hidden';
    const targetHeight = content.scrollHeight;
    animate(content, 
      { height: [0, targetHeight + 'px'] }, 
      { duration: 0.3, easing: 'ease-out' }
    ).then(() => {
      content.style.height = '';
      content.style.overflow = 'visible';
    });
  } else {
    // Collapse: Animate from current height to 0
    content.style.height = content.offsetHeight + 'px';
    content.style.overflow = 'hidden';
    animate(content, 
      { height: [content.offsetHeight + 'px', '0px'] },
      { duration: 0.3, easing: 'ease-in' }
    );
  }
}
</script>

<style scoped>
@import "tailwindcss";

/* Drawer styles adjusted for docking next to sidebar */
.walk-drawer {
  width: 320px;
  will-change: transform;
  backface-visibility: hidden !important;
  z-index: 39 !important; /* Ensure drawer stays below navigation rail */
  box-shadow: var(--md-sys-elevation-level3);
  background-color: rgb(var(--md-sys-color-surface));
  transition: transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
  pointer-events: auto !important;
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  top: 0;
  bottom: 0;
  left: var(--md-sys-sidebar-collapsed); /* Position relative to collapsed sidebar */
  transform: translateX(-100%); /* Start hidden */
}

.drawer-transition {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left center;
}

/* Ensure proper positioning when drawer is open */
.walk-drawer.is-open {
  transform: translateX(0);
  margin-left: var(--md-sys-sidebar-collapsed); /* Add margin to prevent overlap */
}

/* Navigation rail styles for proper z-index and visibility */
.m3-navigation-rail {
  z-index: 45 !important; /* Ensure rail stays above drawer */
  visibility: visible !important;
  pointer-events: auto !important;
}

/* Enhanced header styling */
.walk-drawer .sticky {
  position: sticky;
  top: 0;
  background-color: rgb(var(--md-sys-color-surface));
  z-index: 10;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

/* Ensure proper stacking context */
.walk-drawer {
  isolation: isolate;
  transform-style: preserve-3d;
  perspective: 1000px;
}

/* Ensure mapboxgl logo adjusts properly */
.mapboxgl-ctrl-logo {
  position: fixed !important;
  bottom: 10px !important;
  z-index: 10000 !important;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure mapboxgl logo is always visible */
.mapboxgl-ctrl-logo {
  position: fixed !important;
  bottom: 10px !important;
  z-index: 10000 !important;
  transition: left 0.3s ease, right 0.3s ease;
}

/* Adjust drawer position to account for sidebar */
.walk-drawer.is-open {
  transform: translateX(0) !important;
}

/* Ensure mapboxgl logo is always visible */
.mapboxgl-ctrl-logo {
  position: fixed !important;
  bottom: 10px !important;
  z-index: 10000 !important;
  transition: left 0.3s ease, right 0.3s ease;
}

/* Adjuster for mapbox logo */
.mapboxgl-logo-adjuster {
  display: none; /* Hidden but used as a reference */
}

.flex-col {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
  transform-style: preserve-3d;
}

/* Enhanced MD3 Surface styles */
.m3-surface-container-highest {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  transform-origin: right center;
  backface-visibility: hidden;
  will-change: transform, opacity, filter;
  box-shadow: var(--md-sys-elevation-level3);
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bg-surface-container-highest {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

/* Enhanced text colors */
.text-on-surface {
  color: rgb(var(--md-sys-color-on-surface));
}

.text-on-surface-variant {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Enhanced icon button */
.m3-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface));
  transition: background-color 0.2s;
}

.m3-icon-button:hover {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-on-surface)) 8%, transparent);
}

.m3-icon-button:active {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-on-surface)) 12%, transparent);
}

/* Enhanced button styles */
.m3-button {
  position: relative;
  border-radius: 20px;
  font-family: var(--md-sys-typescale-label-large-font);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, background-color;
  overflow: hidden;
}

.m3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  box-shadow: var(--md-sys-elevation-level1);
}

.m3-filled-button:hover {
  box-shadow: var(--md-sys-elevation-level2);
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-primary)) 92%, rgb(var(--md-sys-color-on-primary)));
}

.m3-filled-button:active {
  box-shadow: var(--md-sys-elevation-level1);
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-primary)) 88%, rgb(var(--md-sys-color-on-primary)));
}

.m3-tonal-button {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.m3-tonal-button:hover {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-secondary-container)) 92%, rgb(var(--md-sys-color-on-secondary-container)));
}

.m3-tonal-button:active {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-secondary-container)) 88%, rgb(var(--md-sys-color-on-secondary-container)));
}

.m3-outlined-button {
  background-color: transparent;
  color: rgb(var(--md-sys-color-primary));
  border: 1px solid rgb(var(--md-sys-color-outline));
}

.m3-outlined-button:hover {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-primary)) 8%, transparent);
}

.m3-outlined-button:active {
  background-color: color-mix(in srgb, rgb(var(--md-sys-color-primary)) 12%, transparent);
}

/* Enhanced chip styles */
.m3-assist-chip {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  border-radius: 8px;
  min-height: 32px;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: var(--md-sys-typescale-label-large);
  border: 1px solid rgb(var(--md-sys-color-outline));
}

.m3-filter-chip {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  border-radius: 8px;
  height: 32px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  font: var(--md-sys-typescale-label-large);
  border: 1px solid rgb(var(--md-sys-color-outline));
}

/* Enhanced scrollbar styling */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--md-sys-color-outline-variant)) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgb(var(--md-sys-color-outline-variant));
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgb(var(--md-sys-color-outline));
}

/* Ensure proper stacking context */
.fixed {
  isolation: isolate;
  transform-style: preserve-3d;
  perspective: 1000px;
}

/* Enhanced chip container styles */
.m3-assist-chip-container {
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.m3-assist-chip-header {
  position: relative;
}

.m3-assist-chip-content {
  position: relative;
}

.m3-assist-chip-content p {
  margin: 0;
  line-height: 1.5;
}

/* Add new styles for amenities */
.text-success {
  color: rgb(var(--md-sys-color-primary));
}

.bg-surface-container-high {
  background-color: rgb(var(--md-sys-color-surface-container-high));
}

/* Add new styles for pub list */
.pub-card {
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
}

.pub-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--md-sys-elevation-level1);
}

.pub-card button {
  text-align: left;
  width: 100%;
}

.pub-card .text-error {
  color: rgb(var(--md-sys-color-error));
}

/* Enhanced hover states for pub cards */
.pub-card:hover .m3-title-small {
  color: rgb(var(--md-sys-color-primary));
}

.pub-card:active {
  transform: translateY(0);
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

/* Smooth transitions for all interactive elements */
.pub-card * {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Add ripple effect container */
.pub-card button {
  position: relative;
  overflow: hidden;
}

.pub-card button::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgb(var(--md-sys-color-on-surface));
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.pub-card button:active::after {
  opacity: 0.08;
}

/* Animation related styles for details elements */
details .details-content {
  transition: height 0.3s ease;
}

/* Add hover reveal zone styles */
.hover-reveal-zone {
  position: absolute;
  z-index: 60;
  background: transparent;
}

/* Add new styles for enhanced animations */
.m3-surface-container-highest {
  /* ...existing styles... */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform-origin: right center;
  will-change: transform, opacity, filter;
}

/* Update hover reveal zone */
.hover-reveal-zone {
  position: absolute;
  z-index: 60;
  background: linear-gradient(
    to right,
    rgb(var(--md-sys-color-surface-container-highest) / 0.1),
    transparent
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hover-reveal-zone:hover {
  opacity: 1;
}

/* Add hardware acceleration hints */
.flex-col {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}
</style>