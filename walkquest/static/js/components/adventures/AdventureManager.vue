<template>
  <div class="adventure-manager">
    <div class="adventure-header">
      <div class="header-left">
        <button 
          class="back-btn" 
          @click="goBack"
          aria-label="Go back"
        >
          <Icon icon="mdi:arrow-left" />
        </button>
        <h1 class="title">My Adventures</h1>
      </div>
      <button 
        class="create-btn" 
        @click="openCreateModal"
        :disabled="isLoading"
      >
        <Icon icon="mdi:plus" />
        <span>New Adventure</span>
      </button>
    </div>

    <!-- View toggle buttons -->
    <div class="view-toggle">
      <button 
        class="toggle-btn" 
        :class="{ active: viewMode === 'grid' }" 
        @click="viewMode = 'grid'"
      >
        <Icon icon="mdi:grid" />
      </button>
      <button 
        class="toggle-btn" 
        :class="{ active: viewMode === 'list' }" 
        @click="viewMode = 'list'"
      >
        <Icon icon="mdi:format-list-bulleted" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <Icon icon="mdi:loading" class="loading-icon" />
      <p>Loading adventures...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <Icon icon="mdi:alert-circle" class="error-icon" />
      <p>{{ error }}</p>
      <button @click="fetchAdventures" class="retry-btn">Try Again</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="adventures.length === 0" class="empty-container">
      <Icon icon="mdi:map-search" class="empty-icon" />
      <p>You haven't created any adventures yet.</p>
      <button @click="openCreateModal" class="create-btn">Create Your First Adventure</button>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="adventures-grid">
      <AdventureCard 
        v-for="adventure in adventures" 
        :key="adventure.id" 
        :adventure="adventure"
        @view="openDetailModal"
        @edit="openEditModal"
        @delete="openDeleteModal"
      />
    </div>

    <!-- List View -->
    <div v-else class="adventures-list">
      <AdventureListItem
        v-for="adventure in adventures" 
        :key="adventure.id" 
        :adventure="adventure"
        @view="openDetailModal"
        @edit="openEditModal"
        @delete="openDeleteModal"
      />
    </div>

    <!-- Create/Edit Modal -->
    <AdventureFormModal
      v-if="showFormModal"
      :adventure="currentAdventure"
      :mode="formMode"
      @close="closeFormModal"
      @save="saveAdventure"
      :isSubmitting="isSubmitting"
    />

    <!-- Detail Modal -->
    <AdventureDetailModal
      v-if="showDetailModal"
      :adventure="currentAdventure"
      @close="closeDetailModal"
      @edit="openEditModal"
      @delete="openDeleteModal"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      v-if="showDeleteModal"
      title="Delete Adventure"
      message="Are you sure you want to delete this adventure? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      :isSubmitting="isSubmitting"
      @confirm="deleteAdventure"
      @cancel="closeDeleteModal"
      dangerAction
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { useRouter } from 'vue-router';
import AdventureCard from './AdventureCard.vue';
import AdventureListItem from './AdventureListItem.vue';
import AdventureFormModal from './AdventureFormModal.vue';
import AdventureDetailModal from './AdventureDetailModal.vue';
import ConfirmationModal from '../shared/ConfirmationModal.vue';

// Store access
const authStore = useAuthStore();
const toastStore = useToastStore();
const router = useRouter();

// Component state
const adventures = ref([]);
const isLoading = ref(true);
const error = ref(null);
const viewMode = ref('grid');
const isSubmitting = ref(false);

// Modal state
const showFormModal = ref(false);
const showDetailModal = ref(false);
const showDeleteModal = ref(false);
const formMode = ref('create');
const currentAdventure = ref(null);

// Navigation function to go back
const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    // If no history, navigate to home or another appropriate route
    router.push({ name: 'home' });
  }
};

// Fetch adventures from API
const fetchAdventures = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await fetch('/api/adventures/', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch adventures');
    }
    
    const data = await response.json();
    adventures.value = data;
  } catch (err) {
    error.value = err.message || 'An error occurred while fetching adventures';
    console.error('Error fetching adventures:', err);
  } finally {
    isLoading.value = false;
  }
};

// Create or update adventure
const saveAdventure = async (adventureData) => {
  isSubmitting.value = true;
  
  try {
    const isCreate = formMode.value === 'create';
    const url = isCreate ? '/api/adventures/' : `/api/adventures/${currentAdventure.value.id}/`;
    const method = isCreate ? 'POST' : 'PUT';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify(adventureData),
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save adventure');
    }
    
    const savedAdventure = await response.json();
    
    if (isCreate) {
      adventures.value.push(savedAdventure);
      toastStore.show('Adventure created successfully', 'success');
    } else {
      const index = adventures.value.findIndex(adv => adv.id === savedAdventure.id);
      if (index !== -1) {
        adventures.value[index] = savedAdventure;
      }
      toastStore.show('Adventure updated successfully', 'success');
    }
    
    closeFormModal();
  } catch (err) {
    toastStore.show(err.message || 'An error occurred while saving', 'error');
    console.error('Error saving adventure:', err);
  } finally {
    isSubmitting.value = false;
  }
};

// Delete adventure
const deleteAdventure = async () => {
  if (!currentAdventure.value) return;
  
  isSubmitting.value = true;
  
  try {
    const response = await fetch(`/api/adventures/${currentAdventure.value.id}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCSRFToken(),
      },
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete adventure');
    }
    
    adventures.value = adventures.value.filter(adv => adv.id !== currentAdventure.value.id);
    toastStore.show('Adventure deleted successfully', 'success');
    closeDeleteModal();
  } catch (err) {
    toastStore.show(err.message || 'An error occurred while deleting', 'error');
    console.error('Error deleting adventure:', err);
  } finally {
    isSubmitting.value = false;
  }
};

// Modal handlers
const openCreateModal = () => {
  currentAdventure.value = null;
  formMode.value = 'create';
  showFormModal.value = true;
};

const openEditModal = (adventure) => {
  currentAdventure.value = { ...adventure };
  formMode.value = 'edit';
  showFormModal.value = true;
};

const openDetailModal = (adventure) => {
  currentAdventure.value = adventure;
  showDetailModal.value = true;
};

const openDeleteModal = (adventure) => {
  currentAdventure.value = adventure;
  showDeleteModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  currentAdventure.value = null;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  currentAdventure.value = null;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  currentAdventure.value = null;
};

// Helper function to get CSRF token
function getCSRFToken() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  
  // If not found in cookie, try meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    return metaToken.getAttribute('content');
  }
  
  // If still not found, try hidden input field
  const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (inputToken) {
    return inputToken.value;
  }
  
  return null;
}

// Lifecycle hooks
onMounted(() => {
  fetchAdventures();
});
</script>

<style scoped>
.adventure-manager {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.adventure-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
}

.back-btn:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
}

.title {
  font-size: 1.8rem;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 50px;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.create-btn:hover {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.create-btn:active {
  transform: scale(0.98);
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: flex-end;
}

.toggle-btn {
  padding: 0.5rem;
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid rgb(var(--md-sys-color-outline));
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
  border-color: transparent;
}

.adventures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.adventures-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  min-height: 200px;
}

.loading-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-primary));
  animation: spin 1.5s linear infinite;
}

.error-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-error));
  margin-bottom: 1rem;
}

.empty-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 1rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  border: none;
  cursor: pointer;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .adventure-header {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
  
  .header-left {
    flex: 1;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .create-btn span {
    display: none;
  }
  
  .create-btn {
    width: auto;
    padding: 0.75rem;
    border-radius: 50%;
  }
  
  .view-toggle {
    justify-content: center;
    width: 100%;
  }
  
  .adventures-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
</style>
