// js/app.js
// Main application logic and UI interactions

// --- UTILITIES & STATE ---
let globalSettings = {};
let currentView = 'dashboard';

const esc = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
};

const formatMoney = (amount) => {
    return `${globalSettings.currency || '$'}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString();
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// --- MODAL SYSTEM ---
const modal = {
    overlay: document.getElementById('global-modal'),
    title: document.getElementById('modal-title'),
    body: document.getElementById('modal-body'),
    footer: document.getElementById('modal-footer'),

    open(titleText, bodyHTML, footerHTML) {
        this.title.textContent = titleText;
        this.body.innerHTML = bodyHTML;
        this.footer.innerHTML = footerHTML;
        this.overlay.classList.add('active');
    },

    close() {
        this.overlay.classList.remove('active');
    }
};

document.getElementById('modal-close').addEventListener('click', () => modal.close());
document.getElementById('global-modal').addEventListener('click', (e) => {
    if (e.target === modal.overlay) modal.close();
});


// --- NAVIGATION & ROUTING ---
const navigateTo = async (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${viewId}`).classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-target="${viewId}"]`);
    if(navItem) navItem.classList.add('active');

    const titleMap = {
        'dashboard': 'Dashboard',
        'clients': 'Client CRM',
        'projects': 'Projects',
        'quotes': 'Quotes & Proposals',
        'tasks': 'Tasks',
        'invoices': 'Invoices & Payments',
        'services': 'Service Catalog',
        'expenses': 'Expenses',
        'settings': 'Business Settings'
    };
    document.getElementById('page-title').textContent = titleMap[viewId];
    currentView = viewId;

    // Mobile menu close
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('mobile-overlay').classList.remove('active');

    // Load Data for specific views
    await loadViewData(viewId);
};

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.target));
});

document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('mobile-overlay').classList.add('active');
});
document.getElementById('mobile-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('mobile-overlay').classList.remove('active');
});


// --- VIEW DATA LOADER ---
const loadViewData = async (viewId) => {
    if(viewId === 'dashboard') await renderDashboard();
    if(viewId === 'clients') await renderClients();
    if(viewId === 'services') await renderServices();
    if(viewId === 'settings') await renderSettings();
    // Stubbing others for next step
    if(viewId === 'projects') await renderProjects();
    if(viewId === 'quotes') await renderQuotes();
    if(viewId === 'tasks') await renderTasks();
    if(viewId === 'invoices') await renderInvoices();
    if(viewId === 'expenses') await renderExpenses();
};


// --- INITIALIZATION ---
const initApp = async () => {
    await db.initPromise;
    const settings = await db.get('settings', 'global');
    if (settings) {
        globalSettings = settings;
        if (settings.darkMode) document.documentElement.dataset.theme = 'dark';
    }

    // Setup Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', async () => {
        globalSettings.darkMode = !globalSettings.darkMode;
        document.documentElement.dataset.theme = globalSettings.darkMode ? 'dark' : 'light';
        await db.put('settings', globalSettings);
    });

    await navigateTo('dashboard');
};


// --- CLIENTS (CRM) MODULE ---
const renderClients = async () => {
    const clients = await db.getAll('clients');
    const tbody = document.getElementById('table-clients');
    if (clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No clients found. Add your first client!</td></tr>`;
        return;
    }

    tbody.innerHTML = clients.map(c => `
        <tr>
            <td><strong>${esc(c.name)}</strong></td>
            <td>${esc(c.company) || '-'}</td>
            <td>${esc(c.email) || '-'}</td>
            <td><span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-warning'}">${c.status || 'Lead'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editClient('${c.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-client').addEventListener('click', () => editClient());

window.editClient = async (id = null) => {
    let c = { name: '', company: '', email: '', phone: '', status: 'Lead', notes: '' };
    if (id) {
        c = await db.get('clients', id);
    }

    const body = `
        <form id="form-client">
            <input type="hidden" id="client-id" value="${id || ''}">
            <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" class="form-control" id="client-name" value="${esc(c.name)}" required>
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Company</label>
                    <input type="text" class="form-control" id="client-company" value="${c.company}">
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="client-status">
                        <option ${c.status==='Lead'?'selected':''}>Lead</option>
                        <option ${c.status==='Active'?'selected':''}>Active</option>
                        <option ${c.status==='Inactive'?'selected':''}>Inactive</option>
                    </select>
                </div>
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" id="client-email" value="${c.email}">
                </div>
                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="text" class="form-control" id="client-phone" value="${c.phone}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-control" id="client-notes">${c.notes}</textarea>
            </div>
        </form>
    `;
    const footer = `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveClient()">Save Client</button>
    `;
    modal.open(id ? 'Edit Client' : 'New Client', body, footer);
};

window.saveClient = async () => {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    if (!name) return alert('Name is required');

    const client = {
        id: id || undefined,
        name,
        company: document.getElementById('client-company').value,
        status: document.getElementById('client-status').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        notes: document.getElementById('client-notes').value
    };

    await db.put('clients', client);
    await db.logActivity(id ? 'Updated Client' : 'Created Client', name);
    modal.close();
    showToast('Client saved successfully');
    renderClients();
};

window.deleteClient = async (id) => {
    if (confirm('Are you sure you want to delete this client? Related projects and quotes may lose their reference.')) {
        await db.delete('clients', id);
        showToast('Client deleted');
        renderClients();
    }
};


// --- SERVICES CATALOG MODULE ---
const renderServices = async () => {
    const services = await db.getAll('services');
    const grid = document.getElementById('grid-services');
    if (services.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No services cataloged yet. Build your automation offers!</div>`;
        return;
    }

    grid.innerHTML = services.map(s => `
        <div class="card" style="margin-bottom:0">
            <div class="flex-between mb-2">
                <h3 style="margin:0">${esc(s.name)}</h3>
                <span class="badge badge-primary">${esc(s.category) || 'General'}</span>
            </div>
            <p class="text-muted" style="font-size:0.875rem; height:40px; overflow:hidden;">${esc(s.description) || 'No description'}</p>
            <div class="mt-4 pt-4" style="border-top:1px solid var(--border)">
                <div class="flex-between">
                    <span class="text-muted">Setup:</span>
                    <strong>${formatMoney(s.setupFee || 0)}</strong>
                </div>
                <div class="flex-between">
                    <span class="text-muted">Monthly:</span>
                    <strong>${formatMoney(s.monthlyFee || 0)}</strong>
                </div>
                <div class="mt-4 flex-between">
                    <button class="btn btn-sm btn-secondary" onclick="editService('${s.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService('${s.id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
};

document.getElementById('btn-new-service').addEventListener('click', () => editService());

window.editService = async (id = null) => {
    let s = { name: '', description: '', category: 'Automation', setupFee: 0, monthlyFee: 0 };
    if (id) s = await db.get('services', id);

    const body = `
        <form id="form-service">
            <input type="hidden" id="service-id" value="${id || ''}">
            <div class="form-group">
                <label class="form-label">Service Name *</label>
                <input type="text" class="form-control" id="service-name" value="${esc(s.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <input type="text" class="form-control" id="service-category" value="${s.category}" placeholder="e.g. Workflow, Chatbot, CRM">
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Setup Fee</label>
                    <input type="number" class="form-control" id="service-setup" value="${s.setupFee}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Recurring</label>
                    <input type="number" class="form-control" id="service-monthly" value="${s.monthlyFee}" min="0" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="service-desc">${s.description}</textarea>
            </div>
        </form>
    `;
    const footer = `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveService()">Save Service</button>
    `;
    modal.open(id ? 'Edit Service' : 'New Service', body, footer);
};

window.saveService = async () => {
    const id = document.getElementById('service-id').value;
    const name = document.getElementById('service-name').value.trim();
    if (!name) return alert('Name is required');

    const service = {
        id: id || undefined,
        name,
        category: document.getElementById('service-category').value,
        setupFee: Number(document.getElementById('service-setup').value) || 0,
        monthlyFee: Number(document.getElementById('service-monthly').value) || 0,
        description: document.getElementById('service-desc').value
    };

    await db.put('services', service);
    await db.logActivity(id ? 'Updated Service' : 'Created Service', name);
    modal.close();
    showToast('Service saved');
    renderServices();
};

window.deleteService = async (id) => {
    if (confirm('Delete this service from catalog?')) {
        await db.delete('services', id);
        showToast('Service deleted');
        renderServices();
    }
};


// --- SETTINGS & DATA MANAGEMENT MODULE ---
const renderSettings = async () => {
    const s = globalSettings;
    document.getElementById('set-biz-name').value = s.businessName || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-phone').value = s.phone || '';
    document.getElementById('set-address').value = s.address || '';

    document.getElementById('set-currency').value = s.currency || '$';
    document.getElementById('set-tax').value = s.taxRate || 0;
    document.getElementById('set-quote-prefix').value = s.quotePrefix || 'QT';
    document.getElementById('set-invoice-prefix').value = s.invoicePrefix || 'INV';
};

document.getElementById('form-settings-profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    globalSettings.businessName = document.getElementById('set-biz-name').value;
    globalSettings.email = document.getElementById('set-email').value;
    globalSettings.phone = document.getElementById('set-phone').value;
    globalSettings.address = document.getElementById('set-address').value;
    await db.put('settings', globalSettings);
    showToast('Profile saved');
});

document.getElementById('form-settings-defaults').addEventListener('submit', async (e) => {
    e.preventDefault();
    globalSettings.currency = document.getElementById('set-currency').value;
    globalSettings.taxRate = Number(document.getElementById('set-tax').value) || 0;
    globalSettings.quotePrefix = document.getElementById('set-quote-prefix').value;
    globalSettings.invoicePrefix = document.getElementById('set-invoice-prefix').value;
    await db.put('settings', globalSettings);
    showToast('Defaults saved');
});

// Export / Import / Reset Data
document.getElementById('btn-export-data').addEventListener('click', async () => {
    const data = await db.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automanager_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await db.logActivity('Data Exported', 'Full JSON backup downloaded');
});

document.getElementById('file-import-data').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if(confirm('Warning: Importing will OVERWRITE all current data. Continue?')) {
                await db.importData(data);
                showToast('Data imported successfully');
                setTimeout(() => window.location.reload(), 1500); // Reload to apply
            }
        } catch(err) {
            alert('Invalid backup file format');
        }
    };
    reader.readAsText(file);
});

document.getElementById('btn-reset-data').addEventListener('click', async () => {
    if (prompt('Type "RESET" to permanently delete ALL data.') === 'RESET') {
        const req = indexedDB.deleteDatabase('AutomationManagerDB');
        req.onsuccess = () => {
            alert('App reset successfully. Reloading...');
            window.location.reload();
        };
    }
});


// Advanced modules implementation loaded via modules.js

// Bootstrap App
window.addEventListener('DOMContentLoaded', initApp);
