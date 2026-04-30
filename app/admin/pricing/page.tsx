"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  Check,
  DollarSign,
  ExternalLink,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import {
  DEFAULT_PRICING_ASSUMPTIONS,
  DEFAULT_PRICING_PLANS,
  DEFAULT_CUSTOMER_MIX,
  STT_PRICING_OPTIONS,
  estimatePortfolioEconomics,
  estimatePlanEconomics,
  estimateSttCost,
  formatMoney,
  sttCostPerMinute,
  type CustomerMixInput,
  type PricingAssumptions,
  type PricingPlanInput,
  type SttPricingOption,
} from "@/lib/billing/stt-pricing";
import type {
  PricingConfigStore,
  PricingConfigVersion,
} from "@/lib/billing/pricing-config";

const DEFAULT_STT_OPTION_ID = "deepgram:nova-3:streaming";

function defaultAddonsFor(option: SttPricingOption): string[] {
  if (option.provider === "deepgram" && option.diarization === "addon") {
    return ["speakerDiarization"];
  }
  if (option.provider !== "assemblyai") return [];
  if (option.mode === "streaming") return [];
  if (option.mode === "batch") return ["speakerDiarization", "entityDetection"];
  return [];
}

function toNumber(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${Math.round(value)}%`;
}

function formatRuntimeStatus(option: SttPricingOption): string {
  switch (option.runtimeStatus) {
    case "implemented":
      return "Live in app";
    case "adapter-needed":
      return "Adapter needed";
    case "pricing-only":
      return "Pricing only";
    default:
      return "Unlabeled";
  }
}

export default function AdminPricingPage() {
  const [configStore, setConfigStore] = useState<PricingConfigStore | null>(null);
  const [configStatus, setConfigStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [configMessage, setConfigMessage] = useState("Loading active pricing config...");
  const [selectedOptionId, setSelectedOptionId] = useState(DEFAULT_STT_OPTION_ID);
  const selectedOption =
    STT_PRICING_OPTIONS.find((option) => option.id === selectedOptionId) ??
    STT_PRICING_OPTIONS[0];
  const [addonIds, setAddonIds] = useState<string[]>(defaultAddonsFor(selectedOption));
  const [plans, setPlans] = useState<PricingPlanInput[]>(DEFAULT_PRICING_PLANS);
  const [customerMix, setCustomerMix] = useState<CustomerMixInput[]>(DEFAULT_CUSTOMER_MIX);
  const [assumptions, setAssumptions] = useState<PricingAssumptions>(
    DEFAULT_PRICING_ASSUMPTIONS,
  );

  const applyVersion = useCallback((version: PricingConfigVersion) => {
    const option =
      STT_PRICING_OPTIONS.find((item) => item.id === version.sttOptionId) ??
      STT_PRICING_OPTIONS[0];
    setSelectedOptionId(option.id);
    setAddonIds(version.addonIds);
    setPlans(version.plans);
    setCustomerMix(version.customerMix);
    setAssumptions(version.assumptions);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/pricing", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Config load failed (${response.status})`);
        return response.json() as Promise<PricingConfigStore>;
      })
      .then((store) => {
        if (cancelled) return;
        setConfigStore(store);
        applyVersion(store.active);
        setConfigStatus("idle");
        setConfigMessage(`Active config loaded from ${store.source}.`);
      })
      .catch((error) => {
        if (cancelled) return;
        setConfigStatus("error");
        setConfigMessage(error instanceof Error ? error.message : "Unable to load config.");
      });

    return () => {
      cancelled = true;
    };
  }, [applyVersion]);

  const activeAddonIds = useMemo(
    () =>
      selectedOption.addons
        ? addonIds.filter((id) =>
            selectedOption.addons?.some((addon) => addon.id === id),
          )
        : [],
    [addonIds, selectedOption.addons],
  );

  const planEconomics = useMemo(
    () =>
      plans.map((plan) =>
        estimatePlanEconomics({
          plan,
          sttOptionId: selectedOption.id,
          addonIds: activeAddonIds,
          assumptions,
        }),
      ),
    [activeAddonIds, assumptions, plans, selectedOption.id],
  );

  const selectedStt = useMemo(
    () =>
      estimateSttCost({
        optionId: selectedOption.id,
        durationMinutes: 1000,
        addonIds: activeAddonIds,
      }),
    [activeAddonIds, selectedOption.id],
  );

  const sortedAlternatives = useMemo(
    () =>
      [...STT_PRICING_OPTIONS]
        .sort((a, b) => sttCostPerMinute(a, defaultAddonsFor(a)) - sttCostPerMinute(b, defaultAddonsFor(b))),
    [],
  );

  const portfolioEconomics = useMemo(
    () =>
      estimatePortfolioEconomics({
        plans,
        customerMix,
        sttOptionId: selectedOption.id,
        addonIds: activeAddonIds,
        assumptions,
      }),
    [activeAddonIds, assumptions, customerMix, plans, selectedOption.id],
  );

  const allCorePlan = plans.find((plan) => plan.id === "core");
  const allCoreMrr = allCorePlan ? allCorePlan.monthlyPriceUsd * 1000 : 0;

  const coreEconomics = planEconomics.find((item) => item.plan.id === "core");
  const minimumTargetPrice = Math.max(...planEconomics.map((item) => item.targetPriceUsd));

  const updateAssumption = (key: keyof PricingAssumptions, value: number) => {
    setAssumptions((current) => ({ ...current, [key]: value }));
  };

  const updatePlan = (
    planId: string,
    key: keyof PricingPlanInput,
    value: PricingPlanInput[keyof PricingPlanInput],
  ) => {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === planId ? { ...plan, [key]: value } : plan,
      ),
    );
  };

  const configPayload = useMemo(
    () => ({
      name: `Admin pricing ${new Date().toLocaleDateString("en-US")}`,
      startsAt: new Date().toISOString(),
      sttOptionId: selectedOption.id,
      addonIds: activeAddonIds,
      assumptions,
      plans,
      customerMix,
      notes: `Saved from /admin/pricing with ${portfolioEconomics.totalCustomers} scenario customers.`,
    }),
    [activeAddonIds, assumptions, customerMix, plans, portfolioEconomics.totalCustomers, selectedOption.id],
  );

  const saveDraft = async (activate: boolean) => {
    setConfigStatus("saving");
    setConfigMessage(activate ? "Saving and activating pricing config..." : "Saving pricing draft...");

    try {
      const saveRes = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload),
      });
      if (!saveRes.ok) throw new Error(`Save failed (${saveRes.status})`);
      const savedStore = (await saveRes.json()) as PricingConfigStore;
      const draft = savedStore.versions.find((version) => version.status === "draft");

      if (!activate || !draft) {
        setConfigStore(savedStore);
        setConfigStatus("idle");
        setConfigMessage(`Draft saved to ${savedStore.source}.`);
        return;
      }

      const activateRes = await fetch("/api/admin/pricing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });
      if (!activateRes.ok) throw new Error(`Activation failed (${activateRes.status})`);
      const activatedStore = (await activateRes.json()) as PricingConfigStore;
      setConfigStore(activatedStore);
      applyVersion(activatedStore.active);
      setConfigStatus("idle");
      setConfigMessage(`Active config updated in ${activatedStore.source}.`);
    } catch (error) {
      setConfigStatus("error");
      setConfigMessage(error instanceof Error ? error.message : "Unable to save pricing config.");
    }
  };

  const activateVersion = async (id: string) => {
    setConfigStatus("saving");
    setConfigMessage("Activating selected pricing version...");
    try {
      const res = await fetch("/api/admin/pricing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`Activation failed (${res.status})`);
      const store = (await res.json()) as PricingConfigStore;
      setConfigStore(store);
      applyVersion(store.active);
      setConfigStatus("idle");
      setConfigMessage(`Activated ${store.active.name}.`);
    } catch (error) {
      setConfigStatus("error");
      setConfigMessage(error instanceof Error ? error.message : "Unable to activate config.");
    }
  };

  const updateCustomerMix = (planId: string, customers: number) => {
    setCustomerMix((current) =>
      current.map((mix) =>
        mix.planId === planId ? { ...mix, customers } : mix,
      ),
    );
  };

  return (
    <div className="paper-calm-page min-h-screen-safe bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <TopBar title="Pricing Admin" showBack />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 pb-safe">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#14b8a6]">
              Operations
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Plan margin simulator
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Tune STT providers, plan prices, included minutes, expected usage,
              overage, payment fees, and support costs before touching Stripe.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveDraft(false)}
              disabled={configStatus === "saving"}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--border-card)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => saveDraft(true)}
              disabled={configStatus === "saving"}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-[#14b8a6] px-3 text-sm font-medium text-[#042f2e] transition-colors hover:bg-[#2dd4bf] disabled:opacity-60"
            >
              Save & activate
            </button>
            <Link
              href="/pricing"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-[var(--border-card)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
            >
              Public pricing
              <ExternalLink size={14} />
            </Link>
          </div>
        </header>

        <div className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Active version
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {configStore?.active.name ?? "No active config loaded"}
              </p>
            </div>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                configStatus === "error"
                  ? "bg-[var(--status-error-bg)] text-[var(--status-error)]"
                  : "bg-[#14b8a6]/10 text-[#14b8a6]"
              }`}
            >
              {configMessage}
            </span>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard
            icon={DollarSign}
            label="Selected STT"
            value={`${formatMoney(selectedStt.effectiveRatePerHourUsd)}/hr`}
            detail={`${formatMoney(selectedStt.totalCostUsd)} per 1,000 min`}
          />
          <MetricCard
            icon={Calculator}
            label="Core margin"
            value={formatPercent(coreEconomics?.grossMarginPercent ?? null)}
            detail={coreEconomics ? `${formatMoney(coreEconomics.grossProfitUsd)} profit/user` : "No core plan"}
          />
          <MetricCard
            icon={SlidersHorizontal}
            label="Target price ceiling"
            value={formatMoney(minimumTargetPrice)}
            detail={`for ${assumptions.targetMarginPercent}% target margin`}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title="1,000-customer growth scenario"
            description="Change the plan mix to see whether the business clears $10k MRR and how much profit remains after STT, LLM, platform, support, and payment fees."
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <ScenarioMetric
                icon={Users}
                label="Customers"
                value={portfolioEconomics.totalCustomers.toLocaleString()}
                detail={`${portfolioEconomics.payingCustomers.toLocaleString()} paid accounts`}
              />
              <ScenarioMetric
                icon={DollarSign}
                label="MRR"
                value={formatMoney(portfolioEconomics.mrrUsd)}
                detail={`${formatMoney(portfolioEconomics.arrUsd)} annualized`}
              />
              <ScenarioMetric
                icon={TrendingUp}
                label="Monthly profit"
                value={formatMoney(portfolioEconomics.monthlyProfitUsd)}
                detail={`${formatPercent(portfolioEconomics.grossMarginPercent)} gross margin`}
              />
              <ScenarioMetric
                icon={Calculator}
                label="ARPU"
                value={formatMoney(portfolioEconomics.arpuUsd)}
                detail={`${formatMoney(portfolioEconomics.arppuUsd)} per paid user`}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {plans.map((plan) => {
                const mix = customerMix.find((item) => item.planId === plan.id);
                const row = portfolioEconomics.planRows.find((item) => item.plan.id === plan.id);
                return (
                  <div key={plan.id} className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{plan.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {row ? `${formatMoney(row.mrrUsd)} MRR` : "No revenue"}
                        </p>
                      </div>
                      <MiniNumber
                        value={mix?.customers ?? 0}
                        suffix="u"
                        onChange={(value) => updateCustomerMix(plan.id, value)}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
                      {row
                        ? `${formatMoney(row.monthlyProfitUsd)} profit at ${formatPercent(row.grossMarginPercent)} margin.`
                        : "No customers in this plan."}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
              Reference: 1,000 users on Core at the current public price is {formatMoney(allCoreMrr)} MRR before costs. The default mixed scenario keeps 25% of accounts free, which is why MRR lands lower.
            </p>
          </Panel>

          <Panel
            title="Provider lane"
            description="A practical read on where each option belongs before implementation work."
          >
            <div className="space-y-3">
              {[
                {
                  title: "Live default",
                  body: "Keep AssemblyAI Universal Streaming Multilingual as the runtime default because it is wired, fast, and priced at $0.15/hr before optional add-ons. Soniox is the lowest-cost candidate, but it needs an adapter and a meeting-quality eval.",
                },
                {
                  title: "Benchmark lane",
                  body: "Short-list ElevenLabs Scribe v2, Speechmatics Pro, AssemblyAI U3 Pro, and Deepgram Nova/Flux for the first vendor bake-off. Compare WER, speaker labels, latency, and COGS on the same recordings.",
                },
                {
                  title: "Batch fallback",
                  body: "Use OpenAI, Google dynamic batch, ElevenLabs Scribe, Soniox async, or Rev Reverb for uploads and imports where realtime latency is irrelevant.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="STT provider" description="Pick the provider/model used for the margin math.">
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Provider model
              </label>
              <select
                value={selectedOption.id}
                onChange={(event) => {
                  const next = STT_PRICING_OPTIONS.find(
                    (option) => option.id === event.target.value,
                  );
                  if (!next) return;
                  setSelectedOptionId(next.id);
                  setAddonIds(defaultAddonsFor(next));
                }}
                className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[#14b8a6]"
              >
                {STT_PRICING_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.providerLabel} - {option.label} ({option.mode})
                  </option>
                ))}
              </select>

              <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{selectedOption.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {selectedOption.notes}
                    </p>
                  </div>
                  <span className="rounded bg-[#14b8a6]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#14b8a6]">
                    {selectedOption.mode}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Info label="Diarization" value={selectedOption.diarization} />
                  <Info label="Languages" value={selectedOption.languageCoverage} />
                  <Info label="Latency" value={selectedOption.latencyProfile} />
                  <Info label="Quality" value={selectedOption.qualityProfile} />
                  <Info label="Runtime" value={formatRuntimeStatus(selectedOption)} />
                  <Info label="Validated" value={selectedOption.validatedOn} />
                </dl>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <CostTile
                    label="30m call"
                    value={formatMoney(selectedStt.effectiveRatePerHourUsd / 2)}
                  />
                  <CostTile
                    label="Core enhanced STT cap"
                    value={formatMoney((selectedStt.effectiveRatePerHourUsd / 60) * 600)}
                  />
                  <CostTile
                    label="1k users"
                    value={formatMoney((selectedStt.effectiveRatePerHourUsd / 60) * 600 * 1000)}
                  />
                </div>
                {selectedOption.benchmark && (
                  <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-control)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedOption.benchmark.sourceLabel}: {selectedOption.benchmark.value}
                    </p>
                    <p className="mt-1">{selectedOption.benchmark.notes}</p>
                  </div>
                )}
                <Link
                  href={selectedOption.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#14b8a6] hover:text-[#2dd4bf]"
                >
                  Provider pricing source
                  <ExternalLink size={12} />
                </Link>
              </div>

              {selectedOption.addons && selectedOption.addons.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Add-ons
                  </p>
                  {selectedOption.addons.map((addon) => {
                    const checked = addonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className="flex min-h-[40px] items-center justify-between gap-3 rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-3 text-sm"
                      >
                        <span className="text-[var(--text-secondary)]">
                          {addon.label}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatMoney(addon.ratePerHourUsd)}/hr
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setAddonIds((current) =>
                                event.target.checked
                                  ? [...current, addon.id]
                                  : current.filter((id) => id !== addon.id),
                              )
                            }
                            className="h-4 w-4 accent-[#14b8a6]"
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Assumptions" description="Global knobs shared by every plan.">
              <NumberField
                label="Average meeting minutes"
                value={assumptions.averageMeetingMinutes}
                suffix="min"
                onChange={(value) => updateAssumption("averageMeetingMinutes", value)}
              />
              <NumberField
                label="LLM cost per meeting"
                value={assumptions.llmCostPerMeetingUsd}
                step="0.001"
                prefix="$"
                onChange={(value) => updateAssumption("llmCostPerMeetingUsd", value)}
              />
              <NumberField
                label="Platform cost per user"
                value={assumptions.platformCostPerUserUsd}
                step="0.05"
                prefix="$"
                onChange={(value) => updateAssumption("platformCostPerUserUsd", value)}
              />
              <NumberField
                label="Support cost per user"
                value={assumptions.supportCostPerUserUsd}
                step="0.05"
                prefix="$"
                onChange={(value) => updateAssumption("supportCostPerUserUsd", value)}
              />
              <NumberField
                label="Payment fee"
                value={assumptions.paymentFeePercent}
                step="0.1"
                suffix="%"
                onChange={(value) => updateAssumption("paymentFeePercent", value)}
              />
              <NumberField
                label="Fixed payment fee"
                value={assumptions.paymentFixedFeeUsd}
                step="0.01"
                prefix="$"
                onChange={(value) => updateAssumption("paymentFixedFeeUsd", value)}
              />
              <NumberField
                label="Target margin"
                value={assumptions.targetMarginPercent}
                suffix="%"
                onChange={(value) => updateAssumption("targetMarginPercent", value)}
              />
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Plan knobs" description="Edit price, modeled usage, enforceable minute limits, and overage.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3 font-medium">Plan</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Included</th>
                      <th className="px-3 py-2 font-medium">Expected</th>
                      <th className="px-3 py-2 font-medium">Quota min</th>
                      <th className="px-3 py-2 font-medium">Meet cap</th>
                      <th className="px-3 py-2 font-medium">Overage</th>
                      <th className="px-3 py-2 font-medium">Margin</th>
                      <th className="pl-3 py-2 font-medium">Target price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => {
                      const economics = planEconomics.find(
                        (item) => item.plan.id === plan.id,
                      );
                      return (
                        <tr key={plan.id} className="border-b border-[var(--border-subtle)] last:border-0">
                          <td className="py-3 pr-3 font-medium">{plan.name}</td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.monthlyPriceUsd}
                              prefix="$"
                              onChange={(value) => updatePlan(plan.id, "monthlyPriceUsd", value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.includedMinutes}
                              suffix="m"
                              onChange={(value) => updatePlan(plan.id, "includedMinutes", value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.expectedMinutes}
                              suffix="m"
                              onChange={(value) => updatePlan(plan.id, "expectedMinutes", value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.monthlyMinuteLimit ?? plan.includedMinutes}
                              suffix="m"
                              onChange={(value) => updatePlan(plan.id, "monthlyMinuteLimit", value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.meetingLimit ?? 0}
                              suffix="mtg"
                              onChange={(value) => updatePlan(plan.id, "meetingLimit", value <= 0 ? null : value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <MiniNumber
                              value={plan.overageUsdPerMinute}
                              prefix="$"
                              step="0.001"
                              onChange={(value) => updatePlan(plan.id, "overageUsdPerMinute", value)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`font-medium ${
                                (economics?.grossMarginPercent ?? -1) >= assumptions.targetMarginPercent
                                  ? "text-[var(--status-success)]"
                                  : "text-[var(--status-warning)]"
                              }`}
                            >
                              {formatPercent(economics?.grossMarginPercent ?? null)}
                            </span>
                          </td>
                          <td className="pl-3 py-3 text-[var(--text-secondary)]">
                            {economics ? formatMoney(economics.targetPriceUsd) : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <section className="grid gap-3 md:grid-cols-3">
              {planEconomics.map((item) => (
                <div key={item.plan.id} className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{item.plan.name}</h3>
                    {(item.grossMarginPercent ?? -1) >= assumptions.targetMarginPercent ? (
                      <Check size={16} className="text-[var(--status-success)]" />
                    ) : (
                      <AlertTriangle size={16} className="text-[var(--status-warning)]" />
                    )}
                  </div>
                  <dl className="mt-4 space-y-2 text-xs">
                    <Info label="Net revenue" value={formatMoney(item.netRevenueUsd)} />
                    <Info label="STT cost" value={formatMoney(item.sttCostUsd)} />
                    <Info label="LLM cost" value={formatMoney(item.llmCostUsd)} />
                    <Info label="Total cost" value={formatMoney(item.totalCostUsd)} />
                    <Info label="Profit" value={formatMoney(item.grossProfitUsd)} />
                    <Info
                      label="Break-even"
                      value={
                        item.breakEvenMinutes === null
                          ? "N/A"
                          : `${Math.round(item.breakEvenMinutes)} min`
                      }
                    />
                  </dl>
                </div>
              ))}
            </section>

            <Panel title="Provider comparison" description="Current alternatives normalized to an hourly rate.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3 font-medium">Provider</th>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Effective/hr</th>
                      <th className="px-3 py-2 font-medium">1,000 min</th>
                      <th className="px-3 py-2 font-medium">Runtime</th>
                      <th className="pl-3 py-2 font-medium">Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAlternatives.map((option) => {
                      const addons = defaultAddonsFor(option);
                      const rate = sttCostPerMinute(option, addons) * 60;
                      const isSelected = option.id === selectedOption.id;
                      return (
                        <tr
                          key={option.id}
                          className={`border-b border-[var(--border-subtle)] last:border-0 ${
                            isSelected ? "bg-[#14b8a6]/[0.06]" : ""
                          }`}
                        >
                          <td className="py-3 pr-3 font-medium">{option.providerLabel}</td>
                          <td className="px-3 py-3 text-[var(--text-secondary)]">{option.label}</td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">{option.mode}</td>
                          <td className="px-3 py-3">{formatMoney(rate)}</td>
                          <td className="px-3 py-3">{formatMoney((rate / 60) * 1000)}</td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">{formatRuntimeStatus(option)}</td>
                          <td className="pl-3 py-3 text-[var(--text-secondary)]">{option.qualityProfile}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </section>

        <Panel title="Version history" description="Save drafts freely. Activating a version makes quotas and admin defaults read from it.">
          <div className="space-y-2">
            {(configStore?.versions ?? []).slice(0, 8).map((version) => (
              <div
                key={version.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{version.name}</p>
                    <span className="rounded bg-[#14b8a6]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#14b8a6]">
                      {version.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {new Date(version.updatedAt).toLocaleString()} · {version.sttOptionId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyVersion(version)}
                    className="min-h-[36px] rounded-md border border-[var(--border-card)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => activateVersion(version.id)}
                    disabled={version.status === "active" || configStatus === "saving"}
                    className="min-h-[36px] rounded-md bg-[#14b8a6] px-3 text-xs font-medium text-[#042f2e] transition-colors hover:bg-[#2dd4bf] disabled:opacity-50"
                  >
                    Activate
                  </button>
                </div>
              </div>
            ))}
            {(!configStore || configStore.versions.length === 0) && (
              <p className="text-sm text-[var(--text-muted)]">No saved versions yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Source notes" description="Prices are admin inputs, not billing truth, until copied into Stripe and provider configs.">
          <div className="grid gap-2 text-xs text-[var(--text-secondary)] md:grid-cols-2">
            {Array.from(new Set(STT_PRICING_OPTIONS.map((option) => option.sourceUrl))).map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-3 py-2 transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
              >
                {url.replace(/^https?:\/\//, "")}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <Icon size={16} className="text-[#14b8a6]" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function ScenarioMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Icon size={14} className="text-[#14b8a6]" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}

function CostTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-control)] px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xs font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="mt-1 flex min-h-[40px] items-center rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-2">
        {prefix && <span className="text-xs text-[var(--text-muted)]">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(event) => onChange(toNumber(event.target.value, value))}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--text-primary)] outline-none"
        />
        {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
      </span>
    </label>
  );
}

function MiniNumber({
  value,
  onChange,
  prefix,
  suffix,
  step = "1",
}: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <span className="flex min-h-[36px] w-[104px] items-center rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-2">
      {prefix && <span className="text-xs text-[var(--text-muted)]">{prefix}</span>}
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(toNumber(event.target.value, value))}
        className="min-w-0 flex-1 bg-transparent px-1 text-sm text-[var(--text-primary)] outline-none"
      />
      {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
    </span>
  );
}
