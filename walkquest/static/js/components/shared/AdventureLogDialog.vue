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
                  :start-date="adventureForm.startDate"
                  :start-time="adventureForm.startTime"
                  :end-date="adventureForm.endDate"
                  :end-time="adventureForm.endTime"
                  @update:start-date="adventureForm.startDate = $event"
                  @update:start-time="adventureForm.startTime = $event"
                  @update:end-date="adventureForm.endDate = $event"
                  @update:end-time="adventureForm.endTime = $event"
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
import { animate } from 'motion'
import { useAdventureStore } from '../../stores/adventure'
import { useUiStore } from '../../stores/ui'
import { useAdventureDialogStore } from '../../stores/adventureDialog'
import { useAdventureFormUtils } from '../../composables/useAdventureFormUtils'
import { useDateTimeUtils } from '../../composables/useDateTimeUtils'
import { useAnimations } from '../../composables/useAnimations'

// Get animation functions from composable
const { animateModalEntry, animateModalExit, animateCalendarChange } = useAnimations()

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

// Initialize missing refs
const currentDate = ref(new Date())
const calendarDays = ref([])

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
  getDayNames,
  getCurrentMonthLabel,
  formatDateForDisplay,
  formatTimeForDisplay,
  setToNextMonth,
  setToPreviousMonth
} = useDateTimeUtils()

// Add missing computed properties
const weekDays = computed(() => getDayNames())
const currentMonthLabel = computed(() => getCurrentMonthLabel())

// Helper function to update calendar days
function updateCalendarDays() {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // Create an array of calendar days for the current month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  const days = []
  const startOffset = firstDay.getDay()
  
  // Add previous month's days
  for (let i = 0; i < startOffset; i++) {
    const prevDate = new Date(year, month, -i)
    days.unshift({
      date: prevDate.getDate(),
      fullDate: prevDate.toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  // Add current month's days
  const today = new Date()
  const isCurrentMonthAndYear = today.getFullYear() === year && today.getMonth() === month
  
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(year, month, i)
    days.push({
      date: i,
      fullDate: currentDate.toISOString().split('T')[0],
      isCurrentMonth: true,
      isToday: isCurrentMonthAndYear && today.getDate() === i
    })
  }
  
  // Add next month's days to complete the calendar grid
  const totalDaysNeeded = 42 // 6 rows of 7 days
  while (days.length < totalDaysNeeded) {
    const nextDate = new Date(year, month, days.length - startOffset + 1)
    days.push({
      date: nextDate.getDate(),
      fullDate: nextDate.toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  calendarDays.value = days
}

// Initialize calendar days on component load
updateCalendarDays()

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
  if (currentAnimation && currentAnimation?.stop) {
    currentAnimation.stop()
    currentAnimation = null
  }

  await nextTick() // Wait for DOM update
  if (!dialogRef.value) return

  if (isOpen) {
    // Entry animation
    currentAnimation = animateModalEntry(dialogRef.value)
  } else {
    // Exit animation
    currentAnimation = animateModalExit(dialogRef.value, () => {
      // Clear the animation reference once complete
      currentAnimation = null
    })
  }
})

// Dialog submission handler
const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;
  errors.value = {}; // Clear previous errors

  try {
    const { companions, ...formData } = adventureForm.value;
    
    // Always provide companion_ids even if empty
    const companionIds = companions && Array.isArray(companions)
      ? companions
          .map(companion => companion?.id)
          .filter(id => id !== null && id !== undefined)
      : [];
    
    // Ensure all required fields are included in the payload
    // The server expects: start_date, end_date, start_time, end_time, difficulty_level, walk_id
    const adventureData = await adventureStore.createAdventure({
      ...formData,
      walkId: props.walk.id,
      companion_ids: companionIds
    });

    // Show success toast message
    showToast('Adventure logged successfully!');
    
    // Emit the submit event with the adventure data
    emit('submit', adventureData);
    
    // Close the dialog after successful submission
    handleClose();
  } catch (error) {
    console.error('Adventure creation error:', error);
    
    // Set specific error messages based on error type if possible
    if (error?.cause) {
      // Handle structured validation errors
      const apiErrors = error.cause;
      
      if (apiErrors.detail && Array.isArray(apiErrors.detail)) {
        // Handle FastAPI-style validation errors
        apiErrors.detail.forEach(err => {
          const field = err.loc[err.loc.length - 1];
          errors.value[field] = err.msg;
        });
      } else if (typeof apiErrors === 'object') {
        Object.entries(apiErrors).forEach(([key, message]) => {
          errors.value[key] = Array.isArray(message) ? message[0] : message;
        });
      }
    } else {
      // Generic error fallback
      errors.value.submit = error.message || 'Failed to create adventure. Please try again.';
    }
    
    // Show error toast
    showToast('Failed to create adventure');
  } finally {
    isSubmitting.value = false;
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
  
  updateCalendarDays() // Update calendar days after changing currentDate
  
  tempDateValue.value = existingDate || null
  showDatePicker.value = true

  // Animate modal entry
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
  setToPreviousMonth(currentDate)
  updateCalendarDays()
  
  // Animate the calendar change
  const calendar = document.querySelector('.md3-calendar-grid')
  if (calendar) {
    animateCalendarChange(calendar, 'prev')
  }
}

function nextMonth() {
  // Move to next month
  setToNextMonth(currentDate)
  updateCalendarDays()
  
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
      adventureForm.value.endDate = dateString
    }
  } else if (datePickerType.value === 'end') {
    // When selecting end date, ensure it's not before start date
    if (adventureForm.value.startDate && dateString < adventureForm.value.startDate) {
      errors.value.endDate = 'End date cannot be before start date'
      setTimeout(() => {
        errors.value.endDate = null
      }, 2000)
    }
  }
}

function highlightDateRange() {
    if (datePickerType.value === 'end' && adventureForm.value.startDate && tempDateValue.value) {
    // Clear previous highlights
    document.querySelectorAll('.md3-calendar-day.in-range').forEach(el => {
      el.classList.remove('in-range')
    })

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

function confirmDateSelection() {
  if (tempDateValue.value) {
    if (datePickerType.value === 'start') {
      adventureForm.value.startDate = tempDateValue.value
      
      // If end date is before start date, update end date to match start date
      if (adventureForm.value.endDate && adventureForm.value.endDate < adventureForm.value.startDate) {
        adventureForm.value.endDate = tempDateValue.value
        showToast('End date adjusted to match start date')
      } else if (!adventureForm.value.endDate) {
        adventureForm.value.endDate = tempDateValue.value
        showToast('End date set to match start date')
      }
    } else {
      adventureForm.value.endDate = tempDateValue.value
    }

    calculateDuration()
    closeDatePicker()
  }
}

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
  const minute = parseInt(selectedMinute.value, 10)
  
  if (selectedPeriod.value === 'PM' && hour !== 12) {
    hour += 12
  } else if (selectedPeriod.value === 'AM' && hour === 12) {
    hour = 0
  }

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
          errors.value.endTime = 'End time must be after start time'
          setTimeout(() => {
            errors.value.endTime = null
          }, 2000)
          return
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
    closeTimePicker()
  }
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

  adventureDialogStore.closeDialog()

  // Animate dialog exit
  if (dialogRef.value) {
    animateModalExit(dialogRef.value, () => {
      // Reset form state
      resetForm()
    })
  } else {
    resetForm()
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
const calendarDaysCache = {}

const memoizedCalendarDays = computed(() => {
  const key = `${currentDate.value.getFullYear()}-${currentDate.value.getMonth()}`
  if (!calendarDaysCache[key]) {
    calendarDaysCache[key] = calendarDays.value
  }
  return calendarDaysCache[key]
})

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
  /* Fixed height to enable proper scrolling */
  height: 85vh;
}

.adventure-log-dialog.mobile {
  max-width: 100%;
  max-height: 98vh;
  height: 90vh;
}

/* Dialog Content */
.dialog-content {
  padding: 16px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  /* Ensure the content takes full height */
  height: 100%;
}

.form-scroll-container {
  width: 100%;
  flex: 1;
  overflow-y: auto;
  /* Ensure proper padding and spacing */
  padding: 0 24px 24px;
  /* Remove any margin to maximize space */
  margin: 0;
  /* Ensure this container grows to fill available space */
  height: 100%;
}

/* Form Styling */
.adventure-form {
  display: flex;
  flex-direction: column;
  /* Changed from height: 100% to min-height to allow content to determine size */
  min-height: 100%;
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

/* Mobile Styles */
@media (max-width: 600px) {
  .adventure-log-dialog {
    border-radius: 24px 24px 0 0;
    max-height: 100vh;
    height: 90vh;
  }

  .dialog-content {
    padding: 0;
  }

  .form-scroll-container {
    padding: 16px;
    gap: 16px;
    /* Maintain height for mobile */
    height: 100%;
  }
}
</style>
