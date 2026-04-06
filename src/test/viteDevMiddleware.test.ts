// @vitest-environment node

import { existsSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const viteConfigFile = path.join(projectRoot, 'vite.config.ts');
const canonicalRoot = '/home/miles/dev2/skill-0';
const canonicalAvailable = existsSync(path.join(canonicalRoot, 'scripts', 'auto_parse.py'));

type DevRuntime = {
  vite: ViteDevServer;
  server: Server;
  baseUrl: string;
  restoreEnv: () => void;
};

function applyEnv(overrides: Record<string, string | undefined>) {
  const snapshot = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    snapshot.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  return () => {
    for (const [key, value] of snapshot.entries()) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  };
}

async function startDevRuntime(env: Record<string, string | undefined>): Promise<DevRuntime> {
  const restoreEnv = applyEnv({
    DISABLE_HMR: 'true',
    ...env,
  });

  try {
    const vite = await createViteServer({
      configFile: viteConfigFile,
      root: projectRoot,
      logLevel: 'error',
      appType: 'custom',
      optimizeDeps: {
        noDiscovery: true,
      },
      server: {
        middlewareMode: true,
      },
    });

    const server = createHttpServer(vite.middlewares);
    try {
      const baseUrl = await new Promise<string>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Unable to resolve Vite dev server address.'));
            return;
          }

          resolve(`http://127.0.0.1:${address.port}`);
        });
      });

      return { vite, server, baseUrl, restoreEnv };
    } catch (error) {
      await vite.close();
      throw error;
    }
  } catch (error) {
    restoreEnv();
    throw error;
  }
}

async function stopDevRuntime(runtime: DevRuntime | null) {
  if (!runtime) {
    return;
  }

  runtime.restoreEnv();

  await new Promise<void>((resolve, reject) => {
    runtime.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await runtime.vite.close();
}

describe('Vite dev middleware API parity', () => {
  let runtime: DevRuntime | null = null;

  afterEach(async () => {
    await stopDevRuntime(runtime);
    runtime = null;
  });

  it('serves a parity health endpoint in standalone mode', async () => {
    runtime = await startDevRuntime({
      SKILL0_MODE: 'standalone',
      SKILL0_PARSER_ROOT: undefined,
      SKILL0_ROOT: undefined,
    });

    const response = await fetch(`${runtime.baseUrl}/healthz`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      mode: 'standalone',
      parserRootConfigured: false,
    });
  });

  it('serves the bridge endpoints in standalone mode', async () => {
    runtime = await startDevRuntime({
      SKILL0_MODE: 'standalone',
      SKILL0_PARSER_ROOT: undefined,
      SKILL0_ROOT: undefined,
    });

    const [statusResponse, exampleResponse] = await Promise.all([
      fetch(`${runtime.baseUrl}/api/bridge-status`),
      fetch(`${runtime.baseUrl}/api/example-skill`),
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
    expect(examplePayload.name).toBe('standalone-sample');
    expect(examplePayload.text).toContain('Standalone Skill Demo');
  });

  it('serves llm runtime settings through the dev middleware', async () => {
    runtime = await startDevRuntime({
      SKILL0_MODE: 'standalone',
      SKILL0_LLM_MODE: 'fallback',
      SKILL0_LLM_PROVIDER: 'openai',
      SKILL0_LLM_MODEL: 'gpt-4o-mini',
      SKILL0_RUNTIME_CONFIG_MUTABLE: 'true',
      SKILL0_PARSER_ROOT: undefined,
      SKILL0_ROOT: undefined,
    });

    const response = await fetch(`${runtime.baseUrl}/api/llm-settings`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.settings).toMatchObject({
      mode: 'fallback',
      model: 'gpt-4o-mini',
      mutable: true,
      provider: 'openai',
    });
    expect(payload.bridgeStatus).toMatchObject({
      mode: 'standalone',
    });
  });

  it('parses uploaded skills through the dev middleware in standalone mode', async () => {
    runtime = await startDevRuntime({
      SKILL0_MODE: 'standalone',
      SKILL0_PARSER_ROOT: undefined,
      SKILL0_ROOT: undefined,
    });

    const badRequest = await fetch(`${runtime.baseUrl}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    });

    expect(badRequest.status).toBe(400);
    await expect(badRequest.json()).resolves.toEqual({ error: 'Missing skill text.' });

    const parseResponse = await fetch(`${runtime.baseUrl}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillName: 'demo-skill',
        text: '# Demo Skill\n\nRead [Policy](docs/policy.md).\n\n## Rules\n- Always validate uploaded content before processing.\n',
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
    expect(parsePayload.bridge).toMatchObject({
      mode: 'standalone',
      skill0Root: null,
    });
    expect(parsePayload.parserResult.meta.parser_version).toBe('skill-0-review-studio standalone v1');
    expect(parsePayload.parserResult.original_definition.skill_name).toBe('demo-skill');
    expect(parsePayload.parserResult.manifest.analysis_level).toBe('manifest');
    expect(parsePayload.parserResult.supporting_files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'docs/policy.md',
        }),
      ]),
    );
  });
});

const describeCanonical = canonicalAvailable ? describe : describe.skip;

describeCanonical('Vite dev middleware canonical parity', () => {
  let canonicalRuntime: DevRuntime | null = null;

  afterEach(async () => {
    await stopDevRuntime(canonicalRuntime);
    canonicalRuntime = null;
  });

  it('serves canonical bridge status and parse responses when the canonical repo is available', async () => {
    canonicalRuntime = await startDevRuntime({
      SKILL0_MODE: 'auto',
      SKILL0_PARSER_ROOT: canonicalRoot,
      SKILL0_ROOT: undefined,
    });

    const [statusResponse, exampleResponse] = await Promise.all([
      fetch(`${canonicalRuntime.baseUrl}/api/bridge-status`),
      fetch(`${canonicalRuntime.baseUrl}/api/example-skill`),
    ]);

    const statusPayload = await statusResponse.json();
    const examplePayload = await exampleResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusPayload).toMatchObject({
      llmFallbackAvailable: false,
      mode: 'skill-0',
      skill0Root: canonicalRoot,
    });

    expect(exampleResponse.status).toBe(200);
    expect(examplePayload.mode).toBe('skill-0');
    expect(examplePayload.text).toEqual(expect.any(String));
    expect(String(examplePayload.text).length).toBeGreaterThan(0);

    const parseResponse = await fetch(`${canonicalRuntime.baseUrl}/api/parse-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillName: 'canonical-skill',
        text: '# Canonical Skill\n\nRead [Guide](docs/guide.md).\n',
        primaryPath: 'skills/canonical/SKILL.md',
        contextFiles: [
          {
            name: 'guide.md',
            path: 'skills/canonical/docs/guide.md',
            type: '.md',
            size: 9,
            role: 'context',
            source: 'upload',
            text: '# Guide',
          },
        ],
      }),
    });

    const parsePayload = await parseResponse.json();

    expect(parseResponse.status).toBe(200);
    expect(parsePayload.bridge).toMatchObject({
      mode: 'skill-0',
      skill0Root: canonicalRoot,
    });
    expect(parsePayload.parserResult.meta.parser_version).toContain('skill-0');
    expect(parsePayload.parserResult.manifest.analysis_level).toBe('manifest');
  });
});
