import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Which walk (or which existing log) the log dialog is open for. */
export const useAdventureDialogStore = defineStore('adventureDialog', () => {
  const isOpen = ref(false);
  const walk = ref(null);
  const entry = ref(null);

  function open(forWalk) {
    walk.value = forWalk;
    entry.value = null;
    isOpen.value = true;
  }

  function edit(logEntry) {
    walk.value = null;
    entry.value = logEntry;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  return { isOpen, walk, entry, open, edit, close };
});
