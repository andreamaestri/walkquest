<template>
  <div class="date-time-section">
    <h3 class="section-title">Date & Time</h3>
    
    <div class="date-time-grid">
      <!-- Start Date/Time -->
      <div class="date-time-group">
        <div 
          class="md3-date-field"
          :class="{ 'error': errors.startDate }"
          @click="$emit('open-date-picker', 'start')"
        >
          <div class="md3-date-field-icon">
            <Icon icon="mdi:calendar" />
          </div>
          <div class="md3-date-field-content">
            <label class="md3-date-field-label">Start Date*</label>
            <div v-if="modelValue.startDate" class="md3-date-field-value">
              {{ formatDate(modelValue.startDate) }}
            </div>
            <div v-else class="md3-date-field-placeholder">
              Select date
            </div>
          </div>
        </div>
        <div v-if="errors.startDate" class="md3-field-error">
          {{ errors.startDate }}
        </div>
      </div>
      
      <div class="date-time-group">
        <div 
          class="md3-time-field"
          :class="{ 'error': errors.startTime }"
          @click="$emit('open-time-picker', 'start')"
        >
          <div class="md3-time-field-icon">
            <Icon icon="mdi:clock-outline" />
          </div>
          <div class="md3-time-field-content">
            <label class="md3-time-field-label">Start Time</label>
            <div v-if="modelValue.startTime" class="md3-time-field-value">
              {{ formatTime(modelValue.startTime) }}
            </div>
            <div v-else class="md3-time-field-placeholder">
              Select time
            </div>
          </div>
        </div>
        <div v-if="errors.startTime" class="md3-field-error">
          {{ errors.startTime }}
        </div>
      </div>
      
      <!-- End Date/Time -->
      <div class="date-time-group">
        <div 
          class="md3-date-field"
          :class="{ 'error': errors.endDate }"
          @click="$emit('open-date-picker', 'end')"
        >
          <div class="md3-date-field-icon">
            <Icon icon="mdi:calendar" />
          </div>
          <div class="md3-date-field-content">
            <label class="md3-date-field-label">End Date</label>
            <div v-if="modelValue.endDate" class="md3-date-field-value">
              {{ formatDate(modelValue.endDate) }}
            </div>
            <div v-else class="md3-date-field-placeholder">
              Select date
            </div>
          </div>
        </div>
        <div v-if="errors.endDate" class="md3-field-error">
          {{ errors.endDate }}
        </div>
      </div>
      
      <div class="date-time-group">
        <div 
          class="md3-time-field"
          :class="{ 'error': errors.endTime }"
          @click="$emit('open-time-picker', 'end')"
        >
          <div class="md3-time-field-icon">
            <Icon icon="mdi:clock-outline" />
          </div>
          <div class="md3-time-field-content">
            <label class="md3-time-field-label">End Time</label>
            <div v-if="modelValue.endTime" class="md3-time-field-value">
              {{ formatTime(modelValue.endTime) }}
            </div>
            <div v-else class="md3-time-field-placeholder">
              Select time
            </div>
          </div>
        </div>
        <div v-if="errors.endTime" class="md3-field-error">
          {{ errors.endTime }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useDateTimeUtils } from '../../../composables/useDateTimeUtils'

const { formatDateForDisplay, formatTimeForDisplay } = useDateTimeUtils()

defineProps({
  modelValue: {
    type: Object,
    required: true,
    validator: value => {
      return ['startDate', 'startTime', 'endDate', 'endTime'].every(prop => prop in value)
    }
  },
  errors: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['open-date-picker', 'open-time-picker'])

function formatDate(dateString) {
  return formatDateForDisplay(dateString)
}

function formatTime(timeString) {
  return formatTimeForDisplay(timeString)
}
</script>

<style scoped>
.date-time-section {
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 16px;
  color: rgb(var(--md-sys-color-on-surface));
}

.date-time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.date-time-group {
  display: flex;
  flex-direction: column;
}

/* Date & Time Fields */
.md3-date-field,
.md3-time-field {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.md3-date-field:hover,
.md3-time-field:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.05);
}

.md3-date-field.error,
.md3-time-field.error {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-date-field-icon,
.md3-time-field-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: rgb(var(--md-sys-color-primary));
  font-size: 20px;
}

.md3-date-field-content,
.md3-time-field-content {
  display: flex;
  flex-direction: column;
}

.md3-date-field-label,
.md3-time-field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 4px;
}

.md3-date-field-value,
.md3-time-field-value {
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-date-field-placeholder,
.md3-time-field-placeholder {
  font-size: 14px;
  color: rgba(var(--md-sys-color-on-surface), 0.6);
}

.md3-field-error {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 4px;
}

/* Mobile Adaptations */
@media (max-width: 600px) {
  .date-time-grid {
    grid-template-columns: 1fr;
  }
}
</style>