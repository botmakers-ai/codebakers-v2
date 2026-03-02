---
triggers:
  - "drag and drop"
  - "dnd-kit"
  - "sortable list"
  - "kanban board"
  - "reorder items"
  - "draggable"
  - "accessible drag drop"
  - "keyboard drag drop"

depends_on:
  - keyboard-navigation.md (WCAG 2.1.1 keyboard access)
  - optimistic-updates.md (immediate UI feedback, rollback)
  - data-fetching.md (TanStack Query for backend sync)

prerequisites:
  - Next.js App Router
  - TypeScript
  - React hooks
  - Understanding of WCAG 2.2 SC 2.5.7 (Dragging Movements)

description: |
  Production-ready drag-and-drop system covering: dnd-kit setup with accessible keyboard/screen reader support (WCAG 2.2 SC 2.5.7), sortable lists, multi-container Kanban boards, optimistic updates with backend persistence, virtualized list performance, collision detection algorithms, single-pointer alternatives, ARIA announcements, and accessibility-first implementation.
---

# Drag-and-Drop Pattern

## Research Foundation

**Searches performed:**
1. dnd-kit React drag drop library 2025 best practices
2. Accessible drag drop keyboard alternatives WCAG 2.2 2024
3. Sortable list drag drop optimistic updates React 2025
4. Drag drop file upload preview React dropzone 2024
5. Drag drop accessibility screen reader announcements ARIA 2024
6. dnd-kit multiple containers kanban board React 2025
7. Drag drop performance virtualized lists React 2024
8. Drag drop persist backend API optimistic updates 2024
9. dnd-kit sensors mouse touch keyboard customization 2025
10. Drag drop ghost clone animation CSS transform 2024
11. Drag drop anti-patterns accessibility mistakes 2024
12. dnd-kit collision detection algorithms closestCenter 2025
13. Drag drop testing Playwright Cypress automation 2024

**Key findings:**
- **dnd-kit is the modern standard** — lightweight (10 KB), built-in keyboard/screen reader support, composable architecture
- **WCAG 2.2 SC 2.5.7 (Dragging Movements)** — **single-pointer alternative required** (buttons, dropdowns, not just keyboard)
- **aria-grabbed and aria-dropeffect deprecated** since ARIA 1.1 — use aria-live regions and aria-describedby instead
- **React 19 useOptimistic** doesn't auto-rollback — manual implementation required for failed backend syncs
- **Virtualized lists supported** — dnd-kit works with react-window, TanStack Virtual for 500+ items
- **Playwright has native dragAndDrop()** — Cypress requires plugins (@4tw/cypress-drag-drop) or manual triggers
- **dnd-kit doesn't use HTML5 DnD API** — can't drag files or between windows (trade-off for better accessibility/mobile)
- **closestCenter vs rectIntersection** — closestCenter measures distance from centers (sortable lists), rectIntersection checks overlap (Kanban)
- **Sensors default: Pointer + Keyboard** — add Touch sensor for custom touch constraints (delay, tolerance)
- **4 major accessible patterns** — Move to position, Navigation buttons, Live reordering, Keyboard-only (GitHub Blog July 2024)

---

## Core Principles

1. **Accessibility first** — keyboard + screen reader support is **not optional**
2. **Single-pointer alternative** — provide buttons/dropdowns (WCAG 2.2 SC 2.5.7)
3. **Optimistic UI + rollback** — instant feedback, revert on backend failure
4. **Announce changes** — use aria-live regions for screen reader feedback
5. **Collision detection matches use case** — closestCenter (sortable), rectIntersection (Kanban)
6. **Virtualize for performance** — 500+ items need virtualized lists
7. **Test with automation** — Playwright dragAndDrop() or Cypress plugins

---

## 1. Basic Sortable List with dnd-kit

```bash
pnpm add --save-exact @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```typescript
// components/SortableList.tsx
'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

interface Item {
  id: string;
  content: string;
}

export function SortableList() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', content: 'Item 1' },
    { id: '2', content: 'Item 2' },
    { id: '3', content: 'Item 3' },
    { id: '4', content: 'Item 4' },
  ]);

  // Configure sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates, // Arrow keys navigation
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      return arrayMove(items, oldIndex, newIndex);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2" role="list">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} content={item.content} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

```typescript
// components/SortableItem.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableItemProps {
  id: string;
  content: string;
}

export function SortableItem({ id, content }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      }`}
      role="listitem"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        aria-label={`Drag to reorder ${content}`}
      >
        <GripVertical className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </button>
      <span>{content}</span>
    </div>
  );
}
```

**Accessibility features:**
- ✅ **Keyboard support** — Arrow keys, Space to activate, Enter to drop
- ✅ **Focus indicators** — Visible focus ring (2px, blue-500)
- ✅ **aria-label** — Describes drag handle purpose
- ✅ **activationConstraint: distance** — Prevents accidental drags

---

## 2. Multi-Container Kanban Board

```typescript
// components/KanbanBoard.tsx
'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection, // Better for multi-container
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface Task {
  id: string;
  title: string;
  columnId: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Record<string, Task>>({
    '1': { id: '1', title: 'Task 1', columnId: 'todo' },
    '2': { id: '2', title: 'Task 2', columnId: 'todo' },
    '3': { id: '3', title: 'Task 3', columnId: 'inProgress' },
  });

  const [columns, setColumns] = useState<Record<string, Column>>({
    todo: { id: 'todo', title: 'To Do', taskIds: ['1', '2'] },
    inProgress: { id: 'inProgress', title: 'In Progress', taskIds: ['3'] },
    done: { id: 'done', title: 'Done', taskIds: [] },
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks[activeId];
    const overTask = tasks[overId];

    if (!activeTask) return;

    // Dragging over a task
    if (overTask && activeTask.columnId !== overTask.columnId) {
      setTasks((tasks) => ({
        ...tasks,
        [activeId]: { ...activeTask, columnId: overTask.columnId },
      }));

      setColumns((columns) => {
        const oldColumn = columns[activeTask.columnId];
        const newColumn = columns[overTask.columnId];

        return {
          ...columns,
          [oldColumn.id]: {
            ...oldColumn,
            taskIds: oldColumn.taskIds.filter((id) => id !== activeId),
          },
          [newColumn.id]: {
            ...newColumn,
            taskIds: [...newColumn.taskIds, activeId],
          },
        };
      });
    }

    // Dragging over a column
    const overColumn = columns[overId];
    if (overColumn && activeTask.columnId !== overColumn.id) {
      setTasks((tasks) => ({
        ...tasks,
        [activeId]: { ...activeTask, columnId: overColumn.id },
      }));

      setColumns((columns) => {
        const oldColumn = columns[activeTask.columnId];

        return {
          ...columns,
          [oldColumn.id]: {
            ...oldColumn,
            taskIds: oldColumn.taskIds.filter((id) => id !== activeId),
          },
          [overColumn.id]: {
            ...overColumn,
            taskIds: [...overColumn.taskIds, activeId],
          },
        };
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto">
        {Object.values(columns).map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={column.taskIds.map((id) => tasks[id])}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && tasks[activeId] ? (
          <KanbanCard task={tasks[activeId]} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

```typescript
// components/KanbanColumn.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, Task } from './KanbanCard';

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 bg-gray-100 rounded-lg p-4 ${
        isOver ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <h2 className="font-semibold mb-4">{column.title}</h2>

      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

```typescript
// components/KanbanCard.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Task {
  id: string;
  title: string;
  columnId: string;
}

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
}

export function KanbanCard({ task, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {task.title}
    </div>
  );
}
```

**Key differences for multi-container:**
- **rectIntersection** collision detection (not closestCenter)
- **DragOverlay** for visual feedback
- **useDroppable** for columns
- **onDragOver** optimistically updates position

---

## 3. Accessible Single-Pointer Alternative (WCAG 2.2 SC 2.5.7)

```typescript
// components/AccessibleSortableList.tsx
'use client';

import { useState } from 'react';
import { SortableList } from './SortableList';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Item {
  id: string;
  content: string;
}

export function AccessibleSortableList() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', content: 'Item 1' },
    { id: '2', content: 'Item 2' },
    { id: '3', content: 'Item 3' },
  ]);

  function moveUp(index: number) {
    if (index === 0) return;

    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
  }

  function moveDown(index: number) {
    if (index === items.length - 1) return;

    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Accessible Sortable List</h2>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg"
          >
            <span className="flex-1">{item.content}</span>

            {/* Single-pointer alternative — WCAG 2.2 SC 2.5.7 */}
            <div className="flex gap-1">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Move ${item.content} up`}
              >
                <ChevronUp className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === items.length - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Move ${item.content} down`}
              >
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Why this is required:**
- Eye-gaze systems, head pointers, speech-controlled mouse can't drag
- Click-based alternative is **mandatory** for WCAG 2.2 Level A compliance
- Keyboard alone doesn't satisfy SC 2.5.7 — must work with **single pointer** (click/tap)

---

## 4. Backend Persistence with Optimistic Updates

```typescript
// components/SortableListWithPersistence.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Item {
  id: string;
  content: string;
  order: number;
}

async function fetchItems(): Promise<Item[]> {
  const res = await fetch('/api/items');
  return res.json();
}

async function updateItemOrder(items: Item[]): Promise<void> {
  await fetch('/api/items/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

export function SortableListWithPersistence() {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  const reorderMutation = useMutation({
    mutationFn: updateItemOrder,
    onMutate: async (newItems) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['items'] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<Item[]>(['items']);

      // Optimistically update
      queryClient.setQueryData(['items'], newItems);

      // Return rollback function
      return { previousItems };
    },
    onError: (err, newItems, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems);
      }
    },
    onSettled: () => {
      // Refetch after success or error
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index,
    }));

    // Optimistically update + persist to backend
    reorderMutation.mutate(newItems);
  }

  return (
    <div className="space-y-4">
      {reorderMutation.isPending && (
        <div className="text-sm text-gray-600">Saving order...</div>
      )}

      {reorderMutation.isError && (
        <div className="text-sm text-red-600" role="alert">
          Failed to save order. Changes reverted.
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-white border rounded-lg">
                {item.content}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

**Optimistic update flow:**
1. **onMutate** — cancel queries, snapshot previous state, update cache immediately
2. **User sees** — instant reorder (no loading spinner)
3. **Backend call** — PATCH /api/items/reorder
4. **onError** — rollback to snapshot + show error
5. **onSettled** — refetch to ensure consistency

---

## 5. Screen Reader Announcements with ARIA Live Regions

```typescript
// components/SortableListWithAnnouncements.tsx
'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

export function SortableListWithAnnouncements() {
  const [items, setItems] = useState([
    { id: '1', content: 'Task 1' },
    { id: '2', content: 'Task 2' },
    { id: '3', content: 'Task 3' },
  ]);

  const [announcement, setAnnouncement] = useState('');

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setAnnouncement('Drag cancelled');
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const movedItem = items[oldIndex];
    const newItems = arrayMove(items, oldIndex, newIndex);

    setItems(newItems);

    // Announce change to screen readers
    const position = newIndex + 1;
    setAnnouncement(
      `${movedItem.content} moved to position ${position} of ${items.length}`
    );
  }

  return (
    <div>
      {/* ARIA live region for screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {announcement}
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={items}>
          {/* Sortable items... */}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

**Accessibility features:**
- **aria-live="assertive"** — immediately announces changes
- **aria-atomic="true"** — reads entire message
- **sr-only** — visually hidden, screen reader only
- **Specific announcements** — "Task 1 moved to position 3 of 5"

---

## Anti-Patterns

### Anti-Pattern 1: No Keyboard Alternative

**❌ WRONG:**
```typescript
// Only works with mouse/touch
<div
  draggable
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  Drag me
</div>
```

**Problem:** Violates WCAG 2.1.1 (Keyboard). Users with motor disabilities can't reorder items.

**✅ CORRECT:** Use dnd-kit with keyboard sensor:
```typescript
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // Arrow keys work
  })
);

<DndContext sensors={sensors}>
  {/* Keyboard accessible */}
</DndContext>
```

---

### Anti-Pattern 2: No Single-Pointer Alternative (WCAG 2.2 SC 2.5.7 Violation)

**❌ WRONG:**
```typescript
// Only drag-and-drop, no buttons
<SortableList items={items} onReorder={setItems} />
// Users with eye-gaze systems, head pointers can't reorder
```

**Problem:** Violates WCAG 2.2 SC 2.5.7 (Dragging Movements). Keyboard alternative **doesn't satisfy this** — must work with **single click/tap**.

**✅ CORRECT:** Provide move up/down buttons:
```typescript
{items.map((item, index) => (
  <div key={item.id}>
    <span>{item.content}</span>
    <button onClick={() => moveUp(index)} aria-label="Move up">↑</button>
    <button onClick={() => moveDown(index)} aria-label="Move down">↓</button>
  </div>
))}
```

---

### Anti-Pattern 3: No Screen Reader Announcements

**❌ WRONG:**
```typescript
function handleDragEnd(event: DragEndEvent) {
  // Reorder items
  setItems(newItems);
  // Screen reader users don't know what happened
}
```

**Problem:** Silent changes. Screen reader users have no feedback.

**✅ CORRECT:** Use aria-live region:
```typescript
const [announcement, setAnnouncement] = useState('');

function handleDragEnd(event: DragEndEvent) {
  setItems(newItems);
  setAnnouncement(`${item.content} moved to position ${newIndex + 1}`);
}

return (
  <>
    <div role="status" aria-live="assertive" className="sr-only">
      {announcement}
    </div>
    {/* Sortable list */}
  </>
);
```

---

### Anti-Pattern 4: Optimistic Update Without Rollback

**❌ WRONG:**
```typescript
async function handleDragEnd(event: DragEndEvent) {
  // Immediately update UI
  setItems(newItems);

  // Call backend
  await fetch('/api/reorder', { body: JSON.stringify(newItems) });
  // If fails — UI shows wrong order, no rollback
}
```

**Problem:** Backend failure leaves UI inconsistent. User sees incorrect state.

**✅ CORRECT:** Implement rollback with TanStack Query:
```typescript
const reorderMutation = useMutation({
  mutationFn: updateOrder,
  onMutate: async (newItems) => {
    const previousItems = queryClient.getQueryData(['items']);
    queryClient.setQueryData(['items'], newItems);
    return { previousItems };
  },
  onError: (err, newItems, context) => {
    // Rollback on failure
    queryClient.setQueryData(['items'], context.previousItems);
  },
});
```

---

### Anti-Pattern 5: Using aria-grabbed (Deprecated)

**❌ WRONG:**
```typescript
<div
  draggable
  aria-grabbed={isDragging}
  aria-dropeffect="move"
>
  Drag me
</div>
```

**Problem:** `aria-grabbed` and `aria-dropeffect` **deprecated since ARIA 1.1**. No assistive technology supports them.

**✅ CORRECT:** Use aria-describedby and aria-live:
```typescript
<div
  {...attributes}
  {...listeners}
  aria-describedby="drag-instructions"
>
  Drag me
</div>

<div id="drag-instructions" className="sr-only">
  Press space to activate drag mode, then use arrow keys to move.
  Press space again to drop.
</div>

<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>
```

---

## Testing Checklist

- [ ] **Keyboard navigation**
  - [ ] Tab to drag handle focuses correctly
  - [ ] Space activates drag mode
  - [ ] Arrow keys move item
  - [ ] Space drops item
  - [ ] Escape cancels drag

- [ ] **Screen reader support**
  - [ ] Drag handle has descriptive aria-label
  - [ ] Instructions announced on focus (aria-describedby)
  - [ ] Position changes announced (aria-live)
  - [ ] Drag cancelled announced

- [ ] **Single-pointer alternative (WCAG 2.2 SC 2.5.7)**
  - [ ] Move up/down buttons work
  - [ ] Dropdown to select position works
  - [ ] Alternative doesn't require dragging

- [ ] **Optimistic updates**
  - [ ] UI updates immediately on drag
  - [ ] Backend persists change
  - [ ] Rollback on backend failure
  - [ ] Error message shown to user

- [ ] **Performance**
  - [ ] Lists with 500+ items use virtualization
  - [ ] No layout thrashing during drag
  - [ ] Smooth 60fps animations

---

## Accessibility Checklist (WCAG 2.2 AA)

- [ ] **WCAG 2.1.1 Keyboard (Level A)**
  - [ ] All drag-and-drop operations work with keyboard
  - [ ] Keyboard sensor configured with arrow key navigation
  - [ ] Focus visible on drag handles (2px ring)

- [ ] **WCAG 2.5.7 Dragging Movements (Level AA)**
  - [ ] Single-pointer alternative provided (buttons, dropdown)
  - [ ] Alternative doesn't require dragging gesture
  - [ ] Works with eye-gaze, head pointer, speech input

- [ ] **WCAG 4.1.3 Status Messages (Level AA)**
  - [ ] aria-live region announces position changes
  - [ ] Drag cancelled announced
  - [ ] Error messages announced

- [ ] **ARIA best practices**
  - [ ] aria-describedby provides instructions
  - [ ] role="listitem" on items (if in list)
  - [ ] No deprecated aria-grabbed/aria-dropeffect

---

## Integration Notes

**Works well with:**
- **keyboard-navigation.md** — Roving tabindex, focus management
- **optimistic-updates.md** — TanStack Query onMutate/onError/onSettled
- **virtualization.md** — dnd-kit + TanStack Virtual for 500+ items

**Dependencies:**
- Depends on `keyboard-navigation.md` for WCAG 2.1.1 keyboard access patterns
- Depends on `optimistic-updates.md` for rollback implementation

---

## References

1. [dnd-kit Documentation](https://docs.dndkit.com/)
2. [WCAG 2.2 SC 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
3. [React Aria: Accessible Drag and Drop](https://react-spectrum.adobe.com/blog/drag-and-drop.html)
4. [GitHub: Accessible Sortable List Challenges](https://github.blog/engineering/user-experience/exploring-the-challenges-in-creating-an-accessible-sortable-list-drag-and-drop/)
5. [TanStack Query: Optimistic Updates](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)

---

## Version History

- **v1.0** (2025-01-15): Initial drag-and-drop pattern covering dnd-kit setup, sortable lists, multi-container Kanban, accessibility (WCAG 2.2 SC 2.5.7 single-pointer alternative, keyboard nav, screen reader announcements), optimistic updates with rollback, backend persistence, anti-patterns
