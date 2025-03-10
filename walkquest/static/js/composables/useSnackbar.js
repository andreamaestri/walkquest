/**
 * Composable function to provide global access to the snackbar
 * This creates a unified API for showing notifications throughout the app
 */

// Global reference that will be set when the snackbar component is mounted
let snackbarInstance = null;
let messageQueue = [];

/**
 * Register the snackbar instance
 * @param {Object} instance - Reference to the MDSnackbar component instance
 */
export function registerSnackbar(instance) {
  snackbarInstance = instance;
  // Process any queued messages
  if (messageQueue.length > 0) {
    messageQueue.forEach(message => {
      snackbarInstance.showMessage(message);
    });
    messageQueue = [];
  }
}

/**
 * Use the snackbar functionality
 * @returns {Object} - Snackbar methods
 */
export function useSnackbar() {
  /**
   * Show a message in the snackbar
   * @param {string} message - The message to display
   */
  const showMessage = (message) => {
    if (snackbarInstance) {
      // Direct component call if instance is available
      snackbarInstance.showMessage(message);
    } else {
      // Queue the message if instance not available yet
      messageQueue.push(message);
      // Also dispatch event as fallback
      window.dispatchEvent(
        new CustomEvent('snackbar-show', {
          detail: { message }
        })
      );
    }
  };

  return {
    show: showMessage
  };
}

export default useSnackbar;