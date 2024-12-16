
export default class extends Stimulus.Controller {
    static values = {
        message: String
    }

    connect() {
        this.updateError();
    }

    updateError() {
        if (this.messageValue) {
            this.element.textContent = this.messageValue;
            this.element.classList.remove('hidden');
            setTimeout(() => {
                this.element.classList.add('hidden');
            }, 5000);
        } else {
            this.element.classList.add('hidden');
        }
    }
}