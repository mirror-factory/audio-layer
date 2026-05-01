/**
 * Deterministic user fixtures for integration + RLS tests.
 *
 * IDs are stable UUIDs so they can be used as `auth.users.id` references in
 * the Supabase schema (`lib/supabase/schema.sql`) where `meetings.user_id` is
 * `uuid references auth.users (id)`.
 *
 * The legacy short-string aliases (`user_owner`, `user_intruder`) are kept on
 * the same fixture object as `legacyId` so existing pure-mock tests
 * (e.g. `tests/api-route-behavior.test.ts`) keep matching the previous
 * `mocks.getCurrentUserId.mockResolvedValue(...)` strings byte-for-byte.
 */

export interface FixtureUser {
  id: string;
  /** Short, stable, non-UUID alias used by older mock-based tests. */
  legacyId: string;
  email: string;
  displayName: string;
}

export const fixtureUsers = {
  owner: {
    id: "11111111-1111-4111-8111-111111111111",
    legacyId: "user_owner",
    email: "owner@example.com",
    displayName: "Olivia Owner",
  },
  intruder: {
    id: "22222222-2222-4222-8222-222222222222",
    legacyId: "user_intruder",
    email: "intruder@example.com",
    displayName: "Ivan Intruder",
  },
} as const satisfies Record<string, FixtureUser>;

export type FixtureUserKey = keyof typeof fixtureUsers;

/** Backwards-compat: tests that import `fixtureUsers.owner.id` directly will
 *  now receive a UUID. Callers that need the legacy short string should use
 *  `fixtureUsers.owner.legacyId`. */
export const fixtureUserList: ReadonlyArray<FixtureUser> = Object.values(
  fixtureUsers,
);
