/**
 * Resend mock harness (PROD-331).
 *
 * Covers the operations called out in V1_PLAN.md §8:
 *   - send success
 *   - send failure
 *   - rate limit
 *
 * The Resend SDK exposes `client.emails.send()`. We mock the singleton at
 * `@/lib/email/client#getResend` and provide tiny `setSuccess` / `setFailure`
 * / `setRateLimit` helpers so each test can pick a scenario in one line.
 */
import { vi, type Mock } from "vitest";

type AnyFn = (...args: any[]) => any;

export interface ResendMock {
  emails: {
    send: Mock<AnyFn>;
  };
  /** Fake Resend client returned by getResend(). */
  client: Record<string, unknown>;
  /** Mock for `@/lib/email/client#getResend`. */
  getResend: Mock<AnyFn>;
  /** Configure the next send() to succeed (default behavior). */
  setSuccess: (id?: string) => void;
  /** Configure the next send() to fail with a generic error. */
  setFailure: (message?: string) => void;
  /** Configure the next send() to fail with a 429 rate-limit error shape. */
  setRateLimit: () => void;
  reset: () => void;
}

interface ResendSendResult {
  data: { id: string } | null;
  error: { name: string; message: string; statusCode: number } | null;
}

const SUCCESS_DEFAULT: ResendSendResult = {
  data: { id: "email_mock_id" },
  error: null,
};

export function mockResend(): ResendMock {
  const send: Mock<AnyFn> = vi.fn(async () => SUCCESS_DEFAULT);

  const client: Record<string, unknown> = {
    emails: { send },
  };

  const getResend = vi.fn(() => client);

  function setSuccess(id = "email_mock_id") {
    send.mockResolvedValueOnce({ data: { id }, error: null });
  }

  function setFailure(message = "Resend send failed") {
    // Resend SDK shape: returns `{ data: null, error: { ... } }`.
    send.mockResolvedValueOnce({
      data: null,
      error: {
        name: "application_error",
        message,
        statusCode: 500,
      },
    });
  }

  function setRateLimit() {
    send.mockResolvedValueOnce({
      data: null,
      error: {
        name: "rate_limit_exceeded",
        message: "You have exceeded the rate limit. Please retry shortly.",
        statusCode: 429,
      },
    });
  }

  function reset() {
    send.mockReset();
    getResend.mockReset();
    send.mockResolvedValue(SUCCESS_DEFAULT);
    getResend.mockReturnValue(client);
  }

  return {
    emails: { send },
    client,
    getResend,
    setSuccess,
    setFailure,
    setRateLimit,
    reset,
  };
}

/**
 * Recommended wiring (vi.mock must be at the top level of the test file):
 *
 *   import { vi, beforeEach } from "vitest";
 *   import { mockResend } from "@/tests/mocks/resend";
 *
 *   const resend = mockResend();
 *   vi.mock("@/lib/email/client", async (importOriginal) => {
 *     const actual = await importOriginal<typeof import("@/lib/email/client")>();
 *     return { ...actual, getResend: resend.getResend };
 *   });
 *
 *   beforeEach(() => resend.reset());
 */
