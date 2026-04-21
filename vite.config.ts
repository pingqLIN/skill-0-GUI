import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createLLMParserAdapter } from './bridge/llmParserAdapter.mjs';
import { createLLMRuntimeConfigStore } from './bridge/llmRuntimeConfigStore.mjs';
import { resolveParserRequestTimeoutMs } from './bridge/requestTimeout.mjs';
import { createSkill0Bridge, readJsonBody } from './bridge/skill0Bridge.mjs';
import { resolveSkillUrlImport, serializeSkillUrlError } from './bridge/skillUrlResolver.mjs';

const VECTOR_SPACE_3D_PACKAGES = [
  '@tweenjs/tween.js',
  'react-force-graph-3d',
  '3d-force-graph',
  'react-kapsule',
  'three-forcegraph',
  'three-render-objects',
  'three',
  'kapsule',
  'accessor-fn',
  'data-bind-mapper',
  'float-tooltip',
  'd3-force-3d',
  'ngraph.events',
  'ngraph.forcelayout',
  'ngraph.graph',
  'ngraph.merge',
  'ngraph.random',
];
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SKILL0_REQUEST_TIMEOUT_MS || '20000', 10);
const DEFAULT_VITE_PORT = 5173;

function createTimeoutError(timeoutMs: number) {
  const error = new Error(`Parser request exceeded ${timeoutMs}ms.`);
  (error as Error & { code?: string; detail?: string; statusCode?: number }).code = 'parser_request_timeout';
  (error as Error & { code?: string; detail?: string; statusCode?: number }).detail = `The parser request did not complete within ${timeoutMs}ms.`;
  (error as Error & { code?: string; detail?: string; statusCode?: number }).statusCode = 504;
  return error;
}

async function withRequestTimeout<T>(work: () => Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([work(), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function serializeBridgeError(error: unknown) {
  const candidate = error as { code?: string; detail?: string; message?: string; statusCode?: number };
  return {
    error: candidate.code || candidate.message || 'Unknown parser bridge error',
    detail: candidate.detail,
    statusCode: Number.isInteger(candidate.statusCode) ? candidate.statusCode : 500,
  };
}

function isNodeModulePackage(id: string, packageName: string) {
  return id.includes(`/node_modules/${packageName}/`);
}

function resolvePort(rawPort: string | undefined, fallback = DEFAULT_VITE_PORT) {
  const parsed = Number.parseInt(rawPort || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const enable3D = env.VITE_ENABLE_3D !== 'false';
  const vitePort = resolvePort(env.VITE_PORT);
  const llmAdmin = createLLMRuntimeConfigStore({
    mutable: env.SKILL0_RUNTIME_CONFIG_MUTABLE,
  });
  const bridge = createSkill0Bridge({
    explicitRoot: env.SKILL0_PARSER_ROOT || env.SKILL0_ROOT,
    llmAdapter: createLLMParserAdapter({
      getConfig: llmAdmin.getRuntimeConfig,
    }),
    mode: env.SKILL0_MODE || 'auto',
    projectRoot: __dirname,
  });

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'skill-0-bridge',
        configureServer(server) {
          server.middlewares.use('/healthz', (req, res, next) => {
            if (req.method !== 'GET') {
              next();
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              ok: true,
              mode: env.SKILL0_MODE || 'auto',
              parserRootConfigured: Boolean(env.SKILL0_PARSER_ROOT || env.SKILL0_ROOT),
            }));
          });

          server.middlewares.use('/api/bridge-status', async (_req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(await bridge.getBridgeStatus()));
          });

          server.middlewares.use('/api/llm-settings', async (req, res, next) => {
            if (req.method === 'GET') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                ...llmAdmin.getPublicSettings(),
                bridgeStatus: await bridge.getBridgeStatus(),
              }));
              return;
            }

            if (req.method === 'POST') {
              try {
                const body = await readJsonBody(req);
                const payload = llmAdmin.updateRuntimeConfig(body || {});
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ...payload,
                  bridgeStatus: await bridge.getBridgeStatus(),
                }));
              } catch (error) {
                const payload = serializeBridgeError(error);
                res.statusCode = payload.statusCode;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: payload.error,
                  detail: payload.detail,
                }));
              }
              return;
            }

            next();
          });

          server.middlewares.use('/api/example-skill', async (req, res, next) => {
            if (req.method !== 'GET') {
              next();
              return;
            }

            try {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(await bridge.getExampleSkill()));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown example skill error' }));
            }
          });

          server.middlewares.use('/api/parse-skill', async (req, res, next) => {
            if (req.method !== 'POST') {
              next();
              return;
            }

            try {
              const body = await readJsonBody(req);
              const text = String(body?.text || '');
              const skillName = String(body?.skillName || 'uploaded-skill');
              const primaryPath = body?.primaryPath ? String(body.primaryPath) : null;
              const contextFiles = Array.isArray(body?.contextFiles) ? body.contextFiles : [];

              if (!text.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing skill text.' }));
                return;
              }

              const parseRequestTimeoutMs = resolveParserRequestTimeoutMs({
                baseTimeoutMs: REQUEST_TIMEOUT_MS,
                runtimeConfig: llmAdmin.getRuntimeConfig(),
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(await withRequestTimeout(() => bridge.parseSkill(text, skillName, {
                contextFiles,
                primaryPath,
              }), parseRequestTimeoutMs)));
            } catch (error) {
              const payload = serializeBridgeError(error);
              res.statusCode = payload.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: payload.error,
                detail: payload.detail,
              }));
            }
          });

          server.middlewares.use('/api/resolve-skill-url', async (req, res, next) => {
            if (req.method !== 'POST') {
              next();
              return;
            }

            try {
              const body = await readJsonBody(req);
              const url = String(body?.url || '');

              if (!url.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'missing_skill_url',
                  detail: 'Enter a valid HTTPS URL for a remote skill file.',
                }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(await resolveSkillUrlImport(url)));
            } catch (error) {
              const payload = serializeSkillUrlError(error);
              res.statusCode = payload.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: payload.error,
                detail: payload.detail,
              }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!enable3D) {
              return undefined;
            }

            if (VECTOR_SPACE_3D_PACKAGES.some((packageName) => isNodeModulePackage(id, packageName))) {
              return 'vector-space-3d-vendor';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: vitePort,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      host: '0.0.0.0',
      port: vitePort,
    },
    test: {
      pool: 'forks',
    },
  };
});
