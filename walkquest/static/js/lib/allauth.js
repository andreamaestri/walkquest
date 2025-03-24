// Utility functions for interacting with django-allauth API

// Base URL for allauth API
const BASE_URL = '';

// URLs for different endpoints - using the headless API
export const URLs = Object.freeze({
  // Browser endpoints (for web applications)
  CONFIG: '/_allauth/browser/v1/config/',
  LOGIN: '/_allauth/browser/v1/auth/login/',
  LOGOUT: '/_allauth/browser/v1/auth/logout/',
  SIGNUP: '/_allauth/browser/v1/auth/signup/',
  SESSION: '/_allauth/browser/v1/auth/session/',
  VERIFY_EMAIL: '/_allauth/browser/v1/auth/verify-email/',
  PASSWORD_RESET: '/_allauth/browser/v1/auth/password/reset/',
  CHANGE_PASSWORD: '/_allauth/browser/v1/auth/password/change/',
  EMAIL: '/_allauth/browser/v1/auth/email/',
  PROVIDERS: '/_allauth/browser/v1/auth/providers/',
  
  // Legacy endpoints as fallback
  LEGACY_LOGIN: '/accounts/login/',
  LEGACY_LOGOUT: '/accounts/logout/',
  LEGACY_SIGNUP: '/accounts/signup/',
  LEGACY_SESSION: '/users/api/auth-events/',
});

// Get CSRF token from cookies or meta tag
function getCsrfToken() {
  // More reliable method to get CSRF token from cookie
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
  
  // Try to get token from cookie
  let csrfToken = getCookie('csrftoken');
  
  // If not found in cookie, check meta tag
  if (!csrfToken) {
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      csrfToken = metaToken.getAttribute('content');
    }
  }
  
  // As last resort, check for input field
  if (!csrfToken) {
    const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (inputToken) {
      csrfToken = inputToken.value;
    }
  }
  
  return csrfToken;
}

// Make a request to the allauth API
async function request(method, path, data) {
  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    credentials: 'same-origin'
  };
  
  // Get CSRF token and add it to headers if available
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    options.headers['X-CSRFToken'] = csrfToken;
  }
  
  // Add session token if available (for app clients)
  const sessionToken = localStorage.getItem('allauth_session_token');

// Login with email and password
export async function login(data) {
  // Prepare data for JSON submission to headless API
  const loginData = {
    login: data.email,
    password: data.password
  };
  
  // Add remember me if provided
  if (data.remember) {
    loginData.remember = data.remember;
  }
  
  // Use the request function which handles CSRF and other headers
  const result = await request('POST', URLs.LOGIN, loginData);
  
  // Handle authentication flows according to the headless API spec
  if (result.status === 401 || result.status === 410) {
    // Authentication required or re-authentication required
    console.log('Authentication flow required:', result.meta?.flows);
    
    // Check for specific flows that need to be handled
    if (result.meta && result.meta.flows) {
      // Email verification flow
      if (result.meta.flows.verify_email) {
        console.log('Email verification required');
        result.email_verification_needed = true;
      }
      
      // MFA authentication flow
      if (result.meta.flows.mfa_authenticate) {
        console.log('MFA authentication required');
        result.mfa_required = true;
      }
    }
  }
  
  return result;
}

// Signup with email and password
export async function signUp(data) {
  // Prepare data for JSON submission to headless API
  const signupData = {
    email: data.email,
    password1: data.password1,
    password2: data.password2,
    username: data.username || data.email.split('@')[0] // Use provided username or generate from email
  };
  
  // Add first_name and last_name if provided
  if (data.first_name) signupData.first_name = data.first_name;
  if (data.last_name) signupData.last_name = data.last_name;
  
  // Add any additional fields that were passed
  if (data.next) signupData.next = data.next;
  
  // Use the request function which handles CSRF and other headers
  try {
    const result = await request('POST', URLs.SIGNUP, signupData);
    
    // Handle authentication flows according to the headless API spec
    if (result.status === 401 || result.status === 410) {
      // Authentication required or re-authentication required
      console.log('Authentication flow required:', result.meta?.flows);
      
      // Check for specific flows that need to be handled
      if (result.meta && result.meta.flows) {
        // Email verification flow
        if (result.meta.flows.verify_email) {
          console.log('Email verification required');
          result.email_verification_needed = true;
        }
        
        // MFA authentication flow
        if (result.meta.flows.mfa_authenticate) {
          console.log('MFA authentication required');
          result.mfa_required = true;
        }
        
        // Provider signup flow
        if (result.meta.flows.provider_signup) {
          console.log('Provider signup required');
          result.provider_signup_required = true;
        }
      }
    }
    
    // Handle successful signup
    if (result.status === 200 || result.status === 201) {
      // Check if the response contains a location field indicating a redirect
      if (result.location) {
        console.log('Server requested redirect to:', result.location);
        result.redirect_to = result.location;
      }
      
      // Dispatch auth change event if we're authenticated
      if (result.meta && result.meta.is_authenticated) {
        const event = new CustomEvent('allauth.auth.change', { 
          detail: {
            is_authenticated: true,
            user: result.user || { email: data.email },
            statusCode: result.status
          }
        });
        document.dispatchEvent(event);
      }
    }
    
    return result;
  } catch (error) {
    console.error('API request error:', error);
    return {
      status: 500,
      message: error.message || 'Failed to connect to server',
      error: true
    };
  }
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
  return await request('POST', URLs.CHANGE_PASSWORD, {
    oldpassword: data.oldPassword,
    password1: data.newPassword,
    password2: data.newPassword
  });
}

// Request password reset
export async function requestPasswordReset(email) {
  return await request('POST', URLs.PASSWORD_RESET, { email });
}

// Reset password with token
export async function resetPassword(data) {
  return await request('POST', `${URLs.PASSWORD_RESET}${data.uidb36}/${data.key}/`, {
    password1: data.password,
    password2: data.password
  });
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
  return await request('POST', URLs.EMAIL, { email, action: 'remove' });
}

// Mark an email as primary
export async function markEmailAsPrimary(email) {
  return await request('POST', URLs.EMAIL, { email, action: 'primary' });
}

// Request email verification
export async function requestEmailVerification(email) {
  return await request('POST', URLs.EMAIL, { email, action: 're-send-verification' });
}

// Verify email with key
export async function verifyEmail(key) {
  return await request('POST', URLs.VERIFY_EMAIL, { key });
}

// Get available social providers
export async function getProviders() {
  return await request('GET', URLs.PROVIDERS);
}