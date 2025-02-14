<template>
  <div class="walk-list-container" :class="{ 'is-compact': isCompact }">
    <div v-if="error" class="m3-error-message">
      {{ error }}
    </div>
    <DynamicScroller
      v-else
      ref="scroller"
      class="scroller"
      :items="walks"
      :min-item-size="isCompact ? 56 : 180"
      key-field="id"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :data-index="index"
          :size-dependencies="[
            item.walk_name,
            item.related_categories?.length,
            item.highlights,
            isCompact,
            selectedWalkId === item.id
          ]"
          :watch-size="true"
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
    </DynamicScroller>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import WalkCard from './WalkCard.vue'

const props = defineProps({
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

const emit = defineEmits(['walk-selected', 'walk-expanded'])
const scroller = ref(null)

const handleWalkSelection = (walk) => {
  emit('walk-selected', walk)
}

const handleUpdate = ({ continuous }) => {
  if (!continuous && scroller.value?.updateSize) {
    scroller.value.updateSize()
  }
}
</script>

<style>
.walk-list-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  contain: content;
  padding: 8px 4px;
}

.walk-list-container.is-compact {
  width: 80px;
}

.scroller {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  overflow-y: auto;
  contain: content;
}

.vue-recycle-scroller {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  contain: content;
}

.vue-recycle-scroller__item-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%; 
}

.vue-recycle-scroller__item-view {
  width: 100%;
  display: flex;
  justify-content: center; /* Center the wrapper */
  padding: 0;
  margin: 0;
}

/* Hide scrollbar on compact mode */
.walk-list-container.is-compact .scroller::-webkit-scrollbar {
  display: none;
}

/* Scrollbar styling */
.scroller::-webkit-scrollbar {
  width: 4px;
}

.scroller::-webkit-scrollbar-track {
  background: transparent;
}

.scroller::-webkit-scrollbar-thumb {
  background: rgb(var(--md-sys-color-outline-variant) / 0.5);
  border-radius: 2px;
}

.scroller::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--md-sys-color-outline));
}

/* Error message styling */
.m3-error-message {
  color: rgb(var(--md-sys-color-error));
  padding: 16px;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  background: rgb(var(--md-sys-color-error-container) / 0.12);
  margin: 8px;
  border-radius: 12px;
}

.walk-card-wrapper {
  width: 380px; /* Fixed width for all cards */
  margin: 0 auto; /* Center the cards */
  padding: 4px 0; /* Remove horizontal padding */
  box-sizing: border-box;
}
</style>