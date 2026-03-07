/**
 * codebakers_generate_unit_tests
 *
 * Vitest Unit Test Generator
 *
 * Generates unit tests for components, stores, and API routes
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function generateUnitTests(args) {
    const cwd = process.cwd();
    const { file_path, test_type } = args;
    const testPath = file_path.replace(/\.(tsx?|js)$/, '.test.$1');
    let code = '';
    if (test_type === 'component') {
        code = `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from './component';

describe('Component', () => {
  it('renders loading state', () => {
    render(<Component />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<Component />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<Component />);
    expect(screen.getByText(/No items/)).toBeInTheDocument();
  });

  it('renders success state', () => {
    render(<Component />);
    expect(screen.getByText('Item')).toBeInTheDocument();
  });
});
`;
    }
    else if (test_type === 'store') {
        code = `import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from './store';

describe('Store', () => {
  beforeEach(() => {
    useStore.setState({ items: [], loading: false, error: null });
  });

  it('fetches items', async () => {
    const { result } = renderHook(() => useStore());
    await act(async () => {
      await result.current.fetchItems();
    });
    expect(result.current.items).toHaveLength(0);
  });
});
`;
    }
    else {
        code = `import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('API Route', () => {
  it('returns data', async () => {
    const req = new Request('http://localhost/api/test');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
`;
    }
    const fullPath = path.join(cwd, testPath);
    await fs.writeFile(fullPath, code, 'utf-8');
    return `🍞 CodeBakers: Unit Tests Generated

**File:** ${testPath}
**Type:** ${test_type}

✅ Test file created (Vitest)`;
}
//# sourceMappingURL=generate-unit-tests.js.map