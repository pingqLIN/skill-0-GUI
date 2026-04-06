import type { BridgeStatus } from './bridgeStatusService';

export type LlmSettings = {
  apiKeyConfigured: boolean;
  apiKeySource: 'env' | 'runtime' | 'none';
  maxInputChars: number;
  mode: 'disabled' | 'fallback' | 'force';
  model: string;
  mutable: boolean;
  provider: 'openai' | 'gemini' | 'anthropic' | null;
  timeoutMs: number;
  updatedAt: string | null;
};

export type LlmSettingsResponse = {
  bridgeStatus: BridgeStatus;
  options: {
    modeValues: Array<'disabled' | 'fallback' | 'force'>;
    providerValues: Array<'openai' | 'gemini' | 'anthropic'>;
  };
  settings: LlmSettings;
};

export type LlmSettingsUpdateInput = {
  apiKey?: string;
  clearApiKey?: boolean;
  maxInputChars: number;
  mode: 'disabled' | 'fallback' | 'force';
  model: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  timeoutMs: number;
};

function mapBridgeStatus(payload: Record<string, unknown>): BridgeStatus {
  return {
    llmFallbackAvailable: Boolean(payload.llmFallbackAvailable),
    llmModel: typeof payload.llmModel === 'string' ? payload.llmModel : null,
    llmProvider: typeof payload.llmProvider === 'string' ? payload.llmProvider : null,
    llmReason: typeof payload.llmReason === 'string' ? payload.llmReason : null,
    llmSupportsJsonSchema: Boolean(payload.llmSupportsJsonSchema),
    llmSupportsReasoning: Boolean(payload.llmSupportsReasoning),
    mode: payload.mode === 'skill-0' ? 'skill-0' : 'standalone',
    skill0Root: typeof payload.skill0Root === 'string' ? payload.skill0Root : null,
  };
}

function mapSettingsResponse(payload: any): LlmSettingsResponse {
  if (!payload?.settings || !payload?.bridgeStatus) {
    throw new Error('Failed to load LLM settings');
  }

  const provider = payload.settings.provider === 'openai' || payload.settings.provider === 'gemini' || payload.settings.provider === 'anthropic'
    ? payload.settings.provider
    : null;
  const apiKeySource = payload.settings.apiKeySource === 'env' || payload.settings.apiKeySource === 'runtime'
    ? payload.settings.apiKeySource
    : 'none';
  const mode = payload.settings.mode === 'fallback' || payload.settings.mode === 'force'
    ? payload.settings.mode
    : 'disabled';

  return {
    bridgeStatus: mapBridgeStatus(payload.bridgeStatus),
    options: {
      modeValues: Array.isArray(payload.options?.modeValues) ? payload.options.modeValues : ['disabled', 'fallback', 'force'],
      providerValues: Array.isArray(payload.options?.providerValues) ? payload.options.providerValues : ['openai', 'gemini', 'anthropic'],
    },
    settings: {
      apiKeyConfigured: Boolean(payload.settings.apiKeyConfigured),
      apiKeySource,
      maxInputChars: Number(payload.settings.maxInputChars || 12000),
      mode,
      model: typeof payload.settings.model === 'string' ? payload.settings.model : '',
      mutable: Boolean(payload.settings.mutable),
      provider,
      timeoutMs: Number(payload.settings.timeoutMs || 15000),
      updatedAt: typeof payload.settings.updatedAt === 'string' ? payload.settings.updatedAt : null,
    },
  };
}

export async function fetchLlmSettings(): Promise<LlmSettingsResponse> {
  const response = await fetch('/api/llm-settings');
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || 'Failed to load LLM settings');
  }

  return mapSettingsResponse(payload);
}

export async function updateLlmSettings(input: LlmSettingsUpdateInput): Promise<LlmSettingsResponse> {
  const response = await fetch('/api/llm-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || 'Failed to update LLM settings');
  }

  return mapSettingsResponse(payload);
}
