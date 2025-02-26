<template>
  <!-- Drawer with sliding animation, positioned to integrate with the navigation rail -->
  <Transition 
    :css="false"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div v-if="isOpen" ref="drawerRef" class="walk-drawer">
      <!-- Rail connector - visual element that connects to navigation rail -->
      <div ref="connectorRef" class="rail-connector"></div>

      <!-- Header with enhanced styling -->
      <header
        ref="headerRef"
        class="header-container sticky top-0 z-10"
      >
        <div class="header-content flex items-center min-h-[64px]">
          <button
            ref="backButtonRef"
            class="m3-icon-button shrink-0 ml-4"
            @click="$emit('close')"
          >
            <div class="m3-state-layer">
              <Icon icon="mdi:arrow-back" class="text-2xl" />
            </div>
          </button>
          <h2
            ref="titleRef"
            class="m3-headline-small text-on-surface pt-4 pl-2 pr-2 mb-4 break-words"
          >
            {{ walk.title || walk.walk_name }}
          </h2>
        </div>
      </header>

      <!-- Main content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-6">
          <!-- Key Info with proper layout -->
          <div ref="keyInfoRef" class="flex items-center gap-6">
            <div
              v-if="walk.distance"
              class="m3-label-large flex items-center gap-2"
            >
              <Icon icon="mdi:map-marker-distance" class="text-xl text-primary" />
              <span>{{ walk.distance }} km</span>
            </div>
            <div
              v-if="walk.steepness"
              class="m3-label-large flex items-center gap-2"
            >
              <Icon icon="mdi:trending-up" class="text-xl text-primary" />
              <span>{{ walk.steepness }}</span>
            </div>
          </div>

          <!-- Amenities Grid -->
          <div ref="amenitiesRef" class="grid grid-cols-2 gap-3">
            <div
              v-if="walk.has_pub"
              class="flex items-center gap-2 m3-label-large text-on-surface"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high"
              >
                <Icon icon="mdi:glass-mug-variant" class="text-xl text-primary" />
              </div>
              <span>Pub Available</span>
              <Icon icon="mdi:check-circle" class="text-success ml-auto" />
            </div>
            <div
              v-if="walk.has_cafe"
              class="flex items-center gap-2 m3-label-large text-on-surface"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high"
              >
                <Icon icon="mdi:tea" class="text-xl text-primary" />
              </div>
              <span>Café Available</span>
              <Icon icon="mdi:check-circle" class="text-success ml-auto" />
            </div>
            <div
              v-if="walk.has_stiles"
              class="flex items-center gap-2 m3-label-large text-on-surface"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high"
              >
                <Icon icon="mdi:gate-alert" class="text-xl text-primary" />
              </div>
              <span>Has Stiles</span>
              <Icon icon="mdi:check-circle" class="text-success ml-auto" />
            </div>
            <div
              v-if="walk.has_bus_access"
              class="flex items-center gap-2 m3-label-large text-on-surface"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high"
              >
                <Icon icon="mdi:bus" class="text-xl text-primary" />
              </div>
              <span>Bus Access</span>
              <Icon icon="mdi:check-circle" class="text-success ml-auto" />
            </div>
            <div
              v-if="walk.is_favorite"
              class="flex items-center gap-2 m3-label-large text-on-surface"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high"
              >
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
              :ref="(el) => (buttonRefs[0] = el)"
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
                :ref="(el) => (buttonRefs[1] = el)"
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
                :ref="(el) => (buttonRefs[2] = el)"
                class="m3-button m3-outlined-button w-10 h-10 !p-0"
              >
                <div class="m3-button-state-layer">
                  <Icon icon="mdi:heart" class="text-xl" />
                </div>
              </button>

              <button
                :ref="(el) => (buttonRefs[3] = el)"
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
              :ref="(el) => (sectionRefs[0] = el)"
              class="m3-surface-container-low rounded-xl p-4 space-y-3"
            >
              <h3 class="m3-title-medium text-on-surface">About</h3>
              <p class="m3-body-medium text-on-surface-variant">
                {{ walk.description }}
              </p>
            </section>

            <!-- Highlights -->
            <section
              v-if="parsedHighlights.length"
              :ref="(el) => (sectionRefs[1] = el)"
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
              :ref="(el) => (sectionRefs[2] = el)"
              class="m3-surface-container-low rounded-xl p-4 space-y-3"
            >
              <h3 class="m3-title-medium text-on-surface">Points of Interest</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="poi in parsedPOIs" :key="poi" class="m3-assist-chip">
                  {{ poi }}
                </span>
              </div>
            </section>

            <!-- Features & Categories -->
            <section
              v-if="walk.features?.length || walk.categories?.length"
              :ref="(el) => (sectionRefs[3] = el)"
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
                <span class="m3-label-small text-on-surface-variant ml-auto"
                  >{{ walk.pubs_list.length }} found</span
                >
              </h3>

              <div class="space-y-3">
                <div
                  v-for="pub in walk.pubs_list"
                  :key="pub.name"
                  class="pub-card relative overflow-hidden"
                >
                  <button class="w-full group" @click="openInGoogleMaps(pub)">
                    <!-- Main pub info -->
                    <div
                      class="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-highest transition-all duration-200"
                    >
                      <!-- Pub icon container -->
                      <div
                        class="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center"
                      >
                        <Icon
                          icon="mdi:glass-mug-variant"
                          class="text-2xl text-primary"
                        />
                      </div>

                      <!-- Pub details -->
                      <div class="flex-grow text-left">
                        <div class="flex items-center gap-2">
                          <h4
                            class="m3-title-small text-on-surface group-hover:text-primary transition-colors"
                          >
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
                          <div
                            v-if="pub.distance"
                            class="flex items-center gap-1"
                          >
                            <Icon
                              icon="mdi:map-marker-distance"
                              class="text-sm text-primary"
                            />
                            <span class="m3-label-small text-on-surface-variant"
                              >{{ pub.distance }} km</span
                            >
                          </div>
                          <div v-if="pub.rating" class="flex items-center gap-1">
                            <Icon icon="mdi:star" class="text-sm text-primary" />
                            <span class="m3-label-small text-on-surface-variant"
                              >{{ pub.rating }}/5</span
                            >
                          </div>
                          <div
                            v-if="pub.price_level"
                            class="flex items-center gap-1"
                          >
                            <Icon
                              icon="mdi:currency-gbp"
                              class="text-sm text-primary"
                            />
                            <span class="m3-label-small text-on-surface-variant">
                              {{ "£".repeat(pub.price_level) }}
                            </span>
                          </div>
                        </div>

                        <!-- Opening hours preview -->
                        <div v-if="pub.opening_hours" class="mt-2">
                          <p
                            class="m3-label-small text-on-surface-variant flex items-center gap-1"
                          >
                            <Icon
                              :icon="
                                pub.opening_hours.open_now
                                  ? 'mdi:clock'
                                  : 'mdi:clock-outline'
                              "
                              class="text-sm"
                              :class="
                                pub.opening_hours.open_now
                                  ? 'text-primary'
                                  : 'text-error'
                              "
                            />
                            {{
                              pub.opening_hours.open_now ? "Open Now" : "Closed"
                            }}
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
              :ref="(el) => (sectionRefs[4] = el)"
              class="m3-surface-container-low rounded-xl p-4 space-y-3"
            >
              <h3 class="m3-title-medium text-on-surface">
                Practical Information
              </h3>
              <div class="space-y-4">
                <div v-if="walk.footwear_category" class="space-y-2">
                  <strong class="m3-title-small text-on-surface"
                    >Recommended Footwear</strong
                  >
                  <p class="m3-body-medium text-on-surface-variant">
                    {{ walk.footwear_category }}
                  </p>
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
                      <div
                        class="m3-assist-chip-header flex items-center gap-2 mb-2"
                      >
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
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { animate, stagger, spring } from "motion";
import { Icon } from "@iconify/vue";

const props = defineProps({
  walk: {
    type: Object,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
  sidebarWidth: {
    type: Number,
    default: 80, // Default collapsed sidebar width (--md-sys-sidebar-collapsed)
  },
});

// Emit events
const emit = defineEmits(['close']);

// Refs for animation targets
const drawerRef = ref(null);
const connectorRef = ref(null);
const headerRef = ref(null);
const backButtonRef = ref(null);
const titleRef = ref(null);
const keyInfoRef = ref(null);
const amenitiesRef = ref(null);
const buttonsContainerRef = ref(null);
const buttonRefs = ref([]);
const sectionRefs = ref([]);
const footwearDetailsRef = ref(null);

// Animation configurations
const animationConfigs = {
  fluid: {
    duration: 0.5,
    easing: [0.22, 1, 0.36, 1], // Custom bezier curve for fluid motion
  },
  springDefault: {
    type: "spring",
    stiffness: 400,
    damping: 40,
    mass: 1
  },
  springSofter: {
    type: "spring",
    stiffness: 300,
    damping: 45,
    mass: 1
  },
  springStaggered: {
    type: "spring",
    stiffness: 350,
    damping: 40,
    mass: 1
  }
};

// Watch for drawer open/close state changes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initializeDrawer();
    });
  }
}, { immediate: true });

// Initialize drawer with improved positioning for NavigationRail integration
function initializeDrawer() {
  if (drawerRef.value) {
    drawerRef.value.style.width = "380px";
    drawerRef.value.style.transform = "translateX(0)";
    
    // Animate the connector
    if (connectorRef.value) {
      animate(connectorRef.value, 
        { 
          opacity: [0, 1], 
          width: ["0px", "28px"]
        }, 
        { 
          delay: 0.2,
          duration: 0.6,
          easing: "ease-out" 
        }
      );
    }
  }
}

// Enhanced enter animation with proper sequence
async function onEnter(el, onComplete) {
  if (!el) {
    onComplete();
    return;
  }

  // Main drawer animation
  animate(
    el,
    { 
      transform: ["translateX(-100%) scale(0.95)", "translateX(0) scale(1)"],
      opacity: [0, 1],
      filter: ["blur(8px)", "blur(0px)"]
    },
    animationConfigs.springDefault
  );

  // Header elements animation with stagger
  const headerElements = el.querySelectorAll(".header-content > *");
  animate(
    headerElements,
    { 
      opacity: [0, 1],
      transform: ["translateY(-15px)", "translateY(0)"],
      filter: ["blur(4px)", "blur(0px)"]
    },
    { 
      delay: stagger(0.08, { start: 0.2 }),
      ...animationConfigs.springSofter 
    }
  );

  // Key info animation
  if (keyInfoRef.value) {
    animate(
      keyInfoRef.value,
      { 
        opacity: [0, 1],
        transform: ["translateY(15px)", "translateY(0)"],
        filter: ["blur(3px)", "blur(0px)"]
      },
      { 
        delay: 0.3,
        ...animationConfigs.springStaggered 
      }
    );
  }

  // Amenities animation with grid reveal effect
  if (amenitiesRef.value) {
    const amenityItems = amenitiesRef.value.querySelectorAll(".flex.items-center");
    animate(
      amenityItems,
      { 
        opacity: [0, 1],
        scale: [0.95, 1],
        filter: ["blur(2px)", "blur(0px)"]
      },
      { 
        delay: stagger(0.05, { start: 0.4 }),
        ...animationConfigs.springStaggered 
      }
    );
  }

  // Button animations
  const buttons = el.querySelectorAll("button");
  animate(
    buttons,
    {
      opacity: [0, 1],
      transform: ["translateY(10px) scale(0.95)", "translateY(0) scale(1)"],
      filter: ["blur(3px)", "blur(0px)"]
    },
    { 
      delay: stagger(0.06, { start: 0.5 }),
      ...animationConfigs.springSofter 
    }
  );

  // Content sections animation with staggered reveal
  const sections = el.querySelectorAll("section");
  animate(
    sections,
    {
      opacity: [0, 1],
      transform: ["translateY(20px)", "translateY(0)"],
      filter: ["blur(4px)", "blur(0px)"]
    },
    { 
      delay: stagger(0.08, { start: 0.6 }),
      ...animationConfigs.springStaggered
    }
  ).finished.then(() => {
    // Apply a subtle bounce effect to the drawer to indicate it's fully open
    animate(
      el,
      { x: [0, 3, 0] },
      { 
        duration: 0.5,
        easing: "ease-in-out"
      }
    );
    // Animate in the gradient accent line
    if (el) {
      const accentLine = document.createElement("div");
      accentLine.className = "drawer-accent-line";
      el.appendChild(accentLine);
      
      animate(
        accentLine,
        { 
          scaleY: [0, 1],
          opacity: [0, 1] 
        },
        { 
          duration: 0.6,
          easing: "ease-out",
          delay: 0.1
        }
      );
    }
    onComplete();
  });
}

// Enhanced leave animation with proper sequence
async function onLeave(el, onComplete) {
  if (!el) {
    onComplete();
    return;
  }
  
  // First animate out the accent line if it exists
  const accentLine = el.querySelector(".drawer-accent-line");
  if (accentLine) {
    animate(
      accentLine,
      { scaleY: [1, 0], opacity: [1, 0] },
      { duration: 0.3, easing: "ease-in" }
    );
  }

  // Content sections fade out first
  const sections = el.querySelectorAll("section");
  animate(
    sections,
    {
      opacity: [1, 0],
      transform: ["translateY(0)", "translateY(15px)"],
      filter: ["blur(0px)", "blur(3px)"]
    },
    { 
      delay: stagger(0.03, { from: "last" }),
      duration: 0.2,
      easing: "ease-in"
    }
  );

  // Buttons fade out
  const buttons = el.querySelectorAll("button");
  animate(
    buttons,
    {
      opacity: [1, 0],
      transform: ["translateY(0) scale(1)", "translateY(10px) scale(0.95)"],
      filter: ["blur(0px)", "blur(3px)"]
    },
    { 
      delay: stagger(0.03, { from: "last", start: 0.1 }),
      duration: 0.2,
      easing: "ease-in"
    }
  );

  // Header elements fade out
  const headerElements = el.querySelectorAll(".header-content > *");
  animate(
    headerElements,
    { 
      opacity: [1, 0],
      transform: ["translateX(0)", "translateX(-15px)"],
      filter: ["blur(0px)", "blur(3px)"]
    },
    { 
      delay: stagger(0.03, { from: "last", start: 0.2 }),
      duration: 0.2,
      easing: "ease-in"
    }
  );

  // Animate the connector out
  if (connectorRef.value) {
    animate(
      connectorRef.value,
      { opacity: [1, 0], width: ["28px", "0px"] },
      { duration: 0.3, easing: "ease-in" }
    );
  }

  // Finally, animate the main drawer out
  animate(
    el,
    { 
      transform: ["translateX(0) scale(1)", "translateX(-100%) scale(0.95)"],
      opacity: [1, 0],
      filter: ["blur(0px)", "blur(6px)"]
    },
    { 
      delay: 0.3,
      duration: 0.4,
      easing: "ease-in"
    }
  ).finished.then(() => {
    onComplete();
  });
}

// New function to animate details open/close changes with smoother motion
function toggleFootwearDetails(e) {
  const detail = e.target;
  const content = detail.querySelector(".details-content");
  const summary = detail.querySelector("summary");
  
  if (detail.open) {
    // Expand animation
    content.style.height = "0px";
    content.style.overflow = "hidden";
    content.style.opacity = "0";
    
    // Get the final height
    const targetHeight = content.scrollHeight;
    
    // Animate the rotate arrow if present
    if (summary) {
      animate(
        summary, 
        { rotate: [0, 180] },
        { duration: 0.5, easing: "ease-out" }
      );
    }
    
    // Animate content height and opacity
    animate(
      content,
      { 
        height: [0, targetHeight + "px"],
        opacity: [0, 1]
      },
      { 
        duration: 0.5, 
        easing: [0.25, 1, 0.5, 1] 
      }
    ).finished.then(() => {
      // Clean up inline styles after animation completes
      content.style.height = "";
      content.style.overflow = "visible";
    });
  } else {
    // Collapse animation
    const currentHeight = content.offsetHeight;
    content.style.height = currentHeight + "px";
    content.style.overflow = "hidden";
    
    // Animate the rotate arrow if present
    if (summary) {
      animate(
        summary, 
        { rotate: [180, 0] },
        { duration: 0.4, easing: "ease-in" }
      );
    }
    
    // Animate content height and opacity
    animate(
      content,
      { 
        height: [currentHeight + "px", "0px"],
        opacity: [1, 0]
      },
      { 
        duration: 0.4, 
        easing: [0.5, 0, 0.75, 0] 
      }
    );
  }
}

// Animation helper specifically for individual drawer elements
async function animateElement(el, animation, config = {}) {
  if (!el) return;
  return animate(el, animation, {
    ...animationConfigs.fluid,
    ...config
  });
}

// Parse highlights with proper null checks
const parsedHighlights = computed(() => {
  const highlights = props.walk?.highlights;
  if (!highlights) return [];
  if (Array.isArray(highlights)) {
    return highlights.filter((h) => h && h.length > 0);
  }
  if (typeof highlights === "string") {
    return highlights
      .split(";")
      .map((h) => h.trim())
      .filter((h) => h.length > 0);
  }
  return [];
});

// Parse POIs using semicolon as separator
const parsedPOIs = computed(() => {
  // Handle cases where points_of_interest could be null, undefined, or not an array
  const pois = props.walk?.points_of_interest;
  if (!pois) return [];

  // If it's already an array, filter it
  if (Array.isArray(pois)) {
    return pois.filter((poi) => poi && poi.length > 0);
  }

  // If it's a string, split and filter
  if (typeof pois === "string") {
    return pois
      .split(";")
      .map((poi) => poi.trim())
      .filter((poi) => poi.length > 0);
  }

  return [];
});

// Add new computed property for trail considerations
const parsedConsiderations = computed(() => {
  const considerations = props.walk?.trail_considerations;
  if (!considerations || !Array.isArray(considerations)) return [];

  return considerations
    .filter((consideration) => consideration && consideration.length > 0)
    .map((consideration) => processDogConsiderations(consideration));
});

// New computed properties to separate dog items from others
const dogConsiderations = computed(() => {
  return parsedConsiderations.value.filter((item) => item.isDog);
});
const nonDogConsiderations = computed(() => {
  return parsedConsiderations.value.filter((item) => !item.isDog);
});
const dogCombinedText = computed(() => {
  return dogConsiderations.value.map((item) => item.text).join("; ");
});

// List of keys already displayed
const displayedKeys = [
  "title",
  "walk_name",
  "description",
  "difficulty",
  "distance",
  "highlights",
  "features",
  "categories",
  "points_of_interest",
];

// Compute additional info not explicitly displayed in the main section
const walkExtra = computed(() => {
  return Object.fromEntries(
    Object.entries(props.walk).filter(
      ([key, value]) =>
        !displayedKeys.includes(key) &&
        value !== null &&
        value !== "" &&
        (Array.isArray(value) ? value.length > 0 : true)
    )
  );
});

// Check if any additional info exists
const hasExtraInfo = computed(() => Object.keys(walkExtra.value).length > 0);

// Helper to format value if array or object
function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  } else if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  } else {
    return value;
  }
}

// Helper function to process dog considerations
function processDogConsiderations(consideration) {
  if (!consideration) return { text: "", isDog: false };
  const trimmed = consideration.trim();
  const startsWithDogs = trimmed.toLowerCase().startsWith("dogs");
  if (!startsWithDogs) return { text: consideration, isDog: false };
  const remainingText = trimmed.replace(/^dogs\s*[:,-]?\s*/i, "").trim();
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
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}&query=${encodeURIComponent(
        `places near ${latitude},${longitude}`
      )}`;
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
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `places near ${latitude},${longitude}`
    )}`;
  }

  // Open the URL in a new tab/window
  if (mapsUrl) {
    window.open(mapsUrl, "_blank");
  }
}
</script>

<style scoped>
@import "tailwindcss";

/* Drawer styles */
.walk-drawer {
  width: 380px;
  height: 100vh;
  left: 0;
  will-change: transform, opacity;
  backface-visibility: hidden;
  background-color: rgb(var(--md-sys-color-surface-container));
  pointer-events: auto;
  overflow: hidden;
  transform-origin: left center;
  box-shadow: var(--md-sys-elevation-level2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  opacity: 1;
  overflow-y: auto;
  position: fixed;
  top: 0;
  bottom: 0;
  border-radius: 0 24px 24px 0;
  border: none;
  padding-left: var(--md-sys-sidebar-collapsed);
  z-index: 20;
}

/* Rail connector with improved styling */
.rail-connector {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 56px;
  width: 28px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 0 28px 28px 0;
  opacity: 0;
  z-index: 1;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

/* Gradient accent line for the drawer */
.drawer-accent-line {
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: calc(var(--md-sys-sidebar-collapsed) - 1px);
  width: 4px;
  background: linear-gradient(
    to bottom,
    rgb(var(--md-sys-color-primary)),
    rgb(var(--md-sys-color-tertiary))
  );
  border-radius: 4px;
  opacity: 0.8;
  transform-origin: center top;
}

/* Enhanced header styling */
.header-container {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  box-shadow: var(--md-sys-elevation-level1);
  border-top-right-radius: 24px;
  overflow: hidden;
  position: sticky;
  top: 0;
  z-index: 10;
  /* Extend header to the left edge of drawer (before padding) */
  margin-left: calc(0px - var(--md-sys-sidebar-collapsed));
  margin-right: 0;
  width: calc(100% + var(--md-sys-sidebar-collapsed));
  box-sizing: border-box;
}

.header-content {
  /* Keep padding for the text content */
  margin-left: var(--md-sys-sidebar-collapsed);
  margin-right: 0;
  box-sizing: border-box;
  min-height: 64px;
}

/* Enhanced icon button states */
.m3-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface));
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.m3-icon-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  transform: scale(1.05);
}

.m3-icon-button:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
  transform: scale(0.95);
}

/* Enhanced surface elements with smoother hover transitions */
.m3-surface-container-low,
.pub-card,
.m3-assist-chip-container {
  border: 1px solid rgba(var(--md-sys-color-outline-variant), 0.5);
  box-shadow: var(--md-sys-elevation-level1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-surface-container-low:hover,
.pub-card:hover,
.m3-assist-chip-container:hover {
  border-color: rgba(var(--md-sys-color-outline), 0.7);
  box-shadow: var(--md-sys-elevation-level2);
  transform: translateY(-2px);
}

/* Style for details summary element */
details summary {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 8px;
}

details summary:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

/* Indicate interactive elements */
details summary::after {
  content: "▼";
  display: inline-block;
  margin-left: 8px;
  transition: transform 0.3s ease;
}

details[open] summary::after {
  transform: rotate(180deg);
}

/* Animation helpers for buttons */
.m3-button {
  transform-origin: center;
}
</style>
