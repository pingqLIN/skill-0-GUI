import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';
import { analyzeSkillText } from '../services/parserBridgeService';

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
  });

  it('renders the intake workspace shell', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(await screen.findByText('app.title')).toBeInTheDocument();
    expect(await screen.findByText('app.analyzeBtn')).toBeInTheDocument();
    expect(await screen.findByText('GitHub')).toBeInTheDocument();
    expect(await screen.findAllByText('app.bridgeModeCanonical')).not.toHaveLength(0);
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
});
