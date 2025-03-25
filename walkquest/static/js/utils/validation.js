export function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required.');
    return errors;
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  
  // Add any other password validation rules here based on your requirements
  
  return errors;
}