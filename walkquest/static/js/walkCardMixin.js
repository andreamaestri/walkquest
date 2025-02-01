window.walkCardMixin = (walk) => {
  return {
    walk,
    inView: false,
    isSelected() {
      return this.$store.walks.selectedWalk?.id === this.walk.id;
    },
    toggleExpand(event) {
      if (event && event.target && event.target.closest('.favorite-btn, .action-btn')) return;
      
      const content = this.$el.querySelector('.expandable-content');
      if (!content) return;
      
      const newState = !this.isSelected();
      
      // Handle the expansion state
      if (newState) {
        // First make it visible but with 0 height
        content.style.display = 'block';
        content.style.position = 'relative';
        content.style.height = '0px';
        content.style.opacity = '0';
        content.style.marginTop = '0px';
        
        // Force a reflow
        content.offsetHeight;
        
        // Set transition
        requestAnimationFrame(() => {
          content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          
          // Add transition to parent for smoother height animation
          this.$el.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        // Get target height
        content.style.height = 'auto';
        const targetHeight = content.scrollHeight;
        content.style.height = '0px';
        
        // Force another reflow
        content.offsetHeight;
        
        // Expand
        content.style.height = targetHeight + 'px';
        content.style.opacity = '1';
        content.style.marginTop = '16px';

        // Calculate optimal scroll position
        requestAnimationFrame(() => {
          const searchBar = document.querySelector('.search-bar');
          const searchBarHeight = searchBar ? searchBar.offsetHeight + 16 : 0; // Add 16px padding
          const cardTop = this.$el.getBoundingClientRect().top + window.scrollY;
          const viewportHeight = window.innerHeight;
          const cardHeight = this.$el.offsetHeight;
          
          // Calculate optimal scroll position to show as much of the card as possible
          let scrollTarget = cardTop - searchBarHeight;
          
          // If card is taller than viewport, position it near the top
          if (cardHeight > viewportHeight - searchBarHeight) {
            scrollTarget = cardTop - searchBarHeight - 16; // Additional 16px buffer
          }
          
          window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        });
        
        // Start loading state
        this.$store.walks.startLoading();
        this.$store.walks.setProgress(20);
      } else {
        // Collapse
        const currentHeight = content.scrollHeight;
        
        // Ensure smooth collapse transition
        content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        content.style.height = currentHeight + 'px';
        
        // Force reflow
        content.offsetHeight;
        
        // Animate collapse
        content.style.height = '0px';
        content.style.opacity = '0';
        content.style.marginTop = '0px';
        
        // Smooth scroll if card is above viewport
        if (this.$el.getBoundingClientRect().top < 0) {
          this.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Hide after transition
        content.addEventListener('transitionend', () => {
          if (!this.isSelected()) {
            content.style.display = 'none';
          }
          this.$el.style.transition = '';
        }, { once: true });
      }

      // Update store
      this.$store.walks.setSelectedWalk(newState ? this.walk : null);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('walk:selected', {
        detail: newState ? this.walk : null
      }));
    },
    init() {
      // Initialize press interaction
      if (window.Motion?.press) {
        window.Motion.press(this.$el, () => ({
          scale: 0.98,
          transition: { duration: 0.1 }
        }));
      }
      this.inView = true;
    }
  };
};
