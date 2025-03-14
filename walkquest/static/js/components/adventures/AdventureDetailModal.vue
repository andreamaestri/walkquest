<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ adventure.title }}</h2>
        <div class="modal-actions">
          <button 
            class="action-btn edit-btn" 
            @click="$emit('edit', adventure)"
            aria-label="Edit adventure"
          >
            <Icon icon="mdi:pencil" />
          </button>
          <button 
            class="action-btn delete-btn" 
            @click="$emit('delete', adventure)"
            aria-label="Delete adventure"
          >
            <Icon icon="mdi:delete" />
          </button>
          <button 
            class="action-btn close-btn" 
            @click="$emit('close')" 
            aria-label="Close"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>
      
      <div class="modal-body">
        <div class="detail-section">
          <div class="adventure-meta">
            <div class="meta-item">
              <Icon icon="mdi:map-marker-distance" />
              <span>{{ formatDistance(adventure.distance) }}</span>
            </div>
            <div class="meta-item">
              <Icon icon="mdi:clock-outline" />
              <span>{{ formatDuration(adventure.duration) }}</span>
            </div>
            <div class="meta-item" v-if="adventure.difficulty">
              <Icon icon="mdi:terrain" />
              <span>{{ capitalizeFirstLetter(adventure.difficulty) }}</span>
            </div>
            <div class="meta-item">
              <Icon icon="mdi:eye" />
              <span>{{ adventure.is_public ? 'Public' : 'Private' }}</span>
            </div>
          </div>
          
          <div class="adventure-description" v-if="adventure.description">
            <h3>Description</h3>
            <p>{{ adventure.description }}</p>
          </div>
          
          <div class="adventure-locations">
            <h3>Locations</h3>
            <div class="location-item start">
              <div class="location-icon">
                <Icon icon="mdi:flag-variant" />
              </div>
              <div class="location-details">
                <h4>Starting Point</h4>
                <p>{{ adventure.start_location }}</p>
              </div>
            </div>
            
            <div v-if="adventure.end_location" class="location-item end">
              <div class="location-icon">
                <Icon icon="mdi:flag-checkered" />
              </div>
              <div class="location-details">
                <h4>Ending Point</h4>
                <p>{{ adventure.end_location }}</p>
              </div>
            </div>
          </div>
          
          <div class="adventure-dates">
            <div class="date-item">
              <h4>Created</h4>
              <p>{{ formatDateTime(adventure.created_at) }}</p>
            </div>
            <div class="date-item" v-if="adventure.updated_at && adventure.updated_at !== adventure.created_at">
              <h4>Last Updated</h4>
              <p>{{ formatDateTime(adventure.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn primary-btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';

const props = defineProps({
  adventure: {
    type: Object,
    required: true
  }
});

defineEmits(['close', 'edit', 'delete']);

const formatDistance = (distance) => {
  if (!distance) return 'N/A';
  return `${distance.toFixed(1)} km`;
};

const formatDuration = (duration) => {
  if (!duration) return 'N/A';
  
  if (duration < 60) {
    return `${duration} min`;
  } else {
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-3);
  animation: modal-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.edit-btn:hover {
  color: rgb(var(--md-sys-color-primary));
}

.delete-btn:hover {
  color: rgb(var(--md-sys-color-error));
}

.close-btn:hover {
  color: rgb(var(--md-sys-color-on-surface));
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.adventure-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.9rem;
}

.adventure-description h3,
.adventure-locations h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.adventure-description p {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface-variant));
  line-height: 1.5;
  white-space: pre-line;
}

.location-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  margin-bottom: 1rem;
}

.location-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.location-details h4 {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.location-details p {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.adventure-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.date-item h4 {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-weight: 500;
}

.date-item p {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.9rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgb(var(--md-sys-color-outline-variant));
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.primary-btn:hover {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-container {
    border-radius: 24px 24px 0 0;
    margin-top: auto;
    margin-bottom: 0;
    max-height: 85vh;
  }
  
  .adventure-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>