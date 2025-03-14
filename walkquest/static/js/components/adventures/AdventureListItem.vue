<template>
  <div class="adventure-list-item" @click="$emit('view', adventure)">
    <div 
      class="adventure-icon-wrapper"
      :style="{ backgroundColor: generateColorFromTitle(adventure.title) }"
    >
      <Icon :icon="adventure.icon || 'mdi:map-marker'" class="adventure-icon" />
    </div>
    <div class="adventure-content">
      <div class="adventure-header">
        <h3 class="adventure-title">{{ adventure.title }}</h3>
        <div class="adventure-meta">
          <span class="adventure-distance">
            <Icon icon="mdi:map-marker-distance" />
            {{ formatDistance(adventure.distance) }}
          </span>
          <span class="adventure-date">
            <Icon icon="mdi:calendar" />
            {{ formatDate(adventure.created_at) }}
          </span>
        </div>
      </div>
      <p class="adventure-description">{{ truncateDescription(adventure.description) }}</p>
    </div>
    <div class="adventure-actions" @click.stop>
      <button 
        class="action-btn edit"
        @click="$emit('edit', adventure)"
        aria-label="Edit adventure"
      >
        <Icon icon="mdi:pencil" />
      </button>
      <button 
        class="action-btn delete"
        @click="$emit('delete', adventure)"
        aria-label="Delete adventure"
      >
        <Icon icon="mdi:delete" />
      </button>
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

defineEmits(['view', 'edit', 'delete']);

const truncateDescription = (text) => {
  if (!text) return '';
  return text.length > 180 ? text.substring(0, 180) + '...' : text;
};

const formatDistance = (distance) => {
  if (!distance) return 'N/A';
  return `${distance.toFixed(1)} km`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const generateColorFromTitle = (title) => {
  if (!title) return 'rgb(var(--md-sys-color-primary))';
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `oklch(70% 0.14 ${hue}deg)`;
};
</script>

<style scoped>
.adventure-list-item {
  display: flex;
  align-items: center;
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  padding: 1rem;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.adventure-list-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-1);
}

.adventure-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--md-sys-color-primary-container));
  flex-shrink: 0;
}

.adventure-icon {
  font-size: 28px;
  color: rgb(var(--md-sys-color-on-primary-container));
}

.adventure-content {
  flex: 1;
  min-width: 0;
}

.adventure-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.adventure-title {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 1.1rem;
}

.adventure-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  white-space: nowrap;
}

.adventure-distance,
.adventure-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.adventure-description {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.adventure-actions {
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
  background-color: rgb(var(--md-sys-color-surface));
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: background-color 0.2s, color 0.2s;
}

.action-btn.edit:hover {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.action-btn.delete:hover {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

@media (max-width: 768px) {
  .adventure-header {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .adventure-meta {
    width: 100%;
    justify-content: flex-start;
  }
  
  .adventure-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .adventure-description {
    display: none;
  }
}
</style>
