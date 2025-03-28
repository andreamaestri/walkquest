import { defineStore } from 'pinia';
import { login, logout, signUp, getAuth } from '../lib/allauth';
import { useSnackbar } from '../composables/useSnackbar';

// Environment configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_POLL_INTERVAL = 30000; // 30s default polling interval
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 min idle timeout

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    redirectPath: null,
    pollingInterval: null,
    lastEventId: null,
    loginError: null,
    signupError: null,
    initialized: false,
    userDataLoaded: false,
    authChangeListener: null,
    hasShownWelcome: false,
    processedMessages: new Set(),
    idleTimeoutCleanup: null,
    needsEmailVerification: false
  }),
  
  getters: {
    userInitials: (state) => {
      if (!state.userDataLoaded || !state.isAuthenticated || !state.user) {
        return '';
      }
      
      if (state.user.username) {
        const initials = state.user.username
          .split(' ')
          .map(part => part[0]?.toUpperCase())
          .join('')
          .slice(0, 2);
        return initials || '';
      }
      
      if (state.user.email) {
        const emailLocal = state.user.email.split('@')[0];
        const initials = emailLocal
          .split(/[._-]/)
          .map(part => part[0]?.toUpperCase())
          .join('')
          .slice(0, 2);
        return initials || '';
      }
      
      return '';
    }
  },
  
  actions: {
    // Path management
    setRedirectPath(path) {
      this.redirectPath = path;
      sessionStorage.setItem('auth_redirect', path);
    },
    
    getRedirectPath() {
      const path = this.redirectPath || sessionStorage.getItem('auth_redirect') || '/';
      this.redirectPath = null;
      sessionStorage.removeItem('auth_redirect');
      return path;
    },
    
    // Authentication actions
    async login(email, password, remember = false) {
      try {
        this.isLoading = true;
        
        // Make sure we have a CSRF token
        const csrfToken = this.getCSRFToken();
        if (!csrfToken) {
          // Try to fetch a fresh CSRF token from the server
          try {
            const response = await fetch('/accounts/csrf/', {
              method: 'GET',
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.csrfToken) {
                console.log('Successfully fetched new CSRF token');
              }
            }
          } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
          }
        }
        
        // Use the login function from the allauth library instead of direct fetch
        const result = await login({ email, password, remember });
        
        if (!result.ok) {
          if (result.errors) {
            throw { errors: result.errors };
          } else {
            throw new Error(result.message || 'Authentication failed. Please check your credentials.');
          }
        }
        
        // Handle response based on its content
        if (result.user) {
          // User data provided directly in response
          this.user = result.user;
          this.isAuthenticated = true;
          this.userDataLoaded = true;
          this.setupIdleTimeout();
        } else if (result.email_verification_needed) {
          // Email verification is required
          this.needsEmailVerification = true;
          this.showSnackbar('Please verify your email address to continue.');
          return { success: true, needsEmailVerification: true };
        } else {
          // No user data in response, check auth status
          await this.forceAuthCheck();
        }
        
        return { success: true };
      } catch (error) {
        const errorMessage = this.handleError(error, 'login');
        this.loginError = errorMessage;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Force a fresh authentication check - different from checkAuth to avoid race conditions
    async forceAuthCheck() {
      try {
        // Clear any cached state about authentication
        const response = await fetch('/users/api/auth-events/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            // Add cache busting parameter
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify authentication status');
        }
        
        const data = await response.json();
        
        if (data.meta?.is_authenticated || data.is_authenticated) {
          // Get user data from the response
          const userData = data.data?.user || data.user;
          
          if (userData) {
            this.user = userData;
            this.isAuthenticated = true;
            this.userDataLoaded = true;
            this.setupIdleTimeout();
          }
          
          // Check for email verification needed
          if (data.email_verification_needed || (data.data?.flows && data.data.flows.includes('verify_email'))) {
            console.log('Email verification needed according to server');
            this.needsEmailVerification = true;
          } else {
            this.needsEmailVerification = false;
          }
          
          return true;
        }
        
        // Reset state for unauthenticated user
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        this.needsEmailVerification = false;
        
        return false;
      } catch (error) {
        console.error('Force auth check failed:', error);
        return false;
      }
    },

    async signup(email, password1, password2) {
      this.isLoading = true;
      this.signupError = null;
      
      try {
        // Use the signUp utility function from allauth.js instead of direct fetch
        const data = await signUp({ email, password1, password2 });
        
        if (!data || data.status >= 400) {
          if (data && data.errors) {
            throw { errors: data.errors };
          } else {
            throw new Error(data?.message || 'Signup failed. Please try again.');
          }
        }
        
        // Check if the server requested a redirect
        if (data.redirect_to) {
          console.log('Redirecting to:', data.redirect_to);
          // Perform the redirect
          window.location.href = data.redirect_to;
          return true;
        }
        
        // Check authentication state after signup
        await this.checkAuth();
        this.showSnackbar('Account created successfully!');
        return true;
      } catch (error) {
        const errorMessage = this.handleError(error, 'signup');
        this.signupError = errorMessage;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // CSRF Token handling
    getCSRFToken() {
      let csrfToken = this.getCSRFCookie();
      
      if (!csrfToken) {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
          csrfToken = metaToken.getAttribute('content');
        }
      }
      
      if (!csrfToken) {
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) {
          csrfToken = inputToken.value;
        }
      }
      
      return csrfToken;
    },
    
    getCSRFCookie() {
      function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
            }
          }
        }
        return cookieValue;
      }
      return getCookie('csrftoken');
    },
    
    // Authentication state management
    async checkAuth() {
      if (this.isLoading) return; // Prevent concurrent checks
      
      this.isLoading = true;
      
      try {
        const data = await getAuth();
        
        if (!IS_PRODUCTION) {
          console.log('Auth check response:', data);
        }
        
        // Handle direct authentication info from the custom auth endpoint
        if (data.meta?.is_authenticated || data.is_authenticated) {
          // Get user data from different possible locations
          const userData = data.data?.user || data.user;
          
          if (userData) {
            const wasAuthenticated = this.isAuthenticated;
            this.user = userData;
            this.isAuthenticated = true;
            this.userDataLoaded = true;
            
            if (!wasAuthenticated) {
              this.setupIdleTimeout();
            }
            
            // Check for email verification needed
            if (data.email_verification_needed || 
                (data.data?.flows && data.data.flows.includes('verify_email'))) {
              this.needsEmailVerification = true;
            } else {
              this.needsEmailVerification = false;
            }
            
            // Show welcome message once
            if (!this.hasShownWelcome) {
              const username = this.user.username || '';
              const welcomeMessage = username 
                ? `Welcome to WalkQuest, ${username}!` 
                : "Welcome to WalkQuest!";
              this.showSnackbar(welcomeMessage);
              this.hasShownWelcome = true;
            }
            
            // Handle any messages from the server
            if (data.messages && Array.isArray(data.messages)) {
              for (const message of data.messages) {
                this.showSnackbar(message.message);
              }
            }
            
            return true;
          }
        }
        
        // Handle 401 with authentication flows (standard headless API format)
        if (data.status === 401 && data.flowInfo) {
          const { needsAuthentication, isAuthenticated, availableFlows } = data.flowInfo;
          
          if (needsAuthentication) {
            // Store available authentication flows
            this.availableFlows = availableFlows;
            
            // Reset auth state
            this.user = null;
            this.isAuthenticated = false;
            this.userDataLoaded = false;
            
            // Check if email verification is needed
            if (availableFlows.includes('verify_email')) {
              this.needsEmailVerification = true;
            } else {
              this.needsEmailVerification = false;
            }
            
            return false;
          }
        }
        
        // Reset state for unauthenticated user
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        this.needsEmailVerification = false;
        return false;
      } catch (error) {
        this.handleError(error, 'checkAuth');
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        this.needsEmailVerification = false;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Session refresh mechanism
    async refreshToken() {
      try {
        if (!this.isAuthenticated) return false;
        
        const csrfToken = this.getCSRFToken();
        const sessionToken = localStorage.getItem('allauth_session_token');
        
        // Import the URLs from allauth.js
        const { URLs } = await import('../lib/allauth');
        
        // Use the standard SESSION_REFRESH URL from the URLs object
        const response = await fetch(URLs.SESSION_REFRESH, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(sessionToken ? { 'X-Session-Token': sessionToken } : {})
          },
          credentials: 'same-origin',
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          // Try to get new session token from response if available
          try {
            const data = await response.json();
            if (data.meta && data.meta.session_token) {
              localStorage.setItem('allauth_session_token', data.meta.session_token);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
          return true;
        }
        
        // If we got a 410 Gone, clear the session token
        if (response.status === 410) {
          localStorage.removeItem('allauth_session_token');
        }
        
        return this.checkAuth();
      } catch (error) {
        this.handleError(error, 'refreshToken');
        return this.checkAuth();
      }
    },
    
    // Polling and event management
    startPolling() {
      if (this.pollingInterval) return;
      
      let pollCount = 0;
      const maxPollInterval = 300000; // 5 minutes max
      let currentInterval = AUTH_POLL_INTERVAL;
      
      this.pollingInterval = setInterval(() => {
        pollCount++;
        this.checkAuth();
        
        // After 5 polls, increase the interval to reduce server load
        if (pollCount === 5) {
          clearInterval(this.pollingInterval);
          currentInterval = Math.min(currentInterval * 2, maxPollInterval);
          this.pollingInterval = setInterval(() => this.checkAuth(), currentInterval);
        }
      }, currentInterval);
      
      // Also set up event listeners for visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    },
    
    handleVisibilityChange() {
      if (document.visibilityState === 'visible' && this.isAuthenticated) {
        this.checkAuth();
      }
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    },
    
    handleAuthEvent(event) {
      if (event.detail?.is_authenticated) {
        this.user = event.detail.user;
        this.isAuthenticated = true;
        this.setupIdleTimeout();
        
        if (event.detail.message) {
          this.showSnackbar(event.detail.message);
        }
      } else {
        const wasAuthenticated = this.isAuthenticated;
        this.user = null;
        this.isAuthenticated = false;
        
        if (wasAuthenticated) {
          this.clearIdleTimeout();
        }
        
        if (event.detail?.message) {
          this.showSnackbar(event.detail.message);
        }
      }
    },
    
    // Session idle management
    setupIdleTimeout() {
      this.clearIdleTimeout();
      
      if (!this.isAuthenticated) return;
      
      let idleTimeout;
      
      const resetIdleTimeout = () => {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          this.showSnackbar('Your session is about to expire due to inactivity.', 'warning');
          
          // Give them a chance to continue
          setTimeout(() => {
            if (this.isAuthenticated) {
              this.refreshToken();
            }
          }, 60000);
        }, SESSION_IDLE_TIMEOUT);
      };
      
      // Reset the timeout on user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, resetIdleTimeout, false);
      });
      
      resetIdleTimeout();
      
      this.idleTimeoutCleanup = () => {
        events.forEach(event => {
          document.removeEventListener(event, resetIdleTimeout, false);
        });
        clearTimeout(idleTimeout);
      };
    },
    
    clearIdleTimeout() {
      if (typeof this.idleTimeoutCleanup === 'function') {
        this.idleTimeoutCleanup();
        this.idleTimeoutCleanup = null;
      }
    },
    
    // Notification handling
    showSnackbar(message, tags = '') {
      const messageKey = `${message}-${Date.now()}`;
      if (this.processedMessages.has(messageKey)) return;
      
      const snackbar = useSnackbar();
      snackbar.show(message);
      
      this.processedMessages.add(messageKey);
      
      setTimeout(() => {
        this.processedMessages.delete(messageKey);
      }, 5000);
    },
    
    processDjangoMessages() {
      if (window.djangoMessages?.messages) {
        const messages = window.djangoMessages.messages;
        window.djangoMessages.messages = []; // Clear immediately to prevent duplicates
        
        for (const message of messages) {
          if (message.tags?.includes('md-snackbar')) {
            this.showSnackbar(message.message, message.tags);
          }
        }
      }
    },
    
    // Event listener management
    setupAuthChangeListener() {
      this.removeAuthChangeListener();
      
      this.authChangeListener = (e) => this.handleAuthEvent(e);
      document.addEventListener('allauth.auth.change', this.authChangeListener);
    },
    
    removeAuthChangeListener() {
      if (this.authChangeListener) {
        document.removeEventListener('allauth.auth.change', this.authChangeListener);
        this.authChangeListener = null;
      }
    },
    
    // Error handling
    handleError(error, context) {
      if (!IS_PRODUCTION) {
        console.error(`Auth error (${context}):`, error);
      }
      
      // For production, implement structured logging
      if (IS_PRODUCTION) {
        // Example: logErrorToService(error, context, 'auth');
      }
      
      let errorMessage = 'An unexpected error occurred';
      
      if (error.errors) {
        const firstError = Object.values(error.errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return errorMessage;
    },
    
    // Navigation
    redirectToLogin() {
      const loginUrl = window.djangoAllAuth?.loginUrl || '/accounts/login/';
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${loginUrl}?next=${currentUrl}`;
    },
    
    // Initialization and cleanup
    async initAuth() {
      const isAuthenticated = await this.checkAuth();
      
      if (!IS_PRODUCTION) {
        console.log('Initial auth check completed, authenticated:', isAuthenticated, 'user:', this.user);
      }
      
      this.setupAuthChangeListener();
      this.processDjangoMessages();
      this.startPolling();
      
      if (isAuthenticated) {
        this.setupIdleTimeout();
      }
      
      this.initialized = true;
    },
    
    async logout() {
      this.isLoading = true;
      this.error = null;
      
      try {
        // Try our custom endpoint directly first
        try {
          console.log('Attempting logout via custom endpoint');
          const csrfToken = this.getCSRFToken();
          
          const response = await fetch('/users/api/logout/', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            console.log('Custom logout successful');
            // Clear auth state
            this.user = null;
            this.isAuthenticated = false;
            this.userDataLoaded = false;
            this.needsEmailVerification = false;
            this.clearIdleTimeout();
            
            // Clear session token
            localStorage.removeItem('allauth_session_token');
            
            // Show a snackbar message
            this.showSnackbar('You have been successfully logged out');
            
            return { success: true };
          }
        } catch (directError) {
          console.error('Direct logout failed:', directError);
        }
        
        // Fall back to allauth.js logout
        console.log('Falling back to allauth.js logout');
        const { logout } = await import('../lib/allauth');
        const data = await logout();
        
        if (data.status === 200 || data.ok) {
          // Clear auth state
          this.user = null;
          this.isAuthenticated = false;
          this.userDataLoaded = false;
          this.needsEmailVerification = false;
          this.clearIdleTimeout();
          
          // Show a snackbar message
          this.showSnackbar('You have been successfully logged out');
          return { success: true };
        }
        
        // If both failed, try one last Django standard logout
        console.log('Trying standard Django logout');
        window.location.href = '/accounts/logout/';
        return { success: true };
      } catch (error) {
        const errorMessage = this.handleError(error, 'logout');
        this.error = errorMessage;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Complete cleanup
    cleanup() {
      this.stopPolling();
      this.removeAuthChangeListener();
      this.clearIdleTimeout();
      this.processedMessages.clear();
    }
  }
});