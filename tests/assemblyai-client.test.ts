/**
 * Client construction tests.
 *
 * Confirms: API key is required, client is cached per-process, batch
 * model defaults to 'best' (Universal-3 Pro).
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  getAssemblyAI,
  __resetAssemblyAIClient,
  getBatchSpeechModels,
} from "@/lib/assemblyai/client";

describe("getAssemblyAI", () => {
  const originalKey = process.env.ASSEMBLYAI_API_KEY;
  const originalModel = process.env.ASSEMBLYAI_BATCH_MODEL;

  beforeEach(() => {
    __resetAssemblyAIClient();
  });

  afterEach(() => {
    process.env.ASSEMBLYAI_API_KEY = originalKey;
    process.env.ASSEMBLYAI_BATCH_MODEL = originalModel;
    __resetAssemblyAIClient();
  });

  it("throws a helpful message when ASSEMBLYAI_API_KEY is missing", () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    expect(() => getAssemblyAI()).toThrow(/ASSEMBLYAI_API_KEY/);
  });

  it("caches the client after first construction", () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    const a = getAssemblyAI();
    const b = getAssemblyAI();
    expect(a).toBe(b);
  });

  it("defaults getBatchSpeechModels to ['universal-3-pro'] when env unset", () => {
    delete process.env.ASSEMBLYAI_BATCH_MODEL;
    expect(getBatchSpeechModels()).toEqual(["universal-3-pro"]);
  });

  it("maps 'best' to ['universal-3-pro']", () => {
    process.env.ASSEMBLYAI_BATCH_MODEL = "best";
    expect(getBatchSpeechModels()).toEqual(["universal-3-pro"]);
  });

  it("honors ASSEMBLYAI_BATCH_MODEL override as array", () => {
    process.env.ASSEMBLYAI_BATCH_MODEL = "nano";
    expect(getBatchSpeechModels()).toEqual(["nano"]);
  });
});
