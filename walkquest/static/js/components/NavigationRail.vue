<template>
  <nav 
    class="m3-navigation-rail" 
    :class="{ 'is-expanded': isExpanded }"
    role="navigation"
    aria-label="Main navigation"
  >
    <button 
      class="m3-rail-item menu-button"
      @click="toggleExpanded"
      aria-label="Toggle navigation menu"
      :aria-expanded="isExpanded"
    >
      <div class="m3-state-layer">
        <div class="m3-rail-content">
          <div class="m3-rail-icon-container">
            <Icon 
              :icon="isExpanded ? 'material-symbols:menu-open' : 'material-symbols:menu'" 
              class="m3-rail-icon"
              width="24"
              height="24"
            />
          </div>
        </div>
      </div>
    </button>

    <div class="rail-items">
      <button
        v-for="item in navigationItems"
        :key="item.id"
        class="m3-rail-item"
        :class="{ 'is-active': currentRoute === item.route }"
        @click="handleNavigation(item)"
        :aria-label="item.label"
        :aria-current="currentRoute === item.route ? 'page' : undefined"
      >
        <div class="m3-state-layer">
          <div class="m3-rail-content">
            <div class="m3-rail-icon-container">
              <Icon 
                :icon="item.icon" 
                class="m3-rail-icon"
                width="24"
                height="24"
              />
            </div>
            <span class="m3-rail-label">{{ item.label }}</span>
          </div>
        </div>
      </button>
    </div>

    <button 
      class="m3-rail-fab"
      @click="handleCreateWalk"
      aria-label="Create new walk"
    >
      <Icon icon="material-symbols:add" width="24" height="24" />
      <span class="m3-rail-fab-text">Create Walk</span>
    </button>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSearchStore } from '../stores/searchStore'

const router = useRouter()
const route = useRoute()
const searchStore = useSearchStore()
const isExpanded = ref(false)

const navigationItems = [
  {
    id: 'explore',
    label: 'Explore',
    icon: 'material-symbols:explore',
    route: '/'
  },
  {
    id: 'nearby',
    label: 'Find Nearby',
    icon: 'material-symbols:location-on',
    route: '/nearby'
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: 'material-symbols:bookmark',
    route: '/saved'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'material-symbols:person',
    route: '/profile'
  }
]

const currentRoute = computed(() => route.path)

const handleNavigation = (item) => {
  if (currentRoute.value !== item.route) {
    if (item.id === 'explore') {
      searchStore.setSearchMode('walks')
      searchStore.clearSearch()
    } else if (item.id === 'nearby') {
      searchStore.setSearchMode('locations')
    }
    router.push(item.route)
  }
}

const handleCreateWalk = () => {
  router.push('/create')
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.m3-navigation-rail {
  width: 80px;
  height: 100%;
  background: rgb(var(--md-sys-color-surface));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  border-right: 1px solid rgb(var(--md-sys-color-outline-variant));
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
  transform: translateZ(0);
  backface-visibility: hidden;
  position: relative;
  z-index: 10;
}

.m3-navigation-rail.is-expanded {
  width: 280px;
}

.rail-items {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 12px;
  margin: 16px 0;
  gap: 4px;
}

/* Add a subtle hover effect for the entire rail */
.m3-navigation-rail:hover {
  box-shadow: var(--md-sys-elevation-1);
}
</style> 