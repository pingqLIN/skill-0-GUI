// @vitest-environment node

import type { Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createServerApp } from '../../server.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function startTestServer(
  mode = 'standalone',
  bridge?: Parameters<typeof createServerApp>[0]['bridge'],
  llmAdmin?: Parameters<typeof createServerApp>[0]['llmAdmin'],
) {
  const { app } = createServerApp({ bridge, llmAdmin, mode, projectRoot });

  return await new Promise<{ server: Server; url: string }>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Unable to resolve test server address.'));
        return;
      }

      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });

    server.on('error', reject);
  });
}

async function stopTestServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

let activeServer: Server | null = null;

afterEach(async () => {
  if (activeServer) {
    await stopTestServer(activeServer);
    activeServer = null;
  }
});

describe('server runtime routes', () => {
  it('serves a deployment-safe health endpoint without touching parser state', async () => {
    const runtime = await startTestServer();
    activeServer = runtime.server;

    const response = await fetch(`${runtime.url}/healthz`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      mode: 'standalone',
      parserRootConfigured: false,
    });
  });

  it('serves bridge status and example skill endpoints in standalone mode', async () => {
    const runtime = await startTestServer();
    activeServer = runtime.server;

    const [statusResponse, exampleResponse] = await Promise.all([
      fetch(`${runtime.url}/api/bridge-status`),
      fetch(`${runtime.url}/api/example-skill`),
    ]);

    const statusPayload = await statusResponse.json();
    const examplePayload = await exampleResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusPayload).toMatchObject({
      llmFallbackAvailable: false,
      mode: 'standalone',
      skill0Root: null,
    });

    expect(exampleResponse.status).toBe(200);
    expect(examplePayload.mode).toBe('standalone');
    expect(examplePayload.text).toContain('Standalone Skill Demo');
  });

  it('returns a deterministic standalone parse result and validates bad input handling', async () => {
    const runtime = await startTestServer();
    activeServer = runtime.server;

    const badRequest = await fetch(`${runtime.url}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    });
    expect(badRequest.status).toBe(400);
    await expect(badRequest.json()).resolves.toEqual({ error: 'Missing skill text.' });

    const parseResponse = await fetch(`${runtime.url}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '# Demo Skill\n\n## Rules\n- Always validate uploaded content before processing.\n',
        skillName: 'demo-skill',
        primaryPath: 'skills/demo/SKILL.md',
        contextFiles: [
          {
            name: 'policy.md',
            path: 'skills/demo/docs/policy.md',
            type: '.md',
            size: 10,
            role: 'context',
            source: 'upload',
            text: '# Policy',
          },
        ],
      }),
    });

    const parsePayload = await parseResponse.json();

    expect(parseResponse.status).toBe(200);
    expect(parsePayload.bridge.mode).toBe('standalone');
    expect(parsePayload.parserResult.meta.parser_version).toBe('skill-0-review-studio standalone v1');
    expect(parsePayload.parserResult.original_definition.skill_name).toBe('demo-skill');
    expect(parsePayload.parserResult.manifest.analysis_level).toBe('manifest');
  });

  it('accepts larger multi-file payloads that exceed the old 1mb limit', async () => {
    const runtime = await startTestServer();
    activeServer = runtime.server;

    const oversizedContext = 'a'.repeat((1024 * 1024) + 256);
    const parseResponse = await fetch(`${runtime.url}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '# Demo Skill\n\n## Rules\n- Validate large collaboration bundles.\n',
        skillName: 'large-bundle-skill',
        primaryPath: 'skills/demo/SKILL.md',
        contextFiles: [
          {
            name: 'large-policy.md',
            path: 'skills/demo/docs/large-policy.md',
            type: '.md',
            size: oversizedContext.length,
            role: 'context',
            source: 'upload',
            text: oversizedContext,
          },
        ],
      }),
    });

    const parsePayload = await parseResponse.json();

    expect(parseResponse.status).toBe(200);
    expect(parsePayload.parserResult.original_definition.skill_name).toBe('large-bundle-skill');
  });

  it('surfaces provider fallback failures as structured API errors', async () => {
    const runtime = await startTestServer('standalone', {
      getBridgeStatus: async () => ({
        llmFallbackAvailable: true,
        llmModel: 'gpt-4o-mini',
        llmProvider: 'openai',
        mode: 'standalone',
        skill0Root: null,
      }),
      getExampleSkill: async () => ({
        mode: 'standalone',
        name: 'standalone-sample',
        skill0Root: null,
        source: 'standalone/example-skill.md',
        text: '# Example',
      }),
      parseSkill: async () => {
        const error = new Error('LLM fallback provider request failed.');
        (error as Error & { code?: string; detail?: string; statusCode?: number }).code = 'llm_provider_request_failed';
        (error as Error & { code?: string; detail?: string; statusCode?: number }).detail = 'Provider returned 503.';
        (error as Error & { code?: string; detail?: string; statusCode?: number }).statusCode = 503;
        throw error;
      },
    } as never);
    activeServer = runtime.server;

    const parseResponse = await fetch(`${runtime.url}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '{"workflow":["ingest","review","export"]}',
        skillName: 'future-format',
      }),
    });

    const parsePayload = await parseResponse.json();
    expect(parseResponse.status).toBe(503);
    expect(parsePayload).toEqual({
      detail: 'Provider returned 503.',
      error: 'llm_provider_request_failed',
    });
  });

  it('serves and updates llm runtime settings through the admin route', async () => {
    let currentBridgeStatus = {
      llmFallbackAvailable: false,
      llmModel: null,
      llmProvider: null,
      llmReason: 'LLM fallback mode is disabled.',
      llmSupportsJsonSchema: false,
      llmSupportsReasoning: false,
      mode: 'standalone',
      skill0Root: null,
    };
    const llmAdmin = {
      getPublicSettings: () => ({
        options: {
          modeValues: ['disabled', 'fallback', 'force'],
          providerValues: ['openai', 'gemini', 'anthropic'],
        },
        settings: {
          apiKeyConfigured: false,
          apiKeySource: 'none',
          maxInputChars: 12000,
          mode: 'disabled',
          model: 'gpt-4o-mini',
          mutable: true,
          provider: 'openai',
          timeoutMs: 15000,
          updatedAt: null,
        },
      }),
      getRuntimeConfig: () => ({
        apiKey: '',
        maxInputChars: 12000,
        mode: 'disabled',
        model: 'gpt-4o-mini',
        provider: 'openai',
        timeoutMs: 15000,
      }),
      updateRuntimeConfig: (input: Record<string, unknown> = {}) => {
        currentBridgeStatus = {
          ...currentBridgeStatus,
          llmFallbackAvailable: input.mode === 'fallback' || input.mode === 'force',
          llmModel: typeof input.model === 'string' ? input.model : 'gpt-4o-mini',
          llmProvider: typeof input.provider === 'string' ? input.provider : 'openai',
          llmReason: input.mode === 'fallback' || input.mode === 'force' ? null : 'LLM fallback mode is disabled.',
          llmSupportsJsonSchema: input.provider === 'openai',
          llmSupportsReasoning: input.provider === 'openai',
        };
        return {
          options: {
            modeValues: ['disabled', 'fallback', 'force'],
            providerValues: ['openai', 'gemini', 'anthropic'],
          },
          settings: {
            apiKeyConfigured: Boolean(input.apiKey),
            apiKeySource: input.apiKey ? 'runtime' : 'none',
            maxInputChars: Number(input.maxInputChars || 12000),
            mode: input.mode === 'fallback' || input.mode === 'force' ? input.mode : 'disabled',
            model: typeof input.model === 'string' ? input.model : 'gpt-4o-mini',
            mutable: true,
            provider: typeof input.provider === 'string' ? input.provider : 'openai',
            timeoutMs: Number(input.timeoutMs || 15000),
            updatedAt: '2026-04-06T07:12:00.000Z',
          },
        };
      },
    };
    const runtime = await startTestServer('standalone', {
      getBridgeStatus: async () => currentBridgeStatus,
      getExampleSkill: async () => ({
        mode: 'standalone',
        name: 'standalone-sample',
        skill0Root: null,
        source: 'standalone/example-skill.md',
        text: '# Example',
      }),
      parseSkill: async () => ({ bridge: currentBridgeStatus }),
    } as never, llmAdmin as never);
    activeServer = runtime.server;

    const settingsResponse = await fetch(`${runtime.url}/api/llm-settings`);
    const settingsPayload = await settingsResponse.json();

    expect(settingsResponse.status).toBe(200);
    expect(settingsPayload.settings).toMatchObject({
      mode: 'disabled',
      mutable: true,
      provider: 'openai',
    });
    expect(settingsPayload.bridgeStatus).toMatchObject({
      llmFallbackAvailable: false,
      mode: 'standalone',
    });

    const updateResponse = await fetch(`${runtime.url}/api/llm-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'sk-runtime-test',
        maxInputChars: 16000,
        mode: 'force',
        model: 'gpt-4.1-mini',
        provider: 'openai',
        timeoutMs: 18000,
      }),
    });
    const updatePayload = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.settings).toMatchObject({
      apiKeyConfigured: true,
      apiKeySource: 'runtime',
      mode: 'force',
      model: 'gpt-4.1-mini',
      provider: 'openai',
      timeoutMs: 18000,
    });
    expect(updatePayload.bridgeStatus).toMatchObject({
      llmFallbackAvailable: true,
      llmModel: 'gpt-4.1-mini',
      llmProvider: 'openai',
    });
  });
});
