// js/db.js
// Offline-first database wrapper using IndexedDB

const DB_NAME = 'AutomationManagerDB';
const DB_VERSION = 1;
const STORES = [
    'clients',
    'projects',
    'quotes',
    'invoices',
    'payments',
    'services',
    'tasks',
    'expenses',
    'settings',
    'activity'
];

class AppDB {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                STORES.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
                });

                // Set default settings if creating for first time
                if (!db.objectStoreNames.contains('settings')) {
                   const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
                   settingsStore.put({
                       id: 'global',
                       businessName: 'My Agency',
                       currency: '₹',
                       taxRate: 18,
                       darkMode: false,
                       invoicePrefix: 'INV',
                       quotePrefix: 'QT'
                   });
                } else {
                     const transaction = event.target.transaction;
                     const settingsStore = transaction.objectStore('settings');
                     settingsStore.put({
                        id: 'global',
                        businessName: 'My Agency',
                        currency: '₹',
                        taxRate: 18,
                        darkMode: false,
                        invoicePrefix: 'INV',
                        quotePrefix: 'QT'
                    });
                }
            };
        });
    }

    async getStore(storeName, mode = 'readonly') {
        await this.initPromise;
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async get(storeName, id) {
        const store = await this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const store = await this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        if (!data.id) {
            data.id = this.generateId();
        }
        data.updatedAt = new Date().toISOString();
        if (!data.createdAt) {
            data.createdAt = data.updatedAt;
        }

        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    async logActivity(action, details) {
        await this.put('activity', {
            action,
            details,
            timestamp: new Date().toISOString()
        });
    }

    // Advanced queries (filtering/sorting done in memory for simplicity since data sizes are relatively small)
    async query(storeName, filterFn, sortFn) {
        let data = await this.getAll(storeName);
        if (filterFn) data = data.filter(filterFn);
        if (sortFn) data = data.sort(sortFn);
        return data;
    }

    async exportData() {
        const data = {};
        for (const store of STORES) {
            data[store] = await this.getAll(store);
        }
        return data;
    }

    async importData(data) {
        for (const store of STORES) {
            if (data[store]) {
                await this.clear(store);
                for (const item of data[store]) {
                    await this.put(store, item);
                }
            }
        }
    }
}

const db = new AppDB();
window.db = db; // Make global for easy access
