<template>
  <div
    ref="sidebarRef"
    class="m3-navigation-rail"
    :class="[{ 'is-expanded': isExpanded }]"
  >
    <div class="m3-rail-header">
      <button class="m3-rail-item" @click="$emit('toggle-expanded')">
        <div class="m3-state-layer">
          <Icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
        </div>
      </button>

      <button class="m3-rail-fab" @click="$emit('fab-click')">
        <Icon icon="mdi:hiking" class="text-[36px]" />
        <span class="m3-rail-fab-text" v-if="isExpanded">WalkQuest</span>
      </button>
    </div>

    <nav class="m3-rail-items">
      <!-- ...existing navigation items code... -->
    </nav>
  </div>
</template>

<script setup>
defineProps({
  isExpanded: Boolean,
  selectedWalkId: [String, Number],
  expandedWalkIds: Array,
  availableWalks: Array,
  showRoutesDrawer: Boolean
})

defineEmits(['toggle-expanded', 'walk-selected', 'walk-expanded', 'fab-click'])
</script>
