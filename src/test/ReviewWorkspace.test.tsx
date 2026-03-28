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
  const baseProps = {
    darkMode: false,
    modifiedPaths: new Set<string>(),
    supportFiles: [],
    selectedContextPath: null,
    guiRepoUrl: 'https://example.com/gui',
    engineRepoUrl: 'https://example.com/engine',
    onSelectContextPath: vi.fn(),
    onSaveEdit: vi.fn(),
    onUndo: vi.fn(),
    onResetWorkspace: vi.fn(),
  };

  it('preserves the active tab when parent data rerenders after an edit', async () => {
    const props = {
      ...baseProps,
      bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
      bridgeStatusError: null,
    };

    const { rerender } = render(<ReviewWorkspace data={sampleData} {...props} />);
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('app.tabs.vector')[1]);
    expect(await screen.findByTestId('vector-space')).toBeInTheDocument();

    rerender(<ReviewWorkspace data={JSON.parse(JSON.stringify(sampleData))} {...props} />);

    expect(screen.getByTestId('vector-space')).toBeInTheDocument();
  });

  it('shows mode-aware review evidence guidance when the workspace is using the standalone parser', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        bridgeStatus={{ mode: 'standalone', skill0Root: null }}
        bridgeStatusError={null}
      />,
    );

    const readinessBanner = await screen.findByTestId('review-readiness-banner');
    const truthBanner = screen.getByTestId('review-truth-banner');

    expect(readinessBanner).toHaveTextContent('app.reviewEvidenceStatus');
    expect(readinessBanner).toHaveTextContent('app.reviewEvidenceStandalone');
    expect(readinessBanner).toHaveTextContent('app.bridgeGuidanceStandalone');
    expect(truthBanner).toHaveTextContent('app.reviewTruthPanel');
    expect(truthBanner).toHaveTextContent('app.equivalenceStatus: app.equivalenceUnverified');
    expect(screen.getAllByText('app.bridgeModeBundled')).not.toHaveLength(0);
  });
});
