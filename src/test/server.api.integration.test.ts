// @vitest-environment node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const canonicalRoot = '/home/miles/dev2/skill-0';
const canonicalAvailable = existsSync(path.join(canonicalRoot, 'scripts', 'auto_parse.py'));

type RunningServer = {
  child: ChildProcessWithoutNullStreams;
  baseUrl: string;
};

async function waitForServer(url: string, timeoutMs = 15000) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function startServer(port: number, env: Record<string, string>): Promise<RunningServer> {
  const child = spawn('node', ['server.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`server.mjs exited early with code ${code}\n${stderr}`);
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(`${baseUrl}/api/bridge-status`);
  return { child, baseUrl };
}

async function stopServer(server: RunningServer | null) {
  if (!server) {
    return;
  }

  if (server.child.exitCode !== null || server.child.killed) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), 1500);
    server.child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    server.child.kill('SIGTERM');
  });
}

describe('server API integration (standalone mode)', () => {
  let server: RunningServer | null = null;

  beforeAll(async () => {
    server = await startServer(4273, {
      SKILL0_MODE: 'standalone',
    });
  }, 20000);

  afterAll(async () => {
    await stopServer(server);
  });

  it('reports standalone mode from /api/bridge-status', async () => {
    const response = await fetch(`${server!.baseUrl}/api/bridge-status`);
    const payload = await response.json();

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({
      llmFallbackAvailable: false,
      mode: 'standalone',
      skill0Root: null,
    });
  });

  it('serves the bundled example skill and standalone parse results', async () => {
    const exampleResponse = await fetch(`${server!.baseUrl}/api/example-skill`);
    const examplePayload = await exampleResponse.json();

    expect(exampleResponse.ok).toBe(true);
    expect(examplePayload).toMatchObject({
      mode: 'standalone',
      name: 'standalone-sample',
      skill0Root: null,
    });
    expect(String(examplePayload.text)).toContain('#');

    const parseResponse = await fetch(`${server!.baseUrl}/api/parse-skill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skillName: 'demo-skill',
        text: '# Demo Skill\n\n## Actions\n- Parse uploaded input\n- Validate output\n',
        primaryPath: 'skills/demo/SKILL.md',
        contextFiles: [{
          name: 'guide.md',
          path: 'skills/demo/docs/guide.md',
          type: '.md',
          size: 9,
          role: 'context',
          source: 'upload',
          text: '# Guide',
        }],
      }),
    });
    const parsePayload = await parseResponse.json();

    expect(parseResponse.ok).toBe(true);
    expect(parsePayload.bridge).toMatchObject({
      mode: 'standalone',
      skill0Root: null,
    });
    expect(parsePayload.parserResult?.meta?.parser_version).toContain('standalone');
    expect(parsePayload.parserResult?.manifest?.analysis_level).toBe('manifest');
    expect(parsePayload.securityScan?.findings?.length).toBeGreaterThan(0);
    expect(parsePayload.reviewerSummary?.operatorReminders?.length).toBeGreaterThan(0);
    expect(parsePayload.phases).toHaveLength(6);
  });
});

const describeCanonical = canonicalAvailable ? describe : describe.skip;

describeCanonical('server API integration (canonical skill-0 mode)', () => {
  let server: RunningServer | null = null;

  beforeAll(async () => {
    server = await startServer(4274, {
      SKILL0_MODE: 'auto',
      SKILL0_PARSER_ROOT: canonicalRoot,
    });
  }, 20000);

  afterAll(async () => {
    await stopServer(server);
  });

  it('reports canonical mode and returns canonical parse output', async () => {
    const statusResponse = await fetch(`${server!.baseUrl}/api/bridge-status`);
    const statusPayload = await statusResponse.json();

    expect(statusResponse.ok).toBe(true);
    expect(statusPayload).toMatchObject({
      llmFallbackAvailable: false,
      mode: 'skill-0',
      skill0Root: canonicalRoot,
    });

    const parseResponse = await fetch(`${server!.baseUrl}/api/parse-skill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skillName: 'canonical-skill',
        text: '# Canonical Skill\n\nRead [Guide](docs/guide.md).\n',
        primaryPath: 'skills/canonical/SKILL.md',
        contextFiles: [{
          name: 'guide.md',
          path: 'skills/canonical/docs/guide.md',
          type: '.md',
          size: 9,
          role: 'context',
          source: 'upload',
          text: '# Guide',
        }],
      }),
    });
    const parsePayload = await parseResponse.json();

    expect(parseResponse.ok).toBe(true);
    expect(parsePayload.bridge).toMatchObject({
      mode: 'skill-0',
      skill0Root: canonicalRoot,
    });
    expect(parsePayload.parserResult?.meta?.parser_version).toContain('skill-0');
    expect(parsePayload.parserResult?.manifest?.analysis_level).toBe('manifest');
  });
});
