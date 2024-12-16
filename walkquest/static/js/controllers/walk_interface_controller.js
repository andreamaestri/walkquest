import { walkStore } from '../project.js';

export default class extends Stimulus.Controller {
    static targets = [
        'loading',
        'sidebar',
        'toggleIcon',
        'searchQuery',
        'categoryTags',
        'selectedTags',
        'walkList',
        'walkName',
        'walkDistance',
        'walkSteepness',
        'walkCategories',
        'walkCategory',
        'walkPub',
        'walkCafe',
        'favoriteIcon',
        'favoriteText',
        'emptyState'
    ];

    static values = {
        isAuthenticated: Boolean
    }

    initialize() {
        this.walkStore = walkStore;
    }

    async connect() {
        await this.walkStore.fetchInitialData();
        this.updateLoadingState();
        this.renderWalks();
        this.listenToWalkStore();
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('hidden');
        this.toggleIcon.setAttribute('icon', this.sidebar.classList.contains('hidden') ? 'mdi:chevron-right' : 'mdi:chevron-left');
        if (this.walkStore.map) {
            setTimeout(() => this.walkStore.map.resize(), 300);
        }
    }

    handleSearch() {
        const query = this.searchQuery.value;
        this.walkStore.search(query).then(() => this.renderWalks());
    }

    handleTagSelection() {
        const selected = Array.from(this.selectedTags.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
        this.walkStore.filterByCategory(selected).then(() => this.renderWalks());
    }

    async selectWalk(event) {
        const walkId = event.currentTarget.dataset.walkId;
        await this.walkStore.selectWalk(walkId);
        this.renderWalks();
    }

    async toggleFavorite(event) {
        const walkId = event.currentTarget.closest('.walk-item').dataset.walkId;
        await this.walkStore.toggleFavorite(walkId);
        this.renderWalks();
    }

    renderWalks() {
        this.walkList.innerHTML = '';

        if (this.walkStore.walks.length === 0) {
            this.emptyState.classList.remove('hidden');
            return;
        } else {
            this.emptyState.classList.add('hidden');
        }

        this.walkStore.walks.forEach(walk => {
            const walkElement = document.createElement('div');
            walkElement.classList.add('cursor-pointer', 'p-4', 'border-b', 'hover:bg-gray-50');
            walkElement.dataset.walkId = walk.id;
            walkElement.addEventListener('click', (e) => this.selectWalk(e));

            // Walk Name and Info
            walkElement.innerHTML = `
                <h3 class="font-semibold">${walk.walk_name}</h3>
                <div class="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    <span>${this.walkStore.utils.formatDistance(walk.distance)}</span>
                    <span>${walk.steepness_level}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                    ${walk.categories.map(category => `
                        <span class="text-xs px-2 py-1 bg-gray-100 rounded-full">${category}</span>
                    `).join('')}
                </div>
                <div class="mt-2 flex gap-2 text-sm text-gray-600">
                    ${walk.has_pub ? `
                        <span class="flex items-center">
                            <iconify-icon icon="mdi:beer" class="mr-1"></iconify-icon> Pub
                        </span>
                    ` : ''}
                    ${walk.has_cafe ? `
                        <span class="flex items-center">
                            <iconify-icon icon="mdi:coffee" class="mr-1"></iconify-icon> Cafe
                        </span>
                    ` : ''}
                    ${this.isAuthenticatedValue ? `
                        <button class="ml-auto flex items-center text-sm text-gray-600 hover:text-primary-600"
                                data-action="click->walk-interface#toggleFavorite">
                            <iconify-icon icon="${walk.is_favorite ? 'mdi:heart' : 'mdi:heart-outline'}" 
                                        class="mr-1"></iconify-icon>
                            <span>${walk.is_favorite ? 'Favorited' : 'Favorite'}</span>
                        </button>
                    ` : ''}
                </div>
            `;

            this.walkList.appendChild(walkElement);
        });
    }

    updateLoadingState() {
        if (this.walkStore.isLoading) {
            this.loading.classList.remove('hidden');
        } else {
            this.loading.classList.add('hidden');
        }

        if (this.walkStore.error) {
            // Display error
            this.errorContainer.textContent = this.walkStore.error;
            this.errorContainer.classList.remove('hidden');
            setTimeout(() => {
                this.errorContainer.classList.add('hidden');
            }, 5000);
        }
    }

    listenToWalkStore() {
        // Implement observer pattern or use events to listen to walkStore changes
        // For simplicity, re-render walks on certain actions
    }
}