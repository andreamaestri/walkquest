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
  VERIFY_EMAIL: '/accounts/email/verify/',
  PASSWORD_RESET: '/accounts/password/reset/',
  CHANGE_PASSWORD: '/accounts/password/change/',
  EMAIL: '/accounts/email/',
  PROVIDERS: '/accounts/social/providers/',
});

// Get CSRF token from cookies or meta tag
function getCsrfToken() {
  const name = 'csrftoken=';
  let token = document.cookie.split(';').find(c => c.trim().startsWith(name));
  if (token) {
    return token.substring(name.length + 1);
  }
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  return metaToken ? metaToken.getAttribute('content') : null;
}

// Make a request to the allauth API
async function request(method, path, data) {
  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      'X-Requested-With': 'XMLHttpRequest'
    },
    credentials: 'same-origin'
  };

  if (data) {
    if (method === 'GET') {
      // Add query params for GET requests
      const params = new URLSearchParams(data);
      path = `${path}?${params}`;
    } else {
      // Add body for non-GET requests
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
      
      // If there are messages, they will be in window.djangoMessages
      // The auth store will handle showing them via snackbar

      // Dispatch auth change event if authentication state changed
      if (response.status === 401 || 
          response.status === 410 || 
          (response.status === 200 && result.meta?.is_authenticated !== undefined)) {
        const event = new CustomEvent('allauth.auth.change', { 
          detail: {
            ...result,
            statusCode: response.status
          }
        });
        document.dispatchEvent(event);
      }
      
      return {
        ...result,
        status: response.status
      };
    } else {
      // For non-JSON responses, check for Django messages in the HTML
      const text = await response.text();
      
      // Simple success response with status
      return {
        status: response.status,
        message: response.ok ? 'Operation successful' : 'Operation failed',
        html: text
      };
    }
  } catch (error) {
    console.error('API request error:', error);
    // Ensure errors are also shown in snackbar via auth store
    return {
      status: 500,
      message: error.message || 'Failed to connect to server',
      error: true
    };
  }
}

// Login with email and password
export async function login(data) {
  // Django's default login form expects 'login' for the email/username field
  const loginData = {
    login: data.email,
    password: data.password
  };
  return await request('POST', URLs.LOGIN, loginData);
}

// Signup with email and password
export async function signUp(data) {
  // Django's default signup form expects 'email', 'password1', and 'password2'
  const signupData = {
    email: data.email,
    password1: data.password1,
    password2: data.password2
  };
  return await request('POST', URLs.SIGNUP, signupData);
}

// Logout the current user
export async function logout() {
  return await request('POST', URLs.LOGOUT);
}

// Get current authentication state
export async function getAuth() {
  return await request('GET', URLs.SESSION);
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