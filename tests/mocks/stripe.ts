/**
 * Stripe mock harness (PROD-331).
 *
 * Covers the operations called out in V1_PLAN.md §8:
 *   - checkout session  (checkout.sessions.create)
 *   - customer portal   (billingPortal.sessions.create)
 *   - webhook signature events (webhooks.constructEvent)
 *
 * The mock plugs into `@/lib/stripe/client#getStripe` so route tests get a
 * fake Stripe instance with just enough surface to exercise the happy path
 * and signature-verification branch.
 */
import { vi, type Mock } from "vitest";

type AnyFn = (...args: any[]) => any;

export interface StripeMock {
  checkout: {
    sessions: {
      create: Mock<AnyFn>;
    };
  };
  billingPortal: {
    sessions: {
      create: Mock<AnyFn>;
    };
  };
  webhooks: {
    constructEvent: Mock<AnyFn>;
  };
  /** The fake Stripe instance returned by getStripe(). */
  stripe: Record<string, unknown>;
  /** Mock for `@/lib/stripe/client#getStripe`. */
  getStripe: Mock<AnyFn>;
  /** Build a fake `Stripe.Event` payload for tests that exercise webhook flows. */
  buildEvent: <T = Record<string, unknown>>(
    type: string,
    data: T,
    overrides?: Record<string, unknown>,
  ) => Record<string, unknown>;
  reset: () => void;
}

const FAKE_CHECKOUT_SESSION = {
  id: "cs_test_mock_checkout",
  object: "checkout.session",
  url: "https://checkout.stripe.com/c/pay/cs_test_mock_checkout",
  customer: "cus_mock",
  mode: "subscription",
  status: "open",
};

const FAKE_PORTAL_SESSION = {
  id: "bps_test_mock_portal",
  object: "billing_portal.session",
  url: "https://billing.stripe.com/p/session/bps_test_mock_portal",
  customer: "cus_mock",
};

export function mockStripe(): StripeMock {
  const checkoutCreate = vi.fn(async () => FAKE_CHECKOUT_SESSION);
  const portalCreate = vi.fn(async () => FAKE_PORTAL_SESSION);

  // Default constructEvent returns a benign customer.subscription.updated.
  // Tests that want to exercise signature failure should call
  // `webhooks.constructEvent.mockImplementationOnce(() => { throw ... })`.
  const constructEvent = vi.fn((rawBody: string | Buffer) => {
    const parsed = typeof rawBody === "string" ? rawBody : rawBody.toString();
    try {
      return JSON.parse(parsed);
    } catch {
      return {
        id: "evt_mock",
        type: "customer.subscription.updated",
        data: { object: { id: "sub_mock", status: "active" } },
      };
    }
  });

  const stripe: Record<string, unknown> = {
    checkout: { sessions: { create: checkoutCreate } },
    billingPortal: { sessions: { create: portalCreate } },
    webhooks: { constructEvent },
  };

  const getStripe = vi.fn(() => stripe);

  function buildEvent<T>(
    type: string,
    data: T,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      id: `evt_mock_${type.replace(/\./g, "_")}`,
      object: "event",
      type,
      api_version: "2024-09-30.acacia",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: data },
      ...overrides,
    };
  }

  function reset() {
    checkoutCreate.mockReset();
    portalCreate.mockReset();
    constructEvent.mockReset();
    getStripe.mockReset();
    checkoutCreate.mockResolvedValue(FAKE_CHECKOUT_SESSION);
    portalCreate.mockResolvedValue(FAKE_PORTAL_SESSION);
    constructEvent.mockImplementation((rawBody: string | Buffer) => {
      const parsed = typeof rawBody === "string" ? rawBody : rawBody.toString();
      try {
        return JSON.parse(parsed);
      } catch {
        return {
          id: "evt_mock",
          type: "customer.subscription.updated",
          data: { object: { id: "sub_mock", status: "active" } },
        };
      }
    });
    getStripe.mockReturnValue(stripe);
  }

  return {
    checkout: { sessions: { create: checkoutCreate } },
    billingPortal: { sessions: { create: portalCreate } },
    webhooks: { constructEvent },
    stripe,
    getStripe,
    buildEvent,
    reset,
  };
}

/**
 * Recommended wiring (vi.mock must be at the top level of the test file):
 *
 *   import { vi, beforeEach } from "vitest";
 *   import { mockStripe } from "@/tests/mocks/stripe";
 *
 *   const stripe = mockStripe();
 *   vi.mock("@/lib/stripe/client", async (importOriginal) => {
 *     const actual = await importOriginal<typeof import("@/lib/stripe/client")>();
 *     return { ...actual, getStripe: stripe.getStripe };
 *   });
 *
 *   beforeEach(() => stripe.reset());
 */
