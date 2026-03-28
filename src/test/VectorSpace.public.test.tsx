import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('../components/VectorSpace3D', () => ({
  VectorSpace3D: () => <div data-testid="vector-space-3d">3D view</div>,
}));

const sampleData = {
  projectName: 'Demo Skill',
  threeClassification: {
    category: 'transform',
    granularity: 'Composite',
    operability: 81,
  },
  parserResult: {
    decomposition: {
      actions: [{ id: 'a1' }],
      rules: [{ id: 'r1' }],
      directives: [{ id: 'd1' }],
    },
  },
  phases: [
    {
      id: 'A',
      name: 'Intake',
      tasks: ['Collect input'],
      output: ['source_context'],
    },
  ],
};

describe('VectorSpace public mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('removes the interactive 3D entry when the deployment disables it', async () => {
    vi.stubEnv('VITE_ENABLE_3D', 'false');

    const { VectorSpace } = await import('../components/VectorSpace');

    render(<VectorSpace data={sampleData} darkMode={false} />);

    expect(screen.getByText('vector.interactive3dDisabled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vector\.interactive3dMode/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('vector-space-3d')).not.toBeInTheDocument();
  });
});
