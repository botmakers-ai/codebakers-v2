---
name: Optimistic Updates Pattern
tier: patterns
triggers: optimistic update, instant feedback, rollback, onMutate, onError, TanStack Query mutation
depends_on: agents/patterns/data-fetching.md
conflicts_with: null
prerequisites: "TanStack Query installed, mutations configured"
description: Complete optimistic updates pattern using TanStack Query onMutate/onError for instant UI feedback, rollback strategies, conflict resolution, visual distinction of optimistic vs confirmed states, and guidelines for which actions should never be optimistic
---

# Pattern: Optimistic Updates

## What This Pattern Covers

This pattern covers optimistic UI updates using TanStack Query's `useMutation` with `onMutate`, `onError`, and `onSettled` handlers. It addresses instant feedback for user actions, automatic rollback on failure, conflict resolution when server state differs, visual distinction between optimistic and confirmed states, and critical guidelines for which actions should never be optimistic (payments, emails, account creation).

Use this pattern when user actions have high success rates and instant feedback improves perceived performance.

---

## When to Use This Pattern

- **Archive/delete actions** (emails, messages, items) where failure is rare
- **Mark as read/unread** or **star/favorite** toggles
- **Like/upvote buttons** and other binary social actions
- **Move items between lists** (Kanban boards, folder organization)
- **Update simple text fields** (rename, edit description)
- **Toggle settings** (enable/disable features, preferences)
- **Add items to cart** or **save for later** actions
- **Client-side only changes** that don't need server confirmation first

---

## When NOT to Use This Pattern

- **Payment processing** (never show "Payment successful" until server confirms)
- **Send email/SMS** (never show "Message sent" until server confirms delivery)
- **Create account** or **delete account** (consequences too severe if rolled back)
- **Legal/compliance actions** (signatures, contracts, agreements)
- **Irreversible actions** (permanently delete, publish to public, deploy to production)
- **Multi-step transactions** where rollback causes cascading failures
- **Actions with >10% failure rate** (optimistic updates feel broken with frequent rollbacks)
- **Financial transfers** (wire, ACH, crypto) — always wait for confirmation
- **Identity verification** or **authentication actions**

---

## Architecture Overview

Optimistic updates follow a 3-phase pattern:

### Phase 1: Optimistic Update (onMutate)

```
User clicks "Archive" button
  ↓
onMutate fires BEFORE server request
  ↓
1. Cancel ongoing queries (prevent race conditions)
2. Snapshot current state (for rollback)
3. Update cache optimistically
4. Return context { previousState }
  ↓
UI updates instantly (no loading spinner)
```

### Phase 2: Server Request

```
Mutation sends request to server
  ↓
Server processes (1-500ms)
```

### Phase 3a: Success (onSettled)

```
Server confirms success
  ↓
onSettled fires
  ↓
Invalidate query (refetch latest data)
  ↓
UI confirms optimistic update was correct
```

### Phase 3b: Failure (onError)

```
Server rejects request
  ↓
onError fires with context { previousState }
  ↓
Rollback cache to previousState
  ↓
Show inline error message
  ↓
UI reverts to original state
```

---

## Implementation

### Step 1: Basic Optimistic Update — Archive Email

Delete/archive action with instant UI feedback and automatic rollback on error.

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Email {
  id: string;
  subject: string;
  archived: boolean;
}

async function archiveEmail(id: string): Promise<void> {
  const res = await fetch(`/api/emails/${id}/archive`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to archive email');
}

export function EmailItem({ email }: { email: Email }) {
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: archiveEmail,

    // PHASE 1: Optimistic Update
    onMutate: async (emailId) => {
      // Clear any previous success/error messages
      setResult(null);

      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['emails'] });

      // Snapshot current state for rollback
      const previousEmails = queryClient.getQueryData<Email[]>(['emails']);

      // Optimistically update cache
      queryClient.setQueryData<Email[]>(['emails'], (old) =>
        old ? old.filter((e) => e.id !== emailId) : []
      );

      // Return context for onError
      return { previousEmails };
    },

    // PHASE 3b: Rollback on Error
    onError: (error, emailId, context) => {
      // Revert cache to snapshot
      if (context?.previousEmails) {
        queryClient.setQueryData(['emails'], context.previousEmails);
      }

      // Show inline error (not toast)
      setResult({ error: `Failed to archive: ${error.message}` });
    },

    // PHASE 3a: Refetch on Success
    onSettled: () => {
      // Always refetch to sync with server truth
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },

    onSuccess: () => {
      // Show inline success feedback
      setResult({ success: 'Email archived' });
      setTimeout(() => setResult(null), 3000); // Clear after 3s
    },
  });

  return (
    <div className="p-4 border-b">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{email.subject}</p>
        </div>
        <button
          onClick={() => archiveMutation.mutate(email.id)}
          disabled={archiveMutation.isPending}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
        </button>
      </div>

      {/* Inline feedback (not toast) */}
      {result?.success && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
          {result.success}
        </div>
      )}
      {result?.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded">
          {result.error}
          <button
            onClick={() => archiveMutation.mutate(email.id)}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Optimistic Update with Visual Distinction

Show optimistic state differently from confirmed state (opacity, icon, pending label).

```typescript
'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

async function toggleTodo(id: string): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle todo');
  return res.json();
}

export function TodoList() {
  const queryClient = useQueryClient();

  const { data: todos } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch('/api/todos');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleTodo,

    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically toggle
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old
          ? old.map((todo) =>
              todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
            )
          : []
      );

      return { previousTodos };
    },

    onError: (error, todoId, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      console.error('Toggle failed:', error);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  if (!todos) return <div>Loading...</div>;

  return (
    <ul className="divide-y">
      {todos.map((todo) => {
        const isPending = toggleMutation.isPending && toggleMutation.variables === todo.id;

        return (
          <li
            key={todo.id}
            className={`p-4 flex items-center gap-3 ${
              isPending ? 'opacity-50' : 'opacity-100'
            } transition-opacity`}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleMutation.mutate(todo.id)}
              disabled={isPending}
              className="w-5 h-5"
            />
            <span className={todo.completed ? 'line-through text-gray-500' : ''}>
              {todo.text}
            </span>
            {isPending && (
              <span className="ml-auto text-xs text-gray-500 italic">
                Saving...
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

### Step 3: Optimistic Update with Conflict Resolution

Handle case where server state differs from optimistic update (version conflict).

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Document {
  id: string;
  content: string;
  version: number; // Server tracks version for conflict detection
  updated_at: string;
}

interface UpdateDocumentRequest {
  id: string;
  content: string;
  version: number; // Client sends version it's updating from
}

interface UpdateDocumentResponse {
  document?: Document;
  conflict?: {
    serverVersion: number;
    serverContent: string;
    message: string;
  };
}

async function updateDocument(req: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
  const res = await fetch(`/api/documents/${req.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: req.content, version: req.version }),
  });

  if (!res.ok) throw new Error('Failed to update document');
  return res.json();
}

export function DocumentEditor({ document }: { document: Document }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: updateDocument,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['document', variables.id] });

      const previousDocument = queryClient.getQueryData<Document>(['document', variables.id]);

      // Optimistically update
      queryClient.setQueryData<Document>(['document', variables.id], (old) =>
        old
          ? { ...old, content: variables.content, updated_at: new Date().toISOString() }
          : old
      );

      return { previousDocument };
    },

    onSuccess: (data, variables, context) => {
      if (data.conflict) {
        // Version conflict — server has newer version
        console.warn('Version conflict detected:', data.conflict.message);

        // Rollback optimistic update
        if (context?.previousDocument) {
          queryClient.setQueryData(['document', variables.id], context.previousDocument);
        }

        // Show conflict resolution UI
        alert(
          `Conflict: Document was updated by another user. Server version: ${data.conflict.serverVersion}. Your changes: "${variables.content}". Server content: "${data.conflict.serverContent}". Please refresh and try again.`
        );
      } else if (data.document) {
        // Success — update with server response (includes new version number)
        queryClient.setQueryData(['document', variables.id], data.document);
      }
    },

    onError: (error, variables, context) => {
      if (context?.previousDocument) {
        queryClient.setQueryData(['document', variables.id], context.previousDocument);
      }
      console.error('Update failed:', error);
    },
  });

  function handleSave(newContent: string) {
    updateMutation.mutate({
      id: document.id,
      content: newContent,
      version: document.version, // Send current version
    });
  }

  return (
    <div>
      <textarea
        defaultValue={document.content}
        onBlur={(e) => handleSave(e.target.value)}
        className="w-full p-4 border rounded"
        rows={10}
      />
      {updateMutation.isPending && (
        <p className="text-sm text-gray-500 mt-2">Saving...</p>
      )}
      {updateMutation.isError && (
        <p className="text-sm text-red-600 mt-2">Failed to save. Try again.</p>
      )}
    </div>
  );
}
```

### Step 4: Optimistic Update with Undo Option

Allow user to manually undo optimistic action within 3-second window.

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface Email {
  id: string;
  subject: string;
}

async function deleteEmail(id: string): Promise<void> {
  const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete email');
}

export function EmailWithUndo({ email }: { email: Email }) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteEmail,

    onMutate: async (emailId) => {
      await queryClient.cancelQueries({ queryKey: ['emails'] });

      const previousEmails = queryClient.getQueryData<Email[]>(['emails']);

      // Optimistically remove from list
      queryClient.setQueryData<Email[]>(['emails'], (old) =>
        old ? old.filter((e) => e.id !== emailId) : []
      );

      // Show undo UI for 3 seconds
      setPendingDelete(true);

      return { previousEmails };
    },

    onError: (error, emailId, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(['emails'], context.previousEmails);
      }
      setPendingDelete(false);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setPendingDelete(false);
    },
  });

  // Auto-confirm delete after 3 seconds
  useEffect(() => {
    if (pendingDelete) {
      const timer = setTimeout(() => {
        setPendingDelete(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [pendingDelete]);

  function handleUndo() {
    // Cancel the mutation before it completes
    deleteMutation.reset();

    // Restore from snapshot
    const context = deleteMutation.context;
    if (context?.previousEmails) {
      queryClient.setQueryData(['emails'], context.previousEmails);
    }

    setPendingDelete(false);
  }

  if (pendingDelete) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 flex justify-between items-center">
        <span className="text-sm text-yellow-800">Email deleted</span>
        <button
          onClick={handleUndo}
          className="text-sm text-yellow-600 underline hover:text-yellow-800"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-b">
      <div className="flex justify-between items-start">
        <p>{email.subject}</p>
        <button
          onClick={() => deleteMutation.mutate(email.id)}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

### Step 5: Non-Optimistic Action (Payment) with Loading State

Example of what NOT to make optimistic — payment processing.

```typescript
'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

interface ProcessPaymentRequest {
  amount: number;
  currency: string;
  cardToken: string;
}

interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

async function processPayment(req: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) throw new Error('Payment failed');
  return res.json();
}

export function PaymentForm({ amount }: { amount: number }) {
  const [cardToken, setCardToken] = useState('');
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  const paymentMutation = useMutation({
    mutationFn: processPayment,

    // NO onMutate — do not update UI before server confirms
    // Payments are NEVER optimistic

    onSuccess: (data) => {
      if (data.success) {
        setResult({
          success: `Payment successful! Transaction ID: ${data.transactionId}`,
        });
      } else {
        setResult({ error: data.error || 'Payment failed' });
      }
    },

    onError: (error) => {
      setResult({ error: `Payment failed: ${error.message}` });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    paymentMutation.mutate({
      amount,
      currency: 'USD',
      cardToken,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Card Number</label>
        <input
          type="text"
          value={cardToken}
          onChange={(e) => setCardToken(e.target.value)}
          placeholder="4242 4242 4242 4242"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={paymentMutation.isPending}
        className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {paymentMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing payment...
          </span>
        ) : (
          `Pay $${amount}`
        )}
      </button>

      {/* Show result ONLY after server confirms */}
      {result?.success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded">
          {result.success}
        </div>
      )}
      {result?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded">
          {result.error}
        </div>
      )}
    </form>
  );
}
```

---

## Integration With Other Patterns

**This pattern works with:**
- **data-fetching.md** — TanStack Query manages cache and provides onMutate/onError hooks
- **pagination.md** — Optimistic updates work with paginated lists
- **infinite-scroll.md** — Optimistic updates work with infinite scroll lists

**This pattern conflicts with:**
- N/A — Compatible with most patterns

---

## Error Handling

### 1. Network Failure During Mutation

```typescript
const mutation = useMutation({
  mutationFn: archiveEmail,
  onMutate: /* ... */,
  onError: (error, variables, context) => {
    // Rollback optimistic update
    if (context?.previousData) {
      queryClient.setQueryData(['emails'], context.previousData);
    }

    // Show user-friendly error
    if (error.message.includes('Failed to fetch')) {
      alert('Network error. Please check your connection and try again.');
    } else {
      alert(`Error: ${error.message}`);
    }
  },
  retry: 2, // Retry failed requests twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### 2. Version Conflict (Optimistic Concurrency Control)

```typescript
// API route
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { content, version } = await request.json();

  const { data: document } = await supabase
    .from('documents')
    .select('version')
    .eq('id', params.id)
    .single();

  if (document.version !== version) {
    // Version mismatch — return conflict
    return NextResponse.json({
      conflict: {
        serverVersion: document.version,
        message: 'Document was updated by another user',
      },
    }, { status: 409 });
  }

  // Version matches — proceed with update
  const { data: updated } = await supabase
    .from('documents')
    .update({ content, version: version + 1, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  return NextResponse.json({ document: updated });
}
```

### 3. Partial Failure (Some Items Succeed, Some Fail)

```typescript
// Batch delete with partial rollback
const deleteMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/emails/${id}`, { method: 'DELETE' }))
    );

    const failed = results
      .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
      .filter(Boolean);

    return { failed };
  },

  onMutate: async (ids) => {
    await queryClient.cancelQueries({ queryKey: ['emails'] });
    const previousEmails = queryClient.getQueryData<Email[]>(['emails']);

    // Optimistically remove all
    queryClient.setQueryData<Email[]>(['emails'], (old) =>
      old ? old.filter((e) => !ids.includes(e.id)) : []
    );

    return { previousEmails, ids };
  },

  onSuccess: (data, ids, context) => {
    if (data.failed.length > 0) {
      // Partial failure — restore failed items
      const previousEmails = context?.previousEmails || [];
      const restoredEmails = previousEmails.filter((e) => data.failed.includes(e.id));

      queryClient.setQueryData<Email[]>(['emails'], (old) =>
        old ? [...old, ...restoredEmails] : restoredEmails
      );

      alert(`${data.failed.length} items failed to delete`);
    }
  },

  onError: (error, ids, context) => {
    // Full rollback
    if (context?.previousEmails) {
      queryClient.setQueryData(['emails'], context.previousEmails);
    }
  },
});
```

---

## Testing Checklist

- [ ] **Optimistic update shows instantly** (no loading spinner for user feedback)
- [ ] **Rollback works** when mutation fails (UI reverts to previous state)
- [ ] **Concurrent requests don't overwrite** (cancelQueries prevents race conditions)
- [ ] **Visual distinction clear** between optimistic and confirmed states (opacity, icon, label)
- [ ] **Error message shows inline** (not toast) with retry option
- [ ] **Undo option works** (if implemented) within 3-second window
- [ ] **Version conflicts detected** and handled gracefully
- [ ] **Partial failures handled** (batch operations restore only failed items)
- [ ] **Network errors handled** with user-friendly messages
- [ ] **Mutations invalidate correct queries** after success (refetch latest data)
- [ ] **Non-optimistic actions never show success early** (payments, emails, account creation)

---

## Common Mistakes — Never Do These

### 1. Making Payment Actions Optimistic

**Wrong:**
```typescript
const paymentMutation = useMutation({
  mutationFn: processPayment,

  onMutate: async (payment) => {
    // WRONG — update UI before server confirms
    setPaymentStatus('success');
    showConfetti();
  },

  onError: () => {
    // User saw "Payment successful!" for 2 seconds, now it says "Failed"
    setPaymentStatus('failed');
  },
});
```

**Why it's wrong:** Financial transactions must be confirmed by server before showing success. Showing success then rolling back damages trust and could cause real financial harm.

**Correct:**
```typescript
const paymentMutation = useMutation({
  mutationFn: processPayment,
  // NO onMutate — wait for server confirmation

  onSuccess: (data) => {
    if (data.success) {
      setPaymentStatus('success');
      showConfetti();
    }
  },
});
```

---

### 2. Not Rolling Back on Error

**Wrong:**
```typescript
const mutation = useMutation({
  mutationFn: archiveEmail,

  onMutate: async (id) => {
    // Optimistically remove from list
    queryClient.setQueryData<Email[]>(['emails'], (old) =>
      old ? old.filter((e) => e.id !== id) : []
    );
    // No return statement — no snapshot saved
  },

  onError: () => {
    // Can't rollback — don't have previous state
    alert('Error occurred');
  },
});
```

**Why it's wrong:** Email disappeared from UI, error occurred, but email is still on server. UI now inconsistent with server.

**Correct:**
```typescript
const mutation = useMutation({
  mutationFn: archiveEmail,

  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['emails'] });

    // Snapshot for rollback
    const previousEmails = queryClient.getQueryData<Email[]>(['emails']);

    queryClient.setQueryData<Email[]>(['emails'], (old) =>
      old ? old.filter((e) => e.id !== id) : []
    );

    return { previousEmails }; // Return context
  },

  onError: (error, id, context) => {
    // Rollback to snapshot
    if (context?.previousEmails) {
      queryClient.setQueryData(['emails'], context.previousEmails);
    }
  },
});
```

---

### 3. No Visual Indication of Optimistic State

**Wrong:**
```typescript
// Optimistically toggle — looks identical to confirmed state
queryClient.setQueryData<Todo[]>(['todos'], (old) =>
  old ? old.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)) : []
);

return (
  <li>
    <input type="checkbox" checked={todo.completed} />
    {/* No indication that this is pending server confirmation */}
  </li>
);
```

**Why it's wrong:** User can't tell if action succeeded or is still in progress. If error occurs and rollback happens, user is confused.

**Correct:**
```typescript
const isPending = mutation.isPending && mutation.variables === todo.id;

return (
  <li className={isPending ? 'opacity-50' : 'opacity-100'}>
    <input
      type="checkbox"
      checked={todo.completed}
      disabled={isPending}
    />
    {isPending && <span className="text-xs text-gray-500">Saving...</span>}
  </li>
);
```

---

### 4. Not Handling Conflicts

**Wrong:**
```typescript
// Optimistically update document
onMutate: async (newContent) => {
  queryClient.setQueryData(['document', id], { content: newContent });
},

// Server rejects because another user updated it
onSuccess: () => {
  // Assume success — don't check for conflicts
  alert('Saved!');
},
```

**Why it's wrong:** If another user edited the document, server returns 409 Conflict. Your optimistic update overwrote their changes locally, and server rejected it, but you showed "Saved!" anyway.

**Correct:**
```typescript
onSuccess: (data) => {
  if (data.conflict) {
    // Server detected version mismatch
    alert(`Conflict: Document was updated by another user. Server has version ${data.conflict.serverVersion}. Please refresh and try again.`);

    // Rollback optimistic update
    queryClient.invalidateQueries({ queryKey: ['document', id] });
  } else {
    alert('Saved!');
  }
},
```

---

### 5. Optimistic Delete Without Undo Option

**Wrong:**
```typescript
const deleteMutation = useMutation({
  mutationFn: deleteEmail,

  onMutate: async (id) => {
    // Optimistically remove immediately
    queryClient.setQueryData<Email[]>(['emails'], (old) =>
      old ? old.filter((e) => e.id !== id) : []
    );
    // No undo window — gone instantly
  },
});

// User clicks delete by accident — email disappears with no way to undo
```

**Why it's wrong:** Destructive actions should have undo option. User might click by accident.

**Correct:**
```typescript
const deleteMutation = useMutation({
  mutationFn: deleteEmail,

  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['emails'] });
    const previousEmails = queryClient.getQueryData<Email[]>(['emails']);

    // Optimistically remove
    queryClient.setQueryData<Email[]>(['emails'], (old) =>
      old ? old.filter((e) => e.id !== id) : []
    );

    // Show undo UI for 3 seconds
    showUndoToast(id, () => {
      // Undo function restores from snapshot
      if (previousEmails) {
        queryClient.setQueryData(['emails'], previousEmails);
      }
      deleteMutation.reset(); // Cancel pending mutation
    });

    return { previousEmails };
  },
});
```

---

## Performance Considerations

### Cancel Ongoing Queries

```typescript
onMutate: async (id) => {
  // CRITICAL: Cancel queries to prevent race conditions
  await queryClient.cancelQueries({ queryKey: ['emails'] });

  // Without this:
  // 1. User clicks archive (optimistic update removes email)
  // 2. Background refetch completes (restores email)
  // 3. Server confirms archive (but email already back in list)
  // Result: Email shows as archived and not archived simultaneously
}
```

**Effect:** Prevents stale data from overwriting optimistic update.

### Debounce Rapid Updates

```typescript
import { useDebouncedCallback } from 'use-debounce';

const updateMutation = useMutation({
  mutationFn: updateDocument,
  // ... optimistic update logic
});

// Debounce text input updates
const debouncedUpdate = useDebouncedCallback(
  (content: string) => {
    updateMutation.mutate({ id, content });
  },
  500 // Wait 500ms after user stops typing
);

<textarea
  onChange={(e) => {
    // Update local state immediately (not optimistic mutation)
    setLocalContent(e.target.value);
    // Debounce server update
    debouncedUpdate(e.target.value);
  }}
/>
```

**Effect:** Reduces server requests for rapid actions (typing, dragging sliders).

---

## Accessibility Checklist

- [ ] **Optimistic state announced** to screen readers (aria-live="polite" for success/error)
- [ ] **Pending state communicated** visually and to assistive tech (aria-busy, disabled buttons)
- [ ] **Error messages descriptive** and include retry option
- [ ] **Undo option keyboard accessible** (if provided)
- [ ] **Loading state doesn't block interaction** with other UI elements
- [ ] **Focus management** — don't move focus during optimistic update
- [ ] **Color not only indicator** of optimistic vs confirmed state (use icons, text, opacity)

---

## Security Checklist

- [ ] **Server validates all mutations** — never trust client-provided data
- [ ] **Verify user authorization** on server before applying mutation
- [ ] **Use RLS policies** in Supabase to enforce permissions
- [ ] **Version conflicts detected** (optimistic concurrency control)
- [ ] **Rate limiting enforced** on mutation endpoints
- [ ] **Idempotency keys used** for critical mutations (payments, account creation)
- [ ] **Rollback doesn't leak sensitive data** (sanitize error messages)

---

## Pre-Implementation Checklist

Before declaring optimistic updates complete in your codebase:

- [ ] **onMutate snapshot created** for all optimistic mutations
- [ ] **onError rollback implemented** for all optimistic mutations
- [ ] **cancelQueries called** before optimistic update (prevent race conditions)
- [ ] **Visual distinction** between optimistic and confirmed states
- [ ] **Inline error messages** (not toasts) with retry option
- [ ] **Non-optimistic actions identified** (payments, emails, account creation) and never made optimistic
- [ ] **Conflict resolution strategy** implemented for collaborative editing scenarios
- [ ] **Undo option provided** for destructive actions (delete, archive)
- [ ] **Performance tested** (no janky UI during optimistic update)
- [ ] **Accessibility tested** (screen reader announces state changes)

---

## References

- [TanStack Query Optimistic Updates Documentation](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic)
- [Optimistic UI Best Practices (Smashing Magazine)](https://www.smashingmagazine.com/2016/11/true-lies-of-optimistic-user-interfaces/)
- [When NOT to Use Optimistic Updates (DEV Community)](https://dev.to/criscmd/why-i-never-use-optimistic-updates-and-why-you-might-regret-it-too-4jem)

---

*CodeBakers V4 | Pattern: Optimistic Updates | agents/patterns/optimistic-updates.md*
