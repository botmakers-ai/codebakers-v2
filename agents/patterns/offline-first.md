---
triggers:
  - "offline first"
  - "PWA"
  - "service worker"
  - "IndexedDB"
  - "background sync"
  - "offline queue"
  - "conflict resolution"
  - "network detection"
  - "cache strategies"
  - "persistent storage"

depends_on:
  - data-fetching.md (TanStack Query for sync management)
  - optimistic-updates.md (rollback patterns)
  - security.md (validation before sync)

prerequisites:
  - Next.js App Router
  - TypeScript
  - Understanding of Service Workers
  - Understanding of IndexedDB

description: |
  Production-ready offline-first architecture covering: PWA manifest and installation, Service Worker lifecycle (registration, update, skipWaiting), cache strategies (CacheFirst, NetworkFirst, StaleWhileRevalidate), IndexedDB with Dexie.js, offline queue with Background Sync API, conflict resolution (LWW, CRDTs), network detection, and sync status indicators.
---

# Offline-First Pattern

## Research Foundation

**Searches performed:**
1. Offline queue background sync API deferred operations 2025
2. Conflict resolution CRDT operational transformation offline-first 2024
3. Network status detection online offline React hooks 2025
4. PWA service worker Next.js workbox cache strategies 2025
5. IndexedDB React hooks idb-keyval Dexie.js 2024
6. Service worker lifecycle registration update skip waiting 2025
7. Offline storage quota management persistent storage 2024
8. Last write wins timestamp conflict resolution offline sync 2024
9. PWA manifest web app install prompt installability 2025
10. Optimistic UI updates rollback offline first 2024
11. Sync status indicator offline badge UI patterns 2024
12. Service worker debugging Chrome DevTools 2025
13. Offline fallback page error handling service worker 2024

**Key findings:**
- **2025 installability change:** Service Workers **no longer required** for PWA installation — manifest alone sufficient (Chrome, Edge)
- **Background Sync API** defers actions until stable connection — **automatic retry** when network returns
- **CRDTs vs OT:** CRDTs (Conflict-free Replicated Data Types) enable **true offline-first** without central server; OT requires server coordination
- **Storage quotas 2024:** Chrome/Edge allow **60% of disk space**; Firefox allows **10% (best-effort)** or **50% (persistent)**
- **Last Write Wins** is **simplest conflict resolution** but has **high data loss risk** — use only for single-user scenarios
- **Dexie.js useLiveQuery** provides **reactive IndexedDB** — re-renders components on database changes
- **skipWaiting() is dangerous** — can disrupt users mid-session by suddenly changing app behavior
- **Workbox** provides **5 caching strategies** out-of-the-box: CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly, CacheOnly
- **Offline-first is baseline expectation** in 2025 (not premium feature)

---

## Core Principles

1. **App works offline** — core functionality available without network
2. **Queue writes, retry automatically** — Background Sync API handles retry when connection returns
3. **Conflict resolution defined upfront** — choose LWW, CRDTs, or manual resolution before building
4. **Optimistic UI with rollback** — instant feedback, revert on failure
5. **Network-aware UI** — show sync status, offline badge, pending changes count
6. **Graceful degradation** — disable features requiring network, not entire app
7. **Persistent storage** — request `navigator.storage.persist()` to prevent eviction

---

## 1. PWA Setup with Next.js

### Install next-pwa

```bash
pnpm add --save-exact next-pwa
pnpm add --save-exact -D webpack
```

### Configure Next.js

```javascript
// next.config.mjs
import withPWA from 'next-pwa';

const nextConfig = {
  // Your existing config
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false, // IMPORTANT: Don't auto-activate — let users control
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-data-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: ({ url }) => {
        const isSameOrigin = self.origin === url.origin;
        if (!isSameOrigin) return false;
        const pathname = url.pathname;
        // Exclude /api/ routes from caching
        if (pathname.startsWith('/api/')) return false;
        return true;
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})(nextConfig);
```

### Web App Manifest

```json
// public/manifest.json
{
  "name": "Your App Name",
  "short_name": "App",
  "description": "Your app description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Link Manifest in Layout

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Your App',
  description: 'Your app description',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Your App',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 2. Network Detection Hook

```typescript
// hooks/useNetworkStatus.ts
'use client';

import { useEffect, useState, useCallback } from 'react';

export interface NetworkStatus {
  online: boolean;
  effectiveType: string | null; // '4g', '3g', '2g', 'slow-2g'
  downlink: number | null; // Mbps
  rtt: number | null; // Round-trip time in ms
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  const updateNetworkInfo = useCallback(() => {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    setStatus({
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
    });
  }, []);

  useEffect(() => {
    updateNetworkInfo();

    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, online: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update network info when connection changes
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}
```

### Network Status Indicator Component

```typescript
// components/NetworkStatus.tsx
'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const { online, effectiveType } = useNetworkStatus();

  if (online) return null; // Only show when offline

  return (
    <div
      className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span>You are offline. Changes will sync when connection is restored.</span>
      </div>
    </div>
  );
}
```

---

## 3. IndexedDB with Dexie.js

```bash
pnpm add --save-exact dexie dexie-react-hooks
```

```typescript
// lib/db.ts
import Dexie, { Table } from 'dexie';

export interface Todo {
  id?: number;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  serverItemId?: string; // ID from server after sync
}

export interface PendingSync {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

export class AppDatabase extends Dexie {
  todos!: Table<Todo>;
  pendingSync!: Table<PendingSync>;

  constructor() {
    super('AppDatabase');

    this.version(1).stores({
      todos: '++id, text, completed, syncStatus, serverItemId',
      pendingSync: '++id, operation, table, timestamp',
    });
  }
}

export const db = new AppDatabase();
```

### Component with Live Query

```typescript
// components/TodoList.tsx
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Todo } from '@/lib/db';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function TodoList() {
  const { online } = useNetworkStatus();

  // Reactive query — re-renders when IndexedDB changes
  const todos = useLiveQuery(() => db.todos.toArray(), []);

  const pendingCount = useLiveQuery(
    () => db.todos.where('syncStatus').equals('pending').count(),
    []
  );

  async function addTodo(text: string) {
    const newTodo: Todo = {
      text,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    };

    // Add to IndexedDB immediately (optimistic)
    const localId = await db.todos.add(newTodo);

    // Queue for background sync
    await db.pendingSync.add({
      operation: 'create',
      table: 'todos',
      data: { ...newTodo, id: localId },
      timestamp: Date.now(),
      retries: 0,
    });

    // If online, trigger sync immediately
    if (online && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('sync-todos');
      }
    }
  }

  async function toggleTodo(id: number) {
    const todo = await db.todos.get(id);
    if (!todo) return;

    const updated = {
      ...todo,
      completed: !todo.completed,
      updatedAt: Date.now(),
      syncStatus: 'pending' as const,
    };

    await db.todos.update(id, updated);

    await db.pendingSync.add({
      operation: 'update',
      table: 'todos',
      data: updated,
      timestamp: Date.now(),
      retries: 0,
    });

    if (online && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('sync-todos');
      }
    }
  }

  async function deleteTodo(id: number) {
    await db.todos.delete(id);

    await db.pendingSync.add({
      operation: 'delete',
      table: 'todos',
      data: { id },
      timestamp: Date.now(),
      retries: 0,
    });
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync
        </div>
      )}

      <div className="space-y-2">
        {todos?.map((todo) => (
          <div
            key={todo.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              todo.syncStatus === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id!)}
              className="h-4 w-4"
            />
            <span className={todo.completed ? 'line-through text-gray-500' : ''}>
              {todo.text}
            </span>
            {todo.syncStatus === 'pending' && (
              <span className="ml-auto text-xs text-yellow-600">Pending</span>
            )}
            <button
              onClick={() => deleteTodo(todo.id!)}
              className="ml-auto text-red-600 hover:underline text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Background Sync with Service Worker

```javascript
// public/sw-custom.js
// Custom service worker for background sync

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Background Sync for todos
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('pendingSync', 'readonly');
    const store = tx.objectStore('pendingSync');
    const pendingItems = await store.getAll();

    for (const item of pendingItems) {
      try {
        let response;

        if (item.operation === 'create') {
          response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
        } else if (item.operation === 'update') {
          response = await fetch(`/api/todos/${item.data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
        } else if (item.operation === 'delete') {
          response = await fetch(`/api/todos/${item.data.id}`, {
            method: 'DELETE',
          });
        }

        if (response && response.ok) {
          // Remove from pending queue
          const deleteTx = db.transaction('pendingSync', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingSync');
          await deleteStore.delete(item.id);

          // Update syncStatus in todos table
          if (item.operation !== 'delete') {
            const todoTx = db.transaction('todos', 'readwrite');
            const todoStore = todoTx.objectStore('todos');
            const todo = await todoStore.get(item.data.id);
            if (todo) {
              todo.syncStatus = 'synced';
              await todoStore.put(todo);
            }
          }
        } else {
          // Increment retry count
          const retryTx = db.transaction('pendingSync', 'readwrite');
          const retryStore = retryTx.objectStore('pendingSync');
          item.retries += 1;
          await retryStore.put(item);
        }
      } catch (error) {
        console.error('Sync failed for item:', item, error);
      }
    }

    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error; // Rethrow to trigger retry
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AppDatabase', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Offline fallback page
const FALLBACK_HTML_URL = '/offline';

workbox.routing.setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match(FALLBACK_HTML_URL);
  }
  return Response.error();
});
```

### Offline Fallback Page

```typescript
// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Offline</h1>
        <p className="text-gray-600 mb-6">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

---

## 5. Conflict Resolution: Last Write Wins

```typescript
// lib/sync.ts
import { db, Todo } from './db';

export async function syncWithServer() {
  try {
    // Fetch latest from server
    const response = await fetch('/api/todos');
    const serverTodos: (Todo & { id: string })[] = await response.json();

    const localTodos = await db.todos.toArray();

    // Last Write Wins conflict resolution
    for (const serverTodo of serverTodos) {
      const localTodo = localTodos.find((t) => t.serverItemId === serverTodo.id);

      if (!localTodo) {
        // New item from server
        await db.todos.add({
          ...serverTodo,
          serverItemId: serverTodo.id,
          syncStatus: 'synced',
        });
      } else {
        // Conflict: compare timestamps
        if (serverTodo.updatedAt > localTodo.updatedAt) {
          // Server wins
          await db.todos.update(localTodo.id!, {
            ...serverTodo,
            serverItemId: serverTodo.id,
            syncStatus: 'synced',
          });
        } else {
          // Local wins — keep local, queue for upload
          if (localTodo.syncStatus !== 'synced') {
            await db.pendingSync.add({
              operation: 'update',
              table: 'todos',
              data: localTodo,
              timestamp: Date.now(),
              retries: 0,
            });
          }
        }
      }
    }

    // Find deleted items (exist locally but not on server)
    const serverIds = new Set(serverTodos.map((t) => t.id));
    for (const localTodo of localTodos) {
      if (localTodo.serverItemId && !serverIds.has(localTodo.serverItemId)) {
        // Deleted on server
        await db.todos.delete(localTodo.id!);
      }
    }

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
```

---

## 6. Persistent Storage Request

```typescript
// components/PersistentStorageRequest.tsx
'use client';

import { useEffect, useState } from 'react';

export function PersistentStorageRequest() {
  const [persistentGranted, setPersistentGranted] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkPersistence() {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        setPersistentGranted(isPersisted);

        if (!isPersisted) {
          const result = await navigator.storage.persist();
          setPersistentGranted(result);
        }
      }
    }

    checkPersistence();
  }, []);

  if (persistentGranted === true) {
    return null; // Already granted
  }

  if (persistentGranted === false) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p className="text-yellow-800">
          Persistent storage not granted. Your data may be evicted if storage is low.
        </p>
      </div>
    );
  }

  return null;
}
```

---

## Anti-Patterns

### Anti-Pattern 1: Using skipWaiting() Aggressively

**❌ WRONG:**
```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting(); // DANGEROUS: Immediately activates new service worker
});

self.addEventListener('activate', (event) => {
  clients.claim(); // Takes control of all pages immediately
});
```

**Problem:** Users mid-session suddenly experience new behavior — broken UI, cached data cleared, unexpected errors. Extremely poor UX.

**✅ CORRECT:** Let user control updates:
```typescript
// components/ServiceWorkerUpdate.tsx
'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowPrompt(true);
            }
          });
        });
      });
    }
  }, []);

  function handleUpdate() {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowPrompt(false);
    window.location.reload();
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-lg p-4 shadow-lg max-w-sm">
      <p className="font-semibold mb-2">Update Available</p>
      <p className="text-sm mb-4">A new version is ready. Refresh to update?</p>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-gray-100"
      >
        Update Now
      </button>
    </div>
  );
}
```

---

### Anti-Pattern 2: No Conflict Resolution Strategy

**❌ WRONG:**
```typescript
async function sync() {
  // Just overwrite server data with local
  const localTodos = await db.todos.toArray();
  await fetch('/api/todos', {
    method: 'PUT',
    body: JSON.stringify(localTodos),
  });
  // Data loss: server changes overwritten
}
```

**Problem:** Silent data loss. User edits on Device A overwritten by Device B.

**✅ CORRECT:** Implement LWW or manual resolution:
```typescript
async function sync() {
  const response = await fetch('/api/todos');
  const serverTodos = await response.json();
  const localTodos = await db.todos.toArray();

  for (const serverTodo of serverTodos) {
    const localTodo = localTodos.find((t) => t.serverItemId === serverTodo.id);

    if (localTodo && serverTodo.updatedAt !== localTodo.updatedAt) {
      // CONFLICT DETECTED
      if (serverTodo.updatedAt > localTodo.updatedAt) {
        // Server wins
        await db.todos.update(localTodo.id!, serverTodo);
      } else {
        // Local wins — upload to server
        await fetch(`/api/todos/${serverTodo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(localTodo),
        });
      }
    }
  }
}
```

---

### Anti-Pattern 3: Caching API Routes

**❌ WRONG:**
```javascript
// next.config.mjs
runtimeCaching: [
  {
    urlPattern: /\/api\/.*/i,
    handler: 'CacheFirst', // WRONG: Stale API responses cached forever
  },
];
```

**Problem:** User sees outdated data. Cache never refreshes until manually cleared.

**✅ CORRECT:** Exclude API routes from caching:
```javascript
runtimeCaching: [
  {
    urlPattern: ({ url }) => {
      const isSameOrigin = self.origin === url.origin;
      if (!isSameOrigin) return false;
      const pathname = url.pathname;
      if (pathname.startsWith('/api/')) return false; // EXCLUDE APIs
      return true;
    },
    handler: 'NetworkFirst',
  },
];
```

---

### Anti-Pattern 4: No Offline Feedback

**❌ WRONG:**
```typescript
async function saveTodo(text: string) {
  await fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  // Silently fails offline — user doesn't know
}
```

**Problem:** User thinks action succeeded. Data lost. Frustration.

**✅ CORRECT:** Show offline status and queue:
```typescript
async function saveTodo(text: string) {
  if (!navigator.onLine) {
    // Store locally
    await db.todos.add({ text, syncStatus: 'pending', createdAt: Date.now() });

    // Show feedback
    toast.info('Saved locally. Will sync when online.');

    // Queue for background sync
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-todos');
    return;
  }

  // Online — save directly
  await fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}
```

---

### Anti-Pattern 5: Trusting navigator.onLine Alone

**❌ WRONG:**
```typescript
if (navigator.onLine) {
  await fetch('/api/todos'); // Assumes internet works
}
```

**Problem:** `navigator.onLine` only checks **network connection**, not **internet access**. Captive portals, DNS issues, flaky Wi-Fi all report "online".

**✅ CORRECT:** Ping endpoint to verify:
```typescript
async function checkRealConnectivity(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

if (await checkRealConnectivity()) {
  await fetch('/api/todos');
}
```

---

## Testing Checklist

- [ ] **Offline functionality**
  - [ ] App loads and displays cached data when offline
  - [ ] Core features work without network
  - [ ] Offline badge displays when connection lost
  - [ ] Actions queue correctly in IndexedDB

- [ ] **Sync behavior**
  - [ ] Background Sync triggers when connection restored
  - [ ] Pending changes sync to server successfully
  - [ ] Sync status indicators update correctly
  - [ ] Failed syncs retry with exponential backoff

- [ ] **Conflict resolution**
  - [ ] LWW correctly resolves conflicts (newest wins)
  - [ ] No silent data loss on conflict
  - [ ] Manual resolution UI works (if implemented)

- [ ] **Service Worker lifecycle**
  - [ ] New service worker waits before activating
  - [ ] Update prompt shown to user
  - [ ] Refresh after update works correctly
  - [ ] No mid-session disruptions

- [ ] **Storage**
  - [ ] Persistent storage requested
  - [ ] IndexedDB quota checked
  - [ ] Storage eviction warning shown if low space

---

## Security Checklist

- [ ] **Validate before sync**
  - [ ] Server validates all synced data (never trust client)
  - [ ] Authentication required for sync endpoints
  - [ ] RLS policies enforced on synced data

- [ ] **Prevent data leakage**
  - [ ] IndexedDB isolated by origin
  - [ ] Sensitive data encrypted at rest (if needed)
  - [ ] Cache only public assets (never auth tokens)

- [ ] **Service Worker security**
  - [ ] Service Worker served over HTTPS
  - [ ] No credentials cached in service worker
  - [ ] CSP headers allow service worker registration

---

## Integration Notes

**Works well with:**
- **optimistic-updates.md** — Instant UI feedback while queuing for sync
- **data-fetching.md** — TanStack Query cache + IndexedDB for offline
- **security.md** — Validate synced data server-side

**Dependencies:**
- Depends on `optimistic-updates.md` for rollback patterns
- Depends on `data-fetching.md` for server sync integration

---

## References

1. [MDN: Making PWAs Installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
2. [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
3. [Workbox Strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)
4. [Dexie.js Documentation](https://dexie.org/)
5. [Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
6. [Service Worker Lifecycle](https://web.dev/articles/service-worker-lifecycle)

---

## Version History

- **v1.0** (2025-01-15): Initial offline-first pattern covering PWA setup, Service Workers, IndexedDB with Dexie.js, Background Sync API, conflict resolution (LWW), network detection, persistent storage, offline fallback pages
