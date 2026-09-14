// Reports View
window.appRouter.addRoute('reports', async () => {
    const container = document.getElementById('page-reports');
    container.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <h2 style="margin:0">Business Reports</h2>
            </div>

            <div class="grid">
                <div class="col-6 metric">
                    <div class="metric-label">Total Revenue (Paid)</div>
                    <div class="metric-value" id="repRev">₹0</div>
                </div>
                <div class="col-6 metric loss">
                    <div class="metric-label">Total Expenses</div>
                    <div class="metric-value" id="repExp" style="color:var(--red)">₹0</div>
                </div>
                <div class="col-12 metric neutral">
                    <div class="metric-label">Net Profit (Cash basis)</div>
                    <div class="metric-value" id="repNet">₹0</div>
                </div>
            </div>

            <div class="grid" style="margin-top:20px">
                <div class="col-4 metric" style="background:var(--bg); border:none">
                    <div class="metric-label">Active Clients</div>
                    <div class="metric-value" style="font-size:20px" id="repClients">0</div>
                </div>
                <div class="col-4 metric" style="background:var(--bg); border:none">
                    <div class="metric-label">Active Projects</div>
                    <div class="metric-value" style="font-size:20px" id="repProjects">0</div>
                </div>
                <div class="col-4 metric" style="background:var(--bg); border:none">
                    <div class="metric-label">Total Quotes</div>
                    <div class="metric-value" style="font-size:20px" id="repQuotes">0</div>
                </div>
            </div>

            <div style="margin-top:20px; font-size:12px; color:var(--muted); text-align:center;">
                Note: This is a simplified cash-flow report based on recorded Payments and Expenses.
            </div>
        </div>
    `;

    const payments = await window.appDB.getAll('payments');
    const expenses = await window.appDB.getAll('expenses');
    const clients = await window.appDB.getAll('clients');
    const projects = await window.appDB.getAll('projects');
    const quotes = await window.appDB.getAll('quotes');

    const rev = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const net = rev - exp;

    document.getElementById('repRev').textContent = formatMoney(rev, window.AppState.settings.currency);
    document.getElementById('repExp').textContent = formatMoney(exp, window.AppState.settings.currency);
    const netEl = document.getElementById('repNet');
    netEl.textContent = formatMoney(net, window.AppState.settings.currency);
    netEl.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';

    document.getElementById('repClients').textContent = clients.filter(c => c.status !== 'Inactive').length;
    document.getElementById('repProjects').textContent = projects.filter(p => p.status === 'In Progress' || p.status === 'Planning').length;
    document.getElementById('repQuotes').textContent = quotes.length;
});

// Settings & Data View
window.appRouter.addRoute('settings', async () => {
    const container = document.getElementById('page-settings');
    container.innerHTML = `
      <div class="grid">
        <div class="col-6 card">
          <h2>Agency Profile</h2>
          <div class="field"><label>Agency Name</label><input id="set-agencyName"></div>
          <div class="field">
            <label>Logo URL</label><input id="set-logoUrl" placeholder="https://…">
          </div>
          <div class="field"><label>UPI QR Code Image URL</label><input id="set-upiQrUrl" placeholder="https://…"></div>
          <button class="btn green" id="saveProfileBtn">Save Profile</button>
        </div>

        <div class="col-6 card">
          <h2>Pricing Defaults</h2>
          <div class="row">
            <div class="field"><label>Default Tax %</label><input type="number" id="set-taxRate" min="0" step=".01"></div>
            <div class="field"><label>Meta Message Rate</label><input type="number" id="set-metaRate" min="0" step=".0001"></div>
          </div>
          <div class="row">
            <div class="field">
              <label>Currency Symbol</label>
              <select id="set-currency">
                <option value="₹">₹</option><option value="$">$</option><option value="€">€</option><option value="£">£</option>
              </select>
            </div>
            <div class="field"><label>Invoice Prefix</label><input id="set-invoicePrefix"></div>
          </div>
          <button class="btn green" id="savePricingBtn">Save Pricing</button>
        </div>

        <div class="col-6 card">
          <h2>App Preferences</h2>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
            <div><div style="font-weight:700">Dark Mode</div><div class="subtitle">Use a low-glare dark interface.</div></div>
            <input type="checkbox" id="set-darkMode" style="width:auto; transform:scale(1.5)">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
            <div><div style="font-weight:700">Require PIN on Open</div><div class="subtitle">Ask for PIN every time app starts.</div></div>
            <input type="checkbox" id="set-pinEnabled" style="width:auto; transform:scale(1.5)">
          </div>
          <div class="field">
            <label>4-Digit App PIN</label>
            <input type="password" id="set-appPin" inputmode="numeric" maxlength="4" placeholder="Leave blank to keep current">
          </div>
          <button class="btn green" id="savePrefsBtn">Save Preferences</button>
        </div>

        <div class="col-6 card">
          <h2>Deliverables Checklist</h2>
          <div class="subtitle" style="margin-bottom:10px">Manage default quote deliverables.</div>
          <div id="set-deliverablesList"></div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <input id="set-newDel" placeholder="e.g. WhatsApp Setup">
            <button class="btn primary" id="addDelBtn">Add</button>
          </div>
        </div>
      </div>
    `;

    const s = window.AppState.settings;

    // Bind current settings
    ['agencyName', 'logoUrl', 'upiQrUrl', 'taxRate', 'metaRate', 'currency', 'invoicePrefix'].forEach(id => {
        const el = document.getElementById('set-' + id);
        if(el) el.value = s[id] !== undefined ? s[id] : '';
    });

    document.getElementById('set-darkMode').checked = !!s.darkMode;
    document.getElementById('set-pinEnabled').checked = !!s.pinEnabled;

    const renderDeliverables = () => {
        document.getElementById('set-deliverablesList').innerHTML = (s.deliverables || []).map((d, i) => `
            <div style="display:flex; gap:8px; margin-bottom:8px">
                <input value="${escapeHTML(d)}" data-del-idx="${i}" style="padding:6px">
                <button class="btn danger small" data-del-rm="${i}">X</button>
            </div>
        `).join('');
    };
    renderDeliverables();

    // Handlers
    document.getElementById('saveProfileBtn').onclick = async () => {
        s.agencyName = document.getElementById('set-agencyName').value.trim();
        s.logoUrl = document.getElementById('set-logoUrl').value.trim();
        s.upiQrUrl = document.getElementById('set-upiQrUrl').value.trim();
        await window.AppState.saveSettings();
        alert("Profile saved.");
    };

    document.getElementById('savePricingBtn').onclick = async () => {
        s.taxRate = Number(document.getElementById('set-taxRate').value) || 0;
        s.metaRate = Number(document.getElementById('set-metaRate').value) || 0;
        s.currency = document.getElementById('set-currency').value;
        s.invoicePrefix = document.getElementById('set-invoicePrefix').value.trim() || 'INV';
        await window.AppState.saveSettings();
        alert("Pricing defaults saved.");
    };

    document.getElementById('savePrefsBtn').onclick = async () => {
        s.darkMode = document.getElementById('set-darkMode').checked;
        s.pinEnabled = document.getElementById('set-pinEnabled').checked;
        const pin = document.getElementById('set-appPin').value.trim();
        if (pin && /^\d{4}$/.test(pin)) {
            s.pin = pin;
            document.getElementById('set-appPin').value = ""; // clear after save
        } else if (pin) {
            alert("PIN must be exactly 4 digits.");
            return;
        }
        await window.AppState.saveSettings();
        alert("Preferences saved.");
    };

    document.getElementById('addDelBtn').onclick = async () => {
        const input = document.getElementById('set-newDel');
        const v = input.value.trim();
        if (v && !s.deliverables.includes(v)) {
            s.deliverables.push(v);
            input.value = "";
            await window.AppState.saveSettings();
            renderDeliverables();
        }
    };

    document.getElementById('set-deliverablesList').addEventListener('change', async (e) => {
        if (e.target.dataset.delIdx !== undefined) {
            s.deliverables[Number(e.target.dataset.delIdx)] = e.target.value.trim();
            await window.AppState.saveSettings();
        }
    });

    document.getElementById('set-deliverablesList').addEventListener('click', async (e) => {
        if (e.target.dataset.delRm !== undefined) {
            s.deliverables.splice(Number(e.target.dataset.delRm), 1);
            await window.AppState.saveSettings();
            renderDeliverables();
        }
    });
});

window.appRouter.addRoute('data', async () => {
    const container = document.getElementById('page-data');
    if(!container) {
        const main = document.querySelector('main');
        const p = document.createElement('section');
        p.id = 'page-data'; p.className = 'page';
        main.appendChild(p);
    }

    document.getElementById('page-data').innerHTML = `
        <div class="card">
            <h2>Data Management (Backup / Restore)</h2>
            <p class="muted">Your data is stored completely offline on this device. Back it up regularly.</p>

            <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap">
                <button class="btn primary" id="exportJsonBtn">Export Full JSON Backup</button>
                <label class="btn" style="display:inline-block; margin:0">
                    Import JSON Backup
                    <input type="file" id="importJsonFile" accept=".json" hidden>
                </label>
            </div>

            <h3 style="margin-top:30px; border-top:1px solid var(--line); padding-top:15px">Export CSV Data</h3>
            <div style="display:flex; gap:10px; flex-wrap:wrap">
                <button class="btn small" data-csv="clients">Clients</button>
                <button class="btn small" data-csv="quotes">Quotes</button>
                <button class="btn small" data-csv="invoices">Invoices</button>
                <button class="btn small" data-csv="expenses">Expenses</button>
                <button class="btn small" data-csv="projects">Projects</button>
                <button class="btn small" data-csv="payments">Payments</button>
            </div>

            <div class="danger-zone" style="margin-top:40px; padding:20px; border-radius:12px">
                <h3 style="margin:0; color:var(--red)">Danger Zone</h3>
                <p style="font-size:12px; color:var(--red)">Permanently delete all data and reset the application.</p>
                <button class="btn danger" id="resetAppBtn">Factory Reset App</button>
            </div>
        </div>
    `;

    // Full JSON Backup
    document.getElementById('exportJsonBtn').onclick = async () => {
        const stores = ['settings', 'clients', 'services', 'quotes', 'projects', 'tasks', 'invoices', 'payments', 'expenses', 'team', 'notes'];
        const dump = {};
        for (const store of stores) {
            dump[store] = await window.appDB.getAll(store);
        }

        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `automation-manager-backup-${getTodayDate()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('importJsonFile').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data.settings || !data.clients) throw new Error("Invalid structure");

                if (confirm("This will overwrite existing data. Are you sure?")) {
                    const stores = ['settings', 'clients', 'services', 'quotes', 'projects', 'tasks', 'invoices', 'payments', 'expenses', 'team', 'notes'];
                    for (const store of stores) {
                        if (data[store]) {
                            await window.appDB.clear(store);
                            for (const item of data[store]) {
                                await window.appDB.put(store, item);
                            }
                        }
                    }
                    alert("Import successful. Reloading app.");
                    window.location.reload();
                }
            } catch (err) {
                alert("Invalid backup file.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    // CSV Exports
    document.getElementById('page-data').onclick = async (e) => {
        if (e.target.dataset.csv) {
            const type = e.target.dataset.csv;
            const data = await window.appDB.getAll(type);
            if (data.length === 0) { alert("No data to export."); return; }

            // Build CSV
            const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
            const csvRows = [headers.join(',')];

            for (const row of data) {
                const values = headers.map(h => {
                    let val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
                    // Escape quotes and wrap in quotes if contains comma
                    val = val.replace(/"/g, '""');
                    if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
                    return val;
                });
                csvRows.push(values.join(','));
            }

            const blob = new Blob([csvRows.join('\n')], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `automation_${type}_${getTodayDate()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    // Reset App
    document.getElementById('resetAppBtn').onclick = async () => {
        const pin = prompt("WARNING: This will delete ALL data. Type 'DELETE' to confirm:");
        if (pin === 'DELETE') {
            const stores = ['settings', 'clients', 'services', 'quotes', 'projects', 'tasks', 'invoices', 'payments', 'expenses', 'team', 'notes', 'activity'];
            for(let s of stores) {
                try { await window.appDB.clear(s); } catch(e){}
            }
            localStorage.removeItem('automation_pricing_app_v1'); // wipe old data too
            alert("Application reset. Reloading.");
            window.location.reload();
        }
    };
});