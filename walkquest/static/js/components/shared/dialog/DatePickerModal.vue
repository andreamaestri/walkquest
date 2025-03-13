<template>
  <div ref="datePickerModal" class="date-picker-modal">
    <div class="date-picker-header">
      <h3>{{ title }}</h3>
      <button class="close-button" @click="close">
        <Icon icon="mdi:close" />
      </button>
    </div>
    
    <div class="date-picker-calendar">
      <div class="calendar-header">
        <button class="month-nav-btn" @click="$emit('prev-month')">
          <Icon icon="mdi:chevron-left" />
        </button>
        <div class="month-year">{{ currentMonthLabel }}</div>
        <button class="month-nav-btn" @click="$emit('next-month')">
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
      
      <div class="calendar-days-header">
        <div v-for="day in weekDays" :key="day" class="day-name">
          {{ day }}
        </div>
      </div>
      
      <div class="calendar-days-grid md3-calendar-grid">
        <div 
          v-for="(dayObj, index) in calendarDays" 
          :key="index"
          class="calendar-day md3-calendar-day"
          :class="{
            'calendar-day-empty': !dayObj.isCurrentMonth,
            'calendar-day-today': dayObj.isToday,
            'calendar-day-selected': isSelected(dayObj.fullDate)
          }"
          :data-date="dayObj.fullDate"
          @click="dayObj.isCurrentMonth && selectDate(dayObj.fullDate)"
        >
          {{ dayObj.date }}
        </div>
      </div>
    </div>
    
    <div class="date-picker-actions">
      <button class="cancel-btn" @click="close">Cancel</button>
      <button class="confirm-btn" @click="confirm">OK</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Select Date'
  },
  type: {
    type: String,
    default: 'start'
  },
  currentDate: {
    type: Object,
    required: true
  },
  selectedDate: {
    type: String,
    default: ''
  },
  weekDays: {
    type: Array,
    required: true
  },
  calendarDays: {
    type: Array,
    required: true
  },
  currentMonthLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select', 'confirm', 'close', 'prev-month', 'next-month'])
const datePickerModal = ref(null)
const selectedDateValue = ref(props.selectedDate)

// Check if a date is selected
function isSelected(date) {
  return date === selectedDateValue.value
}

// Handle date selection
function selectDate(date) {
  selectedDateValue.value = date
  emit('select', date)
}

// Confirm selection and close
function confirm() {
  emit('confirm')
}

// Close modal
function close() {
  emit('close')
}
</script>

<style scoped>
.date-picker-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  padding: 24px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.date-picker-header h3 {
  font-size: 20px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.month-nav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: rgb(var(--md-sys-color-primary));
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-year {
  font-size: 18px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
}

.calendar-days-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.day-name {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface-variant));
  padding: 8px 0;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 24px;
}

.calendar-day {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface));
  transition: background-color 0.2s;
}

.calendar-day:not(.calendar-day-empty):hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.05);
}

.calendar-day-empty {
  cursor: default;
  color: rgba(var(--md-sys-color-on-surface), 0.38);
}

.calendar-day-today {
  font-weight: bold;
  color: rgb(var(--md-sys-color-primary));
}

.calendar-day-selected {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  font-weight: 500;
}

.date-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.cancel-btn, .confirm-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn {
  background: none;
  color: rgb(var(--md-sys-color-primary));
}

.confirm-btn {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.cancel-btn:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.05);
}

.confirm-btn:hover {
  background-color: rgba(var(--md-sys-color-primary-container), 0.8);
}

/* Calendar day with in-range state */
.calendar-day.in-range {
  background-color: rgba(var(--md-sys-color-primary), 0.1);
}

/* Mobile adaptations */
@media (max-width: 600px) {
  .date-picker-modal {
    max-height: 90vh;
    padding: 16px;
  }
  
  .calendar-day {
    height: 36px;
  }
}
</style>