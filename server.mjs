import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createLLMParserAdapter } from './bridge/llmParserAdapter.mjs';
import { createLLMRuntimeConfigStore } from './bridge/llmRuntimeConfigStore.mjs';
import { resolveParserRequestTimeoutMs } from './bridge/requestTimeout.mjs';
import { createSkill0Bridge } from './bridge/skill0Bridge.mjs';
import { resolveSkillUrlImport, serializeSkillUrlError } from './bridge/skillUrlResolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_BODY_LIMIT = process.env.SKILL0_API_BODY_LIMIT || '10mb';
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SKILL0_REQUEST_TIMEOUT_MS || '20000', 10);

function createTimeoutError(timeoutMs) {
  const error = new Error(`Parser request exceeded ${timeoutMs}ms.`);
  error.code = 'parser_request_timeout';
  error.detail = `The parser request did not complete within ${timeoutMs}ms.`;
  error.statusCode = 504;
  return error;
}

async function withRequestTimeout(work, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([work(), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

function serializeBridgeError(error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  return {
    error: error?.code || error?.message || 'Unknown parser bridge error',
    detail: error?.detail,
    statusCode,
  };
}

/**
 * @typedef {{
 *   bridge?: {
 *     getBridgeStatus: () => Promise<Record<string, unknown>>;
 *     getExampleSkill: () => Promise<Record<string, unknown>>;
 *     parseSkill: (text: string, skillName: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
 *   };
 *   explicitRoot?: string;
 *   llmAdmin?: {
 *     getPublicSettings: () => Record<string, unknown>;
 *     getRuntimeConfig: () => Record<string, unknown>;
 *     updateRuntimeConfig: (input?: Record<string, unknown>) => Record<string, unknown>;
 *   };
 *   mode?: string;
 *   projectRoot?: string;
 * }} ServerAppOptions
 */

/** @param {ServerAppOptions} options */
export function createServerApp({
  bridge: providedBridge,
  explicitRoot = process.env.SKILL0_PARSER_ROOT || process.env.SKILL0_ROOT,
  llmAdmin: providedLlmAdmin,
  mode = process.env.SKILL0_MODE || 'auto',
  projectRoot = __dirname,
} = {}) {
  const app = express();
  const distDir = path.resolve(projectRoot, 'dist');
  const llmAdmin = providedLlmAdmin || createLLMRuntimeConfigStore();
  const bridge = providedBridge || createSkill0Bridge({
    explicitRoot,
    llmAdapter: createLLMParserAdapter({
      getConfig: llmAdmin.getRuntimeConfig,
    }),
    mode,
    projectRoot,
  });

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      mode,
      parserRootConfigured: Boolean(explicitRoot),
    });
  });

  app.get('/api/bridge-status', async (_req, res) => {
    res.json(await bridge.getBridgeStatus());
  });

  app.get('/api/llm-settings', async (_req, res) => {
    res.json({
      ...llmAdmin.getPublicSettings(),
      bridgeStatus: await bridge.getBridgeStatus(),
    });
  });

  app.post('/api/llm-settings', async (req, res) => {
    try {
      const payload = llmAdmin.updateRuntimeConfig(req.body || {});
      res.json({
        ...payload,
        bridgeStatus: await bridge.getBridgeStatus(),
      });
    } catch (error) {
      const payload = serializeBridgeError(error);
      res.status(payload.statusCode).json({
        error: payload.error,
        detail: payload.detail,
      });
    }
  });

  app.get('/api/example-skill', async (_req, res) => {
    try {
      res.json(await bridge.getExampleSkill());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown example skill error' });
    }
  });

  app.post('/api/parse-skill', async (req, res) => {
    try {
      const text = String(req.body?.text || '');
      const skillName = String(req.body?.skillName || 'uploaded-skill');
      const primaryPath = req.body?.primaryPath ? String(req.body.primaryPath) : null;
      const contextFiles = Array.isArray(req.body?.contextFiles) ? req.body.contextFiles : [];

      if (!text.trim()) {
        res.status(400).json({ error: 'Missing skill text.' });
        return;
      }

      const parseRequestTimeoutMs = resolveParserRequestTimeoutMs({
        baseTimeoutMs: REQUEST_TIMEOUT_MS,
        runtimeConfig: llmAdmin.getRuntimeConfig(),
      });

      res.json(await withRequestTimeout(() => bridge.parseSkill(text, skillName, {
        contextFiles,
        primaryPath,
      }), parseRequestTimeoutMs));
    } catch (error) {
      const payload = serializeBridgeError(error);
      res.status(payload.statusCode).json({
        error: payload.error,
        detail: payload.detail,
      });
    }
  });

  app.post('/api/resolve-skill-url', async (req, res) => {
    const url = String(req.body?.url || '');

    if (!url.trim()) {
      res.status(400).json({
        error: 'missing_skill_url',
        detail: 'Enter a valid HTTPS URL for a remote skill file.',
      });
      return;
    }

    try {
      res.json(await resolveSkillUrlImport(url));
    } catch (error) {
      const payload = serializeSkillUrlError(error);
      res.status(payload.status).json({
        error: payload.error,
        detail: payload.detail,
      });
    }
  });

  app.use(express.static(distDir));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  return { app, bridge };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(process.env.PORT || 4173);
  const { app } = createServerApp();

  app.listen(port, '0.0.0.0', () => {
    console.log(`skill-0-review-studio server listening on http://0.0.0.0:${port}`);
  });
}
