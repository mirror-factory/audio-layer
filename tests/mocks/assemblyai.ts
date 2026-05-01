/**
 * AssemblyAI mock harness (PROD-331).
 *
 * Covers the operations called out in V1_PLAN.md §8:
 *   - upload (files.upload)
 *   - transcript submit (transcripts.submit / transcripts.transcribe)
 *   - transcript poll (transcripts.get)
 *   - realtime token (realtime.createTemporaryToken / streaming.createToken)
 *   - streaming finalization (transcripts.waitUntilReady)
 *
 * Deliberately small: not a full SDK fake. Tests can override individual
 * `mockResolvedValue` per case, and `setup()` plugs the shared object into
 * `@/lib/assemblyai/client`.
 */
import { vi, type Mock } from "vitest";

type AnyFn = (...args: any[]) => any;

export interface AssemblyAIMock {
  files: {
    upload: Mock<AnyFn>;
  };
  transcripts: {
    submit: Mock<AnyFn>;
    transcribe: Mock<AnyFn>;
    get: Mock<AnyFn>;
    waitUntilReady: Mock<AnyFn>;
  };
  realtime: {
    createTemporaryToken: Mock<AnyFn>;
  };
  streaming: {
    createToken: Mock<AnyFn>;
  };
  /** The fake AssemblyAI client object getAssemblyAI() resolves to. */
  client: Record<string, unknown>;
  /** Mock for `@/lib/assemblyai/client#getAssemblyAI`. */
  getAssemblyAI: Mock<AnyFn>;
  /** Reset every fn between tests. */
  reset: () => void;
}

export function mockAssemblyAI(): AssemblyAIMock {
  const files = {
    upload: vi.fn(async () => "https://cdn.assemblyai.com/upload/mock-audio"),
  };

  const transcripts = {
    // .submit() returns a queued transcript record.
    submit: vi.fn(async () => ({
      id: "tr_mock_submit",
      status: "queued",
      audio_url: "https://cdn.assemblyai.com/upload/mock-audio",
      speech_models: ["universal-3-pro"],
    })),
    // .transcribe() runs upload + submit + poll in one call.
    transcribe: vi.fn(async () => ({
      id: "tr_mock_transcribe",
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
      audio_duration: 12.4,
      utterances: [
        { speaker: "A", text: "Hello from the AssemblyAI mock.", start: 0, end: 1200 },
      ],
    })),
    // .get() polls a transcript by id.
    get: vi.fn(async (id: string) => ({
      id,
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
      audio_duration: 12.4,
    })),
    // streaming finalization: poll until terminal.
    waitUntilReady: vi.fn(async (id: string) => ({
      id,
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
    })),
  };

  const realtime = {
    createTemporaryToken: vi.fn(async () => ({
      token: "rt_token_mock",
      expires_in_seconds: 600,
    })),
  };

  const streaming = {
    createToken: vi.fn(async () => ({
      token: "stream_token_mock",
      expires_in_seconds: 600,
    })),
  };

  const client: Record<string, unknown> = {
    files,
    transcripts,
    realtime,
    streaming,
  };

  const getAssemblyAI = vi.fn(() => client);

  function reset() {
    files.upload.mockReset();
    transcripts.submit.mockReset();
    transcripts.transcribe.mockReset();
    transcripts.get.mockReset();
    transcripts.waitUntilReady.mockReset();
    realtime.createTemporaryToken.mockReset();
    streaming.createToken.mockReset();
    getAssemblyAI.mockReset();
    // Re-install default impls so reset() doesn't leave callers without a value.
    files.upload.mockResolvedValue(
      "https://cdn.assemblyai.com/upload/mock-audio",
    );
    transcripts.submit.mockResolvedValue({
      id: "tr_mock_submit",
      status: "queued",
      audio_url: "https://cdn.assemblyai.com/upload/mock-audio",
      speech_models: ["universal-3-pro"],
    });
    transcripts.transcribe.mockResolvedValue({
      id: "tr_mock_transcribe",
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
      audio_duration: 12.4,
      utterances: [
        { speaker: "A", text: "Hello from the AssemblyAI mock.", start: 0, end: 1200 },
      ],
    });
    transcripts.get.mockImplementation(async (id: string) => ({
      id,
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
      audio_duration: 12.4,
    }));
    transcripts.waitUntilReady.mockImplementation(async (id: string) => ({
      id,
      status: "completed",
      text: "Hello from the AssemblyAI mock.",
    }));
    realtime.createTemporaryToken.mockResolvedValue({
      token: "rt_token_mock",
      expires_in_seconds: 600,
    });
    streaming.createToken.mockResolvedValue({
      token: "stream_token_mock",
      expires_in_seconds: 600,
    });
    getAssemblyAI.mockReturnValue(client);
  }

  return {
    files,
    transcripts,
    realtime,
    streaming,
    client,
    getAssemblyAI,
    reset,
  };
}

/**
 * Recommended wiring (vi.mock must be at the top level of the test file --
 * Vitest 4 will warn, future versions will error, when it isn't):
 *
 *   import { vi, beforeEach } from "vitest";
 *   import { mockAssemblyAI } from "@/tests/mocks/assemblyai";
 *
 *   const aai = mockAssemblyAI();
 *   vi.mock("@/lib/assemblyai/client", () => ({
 *     getAssemblyAI: aai.getAssemblyAI,
 *   }));
 *
 *   beforeEach(() => aai.reset());
 */
