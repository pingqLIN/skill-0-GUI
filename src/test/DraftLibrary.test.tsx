import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftLibrary } from '../components/DraftLibrary';
import type { WorkspaceDraftEntry } from '../hooks/useWorkspaceDraftState';

function createDraft(id: string, title: string): WorkspaceDraftEntry {
  return {
    id,
    title,
    data: null,
    originalData: null,
    modifiedPaths: [],
    inputText: `# ${title}`,
    skillUrlInput: '',
    pendingUploadFiles: [],
    pendingPrimaryPath: null,
    supportFiles: [],
    selectedContextPath: null,
    updatedAt: '2026-07-24T07:00:00.000Z',
  };
}

describe('DraftLibrary', () => {
  it('selects a draft and exposes edit, export, and confirmed delete actions', () => {
    const onEditDraft = vi.fn();
    const onExportDraft = vi.fn();
    const onDeleteDraft = vi.fn();
    render(
      <DraftLibrary
        drafts={[createDraft('draft-2', 'Second draft'), createDraft('draft-1', 'First draft')]}
        activeDraftId={null}
        language="en"
        onEditDraft={onEditDraft}
        onExportDraft={onExportDraft}
        onDeleteDraft={onDeleteDraft}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /First draft/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export draft' }));
    expect(onEditDraft).toHaveBeenCalledWith('draft-1');
    expect(onExportDraft).toHaveBeenCalledWith('draft-1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    expect(screen.getByText('Delete “First draft”?')).toBeInTheDocument();
    expect(onDeleteDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(onDeleteDraft).toHaveBeenCalledWith('draft-1');
  });

  it('supports arrow-key selection in its radio group', () => {
    render(
      <DraftLibrary
        drafts={[createDraft('draft-2', 'Second draft'), createDraft('draft-1', 'First draft')]}
        activeDraftId={null}
        language="en"
        onEditDraft={vi.fn()}
        onExportDraft={vi.fn()}
        onDeleteDraft={vi.fn()}
      />,
    );

    const second = screen.getByRole('radio', { name: /Second draft/i });
    const first = screen.getByRole('radio', { name: /First draft/i });
    second.focus();
    fireEvent.keyDown(second, { key: 'ArrowDown' });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute('aria-checked', 'true');
  });
});
