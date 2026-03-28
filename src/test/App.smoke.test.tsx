import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
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
  it('renders the intake workspace shell', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(await screen.findByText('app.title')).toBeInTheDocument();
    expect(await screen.findByText('app.analyzeBtn')).toBeInTheDocument();
    expect(await screen.findByText('GitHub')).toBeInTheDocument();
    expect(await screen.findAllByText('app.bridgeModeCanonical')).not.toHaveLength(0);
  });
});
