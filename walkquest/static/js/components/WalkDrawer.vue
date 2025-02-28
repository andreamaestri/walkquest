<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="isOpen" ref="drawerRef" class="walk-drawer" :class="{ loading: isLoading }">
      <div ref="connectorRef" class="rail-connector"></div>

      <header ref="headerRef" class="header-container">
        <div class="header-content" :class="{ loading: isLoading }">
          <button ref="backButtonRef" class="m3-icon-button" @click="handleBackClick" aria-label="Close drawer">
            <Icon icon="mdi:arrow-back" class="text-2xl" />
          </button>
          <h2 ref="titleRef" class="m3-headline-small" :class="{ loading: isLoading }">
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
            <button :ref="(el) => (buttonRefs[0] = el)" class="m3-button m3-filled-button"
              @click="handleStartWalkClick">
              <Icon icon="mdi:play-circle" class="button-icon" />
              <span>Start Walk</span>
            </button>

            <div class="secondary-buttons">
              <button :ref="(el) => (buttonRefs[1] = el)" class="m3-button m3-tonal-button" @click="() => { }">
                <Icon icon="mdi:navigation" class="button-icon" />
                <span>Directions</span>
              </button>

              <button :ref="(el) => (buttonRefs[2] = el)" class="m3-button m3-outlined-button icon-button"
                @click="() => { }">
                <Icon icon="mdi:heart" class="button-icon" />
              </button>

              <button :ref="(el) => (buttonRefs[3] = el)" class="m3-button m3-outlined-button icon-button"
                @click="handleShare">
                <Icon icon="mdi:share" class="button-icon" />
              </button>
            </div>
          </div>

          <div class="sections-container">
            <section v-if="walk.description" :ref="(el) => (sectionRefs[0] = el)" class="section">
              <h3 class="section-title">About</h3>
              <p class="section-text">{{ walk.description }}</p>
            </section>
            <section v-if="walk.features?.length || walk.related_categories?.length"
              :ref="(el) => (sectionRefs[3] = el)" class="section">
              <!-- Trail Features Header -->
              <div class="enhanced-section-header">
                <div class="header-title-container">
                  <Icon icon="material-symbols:nordic-walking-rounded" class="header-icon" />
                  <h3 class="section-title">Trail Features</h3>
                </div>
                <span class="count-badge">{{ totalFeaturesCount }}</span>
              </div>

              <div class="features-container">
                <!-- Categories Section -->
                <div v-if="walk.related_categories?.length" class="feature-group">

                  <div class="category-chips">
                    <div v-for="category in walk.related_categories" :key="category.name" class="category-chip-wrapper">
                      <div class="category-chip" :class="getCategoryClass(category.name)">
                        <Icon :icon="getCategoryIcon(category.name)" class="category-icon" />
                        <span class="category-name">{{ category.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Features Section -->
                <div v-if="walk.features?.length" class="feature-group">
                  <div class="feature-group-header">
                    <Icon icon="mdi:feature-search" class="feature-group-icon" />
                    <span class="feature-group-title">Features</span>
                  </div>

                  <div class="features-grid">
                    <div v-for="feature in walk.features" :key="feature.name" class="feature-item">
                      <Icon icon="mdi:check-circle-outline" class="feature-item-icon" />
                      <span class="feature-item-name">{{ feature.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section v-if="parsedHighlights.length" :ref="(el) => (sectionRefs[1] = el)" class="section">
              <!-- Highlights Header -->
              <div class="enhanced-section-header">
                <div class="header-title-container">
                  <Icon icon="mdi:panorama" class="header-icon" />
                  <h3 class="section-title">Highlights</h3>
                </div>
                <span v-if="parsedHighlights.length" class="count-badge">{{
                  parsedHighlights.length
                  }}</span>
              </div>
              <ul class="section-list">
                <li v-for="highlight in parsedHighlights" :key="highlight" class="section-list-item">
                  {{ highlight }}
                </li>
              </ul>
            </section>

            <section v-if="parsedPOIs.length" :ref="(el) => (sectionRefs[2] = el)" class="section">
              <!-- POIs Header -->
              <div class="enhanced-section-header">
                <div class="header-title-container">
                  <Icon icon="mdi:map-marker" class="header-icon" />
                  <h3 class="section-title">Points of Interest</h3>
                </div>
                <span class="count-badge">{{ parsedPOIs.length }}</span>
              </div>

              <div class="poi-categories">
                <div v-for="(pois, category) in groupedPOIs" :key="category" class="poi-category">
                  <div class="category-header" v-if="category !== 'Other'">
                    <Icon :icon="getCategoryIconByName(category)" class="category-icon" />
                    <span class="category-name">{{ category }}</span>
                  </div>

                  <div class="poi-grid">
                    <div v-for="poi in pois" :key="poi.text" class="poi-card"
                      :class="{ 'poi-card-featured': poi.text.length > 20 }">
                      <div class="poi-card-icon" :class="poi.iconColor">
                        <Icon :icon="poi.icon" />
                      </div>
                      <div class="poi-card-content">
                        <span class="poi-card-text">{{ poi.text }}</span>
                        <span v-if="poi.subtext" class="poi-card-subtext">{{
                          poi.subtext
                          }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="walk.pubs_list?.length" :ref="(el) => (sectionRefs[6] = el)" class="section">
              <!-- Nearby Pubs Header -->
              <div class="enhanced-section-header">
              <div class="header-title-container">
                <Icon icon="mdi:glass-mug-variant" class="header-icon" />
                <h3 class="section-title">Nearby Pubs</h3>
              </div>
              <span class="count-badge">{{ walk.pubs_list.length }}</span>
              </div>

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
                          <Icon v-if="pub.is_dog_friendly" icon="mdi:dog" class="dog-friendly-icon"
                            title="Dog Friendly" />
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
                          <Icon :icon="pub.opening_hours.open_now
                              ? 'mdi:clock'
                              : 'mdi:clock-outline'
                            " class="pub-opening-hours-icon" :class="pub.opening_hours.open_now
                                ? 'text-primary'
                                : 'text-error'
                              " />
                          <span>{{
                            pub.opening_hours.open_now ? "Open Now" : "Closed"
                            }}</span>
                        </div>
                      </div>
                      <Icon icon="mdi:open-in-new" class="pub-open-icon" />
                    </div>
                  </button>
                </div>
              </div>
            </section>

            <section v-if="walk.footwear_category || parsedConsiderations.length > 0"
              :ref="(el) => (sectionRefs[4] = el)" class="section practical-info-section">
              <h3 class="section-title">Practical Information</h3>

              <div class="practical-info-grid">
                <!-- Dog Information Card -->
                <div v-if="dogConsiderations.length" class="info-card dog-info-card">
                  <div class="info-card-header">
                    <Icon icon="mdi:dog-side" class="info-card-icon" />
                    <h4 class="m3-title-medium">Dog owners:</h4>
                  </div>
                  <div class="info-card-divider"></div>
                  <div class="info-card-content">
                    <p class="m3-body-medium">{{ dogCombinedText }}</p>
                  </div>
                </div>

                <!-- Footwear Card -->
                <div v-if="walk.footwear_category" class="info-card footwear-info-card">
                  <div class="info-card-header">
                    <Icon icon="maki:shoe" class="info-card-icon" />
                    <h4 class="m3-title-medium">Footwear type:</h4>
                  </div>
                  <div class="info-card-divider"></div>
                  <div class="info-card-content">
                    <div class="footwear-category m3-body-large">
                      {{ walk.footwear_category }}
                    </div>
                    <details v-if="walk.recommended_footwear" class="details-container" ref="footwearDetailsRef"
                      @toggle="toggleFootwearDetails">
                      <summary class="details-summary m3-body-medium">
                        <span>{{
                          detailsOpen ? "Hide Details" : "Show Details"
                          }}</span>
                        <Icon :icon="detailsOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'
                          " class="details-icon" />
                      </summary>
                      <div class="details-content">
                        <p class="m3-body-medium">
                          {{ walk.recommended_footwear }}
                        </p>
                      </div>
                    </details>
                  </div>
                </div>

                <!-- Trail Considerations Card -->
                <div v-if="nonDogConsiderations.length" class="info-card considerations-info-card">
                  <div class="info-card-header">
                    <Icon icon="mdi:information-outline" class="info-card-icon" />
                    <h4 class="m3-title-medium">Trail Considerations</h4>
                  </div>
                  <div class="info-card-divider"></div>
                  <div class="info-card-content">
                    <ul class="considerations-list">
                      <li v-for="item in nonDogConsiderations" :key="item.text" class="considerations-list-item">
                        <Icon icon="mdi:check-circle" class="list-bullet" />
                        <span class="m3-body-medium">{{ item.text }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="hasExtraInfo" :ref="(el) => (sectionRefs[5] = el)" class="section">
              <h3 class="section-title">Additional Information</h3>
              <div class="extra-info-container">
                <div v-for="(value, key) in walkExtra" :key="key" class="extra-info-item">
                  <strong class="extra-info-label">{{ key.split("_").join(" ") }}:</strong>
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
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { animate, stagger, inView } from "motion";
import { Icon } from "@iconify/vue";
import { useRouter } from "vue-router";
import { useWalksStore } from "../stores/walks";

const props = defineProps({
  walk: { type: Object, required: true },
  isOpen: { type: Boolean, default: false },
  sidebarWidth: { type: Number, default: 80 },
  fromMapMarker: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "start-walk", "loading-change"]);

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
const initialAnimationCompleted = ref(false);

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
  cleanup() {
    // Cancel all animations
    for (const animation of this.instances) {
      try {
        animation.cancel();
      } catch (err) {
        console.warn("Error cancelling animation:", err);
      }
    }
    this.instances.clear();

    // Stop all observers by calling their stop functions
    for (const stop of this.observers) {
      try {
        stop();
      } catch (err) {
        console.warn("Error stopping observer:", err);
      }
    }
    this.observers.clear();
  },
};

// Animation configurations
const animationConfigs = {
  fluid: { duration: 0.5, easing: [0.22, 1, 0.36, 1] },
  standard: { duration: 0.3, easing: "easeOut" },
  exit: { duration: 0.25, easing: "easeIn" },
};

const router = useRouter();
const walksStore = useWalksStore();

// Watch for walk changes to handle transitions
watch(
  () => props.walk?.id,
  async (newWalkId, oldWalkId) => {
    console.log("Walk ID changed:", {
      new: newWalkId,
      old: oldWalkId,
      isTransitioning: isTransitioning.value,
    });

    // If both IDs are valid and different, and a transition isn't already in progress, handle the transition
    if (newWalkId && oldWalkId && newWalkId !== oldWalkId) {
      try {
        // Set transition state
        isTransitioning.value = true;
        emit("loading-change", true);

        // Reset the animation flag for the new walk
        initialAnimationCompleted.value = false;

        // Save current walk ID and scroll position before transition
        previousWalkId.value = oldWalkId;
        if (drawerRef.value) {
          const scrollContainer = drawerRef.value.querySelector(
            ".scrollable-container"
          );
          if (scrollContainer) {
            scrollPosition.value = scrollContainer.scrollTop;
          }
        }

        // Animate content out with timeout protection
        const contentOutPromise = animateContentOut();
        const contentOutTimeout = new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
        await Promise.race([contentOutPromise, contentOutTimeout]);

        // Wait for data
        await nextTick();

        // Reset scroll for new content
        const scrollContainer = drawerRef.value?.querySelector(
          ".scrollable-container"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }

        // Animate new content in with timeout protection
        const contentInPromise = animateContentIn();
        const contentInTimeout = new Promise((resolve) =>
          setTimeout(resolve, 800)
        );
        await Promise.race([contentInPromise, contentInTimeout]);
      } catch (error) {
        console.error("Transition error:", error);
      } finally {
        // Always reset transition state, even if there was an error
        isTransitioning.value = false;
        emit("loading-change", false);
      }
    } else if (newWalkId && !oldWalkId) {
      // This case handles when a new walk is selected from nothing
      isTransitioning.value = false;
      emit("loading-change", false);
      // Make sure initial animation runs for first walk
      initialAnimationCompleted.value = false;
    }
  },
  { immediate: true }
);

// Watch for open state changes
watch(
  () => props.isOpen,
  async (isOpen) => {
    console.log("Drawer isOpen changed:", isOpen);

    if (isOpen) {
      // Ensure transition state is reset when drawer opens
      isTransitioning.value = false;

      await nextTick();
      initializeDrawer();

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
  },
  { immediate: true }
);

function initializeDrawer() {
  if (drawerRef.value) {
    // Calculate drawer position based on sidebar state and transition source
    const offset = props.fromMapMarker ? 0 : props.sidebarWidth;
    drawerRef.value.style.transition = "transform 0.3s ease, left 0.3s ease";

    if (connectorRef.value) {
      // Using Motion's API directly
      animate(
        connectorRef.value,
        {
          opacity: [0, 1],
          width: ["0px", "28px"],
        },
        {
          delay: 0.2,
          duration: 0.6,
          easing: "easeOut",
        }
      );
    }
  }
}

function restoreScrollPosition() {
  const scrollContainer = drawerRef.value?.querySelector(
    ".scrollable-container"
  );
  if (scrollContainer && scrollPosition.value > 0) {
    scrollContainer.scrollTop = scrollPosition.value;
    console.log("Restored scroll position:", scrollPosition.value);
  }
}

async function animateContentOut() {
  // Clean up existing animations
  animations.cleanup();

  if (!drawerRef.value) return;

  const elements = [
    ...drawerRef.value.querySelectorAll(".section"),
    ...drawerRef.value.querySelectorAll(".key-info"),
    ...drawerRef.value.querySelectorAll(".amenities-grid"),
    ...drawerRef.value.querySelectorAll(".buttons-container"),
  ];

  if (elements.length) {
    const animation = animations.animate(
      elements,
      {
        opacity: [1, 0],
        transform: ["translateY(0)", "translateY(30px)"],
      },
      {
        duration: 0.3,
        easing: [0.4, 0.0, 0.2, 1], // Modern easing curve
        delay: stagger(0.03, { from: "last" }),
      }
    );
    await animation.finished;
  }
}
async function animateContentIn() {
  // Prevent duplicate animations and only run initial animation once
  if (
    !drawerRef.value ||
    isTransitioning.value ||
    drawerRef.value.dataset.animatingIn === "true"
  )
    return;

  // Skip if initial animation has already been completed for this instance
  if (initialAnimationCompleted.value && !isTransitioning.value) return;

  try {
    // Mark as animating to prevent duplicate calls
    drawerRef.value.dataset.animatingIn = "true";

    await nextTick();

    // Animate header elements first
    const headerElements = [titleRef.value, keyInfoRef.value].filter(Boolean);
    if (headerElements.length) {
      const headerAnimation = animations.register(
        animate(
          headerElements,
          {
            opacity: [0, 1],
            transform: ["translateY(-30px)", "translateY(0)"],
          },
          {
            duration: 0.4,
            easing: [0.0, 0.0, 0.2, 1], // Modern deceleration curve
            delay: stagger(0.1),
          }
        )
      );
    }

    // Then animate content sections
    const sections = drawerRef.value.querySelectorAll(".section");
    if (sections.length) {
      const animation = animations.register(
        animate(
          sections,
          {
            opacity: [0, 1],
            transform: ["translateY(40px)", "translateY(0)"],
          },
          {
            delay: stagger(0.08, { start: 0.2 }),
            duration: 0.5,
            easing: [0.0, 0.0, 0.2, 1], // Modern deceleration curve
          }
        )
      );

      // Animate highlights with stagger after sections appear
      const highlightItems =
        drawerRef.value.querySelectorAll(".section-list-item");
      if (highlightItems.length) {
        animations.register(
          animate(
            highlightItems,
            {
              opacity: [0, 1],
              transform: ["translateX(-15px)", "translateX(0)"],
              scale: [0.95, 1],
            },
            {
              delay: stagger(0.06, { start: 0.5 }),
              duration: 0.4,
              easing: [0.0, 0.0, 0.2, 1],
            }
          )
        );
      }
    }

    // Mark initial animation as completed
    initialAnimationCompleted.value = true;
  } finally {
    // Set a timeout to remove the flag after animations should be complete
    setTimeout(() => {
      if (drawerRef.value) {
        drawerRef.value.dataset.animatingIn = "false";
      }
    }, 1000);
  }
}

async function onEnter(el, onComplete) {
  if (!el) {
    onComplete();
    return;
  }

  console.log("Starting entrance animation");

  // Set initial state
  el.style.opacity = "0";
  el.style.transform = "translateX(-100%) scale(0.95)";

  // Force browser to apply initial styles first
  await new Promise((resolve) =>
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    })
  );

  try {
    // Create our animation
    const animation = animate(
      el,
      {
        transform: ["translateX(-100%) scale(0.95)", "translateX(0) scale(1)"],
        opacity: [0, 1],
      },
      {
        duration: 0.5,
        easing: [0.25, 1, 0.5, 1],
      }
    );

    // Important: Tell Vue we're done AFTER the animation completes
    animation.finished
      .then(() => {
        onComplete();

        // These animations can happen after the transition is "complete"
        const accentLine = el.querySelector(".drawer-accent-line");
        if (accentLine) {
          animate(
            accentLine,
            { scaleY: [0, 1], opacity: [0, 0.8] },
            { duration: 0.6 }
          );
        }
      })
      .catch((error) => {
        console.error("Animation error:", error);
        onComplete();
      });
  } catch (error) {
    console.error("Animation setup error:", error);
    el.style.opacity = "1";
    el.style.transform = "translateX(0) scale(1)";
    onComplete();
  }
}

async function onLeave(el, onComplete) {
  if (!el) {
    onComplete();
    return;
  }

  console.log("Starting exit animation");

  try {
    // First animate out accent line
    const accentLine = el.querySelector(".drawer-accent-line");
    if (accentLine) {
      animate(
        accentLine,
        { scaleY: [1, 0], opacity: [0.8, 0] },
        { duration: 0.2 }
      );
    }

    // Main element animation with proper promise handling
    const animation = animate(
      el,
      {
        transform: ["translateX(0) scale(1)", "translateX(-100%) scale(0.95)"],
        opacity: [1, 0],
      },
      {
        duration: 0.4,
        easing: [0.4, 0.0, 0.2, 1],
      }
    );

    // Wait for animation to complete before calling onComplete
    animation.finished
      .then(() => {
        onComplete();
      })
      .catch((error) => {
        console.error("Exit animation error:", error);
        el.style.opacity = "0";
        onComplete();
      });
  } catch (error) {
    console.error("Exit animation setup error:", error);
    el.style.opacity = "0";
    onComplete();
  }
}

// Simplified toggle details animation
function toggleDetailsAnimation(e) {
  const detail = e.target;
  const content = detail.querySelector(".details-content");
  const isOpen = detail.open;

  if (!content) return;

  if (isOpen) {
    content.style.height = "0px";
    content.style.overflow = "hidden";
    content.style.opacity = "0";
    const targetHeight = content.scrollHeight;

    animate(
      content,
      {
        height: [0, `${targetHeight}px`],
        opacity: [0, 1],
        transform: ["translateY(-20px)", "translateY(0px)"],
      },
      { duration: 0.4, easing: [0.0, 0.0, 0.2, 1] }
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
      {
        height: [`${currentHeight}px`, "0px"],
        opacity: [1, 0],
        transform: ["translateY(0px)", "translateY(-20px)"],
      },
      { duration: 0.35, easing: [0.4, 0.0, 0.2, 1] }
    );
  }
}

// Replace toggleFootwearDetails with the generic function
function toggleFootwearDetails(e) {
  const detail = e.target;
  detailsOpen.value = detail.open;
  toggleDetailsAnimation(e);
}

// computed property to your script section
const groupedPOIs = computed(() => {
  const grouped = {};

  parsedPOIs.value.forEach((poi) => {
    const category = poi.badge || "Other";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(poi);
  });

  // Sort categories - put "Other" at the end
  return Object.keys(grouped)
    .sort((a, b) =>
      a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
    )
    .reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {});
});

function getCategoryIconByName(categoryName) {
  const category = poiCategories.find((cat) => cat.badge === categoryName);
  return category ? category.icon : "mdi:map-marker";
}

const poiCategories = [
  {
    pattern: /(pub|inn|tavern)/i,
    icon: "mdi:glass-mug-variant",
    color: "text-amber-800",
    badge: "Refreshment",
  },
  {
    pattern: /(church|chapel|cathedral|abbey)/i,
    icon: "mdi:church",
    color: "text-blue-600",
    badge: "Religious",
  },
  {
    pattern: /(lake|river|waterfall|pond|reservoir|stream|beach|sea)/i,
    icon: "mdi:water",
    color: "text-blue-500",
    badge: "Water",
  },
  {
    pattern: /(hill|mountain|peak|ridge|valley|viewpoint|panorama)/i,
    icon: "mdi:mountain",
    color: "text-emerald-700",
    badge: "Landscape",
  },
  {
    pattern: /(café|cafe|restaurant|tea|coffee)/i,
    icon: "mdi:coffee",
    color: "text-amber-700",
    badge: "Refreshment",
  },
  {
    pattern: /(wood|forest|woodland|tree)/i,
    icon: "mdi:pine-tree",
    color: "text-green-600",
    badge: "Nature",
  },
  {
    pattern: /(garden|park|flower)/i,
    icon: "mdi:flower",
    color: "text-pink-500",
    badge: "Nature",
  },
  {
    pattern: /(museum|gallery|art)/i,
    icon: "mdi:bank",
    color: "text-purple-600",
    badge: "Cultural",
  },
  {
    pattern: /(bridge|viaduct|aqueduct)/i,
    icon: "mdi:bridge",
    color: "text-stone-600",
    badge: "Structure",
  },
  {
    pattern: /(wildlife|animal|bird)/i,
    icon: "mdi:paw",
    color: "text-orange-600",
    badge: "Wildlife",
  },
  {
    pattern: /(castle)/i,
    icon: "material-symbols:castle-rounded",
    color: "text-gray-700",
    badge: "Historical",
  },
  {
    pattern: /(lighthouse)/i,
    icon: "mdi:lighthouse",
    color: "text-yellow-700",
    badge: "Landmark",
  },
  {
    pattern: /(garden)/i,
    icon: "mdi:flower",
    color: "text-pink-500",
    badge: "Nature",
  },
];

const parsedPOIs = computed(() => {
  const pois = props.walk?.points_of_interest;
  if (!pois) return [];

  const mapper = (poi) => {
    const poiLower = poi.toLowerCase();
    const category = poiCategories.find((cat) =>
      cat.pattern.test(poiLower)
    ) || { icon: "mdi:map-marker", color: "text-primary", badge: "" };
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
    return pois
      .split(";")
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
  if (typeof highlights === "string") {
    return highlights
      .split(";")
      .map((h) => h.trim())
      .filter(processHighlight);
  }
  return [];
});

function processDogConsiderations(consideration) {
  if (!consideration) return { text: "", isDog: false };

  const trimmed = consideration.trim();
  const dogTerms = [/\bdogs?\b/i, /\bcanine\b/i];

  // Check if it starts with "dogs" or contains dog-related terms
  const startsWithDogs = trimmed.toLowerCase().startsWith("dogs");
  const isDogRelated = dogTerms.some((term) => term.test(trimmed));

  if (!startsWithDogs && !isDogRelated) {
    return { text: trimmed, isDog: false };
  }

  // Remove "dogs" prefix if present and clean up the text
  const processedText = trimmed.replace(/^dogs\s*[:,-]?\s*/i, "").trim();
  return { text: processedText, isDog: true };
}

const parsedConsiderations = computed(() => {
  const considerations = props.walk?.trail_considerations;
  if (!considerations) return [];

  // Handle case when trail_considerations is a string
  if (typeof considerations === "string") {
    return considerations
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map(processDogConsiderations);
  }

  // Handle case when trail_considerations is an array
  if (Array.isArray(considerations)) {
    return considerations
      .filter(
        (item) => item && typeof item === "string" && item.trim().length > 0
      )
      .map(processDogConsiderations);
  }

  return [];
});

const totalFeaturesCount = computed(() => {
  let count = 0;

  // Add the number of features if they exist
  if (Array.isArray(props.walk.features)) {
    count += props.walk.features.length;
  }

  // Add the number of categories if they exist
  if (Array.isArray(props.walk.related_categories)) {
    count += props.walk.related_categories.length;
  }

  return count;
});

const dogConsiderations = computed(() =>
  parsedConsiderations.value.filter((item) => item.isDog)
);
const nonDogConsiderations = computed(() =>
  parsedConsiderations.value.filter((item) => !item.isDog)
);
const dogCombinedText = computed(() => {
  if (!dogConsiderations.value.length) return "";

  return dogConsiderations.value
    .map((item) => {
      let text = item.text;
      if (text && !/^[A-Z]/.test(text)) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }
      return text;
    })
    .join("; ");
});

const displayedKeys = [
  "title",
  "walk_name",
  "description",
  "difficulty",
  "distance",
  "steepness",
  "highlights",
  "features",
  "categories",
  "points_of_interest",
  "has_pub",
  "has_cafe",
  "has_stiles",
  "has_bus_access",
  "is_favorite",
  "pubs_list",
  "footwear_category",
  "trail_considerations",
  "recommended_footwear",
];

const walkExtra = computed(() => {
  const extra = {};
  for (const key in props.walk) {
    if (!displayedKeys.includes(key)) {
      const value = props.walk[key];
      if (value != null && (typeof value !== "string" || value !== "")) {
        extra[key] = value;
      }
    }
  }
  return extra;
});

const hasExtraInfo = computed(() => Object.keys(walkExtra.value).length > 0);

function formatValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return (
            item.name ||
            item.title ||
            Object.values(item)
              .filter((v) => typeof v === "string")
              .join(", ") ||
            "[Object]"
          );
        }
        return item;
      })
      .join(", ");
  } else if (typeof value === "object" && value !== null) {
    if (value.name || value.title) {
      return value.name || value.title;
    }
    const stringValues = Object.entries(value)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        if (typeof v === "object") {
          return `${k}: ${v.name || v.title || "[Object]"}`;
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
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}&query=${encodeURIComponent(
        `places near ${latitude},${longitude}`
      )}`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    }
  } else if (props.walk.latitude && props.walk.longitude) {
    const latitude = props.walk.latitude;
    const longitude = props.walk.longitude;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `places near ${latitude},${longitude}`
    )}`;
  }

  if (mapsUrl) {
    window.open(mapsUrl, "_blank");
  }
}

function handleBackClick() {
  console.log("Back button clicked");

  emit("close", {
    expandSidebar: true,
    fromMapMarker: props.fromMapMarker,
    animated: true,
  });
}

function handleStartWalkClick() {
  if (isTransitioning.value) return;

  emit("start-walk", props.walk);
}

// Clean up animations and observers when component is unmounted
onBeforeUnmount(() => {
  animations.cleanup();

  // Save scroll position in case we're coming back to this walk
  if (drawerRef.value) {
    scrollPosition.value =
      drawerRef.value.querySelector(".scrollable-container")?.scrollTop || 0;
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
    navigator
      .share({
        title: props.walk.title || props.walk.walk_name,
        text: props.walk.description,
        url: shareUrl,
      })
      .catch(console.error);
  } else {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // Show copy success message
      })
      .catch(console.error);
  }
}

// Category mappings for styling - updated to handle phrase-based categories
const categoryMappings = {
  // Standard categories
  Nature: {
    color: "green",
    bgClass: "bg-green-100 text-green-900",
    icon: "mdi:tree",
  },
  // Extended mappings for detailed categories
  "circular walks": {
    color: "indigo",
    bgClass: "bg-indigo-100 text-indigo-900",
    icon: "mdi:rotate-right",
  },
  "linear walks": {
    color: "violet",
    bgClass: "bg-violet-100 text-violet-900",
    icon: "mdi:arrow-right",
  },
  "riverside walks": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:water",
  },
  "woodland walks": {
    color: "emerald",
    bgClass: "bg-emerald-100 text-emerald-900",
    icon: "mdi:pine-tree",
  },
  "coastal walks": {
    color: "cyan",
    bgClass: "bg-cyan-100 text-cyan-900",
    icon: "mdi:waves",
  },
  "mountain walks": {
    color: "slate",
    bgClass: "bg-slate-100 text-slate-900",
    icon: "mdi:mountain",
  },
  "walks with a café": {
    color: "amber",
    bgClass: "bg-amber-100 text-amber-900",
    icon: "mdi:coffee",
  },
  "walks with a pub": {
    color: "amber",
    bgClass: "bg-amber-800 text-amber-50",
    icon: "mdi:glass-mug-variant",
  },
  "walks without stiles": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:gate",
  },
  "walks with a good degree of shade": {
    color: "green",
    bgClass: "bg-green-100 text-green-900",
    icon: "mdi:weather-sunny-off",
  },
  "dog friendly walks": {
    color: "amber",
    bgClass: "bg-amber-100 text-amber-900",
    icon: "mdi:dog-side",
  },
  "family friendly walks": {
    color: "pink",
    bgClass: "bg-pink-100 text-pink-900",
    icon: "mdi:human-male-female-child",
  },
  "accessible walks": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:wheelchair-accessibility",
  },
};

// Default category for unknown categories
const defaultCategory = {
  color: "gray",
  bgClass: "bg-gray-100 text-gray-900",
  icon: "mdi:tag",
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
  { pattern: /accessible|wheelchair/i, match: "accessible walks" },
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
      return (
        categoryMappings[pattern.match]?.bgClass || defaultCategory.bgClass
      );
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
    // Set up scroll-linked animations for elements that should animate as they come into view
    if (drawerRef.value) {
      const sections = drawerRef.value.querySelectorAll(".section");
      sections.forEach((section, index) => {
        // Add data attribute to track animation state
        if (section.dataset.animated === "true") return;

        // Store the stop function returned by inView
        const stop = inView(
          section,
          (info) => {
            // Skip if already animated
            if (section.dataset.animated === "true") return;

            // Mark as animated to prevent repeating
            section.dataset.animated = "true";

            // Animate amenities, chips, etc.
            const elements = section.querySelectorAll(
              ".amenity-item, .poi-chip, .feature-chip, .pub-card"
            );
            if (elements.length) {
              animations.register(
                animate(
                  elements,
                  {
                    opacity: [0, 1],
                    scale: [0.92, 1],
                    transform: ["translateY(20px)", "translateY(0)"],
                  },
                  {
                    delay: stagger(0.04),
                    duration: 0.4,
                    easing: [0.0, 0.0, 0.2, 1],
                  }
                )
              );
            }

            // Animate highlight list items with horizontal stagger
            const highlightItems =
              section.querySelectorAll(".section-list-item");
            if (highlightItems.length) {
              animations.register(
                animate(
                  highlightItems,
                  {
                    opacity: [0, 1],
                    transform: ["translateX(-15px)", "translateX(0)"],
                    scale: [0.95, 1],
                  },
                  {
                    delay: stagger(0.06),
                    duration: 0.45,
                    easing: [0.0, 0.0, 0.2, 1],
                  }
                )
              );
            }

            // Stop observing this section
            stop();
          },
          {
            margin: "-5% 0px -10% 0px",
            amount: 0.15,
          }
        );

        // Store the stop function for cleanup
        animations.observers.add(stop);
      });
    }
  });
  // Add event listeners for browser back/forward navigation
  const handleRouteChange = () => {
    // Stop any running animations
    console.log("Route change detected, cleaning up animations");
  };

  window.addEventListener("popstate", handleRouteChange);

  // Cleanup function to be called on unmount
  onBeforeUnmount(() => {
    window.removeEventListener("popstate", handleRouteChange);

    // Disable animations during unmount to prevent hanging animations
    isTransitioning.value = false;

    // Save scroll position in case we're coming back to this walk
    if (drawerRef.value) {
      const scrollContainer = drawerRef.value.querySelector(
        ".scrollable-container"
      );
      if (scrollContainer) {
        scrollPosition.value = scrollContainer.scrollTop || 0;
      }
    }
  });
});
</script>

<style scoped>
@import "../../../static/css/walkdrawer.css";
</style>
