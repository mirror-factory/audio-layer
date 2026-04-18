/**
 * IntakeForm schema + helpers tests.
 *
 * Pure tests — no LLM calls. Validates that the schema accepts
 * realistic populated forms, rejects malformed payloads, and that
 * the empty / sentinel form passes through cleanly.
 */

import { describe, it, expect } from "vitest";
import {
  IntakeFormSchema,
  emptyIntakeForm,
  extractIntakeForm,
} from "@/lib/assemblyai/intake";

describe("IntakeFormSchema", () => {
  it("accepts a fully populated discovery-call form", () => {
    const form = {
      intent: "sales discovery call",
      primaryParticipant: "Alice (Acme)",
      organization: "Acme Corp",
      contactInfo: {
        email: "alice@acme.example",
        phone: "+1 555 0100",
      },
      budgetMentioned: "$50k pilot",
      timeline: "Decision by end of Q2",
      decisionMakers: ["Bob (CTO)", "Carol (CFO)"],
      requirements: ["SOC 2", "On-prem deployment"],
      painPoints: ["Manual ticket triage", "No audit trail"],
      nextSteps: ["Send security one-pager", "Schedule technical demo"],
    };
    expect(() => IntakeFormSchema.parse(form)).not.toThrow();
  });

  it("requires the contactInfo object even when both fields are null", () => {
    const bad = {
      intent: "x",
      primaryParticipant: null,
      organization: null,
      budgetMentioned: null,
      timeline: null,
      decisionMakers: [],
      requirements: [],
      painPoints: [],
      nextSteps: [],
      // missing contactInfo
    };
    expect(() => IntakeFormSchema.parse(bad)).toThrow();
  });

  it("contactInfo must explicitly provide null fields, not omit them", () => {
    const bad = {
      intent: "x",
      primaryParticipant: null,
      organization: null,
      contactInfo: {}, // missing email + phone
      budgetMentioned: null,
      timeline: null,
      decisionMakers: [],
      requirements: [],
      painPoints: [],
      nextSteps: [],
    };
    expect(() => IntakeFormSchema.parse(bad)).toThrow();
  });

  it("rejects array fields when given a string", () => {
    const bad = {
      intent: "x",
      primaryParticipant: null,
      organization: null,
      contactInfo: { email: null, phone: null },
      budgetMentioned: null,
      timeline: null,
      decisionMakers: "alice",
      requirements: [],
      painPoints: [],
      nextSteps: [],
    };
    expect(() => IntakeFormSchema.parse(bad)).toThrow();
  });
});

describe("emptyIntakeForm", () => {
  it("returns a schema-valid all-empty form", () => {
    const empty = emptyIntakeForm();
    expect(() => IntakeFormSchema.parse(empty)).not.toThrow();
    expect(empty.intent).toBe("unclear");
    expect(empty.contactInfo).toEqual({ email: null, phone: null });
    expect(empty.decisionMakers).toEqual([]);
  });
});

describe("extractIntakeForm empty guard", () => {
  it("returns the sentinel form without calling the LLM when input is empty", async () => {
    const out = await extractIntakeForm({
      transcriptId: "tr-empty",
      utterances: [],
      fullText: "   ",
    });
    expect(out.skipped).toBe(true);
    expect(out.intake).toEqual(emptyIntakeForm());
    expect(out.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
