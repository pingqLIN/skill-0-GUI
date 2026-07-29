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
  const phase = {
    id: 'phase-1',
    name: 'Review Evidence',
    input: ['input-a'],
    tasks: ['task-a'],
    output: ['output-a'],
    decisionNodes: [],
  };

  it('states the evidence boundary instead of presenting unavailable telemetry as a metric', () => {
    render(
      <PhaseDetails
        phase={phase}
        allPhases={[phase]}
        onNavigatePhase={vi.fn()}
        onClose={vi.fn()}
        onEditPhase={vi.fn()}
        onEditDecision={vi.fn()}
        modifiedPaths={new Set<string>()}
      />,
    );

    const evidenceToggle = screen.getByRole('button', { name: 'phaseDetails.evidenceBoundary' });
    expect(evidenceToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(evidenceToggle);
    expect(evidenceToggle).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByTestId('phase-evidence-boundary');
    expect(panel).toHaveTextContent('phaseDetails.evidenceNotCapturedTitle');
    expect(panel).toHaveTextContent('phaseDetails.evidenceNotCapturedBody');
    expect(panel).toHaveTextContent('phaseDetails.evidenceReviewHint');
    expect(screen.queryByText('phaseDetails.latency')).not.toBeInTheDocument();
    expect(screen.queryByText('phaseDetails.memory')).not.toBeInTheDocument();
  });

  it('shows actual workspace checks without attributing them to the selected phase', () => {
    const onOpenChecks = vi.fn();
    const onOpenSupportingFiles = vi.fn();
    render(
      <PhaseDetails
        phase={phase}
        allPhases={[phase]}
        onNavigatePhase={vi.fn()}
        onClose={vi.fn()}
        onEditPhase={vi.fn()}
        onEditDecision={vi.fn()}
        evidence={{
          bridgeMode: 'standalone',
          parserFindingCount: 2,
          supportingFileCount: 3,
          latestValidationRun: { id: 'validation-1', startedAt: '2026-07-24T08:00:00.000Z', status: 'passed', errors: [] },
          latestConsistencyRun: { id: 'consistency-1', startedAt: '2026-07-24T08:00:00.000Z', status: 'failed', issues: [] },
          latestPathTestRun: null,
        }}
        onOpenChecks={onOpenChecks}
        onOpenSupportingFiles={onOpenSupportingFiles}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'phaseDetails.evidenceBoundary' }));
    const panel = screen.getByTestId('phase-workspace-evidence');
    expect(panel).toHaveTextContent('phaseDetails.workspaceEvidenceScope');
    expect(panel).toHaveTextContent('phaseDetails.schemaValidation');
    expect(panel).toHaveTextContent('phaseDetails.runStatus.passed');
    expect(panel).toHaveTextContent('phaseDetails.consistencyCheck');
    expect(panel).toHaveTextContent('phaseDetails.runStatus.failed');
    expect(screen.getByText('phaseDetails.parserFindings')).toBeInTheDocument();
    expect(screen.getByText('phaseDetails.supportingFiles')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'phaseDetails.openWorkspaceChecks' }));
    fireEvent.click(screen.getByRole('button', { name: 'phaseDetails.openSupportingFiles' }));
    expect(onOpenChecks).toHaveBeenCalledOnce();
    expect(onOpenSupportingFiles).toHaveBeenCalledOnce();
  });
});
