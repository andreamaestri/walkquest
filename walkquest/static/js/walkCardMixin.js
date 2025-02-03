// Walk card mixin for shared functionality
window.walkCardMixin = (walk) => ({
    isVisible: false,
    isExpanded: false,
    isHovered: false,
    isFavorited: false,
    isLoading: false,
    walk,

    init() {
        // Set up press animation using helper
        if (window.initMotionPress) {
            window.initMotionPress(this.$el, {
                scale: 0.98,
                duration: 100,
                onPressStart: () => this.$el.classList.add('pressing'),
                onPressEnd: () => this.$el.classList.remove('pressing')
            });
        }

        // Initialize favorite state
        const walkId = this.$el.dataset.walkId;
        
        // Initialize expandable content
        const content = this.$refs.content;
        if (content) {
            content.style.display = 'block';
            content.style.height = '0px';
            content.style.opacity = '0';
        }

        // Listen for expansion changes from store
        const handleExpansion = (event) => {
            // Only update if we have valid detail and this card exists
            if (!this.$el) return;
            if (event.detail) {
                const wasExpanded = this.isExpanded;
                this.isExpanded = event.detail.walkId === this.walk.id;
                
                if (this.isExpanded !== wasExpanded) {
                    this.animateContent(this.isExpanded);
                    if (this.isExpanded) this.adjustScroll();
                }
            }
        };

        window.addEventListener('walk:expansion-changed', handleExpansion);

        // Cleanup listener when component is destroyed
        this.$cleanup = () => {
            window.removeEventListener('walk:expansion-changed', handleExpansion);
        };
        
        if (walkId) {
            this.isFavorited = localStorage.getItem(`favorite_walk_${walkId}`) === 'true';
        }

        // Initialize intersection observer for lazy loading
        this.$nextTick(() => {
            if (this.$el.querySelector('img[loading="lazy"]')) {
                this.setupLazyLoading();
            }
        });
    },

    setupLazyLoading() {
        const images = this.$el.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.onload = () => {
                img.classList.remove('opacity-0');
                img.classList.add('opacity-100');
            };
        });
    },

    toggleExpand(event) {
        if (event) event.stopPropagation();

        // Use the store to handle expansion
        const store = Alpine.store('walks');
        if (store?.expandWalk) {
            store.expandWalk(this.walk.id);
        }

        // Dispatch walk:selected event first (will handle map movement and expansion)
        window.dispatchEvent(new CustomEvent('walk:selected', { 
            detail: this.walk,
            bubbles: true  // Ensure event bubbles up through DOM
        }));
    },

    animateContent(shouldExpand) {
        const content = this.$refs.content;
        if (!content) return;

        if (shouldExpand) {
            content.style.display = 'block';
            const targetHeight = content.scrollHeight;
            
            window.Motion?.animate(content, {
                height: [0, targetHeight],
                opacity: [0, 1],
                margin: [0, '1rem 0']
            }, {
                duration: 0.3,
                easing: [0.4, 0, 0.2, 1]
            });
        } else {
            window.Motion?.animate(content, {
                height: [content.scrollHeight, 0],
                opacity: [1, 0],
                margin: ['1rem 0', 0]
            }, {
                duration: 0.2,
                easing: [0.4, 0, 0.2, 1],
                onComplete: () => {
                    content.style.display = 'none';
                }
            });
        }
    },

    toggleFavorite() {
        const walkId = this.$el.dataset.walkId;
        if (!walkId) return;

        this.isFavorited = !this.isFavorited;
        localStorage.setItem(`favorite_walk_${walkId}`, this.isFavorited);

        // Animate favorite button
        const button = this.$el.querySelector('.favorite-btn');
        if (button && window.Motion) {
            window.Motion.animate(button, {
                scale: [1, 1.2, 1],
            }, {
                duration: 0.3,
                easing: [0.4, 0, 0.2, 1]
            });
        }

        // Dispatch event for global state
        window.dispatchEvent(new CustomEvent('walk:favorite', {
            detail: {
                walkId,
                isFavorited: this.isFavorited
            }
        }));
    },

    handleVisibility() {
        this.isVisible = true;
        // Only animate once when card becomes visible
        if (!this.hasAnimated) {
            this.hasAnimated = true;
            if (window.Motion) {
                window.Motion.animate(this.$el, {
                    y: [20, 0],
                    opacity: [0, 1],
                    scale: [0.95, 1]
                }, {
                    duration: 0.3,
                    easing: [0.2, 0.4, 0.2, 1]
                });
            }
        }
    },

    adjustScroll() {
        // Wait for any animations to complete
        setTimeout(() => {
            const cardList = this.$el.closest('.walk-list');
            if (!cardList) return;
            
            // Calculate optimal scroll position
            const cardRect = this.$el.getBoundingClientRect();
            const listRect = cardList.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;
            
            // Calculate target scroll position to center the card
            const targetScroll = cardList.scrollTop +
                (cardRect.top - listRect.top) -
                (listRect.height - cardRect.height) / 2;
            
            // Initial smooth scroll to center the card
            cardList.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });

            // Handle expanded content visibility after expansion animation
            if (this.isExpanded && this.$refs.content) {
                setTimeout(() => {
                    const contentRect = this.$refs.content.getBoundingClientRect();
                    const listBottom = listRect.bottom;
                    
                    // If expanded content is cut off, scroll to show it
                    if (contentRect.bottom > listBottom) {
                        const additionalScroll = contentRect.bottom - listBottom + 40; // Add padding
                        cardList.scrollBy({
                            top: additionalScroll,
                            behavior: 'smooth'
                        });
                    }
                }, 300); // Wait for expansion animation
            }
        }, 50); // Reduced initial delay for better responsiveness
    },
});
