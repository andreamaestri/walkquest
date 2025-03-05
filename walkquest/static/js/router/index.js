import { createRouter, createWebHistory } from 'vue-router'
import { useWalksStore } from '../stores/walks'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/WalkInterface.vue')
  },
  // Primary route - by slug
  {
    path: '/:walk_slug',
    name: 'walk',
    component: () => import('../components/WalkInterface.vue'),
    props: true
  },
  // Legacy/fallback route for UUIDs
  {
    path: '/walk/:walk_id',
    name: 'walk-by-id',
    component: () => import('../components/WalkInterface.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global navigation guard for loading state
router.beforeEach((to, from) => {
  if (to.name !== from.name) {
    const walksStore = useWalksStore()
    if (walksStore.setLoading) {
      walksStore.setLoading(true)
    }
  }
})

router.afterEach((to, from) => {
  const walksStore = useWalksStore()
  if (walksStore.setLoading) {
    walksStore.setLoading(false)
  }
})

export default router