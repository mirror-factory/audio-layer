/**
 * Local Model Dev Mode -- Ollama
 *
 * Provides a free local-model path for development/testing. When
 * `USE_LOCAL_MODELS=true`, chat/text requests route through Ollama.
 *
 * LIMITATIONS:
 * 1. Tool streaming may not be fully supported by all Ollama providers
 * 2. Image generation is NOT available locally
 * 3. Tool calling quality varies by model
 * 4. No embeddings fallback
 *
 * HOW TO CUSTOMIZE:
 * 1. Install Ollama: https://ollama.ai
 * 2. Pull your preferred models: `ollama pull gemma3:12b`
 * 3. Update LOCAL_MODELS below with your installed models
 * 4. Set USE_LOCAL_MODELS=true in .env.local
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

// TODO: Install and import your Ollama provider package
// import { createOllama, type OllamaProvider } from 'ollama-ai-provider-v2';

// ============================================================================
// Provider Singleton
// ============================================================================

let _ollama: unknown = null;

export function getOllama(): unknown {
  if (!_ollama) {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const apiURL = baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;
    // TODO: Uncomment when you install ollama-ai-provider-v2
    // _ollama = createOllama({ baseURL: apiURL });
    _ollama = { baseURL: apiURL }; // placeholder
  }
  return _ollama;
}

export function ollama(modelId: string) {
  // TODO: Replace with actual provider call
  // return getOllama()(modelId);
  return { modelId, provider: 'ollama' } as unknown;
}

// ============================================================================
// Local Model Registry
// ============================================================================

/**
 * Installed Ollama models. Update with `ollama list` output.
 * Recommended starting set for any project:
 */
export const LOCAL_MODELS = {
  /** Primary chat model -- best quality */
  chat: 'gemma3:27b',

  /** Fast chat model -- lower latency */
  chatFast: 'gemma3:12b',

  /** General reasoning */
  qwen: 'qwen3:8b',

  /** Code generation/editing */
  coder: 'qwen3:14b',

  /** Multimodal / image analysis */
  vision: 'llama3.2-vision:11b',
} as const;

export type LocalModelKey = keyof typeof LOCAL_MODELS;
export type LocalModelId = (typeof LOCAL_MODELS)[LocalModelKey];

// ============================================================================
// Mode Detection
// ============================================================================

export function isLocalModeEnabled(): boolean {
  return process.env.USE_LOCAL_MODELS === 'true';
}

export function getOllamaBaseURL(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
}
