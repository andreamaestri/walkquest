import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/WalkInterface.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../components/auth/LoginForm.vue'),
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore();
      if (authStore.isAuthenticated) {
        next('/');
      } else {
        next();
      }
    }
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../components/auth/SignupForm.vue'),
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore();
      if (authStore.isAuthenticated) {
        next('/');
      } else {
        next();
      }
    }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../components/profile/ProfileSettings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/walk/:walk_id',
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

// Add global navigation guard for auth state
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Initialize auth state if needed
  if (!authStore.initialized) {
    await authStore.initAuth();
  }
  
  // Check if route requires auth
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      // Save the intended destination
      authStore.setRedirectPath(to.fullPath);
      next('/login');
      return;
    }
  }
  
  next();
});

export default router;