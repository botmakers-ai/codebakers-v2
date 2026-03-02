#!/usr/bin/env ts-node
/**
 * CodeBakers V4 — Dependency Map Generator
 * scripts/generate-dep-map.ts
 *
 * Scans the actual codebase and writes .codebakers/DEPENDENCY-MAP.md
 * This file is GENERATED — never edit it by hand.
 *
 * Usage:
 *   pnpm dep:map           — generate map
 *   pnpm dep:map --debug   — generate map + print what was found
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, '.codebakers', 'DEPENDENCY-MAP.md');
const DEBUG = process.argv.includes('--debug');

function debug(msg: string) { if (DEBUG) console.log(`  [debug] ${msg}`); }
function log(msg: string) { console.log(msg); }

// ─── Auto-discover store directories ─────────────────────────────────────────

function discoverStoreDirs(): string[] {
  log('🍞 CodeBakers: Auto-discovering store locations...');
  const found = new Set<string>();

  // Strategy 1: Files that import from zustand
  for (const pattern of ["from 'zustand'", "from 'zustand/middleware'"]) {
    try {
      const result = execSync(
        `grep -r "${pattern}" . --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v node_modules | grep -v .next`,
        { encoding: 'utf-8', cwd: ROOT }
      ).trim();
      for (const file of result.split('\n').filter(Boolean)) {
        found.add(path.dirname(path.join(ROOT, file)));
      }
    } catch { /* not found */ }
  }

  // Strategy 2: Files named *store*
  try {
    const result = execSync(
      `find . \\( -name "*store*" -o -name "*Store*" \\) 2>/dev/null | grep -v node_modules | grep -v .next | grep -E "\\.(ts|tsx)$"`,
      { encoding: 'utf-8', cwd: ROOT }
    ).trim();
    for (const file of result.split('\n').filter(Boolean)) {
      found.add(path.dirname(path.join(ROOT, file)));
    }
  } catch { /* not found */ }

  // Strategy 3: Common fallback locations
  for (const f of ['src/stores', 'src/store', 'lib/stores', 'lib/store', 'store', 'stores']) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) found.add(full);
  }

  const dirs = [...found].filter(d => fs.existsSync(d));
  if (dirs.length === 0) log('  ⚠️  No store directories found. Is this a new project?');
  else for (const d of dirs) debug(`Store dir: ${path.relative(ROOT, d)}`);
  return dirs;
}

function discoverComponentDirs(): string[] {
  const dirs = ['src/components', 'src/app', 'src/pages', 'src/features', 'src/views', 'components', 'app', 'pages']
    .map(d => path.join(ROOT, d)).filter(d => fs.existsSync(d));
  for (const d of dirs) debug(`Component dir: ${path.relative(ROOT, d)}`);
  return dirs;
}

function discoverHookDirs(): string[] {
  const dirs = ['src/hooks', 'lib/hooks', 'hooks']
    .map(d => path.join(ROOT, d)).filter(d => fs.existsSync(d));
  for (const d of dirs) debug(`Hook dir: ${path.relative(ROOT, d)}`);
  return dirs;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreFile { name: string; file: string; entities: string[]; }
interface ComponentFile { name: string; file: string; storesUsed: string[]; entitiesRendered: string[]; }
interface EntityMap { entity: string; stores: string[]; components: string[]; hooks: string[]; activeStateField: string | null; lastItemBehavior: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAllFiles(dir: string, exts = ['.ts', '.tsx']): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && !['node_modules', '.next'].includes(entry.name)) walk(full);
      else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) results.push(full);
    }
  };
  walk(dir);
  return results;
}

function readFile(p: string): string { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } }
function rel(p: string): string { return path.relative(ROOT, p); }

function extractStoreName(content: string, filePath: string): string {
  const m = content.match(/export\s+const\s+(use\w+Store)\s*=/) || content.match(/export\s+const\s+(\w+Store)\s*=/);
  if (m) return m[1];
  const base = path.basename(filePath, path.extname(filePath));
  const camel = base.split(/[-_]/).map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return camel.startsWith('use') ? camel : `use${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

function extractEntities(content: string): string[] {
  const entities = new Set<string>();
  for (const m of content.matchAll(/(?:interface|type)\s+([A-Z][a-zA-Z]+)\s*[={<]/g)) entities.add(m[1]);
  for (const m of content.matchAll(/const\s+([A-Z][a-zA-Z]+)Schema\s*=/g)) entities.add(m[1]);
  for (const m of content.matchAll(/\b\w+s?\s*:\s*([A-Z][a-zA-Z]+)\[\]/g)) entities.add(m[1]);
  for (const m of content.matchAll(/active([A-Z][a-zA-Z]+)Id|selected([A-Z][a-zA-Z]+)Id|current([A-Z][a-zA-Z]+)(?:Id)?/g)) {
    const e = m[1] || m[2] || m[3]; if (e) entities.add(e);
  }
  const skip = new Set(['String', 'Number', 'Boolean', 'Object', 'Array', 'Promise', 'Error', 'Date', 'Set', 'Map']);
  return [...entities].filter(e => e.length > 2 && !skip.has(e));
}

function extractStoresUsed(content: string): string[] {
  const stores = new Set<string>();
  for (const m of content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*['"]/g)) {
    for (const name of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim())) {
      if (name.match(/use\w+Store/)) stores.add(name);
    }
  }
  for (const m of content.matchAll(/\b(use\w+Store)\s*[.(]/g)) stores.add(m[1]);
  return [...stores];
}

function findActiveField(entity: string, contents: Map<string, string>): string | null {
  for (const [, c] of contents) {
    for (const p of [`active${entity}Id`, `selected${entity}Id`, `current${entity}Id`, `active${entity}`, `selected${entity}`]) {
      if (c.includes(p)) return p;
    }
  }
  return null;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

function scan() {
  const storeDirs = discoverStoreDirs();
  const componentDirs = discoverComponentDirs();
  const hookDirs = discoverHookDirs();

  const storeFiles: StoreFile[] = [];
  const storeContents = new Map<string, string>();

  for (const dir of storeDirs) {
    for (const file of getAllFiles(dir)) {
      const content = readFile(file);
      storeContents.set(file, content);
      const name = extractStoreName(content, file);
      const entities = extractEntities(content);
      storeFiles.push({ name, file: rel(file), entities });
      debug(`Store: ${name} → entities: ${entities.join(', ') || 'none'}`);
    }
  }

  const componentFiles: ComponentFile[] = [];
  for (const file of [...componentDirs, ...hookDirs].flatMap(d => getAllFiles(d))) {
    const content = readFile(file);
    const storesUsed = extractStoresUsed(content);
    if (storesUsed.length === 0) continue;
    const name = path.basename(file, path.extname(file));
    const entitiesRendered = [...new Set(
      storesUsed.flatMap(s => storeFiles.find(sf => sf.name === s)?.entities ?? [])
    )];
    componentFiles.push({ name, file: rel(file), storesUsed, entitiesRendered });
    debug(`Component: ${name} → stores: ${storesUsed.join(', ')}`);
  }

  const allEntities = new Set(storeFiles.flatMap(s => s.entities));
  const entityMap: EntityMap[] = [];

  for (const entity of allEntities) {
    const stores = storeFiles.filter(s => s.entities.includes(entity)).map(s => s.name);
    const components = componentFiles.filter(c => !c.file.includes('hook') && c.storesUsed.some(s => stores.includes(s))).map(c => c.name);
    const hooks = componentFiles.filter(c => c.file.includes('hook') && c.storesUsed.some(s => stores.includes(s))).map(c => c.name);
    entityMap.push({
      entity,
      stores: [...new Set(stores)],
      components: [...new Set(components)],
      hooks: [...new Set(hooks)],
      activeStateField: findActiveField(entity, storeContents),
      lastItemBehavior: '— (set manually)',
    });
  }

  return { storeFiles, componentFiles, entityMap };
}

// ─── Write ────────────────────────────────────────────────────────────────────

function writeMap(storeFiles: StoreFile[], componentFiles: ComponentFile[], entityMap: EntityMap[]) {
  const now = new Date().toISOString().split('T')[0];
  let gitHash = 'unknown';
  try { gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim(); } catch { /* ok */ }

  const L: string[] = [];
  L.push(`# CodeBakers Dependency Map`);
  L.push(`# GENERATED — never edit by hand. Run \`pnpm dep:map\` to regenerate.`);
  L.push(`# Last generated: ${now} | git: ${gitHash}`);
  L.push(`# Debug: pnpm dep:map --debug`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## Entity → Store → Component Map`);
  L.push(``);

  if (entityMap.length === 0) {
    L.push(`*No entities found yet. Map will populate as stores are created.*`);
  } else {
    L.push(`| Entity | Stores | Components | Hooks | Active State Field | Last-Item Behavior |`);
    L.push(`|--------|--------|------------|-------|-------------------|-------------------|`);
    for (const e of entityMap.sort((a, b) => a.entity.localeCompare(b.entity))) {
      L.push(`| ${e.entity} | ${e.stores.join(', ') || '—'} | ${e.components.slice(0, 5).join(', ') || '—'} | ${e.hooks.join(', ') || '—'} | ${e.activeStateField || '—'} | ${e.lastItemBehavior} |`);
    }
  }

  L.push(``); L.push(`---`); L.push(``);
  L.push(`## Store Inventory`); L.push(``);

  if (storeFiles.length === 0) {
    L.push(`*No stores found yet.*`);
  } else {
    for (const s of storeFiles.sort((a, b) => a.name.localeCompare(b.name))) {
      L.push(`### ${s.name}`);
      L.push(`File: \`${s.file}\``);
      L.push(`Entities: ${s.entities.join(', ') || '—'}`);
      L.push(``);
    }
  }

  L.push(`---`); L.push(``);
  L.push(`## Component → Store Usage`); L.push(``);

  if (componentFiles.length === 0) {
    L.push(`*No store-connected components found yet.*`);
  } else {
    L.push(`| Component | File | Stores Used |`);
    L.push(`|-----------|------|-------------|`);
    for (const c of componentFiles.sort((a, b) => a.name.localeCompare(b.name))) {
      L.push(`| ${c.name} | \`${c.file}\` | ${c.storesUsed.join(', ')} |`);
    }
  }

  L.push(``); L.push(`---`); L.push(``);
  L.push(`## How to Use This Map`); L.push(``);
  L.push(`**Before any mutation:** Find entity → update ALL stores → handle active state → handle last-item behavior`);
  L.push(`**After new store/component added:** \`pnpm dep:map\` immediately`);
  L.push(`**Map feels stale:** \`pnpm dep:map\` — reads actual code, cannot lie`);
  L.push(`**Unexpected results:** \`pnpm dep:map --debug\` to see exactly what was scanned`);
  L.push(``);
  L.push(`---`);
  L.push(`*Generated by scripts/generate-dep-map.ts | CodeBakers V4*`);

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT, L.join('\n'), 'utf-8');
}

// ─── Run ──────────────────────────────────────────────────────────────────────

log(`🍞 CodeBakers: Generating dependency map...`);
if (DEBUG) log(`  Debug mode ON — printing scan details`);

const { storeFiles, componentFiles, entityMap } = scan();
writeMap(storeFiles, componentFiles, entityMap);

log(`🍞 CodeBakers: Dependency map written → .codebakers/DEPENDENCY-MAP.md`);
log(`   ${entityMap.length} entities | ${storeFiles.length} stores | ${componentFiles.length} store-connected components`);
if (storeFiles.length === 0) log(`   ℹ️  No stores found. Run with --debug if unexpected.`);
