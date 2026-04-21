// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveParserRequestTimeoutMs } from '../../bridge/requestTimeout.mjs';

describe('resolveParserRequestTimeoutMs', () => {
  it('returns the base timeout when llm runtime mode is disabled', () => {
    expect(resolveParserRequestTimeoutMs({
      baseTimeoutMs: 20000,
      runtimeConfig: {
        mode: 'disabled',
        timeoutMs: 60000,
      },
    })).toBe(20000);
  });

  it('extends the parse timeout when llm force mode is configured', () => {
    expect(resolveParserRequestTimeoutMs({
      baseTimeoutMs: 20000,
      runtimeConfig: {
        apiKey: 'sk-test',
        mode: 'force',
        model: 'gpt-5.4',
        provider: 'openai',
        timeoutMs: 60000,
      },
    })).toBe(70000);
  });

  it('keeps the larger base timeout when the llm timeout is shorter', () => {
    expect(resolveParserRequestTimeoutMs({
      baseTimeoutMs: 45000,
      runtimeConfig: {
        apiKey: 'sk-test',
        mode: 'fallback',
        model: 'gpt-4.1-mini',
        provider: 'openai',
        timeoutMs: 15000,
      },
    })).toBe(45000);
  });

  it('does not extend the timeout without a usable llm runtime configuration', () => {
    expect(resolveParserRequestTimeoutMs({
      baseTimeoutMs: 20000,
      runtimeConfig: {
        apiKey: '',
        mode: 'force',
        model: 'gpt-5.4',
        provider: 'openai',
        timeoutMs: 60000,
      },
    })).toBe(20000);
  });
});
