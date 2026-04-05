import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createSkill0Bridge } from './bridge/skill0Bridge.mjs';
import { resolveSkillUrlImport, serializeSkillUrlError } from './bridge/skillUrlResolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_BODY_LIMIT = process.env.SKILL0_API_BODY_LIMIT || '10mb';

export function createServerApp({
  explicitRoot = process.env.SKILL0_PARSER_ROOT || process.env.SKILL0_ROOT,
  mode = process.env.SKILL0_MODE || 'auto',
  projectRoot = __dirname,
} = {}) {
  const app = express();
  const distDir = path.resolve(projectRoot, 'dist');
  const bridge = createSkill0Bridge({
    explicitRoot,
    mode,
    projectRoot,
  });

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/api/bridge-status', async (_req, res) => {
    res.json(await bridge.getBridgeStatus());
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

      res.json(await bridge.parseSkill(text, skillName, {
        contextFiles,
        primaryPath,
      }));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown parser bridge error' });
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
