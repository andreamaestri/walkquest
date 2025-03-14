import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
  // State
  const messages = ref([]);
  const nextId = ref(0);

  /**
   * Show a toast notification using MDSnackbar
   * @param {string} message - The message to display
   * @param {string} type - The type of notification ('success', 'error', 'info', 'warning')
   * @param {number} duration - Duration in ms before auto-dismiss (default: 5000ms)
   * @returns {number} - The ID of the toast
   */
  function show(message, type = 'info', duration = 5000) {
    // Create a custom event to notify the MDSnackbar component
    const event = new CustomEvent('snackbar-show', {
      detail: {
        message,
        type,
        duration
      }
    });

    // Dispatch the event to be picked up by MDSnackbar
    window.dispatchEvent(event);
    
    // For compatibility with existing code, still maintain the messages array
    const id = nextId.value++;
    const toast = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now()
    };
    
    messages.value.push(toast);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
    
    return id;
  }
  
  /**
   * Dismiss a specific toast notification
   * @param {number} id - The ID of the toast to dismiss
   */
  function dismiss(id) {
    const index = messages.value.findIndex(msg => msg.id === id);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  }
  
  /**
   * Dismiss all toast notifications
   */
  function dismissAll() {
    messages.value = [];
    
    // Create a custom event to hide all notifications
    const event = new CustomEvent('snackbar-hide-all');
    window.dispatchEvent(event);
  }

  /**
   * Convenience methods for different toast types
   */
  function success(message, duration = 5000) {
    return show(message, 'success', duration);
  }

  function error(message, duration = 5000) {
    return show(message, 'error', duration);
  }

  function info(message, duration = 5000) {
    return show(message, 'info', duration);
  }

  function warning(message, duration = 5000) {
    return show(message, 'warning', duration);
  }

  return {
    messages,
    show,
    dismiss,
    dismissAll,
    success,
    error,
    info,
    warning
  };
});