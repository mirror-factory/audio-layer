import { DeepgramClient } from "@deepgram/sdk";

let instance: DeepgramClient | null = null;
let instanceApiKey: string | null = null;
type Env = Record<string, string | undefined>;

export class DeepgramConfigurationError extends Error {
  code = "missing_deepgram_api_key";

  constructor() {
    super("DEEPGRAM_API_KEY is required for Deepgram transcription");
    this.name = "DeepgramConfigurationError";
  }
}

export function getDeepgramApiKey(
  env: Env = process.env as Env,
): string | null {
  const apiKey = env.DEEPGRAM_API_KEY?.trim();
  return apiKey || null;
}

export function getDeepgramClient(): DeepgramClient | null {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) return null;

  if (instance && instanceApiKey === apiKey) return instance;

  instance = new DeepgramClient({ apiKey });
  instanceApiKey = apiKey;
  return instance;
}

export function requireDeepgramClient(): DeepgramClient {
  const client = getDeepgramClient();
  if (!client) throw new DeepgramConfigurationError();
  return client;
}

export async function createDeepgramStreamingToken(
  ttlSeconds = 600,
): Promise<{ token: string; expiresAt: number }> {
  const response = await requireDeepgramClient().auth.v1.tokens.grant({
    ttl_seconds: ttlSeconds,
  });
  const token = response.access_token?.trim();

  if (!token) {
    throw new Error("Deepgram did not return a streaming access token");
  }

  return {
    token,
    expiresAt: Date.now() + (response.expires_in ?? ttlSeconds) * 1000,
  };
}
