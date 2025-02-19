<template>
  <MapboxLayer
    id="route-layer"
    type="line"
    source="route-source"
    :paint="{
      'line-color': color,
      'line-width': width,
      'line-opacity': opacity,
      'line-blur': blur
    }"
    :layout="{
      'line-cap': 'round',
      'line-join': 'round'
    }"
  />
</template>

<script setup>
import { computed } from 'vue'
import { MapboxLayer } from '@studiometa/vue-mapbox-gl'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  routeData: {
    type: Object,
    default: null
  },
  color: {
    type: String,
    default: '#6750A4'
  },
  width: {
    type: Number,
    default: 6
  },
  opacity: {
    type: Number,
    default: 0.9
  },
  blur: {
    type: Number,
    default: 0.5
  }
})

// Default test route data
const defaultData = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [
      [-4.7853, 50.3437], // Polperro
      [-4.7892, 50.3468],
      [-4.7925, 50.3512],
      [-4.7958, 50.3545], // Coastal path point
      [-4.7899, 50.3589],
      [-4.7853, 50.3612], // Lansallos
    ]
  }
}
</script>