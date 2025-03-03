<template>
  <nav class="mobile-nav-bar">
    <button 
      class="nav-item"
      :class="{ active: activeTab === 'explore' }"
      @click="$emit('tab-change', 'explore')"
    >
      <Icon icon="mdi:compass" class="nav-icon" />
      <span>Explore</span>
    </button>
    <button 
      class="nav-item"
      :class="{ active: activeTab === 'nearby' }"
      @click="$emit('tab-change', 'nearby')"
    >
      <Icon icon="mdi:map-marker" class="nav-icon" />
      <span>Nearby</span>
    </button>
    <button 
      class="nav-item"
      :class="{ active: activeTab === 'walks' }"
      @click="openWalksDrawer"
    >
      <Icon icon="mdi:routes" class="nav-icon" />
      <span>Walks</span>
    </button>
    <button 
      class="nav-item"
      :class="{ active: activeTab === 'categories' }"
      @click="$emit('tab-change', 'categories')"
    >
      <Icon icon="mdi:tag-multiple" class="nav-icon" />
      <span>Categories</span>
    </button>
  </nav>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'explore'
  }
})

const emit = defineEmits(['tab-change', 'open-walks-drawer'])

function openWalksDrawer() {
  emit('open-walks-drawer')
  emit('tab-change', 'walks')
}
</script>

<style scoped>
.mobile-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: rgb(var(--md-sys-color-surface-container));
  padding: 8px 4px;
  border-top: 1px solid rgb(var(--md-sys-color-outline-variant));
  z-index: 100;
  height: 80px;
  box-sizing: border-box;
  /* MD3 elevation */
  box-shadow: 0 -1px 2px 0 rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0;
  flex: 1;
  min-width: 56px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 16px;
  transition: background-color 0.2s, color 0.2s;
}

.nav-item:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.05);
}

.nav-item:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.1);
}

.nav-item.active {
  color: rgb(var(--md-sys-color-primary));
  font-weight: 500;
}

.nav-icon {
  font-size: 24px;
  height: 24px;
  width: 24px;
}

.nav-item span {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.5px;
}
</style>