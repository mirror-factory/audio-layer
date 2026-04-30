import {
  STT_PRICING_OPTIONS,
  type SttPricingOption,
} from "@/lib/billing/stt-pricing";
import { DEFAULTS, type ModelSettings } from "@/lib/settings-shared";

export type RuntimeTranscriptionProvider = "assemblyai" | "deepgram";

const RUNTIME_PROVIDERS = new Set<string>(["assemblyai", "deepgram"]);

function isRuntimeProvider(
  provider: string,
): provider is RuntimeTranscriptionProvider {
  return RUNTIME_PROVIDERS.has(provider);
}

function streamingRuntimeOptions(): SttPricingOption[] {
  return STT_PRICING_OPTIONS.filter(
    (option) =>
      option.mode === "streaming" &&
      option.runtimeStatus === "implemented" &&
      isRuntimeProvider(option.provider),
  );
}

export function resolveRuntimeStreamingOption(
  settings: Pick<ModelSettings, "streamingSpeechModel">,
): SttPricingOption {
  const options = streamingRuntimeOptions();
  const configured = options.find(
    (option) => option.model === settings.streamingSpeechModel,
  );
  if (configured) return configured;

  const fallback = (
    options.find((option) => option.model === DEFAULTS.streamingSpeechModel) ??
    options[0]
  );
  if (!fallback) {
    throw new Error("No runtime streaming transcription options are configured");
  }
  return fallback;
}

export function runtimeProviderForOption(
  option: SttPricingOption,
): RuntimeTranscriptionProvider {
  return isRuntimeProvider(option.provider) ? option.provider : "assemblyai";
}

export function providerEnvVarName(
  provider: RuntimeTranscriptionProvider,
): "ASSEMBLYAI_API_KEY" | "DEEPGRAM_API_KEY" {
  return provider === "deepgram" ? "DEEPGRAM_API_KEY" : "ASSEMBLYAI_API_KEY";
}
