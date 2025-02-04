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

        // Replace previous press animation with reactive effects:
        this.$el.addEventListener('mousedown', () => {
            window.Motion.animate(this.$el, { scale: [1, 0.95] }, {
                duration: 0.08,
                easing: [0.4, 0, 0.2, 1]
            });
        });
        this.$el.addEventListener('mouseup', () => {
            window.Motion.animate(this.$el, { scale: [0.95, 1.05, 1] }, {
                duration: 0.15,
                easing: [0.175, 0.885, 0.32, 1.275]
            });
        });

        // Initialize favorite state
        const walkId = this.$el.dataset.walkId;
        
        // Add event listeners to prevent card being invisible on hover
        this.$el.addEventListener('mouseenter', () => {
            this.isHovered = true;
            this.$el.style.opacity = 1;
        });
        this.$el.addEventListener('mouseleave', () => {
            this.isHovered = false;
            this.$el.style.opacity = 1;
        });
        
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
        // Add a temporary expanding state for smoother transitions
        this.$el.classList.add('expanding');
        if (this.isExpanded) {
            this.isExpanded = false;
            this.animateContent(false).then(() => {
                this.$el.classList.remove('expanding');
                window.dispatchEvent(new CustomEvent('walk:expansion-changed', { detail: { walkId: null } }));
                const store = Alpine.store('walks');
                store.setSelectedWalk(null);
            });
        } else {
            const globals = Alpine.store('globals');
            if (globals?.expandWalk) {
                globals.expandWalk(this.walk.id);
            }
            this.animateContent(true).then(() => {
                this.$el.classList.remove('expanding');
            });
            window.dispatchEvent(new CustomEvent('walk:selected', { 
                detail: this.walk,
                bubbles: true
            }));
        }
    },

    animateContent(shouldExpand) {
        return new Promise((resolve) => {
            const content = this.$refs.content;
            const title = this.$el.querySelector('h3');
            if (!content || !window.Motion) {
                resolve();
                return;
            }

            if (shouldExpand) {
                content.style.display = 'block';
                const targetHeight = content.scrollHeight;
                window.Motion.animate([
                    [content, {
                        height: [0, targetHeight],
                        opacity: [0, 1],
                        margin: [0, '1rem 0'],
                        y: [-20, 0],
                        scale: [0.95, 1]
                    }, {
                        duration: 0.5,
                        easing: 'easeOutQuart'
                    }],
                    [content.querySelectorAll('img, .category-tag, p'), {
                        opacity: [0, 1],
                        y: [20, 0],
                        scale: [0.9, 1]
                    }, {
                        duration: 0.4,
                        delay: window.Motion.stagger(0.07, { start: 0.1 }),
                        easing: 'easeOutCubic'
                    }],
                    // Animate title with a smooth fade in and upward motion
                    [title, {
                        opacity: [0, 1],
                        y: [-30, 0],
                        scale: [0.9, 1]
                    }, {
                        duration: 0.6,
                        easing: 'easeOutQuart',
                        at: "<"
                    }]
                ]).finished.then(resolve);
            } else {
                window.Motion.animate([
                    [content.querySelectorAll('img, .category-tag, p'), {
                        opacity: [1, 0],
                        y: [0, -10],
                        scale: [1, 0.95]
                    }, {
                        duration: 0.3,
                        delay: window.Motion.stagger(0.04),
                        easing: 'easeInCubic'
                    }],
                    // Fade out the title simultaneously
                    [title, {
                        opacity: [1, 0],
                        y: [0, -15],
                        scale: [1, 0.95]
                    }, {
                        duration: 0.3,
                        easing: 'easeInCubic',
                        at: "<"
                    }],
                    [content, {
                        height: [content.scrollHeight, 0],
                        opacity: [1, 0],
                        margin: ['1rem 0', 0],
                        scale: [1, 0.95]
                    }, {
                        duration: 0.4,
                        easing: 'easeInQuart',
                        at: "<",
                        onComplete: () => {
                            content.style.display = 'none';
                        }
                    }]
                ]).finished.then(resolve);
            }
        });
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
        if (this.isVisible) return;
        this.isVisible = true;
        
        // Let the intersection observer handle the animation
        // Just ensure the initial state is set
        if (!this.$el.classList.contains('revealed')) {
            this.$el.style.opacity = '0';
            this.$el.style.transform = 'translateY(20px) scale(0.95)';
        }
    },

    adjustScroll() {
        this.$el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        });
        // After scrolling, expand the card if not already expanded
        setTimeout(() => {
            if (!this.isExpanded) {
                this.isExpanded = true;
                this.animateContent(true);
            }
        }, 300);
    },
});
