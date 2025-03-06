[Previous template content remains the same until the script section]

<script setup>
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { animate } from 'motion'
import { useAdventureStore } from '../../stores/adventure'
import { useUiStore } from '../../stores/ui'
import CompanionSelector from './CompanionSelector.vue'
import { useAdventureDialogStore } from '../../stores/adventureDialog'

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

const isOpen = computed(() => adventureDialogStore.isOpen)
const isMobile = computed(() => uiStore.isMobile)
const dialogRef = ref(null)
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
    currentAnimation = animate(
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
    currentAnimation = animate(
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

// Form state
const form = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  difficultyLevel: '',
  categories: [],
  companions: []
})

const errors = ref({})
const isSubmitting = ref(false)

// Computed
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

// Difficulty levels
const difficultyLevels = [
  { value: 'NOVICE WANDERER', label: 'Novice Wanderer', icon: 'mdi:walk' },
  { value: "GREY'S PATHFINDER", label: "Grey's Pathfinder", icon: 'mdi:hiking' },
  { value: 'TRAIL RANGER', label: 'Trail Ranger', icon: 'mdi:trail-sign' },
  { value: "WARDEN'S ASCENT", label: "Warden's Ascent", icon: 'mdi:mountain' },
  { value: 'MASTER WAYFARER', label: 'Master Wayfarer', icon: 'mdi:mountain-peak' }
]

// Available categories (would come from a store in real implementation)
const availableCategories = [
  { slug: 'circular', name: 'Circular walks' },
  { slug: 'coastal', name: 'Coastal walks' },
  { slug: 'pub', name: 'Pub walks' },
  { slug: 'beach', name: 'Walks with a beach' },
  { slug: 'cafe', name: 'Walks with a café' },
  { slug: 'fishing', name: 'Walks with a fishing village' },
  { slug: 'lighthouse', name: 'Walks with a lighthouse' },
  { slug: 'shipwreck', name: 'Walks with a shipwreck' }
]

// Methods
const validateForm = () => {
  const newErrors = {}

  if (!form.value.title.trim()) {
    newErrors.title = 'Title is required'
  }

  if (!form.value.description.trim()) {
    newErrors.description = 'Description is required'
  } else if (form.value.description.length > 500) {
    newErrors.description = 'Description must be less than 500 characters'
  }

  if (!form.value.startDate) {
    newErrors.startDate = 'Start date is required'
  }

  if (!form.value.endDate) {
    newErrors.endDate = 'End date is required'
  } else if (form.value.endDate < form.value.startDate) {
    newErrors.endDate = 'End date must be after start date'
  }

  if (form.value.startTime && !form.value.endTime) {
    newErrors.endTime = 'End time is required when start time is set'
  }

  if (form.value.endTime && !form.value.startTime) {
    newErrors.startTime = 'Start time is required when end time is set'
  }

  if (form.value.startTime && form.value.endTime && form.value.startDate === form.value.endDate) {
    if (form.value.endTime <= form.value.startTime) {
      newErrors.endTime = 'End time must be after start time'
    }
  }

  if (!form.value.difficultyLevel) {
    newErrors.difficultyLevel = 'Difficulty level is required'
  }

  if (form.value.categories.length === 0) {
    newErrors.categories = 'At least one category is required'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  errors.value = {} // Clear previous errors
  
  try {
    const { companions, ...formData } = form.value
    const adventureData = await adventureStore.createAdventure({
      ...formData,
      walkId: props.walk.id,
      companion_ids: companions
    })
    emit('submit', adventureData)
    handleClose()
  } catch (error) {
    console.error('Failed to create adventure:', error)
    
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

const toggleCategory = (slug) => {
  const index = form.value.categories.indexOf(slug)
  if (index === -1) {
    form.value.categories.push(slug)
  } else {
    form.value.categories.splice(index, 1)
  }
}

const handleScrimClick = (event) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

const handleClose = () => {
  form.value = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    difficultyLevel: '',
    categories: [],
    companions: []
  }
  errors.value = {}
  adventureDialogStore.closeDialog()
}
</script>

[Previous style section remains the same]
