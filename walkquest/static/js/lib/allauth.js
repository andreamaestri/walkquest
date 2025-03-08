// Utility functions for interacting with django-allauth API

// Base URL for allauth API
const BASE_URL = '';

// URLs for different endpoints
export const URLs = Object.freeze({
  CONFIG: '/accounts/config/',
  LOGIN: '/accounts/login/',
  LOGOUT: '/accounts/logout/',
  SIGNUP: '/accounts/signup/',
  SESSION: '/users/api/auth-events/',
  VERIFY_EMAIL: '/accounts/confirm-email/',
  PASSWORD_RESET: '/accounts/password/reset/',
  CHANGE_PASSWORD: '/accounts/password/change/',
  EMAIL: '/accounts/email/',
  PROVIDERS: '/accounts/3rdparty/',
});

// Get CSRF token from cookies or meta tag
function getCsrfToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken=')) {
        cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
        break;
      }
    }
  }
  
  // If not found in cookie, try meta tag
  if (!cookieValue) {
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      cookieValue = metaToken.getAttribute('content');
    }
  }
  
  // If still not found, try hidden input field
  if (!cookieValue) {
    const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (inputToken) {
      cookieValue = inputToken.value;
    }
  }
  
  return cookieValue;
}

// Make a request to the allauth API
async function request(method, path, data) {
  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'same-origin'
  };

  if (data) {
    // Convert data to FormData for traditional form submission
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
      options.body = formData;
    } else {
      options.body = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    // First, get a CSRF token if we don't have one
    if (!getCsrfToken() && method !== 'GET') {
      await fetch(path, { 
        method: 'GET',
        credentials: 'same-origin'
      });
      // Now we should have a CSRF token in the cookies
      options.headers['X-CSRFToken'] = getCsrfToken();
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      
      // Dispatch auth change event if authentication state changed
      if (response.status === 401 || 
          response.status === 410 || 
          (response.status === 200 && result.meta?.is_authenticated !== undefined)) {
        const event = new CustomEvent('allauth.auth.change', { detail: result });
        document.dispatchEvent(event);
      }
      
      return result;
    } else {
      // Handle HTML responses
      const text = await response.text();
      if (response.redirected) {
        // Follow redirect for successful login/signup
        window.location.href = response.url;
        return { status: response.status };
      }
      
      // Parse error messages from HTML response
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const errorMessages = doc.querySelectorAll('.alert-error, .errorlist li');
      const errors = Array.from(errorMessages).map(el => el.textContent);
      
      return {
        status: response.status,
        message: errors.join('. ') || 'An error occurred',
        errors: {}
      };
    }
  } catch (error) {
    console.error('API request error:', error);
    return {
      status: 500,
      message: 'Failed to connect to server',
      errors: {}
    };
  }
}

// Login with email and password
export async function login(email, password, remember = false) {
  try {
    // Get CSRF token
    const csrfToken = getCsrfToken();
    
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
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: formData,
    });
    
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw errorData;
      }
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    
    return { status: response.status };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Signup with email and password
export async function signUp(email, password1, password2) {
  try {
    const csrfToken = getCsrfToken();
    
    const response = await fetch('/accounts/signup/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        email,
        password1,
        password2
      }),
    });
    
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw errorData;
      }
      throw new Error(`Signup failed: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    
    return { status: response.status };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

// Logout the current user
export async function logout() {
  try {
    const csrfToken = getCsrfToken();
    
    const response = await fetch('/accounts/logout/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    return { status: response.status };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Get current authentication state
export async function getAuth() {
  try {
    const response = await fetch('/api/auth/user/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Authentication check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Authentication check error:', error);
    return { is_authenticated: false };
  }
}

// Get configuration information
export async function getConfig() {
  return await request('GET', URLs.CONFIG);
}

// Change password
export async function changePassword(data) {
  return await request('POST', URLs.CHANGE_PASSWORD, data);
}

// Request password reset
export async function requestPasswordReset(email) {
  return await request('POST', URLs.PASSWORD_RESET, { email });
}

// Reset password with token
export async function resetPassword(data) {
  return await request('POST', URLs.PASSWORD_RESET, data);
}

// Get email addresses for current user
export async function getEmailAddresses() {
  return await request('GET', URLs.EMAIL);
}

// Add a new email address
export async function addEmail(email) {
  return await request('POST', URLs.EMAIL, { email });
}

// Delete an email address
export async function deleteEmail(email) {
  return await request('DELETE', URLs.EMAIL, { email });
}

// Mark an email as primary
export async function markEmailAsPrimary(email) {
  return await request('PATCH', URLs.EMAIL, { email, primary: true });
}

// Request email verification
export async function requestEmailVerification(email) {
  return await request('PUT', URLs.EMAIL, { email });
}

// Verify email with key
export async function verifyEmail(key) {
  return await request('POST', URLs.VERIFY_EMAIL, { key });
}

// Get available social providers
export async function getProviders() {
  return await request('GET', URLs.PROVIDERS);
}