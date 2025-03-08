<template>
  <div class="provider-list-container">
    <div 
      v-for="provider in providers" 
      :key="provider.id"
      class="provider-item"
    >
      <button 
        class="provider-button"
        @click="handleProviderLogin(provider)"
      >
        <Icon :icon="getProviderIcon(provider.id)" class="provider-icon" />
        <span>{{ provider.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  callbackURL: {
    type: String,
    default: '/account/provider/callback'
  }
})

const providers = ref([])

// Fetch available social providers
onMounted(async () => {
  try {
    const response = await fetch('/accounts/social/providers/', {
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    
    if (response.ok) {
      const data = await response.json()
      providers.value = data.providers || []
    }
  } catch (err) {
    console.error('Failed to fetch social providers:', err)
  }
})

// Get icon for provider
function getProviderIcon(providerId) {
  const iconMap = {
    'google': 'mdi:google',
    'facebook': 'mdi:facebook',
    'github': 'mdi:github',
    'twitter': 'mdi:twitter',
    'apple': 'mdi:apple'
  }
  return iconMap[providerId.toLowerCase()] || 'mdi:account'
}

// Handle social provider login
function handleProviderLogin(provider) {
  window.location.href = `/accounts/social/${provider.id}/login/?process=login&next=${props.callbackURL}`
}
</script>

<style scoped>
.provider-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.provider-item {
  width: 100%;
}

.provider-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 20px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.3);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.provider-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.provider-icon {
  font-size: 20px;
}
</style>