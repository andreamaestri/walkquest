<template>
  <div class="motion-examples">
    <h2 class="m3-headline-medium">Motion for Vue Examples</h2>
    
    <div class="examples-container">
      <!-- Basic Motion Example -->
      <section class="example-card">
        <h3 class="m3-title-medium">Basic Animation</h3>
        <div class="demo-area">
          <motion.div
            ref="basicBox"
            class="motion-box"
            :animate="{ rotate: isAnimating ? 360 : 0 }"
            :transition="{ duration: 2, repeat: isAnimating ? Infinity : 0 }"
          />
        </div>
        <button @click="toggleBasicAnimation" class="m3-button m3-filled-button">
          {{ isAnimating ? 'Stop' : 'Animate' }}
        </button>
        <pre><code>{{ basicExample }}</code></pre>
      </section>
      
      <!-- Hover Example -->
      <section class="example-card">
        <h3 class="m3-title-medium">Hover Animation</h3>
        <div class="demo-area">
          <motion.div
            class="motion-box"
            :whileHover="{ scale: 1.2, backgroundColor: '#6750A4' }"
            :whilePress="{ scale: 0.9 }"
          />
        </div>
        <pre><code>{{ hoverExample }}</code></pre>
      </section>
      
      <!-- Scroll Animation -->
      <section class="example-card">
        <h3 class="m3-title-medium">Scroll Animation</h3>
        <div class="demo-area scroll-demo">
          <div class="scroll-container">
            <motion.div
              v-for="i in 5"
              :key="i"
              class="scroll-item"
              :initial="{ opacity: 0, y: 50 }"
              :whileInView="{ opacity: 1, y: 0 }"
              :transition="{ 
                duration: 0.8, 
                delay: i * 0.1,
                ease: [0.2, 0, 0, 1]
              }"
            >
              Item {{ i }}
            </motion.div>
          </div>
        </div>
        <div class="hint">↓ Scroll down to see animations</div>
        <pre><code>{{ scrollExample }}</code></pre>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const isAnimating = ref(false);
const basicBox = ref(null);

// Example code to display
const basicExample = `<motion.div
  :animate="{ rotate: 360 }"
  :transition="{ duration: 2, repeat: Infinity }"
/>`;

const hoverExample = `<motion.div
  :whileHover="{ scale: 1.2, backgroundColor: '#6750A4' }"
  :whilePress="{ scale: 0.9 }"
/>`;

const scrollExample = `<motion.div
  :initial="{ opacity: 0, y: 50 }"
  :whileInView="{ opacity: 1, y: 0 }"
  :transition="{ 
    duration: 0.8,
    delay: 0.1,
    ease: [0.2, 0, 0, 1]
  }"
/>`;

// Toggle animation
function toggleBasicAnimation() {
  isAnimating.value = !isAnimating.value;
}
</script>

<style scoped>
.motion-examples {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.examples-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.example-card {
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--md-sys-elevation-1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.demo-area {
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.motion-box {
  width: 100px;
  height: 100px;
  background-color: rgb(var(--md-sys-color-primary));
  border-radius: 8px;
}

pre {
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.9rem;
}

.scroll-demo {
  height: 300px;
  overflow-y: auto;
  padding: 1rem;
}

.scroll-container {
  min-height: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem;
}

.scroll-item {
  height: 80px;
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.hint {
  text-align: center;
  font-size: 0.9rem;
  color: rgb(var(--md-sys-color-outline));
  margin-top: -0.5rem;
}

.m3-button {
  align-self: flex-start;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.m3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.m3-filled-button:hover {
  box-shadow: var(--md-sys-elevation-2);
}
</style>