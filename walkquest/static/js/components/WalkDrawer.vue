<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <!-- Full screen overlay container -->
    <div class="fixed inset-0 z-50 flex">
      <!-- Scrim with proper stacking -->
      <div 
        ref="scrimRef"
        class="absolute inset-0 bg-scrim"
        style="background-color: rgba(0, 0, 0, 0.4);"
        @click="$emit('close')"
      ></div>
      
      <!-- Drawer container with proper positioning -->
      <div 
        class="relative ml-auto flex flex-col m3-surface-container-highest"
        style="
          width: 100%;
          max-width: min(420px, 90vw);
          box-shadow: var(--md-sys-elevation-level3);
          border-radius: 0;
          border-left: 1px solid rgb(var(--md-sys-color-outline-variant));
          transform-origin: right center;
        "
        ref="drawerRef"
      >
        <!-- Header with proper elevation -->
        <header 
          ref="headerRef" 
          class="sticky top-0 z-10 flex items-center min-h-[64px] px-4 bg-surface-container-highest"
          style="box-shadow: var(--md-sys-elevation-level1);"
        >
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

        <!-- Main content with proper spacing -->
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
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { animate, spring } from 'motion'
import { Icon } from '@iconify/vue'

const props = defineProps({
  walk: {
    type: Object,
    required: true
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

// Enhanced animation configurations
const springConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
  restSpeed: 0.01,
  restDelta: 0.01
}

const fastSpringConfig = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
  mass: 0.7,
  restSpeed: 0.01
}

const easeOutConfig = {
  easing: [0.22, 1, 0.36, 1],
  duration: 0.6
}

// New function to animate typography for headings and titles
function animateTypography() {
  const typographyElements = document.querySelectorAll(
    '.m3-headline-small, .m3-title-medium, .m3-title-small'
  );
  typographyElements.forEach(el => {
    el.style.opacity = 0;
    animate(
      el,
      { letterSpacing: ['-2px', '0px'], opacity: [0, 1] },
      { duration: 0.4, easing: 'ease-out' }
    );
  });
}

async function onEnter(el, onComplete) {
  const drawer = drawerRef.value
  const scrim = scrimRef.value
  const header = headerRef.value
  const backButton = backButtonRef.value
  const title = titleRef.value
  const keyInfo = keyInfoRef.value
  const buttonsContainer = buttonsContainerRef.value
  const buttons = buttonRefs.value
  const sections = sectionRefs.value

  // Initial states
  drawer.style.transform = 'scale(0.98)'
  drawer.style.opacity = '0'
  scrim.style.opacity = '0'
  
  header.style.transform = 'scale(0.96)'
  header.style.opacity = '0'
  
  backButton.style.transform = 'scale(0.9)'
  backButton.style.opacity = '0'
  
  title.style.transform = 'scale(0.96)'
  title.style.opacity = '0'
  
  keyInfo.style.transform = 'scale(0.96)'
  keyInfo.style.opacity = '0'
  
  buttonsContainer.style.transform = 'scale(0.96)'
  buttonsContainer.style.opacity = '0'

  // Animate scrim and drawer together
  await Promise.all([
    animate(scrim, 
      { opacity: [0, 1] },
      { duration: 0.3, easing: [0.4, 0, 0.2, 1] }
    ),
    animate(drawer, 
      { 
        transform: ['scale(0.98)', 'scale(1)'],
        opacity: [0, 1]
      },
      { 
        ...springConfig,
        duration: 0.4,
        easing: [0.2, 0, 0, 1]
      }
    )
  ])

  // Animate header elements with stagger
  await Promise.all([
    animate(header,
      { 
        transform: ['scale(0.96)', 'scale(1)'],
        opacity: [0, 1]
      },
      { ...fastSpringConfig, duration: 0.3 }
    ),
    animate(backButton,
      { 
        transform: ['scale(0.9)', 'scale(1)'],
        opacity: [0, 1]
      },
      { ...fastSpringConfig, duration: 0.3, delay: 0.05 }
    ),
    animate(title,
      { 
        transform: ['scale(0.96)', 'scale(1)'],
        opacity: [0, 1]
      },
      { ...fastSpringConfig, duration: 0.3, delay: 0.1 }
    )
  ])

  // Animate content sections with stagger
  await Promise.all([
    animate(keyInfo,
      { 
        transform: ['scale(0.96)', 'scale(1)'],
        opacity: [0, 1]
      },
      { ...springConfig, duration: 0.3, delay: 0.15 }
    ),
    animate(buttonsContainer,
      { 
        transform: ['scale(0.96)', 'scale(1)'],
        opacity: [0, 1]
      },
      { ...springConfig, duration: 0.3, delay: 0.2 }
    ),
    ...buttons.map((button, i) =>
      animate(button,
        { 
          transform: ['scale(0.96)', 'scale(1)'],
          opacity: [0, 1]
        },
        { 
          ...fastSpringConfig,
          delay: 0.25 + (i * 0.05),
          duration: 0.3
        }
      )
    ),
    ...sections.map((section, i) =>
      animate(section,
        { 
          transform: ['scale(0.96)', 'scale(1)'],
          opacity: [0, 1]
        },
        {
          ...springConfig,
          delay: 0.3 + (i * 0.05),
          duration: 0.3
        }
      )
    )
  ])

  // Animate typography
  const typographyElements = document.querySelectorAll(
    '.m3-headline-small, .m3-title-medium, .m3-title-small'
  )
  for (const el of typographyElements) {
    el.style.opacity = '0'
    animate(
      el,
      { 
        opacity: [0, 1],
        scale: [0.96, 1]
      },
      { 
        duration: 0.3, 
        easing: [0.4, 0, 0.2, 1],
        delay: 0.35
      }
    )
  }

  onComplete()
}

async function onLeave(el, onComplete) {
  const drawer = drawerRef.value
  const scrim = scrimRef.value
  const sections = sectionRefs.value
  const buttons = buttonRefs.value
  const header = headerRef.value

  // Animate sections out with quick fade
  await Promise.all([
    ...sections.reverse().map((section, i) =>
      animate(section,
        { 
          transform: ['scale(1)', 'scale(0.96)'],
          opacity: [1, 0]
        },
        { 
          duration: 0.2,
          delay: i * 0.03,
          easing: [0.4, 0, 0.2, 1]
        }
      )
    ),
    ...buttons.reverse().map((button, i) =>
      animate(button,
        { 
          transform: ['scale(1)', 'scale(0.96)'],
          opacity: [1, 0]
        },
        { 
          duration: 0.2,
          delay: i * 0.02,
          easing: [0.4, 0, 0.2, 1]
        }
      )
    )
  ])

  // Animate header out
  await animate(header,
    { 
      transform: ['scale(1)', 'scale(0.96)'],
      opacity: [1, 0]
    },
    { 
      duration: 0.2,
      easing: [0.4, 0, 0.2, 1]
    }
  )

  // Animate drawer and scrim out together
  await Promise.all([
    animate(drawer,
      { 
        transform: ['scale(1)', 'scale(0.98)'],
        opacity: [1, 0]
      },
      { 
        duration: 0.25,
        easing: [0.4, 0, 1, 1]
      }
    ),
    animate(scrim,
      { opacity: [1, 0] },
      { duration: 0.25, easing: [0.4, 0, 1, 1] }
    )
  ])

  onComplete()
}

// Parse highlights using semicolons and newlines as separators
const parsedHighlights = computed(() => {
  if (!props.walk.highlights) return []
  return props.walk.highlights
    .split(/[;\n]+/)
    .map(h => h.trim())
    .filter(h => h.length > 0)
})

// Parse POIs using semicolon as separator
const parsedPOIs = computed(() => {
  if (!props.walk.points_of_interest) return []
  return props.walk.points_of_interest
    .split(';')
    .map(poi => poi.trim())
    .filter(poi => poi.length > 0)
})

// Add new computed property for trail considerations
const parsedConsiderations = computed(() => {
  if (!props.walk.trail_considerations) return []
  return props.walk.trail_considerations
    .split(/\.\s*\n/)
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .map(c => {
      // Ensure each ends with a period.
      const text = c.endsWith('.') ? c : c + '.';
      const result = processDogConsiderations(text);
      return result;
    });
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
      { height: [0, targetHeight] }, 
      { duration: 0.3, easing: 'ease-out' }
    ).then(() => {
      content.style.height = 'auto';
      content.style.overflow = 'visible';
    });
  } else {
    // Collapse: Animate from current height to 0
    content.style.height = content.offsetHeight + 'px';
    content.style.overflow = 'hidden';
    animate(content, 
      { height: [content.offsetHeight, 0] }, 
      { duration: 0.3, easing: 'ease-out' }
    );
  }
}
</script>

<style scoped>
@import "tailwindcss";

/* Enhanced MD3 Surface styles */
.m3-surface-container-highest {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  transform-origin: right center;
  backface-visibility: hidden;
  will-change: transform, opacity;
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
</style>