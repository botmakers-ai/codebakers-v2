/**
 * codebakers_generate_api_route
 *
 * API Route Generator
 *
 * Generates Next.js API routes with:
 * - Supabase integration
 * - Security filters (user_id)
 * - Error handling
 * - TypeScript types
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface RouteArgs {
  entity: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
}

export async function generateApiRoute(args: RouteArgs): Promise<string> {
  const cwd = process.cwd();
  const { entity, operation } = args;

  const tableName = entity.toLowerCase() + 's';
  const routePath = operation === 'list' || operation === 'create'
    ? `src/app/api/${tableName}/route.ts`
    : `src/app/api/${tableName}/[id]/route.ts`;

  let code = '';

  if (operation === 'list') {
    code = generateListRoute(entity, tableName);
  } else if (operation === 'get') {
    code = generateGetRoute(entity, tableName);
  } else if (operation === 'create') {
    code = generateCreateRoute(entity, tableName);
  } else if (operation === 'update') {
    code = generateUpdateRoute(entity, tableName);
  } else if (operation === 'delete') {
    code = generateDeleteRoute(entity, tableName);
  }

  const fullPath = path.join(cwd, routePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, code, 'utf-8');

  return `🍞 CodeBakers: API Route Generated

**File:** ${routePath}
**Entity:** ${entity}
**Operation:** ${operation}

Includes:
✅ Authentication check
✅ Security filter (user_id)
✅ Error handling
✅ TypeScript types
✅ Supabase integration
✅ Uses .maybeSingle() (not .single())`;
}

function generateListRoute(entity: string, table: string): string {
  return `import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('${table}')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
`;
}

function generateGetRoute(entity: string, table: string): string {
  return `import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('${table}')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
`;
}

function generateCreateRoute(entity: string, table: string): string {
  return `import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from('${table}')
    .insert({
      ...body,
      user_id: user.id,
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
`;
}

function generateUpdateRoute(entity: string, table: string): string {
  return `import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from('${table}')
    .update(body)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
`;
}

function generateDeleteRoute(entity: string, table: string): string {
  return `import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('${table}')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
`;
}
