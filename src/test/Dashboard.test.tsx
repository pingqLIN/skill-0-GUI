import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../components/Dashboard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Dashboard', () => {
  it('renders an incomplete snapshot state without crashing', () => {
    render(<Dashboard data={{ parserResult: {} }} onNavigatePhase={vi.fn()} />);

    expect(screen.getByTestId('dashboard-incomplete-state')).toHaveTextContent('dashboard.incompleteSnapshot');
    expect(screen.getByTestId('dashboard-risk-phase-action')).toBeDisabled();
    expect(screen.getByTestId('dashboard-class-phase-action')).toBeDisabled();
  });

  it('does not navigate when degraded snapshot phase actions are unavailable', () => {
    const navigateSpy = vi.fn();

    render(<Dashboard data={{ parserResult: {} }} onNavigatePhase={navigateSpy} />);

    fireEvent.click(screen.getByTestId('dashboard-risk-phase-action'));
    fireEvent.click(screen.getByTestId('dashboard-class-phase-action'));

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
