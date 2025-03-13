<template>
  <div class="md3-time-picker-modal" @click.self="$emit('close')">
    <div class="md3-time-picker-container" ref="modalRef">
      <div class="md3-time-picker-header">
        <h3>{{ type === 'start' ? 'Start Time' : 'End Time' }}</h3>
        <button type="button" class="md3-close-button" @click="$emit('close')">
          <Icon icon="mdi:close" />
        </button>
      </div>
      
      <div class="md3-time-picker-body">
        <div class="md3-time-picker-display">
          {{ formattedTime }}
        </div>
        
        <div class="md3-time-picker-controls">
          <div class="md3-time-unit-picker">
            <button class="md3-time-unit-button" @click="$emit('adjust-hour', 1)">
              <Icon icon="mdi:chevron-up" />
            </button>
            <div class="md3-time-unit">{{ hour }}</div>
            <button class="md3-time-unit-button" @click="$emit('adjust-hour', -1)">
              <Icon icon="mdi:chevron-down" />
            </button>
          </div>
          
          <div class="md3-time-separator">:</div>
          
          <div class="md3-time-unit-picker">
            <button class="md3-time-unit-button" @click="$emit('adjust-minute', 5)">
              <Icon icon="mdi:chevron-up" />
            </button>
            <div class="md3-time-unit">{{ minute }}</div>
            <button class="md3-time-unit-button" @click="$emit('adjust-minute', -5)">
              <Icon icon="mdi:chevron-down" />
            </button>
          </div>
          
          <div class="md3-time-unit-picker md3-period-picker">
            <button 
              class="md3-period-button" 
              :class="{ 'active': period === 'AM' }" 
              @click="$emit('update:period', 'AM')"
            >AM</button>
            <button 
              class="md3-period-button" 
              :class="{ 'active': period === 'PM' }" 
              @click="$emit('update:period', 'PM')"
            >PM</button>
          </div>
        </div>
      </div>
      
      <div class="md3-time-picker-actions">
        <button type="button" class="md3-button md3-text-button" @click="$emit('close')">
          Cancel
        </button>
        <button type="button" class="md3-button md3-filled-button" @click="$emit('confirm')">
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useDateTimeUtils } from '../../../composables/useDateTimeUtils'

const { formatTimeForDisplay } = useDateTimeUtils()

const props = defineProps({
  type: {
    type: String,
    default: 'start',
    validator: value => ['start', 'end'].includes(value)
  },
  hour: {
    type: String,
    required: true
  },
  minute: {
    type: String,
    required: true
  },
  period: {
    type: String,
    required: true,
    validator: value => ['AM', 'PM'].includes(value)
  },
  currentTime: {
    type: String,
    default: ''
  },
  tempValue: {
    type: String,
    default: null
  }
})

defineEmits([
  'close',
  'confirm',
  'adjust-hour',
  'adjust-minute',
  'update:hour',
  'update:minute',
  'update:period'
])

const formattedTime = computed(() => {
  if (props.tempValue) {
    return formatTimeForDisplay(props.tempValue)
  }
  
  if (props.currentTime) {
    return formatTimeForDisplay(props.currentTime)
  }
  
  // Construct time from hour, minute, and period
  let hour = parseInt(props.hour)
  if (props.period === 'PM' && hour !== 12) {
    hour += 12
  } else if (props.period === 'AM' && hour === 12) {
    hour = 0
  }
  
  const time = `${hour.toString().padStart(2, '0')}:${props.minute}`
  return formatTimeForDisplay(time)
})
</script>

<style scoped>
/* Time Picker Modal */
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

/* Time Picker Styling */
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
  background-color: rgba(var(--md3-sys-color-on-surface), 0.08);
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

/* Buttons */
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
}

.md3-filled-button:hover {
  background-color: rgb(var(--md-sys-color-primary));
  filter: brightness(1.1);
}

.md3-text-button {
  background-color: transparent;
  color: rgb(var(--md-sys-color-primary));
}

.md3-text-button:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

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
</style>