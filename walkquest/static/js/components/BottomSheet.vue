<template>
  <div v-if="modelValue || alwaysRender" class="bottom-sheet" @click.self="handleOverlayClick" :class="{ 'bottom-sheet--hidden': !modelValue }">
    <div 
      ref="bottomSheetRef"
      class="bottom-sheet__container" 
      :class="snapClass"
    >
      <div class="bottom-sheet__drag-handle">
        <div class="bottom-sheet__handle"></div>
      </div>
      
      <!-- Optional Header Slot -->
      <div v-if="$slots.header" class="bottom-sheet__header">
        <slot name="header"></slot>
      </div>
      
      <!-- Content -->
      <div class="bottom-sheet__content" ref="contentRef">
        <slot></slot>
      </div>
      
      <!-- Optional Footer Slot -->
      <div v-if="$slots.footer" class="bottom-sheet__footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// Props definition
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 300 // MD3 standard duration
  },
  snapPoints: {
    type: Array,
    default: () => []
  },
  defaultSnapPoint: {
    type: Number,
    default: null
  },
  blocking: {
    type: Boolean,
    default: true
  },
  canSwipeClose: {
    type: Boolean,
    default: true
  },
  canOverlayClose: {
    type: Boolean,
    default: true
  },
  expandOnContentDrag: {
    type: Boolean,
    default: true
  },
  alwaysRender: {
    type: Boolean,
    default: false
  },
  elevation: {
    type: [String, Number],
    default: "1",
    validator: (value) => ["0", "1", "2", "3", "4", "5", 0, 1, 2, 3, 4, 5].includes(value)
  },
  scrimColor: {
    type: String,
    default: "rgba(0, 0, 0, 0.32)" // MD3 standard scrim opacity
  }
})

// Emits
const emit = defineEmits([
  'update:modelValue', 
  'min-height', 
  'max-height',
  'dragging-up',
  'dragging-down',
  'opened',
  'closed'
])

// Refs
const bottomSheetRef = ref(null)
const contentRef = ref(null)
const currentSnapPoint = ref(null)
const snapClass = computed(() => {
  return {
    'bottom-sheet__container--active': props.modelValue,
    'bottom-sheet--blocking': props.blocking,
    [`bottom-sheet__container--elevation-${props.elevation}`]: true
  }
})


// Sheet state
let startY = 0
let currentY = 0
let initialHeight = 0
let lastDirection = null
let animationFrame = null
let initialRendered = false
let lastTouchTime = 0
let lastTouchY = 0
let velocity = 0

// CSS Styles setup
onMounted(() => {
  setupBottomSheet()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  cleanup()
})

// Setup methods
function setupBottomSheet() {
  if (!bottomSheetRef.value) return
  
  // Attach drag event listeners to the drag handle
  const dragHandle = bottomSheetRef.value.querySelector('.bottom-sheet__drag-handle')
  if (dragHandle) {
    dragHandle.addEventListener('touchstart', handleTouchStart, { passive: false })
    dragHandle.addEventListener('mousedown', handleMouseDown)
  }
  
  // If enabled, attach drag events to content for expansion
  if (props.expandOnContentDrag && contentRef.value) {
    contentRef.value.addEventListener('touchstart', handleContentTouchStart, { passive: true })
  }
  
  // Calculate and emit min height
  nextTick(() => {
    calculateMinHeight()
    calculateMaxHeight()
  })
}

function cleanup() {
  if (!bottomSheetRef.value) return
  
  // Clean up all event listeners
  const dragHandle = bottomSheetRef.value.querySelector('.bottom-sheet__drag-handle')
  if (dragHandle) {
    dragHandle.removeEventListener('touchstart', handleTouchStart)
    dragHandle.removeEventListener('mousedown', handleMouseDown)
  }
  
  if (contentRef.value) {
    contentRef.value.removeEventListener('touchstart', handleContentTouchStart)
  }
  
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  cancelAnimationFrame(animationFrame)
}

// Dimension calculation
function calculateMinHeight() {
  if (!bottomSheetRef.value) return
  
  const { height } = bottomSheetRef.value.getBoundingClientRect()
  emit('min-height', height)
  initialHeight = height
  
  if (!initialRendered) {
    // If snapPoints exist and defaultSnapPoint is specified, snap to it
    if (props.snapPoints.length && props.defaultSnapPoint !== null) {
      snapToPoint(props.defaultSnapPoint)
    }
    initialRendered = true
  }
}

function calculateMaxHeight() {
  emit('max-height', window.innerHeight)
}

function handleResize() {
  calculateMinHeight()
  calculateMaxHeight()
}

// Event handlers
function handleTouchStart(e) {
  if (!props.modelValue) return
  startDrag(e.touches[0].clientY)
  
  lastTouchTime = Date.now()
  lastTouchY = e.touches[0].clientY
  velocity = 0
  
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
  
  e.preventDefault() // Prevent default to avoid scrolling
}

function handleMouseDown(e) {
  if (!props.modelValue) return
  startDrag(e.clientY)
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  e.preventDefault() // Prevent default behaviors
}

function handleContentTouchStart(e) {
  // Only allow upward drags from content to expand the sheet
  const touch = e.touches[0]
  const startY = touch.clientY
  
  const initialScrollTop = contentRef.value.scrollTop
  if (initialScrollTop <= 0) {
    // Allow dragging only when already at the top of the content
    let hasMoved = false
    
    const contentTouchMove = (moveEvent) => {
      const currentY = moveEvent.touches[0].clientY
      if (currentY < startY) {
        // Dragging upward from top of content
        if (!hasMoved) {
          hasMoved = true
          handleTouchStart(moveEvent)
        }
      }
    }
    
    const contentTouchEnd = () => {
      contentRef.value.removeEventListener('touchmove', contentTouchMove)
      contentRef.value.removeEventListener('touchend', contentTouchEnd)
    }
    
    contentRef.value.addEventListener('touchmove', contentTouchMove, { passive: true })
    contentRef.value.addEventListener('touchend', contentTouchEnd)
  }
}

function handleTouchMove(e) {
  e.preventDefault() // Prevent scrolling while dragging
  const currentClientY = e.touches[0].clientY
  
  // Calculate velocity
  const now = Date.now()
  const elapsed = now - lastTouchTime
  if (elapsed > 0) {
    velocity = (currentClientY - lastTouchY) / elapsed
    lastTouchTime = now
    lastTouchY = currentClientY
  }
  
  dragMove(currentClientY)
}

function handleMouseMove(e) {
  dragMove(e.clientY)
}

function handleTouchEnd() {
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  endDrag()
}

function handleMouseUp() {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  endDrag()
}

function handleOverlayClick() {
  if (props.canOverlayClose) {
    close()
  }
}

// Drag logic
function startDrag(clientY) {
  if (!bottomSheetRef.value) return
  
  startY = clientY
  currentY = clientY
  initialHeight = bottomSheetRef.value.getBoundingClientRect().height
}

function dragMove(clientY) {
  if (!bottomSheetRef.value) return
  
  currentY = clientY
  const deltaY = currentY - startY
  
  if (deltaY < 0) {
    // Moving up
    if (lastDirection !== 'up') {
      emit('dragging-up')
      lastDirection = 'up'
    }
  } else if (deltaY > 0) {
    // Moving down
    if (lastDirection !== 'down') {
      emit('dragging-down')
      lastDirection = 'down'
    }
  }
  
  // Calculate new height
  let newHeight = initialHeight - deltaY
  
  // Limit how small the sheet can get
  newHeight = Math.max(100, newHeight)
  
  // Apply new height with transform for better performance
  animationFrame = requestAnimationFrame(() => {
    if (bottomSheetRef.value) {
      bottomSheetRef.value.style.height = `${newHeight}px`
    }
  })
}

function endDrag() {
  cancelAnimationFrame(animationFrame)
  const deltaY = currentY - startY
  
  // Determine if sheet should close (swiped down significantly or with velocity)
  if (props.canSwipeClose && (deltaY > 100 || velocity > 0.5)) {
    close()
    return
  }
  
  // Find closest snap point if any are defined
  if (props.snapPoints.length > 0) {
    const currentHeight = bottomSheetRef.value.getBoundingClientRect().height
    let closestSnapPoint = findClosestSnapPoint(currentHeight)
    
    // Apply velocity bias (if moving quickly, favor the next point in that direction)
    if (Math.abs(velocity) > 0.4) {
      const direction = velocity < 0 ? 1 : -1 // negative velocity is upward
      const currentIndex = props.snapPoints.indexOf(closestSnapPoint)
      const targetIndex = Math.max(0, Math.min(props.snapPoints.length - 1, currentIndex + direction))
      closestSnapPoint = props.snapPoints[targetIndex]
    }
    
    // Snap to the closest point
    snapToPoint(closestSnapPoint)
  }
}

function findClosestSnapPoint(currentHeight) {
  if (!props.snapPoints.length) return null
  
  let closestPoint = props.snapPoints[0]
  let minDistance = Math.abs(currentHeight - props.snapPoints[0])
  
  for (let i = 1; i < props.snapPoints.length; i++) {
    const distance = Math.abs(currentHeight - props.snapPoints[i])
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = props.snapPoints[i]
    }
  }
  
  return closestPoint
}

// Public API methods
function open() {
  emit('update:modelValue', true)
}

function close() {
  emit('update:modelValue', false)
}

function snapToPoint(point) {
  if (!bottomSheetRef.value || !props.snapPoints.includes(point)) return
  
  const index = props.snapPoints.indexOf(point)
  currentSnapPoint.value = index
  
  bottomSheetRef.value.style.height = `${point}px`
}

// Watch for modelValue changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    emit('opened')
  } else {
    emit('closed')
  }
}, { immediate: true })

// Expose methods
defineExpose({
  open,
  close,
  snapToPoint
})
</script>

<style>
.bottom-sheet {
  position: fixed;
  z-index: 1000;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  will-change: opacity;
  transition: background-color var(--vsbs-transition-duration, 300ms) cubic-bezier(0.2, 0, 0, 1);
}

.bottom-sheet--hidden {
  visibility: hidden;
  pointer-events: none;
  background-color: transparent;
}

.bottom-sheet__container {
  width: 100%;
  max-width: var(--vsbs-max-width, 640px);
  background: var(--vsbs-background, rgb(var(--md-sys-color-surface, 255, 255, 255)));
  border-top-left-radius: var(--vsbs-border-radius, 28px);
  border-top-right-radius: var(--vsbs-border-radius, 28px);
  display: flex;
  flex-direction: column;
  touch-action: pan-x;
  transform: translateY(100%);
  max-height: 90vh;
  height: auto;
  overflow: hidden;
  position: relative;
  will-change: transform, height;
  transition: box-shadow var(--vsbs-transition-duration, 300ms) cubic-bezier(0.2, 0, 0, 1);
}

/* Material Design 3 elevation levels */
.bottom-sheet__container--elevation-0 {
  box-shadow: none;
}

.bottom-sheet__container--elevation-1 {
  box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.15), 
              0px 1px 2px 0px rgba(0, 0, 0, 0.3);
}

.bottom-sheet__container--elevation-2 {
  box-shadow: 0px 2px 6px 2px rgba(0, 0, 0, 0.15), 
              0px 1px 2px 0px rgba(0, 0, 0, 0.3);
}

.bottom-sheet__container--elevation-3 {
  box-shadow: 0px 4px 8px 3px rgba(0, 0, 0, 0.15), 
              0px 1px 3px 0px rgba(0, 0, 0, 0.3);
}

.bottom-sheet__container--elevation-4 {
  box-shadow: 0px 6px 10px 4px rgba(0, 0, 0, 0.15), 
              0px 2px 3px 0px rgba(0, 0, 0, 0.3);
}

.bottom-sheet__container--elevation-5 {
  box-shadow: 0px 8px 12px 6px rgba(0, 0, 0, 0.15), 
              0px 4px 4px 0px rgba(0, 0, 0, 0.3);
}

.bottom-sheet__container--active {
  transform: translateY(0);
  transition: transform var(--vsbs-transition-duration, 300ms) var(--vsbs-transition-timing, cubic-bezier(0.2, 0, 0, 1));
}

.bottom-sheet__drag-handle {
  padding: 12px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  -webkit-tap-highlight-color: transparent;
}

.bottom-sheet__handle {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--vsbs-handle-background, rgba(var(--md-sys-color-on-surface-variant, 0, 0, 0), 0.4));
  transition: background-color 0.2s ease;
}

.bottom-sheet__drag-handle:hover .bottom-sheet__handle {
  background: rgba(var(--md-sys-color-on-surface-variant, 0, 0, 0), 0.6);
}

.bottom-sheet__drag-handle:active .bottom-sheet__handle {
  background: rgba(var(--md-sys-color-on-surface-variant, 0, 0, 0), 0.8);
}

.bottom-sheet__header {
  width: 100%;
  overflow: visible;
  white-space: normal;
  position: relative;
  z-index: 2;
}

.bottom-sheet__footer {
  padding: 16px var(--vsbs-padding-x, 24px);
  border-top: 1px solid var(--vsbs-border-color, rgba(var(--md-sys-color-outline-variant, 121, 116, 126), 0.12));
}

.bottom-sheet__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  max-height: calc(90vh - 80px); /* Allow content to scroll within */
  scroll-behavior: smooth;
}

/* Safe area insets for mobile */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  
  .bottom-sheet__footer {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
}

/* Prevent body scrolling when sheet is open */
.bottom-sheet--blocking {
  position: fixed;
}
</style>