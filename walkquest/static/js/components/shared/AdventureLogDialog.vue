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
          <div class="dialog-header">
            <h2 class="dialog-title">Log an Adventure</h2>
            <button class="close-button" @click="handleClose">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <!-- Dialog Content -->
          <div class="dialog-content">
            <!-- Toast Notification -->
            <Transition name="fade">
              <div v-if="isToastVisible" class="md3-toast">
                {{ toastMessage }}
              </div>
            </Transition>
            
            <form @submit.prevent="handleSubmit" class="adventure-form">
              <div class="form-scroll-container">
                <!-- Title Field with floating label -->
                <div class="md3-field-container">
                  <div class="md3-text-field" :class="{ 'focused': activeField === 'title', 'filled': adventureForm.title, 'error': errors.title }">
                    <input 
                      id="title"
                      v-model="adventureForm.title" 
                      type="text" 
                      class="md3-input"
                      @focus="activeField = 'title'"
                      @blur="activeField = null"
                      placeholder=" "
                    />
                    <label for="title" class="md3-label">Adventure Title</label>
                    <div class="md3-outline"></div>
                  </div>
                  <div v-if="errors.title" class="md3-error-message">{{ errors.title }}</div>
                </div>

                <!-- Description Field -->
                <div class="md3-field-container">
                  <div class="md3-text-field md3-textarea" :class="{ 'focused': activeField === 'description', 'filled': adventureForm.description, 'error': errors.description }">
                    <textarea 
                      id="description"
                      v-model="adventureForm.description" 
                      rows="3"
                      class="md3-input"
                      @focus="activeField = 'description'"
                      @blur="activeField = null"
                      placeholder=" "
                    ></textarea>
                    <label for="description" class="md3-label">Adventure Description</label>
                    <div class="md3-outline"></div>
                  </div>
                  <div class="md3-text-field-details">
                    <div v-if="errors.description" class="md3-error-message">{{ errors.description }}</div>
                    <div class="md3-char-counter" :class="{ 'error': adventureForm.description.length > 500 }">
                      {{ adventureForm.description.length }}/500
                    </div>
                  </div>
                </div>

                <!-- Date Selector Section -->
                <div class="md3-section">
                  <div class="md3-section-header">
                    <Icon icon="mdi:calendar" class="md3-section-icon" />
                    <h3 class="md3-section-title">When was your adventure?</h3>
                  </div>
                  
                  <div class="md3-date-pickers">
                    <!-- Start Date Picker -->
                    <div class="md3-field-container md3-date-field">
                      <div class="md3-date-label">Start</div>
                      <button 
                        type="button"
                        class="md3-date-button" 
                        :class="{ 'error': errors.startDate }"
                        @click="openDatePicker('start')"
                      >
                        <Icon icon="mdi:calendar" class="md3-date-icon" />
                        <span v-if="adventureForm.startDate">{{ formatDateForDisplay(adventureForm.startDate) }}</span>
                        <span v-else class="md3-placeholder-text">Select date</span>
                      </button>
                      <div v-if="errors.startDate" class="md3-error-message">{{ errors.startDate }}</div>
                      
                      <!-- Start Time -->
                      <div class="md3-time-field">
                        <button 
                          type="button"
                          class="md3-time-button" 
                          :class="{ 'error': errors.startTime, 'filled': adventureForm.startTime }"
                          @click="openTimePicker('start')"
                        >
                          <Icon icon="mdi:clock-outline" class="md3-time-icon" />
                          <span v-if="adventureForm.startTime">{{ formatTimeForDisplay(adventureForm.startTime) }}</span>
                          <span v-else class="md3-placeholder-text">Add time</span>
                        </button>
                        <div v-if="errors.startTime" class="md3-error-message">{{ errors.startTime }}</div>
                      </div>
                    </div>
                    
                    <!-- End Date Picker -->
                    <div class="md3-field-container md3-date-field">
                      <div class="md3-date-label">End</div>
                      <button 
                        type="button"
                        class="md3-date-button" 
                        :class="{ 'error': errors.endDate }"
                        @click="openDatePicker('end')"
                      >
                        <Icon icon="mdi:calendar" class="md3-date-icon" />
                        <span v-if="adventureForm.endDate">{{ formatDateForDisplay(adventureForm.endDate) }}</span>
                        <span v-else class="md3-placeholder-text">Select date</span>
                      </button>
                      <div v-if="errors.endDate" class="md3-error-message">{{ errors.endDate }}</div>
                      
                      <!-- End Time -->
                      <div class="md3-time-field">
                        <button 
                          type="button"
                          class="md3-time-button" 
                          :class="{ 'error': errors.endTime, 'filled': adventureForm.endTime }"
                          @click="openTimePicker('end')"
                        >
                          <Icon icon="mdi:clock-outline" class="md3-time-icon" />
                          <span v-if="adventureForm.endTime">{{ formatTimeForDisplay(adventureForm.endTime) }}</span>
                          <span v-else class="md3-placeholder-text">Add time</span>
                        </button>
                        <div v-if="errors.endTime" class="md3-error-message">{{ errors.endTime }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Difficulty Level Section -->
                <div class="md3-section">
                  <div class="md3-section-header">
                    <Icon icon="mdi:terrain" class="md3-section-icon" />
                    <h3 class="md3-section-title">How challenging was your trek?</h3>
                  </div>
                  
                  <div class="md3-difficulty-options">
                    <div 
                      v-for="level in difficultyLevels" 
                      :key="level.value"
                      class="md3-difficulty-card"
                      :class="{ 'selected': adventureForm.difficultyLevel === level.value }"
                      @click="selectDifficultyLevel(level.value)"
                    >
                      <div class="md3-difficulty-icon-container">
                        <Icon :icon="level.icon" class="md3-difficulty-icon" />
                      </div>
                      <div class="md3-difficulty-label">{{ level.label }}</div>
                      <div class="md3-selection-indicator"></div>
                    </div>
                  </div>
                  <div v-if="errors.difficultyLevel" class="md3-error-message">{{ errors.difficultyLevel }}</div>
                </div>

                <!-- Categories Section -->
                <div class="md3-section">
                  <div class="md3-section-header">
                    <Icon icon="mdi:tag-multiple" class="md3-section-icon" />
                    <h3 class="md3-section-title">What categories best describe it?</h3>
                  </div>
                  
                  <div class="md3-categories-container">
                    <div 
                      v-for="category in availableCategories" 
                      :key="category.slug"
                      class="md3-category-chip"
                      :class="{ 'selected': adventureForm.categories.includes(category.slug) }"
                      :data-slug="category.slug"
                      @click="toggleCategoryWithAnimation(category.slug)"
                    >
                      <span class="md3-category-text">{{ category.name }}</span>
                      <Icon v-if="adventureForm.categories.includes(category.slug)" icon="mdi:check" class="md3-category-check" />
                    </div>
                  </div>
                  <div v-if="errors.categories" class="md3-error-message">{{ errors.categories }}</div>
                </div>

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
              <div class="md3-form-actions">
                <button 
                  type="button" 
                  class="md3-button md3-text-button" 
                  @click="handleClose"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="md3-button md3-filled-button"
                  :disabled="isSubmitting"
                >
                  <span v-if="isSubmitting" class="md3-button-spinner">
                    <Icon icon="mdi:loading" class="spinner-icon" />
                  </span>
                  <span v-else>Log Adventure</span>
                </button>
              </div>
            </form>
            
            <!-- Date Picker Modal -->
            <Transition name="slide-up">
              <div v-if="showDatePicker" class="md3-date-picker-modal" @click.self="closeDatePicker">
                <div class="md3-date-picker-container" ref="datePickerRef">
                  <div class="md3-date-picker-header">
                    <h3>{{ datePickerType === 'start' ? 'Start Date' : 'End Date' }}</h3>
                    <button type="button" class="md3-close-button" @click="closeDatePicker">
                      <Icon icon="mdi:close" />
                    </button>
                  </div>
                  
                  <div class="md3-date-picker-calendar">
                    <!-- We'll simulate a calendar here - in a real app, you'd use a date picker library -->
                    <div class="md3-date-picker-month-selector">
                      <button class="md3-month-nav-button" @click="prevMonth">
                        <Icon icon="mdi:chevron-left" />
                      </button>
                      <div class="md3-current-month">{{ currentMonthLabel }}</div>
                      <button class="md3-month-nav-button" @click="nextMonth">
                        <Icon icon="mdi:chevron-right" />
                      </button>
                    </div>
                    
                    <div class="md3-calendar-grid">
                      <div v-for="day in weekDays" :key="day" class="md3-calendar-weekday">{{ day }}</div>
                      <div 
                        v-for="date in memoizedCalendarDays" 
                        :key="date.iso"
                        class="md3-calendar-day"
                        :class="{
                          'inactive': !date.currentMonth,
                          'today': date.isToday,
                          'selected': date.iso === (datePickerType === 'start' ? adventureForm.startDate : adventureForm.endDate)
                        }"
                        :data-date="date.iso"
                        @click="selectDate(date.iso)"
                      >
                        {{ date.day }}
                      </div>
                    </div>
                  </div>
                  
                  <div class="md3-date-picker-actions">
                    <button type="button" class="md3-button md3-text-button" @click="closeDatePicker">
                      Cancel
                    </button>
                    <button type="button" class="md3-button md3-filled-button" @click="confirmDateSelection">
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
            
            <!-- Time Picker Modal -->
            <Transition name="slide-up">
              <div v-if="showTimePicker" class="md3-time-picker-modal" @click.self="closeTimePicker">
                <div class="md3-time-picker-container" ref="timePickerRef">
                  <div class="md3-time-picker-header">
                    <h3>{{ timePickerType === 'start' ? 'Start Time' : 'End Time' }}</h3>
                    <button type="button" class="md3-close-button" @click="closeTimePicker">
                      <Icon icon="mdi:close" />
                    </button>
                  </div>
                  
                  <div class="md3-time-picker-body">
                    <div class="md3-time-picker-display">
                      {{ formatTimeForDisplay(tempTimeValue || (timePickerType === 'start' ? adventureForm.startTime : adventureForm.endTime) || '12:00') }}
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
                    <button type="button" class="md3-button md3-text-button" @click="closeTimePicker">
                      Cancel
                    </button>
                    <button type="button" class="md3-button md3-filled-button" @click="confirmTimeSelection">
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { animate, spring } from 'motion'
import { useAdventureStore } from '../../stores/adventure'
import { useUiStore } from '../../stores/ui'
import CompanionSelector from './CompanionSelector.vue'
import { useAdventureDialogStore } from '../../stores/adventureDialog'
import { useAdventureFormUtils } from '../../composables/useAdventureFormUtils'
import { useDateTimeUtils } from '../../composables/useDateTimeUtils'
import { useAnimations } from '../../composables/useAnimations'

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
  toggleCategory, 
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
  animateSelection,
  animateModalEntry,
  animateModalExit,
  animateCalendarChange,
  animateTimeUnitChange,
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

// Ensure animations are stopped when component unmounts
onUnmounted(() => {
  if (currentAnimation) {
    currentAnimation.stop()
    currentAnimation = null
  }
})

// Computed 
const today = computed(() => getToday())

// Methods

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


// Interactive components functionality
function selectDifficultyLevel(level) {
  // Animate the selection
  adventureForm.value.difficultyLevel = level
  
  // Find the selected element and animate it
  nextTick(() => {
    const element = document.querySelector(`.md3-difficulty-card.selected`)
    if (element) {
      animateDrawerElement(element, { 
        scale: [1, 1.05, 1],
        backgroundColor: [
          'rgb(var(--md-sys-color-surface-container))',
          'rgb(var(--md-sys-color-primary-container))'
        ]
      }, { duration: 0.3, easing: [0.2, 0, 0, 1] })
    }
  })
}

function toggleCategoryWithAnimation(slug) {
  const index = adventureForm.value.categories.indexOf(slug)
  const wasSelected = index !== -1
  
  // Update the data
  localToggleCategory(slug)
  
  // Animate the chip
  nextTick(() => {
    const chip = document.querySelector(`.md3-category-chip[data-slug="${slug}"]`)
    if (chip) {
      animateSelection(chip, wasSelected)
    }
  })
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
    if (datePickerRef.value) {
      animateModalEntry(datePickerRef.value)
    }
  })
}

function closeDatePicker() {
  // Animate the modal exit
  if (datePickerRef.value) {
    animateModalExit(datePickerRef.value, () => {
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
  
  // Animate the day selection
  const selectedDay = document.querySelector(`.md3-calendar-day[data-date="${dateString}"]`)
  if (selectedDay) {
    animateDrawerElement(selectedDay, {
      scale: [1, 1.1, 1],
      backgroundColor: [
        'transparent',
        'rgb(var(--md-sys-color-primary-container))'
      ]
    }, {
      duration: 0.3,
      easing: spring({ stiffness: 300, damping: 30 })
    })
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
    if (timePickerRef.value) {
      animateModalEntry(timePickerRef.value)
    }
  })
}

function closeTimePicker() {
  // Animate the modal exit
  if (timePickerRef.value) {
    animateModalExit(timePickerRef.value, () => {
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
  
  // Animate the number change
  const hourElement = document.querySelector('.md3-time-unit-picker:first-child .md3-time-unit')
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
  const minuteElement = document.querySelector('.md3-time-unit-picker:nth-child(3) .md3-time-unit')
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

// Local function to toggle categories - for compatibility
const localToggleCategory = (slug) => {
  const index = adventureForm.value.categories.indexOf(slug)
  if (index === -1) {
    adventureForm.value.categories.push(slug)
  } else {
    adventureForm.value.categories.splice(index, 1)
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

// New function to format duration for display
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

// Add toast notification system
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

// Enhanced date selection with validation and suggestions
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

// Enhance time selection with validation
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

/* Dialog Header */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.1);
  background-color: rgb(var(--md-sys-color-surface-container-high));
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  letter-spacing: -0.5px;
}

.close-button {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: background-color 0.2s;
  margin-right: -8px;
}

.close-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.close-button:active {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
  transform: scale(0.95);
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

/* MD3 Text Fields */
.md3-field-container {
  margin-bottom: 8px;
}

.md3-text-field {
  position: relative;
  height: 56px;
  width: 100%;
  border-radius: 4px;
  background-color: rgb(var(--md-sys-color-surface-container));
  transition: all 0.2s;
}

.md3-text-field.md3-textarea {
  height: auto;
  min-height: 56px;
}

.md3-text-field.focused {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.md3-input {
  width: 100%;
  height: 100%;
  padding: 24px 16px 8px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface));
  outline: none;
  position: relative;
  z-index: 2;
}

.md3-textarea .md3-input {
  padding-top: 28px;
  padding-bottom: 12px;
  resize: vertical;
  min-height: 100px;
}

.md3-label {
  position: absolute;
  left: 16px;
  top: 18px;
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 1;
}

.md3-text-field.focused .md3-label,
.md3-text-field.filled .md3-label {
  transform: translateY(-10px) scale(0.75);
  transform-origin: left;
  color: rgb(var(--md-sys-color-primary));
}

.md3-text-field.error .md3-label {
  color: rgb(var(--md-sys-color-error));
}

.md3-outline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 4px;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.6);
  pointer-events: none;
  transition: all 0.2s;
}

.md3-text-field.focused .md3-outline {
  border-color: rgb(var(--md-sys-color-primary));
  border-width: 2px;
}

.md3-text-field.error .md3-outline {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-error-message {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 4px;
  margin-left: 16px;
}

.md3-text-field-details {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 16px;
}

.md3-char-counter {
  font-size: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.md3-char-counter.error {
  color: rgb(var(--md-sys-color-error));
}

/* MD3 Date and Time Pickers */
.md3-section {
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.md3-section:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.md3-section-icon {
  font-size: 24px;
  color: rgb(var(--md-sys-color-primary));
}

.md3-section-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-date-pickers {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.md3-date-field {
  flex: 1;
  min-width: 160px;
}

.md3-date-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.md3-date-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.5);
  background-color: rgb(var(--md-sys-color-surface-container));
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.md3-date-button:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-color: rgb(var(--md-sys-color-outline));
}

.md3-date-button:active {
  transform: scale(0.98);
}

.md3-date-button.error {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-date-icon {
  font-size: 20px;
  flex-shrink: 0;
  color: rgb(var(--md-sys-color-primary));
}

.md3-placeholder-text {
  color: rgb(var(--md-sys-color-on-surface-variant));
  opacity: 0.7;
}

.md3-time-field {
  margin-top: 8px;
}

.md3-time-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.3);
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.md3-time-button:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-color: rgba(var(--md-sys-color-outline), 0.5);
}

.md3-time-button.filled {
  border-color: rgba(var(--md-sys-color-outline), 0.7);
}

.md3-time-button:active {
  transform: scale(0.98);
}

.md3-time-button.error {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-time-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: rgb(var(--md-sys-color-secondary));
}

/* Difficulty Cards */
.md3-difficulty-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.md3-difficulty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-surface-container));
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
  text-align: center;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.3);
}

.md3-difficulty-card:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-difficulty-card.selected {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  border-color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-icon-container {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(var(--md-sys-color-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: all 0.25s;
}

.md3-difficulty-card.selected .md3-difficulty-icon-container {
  background-color: rgba(var(--md-sys-color-primary), 0.2);
  transform: scale(1.1);
}

.md3-difficulty-icon {
  font-size: 24px;
  color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-label {
  font-size: 14px;
  font-weight: 500;
}

.md3-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.md3-difficulty-card.selected .md3-selection-indicator {
  border-color: rgb(var(--md-sys-color-primary));
  background-color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-card.selected .md3-selection-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

/* Categories */
.md3-categories-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.md3-category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-surface-container));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.4);
  cursor: pointer;
  transition: all 0.25s;
  will-change: transform, background-color;
  position: relative;
  overflow: hidden;
}

.md3-category-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(var(--md-sys-color-primary), 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.md3-category-chip:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-1px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-category-chip:hover::before {
  opacity: 1;
}

.md3-category-chip.selected {
  background-color: rgb(var(--md-sys-color-secondary-container));
  border-color: rgb(var(--md-sys-color-secondary));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.md3-category-text {
  font-size: 14px;
}

.md3-category-check {
  font-size: 16px;
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

/* Action Buttons */
.md3-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-top: 1px solid rgba(var(--md-sys-color-outline), 0.1);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

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

.md3-filled-button:active {
  transform: scale(0.98);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-filled-button:disabled {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
  color: rgba(var(--md-sys-color-on-surface), 0.38);
  box-shadow: none;
  cursor: not-allowed;
}

.md3-text-button {
  background-color: transparent;
  color: rgb(var(--md-sys-color-primary));
}

.md3-text-button:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

.md3-text-button:active {
  transform: scale(0.98);
  background-color: rgba(var(--md-sys-color-primary), 0.12);
}

.md3-button-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

.spinner-icon {
  font-size: 18px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Date Picker Modal */
.md3-date-picker-modal,
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

.md3-date-picker-container,
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

.md3-date-picker-header,
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

.md3-date-picker-calendar {
  padding: 16px;
}

.md3-date-picker-month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.md3-current-month {
  font-size: 16px;
  font-weight: 500;
}

.md3-month-nav-button {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface));
  transition: background-color 0.2s;
}

.md3-month-nav-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
}

.md3-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.md3-calendar-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.md3-calendar-day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  width: 36px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.md3-calendar-day:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.1);
}

.md3-calendar-day.inactive {
  color: rgba(var(--md-sys-color-on-surface), 0.38);
}

.md3-calendar-day.today {
  color: rgb(var(--md-sys-color-primary));
  font-weight: 600;
}

.md3-calendar-day.selected {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.md3-calendar-day.in-range {
  background-color: rgba(var(--md-sys-color-primary), 0.15);
  color: rgb(var(--md-sys-color-on-surface));
  position: relative;
  border-radius: 0;
}

.md3-calendar-day.in-range::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, 
    rgba(var(--md-sys-color-primary), 0.05),
    rgba(var(--md-sys-color-primary), 0.2)
  );
  z-index: -1;
}

.md3-calendar-day.in-range:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.25);
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-date-picker-actions,
.md3-time-picker-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 16px;
  gap: 8px;
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

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
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
  
  .md3-date-pickers {
    flex-direction: column;
  }
  
  .md3-difficulty-options {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .md3-section {
    padding: 16px;
  }
  
  .md3-date-picker-container,
  .md3-time-picker-container {
    position: absolute;
    bottom: 0;
    border-radius: 28px 28px 0 0;
    max-width: 100%;
  }
  
  .md3-date-picker-modal,
  .md3-time-picker-modal {
    align-items: flex-end;
    padding: 0;
  }
}

/* Accessibility improvements */
.md3-date-button,
.md3-time-button,
.md3-difficulty-card,
.md3-category-chip,
.md3-calendar-day,
.md3-time-unit-button,
.md3-month-nav-button,
.close-button,
.md3-close-button,
.md3-period-button {
  position: relative;
  overflow: hidden;
}

.md3-date-button:focus-visible,
.md3-time-button:focus-visible,
.md3-difficulty-card:focus-visible,
.md3-category-chip:focus-visible,
.md3-calendar-day:focus-visible,
.md3-time-unit-button:focus-visible,
.md3-month-nav-button:focus-visible,
.close-button:focus-visible,
.md3-close-button:focus-visible,
.md3-period-button:focus-visible,
.md3-button:focus-visible {
  outline: 2px solid rgb(var(--md-sys-color-primary));
  outline-offset: 2px;
}

.md3-date-button::after,
.md3-time-button::after,
.md3-difficulty-card::after,
.md3-category-chip::after,
.md3-calendar-day::after,
.md3-time-unit-button::after,
.md3-month-nav-button::after,
.close-button::after,
.md3-close-button::after,
.md3-period-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background-color: currentColor;
  border-radius: inherit;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
}

.md3-date-button:active::after,
.md3-time-button:active::after,
.md3-difficulty-card:active::after,
.md3-category-chip:active::after,
.md3-calendar-day:active::after,
.md3-time-unit-button:active::after,
.md3-month-nav-button:active::after,
.close-button:active::after,
.md3-close-button:active::after,
.md3-period-button:active::after,
.md3-button:active::after {
  transform: translate(-50%, -50%) scale(2);
  opacity: 0.1;
}

/* Toast notification for feedback */
.md3-toast {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgb(var(--md-sys-color-inverse-surface));
  color: rgb(var(--md-sys-color-inverse-on-surface));
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: var(--md-sys-elevation-2);
  z-index: 2500;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}

.md3-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}
</style>
