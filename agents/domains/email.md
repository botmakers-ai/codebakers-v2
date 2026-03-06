# Domain: Email Client
# CodeBakers V4 | agents/domains/email.md

**App Type:** Email Client / Mail Application

**Auto-loaded when:** project-profile.md contains `domain: email`

---

## Domain-Specific Expectations

When building an email client, users expect these features without being explicitly told:

### Core Features (Must Have)

**Folder System:**
- Inbox, Sent, Drafts, Trash, Archive as minimum
- Custom folders/labels support
- Unread count badges on folders
- Folder tree navigation (nested folders)

**Message Threading:**
- Conversations grouped by subject/thread-id
- Collapsed threads show: sender, subject, date, unread count
- Expanded threads show all messages chronologically
- Reply-to-all preserves thread

**Search:**
- Full-text search across: subject, sender, recipient, body
- Filters: date range, folder, has:attachment, is:unread
- Search within current folder OR globally (user choice)
- Recent searches saved

**Sender/Recipient Fields:**
- Display changes by context:
  - Inbox/Archive → show FROM field
  - Sent → show TO field
  - Drafts → show TO field
  - Trash → show both FROM and TO
- Never show FROM in Sent folder (user knows it's from them)

**Attachments:**
- Inline preview for images
- Download button for files
- File size display
- Multiple attachments listed clearly
- Attachment icons (PDF, DOC, ZIP, etc.)

---

### UX Patterns (Expected Behavior)

**Empty States:**
```
Inbox (0 messages):
  Icon: Mail envelope
  Message: "No messages in your inbox"
  Action: "Compose your first message" OR "Refresh"

Search (no results):
  Icon: Magnifying glass
  Message: "No messages match your search"
  Action: "Clear search" OR "Try different keywords"

Drafts (0 drafts):
  Icon: Pencil/edit
  Message: "No draft messages"
  Action: "Start composing"
```

**Loading States:**
- Skeleton list while fetching messages (not spinner)
- Show existing messages + skeleton for next page (infinite scroll)
- "Sending..." state on send button (disable + loading indicator)
- "Saving draft..." indicator (auto-save)

**Error States:**
- Send failed → keep draft, show retry button
- Network error → show cached messages + "Offline" indicator
- Attachment too large → show size limit, offer to remove
- Invalid recipient → highlight field, show error inline

---

### Data Model Expectations

**Message Fields:**
```typescript
interface EmailMessage {
  id: string
  thread_id: string  // For conversation grouping
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  body: string  // Plain text or HTML
  snippet: string  // First 100 chars for preview
  date: string  // ISO timestamp
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | string
  is_read: boolean
  is_starred: boolean
  has_attachments: boolean
  attachments?: Attachment[]
  labels?: string[]  // For categorization
}

interface EmailAddress {
  email: string
  name?: string  // Display name
}

interface Attachment {
  id: string
  filename: string
  size: number  // bytes
  mime_type: string
  download_url: string
}
```

---

### Mutation Patterns

**Send Message:**
1. Validate recipients (at least one TO address)
2. Save to Sent folder immediately (optimistic)
3. Call send API
4. On success: keep in Sent
5. On failure: move to Drafts + show "Send failed" with retry option

**Delete Message:**
1. Move to Trash (soft delete)
2. Update folder unread counts
3. If last message in current view → navigate to next message OR empty state
4. If active message deleted → clear selection

**Mark as Read/Unread:**
1. Update message.is_read
2. Update folder unread count (+1 or -1)
3. Update thread unread count if threaded
4. No confirmation needed (instant toggle)

**Archive:**
1. Remove from current folder
2. Add to Archive folder
3. If last message → navigate to next OR empty state
4. Undo option for 5 seconds

---

### Performance Expectations

**Message List:**
- Infinite scroll (not pagination)
- Virtual scrolling if >200 messages (only render visible)
- Eager load: next page when user is 100px from bottom
- Cache locally: last 500 messages per folder

**Search:**
- Debounce input (300ms)
- Search local cache first (instant results)
- Then search server (if cache incomplete)
- Show "Searching remotely..." when hitting server

**Attachments:**
- Lazy load attachment previews (not on message list)
- Only download when user clicks
- Cache downloaded attachments (don't re-download)

---

### Security Expectations

**Email Addresses:**
- Validate format before sending
- Prevent injection in TO/CC/BCC fields
- Sanitize display names (no HTML rendering)

**Message Bodies:**
- HTML emails: sanitize with DOMPurify or similar
- Strip `<script>` tags always
- Block external images by default (privacy)
- "Load images" button if external images detected
- Plain text: escape HTML entities

**Attachments:**
- Virus scan before download (if using external service)
- Block executable files (.exe, .bat, .sh) by default
- Warn on suspicious file types
- Download as blob, don't execute

---

### Accessibility Requirements

**Keyboard Navigation:**
- `j/k` → next/previous message (Gmail-style)
- `c` → compose new message
- `r` → reply
- `a` → reply all
- `/` → focus search
- `g then i` → go to inbox
- `Esc` → close compose/cancel

**Screen Readers:**
- Announce unread count: "Inbox, 12 unread messages"
- Announce message: "From Alice, subject: Meeting notes, received today at 2pm"
- Announce status: "Message sent", "Draft saved", "Message deleted"
- Focus management: after delete, focus next message (not lost)

**ARIA Attributes:**
- `role="feed"` on message list
- `role="article"` on each message
- `aria-label` on icon-only buttons
- `aria-live="polite"` on status messages
- `aria-expanded` on thread collapse/expand

---

## CodeBakers Integration

**Automatic feature additions when domain=email:**

When Interview Agent detects email client, automatically add to FLOWS.md:
- View inbox (with threading, unread counts)
- Compose and send message (with validation, error handling)
- Reply to message (preserve thread)
- Search messages (local + remote)
- Attach files (with size limits, type validation)
- Mark as read/unread (with count updates)
- Delete message (soft delete to trash)
- Archive message (with undo)

**Pattern application:**
- Mutation handler: Always update folder unread counts
- Dependency map: Message deletion must update thread store + folder store + active selection
- Error handling: Send failures keep draft + show retry (never silently fail)
- Empty states: Specific to email context (not generic "No data")
- Search: Inherit scope from current folder (inbox search ≠ global search)

**Don't ask about:**
- "Should inbox show unread count?" (yes, always)
- "Should deleted messages go to trash?" (yes, not permanent delete)
- "Should search be local or remote?" (both - local first, then remote)
- "Should threads be grouped?" (yes, standard email UX)

**Do ask about:**
- External integrations (Gmail API, Microsoft Graph, IMAP)
- Attachment storage (Supabase Storage, S3, local)
- Rich text editing (Quill, TipTap, plain textarea)
- Encryption (E2E, at-rest, none)

---

## Anti-Patterns (Don't Do This)

**❌ Permanent delete without trash folder**
→ Users expect undo capability, trash gives 30-day recovery

**❌ Global unread count without folder breakdown**
→ "You have 523 unread messages" is overwhelming without folder context

**❌ No threading in conversation view**
→ Long email chains become unmanageable without threading

**❌ Search that only searches subject line**
→ Users expect full-text search (subject + body + sender)

**❌ FROM field in Sent folder**
→ Wastes space, user knows it's from them - show TO instead

**❌ No empty state on empty inbox**
→ Blank screen looks broken, not "nothing here"

**❌ Inline attachment download on message list**
→ Performance killer, only load on message detail view

**❌ No snippet preview in message list**
→ Subject alone doesn't give enough context to triage

---

*CodeBakers V4 | Domain: Email Client | agents/domains/email.md*
