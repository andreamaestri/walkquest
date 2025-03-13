<template>
  <Teleport to="#portal-root">
    <Transition name="slide-up">
      <div v-if="isVisible" class="md3-time-picker-modal" @click.self="handleClose">
        <div class="md3-time-picker-container" ref="timePickerRef">
          <div class="md3-time-picker-header">
            <h3>{{ props.type === 'start' ? 'Start Time' : 'End Time' }}</h3>
            <button type="button" class="md3-close-button" @click="handleClose">
              <Icon icon="mdi:close" />
            </button>
          </div>
          
          <div class="md3-time-picker-body">
            <div class="md3-time-picker-display">
              {{ formatTimeForDisplay(tempTimeValue || selectedTime || '12:00') }}
            </div>
            
            <div class="md3-time-picker-controls">
              <div class="md3-time-unit-picker">
                <button class="md3-time-unit-button" @click="adjustHour(1)">
                  <Icon icon="mdi:chevron-up" />
                </button>
                <div class="md3-time-unit">{{ selectedHour }}</div>
                <button class="md3-time-unit-button" @click="adjustHour(-1)">
                  <Icon icon="mdi:chevron-down" />
                </button>
              </div>
              
              <div class="md3-time-separator">:</div>
              
              <div class="md3-time-unit-picker">
                <button class="md3-time-unit-button" @click="adjustMinute(5)">
                  <Icon icon="mdi:chevron-up" />
                </button>
                <div class="md3-time-unit">{{ selectedMinute }}</div>
                <button class="md3-time-unit-button" @click="adjustMinute(-5)">
                  <Icon icon="mdi:chevron-down" />
                </button>
              </div>
              
              <div class="md3-time-unit-picker md3-period-picker">
                <button 
                  class="md3-period-button" 
                  :class="{ 'active': selectedPeriod === 'AM' }" 
                  @click="selectedPeriod = 'AM'"
                >AM</button>
                <button 
                  class="md3-period-button" 
                  :class="{ 'active': selectedPeriod === 'PM' }" 
                  @click="selectedPeriod = 'PM'"
                >PM</button>
              </div>
            </div>
          </div>
          
          <div class="md3-time-picker-actions">
            <button type="button" class="md3-button md3-text-button" @click="handleClose">
              Cancel
            </button>
            <button type="button" class="md3-button md3-filled-button" @click="confirmSelection">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useDateTimeUtils } from '../../composables/useDateTimeUtils'
import { useAnimations } from '../../composables/useAnimations'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['start', 'end'].includes(value)
  },
  selectedTime: {
    type: String,
    default: null
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'select'])

// Import needed utilities
const { formatTimeForDisplay } = useDateTimeUtils()
const { animateModalEntry, animateModalExit, animateTimeUnitChange } = useAnimations()

// Refs
const timePickerRef = ref(null)
const tempTimeValue = ref(null)
const selectedHour = ref('12')
const selectedMinute = ref('00')
const selectedPeriod = ref('AM')

// Initialize time values when component is shown
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    initializeTimeValues()
    
    // Animate entry
    nextTick(() => {
      if (timePickerRef.value) {
        animateModalEntry(timePickerRef.value)
      }
    })
  }
}, { immediate: true })

// Methods
function initializeTimeValues() {
  tempTimeValue.value = null
  
  // Set the current time from the selectedTime prop
  if (props.selectedTime) {
    const [hours, minutes] = props.selectedTime.split(':').map(num => parseInt(num, 10))
    selectedHour.value = (hours % 12 || 12).toString()
    selectedMinute.value = minutes.toString().padStart(2, '0')
    selectedPeriod.value = hours >= 12 ? 'PM' : 'AM'
  } else {
    // Default to current time
    const now = new Date()
    selectedHour.value = (now.getHours() % 12 || 12).toString()
    selectedMinute.value = now.getMinutes().toString().padStart(2, '0')
    selectedPeriod.value = now.getHours() >= 12 ? 'PM' : 'AM'
  }
}

function adjustHour(step) {
  let hour = parseInt(selectedHour.value, 10)
  hour = (hour + step) % 12
  if (hour <= 0) hour = 12 // Convert 0 to 12
  selectedHour.value = hour.toString()
  updateTempTime()
  
  // Animate the number change
  const hourElement = timePickerRef.value?.querySelector('.md3-time-unit-picker:first-child .md3-time-unit')
  if (hourElement) {
    animateTimeUnitChange(hourElement, step > 0 ? 'up' : 'down')
  }
}

function adjustMinute(step) {
  let minute = parseInt(selectedMinute.value, 10)
  minute = (minute + step) % 60
  if (minute < 0) minute = 55
  selectedMinute.value = minute.toString().padStart(2, '0')
  updateTempTime()
  
  // Animate the number change
  const minuteElement = timePickerRef.value?.querySelector('.md3-time-unit-picker:nth-child(3) .md3-time-unit')
  if (minuteElement) {
    animateTimeUnitChange(minuteElement, step > 0 ? 'up' : 'down')
  }
}

function updateTempTime() {
  let hour = parseInt(selectedHour.value, 10)
  if (selectedPeriod.value === 'PM' && hour !== 12) {
    hour += 12
  } else if (selectedPeriod.value === 'AM' && hour === 12) {
    hour = 0
  }
  
  const minute = parseInt(selectedMinute.value, 10)
  tempTimeValue.value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function confirmSelection() {
  updateTempTime()
  if (tempTimeValue.value) {
    emit('select', tempTimeValue.value)
  }
}

function handleClose() {
  if (timePickerRef.value) {
    const animation = animateModalExit(timePickerRef.value)
    animation.finished.then(() => {
      emit('close')
    })
  } else {
    emit('close')
  }
}
</script>

<style scoped>
/* Time Picker Styling */
.md3-time-picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  padding: 16px;
}

.md3-time-picker-container {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 360px;
  box-shadow: var(--md-sys-elevation-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  will-change: transform, opacity;
}

.md3-time-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.md3-time-picker-body {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.md3-time-picker-display {
  font-size: 36px;
  font-weight: 400;
  margin-bottom: 24px;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-time-picker-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.md3-time-unit-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.md3-time-unit {
  font-size: 24px;
  padding: 8px 16px;
  min-width: 60px;
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-time-unit-button {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s;
}

.md3-time-unit-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-time-separator {
  font-size: 36px;
  margin: 0 8px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  align-self: center;
}

.md3-period-picker {
  margin-left: 16px;
  flex-direction: column;
  gap: 8px;
}

.md3-period-button {
  border: none;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  transition: all 0.2s;
}

.md3-period-button.active {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.md3-time-picker-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 16px;
  gap: 8px;
}

.md3-close-button {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-primary-container));
  transition: background-color 0.2s;
}

.md3-close-button:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

/* Buttons styling */
.md3-button {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
}

.md3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  box-shadow: var(--md-sys-elevation-1);
}

.md3-filled-button:hover {
  background-color: rgb(var(--md-sys-color-primary));
  filter: brightness(1.1);
  box-shadow: var(--md-sys-elevation-2);
}

.md3-text-button {
  background-color: transparent;
  color: rgb(var(--md-sys-color-primary));
}

.md3-text-button:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

/* Mobile adaptations */
@media (max-width: 600px) {
  .md3-time-picker-container {
    position: absolute;
    bottom: 0;
    border-radius: 28px 28px 0 0;
    max-width: 100%;
  }
  
  .md3-time-picker-modal {
    align-items: flex-end;
    padding: 0;
  }
}

/* Transition animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>