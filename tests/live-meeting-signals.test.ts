import { describe, expect, it } from "vitest";
import { deriveLiveMeetingSignals } from "@/lib/recording/live-signals";

describe("deriveLiveMeetingSignals", () => {
  it("extracts live meeting views from transcript turns", () => {
    const signals = deriveLiveMeetingSignals(
      [
        {
          text: "The customer onboarding timeline is the biggest risk because the launch date is fixed.",
          start: 12_000,
        },
        {
          text: "We decided to go with the smaller pilot first. Alfonso will send the revised plan tomorrow.",
          start: 64_000,
        },
        {
          text: "Can we confirm who owns the security review?",
          start: 92_000,
        },
      ],
      "We need to schedule the follow up with the customer.",
    );

    expect(signals.keyPoints.map((item) => item.text)).toContain(
      "The customer onboarding timeline is the biggest risk because the launch date is fixed.",
    );
    expect(signals.decisions.map((item) => item.text)).toContain(
      "We decided to go with the smaller pilot first.",
    );
    expect(signals.actions.map((item) => item.text)).toEqual(
      expect.arrayContaining([
        "Alfonso will send the revised plan tomorrow.",
        "We need to schedule the follow up with the customer.",
      ]),
    );
    expect(signals.questions.map((item) => item.text)).toContain(
      "Can we confirm who owns the security review?",
    );
    expect(signals.latestLine).toBe(
      "We need to schedule the follow up with the customer.",
    );
    expect(signals.words).toBeGreaterThan(35);
  });
});
