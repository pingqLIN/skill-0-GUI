import { render, screen } from '@testing-library/react';
import { IntakeReviewRail } from '../components/IntakeReviewRail';

describe('IntakeReviewRail', () => {
  it('keeps an untouched intake truthful instead of inventing review metadata', () => {
    render(<IntakeReviewRail />);

    expect(screen.getByText('尚未選擇')).toBeInTheDocument();
    expect(screen.queryByText('Session')).not.toBeInTheDocument();
    expect(screen.getByText('已完成 0 / 5 項檢查')).toBeInTheDocument();
    expect(screen.getByText('尚未儲存本機草稿')).toBeInTheDocument();
    expect(screen.getByText('尚未有審查活動')).toBeInTheDocument();
    expect(screen.getByText('等待審查完成')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('derives readiness, export state, and activity details from supplied state only', () => {
    render(
      <IntakeReviewRail
        mode="Parser"
        sessionId="session-verified-7"
        readiness={{
          inputReady: true,
          analysisComplete: true,
          schemaLoaded: true,
          contentValidated: true,
          reviewApproved: true,
        }}
        draft={{ savedAt: '2026-07-24 10:15' }}
        activities={[{
          id: 'parse-complete',
          label: 'Parser completed',
          detail: 'The supplied document was analyzed.',
          timestamp: '2026-07-24 10:14',
          status: 'complete',
        }]}
      />,
    );

    expect(screen.getByText('Parser')).toBeInTheDocument();
    expect(screen.getByText('session-verified-7')).toBeInTheDocument();
    expect(screen.getByText('已完成 5 / 5 項檢查')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
    expect(screen.getByText('本機草稿已儲存')).toBeInTheDocument();
    expect(screen.getByText('2026-07-24 10:15')).toBeInTheDocument();
    expect(screen.getByText('Parser completed')).toBeInTheDocument();
    expect(screen.getByText('可匯出')).toBeInTheDocument();
  });

  it('honors an explicit export block without claiming approval', () => {
    render(
      <IntakeReviewRail
        readiness={{ contentValidated: true, reviewApproved: true }}
        exportState={{ ready: false, reason: 'A signed review packet is still required.' }}
      />,
    );

    expect(screen.getByText('尚不可匯出')).toBeInTheDocument();
    expect(screen.getByText('A signed review packet is still required.')).toBeInTheDocument();
  });
});
