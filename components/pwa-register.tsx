'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
      // Dev: never serve cached chunks — unregister any leftover SW and wipe caches
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }, []);

  return null;
}
