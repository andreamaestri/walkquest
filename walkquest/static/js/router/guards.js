import { useAuthStore } from '../stores/auth';

export function requireAuth(to, from, next) {
  const authStore = useAuthStore();
  
  // Check if the user is authenticated
  if (!authStore.isAuthenticated) {
    // Save the intended destination for redirect after login
    authStore.setRedirectPath(to.fullPath);
    sessionStorage.setItem('auth_redirect', to.fullPath);
    
    // Redirect directly to Django allauth login page instead of home route
    authStore.redirectToLogin();
    return;
  }
  
  next();
}

export function redirectIfAuth(to, from, next) {
  const authStore = useAuthStore();
  
  if (authStore.isAuthenticated) {
    next({ name: 'home' });
    return;
  }
  
  next();
}

// Helper to handle post-authentication redirects
export function handleAuthRedirect() {
  // First check the store for the redirect path
  const authStore = useAuthStore();
  const storePath = authStore.getRedirectPath();
  
  // Then check sessionStorage as a fallback
  const sessionPath = sessionStorage.getItem('auth_redirect');
  if (sessionPath) {
    sessionStorage.removeItem('auth_redirect');
  }
  
  // Use the store path, session path, or default to home
  return storePath || sessionPath || { name: 'home' };
}