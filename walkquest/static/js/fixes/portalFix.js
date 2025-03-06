/**
 * Portal Fix for Mobile Touch Events
 * 
 * This script fixes issues with portal containers blocking touch events
 * by using direct DOM manipulation and a MutationObserver to ensure
 * the portal container itself has pointer-events: none while its children
 * maintain pointer-events: auto.
 */

(function() {
  // Apply the fix when the DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    applyPortalFix();
  });
  
  // Also try to apply when window loads
  window.addEventListener('load', function() {
    applyPortalFix();
  });
  
  // Function to apply the portal fix
  function applyPortalFix() {
    // Phase 1: Fix existing portal root
    let portalRoot = document.getElementById('portal-root');
    if (portalRoot) {
      fixPortalElement(portalRoot);
    }
    
    // Phase 2: Set up an observer to fix portals dynamically
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Find portal root if it was added
          const newPortalRoot = document.getElementById('portal-root');
          if (newPortalRoot && newPortalRoot !== portalRoot) {
            portalRoot = newPortalRoot;
            fixPortalElement(portalRoot);
          }
          
          // Also check portal children for proper event handling
          if (portalRoot) {
            Array.from(portalRoot.children).forEach(child => {
              child.style.setProperty('pointer-events', 'auto', 'important');
              child.querySelectorAll('*').forEach(descendant => {
                if (descendant.classList.contains('dialog-overlay') || 
                    descendant.classList.contains('adventure-log-dialog')) {
                  descendant.style.setProperty('pointer-events', 'auto', 'important');
                }
              });
            });
          }
        }
      }
    });
    
    // Start observing the body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Apply fix every 500ms as a fallback approach
    setInterval(function() {
      portalRoot = document.getElementById('portal-root');
      if (portalRoot) {
        fixPortalElement(portalRoot);
        
        // Fix children too
        Array.from(portalRoot.children).forEach(child => {
          child.style.setProperty('pointer-events', 'auto', 'important');
          child.querySelectorAll('*').forEach(descendant => {
            if (descendant.classList.contains('dialog-overlay') || 
                descendant.classList.contains('adventure-log-dialog')) {
              descendant.style.setProperty('pointer-events', 'auto', 'important');
            }
          });
        });
      }
    }, 500);
  }
  
  // Helper function to fix a portal element
  function fixPortalElement(element) {
    if (!element) return;
    
    // Add !important to ensure these properties take precedence
    element.style.setProperty('position', 'fixed', 'important');
    element.style.setProperty('top', '0', 'important');
    element.style.setProperty('left', '0', 'important');
    element.style.setProperty('width', '100%', 'important');
    element.style.setProperty('height', '100%', 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
    element.style.setProperty('z-index', '9999', 'important');
    
    // User-select none to prevent accidental selection
    element.style.setProperty('user-select', 'none', 'important');
    
    // Also fix the CSS at the document level
    ensurePortalCSSRules();
  }
  
  // Add CSS rules to the document to ensure proper portal behavior
  function ensurePortalCSSRules() {
    let style = document.getElementById('portal-fix-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'portal-fix-styles';
      document.head.appendChild(style);
    }
    
    style.textContent = `
      #portal-root {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 9999 !important;
        pointer-events: none !important;
      }
      
      #portal-root > * {
        pointer-events: auto !important;
      }
      
      #portal-root .dialog-overlay,
      #portal-root .adventure-log-dialog,
      #portal-root button,
      #portal-root input,
      #portal-root select,
      #portal-root textarea {
        pointer-events: auto !important;
      }
    `;
  }
})();