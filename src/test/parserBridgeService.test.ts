import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeSkillText } from '../services/parserBridgeService';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parserBridgeService', () => {
  it('posts skill text to the parser bridge endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ projectId: 'SKILL-0-1234' }),
    } as Response);

    const result = await analyzeSkillText('# demo', 'demo-skill');

    expect(fetchMock).toHaveBeenCalledWith('/api/parse-skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '# demo', skillName: 'demo-skill' }),
    });
    expect(result).toEqual({ projectId: 'SKILL-0-1234' });
  });

  it('surfaces bridge errors from the API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Bridge unavailable' }),
    } as Response);

    await expect(analyzeSkillText('# demo')).rejects.toThrow('Bridge unavailable');
  });

  it('includes context files and primary path when bundle analysis is requested', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ projectId: 'SKILL-0-bundle' }),
    } as Response);

    await analyzeSkillText('# demo', 'demo-skill', {
      primaryPath: 'skills/demo/SKILL.md',
      contextFiles: [{
        name: 'policy.md',
        path: 'skills/demo/docs/policy.md',
        type: '.md',
        size: 14,
        role: 'context',
        source: 'upload',
        text: '# Policy',
      }],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/parse-skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '# demo',
        skillName: 'demo-skill',
        primaryPath: 'skills/demo/SKILL.md',
        contextFiles: [{
          name: 'policy.md',
          path: 'skills/demo/docs/policy.md',
          type: '.md',
          size: 14,
          role: 'context',
          source: 'upload',
          preview: undefined,
          text: '# Policy',
        }],
      }),
    });
  });
});
