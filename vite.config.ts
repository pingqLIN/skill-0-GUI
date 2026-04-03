import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createSkill0Bridge, readJsonBody } from './bridge/skill0Bridge.mjs';

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

function isNodeModulePackage(id: string, packageName: string) {
  return id.includes(`/node_modules/${packageName}/`);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const enable3D = env.VITE_ENABLE_3D !== 'false';
  const bridge = createSkill0Bridge({
    explicitRoot: env.SKILL0_PARSER_ROOT || env.SKILL0_ROOT,
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
          server.middlewares.use('/api/bridge-status', async (_req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(await bridge.getBridgeStatus()));
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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(await bridge.parseSkill(text, skillName, {
                contextFiles,
                primaryPath,
              })));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown parser bridge error' }));
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      pool: 'forks',
    },
  };
});
