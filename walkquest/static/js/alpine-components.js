// Global utilities for Alpine components
window.WalkUtils = {
    // Category display utilities
    getCategoryEmoji(category) {
        const emojiMap = {
            'hiking': '🥾',
            'nature': '🌲',
            'historical': '🏛️',
            'scenic': '🌅',
            'family': '👨‍👩‍👧‍👦',
            'challenging': '🏃',
            'coastal': '🌊',
            'mountain': '⛰️',
            'default': '🚶'
        };
        return emojiMap[category?.slug] || emojiMap.default;
    },

    getCategoryColor(category) {
        const colorMap = {
            'hiking': '#4CAF50',
            'nature': '#8BC34A',
            'historical': '#795548',
            'scenic': '#FF9800',
            'family': '#2196F3',
            'challenging': '#F44336',
            'coastal': '#03A9F4',
            'mountain': '#607D8B',
            'default': '#9E9E9E'
        };
        return colorMap[category?.slug] || colorMap.default;
    }
};

// Initialize Alpine stores and plugins
document.addEventListener('alpine:init', () => {
    // Global store for shared state
    Alpine.store('app', {
        darkMode: false,
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            document.documentElement.classList.toggle('dark');
        }
    });

    // Register global directives
    Alpine.directive('tooltip', (el, { expression }) => {
        return {
            ['x-data']() {
                return {
                    show: false,
                    text: expression
                };
            },
            ['@mouseenter']() { this.show = true; },
            ['@mouseleave']() { this.show = false; }
        };
    });

    // Register global magics
    Alpine.magic('utils', () => window.WalkUtils);
});