/**
 * Route-level API smoke test.
 *
 * Spins up the Next.js dev server via `start-server-and-test`, POSTs a
 * minimal payload to every route under `app/api/`, and asserts each one
 * returns a sensible status (200-299 or a 4xx with a JSON error body --
 * never a bare 500).
 *
 * This is the test that catches the silent-500 class: a route that 500s
 * with no log, no stack, no response body. Unit tests pass; this one
 * fails loudly.
 *
 * Run locally: `pnpm test:api`
 * Runs in CI: see .github/workflows/nightly.yml
 *
 * Customize the PAYLOADS map for each route in your app. Routes without
 * an entry get a bare GET with no body.
 */
import { describe, it, expect } from 'vitest';
import { apiRouteContracts, getRouteSmokeCase } from './route-contracts';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

describe('API route smoke', () => {
  for (const contract of apiRouteContracts) {
    for (const method of contract.methods) {
      const spec = getRouteSmokeCase(contract, method);

      if (spec.skipReason) {
        it.skip(`${method} ${contract.smokePath} is covered outside smoke (${spec.skipReason})`, () => {});
        continue;
      }

      it(`${method} ${contract.smokePath} returns a sensible status`, async () => {
        const headers = {
          'content-type': 'application/json',
          ...spec.headers,
        };

        const res = await fetch(`${BASE_URL}${contract.smokePath}`, {
          method,
          headers,
          body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        });

        const text = await res.text();

        if (spec.assertJson ?? contract.assertJson) {
          let json: unknown = null;
          try { json = JSON.parse(text); } catch { /* leave as null */ }
          expect(json, `${contract.smokePath} returned non-JSON body: ${text.slice(0, 200)}`).not.toBeNull();
        }

        if (spec.requiresRequestId ?? contract.requiresRequestId) {
          expect(res.headers.get('x-request-id'), `${contract.smokePath} missing x-request-id header`).toBeTruthy();
        }

        expect(spec.expectStatuses, `${contract.smokePath} returned ${res.status}: ${text.slice(0, 200)}`).toContain(res.status);
      }, 10_000);
    }
  }
});
