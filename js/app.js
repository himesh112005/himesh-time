/**
 * Main Application Orchestrator for Himesh Time
 * Initializes Database, Seeds Default Templates, Mounts UI and Registers Service Worker.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize IndexedDB
    await window.appDB.init();

    // 2. Ensure initial templates seeded & UI mounted
    await window.uiRenderer.init();

    // 3. Register Service Worker for 100% Offline PWA functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Service Worker registration failed:', error);
          });
      });
    }

    console.log('Himesh Time initialized successfully.');
  } catch (err) {
    console.error('Fatal initialization error in Himesh Time:', err);
  }
});
