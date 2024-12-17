// Utility functions
const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing to localStorage:', e);
        }
    }
};

function getCategoryEmoji(category) {
    if (!category || typeof category !== 'object') {
        return '🚶‍♂️';
    }
    
    const slug = category.slug || '';
    const emojiMap = {
        'coastal': '🏖️',
        'woodland': '🌳',
        'historical': '🏛️',
        'scenic': '🌅',
        'family-friendly': '👨‍👩‍👧‍👦',
        'challenging': '🏃',
        'easy': '🚶',
        'moderate': '⛰️',
        'waterfall': '💦',
        'wildlife': '🦊'
    };
    return emojiMap[slug.toLowerCase()] || '🚶‍♂️';
}

function getCategoryColor(category) {
    if (!category || typeof category !== 'object') {
        return '#6B7280';
    }
    
    const slug = category.slug || '';
    const colorMap = {
        'coastal': '#0EA5E9',
        'woodland': '#22C55E',
        'historical': '#8B5CF6',
        'scenic': '#F59E0B',
        'family-friendly': '#EC4899',
        'challenging': '#EF4444',
        'easy': '#10B981',
        'moderate': '#6366F1',
        'waterfall': '#06B6D4',
        'wildlife': '#84CC16'
    };
    return colorMap[slug.toLowerCase()] || '#6B7280';
}

// Define Alpine.js extension for auxiliary components
const WalkQuestComponents = {
    init() {
        // Only register categoryCombobox component
        Alpine.data('categoryCombobox', (config) => ({
            options: config.options || [],
            isOpen: false,
            searchQuery: '',
            selectedOptions: storage.get('categorySelections', []),
            
            init() {
                Alpine.effect(() => {
                    storage.set('categorySelections', this.selectedOptions);
                });
            },
            
            get filteredOptions() {
                return this.options.filter(option => 
                    option.label.toLowerCase().includes(this.searchQuery.toLowerCase())
                );
            },
            
            toggleOption(option) {
                const index = this.selectedOptions.findIndex(o => o.value === option.value);
                if (index === -1) {
                    this.selectedOptions.push(option);
                } else {
                    this.selectedOptions.splice(index, 1);
                }
                this.$dispatch('categories-updated', this.selectedOptions.map(o => o.value));
            },
            
            isSelected(option) {
                return this.selectedOptions.some(o => o.value === option.value);
            },
            
            clearSelection() {
                this.selectedOptions = [];
                this.$dispatch('categories-updated', []);
            }
        }));

        // Initialize walk interface
        Alpine.data('walkInterface', () => ({
            isLoading: false,
            showSidebar: true,
            searchQuery: '',
            selectedWalk: null,
            filteredWalks: [],
            
            formatDistance(distance) {
                return distance ? `${distance.toFixed(1)} km` : 'Unknown distance';
            },

            init() {
                // Initialize with walks data
                this.filteredWalks = JSON.parse(document.getElementById('walks-data').textContent || '[]');
            },

            toggleSidebar() {
                this.showSidebar = !this.showSidebar;
            },

            handleSearch() {
                // Implement search logic
            },

            selectWalk(id) {
                this.selectedWalk = id;
            }
        }));

        // Initialize store
        Alpine.store('app', {
            initialized: false,
            initialize() {
                this.initialized = true;
            }
        });
    }
};

export { getCategoryEmoji, getCategoryColor }; // Export utilities for use in other files
export default WalkQuestComponents;
