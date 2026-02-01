const Toast = {
    init() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    },

    show(message, type = 'info', title = '') {
        this.init();
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icons
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        // Title handling
        let titleHtml = '';
        if (!title) {
            // Auto Title
            if (type === 'success') title = 'Sucesso';
            if (type === 'error') title = 'Erro';
            if (type === 'warning') title = 'Atenção';
            if (type === 'info') title = 'Informação';
        }
        titleHtml = `<div class="toast-title">${title}</div>`;

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                ${titleHtml}
                <div>${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Remove after timeout (match CSS animation)
        setTimeout(() => {
            toast.remove();
        }, 4500);
    },

    success(msg, title) { this.show(msg, 'success', title); },
    error(msg, title) { this.show(msg, 'error', title); },
    warning(msg, title) { this.show(msg, 'warning', title); },
    info(msg, title) { this.show(msg, 'info', title); }
};

// Expose globally
window.Toast = Toast;
