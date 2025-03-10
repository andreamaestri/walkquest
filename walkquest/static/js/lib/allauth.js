// Utility functions for interacting with django-allauth API

// Base URLs for allauth API
const BASE_URL = '';

// Response status codes
const STATUS_OK = 200;
const STATUS_CREATED = 201;

// URLs for different endpoints
export const URLs = Object.freeze({
  LOGIN: '/accounts/login/',
  LOGOUT: '/accounts/logout/',
  SIGNUP: '/accounts/signup/',
  SESSION: '/users/api/auth-events/',
  VERIFY_EMAIL: '/accounts/email/verify/',
  PASSWORD_RESET: '/accounts/password/reset/',
  CHANGE_PASSWORD: '/accounts/password/change/',
  EMAIL: '/accounts/email/',
});

// Get CSRF token from cookies or meta tag
export function getCsrfToken() {
  // Try to get from cookie (if it's not httpOnly)
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    let trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(name)) {
      return trimmedCookie.substring(name.length);
    }
  }
  
  // Try to get from meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    return metaToken.getAttribute('content');
  }
  
  // Try to get from the hidden input field
  const xcsrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (xcsrfToken) {
    return xcsrfToken.value;
  }
  
  return null;
}

// Extract error messages from HTML response
function extractErrorsFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const errors = {};
  
  // Look for error list items with data-field attribute
  doc.querySelectorAll('.errorlist li[data-field]').forEach(li => {
    const field = li.getAttribute('data-field');
    if (!errors[field]) errors[field] = [];
    errors[field].push(li.textContent.trim());
  });
  
  // Look for non-field errors
  const nonFieldErrors = doc.querySelector('.alert-error, .alert-danger');
  if (nonFieldErrors) {
    errors.non_field_errors = [nonFieldErrors.textContent.trim()];
  }
  
  // Look for regular errorlist items without data-field
  doc.querySelectorAll('.errorlist li:not([data-field])').forEach(li => {
    if (!errors.non_field_errors) errors.non_field_errors = [];
    errors.non_field_errors.push(li.textContent.trim());
  });
  
  // Look for form errors by field
  doc.querySelectorAll('.form-group .errorlist li').forEach(li => {
    const fieldGroup = li.closest('.form-group');
    if (fieldGroup) {
      const input = fieldGroup.querySelector('input');
      if (input && input.name) {
        const field = input.name;
        if (!errors[field]) errors[field] = [];
        errors[field].push(li.textContent.trim());
      }
    }
  });
  
  return errors;
}

// Make a request to the allauth API
async function request(method, path, data) {
  const options = {
    method: method,
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    credentials: 'same-origin'
  };

  // Add CSRF token to headers for non-GET requests
  const csrfToken = getCsrfToken();
  if (csrfToken && method !== 'GET') {
    options.headers['X-CSRFToken'] = csrfToken;
  }
  
  if (data) {
    if (method === 'GET') {
      // Add query params for GET requests
      const params = new URLSearchParams(data);
      path = `${path}?${params}`;
    } else {
      // Add body for non-GET requests
      options.body = JSON.stringify(data);
    }
  }
  
  try {
    // If we don't have a CSRF token yet and this is not a GET request,
    // make a GET request first to get the CSRF cookie
    if (!csrfToken && method !== 'GET') {
      const csrfResponse = await fetch(path, { 
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      await csrfResponse.text(); // Ensure the response is consumed
      
      const newToken = getCsrfToken();
      if (newToken) {
        options.headers['X-CSRFToken'] = newToken;
      }
    }
    
    // Make request
    const response = await fetch(`${BASE_URL}${path}`, options);
    
    // First try to parse as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        
        // Handle successful response
        if (response.ok) {
          return {
            status: response.status,
            ...data
          };
        }
        
        // Handle error response
        return {
          status: response.status,
          error: true,
          errors: data.errors || data,
          message: data.message || 'Please correct the errors below'
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }
    
    // If not JSON or JSON parsing failed, try to extract errors from HTML
    const html = await response.text();
    const errors = extractErrorsFromHtml(html);
    
    return {
      status: response.status,
      error: !response.ok,
      errors: errors,
      message: errors.non_field_errors?.[0] || 'Please correct the errors below',
      html: html
    };
    
  } catch (error) {
    console.error('[allauth] API request error:', error);
    return {
      status: 500,
      error: true,
      message: 'Failed to connect to server',
      errors: {
        non_field_errors: [error.message || 'Network error']
      }
    };
  }
}

// Login with email and password
export async function login(data) {
  const loginData = {
    login: data.email,
    password: data.password
  };
  return await request('POST', URLs.LOGIN, loginData);
}

// Signup with email and password
export async function signUp(data) {
  try {
    const signupData = {
      email: data.email,
      password1: data.password1,
      password2: data.password2
    };
    return await request('POST', URLs.SIGNUP, signupData);
  } catch (error) {
    throw new Error('Signup request failed: ' + error.message);
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

// Get configuration (including social providers)
export async function getConfig() {
  return await request('GET', '/_allauth/config/');
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