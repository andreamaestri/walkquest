<template>
  <Motion
    :initial="{ width: 0, opacity: 1 }"
    :enter="enterMotionConfig"
    :leave="leaveMotionConfig"
    class="fixed inset-y-0 right-0 bg-white flex flex-col z-10"
    style="overflow-x: hidden;"
  >
    <header class="sticky top-0 z-10 flex items-center px-4 py-4 bg-purple-600 text-white">
      <button class="mr-4 hover:opacity-80" @click="$emit('close')">
        <Icon icon="material-symbols:arrow-back-rounded" class="text-2xl" />
      </button>
      <h2 class="text-xl md:text-2xl font-semibold flex-1">{{ walk.title || walk.walk_name }}</h2>
    </header>

    <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <!-- Key Info -->
      <div class="flex gap-6">
        <div v-if="walk.distance" class="flex items-center gap-2 text-lg">
          <Icon icon="mdi:map-marker-distance" />
          <span>{{ walk.distance }} km</span>
        </div>
        <div v-if="walk.steepness" class="flex items-center gap-2 text-lg">
          <Icon icon="mdi:trending-up" class="text-xl" />
          <span>{{ walk.steepness }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-4">
        <button
          class="flex items-center gap-2 px-4 py-2 h-12 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Icon icon="mdi:navigation" class="w-6 h-6 text-xl" />
          <span class="text-sm font-medium">Get Directions</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 h-12 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Icon icon="mdi:play-circle" class="w-6 h-6 text-xl" />
          <span class="text-sm font-medium">Start Walk</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 h-12 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Icon icon="mdi:heart" class="w-6 h-6 text-xl" />
          <span class="text-sm font-medium">Save</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 h-12 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Icon icon="mdi:share" class="w-6 h-6 text-xl" />
          <span class="text-sm font-medium">Share</span>
        </button>
      </div>

      <!-- Description -->
      <section v-if="walk.description" class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800">About</h3>
        <p class="text-gray-600">{{ walk.description }}</p>
      </section>

      <!-- Highlights -->
      <section v-if="walk.highlights" class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800">Highlights</h3>
        <ul class="list-disc pl-6 space-y-2 text-gray-600">
          <li v-for="highlight in parsedHighlights" :key="highlight">
            {{ highlight }}
          </li>
        </ul>
      </section>

      <!-- Points of Interest -->
      <section v-if="walk.points_of_interest" class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800">Points of Interest</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="poi in parsedPOIs"
            :key="poi"
            class="inline-flex items-center h-6 px-2 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
          >
            {{ poi }}
          </span>
        </div>
      </section>

      <!-- Features & Categories -->
      <section v-if="walk.features?.length || walk.categories?.length" class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800">Trail Features</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="feature in walk.features"
            :key="feature.name"
            class="px-3 py-1.5 bg-gray-100 rounded-full text-sm"
          >
            {{ feature.name }}
          </span>
          <span
            v-for="category in walk.categories"
            :key="category.name"
            class="px-3 py-1.5 bg-gray-100 rounded-full text-sm"
          >
            {{ category.name }}
          </span>
        </div>
      </section>

      <!-- Practical Information -->
      <section class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800">Practical Information</h3>
        <div class="space-y-4">
          <div v-if="walk.footwear_category" class="space-y-1">
            <strong class="text-gray-700">Recommended Footwear:</strong>
            <p class="text-gray-600">{{ walk.footwear_category }}</p>
          </div>
          <div v-if="walk.trail_considerations" class="space-y-1">
            <strong class="text-gray-700">Trail Considerations:</strong>
            <ul class="list-disc pl-6 space-y-2 text-gray-600">
              <li v-for="consideration in parsedConsiderations" :key="consideration">
                {{ consideration }}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { defineProps } from 'vue'
import { createMotion, MD3_EASING, MD3_DURATION } from '../utils/motion'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  },
  enterMotion: {
    type: Object,
    default: () => ({
      duration: MD3_DURATION.short1,
      easing: MD3_EASING.fastOutSlowIn
    })
  },
  leaveMotion: {
    type: Object,
    default: () => ({
      duration: MD3_DURATION.short2,
      easing: MD3_EASING.emphasizedAccelerate
    })
  }
})

const enterMotionConfig = computed(() => createMotion(props.enterMotion))
const leaveMotionConfig = computed(() => createMotion(props.leaveMotion))

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
    .map(c => c.endsWith('.') ? c : c + '.')
})

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
</script>

<style scoped>
@import "tailwindcss";
</style>