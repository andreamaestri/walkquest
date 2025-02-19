import { createApp } from 'vue'
import App from './App.vue'
import 'Icon'

const app = createApp(App)

// Configure custom elements
app.config.compilerOptions.isCustomElement = (tag) => {
  return ['Icon'].includes(tag)
}

app.mount('#app')