/**
 * Toast Notification System
 * Shows temporary notification messages on the screen.
 */

/**
 * Shows a toast notification message
 * @param {string} title - The title text of the toast
 * @param {string} message - The detailed message inside the toast
 * @param {string} type - The type of toast: 'success', 'error', or 'info' (default)
 */
function showToast(title, message, type = 'info') {
    // Find the container where toasts will be shown
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container element with id "toast-container" not found.');
        return;
    }

    // Create a new div element for the toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Choose icon based on the toast type
    let icon = 'ℹ️';  // Default info icon
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    // Set the inner HTML of the toast with icon, title, message, and close button
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" title="Close">×</button>
    `;

    // Add the toast element to the container so it becomes visible
    toastContainer.appendChild(toast);

    // Find the close button inside the toast
    const closeBtn = toast.querySelector('.toast-close');
    
    // Function to remove the toast
    const removeToast = () => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    };

    // When user clicks the close button, remove the toast
    closeBtn.addEventListener('click', removeToast);

    // Automatically remove the toast after 5 seconds if not closed already
    setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            removeToast();
        }
    }, 5000);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose globally for non-module scripts
window.showToast = showToast;
