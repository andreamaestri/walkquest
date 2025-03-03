`<template>
  <BottomSheet v-model="isOpen" :max-height="'75vh'">
    <WalkList
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :is-compact="true"
      @walk-selected="handleWalkSelected"
    />
  </BottomSheet>
</template>

<script setup>
import { ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import WalkList from './WalkList.vue'

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['walk-selected'])
const isOpen = ref(true)

function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  isOpen.value = false
}
</script>`