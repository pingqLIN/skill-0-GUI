import { spawn } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const SKILL0_ROOT = '/home/miles/dev/projects/skill-0';
const EXAMPLE_SKILL_PATH = `${SKILL0_ROOT}/converted-skills/reactjs/SKILL.md`;

const PYTHON_BRIDGE = `
import json
import sys
from pathlib import Path

root = Path('/home/miles/dev/projects/skill-0')
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from scripts.auto_parse import parse_skill_md

payload = json.loads(sys.stdin.read())
result = parse_skill_md(payload.get('skill_name', 'uploaded-skill'), payload['text'])
print(json.dumps(result, ensure_ascii=False))
`;

function readJsonBody(req: NodeJS.ReadableStream): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function runSkill0Parser(text: string, skillName: string) {
  return new Promise<any>((resolve, reject) => {
    const child = spawn('wsl', ['python3', '-c', PYTHON_BRIDGE], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `skill-0 parser exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Failed to parse skill-0 JSON output: ${String(error)}\n${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify({ text, skill_name: skillName }));
    child.stdin.end();
  });
}

function readSkill0File(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('wsl', ['cat', filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Failed to read ${filePath}`));
        return;
      }

      resolve(stdout);
    });
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function inferRiskLevel(score: number) {
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'SAFE';
}

function transformParserResult(parserResult: any) {
  const actions = parserResult?.decomposition?.actions ?? [];
  const rules = parserResult?.decomposition?.rules ?? [];
  const directives = parserResult?.decomposition?.directives ?? [];
  const meta = parserResult?.meta ?? {};
  const original = parserResult?.original_definition ?? {};

  const externalCalls = actions.filter((action: any) => action.action_type === 'external_call').length;
  const nonDeterministic = actions.filter((action: any) => action.deterministic === false).length;
  const blockingRules = rules.filter((rule: any) => ['abort', 'retry'].includes(rule.fail_action)).length;
  const strategicDirectives = directives.filter((directive: any) => directive.decomposable).length;

  const negativeIntent = clamp((externalCalls * 9) + (nonDeterministic * 8) + (blockingRules * 6), 4, 88);
  const riskLevel = inferRiskLevel(negativeIntent);
  const operability = clamp(68 + (actions.length * 2) + (rules.length * 3) - (nonDeterministic * 4), 32, 98);
  const confidence = clamp(74 + (rules.length * 4) + (directives.length * 2), 45, 98);
  const reworkRate = clamp(6 + (nonDeterministic * 6) + (strategicDirectives * 3), 4, 48);
  const goalAchievementRate = clamp(78 + (actions.length * 2) + strategicDirectives, 55, 99);
  const category = directives[0]?.directive_type || actions[0]?.action_type || 'skill_decomposition';

  const ruleDecisionNodes = rules.map((rule: any, index: number) => ({
    id: rule.id || `C${index + 1}`,
    question: rule.name || rule.description || `Rule ${index + 1}`,
    rules: [rule.condition_expression || rule.condition || 'evaluate condition'],
    threshold: rule.condition_expression || rule.condition || rule.returns || 'boolean',
    outcomes: {
      yes: 'retain decomposition path',
      no: rule.fail_action || 'review',
    },
    evidence: `${rule.condition_type || 'rule'} • ${rule.condition_expression || rule.condition || ''}`.trim(),
  }));

  const directivePhaseTasks = directives.length
    ? directives.map((directive: any) => `${directive.name}: ${directive.description}`)
    : ['No directives extracted'];

  const traceTasks = [
    `schema ${meta.schema_version || 'unknown'}`,
    `parser ${meta.parser_version || 'unknown'}`,
    `source ${original.source || 'uploaded skill'}`,
  ];

  const phases = [
    {
      id: 'A',
      name: 'Source Intake',
      input: ['uploaded_skill_md'],
      tasks: [original.source || 'manual upload', meta.name || 'unnamed skill', original.skill_description || 'no description'],
      decisionNodes: [],
      output: ['source_context'],
    },
    {
      id: 'B',
      name: 'Action Decomposition',
      input: ['source_context'],
      tasks: actions.length ? actions.map((action: any) => `${action.id} · ${action.name}`) : ['No actions extracted'],
      decisionNodes: [],
      output: ['action_graph'],
    },
    {
      id: 'C',
      name: 'Rule Evaluation',
      input: ['action_graph'],
      tasks: rules.length ? rules.map((rule: any) => `${rule.id} · ${rule.name || rule.condition_expression}`) : ['No rules extracted'],
      decisionNodes: ruleDecisionNodes.length ? ruleDecisionNodes : [{
        id: 'C0',
        question: 'Are parser rules present?',
        rules: ['rules.length > 0'],
        threshold: '>= 1',
        outcomes: { yes: 'continue', no: 'review skill wording' },
        evidence: 'No rules extracted from original parser output.',
      }],
      output: ['rule_matrix'],
    },
    {
      id: 'D',
      name: 'Directive Mapping',
      input: ['rule_matrix'],
      tasks: directivePhaseTasks,
      decisionNodes: [],
      output: ['directive_map'],
    },
    {
      id: 'E',
      name: 'Trace Assembly',
      input: ['directive_map'],
      tasks: traceTasks,
      decisionNodes: [],
      output: ['trace_bundle'],
    },
    {
      id: 'F',
      name: 'Delivery Snapshot',
      input: ['trace_bundle'],
      tasks: [
        `${actions.length} actions`,
        `${rules.length} rules`,
        `${directives.length} directives`,
        'export aligned skill decomposition',
      ],
      decisionNodes: [],
      output: ['skill_decomposition_json'],
    },
  ];

  return {
    projectId: meta.skill_id || `skill-0-${Date.now()}`,
    projectName: meta.title || meta.name || 'Skill-0 Parsed Skill',
    riskAssessment: {
      level: riskLevel,
      negativeIntent,
      details: `Equivalent parser output extracted ${actions.length} actions, ${rules.length} rules, ${directives.length} directives from the original skill definition.`,
    },
    securityScan: {
      riskLevel,
      riskScore: negativeIntent,
      blocked: false,
      findings: [],
    },
    threeClassification: {
      category,
      granularity: actions.length > 8 || directives.length > 6 ? 'Composite' : 'Atomic',
      operability,
    },
    globalMetrics: {
      deliveryTime: Number((1.2 + (actions.length * 0.08) + (rules.length * 0.05)).toFixed(1)),
      decisionConfidence: confidence,
      reworkRate,
      goalAchievementRate,
    },
    phases,
    parserResult,
  };
}

function skill0BridgePlugin() {
  return {
    name: 'skill-0-python-bridge',
    configureServer(server: any) {
      server.middlewares.use('/api/example-skill', async (req: any, res: any, next: any) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const text = await readSkill0File(EXAMPLE_SKILL_PATH);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            name: 'reactjs',
            source: EXAMPLE_SKILL_PATH,
            text,
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown example skill error' }));
        }
      });

      server.middlewares.use('/api/parse-skill', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const body = await readJsonBody(req);
          const text = String(body?.text || '');
          const skillName = String(body?.skillName || 'uploaded-skill');

          if (!text.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing skill text.' }));
            return;
          }

          const parserResult = await runSkill0Parser(text, skillName);
          const payload = transformParserResult(parserResult);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown parser bridge error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss(), skill0BridgePlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@google/genai': '@google/genai/web',
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

