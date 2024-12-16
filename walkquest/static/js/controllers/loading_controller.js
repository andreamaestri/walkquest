
export default class extends Stimulus.Controller {
    static values = {
        active: Boolean
    }

    connect() {
        this.updateLoadingState();
    }

    updateLoadingState() {
        if (this.activeValue) {
            this.element.classList.remove('hidden');
        } else {
            this.element.classList.add('hidden');
        }
    }
}