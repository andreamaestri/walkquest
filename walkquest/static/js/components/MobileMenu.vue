<template>
  <div>
    <button
      :id="toggleId"
      @click="toggleMenu"
      :aria-expanded="isOpen"
      aria-controls="mobile-menu"
      class="mobile-menu-toggle"
    >
      <span class="sr-only">Toggle menu</span>
      <!-- Add your menu icon here -->
    </button>

    <div
      :id="menuId"
      :class="{ 'hidden': !isOpen }"
      :aria-hidden="!isOpen"
      :aria-expanded="isOpen"
      class="mobile-menu"
      @keydown.esc="closeMenu"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUiStore } from '../stores/ui'

const props = defineProps({
  menuId: {
    type: String,
    default: 'mobile-menu'
  },
  toggleId: {
    type: String,
    default: 'mobile-menu-toggle'
  }
})

const isOpen = ref(false)
const store = useUiStore()

const handleClickOutside = (e) => {
  const menu = document.getElementById(props.menuId)
  const toggle = document.getElementById(props.toggleId)
  
  if (isOpen.value && menu && toggle &&
      !menu.contains(e.target) &&
      !toggle.contains(e.target)) {
    closeMenu()
  }
}

const toggleMenu = () => {
  isOpen.value ? closeMenu() : openMenu()
}

const openMenu = () => {
  isOpen.value = true
  store.setMobileMenuOpen(true)
  document.body.style.overflow = 'hidden'
  
  nextTick(() => {
    const menu = document.getElementById(props.menuId)
    if (menu) {
      const firstFocusable = menu.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
  })
}

const closeMenu = () => {
  isOpen.value = false
  store.setMobileMenuOpen(false)
  document.body.style.overflow = ''
  
  nextTick(() => {
    const toggle = document.getElementById(props.toggleId)
    if (toggle) {
      toggle.focus()
    }
  })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineExpose({
  isOpen,
  toggleMenu,
  openMenu,
  closeMenu
})
</script>
