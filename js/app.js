// Basic Navigation Logic
document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;

    // Update Active states
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    e.currentTarget.classList.add('active');

    // Switch Pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + target).classList.add('active');

    // Optional: Refresh data when switching to certain tabs
    if(target === 'dashboard') loadDashboardData();
    if(target === 'clients') loadClients();
  });
});

// Theme Toggle
const themeBtn = document.getElementById('themeToggleBtn');
themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  themeBtn.textContent = isDark ? '☾' : '☀';
  DB.get('settings', 'app_settings').then(s => {
      if(s) {
          s.darkMode = !isDark;
          DB.put('settings', s);
      }
  });
});

// Apply saved theme on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
      const settings = await DB.get('settings', 'app_settings');
      if (settings && settings.darkMode) {
          document.documentElement.dataset.theme = 'dark';
          themeBtn.textContent = '☀';
      }

      // Load initial data
      loadDashboardData();
      loadSettingsData(settings);
  } catch (e) {
      console.error("Error loading initial data", e);
  }
});

// Quick Action Modal
const fab = document.getElementById('fabQuickAdd');
const modal = document.getElementById('quickActionModal');
const closeBtn = document.getElementById('closeQuickAction');

fab.addEventListener('click', () => modal.classList.add('show'));
closeBtn.addEventListener('click', () => modal.classList.remove('show'));
modal.addEventListener('click', (e) => {
    if(e.target === modal) modal.classList.remove('show');
});


// ----------------------------------------------------
// ENTITY MANAGEMENT (Phase 4 Logic)
// ----------------------------------------------------

async function loadDashboardData() {
    try {
        const clients = await DB.getAll('clients') || [];
        document.getElementById('dashTotalClients').textContent = clients.length;

        // Placeholder values until full quote/project math is implemented
        document.getElementById('dashActiveProj').textContent = '0';
        document.getElementById('dashTotalRev').textContent = '₹0';
        document.getElementById('dashPendingInv').textContent = '₹0';
    } catch(e) { console.error(e); }
}

async function loadClients() {
    const list = document.getElementById('clientList');
    try {
        const clients = await DB.getAll('clients');
        if(!clients || clients.length === 0) {
            list.innerHTML = '<div class="empty-state">No clients found.</div>';
            return;
        }

        list.innerHTML = clients.map(c => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${c.name}</div>
                    ${c.status ? `<span class="badge badge-primary">${c.status}</span>` : ''}
                </div>
                <div class="text-sm text-muted mb-2">${c.company || 'No Company'}</div>
                <div class="flex gap-2">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;">View</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteClient('${c.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

window.deleteClient = async function(id) {
    if(confirm('Are you sure you want to delete this client?')) {
        await DB.delete('clients', id);
        loadClients();
        loadDashboardData();
    }
}

async function createMockClient() {
    const newClient = {
        id: Date.now().toString(),
        name: "Acme Corp " + Math.floor(Math.random()*100),
        company: "Acme Industries",
        status: "Active",
        createdAt: new Date().toISOString()
    };
    await DB.put('clients', newClient);
    loadClients();
    loadDashboardData();
}

// Attach Mock action to quick add client
document.querySelector('[data-action="new-client"]').addEventListener('click', () => {
    createMockClient();
    modal.classList.remove('show');
    // Switch to clients tab
    document.querySelector('[data-target="clients"]').click();
});

// Settings Management
function loadSettingsData(settings) {
    if(settings) {
        document.getElementById('setAgencyName').value = settings.agencyName || '';
    }
}

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const settings = await DB.get('settings', 'app_settings') || { id: 'app_settings' };
    settings.agencyName = document.getElementById('setAgencyName').value;
    await DB.put('settings', settings);
    alert('Profile saved!');
});

// Data Management
document.getElementById('exportDataBtn').addEventListener('click', async () => {
    try {
        const data = await DB.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `automation-manager-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) {
        alert("Failed to export data");
    }
});

document.getElementById('importDataBtn').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const data = JSON.parse(reader.result);
            if(confirm("This will overwrite existing data. Proceed?")) {
                await DB.importData(data);
                alert("Import successful! Reloading...");
                window.location.reload();
            }
        } catch (err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
});

document.getElementById('resetDataBtn').addEventListener('click', async () => {
    if(confirm('DANGER: This will wipe ALL local data. Are you sure?')) {
        if(confirm('Are you ABSOLUTELY sure? This cannot be undone.')) {
            const stores = ['clients', 'projects', 'tasks', 'quotes', 'invoices', 'expenses', 'services', 'team', 'settings'];
            for(let s of stores) {
                await DB.clearStore(s);
            }
            localStorage.clear();
            alert('Data wiped. Reloading.');
            window.location.reload();
        }
    }
});


// ----------------------------------------------------
// FULL CRUD FOR CLIENTS
// ----------------------------------------------------

function openClientForm(client = null) {
  // We'll create a dynamic DOM element for the form overlay
  const overlay = document.createElement('div');
  overlay.className = 'full-screen-overlay active';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn-icon" id="closeClientForm" style="border:none;">←</button>
      <h2 class="overlay-title">${client ? 'Edit Client' : 'New Client'}</h2>
      <button class="btn btn-primary" id="saveClientBtn">Save</button>
    </div>
    <div class="overlay-content">
      <form id="clientForm">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" id="clientName" required value="${client ? client.name : ''}">
        </div>
        <div class="form-group">
          <label>Company</label>
          <input type="text" id="clientCompany" value="${client ? client.company || '' : ''}">
        </div>
        <div class="form-group">
          <label>Phone / WhatsApp</label>
          <input type="tel" id="clientPhone" value="${client ? client.phone || '' : ''}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="clientEmail" value="${client ? client.email || '' : ''}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="clientStatus">
            <option value="Active" ${client && client.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Lead" ${client && client.status === 'Lead' ? 'selected' : ''}>Lead</option>
            <option value="Inactive" ${client && client.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="clientNotes" rows="4">${client ? client.notes || '' : ''}</textarea>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('closeClientForm').addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.remove();
  });

  document.getElementById('saveClientBtn').addEventListener('click', async () => {
    const form = document.getElementById('clientForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    const newClient = {
      id: client ? client.id : Date.now().toString(),
      name: document.getElementById('clientName').value.trim(),
      company: document.getElementById('clientCompany').value.trim(),
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim(),
      status: document.getElementById('clientStatus').value,
      notes: document.getElementById('clientNotes').value.trim(),
      createdAt: client ? client.createdAt : new Date().toISOString()
    };

    await DB.put('clients', newClient);
    loadClients();
    loadDashboardData();
    overlay.classList.remove('active');
    overlay.remove();
  });
}

// Update the Quick Add action to open the real form
document.querySelector('[data-action="new-client"]').removeEventListener('click', () => {});
document.querySelector('[data-action="new-client"]').addEventListener('click', (e) => {
    // Clone and replace to strip old mock events
    const newBtn = e.currentTarget.cloneNode(true);
    e.currentTarget.parentNode.replaceChild(newBtn, e.currentTarget);
    newBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        document.querySelector('[data-target="clients"]').click();
        openClientForm();
    });
});
// Need to re-bind the click since we replaced the node above. Actually, let's just re-declare it cleanly
document.querySelector('.quick-actions-grid').innerHTML = `
    <button class="quick-action-btn" id="qaNewClient">
      <div class="quick-action-icon"><svg><use href="#icon-users"></use></svg></div>
      <span>Client</span>
    </button>
    <button class="quick-action-btn" id="qaNewProject">
      <div class="quick-action-icon"><svg><use href="#icon-briefcase"></use></svg></div>
      <span>Project</span>
    </button>
    <button class="quick-action-btn" id="qaNewQuote">
      <div class="quick-action-icon"><svg><use href="#icon-file-text"></use></svg></div>
      <span>Quote</span>
    </button>
`;

document.getElementById('qaNewClient').addEventListener('click', () => {
    modal.classList.remove('show');
    document.querySelector('[data-target="clients"]').click();
    openClientForm();
});

// Expose openClientForm globally for edit button
window.editClient = async function(id) {
    const client = await DB.get('clients', id);
    if(client) openClientForm(client);
}

// Re-write loadClients to use new editClient
async function loadClients() {
    const list = document.getElementById('clientList');
    try {
        const clients = await DB.getAll('clients');
        if(!clients || clients.length === 0) {
            list.innerHTML = '<div class="empty-state">No clients found. Click the + button to add one.</div>';
            return;
        }

        list.innerHTML = clients.map(c => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${c.name}</div>
                    ${c.status ? `<span class="badge ${c.status==='Active'?'badge-success':(c.status==='Lead'?'badge-primary':'badge-warning')}">${c.status}</span>` : ''}
                </div>
                <div class="text-sm text-muted mb-2">${c.company || 'No Company'} ${c.phone ? '• '+c.phone : ''}</div>
                <div class="flex gap-2">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editClient('${c.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteClient('${c.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

// ----------------------------------------------------
// FULL CRUD FOR PROJECTS
// ----------------------------------------------------

async function openProjectForm(project = null) {
  const clients = await DB.getAll('clients');

  const overlay = document.createElement('div');
  overlay.className = 'full-screen-overlay active';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn-icon" id="closeProjectForm" style="border:none;">←</button>
      <h2 class="overlay-title">${project ? 'Edit Project' : 'New Project'}</h2>
      <button class="btn btn-primary" id="saveProjectBtn">Save</button>
    </div>
    <div class="overlay-content">
      <form id="projectForm">
        <div class="form-group">
          <label>Project Name *</label>
          <input type="text" id="projName" required value="${project ? project.name : ''}">
        </div>
        <div class="form-group">
          <label>Client</label>
          <select id="projClient">
            <option value="">-- Select Client --</option>
            ${clients.map(c => `<option value="${c.id}" ${project && project.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="projStatus">
            <option value="Planning" ${project && project.status === 'Planning' ? 'selected' : ''}>Planning</option>
            <option value="In Progress" ${project && project.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${project && project.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="On Hold" ${project && project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
          </select>
        </div>
        <div class="form-group">
          <label>Budget (₹)</label>
          <input type="number" id="projBudget" value="${project ? project.budget || '' : ''}">
        </div>
        <div class="form-group">
          <label>Deadline</label>
          <input type="date" id="projDeadline" value="${project ? project.deadline || '' : ''}">
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('closeProjectForm').addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.remove();
  });

  document.getElementById('saveProjectBtn').addEventListener('click', async () => {
    const form = document.getElementById('projectForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    const newProject = {
      id: project ? project.id : Date.now().toString(),
      name: document.getElementById('projName').value.trim(),
      clientId: document.getElementById('projClient').value,
      status: document.getElementById('projStatus').value,
      budget: Number(document.getElementById('projBudget').value) || 0,
      deadline: document.getElementById('projDeadline').value,
      createdAt: project ? project.createdAt : new Date().toISOString()
    };

    await DB.put('projects', newProject);
    loadProjects();
    loadDashboardData();
    overlay.classList.remove('active');
    overlay.remove();
  });
}

document.getElementById('qaNewProject').addEventListener('click', () => {
    modal.classList.remove('show');
    document.querySelector('[data-target="projects"]').click();
    openProjectForm();
});

window.editProject = async function(id) {
    const project = await DB.get('projects', id);
    if(project) openProjectForm(project);
}

window.deleteProject = async function(id) {
    if(confirm('Are you sure you want to delete this project?')) {
        await DB.delete('projects', id);
        loadProjects();
        loadDashboardData();
    }
}

async function loadProjects() {
    const list = document.getElementById('projectList');
    try {
        const projects = await DB.getAll('projects');
        const clients = await DB.getAll('clients');
        const clientMap = {};
        clients.forEach(c => clientMap[c.id] = c.name);

        if(!projects || projects.length === 0) {
            list.innerHTML = '<div class="empty-state">No projects found. Click + to add one.</div>';
            return;
        }

        list.innerHTML = projects.map(p => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${p.name}</div>
                    <span class="badge ${p.status==='Completed'?'badge-success':(p.status==='In Progress'?'badge-primary':'badge-warning')}">${p.status}</span>
                </div>
                <div class="text-sm text-muted mb-2">
                  Client: ${clientMap[p.clientId] || 'None'} <br>
                  Deadline: ${p.deadline || 'No deadline'} <br>
                  Budget: ₹${p.budget || 0}
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editProject('${p.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteProject('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

// Enhance Dashboard load to include actual projects count
const originalLoadDashboardData = loadDashboardData;
loadDashboardData = async function() {
    await originalLoadDashboardData();
    try {
        const projects = await DB.getAll('projects') || [];
        const activeCount = projects.filter(p => p.status === 'In Progress' || p.status === 'Planning').length;
        document.getElementById('dashActiveProj').textContent = activeCount;
    } catch(e) {}
}


// Initialize list views on startup if they are the active tab, but usually it starts on dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Already doing loadDashboardData
});
// Hook up tab switches to load data
document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;
    if(target === 'projects') loadProjects();
  });
});

// ----------------------------------------------------
// FULL CRUD FOR QUOTES & INVOICES (Phase 5)
// ----------------------------------------------------

async function openQuoteForm(quote = null) {
  const clients = await DB.getAll('clients');
  const projects = await DB.getAll('projects');

  const overlay = document.createElement('div');
  overlay.className = 'full-screen-overlay active';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn-icon" id="closeQuoteForm" style="border:none;">←</button>
      <h2 class="overlay-title">${quote ? 'Edit Quote/Invoice' : 'New Quote/Invoice'}</h2>
      <button class="btn btn-primary" id="saveQuoteBtn">Save</button>
    </div>
    <div class="overlay-content">
      <form id="quoteForm">
        <div class="form-group">
          <label>Type</label>
          <select id="quoteType">
            <option value="Quote" ${quote && quote.type === 'Quote' ? 'selected' : ''}>Quote</option>
            <option value="Invoice" ${quote && quote.type === 'Invoice' ? 'selected' : ''}>Invoice</option>
          </select>
        </div>
        <div class="form-group">
          <label>Client *</label>
          <select id="quoteClient" required>
            <option value="">-- Select Client --</option>
            ${clients.map(c => `<option value="${c.id}" ${quote && quote.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Related Project (Optional)</label>
          <select id="quoteProject">
            <option value="">-- None --</option>
            ${projects.map(p => `<option value="${p.id}" ${quote && quote.projectId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="quoteStatus">
            <option value="Draft" ${quote && quote.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Sent" ${quote && quote.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option value="Accepted" ${quote && quote.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
            <option value="Paid" ${quote && quote.status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>

        <h3 class="mt-4">Financials</h3>
        <div class="form-group">
          <label>Subtotal (₹) *</label>
          <input type="number" id="quoteSubtotal" required value="${quote ? quote.subtotal || 0 : ''}">
        </div>
        <div class="form-group">
          <label>Tax (%)</label>
          <input type="number" id="quoteTax" value="${quote ? quote.tax || 0 : '18'}">
        </div>
        <div class="form-group">
          <label>Total (Auto-calculated)</label>
          <input type="number" id="quoteTotal" readonly style="background: var(--bg);" value="${quote ? quote.total || 0 : ''}">
        </div>
        <div class="form-group">
          <label>Notes / Terms</label>
          <textarea id="quoteNotes" rows="3">${quote ? quote.notes || '' : ''}</textarea>
        </div>

        <div class="flex gap-2 mt-4" id="pdfBtnContainer" style="${quote ? '' : 'display:none;'}">
           <button type="button" class="btn" id="generatePdfBtn" style="width:100%;">Generate PDF</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto calculate total
  const subtotalIn = document.getElementById('quoteSubtotal');
  const taxIn = document.getElementById('quoteTax');
  const totalIn = document.getElementById('quoteTotal');

  const calcTotal = () => {
      const sub = Number(subtotalIn.value) || 0;
      const tax = Number(taxIn.value) || 0;
      totalIn.value = sub + (sub * (tax/100));
  };
  subtotalIn.addEventListener('input', calcTotal);
  taxIn.addEventListener('input', calcTotal);

  document.getElementById('closeQuoteForm').addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.remove();
  });

  document.getElementById('saveQuoteBtn').addEventListener('click', async () => {
    const form = document.getElementById('quoteForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    const newQuote = {
      id: quote ? quote.id : Date.now().toString(),
      type: document.getElementById('quoteType').value,
      clientId: document.getElementById('quoteClient').value,
      projectId: document.getElementById('quoteProject').value,
      status: document.getElementById('quoteStatus').value,
      subtotal: Number(document.getElementById('quoteSubtotal').value) || 0,
      tax: Number(document.getElementById('quoteTax').value) || 0,
      total: Number(document.getElementById('quoteTotal').value) || 0,
      notes: document.getElementById('quoteNotes').value.trim(),
      date: quote ? quote.date : new Date().toISOString().slice(0,10)
    };

    await DB.put('quotes', newQuote);
    loadQuotes();
    loadDashboardData(); // Update revenue metrics
    overlay.classList.remove('active');
    overlay.remove();
  });

  if(quote) {
      document.getElementById('generatePdfBtn').addEventListener('click', () => {
          generatePdf(quote);
      });
  }
}

document.getElementById('qaNewQuote').addEventListener('click', () => {
    modal.classList.remove('show');
    document.querySelector('[data-target="quotes"]').click();
    openQuoteForm();
});

window.editQuote = async function(id) {
    const quote = await DB.get('quotes', id);
    if(quote) openQuoteForm(quote);
}

window.deleteQuote = async function(id) {
    if(confirm('Are you sure you want to delete this record?')) {
        await DB.delete('quotes', id);
        loadQuotes();
        loadDashboardData();
    }
}

async function loadQuotes() {
    const list = document.getElementById('quoteList');
    try {
        const quotes = await DB.getAll('quotes');
        const clients = await DB.getAll('clients');
        const clientMap = {};
        clients.forEach(c => clientMap[c.id] = c.name);

        if(!quotes || quotes.length === 0) {
            list.innerHTML = '<div class="empty-state">No quotes/invoices found. Click + to add one.</div>';
            return;
        }

        list.innerHTML = quotes.map(q => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${q.type}: ${clientMap[q.clientId] || 'Unknown Client'}</div>
                    <span class="badge ${q.status==='Paid' || q.status==='Accepted' ? 'badge-success' : (q.status==='Sent' ? 'badge-primary' : 'badge-warning')}">${q.status}</span>
                </div>
                <div class="text-sm text-muted mb-2">
                  Date: ${q.date || 'Unknown'} <br>
                  Amount: ₹${q.total || 0}
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editQuote('${q.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteQuote('${q.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

// Hook up tab switch to load quotes
document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;
    if(target === 'quotes') loadQuotes();
  });
});

// Update Dashboard logic to reflect financial metrics accurately
const originalLoadDashAgain = loadDashboardData;
loadDashboardData = async function() {
    await originalLoadDashAgain();
    try {
        const quotes = await DB.getAll('quotes') || [];

        // Total Revenue (Paid invoices)
        const revenue = quotes
            .filter(q => q.status === 'Paid')
            .reduce((sum, q) => sum + (q.total || 0), 0);

        // Pending Invoices (Sent/Accepted but not Paid)
        const pending = quotes
            .filter(q => q.type === 'Invoice' && q.status !== 'Paid' && q.status !== 'Draft')
            .reduce((sum, q) => sum + (q.total || 0), 0);

        document.getElementById('dashTotalRev').textContent = `₹${revenue.toLocaleString('en-IN')}`;
        document.getElementById('dashPendingInv').textContent = `₹${pending.toLocaleString('en-IN')}`;
    } catch(e) { console.error(e); }
}

// Global Search Logic
document.getElementById('globalSearch').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    const activityList = document.getElementById('recentActivityList');

    if(!query) {
        activityList.innerHTML = '<div class="empty-state">No recent activity.</div>';
        return;
    }

    try {
        const clients = await DB.getAll('clients');
        const projects = await DB.getAll('projects');
        const quotes = await DB.getAll('quotes');

        let results = [];

        clients.filter(c => (c.name||'').toLowerCase().includes(query)).forEach(c => results.push({type: 'Client', name: c.name, id: c.id}));
        projects.filter(p => (p.name||'').toLowerCase().includes(query)).forEach(p => results.push({type: 'Project', name: p.name, id: p.id}));
        // We can map client names onto quotes for better search but keeping it simple for now

        if(results.length === 0) {
            activityList.innerHTML = '<div class="empty-state">No results found.</div>';
        } else {
            activityList.innerHTML = results.map(r => `
                <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <div><strong>${r.type}</strong>: ${r.name}</div>
                    <button class="btn" style="padding: 2px 8px; font-size: 12px;" onclick="document.querySelector('[data-target=\\'${r.type.toLowerCase()}s\\']').click();">Go</button>
                </div>
            `).join('');
        }

    } catch(err) { console.error(err); }
});

// Minimal PDF Generation Function (uses html2pdf locally)
async function generatePdf(quote) {
    if (typeof html2pdf === "undefined") {
        alert("PDF library is unavailable.");
        return;
    }

    const settings = await DB.get('settings', 'app_settings') || {};
    const clients = await DB.getAll('clients');
    const client = clients.find(c => c.id === quote.clientId) || {name: 'Unknown'};

    const template = document.createElement('div');
    template.style.padding = '40px';
    template.style.fontFamily = 'Helvetica, Arial, sans-serif';
    template.style.color = '#333';
    template.innerHTML = `
        <h1 style="color: #2563eb; margin-bottom: 5px;">${settings.agencyName || 'Agency'}</h1>
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
                <h2 style="margin:0;">${quote.type.toUpperCase()}</h2>
                <p>Date: ${quote.date}</p>
            </div>
            <div style="text-align: right;">
                <p style="margin:0; font-weight: bold;">Bill To:</p>
                <p style="margin:0;">${client.name}</p>
                <p style="margin:0;">${client.company || ''}</p>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #f8fafc; text-align: left;">
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Description</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Professional Services</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${quote.subtotal}</td>
                </tr>
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Subtotal:</span>
                    <strong>₹${quote.subtotal}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Tax:</span>
                    <strong>₹${quote.total - quote.subtotal}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 2px solid #2563eb; padding-top: 10px; font-size: 18px;">
                    <strong>Total:</strong>
                    <strong>₹${quote.total}</strong>
                </div>
            </div>
        </div>

        <div style="margin-top: 40px; font-size: 12px; color: #64748b;">
            <p><strong>Notes:</strong><br>${quote.notes || 'Thank you for your business.'}</p>
        </div>
    `;

    html2pdf().set({
        margin: 0,
        filename: `${quote.type}_${client.name.replace(/\s+/g, '_')}_${quote.date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(template).save();
}


// Initialize list views correctly on load for the active tab (dashboard starts by default)

// --- Utility Functions ---
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

// Override previous load methods to use escaping
async function loadClients() {
    const list = document.getElementById('clientList');
    try {
        const clients = await DB.getAll('clients');
        if(!clients || clients.length === 0) {
            list.innerHTML = '<div class="empty-state">No clients found. Click the + button to add one.</div>';
            return;
        }

        list.innerHTML = clients.map(c => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${esc(c.name)}</div>
                    ${c.status ? `<span class="badge ${c.status==='Active'?'badge-success':(c.status==='Lead'?'badge-primary':'badge-warning')}">${esc(c.status)}</span>` : ''}
                </div>
                <div class="text-sm text-muted mb-2">${esc(c.company || 'No Company')} ${c.phone ? '• '+esc(c.phone) : ''}</div>
                <div class="flex gap-2">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editClient('${c.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteClient('${c.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

async function loadProjects() {
    const list = document.getElementById('projectList');
    try {
        const projects = await DB.getAll('projects');
        const clients = await DB.getAll('clients');
        const clientMap = {};
        clients.forEach(c => clientMap[c.id] = c.name);

        if(!projects || projects.length === 0) {
            list.innerHTML = '<div class="empty-state">No projects found. Click + to add one.</div>';
            return;
        }

        list.innerHTML = projects.map(p => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${esc(p.name)}</div>
                    <span class="badge ${p.status==='Completed'?'badge-success':(p.status==='In Progress'?'badge-primary':'badge-warning')}">${esc(p.status)}</span>
                </div>
                <div class="text-sm text-muted mb-2">
                  Client: ${esc(clientMap[p.clientId] || 'None')} <br>
                  Deadline: ${esc(p.deadline || 'No deadline')} <br>
                  Budget: ₹${esc(p.budget || 0)}
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editProject('${p.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteProject('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

async function loadQuotes() {
    const list = document.getElementById('quoteList');
    try {
        const quotes = await DB.getAll('quotes');
        const clients = await DB.getAll('clients');
        const clientMap = {};
        clients.forEach(c => clientMap[c.id] = c.name);

        if(!quotes || quotes.length === 0) {
            list.innerHTML = '<div class="empty-state">No quotes/invoices found. Click + to add one.</div>';
            return;
        }

        list.innerHTML = quotes.map(q => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${esc(q.type)}: ${esc(clientMap[q.clientId] || 'Unknown Client')}</div>
                    <span class="badge ${q.status==='Paid' || q.status==='Accepted' ? 'badge-success' : (q.status==='Sent' ? 'badge-primary' : 'badge-warning')}">${esc(q.status)}</span>
                </div>
                <div class="text-sm text-muted mb-2">
                  Date: ${esc(q.date || 'Unknown')} <br>
                  Amount: ₹${esc(q.total || 0)}
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editQuote('${q.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteQuote('${q.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

document.getElementById('globalSearch').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    const activityList = document.getElementById('recentActivityList');

    if(!query) {
        activityList.innerHTML = '<div class="empty-state">No recent activity.</div>';
        return;
    }

    try {
        const clients = await DB.getAll('clients');
        const projects = await DB.getAll('projects');

        let results = [];

        clients.filter(c => (c.name||'').toLowerCase().includes(query)).forEach(c => results.push({type: 'Client', name: c.name, id: c.id}));
        projects.filter(p => (p.name||'').toLowerCase().includes(query)).forEach(p => results.push({type: 'Project', name: p.name, id: p.id}));

        if(results.length === 0) {
            activityList.innerHTML = '<div class="empty-state">No results found.</div>';
        } else {
            activityList.innerHTML = results.map(r => `
                <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <div><strong>${esc(r.type)}</strong>: ${esc(r.name)}</div>
                    <button class="btn" style="padding: 2px 8px; font-size: 12px;" onclick="document.querySelector('[data-target=\\'${esc(r.type.toLowerCase())}s\\']').click();">Go</button>
                </div>
            `).join('');
        }

    } catch(err) { console.error(err); }
});


// Enhanced openQuoteForm with advanced pricing calculator functionality
async function openQuoteForm(quote = null) {
  const clients = await DB.getAll('clients');
  const projects = await DB.getAll('projects');

  const overlay = document.createElement('div');
  overlay.className = 'full-screen-overlay active';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn-icon" id="closeQuoteForm" style="border:none;">←</button>
      <h2 class="overlay-title">${quote ? 'Edit Quote/Invoice' : 'New Quote/Invoice'}</h2>
      <button class="btn btn-primary" id="saveQuoteBtn">Save</button>
    </div>
    <div class="overlay-content">
      <form id="quoteForm">
        <div class="form-group">
          <label>Type</label>
          <select id="quoteType">
            <option value="Quote" ${quote && quote.type === 'Quote' ? 'selected' : ''}>Quote</option>
            <option value="Invoice" ${quote && quote.type === 'Invoice' ? 'selected' : ''}>Invoice</option>
          </select>
        </div>
        <div class="form-group">
          <label>Client *</label>
          <select id="quoteClient" required>
            <option value="">-- Select Client --</option>
            ${clients.map(c => `<option value="${c.id}" ${quote && quote.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Related Project (Optional)</label>
          <select id="quoteProject">
            <option value="">-- None --</option>
            ${projects.map(p => `<option value="${p.id}" ${quote && quote.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="quoteStatus">
            <option value="Draft" ${quote && quote.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Sent" ${quote && quote.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option value="Accepted" ${quote && quote.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
            <option value="Paid" ${quote && quote.status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>

        <h3 class="mt-4">Advanced Pricing Details</h3>
        <div class="form-group">
          <label>Setup Fee (₹)</label>
          <input type="number" id="quoteSetupFee" value="${quote ? quote.setupFee || 0 : '0'}">
        </div>
        <div class="form-group">
          <label>Monthly Retainer (₹)</label>
          <input type="number" id="quoteRetainer" value="${quote ? quote.retainer || 0 : '0'}">
        </div>

        <div class="form-group">
            <div class="flex justify-between items-center">
                <label>Extra Expenses</label>
                <button type="button" class="btn text-xs" id="addExpenseBtn" style="padding: 2px 8px;">+ Add</button>
            </div>
            <div id="expensesList">
               ${(quote && quote.expenses ? quote.expenses : []).map((e, idx) => `
                    <div class="flex gap-2 mb-2 expense-item">
                        <input type="text" class="exp-name" placeholder="Name" value="${esc(e.name)}" style="flex:2;">
                        <input type="number" class="exp-amount" placeholder="Amt" value="${e.amount}" style="flex:1;">
                        <button type="button" class="btn btn-danger remove-exp" style="padding: 0 10px;">x</button>
                    </div>
               `).join('')}
            </div>
        </div>

        <div class="form-group">
          <label>Subtotal (Auto-calculated)</label>
          <input type="number" id="quoteSubtotal" readonly style="background: var(--bg);" value="${quote ? quote.subtotal || 0 : '0'}">
        </div>
        <div class="form-group">
          <label>Tax (%)</label>
          <input type="number" id="quoteTax" value="${quote ? quote.tax || 0 : '18'}">
        </div>
        <div class="form-group">
          <label>Grand Total</label>
          <input type="number" id="quoteTotal" readonly style="background: var(--bg);" value="${quote ? quote.total || 0 : '0'}">
        </div>
        <div class="form-group">
          <label>Notes / Terms</label>
          <textarea id="quoteNotes" rows="3">${quote ? esc(quote.notes || '') : ''}</textarea>
        </div>

        <div class="flex gap-2 mt-4" id="pdfBtnContainer" style="${quote ? '' : 'display:none;'}">
           <button type="button" class="btn" id="generatePdfBtn" style="width:100%;">Generate PDF</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto calculate total logic based on original logic
  const setupIn = document.getElementById('quoteSetupFee');
  const retainerIn = document.getElementById('quoteRetainer');
  const taxIn = document.getElementById('quoteTax');
  const subtotalIn = document.getElementById('quoteSubtotal');
  const totalIn = document.getElementById('quoteTotal');
  const expensesList = document.getElementById('expensesList');

  const calcTotal = () => {
      const setup = Number(setupIn.value) || 0;
      const retainer = Number(retainerIn.value) || 0;

      let expensesTotal = 0;
      document.querySelectorAll('.expense-item').forEach(el => {
          expensesTotal += Number(el.querySelector('.exp-amount').value) || 0;
      });

      const sub = setup + retainer + expensesTotal;
      const tax = Number(taxIn.value) || 0;

      subtotalIn.value = sub;
      totalIn.value = sub + (sub * (tax/100));
  };

  setupIn.addEventListener('input', calcTotal);
  retainerIn.addEventListener('input', calcTotal);
  taxIn.addEventListener('input', calcTotal);

  expensesList.addEventListener('input', calcTotal);
  expensesList.addEventListener('click', (e) => {
      if(e.target.classList.contains('remove-exp')) {
          e.target.closest('.expense-item').remove();
          calcTotal();
      }
  });

  document.getElementById('addExpenseBtn').addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'flex gap-2 mb-2 expense-item';
      div.innerHTML = `
          <input type="text" class="exp-name" placeholder="Name" style="flex:2;">
          <input type="number" class="exp-amount" placeholder="Amt" style="flex:1;">
          <button type="button" class="btn btn-danger remove-exp" style="padding: 0 10px;">x</button>
      `;
      expensesList.appendChild(div);
  });

  document.getElementById('closeQuoteForm').addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.remove();
  });

  document.getElementById('saveQuoteBtn').addEventListener('click', async () => {
    const form = document.getElementById('quoteForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    calcTotal(); // ensure final values

    const expenses = [];
    document.querySelectorAll('.expense-item').forEach(el => {
        const name = el.querySelector('.exp-name').value.trim();
        const amt = Number(el.querySelector('.exp-amount').value) || 0;
        if(name || amt) expenses.push({name, amount: amt});
    });

    const newQuote = {
      id: quote ? quote.id : Date.now().toString(),
      type: document.getElementById('quoteType').value,
      clientId: document.getElementById('quoteClient').value,
      projectId: document.getElementById('quoteProject').value,
      status: document.getElementById('quoteStatus').value,
      setupFee: Number(document.getElementById('quoteSetupFee').value) || 0,
      retainer: Number(document.getElementById('quoteRetainer').value) || 0,
      expenses: expenses,
      subtotal: Number(document.getElementById('quoteSubtotal').value) || 0,
      tax: Number(document.getElementById('quoteTax').value) || 0,
      total: Number(document.getElementById('quoteTotal').value) || 0,
      notes: document.getElementById('quoteNotes').value.trim(),
      date: quote ? quote.date : new Date().toISOString().slice(0,10)
    };

    await DB.put('quotes', newQuote);
    loadQuotes();
    loadDashboardData();
    overlay.classList.remove('active');
    overlay.remove();
  });

  if(quote) {
      document.getElementById('generatePdfBtn').addEventListener('click', () => {
          generatePdf(quote);
      });
  }
}

// ----------------------------------------------------
// FULL CRUD FOR TASKS
// ----------------------------------------------------

async function openTaskForm(task = null) {
  const projects = await DB.getAll('projects');

  const overlay = document.createElement('div');
  overlay.className = 'full-screen-overlay active';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn-icon" id="closeTaskForm" style="border:none;">←</button>
      <h2 class="overlay-title">${task ? 'Edit Task' : 'New Task'}</h2>
      <button class="btn btn-primary" id="saveTaskBtn">Save</button>
    </div>
    <div class="overlay-content">
      <form id="taskForm">
        <div class="form-group">
          <label>Task Name *</label>
          <input type="text" id="taskName" required value="${task ? esc(task.name) : ''}">
        </div>
        <div class="form-group">
          <label>Related Project</label>
          <select id="taskProject">
            <option value="">-- None --</option>
            ${projects.map(p => `<option value="${p.id}" ${task && task.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="taskStatus">
            <option value="To Do" ${task && task.status === 'To Do' ? 'selected' : ''}>To Do</option>
            <option value="In Progress" ${task && task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${task && task.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="taskDueDate" value="${task ? task.dueDate || '' : ''}">
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('closeTaskForm').addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.remove();
  });

  document.getElementById('saveTaskBtn').addEventListener('click', async () => {
    const form = document.getElementById('taskForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    const newTask = {
      id: task ? task.id : Date.now().toString(),
      name: document.getElementById('taskName').value.trim(),
      projectId: document.getElementById('taskProject').value,
      status: document.getElementById('taskStatus').value,
      dueDate: document.getElementById('taskDueDate').value,
      createdAt: task ? task.createdAt : new Date().toISOString()
    };

    await DB.put('tasks', newTask);
    loadTasks();
    overlay.classList.remove('active');
    overlay.remove();
  });
}

window.editTask = async function(id) {
    const task = await DB.get('tasks', id);
    if(task) openTaskForm(task);
}

window.deleteTask = async function(id) {
    if(confirm('Are you sure you want to delete this task?')) {
        await DB.delete('tasks', id);
        loadTasks();
    }
}

async function loadTasks() {
    const list = document.getElementById('taskList');
    try {
        const tasks = await DB.getAll('tasks');
        const projects = await DB.getAll('projects');
        const projMap = {};
        projects.forEach(p => projMap[p.id] = p.name);

        if(!tasks || tasks.length === 0) {
            list.innerHTML = '<div class="empty-state">No tasks found. Click Add Task.</div>';
            return;
        }

        list.innerHTML = tasks.map(t => `
            <div class="card" style="border-left: 4px solid ${t.status==='Completed'?'var(--success)':(t.status==='In Progress'?'var(--primary)':'var(--warning)')}">
                <div class="card-header">
                    <div class="card-title">${esc(t.name)}</div>
                    <span class="badge ${t.status==='Completed'?'badge-success':(t.status==='In Progress'?'badge-primary':'badge-warning')}">${esc(t.status)}</span>
                </div>
                <div class="text-sm text-muted mb-2">
                  Project: ${esc(projMap[t.projectId] || 'None')} <br>
                  Due: ${esc(t.dueDate || 'No date')}
                </div>
                <div class="flex gap-2 mt-2">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editTask('${t.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteTask('${t.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

document.getElementById('addTaskTopBtn').addEventListener('click', () => openTaskForm());

document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;
    if(target === 'tasks') loadTasks();
  });
});
