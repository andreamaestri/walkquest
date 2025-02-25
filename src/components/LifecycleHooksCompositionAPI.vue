<template>
  <div>
    {{ message }}
    <button @click="updateMessage">Update Message</button>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onMounted, onBeforeUpdate, onUpdated, 
         onBeforeUnmount, onUnmounted, onErrorCaptured, 
         onActivated, onDeactivated, onServerPrefetch } from 'vue';

// Data (reactive state)
const message = ref('Hello, Vue!');
let timer = null;

// Creation phase hooks don't exist in Composition API
// The code at the top level of <script setup> replaces beforeCreate/created hooks

// Lifecycle Hooks
onBeforeMount(() => {
  console.log('Before Mount Hook: Component is about to render to the DOM.');
  // Last chance to modify data before first render
});

onMounted(() => {
  console.log('Mounted Hook: Component has been rendered to the DOM.');
  // Excellent place to interact with the DOM or make API calls
  timer = setTimeout(() => {
    message.value = 'Data fetched from an API';
  }, 2000);
});

onBeforeUpdate(() => {
  console.log('Before Update Hook: Component is about to re-render due to data changes.');
  // Access the current DOM state before update
});

onUpdated(() => {
  console.log('Updated Hook: Component has re-rendered due to data changes.');
  // Operate on the DOM after update
  // Be careful to avoid infinite update loops
});

onBeforeUnmount(() => {
  console.log('Before Unmount Hook: Component is about to be removed from the DOM.');
  // Clean up resources (event listeners, timers, etc.)
  clearTimeout(timer);
});

onUnmounted(() => {
  console.log('Unmounted Hook: Component has been removed from the DOM.');
  // Final cleanup if needed
});

onErrorCaptured((err, instance, info) => {
  console.error('Error Captured Hook:', err, instance, info);
  // Handle component errors
  // Return false to prevent error propagation
  return false;
});

onActivated(() => {
  console.log('Activated Hook: Component inside <keep-alive> is activated.');
});

onDeactivated(() => {
  console.log('Deactivated Hook: Component inside <keep-alive> is deactivated.');
});

onServerPrefetch(async () => {
  // Used for server-side rendering data fetching
  await fetchDataFromAPI();
});

// Methods
function updateMessage() {
  message.value = 'Updated message';
}

function fetchDataFromAPI() {
  // API call implementation
  return Promise.resolve();
}
</script>