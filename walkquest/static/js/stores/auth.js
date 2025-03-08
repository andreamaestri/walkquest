import { defineStore } from 'pinia';
import { login, logout, signUp, getAuth } from '../lib/allauth';

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
    authChangeListener: null
  }),
  
  getters: {
    userInitials: (state) => {
      // Return empty while loading or not authenticated
      if (!state.userDataLoaded || !state.isAuthenticated || !state.user) {
        return '';
      }
      
      // Try username first if available
      if (state.user.username) {
        const initials = state.user.username
          .split(' ')
          .map(part => part[0]?.toUpperCase())
          .join('')
          .slice(0, 2);
        return initials || '';
      }
      
      // Fall back to email-based initials
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
    setRedirectPath(path) {
      this.redirectPath = path;
      // Also store in sessionStorage for persistence across page loads
      sessionStorage.setItem('auth_redirect', path);
    },
    
    getRedirectPath() {
      // Try to get from state first, then sessionStorage
      const path = this.redirectPath || sessionStorage.getItem('auth_redirect') || '/';
      this.redirectPath = null;
      sessionStorage.removeItem('auth_redirect');
      return path;
    },
    
    async login(email, password, remember = false) {
      try {
        this.isLoading = true;
        // Get the CSRF token from cookie or other source
        const csrfToken = this.getCSRFToken();
        if (!csrfToken) {
          throw new Error("CSRF token not found");
        }
        
        // Create FormData instead of JSON
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
        
        // Handle different response types
        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw { errors: errorData };
          } else {
            throw new Error('Login failed with status: ' + response.status);
          }
        }
        
        // Check if JSON response
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          // Update user data if available in response
          if (data.user) {
            this.user = data.user;
            this.isAuthenticated = true;
            this.userDataLoaded = true;
          } else {
            // If no user data, fetch it
            await this.checkAuth();
          }
        } else {
          // HTML response typically means success - fetch user data
          await this.checkAuth();
        }
        
        // Return success regardless of response type
        return true;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async signup(email, password1, password2) {
      this.isLoading = true;
      this.signupError = null;
      
      try {
        // Get the CSRF token from the cookie
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

        // Handle response...
        
      } catch (error) {
        console.error('Signup error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Consistent method to get CSRF token
    getCSRFToken() {
      // First try the cookie (Django's default approach)
      let csrfToken = this.getCSRFCookie();
      
      // If not found in cookie, try meta tag
      if (!csrfToken) {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
          csrfToken = metaToken.getAttribute('content');
        }
      }
      
      // If still not found, try hidden input field
      if (!csrfToken) {
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) {
          csrfToken = inputToken.value;
        }
      }
      
      return csrfToken;
    },
    
    // Get CSRF token from cookie
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
      return getCookie('csrftoken'); // Django's CSRF cookie name by default
    },
    
    async checkAuth() {
      this.isLoading = true;
      
      try {
        const data = await getAuth();
        console.log('Auth check response:', data); // Add debug logging
        
        // Check if data exists and has the expected properties
        if (data) {
          // For APIs that return status in the data
          if (data.status === 200 || (data.is_authenticated !== undefined)) {
            if (data.is_authenticated && data.user) {
              this.user = data.user;
              this.isAuthenticated = true;
              this.userDataLoaded = true;
              return true;
            }
            
            // User is not authenticated
            this.user = null;
            this.isAuthenticated = false;
            this.userDataLoaded = false;
            return false;
          }
          
          // Add explicit return for non-200 status
          console.warn('Auth check returned unexpected response:', data);
        } else {
          console.warn('Auth check returned empty response');
        }
        
        // Default to not authenticated for any unexpected response
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        return false;
      } catch (error) {
        console.error('Auth check failed:', error);
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    
    startPolling() {
      if (this.pollingInterval) return;
      
      this.pollingInterval = setInterval(() => {
        this.checkAuth();
      }, 30000); // Check every 30 seconds
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    
    handleAuthEvent(event) {
      if (event.detail?.is_authenticated) {
        this.user = event.detail.user;
        this.isAuthenticated = true;
        this.showSnackbar(`Welcome back, ${event.detail.user.username || event.detail.user.email}!`);
      } else {
        this.user = null;
        this.isAuthenticated = false;
        if (event.detail?.message) {
          this.showSnackbar(event.detail.message);
        }
      }
    },
    
    showSnackbar(message) {
      window.dispatchEvent(new CustomEvent('snackbar-show', {
        detail: { message }
      }));
    },
    
    processDjangoMessages() {
      if (window.djangoMessages?.messages) {
        for (const message of window.djangoMessages.messages) {
          if (message.tags.includes('md-snackbar')) {
            this.showSnackbar(message.message);
          }
        }
        window.djangoMessages.messages = [];
      }
    },
    
    setupAuthChangeListener() {
      // Remove any existing listener to prevent duplicates
      this.removeAuthChangeListener();
      
      // Create a new listener and store the reference
      this.authChangeListener = (e) => this.handleAuthEvent(e);
      document.addEventListener('allauth.auth.change', this.authChangeListener);
    },
    
    removeAuthChangeListener() {
      if (this.authChangeListener) {
        document.removeEventListener('allauth.auth.change', this.authChangeListener);
        this.authChangeListener = null;
      }
    },
    
    async initAuth() {
      const isAuthenticated = await this.checkAuth();
      console.log('Initial auth check completed, authenticated:', isAuthenticated, 'user:', this.user);
      
      // Setup auth change listener
      this.setupAuthChangeListener();
      
      this.processDjangoMessages();
      this.startPolling();
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
          return { success: true };
        }
        
        throw new Error('Logout failed');
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Cleanup method to be called when app is unmounted
    cleanup() {
      this.stopPolling();
      this.removeAuthChangeListener();
    }
  }
});