export type DeepgramListenVersion = "v1" | "v2";

export interface DeepgramStreamingConfig {
  settingsModel: string;
  label: string;
  listenVersion: DeepgramListenVersion;
  endpoint: "/v1/listen" | "/v2/listen";
  sampleRate: number;
  query: Record<string, string>;
}

const SAMPLE_RATE = 16000;
const DEEPGRAM_WS_ORIGIN = "wss://api.deepgram.com";

export const DEEPGRAM_STREAMING_CONFIGS: DeepgramStreamingConfig[] = [
  {
    settingsModel: "nova-3",
    label: "Nova-3 Monolingual",
    listenVersion: "v1",
    endpoint: "/v1/listen",
    sampleRate: SAMPLE_RATE,
    query: {
      model: "nova-3",
      language: "en",
      encoding: "linear16",
      sample_rate: String(SAMPLE_RATE),
      punctuate: "true",
      smart_format: "true",
      interim_results: "true",
      diarize: "true",
      endpointing: "300",
    },
  },
  {
    settingsModel: "nova-3-multilingual",
    label: "Nova-3 Multilingual",
    listenVersion: "v1",
    endpoint: "/v1/listen",
    sampleRate: SAMPLE_RATE,
    query: {
      model: "nova-3",
      language: "multi",
      encoding: "linear16",
      sample_rate: String(SAMPLE_RATE),
      punctuate: "true",
      smart_format: "true",
      interim_results: "true",
      diarize: "true",
      endpointing: "300",
    },
  },
  {
    settingsModel: "flux",
    label: "Flux",
    listenVersion: "v2",
    endpoint: "/v2/listen",
    sampleRate: SAMPLE_RATE,
    query: {
      model: "flux-general-en",
      encoding: "linear16",
      sample_rate: String(SAMPLE_RATE),
    },
  },
];

export function getDeepgramStreamingConfig(
  settingsModel: string,
): DeepgramStreamingConfig | null {
  return (
    DEEPGRAM_STREAMING_CONFIGS.find(
      (option) => option.settingsModel === settingsModel,
    ) ?? null
  );
}

export function buildDeepgramListenUrl(config: DeepgramStreamingConfig): string {
  const url = new URL(`${DEEPGRAM_WS_ORIGIN}${config.endpoint}`);
  for (const [key, value] of Object.entries(config.query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
