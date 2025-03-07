import { createRouter, createWebHistory } from 'vue-router';
import { requireAuth } from './guards';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/WalkInterface.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../components/profile/ProfileSettings.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/walk/:walk_slug',
    name: 'walk',
    component: () => import('../components/WalkInterface.vue'),
    props: true
  },
  {
    path: '/walk/id/:walk_id',
    name: 'walk-by-id',
    component: () => import('../components/WalkInterface.vue'),
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Import the store factory but don't use it directly
import { storeToRefs } from 'pinia';

// Global navigation guard for loading state
router.beforeEach((to, from, next) => {
  // We'll set up the loading state in the component itself
  // This avoids using the store outside of setup()
  next();
});

router.afterEach((to, from) => {
  // We'll handle loading state in the component itself
  // This avoids using the store outside of setup()
});

export default router;