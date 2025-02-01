window.walkCardMixin = (walk) => ({
  walk,
  inView: false,
  isSelected() {
    return this.$store.walks.selectedWalk?.id === this.walk.id;
  },
  intersectionOptions: {
    threshold: 0.5,
    margin: '100px 0px 100px 0px'
  },
  onIntersect(entries) {
    const [entry] = entries;
    if (entry?.isIntersecting) {
      this.inView = true;
    }
  },
  getStickyHeaderHeight() {
    const searchBar = document.querySelector('.sticky.top-0');
    return searchBar ? searchBar.offsetHeight : 0;
  },
  // Smoothly scroll the card into view considering the sticky header,
  // only if the card is not fully visible.
  scrollIntoViewSmoothly() {
    const headerHeight = this.getStickyHeaderHeight();
    const scrollContainer = this.$el.closest('.overflow-y-auto');
    if (!scrollContainer) return;
    const offset = headerHeight + 16;
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = this.$el.getBoundingClientRect();
    // Skip scroll if already fully visible in container.
    if (elementRect.top >= containerRect.top + offset &&
        elementRect.bottom <= containerRect.bottom) {
      return;
    }
    const targetScroll = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - offset;
    requestAnimationFrame(() => {
      scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
    });
  },
  toggleExpand(event) {
    if (event?.target?.closest('.favorite-btn, .action-btn')) return;
    const content = this.$el.querySelector('.expandable-content');
    if (!content) return;
    
    const expanding = !this.isSelected();
    if (expanding) {
      // If another card is expanded, collapse it first.
      if (this.$store.walks.selectedWalk && this.$store.walks.selectedWalk.id !== this.walk.id) {
        window.dispatchEvent(new Event('collapse-other-cards'));
        // Wait for collapse animation (~500ms) before scrolling
        setTimeout(() => {
          this.scrollIntoViewSmoothly();
        }, 550);
      } else {
        this.scrollIntoViewSmoothly();
      }
      // Expand: set initial state and trigger animation
      content.style.cssText = 'display: block; position: relative; height: 0px; opacity: 0; margin-top: 0px;';
      content.offsetHeight; // Force reflow
      requestAnimationFrame(() => {
        content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        this.$el.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      });
      content.style.height = 'auto';
      const targetHeight = content.scrollHeight;
      content.style.height = '0px';
      content.offsetHeight; // Force reflow
      content.style.height = targetHeight + 'px';
      content.style.opacity = '1';
      content.style.marginTop = '16px';
      this.$store.walks.startLoading();
      this.$store.walks.setProgress(20);
    } else {
      // Collapse: animate to collapse without scrolling
      const currentHeight = content.scrollHeight;
      content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      content.style.height = currentHeight + 'px';
      content.offsetHeight;
      content.style.height = '0px';
      content.style.opacity = '0';
      content.style.marginTop = '0px';
      content.addEventListener('transitionend', () => {
        if (!this.isSelected()) content.style.display = 'none';
        this.$el.style.transition = '';
      }, { once: true });
    }
    
    this.$store.walks.setSelectedWalk(expanding ? this.walk : null);
    window.dispatchEvent(new CustomEvent('walk:selected', { detail: expanding ? this.walk : null }));
  },
  adjustScroll() {
    this.scrollIntoViewSmoothly();
  },
  init() {
    if (window.Motion?.press) {
      window.Motion.press(this.$el, () => ({ scale: 0.98, transition: { duration: 0.1 } }));
    }
    // Listen for collapse event from other cards
    window.addEventListener('collapse-other-cards', () => {
      if (this.isSelected()) {
        // Simulate collapse without event details
        this.toggleExpand({});
      }
    });
    const observer = new IntersectionObserver(
      (entries) => this.onIntersect(entries),
      {
        root: this.$el.closest('.overflow-y-auto'),
        rootMargin: this.intersectionOptions.margin,
        threshold: this.intersectionOptions.threshold
      }
    );
    observer.observe(this.$el);
  }
});
