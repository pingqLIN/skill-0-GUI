import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewWorkspace } from '../components/ReviewWorkspace';

const REVIEW_DRAFT_STORAGE_KEY = 'skill-0-review-studio.review-draft.v1:demo-skill';

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
vi.mock('../components/SideEditor', () => ({
  SideEditor: ({ config }: any) => config
    ? <div data-testid="side-editor-config">{`${config.type}:${config.focusPath ?? 'none'}`}</div>
    : null,
}));
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

const exportReadyData = {
  ...sampleData,
  parserResult: {
    ...sampleData.parserResult,
    meta: {
      parser_version: 'v1',
      schema_version: '2.4.0',
      skill_id: 'demo-skill',
      title: 'Demo Skill',
    },
    decomposition: {
      actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
      directives: [],
      rules: [],
    },
    execution_paths: [{ id: 'path_001', name: 'default-path', steps: ['a_001'] }],
    original_definition: { source: 'json/test' },
    supporting_files: [],
    command_references: [],
    analysis_findings: [],
    manifest: { analysis_level: 'manifest', unresolved_references_count: 0 },
  },
};

const llmAssistedExportData = {
  ...exportReadyData,
  bridge: {
    draft_only: true,
    fallback_reason: 'Unknown document structure required AI-assisted recovery.',
    mode: 'llm-assisted',
    model: 'gpt-4o-mini',
    provider: 'openai',
    schema_validation: 'passed',
    skill0Root: null,
  },
  reviewerSummary: {
    ...sampleData.reviewerSummary,
    draft_only: true,
    equivalenceNote: 'draft_only_ai_assisted',
    fallback_reason: 'Unknown document structure required AI-assisted recovery.',
    mode: 'llm-assisted',
    operatorReminders: ['Treat the result as a draft until canonical parity is confirmed.'],
    schema_validation: 'passed',
  },
};

const baseProps = {
  darkMode: false,
  demoPreset: null,
  modifiedPaths: new Set<string>(),
  supportFiles: [],
  selectedContextPath: null,
  guiRepoUrl: 'https://example.com/gui',
  engineRepoUrl: 'https://example.com/engine',
  currentLanguage: 'zh',
  onOpenLlmSettings: vi.fn(),
  onSelectContextPath: vi.fn(),
  onSaveEdit: vi.fn(),
  onToggleLanguage: vi.fn(),
  onUndo: vi.fn(),
  onResetWorkspace: vi.fn(),
};

function createProps() {
  return {
    ...baseProps,
    bridgeStatus: { mode: 'skill-0' as const, skill0Root: '/home/miles/dev2/skill-0' },
    bridgeStatusError: null,
    originalData: sampleData,
  };
}

async function openInsightTab(name: 'review' | 'checks' | 'context') {
  fireEvent.click(await screen.findByText(name));
}

async function openReviewSubTab(name: 'decision' | 'notes' | 'diff') {
  const labels = {
    decision: 'app.reviewDecision',
    notes: 'app.reviewNotes',
    diff: 'app.diffSummary',
  } as const;

  if (!screen.queryByRole('button', { name: labels[name] })) {
    await openInsightTab('review');
  }
  fireEvent.click(await screen.findByRole('button', { name: labels[name] }));
}

async function openChecksSubTab(name: 'posture' | 'schema' | 'consistency' | 'tests' | 'evidence') {
  const labels = {
    posture: 'app.checksPosture',
    schema: 'app.schemaValidation',
    consistency: 'app.consistencyChecks',
    tests: 'app.reviewerTests',
    evidence: 'app.validationEvidence',
  } as const;

  if (!screen.queryByRole('button', { name: labels[name] })) {
    await openInsightTab('checks');
  }
  fireEvent.click(await screen.findByRole('button', { name: labels[name] }));
}

async function expandTopToolbarIfCollapsed() {
  const expandButton = screen.queryByRole('button', { name: 'app.toolbarExpand' });
  if (expandButton) {
    fireEvent.click(expandButton);
    await screen.findByTestId('top-toolbar-context-deck');
  }
}

async function openTopToolbarActionsTray() {
  await expandTopToolbarIfCollapsed();
  fireEvent.click(await screen.findByRole('button', { name: 'app.actionsTray' }));
}

async function exportReviewPacketFromActionsTray() {
  await openTopToolbarActionsTray();
  fireEvent.click(await screen.findByTestId('top-toolbar-export-review-packet'));
}

async function openPipelineSubview(name: 'summary' | 'analysis' | 'decomposition' | 'pipeline' | 'derived') {
  fireEvent.click(await screen.findByTestId(`pipeline-subview-${name}`));
  await screen.findByTestId(`pipeline-section-content-${name}`);
}

function readBlobAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('ReviewWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.scrollTo = vi.fn();
  });

  it('preserves the active tab when parent data rerenders after an edit', async () => {
    const props = createProps();
    const { rerender } = render(<ReviewWorkspace data={sampleData} {...props} />);

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getByText('app.tabs.vector'));
    expect(await screen.findByTestId('vector-space')).toBeInTheDocument();

    rerender(<ReviewWorkspace data={JSON.parse(JSON.stringify(sampleData))} {...props} />);

    expect(screen.getByTestId('vector-space')).toBeInTheDocument();
  });

  it('separates summary, decomposition, and derived workflow into distinct pipeline subviews', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    expect(await screen.findByTestId('pipeline-section-content-summary')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('decomposition-board')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flowchart')).not.toBeInTheDocument();

    await openPipelineSubview('decomposition');
    expect(await screen.findByTestId('decomposition-board')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();

    await openPipelineSubview('derived');
    expect(await screen.findByTestId('flowchart')).toBeInTheDocument();
    expect(screen.queryByTestId('decomposition-board')).not.toBeInTheDocument();
  });

  it('collapses the top toolbar context deck while keeping fixed tools visible', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    expect(screen.queryByTestId('top-toolbar-context-deck')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'app.toolbarExpand' }));

    await waitFor(() => {
      expect(screen.getByTestId('top-toolbar-context-deck')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'app.toolbarCollapse' }));

    await waitFor(() => {
      expect(screen.queryByTestId('top-toolbar-context-deck')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'app.toolbarExpand' })).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('surfaces a compare entry point and fallback diff summary for non-structured edits', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...createProps()}
        modifiedPaths={new Set(['projectName', 'phases.phase-1.name'])}
      />,
    );

    await openPipelineSubview('analysis');
    expect(screen.getByTestId('edit-verification-strip')).toHaveTextContent('app.editVerification');
    expect(screen.getByTestId('edit-verification-strip')).toHaveTextContent('projectName');

    fireEvent.click(screen.getByRole('button', { name: 'app.compareChanges' }));

    const diffDrawer = document.querySelector('.review-bottom-drawer');
    expect(diffDrawer).not.toBeNull();
    expect(await within(diffDrawer as HTMLElement).findByText('projectName')).toBeInTheDocument();
    expect(within(diffDrawer as HTMLElement).getByText('phases.phase-1.name')).toBeInTheDocument();
  });

  it('renders schema validation warnings for the current SkillDocument projection', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openChecksSubTab('schema');
    expect((await screen.findAllByText('app.schemaValidation')).length).toBeGreaterThan(0);
    expect(screen.getByText('app.validationValid')).toBeInTheDocument();
    expect(screen.getByText('SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED')).toBeInTheDocument();
  });

  it('renders consistency issues for invalid execution path references', async () => {
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

    render(<ReviewWorkspace data={inconsistentData} {...createProps()} />);

    await openChecksSubTab('consistency');
    expect((await screen.findAllByText('app.consistencyChecks')).length).toBeGreaterThan(0);
    expect(screen.getByText('app.consistencyInvalid')).toBeInTheDocument();
    expect(screen.getByText('missing_reference')).toBeInTheDocument();
  });

  it('surfaces malformed execution paths in the validation panel', async () => {
    const malformedData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        execution_paths: [{ branches: [{ condition: 'fallback' }], name: 'broken-path' }],
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={malformedData} {...createProps()} />);

    await openChecksSubTab('schema');
    expect((await screen.findAllByText('app.schemaValidation')).length).toBeGreaterThan(0);
    expect(screen.getByText('app.validationInvalid')).toBeInTheDocument();
    expect(screen.getByText('SCHEMA_PATH_ID')).toBeInTheDocument();
  });

  it('opens the structured editor at the validation issue field path', async () => {
    const malformedData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        execution_paths: [{ branches: [{ condition: 'fallback' }], name: 'broken-path' }],
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={malformedData} {...createProps()} />);

    await openChecksSubTab('schema');
    fireEvent.click(await screen.findByText('app.openIssueInEditor'));

    expect(screen.getByTestId('side-editor-config')).toHaveTextContent('skillDocument:execution_paths[0].id');
  });

  it('opens the structured editor at the consistency issue field path', async () => {
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

    render(<ReviewWorkspace data={inconsistentData} {...createProps()} />);

    await openChecksSubTab('consistency');
    const buttons = await screen.findAllByText('app.openIssueInEditor');
    fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByTestId('side-editor-config')).toHaveTextContent('skillDocument:execution_paths[0].steps');
  });

  it('exposes dedicated editor shortcuts while keeping the action tray focused on export actions', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await expandTopToolbarIfCollapsed();
    expect(screen.getByTestId('top-toolbar-open-global-editor-shortcut')).toBeInTheDocument();
    expect(screen.getByTestId('top-toolbar-open-structured-editor-shortcut')).toBeInTheDocument();
    expect(screen.getByTestId('top-toolbar-open-json-editor-shortcut')).toBeInTheDocument();
    expect(screen.queryByTestId('top-toolbar-export-review-packet-shortcut')).not.toBeInTheDocument();

    await openTopToolbarActionsTray();

    expect(screen.queryByTestId('top-toolbar-open-structured-editor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'app.exportReviewPacket' })).toBeInTheDocument();
  });

  it('records a reviewer-facing validation run from the test panel', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openChecksSubTab('tests');
    fireEvent.click(await screen.findByText('app.runValidation'));

    expect(screen.getByText('0 app.validationErrors · 1 app.validationWarnings')).toBeInTheDocument();
    expect(screen.getByText('app.reviewerTestsPassed')).toBeInTheDocument();
  });

  it('captures a session reviewer note', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openReviewSubTab('notes');
    fireEvent.change(await screen.findByPlaceholderText('app.reviewerNotesPlaceholder'), {
      target: { value: 'Need canonical rerun before approval.' },
    });
    fireEvent.click(screen.getByText('app.addReviewerNote'));

    expect(screen.getByText('Need canonical rerun before approval.')).toBeInTheDocument();
    expect(screen.getByText('1 app.notesCount')).toBeInTheDocument();
  });

  it('shows a diff summary against the original review data', async () => {
    const changedData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        meta: { ...sampleData.parserResult.meta, title: 'Demo Skill Updated' },
        decomposition: {
          actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
          directives: [],
          rules: [],
        },
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={changedData} {...createProps()} />);

    await openReviewSubTab('diff');
    expect((await screen.findAllByText('app.diffSummary')).length).toBeGreaterThan(0);
    expect(screen.getByText('3 app.diffEntries')).toBeInTheDocument();
    expect(screen.getByText('action:a_001')).toBeInTheDocument();
    expect(screen.getByText('meta')).toBeInTheDocument();
  });

  it('restores persisted reviewer notes and test runs from localStorage', async () => {
    window.localStorage.setItem(REVIEW_DRAFT_STORAGE_KEY, JSON.stringify({
      validationRuns: [
        {
          id: 'validation-1',
          startedAt: '2026-04-02T00:00:00.000Z',
          finishedAt: '2026-04-02T00:00:01.000Z',
          status: 'passed',
          errors: [],
          warnings: [{ code: 'SCHEMA_WARN', path: 'meta.title', message: 'warning', severity: 'warning' }],
        },
      ],
      consistencyRuns: [],
      pathTestRuns: [],
      globalNotes: [
        {
          id: 'note-1',
          createdAt: '2026-04-02T00:00:02.000Z',
          author: 'Reviewer',
          content: 'Persisted note',
          severity: 'info',
        },
      ],
      elementNotes: [],
      noteTarget: 'global',
      reviewStatus: 'approved',
      reviewerName: 'Persisted Reviewer',
      reviewerNotes: 'Persisted reviewer packet notes.',
      reviewSummaryDraft: 'Final review summary',
      reviewerSignoff: 'qa-bot',
      reviewChecklist: {
        modeConfirmed: true,
        validationReviewed: true,
        diffReviewed: false,
        evidenceReady: true,
      },
      updatedAt: '2026-04-02T00:00:04.000Z',
      decisionLog: [
        {
          id: 'decision-1',
          timestamp: '2026-04-02T00:00:03.000Z',
          action: 'approved',
          summary: 'Review status changed to approved.',
        },
      ],
    }));

    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openReviewSubTab('notes');
    expect(await screen.findByText('Persisted note')).toBeInTheDocument();
    await openChecksSubTab('tests');
    expect(screen.getByText('0 app.validationErrors · 1 app.validationWarnings')).toBeInTheDocument();
    await openReviewSubTab('decision');
    expect(screen.getAllByText('app.reviewStatusApproved').length).toBeGreaterThan(0);
    expect(screen.getByText('Review status changed to approved.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Final review summary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('qa-bot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Persisted Reviewer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Persisted reviewer packet notes.')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    await expandTopToolbarIfCollapsed();
    expect(screen.getByTestId('review-draft-status')).toHaveTextContent('app.localDraft');
  });

  it('updates the review status and records a decision log entry', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openReviewSubTab('decision');
    fireEvent.click(await screen.findByText('app.markApproved'));

    expect(screen.getAllByText('app.reviewStatusApproved').length).toBeGreaterThan(0);
    expect(screen.getByText('Review status changed to approved.')).toBeInTheDocument();
    await expandTopToolbarIfCollapsed();
    expect(await screen.findByTestId('review-draft-status')).toHaveTextContent('app.localDraftAutosaved');
  });

  it('allows manual handoff updates within the valid state set and records them', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await openReviewSubTab('decision');
    fireEvent.change(await screen.findByLabelText('app.handoffState'), {
      target: { value: 'ready_for_review' },
    });

    expect(screen.getByText('Handoff state changed to ready_for_review.')).toBeInTheDocument();
  });

  it('locks formal exports until approval, gates, and blocking checks are resolved', async () => {
    render(<ReviewWorkspace data={sampleData} {...createProps()} />);

    await expandTopToolbarIfCollapsed();
    fireEvent.click(await screen.findByRole('button', { name: 'app.actionsTray' }));
    expect(await screen.findByRole('button', { name: 'app.exportReviewPacket' })).toBeDisabled();
    await openReviewSubTab('decision');
    expect(screen.getByText('app.exportLocked')).toBeInTheDocument();
    expect(screen.getByText(/app.exportBlockedReviewStatus/)).toBeInTheDocument();
    expect(screen.getByText(/app.exportBlockedGates/)).toBeInTheDocument();
  });

  it('applies a guided demo preset when no reviewer draft exists', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...createProps()}
        demoPreset={{
          id: 'bundle-review',
          title: 'Bundle Intake Review',
          focus: 'bundle review focus',
          nextStep: 'Inspect supporting files and clear the evidence gate.',
          reviewStatus: 'changes_requested',
          reviewSummary: 'Supporting files need one more evidence pass before approval.',
          reviewerSignoff: 'bundle-reviewer',
          reviewChecklist: {
            modeConfirmed: true,
            validationReviewed: true,
            diffReviewed: true,
            evidenceReady: false,
          },
          notes: ['Preset note for the bundle review demo.'],
          seedValidationRun: true,
          seedConsistencyRun: true,
          seedPathRun: true,
        }}
      />,
    );

    const demoPreset = await screen.findByTestId('demo-review-preset');
    await openReviewSubTab('decision');
    expect(demoPreset).toHaveTextContent('Bundle Intake Review');
    await waitFor(() => {
      expect(screen.getByPlaceholderText('app.reviewSummaryPlaceholder')).toHaveValue('Supporting files need one more evidence pass before approval.');
    });
    expect(screen.getByPlaceholderText('app.reviewerSignoffPlaceholder')).toHaveValue('bundle-reviewer');
    await openReviewSubTab('notes');
    expect(screen.getByText('Preset note for the bundle review demo.')).toBeInTheDocument();
    await openReviewSubTab('decision');
    expect(screen.getAllByText('app.reviewStatusChangesRequested').length).toBeGreaterThan(0);
    expect(within(demoPreset).getByText('3/4')).toBeInTheDocument();
    expect(screen.getByText('Sample workspace loaded with review status changes_requested.')).toBeInTheDocument();
    expect(screen.getByText(/Sample workspace seeded validation run/)).toBeInTheDocument();
  });

  it('does not override a persisted reviewer draft with a demo preset', async () => {
    window.localStorage.setItem(REVIEW_DRAFT_STORAGE_KEY, JSON.stringify({
      validationRuns: [],
      consistencyRuns: [],
      pathTestRuns: [],
      globalNotes: [],
      elementNotes: [],
      noteTarget: 'global',
      reviewStatus: 'approved',
      reviewerName: 'persisted-reviewer',
      reviewerNotes: 'Persisted reviewer note wins.',
      reviewSummaryDraft: 'Persisted summary wins.',
      reviewerSignoff: 'persisted-reviewer',
      reviewChecklist: {
        modeConfirmed: true,
        validationReviewed: true,
        diffReviewed: true,
        evidenceReady: true,
      },
      updatedAt: '2026-04-02T00:00:04.000Z',
      decisionLog: [],
    }));

    render(
      <ReviewWorkspace
        data={sampleData}
        {...createProps()}
        demoPreset={{
          id: 'publish-gate',
          title: 'Publish Approval Gate',
          focus: 'release focus',
          nextStep: 'Export the report.',
          reviewStatus: 'changes_requested',
          reviewSummary: 'Demo preset summary should not replace persisted state.',
          reviewerSignoff: 'demo-reviewer',
          reviewChecklist: {
            modeConfirmed: true,
            validationReviewed: false,
            diffReviewed: false,
            evidenceReady: false,
          },
          notes: ['demo preset note'],
        }}
      />,
    );

    await openReviewSubTab('decision');
    await waitFor(() => {
      expect(screen.getByDisplayValue('Persisted summary wins.')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('app.reviewerName')).toHaveValue('persisted-reviewer');
    expect(screen.getByPlaceholderText('app.reviewerSignoffPlaceholder')).toHaveValue('persisted-reviewer');
    expect(screen.getByLabelText('app.reviewNotes')).toHaveValue('Persisted reviewer note wins.');
    expect(screen.queryByText('demo preset note')).not.toBeInTheDocument();
    expect(screen.getAllByText('app.reviewStatusApproved').length).toBeGreaterThan(0);
  });

  it('shows mode-aware review evidence guidance when the workspace is using the standalone parser', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        originalData={sampleData}
        bridgeStatus={{ mode: 'standalone', skill0Root: null }}
        bridgeStatusError={null}
      />,
    );

    await openPipelineSubview('analysis');
    const guidance = await screen.findByText('app.bridgeHelpStandalone');
    const truthBanner = screen.getByTestId('review-truth-banner');

    expect(guidance).toBeInTheDocument();
    expect(truthBanner).toHaveTextContent('app.bridgeModeStandaloneShort');
    expect(truthBanner).toHaveTextContent('app.reviewEvidenceStandalone');
    expect(truthBanner).toHaveTextContent('app.equivalenceUnverified');
    expect(truthBanner).toHaveTextContent('app.handoffStateNeedsEvidence');
  });

  it('shows reviewer-facing validation evidence for incomplete parser metadata', async () => {
    render(
      <ReviewWorkspace
        data={sampleData}
        {...baseProps}
        originalData={sampleData}
        bridgeStatus={{ mode: 'standalone', skill0Root: null }}
        bridgeStatusError={null}
      />,
    );

    await openChecksSubTab('evidence');
    const panel = await screen.findByTestId('validation-evidence-panel');
    expect(panel).toHaveTextContent('app.validationStandaloneWarning');
    expect(panel).toHaveTextContent('app.validationMissingSchemaVersion');
    expect(panel).toHaveTextContent('app.validationMissingSkillId');
    expect(panel).toHaveTextContent('app.validationMissingExecutionPaths');
  });

  it('exports a review packet with reviewer decision metadata', async () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalScrollTo = window.scrollTo;
    const exportedBlobs: Blob[] = [];
    URL.createObjectURL = vi.fn((value: Blob | MediaSource) => {
      if (value instanceof Blob) {
        exportedBlobs.push(value);
      }
      return 'blob:review-packet';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    window.scrollTo = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ReviewWorkspace
        data={exportReadyData}
        {...createProps()}
        modifiedPaths={new Set(['projectName', 'riskAssessment.level', 'metrics'])}
      />,
    );

    await openReviewSubTab('decision');
    fireEvent.change(screen.getByLabelText('app.reviewerName'), { target: { value: 'Miles' } });
    fireEvent.change(screen.getByLabelText('app.reviewNotes'), { target: { value: 'Ready for merge after canonical verification.' } });
    fireEvent.click(screen.getByText('app.reviewChecklistModeConfirmed'));
    fireEvent.click(screen.getByText('app.reviewChecklistValidationReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistDiffReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistEvidenceReady'));
    fireEvent.click(screen.getByText('app.markApproved'));

    await openPipelineSubview('analysis');
    const reviewDecisionPanel = screen.getByTestId('review-decision-panel');
    expect(reviewDecisionPanel).toHaveTextContent('app.reviewStatusApproved');
    expect(reviewDecisionPanel).toHaveTextContent('Miles');
    expect(screen.getByDisplayValue('Ready for merge after canonical verification.')).toBeInTheDocument();

    await exportReviewPacketFromActionsTray();

    expect(clickSpy).toHaveBeenCalled();
    const packetBlob = exportedBlobs.at(-1);
    expect(packetBlob).toBeDefined();
    const packet = JSON.parse(await readBlobAsText(packetBlob!)) as any;
    expect(packet.projectId).toBe('demo-skill');
    expect(packet.parserMode).toBe('skill-0');
    expect(packet.handoffState).toBe('approved_for_export');
    expect(packet.reviewProfile).toBe('mode_verification');
    expect(packet.reviewState.reviewerName).toBe('Miles');
    expect(packet.reviewState.reviewStatus).toBe('approved');
    expect(packet.reviewState.diffSummary.changed.length).toBeGreaterThan(0);
    expect(packet.reviewState.diffSummary.stats.fieldsChanged).toBeGreaterThan(0);
    expect(packet.validationEvidence.provenance.parserVersion).toBe('v1');
    expect(packet.contextSummary).toHaveLength(4);
    expect(packet.reviewChecklist.find((item: any) => item.id === 'bridge-mode')?.status).toBe('complete');
    expect(packet.reviewChecklist.find((item: any) => item.id === 'schema-validation')?.status).toBe('complete');
    expect(packet.reviewState.globalNotes[0].content).toContain('Ready for merge');
    expect(packet.reviewState.decisionLog[0].action).toBe('approved');
    expect(packet.reviewDecisionGuidance).toContain('canonical skill-0 bridge');

    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    window.scrollTo = originalScrollTo;
    clickSpy.mockRestore();
  });

  it('keeps llm-assisted draft metadata in the truth banner and exported review packet', async () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const exportedBlobs: Blob[] = [];
    URL.createObjectURL = vi.fn((value: Blob | MediaSource) => {
      if (value instanceof Blob) {
        exportedBlobs.push(value);
      }
      return 'blob:llm-review-packet';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReviewWorkspace data={llmAssistedExportData} {...createProps()} />);

    await openPipelineSubview('analysis');
    const truthBanner = await screen.findByTestId('review-truth-banner');
    expect(truthBanner).toHaveTextContent('app.bridgeModeLlmAssistedShort');
    expect(truthBanner).toHaveTextContent('app.equivalenceAiAssistedDraft');
    expect(truthBanner).toHaveTextContent('app.bridgeDraftOnlyWarning');

    await openChecksSubTab('evidence');
    expect(await screen.findByTestId('validation-evidence-panel')).toHaveTextContent('app.validationLlmAssistedWarning');

    await openReviewSubTab('decision');
    fireEvent.change(screen.getByLabelText('app.reviewerName'), { target: { value: 'Miles' } });
    fireEvent.click(screen.getByText('app.reviewChecklistModeConfirmed'));
    fireEvent.click(screen.getByText('app.reviewChecklistValidationReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistDiffReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistEvidenceReady'));
    fireEvent.click(screen.getByText('app.markApproved'));
    await exportReviewPacketFromActionsTray();

    expect(clickSpy).toHaveBeenCalled();
    const packetBlob = exportedBlobs.at(-1);
    expect(packetBlob).toBeDefined();
    const packet = JSON.parse(await readBlobAsText(packetBlob!)) as any;
    expect(packet.parserMode).toBe('llm-assisted');
    expect(packet.draftOnly).toBe(true);
    expect(packet.fallbackReason).toBe('Unknown document structure required AI-assisted recovery.');
    expect(packet.llmProvider).toBe('openai');
    expect(packet.llmModel).toBe('gpt-4o-mini');
    expect(packet.schemaValidation).toBe('passed');
    expect(packet.validationEvidence.evidenceWarnings).toContain('app.validationLlmAssistedWarning');

    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    clickSpy.mockRestore();
  });

  it('exports a reviewer-facing report with notes diff and test summaries', async () => {
    const changedData = {
      ...exportReadyData,
      parserResult: {
        ...exportReadyData.parserResult,
        meta: { ...exportReadyData.parserResult.meta, title: 'Demo Skill Updated' },
        decomposition: {
          actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
          directives: [],
          rules: [],
        },
        original_definition: { source: 'json/test' },
      },
    };

    const originalCreateElement = document.createElement.bind(document);
    const originalBlob = globalThis.Blob;
    let capturedBlob: Blob | null = null;
    let capturedAnchor: HTMLAnchorElement | null = null;

    class MockBlob {
      private readonly textContent: string;
      readonly type: string;

      constructor(parts: Array<string | Blob | ArrayBuffer | ArrayBufferView>, options?: BlobPropertyBag) {
        this.textContent = parts.map((part) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part && typeof (part as Blob & { text?: () => Promise<string> }).text === 'function') {
            return '[blob-part]';
          }
          return String(part);
        }).join('');
        this.type = options?.type ?? '';
      }

      text() {
        return Promise.resolve(this.textContent);
      }
    }

    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      writable: true,
      value: MockBlob,
    });
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === 'a') {
        capturedAnchor = element as HTMLAnchorElement;
      }
      return element;
    }) as typeof document.createElement);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn((blob: Blob | MediaSource) => {
        capturedBlob = blob as Blob;
        return 'blob:review-report';
      }),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {}),
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReviewWorkspace data={changedData} {...createProps()} />);

    await openReviewSubTab('notes');
    fireEvent.change(await screen.findByPlaceholderText('app.reviewerNotesPlaceholder'), {
      target: { value: 'Need canonical rerun before approval.' },
    });
    fireEvent.click(screen.getByText('app.addReviewerNote'));
    await openReviewSubTab('decision');
    fireEvent.change(screen.getByPlaceholderText('app.reviewSummaryPlaceholder'), {
      target: { value: 'Approve after canonical rerun confirms parity.' },
    });
    fireEvent.change(screen.getByPlaceholderText('app.reviewerSignoffPlaceholder'), {
      target: { value: 'reviewer-01' },
    });
    fireEvent.click(screen.getByText('app.reviewChecklistModeConfirmed'));
    fireEvent.click(screen.getByText('app.reviewChecklistValidationReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistDiffReviewed'));
    fireEvent.click(screen.getByText('app.reviewChecklistEvidenceReady'));
    await openChecksSubTab('tests');
    fireEvent.click(screen.getByText('app.runValidation'));
    await openReviewSubTab('decision');
    fireEvent.click(screen.getByText('app.markApproved'));
    await expandTopToolbarIfCollapsed();
    fireEvent.click(screen.getByRole('button', { name: 'app.actionsTray' }));
    fireEvent.click(screen.getByText('app.exportReviewReport'));

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedAnchor?.download).toBe('demo-skill-canonical-review-report.md');
    expect(capturedBlob).not.toBeNull();

    const reportText = await (capturedBlob as Blob & { text: () => Promise<string> }).text();
    expect(reportText).toContain('# Review Report: Demo Skill');
    expect(reportText).toContain('- review_profile: mode_verification');
    expect(reportText).toContain('- review_status: approved');
    expect(reportText).toContain('- handoff_state: approved_for_export');
    expect(reportText).toContain('- reviewer_signoff: reviewer-01');
    expect(reportText).toContain('- signoff_gates_completed: 4/4');
    expect(reportText).toContain('## Reviewer Summary');
    expect(reportText).toContain('Approve after canonical rerun confirms parity.');
    expect(reportText).toContain('## Sign-off Gates');
    expect(reportText).toContain('- [x] app.reviewChecklistModeConfirmed');
    expect(reportText).toContain('## Session Notes');
    expect(reportText).toContain('Need canonical rerun before approval.');
    expect(reportText).toContain('## Diff Summary');
    expect(reportText).toContain('action:a_001');
    expect(reportText).toContain('## Reviewer Test Runs');
    expect(reportText).toContain('Validation [passed]');
    expect(reportText).toContain('## Decision Log');
    expect(reportText).toContain('Review status changed to approved.');

    createElementSpy.mockRestore();
    clickSpy.mockRestore();
    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      writable: true,
      value: originalBlob,
    });
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
    }
  });
});
