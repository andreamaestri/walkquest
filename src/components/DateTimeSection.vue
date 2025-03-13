<template>
  <div class="datetime-section">
    <input
      type="date"
      :value="startDate"
      @input="$emit('update:startDate', $event.target.value)"
    />
    <input
      type="time"
      :value="startTime"
      @input="$emit('update:startTime', $event.target.value)"
    />
  </div>
</template>

<script setup>
defineProps({
  startDate: {
    type: String,
    default: ''
  },
  startTime: {
    type: String,
    default: ''
  }
});

defineEmits(['update:startDate', 'update:startTime']);
</script>
