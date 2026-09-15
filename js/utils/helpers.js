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
                phone: "",
                email: "",
                website: "",
                address: "",
                taxRate: 18,
                metaRate: 0.85,
                currency: "₹",
                gstNumber: "",
                taxSettings: "inclusive",
                invoicePrefix: "INV",
                quotePrefix: "QT",
                defaultQuoteValidity: 30, // days
                defaultTerms: "Payment is due upon receipt. Work begins after initial deposit.",
                footerText: "Thank you for your business!",
                deliverables: ["WhatsApp Setup","Facebook Ads","Automation Setup"],
                themeMode: "system", // light, dark, system
                pinEnabled: false,
                pin: "",
                dateFormat: "YYYY-MM-DD",
                timeFormat: "24h",
                aiProvider: "openai",
                aiApiKeyOpenAI: "",
                aiModelOpenAI: "gpt-4o-mini",
                aiApiKeyGemini: "",
                aiModelGemini: "gemini-1.5-flash"
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
        let mode = this.settings.themeMode || "system";
        let isDark = false;

        if (mode === "system") {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // Listen for system theme changes if not already set up
            if (!this._themeListenerSetup) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (this.settings.themeMode === "system") {
                        document.documentElement.dataset.theme = e.matches ? "dark" : "light";
                        this.updateThemeButton(e.matches);
                    }
                });
                this._themeListenerSetup = true;
            }
        } else {
            isDark = mode === "dark";
        }

        document.documentElement.dataset.theme = isDark ? "dark" : "light";
        this.updateThemeButton(isDark);
    },
    updateThemeButton(isDark) {
        const themeBtn = document.getElementById("themeBtn");
        if(themeBtn) themeBtn.textContent = isDark ? "☀" : "☾";
    }
};

// Global Filter State
window.AppFilter = {
    active: false,
    fromDate: "",
    toDate: "",
    fromTime: "",
    toTime: "",
    preset: "custom",

    apply(fromDate, toDate, fromTime, toTime, preset) {
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.preset = preset;
        this.active = !!(fromDate || toDate);
    },

    clear() {
        this.active = false;
        this.fromDate = "";
        this.toDate = "";
        this.fromTime = "";
        this.toTime = "";
        this.preset = "custom";
    }
};

// Date Filter Data Helper
function filterDataByDate(data, dateField = 'date') {
    if (!window.AppFilter.active) return data;

    const filterFrom = window.AppFilter.fromDate ? new Date(`${window.AppFilter.fromDate}T${window.AppFilter.fromTime || '00:00:00'}`) : null;
    const filterTo = window.AppFilter.toDate ? new Date(`${window.AppFilter.toDate}T${window.AppFilter.toTime || '23:59:59'}`) : null;

    return data.filter(item => {
        let itemDateStr = item[dateField];
        if (!itemDateStr) itemDateStr = item.created; // Fallback
        if (!itemDateStr) return true;

        let itemDate = new Date(itemDateStr);
        if (isNaN(itemDate.getTime())) return true;

        if (filterFrom && itemDate < filterFrom) return false;
        if (filterTo && itemDate > filterTo) return false;

        return true;
    });
}

// Download Helper
async function saveFileToDevice(blob, filename) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'File',
                    accept: { [blob.type]: ['.' + filename.split('.').pop()] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File System Access API failed, falling back:', err);
            } else {
                return; // User cancelled
            }
        }
    }

    // Fallback for mobile / browsers without File System Access API
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
