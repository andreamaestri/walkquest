import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    redirectPath: null // Store redirect path in the store itself
  }),

  getters: {
    userInitials: (state) => {
      if (!state.user?.email) return '';
      return state.user.email
        .split('@')[0]
        .split(/[._-]/)
        .map(part => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2);
    }
  },

  actions: {
    getCsrfToken() {
      const tokenElement = document.querySelector('meta[name="csrf-token"]');
      return tokenElement ? tokenElement.getAttribute('content') : null;
    },

    setRedirectPath(path) {
      this.redirectPath = path;
    },

    getRedirectPath() {
      const path = this.redirectPath || '/';
      this.redirectPath = null; // Clear after use
      return path;
    },

    async login(email, password) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await fetch('/accounts/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCsrfToken(),
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            login: email, 
            password: password,
            remember: true 
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Invalid credentials');
        }

        await this.checkAuth(); // This will set user data and isAuthenticated
        
        // Return success - navigation will be handled by the component
        return { success: true };
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async signup(email, password) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await fetch('/accounts/signup/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCsrfToken(),
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            email: email,
            password1: password,
            password2: password,
            username: email.split('@')[0] // Generate username from email
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // After successful signup, log the user in
        return await this.login(email, password);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async logout() {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await fetch('/accounts/logout/', {
          method: 'POST',
          headers: {
            'X-CSRFToken': this.getCsrfToken(),
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Logout failed');
        }

        this.user = null;
        this.isAuthenticated = false;
        
        // Return success - navigation will be handled by the component
        return { success: true };
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async checkAuth() {
      this.isLoading = true;
      
      try {
        const response = await fetch('/api/user/', {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.user = data;
          this.isAuthenticated = true;
          return true;
        } else {
          this.user = null;
          this.isAuthenticated = false;
          return false;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        this.user = null;
        this.isAuthenticated = false;
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});