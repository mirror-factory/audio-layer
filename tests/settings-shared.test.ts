import { describe, it, expect } from "vitest";
import { DEFAULTS, MODEL_OPTIONS } from "@/lib/settings-shared";

describe("DEFAULTS", () => {
  it("has correct summaryModel", () => {
    expect(DEFAULTS.summaryModel).toBe("openai/gpt-5.4-nano");
  });

  it("has correct batchSpeechModel", () => {
    expect(DEFAULTS.batchSpeechModel).toBe("universal-3-pro");
  });

  it("has correct streamingSpeechModel", () => {
    expect(DEFAULTS.streamingSpeechModel).toBe("u3-rt-pro");
  });
});

describe("MODEL_OPTIONS", () => {
  it("has 9 summary model options", () => {
    expect(MODEL_OPTIONS.summary).toHaveLength(9);
  });

  it("has 4 batch speech model options", () => {
    expect(MODEL_OPTIONS.batchSpeech).toHaveLength(4);
  });

  it("has 5 streaming speech model options", () => {
    expect(MODEL_OPTIONS.streamingSpeech).toHaveLength(5);
  });

  it("every summary option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.summary) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("every batch speech option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.batchSpeech) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("every streaming speech option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.streamingSpeech) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("summary options include common providers", () => {
    const values = MODEL_OPTIONS.summary.map((o) => o.value);
    // Verify options span multiple providers
    expect(values.some((v) => v.startsWith("anthropic/"))).toBe(true);
    expect(values.some((v) => v.startsWith("openai/"))).toBe(true);
    expect(values.some((v) => v.startsWith("google/"))).toBe(true);
  });

  it("default batchSpeechModel exists in batch speech options", () => {
    const values = MODEL_OPTIONS.batchSpeech.map((o) => o.value);
    expect(values).toContain(DEFAULTS.batchSpeechModel);
  });

  it("default streamingSpeechModel exists in streaming speech options", () => {
    const values = MODEL_OPTIONS.streamingSpeech.map((o) => o.value);
    expect(values).toContain(DEFAULTS.streamingSpeechModel);
  });
});
