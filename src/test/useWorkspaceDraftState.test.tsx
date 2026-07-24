import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_WORKSPACE_DRAFTS,
  useWorkspaceDraftState,
} from '../hooks/useWorkspaceDraftState';

const emptyProps = {
  data: null,
  originalData: null,
  modifiedPaths: new Set<string>(),
  skillUrlInput: '',
  pendingUploadFiles: [],
  pendingPrimaryPath: null,
  supportFiles: [],
  selectedContextPath: null,
  onApplySnapshot: vi.fn(),
};

describe('useWorkspaceDraftState', () => {
  it('retains the five most recent independent drafts', async () => {
    const { result, rerender } = renderHook(
      ({ inputText }) => useWorkspaceDraftState({ ...emptyProps, inputText }),
      { initialProps: { inputText: '' } },
    );

    await waitFor(() => {
      expect(result.current.workspaceDraftPersistenceError).toBe('unavailable');
    });

    for (let index = 1; index <= 6; index += 1) {
      rerender({ inputText: `# Draft ${index}` });
      await waitFor(() => {
        expect(result.current.workspaceDrafts[0]?.title).toBe(`Draft ${index}`);
      });
      rerender({ inputText: '' });
      act(() => result.current.clearWorkspaceDraftState());
    }

    expect(result.current.workspaceDrafts).toHaveLength(MAX_WORKSPACE_DRAFTS);
    expect(result.current.workspaceDrafts.map((draft) => draft.title)).toEqual([
      'Draft 6',
      'Draft 5',
      'Draft 4',
      'Draft 3',
      'Draft 2',
    ]);
  });
});
