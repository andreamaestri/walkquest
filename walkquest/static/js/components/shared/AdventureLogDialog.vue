<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div 
        v-if="isOpen" 
        class="dialog-overlay" 
        @click="handleScrimClick"
      >
        <div 
          ref="dialogRef"
          class="adventure-log-dialog" 
          :class="{ 'mobile': isMobile }"
        >
          <!-- Dialog Header -->
          <DialogHeader 
            title="Log an Adventure" 
            @close="handleClose" 
          />

          <!-- Dialog Content -->
          <div class="dialog-content">
            <!-- Toast Notification -->
            <Toast 
              v-if="isToastVisible" 
              :message="toastMessage" 
            />
            
            <form @submit.prevent="handleSubmit" class="adventure-form">
              <div class="form-scroll-container">
                <!-- Form Fields -->
                <AdventureFormFields 
                  v-model:title="adventureForm.title"
                  v-model:description="adventureForm.description"
                  :errors="errors"
                  :active-field="activeField"
                  @update:active-field="activeField = $event"
                />

                <!-- Date Selector Section -->
                <DateTimeSection
                  v-model:start-date="adventureForm.startDate"
                  v-model:start-time="adventureForm.startTime"
                  v-model:end-date="adventureForm.endDate"
                  v-model:end-time="adventureForm.endTime"
                  :errors="errors"
                  @open-date-picker="openDatePicker"
                  @open-time-picker="openTimePicker"
                />

                <!-- Difficulty Level Section -->
                <DifficultySelector
                  v-model="adventureForm.difficultyLevel"
                  :errors="errors.difficultyLevel"
                  :difficulty-levels="difficultyLevels"
                />

                <!-- Categories Section -->
                <CategorySelector
                  v-model="adventureForm.categories"
                  :available-categories="availableCategories"
                  :errors="errors.categories"
                />

                <!-- Companions Section -->
                <div class="md3-section">
                  <div class="md3-section-header">
                    <Icon icon="mdi:account-group" class="md3-section-icon" />
                    <h3 class="md3-section-title">Who joined you?</h3>
                  </div>
                  
                  <CompanionSelector v-model="adventureForm.companions" />
                </div>
                
                <!-- General Submit Error -->
                <div v-if="errors.submit" class="md3-submit-error">
                  <Icon icon="mdi:alert-circle" class="md3-error-icon" />
                  <span>{{ errors.submit }}</span>
                </div>
              </div>

              <!-- Action Buttons (Fixed at bottom) -->
              <FormActionButtons 
                :is-submitting="isSubmitting" 
                @cancel="handleClose" 
              />
            </form>
            
            <!-- Date Picker Modal -->
            <DatePickerModal
              v-if="showDatePicker"
              :type="datePickerType"
              :current-date="currentDate"
              :selected-date="datePickerType === 'start' ? adventureForm.startDate : adventureForm.endDate"
              :week-days="weekDays"
              :calendar-days="memoizedCalendarDays"
              :current-month-label="currentMonthLabel"
              @select="selectDate"
              @confirm="confirmDateSelection"
              @close="closeDatePicker"
              @prev-month="prevMonth"
              @next-month="nextMonth"
              ref="datePickerRef"
            />
            
            <!-- Time Picker Modal -->
            <TimePickerModal
              v-if="showTimePicker"
              :type="timePickerType"
              :current-time="timePickerType === 'start' ? adventureForm.startTime : adventureForm.endTime"
              v-model:hour="selectedHour"
              v-model:minute="selectedMinute"
              v-model:period="selectedPeriod"
              :temp-value="tempTimeValue"
              @adjust-hour="adjustHour"
              @adjust-minute="adjustMinute"
              @confirm="confirmTimeSelection"
              @close="closeTimePicker"
              ref="timePickerRef"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAdventureStore } from '../../stores/adventure'
import { useUiStore } from '../../stores/ui'
import { useAdventureDialogStore } from '../../stores/adventureDialog'
import { useAdventureFormUtils } from '../../composables/useAdventureFormUtils'
import { useDateTimeUtils } from '../../composables/useDateTimeUtils'
import { useAnimations } from '../../composables/useAnimations'

// Import extracted components
import DialogHeader from './dialog/DialogHeader.vue'
import Toast from './dialog/Toast.vue'
import AdventureFormFields from './dialog/AdventureFormFields.vue'
import DateTimeSection from './dialog/DateTimeSection.vue'
import DifficultySelector from './dialog/DifficultySelector.vue'
import CategorySelector from './dialog/CategorySelector.vue'
import FormActionButtons from './dialog/FormActionButtons.vue'
import DatePickerModal from './dialog/DatePickerModal.vue'
import TimePickerModal from './dialog/TimePickerModal.vue'
import CompanionSelector from './CompanionSelector.vue'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])
const uiStore = useUiStore()
const adventureStore = useAdventureStore()
const adventureDialogStore = useAdventureDialogStore()

// Pull in composables
const { 
  form: adventureForm, 
  errors, 
  isSubmitting, 
  activeField, 
  difficultyLevels, 
  availableCategories, 
  validateForm, 
  resetForm 
} = useAdventureFormUtils()

const {
  currentDate,
  weekDays,
  currentMonthLabel,
  calendarDays,
  formatDateForDisplay,
  formatTimeForDisplay,
  setToNextMonth,
  setToPreviousMonth,
  getToday
} = useDateTimeUtils()

const {
  animateModalEntry,
  animateModalExit,
  animateCalendarChange,
  animateDrawerElement
} = useAnimations()

// UI state
const isOpen = computed(() => adventureDialogStore.isOpen)
const isMobile = computed(() => uiStore.isMobile)

// Refs
const dialogRef = ref(null)
const datePickerRef = ref(null)
const timePickerRef = ref(null)

// Form interaction state
const showDatePicker = ref(false)
const showTimePicker = ref(false)
const datePickerType = ref('start') // 'start' or 'end'
const timePickerType = ref('start') // 'start' or 'end'
const tempDateValue = ref(null) // For date picker
const tempTimeValue = ref(null) // For time picker
const selectedHour = ref('12')
const selectedMinute = ref('00')
const selectedPeriod = ref('AM')
let currentAnimation

// Dialog animations
watch(() => adventureDialogStore.isOpen, async (isOpen) => {
  // Stop any existing animation before starting a new one
  if (currentAnimation) {
    currentAnimation.stop()
    currentAnimation = null
  }

  await nextTick() // Wait for DOM update
  if (!dialogRef.value) return

  if (isOpen) {
    // Entry animation
    currentAnimation = animateDrawerElement(
      dialogRef.value,
      { 
        opacity: [0, 1],
        scale: [0.95, 1]
      },
      { 
        duration: 0.3,
        easing: [0.2, 0, 0, 1] // M3 emphasized easing
      }
    )
  } else {
    // Exit animation
    currentAnimation = animateDrawerElement(
      dialogRef.value,
      { 
        opacity: [1, 0],
        scale: [1, 0.95]
      },
      { 
        duration: 0.2,
        easing: [0.3, 0, 0.8, 0.15], // M3 emphasized-accelerate
        onComplete: () => {
          // Clear the animation reference once complete
          currentAnimation = null
        }
      }
    )
  }
})

// Form submission handler
const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  errors.value = {} // Clear previous errors
  
  try {
    const { companions, ...formData } = adventureForm.value
    const adventureData = await adventureStore.createAdventure({
      ...formData,
      walkId: props.walk.id,
      companion_ids: companions
    })
    emit('submit', adventureData)
    handleClose()
  } catch (error) {
    // Set specific error messages based on error type if possible
    if (error.response && error.response.data) {
      // Handle API error responses
      const apiErrors = error.response.data
      Object.entries(apiErrors).forEach(([key, message]) => {
        errors.value[key] = Array.isArray(message) ? message[0] : message
      })
    } else {
      // Generic error fallback
      errors.value.submit = 'Failed to create adventure. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Date picker functions
function openDatePicker(type) {
  datePickerType.value = type
  
  // Set the current date to the month of the selected date (if any)
  const existingDate = type === 'start' ? adventureForm.value.startDate : adventureForm.value.endDate
  if (existingDate) {
    currentDate.value = new Date(existingDate)
  } else {
    currentDate.value = new Date()
  }
  
  tempDateValue.value = existingDate || null
  showDatePicker.value = true
  
  // Animate the modal entrance
  nextTick(() => {
    if (datePickerRef.value?.$el) {
      animateModalEntry(datePickerRef.value.$el)
    }
  })
}

function closeDatePicker() {
  // Animate the modal exit
  if (datePickerRef.value?.$el) {
    animateModalExit(datePickerRef.value.$el, () => {
      showDatePicker.value = false
      tempDateValue.value = null
    })
  } else {
    showDatePicker.value = false
    tempDateValue.value = null
  }
}

function prevMonth() {
  // Move to previous month
  setToPreviousMonth()
  
  // Animate the calendar change
  const calendar = document.querySelector('.md3-calendar-grid')
  if (calendar) {
    animateCalendarChange(calendar, 'prev')
  }
}

function nextMonth() {
  // Move to next month
  setToNextMonth()
  
  // Animate the calendar change
  const calendar = document.querySelector('.md3-calendar-grid')
  if (calendar) {
    animateCalendarChange(calendar, 'next')
  }
}

function selectDate(dateString) {
  tempDateValue.value = dateString
  
  // When selecting start date, automatically set end date if empty or if end date is before start date
  if (datePickerType.value === 'start') {
    // If end date is empty or before the newly selected start date, update it
    if (!adventureForm.value.endDate || dateString > adventureForm.value.endDate) {
      // Set temp end date value so it's ready when confirming
      adventureForm.value.endDate = dateString
    }
  } else if (datePickerType.value === 'end') {
    // When selecting end date, ensure it's not before start date
    if (adventureForm.value.startDate && dateString < adventureForm.value.startDate) {
      // Show validation message
      errors.value.endDate = 'End date cannot be before start date'
      setTimeout(() => {
        errors.value.endDate = null
      }, 2000)
      return
    }
  }
  
  // Highlight date range if both start and end dates are selected
  highlightDateRange()
}

// New function to highlight date range between start and end dates
function highlightDateRange() {
  // Only highlight if we have both dates and are in end date picker
  if (datePickerType.value === 'end' && adventureForm.value.startDate && tempDateValue.value) {
    // Clear previous highlights
    document.querySelectorAll('.md3-calendar-day.in-range').forEach(el => {
      el.classList.remove('in-range')
    })
    
    // Get all days between start and end dates
    const startDate = new Date(adventureForm.value.startDate)
    const endDate = new Date(tempDateValue.value)
    
    // Skip if dates are the same or invalid
    if (startDate >= endDate) return
    
    // Add one day to start date to avoid highlighting the start date itself
    startDate.setDate(startDate.getDate() + 1)
    
    // Highlight all days in range
    while (startDate < endDate) {
      const dateStr = startDate.toISOString().split('T')[0]
      const dayEl = document.querySelector(`.md3-calendar-day[data-date="${dateStr}"]`)
      
      if (dayEl) {
        dayEl.classList.add('in-range')
      }
      
      startDate.setDate(startDate.getDate() + 1)
    }
  }
}

// Enhance date selection with validation and suggestions
function confirmDateSelection() {
  if (tempDateValue.value) {
    if (datePickerType.value === 'start') {
      adventureForm.value.startDate = tempDateValue.value
      
      // If end date is before start date, update end date to match start date
      if (adventureForm.value.endDate && adventureForm.value.endDate < adventureForm.value.startDate) {
        adventureForm.value.endDate = tempDateValue.value
        showToast('End date adjusted to match start date')
      } else if (!adventureForm.value.endDate) {
        // If no end date set, auto-set it to start date
        adventureForm.value.endDate = tempDateValue.value
        showToast('End date set to match start date')
      }
    } else {
      adventureForm.value.endDate = tempDateValue.value
      
      // Calculate duration after date selection
      calculateDuration()
    }
  }
  closeDatePicker()
}

// Time picker functions
function openTimePicker(type) {
  timePickerType.value = type
  
  // Set the current time from the form
  const timeString = type === 'start' ? adventureForm.value.startTime : adventureForm.value.endTime
  
  if (timeString) {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10))
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
  
  showTimePicker.value = true
  
  // Animate the modal entrance
  nextTick(() => {
    if (timePickerRef.value?.$el) {
      animateModalEntry(timePickerRef.value.$el)
    }
  })
}

function closeTimePicker() {
  // Animate the modal exit
  if (timePickerRef.value?.$el) {
    animateModalExit(timePickerRef.value.$el, () => {
      showTimePicker.value = false
      tempTimeValue.value = null
    })
  } else {
    showTimePicker.value = false
    tempTimeValue.value = null
  }
}

function adjustHour(step) {
  let hour = parseInt(selectedHour.value, 10)
  hour = (hour + step) % 12
  if (hour <= 0) hour = 12 // Convert 0 to 12
  selectedHour.value = hour.toString()
  updateTempTime()
}

function adjustMinute(step) {
  let minute = parseInt(selectedMinute.value, 10)
  minute = (minute + step) % 60
  if (minute < 0) minute = 55
  selectedMinute.value = minute.toString().padStart(2, '0')
  updateTempTime()
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

function confirmTimeSelection() {
  updateTempTime()
  
  if (tempTimeValue.value) {
    if (timePickerType.value === 'start') {
      adventureForm.value.startTime = tempTimeValue.value
      
      // If we have end time on same day, validate it
      if (adventureForm.value.endTime && adventureForm.value.startDate === adventureForm.value.endDate) {
        if (adventureForm.value.endTime <= tempTimeValue.value) {
          // Auto-adjust end time to be 1 hour after start time
          const [startHour, startMinute] = tempTimeValue.value.split(':').map(Number)
          let endHour = startHour + 1
          let endMinute = startMinute
          
          // Handle day overflow
          if (endHour >= 24) {
            endHour -= 24
          }
          
          adventureForm.value.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
          showToast('End time adjusted to be after start time')
        }
      }
    } else {
      // If setting end time, validate against start time
      if (adventureForm.value.startTime && adventureForm.value.startDate === adventureForm.value.endDate) {
        if (tempTimeValue.value <= adventureForm.value.startTime) {
          errors.value.endTime = 'End time must be after start time'
          setTimeout(() => {
            errors.value.endTime = null
          }, 2000)
          return
        }
      }
      
      adventureForm.value.endTime = tempTimeValue.value
    }
    
    // Calculate duration after time selection
    calculateDuration()
  }
  
  closeTimePicker()
}

const handleScrimClick = (event) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

const handleClose = () => {
  // Close any open pickers
  if (showDatePicker.value) closeDatePicker()
  if (showTimePicker.value) closeTimePicker()
  
  // Animate dialog exit
  if (dialogRef.value) {
    animateDrawerElement(dialogRef.value, {
      scale: [1, 0.95],
      opacity: [1, 0]
    }, {
      duration: 0.2,
      easing: [0.2, 0, 0, 1],
      onComplete: () => {
        // Reset form state
        resetForm()
        adventureDialogStore.closeDialog()
      }
    })
  } else {
    resetForm()
    adventureDialogStore.closeDialog()
  }
}

// Handle keyboard events
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (showDatePicker.value) {
      closeDatePicker()
    } else if (showTimePicker.value) {
      closeTimePicker()
    } else if (isOpen.value) {
      handleClose()
    }
  }
}

// Add smart duration calculation feature
function calculateDuration() {
  // Only calculate if we have all required values
  if (adventureForm.value.startDate && adventureForm.value.endDate && 
      adventureForm.value.startTime && adventureForm.value.endTime) {
    
    // Create DateTime objects for start and end
    const startDateTime = new Date(`${adventureForm.value.startDate}T${adventureForm.value.startTime}`)
    const endDateTime = new Date(`${adventureForm.value.endDate}T${adventureForm.value.endTime}`)
    
    // Skip invalid dates or if end is before start
    if (isNaN(startDateTime) || isNaN(endDateTime) || endDateTime <= startDateTime) {
      return
    }
    
    // Calculate the difference in minutes
    const diffMs = endDateTime - startDateTime
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    // Show calculated duration in a toast
    showToast(`Duration: ${formatDurationForDisplay(diffMinutes)}`)
  }
}

// Function to format duration for display
function formatDurationForDisplay(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return hours === 1 ? `1 hour` : `${hours} hours`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

// Toast notification system
const toastMessage = ref('')
const isToastVisible = ref(false)
let toastTimeout = null

function showToast(message) {
  toastMessage.value = message
  isToastVisible.value = true
  
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }
  
  // Hide toast after 3 seconds
  toastTimeout = setTimeout(() => {
    isToastVisible.value = false
  }, 3000)
}

// Use memoization for calendar days to improve performance
const memoizedCalendarDays = computed(() => {
  const key = `${currentDate.value.getFullYear()}-${currentDate.value.getMonth()}`
  if (!calendarDaysCache[key]) {
    calendarDaysCache[key] = calendarDays.value
  }
  return calendarDaysCache[key]
})

// Calendar days cache
const calendarDaysCache = ref({})

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  
  // Ensure animations are stopped
  if (currentAnimation) {
    currentAnimation.stop()
    currentAnimation = null
  }
  
  // Clear toast timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
    toastTimeout = null
  }
})
</script>

<style scoped>
/* Dialog Overlay */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  overflow: hidden;
  backdrop-filter: blur(3px);
}

/* Dialog Container */
.adventure-log-dialog {
  background-color: rgb(var(--md-sys-color-surface));
  color: rgb(var(--md-sys-color-on-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  box-shadow: var(--md-sys-elevation-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  will-change: transform, opacity;
}

.adventure-log-dialog.mobile {
  max-width: 100%;
  max-height: 98vh;
  width: 100%;
  border-radius: 28px;
}

/* Dialog Content */
.dialog-content {
  padding: 0;
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

/* Form Styling */
.adventure-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-scroll-container {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.md3-submit-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: rgba(var(--md-sys-color-error-container), 0.7);
  color: rgb(var(--md-sys-color-on-error-container));
}

.md3-error-icon {
  font-size: 20px;
  color: rgb(var(--md-sys-color-error));
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .form-scroll-container {
    padding: 16px;
    gap: 16px;
  }
  
  .dialog-content {
    padding: 0;
  }
  
  .adventure-log-dialog {
    border-radius: 24px 24px 0 0;
    max-height: 100vh;
    height: 90vh;
  }
}
</style>
