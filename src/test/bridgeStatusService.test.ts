import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBridgeStatus } from '../services/bridgeStatusService';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bridgeStatusService', () => {
  it('returns the current parser mode and root', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'skill-0', skill0Root: '/tmp/skill-0' }),
    } as Response);

    const result = await fetchBridgeStatus();

    expect(fetchMock).toHaveBeenCalledWith('/api/bridge-status');
    expect(result).toEqual({ mode: 'skill-0', skill0Root: '/tmp/skill-0' });
  });

  it('throws when the bridge status endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Bridge status unavailable' }),
    } as Response);

    await expect(fetchBridgeStatus()).rejects.toThrow('Bridge status unavailable');
  });
});
