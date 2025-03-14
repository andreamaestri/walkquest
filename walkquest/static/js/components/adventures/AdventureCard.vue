<template>
  <div class="adventure-card" @click="$emit('view', adventure)">
    <div 
      class="adventure-image"
      :style="{ backgroundColor: generateColorFromTitle(adventure.title) }"
    >
      <Icon :icon="adventure.icon || 'mdi:map-marker'" class="adventure-icon" />
    </div>
    <div class="adventure-content">
      <h3 class="adventure-title">{{ adventure.title }}</h3>
      <p class="adventure-description">{{ truncateDescription(adventure.description) }}</p>
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
  return text.length > 120 ? text.substring(0, 120) + '...' : text;
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
.adventure-card {
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.adventure-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--md-sys-elevation-2);
}

.adventure-image {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--md-sys-color-primary-container));
}

.adventure-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-on-primary-container));
}

.adventure-content {
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.adventure-title {
  margin: 0 0 0.5rem;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 1.2rem;
}

.adventure-description {
  margin: 0 0 1rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.9rem;
  flex-grow: 1;
}

.adventure-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.adventure-distance,
.adventure-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.adventure-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.adventure-card:hover .adventure-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
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
</style>
