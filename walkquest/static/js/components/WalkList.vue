<template>
  <div class="walk-list-container" :class="{ 'is-compact': isCompact }" ref="listContainer">
    <SearchView
      v-model="searchQuery"
      placeholder="Search walks..."
    >
      <template #meta>
        <div class="filter-status" role="status" aria-live="polite">
          <span class="result-count">
            {{ filteredWalks.length }} {{ filteredWalks.length === 1 ? 'walk' : 'walks' }} found
          </span>
        </div>
      </template>
    </SearchView>

    <div v-if="error" class="m3-error-message" role="alert">
      {{ error }}
    </div>

    <DynamicScroller
      v-else
      ref="scroller"
      class="scroller"
      :items="filteredWalks"
      :min-item-size="isCompact ? 56 : 180"
      key-field="id"
      :buffer="500"
      :emit-update="true"
      @update="handleScrollerUpdate"
      role="list"
      aria-label="List of walks"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :data-index="index"
          :size-dependencies="[
            item.walk_name,
            item.location,
            item.description,
            item.related_categories?.length,
            isCompact,
            selectedWalkId === item.id,
            searchQuery
          ]"
          :watch-data="false"
          :emit-resize="true"
          @resize="handleScrollerUpdate"
          role="listitem"
        >
          <div class="walk-card-wrapper">
            <WalkCard
              :walk="item"
              :is-compact="isCompact"
              :is-selected="selectedWalkId === item.id"
              :is-expanded="expandedWalkIds.includes(item.id)"
              @walk-selected="handleWalkSelection"
              @walk-expanded="$emit('walk-expanded', { walkId: item.id, expanded: !expandedWalkIds.includes(item.id) })"
            />
          </div>
        </DynamicScrollerItem>
      </template>
      
      <template #empty>
        <div class="p-4 text-center text-on-surface-variant" role="status">
          No walks found matching your search
        </div>
      </template>
    </DynamicScroller>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, toRef, nextTick } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { useMap } from '../composables/useMap'
import WalkCard from './WalkCard.vue'
import { useDebounceFn } from '@vueuse/core'
import SearchView from './SearchView.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  walks: {
    type: Array,
    required: true,
  },
  error: {
    type: String,
    default: null,
  },
  selectedWalkId: {
    type: [String, Number],
    default: null,
  },
  expandedWalkIds: {
    type: Array,
    default: () => [],
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'walk-selected', 'walk-expanded', 'filtered-walks'])

const scroller = ref(null)

// Use toRef for v-model binding
const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { flyToLocation } = useMap()

const updateScrollerDebounced = useDebounceFn(() => {
  if (scroller.value?.updateSize) {
    nextTick(async () => {
      await scroller.value.updateSize()
    })
  }
}, 100)

const handleScrollerUpdate = () => {
  if (scroller.value?.updateSize) {
    nextTick(async () => {
      await scroller.value.updateSize()
    })
  }
}

// Update filtered walks to handle both field name variations
const filteredWalks = computed(() => {
  if (!searchQuery.value?.trim()) return props.walks;
  
  const query = searchQuery.value.toLowerCase().trim();
  return props.walks.filter(walk => {
    const searchableText = [
      walk.walk_name || walk.title, // Handle both field names
      walk.location,
      walk.description,
      ...(walk.related_categories || []).map(cat => cat.name)
    ].filter(Boolean).join(' ').toLowerCase();
    
    return searchableText.includes(query);
  });
})

// Watch for changes in search query to emit updates
watch(searchQuery, (newQuery) => {
  emit('update:modelValue', newQuery);
});

// Watch filtered results to emit updates
watch(filteredWalks, (newResults) => {
  emit('filtered-walks', newResults);
});

watch(filteredWalks, () => {
  nextTick(() => {
    handleScrollerUpdate()
  })
})

const handleWalkSelection = async (walk) => {
  if (walk?.latitude && walk?.longitude) {
    await flyToLocation({
      center: [walk.longitude, walk.latitude],
      zoom: 14,
      pitch: 45
    })
  }
  emit('walk-selected', walk)
}

const clearFilters = () => {
  searchQuery.value = ''
  handleScrollerUpdate()
}

</script>

<style scoped>
.walk-list-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scroller {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.filter-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.result-count {
  font-weight: 500;
}

.clear-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  border: none;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters:hover {
  background: rgb(var(--md-sys-color-surface-container-highest) / 0.8);
}

.search-container {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--md-sys-color-surface));
  width: 100%;
  padding: 1rem;
}
</style>