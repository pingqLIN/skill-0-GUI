import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

function createProps() {
  return {
    originalData: sampleData,
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
}

describe('ReviewWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('preserves the active tab when parent data rerenders after an edit', async () => {
    const props = createProps();

    const { rerender } = render(<ReviewWorkspace data={sampleData} {...props} />);
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('app.tabs.vector')[1]);
    expect(await screen.findByTestId('vector-space')).toBeInTheDocument();

    rerender(<ReviewWorkspace data={JSON.parse(JSON.stringify(sampleData))} {...props} />);

    expect(screen.getByTestId('vector-space')).toBeInTheDocument();
  });

  it('renders schema validation warnings for the current SkillDocument projection', async () => {
    const props = createProps();

    render(<ReviewWorkspace data={sampleData} {...props} />);

    expect(await screen.findByText('app.schemaValidation')).toBeInTheDocument();
    expect(screen.getByText('app.validationValid')).toBeInTheDocument();
    expect(screen.getByText('SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED')).toBeInTheDocument();
  });

  it('renders consistency issues for invalid execution path references', async () => {
    const props = createProps();

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
    const props = createProps();

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

  it('opens the structured editor at the validation issue field path', async () => {
    const props = createProps();

    const malformedData = {
      ...sampleData,
      parserResult: {
        ...sampleData.parserResult,
        execution_paths: [{ branches: [{ condition: 'fallback' }], name: 'broken-path' }],
        original_definition: { source: 'json/test' },
      },
    };

    render(<ReviewWorkspace data={malformedData} {...props} />);

    fireEvent.click(await screen.findByText('app.openIssueInEditor'));

    expect(screen.getByTestId('side-editor-config')).toHaveTextContent('skillDocument:execution_paths[0].id');
  });

  it('opens the structured editor at the consistency issue field path', async () => {
    const props = createProps();

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

    const buttons = await screen.findAllByText('app.openIssueInEditor');
    fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByTestId('side-editor-config')).toHaveTextContent('skillDocument:execution_paths[0].steps');
  });

  it('exposes the structured SkillDocument editor from the action tray', async () => {
    const props = createProps();

    render(<ReviewWorkspace data={sampleData} {...props} />);

    fireEvent.click(await screen.findByText('app.actionsTray'));

    expect(screen.getAllByText('app.openStructuredEditor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('app.openJsonEditor').length).toBeGreaterThan(0);
  });

  it('records a reviewer-facing validation run from the test panel', async () => {
    const props = createProps();

    render(<ReviewWorkspace data={sampleData} {...props} />);

    fireEvent.click(await screen.findByText('app.runValidation'));

    expect(screen.getByText('0 app.validationErrors · 1 app.validationWarnings')).toBeInTheDocument();
    expect(screen.getByText('app.reviewerTestsPassed')).toBeInTheDocument();
  });

  it('captures a session reviewer note', async () => {
    const props = createProps();

    render(<ReviewWorkspace data={sampleData} {...props} />);

    fireEvent.change(await screen.findByPlaceholderText('app.reviewerNotesPlaceholder'), {
      target: { value: 'Need canonical rerun before approval.' },
    });
    fireEvent.click(screen.getByText('app.addReviewerNote'));

    expect(screen.getByText('Need canonical rerun before approval.')).toBeInTheDocument();
    expect(screen.getByText('1 app.notesCount')).toBeInTheDocument();
  });

  it('shows a diff summary against the original review data', async () => {
    const props = createProps();
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

    render(<ReviewWorkspace data={changedData} {...props} />);

    expect(await screen.findByText('app.diffSummary')).toBeInTheDocument();
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

    const props = createProps();
    render(<ReviewWorkspace data={sampleData} {...props} />);

    expect(await screen.findByText('Persisted note')).toBeInTheDocument();
    expect(screen.getByText('0 app.validationErrors · 1 app.validationWarnings')).toBeInTheDocument();
    expect(screen.getAllByText('app.reviewStatusApproved').length).toBeGreaterThan(0);
    expect(screen.getByText('Review status changed to approved.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Final review summary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('qa-bot')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByTestId('review-draft-status')).toHaveTextContent('app.localDraft');
    expect(screen.getByTestId('review-draft-status')).toHaveTextContent('app.localDraftRestored');
  });

  it('updates the review status and records a decision log entry', async () => {
    const props = createProps();

    render(<ReviewWorkspace data={sampleData} {...props} />);

    fireEvent.click(await screen.findByText('app.markApproved'));

    expect(screen.getAllByText('app.reviewStatusApproved').length).toBeGreaterThan(0);
    expect(screen.getByText('Review status changed to approved.')).toBeInTheDocument();
    expect(await screen.findByTestId('review-draft-status')).toHaveTextContent('app.localDraftAutosaved');
  });

  it('exports a reviewer-facing report with notes diff and test summaries', async () => {
    const props = createProps();
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

    render(<ReviewWorkspace data={changedData} {...props} />);

    fireEvent.change(await screen.findByPlaceholderText('app.reviewerNotesPlaceholder'), {
      target: { value: 'Need canonical rerun before approval.' },
    });
    fireEvent.click(screen.getByText('app.addReviewerNote'));
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
    fireEvent.click(screen.getByText('app.runValidation'));
    fireEvent.click(screen.getByText('app.markApproved'));
    fireEvent.click(screen.getByText('app.actionsTray'));
    fireEvent.click(screen.getByText('app.exportReviewReport'));

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedAnchor?.download).toBe('demo-skill-canonical-review-report.md');
    expect(capturedBlob).not.toBeNull();

    const reportText = await (capturedBlob as Blob & { text: () => Promise<string> }).text();
    expect(reportText).toContain('# Review Report: Demo Skill');
    expect(reportText).toContain('- review_status: approved');
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
