import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';
import { analyzeSkillText } from '../services/parserBridgeService';
import { fetchBridgeStatus } from '../services/bridgeStatusService';
import JSZip from 'jszip';

const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('../components/ReviewWorkspace', () => ({
  ReviewWorkspace: () => <div data-testid="review-workspace" />,
}));
vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));
vi.mock('../components/Flowchart', () => ({ Flowchart: () => <div data-testid="flowchart" /> }));
vi.mock('../components/PhaseDetails', () => ({ PhaseDetails: () => <div data-testid="phase-details" /> }));
vi.mock('../components/Dashboard', () => ({ Dashboard: () => <div data-testid="dashboard" /> }));
vi.mock('../components/VectorSpace', () => ({ VectorSpace: () => <div data-testid="vector-space" /> }));
vi.mock('../components/SecurityMatrix', () => ({ SecurityMatrix: () => <div data-testid="security-matrix" /> }));
vi.mock('../components/SideEditor', () => ({ SideEditor: () => null }));
vi.mock('../components/DecompositionBoard', () => ({ DecompositionBoard: () => <div data-testid="decomposition-board" /> }));
vi.mock('../services/parserBridgeService', () => ({
  analyzeSkillText: vi.fn(),
}));
vi.mock('../services/bridgeStatusService', () => ({
  fetchBridgeStatus: vi.fn().mockResolvedValue({
    mode: 'skill-0',
    skill0Root: '/home/miles/dev2/skill-0',
  }),
}));

describe('App smoke test', () => {
  beforeEach(() => {
    vi.mocked(analyzeSkillText).mockReset();
    vi.mocked(JSZip.loadAsync).mockReset();
    window.localStorage.clear();
    vi.mocked(fetchBridgeStatus).mockResolvedValue({
      mode: 'skill-0',
      skill0Root: '/home/miles/dev2/skill-0',
    });
  });

  it('renders the intake workspace shell', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(await screen.findByText('app.title')).toBeInTheDocument();
    expect(await screen.findByText('app.analyzeBtn')).toBeInTheDocument();
    expect(await screen.findByText('app.demoTitle')).toBeInTheDocument();
    expect(await screen.findByText('app.demoPathTitle')).toBeInTheDocument();
    expect(await screen.findByText('app.demoDocsTitle')).toBeInTheDocument();
    expect(await screen.findByText('app.demoTrustTitle')).toBeInTheDocument();
    expect(await screen.findByText('app.demoArtifactsTitle')).toBeInTheDocument();
    expect(await screen.findByText('GitHub')).toBeInTheDocument();
    expect(await screen.findAllByText('app.bridgeModeCanonical')).not.toHaveLength(0);
    const banner = await screen.findByTestId('intake-review-readiness');
    expect(banner).toHaveTextContent('app.reviewEvidenceStatus');
    expect(banner).toHaveTextContent('app.reviewEvidenceCanonical');
  });

  it('surfaces standalone parser review guidance before analysis starts', async () => {
    vi.mocked(fetchBridgeStatus).mockResolvedValue({
      mode: 'standalone',
      skill0Root: null,
    });

    await act(async () => {
      render(<App />);
    });

    const banner = await screen.findByTestId('intake-review-readiness');
    expect(banner).toHaveTextContent('app.reviewEvidenceStandalone');
    expect(banner).toHaveTextContent('app.bridgeGuidanceStandalone');
  });

  it('surfaces bridge verification guidance when the bridge status request fails', async () => {
    vi.mocked(fetchBridgeStatus).mockRejectedValue(new Error('Bridge down'));

    await act(async () => {
      render(<App />);
    });

    const banner = await screen.findByTestId('intake-review-readiness');
    expect(banner).toHaveTextContent('app.reviewEvidenceUnavailable');
    expect(banner).toHaveTextContent('Bridge down');
    expect(banner).toHaveTextContent('app.bridgeGuidanceUnavailable');
  });

  it('loads the review workspace after analysis completes', async () => {
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'demo-skill',
      projectName: 'Demo Skill',
      phases: [],
      riskAssessment: { level: 'SAFE', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.change(screen.getByPlaceholderText('app.placeholder'), {
      target: { value: '# demo skill' },
    });
    fireEvent.click(screen.getByText('app.analyzeBtn'));

    await waitFor(() => {
      expect(screen.getByTestId('review-workspace')).toBeInTheDocument();
    });
    expect(analyzeSkillText).toHaveBeenCalledWith('# demo skill', 'uploaded-skill', {});
  });

  it('launches the curated bundle review scenario with supporting files', async () => {
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'bundle-intake-review',
      projectName: 'Bundle Intake Review',
      phases: [],
      riskAssessment: { level: 'MEDIUM', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 82 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 84, reworkRate: 14 },
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByText('app.demoScenario.bundle-review.cta'));

    await waitFor(() => {
      expect(analyzeSkillText).toHaveBeenCalledWith(
        expect.stringContaining('# Bundle Intake Review'),
        'bundle-intake-review',
        {
          primaryPath: 'demo/bundle-review/SKILL.md',
          contextFiles: [
            expect.objectContaining({
              name: 'policy.md',
              path: 'demo/bundle-review/docs/policy.md',
              role: 'context',
            }),
            expect.objectContaining({
              name: 'run.py',
              path: 'demo/bundle-review/scripts/run.py',
              role: 'context',
            }),
          ],
        },
      );
    });
  });

  it('loads an imported skill document JSON without calling the parser bridge', async () => {
    const importedSkillDocument = {
      decomposition: {
        actions: [{ action_type: 'io_read', id: 'a_001', name: 'Read files' }],
        directives: [{ directive_type: 'strategy', id: 'd_001', name: 'Keep evidence' }],
        rules: [{ id: 'r_001', name: 'Review findings' }],
      },
      execution_paths: [{ id: 'path_001', steps: ['a_001', 'r_001', 'd_001'] }],
      meta: {
        schema_version: '2.4.0',
        skill_id: 'claude__imported-json',
        title: 'Imported JSON Skill',
      },
    };

    await act(async () => {
      render(<App />);
    });

    fireEvent.change(screen.getByPlaceholderText('app.placeholder'), {
      target: { value: JSON.stringify(importedSkillDocument, null, 2) },
    });
    fireEvent.click(screen.getByText('app.analyzeBtn'));

    await waitFor(() => {
      expect(screen.getByTestId('review-workspace')).toBeInTheDocument();
    });
    expect(analyzeSkillText).not.toHaveBeenCalled();
  });

  it('analyzes a zipped skill bundle through the dynamic JSZip intake path', async () => {
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'zip-skill',
      projectName: 'Zip Skill',
      phases: [],
      riskAssessment: { level: 'SAFE', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
    });

    vi.mocked(JSZip.loadAsync).mockResolvedValue({
      files: {
        'bundle/SKILL.md': {
          dir: false,
          name: 'bundle/SKILL.md',
          async: vi.fn().mockResolvedValue('# zipped skill'),
        },
        'bundle/docs/policy.md': {
          dir: false,
          name: 'bundle/docs/policy.md',
          async: vi.fn().mockResolvedValue('# Policy'),
        },
      },
    } as any);

    const { container } = render(<App />);
    const fileInput = container.querySelector('input[accept*=".zip"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const zipFile = new File(['zip-binary'], 'bundle.zip', { type: 'application/zip' });

    await act(async () => {
      fireEvent.change(fileInput!, {
        target: { files: [zipFile] },
      });
    });

    expect(await screen.findByText('bundle/SKILL.md')).toBeInTheDocument();

    fireEvent.click(screen.getByText('app.reviewAndAnalyze'));

    await waitFor(() => {
      expect(analyzeSkillText).toHaveBeenCalledWith('# zipped skill', 'SKILL.md', {
        primaryPath: 'bundle/SKILL.md',
        contextFiles: [
          expect.objectContaining({
            name: 'policy.md',
            path: 'bundle/docs/policy.md',
            role: 'context',
            text: '# Policy',
          }),
        ],
      });
    });
  });

  it('restores the last workspace draft from localStorage on load', async () => {
    window.localStorage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify({
      data: {
        projectId: 'restored-skill',
        projectName: 'Restored Skill',
        phases: [],
        riskAssessment: { level: 'SAFE', details: '' },
        threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
        parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
        globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
      },
      originalData: {
        projectId: 'restored-skill',
        projectName: 'Restored Skill',
        phases: [],
        riskAssessment: { level: 'SAFE', details: '' },
        threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
        parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
        globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
      },
      modifiedPaths: [],
      inputText: '# restored skill',
      pendingUploadFiles: [],
      pendingPrimaryPath: null,
      selectedContextPath: null,
      supportFiles: [],
      updatedAt: '2026-04-02T01:23:45.000Z',
    }));

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('review-workspace')).toBeInTheDocument();
    });
    expect(analyzeSkillText).not.toHaveBeenCalled();
    expect(screen.getByTestId('workspace-draft-status')).toHaveTextContent('app.localDraft');
    expect(screen.getByTestId('workspace-draft-status')).toHaveTextContent('app.localDraftRestored');
  });
});
