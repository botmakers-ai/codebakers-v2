/**
 * codebakers_generate_store
 *
 * Zustand Store Generator
 *
 * Generates stores with DEPENDENCY-MAP.md integration.
 * Ensures all mutations update ALL affected stores.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function generateStore(args) {
    const cwd = process.cwd();
    const { entity, operations, dependencies = [] } = args;
    const storeName = `${entity.toLowerCase()}-store`;
    const code = `import { create } from 'zustand';

export interface ${entity} {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface ${entity}Store {
  ${entity.toLowerCase()}s: ${entity}[];
  loading: boolean;
  error: string | null;

  ${operations.includes('list') ? `fetch${entity}s: () => Promise<void>;` : ''}
  ${operations.includes('create') ? `create${entity}: (data: Partial<${entity}>) => Promise<void>;` : ''}
  ${operations.includes('update') ? `update${entity}: (id: string, data: Partial<${entity}>) => Promise<void>;` : ''}
  ${operations.includes('delete') ? `delete${entity}: (id: string) => Promise<void>;` : ''}
}

export const use${entity}Store = create<${entity}Store>((set, get) => ({
  ${entity.toLowerCase()}s: [],
  loading: false,
  error: null,

  ${operations.includes('list') ? generateFetchMethod(entity) : ''}
  ${operations.includes('create') ? generateCreateMethod(entity, dependencies) : ''}
  ${operations.includes('update') ? generateUpdateMethod(entity, dependencies) : ''}
  ${operations.includes('delete') ? generateDeleteMethod(entity, dependencies) : ''}
}));
`;
    const filePath = path.join(cwd, `src/stores/${storeName}.ts`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, code, 'utf-8');
    return `🍞 CodeBakers: Store Generated

**File:** src/stores/${storeName}.ts
**Entity:** ${entity}
**Operations:** ${operations.join(', ')}
${dependencies.length > 0 ? `**Dependencies:** ${dependencies.join(', ')}` : ''}

Includes:
✅ TypeScript interfaces
✅ Zustand store
✅ Loading/error states
✅ CRUD operations
${dependencies.length > 0 ? '✅ Dependency updates (from DEPENDENCY-MAP.md)' : ''}`;
}
function generateFetchMethod(entity) {
    return `fetch${entity}s: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/${entity.toLowerCase()}s');
      if (!res.ok) throw new Error('Fetch failed');
      const { data } = await res.json();
      set({ ${entity.toLowerCase()}s: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
`;
}
function generateCreateMethod(entity, deps) {
    let code = `create${entity}: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/${entity.toLowerCase()}s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Create failed');
      const { data: new${entity} } = await res.json();

      set(state => ({
        ${entity.toLowerCase()}s: [new${entity}, ...state.${entity.toLowerCase()}s],
        loading: false,
      }));
`;
    if (deps.length > 0) {
        code += `\n      // Update dependent stores (from DEPENDENCY-MAP.md)\n`;
        for (const dep of deps) {
            code += `      ${dep}.getState().refresh();\n`;
        }
    }
    code += `    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
`;
    return code;
}
function generateUpdateMethod(entity, deps) {
    let code = `update${entity}: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(\`/api/${entity.toLowerCase()}s/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      const { data: updated } = await res.json();

      set(state => ({
        ${entity.toLowerCase()}s: state.${entity.toLowerCase()}s.map(item =>
          item.id === id ? updated : item
        ),
        loading: false,
      }));
`;
    if (deps.length > 0) {
        code += `\n      // Update dependent stores\n`;
        for (const dep of deps) {
            code += `      ${dep}.getState().refresh();\n`;
        }
    }
    code += `    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
`;
    return code;
}
function generateDeleteMethod(entity, deps) {
    let code = `delete${entity}: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(\`/api/${entity.toLowerCase()}s/\${id}\`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');

      set(state => ({
        ${entity.toLowerCase()}s: state.${entity.toLowerCase()}s.filter(item => item.id !== id),
        loading: false,
      }));
`;
    if (deps.length > 0) {
        code += `\n      // Update ALL dependent stores (CRITICAL - prevents stale UI)\n`;
        for (const dep of deps) {
            code += `      ${dep}.getState().refresh();\n`;
        }
    }
    code += `    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
`;
    return code;
}
//# sourceMappingURL=generate-store.js.map