import { ref } from 'vue'

export function useAdventureFormUtils() {
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

  // Validation errors
  const errors = ref({})
  const isSubmitting = ref(false)

  // Form interaction state
  const activeField = ref(null)
  
  // Difficulty levels
  const difficultyLevels = [
    { value: 'NOVICE WANDERER', label: 'Novice Wanderer', icon: 'mdi:walk' },
    { value: "GREY'S PATHFINDER", label: "Grey's Pathfinder", icon: 'mdi:hiking' },
    { value: 'TRAIL RANGER', label: 'Trail Ranger', icon: 'mdi:trail-sign' },
    { value: "WARDEN'S ASCENT", label: "Warden's Ascent", icon: 'mdi:mountain' },
    { value: 'MASTER WAYFARER', label: 'Master Wayfarer', icon: 'mdi:mountain-peak' }
  ]

  // Available categories
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

  // Form validation
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

  // Category management
  const toggleCategory = (slug) => {
    const index = form.value.categories.indexOf(slug)
    if (index === -1) {
      form.value.categories.push(slug)
    } else {
      form.value.categories.splice(index, 1)
    }
  }

  // Reset form
  const resetForm = () => {
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
  }

  return {
    form,
    errors,
    isSubmitting,
    activeField,
    difficultyLevels,
    availableCategories,
    validateForm,
    toggleCategory,
    resetForm
  }
}