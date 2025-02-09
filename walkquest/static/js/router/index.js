import { createRouter, createWebHistory } from 'vue-router'
import WalkInterface from '../components/WalkInterface.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: WalkInterface
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router