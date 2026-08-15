/**
 * IndexedDB Database Module for Himesh Time
 * Provides offline-first persistent storage for Tasks, Daily Goals, Templates & Settings.
 */
const DB_NAME = 'HimeshTimeDB';
const DB_VERSION = 1;

class AppDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Tasks Object Store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('targetDate', 'targetDate', { unique: false });
          taskStore.createIndex('category', 'category', { unique: false });
          taskStore.createIndex('isRecurring', 'isRecurring', { unique: false });
          taskStore.createIndex('isCompleted', 'isCompleted', { unique: false });
        }

        // Daily Goals Object Store (one primary goal per date)
        if (!db.objectStoreNames.contains('goals')) {
          const goalStore = db.createObjectStore('goals', { keyPath: 'targetDate' });
          goalStore.createIndex('targetDate', 'targetDate', { unique: true });
        }

        // Recurring Templates Master Store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('category', 'category', { unique: false });
        }

        // Key-Value App Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- Generic Helpers ---
  async getStore(storeName, mode = 'readonly') {
    if (!this.db) await this.init();
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Task Operations ---
  async getAllTasks() {
    const store = await this.getStore('tasks');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTasksByDate(dateStr) {
    const store = await this.getStore('tasks');
    const index = store.index('targetDate');
    return new Promise((resolve, reject) => {
      const request = index.getAll(dateStr);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async addTask(task) {
    const store = await this.getStore('tasks', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(task);
      request.onsuccess = () => resolve(task);
      request.onerror = () => reject(request.error);
    });
  }

  async updateTask(task) {
    return this.addTask(task);
  }

  async deleteTask(taskId) {
    const store = await this.getStore('tasks', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(taskId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async addTasksBatch(tasksList) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      for (const t of tasksList) {
        store.put(t);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Daily Goal Operations ---
  async getGoalByDate(dateStr) {
    const store = await this.getStore('goals');
    return new Promise((resolve, reject) => {
      const request = store.get(dateStr);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveGoal(goal) {
    const store = await this.getStore('goals', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(goal);
      request.onsuccess = () => resolve(goal);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteGoal(dateStr) {
    const store = await this.getStore('goals', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(dateStr);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Recurring Template Operations ---
  async getTemplates() {
    const store = await this.getStore('templates');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTemplate(template) {
    const store = await this.getStore('templates', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(template);
      request.onsuccess = () => resolve(template);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTemplate(templateId) {
    const store = await this.getStore('templates', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(templateId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async setTemplatesBatch(templatesList) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      store.clear();
      for (const tmpl of templatesList) {
        store.put(tmpl);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Settings Operations ---
  async getSetting(key, defaultValue = null) {
    const store = await this.getStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result;
        resolve(item ? item.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    const store = await this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Data Export & Wipe ---
  async exportAllData() {
    const [tasks, goals, templates, settings] = await Promise.all([
      this.getAllTasks(),
      (async () => {
        const s = await this.getStore('goals');
        return new Promise(r => { const req = s.getAll(); req.onsuccess = () => r(req.result || []); });
      })(),
      this.getTemplates(),
      (async () => {
        const s = await this.getStore('settings');
        return new Promise(r => { const req = s.getAll(); req.onsuccess = () => r(req.result || []); });
      })()
    ]);
    return { tasks, goals, templates, settings, exportDate: new Date().toISOString() };
  }

  async clearAllData() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks', 'goals', 'templates', 'settings'], 'readwrite');
      tx.objectStore('tasks').clear();
      tx.objectStore('goals').clear();
      tx.objectStore('templates').clear();
      tx.objectStore('settings').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
}

window.appDB = new AppDB();
