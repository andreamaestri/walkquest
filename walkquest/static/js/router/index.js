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
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../components/auth/EmailVerificationPage.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../components/profile/ProfileSettings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/adventures',
    name: 'adventures',
    component: () => import('../components/adventures/AdventureManager.vue'),
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
    redirect: '/users/login-page/'
  },
  {
    path: '/accounts/signup',
    redirect: '/users/signup-page/'
  },
  {
    path: '/accounts/logout',
    redirect: '/'
  },
  // Additional auth-related routes
  {
    path: '/confirm-email/:key',
    name: 'confirm-email',
    // This route will actually be handled by Django, not Vue
    // The router's navigation guard will handle the redirect
    component: () => import('../components/Loading.vue')
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
  
  // Handle email verification route
  if (to.path === '/verify-email') {
    if (authStore.needsEmailVerification) {
      next();
      return;
    } else if (authStore.isAuthenticated) {
      // Already verified, redirect to home
      next('/');
      return;
    }
  }
  
  // Handle auth-specific routes (login, signup)
  if (to.name === 'login' || to.name === 'signup') {
    if (authStore.isAuthenticated) {
      // Already logged in, redirect to home or saved redirect path
      const redirectPath = authStore.getRedirectPath();
      next(redirectPath);
      return;
    }
  }
  
  // Check if route requires auth
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      // Save the intended destination for after login
      authStore.setRedirectPath(to.fullPath);
      next('/login');
      return;
    }
  }
  
  // Handle confirmation links
  if (to.path.startsWith('/confirm-email/')) {
    // Let Django handle email confirmation through its views
    // but save the route so we can redirect back to the app after confirmation
    authStore.setRedirectPath('/');
    window.location.href = to.fullPath; // Use full page navigation
    return;
  }
  
  // Default: allow navigation
  next();
});

export default router;