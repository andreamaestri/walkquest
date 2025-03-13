<template>
  <div class="adventure-log-dialog-container" @click.self="close">
    <div 
      class="adventure-log-dialog" 
      ref="dialogRef"
      @click.stop
    >
      <!-- Dialog Header -->
      <DialogHeader 
        title="Log an Adventure" 
        @close="close" 
      />
      
      <form @submit.prevent="submitForm" class="adventure-form">
        <div class="adventure-form-body">
          <!-- Title and Description Fields -->
          <AdventureFormFields 
            v-model:title="formData.title"
            v-model:description="formData.description"
            v-model:active-field="activeField"
            :errors="formErrors"
          />
          
          <!-- Date/Time Section -->
          <DateTimeSection
            :model-value="{ 
              startDate: formData.startDate, 
              startTime: formData.startTime, 
              endDate: formData.endDate, 
              endTime: formData.endTime 
            }"
            :errors="formErrors"
            @open-date-picker="openDatePicker"
            @open-time-picker="openTimePicker"
          />
          
          <!-- Difficulty Selection -->
          <DifficultySelector
            v-model="formData.difficulty"
            :difficulty-levels="difficultyLevels"
            :errors="difficultyError"
          />
          
          <!-- Category Selection -->
          <CategorySelector
            v-model="formData.categories"
            :available-categories="availableCategories"
            :errors="categoriesError"
          />
        </div>
        
        <!-- Form Action Buttons -->
        <FormActionButtons
          :is-submitting="isSubmitting"
          @cancel="close"
        />
      </form>
      
      <!-- Toast Notification -->
      <Transition name="fade">
        <Toast v-if="toastMessage" :message="toastMessage" />
      </Transition>
      
      <!-- Date Picker Modal -->
      <Transition name="fade">
        <DatePickerModal
          v-if="showDatePicker"
          :type="datePickerType"
          :selected-date="getSelectedDate()"
          :start-date="formData.startDate"
          :end-date="formData.endDate"
          @close="showDatePicker = false"
          @confirm="confirmDateSelection"
          @select-date="tempDateValue = $event"
          @prev-month="dateTimeUtils.setToPreviousMonth"
          @next-month="dateTimeUtils.setToNextMonth"
        />
      </Transition>
      
      <!-- Time Picker Modal -->
      <Transition name="fade">
        <TimePickerModal
          v-if="showTimePicker"
          :type="timePickerType"
          :hour="selectedHour"
          :minute="selectedMinute"
          :period="selectedPeriod"
          :current-time="getSelectedTime()"
          @close="showTimePicker = false"
          @confirm="confirmTimeSelection"
          @adjust-hour="adjustHour"
          @adjust-minute="adjustMinute"
          @update:period="selectedPeriod = $event"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useDateTimeUtils } from '../composables/useDateTimeUtils'
import { useAnimations } from '../composables/useAnimations'

// Import extracted components
import DialogHeader from './shared/dialog/DialogHeader.vue'
import AdventureFormFields from './shared/dialog/AdventureFormFields.vue'
import DateTimeSection from './shared/dialog/DateTimeSection.vue'
import DifficultySelector from './shared/dialog/DifficultySelector.vue'
import CategorySelector from './shared/dialog/CategorySelector.vue'
import FormActionButtons from './shared/dialog/FormActionButtons.vue'
import Toast from './shared/dialog/Toast.vue'
import DatePickerModal from './shared/dialog/DatePickerModal.vue'
import TimePickerModal from './shared/dialog/TimePickerModal.vue'

// Props and emits
const props = defineProps({
  adventureData: {
    type: Object,
    default: () => ({})
  },
  availableCategories: {
    type: Array,
    default: () => ([])
  },
})

const emit = defineEmits(['close', 'submit'])

// Composables
const dateTimeUtils = useDateTimeUtils()
const { 
  animateModalEntry, 
  animateModalExit,
  animateDrawerElement,
} = useAnimations()

// Form state
const formData = ref({
  title: props.adventureData.title || '',
  description: props.adventureData.description || '',
  startDate: props.adventureData.startDate || '',
  startTime: props.adventureData.startTime || '',
  endDate: props.adventureData.endDate || '',
  endTime: props.adventureData.endTime || '',
  difficulty: props.adventureData.difficulty || '',
  categories: props.adventureData.categories || []
})

// UI state
const dialogRef = ref(null)
const activeField = ref(null)
const isSubmitting = ref(false)
const toastMessage = ref('')
const formErrors = ref({})

// Date/Time picker state
const showDatePicker = ref(false)
const datePickerType = ref('start')
const tempDateValue = ref(null)

const showTimePicker = ref(false)
const timePickerType = ref('start')
const selectedHour = ref('12')
const selectedMinute = ref('00')
const selectedPeriod = ref('AM')
const tempTimeValue = ref(null)

// Options for difficulty selection
const difficultyLevels = [
  { value: 'easy', label: 'Easy', icon: 'mdi:hiking' },
  { value: 'moderate', label: 'Moderate', icon: 'mdi:run' },
  { value: 'difficult', label: 'Difficult', icon: 'mdi:mountain' },
  { value: 'very_difficult', label: 'Very Difficult', icon: 'mdi:elevation-rise' }
]

// Computed errors for validation feedback
const difficultyError = computed(() => formErrors.value.difficulty || '')
const categoriesError = computed(() => formErrors.value.categories || '')

// ----- Methods -----

// Dialog lifecycle
onMounted(() => {
  // Animate dialog entry
  if (dialogRef.value) {
    animateModalEntry(dialogRef.value, { duration: 300 })
  }
})

function close() {
  if (dialogRef.value) {
    const animation = animateModalExit(dialogRef.value)
    animation.finished.then(() => {
      emit('close')
    })
  } else {
    emit('close')
  }
}

// Date picker methods
function openDatePicker(type) {
  datePickerType.value = type
  tempDateValue.value = null
  showDatePicker.value = true
}

function getSelectedDate() {
  return datePickerType.value === 'start' ? formData.value.startDate : formData.value.endDate
}

function confirmDateSelection() {
  if (tempDateValue.value) {
    if (datePickerType.value === 'start') {
      formData.value.startDate = tempDateValue.value
      
      // If end date is before start date, update it
      if (formData.value.endDate && formData.value.endDate < tempDateValue.value) {
        formData.value.endDate = tempDateValue.value
      }
      
      formErrors.value.startDate = null
    } else {
      formData.value.endDate = tempDateValue.value
      formErrors.value.endDate = null
    }
  }
  
  showDatePicker.value = false
}

// Time picker methods
function openTimePicker(type) {
  timePickerType.value = type
  tempTimeValue.value = null
  
  // Initialize time picker with current values
  const currentTime = timePickerType.value === 'start' ? formData.value.startTime : formData.value.endTime
  
  if (currentTime) {
    const [hours, minutes] = currentTime.split(':').map(Number)
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
}

function getSelectedTime() {
  return timePickerType.value === 'start' ? formData.value.startTime : formData.value.endTime
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
      formData.value.startTime = tempTimeValue.value
      formErrors.value.startTime = null
    } else {
      formData.value.endTime = tempTimeValue.value
      formErrors.value.endTime = null
    }
  }
  
  showTimePicker.value = false
}

// Form submission
function validateForm() {
  const errors = {}
  
  if (!formData.value.title.trim()) {
    errors.title = 'Title is required'
  } else if (formData.value.title.length > 100) {
    errors.title = 'Title must be less than 100 characters'
  }
  
  if (formData.value.description.length > 500) {
    errors.description = 'Description must be less than 500 characters'
  }
  
  if (!formData.value.startDate) {
    errors.startDate = 'Start date is required'
  }
  
  if (formData.value.endDate && formData.value.endDate < formData.value.startDate) {
    errors.endDate = 'End date must be after start date'
  }
  
  // Validate start/end times if both dates are the same
  if (formData.value.startDate && 
      formData.value.endDate && 
      formData.value.startDate === formData.value.endDate && 
      formData.value.startTime && 
      formData.value.endTime) {
    if (formData.value.endTime <= formData.value.startTime) {
      errors.endTime = 'End time must be after start time'
    }
  }
  
  if (!formData.value.difficulty) {
    errors.difficulty = 'Please select a difficulty level'
  }
  
  if (!formData.value.categories.length) {
    errors.categories = 'Please select at least one category'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitForm() {
  if (!validateForm()) {
    showToast('Please fix the errors in the form')
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('submit', { ...formData.value })
    showToast('Adventure logged successfully!')
    
    // Reset form after successful submission if needed
    // resetForm()
    
    // Close dialog after a short delay to show toast
    setTimeout(() => {
      close()
    }, 1500)
  } catch (error) {
    showToast('Error logging adventure. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

function showToast(message) {
  toastMessage.value = message
  
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.adventure-log-dialog-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  padding: 16px;
}

.adventure-log-dialog {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 768px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-3);
  will-change: transform, opacity;
}

.adventure-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.adventure-form-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile Adaptations */
@media (max-width: 600px) {
  .adventure-log-dialog-container {
    padding: 0;
  }
  
  .adventure-log-dialog {
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }
  
  .adventure-form-body {
    padding: 16px;
  }
}
</style>