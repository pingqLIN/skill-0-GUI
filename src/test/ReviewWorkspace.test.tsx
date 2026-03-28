import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewWorkspace } from '../components/ReviewWorkspace';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../components/Flowchart', () => ({ Flowchart: () => <div data-testid="flowchart" /> }));
vi.mock('../components/Dashboard', () => ({ Dashboard: () => <div data-testid="dashboard" /> }));
vi.mock('../components/PhaseDetails', () => ({ PhaseDetails: () => <div data-testid="phase-details" /> }));
vi.mock('../components/VectorSpace', () => ({ VectorSpace: () => <div data-testid="vector-space" /> }));
vi.mock('../components/SecurityMatrix', () => ({ SecurityMatrix: () => <div data-testid="security-matrix" /> }));
vi.mock('../components/SideEditor', () => ({ SideEditor: () => null }));
vi.mock('../components/DecompositionBoard', () => ({ DecompositionBoard: () => <div data-testid="decomposition-board" /> }));

const sampleData = {
  projectId: 'demo-skill',
  projectName: 'Demo Skill',
  phases: [
    {
      id: 'phase-1',
      name: 'Phase One',
      input: ['input-a'],
      tasks: ['task-a'],
      output: ['output-a'],
      decisionNodes: [],
    },
  ],
  riskAssessment: { level: 'SAFE', details: 'No issues.' },
  threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
  parserResult: {
    meta: { title: 'Demo Skill', parser_version: 'v1' },
    decomposition: { actions: [], rules: [], directives: [] },
    execution_paths: [],
    supporting_files: [],
    command_references: [],
    analysis_findings: [],
    manifest: { analysis_level: 'manifest', unresolved_references_count: 0 },
  },
  reviewerSummary: { operatorReminders: [] },
  securityScan: { riskScore: 10, findings: [] },
  globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
};

describe('ReviewWorkspace', () => {
  it('preserves the active tab when parent data rerenders after an edit', async () => {
    const props = {
      darkMode: false,
      modifiedPaths: new Set<string>(),
      supportFiles: [],
      selectedContextPath: null,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
      guiRepoUrl: 'https://example.com/gui',
      engineRepoUrl: 'https://example.com/engine',
      onSelectContextPath: vi.fn(),
      onSaveEdit: vi.fn(),
      onUndo: vi.fn(),
      onResetWorkspace: vi.fn(),
    };

    const { rerender } = render(<ReviewWorkspace data={sampleData} {...props} />);
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('app.tabs.vector')[1]);
    expect(await screen.findByTestId('vector-space')).toBeInTheDocument();

    rerender(<ReviewWorkspace data={JSON.parse(JSON.stringify(sampleData))} {...props} />);

    expect(screen.getByTestId('vector-space')).toBeInTheDocument();
  });

  it('renders schema validation warnings for the current SkillDocument projection', async () => {
    const props = {
      darkMode: false,
      modifiedPaths: new Set<string>(),
      supportFiles: [],
      selectedContextPath: null,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
      guiRepoUrl: 'https://example.com/gui',
      engineRepoUrl: 'https://example.com/engine',
      onSelectContextPath: vi.fn(),
      onSaveEdit: vi.fn(),
      onUndo: vi.fn(),
      onResetWorkspace: vi.fn(),
    };

    render(<ReviewWorkspace data={sampleData} {...props} />);

    expect(await screen.findByText('app.schemaValidation')).toBeInTheDocument();
    expect(screen.getByText('app.validationValid')).toBeInTheDocument();
    expect(screen.getByText('SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED')).toBeInTheDocument();
  });

  it('renders consistency issues for invalid execution path references', async () => {
    const props = {
      darkMode: false,
      modifiedPaths: new Set<string>(),
      supportFiles: [],
      selectedContextPath: null,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
      guiRepoUrl: 'https://example.com/gui',
      engineRepoUrl: 'https://example.com/engine',
      onSelectContextPath: vi.fn(),
      onSaveEdit: vi.fn(),
      onUndo: vi.fn(),
      onResetWorkspace: vi.fn(),
    };

    const inconsistentData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        decomposition: {
          actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
          directives: [],
          rules: [],
        },
        execution_paths: [{ id: 'path_001', steps: ['missing_step'] }],
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={inconsistentData} {...props} />);

    expect(await screen.findByText('app.consistencyChecks')).toBeInTheDocument();
    expect(screen.getByText('app.consistencyInvalid')).toBeInTheDocument();
    expect(screen.getByText('missing_reference')).toBeInTheDocument();
  });

  it('surfaces malformed execution paths in the validation panel', async () => {
    const props = {
      darkMode: false,
      modifiedPaths: new Set<string>(),
      supportFiles: [],
      selectedContextPath: null,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
      guiRepoUrl: 'https://example.com/gui',
      engineRepoUrl: 'https://example.com/engine',
      onSelectContextPath: vi.fn(),
      onSaveEdit: vi.fn(),
      onUndo: vi.fn(),
      onResetWorkspace: vi.fn(),
    };

    const malformedData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        execution_paths: [{ branches: [{ condition: 'fallback' }], name: 'broken-path' }],
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={malformedData} {...props} />);

    expect(await screen.findByText('app.schemaValidation')).toBeInTheDocument();
    expect(screen.getByText('app.validationInvalid')).toBeInTheDocument();
    expect(screen.getByText('SCHEMA_PATH_ID')).toBeInTheDocument();
  });

  it('exposes the structured SkillDocument editor from the action tray', async () => {
    const props = {
      darkMode: false,
      modifiedPaths: new Set<string>(),
      supportFiles: [],
      selectedContextPath: null,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
      guiRepoUrl: 'https://example.com/gui',
      engineRepoUrl: 'https://example.com/engine',
      onSelectContextPath: vi.fn(),
      onSaveEdit: vi.fn(),
      onUndo: vi.fn(),
      onResetWorkspace: vi.fn(),
    };

    render(<ReviewWorkspace data={sampleData} {...props} />);

    fireEvent.click(await screen.findByText('app.actionsTray'));

    expect(screen.getAllByText('app.openStructuredEditor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('app.openJsonEditor').length).toBeGreaterThan(0);
  });
});
