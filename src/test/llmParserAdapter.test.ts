// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { createLLMParserAdapter } from '../../bridge/llmParserAdapter.mjs';

describe('createLLMParserAdapter', () => {
  it('wraps provider transport failures into structured network errors', async () => {
    const fetchError = new TypeError('fetch failed') as TypeError & { cause?: Error };
    fetchError.cause = new Error('getaddrinfo ENOTFOUND api.openai.com');
    const fetchImpl = vi.fn(async () => {
      throw fetchError;
    });
    const adapter = createLLMParserAdapter({
      apiKey: 'sk-test',
      fetchImpl,
      mode: 'force',
      model: 'gpt-4.1-mini',
      provider: 'openai',
      timeoutMs: 1500,
    });

    await expect(adapter.parseUnknownSkill({
      fallbackReason: 'LLM force mode regression test',
      schemaPath: 'https://example.com/schema.json',
      skillName: 'future-format',
      text: '{"workflow":["ingest","review","export"]}',
    })).rejects.toMatchObject({
      code: 'llm_provider_network_error',
      detail: expect.stringContaining('ENOTFOUND api.openai.com'),
      provider: 'openai',
      statusCode: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('adds TLS trust guidance for certificate-chain transport failures', async () => {
    const fetchError = new TypeError('fetch failed') as TypeError & { cause?: Error };
    fetchError.cause = new Error('self-signed certificate in certificate chain');
    const fetchImpl = vi.fn(async () => {
      throw fetchError;
    });
    const adapter = createLLMParserAdapter({
      apiKey: 'sk-test',
      fetchImpl,
      mode: 'force',
      model: 'gpt-4.1-mini',
      provider: 'openai',
      timeoutMs: 1500,
    });

    await expect(adapter.parseUnknownSkill({
      fallbackReason: 'LLM force mode TLS regression test',
      schemaPath: 'https://example.com/schema.json',
      skillName: 'future-format',
      text: '{"workflow":["ingest","review","export"]}',
    })).rejects.toMatchObject({
      code: 'llm_provider_network_error',
      detail: expect.stringContaining('NODE_EXTRA_CA_CERTS'),
      provider: 'openai',
      statusCode: 503,
    });
  });

  it('preserves structured provider HTTP failures without rewrapping them', async () => {
    const fetchImpl = vi.fn(async () => ({
      json: async () => ({
        error: {
          message: 'Rate limit exceeded.',
        },
      }),
      ok: false,
      status: 429,
    }));
    const adapter = createLLMParserAdapter({
      apiKey: 'sk-test',
      fetchImpl,
      mode: 'force',
      model: 'gpt-4.1-mini',
      provider: 'openai',
      timeoutMs: 1500,
    });

    await expect(adapter.parseUnknownSkill({
      fallbackReason: 'LLM force mode regression test',
      schemaPath: 'https://example.com/schema.json',
      skillName: 'future-format',
      text: '{"workflow":["ingest","review","export"]}',
    })).rejects.toMatchObject({
      code: 'llm_provider_rate_limited',
      detail: 'Rate limit exceeded.',
      provider: 'openai',
      statusCode: 503,
    });
  });

  it('returns actionable guidance when OpenAI reports a missing bearer token', async () => {
    const fetchImpl = vi.fn(async () => ({
      json: async () => ({
        error: {
          message: 'Missing bearer authentication in header',
        },
      }),
      ok: false,
      status: 401,
    }));
    const adapter = createLLMParserAdapter({
      apiKey: 'sk-test',
      fetchImpl,
      mode: 'force',
      model: 'gpt-4.1-mini',
      provider: 'openai',
      timeoutMs: 1500,
    });

    await expect(adapter.parseUnknownSkill({
      fallbackReason: 'LLM force mode auth regression test',
      schemaPath: 'https://example.com/schema.json',
      skillName: 'future-format',
      text: '{"workflow":["ingest","review","export"]}',
    })).rejects.toMatchObject({
      code: 'llm_provider_request_failed',
      detail: 'OpenAI rejected the configured API key. Save the raw API key only, without Authorization: or Bearer text.',
      provider: 'openai',
      statusCode: 401,
    });
  });
});
