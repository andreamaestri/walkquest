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
        <button class="month-nav-btn" @click="setToPreviousMonth">
          <Icon icon="mdi:chevron-left" />
        </button>
        <div class="month-year">{{ getMonthName() }} {{ currentYear }}</div>
        <button class="month-nav-btn" @click="setToNextMonth">
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
      
      <div class="calendar-days-header">
        <div v-for="day in getDayNames()" :key="day" class="day-name">
          {{ day }}
        </div>
      </div>
      
      <div class="calendar-days-grid">
        <div 
          v-for="(dayObj, index) in days" 
          :key="index"
          class="calendar-day"
          :class="{
            'calendar-day-empty': !dayObj.day,
            'calendar-day-today': dayObj.isToday,
            'calendar-day-selected': isSelected(dayObj.date)
          }"
          @click="dayObj.day && selectDate(dayObj.date)"
        >
          {{ dayObj.day }}
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
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useDateTimeUtils } from '../../../composables/useDateTimeUtils'
import { useAnimations } from '../../../composables/useAnimations'
const { animateModalEntry, animateModalExit } = useAnimations()

const props = defineProps({
  title: {
    type: String,
    default: 'Select Date'
  },
  modelValue: {
    type: String,
    default: ''
  },
  field: {
    type: String,
    default: 'startDate', // <-- added default value
    validator: value => ['startDate', 'endDate'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const datePickerModal = ref(null)
const {
  currentMonth,
  currentYear,
  getDaysInMonth,
  getMonthName,
  getDayNames,
  setToPreviousMonth,
  setToNextMonth
} = useDateTimeUtils()

const selectedDate = ref(props.modelValue)
const days = computed(() => getDaysInMonth())

// If no date is selected, default to today
if (!selectedDate.value) {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  selectedDate.value = `${year}-${month}-${day}`
}

// Set the calendar to show the month of the selected date
onMounted(() => {
  if (props.modelValue) {
    const [year, month] = props.modelValue.split('-').map(Number)
    currentMonth.value = month - 1
    currentYear.value = year
  }
  
  // Show the modal with animation using the actual element
  animateModalEntry(datePickerModal.value)
})

// Check if a date is selected
function isSelected(date) {
  return date === selectedDate.value
}

// Handle date selection
function selectDate(date) {
  selectedDate.value = date
}

// Confirm selection and close
async function confirm() {
  emit('update:modelValue', selectedDate.value)
  await close()
}

// Close modal
async function close() {
  await animateModalExit(datePickerModal.value)
  emit('close')
}

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  if (newVal !== selectedDate.value) {
    selectedDate.value = newVal
  }
})
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
  transform: translateY(100%);
  opacity: 0;
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
</style>