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
        const globals = Alpine.store('globals');
        if (globals?.expandWalk) {
            globals.expandWalk(this.walk.id);
        }
        window.dispatchEvent(new CustomEvent('walk:selected', { 
            detail: this.walk,
            bubbles: true
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
