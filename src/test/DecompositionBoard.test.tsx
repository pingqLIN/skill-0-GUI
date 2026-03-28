import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DecompositionBoard } from '../components/DecompositionBoard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

const parserResult = {
  meta: {
    name: 'bundle-skill',
    title: 'Bundle Skill',
    description: 'Bundle skill description',
    parser_version: 'skill-0-review-studio standalone v1',
    schema_version: '2.5.0-draft',
    skill_id: 'claude__bundle-skill',
  },
  original_definition: {
    source: 'skills/bundle/SKILL.md',
    skill_description: 'Bundle skill description',
  },
  decomposition: {
    actions: [{ id: 'a_001', name: 'Run parser', action_type: 'process_exec', deterministic: true, side_effects: [] }],
    rules: [],
    directives: [],
  },
  manifest: {
    analysis_level: 'manifest',
    supporting_files_count: 2,
    command_references_count: 1,
    delegation_nodes_count: 1,
    unresolved_references_count: 0,
    entry_skill: {
      path: 'skills/bundle/SKILL.md',
      name: 'bundle-skill',
      resolved: true,
    },
  },
  supporting_files: [
    {
      id: 'sf_001',
      path: 'docs/policy.md',
      kind: 'reference',
      resolved: true,
      referenced_by: ['skills/bundle/SKILL.md'],
      summary: 'Policy document',
    },
  ],
  command_references: [
    {
      id: 'cr_001',
      source_path: 'skills/bundle/SKILL.md',
      command: 'python scripts/run.py',
      shell_family: 'python',
      authority_profile: 'process_exec',
      risk_grade: 'medium',
      resolved_from: 'skills/bundle/SKILL.md',
    },
  ],
  delegation_nodes: [
    {
      id: 'dg_001',
      kind: 'named_agent',
      agent: 'explorer',
      source_path: 'skills/bundle/SKILL.md',
      resolved: true,
      notes: 'Frontmatter explicitly names an agent.',
    },
  ],
  analysis_findings: [
    {
      finding_id: 'fd_001',
      title: 'Authority-bearing command: python scripts/run.py',
      category: 'execution_authority',
      severity: 'medium',
      confidence: 'high',
      affected_paths: ['skills/bundle/SKILL.md'],
      evidence: [
        {
          kind: 'command_snippet',
          source_path: 'skills/bundle/SKILL.md',
          excerpt: 'python scripts/run.py',
          explanation: 'Command classified as process_exec.',
        },
      ],
      recommended_action: 'review_before_run',
    },
  ],
};

describe('DecompositionBoard', () => {
  it('renders manifest, command reference, and finding sections from parser result', async () => {
    render(
      <DecompositionBoard
        parserResult={parserResult}
        supportFiles={[]}
        selectedContextPath={null}
        onSelectContext={() => {}}
      />,
    );

    expect(screen.getByText('app.manifestSummary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /app\.manifestSummary/i }));
    expect(screen.getByText('docs/policy.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /app\.commandReferences/i }));
    expect(screen.getAllByText('app.commandReferences').length).toBeGreaterThan(0);
    expect(screen.getByText('python scripts/run.py')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /app\.analysisFindings/i }));
    expect(screen.getAllByText('app.analysisFindings').length).toBeGreaterThan(0);
    expect(screen.getByText('Authority-bearing command: python scripts/run.py')).toBeInTheDocument();
  });
});
