// @vitest-environment node

import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createSkill0Bridge } from '../../bridge/skill0Bridge.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonicalRoot = '/home/miles/dev2/skill-0';

describe('createSkill0Bridge', () => {
  it('uses the bundled standalone parser when standalone mode is forced', async () => {
    const bridge = createSkill0Bridge({
      mode: 'standalone',
      projectRoot,
    });

    await expect(bridge.getBridgeStatus()).resolves.toEqual({
      mode: 'standalone',
      skill0Root: null,
    });

    const example = await bridge.getExampleSkill();
    expect(example.mode).toBe('standalone');
    expect(example.source).toContain('standalone/example-skill.md');
    expect(example.text).toContain('Standalone Skill Demo');

    const parsed = await bridge.parseSkill('# Demo Skill\n\n- Always validate inputs.', 'demo-skill');
    expect(parsed.bridge.mode).toBe('standalone');
    expect(parsed.parserResult.meta.parser_version).toBe('skill-0-review-studio standalone v1');
    expect(parsed.parserResult.original_definition.source).toBe('standalone/local');
  });

  it('emits manifest-oriented fields for bundle analysis in standalone mode', async () => {
    const bridge = createSkill0Bridge({
      mode: 'standalone',
      projectRoot,
    });

    const parsed = await bridge.parseSkill(
      '# Bundle Skill\n\nRead [Policy](docs/policy.md).\nInspect `scripts/run.py` before execution.\n\n```bash\npython scripts/run.py\n```\n',
      'bundle-skill',
      {
        primaryPath: 'skills/bundle/SKILL.md',
        contextFiles: [
          {
            name: 'policy.md',
            path: 'skills/bundle/docs/policy.md',
            type: '.md',
            size: 20,
            role: 'context',
            source: 'upload',
            text: '# Policy',
          },
          {
            name: 'run.py',
            path: 'skills/bundle/scripts/run.py',
            type: '.py',
            size: 18,
            role: 'context',
            source: 'upload',
            text: 'print("run")',
          },
        ],
      },
    );

    expect(parsed.parserResult.manifest.analysis_level).toBe('manifest');
    expect(parsed.parserResult.supporting_files).toHaveLength(2);
    expect(parsed.parserResult.command_references[0].authority_profile).toBe('process_exec');
    expect(parsed.parserResult.analysis_findings.some((finding) => finding.category === 'execution_authority')).toBe(true);
    expect(parsed.securityScan.findings[0].ruleId).toBe('PARSER-001');
    expect(parsed.securityScan.findings[0].ruleName).toContain('Authority-bearing');
    expect(parsed.reviewerSummary.operatorReminders.length).toBeGreaterThan(0);
    expect(parsed.reviewerSummary.operatorReminders[0].action).toContain('Review');
  });

  it.skipIf(!existsSync(path.join(canonicalRoot, 'scripts', 'auto_parse.py')))(
    'uses the canonical skill-0 parser when an explicit parser root is available',
    async () => {
      const bridge = createSkill0Bridge({
        explicitRoot: canonicalRoot,
        mode: 'auto',
        projectRoot,
      });

      const status = await bridge.getBridgeStatus();
      expect(status).toEqual({
        mode: 'skill-0',
        skill0Root: canonicalRoot,
      });

      const parsed = await bridge.parseSkill(
        '# Canonical Demo\n\n## Workflow\n- Parse the skill definition.\n- Export the resulting decomposition.\n',
        'canonical-demo',
      );

      expect(parsed.bridge.mode).toBe('skill-0');
      expect(parsed.bridge.skill0Root).toBe(canonicalRoot);
      expect(parsed.parserResult.meta.parser_version).toContain('skill-0');
      expect(parsed.parserResult.meta.parsed_by).toBe('auto_parse.py');
      expect(parsed.projectId).toMatch(/^claude__/);
    },
  );

  it.skipIf(!existsSync(path.join(canonicalRoot, 'scripts', 'complex_skill_parser.py')))(
    'uses the canonical manifest parser when bundle files are supplied',
    async () => {
      const bridge = createSkill0Bridge({
        explicitRoot: canonicalRoot,
        mode: 'auto',
        projectRoot,
      });

      const parsed = await bridge.parseSkill(
        '# Canonical Bundle\n\nRead [Guide](docs/guide.md).\n',
        'canonical-bundle',
        {
          primaryPath: 'skills/canonical/SKILL.md',
          contextFiles: [{
            name: 'guide.md',
            path: 'skills/canonical/docs/guide.md',
            type: '.md',
            size: 10,
            role: 'context',
            source: 'upload',
            text: '# Guide',
          }],
        },
      );

      expect(parsed.bridge.mode).toBe('skill-0');
      expect(parsed.parserResult.manifest.analysis_level).toBe('manifest');
      expect(parsed.parserResult.supporting_files[0].path).toBe('docs/guide.md');
    },
  );
});
