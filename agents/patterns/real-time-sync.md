---
triggers:
  - "real-time updates"
  - "WebSocket"
  - "live data"
  - "Supabase Realtime"
  - "collaborative editing"
  - "multiplayer"
  - "presence"
  - "broadcast"
  - "live cursor"
  - "sync data"

depends_on:
  - data-fetching.md (TanStack Query integration)
  - optimistic-updates.md (instant feedback before sync)

prerequisites:
  - Next.js App Router
  - React 18+
  - TypeScript
  - Supabase with Realtime enabled
  - TanStack Query
  - Understanding of WebSockets

description: |
  Production-ready real-time synchronization covering: Supabase Realtime (Broadcast, Presence, Postgres Changes),
  WebSockets vs polling decision matrix, conflict resolution strategies, multiplayer cursors, collaborative editing,
  connection state management, reconnection logic, and performance optimization.
---

# Real-Time Sync Pattern

## Research Foundation

**Searches performed:**
1. Supabase Realtime WebSockets React hooks best practices 2024
2. Polling vs WebSockets when to use real-time sync 2024
3. Conflict resolution real-time collaborative editing CRDT 2024
4. Supabase Realtime Presence multiplayer cursors React 2024

**Key findings:**
- **Supabase Realtime has 3 features:** Broadcast (ephemeral messages), Presence (shared state), Postgres Changes (DB events)
- **WebSockets vs Polling:** WebSockets for <100ms latency, polling for infrequent updates or legacy support
- **WebSockets are now standard (2024)** — "definitively superseded" long polling for real-time apps
- **CRDTs (Conflict-free Replicated Data Types)** — merge concurrent edits without coordination, guarantee eventual consistency
- **Supabase Realtime does NOT guarantee delivery** — design for occasional message loss
- **RLS must be enabled** — Realtime only works on tables with Row Level Security
- **Provider pattern essential** — single Supabase client prevents multiple socket connections
- **perfect-cursors library** — smooth interpolation for multiplayer cursors (handles 50-80ms update intervals)

---

## When to Use Real-Time Sync

### WebSockets vs Polling Decision Matrix

| Use Case | Recommendation | Latency Requirement |
|----------|----------------|---------------------|
| Chat, messaging | **WebSockets** | <100ms |
| Collaborative editing | **WebSockets** | <50ms |
| Multiplayer games | **WebSockets** | <50ms |
| Live dashboards | **WebSockets** | <500ms |
| Notifications | **WebSockets or Polling** | <2s |
| Stock prices | **WebSockets** | <100ms |
| Social feed updates | **Polling** | <10s |
| Email inbox | **Polling** | <30s |

**Rule of thumb:**
- **<1 second latency needed:** WebSockets
- **1-30 second latency acceptable:** Polling (simpler, more reliable)
- **>30 seconds:** Polling or manual refresh

---

## 1. Supabase Realtime Setup

### Enable Realtime on Database

```sql
-- Enable replication for table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Enable RLS (required for Realtime)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own messages in real-time
CREATE POLICY "Users read own messages realtime"
  ON messages FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

### Provider Pattern (Single Client)

```typescript
// lib/supabase/client.tsx
'use client';

import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

const SupabaseContext = createContext<ReturnType<typeof createClient> | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      supabase.removeAllChannels();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}
```

```typescript
// app/layout.tsx
import { SupabaseProvider } from '@/lib/supabase/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
```

---

## 2. Postgres Changes (Database Events)

Listen to INSERT, UPDATE, DELETE events on database tables.

```typescript
// hooks/useRealtimeMessages.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

export function useRealtimeMessages(channelId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Add new message to cache
          queryClient.setQueryData<Message[]>(
            ['messages', channelId],
            (old) => [...(old || []), payload.new as Message]
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Update message in cache
          queryClient.setQueryData<Message[]>(
            ['messages', channelId],
            (old) =>
              old?.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              ) || []
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Remove message from cache
          queryClient.setQueryData<Message[]>(
            ['messages', channelId],
            (old) => old?.filter((msg) => msg.id !== payload.old.id) || []
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId, queryClient]);
}
```

```typescript
// components/ChatMessages.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';

export function ChatMessages({ channelId }: { channelId: string }) {
  const { data: messages } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?channelId=${channelId}`);
      return res.json();
    },
  });

  // Subscribe to real-time updates
  useRealtimeMessages(channelId);

  return (
    <div className="space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="border-b pb-4">
          <p>{message.content}</p>
          <span className="text-xs text-gray-500">{message.created_at}</span>
        </div>
      ))}
    </div>
  );
}
```

**Key points:**
- **TanStack Query cache updated directly** — no refetch needed
- **Filter by channel_id** — only receive relevant messages
- **All CRUD operations covered** — INSERT, UPDATE, DELETE
- **Cleanup on unmount** — `removeChannel()` prevents memory leaks

---

## 3. Broadcast (Ephemeral Messages)

Send temporary messages that don't persist in database (e.g., typing indicators, cursor positions).

```typescript
// hooks/useTypingIndicator.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';

interface TypingUser {
  userId: string;
  username: string;
}

export function useTypingIndicator(channelId: string) {
  const supabase = useSupabase();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${channelId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const user = payload.payload as TypingUser;

        // Add user to typing list
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === user.userId)) return prev;
          return [...prev, user];
        });

        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== user.userId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId]);

  function broadcastTyping(userId: string, username: string) {
    supabase
      .channel(`typing:${channelId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, username },
      });
  }

  return { typingUsers, broadcastTyping };
}
```

```typescript
// components/ChatInput.tsx
'use client';

import { useState } from 'react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

export function ChatInput({ channelId, userId, username }: {
  channelId: string;
  userId: string;
  username: string;
}) {
  const [message, setMessage] = useState('');
  const { typingUsers, broadcastTyping } = useTypingIndicator(channelId);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value);

    // Broadcast typing indicator
    if (e.target.value) {
      broadcastTyping(userId, username);
    }
  }

  return (
    <div>
      {typingUsers.length > 0 && (
        <p className="text-sm text-gray-500">
          {typingUsers.map((u) => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </p>
      )}
      <input
        type="text"
        value={message}
        onChange={handleChange}
        placeholder="Type a message..."
        className="w-full rounded border p-2"
      />
    </div>
  );
}
```

---

## 4. Presence (Shared State)

Track online users, cursor positions, selected items, etc.

### Online Users Presence

```typescript
// hooks/useOnlineUsers.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';

interface OnlineUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  presence_ref: string;
}

export function useOnlineUsers(channelId: string, currentUser: { id: string; username: string }) {
  const supabase = useSupabase();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`presence:${channelId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as OnlineUser[];
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Users joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await channel.track({
            userId: currentUser.id,
            username: currentUser.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId, currentUser.id, currentUser.username]);

  return onlineUsers;
}
```

```typescript
// components/OnlineUsersList.tsx
'use client';

import { useOnlineUsers } from '@/hooks/useOnlineUsers';

export function OnlineUsersList({
  channelId,
  currentUser
}: {
  channelId: string;
  currentUser: { id: string; username: string };
}) {
  const onlineUsers = useOnlineUsers(channelId, currentUser);

  return (
    <div className="border rounded p-4">
      <h3 className="font-semibold mb-2">Online ({onlineUsers.length})</h3>
      <ul className="space-y-2">
        {onlineUsers.map((user) => (
          <li key={user.presence_ref} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Multiplayer Cursors

```typescript
// hooks/useMultiplayerCursors.ts
import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/client';

interface Cursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

export function useMultiplayerCursors(
  channelId: string,
  currentUser: { id: string; username: string; color: string }
) {
  const supabase = useSupabase();
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  useEffect(() => {
    const channel = supabase.channel(`cursors:${channelId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cursorMap: Record<string, Cursor> = {};

        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== currentUser.id) {
            const presence = presences[0] as Cursor;
            cursorMap[userId] = presence;
          }
        });

        setCursors(cursorMap);
      })
      .subscribe();

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId, currentUser.id]);

  const updateCursor = useCallback(
    (x: number, y: number) => {
      const channel = supabase.channel(`cursors:${channelId}`);
      channel.track({
        userId: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        x,
        y,
      });
    },
    [supabase, channelId, currentUser]
  );

  return { cursors, updateCursor };
}
```

```typescript
// components/CollaborativeCanvas.tsx
'use client';

import { useMultiplayerCursors } from '@/hooks/useMultiplayerCursors';
import { throttle } from '@/utils/throttle';
import { useCallback } from 'react';

export function CollaborativeCanvas({
  channelId,
  currentUser
}: {
  channelId: string;
  currentUser: { id: string; username: string; color: string };
}) {
  const { cursors, updateCursor } = useMultiplayerCursors(channelId, currentUser);

  // Throttle cursor updates to avoid overwhelming WebSocket
  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateCursor(x, y);
    }, 50), // Update every 50ms
    [updateCursor]
  );

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative h-screen w-full bg-gray-50"
    >
      {/* Render other users' cursors */}
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color}>
            <path d="M5.65376 12.3673L10.6487 8.3377L11.7358 12.2347L14.6268 14.3333L5.65376 12.3673Z" />
          </svg>
          <span
            className="ml-2 rounded bg-black px-2 py-1 text-xs text-white"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Key points:**
- **Throttle cursor updates** — 50ms interval prevents WebSocket spam
- **Exclude own cursor** — only show other users' cursors
- **Color-coded cursors** — each user has unique color
- **Username labels** — identify who's who

---

## 5. Connection State Management

```typescript
// hooks/useRealtimeConnection.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export function useRealtimeConnection(channelName: string) {
  const supabase = useSupabase();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel.subscribe((status, err) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setStatus('connected');
        setError(null);
      } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
        setStatus('error');
        setError(err?.message || 'Connection error');
      } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        setStatus('error');
        setError('Connection timed out');
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        setStatus('disconnected');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelName]);

  return { status, error };
}
```

```typescript
// components/ConnectionIndicator.tsx
'use client';

import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';

export function ConnectionIndicator({ channelName }: { channelName: string }) {
  const { status, error } = useRealtimeConnection(channelName);

  const statusConfig = {
    connected: { bg: 'bg-green-500', text: 'Connected' },
    connecting: { bg: 'bg-yellow-500', text: 'Connecting...' },
    disconnected: { bg: 'bg-gray-500', text: 'Disconnected' },
    error: { bg: 'bg-red-500', text: 'Connection Error' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
      <div className={`h-2 w-2 rounded-full ${config.bg}`} />
      <span className="text-sm font-medium">{config.text}</span>
      {error && <span className="text-xs text-red-600">({error})</span>}
    </div>
  );
}
```

---

## 6. Conflict Resolution Strategies

### Last Write Wins (Simplest)

```typescript
// Server Action
'use server';

export async function updateDocument(id: string, content: string, version: number) {
  const supabase = await createClient();

  // Check current version
  const { data: current } = await supabase
    .from('documents')
    .select('version')
    .eq('id', id)
    .single();

  if (!current || current.version !== version) {
    return { error: 'Document was modified by another user. Please refresh.' };
  }

  // Update with incremented version
  const { error } = await supabase
    .from('documents')
    .update({
      content,
      version: version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

### Operational Transform (OT) - For Rich Text

```typescript
// Simplified OT example (production apps use libraries like ShareDB)
interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  text?: string;
  length?: number;
}

function transformOperations(op1: Operation, op2: Operation): Operation {
  // If both insert at same position, prioritize op1
  if (op1.type === 'insert' && op2.type === 'insert' && op1.position === op2.position) {
    return { ...op2, position: op2.position + (op1.text?.length || 0) };
  }

  // If op1 inserts before op2's position, adjust op2's position
  if (op1.type === 'insert' && op2.position > op1.position) {
    return { ...op2, position: op2.position + (op1.text?.length || 0) };
  }

  // If op1 deletes before op2's position, adjust op2's position
  if (op1.type === 'delete' && op2.position > op1.position) {
    return { ...op2, position: op2.position - (op1.length || 0) };
  }

  return op2;
}
```

**For production collaborative editing, use:**
- **Yjs** (CRDT-based, most popular)
- **ShareDB** (OT-based)
- **Automerge** (CRDT-based)

---

## Anti-Patterns

### Anti-Pattern 1: Multiple Supabase Clients

**❌ WRONG:**
```typescript
function Component1() {
  const supabase = createClient(...); // New client
  // Subscribe to channel
}

function Component2() {
  const supabase = createClient(...); // Another new client
  // Subscribe to channel
}
```

**Problem:** Multiple WebSocket connections (waste of resources, unpredictable behavior).

**✅ CORRECT:**
Use Provider pattern (see Setup section above).

---

### Anti-Pattern 2: Not Cleaning Up Subscriptions

**❌ WRONG:**
```typescript
useEffect(() => {
  const channel = supabase.channel('messages');
  channel.subscribe();
  // No cleanup!
}, []);
```

**Problem:** Memory leak, WebSocket connections never close.

**✅ CORRECT:**
```typescript
useEffect(() => {
  const channel = supabase.channel('messages');
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

### Anti-Pattern 3: Not Throttling High-Frequency Updates

**❌ WRONG:**
```typescript
<div onMouseMove={(e) => {
  // Sends ~60 messages per second!
  updateCursor(e.clientX, e.clientY);
}}>
```

**Problem:** Overwhelms WebSocket, causes lag, increases bandwidth.

**✅ CORRECT:**
```typescript
const updateCursorThrottled = throttle(updateCursor, 50); // Max 20 updates/second

<div onMouseMove={(e) => {
  updateCursorThrottled(e.clientX, e.clientY);
}}>
```

---

### Anti-Pattern 4: Assuming Guaranteed Delivery

**❌ WRONG:**
```typescript
// Send critical data via Broadcast
channel.send({
  type: 'broadcast',
  event: 'payment',
  payload: { amount: 100, userId: '123' },
});
// Assume it was received
```

**Problem:** Supabase Realtime does NOT guarantee delivery. Critical data may be lost.

**✅ CORRECT:**
```typescript
// Store critical data in database
await supabase.from('payments').insert({ amount: 100, user_id: userId });

// Use Realtime only for notifications
channel.send({
  type: 'broadcast',
  event: 'payment_notification',
  payload: { message: 'Payment received!' },
});
```

---

### Anti-Pattern 5: No Fallback for Connection Loss

**❌ WRONG:**
```typescript
// User disconnects, app breaks
useRealtimeMessages(channelId);
```

**Problem:** No indication of connection loss, no recovery strategy.

**✅ CORRECT:**
```typescript
const { status } = useRealtimeConnection(channelId);
useRealtimeMessages(channelId);

// Show UI when disconnected
{status === 'disconnected' && (
  <div className="bg-yellow-100 p-4 rounded">
    Connection lost. Attempting to reconnect...
  </div>
)}

// Refetch data when reconnected
useEffect(() => {
  if (status === 'connected') {
    queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
  }
}, [status]);
```

---

## Testing Checklist

- [ ] **Real-time updates work**
  - [ ] INSERT events add items to UI instantly
  - [ ] UPDATE events modify items in UI
  - [ ] DELETE events remove items from UI

- [ ] **Connection states handled**
  - [ ] Connecting indicator shows during initial connection
  - [ ] Connected indicator shows when subscribed
  - [ ] Disconnected indicator shows when connection lost
  - [ ] Error messages displayed for connection errors

- [ ] **Presence tracking works**
  - [ ] Online users list updates when users join/leave
  - [ ] Cursor positions update smoothly (if implemented)
  - [ ] No duplicate entries in presence list

- [ ] **Broadcast messages received**
  - [ ] Typing indicators appear/disappear correctly
  - [ ] Ephemeral messages don't persist after refresh

- [ ] **Cleanup prevents leaks**
  - [ ] Channels removed on component unmount
  - [ ] No lingering WebSocket connections
  - [ ] Memory usage stable over time

---

## Performance Checklist

- [ ] **High-frequency updates throttled**
  - [ ] Cursor updates: max 20/second (50ms interval)
  - [ ] Typing indicators: debounced 300ms
  - [ ] Scroll position: throttled 100ms

- [ ] **TanStack Query integration**
  - [ ] Cache updated directly (no refetch)
  - [ ] Optimistic updates for instant feedback
  - [ ] Invalidation only when necessary

- [ ] **Single Supabase client**
  - [ ] Provider pattern used
  - [ ] No multiple client instances
  - [ ] Shared across all components

---

## Security Checklist

- [ ] **RLS policies configured**
  - [ ] Realtime only works with RLS enabled
  - [ ] Users can only access their own data
  - [ ] Policies tested with different user accounts

- [ ] **Broadcast messages don't contain secrets**
  - [ ] No API keys, tokens, passwords in Broadcast
  - [ ] User IDs only (no sensitive user data)
  - [ ] Validate all Broadcast payloads

- [ ] **Connection authenticated**
  - [ ] Supabase Auth used for connections
  - [ ] Anonymous connections restricted
  - [ ] User identity verified before tracking presence

---

## Integration Notes

**Works well with:**
- **data-fetching.md** — TanStack Query cache updated from Realtime events
- **optimistic-updates.md** — Instant feedback before real-time sync confirms
- **forms.md** — Real-time form collaboration (multiple users editing)

**Potential conflicts:**
- **offline-first.md** — Need strategy for syncing offline changes when reconnected

**Dependencies:**
- Depends on `data-fetching.md` for TanStack Query integration
- Depends on `optimistic-updates.md` for instant feedback patterns

---

## References

1. [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
2. [Supabase Realtime Protocol](https://supabase.com/docs/guides/realtime/protocol)
3. [WebSockets vs Long Polling (2024)](https://ably.com/blog/websockets-vs-long-polling)
4. [CRDTs Explained](https://crdt.tech/)
5. [Yjs - CRDT Framework](https://docs.yjs.dev/)
6. [perfect-cursors Library](https://github.com/steveruizok/perfect-cursors)
7. [Supabase Realtime Multiplayer](https://supabase.com/blog/supabase-realtime-multiplayer-general-availability)

---

## Version History

- **v1.0** (2024-01-15): Initial real-time sync pattern covering Supabase Realtime (Broadcast, Presence, Postgres Changes), WebSockets vs polling, conflict resolution, multiplayer cursors, connection management
