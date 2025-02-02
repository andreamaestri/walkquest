// Animation constants
const ANIMATION_CONFIG = {
  duration: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  pressScale: 0.98,
  pressDuration: 100,
  scrollOffset: 16
};

window.walkCardMixin = (walk) => {
  // Cache DOM queries
  let contentElement = null;
  let scrollContainer = null;
  let headerHeight = null;

  return {
    walk,
    inView: false,
    expanded: false, // Track expansion state locally
    
    // Computed properties
    isSelected() {
      return this.$store.walks.selectedWalk?.id === this.walk.id;
    },

    // Intersection Observer options
    intersectionOptions: {
      threshold: 0.5,
      margin: '100px 0px 100px 0px'
    },

    // Lazily initialize cached elements
    getElements() {
      if (!contentElement) {
        contentElement = this.$el.querySelector('.expandable-content');
      }
      if (!scrollContainer) {
        scrollContainer = this.$el.closest('.overflow-y-auto');
      }
      if (headerHeight === null) {
        const searchBar = document.querySelector('.sticky.top-0');
        headerHeight = searchBar ? searchBar.offsetHeight : 0;
      }
      return { contentElement, scrollContainer, headerHeight };
    },

    // Handle intersection observer updates
    onIntersect(entries) {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        this.inView = true;
      }
    },

    // Check if element is fully visible in container
    isFullyVisible() {
      const { scrollContainer, headerHeight } = this.getElements();
      if (!scrollContainer) return true;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = this.$el.getBoundingClientRect();
      const offset = headerHeight + ANIMATION_CONFIG.scrollOffset;

      return elementRect.top >= containerRect.top + offset &&
             elementRect.bottom <= containerRect.bottom;
    },

    // Smooth scroll with performance optimizations
    scrollIntoViewSmoothly() {
      const { scrollContainer, headerHeight } = this.getElements();
      if (!scrollContainer || this.isFullyVisible()) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = this.$el.getBoundingClientRect();
      const offset = headerHeight + ANIMATION_CONFIG.scrollOffset;
      const targetScroll = scrollContainer.scrollTop + 
                          (elementRect.top - containerRect.top) - offset;

      requestAnimationFrame(() => {
        scrollContainer.scrollTo({ 
          top: targetScroll, 
          behavior: 'smooth' 
        });
      });
    },

    // Handle content animation with performance optimizations
    async animateContent(expanding) {
      const { contentElement } = this.getElements();
      if (!contentElement) return;

      const animationProps = {
        duration: ANIMATION_CONFIG.duration,
        easing: ANIMATION_CONFIG.easing
      };

      if (expanding) {
        // Setup initial state without forced reflow
        contentElement.style.cssText = 
          'display: block; position: relative; height: auto; opacity: 0; margin-top: 0px;';
        
        const targetHeight = contentElement.scrollHeight;
        
        // Animate using Web Animations API for better performance
        await Promise.all([
          contentElement.animate([
            { height: '0px', opacity: 0, marginTop: '0px' },
            { height: `${targetHeight}px`, opacity: 1, marginTop: '16px' }
          ], animationProps).finished,
          
          this.$el.animate([
            { transform: 'scale(1)' },
            { transform: `scale(${ANIMATION_CONFIG.pressScale})` },
            { transform: 'scale(1)' }
          ], { duration: ANIMATION_CONFIG.pressDuration }).finished
        ]);

        contentElement.style.cssText = 
          'display: block; height: auto; opacity: 1; margin-top: 16px;';
      } else {
        const animation = contentElement.animate([
          { height: `${contentElement.scrollHeight}px`, opacity: 1, marginTop: '16px' },
          { height: '0px', opacity: 0, marginTop: '0px' }
        ], animationProps);

        await animation.finished;
        if (!this.isSelected()) {
          contentElement.style.display = 'none';
        }
      }
    },

    // Handle expand/collapse with improved state management
    async toggleExpand(event) {
      // Ignore clicks on action buttons
      if (event?.target?.closest('.favorite-btn, .action-btn')) return;
      
      const expanding = !this.isSelected();
      
      // Handle state changes first
      if (expanding) {
        // Collapse other cards before expanding this one
        if (this.$store.walks.selectedWalk?.id !== this.walk.id) {
          window.dispatchEvent(new Event('collapse-other-cards'));
          // Wait for collapse animation
          await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.duration + 50));
        }
        
        // Update store state
        this.$store.walks.setSelectedWalk(this.walk);
        this.$store.walks.startLoading();
        this.$store.walks.setProgress(20);
      } else {
        this.$store.walks.setSelectedWalk(null);
      }

      // Animate content
      await this.animateContent(expanding);
      
      // Scroll into view if needed (only when expanding)
      if (expanding) {
        this.scrollIntoViewSmoothly();
      }

      // Dispatch event after animation completes
      window.dispatchEvent(new CustomEvent('walk:selected', { 
        detail: expanding ? this.walk : null 
      }));
    },

    // Initialize the component
    init() {
      // Setup Motion.js press animation if available
      if (window.Motion?.press) {
        window.Motion.press(this.$el, {
          scale: ANIMATION_CONFIG.pressScale,
          duration: ANIMATION_CONFIG.pressDuration
        });
      }

      // Handle collapse events
      window.addEventListener('collapse-other-cards', () => {
        if (this.isSelected()) {
          this.toggleExpand({});
        }
      });

      // Setup intersection observer
      const observer = new IntersectionObserver(
        entries => this.onIntersect(entries),
        {
          root: this.getElements().scrollContainer,
          rootMargin: this.intersectionOptions.margin,
          threshold: this.intersectionOptions.threshold
        }
      );

      observer.observe(this.$el);

      // Cleanup on component destroy
      this.$cleanup = () => observer.disconnect();
    }
  };
};
