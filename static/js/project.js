// ...existing code...
document.addEventListener('DOMContentLoaded', async () => {
    if (window.Alpine) {
        await initAlpine(window.Alpine);
    } else {
        console.error('Alpine.js not loaded');
    }
});
// ...existing code...
