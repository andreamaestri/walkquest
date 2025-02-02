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
        
        const content = this.$refs.content;
        if (!content) return;

        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            // Show content first to measure height
            content.style.display = 'block';
            const targetHeight = content.scrollHeight;
            
            // Animate expansion
            window.Motion?.animate(content, {
                height: [0, targetHeight],
                opacity: [0, 1],
                margin: [0, '1rem 0']
            }, {
                duration: 0.3,
                easing: [0.4, 0, 0.2, 1]
            });
        } else {
            // Animate collapse
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

        // Dispatch event for map marker sync
        window.dispatchEvent(new CustomEvent('walk:expanded', { 
            detail: { walkId: this.walk.id, expanded: this.isExpanded }
        }));
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

    handleIntersection(entries) {
        // Update visibility and trigger animations
        const [entry] = entries;
        if (entry.isIntersecting) {
            this.isVisible = true;
            if (!this.hasAnimated) {
                this.hasAnimated = true;
                window.WalkAnimations?.animateEntry(this.$el);
            }
        } else {
            this.isVisible = false;
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
    }
});
