import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { VectorSpace } from '../components/VectorSpace';

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
      actions: [{ id: 'a1' }, { id: 'a2' }],
      rules: [{ id: 'r1' }],
      directives: [{ id: 'd1' }],
    },
  },
  phases: [
    {
      id: 'A',
      name: 'Intake',
      tasks: ['Collect input', 'Validate input'],
      output: ['source_context'],
    },
    {
      id: 'B',
      name: 'Transform',
      tasks: ['Parse', 'Normalize', 'Enrich'],
      output: ['structured_output'],
    },
  ],
};

describe('VectorSpace', () => {
  it('defaults to the lightweight review map', () => {
    render(<VectorSpace data={sampleData} darkMode={false} />);

    expect(screen.getByText('vector.semanticMapDesc')).toBeInTheDocument();
    expect(screen.queryByTestId('vector-space-3d')).not.toBeInTheDocument();
  });

  it('loads the 3D workspace only after toggling modes', async () => {
    render(<VectorSpace data={sampleData} darkMode={false} />);

    fireEvent.click(screen.getByRole('button', { name: /vector\.interactive3dMode/i }));

    expect(await screen.findByTestId('vector-space-3d')).toBeInTheDocument();
  });
});
