# Final WalkQuest Walk Card & Map Marker Sync Implementation Plan

## Overview
This document outlines the final implementation plan for synchronizing walk card and map marker interactions using the StoreLocator component from vue-mapbox-gl while maintaining compatibility with the existing WalkList.vue component.

## 1. StoreLocator Integration

### Configuration
```vue
<StoreLocator
  :items="walks"
  :access-token="mapboxToken"
  :mapbox-map="{
    mapStyle: 'mapbox://styles/mapbox/streets-v11',
    // WCAG-compliant map style settings
    cooperativeGestures: true,
    keyboard: true
  }"
  :classes="{
    root: 'flex h-full',
    region: {
      map: 'w-2/3 h-full',
      list: 'w-1/3 h-full'
    }
  }"
  @select-item="handleItemSelect"
  @map-created="handleMapCreated"
  @cluster-feature-click="handleFeatureClick">
  
  <!-- Custom List Implementation -->
  <template #list="{ filteredItems, selectedItem }">
    <WalkList
      :walks="filteredItems"
      :active-walk="selectedItem"
      @walk-selected="handleWalkSelect"
    />
  </template>

  <!-- Accessibility Features -->
  <template #before-map>
    <div class="sr-only">
      Interactive map showing walk locations. Use arrow keys to navigate between markers.
    </div>
  </template>

  <!-- Item Panel -->
  <template #panel="{ item, close }">
    <WalkDetails
      :walk="item"
      @close="close"
    />
  </template>
</StoreLocator>
```

### WCAG Compliance Features
1. Keyboard Navigation
   - Arrow keys for map navigation
   - Tab navigation for markers
   - Escape key to close popups
   - Enter key to select markers

2. Screen Reader Support
   - ARIA labels for markers
   - Role definitions for interactive elements
   - Status announcements for map changes
   - Clear focus management

3. Visual Accessibility
   - High contrast marker colors
   - Clear focus indicators
   - Readable popup text
   - Sufficient color contrast

## 2. Component Integration

### WalkInterface.vue Updates
```vue
<script setup>
import { StoreLocator } from '@studiometa/vue-mapbox-gl'
import WalkList from './WalkList.vue'
import WalkDetails from './WalkDetails.vue'
import { useWalksStore } from '@/stores/walks'
import { useUiStore } from '@/stores/ui'

const walksStore = useWalksStore()
const uiStore = useUiStore()

// Transform walks data for StoreLocator
const walks = computed(() => 
  walksStore.walks.map(walk => ({
    id: walk.id,
    lat: walk.latitude,
    lng: walk.longitude,
    ...walk // Include all other walk properties
  }))
)

// Event Handlers
const handleItemSelect = (item) => {
  walksStore.setActiveWalk(item.id)
}

const handleMapCreated = (map) => {
  // Add keyboard event listeners for accessibility
  map.getCanvas().setAttribute('tabindex', '0')
  map.getCanvas().addEventListener('keydown', handleMapKeyboard)
}

const handleMapKeyboard = (e) => {
  // Implement keyboard navigation
  switch(e.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowDown':
      // Pan map in arrow direction
      break
    case 'Enter':
      // Select focused marker
      break
    case 'Escape':
      // Close active popup
      break
  }
}
</script>
```

### WalkList.vue Integration
```vue
<template>
  <RecycleScroller
    ref="scroller"
    class="h-full"
    :items="walks"
    :item-size="200"
    key-field="id"
    v-slot="{ item }">
    <WalkCard
      :walk="item"
      :is-active="isActiveWalk(item)"
      :aria-selected="isActiveWalk(item)"
      tabindex="0"
      role="option"
      @click="$emit('walk-selected', item)"
      @keydown.enter="$emit('walk-selected', item)"
    />
  </RecycleScroller>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import WalkCard from './WalkCard.vue'

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  activeWalk: {
    type: Object,
    default: null
  }
})

const isActiveWalk = (walk) => 
  props.activeWalk?.id === walk.id

defineEmits(['walk-selected'])
</script>
```

## 3. Accessibility Implementation

### Keyboard Navigation Map
```javascript
const KEYBOARD_OFFSET = 50 // pixels to pan per key press

const mapKeyboardControls = {
  ArrowRight: (map) => map.panBy([KEYBOARD_OFFSET, 0]),
  ArrowLeft: (map) => map.panBy([-KEYBOARD_OFFSET, 0]),
  ArrowUp: (map) => map.panBy([0, -KEYBOARD_OFFSET]),
  ArrowDown: (map) => map.panBy([0, KEYBOARD_OFFSET]),
  '+': (map) => map.zoomIn(),
  '-': (map) => map.zoomOut(),
  Home: (map) => map.flyTo({ center: defaultCenter, zoom: defaultZoom }),
  Escape: () => closeActivePopup()
}
```

### ARIA Labels Template
```vue
<template>
  <div 
    role="complementary"
    aria-label="Interactive map of walk locations">
    <div 
      role="region" 
      aria-label="Map controls"
      class="map-controls">
      <!-- Map controls here -->
    </div>
    
    <!-- Markers with ARIA labels -->
    <MapboxMarker
      v-for="walk in walks"
      :key="walk.id"
      :lng-lat="[walk.longitude, walk.latitude]"
      :aria-label="`${walk.title}, ${walk.difficulty} difficulty, ${walk.duration} duration`"
      tabindex="0"
      role="button">
    </MapboxMarker>
  </div>
</template>
```

## 4. Implementation Steps

1. **Initial Setup**
   - Install vue-mapbox-gl dependencies
   - Configure StoreLocator component
   - Set up WCAG compliance features

2. **Component Integration**
   - Integrate WalkList with StoreLocator
   - Implement keyboard navigation
   - Add ARIA labels and roles

3. **Testing**
   - Verify accessibility compliance
   - Test keyboard navigation
   - Validate screen reader compatibility
   - Check marker interactions

4. **Documentation**
   - Update accessibility documentation
   - Document keyboard shortcuts
   - Add ARIA implementation notes

## 5. Testing Requirements

1. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation
   - Focus management
   - ARIA label correctness

2. **Integration Testing**
   - StoreLocator functionality
   - WalkList integration
   - Map-list synchronization
   - Event handling

3. **Performance Testing**
   - Virtual list scrolling
   - Map marker rendering
   - Clustering behavior

## 6. Success Criteria

1. **Accessibility**
   - WCAG 2.1 AA compliance
   - Fully keyboard navigable
   - Screen reader friendly
   - Clear focus indicators

2. **Functionality**
   - Smooth map-list synchronization
   - Accurate marker placement
   - Proper event handling
   - Responsive interactions

3. **Performance**
   - Efficient virtual scrolling
   - Optimized marker rendering
   - Smooth animations
   - Minimal layout shifts

This implementation plan prioritizes accessibility while leveraging the StoreLocator component for efficient map-list synchronization, maintaining compatibility with the existing WalkList.vue component.