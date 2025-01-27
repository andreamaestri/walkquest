// Utility functions for category display
export function getCategoryEmoji(category) {
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
}

export function getCategoryColor(category) {
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

// Alpine.js store initialization
export function initializeAlpineStore() {
    return {
        darkMode: false,
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            document.documentElement.classList.toggle('dark');
        }
    };
}

// Shared Alpine.js directives
export function registerAlpineDirectives(Alpine) {
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
}