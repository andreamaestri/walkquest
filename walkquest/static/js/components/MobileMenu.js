// Mobile menu component with improved accessibility and event handling
export const mobileMenu = {
    isOpen: false,
    menuId: 'mobile-menu',
    toggleId: 'mobile-menu-toggle',

    init() {
        // Handle escape key to close menu
        const handleEscape = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        };

        // Handle clicks outside menu to close
        const handleClickOutside = (e) => {
            const menu = document.getElementById(this.menuId);
            const toggle = document.getElementById(this.toggleId);
            if (this.isOpen && menu && toggle &&
                !menu.contains(e.target) &&
                !toggle.contains(e.target)) {
                this.closeMenu();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('click', handleClickOutside);

        // Store cleanup function for later removal
        this.cleanup = () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', handleClickOutside);
        };

        // Sync with global state
        const globals = Alpine.store('globals');
        if (globals?.mobileMenu) {
            this.$watch('isOpen', (value) => {
                globals.mobileMenu.isOpen = value;
                document.body.style.overflow = value ? 'hidden' : '';
            });
        }
    },

    destroy() {
        if (this.cleanup) {
            this.cleanup();
        }
    },

    toggleMenu() {
        this.isOpen ? this.closeMenu() : this.openMenu();
    },

    openMenu() {
        this.isOpen = true;
    },

    closeMenu() {
        this.isOpen = false;
        // Return focus to toggle button
        this.$nextTick(() => {
            const toggle = document.getElementById(this.toggleId);
            if (toggle) {
                toggle.focus();
            }
        });
    }
};

// Export as default for compatibility
export default mobileMenu;
