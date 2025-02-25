<template>
  <div>
    {{ message }}
    <button @click="updateMessage">Update Message</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello, Vue!',
      timer: null
    };
  },
  
  // Creation Phase
  beforeCreate() {
    console.log('Before Create Hook: Component is about to be initialized.');
    // Don't access this.$data or this.$el here - they don't exist yet
  },
  
  created() {
    console.log('Created Hook: Component instance has been created.');
    // Good place for API calls, initializing data
    // this.fetchDataFromAPI();
  },
  
  // Mounting Phase
  beforeMount() {
    console.log('Before Mount Hook: Component is about to render to the DOM.');
    // Last chance to modify data before first render
  },
  
  mounted() {
    console.log('Mounted Hook: Component has been rendered to the DOM.');
    // Excellent place to interact with the DOM, set up third-party libraries
    // or make API calls that require DOM to be ready
    this.timer = setTimeout(() => {
      this.message = 'Data fetched from an API';
    }, 2000);
  },
  
  // Updating Phase
  beforeUpdate() {
    console.log('Before Update Hook: Component is about to re-render due to data changes.');
    // Access the current DOM state before update
  },
  
  updated() {
    console.log('Updated Hook: Component has re-rendered due to data changes.');
    // Operate on the DOM after update
    // Be careful to avoid infinite update loops
  },
  
  // Destruction Phase (Vue 3 renamed these hooks)
  beforeUnmount() {
    console.log('Before Unmount Hook: Component is about to be removed from the DOM.');
    // Clean up resources (event listeners, timers, etc.)
    clearTimeout(this.timer);
  },
  
  unmounted() {
    console.log('Unmounted Hook: Component has been removed from the DOM.');
    // Final cleanup if needed
  },
  
  // Error Handling
  errorCaptured(err, instance, info) {
    console.error('Error Captured Hook:', err, instance, info);
    // Handle component errors
    // Return false to prevent error propagation
    return false;
  },
  
  // Vue 3 Specific Hooks
  activated() {
    console.log('Activated Hook: Component inside <keep-alive> is activated.');
  },
  
  deactivated() {
    console.log('Deactivated Hook: Component inside <keep-alive> is deactivated.');
  },
  
  // For server-side rendering
  serverPrefetch() {
    // Used for server-side rendering data fetching
    return this.fetchDataFromAPI();
  },
  
  methods: {
    updateMessage() {
      this.message = 'Updated message';
    },
    
    fetchDataFromAPI() {
      // API call implementation
      return Promise.resolve();
    }
  }
};
</script>