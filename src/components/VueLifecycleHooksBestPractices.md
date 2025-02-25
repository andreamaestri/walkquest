# Mastering Vue.js Lifecycle Hooks: Best Practices Guide

## Overview of Vue 3 Lifecycle Hooks

Vue components go through a series of initialization steps when they are created - setting up data observation, compiling templates, mounting the instance to the DOM, and updating when data changes. Along the way, lifecycle hooks are called, giving you the opportunity to execute code at specific stages.

## Options API vs Composition API

Vue 3 supports two API styles for defining components:

1. **Options API**: The traditional way of defining Vue components using a component object with properties like `data`, `methods`, and lifecycle hooks.

2. **Composition API**: The newer approach that provides more flexible code organization and better TypeScript support.

## Lifecycle Hooks in Options API

| Hook | Description | Best Practices |
|------|-------------|----------------|
| `beforeCreate` | Called before instance initialization | Avoid using this hook in Vue 3 when possible |
| `created` | Called after instance has been initialized | Use for API calls, initializing data that doesn't depend on the DOM |
| `beforeMount` | Called before the component is mounted to the DOM | Use for last-minute reactive data adjustment |
| `mounted` | Called after the component is mounted | Use for DOM interactions, third-party library initialization |
| `beforeUpdate` | Called when data changes, before re-render | Use to access the pre-update DOM state |
| `updated` | Called after a data change causes a re-render | Use to access the updated DOM; avoid changing state here to prevent loops |
| `beforeUnmount` | Called before a component is unmounted | Use to clean up resources like timers, event listeners |
| `unmounted` | Called after a component has been unmounted | Use for final cleanup tasks |
| `errorCaptured` | Called when an error is captured from child component | Use for error handling; return false to prevent propagation |
| `activated` | Called when a component inside `<keep-alive>` is activated | Use to retrieve data that might have changed while inactive |
| `deactivated` | Called when a component inside `<keep-alive>` is deactivated | Use to save state or pause expensive operations |
| `serverPrefetch` | Called during server-side rendering | Use for server-side data fetching |

## Lifecycle Hooks in Composition API

In the Composition API, lifecycle hooks are imported functions from Vue:

| Options API | Composition API | Description |
|-------------|----------------|-------------|
| `beforeCreate` / `created` | Not needed | The code in `<script setup>` or `setup()` function runs during what would be these hooks |
| `beforeMount` | `onBeforeMount` | Called before the component is mounted to the DOM |
| `mounted` | `onMounted` | Called after the component is mounted |
| `beforeUpdate` | `onBeforeUpdate` | Called before re-rendering on data changes |
| `updated` | `onUpdated` | Called after re-rendering on data changes |
| `beforeUnmount` | `onBeforeUnmount` | Called before a component is unmounted |
| `unmounted` | `onUnmounted` | Called after a component has been unmounted |
| `errorCaptured` | `onErrorCaptured` | Called when an error is captured from child component |
| `activated` | `onActivated` | Called when a component inside `<keep-alive>` is activated |
| `deactivated` | `onDeactivated` | Called when a component inside `<keep-alive>` is deactivated |
| `serverPrefetch` | `onServerPrefetch` | Called during server-side rendering |

## Best Practices

1. **Resource Management**:
   - Always clean up resources in `beforeUnmount`/`onBeforeUnmount` that were set up in `mounted`/`onMounted`
   - Resources to clean up include: event listeners, timers, subscriptions, WebSocket connections

2. **API Calls**:
   - In Options API: Use `created` for API calls that don't need the DOM
   - In Composition API: Make API calls directly in `<script setup>` or in `setup()`
   - Use `mounted`/`onMounted` for API calls that depend on DOM elements

3. **DOM Interactions**:
   - Never access the DOM in `beforeMount`/`onBeforeMount` or earlier hooks
   - Use `mounted`/`onMounted` for all DOM interactions
   - Use `$nextTick`/`nextTick` when manipulating the DOM after state changes

4. **State Management**:
   - Avoid changing state in `updated`/`onUpdated` hooks, as this can cause infinite update loops
   - Use computed properties instead of watching data in hooks

5. **Error Handling**:
   - Return `false` in `errorCaptured`/`onErrorCaptured` to prevent error propagation
   - Always handle promise rejections in lifecycle hooks

6. **Composition API Advantages**:
   - Better code organization by feature rather than by option type
   - Better TypeScript support
   - More reusable code through composable functions

7. **Using `<KeepAlive>`**:
   - Use `activated`/`onActivated` and `deactivated`/`onDeactivated` for components wrapped in `<KeepAlive>`
   - These hooks are useful for refreshing data when a component becomes visible again

## Common Anti-Patterns to Avoid

1. **Lifecycle Hook Misuse**:
   - Using `beforeCreate` when `created` or `setup()` would be more appropriate
   - Performing DOM operations before `mounted`/`onMounted`
   - Not cleaning up resources in `beforeUnmount`/`onBeforeUnmount`

2. **Watchers vs Computed Properties**:
   - Using watchers when computed properties would be more efficient
   - Not using the immediate option in watchers when needed

3. **Update Loops**:
   - Changing reactive data in `updated`/`onUpdated` causing infinite update loops

## Example Usage Scenarios

1. **Third-Party Library Integration**:
   ```js
   // Options API
   mounted() {
     this.chart = new Chart(this.$refs.canvas, this.chartConfig);
   },
   beforeUnmount() {
     this.chart.destroy();
   }
   
   // Composition API
   onMounted(() => {
     chart.value = new Chart(canvas.value, chartConfig.value);
   });
   onBeforeUnmount(() => {
     chart.value.destroy();
   });
   ```

2. **API Data Fetching**:
   ```js
   // Options API
   created() {
     this.fetchUserData();
   },
   methods: {
     async fetchUserData() {
       try {
         const response = await fetch('/api/user');
         this.userData = await response.json();
       } catch (error) {
         this.error = error.message;
       }
     }
   }
   
   // Composition API
   const userData = ref(null);
   const error = ref(null);
   
   async function fetchUserData() {
     try {
       const response = await fetch('/api/user');
       userData.value = await response.json();
     } catch (err) {
       error.value = err.message;
     }
   }
   
   // Runs during "created" phase
   fetchUserData();
   ```

3. **Event Listeners**:
   ```js
   // Options API
   mounted() {
     window.addEventListener('resize', this.handleResize);
   },
   beforeUnmount() {
     window.removeEventListener('resize', this.handleResize);
   },
   methods: {
     handleResize() {
       this.windowWidth = window.innerWidth;
     }
   }
   
   // Composition API
   onMounted(() => {
     window.addEventListener('resize', handleResize);
   });
   
   onBeforeUnmount(() => {
     window.removeEventListener('resize', handleResize);
   });
   
   function handleResize() {
     windowWidth.value = window.innerWidth;
   }
   ```

## Vue 3 Specific Changes

1. **Renamed Destruction Hooks**: 
   - `beforeDestroy` → `beforeUnmount`
   - `destroyed` → `unmounted`

2. **Multiple `v-model` Bindings**: 
   Vue 3 allows multiple v-model bindings on a single component, affecting how you might handle prop changes in lifecycle hooks.

3. **Fragments**: 
   Vue 3 components can have multiple root nodes, which might affect DOM manipulation in lifecycle hooks.

4. **Suspense**: 
   Works with async components and affects when certain lifecycle hooks are called.

## Conclusion

Mastering Vue's lifecycle hooks is essential for building robust Vue applications. The Composition API provides a more flexible way to organize component logic, while the Options API may be more familiar to developers coming from Vue 2. Choose the approach that best fits your needs and team's expertise.