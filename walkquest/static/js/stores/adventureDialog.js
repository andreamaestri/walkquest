import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdventureDialogStore = defineStore('adventureDialog', () => {
  const isOpen = ref(false)
  const currentWalk = ref(null)

  function openDialog(walk) {
    currentWalk.value = walk
    isOpen.value = true
  }

  function closeDialog() {
    currentWalk.value = null
    isOpen.value = false
  }

  return {
    isOpen,
    currentWalk,
    openDialog,
    closeDialog
  }
})
