import { createRouter, createWebHistory } from 'vue-router'
import { useWalksStore } from '../stores/walks'
import WalkInterface from '../components/WalkInterface.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: WalkInterface,
      props: route => ({
        mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN,
        walkId: route.params.walkId
      }),
      beforeEnter: async (to, from) => {
        const walksStore = useWalksStore()
        
        try {
          // Load walks if not already loaded
          if (!walksStore.walks.length) {
            await walksStore.loadWalks()
          }
          
          // If walkId is provided, validate it exists
          if (to.params.walkId) {
            const walkExists = walksStore.walks.some(w => w.id === to.params.walkId)
            if (!walkExists) {
              return { name: 'home' }
            }
          }
        } catch (error) {
          console.error('Error loading walks:', error)
        }
      }
    },
    {
      path: '/walk/:id',
      name: 'walk-detail',
      component: WalkInterface,
      props: route => ({
        mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN,
        walkId: route.params.id
      }),
      beforeEnter: async (to, from) => {
        const walksStore = useWalksStore()
        
        try {
          // Load walks if not already loaded
          if (!walksStore.walks.length) {
            await walksStore.loadWalks()
          }
          
          // Validate walk exists
          const walkExists = walksStore.walks.some(w => w.id === to.params.id)
          if (!walkExists) {
            return { name: 'home' }
          }
          
          // Pre-select the walk
          const walk = walksStore.walks.find(w => w.id === to.params.id)
          walksStore.setSelectedWalk(walk)
        } catch (error) {
          console.error('Error loading walk detail:', error)
          return { name: 'home' }
        }
      }
    }
  ]
})

// Global navigation guard for loading state
router.beforeEach((to, from) => {
  if (to.name !== from.name) {
    const walksStore = useWalksStore()
    walksStore.setLoading(true)
  }
})

router.afterEach(() => {
  const walksStore = useWalksStore()
  walksStore.setLoading(false)
})

export default router