<template>
  <div class="adventure-log-dialog">
    <DateTimeSection
      v-model:start-date="dateTimeData.startDate"
      v-model:start-time="dateTimeData.startTime"
      v-model:end-date="dateTimeData.endDate"
      v-model:end-time="dateTimeData.endTime"
      :errors="formErrors"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DateTimeSection from './DateTimeSection.vue';
import { useStore } from 'vuex';
import { watchEffect, onMounted } from 'vue';

// Manage the visibility of the dialog
const store = useStore();
const visible = ref(false);
const openDialog = (payload) => {
  // Assign the data payload and open the dialog
  if (payload) {
    dateTimeData.value.startDate = payload.startDate || '';
    dateTimeData.value.startTime = payload.startTime || '';
    dateTimeData.value.endDate = payload.endDate || '';
    dateTimeData.value.endTime = payload.endTime || '';
    visible.value = true;
  }
};

// Close the dialog when the related route changes
const closeOnRoute = (to, from) => {
  if (from.name === 'AdventureLog') {
    store.dispatch('changeDialogVisibility', {
      dialog: 'AdventureLogDialog',
      visible: false
    });
  }
};
onMounted(() => {
  watchEffect(() => {
    visible.value = store.getters['adventureLog/visible'];
  });
});
watchEffect(() => {
  closeOnRoute(store.currentRoute, store.previousRoute);
});

// Bind date/time info to the dialog
const dateTimeData = ref({
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: ''
});

const formErrors = ref({});
const errorsTimer = ref(null);
const resetFormErrors = () => {
  formErrors.value = {};
  clearTimeout(errorsTimer.value);
  errorsTimer.value = setTimeout(() => {
    formErrors.value = {};
  }, 2500);
};

const animateDrawerElement = (element) => {
  // Add animation logic here if needed
  // For now, just a stub to prevent errors
};

export {
  openDialog,
  resetFormErrors,
  resetFormTimer,
  animateDrawerElement
};
</script>
