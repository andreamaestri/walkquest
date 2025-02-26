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
            class="m3-icon-button"
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
              class="m3-button m3-filled-button"
              @click="() => {}"
            >
              <Icon icon="mdi:play-circle" class="button-icon" />
              <span>Start Walk</span>
            </button>

            <div class="secondary-buttons">
              <button
                :ref="(el) => (buttonRefs[1] = el)"
                class="m3-button m3-tonal-button"
                @click="() => {}"
              >
                <Icon icon="mdi:navigation" class="button-icon" />
                <span>Directions</span>
              </button>

              <button
                :ref="(el) => (buttonRefs[2] = el)"
                class="m3-button m3-outlined-button icon-button"
                @click="() => {}"
              >
                <Icon icon="mdi:heart" class="button-icon" />
              </button>

              <button
                :ref="(el) => (buttonRefs[3] = el)"
                class="m3-button m3-outlined-button icon-button"
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
              v-if="walk.features?.length || walk.categories?.length"
              :ref="(el) => (sectionRefs[3] = el)"
              class="section"
            >
              <h3 class="section-title">Trail Features</h3>
              <div class="feature-container">
                <span v-for="feature in walk.features" :key="feature.name" class="feature-chip">
                  {{ feature.name }}
                </span>
                <span v-for="category in walk.categories" :key="category.name" class="feature-chip">
                  {{ category.name }}
                </span>
              </div>
            </section>

            <section
              v-if="walk.pubs_list?.length"
              class="section"
            >
              <h3 class="section-title section-title-with-icon">
                <Icon icon="mdi:beer" class="section-icon" />
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
  isLoading: { type: Boolean, default: false } // Add loading prop
});

const emit = defineEmits(["close", "start-walk", "loading-change"]);

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
const detailsOpen = ref(false);
const isTransitioning = ref(false); // Add transitioning state
const scrollPosition = ref(0);
const previousWalkId = ref(null);
const contentAnimations = ref([]);
const inViewObservers = ref([]);
const accentLineRef = ref(null);

const animationConfigs = {
  fluid: { duration: 0.5, easing: [0.22, 1, 0.36, 1] },
};

const router = useRouter();
const walksStore = useWalksStore();

// Watch for walk changes to handle transitions
watch(() => props.walk?.id, async (newWalkId, oldWalkId) => {
  if (newWalkId && oldWalkId && newWalkId !== oldWalkId) {
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
    
    try {
      // Animate content out
      await animateContentOut();
      
      // Wait for data
      await nextTick();
      
      // Reset scroll for new content
      const scrollContainer = drawerRef.value?.querySelector('.scrollable-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      
      // Animate new content in
      await animateContentIn();
    } catch (error) {
      console.error('Transition error:', error);
    } finally {
      isTransitioning.value = false;
      emit('loading-change', false);
    }
  }
}, { immediate: true });

// Watch for open state changes
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    initializeDrawer();
    
    // Restore scroll position if reopening same walk
    if (previousWalkId.value === props.walk?.id && scrollPosition.value > 0) {
      await nextTick(() => {
        restoreScrollPosition();
      });
    }
  }
}, { immediate: true });

function initializeDrawer() {
  if (drawerRef.value) {
    // Calculate drawer position based on sidebar state and transition source
    const offset = props.fromMapMarker ? 0 : props.sidebarWidth;
    drawerRef.value.style.transition = 'transform 0.3s ease, left 0.3s ease';
    
    if (connectorRef.value) {
      animate(connectorRef.value, { opacity: [0, 1], width: ["0px", "28px"] }, { 
        delay: 0.2,
        duration: 0.6,
        easing: "ease-out" 
      });
    }
  }
}

async function animateContentOut() {
  // Clean up existing animations
  cleanupAnimations();
  
  if (!drawerRef.value) return;
  
  const elements = [
    ...drawerRef.value.querySelectorAll('.section'),
    ...drawerRef.value.querySelectorAll('.key-info'),
    ...drawerRef.value.querySelectorAll('.amenities-grid'),
    ...drawerRef.value.querySelectorAll('.buttons-container')
  ];
  
  if (elements.length) {
    const animation = animate(
      elements,
      { 
        opacity: [1, 0],
        transform: ["translateY(0)", "translateY(10px)"],
        filter: ["blur(0px)", "blur(4px)"]
      },
      { 
        duration: 0.2,
        easing: "ease-in",
        delay: stagger(0.02, { from: "last" })
      }
    );
    contentAnimations.value.push(animation);
    await animation.finished;
  }
}

async function animateContentIn() {
  await nextTick();
  
  if (!drawerRef.value) return;
  
  // Animate header elements first
  const headerElements = [titleRef.value, keyInfoRef.value].filter(Boolean);
  if (headerElements.length) {
    const headerAnimation = animate(
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
    contentAnimations.value.push(headerAnimation);
  }
  
  // Then animate content sections
  const sections = drawerRef.value.querySelectorAll('.section');
  if (sections.length) {
    const animation = animate(
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
    contentAnimations.value.push(animation);
    
    // Set up in-view animations for section content
    sections.forEach(section => {
      const observer = inView(section, () => {
        animate(
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
      
      inViewObservers.value.push(observer);
    });
  }
}

function restoreScrollPosition() {
  const scrollContainer = drawerRef.value?.querySelector('.scrollable-container');
  if (scrollContainer && scrollPosition.value > 0) {
    scrollContainer.scrollTop = scrollPosition.value;
  }
}

async function onEnter(el, onComplete) {
    try {
        if (!el) {
            onComplete();
            return;
        }

        // Reset loading state
        isLoading.value = false;

        const accentLine = el.querySelector('.drawer-accent-line');
        if (accentLine) accentLine.style.opacity = '0';

        const drawerAnimation = animate(
            el,
            {
                transform: ["translateX(-100%) scale(0.95)", "translateX(0) scale(1)"],
                opacity: [0.5, 1],
                filter: ["blur(8px)", "blur(0px)"]
            },
            { duration: 0.5, easing: [0.22, 1, 0.36, 1] }
        );

        const headerElements = el.querySelectorAll(".header-content > *");
        if (headerElements.length) {
            const headerAnimation = animate(
                headerElements,
                { opacity: [0, 1], transform: ["translateY(-15px)", "translateY(0)"], filter: ["blur(4px)", "blur(0px)"] },
                { delay: stagger(0.08, { start: 0.2 }), duration: 0.4, easing: "ease-out" }
            );
        }

        const sections = el.querySelectorAll(".scrollable-container section"); // Target sections within scrollable-container
        if (sections.length) {
            const sectionsAnimation = animate(
                sections,
                { opacity: [0, 1], transform: ["translateY(20px)", "translateY(0)"], filter: ["blur(4px)", "blur(0px)"] },
                { delay: stagger(0.08, { start: 0.3 }), duration: 0.5, easing: "ease-out" }
            );
        }

        await drawerAnimation.finished;

        if (accentLine) {
            const accentAnimation = animate(accentLine, { scaleY: [0, 1], opacity: [0, 0.8] }, { duration: 0.6, easing: "ease-out", delay: 0.1 });
        }

        animate(el, { x: [0, 3, 0] }, { duration: 0.5, easing: "ease-in-out" });
        onComplete();

    } catch (error) {
        console.error("Animation error:", error);
        if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateX(0) scale(1)';
        }
        onComplete();
    }
}

async function onLeave(el, onComplete) {
  try {
    if (!el) {
      onComplete();
      return;
    }

    cleanupAnimations();

    const accentLine = el.querySelector(".drawer-accent-line");
    if (accentLine) {
      await animate(accentLine, { scaleY: [1, 0], opacity: [0.8, 0] }, { duration: 0.3, easing: "ease-in" }).finished;
    }

    const sections = el.querySelectorAll(".scrollable-container section"); // Target sections within scrollable-container
    if (sections.length) {
      animate(
        sections,
        { opacity: [1, 0], transform: ["translateY(0)", "translateY(15px)"], filter: ["blur(0px)", "blur(3px)"] },
        { delay: stagger(0.03, { from: "last" }), duration: 0.2, easing: "ease-in" }
      );
    }

    const drawerAnimation = animate(
      el,
      { transform: ["translateX(0) scale(1)", "translateX(-100%) scale(0.95)"], opacity: [1, 0], filter: ["blur(0px)", "blur(6px)"] },
      { delay: 0.1, duration: 0.4, easing: "ease-in" }
    );

    await drawerAnimation.finished;
    onComplete();
  } catch (error) {
    console.error("Leave animation error:", error);
    if (el) el.style.opacity = '0';
    onComplete();
  }
}

function cleanupAnimations() {
  // Clean up content animations
  contentAnimations.value.forEach(animation => animation.cancel());
  contentAnimations.value = [];
  
  // Clean up inView observers
  inViewObservers.value.forEach(observer => observer.stop());
  inViewObservers.value = [];
}

function toggleFootwearDetails(e) {
  const detail = e.target;
  const content = detail.querySelector(".details-content");
  detailsOpen.value = detail.open;

  if (detail.open) {
    content.style.height = "0px";
    content.style.overflow = "hidden";
    content.style.opacity = "0";
    const targetHeight = content.scrollHeight;
    animate(
      content,
      { height: [0, `${targetHeight}px`], opacity: [0, 1], transform: ["translateY(-10px)", "translateY(0px)"] },
      { duration: 0.35, easing: [0.2, 0.9, 0.4, 1] }
    ).finished.then(() => {
      content.style.height = "auto";
      content.style.overflow = "visible";
    });
  } else {
    const currentHeight = content.offsetHeight;
    content.style.height = `${currentHeight}px`;
    content.style.overflow = "hidden";
    animate(
      content,
      { height: [`${currentHeight}px`, "0px"], opacity: [1, 0], transform: ["translateY(0px)", "translateY(-10px)"] },
      { duration: 0.3, easing: [0.4, 0.0, 0.6, 1] }
    );
  }
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
  emit("close", { expandSidebar: true, fromMapMarker: props.fromMapMarker });
}

function handleStartWalkClick() {
  emit("start-walk", props.walk);
}

// Clean up animations and observers when component is unmounted
onBeforeUnmount(() => {
  cleanupAnimations();
  
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
</script>

<style scoped>
@import "tailwindcss";

/* General Styles */
.walk-drawer {
  width: 380px;
  height: 100vh;
  max-width: 90vw;
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgb(var(--md-sys-color-surface-container));
  box-shadow: var(--md-sys-elevation-level2);
  border-radius: 0 24px 24px 0;
  padding-left: var(--md-sys-sidebar-collapsed);
  z-index: 20;
  overflow: hidden; /* Important: Keep this to prevent double scrollbars */
}


.rail-connector {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 56px;
  width: 28px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 0 28px 28px 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.drawer-accent-line {
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: calc(var(--md-sys-sidebar-collapsed) - 1px);
  width: 4px;
  background: linear-gradient(to bottom, rgb(var(--md-sys-color-primary)), rgb(var(--md-sys-color-tertiary)));
  border-radius: 4px;
  opacity: 0.8;
}

/* Header Styles */
.header-container {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  box-shadow: var(--md-sys-elevation-level1);
  border-top-right-radius: 24px;
  position: sticky;
  top: 0;
  z-index: 10;
  margin-left: calc(0px - var(--md-sys-sidebar-collapsed));
  width: calc(100% + var(--md-sys-sidebar-collapsed));
}

.header-content {
    display: flex;
    align-items: center;
    min-height: 64px;
    padding: 0 16px;
    margin-left: var(--md-sys-sidebar-collapsed);
}
.m3-icon-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface));
  position: relative;
  overflow: hidden;
    margin-right: 16px;
}

.m3-headline-small {
  font-size: 1.25rem;
  font-weight: 500;
  width: 100%;
  color: rgb(var(--md-sys-color-on-surface));
    margin: 0;
    padding: 1rem;
    word-break: break-word;
}

/* Scrollable Container Styles */
.scrollable-container {
  overflow-y: auto; /* Enables scrolling */
  height: calc(100vh - 64px); /* header height */
  padding-bottom: 24px; /* Add padding at the bottom */
  position: relative;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
    padding: 1rem; /* Add padding to the content */

}

/* Key Info Styles */
.key-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.info-icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 1.25rem;
}

/* Amenities Styles */
.amenities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.amenity-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.amenity-icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 1.25rem;
    margin-right: 0.25rem;

}
.amenity-check {
    margin-left: auto;
    color: rgb(var(--md-sys-color-success));
    font-size: 1.25rem;
}

/* Buttons Styles */
.buttons-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.m3-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: white;
  transition: background-color 0.2s ease;
    height: 2.5rem;
}

.m3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
}

.m3-tonal-button {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.m3-outlined-button {
  border: 1px solid rgb(var(--md-sys-color-outline));
  color: rgb(var(--md-sys-color-on-surface));
}
.icon-button{
    width: 2.5rem;
    padding: 0;
}

.secondary-buttons {
  display: flex;
  gap: 0.5rem;
}
.button-icon{
    margin-right: 0.5rem;
}

/* Sections Styles */
.sections-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section {
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: var(--md-sys-elevation-level1);
}

.section-title {
  font-size: 1rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin-bottom: 0.5rem;
}
.section-title-with-icon {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.section-text {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  line-height: 1.4;
}

.section-list {
    list-style: disc;
    padding-left: 1.5rem;
}

.section-list-item {
    font-size: 0.875rem;
    color: rgb(var(--md-sys-color-on-surface-variant));
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

/* POI Styles */
.poi-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.poi-chip {
  display: flex;
  align-items: center;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 1rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.poi-icon {
  font-size: 1rem;
  margin-right: 0.25rem;
}

.poi-text {
  white-space: nowrap;
}

.poi-subtext {
  font-size: 0.625rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-left: 0.25rem;
}

.poi-badge {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  border-radius: 0.75rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 500;
  margin-left: auto;
}

.poi-count {
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Feature Styles */
.feature-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-chip {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 1rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Pub Styles */
.pub-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pub-card {
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 0.75rem;
  box-shadow: var(--md-sys-elevation-level1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.pub-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-level2);
}

.pub-button {
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.pub-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
}

.pub-icon-container {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pub-main-icon {
  font-size: 1.5rem;
  color: rgb(var(--md-sys-color-primary));
}

.pub-details {
  flex-grow: 1; /* Allow details to take available space */
}

.pub-name-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pub-name {
  font-size: 1rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
}

.dog-friendly-icon {
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-primary));
}

.pub-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.25rem;
}

.pub-meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.pub-meta-icon {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-primary));
}

.pub-opening-hours {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-top: 0.25rem;
}

.pub-opening-hours-icon {
  font-size: 0.875rem;
}

.pub-open-icon {
  margin-left: auto; /* Push to right */
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  opacity: 0;
  transition: opacity 0.2s ease;
}
.pub-button:hover .pub-open-icon {
  opacity: 1;
}

/* Practical Information Styles */
.practical-info-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.footwear-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footwear-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
}

.footwear-text {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.details-container {
  border-top: 1px solid rgba(var(--md-sys-color-outline-variant), 0.3);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.details-summary {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 1rem;
  user-select: none;
  color: rgb(var(--md-sys-color-primary));
  font-weight: 500;
  background-color: rgba(var(--md-sys-color-primary), 0.05);
  display: flex;
  align-items: center;
  width: fit-content; /* Fit to content */
}
.details-summary:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.1);
}

.details-icon {
  transition: transform 0.3s ease;
  margin-left: 0.5rem;
}

.details-content {
  padding: 0.5rem 1rem;
  border-left: 2px solid rgba(var(--md-sys-color-primary), 0.3);
  margin-left: 0.5rem;
  margin-top: 0.5rem;
}

.considerations-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dog-considerations {
  margin-bottom: 0.5rem; /* Add some space below dog chip */
}

.dog-chip-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.dog-chip-icon {
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-primary));
}

.dog-chip-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
}

.dog-chip-content {
  padding-left: 2rem;
}

.considerations-list {
  list-style: disc;
  padding-left: 1.5rem;
}

.considerations-list-item {
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  line-height: 1.4;
  margin-bottom: 0.25rem; /* Spacing between list items */
}

.pub-count {
  margin-left: auto; /* Align to the right */
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.section-icon {
  font-size: 1.25rem; /* Adjust as needed */
  color: rgb(var(--md-sys-color-primary));
}
/* Additional Info Styles */
.extra-info-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.extra-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline-variant), 0.3);
}

.extra-info-label {
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  text-transform: capitalize;
}
.extra-info-value {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
}

/* Loading state styles */
.loading-overlay {
  position: absolute;
  top: 64px; /* Below header */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--md-sys-color-surface-container), 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.loading-icon {
  font-size: 2.5rem;
  color: rgb(var(--md-sys-color-primary));
}

.walk-drawer.loading .scrollable-container {
  opacity: 0.7;
}

.header-content.loading, .m3-headline-small.loading {
  opacity: 0.7;
  pointer-events: none;
}

/* Animation for content transitions */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(10px); }
}

.animate-spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
