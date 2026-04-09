/**
 * Toast Notification System
 * Shows temporary notification messages on the screen.
 */

/**
 * Shows a toast notification message
 * @param {string} title - The title text of the toast
 * @param {string} message - The detailed message inside the toast
 * @param {string} type - The type of toast: 'success', 'error', or 'info' (default)
 * @param {boolean} persistent - If true, toast won't auto-dismiss (default: false)
 * @returns {HTMLElement|null} The toast element, or null if container not found
 */
function showToast(title, message, type = 'info', persistent = false) {
    // Find the container where toasts will be shown
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container element with id "toast-container" not found.');
        return null;
    }

    // Create a new div element for the toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.persistent = persistent;

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

    // Automatically remove the toast after 5 seconds if not persistent
    if (!persistent) {
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                removeToast();
            }
        }, 5000);
    }

    return toast;
}

/**
 * Updates an existing toast notification
 * @param {HTMLElement} toast - The toast element to update
 * @param {string} title - New title text
 * @param {string} message - New message text
 * @param {string} type - New type (optional, keeps current if not provided)
 */
function updateToast(toast, title, message, type = null) {
    if (!toast || !toast.parentNode) return;

    const titleEl = toast.querySelector('.toast-title');
    const messageEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    // Update type and icon if specified
    if (type) {
        toast.className = `toast ${type}`;
        if (iconEl) {
            if (type === 'success') iconEl.textContent = '✅';
            else if (type === 'error') iconEl.textContent = '❌';
            else iconEl.textContent = 'ℹ️';
        }
    }
}

/**
 * Dismisses a toast notification
 * @param {HTMLElement} toast - The toast element to dismiss
 * @param {number} delay - Delay in milliseconds before dismissing (default: 0)
 */
function dismissToast(toast, delay = 0) {
    if (!toast || !toast.parentNode) return;

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, delay);
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
window.updateToast = updateToast;
window.dismissToast = dismissToast;
