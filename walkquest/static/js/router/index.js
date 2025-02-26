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

// Global navigation guard for loading state and query param handling
router.beforeEach((to, from) => {
  if (to.name !== from.name) {
    const walksStore = useWalksStore()
    if (walksStore.setLoading) {
      walksStore.setLoading(true)
    }
  }

  // Handle query parameter redirect for backward compatibility
  if (to.query.walkId) {
    const walksStore = useWalksStore()
    const walk = walksStore.getWalkById(to.query.walkId)
    if (walk?.walk_id) {
      // If we have a walk_id (slug), use that
      return {
        name: 'walk',
        params: { walk_slug: walk.walk_id },
        replace: true
      }
    }
    // Fallback to ID-based route
    return {
      name: 'walk-by-id',
      params: { walk_id: to.query.walkId },
      replace: true
    }
  }
})

router.afterEach(() => {
  const walksStore = useWalksStore()
  if (walksStore.setLoading) {
    walksStore.setLoading(false)
  }
})

export default router