`<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="modelValue" class="m3-bottom-sheet" @click.self="close">
      <div class="m3-bottom-sheet__content" :style="contentStyle" ref="sheetContent">
        <div class="m3-bottom-sheet__handle" @touchstart="startDrag" @mousedown="startDrag"></div>
        <div class="m3-bottom-sheet__body">
          <slot></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { animate } from 'motion'

const props = defineProps({
  modelValue: Boolean,
  maxHeight: {
    type: String,
    default: '75vh'
  }
})

const emit = defineEmits(['update:modelValue'])

const sheetContent = ref(null)
const dragStartY = ref(0)
const currentTranslateY = ref(0)

const contentStyle = computed(() => ({
  maxHeight: props.maxHeight,
  transform: `translateY(${currentTranslateY.value}px)`
}))

function close() {
  emit('update:modelValue', false)
}

async function onEnter(el, onComplete) {
  const content = el.querySelector('.m3-bottom-sheet__content')
  await Promise.all([
    animate(el, { opacity: [0, 1] }, { duration: 0.3 }).finished,
    animate(content, 
      { transform: ['translateY(100%)', 'translateY(0%)'] },
      { duration: 0.4, easing: [0.2, 0, 0, 1] }
    ).finished
  ])
  onComplete()
}

async function onLeave(el, onComplete) {
  const content = el.querySelector('.m3-bottom-sheet__content')
  await Promise.all([
    animate(el, { opacity: [1, 0] }, { duration: 0.2 }).finished,
    animate(content,
      { transform: ['translateY(0%)', 'translateY(100%)'] },
      { duration: 0.3, easing: [0.4, 0, 1, 1] }
    ).finished
  ])
  onComplete()
}

function startDrag(event) {
  event.preventDefault()
  dragStartY.value = event.touches ? event.touches[0].clientY : event.clientY
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchend', endDrag)
}

function handleDrag(event) {
  const currentY = event.touches ? event.touches[0].clientY : event.clientY
  const delta = currentY - dragStartY.value
  
  if (delta > 0) { // Only allow dragging down
    currentTranslateY.value = delta
  }
}

function endDrag() {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchend', endDrag)
  
  if (currentTranslateY.value > 150) { // Threshold to close
    close()
  } else {
    // Snap back
    animate(
      sheetContent.value,
      { transform: 'translateY(0)' },
      { duration: 0.2, easing: [0.4, 0, 0.2, 1] }
    )
  }
  
  currentTranslateY.value = 0
}
</script>

