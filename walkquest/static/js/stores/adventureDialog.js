import { defineStore } from 'pinia'
import { ref, nextTick, onUnmounted } from 'vue'

export const useAdventureDialogStore = defineStore('adventureDialog', () => {
  const isOpen = ref(false)
  const currentWalk = ref(null)
  let closeTimeout = null

  async function openDialog(walk) {
    try {
      // Clear any existing timeout to prevent race conditions
      if (closeTimeout) {
        clearTimeout(closeTimeout)
        closeTimeout = null
      }
      
      // Set walk first, then wait for next tick before showing dialog
      currentWalk.value = walk
      await nextTick()
      isOpen.value = true
    } catch (error) {
      console.error('Error opening adventure dialog:', error)
      // Reset state in case of error
      isOpen.value = false
    }
  }

  function closeDialog() {
    try {
      // Hide dialog first
      isOpen.value = false
      
      // Clear any existing timeout
      if (closeTimeout) {
        clearTimeout(closeTimeout)
      }
      
      // Clear walk after animation
      closeTimeout = setTimeout(() => {
        currentWalk.value = null
        closeTimeout = null
      }, 300) // Match the dialog's exit animation duration
    } catch (error) {
      console.error('Error closing adventure dialog:', error)
      // Reset state in case of error
      isOpen.value = false
      currentWalk.value = null
    }
  }

  // Clean up timeout when store is disposed
  onUnmounted(() => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
  })

  return {
    isOpen,
    currentWalk,
    openDialog,
    closeDialog
  }
})
