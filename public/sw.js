// multica-mobile service worker
// Scope: /m/  (file lives at /m/sw.js, controls the whole PWA)
//
// Responsibilities:
//   1. Receive Web Push events and show OS-level notifications
//   2. Open or focus the PWA window when a notification is clicked
//
// Pushes are sent by the multica-mobile-push relay. Payload shape:
//   { title, body, tag, url, icon }

const CACHE = 'multica-mobile-v1';

self.addEventListener('install', (event) => {
  // Activate this version immediately on install — no need to gate behind
  // tab close. The PWA is small enough that a forced reload is fine.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Multica';
  const options = {
    body: data.body || '',
    tag: data.tag,           // collapses notifications with same tag
    icon: data.icon || '/m/icon-192.png',
    badge: '/m/icon-192.png',
    data: { url: data.url || '/m/' },
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/m/';
  // Resolve to a full URL relative to the SW's scope so clients.matchAll +
  // navigate work in both standalone (PWA) and browser-tab contexts.
  const target = new URL(url, self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // If a multica-mobile window is already open, focus it and navigate.
    for (const c of clientsList) {
      if (c.url.includes('/m/')) {
        await c.focus();
        if ('navigate' in c) {
          try { await c.navigate(target); } catch {}
        } else {
          c.postMessage({ type: 'navigate', url });
        }
        return;
      }
    }
    // Otherwise open a fresh window.
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

// Allow the page to ask the SW to update / unregister cleanly.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
