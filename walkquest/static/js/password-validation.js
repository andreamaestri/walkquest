document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('id_password1');
  const emailInput = document.getElementById('id_email');
  const requirements = document.querySelectorAll('.requirement');
  
  // Common passwords list (simplified for demo)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome', 'password123'];
  
  function updateRequirementStatus(requirement, isValid) {
    // Get the icon element inside this requirement
    const icon = requirement.querySelector('iconify-icon');
    
    if (isValid) {
      requirement.classList.add('valid');
      requirement.classList.remove('invalid');
      if (icon) {
        icon.setAttribute('icon', 'material-symbols:check-circle');
        icon.setAttribute('style', 'color: rgb(var(--md-sys-color-primary)) !important');
      }
    } else {
      requirement.classList.add('invalid');
      requirement.classList.remove('valid');
      if (icon) {
        icon.setAttribute('icon', 'material-symbols:error');
        icon.setAttribute('style', 'color: rgb(var(--md-sys-color-error)) !important');
      }
    }
  }
  
  function resetRequirementStatus(requirement) {
    // Reset a requirement to its neutral state
    const icon = requirement.querySelector('iconify-icon');
    
    requirement.classList.remove('valid');
    requirement.classList.remove('invalid');
    if (icon) {
      icon.setAttribute('icon', 'material-symbols:check-small');
      icon.removeAttribute('style');
    }
  }
  
  function checkPasswordRequirements(password, email) {
    // If password is empty, reset all requirements to neutral state
    if (!password || password.length === 0) {
      requirements.forEach(resetRequirementStatus);
      return;
    }
    
    // Check length requirement (at least 8 characters)
    const lengthRequirement = document.querySelector('[data-requirement="length"]');
    if (lengthRequirement) {
      const isValid = password.length >= 8;
      updateRequirementStatus(lengthRequirement, isValid);
    }
    
    // Check if password is similar to personal info
    const personalRequirement = document.querySelector('[data-requirement="personal"]');
    if (personalRequirement) {
      const emailUsername = email ? email.split('@')[0] : '';
      const isSimilarToEmail = emailUsername && 
        (password.toLowerCase().includes(emailUsername.toLowerCase()) || 
         emailUsername.toLowerCase().includes(password.toLowerCase()));
      
      updateRequirementStatus(personalRequirement, !isSimilarToEmail);
    }
    
    // Check if password is common
    const commonRequirement = document.querySelector('[data-requirement="common"]');
    if (commonRequirement) {
      const isCommon = commonPasswords.includes(password.toLowerCase());
      updateRequirementStatus(commonRequirement, !isCommon);
    }
    
    // Check if password is entirely numeric
    const numericRequirement = document.querySelector('[data-requirement="numeric"]');
    if (numericRequirement) {
      const isEntirelyNumeric = /^\d+$/.test(password);
      updateRequirementStatus(numericRequirement, !isEntirelyNumeric);
    }
  }
  
  // Add animation when checking requirements
  function animateRequirement(requirement) {
    requirement.classList.add('checking');
    setTimeout(() => {
      requirement.classList.remove('checking');
    }, 500);
  }
  
  // Initialize validation
  if (passwordInput) {
    // Reset all requirements to neutral state initially
    requirements.forEach(resetRequirementStatus);
    
    // Check on password input
    passwordInput.addEventListener('input', function() {
      const password = this.value;
      const email = emailInput ? emailInput.value : '';
      
      // Animate requirements
      requirements.forEach(animateRequirement);
      
      // Update validation status
      checkPasswordRequirements(password, email);
    });
    
    // Update when email changes (for personal info similarity)
    if (emailInput) {
      emailInput.addEventListener('input', function() {
        if (passwordInput.value) {
          checkPasswordRequirements(passwordInput.value, this.value);
        }
      });
    }
  }

  // Debug logging to help troubleshoot
  console.log('Password validation script loaded');
  console.log('Password input found:', !!passwordInput);
  console.log('Email input found:', !!emailInput);
  console.log('Requirements found:', requirements.length);
});