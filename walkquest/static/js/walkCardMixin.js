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

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            // Animate expansion
            window.Motion?.animate(this.$el, {
                height: 'auto',
                scale: [0.98, 1],
            }, {
                duration: 0.3,
                easing: [0.4, 0, 0.2, 1]
            });
        } else {
            // Animate collapse
            window.Motion?.animate(this.$el, {
                scale: [1, 0.98],
                height: this.$el.scrollHeight + 'px'
            }, {
                duration: 0.2,
                easing: [0.4, 0, 0.2, 1]
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
    }
});
