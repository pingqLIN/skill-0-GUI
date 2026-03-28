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
    onRetryBridgeStatus: vi.fn(),
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

  it('shows reviewer-facing validation evidence for incomplete parser metadata', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        bridgeStatus={{ mode: 'standalone', skill0Root: null }}
        bridgeStatusError={null}
      />,
    );

    const panel = await screen.findByTestId('validation-evidence-panel');
    expect(panel).toHaveTextContent('app.validationStandaloneWarning');
    expect(panel).toHaveTextContent('app.validationMissingSchemaVersion');
    expect(panel).toHaveTextContent('app.validationMissingSkillId');
    expect(panel).toHaveTextContent('app.validationMissingExecutionPaths');
  });

  it('offers a bridge retry action when bridge status is unavailable', async () => {
    const retrySpy = vi.fn();

    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        onRetryBridgeStatus={retrySpy}
        bridgeStatus={null}
        bridgeStatusError="Bridge down"
      />,
    );

    fireEvent.click(await screen.findByTestId('workspace-retry-bridge-status'));
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('offers recovery actions for validation issues', async () => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    const resetSpy = vi.fn();

    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        onResetWorkspace={resetSpy}
        bridgeStatus={{ mode: 'standalone', skill0Root: null }}
        bridgeStatusError={null}
      />,
    );

    try {
      fireEvent.click(await screen.findByTestId('validation-open-workflow'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(scrollSpy).toHaveBeenCalled();

      fireEvent.click(screen.getByText('app.returnToIntake'));
      expect(resetSpy).toHaveBeenCalledTimes(1);
    } finally {
      scrollSpy.mockRestore();
    }
  });

  it('exports a review packet with reviewer decision metadata', async () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalScrollTo = window.scrollTo;
    URL.createObjectURL = vi.fn(() => 'blob:review-packet') as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    window.scrollTo = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const stringifySpy = vi.spyOn(JSON, 'stringify');

    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        modifiedPaths={new Set(['projectName', 'riskAssessment.level', 'metrics'])}
        bridgeStatus={{ mode: 'skill-0', skill0Root: '/home/miles/dev2/skill-0' }}
        bridgeStatusError={null}
      />,
    );

    fireEvent.change(screen.getByLabelText('app.reviewerName'), { target: { value: 'Miles' } });
    fireEvent.change(screen.getByLabelText('app.reviewDecision'), { target: { value: 'approved' } });
    fireEvent.change(screen.getByLabelText('app.reviewNotes'), { target: { value: 'Ready for merge after canonical verification.' } });

    const reviewDecisionPanel = screen.getByTestId('review-decision-panel');
    expect(reviewDecisionPanel).toHaveTextContent('app.reviewStatusApproved');
    expect(reviewDecisionPanel).toHaveTextContent('Miles');
    expect(reviewDecisionPanel).toHaveTextContent('Ready for merge after canonical verification.');

    fireEvent.click(screen.getByText('app.actionsTray'));
    fireEvent.click(await screen.findByText('app.exportReviewPacket'));

    expect(clickSpy).toHaveBeenCalled();
    const packet = stringifySpy.mock.calls.at(-1)?.[0] as any;
    expect(packet.projectId).toBe('demo-skill');
    expect(packet.parserMode).toBe('skill-0');
    expect(packet.reviewState.reviewerName).toBe('Miles');
    expect(packet.reviewState.reviewStatus).toBe('approved');
    expect(packet.reviewState.diffSummary.changed).toEqual(['projectName', 'riskAssessment.level']);
    expect(packet.reviewState.diffSummary.stats.fieldsChanged).toBe(2);
    expect(packet.validationEvidence.provenance.parserVersion).toBe('v1');
    expect(packet.reviewChecklist.find((item: any) => item.id === 'bridge-mode')?.status).toBe('complete');
    expect(packet.reviewChecklist.find((item: any) => item.id === 'schema-validation')?.status).toBe('blocked');
    expect(packet.reviewState.globalNotes[0].content).toContain('Ready for merge');
    expect(packet.reviewState.decisionLog[0].action).toBe('approved');
    expect(packet.reviewDecisionGuidance).toContain('canonical skill-0 bridge');

    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    window.scrollTo = originalScrollTo;
    clickSpy.mockRestore();
    stringifySpy.mockRestore();
  });
});
