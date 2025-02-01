window.walkCardMixin = (walk) => {
  return {
    walk,
    inView: false,
    intersectionOptions: {
      threshold: 0.2,
      rootMargin: '-80px 0px'
    },
    isSelected() {
      return this.$store.walks.selectedWalk?.id === this.walk.id;
    },
    toggleExpand(event) {
      if (event && event.target && event.target.closest('.favorite-btn, .action-btn')) return;
      
      const content = this.$el.querySelector('.expandable-content');
      if (!content) return;
      
      const newState = !this.isSelected();
      console.log('toggleExpand:', { walkId: this.walk.id, newState });
      
      // Handle the expansion state
      if (newState) {
        this.expandAndScroll();
      } else {
        this.collapse();
      }

      // Update store
      this.$store.walks.setSelectedWalk(newState ? this.walk : null);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('walk:selected', {
        detail: newState ? this.walk : null
      }));
    },
    expandAndScroll() {
      const content = this.$el.querySelector('.expandable-content');
      if (!content) return;

      // Make visible immediately
      content.style.display = 'block';
      
      // Get natural height
      content.style.height = 'auto';
      const targetHeight = content.scrollHeight;
      content.style.height = '0px';
      
      // Force reflow
      content.offsetHeight;
      
      // Set transition
      content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Expand with animation
      content.style.height = `${targetHeight}px`;
      content.style.opacity = '1';
      content.style.marginTop = '16px';
      
      // Scroll into view with offset
      const headerOffset = 80;
      const elementPosition = this.$el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerOffset,
        behavior: 'smooth'
      });

      // Start loading state
      this.$store.walks.startLoading();
      this.$store.walks.setProgress(20);
    },
    collapse() {
      const content = this.$el.querySelector('.expandable-content');
      if (!content) return;

      // Set current height explicitly before animating
      const currentHeight = content.scrollHeight;
      content.style.height = `${currentHeight}px`;
      
      // Force reflow
      content.offsetHeight;
      
      // Animate collapse
      content.style.height = '0px';
      content.style.opacity = '0';
      content.style.marginTop = '0px';
      
      // Hide after transition
      content.addEventListener('transitionend', () => {
        if (!this.isSelected()) {
          content.style.display = 'none';
        }
      }, { once: true });
    },
    init() {
      // Initialize press interaction
      if (window.Motion?.press) {
        window.Motion.press(this.$el, () => ({
          scale: 0.98,
          transition: { duration: 0.1 }
        }));
      }

      // Watch for intersection
      this.inView = true;
      this.$el.classList.add('reveal-card');

      // If this card is selected, expand it after initialization
      if (this.isSelected()) {
        this.$nextTick(() => {
          this.expandAndScroll();
        });
      }
    }
  };
};
