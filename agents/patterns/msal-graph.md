# Pattern: Microsoft Graph + MSAL Sync Architecture
# CodeBakers V4 | agents/patterns/msal-graph.md
# Trigger: Building any Microsoft-connected app with multi-account support

---

## What This Pattern Is

The complete production-ready architecture for Microsoft Graph integration with MSAL authentication. Handles multiple Microsoft accounts per user, delta sync, token refresh, account switching without race conditions, and all the edge cases that cause bugs in production.

This is the architecture that prevents the bugs Daniel has experienced. Use this pattern for ANY app that connects to Microsoft 365 (email, calendar, contacts).

---

## Azure App Registration Setup

### Step 1: Create App Registration

Go to https://portal.azure.com → Azure Active Directory → App registrations → New registration

**Settings:**
```
Name: [Your App Name] (e.g., "Acme Email Client")
Supported account types: Accounts in any organizational directory and personal Microsoft accounts (Multitenant + personal)
Redirect URI:
  - Type: Web
  - Dev: http://localhost:3000/api/auth/microsoft/callback
  - Prod: https://yourdomain.com/api/auth/microsoft/callback
```

**Why multitenant + personal:** Supports work accounts (@company.com) AND personal accounts (@outlook.com, @hotmail.com)

### Step 2: Configure API Permissions

Navigate to: API permissions → Add a permission → Microsoft Graph → Delegated permissions

**Required scopes:**
```
✓ Mail.Read           — Read user mail
✓ Mail.Send           — Send mail as user
✓ Mail.ReadWrite      — Create, read, update, delete user mail
✓ Calendars.ReadWrite — Full access to user calendars
✓ Contacts.Read       — Read user contacts
✓ offline_access      — CRITICAL: Maintain access via refresh token
✓ User.Read           — Read user profile (email, name, photo)
```

**IMPORTANT:** Click "Grant admin consent" button after adding permissions (otherwise users must approve each scope individually).

### Step 3: Get Credentials

Navigate to: Certificates & secrets → New client secret

**Settings:**
```
Description: Production Secret
Expires: 24 months (max allowed)
```

**Copy these values immediately:**
- Application (client) ID — from Overview page
- Client secret value — shown ONCE when created
- Directory (tenant) ID — from Overview page (usually "common" for multitenant)

### Step 4: Environment Variables

Add to `.env` and `.env.production`:

```bash
# Microsoft MSAL + Graph
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_TENANT_ID=common  # "common" for multitenant, or specific tenant ID

# Next.js Public (safe to expose to client)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Prod
```

**CRITICAL:** Never use `NEXT_PUBLIC_` prefix on `MICROSOFT_CLIENT_SECRET` — server-only.

---

## Supabase Schema

Run this SQL in Supabase SQL Editor. RLS policies enforce user isolation.

```sql
-- Enable RLS on all tables
-- NO org_id isolation — Microsoft accounts are user-scoped only

-- ============================================================================
-- Table: microsoft_tokens
-- Stores one row per connected Microsoft account per user
-- ============================================================================
CREATE TABLE microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,

  -- Microsoft account info
  microsoft_user_id TEXT NOT NULL, -- Graph user ID (immutable)
  email TEXT NOT NULL,
  display_name TEXT,

  -- Sync state
  needs_reconnect BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, microsoft_user_id) -- One connection per Microsoft account per user
);

-- RLS Policies for microsoft_tokens
ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Microsoft tokens"
  ON microsoft_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Microsoft tokens"
  ON microsoft_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Microsoft tokens"
  ON microsoft_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own Microsoft tokens"
  ON microsoft_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_microsoft_tokens_user_id ON microsoft_tokens(user_id);
CREATE INDEX idx_microsoft_tokens_expires_at ON microsoft_tokens(expires_at);

-- ============================================================================
-- Table: folder_sync_state
-- Delta tokens + counts per folder per account
-- ============================================================================
CREATE TABLE folder_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_token_id UUID NOT NULL REFERENCES microsoft_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Folder identity
  graph_folder_id TEXT NOT NULL, -- Graph folder ID
  display_name TEXT NOT NULL,
  parent_folder_id TEXT, -- NULL for top-level folders
  folder_depth INT DEFAULT 0, -- Depth in folder tree (0 = root)

  -- Delta sync state (per folder)
  delta_token TEXT, -- NULL on first sync, then populated
  delta_token_expires_at TIMESTAMPTZ, -- Track when to expect 410 Gone

  -- Counts
  unread_count INT DEFAULT 0,
  total_count INT DEFAULT 0,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle', -- idle | syncing | ready | error
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(microsoft_token_id, graph_folder_id)
);

-- RLS Policies for folder_sync_state
ALTER TABLE folder_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folder sync state"
  ON folder_sync_state FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own folder sync state"
  ON folder_sync_state FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folder sync state"
  ON folder_sync_state FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folder sync state"
  ON folder_sync_state FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_folder_sync_state_token_id ON folder_sync_state(microsoft_token_id);
CREATE INDEX idx_folder_sync_state_user_id ON folder_sync_state(user_id);
CREATE INDEX idx_folder_sync_state_graph_folder_id ON folder_sync_state(graph_folder_id);

-- ============================================================================
-- Table: message_cache
-- Local cache of message bodies + metadata to avoid re-fetching
-- ============================================================================
CREATE TABLE message_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_token_id UUID NOT NULL REFERENCES microsoft_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message identity
  graph_message_id TEXT NOT NULL,
  graph_folder_id TEXT NOT NULL,

  -- Message content
  subject TEXT,
  body_html TEXT,
  body_text TEXT,

  -- Metadata
  from_email TEXT,
  from_name TEXT,
  to_recipients JSONB, -- Array of {email, name}
  cc_recipients JSONB,
  received_at TIMESTAMPTZ,

  -- Flags
  is_read BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  importance TEXT, -- low | normal | high
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Attachments metadata (NOT content — too large)
  attachments JSONB, -- Array of {id, name, size, contentType}

  -- Cache metadata
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(), -- Updated on read

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(microsoft_token_id, graph_message_id)
);

-- RLS Policies for message_cache
ALTER TABLE message_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message cache"
  ON message_cache FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own message cache"
  ON message_cache FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message cache"
  ON message_cache FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own message cache"
  ON message_cache FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_message_cache_token_id ON message_cache(microsoft_token_id);
CREATE INDEX idx_message_cache_user_id ON message_cache(user_id);
CREATE INDEX idx_message_cache_folder_id ON message_cache(graph_folder_id);
CREATE INDEX idx_message_cache_accessed_at ON message_cache(accessed_at); -- For TTL cleanup

-- ============================================================================
-- Table: sync_log
-- Append-only debug log for sync operations
-- ============================================================================
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_token_id UUID REFERENCES microsoft_tokens(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Log entry
  event_type TEXT NOT NULL, -- token_refresh | folder_sync | message_sync | error
  message TEXT NOT NULL,
  metadata JSONB, -- Additional context

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for sync_log
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON sync_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync logs"
  ON sync_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_sync_log_user_id ON sync_log(user_id);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at);

-- ============================================================================
-- Function: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_microsoft_tokens_updated_at BEFORE UPDATE ON microsoft_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folder_sync_state_updated_at BEFORE UPDATE ON folder_sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Cleanup old message cache (TTL = 7 days of no access)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_message_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM message_cache
  WHERE accessed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- Run daily at 3 AM
-- SELECT cron.schedule('cleanup-message-cache', '0 3 * * *', 'SELECT cleanup_message_cache()');
```

---

## Token Management

HOF that auto-refreshes tokens when within 5 minutes of expiry.

```typescript
// lib/microsoft/token-manager.ts

import { createClient } from '@/lib/supabase/server';

interface TokenResult {
  token: string;
  error?: never;
}

interface TokenError {
  token?: never;
  error: 'needs_reconnect' | 'not_found' | 'refresh_failed';
}

type GetTokenResult = TokenResult | TokenError;

/**
 * Get valid Microsoft access token for account.
 * Auto-refreshes if within 5 minutes of expiry.
 *
 * @param accountId - microsoft_tokens.id (NOT microsoft_user_id)
 * @returns Valid token or error state
 */
export async function getValidToken(accountId: string): Promise<GetTokenResult> {
  const supabase = createClient();

  // Fetch token record
  const { data: tokenRecord, error: fetchError } = await supabase
    .from('microsoft_tokens')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();

  if (fetchError || !tokenRecord) {
    return { error: 'not_found' };
  }

  if (tokenRecord.needs_reconnect) {
    return { error: 'needs_reconnect' };
  }

  // Check if token expires within 5 minutes
  const expiresAt = new Date(tokenRecord.expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    // Token still valid
    return { token: tokenRecord.access_token };
  }

  // Token expiring soon — refresh it
  try {
    const refreshed = await refreshToken(tokenRecord.refresh_token);

    // Store new tokens
    const { error: updateError } = await supabase
      .from('microsoft_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        needs_reconnect: false,
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Failed to store refreshed token:', updateError);
      return { error: 'refresh_failed' };
    }

    // Log successful refresh
    await supabase.from('sync_log').insert({
      microsoft_token_id: accountId,
      user_id: tokenRecord.user_id,
      event_type: 'token_refresh',
      message: 'Token refreshed successfully',
    });

    return { token: refreshed.access_token };
  } catch (error) {
    console.error('Token refresh failed:', error);

    // Mark account as needs reconnect
    await supabase
      .from('microsoft_tokens')
      .update({ needs_reconnect: true })
      .eq('id', accountId);

    await supabase.from('sync_log').insert({
      microsoft_token_id: accountId,
      user_id: tokenRecord.user_id,
      event_type: 'error',
      message: 'Token refresh failed — needs reconnect',
      metadata: { error: String(error) },
    });

    return { error: 'needs_reconnect' };
  }
}

/**
 * Refresh Microsoft access token using refresh token.
 */
async function refreshToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Sometimes not returned
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}
```

---

## MSAL OAuth Flow

Complete Next.js API routes for Microsoft authentication.

### Route 1: Initiate OAuth

```typescript
// app/api/auth/microsoft/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access', // CRITICAL: Enables refresh tokens
  'User.Read',
  'Mail.Read',
  'Mail.Send',
  'Mail.ReadWrite',
  'Calendars.ReadWrite',
  'Contacts.Read',
].join(' ');

export async function GET(request: Request) {
  const supabase = createClient();

  // Verify user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check account limit (max 3 accounts per user)
  const { count } = await supabase
    .from('microsoft_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (count && count >= 3) {
    return NextResponse.json(
      { error: 'Maximum 3 Microsoft accounts allowed' },
      { status: 400 }
    );
  }

  // Build Microsoft auth URL
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');

  authUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', user.id); // Pass user ID for verification

  return NextResponse.redirect(authUrl.toString());
}
```

### Route 2: OAuth Callback

```typescript
// app/api/auth/microsoft/callback/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user_id
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=microsoft_auth_failed`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=missing_code`);
  }

  const supabase = createClient();

  // Verify user matches state
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // Get user profile from Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = await profileResponse.json();

    // Store tokens in database
    const { error: insertError } = await supabase
      .from('microsoft_tokens')
      .insert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        microsoft_user_id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        display_name: profile.displayName,
      });

    if (insertError) {
      // Check if account already connected
      if (insertError.code === '23505') {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=account_already_connected`);
      }
      throw insertError;
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?microsoft_connected=true`);
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=connection_failed`);
  }
}
```

### Route 3: Disconnect Account

```typescript
// app/api/auth/microsoft/[tokenId]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user owns this token (security)
  const { data: token } = await supabase
    .from('microsoft_tokens')
    .select('user_id')
    .eq('id', params.tokenId)
    .maybeSingle();

  if (!token || token.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete token (cascades to folder_sync_state, message_cache via FK)
  const { error: deleteError } = await supabase
    .from('microsoft_tokens')
    .delete()
    .eq('id', params.tokenId)
    .eq('user_id', user.id); // Double-check ownership

  if (deleteError) {
    console.error('Failed to delete Microsoft token:', deleteError);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

---

## Delta Sync Pattern

Complete folder and message sync with delta tokens.

```typescript
// lib/microsoft/delta-sync.ts

import { createClient } from '@/lib/supabase/server';
import { getValidToken } from './token-manager';

const MAX_FOLDER_DEPTH = 10;

/**
 * Sync folders for a Microsoft account using delta tokens.
 * First sync: full fetch. Subsequent: delta only.
 */
export async function syncFolders(accountId: string) {
  const supabase = createClient();

  // Get valid token
  const tokenResult = await getValidToken(accountId);

  if (tokenResult.error) {
    console.error(`Token error for account ${accountId}:`, tokenResult.error);
    return { error: tokenResult.error };
  }

  const token = tokenResult.token;

  try {
    // Check if we have a delta token
    const { data: existingFolders } = await supabase
      .from('folder_sync_state')
      .select('delta_token')
      .eq('microsoft_token_id', accountId)
      .limit(1)
      .maybeSingle();

    const deltaToken = existingFolders?.delta_token;

    let url = deltaToken
      ? `https://graph.microsoft.com/v1.0/me/mailFolders/delta?$deltatoken=${deltaToken}`
      : 'https://graph.microsoft.com/v1.0/me/mailFolders/delta';

    const allFolders: any[] = [];
    let nextLink = url;

    // Fetch all pages
    while (nextLink) {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 410) {
        // Delta token expired — full resync
        console.log('Delta token expired for account', accountId, '— full resync');

        // Clear existing delta token
        await supabase
          .from('folder_sync_state')
          .update({ delta_token: null })
          .eq('microsoft_token_id', accountId);

        // Restart sync without delta token
        return syncFolders(accountId);
      }

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();

      allFolders.push(...data.value);

      nextLink = data['@odata.nextLink'] || null;

      // Extract new delta token from @odata.deltaLink
      if (data['@odata.deltaLink']) {
        const deltaUrl = new URL(data['@odata.deltaLink']);
        const newDeltaToken = deltaUrl.searchParams.get('$deltatoken');

        if (newDeltaToken) {
          // Store new delta token (applies to ALL folders for this account)
          await supabase
            .from('folder_sync_state')
            .upsert(
              allFolders.map((folder) => ({
                microsoft_token_id: accountId,
                user_id: (async () => {
                  const { data: token } = await supabase
                    .from('microsoft_tokens')
                    .select('user_id')
                    .eq('id', accountId)
                    .single();
                  return token!.user_id;
                })(),
                graph_folder_id: folder.id,
                display_name: folder.displayName,
                parent_folder_id: folder.parentFolderId,
                folder_depth: calculateDepth(folder, allFolders),
                delta_token: newDeltaToken,
                delta_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                unread_count: folder.unreadItemCount || 0,
                total_count: folder.totalItemCount || 0,
                last_synced_at: new Date().toISOString(),
                sync_status: 'ready',
              })),
              { onConflict: 'microsoft_token_id,graph_folder_id' }
            );
        }
      }
    }

    // Filter folders by depth limit
    const validFolders = allFolders.filter((folder) => {
      const depth = calculateDepth(folder, allFolders);
      return depth <= MAX_FOLDER_DEPTH;
    });

    await supabase.from('sync_log').insert({
      microsoft_token_id: accountId,
      user_id: (await supabase.from('microsoft_tokens').select('user_id').eq('id', accountId).single()).data!.user_id,
      event_type: 'folder_sync',
      message: `Synced ${validFolders.length} folders`,
      metadata: { total: allFolders.length, valid: validFolders.length },
    });

    return { success: true, folders: validFolders };
  } catch (error) {
    console.error('Folder sync error:', error);

    await supabase.from('sync_log').insert({
      microsoft_token_id: accountId,
      user_id: (await supabase.from('microsoft_tokens').select('user_id').eq('id', accountId).single()).data!.user_id,
      event_type: 'error',
      message: 'Folder sync failed',
      metadata: { error: String(error) },
    });

    return { error: 'sync_failed' };
  }
}

/**
 * Calculate folder depth in tree.
 */
function calculateDepth(folder: any, allFolders: any[]): number {
  let depth = 0;
  let currentId = folder.parentFolderId;

  while (currentId) {
    depth++;
    const parent = allFolders.find((f) => f.id === currentId);
    currentId = parent?.parentFolderId;

    if (depth > MAX_FOLDER_DEPTH) break; // Prevent infinite loops
  }

  return depth;
}

/**
 * Sync messages for a specific folder (on-demand, not upfront).
 */
export async function syncMessages(accountId: string, folderId: string) {
  const supabase = createClient();

  const tokenResult = await getValidToken(accountId);

  if (tokenResult.error) {
    return { error: tokenResult.error };
  }

  const token = tokenResult.token;

  try {
    // Fetch messages from Graph
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folderId}/messages?$top=50&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,isDraft,importance,hasAttachments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache messages
    const userId = (await supabase.from('microsoft_tokens').select('user_id').eq('id', accountId).single()).data!.user_id;

    await supabase.from('message_cache').upsert(
      data.value.map((msg: any) => ({
        microsoft_token_id: accountId,
        user_id: userId,
        graph_message_id: msg.id,
        graph_folder_id: folderId,
        subject: msg.subject,
        body_html: msg.body?.content,
        body_text: msg.bodyPreview,
        from_email: msg.from?.emailAddress?.address,
        from_name: msg.from?.emailAddress?.name,
        to_recipients: msg.toRecipients,
        cc_recipients: msg.ccRecipients,
        received_at: msg.receivedDateTime,
        is_read: msg.isRead,
        is_draft: msg.isDraft,
        importance: msg.importance,
        has_attachments: msg.hasAttachments,
        accessed_at: new Date().toISOString(),
      })),
      { onConflict: 'microsoft_token_id,graph_message_id' }
    );

    return { success: true, messages: data.value };
  } catch (error) {
    console.error('Message sync error:', error);
    return { error: 'sync_failed' };
  }
}
```

---

## Account Switch State Machine

TypeScript types and complete switch logic with AbortController.

```typescript
// lib/stores/sync-store.ts

import { create } from 'zustand';

type SyncStatus = 'idle' | 'syncing_folders' | 'syncing_messages' | 'ready' | 'error' | 'paused';

interface AccountSyncState {
  status: SyncStatus;
  abortController: AbortController | null;
  lastSyncAt: string | null;
  error: string | null;
}

interface SyncStore {
  // State
  accounts: Array<{
    id: string;
    email: string;
    displayName: string;
    needsReconnect: boolean;
  }>;
  activeAccountId: string | null;
  syncStates: Record<string, AccountSyncState>;

  // Active folder & message state
  activeFolderId: string | null;
  folders: Array<any>;
  messages: Array<any>;

  // Reading pane state
  activeMessageId: string | null;
  messageContent: { html: string; text: string } | null;
  attachments: Array<any>;

  // Actions
  setAccounts: (accounts: any[]) => void;
  switchAccount: (accountId: string) => void;
  startSync: (accountId: string) => void;
  pauseSync: (accountId: string) => void;
  setError: (accountId: string, error: string) => void;

  clearReadingPane: () => void;
  clearMessageState: () => void;
  clearFolderState: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  syncStates: {},
  activeFolderId: null,
  folders: [],
  messages: [],
  activeMessageId: null,
  messageContent: null,
  attachments: [],

  setAccounts: (accounts) => {
    set({ accounts });

    // Initialize sync states for new accounts
    const newSyncStates = { ...get().syncStates };
    accounts.forEach((account) => {
      if (!newSyncStates[account.id]) {
        newSyncStates[account.id] = {
          status: 'idle',
          abortController: null,
          lastSyncAt: null,
          error: null,
        };
      }
    });
    set({ syncStates: newSyncStates });
  },

  switchAccount: async (accountId) => {
    const { syncStates, activeAccountId } = get();

    // Step 1: Abort ALL pending requests from previous account
    if (activeAccountId && syncStates[activeAccountId]?.abortController) {
      syncStates[activeAccountId].abortController.abort();
    }

    // Step 2: Set previous account status to paused
    if (activeAccountId) {
      set({
        syncStates: {
          ...syncStates,
          [activeAccountId]: {
            ...syncStates[activeAccountId],
            status: 'paused',
            abortController: null,
          },
        },
      });
    }

    // Step 3: Clear reading pane state completely
    get().clearReadingPane();

    // Step 4: Clear message list state completely
    get().clearMessageState();

    // Step 5: Clear folder tree state completely
    get().clearFolderState();

    // Step 6: Set new activeAccountId
    set({ activeAccountId: accountId });

    // Step 7: Load new account from cache immediately (instant display)
    // This happens in UI layer via useEffect watching activeAccountId

    // Step 8: Start delta sync for new account
    get().startSync(accountId);
  },

  startSync: (accountId) => {
    const { syncStates } = get();

    const abortController = new AbortController();

    set({
      syncStates: {
        ...syncStates,
        [accountId]: {
          status: 'syncing_folders',
          abortController,
          lastSyncAt: new Date().toISOString(),
          error: null,
        },
      },
    });

    // Trigger sync (implementation depends on API routes)
    // Pass abortController.signal to all fetch calls
  },

  pauseSync: (accountId) => {
    const { syncStates } = get();

    if (syncStates[accountId]?.abortController) {
      syncStates[accountId].abortController.abort();
    }

    set({
      syncStates: {
        ...syncStates,
        [accountId]: {
          ...syncStates[accountId],
          status: 'paused',
          abortController: null,
        },
      },
    });
  },

  setError: (accountId, error) => {
    const { syncStates } = get();

    set({
      syncStates: {
        ...syncStates,
        [accountId]: {
          ...syncStates[accountId],
          status: 'error',
          error,
        },
      },
    });
  },

  clearReadingPane: () => {
    set({
      activeMessageId: null,
      messageContent: null,
      attachments: [],
    });
  },

  clearMessageState: () => {
    set({ messages: [], activeFolderId: null });
  },

  clearFolderState: () => {
    set({ folders: [] });
  },
}));

// Derived selectors
export const selectActiveAccount = (state: SyncStore) =>
  state.accounts.find((a) => a.id === state.activeAccountId);

export const selectActiveFolders = (state: SyncStore) =>
  state.folders;

export const selectActiveMessages = (state: SyncStore) =>
  state.messages;
```

---

## Unread Count Isolation

Pattern for keeping unread counts isolated per account.

```typescript
// lib/microsoft/unread-counts.ts

import { createClient } from '@/lib/supabase/server';

/**
 * Get total unread count for a specific Microsoft account.
 * NEVER sum across accounts — always filter by microsoft_token_id first.
 */
export async function getUnreadCount(accountId: string): Promise<number> {
  const supabase = createClient();

  const { data: folders, error } = await supabase
    .from('folder_sync_state')
    .select('unread_count')
    .eq('microsoft_token_id', accountId); // CRITICAL: Filter by account first

  if (error || !folders) {
    console.error('Failed to fetch unread counts:', error);
    return 0;
  }

  return folders.reduce((sum, folder) => sum + (folder.unread_count || 0), 0);
}

/**
 * Get unread counts per folder for account switcher badge.
 */
export async function getUnreadCountsByFolder(accountId: string) {
  const supabase = createClient();

  const { data: folders, error } = await supabase
    .from('folder_sync_state')
    .select('graph_folder_id, display_name, unread_count')
    .eq('microsoft_token_id', accountId)
    .gt('unread_count', 0);

  if (error) {
    console.error('Failed to fetch folder unread counts:', error);
    return [];
  }

  return folders || [];
}
```

**UI Component Example:**

```typescript
// components/account-switcher.tsx
'use client';

import { useSyncStore } from '@/lib/stores/sync-store';
import { useEffect, useState } from 'react';

export function AccountSwitcher() {
  const { accounts, activeAccountId, switchAccount } = useSyncStore();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch unread counts for all accounts
    async function fetchCounts() {
      const counts: Record<string, number> = {};

      for (const account of accounts) {
        const res = await fetch(`/api/microsoft/unread-count/${account.id}`);
        const data = await res.json();
        counts[account.id] = data.count || 0;
      }

      setUnreadCounts(counts);
    }

    fetchCounts();
  }, [accounts]);

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account) => (
        <button
          key={account.id}
          onClick={() => switchAccount(account.id)}
          className={`flex items-center justify-between p-3 rounded ${
            activeAccountId === account.id ? 'bg-blue-100' : 'bg-gray-50'
          }`}
        >
          <div>
            <p className="font-medium">{account.displayName}</p>
            <p className="text-sm text-gray-600">{account.email}</p>
          </div>

          {unreadCounts[account.id] > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCounts[account.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

---

## HOF Wrapper for Graph API Routes

API route wrapper that handles auth, token refresh, and account ownership verification.

```typescript
// lib/microsoft/api-wrapper.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidToken } from './token-manager';

type Handler = (
  req: NextRequest,
  context: { token: string; accountId: string; userId: string }
) => Promise<NextResponse>;

/**
 * HOF wrapper for Microsoft Graph API routes.
 *
 * Handles:
 * - Supabase session validation
 * - Account ownership verification (SECURITY)
 * - Token auto-refresh
 * - Error responses
 *
 * @param handler - Route handler function
 * @returns Wrapped handler
 */
export function withMicrosoftAuth(handler: Handler) {
  return async (req: NextRequest) => {
    const supabase = createClient();

    // 1. Validate Supabase session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract accountId from request
    const accountId = req.nextUrl.searchParams.get('accountId') ||
                      req.headers.get('x-account-id');

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    // 3. Verify user owns this account (SECURITY — never trust client)
    const { data: account, error: ownershipError } = await supabase
      .from('microsoft_tokens')
      .select('user_id')
      .eq('id', accountId)
      .maybeSingle();

    if (ownershipError || !account || account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Get valid token (auto-refreshes if needed)
    const tokenResult = await getValidToken(accountId);

    if (tokenResult.error) {
      if (tokenResult.error === 'needs_reconnect') {
        return NextResponse.json(
          { error: 'Account needs reconnect', accountId },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 503 }
      );
    }

    // 5. Call handler with validated context
    return handler(req, {
      token: tokenResult.token,
      accountId,
      userId: user.id,
    });
  };
}
```

**Usage Example:**

```typescript
// app/api/microsoft/folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withMicrosoftAuth } from '@/lib/microsoft/api-wrapper';

export const GET = withMicrosoftAuth(async (req, { token, accountId }) => {
  // Token is valid and auto-refreshed if needed
  // User owns this account (verified)

  const response = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Graph API error' },
      { status: response.status }
    );
  }

  const data = await response.json();

  return NextResponse.json(data);
});
```

---

## Environment Variables

Complete list of required environment variables.

```bash
# ============================================================================
# Microsoft MSAL + Graph Configuration
# ============================================================================

# Azure App Registration Credentials (SERVER-ONLY — never expose to client)
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_TENANT_ID=common  # "common" for multitenant, or specific tenant ID

# Application URL (PUBLIC — safe to expose)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Prod

# ============================================================================
# Supabase Configuration
# ============================================================================

# Supabase URL and Keys (PUBLIC — anon key is safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role Key (SERVER-ONLY — admin access, never expose)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security Notes:**
- ✅ `NEXT_PUBLIC_*` variables are embedded in client bundle — safe for URLs and anon keys
- ❌ `MICROSOFT_CLIENT_SECRET` is server-only — NEVER use `NEXT_PUBLIC_` prefix
- ❌ `SUPABASE_SERVICE_ROLE_KEY` is server-only — bypasses RLS, never expose

---

## Common Mistakes to NEVER Make

These are the specific bugs that cause production failures. CodeBakers must avoid ALL of these.

### 1. ❌ Not Aborting Previous Account Requests on Switch

**The Bug:**
```typescript
// ❌ WRONG — requests from Account A still run after switching to Account B
function switchAccount(newAccountId) {
  setActiveAccountId(newAccountId);
  fetchFolders(newAccountId); // Account B folders loading
  // Account A requests still running in background!
}
```

**The Fix:**
```typescript
// ✅ CORRECT — abort all pending requests before switching
function switchAccount(newAccountId) {
  const { syncStates, activeAccountId } = get();

  // Abort previous account requests
  if (activeAccountId && syncStates[activeAccountId]?.abortController) {
    syncStates[activeAccountId].abortController.abort();
  }

  setActiveAccountId(newAccountId);
  fetchFolders(newAccountId); // Only Account B requests run
}
```

---

### 2. ❌ Using .single() Instead of .maybeSingle()

**The Bug:**
```typescript
// ❌ WRONG — throws error if no rows found
const { data } = await supabase
  .from('microsoft_tokens')
  .select('*')
  .eq('id', accountId)
  .single(); // Throws if account deleted
```

**The Fix:**
```typescript
// ✅ CORRECT — returns null if no rows, no error
const { data } = await supabase
  .from('microsoft_tokens')
  .select('*')
  .eq('id', accountId)
  .maybeSingle(); // Returns null safely
```

---

### 3. ❌ Mixing Unread Counts Across Accounts

**The Bug:**
```typescript
// ❌ WRONG — sums ALL folders across ALL accounts
const { data } = await supabase
  .from('folder_sync_state')
  .select('unread_count'); // NO FILTER!

const total = data.reduce((sum, f) => sum + f.unread_count, 0);
// Shows Account A + Account B + Account C combined
```

**The Fix:**
```typescript
// ✅ CORRECT — filter by account FIRST
const { data } = await supabase
  .from('folder_sync_state')
  .select('unread_count')
  .eq('microsoft_token_id', accountId); // Filter by account

const total = data.reduce((sum, f) => sum + f.unread_count, 0);
// Shows only this account's unread count
```

---

### 4. ❌ Not Storing offline_access Scope (Loses Refresh Token)

**The Bug:**
```typescript
// ❌ WRONG — missing offline_access scope
const SCOPES = [
  'User.Read',
  'Mail.Read',
  // Missing: 'offline_access'
].join(' ');

// Result: No refresh_token returned → user must re-auth every hour
```

**The Fix:**
```typescript
// ✅ CORRECT — include offline_access
const SCOPES = [
  'offline_access', // CRITICAL: Enables refresh tokens
  'User.Read',
  'Mail.Read',
].join(' ');

// Result: Refresh token stored → silent token refresh works
```

---

### 5. ❌ Not Handling 410 Delta Token Expiry

**The Bug:**
```typescript
// ❌ WRONG — crashes on delta token expiry
const response = await fetch(deltaUrl, { headers: { Authorization: token } });
const data = await response.json(); // 410 Gone → app breaks
```

**The Fix:**
```typescript
// ✅ CORRECT — detect 410, clear delta token, full resync
const response = await fetch(deltaUrl, { headers: { Authorization: token } });

if (response.status === 410) {
  // Delta token expired — clear and resync
  await supabase
    .from('folder_sync_state')
    .update({ delta_token: null })
    .eq('microsoft_token_id', accountId);

  return syncFolders(accountId); // Restart without delta token
}
```

---

### 6. ❌ Fetching All Folders' Messages Upfront Instead of On-Demand

**The Bug:**
```typescript
// ❌ WRONG — fetches messages for ALL folders on login
async function syncAccount(accountId) {
  const folders = await fetchFolders(accountId);

  for (const folder of folders) {
    await fetchMessages(accountId, folder.id); // 50+ API calls!
  }
}
// Result: slow login, API rate limits, wasted bandwidth
```

**The Fix:**
```typescript
// ✅ CORRECT — fetch folders only, messages on-demand
async function syncAccount(accountId) {
  await fetchFolders(accountId); // Fast

  // Messages loaded only when user clicks a folder
}

// When user clicks folder:
async function onFolderClick(folderId) {
  await fetchMessages(accountId, folderId); // Single targeted request
}
```

---

### 7. ❌ Trusting Client-Provided accountId Without Verifying Ownership

**The Bug:**
```typescript
// ❌ WRONG — no ownership check (SECURITY HOLE)
export async function GET(req: Request) {
  const accountId = req.nextUrl.searchParams.get('accountId');

  // User can pass ANY accountId — including other users' accounts!
  const token = await getValidToken(accountId);
  // Attacker reads other users' emails
}
```

**The Fix:**
```typescript
// ✅ CORRECT — verify user owns this account
export async function GET(req: Request) {
  const { user } = await supabase.auth.getUser();
  const accountId = req.nextUrl.searchParams.get('accountId');

  // Verify ownership
  const { data: account } = await supabase
    .from('microsoft_tokens')
    .select('user_id')
    .eq('id', accountId)
    .maybeSingle();

  if (!account || account.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Safe to proceed
}
```

---

### 8. ❌ Not Clearing Reading Pane on Account Delete

**The Bug:**
```typescript
// ❌ WRONG — delete account but reading pane shows deleted account's message
async function deleteAccount(accountId) {
  await supabase.from('microsoft_tokens').delete().eq('id', accountId);
  // Reading pane still shows message from deleted account!
}
```

**The Fix:**
```typescript
// ✅ CORRECT — clear all UI state tied to deleted account
async function deleteAccount(accountId) {
  // Clear reading pane if showing message from this account
  if (activeAccountId === accountId) {
    clearReadingPane();
    clearMessageState();
    clearFolderState();
  }

  await supabase.from('microsoft_tokens').delete().eq('id', accountId);

  // Switch to another account or null
  setActiveAccountId(accounts.filter(a => a.id !== accountId)[0]?.id || null);
}
```

---

### 9. ❌ Not Filtering Mutations by BOTH id AND user_id

**The Bug:**
```typescript
// ❌ WRONG — filters by id only
await supabase
  .from('microsoft_tokens')
  .update({ needs_reconnect: true })
  .eq('id', accountId);
// If accountId is somehow wrong, could update another user's account
```

**The Fix:**
```typescript
// ✅ CORRECT — filter by BOTH id AND user_id
await supabase
  .from('microsoft_tokens')
  .update({ needs_reconnect: true })
  .eq('id', accountId)
  .eq('user_id', user.id); // Double verification
```

---

### 10. ❌ No Retry Logic for Network Failures

**The Bug:**
```typescript
// ❌ WRONG — single attempt, fails permanently on network hiccup
const response = await fetch(graphUrl, { headers: { Authorization: token } });
// Network blip → entire sync fails → user sees stale data
```

**The Fix:**
```typescript
// ✅ CORRECT — retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) return response;

      // Don't retry on 4xx errors (client error)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry on 5xx (server error)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
        continue;
      }
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }

  throw new Error('Max retries exceeded');
}
```

---

### 11. ❌ Storing Delta Token Without Expiry Tracking

**The Bug:**
```typescript
// ❌ WRONG — stores delta token but no expiry
await supabase.from('folder_sync_state').update({
  delta_token: newToken,
  // Missing: delta_token_expires_at
});

// 30 days later: 410 Gone error with no warning
```

**The Fix:**
```typescript
// ✅ CORRECT — store expiry, proactively clear before it expires
await supabase.from('folder_sync_state').update({
  delta_token: newToken,
  delta_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});

// Before syncing: check if token is near expiry
const expiresAt = new Date(folder.delta_token_expires_at);
if (expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  // Within 1 day of expiry — clear and full resync
  await supabase.from('folder_sync_state').update({ delta_token: null });
}
```

---

### 12. ❌ Hardcoding /common Tenant Without Understanding Multi-Tenant Flow

**The Bug:**
```typescript
// ❌ WRONG — using specific tenant blocks personal accounts
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
// If tenantId is a specific org → personal accounts (@outlook.com) are blocked
```

**The Fix:**
```typescript
// ✅ CORRECT — use "common" for work + personal accounts
const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`;
// Accepts: @company.com (work), @outlook.com (personal), @hotmail.com (personal)
```

---

## Dependency Map Annotations

When using this pattern, these entities are affected. Update your DEPENDENCY-MAP.md:

```markdown
## microsoft_tokens
**Stores:** useSyncStore (accounts, activeAccountId)
**Active state field:** activeAccountId
**Last-item behavior:** If deleting last account → activeAccountId = null, show empty state
**Components that read:** AccountSwitcher, SyncStatus, ReconnectBanner

## folder_sync_state
**Stores:** useSyncStore (folders)
**Active state field:** activeFolderId
**Last-item behavior:** If all folders gone → show empty state
**Components that read:** FolderTree, FolderList, UnreadBadge

## message_cache
**Stores:** useSyncStore (messages, activeMessageId, messageContent)
**Active state field:** activeMessageId
**Last-item behavior:** If last message deleted → clear reading pane
**Components that read:** MessageList, ReadingPane, MessageViewer
```

---

## Sync Intervals (Background Polling)

```typescript
// lib/microsoft/sync-scheduler.ts

import { syncFolders } from './delta-sync';

/**
 * Background sync scheduler.
 * Active account: every 60 seconds
 * Inactive accounts: every 5 minutes
 */
export function startSyncScheduler(accounts: Array<{ id: string }>, activeAccountId: string) {
  const intervals: Record<string, NodeJS.Timeout> = {};

  accounts.forEach((account) => {
    const interval = account.id === activeAccountId ? 60_000 : 300_000;

    intervals[account.id] = setInterval(() => {
      syncFolders(account.id);
    }, interval);
  });

  // Cleanup function
  return () => {
    Object.values(intervals).forEach(clearInterval);
  };
}
```

---

## Checklist Before Shipping

- [ ] Azure App Registration created with correct redirect URIs (dev + prod)
- [ ] All 7 required scopes added (including `offline_access`)
- [ ] Admin consent granted for API permissions
- [ ] Supabase schema deployed with all 4 tables + RLS policies
- [ ] Environment variables set in `.env` and Vercel/production
- [ ] Token refresh logic tested (simulate expiry by setting `expires_at` to past)
- [ ] Delta token expiry handling tested (simulate 410 Gone response)
- [ ] Account switch tested (no race conditions, reading pane clears)
- [ ] Account limit enforced (max 3 accounts)
- [ ] Unread counts isolated per account (not mixed)
- [ ] Security: API routes verify account ownership before processing
- [ ] Error recovery: reconnect banner shows when token refresh fails
- [ ] Message cache TTL cleanup scheduled (7 days)
- [ ] Sync intervals configured (60s active, 5min inactive)
- [ ] AbortController used in all fetch calls for account switch cleanup

---

**This is the production pattern. Use it on every Microsoft-connected app BotMakers builds.**
