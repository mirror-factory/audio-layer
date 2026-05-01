/**
 * RLS isolation integration suite (PROD-329).
 *
 * Real Supabase local (`supabase start`) is NOT available in this CI sandbox
 * (no Docker daemon, no `supabase` CLI). When that bootable environment lands
 * we should add a parallel suite gated by `process.env.SUPABASE_LOCAL === "1"`
 * that runs the same scenarios against the real Postgres + RLS engine.
 *
 * Until then this file mocks `@supabase/supabase-js` so the assertions still
 * pin down:
 *   - owner can read their own rows
 *   - wrong-user is denied (returns nothing or a row-level-security error)
 *   - service-role paths always stamp `user_id` themselves rather than
 *     trusting RLS, because the service role bypasses RLS.
 *
 * The schema we are modeling lives in `lib/supabase/schema.sql`:
 *   - `meetings`        (RLS: owner-only select/insert/update/delete)
 *   - `profiles`        (RLS: owner-only select; service-role for writes)
 *   - `calendar_connections` (RLS: owner-only select/delete)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureUsers } from "../fixtures/users";
import {
  fixtureMeetingList,
  meetingsForUser,
} from "../fixtures/meetings";

// ---------------------------------------------------------------------------
// Tiny RLS-emulating fake Supabase client.
//
// `mode: "user"` filters every read by `currentUserId` -- this is what the
// real Postgres RLS policy `auth.uid() = user_id` does for the anon key.
//
// `mode: "service"` skips the filter entirely (service role bypasses RLS),
// which is exactly why production code must scope by `user_id` manually.
// ---------------------------------------------------------------------------

interface MeetingRow {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  text: string | null;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  stripe_customer_id: string | null;
  subscription_tier: string | null;
}

interface FakeDb {
  meetings: MeetingRow[];
  profiles: ProfileRow[];
}

interface FakeClientOptions {
  mode: "user" | "service";
  currentUserId: string | null;
  db: FakeDb;
}

function buildFakeClient({ mode, currentUserId, db }: FakeClientOptions) {
  function tableRows(table: keyof FakeDb): Array<MeetingRow | ProfileRow> {
    return db[table];
  }

  function applyRls<T extends MeetingRow | ProfileRow>(
    rows: ReadonlyArray<T>,
  ): T[] {
    if (mode === "service") return [...rows];
    if (!currentUserId) return [];
    return rows.filter((row) => row.user_id === currentUserId);
  }

  function selectChain(table: keyof FakeDb) {
    let working: Array<MeetingRow | ProfileRow> = applyRls(tableRows(table));
    const chain = {
      eq(column: string, value: string) {
        working = working.filter(
          (row) => (row as unknown as Record<string, unknown>)[column] === value,
        );
        return chain;
      },
      ilike(column: string, pattern: string) {
        const needle = pattern.replace(/%/g, "").toLowerCase();
        working = working.filter((row) => {
          const cell = (row as unknown as Record<string, unknown>)[column];
          return typeof cell === "string"
            ? cell.toLowerCase().includes(needle)
            : false;
        });
        return chain;
      },
      then<TResult1 = { data: typeof working; error: null }, TResult2 = never>(
        onfulfilled?: (value: {
          data: typeof working;
          error: null;
        }) => TResult1 | PromiseLike<TResult1>,
        onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
      ): Promise<TResult1 | TResult2> {
        return Promise.resolve({ data: working, error: null }).then(
          onfulfilled,
          onrejected,
        );
      },
    };
    return chain;
  }

  return {
    from(table: keyof FakeDb) {
      return {
        select() {
          return selectChain(table);
        },
        insert(row: MeetingRow | ProfileRow) {
          // Real RLS: anon-key insert into `meetings` requires the row's
          // user_id to equal auth.uid().
          if (
            mode === "user" &&
            (!currentUserId || row.user_id !== currentUserId)
          ) {
            return Promise.resolve({
              data: null,
              error: {
                code: "42501",
                message: 'new row violates row-level security policy for table',
              },
            });
          }
          db[table].push(row as MeetingRow & ProfileRow);
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Seed every fixture meeting into the in-memory DB up front. RLS tests below
// query through the fake client as different users.
// ---------------------------------------------------------------------------

function seedDb(): FakeDb {
  return {
    meetings: fixtureMeetingList.map((meeting) => ({
      id: meeting.id,
      user_id: meeting.userId,
      title: meeting.title,
      status: meeting.status,
      text: meeting.text,
      created_at: meeting.createdAt,
    })),
    profiles: [
      {
        user_id: fixtureUsers.owner.id,
        stripe_customer_id: "cus_owner",
        subscription_tier: "pro",
      },
      {
        user_id: fixtureUsers.intruder.id,
        stripe_customer_id: "cus_intruder",
        subscription_tier: "core",
      },
    ],
  };
}

describe("Supabase RLS isolation (mocked)", () => {
  let db: FakeDb;

  beforeEach(() => {
    db = seedDb();
  });

  // --------------------------------------------------------------- meetings
  describe("meetings table", () => {
    it("owner sees exactly their three meetings", async () => {
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.owner.id,
        db,
      });

      const { data, error } = await client.from("meetings").select();

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      const ids = (data as MeetingRow[]).map((row) => row.id).sort();
      expect(ids).toEqual(
        meetingsForUser("owner")
          .map((m) => m.id)
          .sort(),
      );
      for (const row of data as MeetingRow[]) {
        expect(row.user_id).toBe(fixtureUsers.owner.id);
      }
    });

    it("wrong-user cannot read another user's meetings even with .eq(id)", async () => {
      const intruderTarget = meetingsForUser("intruder")[0]!;
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.owner.id,
        db,
      });

      const { data, error } = await client
        .from("meetings")
        .select()
        .eq("id", intruderTarget.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("overlapping-keyword search does not leak across users", async () => {
      // Both users have a meeting titled exactly "Product planning". A leak
      // would surface as the wrong user_id appearing in the result set.
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.owner.id,
        db,
      });

      const { data } = await client
        .from("meetings")
        .select()
        .ilike("title", "%Product planning%");

      const rows = data as MeetingRow[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.user_id).toBe(fixtureUsers.owner.id);
      }
    });

    it("anon-role insert with someone else's user_id is rejected by RLS", async () => {
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.owner.id,
        db,
      });

      const result = await client.from("meetings").insert({
        id: "meeting_owner_attempting_impersonation",
        user_id: fixtureUsers.intruder.id, // forging another user
        title: "design review leak attempt",
        status: "completed",
        text: "should never persist",
        created_at: "2026-05-04T00:00:00.000Z",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe("42501");
      expect(db.meetings.some((row) => row.id.includes("impersonation"))).toBe(
        false,
      );
    });
  });

  // --------------------------------------------------------------- profiles
  describe("profiles table", () => {
    it("owner can read only their own profile row", async () => {
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.owner.id,
        db,
      });

      const { data } = await client.from("profiles").select();

      const rows = data as ProfileRow[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.user_id).toBe(fixtureUsers.owner.id);
    });

    it("intruder cannot fetch the owner's profile by .eq(user_id)", async () => {
      const client = buildFakeClient({
        mode: "user",
        currentUserId: fixtureUsers.intruder.id,
        db,
      });

      const { data } = await client
        .from("profiles")
        .select()
        .eq("user_id", fixtureUsers.owner.id);

      // RLS filtered out the owner row first; the .eq narrows over an empty set.
      expect(data).toEqual([]);
    });
  });

  // --------------------------------------------------------- service-role
  describe("service-role paths", () => {
    it("bypasses RLS, which is why callers MUST scope by user_id manually", async () => {
      const service = buildFakeClient({
        mode: "service",
        currentUserId: null, // service role has no user
        db,
      });

      // Without an explicit .eq("user_id", ...) the service role sees both users.
      const all = await service.from("meetings").select();
      expect((all.data as MeetingRow[]).length).toBe(
        fixtureMeetingList.length,
      );

      // Production code MUST add the filter back manually.
      const scoped = await service
        .from("meetings")
        .select()
        .eq("user_id", fixtureUsers.owner.id);
      const scopedRows = scoped.data as MeetingRow[];
      expect(scopedRows).toHaveLength(3);
      for (const row of scopedRows) {
        expect(row.user_id).toBe(fixtureUsers.owner.id);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// SupabaseMeetingsStore.insert() must always stamp `user_id` from
// getCurrentUserId() rather than letting the caller pick. This is the
// "service-role path still scopes by user_id manually" acceptance bullet:
// even if RLS is bypassed (or not yet enabled in a fresh migration), the
// store implementation refuses to write a meeting that isn't attributed.
// ---------------------------------------------------------------------------

const supabaseUserMocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  getSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: supabaseUserMocks.getCurrentUserId,
  getSupabaseUser: supabaseUserMocks.getSupabaseUser,
}));

const { SupabaseMeetingsStore } = await import("@/lib/meetings/store-supabase");

describe("SupabaseMeetingsStore manually scopes by user_id", () => {
  beforeEach(() => {
    supabaseUserMocks.getCurrentUserId.mockReset();
    supabaseUserMocks.getSupabaseUser.mockReset();
  });

  it("stamps user_id from the authenticated session on insert", async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: "meeting_new",
              user_id: fixtureUsers.owner.id,
              status: "processing",
              title: null,
              text: null,
              utterances: [],
              duration_seconds: null,
              summary: null,
              intake_form: null,
              cost_breakdown: null,
              error: null,
              created_at: "2026-05-04T00:00:00.000Z",
              updated_at: "2026-05-04T00:00:00.000Z",
            },
            error: null,
          }),
      }),
    });

    supabaseUserMocks.getCurrentUserId.mockResolvedValue(fixtureUsers.owner.id);
    supabaseUserMocks.getSupabaseUser.mockResolvedValue({
      from: vi.fn(() => ({ insert: insertSpy })),
    });

    const store = new SupabaseMeetingsStore();
    const created = await store.insert({ id: "meeting_new" });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "meeting_new",
        user_id: fixtureUsers.owner.id,
      }),
    );
    expect(created.id).toBe("meeting_new");
  });

  it("never trusts a wrong-user user_id even if a caller tried to inject one", async () => {
    // The MeetingInsert type does not expose user_id; the store always reads
    // it from getCurrentUserId(). This test asserts that contract by checking
    // the insert payload after passing extra (untyped) properties.
    const insertSpy = vi.fn().mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: "meeting_x",
              user_id: fixtureUsers.intruder.id,
              status: "processing",
              title: null,
              text: null,
              utterances: [],
              duration_seconds: null,
              summary: null,
              intake_form: null,
              cost_breakdown: null,
              error: null,
              created_at: "2026-05-04T00:00:00.000Z",
              updated_at: "2026-05-04T00:00:00.000Z",
            },
            error: null,
          }),
      }),
    });

    supabaseUserMocks.getCurrentUserId.mockResolvedValue(
      fixtureUsers.intruder.id,
    );
    supabaseUserMocks.getSupabaseUser.mockResolvedValue({
      from: vi.fn(() => ({ insert: insertSpy })),
    });

    const store = new SupabaseMeetingsStore();
    await store.insert({
      id: "meeting_x",
      // Extra properties intentionally injected via a cast to prove the store
      // ignores them and uses getCurrentUserId() instead.
      ...({ user_id: fixtureUsers.owner.id } as Record<string, unknown>),
    });

    const payload = insertSpy.mock.calls[0]![0] as { user_id: string };
    expect(payload.user_id).toBe(fixtureUsers.intruder.id);
    expect(payload.user_id).not.toBe(fixtureUsers.owner.id);
  });
});
