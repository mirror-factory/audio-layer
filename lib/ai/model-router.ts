/**
 * Model Router -- hybrid local / gateway selection.
 *
 * Central entry point for resolving a model by "capability" rather
 * than by raw model ID. When `USE_LOCAL_MODELS=true`, routes text/chat/code
 * calls to local Ollama models; otherwise uses Vercel AI Gateway.
 *
 * HOW TO CUSTOMIZE:
 * 1. Update the import for your gateway provider (aiGateway, MODELS)
 * 2. Update LOCAL_MODELS in local-models.ts with your installed Ollama models
 * 3. Adjust model IDs in each function to match your preferences
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

// TODO: Update these imports for your project
// import { aiGateway, MODELS } from './gateway';
// import { isLocalModeEnabled, ollama, LOCAL_MODELS } from './local-models';

export type ChatMode = 'fast' | 'smart';
export type ImageMode = 'fast' | 'hq';

// Placeholder implementations -- replace with your actual provider imports
const isLocalModeEnabled = () => process.env.USE_LOCAL_MODELS === 'true';

// TODO: Replace these with real provider calls
const aiGateway = (modelId: string) => ({ modelId, provider: 'gateway' } as unknown);
const ollama = (modelId: string) => ({ modelId, provider: 'ollama' } as unknown);

const MODELS = {
  CHAT_FAST: 'google/gemini-2.5-flash',
  CHAT_SMART: 'google/gemini-2.5-pro',
  FLASH_LITE: 'google/gemini-2.0-flash-lite',
  IMAGE_FAST: 'google/imagen-4.0-fast-generate-001',
  IMAGE_HQ: 'google/imagen-4.0-generate-001',
};

const LOCAL_MODELS = {
  chatFast: 'gemma3:12b',
  chat: 'gemma3:27b',
  coder: 'qwen3:14b',
  vision: 'llama3.2-vision:11b',
};

// ============================================================================
// Chat / Text
// ============================================================================

export function getChatModel(mode: ChatMode = 'fast') {
  if (isLocalModeEnabled()) {
    return ollama(mode === 'fast' ? LOCAL_MODELS.chatFast : LOCAL_MODELS.chat);
  }
  return aiGateway(mode === 'fast' ? MODELS.CHAT_FAST : MODELS.CHAT_SMART);
}

export function getCoderModel() {
  if (isLocalModeEnabled()) {
    return ollama(LOCAL_MODELS.coder);
  }
  return aiGateway(MODELS.CHAT_SMART);
}

export function getLiteModel() {
  if (isLocalModeEnabled()) {
    return ollama(LOCAL_MODELS.chatFast);
  }
  return aiGateway(MODELS.FLASH_LITE);
}

export function getVisionModel() {
  if (isLocalModeEnabled()) {
    return ollama(LOCAL_MODELS.vision);
  }
  return aiGateway(MODELS.CHAT_FAST);
}

// ============================================================================
// Image Generation (never local)
// ============================================================================

export function getImageModel(mode: ImageMode = 'fast') {
  // No local image model -- always use gateway
  return aiGateway(mode === 'fast' ? MODELS.IMAGE_FAST : MODELS.IMAGE_HQ);
}

// ============================================================================
// Diagnostics
// ============================================================================

export function describeRoute() {
  const local = isLocalModeEnabled();
  return {
    local,
    chatFast: local ? LOCAL_MODELS.chatFast : MODELS.CHAT_FAST,
    chatSmart: local ? LOCAL_MODELS.chat : MODELS.CHAT_SMART,
    coder: local ? LOCAL_MODELS.coder : MODELS.CHAT_SMART,
    vision: local ? LOCAL_MODELS.vision : MODELS.CHAT_FAST,
    imageFast: MODELS.IMAGE_FAST,
    imageHq: MODELS.IMAGE_HQ,
  };
}
