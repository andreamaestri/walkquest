<template>
  <div class="verification-container">
    <div class="verification-card">
      <div class="verification-icon">
        <Icon icon="mdi:email-outline" class="email-icon" />
      </div>
      <h1 class="verification-title">Verify Your Email</h1>
      <p class="verification-description">
        We've sent a verification email to <strong>{{ email }}</strong>. 
        Please check your inbox and click the verification link to continue.
      </p>
      
      <div class="verification-actions">
        <button @click="resendVerification" class="resend-button">
          <span v-if="resending">
            <Icon icon="mdi:loading" class="spinner-icon" />
            Resending...
          </span>
          <span v-else>Resend Verification Email</span>
        </button>
        
        <button @click="goToLogin" class="return-button">
          Return to Login
        </button>
      </div>
      
      <div v-if="isAuthenticated" class="continue-section">
        <p>Your account has been created. You can start using WalkQuest now, but some features may require email verification.</p>
        <button @click="goToHome" class="continue-button">
          Continue to WalkQuest
        </button>
      </div>
      
      <p class="help-text">
        Having trouble? Please check your spam folder. If you still can't find the email, try to resend it or contact us for support.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import * as allauth from '../../lib/allauth';

const router = useRouter();
const authStore = useAuthStore();
const resending = ref(false);

// Get the email from the auth store
const email = computed(() => {
  if (authStore.user && authStore.user.email) {
    return authStore.user.email;
  }
  
  // Try to get it from localStorage as a fallback
  const storedEmail = localStorage.getItem('signup_email');
  if (storedEmail) {
    return storedEmail;
  }
  
  return 'your email address';
});

const isAuthenticated = computed(() => authStore.isAuthenticated);

// Redirect to home if email is already verified
onMounted(() => {
  checkVerificationStatus();
});

async function checkVerificationStatus() {
  // Force a fresh auth check to see if we're verified
  await authStore.forceAuthCheck();
  
  if (authStore.isAuthenticated && !authStore.needsEmailVerification) {
    router.push('/');
  }
}

async function resendVerification() {
  resending.value = true;
  
  try {
    // Try to get the email address from allauth session first
    const authStatus = await allauth.getAuth();
    let emailToVerify = '';
    
    if (authStatus.data?.user?.email) {
      emailToVerify = authStatus.data.user.email;
    } else if (authStore.user?.email) {
      emailToVerify = authStore.user.email;
    } else {
      const storedEmail = localStorage.getItem('signup_email');
      if (storedEmail) {
        emailToVerify = storedEmail;
      }
    }
    
    if (!emailToVerify) {
      throw new Error('No email address found to verify');
    }
    
    // Request a new verification email
    const result = await allauth.requestEmailVerification(emailToVerify);
    
    if (result.status === 200) {
      authStore.showSnackbar('Verification email sent! Please check your inbox.');
    } else {
      throw new Error(result.message || 'Failed to resend verification email');
    }
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    authStore.showSnackbar('Failed to resend verification email. Please try again later.', 'error');
  } finally {
    resending.value = false;
  }
}

function goToLogin() {
  router.push('/login');
}

function goToHome() {
  router.push('/');
}
</script>

<style scoped>
.verification-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface));
}

.verification-card {
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 28px;
  padding: 32px;
  width: 100%;
  max-width: 500px;
  box-shadow: var(--md-sys-elevation-2);
  text-align: center;
}

.verification-icon {
  margin-bottom: 24px;
}

.email-icon {
  font-size: 64px;
  color: rgb(var(--md-sys-color-primary));
}

.verification-title {
  font-size: 24px;
  font-weight: 500;
  margin: 0 0 16px;
  color: rgb(var(--md-sys-color-on-surface));
}

.verification-description {
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 32px;
  line-height: 1.5;
}

.verification-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.resend-button {
  padding: 0 24px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.return-button {
  padding: 0 24px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid rgb(var(--md-sys-color-outline));
  text-transform: uppercase;
  letter-spacing: 0.1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  color: rgb(var(--md-sys-color-primary));
}

.continue-button {
  padding: 0 24px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--md-sys-color-tertiary));
  color: rgb(var(--md-sys-color-on-tertiary));
  margin-top: 16px;
}

.help-text {
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-top: 24px;
}

.continue-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--md-sys-color-outline), 0.3);
}

.spinner-icon {
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .verification-card {
    padding: 24px;
  }
  
  .verification-actions {
    flex-direction: column;
  }
}
</style>