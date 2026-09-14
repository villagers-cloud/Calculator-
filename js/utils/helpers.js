// Generate random ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Format money based on currency setting
function formatMoney(amount, currency = '₹') {
    return `${currency}${Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

// Global App State
window.AppState = {
    settings: null,
    async loadSettings() {
        this.settings = await window.appDB.get('settings', 'appSettings');
        if (!this.settings) {
            // Default settings
            this.settings = {
                id: 'appSettings',
                agencyName: "Your Agency",
                logoUrl: "",
                upiQrUrl: "",
                taxRate: 18,
                metaRate: 0.85,
                currency: "₹",
                invoicePrefix: "INV",
                deliverables: ["WhatsApp Setup","Facebook Ads","Automation Setup"],
                darkMode: false,
                pinEnabled: false,
                pin: ""
            };
            await window.appDB.put('settings', this.settings);
        }
        this.applyTheme();
    },
    async saveSettings() {
        await window.appDB.put('settings', this.settings);
        this.applyTheme();
    },
    applyTheme() {
        document.documentElement.dataset.theme = this.settings.darkMode ? "dark" : "light";
        const themeBtn = document.getElementById("themeBtn");
        if(themeBtn) themeBtn.textContent = this.settings.darkMode ? "☀" : "☾";
    }
};