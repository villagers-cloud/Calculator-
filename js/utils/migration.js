// Handle Migration from localStorage to IndexedDB
async function runMigrationIfNeeded() {
    const LOCAL_STORAGE_KEY = "automation_pricing_app_v1";
    const oldData = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!oldData) {
        return; // No old data to migrate
    }

    try {
        const parsed = JSON.parse(oldData);

        // Check if already migrated
        const existingSettings = await window.appDB.get('settings', 'appSettings');
        if (existingSettings && existingSettings.migrated_v1) {
            return; // Already migrated
        }

        console.log("Migrating data from localStorage to IndexedDB...");

        // 1. Migrate Settings
        const newSettings = {
            id: 'appSettings',
            migrated_v1: true,
            agencyName: parsed.settings?.agencyName || "Your Agency",
            logoUrl: parsed.settings?.logoUrl || "",
            upiQrUrl: parsed.settings?.upiQrUrl || "",
            taxRate: parsed.settings?.taxRate || 18,
            metaRate: parsed.settings?.metaRate || 0.85,
            currency: parsed.settings?.currency || "₹",
            invoicePrefix: parsed.settings?.invoicePrefix || "INV",
            deliverables: parsed.settings?.deliverables || ["WhatsApp Setup","Facebook Ads","Automation Setup"],
            darkMode: !!parsed.settings?.darkMode,
            pinEnabled: !!parsed.settings?.pinEnabled,
            pin: parsed.settings?.pin || ""
        };
        await window.appDB.put('settings', newSettings);

        // We need to create Clients dynamically from old quotes, since old app didn't have a standalone Client entity
        const clientCache = {};

        // 2. Migrate Quotes
        if (parsed.quotes && Array.isArray(parsed.quotes)) {
            for (const q of parsed.quotes) {

                // Create a client if it doesn't exist yet
                let clientId = null;
                if (q.clientName) {
                    const clientNameLower = q.clientName.toLowerCase();
                    if (clientCache[clientNameLower]) {
                        clientId = clientCache[clientNameLower];
                    } else {
                        clientId = generateId();
                        clientCache[clientNameLower] = clientId;
                        await window.appDB.put('clients', {
                            id: clientId,
                            name: q.clientName,
                            dateAdded: new Date().toISOString()
                        });
                    }
                }

                const newQuote = {
                    id: q.id || generateId(),
                    invoice: q.invoice,
                    clientId: clientId,
                    clientNameTemp: q.clientName, // Store temp name just in case
                    date: q.date,
                    setupFee: Number(q.setupFee) || 0,
                    retainer: Number(q.retainer) || 0,
                    deliverables: q.deliverables || [],
                    expenses: q.expenses || [],
                    dailyMessages: Number(q.dailyMessages) || 0,
                    actualProfit: q.actualProfit,
                    notes: q.notes,
                    status: q.status || "Pending",
                    created: new Date().toISOString()
                };
                await window.appDB.put('quotes', newQuote);
            }
        }

        console.log("Migration completed successfully.");
        // We DO NOT delete localStorage yet for safety.
        // The migrated_v1 flag in settings prevents re-migration.

    } catch (e) {
        console.error("Migration failed:", e);
    }
}