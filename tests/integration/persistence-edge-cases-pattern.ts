/**
 * Persistence Edge Case Test Pattern -- In-Memory DB Simulator
 *
 * This file demonstrates a pattern for testing persistence logic without
 * a real database. It creates an in-memory simulator that mimics Supabase's
 * chainable query API, enabling full end-to-end testing of:
 *   - CRUD operations
 *   - Race conditions (concurrent saves)
 *   - Data loss scenarios (save during navigation)
 *   - RLS (row-level security) simulation
 *   - Offline/reconnection edge cases
 *
 * HOW TO USE THIS PATTERN:
 * 1. Copy the in-memory simulator pattern
 * 2. Replace table/column names with your schema
 * 3. Mock your Supabase client to use this simulator
 * 4. Write tests that exercise your persistence functions
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

// ---------------------------------------------------------------------------
// Example: In-Memory Supabase Simulator
// ---------------------------------------------------------------------------

interface GenericRow {
  id: string;
  user_id?: string;
  data?: Record<string, unknown>;
  updated_at: string;
  [key: string]: unknown;
}

interface InMemoryDb {
  tables: Map<string, Map<string, GenericRow>>;
  currentUserId: string;
  rlsEnabled: boolean;
}

function createInMemoryDb(): InMemoryDb {
  return {
    tables: new Map(),
    currentUserId: 'user-default',
    rlsEnabled: false,
  };
}

function resetDb(db: InMemoryDb): void {
  db.tables.clear();
  db.currentUserId = 'user-default';
  db.rlsEnabled = false;
}

function ensureTable(db: InMemoryDb, name: string): Map<string, GenericRow> {
  if (!db.tables.has(name)) db.tables.set(name, new Map());
  return db.tables.get(name)!;
}

// ---------------------------------------------------------------------------
// Chainable Query Builder (mimics Supabase client)
// ---------------------------------------------------------------------------

function makeBuilder(db: InMemoryDb, tableName: string) {
  const table = ensureTable(db, tableName);
  type Filter = { column: string; value: unknown };
  const filters: Filter[] = [];
  let operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: Record<string, unknown> | null = null;

  const applyFilters = (rows: GenericRow[]): GenericRow[] => {
    let out = rows.slice();
    for (const f of filters) out = out.filter(r => r[f.column] === f.value);
    if (db.rlsEnabled) out = out.filter(r => r.user_id === db.currentUserId);
    return out;
  };

  const builder = {
    select(_fields?: string) { operation = 'select'; return builder; },
    insert(data: Record<string, unknown> | Record<string, unknown>[]) {
      operation = 'insert';
      payload = Array.isArray(data) ? data[0] : data;
      return builder;
    },
    update(data: Record<string, unknown>) { operation = 'update'; payload = data; return builder; },
    delete() { operation = 'delete'; return builder; },
    eq(col: string, val: unknown) { filters.push({ column: col, value: val }); return builder; },
    order(_col: string, _opts?: { ascending?: boolean }) { return builder; },
    limit(_n: number) { return builder; },

    async single(): Promise<{ data: GenericRow | null; error: unknown }> {
      if (operation === 'select') {
        const rows = applyFilters(Array.from(table.values()));
        return { data: rows[0] ?? null, error: null };
      }
      return { data: null, error: null };
    },

    async then(resolve: (value: { data: unknown; error: unknown }) => void) {
      const now = new Date().toISOString();

      if (operation === 'insert' && payload) {
        const id = (payload.id as string) || `auto-${Math.random().toString(36).slice(2, 10)}`;
        const row: GenericRow = { ...payload, id, user_id: (payload.user_id as string) || db.currentUserId, updated_at: now } as GenericRow;
        table.set(id, row);
        resolve({ data: [row], error: null });
        return;
      }

      if (operation === 'update' && payload) {
        const rows = applyFilters(Array.from(table.values()));
        for (const r of rows) {
          const merged = { ...r, ...payload, updated_at: now } as GenericRow;
          table.set(r.id, merged);
        }
        resolve({ data: null, error: null });
        return;
      }

      if (operation === 'delete') {
        const rows = applyFilters(Array.from(table.values()));
        for (const r of rows) table.delete(r.id);
        resolve({ data: null, error: null });
        return;
      }

      // select
      const rows = applyFilters(Array.from(table.values()));
      resolve({ data: rows, error: null });
    },
  };

  return builder;
}

// ---------------------------------------------------------------------------
// Example Mock Supabase Client
// ---------------------------------------------------------------------------

function createMockSupabaseClient(db: InMemoryDb) {
  return {
    from: (tableName: string) => makeBuilder(db, tableName),
    // Add storage mock, auth mock, etc. as needed
  };
}

// ---------------------------------------------------------------------------
// Example Test Cases (adapt for your persistence layer)
// ---------------------------------------------------------------------------
//
// import { describe, it, expect, beforeEach } from 'vitest';
//
// describe('Persistence Edge Cases', () => {
//   const db = createInMemoryDb();
//   const client = createMockSupabaseClient(db);
//
//   beforeEach(() => resetDb(db));
//
//   it('saves and loads a record', async () => {
//     await client.from('projects').insert({ id: 'p1', name: 'Test', data: { theme: 'dark' } });
//     const { data } = await client.from('projects').select().eq('id', 'p1').single();
//     expect(data).not.toBeNull();
//     expect(data!.name).toBe('Test');
//   });
//
//   it('concurrent saves - last write wins', async () => {
//     await client.from('projects').insert({ id: 'p1', name: 'Version 1' });
//     // Simulate two concurrent updates
//     await Promise.all([
//       client.from('projects').update({ name: 'Version A' }).eq('id', 'p1'),
//       client.from('projects').update({ name: 'Version B' }).eq('id', 'p1'),
//     ]);
//     const { data } = await client.from('projects').select().eq('id', 'p1').single();
//     // One of A or B wins -- the important thing is no data loss
//     expect(['Version A', 'Version B']).toContain(data!.name);
//   });
//
//   it('RLS prevents cross-user access', async () => {
//     db.rlsEnabled = true;
//     db.currentUserId = 'user-alice';
//     await client.from('projects').insert({ id: 'p1', name: 'Alice Project' });
//     db.currentUserId = 'user-bob';
//     const { data } = await client.from('projects').select().eq('id', 'p1').single();
//     expect(data).toBeNull(); // Bob can't see Alice's project
//   });
//
//   it('delete removes the record', async () => {
//     await client.from('projects').insert({ id: 'p1', name: 'To Delete' });
//     await client.from('projects').delete().eq('id', 'p1');
//     const { data } = await client.from('projects').select().eq('id', 'p1').single();
//     expect(data).toBeNull();
//   });
// });

// Export for use in actual test files
export { createInMemoryDb, resetDb, createMockSupabaseClient, type InMemoryDb };
