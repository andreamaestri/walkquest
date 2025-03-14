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
    idleTimeoutCleanup: null
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
        const csrfToken = this.getCSRFToken();
        
        if (!csrfToken) {
          throw new Error("CSRF token not found");
        }
        
        const formData = new FormData();
        formData.append('login', email);
        formData.append('password', password);
        if (remember) {
          formData.append('remember', 'on');
        }
        
        const response = await fetch('/accounts/login/', {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin',
          body: formData
        });
        
        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw { errors: errorData };
          } else {
            throw new Error('Authentication failed. Please check your credentials.');
          }
        }
        
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.user) {
            this.user = data.user;
            this.isAuthenticated = true;
            this.userDataLoaded = true;
            this.setupIdleTimeout();
          } else {
            await this.checkAuth();
          }
        } else {
          await this.checkAuth();
        }
        
        return true;
      } catch (error) {
        const errorMessage = this.handleError(error, 'login');
        this.loginError = errorMessage;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async signup(email, password1, password2) {
      this.isLoading = true;
      this.signupError = null;
      
      try {
        const csrfToken = this.getCSRFToken();
        
        const response = await fetch('/accounts/signup/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            email,
            password1,
            password2
          })
        });

        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw { errors: errorData };
          } else {
            throw new Error('Signup failed. Please try again.');
          }
        }
        
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.user) {
            this.user = data.user;
            this.isAuthenticated = true;
            this.userDataLoaded = true;
            this.setupIdleTimeout();
          } else {
            await this.checkAuth();
          }
        } else {
          await this.checkAuth();
        }
        
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
        
        if (data) {
          if (data.status === 200 || (data.is_authenticated !== undefined)) {
            if (data.is_authenticated && data.user) {
              const wasAuthenticated = this.isAuthenticated;
              this.user = data.user;
              this.isAuthenticated = true;
              this.userDataLoaded = true;

              if (!wasAuthenticated) {
                this.setupIdleTimeout();
              }

              if (!this.hasShownWelcome) {
                const username = this.user.username || '';
                const welcomeMessage = username 
                  ? `Welcome to WalkQuest, ${username}!` 
                  : "Welcome to WalkQuest!";
                this.showSnackbar(welcomeMessage);
                this.hasShownWelcome = true;
              }

              this.processDjangoMessages();
              return true;
            }
            
            const wasAuthenticated = this.isAuthenticated;
            this.user = null;
            this.isAuthenticated = false;
            this.userDataLoaded = false;
            
            if (wasAuthenticated) {
              this.clearIdleTimeout();
              this.showSnackbar('Your session has ended.');
            }
            
            return false;
          }
          
          if (!IS_PRODUCTION) {
            console.warn('Auth check returned unexpected response:', data);
          }
        } else if (!IS_PRODUCTION) {
          console.warn('Auth check returned empty response');
        }
        
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        return false;
      } catch (error) {
        this.handleError(error, 'checkAuth');
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
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
        
        const response = await fetch('/accounts/refresh-token/', {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });
        
        if (response.ok) {
          return true;
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
        const data = await logout();
        
        if (data.status === 200) {
          this.user = null;
          this.isAuthenticated = false;
          this.userDataLoaded = false;
          this.clearIdleTimeout();
          return { success: true };
        }
        
        throw new Error('Logout failed');
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