import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';
import { analyzeSkillText, resolveSkillUrl } from '../services/parserBridgeService';
import { fetchBridgeStatus } from '../services/bridgeStatusService';
import { fetchLlmSettings, updateLlmSettings } from '../services/llmSettingsService';
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
  ReviewWorkspace: (props: any) => (
    <div>
      <div data-testid="review-workspace" />
      {(props.workspaceDraftSavedAt || props.workspaceDraftRestored) && (
        <div data-testid="workspace-draft-status">
          app.localDraft {props.workspaceDraftRestored ? 'app.localDraftRestored' : 'app.localDraftAutosaved'}
        </div>
      )}
    </div>
  ),
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
  resolveSkillUrl: vi.fn(),
}));
vi.mock('../services/bridgeStatusService', () => ({
  fetchBridgeStatus: vi.fn().mockResolvedValue({
    mode: 'skill-0',
    skill0Root: '/home/miles/dev2/skill-0',
  }),
}));
vi.mock('../services/llmSettingsService', () => ({
  fetchLlmSettings: vi.fn().mockResolvedValue({
    bridgeStatus: {
      mode: 'skill-0',
      skill0Root: '/home/miles/dev2/skill-0',
      llmFallbackAvailable: false,
      llmProvider: null,
      llmModel: null,
      llmReason: 'app.llmFallbackDisabledHint',
      llmSupportsJsonSchema: false,
      llmSupportsReasoning: false,
    },
    options: {
      modeValues: ['disabled', 'fallback', 'force'],
      providerValues: ['openai'],
    },
    settings: {
      apiKeyConfigured: false,
      apiKeySource: 'none',
      maxInputChars: 12000,
      mode: 'disabled',
      model: 'gpt-4o-mini',
      mutable: true,
      provider: 'openai',
      timeoutMs: 15000,
      updatedAt: null,
    },
  }),
  updateLlmSettings: vi.fn().mockResolvedValue({
    bridgeStatus: {
      mode: 'skill-0',
      skill0Root: '/home/miles/dev2/skill-0',
      llmFallbackAvailable: true,
      llmProvider: 'openai',
      llmModel: 'gpt-4o-mini',
      llmReason: null,
      llmSupportsJsonSchema: true,
      llmSupportsReasoning: true,
    },
    options: {
      modeValues: ['disabled', 'fallback', 'force'],
      providerValues: ['openai'],
    },
    settings: {
      apiKeyConfigured: true,
      apiKeySource: 'runtime',
      maxInputChars: 12000,
      mode: 'force',
      model: 'gpt-4o-mini',
      mutable: true,
      provider: 'openai',
      timeoutMs: 15000,
      updatedAt: '2026-04-06T07:10:00.000Z',
    },
  }),
}));

describe('App smoke test', () => {
  beforeEach(() => {
    vi.mocked(analyzeSkillText).mockReset();
    vi.mocked(resolveSkillUrl).mockReset();
    vi.mocked(JSZip.loadAsync).mockReset();
    vi.mocked(fetchLlmSettings).mockClear();
    vi.mocked(updateLlmSettings).mockClear();
    vi.stubGlobal('scrollTo', vi.fn());
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.mocked(fetchBridgeStatus).mockResolvedValue({
      mode: 'skill-0',
      skill0Root: '/home/miles/dev2/skill-0',
    });
  });

  it('renders the intake workspace shell', async () => {
    await act(async () => {
      render(<App />);
    });

    expect((await screen.findAllByText('app.title')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('task-input-section')).not.toBeInTheDocument();
    expect(await screen.findByText('app.landingOverviewTab')).toBeInTheDocument();
    expect(await screen.findByText('app.landingOutputsTab')).toBeInTheDocument();
    expect(await screen.findByText('app.landingDocsTab')).toBeInTheDocument();
    expect(await screen.findByText('app.landingScenariosTab')).toBeInTheDocument();
    expect(await screen.findByText('GitHub')).toBeInTheDocument();
    expect((await screen.findAllByText('app.bridgeModeCanonical')).length).toBeGreaterThan(0);
    expect(await screen.findByText('app.llmFallbackUnavailable')).toBeInTheDocument();
    expect(await screen.findByTitle(/\/home\/miles\/dev2\/skill-0/)).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Review rail' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'app.workspace' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'app.landingOverviewTab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radiogroup', { name: 'Choose a review task' })).toBeInTheDocument();
    expect(screen.getByTestId('intake-task-review')).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByTestId('intake-task-review'));
    expect(await screen.findByText('app.analyzeBtn')).toBeInTheDocument();
    expect(screen.getByTestId('intake-tab-paste')).toBeInTheDocument();
    expect(screen.getByTestId('intake-tab-url')).toBeInTheDocument();
    expect(screen.queryByTestId('intake-tab-upload')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('intake-tab-url'));
    expect(await screen.findByText('app.skillUrlLabel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('app.landingScenariosTab'));

    expect(await screen.findByText('Mode overview')).toBeInTheDocument();
    expect(await screen.findByText('Bundle intake review')).toBeInTheDocument();
    expect(await screen.findByText('Publish approval gate')).toBeInTheDocument();
  });

  it('warns when durable draft storage is unavailable without blocking intake', async () => {
    const indexedDbDescriptor = Object.getOwnPropertyDescriptor(window, 'indexedDB');
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });

    try {
      await act(async () => {
        render(<App />);
      });

      expect(await screen.findByTestId('workspace-draft-persistence-warning')).toHaveTextContent('app.localDraftMemoryFallback');
      expect(await screen.findByTestId('intake-task-review')).toBeInTheDocument();
    } finally {
      if (indexedDbDescriptor) {
        Object.defineProperty(window, 'indexedDB', indexedDbDescriptor);
      } else {
        delete (window as Window & { indexedDB?: IDBFactory }).indexedDB;
      }
    }
  });

  it('offers goal-first tasks and routes comparison to the upload workflow', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByTestId('intake-task-compare'));
    expect(screen.getByTestId('intake-task-compare')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('bundle-intake-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('task-input-section')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose ZIP file' })).toBeInTheDocument();
  });

  it('loads the demo into paste mode and highlights the next analysis action', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('intake-task-demo'));

    expect(screen.getByTestId('task-input-section')).toBeInTheDocument();
    await waitFor(() => {
      expect((screen.getByTestId('skill-text-input') as HTMLTextAreaElement).value).toContain('name: demo-safe-review');
    });
    expect(screen.getByRole('tab', { name: 'Paste content' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Import URL' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'app.analyzeBtn' })).toHaveClass('task-primary--attention');
  });

  it('renders the public demo entry at /demo and returns to the workspace without a reload', async () => {
    window.history.replaceState({}, '', '/demo');

    await act(async () => {
      render(<App />);
    });

    expect(await screen.findByText('app.demoEntryTitle')).toBeInTheDocument();
    expect(await screen.findByText('app.demoEntryTrustBody')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'app.demoEntryLoadExample' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'app.demoEntryOpenWorkspace' })[1]);

    expect(window.location.pathname).toBe('/');
    expect(await screen.findByTestId('intake-task-review')).toBeInTheDocument();
    expect(screen.queryByTestId('task-input-section')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation across landing tabs', async () => {
    await act(async () => {
      render(<App />);
    });

    const overviewTab = screen.getByRole('tab', { name: 'app.landingOverviewTab' });
    overviewTab.focus();

    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'app.landingOutputsTab' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'app.landingOutputsTab' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'app.landingOutputsTab' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'app.landingScenariosTab' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'app.landingScenariosTab' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'app.landingScenariosTab' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'app.landingOverviewTab' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'app.landingOverviewTab' })).toHaveAttribute('aria-selected', 'true');
  });

  it('surfaces standalone parser review guidance before analysis starts', async () => {
    vi.mocked(fetchBridgeStatus).mockResolvedValue({
      mode: 'standalone',
      skill0Root: null,
    });

    await act(async () => {
      render(<App />);
    });

    expect((await screen.findAllByText('app.bridgeModeStandalone')).length).toBeGreaterThan(0);
    expect(await screen.findByTitle(/app\.bridgeModeBundled/)).toBeInTheDocument();
    expect(await screen.findByText('app.llmFallbackUnavailable')).toBeInTheDocument();
  });

  it('surfaces bridge verification guidance when the bridge status request fails', async () => {
    vi.mocked(fetchBridgeStatus).mockRejectedValue(new Error('Bridge down'));

    await act(async () => {
      render(<App />);
    });

    expect((await screen.findAllByText('app.bridgeModeUnavailable')).length).toBeGreaterThan(0);
    expect(await screen.findByTitle(/Bridge down/)).toBeInTheDocument();
    expect(await screen.findByText('app.llmFallbackUnavailable')).toBeInTheDocument();
  });

  it('shows the hosted llm fallback capability when the bridge reports it', async () => {
    vi.mocked(fetchBridgeStatus).mockResolvedValue({
      mode: 'standalone',
      skill0Root: null,
      llmFallbackAvailable: true,
      llmProvider: 'openai',
      llmModel: 'gpt-4o-mini',
    });

    await act(async () => {
      render(<App />);
    });

    expect((await screen.findAllByText('app.llmFallbackAvailable')).length).toBeGreaterThan(0);
    expect(await screen.findByTitle(/openai\/gpt-4o-mini/)).toBeInTheDocument();
  });

  it('opens the llm admin dialog and saves runtime settings', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByText('app.aiSettings'));

    expect(await screen.findByTestId('llm-settings-dialog')).toBeInTheDocument();
    expect(fetchLlmSettings).toHaveBeenCalled();
    expect(await screen.findByDisplayValue('gpt-4o-mini')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('gpt-4o-mini'), {
      target: { value: 'gpt-4.1-mini' },
    });
    fireEvent.change(screen.getByDisplayValue('app.llmAdminModeDisabled'), {
      target: { value: 'force' },
    });
    fireEvent.change(await screen.findByPlaceholderText('app.llmAdminApiKeyPlaceholder'), {
      target: { value: 'sk-test-1234' },
    });
    fireEvent.click(screen.getByText('app.save'));

    await waitFor(() => {
      expect(updateLlmSettings).toHaveBeenCalledWith({
        apiKey: 'sk-test-1234',
        clearApiKey: false,
        maxInputChars: 12000,
        mode: 'force',
        model: 'gpt-4.1-mini',
        provider: 'openai',
        timeoutMs: 15000,
      });
    });
    expect(await screen.findByText('app.llmAdminSaved')).toBeInTheDocument();
  });

  it('treats the llm admin surface as an accessible dialog with keyboard close and focus restore', async () => {
    await act(async () => {
      render(<App />);
    });

    const openButton = screen.getByRole('button', { name: /app\.aiSettings/ });
    openButton.focus();
    fireEvent.click(openButton);

    const dialog = await screen.findByRole('dialog', { name: 'app.llmAdminTitle' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const closeButton = screen.getByLabelText('app.close');
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    const clearApiKey = await screen.findByLabelText('app.llmAdminClearApiKey');
    clearApiKey.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'app.llmAdminTitle' })).not.toBeInTheDocument();
    });
    expect(openButton).toHaveFocus();
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

    fireEvent.click(screen.getByTestId('intake-task-review'));
    fireEvent.change(screen.getByPlaceholderText('app.placeholder'), {
      target: { value: '# demo skill' },
    });
    fireEvent.click(screen.getByText('app.analyzeBtn'));

    await waitFor(() => {
      expect(screen.getByTestId('review-workspace')).toBeInTheDocument();
    });
    expect(analyzeSkillText).toHaveBeenCalledWith('# demo skill', 'uploaded-skill', {});
  });

  it('stages a supported remote skill URL for source editing before analysis', async () => {
    vi.mocked(resolveSkillUrl).mockResolvedValue({
      contentType: 'text/plain',
      fileName: 'SKILL.md',
      primaryPath: 'owner/repo/main/SKILL.md',
      resolvedUrl: 'https://raw.githubusercontent.com/owner/repo/main/SKILL.md',
      sourceType: 'github-blob',
      text: '# remote skill',
      url: 'https://github.com/owner/repo/blob/main/SKILL.md',
    });
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'remote-skill',
      projectName: 'Remote Skill',
      phases: [],
      riskAssessment: { level: 'SAFE', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByTestId('intake-task-review'));
    fireEvent.click(screen.getByTestId('intake-tab-url'));
    fireEvent.change(screen.getByTestId('skill-url-input'), {
      target: { value: 'https://github.com/owner/repo/blob/main/SKILL.md' },
    });
    fireEvent.click(screen.getByText('app.skillUrlCta'));

    await waitFor(() => {
      expect(resolveSkillUrl).toHaveBeenCalledWith('https://github.com/owner/repo/blob/main/SKILL.md');
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editor' })).toBeEnabled());
    expect(analyzeSkillText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SKILL.md source content' }), { target: { value: '# edited remote skill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze latest source' }));
    await waitFor(() => {
      expect(analyzeSkillText).toHaveBeenCalledWith('# edited remote skill', 'SKILL.md', {
        primaryPath: 'owner/repo/main/SKILL.md',
        contextFiles: [],
      });
    });
  });

  it('shows a clear message when the remote skill URL is unsupported', async () => {
    vi.mocked(resolveSkillUrl).mockRejectedValue({
      code: 'unsupported_url_host',
      detail: 'Supported sources are GitHub blob URLs, raw.githubusercontent.com files, and raw gist URLs.',
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByTestId('intake-task-review'));
    fireEvent.click(screen.getByTestId('intake-tab-url'));
    fireEvent.change(screen.getByTestId('skill-url-input'), {
      target: { value: 'https://example.com/skill.md' },
    });
    fireEvent.click(screen.getByText('app.skillUrlCta'));

    expect(await screen.findByRole('alert')).toHaveTextContent('app.errorSkillUrlUnsupportedHost');
    expect(analyzeSkillText).not.toHaveBeenCalled();
  });

  it('autosaves landing draft input without entering a render loop', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        render(<App />);
      });

      fireEvent.click(screen.getByTestId('intake-task-review'));
      fireEvent.change(screen.getByPlaceholderText('app.placeholder'), {
        target: { value: '# conversation memo\n\n- keep the draft stable' },
      });

      await waitFor(() => {
        expect(screen.getByText('app.analyzeBtn')).toBeInTheDocument();
      });

      expect(screen.getByText('app.analyzeBtn')).toBeInTheDocument();
      expect(
        consoleError.mock.calls.some((call) => call.join(' ').includes('Maximum update depth exceeded')),
      ).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps the landing workspace responsive after selecting a folder bundle', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const withRelativePath = (file: File, relativePath: string) => {
      Object.defineProperty(file, 'webkitRelativePath', {
        configurable: true,
        value: relativePath,
      });
      return file;
    };

    try {
      const { container } = render(<App />);
      fireEvent.click(screen.getByTestId('intake-task-compare'));
      const folderInput = container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement | undefined;

      expect(folderInput).toBeDefined();

      const files = [
        withRelativePath(new File(['# Conversation Memo\n\n## Overview\n- Preserve discussions.\n'], 'SKILL.md', { type: 'text/markdown' }), 'conversation-memo/SKILL.md'),
        withRelativePath(new File(['# Memo Lifecycle\n'], 'memo-lifecycle.md', { type: 'text/markdown' }), 'conversation-memo/references/memo-lifecycle.md'),
        withRelativePath(new File(['# Handoff Schema\n'], 'conversation-memo-handoff-schema.md', { type: 'text/markdown' }), 'conversation-memo/references/conversation-memo-handoff-schema.md'),
        withRelativePath(new File(['# Formalization Patterns\n'], 'formalization-patterns.md', { type: 'text/markdown' }), 'conversation-memo/references/formalization-patterns.md'),
        withRelativePath(new File(['# Obsidian Boundary\n'], 'obsidian-boundary.md', { type: 'text/markdown' }), 'conversation-memo/references/obsidian-boundary.md'),
      ];

      fireEvent.change(folderInput!, {
        target: { files },
      });

      await waitFor(() => {
        expect(screen.getByText('SKILL.md')).toBeInTheDocument();
        expect(screen.getByText('memo-lifecycle.md')).toBeInTheDocument();
        expect(screen.getByText('conversation-memo-handoff-schema.md')).toBeInTheDocument();
        expect(screen.getByText('formalization-patterns.md')).toBeInTheDocument();
        expect(screen.getByText('obsidian-boundary.md')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('bundle-analyze-button')).toBeEnabled();
      });
      expect(
        consoleError.mock.calls.some((call) => call.join(' ').includes('Maximum update depth exceeded')),
      ).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('analyzes source-editor changes for both the primary skill and bundle context', async () => {
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'edited-bundle', projectName: 'Edited bundle', phases: [],
      riskAssessment: { level: 'SAFE', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
    });
    const { container } = render(<App />);
    fireEvent.click(screen.getByTestId('intake-task-compare'));
    const fileInput = container.querySelector('input[accept*=".zip"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [
      new File(['# Original skill'], 'SKILL.md', { type: 'text/markdown' }),
      new File(['# Original policy'], 'policy.md', { type: 'text/markdown' }),
    ] } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Editor' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SKILL.md source content' }), { target: { value: '# Edited skill' } });
    fireEvent.click(screen.getByRole('button', { name: 'policy.md policy.md' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'policy.md source content' }), { target: { value: '# Edited policy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze latest source' }));

    await waitFor(() => expect(analyzeSkillText).toHaveBeenCalledWith('# Edited skill', 'SKILL.md', {
      primaryPath: 'SKILL.md',
      contextFiles: [expect.objectContaining({ path: 'policy.md', text: '# Edited policy', role: 'context' })],
    }));
  });

  it('analyzes pasted text after leaving a pending upload bundle', async () => {
    vi.mocked(analyzeSkillText).mockResolvedValue({
      projectId: 'pasted-after-bundle',
      projectName: 'Pasted after bundle',
      phases: [],
      riskAssessment: { level: 'SAFE', details: '' },
      threeClassification: { category: 'demo', granularity: 'task', operability: 90 },
      parserResult: { decomposition: { actions: [], rules: [], directives: [] } },
      globalMetrics: { decisionConfidence: 90, reworkRate: 10 },
    });

    const { container } = render(<App />);
    fireEvent.click(screen.getByTestId('intake-task-compare'));
    const fileInput = container.querySelector('input[accept*=".zip"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['# Bundle primary'], 'SKILL.md', { type: 'text/markdown' }),
          new File(['# Supporting policy'], 'policy.md', { type: 'text/markdown' }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('bundle-analyze-button')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('intake-task-review'));
    fireEvent.change(screen.getByTestId('skill-text-input'), {
      target: { value: '# Explicit pasted review' },
    });
    fireEvent.click(screen.getByText('app.analyzeBtn'));

    await waitFor(() => {
      expect(analyzeSkillText).toHaveBeenCalledWith('# Explicit pasted review', 'uploaded-skill', {});
    });
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

    fireEvent.click(screen.getByText('app.landingScenariosTab'));
    fireEvent.click(screen.getByText('Bundle intake review'));
    fireEvent.click(await screen.findByRole('button', { name: 'Open bundle sample' }));

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

    fireEvent.click(screen.getByTestId('intake-task-review'));
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
    fireEvent.click(screen.getByTestId('intake-task-compare'));
    const fileInput = container.querySelector('input[accept=".zip,application/zip"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const zipFile = new File(['zip-binary'], 'bundle.zip', { type: 'application/zip' });

    await act(async () => {
      fireEvent.change(fileInput!, {
        target: { files: [zipFile] },
      });
    });

    expect(await screen.findByText('bundle/SKILL.md')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bundle-analyze-button'));

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

  it('offers the last workspace draft for manual restore instead of auto-opening it', async () => {
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

    expect(screen.queryByTestId('review-workspace')).not.toBeInTheDocument();
    expect(analyzeSkillText).not.toHaveBeenCalled();
    expect(await screen.findByTestId('workspace-draft-status')).toHaveTextContent('app.localDraft');
    expect(screen.getByTestId('workspace-draft-status')).toHaveTextContent('1 of 5 drafts saved');

    fireEvent.click(screen.getByTestId('intake-task-draft'));
    expect(await screen.findByTestId('draft-library')).toBeInTheDocument();
    expect(screen.getByText('Restored Skill')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));

    await waitFor(() => {
      expect(screen.getByTestId('review-workspace')).toBeInTheDocument();
    });
  });
});
