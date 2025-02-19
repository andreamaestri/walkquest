<template>
  <div class="m3-walk-route">
    <div v-if="loading" class="m3-loading-indicator">
      <div class="m3-spinner"></div>
      <span>Loading route...</span>
    </div>
    
    <div v-else-if="error" class="m3-error-state">
      <Icon icon="mdi:alert" class="text-[24px]" />
      <span>{{ error }}</span>
    </div>

    <div v-else-if="routeData" class="m3-route-container">
      <div class="m3-route-stats">
        <div class="m3-stat-item">
          <Icon icon="mdi:map-marker-distance" />
          <span>{{ routeData.distance.toFixed(1) }} km</span>
        </div>
        <div class="m3-stat-item">
          <Icon icon="mdi:clock-outline" />
          <span>{{ routeData.duration }} min</span>
        </div>
        <div class="m3-stat-item">
          <Icon icon="mdi:terrain" />
          <span>{{ routeData.elevation_gain }}m gain</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getGeometry } from '../services/api'

const props = defineProps({
  walkId: {
    type: [String, Number],
    required: true
  },
  walkTitle: {
    type: String,
    required: true
  },
  initialRouteData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['route-loaded'])

const loading = ref(!props.initialRouteData)
const error = ref(null)
const routeData = ref(props.initialRouteData)

// Load route data if not provided from server
onMounted(async () => {
  if (props.initialRouteData) {
    routeData.value = props.initialRouteData.properties
    emit('route-loaded', props.initialRouteData)
    return
  }

  try {
    loading.value = true
    const data = await getGeometry(props.walkId)
    
    if (!data || !data.geometry) {
      throw new Error('Invalid geometry data received')
    }

    routeData.value = data.properties
    emit('route-loaded', data)

  } catch (err) {
    error.value = err.message || 'Failed to load route data'
    console.error('Error loading route:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style>
.m3-walk-route {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.m3-route-stats {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
}

.m3-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--md-sys-color-on-surface));
}

.m3-loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.m3-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.m3-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: rgb(var(--md-sys-color-error));
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style> 