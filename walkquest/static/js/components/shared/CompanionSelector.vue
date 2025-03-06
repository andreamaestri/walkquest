<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="m3-label-large text-[rgb(var(--md-sys-color-on-surface))]">
        Companions
      </label>
      <button
        type="button"
        class="m3-button m3-text-button text-sm"
        @click="showNewCompanionInput"
        v-if="!isAddingNew"
      >
        Add New
      </button>
    </div>

    <!-- New companion input -->
    <div v-if="isAddingNew" class="flex gap-2">
      <input
        v-model="newCompanionName"
        type="text"
        class="flex-1 px-4 py-2 bg-[rgb(var(--md-sys-color-surface-container))] border border-[rgb(var(--md-sys-color-outline))] rounded-md focus:outline-none focus:border-[rgb(var(--md-sys-color-primary))] focus:ring-2 focus:ring-[rgb(var(--md-sys-color-primary))/0.2]"
        placeholder="Companion name"
        @keyup.enter="saveNewCompanion"
      />
      <button
        type="button"
        class="m3-button m3-tonal-button"
        @click="saveNewCompanion"
      >
        Add
      </button>
      <button
        type="button"
        class="m3-button m3-text-button"
        @click="cancelNewCompanion"
      >
        Cancel
      </button>
    </div>

    <!-- Selected companions list -->
    <div class="flex flex-wrap gap-2">
      <div 
        v-for="companion in companionsStore.userCompanions" 
        :key="companion.id"
        class="flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-200"
        :class="[
          isSelected(companion)
            ? 'bg-[rgb(var(--md-sys-color-secondary-container))] text-[rgb(var(--md-sys-color-on-secondary-container))]'
            : 'bg-[rgb(var(--md-sys-color-surface-container))] text-[rgb(var(--md-sys-color-on-surface))] hover:bg-[rgb(var(--md-sys-color-surface-container-highest))]'
        ]"
        @click="toggleCompanion(companion)"
      >
        <span>{{ companion.name }}</span>
        <button 
          v-if="isSelected(companion)"
          type="button"
          class="p-1 rounded-full hover:bg-[rgb(var(--md-sys-color-on-secondary-container))/0.12]"
          @click.stop="removeCompanion(companion)"
        >
          <Icon icon="mdi:close" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useCompanionsStore } from '../../stores/companions'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const companionsStore = useCompanionsStore()
const isAddingNew = ref(false)
const newCompanionName = ref('')

onMounted(async () => {
  await companionsStore.fetchUserCompanions()
})

function showNewCompanionInput() {
  isAddingNew.value = true
  newCompanionName.value = ''
}

async function saveNewCompanion() {
  if (!newCompanionName.value.trim()) return

  try {
    const newCompanion = await companionsStore.addCompanion(newCompanionName.value)
    emit('update:modelValue', [...props.modelValue, newCompanion.id])
    isAddingNew.value = false
  } catch (error) {
    console.error('Failed to add companion:', error)
  }
}

function cancelNewCompanion() {
  isAddingNew.value = false
  newCompanionName.value = ''
}

function isSelected(companion) {
  return props.modelValue.includes(companion.id)
}

function toggleCompanion(companion) {
  const newValue = isSelected(companion)
    ? props.modelValue.filter(id => id !== companion.id)
    : [...props.modelValue, companion.id]
  emit('update:modelValue', newValue)
}

function removeCompanion(companion) {
  emit('update:modelValue', props.modelValue.filter(id => id !== companion.id))
}
</script>
