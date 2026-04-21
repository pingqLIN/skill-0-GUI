// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createLLMRuntimeConfigStore } from '../../bridge/llmRuntimeConfigStore.mjs';

describe('createLLMRuntimeConfigStore', () => {
  it('normalizes pasted bearer-prefixed API keys before storing them', () => {
    const store = createLLMRuntimeConfigStore({ mutable: true });

    const payload = store.updateRuntimeConfig({
      apiKey: 'Authorization: Bearer sk-proj-test-key',
      provider: 'openai',
    });

    expect(payload.settings.apiKeyConfigured).toBe(true);
    expect(payload.settings.apiKeySource).toBe('runtime');
    expect(store.getRuntimeConfig().apiKey).toBe('sk-proj-test-key');
  });

  it('rejects whitespace-separated API key payloads', () => {
    const store = createLLMRuntimeConfigStore({ mutable: true });

    try {
      store.updateRuntimeConfig({
        apiKey: 'sk-proj-test-key extra-text',
        provider: 'openai',
      });
      throw new Error('Expected updateRuntimeConfig to reject an invalid API key payload.');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'llm_settings_invalid_api_key_format',
        detail: 'Paste only the API key value. Do not include Authorization:, Bearer, or whitespace-separated text.',
      });
    }
  });
});
