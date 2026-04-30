import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  DEFAULT_CUSTOMER_MIX,
  DEFAULT_PRICING_ASSUMPTIONS,
  DEFAULT_PRICING_PLANS,
  type CustomerMixInput,
  type PricingAssumptions,
  type PricingPlanInput,
} from "@/lib/billing/stt-pricing";

export type PricingConfigStatus = "draft" | "active" | "archived";
export type PricingConfigSource = "supabase" | "file" | "default";

export interface PricingConfigVersion {
  id: string;
  name: string;
  status: PricingConfigStatus;
  startsAt: string;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sttOptionId: string;
  addonIds: string[];
  assumptions: PricingAssumptions;
  plans: PricingPlanInput[];
  customerMix: CustomerMixInput[];
  notes?: string;
}

export interface PricingConfigStore {
  source: PricingConfigSource;
  active: PricingConfigVersion;
  versions: PricingConfigVersion[];
}

const DEFAULT_STT_OPTION_ID = "deepgram:nova-3:streaming";
const DEFAULT_ADDONS: string[] = ["speakerDiarization"];

const PlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  monthlyPriceUsd: z.number().min(0),
  includedMinutes: z.number().min(0),
  expectedMinutes: z.number().min(0),
  overageUsdPerMinute: z.number().min(0),
  meetingLimit: z.number().int().min(0).nullable().optional(),
  meetingLimitPeriod: z.enum(["lifetime", "monthly"]).optional(),
  monthlyMinuteLimit: z.number().min(0).nullable().optional(),
});

const AssumptionsSchema = z.object({
  averageMeetingMinutes: z.number().min(1),
  llmCostPerMeetingUsd: z.number().min(0),
  platformCostPerUserUsd: z.number().min(0),
  supportCostPerUserUsd: z.number().min(0),
  paymentFeePercent: z.number().min(0).max(100),
  paymentFixedFeeUsd: z.number().min(0),
  targetMarginPercent: z.number().min(0).max(95),
});

const CustomerMixSchema = z.object({
  planId: z.string().min(1),
  customers: z.number().int().min(0),
});

export const PricingConfigPayloadSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  startsAt: z.string().datetime().optional(),
  sttOptionId: z.string().min(1),
  addonIds: z.array(z.string().min(1)),
  assumptions: AssumptionsSchema,
  plans: z.array(PlanSchema).min(1),
  customerMix: z.array(CustomerMixSchema).min(1),
  notes: z.string().max(500).optional(),
});

export type PricingConfigPayload = z.infer<typeof PricingConfigPayloadSchema>;

const FileStoreSchema = z.object({
  activeVersionId: z.string().min(1),
  versions: z.array(
    PricingConfigPayloadSchema.extend({
      id: z.string().min(1),
      name: z.string().min(1),
      status: z.enum(["draft", "active", "archived"]),
      startsAt: z.string().datetime(),
      activatedAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
});

type FileStore = z.infer<typeof FileStoreSchema>;

function nowIso(): string {
  return new Date().toISOString();
}

function pricingConfigPath(): string {
  return process.env.PRICING_CONFIG_FILE ??
    join(process.cwd(), ".ai-dev-kit", "pricing-config.json");
}

function createDefaultVersion(): PricingConfigVersion {
  const now = nowIso();
  return {
    id: "default-active",
    name: "Default active pricing",
    status: "active",
    startsAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
    sttOptionId: DEFAULT_STT_OPTION_ID,
    addonIds: DEFAULT_ADDONS,
    assumptions: DEFAULT_PRICING_ASSUMPTIONS,
    plans: DEFAULT_PRICING_PLANS,
    customerMix: DEFAULT_CUSTOMER_MIX,
    notes: "Generated fallback config.",
  };
}

function normalizeVersion(version: PricingConfigVersion): PricingConfigVersion {
  return {
    ...version,
    plans: version.plans.map((plan) => ({
      ...plan,
      meetingLimit: plan.meetingLimit ?? null,
      meetingLimitPeriod: plan.meetingLimitPeriod ?? "monthly",
      monthlyMinuteLimit: plan.monthlyMinuteLimit ?? plan.includedMinutes,
    })),
  };
}

function defaultStore(source: PricingConfigSource = "default"): PricingConfigStore {
  const active = normalizeVersion(createDefaultVersion());
  return { source, active, versions: [active] };
}

function toFileStore(store: PricingConfigStore): FileStore {
  return {
    activeVersionId: store.active.id,
    versions: store.versions,
  };
}

function fromFileStore(fileStore: FileStore, source: PricingConfigSource): PricingConfigStore {
  const versions = fileStore.versions.map((version) =>
    normalizeVersion(version as PricingConfigVersion),
  );
  const active =
    versions.find((version) => version.id === fileStore.activeVersionId) ??
    versions.find((version) => version.status === "active") ??
    versions[0] ??
    createDefaultVersion();

  return { source, active: normalizeVersion(active), versions };
}

function readFileStore(): PricingConfigStore | null {
  const path = pricingConfigPath();
  if (!existsSync(path)) return null;

  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    const parsed = FileStoreSchema.parse(raw);
    return fromFileStore(parsed, "file");
  } catch {
    return null;
  }
}

function writeFileStore(store: PricingConfigStore): PricingConfigStore {
  const path = pricingConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(toFileStore(store), null, 2) + "\n", "utf-8");
  return { ...store, source: "file" };
}

function rowToVersion(row: Record<string, unknown>): PricingConfigVersion {
  const config = row.config as PricingConfigPayload;
  return normalizeVersion({
    id: String(row.id),
    name: String(row.name ?? "Pricing version"),
    status: row.status as PricingConfigStatus,
    startsAt: String(row.starts_at),
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sttOptionId: config.sttOptionId,
    addonIds: config.addonIds,
    assumptions: config.assumptions,
    plans: config.plans,
    customerMix: config.customerMix,
    notes: typeof row.notes === "string" ? row.notes : config.notes,
  });
}

async function readSupabaseStore(): Promise<PricingConfigStore | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("pricing_config_versions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error || !data || data.length === 0) return null;

  const versions = data.map((row) => rowToVersion(row as Record<string, unknown>));
  const active =
    versions.find((version) => version.status === "active") ??
    normalizeVersion(createDefaultVersion());
  const versionList = versions.some((version) => version.id === active.id)
    ? versions
    : [...versions, active];
  return { source: "supabase", active, versions: versionList };
}

export async function getPricingConfigStore(): Promise<PricingConfigStore> {
  const supabaseStore = await readSupabaseStore();
  if (supabaseStore) return supabaseStore;

  const fileStore = readFileStore();
  if (fileStore) return fileStore;

  const initial = defaultStore("file");
  return writeFileStore(initial);
}

export async function getActivePricingConfig(): Promise<PricingConfigVersion> {
  const store = await getPricingConfigStore();
  return store.active;
}

export function buildPricingConfigDraft(
  payload: PricingConfigPayload,
): PricingConfigVersion {
  const parsed = PricingConfigPayloadSchema.parse(payload);
  const now = nowIso();
  return normalizeVersion({
    id: `price_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: parsed.name ?? `Pricing draft ${new Date(now).toLocaleDateString("en-US")}`,
    status: "draft",
    startsAt: parsed.startsAt ?? now,
    activatedAt: null,
    createdAt: now,
    updatedAt: now,
    sttOptionId: parsed.sttOptionId,
    addonIds: parsed.addonIds,
    assumptions: parsed.assumptions,
    plans: parsed.plans,
    customerMix: parsed.customerMix,
    notes: parsed.notes,
  });
}

async function saveSupabaseDraft(version: PricingConfigVersion): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  const { error } = await supabase.from("pricing_config_versions").insert({
    id: version.id,
    name: version.name,
    status: version.status,
    starts_at: version.startsAt,
    activated_at: version.activatedAt,
    config: {
      sttOptionId: version.sttOptionId,
      addonIds: version.addonIds,
      assumptions: version.assumptions,
      plans: version.plans,
      customerMix: version.customerMix,
      notes: version.notes,
    },
    notes: version.notes ?? null,
  });

  return !error;
}

export async function savePricingConfigDraft(
  payload: PricingConfigPayload,
): Promise<PricingConfigStore> {
  const version = buildPricingConfigDraft(payload);
  const savedToSupabase = await saveSupabaseDraft(version);
  if (savedToSupabase) return getPricingConfigStore();

  const store = await getPricingConfigStore();
  const next = {
    ...store,
    versions: [version, ...store.versions].slice(0, 25),
  };
  return writeFileStore(next);
}

async function activateSupabaseVersion(id: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  const target = await supabase
    .from("pricing_config_versions")
    .select("id")
    .eq("id", id)
    .single();
  if (target.error || !target.data) return false;

  const activatedAt = nowIso();
  const archive = await supabase
    .from("pricing_config_versions")
    .update({ status: "archived" })
    .eq("status", "active");
  if (archive.error) return false;

  const activate = await supabase
    .from("pricing_config_versions")
    .update({ status: "active", activated_at: activatedAt, starts_at: activatedAt })
    .eq("id", id);

  return !activate.error;
}

export async function activatePricingConfigVersion(
  id: string,
): Promise<PricingConfigStore> {
  const activatedInSupabase = await activateSupabaseVersion(id);
  if (activatedInSupabase) return getPricingConfigStore();

  const store = await getPricingConfigStore();
  const target = store.versions.find((version) => version.id === id);
  if (!target) {
    throw new Error(`Unknown pricing config version: ${id}`);
  }

  const activatedAt = nowIso();
  const versions = store.versions.map((version) => {
    if (version.id === id) {
      return normalizeVersion({
        ...version,
        status: "active",
        activatedAt,
        startsAt: activatedAt,
        updatedAt: activatedAt,
      });
    }
    if (version.status === "active") {
      return { ...version, status: "archived" as const, updatedAt: activatedAt };
    }
    return version;
  });

  const active = versions.find((version) => version.id === id) ?? target;
  return writeFileStore({ source: "file", active, versions });
}

export function planForTier(
  config: PricingConfigVersion,
  tier: "free" | "core" | "pro" | string | null,
): PricingPlanInput {
  const id = tier && config.plans.some((plan) => plan.id === tier) ? tier : "free";
  return config.plans.find((plan) => plan.id === id) ??
    config.plans.find((plan) => plan.id === "free") ??
    DEFAULT_PRICING_PLANS[0];
}
