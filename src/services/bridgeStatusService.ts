export type BridgeStatus = {
  mode: 'skill-0' | 'standalone';
  skill0Root: string | null;
  llmFallbackAvailable?: boolean;
  llmProvider?: string | null;
  llmModel?: string | null;
  llmReason?: string | null;
  llmSupportsJsonSchema?: boolean;
  llmSupportsReasoning?: boolean;
};

export async function fetchBridgeStatus(): Promise<BridgeStatus> {
  const response = await fetch('/api/bridge-status');
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.mode) {
    throw new Error(payload?.detail || payload?.error || 'Failed to fetch bridge status');
  }

  return {
    llmFallbackAvailable: Boolean(payload.llmFallbackAvailable),
    llmModel: typeof payload.llmModel === 'string' ? payload.llmModel : null,
    llmProvider: typeof payload.llmProvider === 'string' ? payload.llmProvider : null,
    llmReason: typeof payload.llmReason === 'string' ? payload.llmReason : null,
    llmSupportsJsonSchema: Boolean(payload.llmSupportsJsonSchema),
    llmSupportsReasoning: Boolean(payload.llmSupportsReasoning),
    mode: payload.mode,
    skill0Root: payload.skill0Root ?? null,
  };
}
