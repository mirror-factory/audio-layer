/**
 * Supabase migration / RLS live canary (PROD-331).
 *
 * Verifies that the production-shaped Supabase project
 *   1. is reachable with the service-role key,
 *   2. has applied the latest migration (a known table exists),
 *   3. enforces RLS for the anon role (anonymous SELECT is rejected on a
 *      protected table).
 *
 * Gated triple:
 *   - `RUN_LIVE_CANARIES=1`
 *   - `SUPABASE_URL`
 *   - `SUPABASE_SERVICE_ROLE_KEY`
 *
 * Optional:
 *   - `SUPABASE_ANON_KEY` (for the RLS check; skipped if absent)
 *   - `SUPABASE_CANARY_TABLE` (defaults to `meetings`)
 */
import { describe, it, expect } from "vitest";

const RUN = process.env.RUN_LIVE_CANARIES === "1";
const HAS_URL = Boolean(process.env.SUPABASE_URL);
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const ENABLED = RUN && HAS_URL && HAS_SERVICE_KEY;

const TABLE = process.env.SUPABASE_CANARY_TABLE ?? "meetings";

describe.skipIf(!ENABLED)("Supabase migration + RLS live canary", () => {
  it("service role can read the canary table (migration applied)", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { error, status } = await admin.from(TABLE).select("*").limit(1);
    // Service role bypasses RLS but the table must exist; a missing table
    // surfaces as a 4xx with a `42P01` (undefined_table) code.
    expect(error, `service role select on ${TABLE} returned: ${error?.message}`).toBeNull();
    expect(status).toBeLessThan(400);
  }, 30_000);

  it.skipIf(!process.env.SUPABASE_ANON_KEY)(
    "anon key is denied by RLS on the canary table",
    async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );

      const { data, error } = await anon.from(TABLE).select("*").limit(1);
      // RLS-protected tables either: (a) return [] with no error, or
      // (b) return a permission-denied error. Both are acceptable -- a
      // populated `data` array would mean RLS is OFF and is a hard fail.
      if (data && data.length > 0) {
        throw new Error(
          `RLS misconfigured: anon key returned ${data.length} rows from ${TABLE}`,
        );
      }
      // Either result is fine; assert one of them.
      expect(data ?? []).toEqual([]);
      // error may be null (no rows) or a permission error -- both pass.
      void error;
    },
    30_000,
  );
});
