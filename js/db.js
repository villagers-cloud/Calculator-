const DB_NAME = 'AutomationManagerDB';
const DB_VERSION = 1;
const STORES = ['clients', 'projects', 'tasks', 'quotes', 'invoices', 'expenses', 'services', 'team', 'settings'];

const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onerror = (event) => {
    console.error("Database error:", event.target.errorCode);
    reject("Failed to open database");
  };

  request.onsuccess = (event) => {
    resolve(event.target.result);
  };

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    // Create object stores
    STORES.forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    });

    // Create indexes for relational querying where appropriate
    if (!db.objectStoreNames.contains('quotes')) {
       // Just catching edge cases if the store creation failed earlier, though the loop above handles it
    }
  };
});

async function getDB() {
  return await dbPromise;
}

const DB = {
  async get(storeName, id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(storeName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async put(storeName, item) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(storeName, id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clearStore(storeName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async exportData() {
    const data = {};
    for (const storeName of STORES) {
      data[storeName] = await this.getAll(storeName);
    }
    return data;
  },

  async importData(data) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES, 'readwrite');

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);

      STORES.forEach(storeName => {
        if (data[storeName]) {
          const store = transaction.objectStore(storeName);
          store.clear();
          data[storeName].forEach(item => {
             store.put(item);
          });
        }
      });
    });
  }
};

// Initial Data Migration from localStorage (if exists)
async function migrateFromLocalStorage() {
  const oldState = localStorage.getItem('automation_pricing_app_v1');
  if (oldState) {
    try {
      const state = JSON.parse(oldState);
      const settings = state.settings || {};
      const quotes = state.quotes || [];

      // Save settings
      settings.id = 'app_settings'; // Singleton
      await DB.put('settings', settings);

      // Save quotes
      for (const q of quotes) {
         if (!q.id) q.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
         await DB.put('quotes', q);
      }

      // Mark as migrated to avoid re-running
      localStorage.setItem('automation_pricing_migrated', 'true');
      console.log('Successfully migrated data from localStorage to IndexedDB');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }
}

// Ensure default settings exist if DB is empty
async function initializeDefaults() {
  try {
    const settings = await DB.get('settings', 'app_settings');
    if (!settings) {
      await DB.put('settings', {
        id: 'app_settings',
        agencyName: "Your Agency",
        logoUrl: "",
        upiQrUrl: "",
        taxRate: 18,
        metaRate: 0.85,
        currency: "₹",
        invoicePrefix: "INV",
        deliverables: ["WhatsApp Setup", "Facebook Ads", "Automation Setup"],
        darkMode: false,
        pinEnabled: false,
        pin: ""
      });
    }
  } catch (e) {
    console.error("Failed to initialize defaults", e);
  }
}

// Run setup on script load
(async () => {
    if (!localStorage.getItem('automation_pricing_migrated')) {
        await migrateFromLocalStorage();
    }
    await initializeDefaults();
})();
