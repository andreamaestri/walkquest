<template>
  <Transition
    :css="false"
    @enter="onEnter"
    @leave="onLeave" 
  >
    <div v-if="isOpen" ref="drawerRef" class="walk-drawer" :class="{ 'loading': isLoading }">
      <div ref="connectorRef" class="rail-connector"></div>

      <header ref="headerRef" class="header-container">
        <div class="header-content" :class="{ 'loading': isLoading }">
          <button
            ref="backButtonRef"
            class="m3-icon-button touchable transition-smooth focus-visible"
            @click="handleBackClick"
            aria-label="Close drawer"
          >
            <Icon icon="mdi:arrow-back" class="text-2xl" />
          </button>
          <h2 ref="titleRef" class="m3-headline-small" :class="{ 'loading': isLoading }">
            {{ walk.title || walk.walk_name }}
          </h2>
        </div>
      </header>

      <!-- Scrollable Container -->
      <div v-if="isLoading" class="loading-overlay">
        <Icon icon="mdi:loading" class="loading-icon animate-spin" />
      </div>
      <div class="scrollable-container">
        <div class="content">
          <div ref="keyInfoRef" class="key-info">
            <div v-if="walk.distance" class="info-item">
              <Icon icon="mdi:map-marker-distance" class="info-icon" />
              <span>{{ walk.distance }} km</span>
            </div>
            <div v-if="walk.steepness" class="info-item">
              <Icon icon="mdi:trending-up" class="info-icon" />
              <span>{{ walk.steepness }}</span>
            </div>
          </div>

          <div ref="amenitiesRef" class="amenities-grid">
            <div v-if="walk.has_pub" class="amenity-item">
              <Icon icon="mdi:glass-mug-variant" class="amenity-icon" />
              <span>Pub Available</span>
              <Icon icon="mdi:check-circle" class="amenity-check" />
            </div>
            <div v-if="walk.has_cafe" class="amenity-item">
              <Icon icon="mdi:tea" class="amenity-icon" />
              <span>Café Available</span>
              <Icon icon="mdi:check-circle" class="amenity-check" />
            </div>
            <div v-if="walk.has_stiles" class="amenity-item">
              <Icon icon="mdi:gate-alert" class="amenity-icon" />
              <span>Has Stiles</span>
              <Icon icon="mdi:check-circle" class="amenity-check" />
            </div>
            <div v-if="walk.has_bus_access" class="amenity-item">
              <Icon icon="mdi:bus" class="amenity-icon" />
              <span>Bus Access</span>
              <Icon icon="mdi:check-circle" class="amenity-check" />
            </div>
            <div v-if="walk.is_favorite" class="amenity-item">
              <Icon icon="mdi:heart" class="amenity-icon" />
              <span>Favorite Walk</span>
              <Icon icon="mdi:check-circle" class="amenity-check" />
            </div>
          </div>

          <div ref="buttonsContainerRef" class="buttons-container">
            <button
              :ref="(el) => (buttonRefs[0] = el)"
              class="m3-button m3-filled-button touchable transition-smooth focus-visible hover-bright"
              @click="handleStartWalkClick"
            >
              <Icon icon="mdi:play-circle" class="button-icon" />
              <span>Start Walk</span>
            </button>

            <div class="secondary-buttons">
              <button
                :ref="(el) => (buttonRefs[1] = el)"
                class="m3-button m3-tonal-button touchable transition-smooth focus-visible hover-bright"
                @click="() => {}"
              >
                <Icon icon="mdi:navigation" class="button-icon" />
                <span>Directions</span>
              </button>

              <button
                :ref="(el) => (buttonRefs[2] = el)"
                class="m3-button m3-outlined-button icon-button touchable transition-gpu focus-visible"
                @click="() => {}"
              >
                <Icon icon="mdi:heart" class="button-icon" />
              </button>

              <button
                :ref="(el) => (buttonRefs[3] = el)"
                class="m3-button m3-outlined-button icon-button touchable transition-gpu focus-visible"
                @click="handleShare"
              >
                <Icon icon="mdi:share" class="button-icon" />
              </button>
            </div>
          </div>

          <div class="sections-container">
            <section
              v-if="walk.description"
              :ref="(el) => (sectionRefs[0] = el)"
              class="section"
            >
              <h3 class="section-title">About</h3>
              <p class="section-text">{{ walk.description }}</p>
            </section>
            <section
              v-if="walk.features?.length || walk.related_categories?.length"
              :ref="(el) => (sectionRefs[3] = el)"
              class="section"
            >
              <h3 class="section-title">Trail Features</h3>
              <div class="feature-container">
                <span v-for="feature in walk.features" :key="feature.name" class="feature-chip">
                  {{ feature.name }}
                </span>
                <span 
                  v-for="category in walk.related_categories" 
                  :key="category.name" 
                  class="feature-chip category-chip" 
                  :class="getCategoryClass(category.name)"
                >
                  <Icon 
                    :icon="getCategoryIcon(category.name)" 
                    class="category-icon" 
                  />
                  <span>{{ category.name }}</span>
                </span>
              </div>
            </section>
            <section
              v-if="parsedHighlights.length"
              :ref="(el) => (sectionRefs[1] = el)"
              class="section"
            >
              <h3 class="section-title">Highlights</h3>
              <ul class="section-list">
                <li v-for="highlight in parsedHighlights" :key="highlight" class="section-list-item">
                  {{ highlight }}
                </li>
              </ul>
            </section>

            <section
              v-if="parsedPOIs.length"
              :ref="(el) => (sectionRefs[2] = el)"
              class="section"
            >
              <h3 class="section-title">Points of Interest</h3>
              <div class="poi-container">
                <span v-for="poi in parsedPOIs" :key="poi.text" class="poi-chip">
                  <Icon :icon="poi.icon" :class="poi.iconColor" class="poi-icon" />
                  <span class="poi-text">{{ poi.text }}</span>
                  <span v-if="poi.subtext" class="poi-subtext">{{ poi.subtext }}</span>
                  <span v-if="poi.badge" class="poi-badge">{{ poi.badge }}</span>
                </span>
                <span class="poi-count">{{ parsedPOIs.length }} places</span>
              </div>
            </section>

            <section
              v-if="walk.pubs_list?.length"
              class="section"
            >
              <h3 class="section-title section-title-with-icon">
                Nearby Pubs
                <span class="pub-count">{{ walk.pubs_list.length }} found</span>
              </h3>

              <div class="pub-list">
                <div v-for="pub in walk.pubs_list" :key="pub.name" class="pub-card">
                  <button class="pub-button" @click="openInGoogleMaps(pub)">
                    <div class="pub-info">
                      <div class="pub-icon-container">
                        <Icon icon="mdi:glass-mug-variant" class="pub-main-icon" />
                      </div>
                      <div class="pub-details">
                        <div class="pub-name-line">
                          <h4 class="pub-name">{{ pub.name }}</h4>
                          <Icon v-if="pub.is_dog_friendly" icon="mdi:dog" class="dog-friendly-icon" title="Dog Friendly" />
                        </div>
                        <div class="pub-meta">
                          <div v-if="pub.distance" class="pub-meta-item">
                            <Icon icon="mdi:map-marker-distance" class="pub-meta-icon" />
                            <span>{{ pub.distance }} km</span>
                          </div>
                          <div v-if="pub.rating" class="pub-meta-item">
                            <Icon icon="mdi:star" class="pub-meta-icon" />
                            <span>{{ pub.rating }}/5</span>
                          </div>
                          <div v-if="pub.price_level" class="pub-meta-item">
                            <Icon icon="mdi:currency-gbp" class="pub-meta-icon" />
                            <span>{{ "£".repeat(pub.price_level) }}</span>
                          </div>
                        </div>
                        <div v-if="pub.opening_hours" class="pub-opening-hours">
                          <Icon
                            :icon="pub.opening_hours.open_now ? 'mdi:clock' : 'mdi:clock-outline'"
                            class="pub-opening-hours-icon"
                            :class="pub.opening_hours.open_now ? 'text-primary' : 'text-error'"
                          />
                          <span>{{ pub.opening_hours.open_now ? "Open Now" : "Closed" }}</span>
                        </div>
                      </div>
                      <Icon icon="mdi:open-in-new" class="pub-open-icon" />
                    </div>
                  </button>
                </div>
              </div>
            </section>

            <section
              v-if="walk.footwear_category || walk.trail_considerations"
              :ref="(el) => (sectionRefs[4] = el)"
              class="section"
            >
              <h3 class="section-title">Practical Information</h3>
              <div class="practical-info-container">
                <div v-if="walk.footwear_category" class="footwear-section">
                  <strong class="footwear-title">Recommended Footwear</strong>
                  <p class="footwear-text">{{ walk.footwear_category }}</p>
                  <details
                    v-if="walk.recommended_footwear"
                    class="details-container"
                    ref="footwearDetailsRef"
                    @toggle="toggleFootwearDetails"
                  >
                    <summary class="details-summary">
                      <span>{{ detailsOpen ? 'Hide Details' : 'Show Details' }}</span>
                      <Icon :icon="detailsOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="details-icon" />
                    </summary>
                    <div class="details-content">
                      <p>{{ walk.recommended_footwear }}</p>
                    </div>
                  </details>
                </div>
                <div v-if="walk.trail_considerations" class="considerations-section">
                  <div v-if="dogConsiderations.length" class="dog-considerations">
                    <div class="dog-chip-header">
                      <Icon icon="mdi:dog" class="dog-chip-icon" />
                      <span class="dog-chip-title">Dogs</span>
                    </div>
                    <div class="dog-chip-content">
                      <p>{{ dogCombinedText }}</p>
                    </div>
                  </div>
                  <ul v-if="nonDogConsiderations.length" class="considerations-list">
                    <li v-for="item in nonDogConsiderations" :key="item.text" class="considerations-list-item">
                      {{ item.text }}
                    </li>
                  </ul>
                </div>
              </div>
            </section>
            
            <section
              v-if="hasExtraInfo"
              :ref="(el) => (sectionRefs[5] = el)"
              class="section"
            >
              <h3 class="section-title">Additional Information</h3>
              <div class="extra-info-container">
                <div v-for="(value, key) in walkExtra" :key="key" class="extra-info-item">
                  <strong class="extra-info-label">{{ key.split('_').join(' ') }}:</strong>
                  <span class="extra-info-value">{{ formatValue(value) }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <div ref="accentLineRef" class="drawer-accent-line"></div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import { animate, stagger, inView } from "motion";
import { Icon } from "@iconify/vue";
import { useRouter } from 'vue-router';
import { useWalksStore } from "../stores/walks";

const props = defineProps({
  walk: { type: Object, required: true },
  isOpen: { type: Boolean, default: false },
  sidebarWidth: { type: Number, default: 80 },
  fromMapMarker: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false }
});

const emit = defineEmits(["close", "start-walk", "loading-change"]);

// Animation constants
const ANIMATION_TIMEOUT = 1000; // 1 second timeout for animations

// Component refs
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
const accentLineRef = ref(null);

// Component state
const detailsOpen = ref(false);
const isTransitioning = ref(false);
const scrollPosition = ref(0);
const previousWalkId = ref(null);
const animationsEnabled = ref(true);
const prefersReducedMotion = ref(false);

// Animation manager for better lifecycle management
const animations = {
  instances: new Set(),
  observers: new Set(),
  
  // Track and register a new animation
  register(animation) {
    if (!animation) return animation;
    this.instances.add(animation);
    return animation;
  },
  
  // Track and register a new InView observer
  registerObserver(observer) {
    if (!observer) return observer;
    this.observers.add(observer);
    return observer;
  },
  
  // Cancel all animations and stop observers
  cleanup(force = false) {
    if (force) {
      animationsEnabled.value = false;
    }
    
    // Cancel all animations
    for (const animation of this.instances) {
      try {
        if (animation && typeof animation.cancel === 'function') {
          animation.cancel();
        }
      } catch (err) {
        console.warn('Error cancelling animation:', err);
      }
    }
    this.instances.clear();
    
    if (force) {
      animationsEnabled.value = true;
    }
    
    // Stop all observers
    for (const observer of this.observers) {
      try {
        if (observer && typeof observer.stop === 'function') {
          observer.stop();
        }
      } catch (err) {
        console.warn('Error stopping observer:', err);
      }
    }
    this.observers.clear();
  },
  
  // Animate with proper registration
  animate(targets, keyframes, options = {}) {
    if (!animationsEnabled.value || prefersReducedMotion.value) {
      return { finished: Promise.resolve() };
    }
    
    try {
      const animation = animate(targets, keyframes, {
        ...options,
        onComplete: () => {
          this.instances.delete(animation);
          if (options.onComplete) options.onComplete();
        }
      });
      
      this.register(animation);
      return animation;
    } catch (err) {
      console.warn('Animation error:', err);
      return { finished: Promise.resolve() };
    }
  },
  
  // Create an InView observer with proper registration
  createInView(element, callback, options = {}) {
    if (!element) return null;
    
    try {
      const observer = inView(element, (info) => {
        const cleanup = callback(info);
        return () => {
          if (typeof cleanup === 'function') cleanup();
        };
      }, options);
      
      this.registerObserver(observer);
      return observer;
    } catch (err) {
      console.warn('InView observer error:', err);
      return null;
    }
  }
};

// Standardized easing configurations
const easings = {
  enter: [0.22, 1, 0.36, 1], // Recommended easeOut for enter transitions
  exit: [0.4, 0, 0.2, 1],    // Standard easing for exit
  bounce: [0.34, 1.56, 0.64, 1], // Slight bounce effect
  smooth: [0.4, 0, 0.2, 1]    // Standard ease
};

const router = useRouter();
const walksStore = useWalksStore();

// Watch for walk changes to handle transitions
watch(() => props.walk?.id, async (newWalkId, oldWalkId) => {
  console.log("Walk ID changed:", { new: newWalkId, old: oldWalkId, isTransitioning: isTransitioning.value });
  
  // If both IDs are valid and different, and a transition isn't already in progress, handle the transition
  if (newWalkId && oldWalkId && newWalkId !== oldWalkId) {
    try {
      // Set transition state
      isTransitioning.value = true;
      emit('loading-change', true);
      
      // Save current walk ID and scroll position before transition
      previousWalkId.value = oldWalkId;
      if (drawerRef.value) {
        const scrollContainer = drawerRef.value.querySelector('.scrollable-container');
        if (scrollContainer) {
          scrollPosition.value = scrollContainer.scrollTop;
        }
      }
      
      // Animate content out with timeout protection
      const contentOutPromise = animateContentOut(); // Using the enhanced version defined below
      const contentOutTimeout = new Promise(resolve => setTimeout(resolve, 500));
      await Promise.race([contentOutPromise, contentOutTimeout]);
      
      // Wait for data
      await nextTick();
      
      // Reset scroll for new content
      const scrollContainer = drawerRef.value?.querySelector('.scrollable-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      
      // Animate new content in with timeout protection
      const contentInPromise = animateContentIn();
      const contentInTimeout = new Promise(resolve => setTimeout(resolve, 800));
      await Promise.race([contentInPromise, contentInTimeout]);
    } catch (error) {
      console.error('Transition error:', error);
    } finally {
      // Always reset transition state, even if there was an error
      isTransitioning.value = false;
      emit('loading-change', false);
    }
  } else if (newWalkId && !oldWalkId) {
    // This case handles when a new walk is selected from nothing
    isTransitioning.value = false;
    emit('loading-change', false);
  }
}, { immediate: true });

// Watch for open state changes
watch(() => props.isOpen, async (isOpen) => {
  console.log("Drawer isOpen changed:", isOpen);
  
  if (isOpen) {
    // Ensure transition state is reset when drawer opens
    isTransitioning.value = false;
    
    await nextTick();
    initializeDrawer(); // Using the enhanced version defined below
    
    // Restore scroll position if reopening same walk
    if (previousWalkId.value === props.walk?.id && scrollPosition.value > 0) {
      await nextTick(() => {
        restoreScrollPosition();
      }); 
    }
  } else {
    // When drawer is closed, ensure we clean up any running animations
    animations.cleanup();
  }
}, { immediate: true });

async function animateContentIn() {
  await nextTick();
  
  if (!drawerRef.value || isTransitioning.value) return;
  
  // Animate header elements first
  const headerElements = [titleRef.value, keyInfoRef.value].filter(Boolean);
  if (headerElements.length && !isTransitioning.value) {
    const headerAnimation = animations.animate(
      headerElements,
      { 
        opacity: [0, 1],
        transform: ["translateY(-10px)", "translateY(0)"],
        filter: ["blur(4px)", "blur(0px)"]
      },
      { 
        duration: 0.3,
        easing: "ease-out",
        delay: stagger(0.1)
      }
    );
  }
  
  // Then animate content sections
  const sections = drawerRef.value.querySelectorAll('.section');
  if (sections.length && !isTransitioning.value) {
    const animation = animations.animate(
      sections,
      {
        opacity: [0, 1],
        transform: ["translateY(10px)", "translateY(0)"],
        filter: ["blur(4px)", "blur(0px)"]
      },
      {
        delay: stagger(0.08, { start: 0.2 }),
        duration: 0.4,
        easing: "ease-out"
      }
    );
    
    // Set up in-view animations for section content
    sections.forEach(section => {
      const observer = animations.createInView(section, () => {
        animations.animate(
          section.querySelectorAll('.amenity-item, .poi-chip, .feature-chip, .pub-card'),
          {
            opacity: [0, 1],
            scale: [0.95, 1],
            filter: ["blur(2px)", "blur(0px)"]
          },
          {
            delay: stagger(0.03),
            duration: 0.3,
            easing: "ease-out"
          }
        );
      }, { 
        margin: "-10% 0px -10% 0px",
        amount: 0.2
      });
    });
  }
}

function restoreScrollPosition() {
  const scrollContainer = drawerRef.value?.querySelector('.scrollable-container');
  if (scrollContainer && scrollPosition.value > 0) {
    scrollContainer.scrollTop = scrollPosition.value;
  }
}


// Function to setup animations for details elements
function setupDetailsAnimations() {
    nextTick(() => {
        const details = document.querySelectorAll('.details-container');
        details.forEach(detail => {
            detail.addEventListener('toggle', (e) => toggleDetailsAnimation(e));
        });
    });
}

// Handle detail toggle animations
function toggleDetailsAnimation(e) {
  const detail = e.target;
  const content = detail.querySelector(".details-content");
  const isOpen = detail.open;
  
  if (!content) return;
  
  // Cancel any existing animations on this element
  const currentAnimation = Array.from(animations.instances)
    .find(a => a.target === content);
  
  if (currentAnimation) {
    currentAnimation.cancel();
    animations.instances.delete(currentAnimation);
  }
  
  if (isOpen) {
    // Prepare for animation
    content.style.height = "0px";
    content.style.overflow = "hidden";
    content.style.opacity = "0";
    
    // Get target height
    const targetHeight = content.scrollHeight;
    
    // Animate open
    animations.animate(
      content,
      { 
        height: [0, `${targetHeight}px`], 
        opacity: [0, 1], 
        transform: ["translateY(-10px)", "translateY(0px)"] 
      },
      { 
        duration: 0.35, 
        easing: easings.bounce,
        onComplete: () => {
          // Reset styles once animation is done
          content.style.height = "auto";
          content.style.overflow = "visible";
        }
      }
    );
  } else {
    // Prepare for animation
    const currentHeight = content.offsetHeight;
    content.style.height = `${currentHeight}px`;
    content.style.overflow = "hidden";
    
    // Animate close
    animations.animate(
      content,
      { 
        height: [`${currentHeight}px`, "0px"], 
        opacity: [1, 0], 
        transform: ["translateY(0px)", "translateY(-10px)"] 
      },
      { 
        duration: 0.3, 
        easing: easings.exit 
      }
    );
  }
}

// Replace toggleFootwearDetails with the generic function
function toggleFootwearDetails(e) {
    const detail = e.target;
    detailsOpen.value = detail.open;
    toggleDetailsAnimation(e);
}

const poiCategories = [
  { pattern: /(pub|inn|tavern)/i, icon: 'mdi:glass-mug-variant', color: 'text-amber-800', badge: 'Refreshment' },
  { pattern: /(church|chapel|cathedral|abbey)/i, icon: 'mdi:church', color: 'text-blue-600', badge: 'Religious' },
  { pattern: /(lake|river|waterfall|pond|reservoir|stream|beach|sea)/i, icon: 'mdi:water', color: 'text-blue-500', badge: 'Water' },
  { pattern: /(hill|mountain|peak|ridge|valley|viewpoint|panorama)/i, icon: 'mdi:mountain', color: 'text-emerald-700', badge: 'Landscape' },
  { pattern: /(café|cafe|restaurant|tea|coffee)/i, icon: 'mdi:coffee', color: 'text-amber-700', badge: 'Refreshment' },
  { pattern: /(wood|forest|woodland|tree)/i, icon: 'mdi:pine-tree', color: 'text-green-600', badge: 'Nature' },
  { pattern: /(garden|park|flower)/i, icon: 'mdi:flower', color: 'text-pink-500', badge: 'Nature' },
  { pattern: /(museum|gallery|art)/i, icon: 'mdi:bank', color: 'text-purple-600', badge: 'Cultural' },
  { pattern: /(bridge|viaduct|aqueduct)/i, icon: 'mdi:bridge', color: 'text-stone-600', badge: 'Structure' },
  { pattern: /(wildlife|animal|bird)/i, icon: 'mdi:paw', color: 'text-orange-600', badge: 'Wildlife' },
  { pattern: /(castle)/i, icon: 'mdi:castle', color: 'text-gray-700', badge: 'Historical' },
  { pattern: /(garden)/i, icon: 'mdi:flower', color: 'text-pink-500', badge: 'Nature' },
];

const parsedPOIs = computed(() => {
  const pois = props.walk?.points_of_interest;
  if (!pois) return [];

  const mapper = (poi) => {
    const poiLower = poi.toLowerCase();
    const category = poiCategories.find((cat) => cat.pattern.test(poiLower)) || { icon: 'mdi:map-marker', color: 'text-primary', badge: '' };
    const isPriority = poi.length > 20;
    return {
      text: poi,
      icon: category.icon,
      iconColor: category.color,
      badge: isPriority ? category.badge : null,
    };
  };

  if (Array.isArray(pois)) {
    return pois.filter((poi) => poi && poi.length > 0).map(mapper);
  }
  if (typeof pois === "string") {
    return pois.split(";")
      .map((poi) => poi.trim())
      .filter((poi) => poi.length > 0)
      .map(mapper);
  }
  return [];
});

const parsedHighlights = computed(() => {
    const highlights = props.walk?.highlights;
    if (!highlights) return [];
    const processHighlight = (h) => h && h.length > 0;

    if (Array.isArray(highlights)) {
        return highlights.filter(processHighlight);
    }
    if (typeof highlights === 'string') {
        return highlights.split(';').map(h => h.trim()).filter(processHighlight);
    }
    return [];
});

function processDogConsiderations(consideration) {
  if (!consideration) return { text: "", isDog: false };
  const trimmed = consideration.trim();
  const startsWithDogs = trimmed.toLowerCase().startsWith("dogs");
  if (!startsWithDogs) return { text: consideration, isDog: false };
  const remainingText = trimmed.replace(/^dogs\s*[:,-]?\s*/i, "").trim();
  return { text: remainingText, isDog: true };
}

const parsedConsiderations = computed(() => {
  const considerations = props.walk?.trail_considerations;
  if (!considerations || !Array.isArray(considerations)) return [];
  return considerations
    .map(processDogConsiderations)
    .filter(item => item && item.text && item.text.length > 0);
});

const dogConsiderations = computed(() => parsedConsiderations.value.filter((item) => item.isDog));
const nonDogConsiderations = computed(() => parsedConsiderations.value.filter((item) => !item.isDog));
const dogCombinedText = computed(() => dogConsiderations.value.map((item) => item.text).join("; "));

const displayedKeys = [
  "title", "walk_name", "description", "difficulty", "distance", "steepness",
  "highlights", "features", "categories", "points_of_interest", "has_pub",
  "has_cafe", "has_stiles", "has_bus_access", "is_favorite", "pubs_list",
  "footwear_category", "trail_considerations", "recommended_footwear"
];

const walkExtra = computed(() => {
    const extra = {};
    for (const key in props.walk) {
        if (!displayedKeys.includes(key)) {
            const value = props.walk[key];
            if (value != null && (typeof value !== 'string' || value !== "")) {
                extra[key] = value;
            }
        }
    }
    return extra;
});

const hasExtraInfo = computed(() => Object.keys(walkExtra.value).length > 0);

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.name || item.title || Object.values(item).filter(v => typeof v === 'string').join(', ') || '[Object]';
      }
      return item;
    }).join(", ");
  } else if (typeof value === "object" && value !== null) {
    if (value.name || value.title) {
      return value.name || value.title;
    }
    const stringValues = Object.entries(value)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        if (typeof v === 'object') {
          return `${k}: ${v.name || v.title || '[Object]'}`;
        }
        return `${k}: ${v}`;
      });
    return stringValues.join(", ");
  }
  return value;
}

function openInGoogleMaps(pub) {
  let mapsUrl = "";

  if (pub.name) {
    const searchQuery = encodeURIComponent(pub.name);
    if (props.walk.latitude && props.walk.longitude) {
      const latitude = props.walk.latitude;
      const longitude = props.walk.longitude;
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}&query=${encodeURIComponent(`places near ${latitude},${longitude}`)}`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    }
  } else if (props.walk.latitude && props.walk.longitude) {
    const latitude = props.walk.latitude;
    const longitude = props.walk.longitude;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`places near ${latitude},${longitude}`)}`;
  }

  if (mapsUrl) {
    window.open(mapsUrl, "_blank");
  }
}

function handleBackClick() {
  console.log("Back button clicked", { isTransitioning: isTransitioning.value });

  try {
    // Prevent multiple clicks while transitioning
    if (isTransitioning.value) {
      console.log("Transition in progress, ignoring close request");
      return;
    }

    // Set transitioning state
    isTransitioning.value = true;

    // Cleanup any existing animations first
    animations.cleanup();

    // Emit close event with callback to track when animation completes
    console.log("Emitting close event");
    emit("close", {
      expandSidebar: true,
      fromMapMarker: props.fromMapMarker,
      animated: true
    });

  } catch (error) {
    console.error("Error handling back button click:", error);
    handleTransitionError(error);
  }
}

function handleStartWalkClick() {
  if (isTransitioning.value) return;
  
  emit("start-walk", props.walk);
}

// Clean up animations and observers when component is unmounted
onBeforeUnmount(() => {
  try {
    // Force cleanup all animations and observers
    animations.cleanup(true);
    
    // Remove any event listeners
    const details = document.querySelectorAll('.details-container');
    details.forEach(detail => {
      detail.removeEventListener('toggle', toggleDetailsAnimation);
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
  
  // Save scroll position in case we're coming back to this walk
  if (drawerRef.value) {
    scrollPosition.value = drawerRef.value.querySelector('.scrollable-container')?.scrollTop || 0;
  }
});

function handleShare() {
  if (!props.walk) return;
  
  // Use slug if available, otherwise use ID
  const walkPath = props.walk.slug 
    ? `/${props.walk.slug}` 
    : `/walk/${props.walk.id}`;
  
  const shareUrl = `${window.location.origin}${walkPath}`;
  
  if (navigator.share) {
    navigator.share({
      title: props.walk.title || props.walk.walk_name,
      text: props.walk.description,
      url: shareUrl
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show copy success message
    }).catch(console.error);
  }
}

// Category mappings for styling - updated to handle phrase-based categories
const categoryMappings = {
  // Standard categories
  "Nature": { 
    color: "green", 
    bgClass: "bg-green-100 text-green-900", 
    icon: "mdi:tree" 
  },
  // ...existing category mappings...

  // Extended mappings for detailed categories
  "circular walks": { 
    color: "indigo", 
    bgClass: "bg-indigo-100 text-indigo-900", 
    icon: "mdi:rotate-right" 
  },
  "linear walks": { 
    color: "violet", 
    bgClass: "bg-violet-100 text-violet-900", 
    icon: "mdi:arrow-right" 
  },
  "riverside walks": { 
    color: "blue", 
    bgClass: "bg-blue-100 text-blue-900", 
    icon: "mdi:water" 
  },
  "woodland walks": { 
    color: "emerald", 
    bgClass: "bg-emerald-100 text-emerald-900", 
    icon: "mdi:pine-tree" 
  },
  "coastal walks": { 
    color: "cyan", 
    bgClass: "bg-cyan-100 text-cyan-900", 
    icon: "mdi:waves" 
  },
  "mountain walks": { 
    color: "slate", 
    bgClass: "bg-slate-100 text-slate-900", 
    icon: "mdi:mountain" 
  },
  "walks with a café": { 
    color: "amber", 
    bgClass: "bg-amber-100 text-amber-900", 
    icon: "mdi:coffee" 
  },
  "walks with a pub": { 
    color: "amber", 
    bgClass: "bg-amber-800 text-amber-50", 
    icon: "mdi:glass-mug-variant" 
  },
  "walks without stiles": { 
    color: "blue", 
    bgClass: "bg-blue-100 text-blue-900", 
    icon: "mdi:gate" 
  },
  "walks with a good degree of shade": { 
    color: "green", 
    bgClass: "bg-green-100 text-green-900", 
    icon: "mdi:weather-sunny-off" 
  },
  "dog friendly walks": { 
    color: "amber", 
    bgClass: "bg-amber-100 text-amber-900", 
    icon: "mdi:dog-side" 
  },
  "family friendly walks": { 
    color: "pink", 
    bgClass: "bg-pink-100 text-pink-900", 
    icon: "mdi:human-male-female-child" 
  },
  "accessible walks": { 
    color: "blue", 
    bgClass: "bg-blue-100 text-blue-900", 
    icon: "mdi:wheelchair-accessibility" 
  }
};

// Default category for unknown categories
const defaultCategory = { 
  color: "gray", 
  bgClass: "bg-gray-100 text-gray-900", 
  icon: "mdi:tag" 
};

// Search patterns for partial matches
const categoryPatterns = [
  { pattern: /circular/i, match: "circular walks" },
  { pattern: /linear/i, match: "linear walks" },
  { pattern: /river/i, match: "riverside walks" },
  { pattern: /wood/i, match: "woodland walks" },
  { pattern: /forest/i, match: "woodland walks" },
  { pattern: /coast/i, match: "coastal walks" },
  { pattern: /sea/i, match: "coastal walks" },
  { pattern: /mountain/i, match: "mountain walks" },
  { pattern: /café|cafe/i, match: "walks with a café" },
  { pattern: /pub|beer/i, match: "walks with a pub" },
  { pattern: /without stile/i, match: "walks without stiles" },
  { pattern: /shade/i, match: "walks with a good degree of shade" },
  { pattern: /dog/i, match: "dog friendly walks" },
  { pattern: /family/i, match: "family friendly walks" },
  { pattern: /accessible|wheelchair/i, match: "accessible walks" }
];

// Helper functions for category styling with enhanced pattern matching
function getCategoryClass(categoryName) {
  // Direct match
  if (categoryMappings[categoryName]) {
    return categoryMappings[categoryName].bgClass;
  }
  
  // Pattern match
  for (const pattern of categoryPatterns) {
    if (pattern.pattern.test(categoryName)) {
      return categoryMappings[pattern.match]?.bgClass || defaultCategory.bgClass;
    }
  }
  
  return defaultCategory.bgClass;
}

function getCategoryIcon(categoryName) {
  // Direct match
  if (categoryMappings[categoryName]) {
    return categoryMappings[categoryName].icon;
  }
  
  // Pattern match
  for (const pattern of categoryPatterns) {
    if (pattern.pattern.test(categoryName)) {
      return categoryMappings[pattern.match]?.icon || defaultCategory.icon;
    }
  }
  
  return defaultCategory.icon;
}

// Add onMounted hook at the beginning of the script to ensure proper initialization
onMounted(() => {
  // Initialize animations only when component is fully mounted
  nextTick(() => {
    setupDetailsAnimations();
  });

  // Handle resize and orientation changes
  const handleResize = () => {
    if (!drawerRef.value) return;

    // Disable animations temporarily during resize
    animationsEnabled.value = false;

    // Update drawer position and width
    const offset = props.fromMapMarker ? 0 : props.sidebarWidth;
    drawerRef.value.style.transition = 'none';
    drawerRef.value.style.width = `${Math.min(380, window.innerWidth - offset)}px`;

    // Re-enable animations after a short delay
    setTimeout(() => {
      if (drawerRef.value) {
        drawerRef.value.style.transition = 'transform 0.3s ease, left 0.3s ease';
        animationsEnabled.value = true;
      }
    }, 100);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  handleResize(); // Initial setup
  
  // Add event listeners for browser back/forward navigation
  const handleRouteChange = () => {
    // Clean up animations if the component is being navigated away from
    animations.cleanup();
  };
  
  window.addEventListener('popstate', handleRouteChange);
  
  // Return cleanup function to be called on unmount
  onBeforeUnmount(() => {
    // Remove resize listeners
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);

    window.removeEventListener('popstate', handleRouteChange);
    
    // Clean up animation resources
    animations.cleanup();
    
    // Disable animations during unmount to prevent hanging animations
    animationsEnabled.value = false;
    
    // Save scroll position in case we're coming back to this walk
    if (drawerRef.value) {
      const scrollContainer = drawerRef.value.querySelector('.scrollable-container');
      if (scrollContainer) {
        scrollPosition.value = scrollContainer.scrollTop || 0;
      }
    }
  });
});

const STATE_CHANGE_TIMEOUT = 800; // Timeout for state changes in ms
const ANIMATION_DURATION = {
  enter: 500,
  leave: 400,
  content: 300
};

// State tracking
const drawerState = ref('closed'); // 'closed', 'opening', 'open', 'closing'
const transitionLock = ref(false);
const lastError = ref(null);
const lastWalkId = ref(null);
const isRecovering = ref(false);

// Logger for debugging animations
const debugLog = (message, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WalkDrawer] ${message}`, {
      state: drawerState.value,
      transitioning: isTransitioning.value,
      locked: transitionLock.value,
      walkId: props.walk?.id,
      ...data
    });
  }
};

// Validate state before transition
function validateTransition(from, to) {
  const validTransitions = {
    closed: ['opening'],
    opening: ['open', 'closing'],
    open: ['closing'],
    closing: ['closed', 'opening']
  };

  if (!validTransitions[from]?.includes(to)) {
    debugLog(`Invalid transition ${from} -> ${to}`);
    return false;
  }
  return true;
}

// State management
async function changeDrawerState(newState) {
  if (transitionLock.value) {
    debugLog('Transition locked, queuing state change', { newState });
    await new Promise(resolve => setTimeout(resolve, 50));
    return changeDrawerState(newState);
  }

  const currentState = drawerState.value;
  if (!validateTransition(currentState, newState)) {
    return;
  }

  try {
    transitionLock.value = true;
    drawerState.value = newState;
    debugLog(`State changed: ${currentState} -> ${newState}`);

    // Clear transition lock after timeout
    setTimeout(() => {
      transitionLock.value = false;
    }, STATE_CHANGE_TIMEOUT);

  } catch (error) {
    debugLog('State change error', { error });
    handleTransitionError(error);
  }
}

// Error recovery
function handleTransitionError(error) {
  lastError.value = error;
  isRecovering.value = true;

  // Force cleanup any running animations
  animations.cleanup(true);

  // Reset to a known good state
  setTimeout(() => {
    isTransitioning.value = false;
    transitionLock.value = false;
    drawerState.value = props.isOpen ? 'open' : 'closed';
    isRecovering.value = false;
    
    // Ensure elements are in correct state
    if (drawerRef.value) {
      if (props.isOpen) {
        drawerRef.value.style.opacity = '1';
        drawerRef.value.style.transform = 'translateX(0) scale(1)';
      } else {
        drawerRef.value.style.opacity = '0';
        drawerRef.value.style.transform = 'translateX(-100%) scale(0.95)';
      }
    }
    
    debugLog('Recovered from error state');
  }, STATE_CHANGE_TIMEOUT);
}

// Enhanced drawer initialization
function initializeDrawer() {
  if (!drawerRef.value) return;

  debugLog('Initializing drawer');
  
  try {
    // Calculate drawer position and handle screen edge cases
    const offset = props.fromMapMarker ? 0 : props.sidebarWidth;
    const screenWidth = window.innerWidth;
    const maxWidth = Math.min(380, screenWidth - offset - 20); // 20px safety margin
    
    drawerRef.value.style.width = `${maxWidth}px`;
    
    // Use Motion's animate for smooth transition
    animations.animate(
      drawerRef.value,
      { 
        transform: ['translateX(0) scale(1)', 'translateX(0) scale(1)'],
        opacity: [1, 1]
      },
      { 
        duration: 0.3, 
        easing: easings.smooth 
      }
    );
    
    // Initialize connector animation if present
    if (connectorRef.value && !isRecovering.value) {
      animations.animate(
        connectorRef.value, 
        { 
          opacity: [0, 1], 
          width: ["0px", "28px"] 
        },
        { 
          duration: 0.6,
          delay: 0.2,
          easing: easings.enter
        }
      );
    }

  } catch (error) {
    debugLog('Initialization error', { error });
    handleTransitionError(error);
  }
}

// Enhanced content transitions
async function animateContentOut() {
  if (!drawerRef.value || transitionLock.value) return;
  
  debugLog('Animating content out');
  
  try {
    // Clean up any existing animations to prevent conflicts
    animations.cleanup();
    
    // Collect all elements that need to be animated
    const elements = [
      ...Array.from(drawerRef.value.querySelectorAll('.section')),
      ...Array.from(drawerRef.value.querySelectorAll('.key-info')),
      ...Array.from(drawerRef.value.querySelectorAll('.amenities-grid')),
      ...Array.from(drawerRef.value.querySelectorAll('.buttons-container'))
    ].filter(Boolean);
    
    if (elements.length === 0) {
      return Promise.resolve();
    }

    // Create animation with staggered delay
    const animation = animations.animate(
      elements,
      { 
        opacity: [1, 0],
        transform: ["translateY(0)", "translateY(10px)"],
        filter: ["blur(0px)", "blur(4px)"]
      },
      { 
        duration: 0.25,
        easing: easings.exit,
        delay: stagger(0.02, { from: "last" })
      }
    );

    // Return a promise that resolves when animation is complete
    return animation.finished;
    
  } catch (error) {
    debugLog('Content out animation error', { error });
    handleTransitionError(error);
    return Promise.resolve(); // Resolve immediately if there's an error
  }
}

async function onEnter(el, onComplete) {
    try {
        console.log("Starting enter animation");
        if (!el) {
            onComplete();
            return;
        }
        
        // Reset loading state
        isLoading.value = false;
        
        // Ensure animations are enabled
        animationsEnabled.value = true;
        
        // Clean up any existing animations first to prevent conflicts
        animations.cleanup();
        
        // Prepare initial state
        const accentLine = el.querySelector('.drawer-accent-line');
        if (accentLine) accentLine.style.opacity = '0';
        
        // Use a timeout to guard against stuck animations
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000));
        
        // Safety timeout to reset transitioning state
        const safetyTimeout = setTimeout(() => {
            isTransitioning.value = false;
        }, ANIMATION_TIMEOUT);
        
        // Main drawer animation
        const drawerAnimation = animations.animate(
            el,
            {
                transform: ["translateX(-100%) scale(0.95)", "translateX(0) scale(1)"],
                opacity: [0.5, 1],
                filter: ["blur(8px)", "blur(0px)"]
            },
            { duration: 0.5, easing: [0.22, 1, 0.36, 1] }
        );
        
        // Header elements animation
        const headerElements = el.querySelectorAll(".header-content > *");
        if (headerElements.length) {
            animations.animate(
                headerElements,
                { opacity: [0, 1], transform: ["translateY(-15px)", "translateY(0)"], filter: ["blur(4px)", "blur(0px)"] },
                { delay: stagger(0.08, { start: 0.2 }), duration: 0.4, easing: "ease-out" }
            );
        }
        
        // Content sections animation
        const sections = el.querySelectorAll(".scrollable-container section");
        if (sections.length) {
            animations.animate(
                sections,
                { opacity: [0, 1], transform: ["translateY(20px)", "translateY(0)"], filter: ["blur(4px)", "blur(0px)"] },
                { delay: stagger(0.08, { start: 0.3 }), duration: 0.5, easing: "ease-out" }
            );
        }
        
        // Wait for the primary animation to finish (with a timeout safeguard)
        await Promise.race([drawerAnimation.finished, timeoutPromise]);
        
        // Accent line animation
        if (accentLine) {
            animations.animate(
                accentLine, 
                { scaleY: [0, 1], opacity: [0, 0.8] }, 
                { duration: 0.6, easing: "ease-out", delay: 0.1 }
            );
        }
        
        // Subtle "settled in" animation
        animations.animate(
            el, 
            { x: [0, 3, 0] }, 
            { duration: 0.5, easing: "ease-in-out" }
        );
        
        // Setup animations for details elements that get expanded
        setupDetailsAnimations();
        
        // Set up in-view animations for components (from the enhanced version)
        setupInViewAnimations(el);
        
        // Clear safety timeout if animation completes normally
        clearTimeout(safetyTimeout);
        
        onComplete();
    } catch (error) {
        console.error("Animation error:", error);
        // Log detailed error information
        console.error("onEnter failed with error:", error.message, error.stack);
        // Ensure the drawer is visible even if animation fails
        if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateX(0) scale(1)';
        }
        
        // Ensure animations are re-enabled and state is reset
        animationsEnabled.value = true;
        isTransitioning.value = false;
        
        onComplete();
    }
}

// New function to set up InView animations for section content
function setupInViewAnimations(container) {
  if (!container) return;
  
  try {
    // Configuration for different section types
    const sectionConfigs = [
      {
        selector: '.section',
        itemSelector: '.amenity-item, .poi-chip, .feature-chip, .pub-card, .extra-info-item',
        animationOptions: {
          keyframes: {
            opacity: [0, 1],
            scale: [0.95, 1],
            filter: ["blur(2px)", "blur(0px)"]
          },
          options: {
            delay: stagger(0.03),
            duration: 0.3,
            easing: easings.smooth
          }
        }
      }
    ];
    
    // Apply animations for each configuration
    sectionConfigs.forEach(config => {
      const sections = Array.from(container.querySelectorAll(config.selector)).filter(Boolean);
      
      sections.forEach(section => {
        animations.createInView(
          section, 
          () => {
            const items = Array.from(section.querySelectorAll(config.itemSelector)).filter(Boolean);
            
            if (items.length) {
              animations.animate(
                items,
                config.animationOptions.keyframes,
                config.animationOptions.options
              );
            }
            
            // Return cleanup function
            return () => {}; 
          }, 
          { 
            margin: "-10% 0px -10% 0px",
            amount: 0.2,
            once: false // Allow re-animation when scrolling back into view
          }
        );
      });
    });
  } catch (error) {
    console.warn('Error setting up in-view animations:', error);
  }
}
</script>

<style scoped>
@import '../../../static/css/walkdrawer.css';
</style>
