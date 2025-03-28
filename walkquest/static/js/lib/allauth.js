// Utility functions for interacting with django-allauth API

// Base URL for allauth API
const BASE_URL = '';

// Use 'app' client type instead of 'browser'
// 'app' type works better for headless API usage in SPA contexts
const CLIENT_TYPE = 'app';

// Check for globally defined URLs from Django template
const globalAllAuth = window.djangoAllAuth || {};

// URLs for different endpoints - prioritize global URLs when available
export const URLs = Object.freeze({
  // Django Allauth headless API endpoints - use global values or fallbacks
  CONFIG: globalAllAuth.configUrl || `/_allauth/${CLIENT_TYPE}/v1/config/`,
  LOGIN: globalAllAuth.loginUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/login/`,
  LOGOUT: globalAllAuth.logoutUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/logout/`,
  SIGNUP: globalAllAuth.signupUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/signup/`,
  SESSION: globalAllAuth.sessionUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/session/`,
  AUTH_SESSION: globalAllAuth.sessionUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/session/`,
  VERIFY_EMAIL: globalAllAuth.verifyEmailUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/email/verify/`,
  PASSWORD_RESET: globalAllAuth.passwordResetUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/password/reset/`,
  CHANGE_PASSWORD: globalAllAuth.passwordChangeUrl || `/_allauth/${CLIENT_TYPE}/v1/account/password/change/`,
  EMAIL: globalAllAuth.emailUrl || `/_allauth/${CLIENT_TYPE}/v1/account/email/`,
  PROVIDERS: globalAllAuth.providersUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/providers/`,
  SESSION_REFRESH: globalAllAuth.sessionRefreshUrl || `/_allauth/${CLIENT_TYPE}/v1/auth/session/refresh/`,
  
  // Custom API endpoints
  CUSTOM_LOGIN: globalAllAuth.loginUrl || `/users/api/login/`,
  CUSTOM_SIGNUP: globalAllAuth.signupUrl || `/users/api/signup/`,
  CUSTOM_AUTH_EVENTS: globalAllAuth.authEventsUrl || `/users/api/auth-events/`,
  CUSTOM_LOGOUT: globalAllAuth.logoutUrl || `/users/api/logout/`,
  
  // Standard Django AllAuth URLs for fallback
  STANDARD_LOGIN: globalAllAuth.standardLoginUrl || `/accounts/login/`,
  STANDARD_SIGNUP: globalAllAuth.standardSignupUrl || `/accounts/signup/`,
  STANDARD_LOGOUT: globalAllAuth.standardLogoutUrl || `/accounts/logout/`
});

// Session token storage for app client
let sessionToken = localStorage.getItem('allauth_session_token');

// Handle authentication flows
export function handleAuthFlows(response) {
  if (response.status === 401 && response.data?.flows) {
    const flows = response.data.flows;
    const availableFlows = flows.map(flow => flow.id);
    
    // Store available flows in case UI needs to show appropriate options
    localStorage.setItem('allauth_available_flows', JSON.stringify(availableFlows));
    
    return {
      needsAuthentication: true,
      isAuthenticated: response.meta?.is_authenticated || false,
      availableFlows,
      sessionToken: response.meta?.session_token
    };
  }
  
  return {
    needsAuthentication: false,
    isAuthenticated: response.meta?.is_authenticated || false,
    sessionToken: response.meta?.session_token
  };
}

// Function to set session token from a response
export function setSessionToken(token) {
  if (token) {
    sessionToken = token;
    localStorage.setItem('allauth_session_token', token);
  }
}

// Function to clear session token (e.g., on 410 response)
export function clearSessionToken() {
  sessionToken = null;
  localStorage.removeItem('allauth_session_token');
  localStorage.removeItem('allauth_available_flows');
}

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
  
  // Add CSRF token to requests
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    options.headers['X-CSRFToken'] = csrfToken;
  }
  
  console.log('Making request to:', path, 'with method:', method);
  
  // Add session token if available (for app clients)
  if (sessionToken) {
    options.headers['X-Session-Token'] = sessionToken;
  }
  
  // Add JSON body for methods that support it
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  
  try {
    // Make the actual request
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, options);
    
    // Try to parse as JSON, fall back to text if not possible
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = {
        text: await response.text()
      };
    }
    
    // Add status and ok properties to the response data
    responseData.status = response.status;
    responseData.ok = response.ok;
    
    // Handle session token according to the API spec
    if (responseData.meta?.session_token) {
      setSessionToken(responseData.meta.session_token);
    }
    
    // Handle 401 responses by checking for authentication flows
    if (responseData.status === 401) {
      const flowInfo = handleAuthFlows(responseData);
      responseData.flowInfo = flowInfo;
    }
    
    // Handle 410 Gone status (invalid session)
    if (responseData.status === 410) {
      clearSessionToken();
    }
    
    return responseData;
  } catch (error) {
    // Handle network errors
    return {
      status: 0,
      ok: false,
      error: true,
      message: error.message || 'Network error'
    };
  }
}

// Login with email and password
export async function login(data) {
  // Try custom login endpoint first
  try {
    // Prepare data for the custom endpoint
    const customLoginData = {
      email: data.email,
      password: data.password
    };
    
    // Add remember me if provided
    if (data.remember) {
      customLoginData.remember = data.remember;
    }
    
    console.log('Trying custom login endpoint first');
    const customResult = await request('POST', URLs.CUSTOM_LOGIN, customLoginData);
    
    // If custom login is successful, return its result
    if (customResult.status === 200) {
      console.log('Custom login successful');
      
      // Format response to match headless API format
      return {
        meta: {
          is_authenticated: true,
          session_token: customResult.meta?.session_token || localStorage.getItem('allauth_session_token')
        },
        data: {
          user: customResult.user
        },
        ok: true,
        status: 200
      };
    }
    
    console.log('Custom login failed, falling back to headless API');
  } catch (error) {
    console.error('Custom login error, falling back to headless API:', error);
  }
  
  // Fall back to standard headless API
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
  // Try custom signup endpoint first
  try {
    // Prepare data for the custom endpoint
    const customSignupData = {
      email: data.email,
      username: data.username || data.email.split('@')[0], // Use provided username or generate from email
      password1: data.password1,
      password2: data.password2  // API requires both password1 and password2
    };
    
    // Add name if provided
    if (data.name) customSignupData.name = data.name;
    
    console.log('Trying custom signup endpoint first');
    const customResult = await request('POST', URLs.CUSTOM_SIGNUP, customSignupData);
    
    // If custom signup is successful, return its result
    if (customResult.status === 200 || customResult.status === 201) {
      console.log('Custom signup successful');
      
      // Dispatch auth change event if we're authenticated
      if (customResult.meta?.is_authenticated) {
        const user = customResult.data?.user || customResult.user || { email: data.email };
        const event = new CustomEvent('allauth.auth.change', { 
          detail: {
            is_authenticated: true,
            user: user,
            statusCode: customResult.status
          }
        });
        document.dispatchEvent(event);
      }
      
      return customResult;
    }
    
    console.log('Custom signup failed, falling back to headless API');
  } catch (error) {
    console.error('Custom signup error, falling back to headless API:', error);
  }
  
  // Fall back to standard headless API
  // Prepare data for JSON submission to headless API
  const signupData = {
    email: data.email,
    username: data.username || data.email.split('@')[0], // Use provided username or generate from email
    password1: data.password1,
    password2: data.password2  // API requires both password1 and password2
  };
  
  // Add name if provided
  if (data.name) signupData.name = data.name;
  
  // Add any additional fields that were passed
  if (data.next) signupData.next = data.next;
  
  // Use the request function which handles CSRF and other headers
  try {
    const result = await request('POST', URLs.SIGNUP, signupData);
    
    // Handle authentication flows according to the headless API spec
    if (result.status === 401 || result.status === 410) {
      // Authentication required or re-authentication required
      console.log('Authentication flow required:', result.meta?.flows);
      
      if (result.data && result.data.flows) {
        // New API format - flows in data.flows array
        if (Array.isArray(result.data.flows)) {
          if (result.data.flows.includes('verify_email')) {
            console.log('Email verification required');
            result.email_verification_needed = true;
          }
          
          if (result.data.flows.includes('mfa_authenticate')) {
            console.log('MFA authentication required');
            result.mfa_required = true;
          }
          
          if (result.data.flows.includes('provider_signup')) {
            console.log('Provider signup required');
            result.provider_signup_required = true;
          }
        }
      } else if (result.meta && result.meta.flows) {
        // Backward compatibility - flows in meta.flows object
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
        const user = result.data?.user || result.user || { email: data.email };
        const event = new CustomEvent('allauth.auth.change', { 
          detail: {
            is_authenticated: true,
            user: user,
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
  console.log('Starting logout process');
  
  // Try our custom logout endpoint first
  try {
    console.log('Attempting logout via custom endpoint:', URLs.CUSTOM_LOGOUT);
    const response = await fetch(URLs.CUSTOM_LOGOUT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
    });
    
    // If successful, clean up any local storage items
    if (response.ok) {
      console.log('Custom logout successful');
      clearSessionToken();
      return {
        ok: true,
        status: 200,
        message: 'Logged out successfully'
      };
    }
  } catch (error) {
    console.error('Custom logout failed, falling back to headless API:', error);
  }
  
  // Try standard Django logout as a fallback
  try {
    console.log('Attempting standard Django logout:', URLs.STANDARD_LOGOUT);
    const standardResponse = await fetch(URLs.STANDARD_LOGOUT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
    });
    
    if (standardResponse.ok) {
      console.log('Standard logout successful');
      clearSessionToken();
      return {
        ok: true,
        status: 200,
        message: 'Logged out successfully via standard endpoint'
      };
    }
  } catch (error) {
    console.error('Standard logout failed:', error);
  }
  
  // As a last resort, try headless API
  console.log('Attempting headless API logout as last resort:', URLs.LOGOUT);
  try {
    const result = await request('POST', URLs.LOGOUT);
    return result;
  } catch (error) {
    console.error('All logout attempts failed:', error);
    // At this point, just clear local state and assume logout worked
    clearSessionToken();
    return {
      ok: true,
      status: 200,
      message: 'Forced logout by clearing local state'
    };
  }
}

// Get current authentication state
export async function getAuth() {
  // Try custom auth events endpoint first
  try {
    console.log('Trying custom auth events endpoint first');
    const customResult = await request('GET', URLs.CUSTOM_AUTH_EVENTS);
    
    // If custom auth check is successful, return its result
    if (customResult.status === 200) {
      console.log('Custom auth check successful');
      return customResult;
    }
    
    console.log('Custom auth check failed, falling back to headless API');
  } catch (error) {
    console.error('Custom auth check error, falling back to headless API:', error);
  }
  
  // Fall back to standard headless API
  return await request('GET', URLs.AUTH_SESSION);
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