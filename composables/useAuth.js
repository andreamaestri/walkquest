import { ref, reactive, onMounted } from 'vue';
import * as allauth from '../walkquest/static/js/lib/allauth';

export function useAuth() {
  const user = reactive({
    isAuthenticated: false,
    email: null,
    loading: true,
    error: null
  });
  
  const messages = ref([]);

  // Initial auth state check
  onMounted(async () => {
    await checkAuthStatus();

    // Listen for auth state changes from allauth
    document.addEventListener('allauth.auth.change', async (event) => {
      const { detail } = event;
      if (detail && detail.user) {
        user.isAuthenticated = true;
        user.email = detail.user.email;
      } else {
        user.isAuthenticated = false;
        user.email = null;
      }

      // Handle messages if any
      if (detail && detail.messages) {
        messages.value = detail.messages;
      }
    });
  });

  async function checkAuthStatus() {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.getAuth();
      
      if (response.status === 200) {
        // Our endpoint returns is_authenticated and user object
        if (response.is_authenticated && response.user) {
          user.isAuthenticated = true;
          user.email = response.user.email;
        } else {
          user.isAuthenticated = false;
          user.email = null;
        }
        
        // Check for events or messages
        if (response.events) {
          handleAuthEvents(response.events);
        }
      } else {
        user.isAuthenticated = false;
        user.email = null;
      }
    } catch (error) {
      console.error('Failed to check auth status', error);
      user.error = 'Failed to check authentication status';
      user.isAuthenticated = false;
    } finally {
      user.loading = false;
    }
  }
  
  function handleAuthEvents(events) {
    // Process any auth events from the API
    if (Array.isArray(events) && events.length > 0) {
      // Handle the most recent event
      const latestEvent = events[events.length - 1];
      if (latestEvent.message) {
        messages.value.push(latestEvent.message);
      }
    }
  }

  async function login(email, password) {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.login({ email, password });
      
      if (response.status === 200) {
        await checkAuthStatus();
        return { success: true };
      } else {
        if (response.form) {
          const errors = Object.values(response.form)
            .filter(field => field.errors?.length)
            .map(field => field.errors[0]);
          user.error = errors.length ? errors[0] : 'Login failed';
        } else {
          user.error = response.message || 'Login failed';
        }
        return { success: false, error: user.error };
      }
    } catch (error) {
      console.error('Login error', error);
      user.error = 'Login failed. Please try again.';
      return { success: false, error: user.error };
    } finally {
      user.loading = false;
    }
  }

  async function signup(email, password) {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.signUp({ email, password });
      
      if (response.status === 201 || response.status === 200) {
        await checkAuthStatus();
        return { success: true };
      } else {
        if (response.form) {
          const errors = Object.values(response.form)
            .filter(field => field.errors?.length)
            .map(field => field.errors[0]);
          user.error = errors.length ? errors[0] : 'Signup failed';
        } else {
          user.error = response.message || 'Signup failed';
        }
        return { success: false, error: user.error };
      }
    } catch (error) {
      console.error('Signup error', error);
      user.error = 'Signup failed. Please try again.';
      return { success: false, error: user.error };
    } finally {
      user.loading = false;
    }
  }

  async function logout() {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.logout();
      
      if (response.status === 200 || response.status === 302) {
        user.isAuthenticated = false;
        user.email = null;
        return { success: true };
      } else {
        user.error = response.message || 'Logout failed';
        return { success: false, error: user.error };
      }
    } catch (error) {
      console.error('Logout error', error);
      user.error = 'Logout failed. Please try again.';
      return { success: false, error: user.error };
    } finally {
      user.loading = false;
    }
  }

  async function resetPassword(email) {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.requestPasswordReset(email);
      
      if (response.status === 200) {
        return { success: true };
      } else {
        if (response.form) {
          const errors = Object.values(response.form)
            .filter(field => field.errors?.length)
            .map(field => field.errors[0]);
          user.error = errors.length ? errors[0] : 'Password reset request failed';
        } else {
          user.error = response.message || 'Password reset request failed';
        }
        return { success: false, error: user.error };
      }
    } catch (error) {
      console.error('Password reset error', error);
      user.error = 'Password reset request failed. Please try again.';
      return { success: false, error: user.error };
    } finally {
      user.loading = false;
    }
  }

  async function changePassword(oldPassword, newPassword) {
    user.loading = true;
    user.error = null;
    
    try {
      const response = await allauth.changePassword({
        oldPassword,
        newPassword
      });
      
      if (response.status === 200) {
        return { success: true };
      } else {
        if (response.form) {
          const errors = Object.values(response.form)
            .filter(field => field.errors?.length)
            .map(field => field.errors[0]);
          user.error = errors.length ? errors[0] : 'Password change failed';
        } else {
          user.error = response.message || 'Password change failed';
        }
        return { success: false, error: user.error };
      }
    } catch (error) {
      console.error('Change password error', error);
      user.error = 'Password change failed. Please try again.';
      return { success: false, error: user.error };
    } finally {
      user.loading = false;
    }
  }

  return {
    user,
    messages,
    login,
    signup,
    logout,
    resetPassword,
    changePassword,
    checkAuthStatus
  };
}