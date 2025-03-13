<template>
  <div class="datetime-section">
    <input
      type="date"
      :value="modelValue.startDate"
      @input="$emit('update:modelValue', { ...modelValue, startDate: $event.target.value })"
    />
    <input
      type="time"
      :value="modelValue.startTime"
      @input="$emit('update:modelValue', { ...modelValue, startTime: $event.target.value })"
    />
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      startDate: '',
      startTime: ''
    })
  }
});

defineEmits(['update:modelValue']);
</script>
