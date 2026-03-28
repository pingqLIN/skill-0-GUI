import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhaseDetails } from '../components/PhaseDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PhaseDetails', () => {
  it('labels the evidence panel as contextual guidance instead of fake telemetry', () => {
    render(
      <PhaseDetails
        phase={{
          id: 'phase-1',
          name: 'Review Evidence',
          input: ['input-a'],
          tasks: ['task-a'],
          output: ['output-a'],
          decisionNodes: [],
        }}
        allPhases={[
          {
            id: 'phase-1',
            name: 'Review Evidence',
            input: ['input-a'],
            tasks: ['task-a'],
            output: ['output-a'],
            decisionNodes: [],
          },
        ]}
        onNavigatePhase={vi.fn()}
        onClose={vi.fn()}
        onEditPhase={vi.fn()}
        onEditDecision={vi.fn()}
        modifiedPaths={new Set<string>()}
      />,
    );

    fireEvent.click(screen.getByText('phaseDetails.contextTelemetry'));

    const panel = screen.getByTestId('phase-evidence-scope');
    expect(panel).toHaveTextContent('phaseDetails.testResults');
    expect(panel).toHaveTextContent('phaseDetails.status');
    expect(panel).toHaveTextContent('phaseDetails.notCapturedYet');
    expect(panel).toHaveTextContent('phaseDetails.evidenceScopeHint');
    expect(panel).toHaveTextContent('phaseDetails.evidenceReviewHint');
    expect(screen.getByText('phaseDetails.phaseSpecificRefsPending')).toBeInTheDocument();
    expect(screen.queryByText('phaseDetails.latency')).not.toBeInTheDocument();
    expect(screen.queryByText('phaseDetails.memory')).not.toBeInTheDocument();
  });
});
