<template>
  <div class="content" :class="{ 'mobile': isMobile }">
    <!-- Key Info -->
    <div ref="keyInfoRef" class="key-info">
      <div v-if="walk.distance" class="info-item">
        <Icon icon="mdi:map-marker-distance" class="info-icon" />
        <span>{{ formatDistance(walk.distance) }}</span>
      </div>
      <div v-if="walk.steepness" class="info-item">
        <Icon icon="mdi:trending-up" class="info-icon" />
        <span>{{ walk.steepness }}</span>
      </div>
      <div v-if="walk.duration" class="info-item">
        <Icon icon="mdi:clock-outline" class="info-icon" />
        <span>{{ formatDuration(walk.duration) }}</span>
      </div>
      <div v-if="walk.difficulty" class="info-item">
        <Icon icon="mdi:stairs" class="info-icon" />
        <span>{{ formatDifficulty(walk.difficulty) }}</span>
      </div>
    </div>

    <!-- Amenities Grid -->
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

    <!-- Action Buttons -->
    <div ref="buttonsContainerRef" class="buttons-container">
      <button class="m3-button m3-filled-button" @click="$emit('start-walk', walk)">
        <Icon icon="mdi:play-circle" class="button-icon" />
        <span>Log an Adventure</span>
      </button>

      <div class="secondary-buttons">
        <button class="m3-button m3-tonal-button" @click="$emit('directions', walk)">
          <Icon icon="mdi:navigation" class="button-icon" />
          <span>Directions</span>
        </button>

        <button class="m3-button m3-outlined-button icon-button" @click="$emit('save-walk', walk)">
          <Icon icon="mdi:heart" class="button-icon" />
        </button>

        <button class="m3-button m3-outlined-button icon-button" @click="$emit('share', walk)">
          <Icon icon="mdi:share" class="button-icon" />
        </button>

        <button class="m3-button m3-outlined-button icon-button" @click="$emit('recenter')" title="Recenter map">
          <Icon icon="mdi:crosshairs-gps" />
        </button>
      </div>
    </div>

    <!-- Content Sections -->
    <div class="sections-container">
      <!-- About Section -->
      <section v-if="walk.description" :ref="el => setSectionRef(0, el)" class="section">
        <h3 class="section-title">About</h3>
        <p class="section-text">{{ walk.description }}</p>
      </section>

      <!-- Trail Features Section -->
      <section v-if="walk.features?.length || walk.related_categories?.length" :ref="el => setSectionRef(1, el)"
        class="section">
        <!-- Section Header -->
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
              <div v-for="category in walk.related_categories" :key="category.name" class="category-chip-wrapper"
                @mouseenter="handleCategoryMouseEnter(category)" @mouseleave="handleCategoryMouseLeave">
                <div class="category-chip"
                  :class="[getCategoryClass(category.name), { 'is-hovered': isCategoryHovered(category) }]">
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

      <!-- Highlights Section -->
      <section v-if="parsedHighlights.length" :ref="el => setSectionRef(2, el)" class="section">
        <div class="enhanced-section-header">
          <div class="header-title-container">
            <Icon icon="mdi:panorama" class="header-icon" />
            <h3 class="section-title">Highlights</h3>
          </div>
          <span v-if="parsedHighlights.length" class="count-badge">{{ parsedHighlights.length }}</span>
        </div>
        <ul class="section-list">
          <li v-for="highlight in parsedHighlights" :key="highlight" class="section-list-item">
            {{ highlight }}
          </li>
        </ul>
      </section>

      <!-- Points of Interest Section -->
      <section v-if="parsedPOIs.length" :ref="el => setSectionRef(3, el)" class="section">
        <div class="enhanced-section-header">
          <div class="header-title-container">
            <Icon icon="icon-park-solid:road-sign-both" class="header-icon" />
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
                  <span v-if="poi.subtext" class="poi-card-subtext">{{ poi.subtext }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Nearby Pubs Section -->
      <section v-if="walk.pubs_list?.length" :ref="el => setSectionRef(4, el)" class="section">
        <div class="enhanced-section-header">
          <div class="header-title-container">
            <Icon icon="fa-solid:sign" class="header-icon" />
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
                    <Icon :icon="pub.opening_hours.open_now
                      ? 'mdi:clock'
                      : 'mdi:clock-outline'
                      " class="pub-opening-hours-icon" :class="pub.opening_hours.open_now
                        ? 'text-primary'
                        : 'text-error'
                        " />
                    <span>{{ pub.opening_hours.open_now ? "Open Now" : "Closed" }}</span>
                  </div>
                </div>
                <Icon icon="mdi:open-in-new" class="pub-open-icon" />
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- Practical Information Section -->
      <section v-if="walk.footwear_category || parsedConsiderations.length > 0" :ref="el => setSectionRef(5, el)"
        class="section practical-info-section">
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
              <Icon icon="ph:boot-fill" class="info-card-icon" />
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
                  <span>{{ detailsOpen ? "Hide Details" : "Show Details" }}</span>
                  <Icon :icon="detailsOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="details-icon" />
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

      <!-- Additional Information Section -->
      <section v-if="hasExtraInfo" :ref="el => setSectionRef(6, el)" class="section">
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
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { useWalkData } from "../../composables/useWalkData";
import { useDrawerAnimations } from "../../composables/useDrawerAnimations";

const props = defineProps({
  walk: {
    type: Object,
    required: true
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'start-walk',
  'share',
  'save-walk',
  'directions',
  'category-selected',
  'recenter'
]);

// Component refs
const sectionRefs = ref([]);
const keyInfoRef = ref(null);
const amenitiesRef = ref(null);
const buttonsContainerRef = ref(null);
const footwearDetailsRef = ref(null);

// UI State
const detailsOpen = ref(false);
const hoveredCategory = ref(null);

// Helper function to set section refs
function setSectionRef(index, el) {
  if (!sectionRefs.value[index]) {
    sectionRefs.value[index] = el;
  }
}

// Use the walk data composable
const walkRef = computed(() => props.walk);
const {
  parsedPOIs,
  parsedHighlights,
  parsedConsiderations,
  dogConsiderations,
  nonDogConsiderations,
  dogCombinedText,
  groupedPOIs,
  totalFeaturesCount,
  walkExtra,
  hasExtraInfo,
  getCategoryIconByName,
  getCategoryClass,
  getCategoryIcon,
  formatValue,
  formatDistance,
  formatDuration,
  formatDifficulty,
  openInGoogleMaps
} = useWalkData(walkRef);

// Use the drawer animations composable
const {
  toggleDetailsAnimation,
  animateCategoryClick
} = useDrawerAnimations();

// Replace toggleFootwearDetails with the generic function
function toggleFootwearDetails(e) {
  const detail = e.target;
  detailsOpen.value = detail.open;
  toggleDetailsAnimation(e);
}

// Category interaction handlers
function handleCategoryMouseEnter(category) {
  hoveredCategory.value = category;
}

function handleCategoryMouseLeave() {
  hoveredCategory.value = null;
}

function isCategoryHovered(category) {
  return hoveredCategory.value && hoveredCategory.value.name === category.name;
}

async function handleCategoryClick(category) {
  await animateCategoryClick(category);
  emit('category-selected', category);
}

onMounted(() => {
  // Initialize with details closed
  detailsOpen.value = false;
});
</script>

<style scoped>
@import "../../../../static/css/walkdrawer.css";

.content {
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.content.mobile {
  padding: 0 16px;
}

/* Add new interactive styles for category chips */
.category-chip {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
  will-change: transform, box-shadow, filter;
  position: relative;
  overflow: hidden;
}

.category-chip::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.3));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.category-chip:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  filter: brightness(1.05);
}

.category-chip:hover::after {
  opacity: 1;
}

.category-chip:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.category-chip.is-hovered .category-icon {
  transform: rotate(10deg) scale(1.2);
}

.category-icon {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  background: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.action-button:active {
  transform: scale(0.95);
}
</style>