import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VectorSpace3D } from '../components/VectorSpace3D';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('react-force-graph-3d', async () => {
  await new Promise((resolve) => setTimeout(resolve, 25));

  return {
    default: () => <div data-testid="force-graph-3d">3D graph</div>,
  };
});

const sampleData = {
  projectName: 'Demo Skill',
  phases: [
    {
      id: 'A',
      name: 'Intake',
      tasks: ['Collect input'],
      output: ['source_context'],
    },
  ],
};

describe('VectorSpace3D', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading fallback before the force graph module resolves', async () => {
    render(<VectorSpace3D data={sampleData} darkMode={false} />);

    expect(screen.getByText('app.loadingWorkspaceModule')).toBeInTheDocument();
    expect(await screen.findByTestId('force-graph-3d')).toBeInTheDocument();
  });
});
