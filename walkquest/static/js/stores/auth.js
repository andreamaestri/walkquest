import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';

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
    userDataLoaded: false
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
    getCsrfToken() {
      const metaToken = document.querySelector('meta[name="csrf-token"]');
      if (metaToken) {
        return metaToken.getAttribute('content');
      }
      
      const name = 'csrftoken=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(';');
      
      for (let cookie of cookieArray) {
        while (cookie.charAt(0) === ' ') {
          cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length, cookie.length);
        }
      }
      
      const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
      return inputToken ? inputToken.value : null;
    },
    
    setRedirectPath(path) {
      this.redirectPath = path;
    },
    
    getRedirectPath() {
      const path = this.redirectPath || '/';
      this.redirectPath = null;
      return path;
    },
    
    async login(email, password) {
      this.isLoading = true;
      this.loginError = null;
      
      try {
        const response = await fetch('/accounts/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': this.getCsrfToken(),
          },
          body: JSON.stringify({ 
            login: email, 
            password: password,
          }),
          credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errors = data.errors || {};
          throw {
            message: data.message || 'Login failed',
            errors: {
              email: errors.login || errors.email || null,
              password: errors.password || null
            }
          };
        }
        
        // Update auth state
        await this.checkAuth();
        
        // Redirect after successful login
        const router = useRouter();
        const redirectTo = this.getRedirectPath();
        router.push(redirectTo);
        
        return { success: true };
      } catch (error) {
        this.loginError = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    async signup(email, password1, password2) {
      this.isLoading = true;
      this.signupError = null;
      
      try {
        const response = await fetch('/accounts/signup/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': this.getCsrfToken(),
          },
          body: JSON.stringify({ 
            email,
            password1,
            password2
          }),
          credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errors = data.errors || {};
          throw {
            message: data.message || 'Registration failed',
            errors: {
              email: errors.email || null,
              password1: errors.password1 || null,
              password2: errors.password2 || null
            }
          };
        }
        
        // Update auth state
        await this.checkAuth();
        
        // Redirect after successful signup
        const router = useRouter();
        const redirectTo = this.getRedirectPath();
        router.push(redirectTo);
        
        return { success: true };
      } catch (error) {
        this.signupError = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    async checkAuth() {
      this.isLoading = true;
      
      try {
        const response = await fetch('/users/api/auth-events/', {
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'same-origin'
        });
        
        if (response.ok) {
          const data = await response.json();
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
        this.checkAuthEvents();
      }, 10000);
      
      this.checkAuthEvents();
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    
    async checkAuthEvents() {
      try {
        const response = await fetch('/users/api/auth-events/', {
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'same-origin'
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.is_authenticated !== this.isAuthenticated) {
          if (data.is_authenticated) {
            this.user = data.user;
            this.isAuthenticated = true;
          } else {
            this.user = null;
            this.isAuthenticated = false;
          }
        }
        
        if (data.events && data.events.length > 0) {
          for (const event of data.events) {
            this.handleAuthEvent(event);
          }
        }
      } catch (error) {
        console.error('Failed to check auth events:', error);
      }
    },
    
    handleAuthEvent(event) {
      switch (event.event) {
        case 'logout':
          this.user = null;
          this.isAuthenticated = false;
          this.showSnackbar('You have been logged out');
          break;
        
        case 'login':
          if (event.user) {
            this.user = event.user;
            this.isAuthenticated = true;
            this.showSnackbar(`Welcome back, ${event.user.username || event.user.email}!`);
          }
          break;
          
        case 'signup':
          if (event.user) {
            this.user = event.user;
            this.isAuthenticated = true;
            this.showSnackbar(`Welcome to WalkQuest, ${event.user.username || event.user.email}!`);
          }
          break;
          
        case 'password_changed':
        case 'password_reset':
        case 'email_confirmed':
        case 'email_added':
        case 'email_removed':
        case 'email_changed':
          this.checkAuth();
          break;
          
        default:
          console.log('Unhandled auth event:', event.event);
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
    
    async initAuth() {
      const isAuthenticated = await this.checkAuth();
      console.log('Initial auth check completed, authenticated:', isAuthenticated, 'user:', this.user);
      
      this.processDjangoMessages();
      this.startPolling();
      this.initialized = true;
    },
    
    async logout() {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await fetch('/accounts/logout/', {
          method: 'POST',
          headers: {
            'X-CSRFToken': this.getCsrfToken(),
          },
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        
        this.user = null;
        this.isAuthenticated = false;
        this.userDataLoaded = false;
        
        const router = useRouter();
        router.push('/');
        
        return { success: true };
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    }
  }
});