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
    messageQueue.forEach(item => {
      snackbarInstance.showMessage(
        item.message, 
        item.type, 
        item.duration, 
        item.action, 
        item.callback
      );
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
   * @param {string} type - Message type: 'default', 'info', 'success', 'error', 'warning'
   * @param {number} duration - How long to show the message in milliseconds
   * @param {string} action - Optional action button text
   * @param {Function} callback - Optional callback function for the action button
   */
  const showMessage = (message, type = 'default', duration = 5000, action = null, callback = null) => {
    if (snackbarInstance) {
      // Direct component call if instance is available
      snackbarInstance.showMessage(message, type, duration, action, callback);
    } else {
      // Queue the message if instance not available yet
      messageQueue.push({ message, type, duration, action, callback });
      
      // Also dispatch event as fallback
      window.dispatchEvent(
        new CustomEvent('snackbar-show', {
          detail: { message, type, duration, action, actionCallback: callback }
        })
      );
    }
  };

  /**
   * Show a success message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in milliseconds
   * @param {string} action - Optional action button text
   * @param {Function} callback - Optional callback function for the action button
   */
  const showSuccess = (message, duration = 5000, action = null, callback = null) => {
    showMessage(message, 'success', duration, action, callback);
  };

  /**
   * Show an error message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in milliseconds
   * @param {string} action - Optional action button text
   * @param {Function} callback - Optional callback function for the action button
   */
  const showError = (message, duration = 5000, action = null, callback = null) => {
    showMessage(message, 'error', duration, action, callback);
  };

  /**
   * Show an info message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in milliseconds
   * @param {string} action - Optional action button text
   * @param {Function} callback - Optional callback function for the action button
   */
  const showInfo = (message, duration = 5000, action = null, callback = null) => {
    showMessage(message, 'info', duration, action, callback);
  };

  /**
   * Show a warning message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in milliseconds
   * @param {string} action - Optional action button text
   * @param {Function} callback - Optional callback function for the action button
   */
  const showWarning = (message, duration = 5000, action = null, callback = null) => {
    showMessage(message, 'warning', duration, action, callback);
  };

  /**
   * Hide any active snackbar
   */
  const hide = () => {
    if (snackbarInstance) {
      snackbarInstance.hide();
    } else {
      // Dispatch event as fallback
      window.dispatchEvent(new CustomEvent('snackbar-hide-all'));
    }
  };

  return {
    show: showMessage,
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    hide
  };
}

export default useSnackbar;