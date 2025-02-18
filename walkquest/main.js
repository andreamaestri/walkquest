import { createApp } from 'vue'
import App from './App.vue'
import 'iconify-icon'

const app = createApp(App)

// Configure custom elements
app.config.compilerOptions.isCustomElement = (tag) => {
  return ['iconify-icon'].includes(tag)
}

app.mount('#app')