
export default class extends Stimulus.Controller {
    static targets = ['toggleIcon', 'mobileMenu'];

    toggle() {
        this.mobileMenu.classList.toggle('hidden');
        const isOpen = !this.mobileMenu.classList.contains('hidden');
        this.toggleIcon.setAttribute('icon', isOpen ? 'mdi:chevron-left' : 'mdi:chevron-right');
        if (isOpen) {
            this.mobileMenu.setAttribute('aria-expanded', 'true');
        } else {
            this.mobileMenu.setAttribute('aria-expanded', 'false');
        }
    }

    close(event) {
        if (!this.element.contains(event.target)) {
            this.mobileMenu.classList.add('hidden');
            this.toggleIcon.setAttribute('icon', 'mdi:chevron-right');
            this.mobileMenu.setAttribute('aria-expanded', 'false');
        }
    }
}