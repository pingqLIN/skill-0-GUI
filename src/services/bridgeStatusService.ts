export type BridgeStatus = {
  mode: 'skill-0' | 'standalone';
  skill0Root: string | null;
};

export async function fetchBridgeStatus(): Promise<BridgeStatus> {
  const response = await fetch('/api/bridge-status');
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.mode) {
    throw new Error(payload?.error || 'Failed to fetch bridge status');
  }

  return {
    mode: payload.mode,
    skill0Root: payload.skill0Root ?? null,
  };
}
