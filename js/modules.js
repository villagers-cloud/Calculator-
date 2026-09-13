// js/modules.js
// Advanced modules: Projects, Tasks, Quotes, Invoices, Expenses

// --- PROJECTS MODULE ---
const renderProjects = async () => {
    const [projects, clients] = await Promise.all([db.getAll('projects'), db.getAll('clients')]);
    const tbody = document.getElementById('table-projects');
    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No projects found. Start a new one!</td></tr>';
        return;
    }

    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    tbody.innerHTML = projects.map(p => `
        <tr>
            <td><strong>${esc(p.name)}</strong><br><small class="text-muted">Due: ${formatDate(p.deadline)}</small></td>
            <td>${esc(clientMap[p.clientId]) || 'Unknown'}</td>
            <td><span class="badge ${p.status === 'Completed' ? 'badge-success' : (p.status === 'In Progress' ? 'badge-primary' : 'badge-warning')}">${p.status}</span></td>
            <td>
                <div style="background:var(--border); height:6px; border-radius:3px; overflow:hidden; width:100px; margin-top:4px;">
                    <div style="background:var(--primary); height:100%; width:${p.progress || 0}%;"></div>
                </div>
                <small>${p.progress || 0}%</small>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editProject('${p.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-project').addEventListener('click', () => editProject());

window.editProject = async (id = null) => {
    let p = { name: '', clientId: '', status: 'Planning', progress: 0, deadline: '', description: '' };
    if (id) p = await db.get('projects', id);

    const clients = await db.getAll('clients');

    const body = `
        <form id="form-project">
            <input type="hidden" id="proj-id" value="${id || ''}">
            <div class="form-group">
                <label class="form-label">Project Name *</label>
                <input type="text" class="form-control" id="proj-name" value="${esc(p.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Client</label>
                <select class="form-control" id="proj-client">
                    <option value="">-- Select Client --</option>
                    ${clients.map(c => `<option value="${c.id}" ${c.id === p.clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="proj-status">
                        <option ${p.status==='Planning'?'selected':''}>Planning</option>
                        <option ${p.status==='In Progress'?'selected':''}>In Progress</option>
                        <option ${p.status==='On Hold'?'selected':''}>On Hold</option>
                        <option ${p.status==='Completed'?'selected':''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Progress (%)</label>
                    <input type="number" class="form-control" id="proj-progress" value="${p.progress}" min="0" max="100">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Deadline</label>
                <input type="date" class="form-control" id="proj-deadline" value="${p.deadline}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="proj-desc">${p.description}</textarea>
            </div>
        </form>
    `;

    modal.open(id ? 'Edit Project' : 'New Project', body, `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProject()">Save Project</button>
    `);
};

window.saveProject = async () => {
    const id = document.getElementById('proj-id').value;
    const name = document.getElementById('proj-name').value.trim();
    if (!name) return alert('Name is required');

    const proj = {
        id: id || undefined,
        name,
        clientId: document.getElementById('proj-client').value,
        status: document.getElementById('proj-status').value,
        progress: Number(document.getElementById('proj-progress').value) || 0,
        deadline: document.getElementById('proj-deadline').value,
        description: document.getElementById('proj-desc').value
    };

    await db.put('projects', proj);
    await db.logActivity(id ? 'Updated Project' : 'Created Project', name);
    modal.close();
    showToast('Project saved');
    renderProjects();
};

window.deleteProject = async (id) => {
    if (confirm('Delete this project?')) {
        await db.delete('projects', id);
        showToast('Project deleted');
        renderProjects();
    }
};

// --- TASKS MODULE ---
const renderTasks = async () => {
    const [tasks, projects] = await Promise.all([db.getAll('tasks'), db.getAll('projects')]);
    const tbody = document.getElementById('table-tasks');
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No tasks. Great job!</td></tr>';
        return;
    }

    const projMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    // Sort: incomplete first, then by due date
    tasks.sort((a,b) => {
        if(a.status === 'Completed' && b.status !== 'Completed') return 1;
        if(a.status !== 'Completed' && b.status === 'Completed') return -1;
        return new Date(a.dueDate || '2099-01-01') - new Date(b.dueDate || '2099-01-01');
    });

    tbody.innerHTML = tasks.map(t => `
        <tr style="opacity: ${t.status==='Completed' ? '0.6' : '1'}">
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${t.status==='Completed'?'checked':''} onchange="toggleTaskStatus('${t.id}', this.checked)">
                    <span style="text-decoration: ${t.status==='Completed' ? 'line-through' : 'none'}">${esc(t.title)}</span>
                </div>
            </td>
            <td><span class="badge" style="background:var(--border); color:var(--text-main)">${projMap[t.projectId] || 'No Project'}</span></td>
            <td>${formatDate(t.dueDate) || '-'}</td>
            <td><span class="badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editTask('${t.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-task').addEventListener('click', () => editTask());

window.editTask = async (id = null) => {
    let t = { title: '', projectId: '', status: 'Pending', dueDate: '', notes: '' };
    if (id) t = await db.get('tasks', id);
    const projects = await db.getAll('projects');

    const body = `
        <form id="form-task">
            <input type="hidden" id="task-id" value="${id || ''}">
            <div class="form-group">
                <label class="form-label">Task Title *</label>
                <input type="text" class="form-control" id="task-title" value="${esc(t.title)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Related Project</label>
                <select class="form-control" id="task-project">
                    <option value="">-- None --</option>
                    ${projects.map(p => `<option value="${p.id}" ${p.id === t.projectId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
                </select>
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" class="form-control" id="task-due" value="${t.dueDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="task-status">
                        <option ${t.status==='Pending'?'selected':''}>Pending</option>
                        <option ${t.status==='Completed'?'selected':''}>Completed</option>
                    </select>
                </div>
            </div>
        </form>
    `;
    modal.open(id ? 'Edit Task' : 'New Task', body, `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveTask()">Save Task</button>
    `);
};

window.saveTask = async () => {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    if (!title) return alert('Title required');

    const task = {
        id: id || undefined,
        title,
        projectId: document.getElementById('task-project').value,
        dueDate: document.getElementById('task-due').value,
        status: document.getElementById('task-status').value
    };
    await db.put('tasks', task);
    modal.close();
    renderTasks();
};

window.toggleTaskStatus = async (id, isCompleted) => {
    const task = await db.get('tasks', id);
    task.status = isCompleted ? 'Completed' : 'Pending';
    await db.put('tasks', task);
    renderTasks();
};

window.deleteTask = async (id) => {
    if(confirm('Delete task?')){ await db.delete('tasks', id); renderTasks(); }
};

// --- QUOTES MODULE ---
const renderQuotes = async () => {
    const [quotes, clients] = await Promise.all([db.getAll('quotes'), db.getAll('clients')]);
    const tbody = document.getElementById('table-quotes');
    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No quotes found. Create a proposal!</td></tr>';
        return;
    }
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    tbody.innerHTML = quotes.map(q => `
        <tr>
            <td><strong>${q.quoteNumber}</strong></td>
            <td>${esc(clientMap[q.clientId]) || 'Unknown'}</td>
            <td>${formatDate(q.date)}</td>
            <td><strong>${formatMoney(q.grandTotal)}</strong></td>
            <td><span class="badge ${q.status === 'Accepted' ? 'badge-success' : (q.status === 'Draft' ? 'badge-primary' : 'badge-warning')}">${q.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editQuote('${q.id}')">Edit / View</button>
                <button class="btn btn-sm btn-primary" onclick="generateQuotePDF('${q.id}')">PDF</button>
                <button class="btn btn-sm btn-danger" onclick="deleteQuote('${q.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-quote').addEventListener('click', () => editQuote());

let currentQuoteItems = [];
window.editQuote = async (id = null) => {
    let q = { quoteNumber: '', clientId: '', status: 'Draft', date: new Date().toISOString().split('T')[0], items: [], subtotal: 0, tax: 0, grandTotal: 0, notes: '' };
    if (id) q = await db.get('quotes', id);
    else q.quoteNumber = (globalSettings.quotePrefix || 'QT') + '-' + Math.floor(1000 + Math.random() * 9000);

    currentQuoteItems = q.items || [];
    const [clients, services] = await Promise.all([db.getAll('clients'), db.getAll('services')]);

    const body = `
        <div class="grid-cols-2">
            <div class="form-group">
                <label class="form-label">Quote Number</label>
                <input type="text" class="form-control" id="q-num" value="${q.quoteNumber}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-control" id="q-date" value="${q.date}">
            </div>
            <div class="form-group">
                <label class="form-label">Client *</label>
                <select class="form-control" id="q-client" required>
                    <option value="">-- Select --</option>
                    ${clients.map(c => `<option value="${c.id}" ${c.id === q.clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-control" id="q-status">
                    <option ${q.status==='Draft'?'selected':''}>Draft</option>
                    <option ${q.status==='Sent'?'selected':''}>Sent</option>
                    <option ${q.status==='Accepted'?'selected':''}>Accepted</option>
                    <option ${q.status==='Rejected'?'selected':''}>Rejected</option>
                </select>
            </div>
        </div>

        <h4 class="mt-4 border-bottom pb-2">Line Items</h4>
        <div style="background:var(--bg-app); padding:16px; border-radius:var(--radius); margin-bottom:16px;">
            <div class="grid-cols-3" style="gap:10px; align-items:end;">
                <div>
                    <label class="form-label">Add Service from Catalog</label>
                    <select class="form-control" id="q-service-select">
                        <option value="">-- Custom Item --</option>
                        ${services.map(s => `<option value="${s.id}" data-name="${s.name}" data-price="${s.setupFee + s.monthlyFee}">${s.name} (${formatMoney(s.setupFee + s.monthlyFee)})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="form-label">Custom Name / Price</label>
                    <div style="display:flex; gap:10px;">
                        <input type="text" class="form-control" id="q-item-name" placeholder="Item Name">
                        <input type="number" class="form-control" id="q-item-price" placeholder="Price" style="width:100px;">
                    </div>
                </div>
                <div>
                    <button class="btn btn-primary" onclick="addQuoteItem()">+ Add Item</button>
                </div>
            </div>
        </div>

        <table class="table mb-4">
            <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
            <tbody id="q-items-tbody"></tbody>
        </table>

        <div class="grid-cols-2">
            <div>
                <label class="form-label">Notes / Terms</label>
                <textarea class="form-control" id="q-notes">${q.notes}</textarea>
            </div>
            <div class="card" style="background:var(--bg-app); border:none;">
                <div class="flex-between mb-2"><span>Subtotal:</span> <strong id="q-subtotal">$0.00</strong></div>
                <div class="flex-between mb-2"><span>Tax (${globalSettings.taxRate||0}%):</span> <strong id="q-tax">$0.00</strong></div>
                <div class="flex-between pt-2" style="border-top:2px solid var(--border); font-size:1.25rem;">
                    <span>Total:</span> <strong id="q-total">$0.00</strong>
                </div>
            </div>
        </div>
    `;

    modal.open(id ? 'Edit Quote' : 'New Quote', body, `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveQuote('${id||''}')">Save Quote</button>
    `);

    document.getElementById('q-service-select').addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        if(opt.value) {
            document.getElementById('q-item-name').value = opt.dataset.name;
            document.getElementById('q-item-price').value = opt.dataset.price;
        }
    });

    renderQuoteItems();
};

window.addQuoteItem = () => {
    const name = document.getElementById('q-item-name').value.trim();
    const price = Number(document.getElementById('q-item-price').value) || 0;
    if(!name) return alert('Enter item name');

    currentQuoteItems.push({ name, qty: 1, price, total: price });
    document.getElementById('q-item-name').value = '';
    document.getElementById('q-item-price').value = '';
    document.getElementById('q-service-select').value = '';
    renderQuoteItems();
};

window.removeQuoteItem = (index) => {
    currentQuoteItems.splice(index, 1);
    renderQuoteItems();
};

window.updateQuoteQty = (index, qty) => {
    qty = Number(qty) || 1;
    currentQuoteItems[index].qty = qty;
    currentQuoteItems[index].total = qty * currentQuoteItems[index].price;
    renderQuoteItems();
};

const renderQuoteItems = () => {
    const tbody = document.getElementById('q-items-tbody');
    let sub = 0;
    tbody.innerHTML = currentQuoteItems.map((item, i) => {
        sub += item.total;
        return `
            <tr>
                <td>${item.name}</td>
                <td><input type="number" class="form-control" style="width:70px; padding:4px;" value="${item.qty}" min="1" onchange="updateQuoteQty(${i}, this.value)"></td>
                <td>${formatMoney(item.price)}</td>
                <td>${formatMoney(item.total)}</td>
                <td><button class="icon-btn text-danger" onclick="removeQuoteItem(${i})">&times;</button></td>
            </tr>
        `;
    }).join('');

    if(currentQuoteItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items added yet.</td></tr>';
    }

    const taxRate = Number(globalSettings.taxRate) || 0;
    const tax = sub * (taxRate / 100);
    const total = sub + tax;

    document.getElementById('q-subtotal').textContent = formatMoney(sub);
    document.getElementById('q-tax').textContent = formatMoney(tax);
    document.getElementById('q-total').textContent = formatMoney(total);
};

window.saveQuote = async (id) => {
    const clientId = document.getElementById('q-client').value;
    if(!clientId) return alert('Select a client');
    if(currentQuoteItems.length === 0) return alert('Add at least one item');

    let sub = 0; currentQuoteItems.forEach(i => sub += i.total);
    const tax = sub * ((Number(globalSettings.taxRate) || 0) / 100);

    const quote = {
        id: id || undefined,
        quoteNumber: document.getElementById('q-num').value,
        clientId,
        date: document.getElementById('q-date').value,
        status: document.getElementById('q-status').value,
        items: currentQuoteItems,
        subtotal: sub,
        tax: tax,
        grandTotal: sub + tax,
        notes: document.getElementById('q-notes').value
    };

    await db.put('quotes', quote);
    await db.logActivity(id ? 'Updated Quote' : 'Created Quote', quote.quoteNumber);
    modal.close();
    showToast('Quote saved');
    renderQuotes();
};

window.deleteQuote = async (id) => {
    if(confirm('Delete quote?')){ await db.delete('quotes', id); renderQuotes(); }
};

window.generateQuotePDF = async (id) => {
    const q = await db.get('quotes', id);
    const c = await db.get('clients', q.clientId);

    // Create temporary hidden div for PDF rendering
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.padding = '40px';
    div.style.width = '800px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.color = '#333';
    div.style.background = '#fff';

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; border-bottom:3px solid var(--primary); padding-bottom:20px; margin-bottom:30px;">
            <div>
                <h1 style="margin:0; color:var(--primary); font-size:32px;">${globalSettings.businessName || 'My Agency'}</h1>
                <p style="margin:5px 0 0; color:#666;">${globalSettings.email || ''}<br>${globalSettings.phone || ''}</p>
            </div>
            <div style="text-align:right;">
                <h2 style="margin:0; font-size:28px; color:#555;">PROPOSAL</h2>
                <p style="margin:5px 0 0;"><strong>${q.quoteNumber}</strong><br>Date: ${formatDate(q.date)}</p>
            </div>
        </div>

        <div style="margin-bottom:40px;">
            <h3 style="margin:0 0 10px; color:#666; font-size:16px; text-transform:uppercase;">Prepared For:</h3>
            <strong style="font-size:20px;">${c.name}</strong>
            ${c.company ? `<div style="margin-top:4px;">${c.company}</div>` : ''}
            ${c.email ? `<div>${c.email}</div>` : ''}
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
            <thead>
                <tr style="background:#f4f6f8; border-bottom:2px solid #ddd;">
                    <th style="padding:12px; text-align:left;">Description</th>
                    <th style="padding:12px; text-align:center;">Qty</th>
                    <th style="padding:12px; text-align:right;">Price</th>
                    <th style="padding:12px; text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${q.items.map(item => `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:12px;">${item.name}</td>
                        <td style="padding:12px; text-align:center;">${item.qty}</td>
                        <td style="padding:12px; text-align:right;">${formatMoney(item.price)}</td>
                        <td style="padding:12px; text-align:right;">${formatMoney(item.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end;">
            <div style="width:300px;">
                <div style="display:flex; justify-content:space-between; padding:8px 0;">
                    <span>Subtotal:</span>
                    <strong>${formatMoney(q.subtotal)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #ddd;">
                    <span>Tax:</span>
                    <strong>${formatMoney(q.tax)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:20px; font-weight:bold; color:var(--primary);">
                    <span>Total:</span>
                    <span>${formatMoney(q.grandTotal)}</span>
                </div>
            </div>
        </div>

        ${q.notes ? `
        <div style="margin-top:50px; padding-top:20px; border-top:1px solid #eee;">
            <h4 style="margin:0 0 10px; color:#666;">Terms & Notes</h4>
            <p style="white-space:pre-wrap; line-height:1.5;">${q.notes}</p>
        </div>
        ` : ''}
    `;

    document.body.appendChild(div);

    try {
        await html2pdf().set({
            margin: 0,
            filename: `${q.quoteNumber}-${c.name.replace(/\s+/g,'_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).from(div).save();
        showToast('PDF Generated Successfully');
    } catch(err) {
        alert('Failed to generate PDF. Make sure you are online to load the PDF library initially.');
    } finally {
        div.remove();
    }
};

// --- INVOICES MODULE ---
// Essentially the same logic as Quotes, simplified for demonstration
const renderInvoices = async () => {
    const [invoices, clients] = await Promise.all([db.getAll('invoices'), db.getAll('clients')]);
    const tbody = document.getElementById('table-invoices');
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No invoices yet.</td></tr>';
        return;
    }
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    tbody.innerHTML = invoices.map(inv => `
        <tr>
            <td><strong>${inv.invoiceNumber}</strong></td>
            <td>${esc(clientMap[inv.clientId]) || 'Unknown'}</td>
            <td>${formatDate(inv.date)}</td>
            <td><strong>${formatMoney(inv.grandTotal)}</strong></td>
            <td><span class="badge ${inv.status === 'Paid' ? 'badge-success' : (inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning')}">${inv.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editInvoice('${inv.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteInvoice('${inv.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-invoice').addEventListener('click', () => editInvoice());

window.editInvoice = async (id = null) => {
    let inv = { invoiceNumber: '', clientId: '', status: 'Unpaid', date: new Date().toISOString().split('T')[0], grandTotal: 0 };
    if (id) inv = await db.get('invoices', id);
    else inv.invoiceNumber = (globalSettings.invoicePrefix || 'INV') + '-' + Math.floor(1000 + Math.random() * 9000);

    const clients = await db.getAll('clients');

    const body = `
        <form id="form-invoice">
            <input type="hidden" id="inv-id" value="${id || ''}">
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Invoice Number</label>
                    <input type="text" class="form-control" id="inv-num" value="${inv.invoiceNumber}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Client *</label>
                    <select class="form-control" id="inv-client" required>
                        <option value="">-- Select --</option>
                        ${clients.map(c => `<option value="${c.id}" ${c.id === inv.clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-control" id="inv-date" value="${inv.date}">
                </div>
                <div class="form-group">
                    <label class="form-label">Total Amount</label>
                    <input type="number" class="form-control" id="inv-total" value="${inv.grandTotal}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="inv-status">
                        <option ${inv.status==='Unpaid'?'selected':''}>Unpaid</option>
                        <option ${inv.status==='Paid'?'selected':''}>Paid</option>
                        <option ${inv.status==='Overdue'?'selected':''}>Overdue</option>
                    </select>
                </div>
            </div>
        </form>
    `;
    modal.open(id ? 'Edit Invoice' : 'New Invoice', body, `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveInvoice()">Save Invoice</button>
    `);
};

window.saveInvoice = async () => {
    const id = document.getElementById('inv-id').value;
    const clientId = document.getElementById('inv-client').value;
    if(!clientId) return alert('Client required');

    const inv = {
        id: id || undefined,
        invoiceNumber: document.getElementById('inv-num').value,
        clientId,
        date: document.getElementById('inv-date').value,
        grandTotal: Number(document.getElementById('inv-total').value) || 0,
        status: document.getElementById('inv-status').value
    };

    await db.put('invoices', inv);
    modal.close();
    renderInvoices();
};

window.deleteInvoice = async (id) => {
    if(confirm('Delete invoice?')){ await db.delete('invoices', id); renderInvoices(); }
};

// --- EXPENSES MODULE ---
const renderExpenses = async () => {
    const expenses = await db.getAll('expenses');
    const tbody = document.getElementById('table-expenses');
    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No expenses recorded.</td></tr>';
        return;
    }

    expenses.sort((a,b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = expenses.map(e => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td><strong>${esc(e.description)}</strong></td>
            <td><span class="badge badge-primary">${esc(e.category) || 'General'}</span></td>
            <td class="text-danger"><strong>${formatMoney(e.amount)}</strong></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editExpense('${e.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteExpense('${e.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

document.getElementById('btn-new-expense').addEventListener('click', () => editExpense());

window.editExpense = async (id = null) => {
    let e = { description: '', category: 'Software', amount: 0, date: new Date().toISOString().split('T')[0] };
    if (id) e = await db.get('expenses', id);

    const body = `
        <form id="form-expense">
            <input type="hidden" id="exp-id" value="${id || ''}">
            <div class="form-group">
                <label class="form-label">Description *</label>
                <input type="text" class="form-control" id="exp-desc" value="${esc(e.description)}" required>
            </div>
            <div class="grid-cols-2">
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-control" id="exp-cat" value="${e.category}" list="cat-list">
                    <datalist id="cat-list">
                        <option value="Software/API">
                        <option value="Contractor">
                        <option value="Marketing">
                        <option value="Office">
                    </datalist>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount</label>
                    <input type="number" class="form-control" id="exp-amt" value="${e.amount}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-control" id="exp-date" value="${e.date}" required>
                </div>
            </div>
        </form>
    `;
    modal.open(id ? 'Edit Expense' : 'New Expense', body, `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveExpense()">Save Expense</button>
    `);
};

window.saveExpense = async () => {
    const id = document.getElementById('exp-id').value;
    const exp = {
        id: id || undefined,
        description: document.getElementById('exp-desc').value.trim(),
        category: document.getElementById('exp-cat').value,
        amount: Number(document.getElementById('exp-amt').value) || 0,
        date: document.getElementById('exp-date').value
    };
    if(!exp.description) return alert('Description required');
    await db.put('expenses', exp);
    modal.close();
    renderExpenses();
};

window.deleteExpense = async (id) => {
    if(confirm('Delete expense?')){ await db.delete('expenses', id); renderExpenses(); }
};

// Update app.js Dashboard rendering to include real data calculations
const renderDashboard = async () => {
    const [clients, services, projects, invoices, quotes, activities] = await Promise.all([
        db.getAll('clients'),
        db.getAll('services'),
        db.getAll('projects'),
        db.getAll('invoices'),
        db.getAll('quotes'),
        db.getAll('activity')
    ]);

    const activeProjects = projects.filter(p => p.status === 'In Progress').length;

    // Calculate MRR from active clients and accepted quotes/retainers (simplified to paid invoices for now)
    const paidRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.grandTotal, 0);

    document.getElementById('dashboard-metrics').innerHTML = `
        <div class="metric-card">
            <div class="metric-title">Total Clients</div>
            <div class="metric-value">${clients.length}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Active Projects</div>
            <div class="metric-value">${activeProjects}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Proposals Generated</div>
            <div class="metric-value">${quotes.length}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Total Revenue Paid</div>
            <div class="metric-value" style="color:var(--success)">${formatMoney(paidRevenue)}</div>
        </div>
    `;

    const recentAct = activities.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    document.getElementById('dashboard-activity').innerHTML = recentAct.length ? recentAct.map(a => `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
            <div style="font-weight: 500">${a.action}</div>
            <div class="text-muted" style="font-size: 0.8rem">${a.details} &bull; ${formatDate(a.timestamp)}</div>
        </div>
    `).join('') : '<p class="text-muted mt-2">No activity recorded yet.</p>';

    // Fetch upcoming tasks
    const tasks = await db.getAll('tasks');
    const upcoming = tasks.filter(t => t.status !== 'Completed' && t.dueDate)
                          .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
                          .slice(0, 5);

    document.getElementById('dashboard-tasks').innerHTML = upcoming.length ? upcoming.map(t => `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between;">
            <div>
                <div style="font-weight: 500">${esc(t.title)}</div>
                <div class="text-muted" style="font-size: 0.8rem">Due: ${formatDate(t.dueDate)}</div>
            </div>
            <input type="checkbox" onchange="toggleTaskStatus('${t.id}', this.checked)">
        </div>
    `).join('') : '<p class="text-muted mt-2">No upcoming tasks.</p>';
};

// Setup global search input filters for views
['clients', 'projects', 'quotes', 'tasks', 'invoices', 'services', 'expenses'].forEach(view => {
    const input = document.getElementById(`search-${view}`);
    if (input) {
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll(`#${view === 'services' ? 'grid' : 'table'}-${view} ${view === 'services' ? '.card' : 'tr'}`);
            rows.forEach(row => {
                if (row.classList.contains('empty-state')) return;
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
});
