// @vitest-environment node

import type { Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createServerApp } from '../../server.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function startTestServer(mode = 'standalone') {
  const { app } = createServerApp({ mode, projectRoot });

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
    expect(payload).toEqual({
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
    expect(statusPayload).toEqual({
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
});
