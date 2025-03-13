<template>
  <div class="datetime-section">
    <!-- Start Date/Time -->
    <div class="field-group">
      <input
        type="date"
        :value="startDate"
        @input="$emit('update:startDate', $event.target.value)"
        :class="{ error: errors?.startDate }"
      />
      <input
        type="time"
        :value="startTime"
        @input="$emit('update:startTime', $event.target.value)"
        :class="{ error: errors?.startTime }"
      />
    </div>

    <!-- End Date/Time -->
    <div class="field-group">
      <input
        type="date"
        :value="endDate"
        @input="$emit('update:endDate', $event.target.value)"
        :class="{ error: errors?.endDate }"
      />
      <input
        type="time"
        :value="endTime"
        @input="$emit('update:endTime', $event.target.value)"
        :class="{ error: errors?.endTime }"
      />
    </div>
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
  },
  endDate: {
    type: String,
    default: ''
  },
  endTime: {
    type: String,
    default: ''
  },
  errors: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['update:startDate', 'update:startTime', 'update:endDate', 'update:endTime']);
</script>

<style scoped>
.datetime-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  gap: 0.5rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

input.error {
  border-color: rgb(var(--md-sys-color-error, #dc2626));
}
</style>
