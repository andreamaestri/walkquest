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
  },
  // Handle redirects from Django auth
  {
    path: '/accounts/login',
    redirect: '/login'
  },
  {
    path: '/accounts/logout',
    redirect: '/'
  },
  // Don't handle Django auth-related URLs in Vue router
  {
    path: '/accounts/:path(.*)',
    beforeEnter: (to) => {
      window.location.href = to.fullPath;
      return false;
    }
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