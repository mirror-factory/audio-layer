import { describe, it, expect } from "vitest";
import { IntakeFormSchema, emptyIntakeForm } from "@/lib/assemblyai/intake";

describe("IntakeFormSchema", () => {
  const validData = {
    intent: "sales discovery call",
    primaryParticipant: "Jane Doe",
    organization: "Acme Corp",
    contactInfo: {
      email: "jane@acme.com",
      phone: "+1-555-0100",
    },
    budgetMentioned: "$50k",
    timeline: "Q3 2026",
    decisionMakers: ["CEO", "CTO"],
    requirements: ["SSO integration", "99.9% SLA"],
    painPoints: ["Current tool is slow", "No mobile support"],
    nextSteps: ["Send proposal by Friday", "Schedule demo next week"],
  };

  it("parses valid data", () => {
    const result = IntakeFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe("sales discovery call");
      expect(result.data.primaryParticipant).toBe("Jane Doe");
      expect(result.data.organization).toBe("Acme Corp");
      expect(result.data.contactInfo.email).toBe("jane@acme.com");
      expect(result.data.requirements).toHaveLength(2);
      expect(result.data.painPoints).toHaveLength(2);
      expect(result.data.nextSteps).toHaveLength(2);
    }
  });

  it("accepts nullable fields as null", () => {
    const withNulls = {
      ...validData,
      primaryParticipant: null,
      organization: null,
      contactInfo: { email: null, phone: null },
      budgetMentioned: null,
      timeline: null,
    };
    const result = IntakeFormSchema.safeParse(withNulls);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primaryParticipant).toBeNull();
      expect(result.data.organization).toBeNull();
      expect(result.data.contactInfo.email).toBeNull();
      expect(result.data.budgetMentioned).toBeNull();
      expect(result.data.timeline).toBeNull();
    }
  });

  it("accepts empty arrays", () => {
    const withEmpty = {
      ...validData,
      decisionMakers: [],
      requirements: [],
      painPoints: [],
      nextSteps: [],
    };
    const result = IntakeFormSchema.safeParse(withEmpty);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = IntakeFormSchema.safeParse({ intent: "call" });
    expect(result.success).toBe(false);
  });
});

describe("emptyIntakeForm", () => {
  it("returns all-null/empty structure", () => {
    const form = emptyIntakeForm();

    expect(form.intent).toBe("unclear");
    expect(form.primaryParticipant).toBeNull();
    expect(form.organization).toBeNull();
    expect(form.contactInfo).toEqual({ email: null, phone: null });
    expect(form.budgetMentioned).toBeNull();
    expect(form.timeline).toBeNull();
    expect(form.decisionMakers).toEqual([]);
    expect(form.requirements).toEqual([]);
    expect(form.painPoints).toEqual([]);
    expect(form.nextSteps).toEqual([]);
  });

  it("returns a valid IntakeForm according to the schema", () => {
    const form = emptyIntakeForm();
    const result = IntakeFormSchema.safeParse(form);
    expect(result.success).toBe(true);
  });
});
