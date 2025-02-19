<template>
  <nav class="main-nav">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <router-link to="/" class="flex items-center space-x-2">
          <Icon icon="mdi:hiking" class="text-2xl text-primary-500"></Icon>
          <span class="font-semibold text-lg">WalkQuest</span>
        </router-link>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button 
            type="button" 
            @click="toggleMobileMenu"
            class="mobile-menu-button"
          >
            <Icon :icon="mobileMenuOpen ? 'mdi:close' : 'mdi:menu'" class="text-2xl"></Icon>
          </button>
          
          <!-- Mobile menu panel -->
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div 
              v-if="mobileMenuOpen"
              class="absolute top-16 left-0 right-0 bg-white shadow-lg p-4"
            >
              <slot></slot>
            </div>
          </Transition>
        </div>

        <!-- Desktop menu -->
        <div class="hidden md:flex md:items-center md:space-x-4">
          <slot></slot>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useUiStore } from '../stores/ui'

const uiStore = useUiStore()
const mobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  uiStore.setMobileMenuOpen(mobileMenuOpen.value)
}
</script>
