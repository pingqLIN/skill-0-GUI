import { describe, expect, it } from 'vitest';
import {
  createInMemoryDraftStore,
  DRAFT_SCHEMA_VERSION,
  type VersionedDraftEnvelope,
} from '../services/draftRepository';
import { analysisSessionReducer, initialAnalysisSessionState } from '../state/analysisSession';

describe('draftRepository', () => {
  it('stores, replaces, and clears a versioned draft envelope', async () => {
    const store = createInMemoryDraftStore<{ value: string }>();
    const envelope: VersionedDraftEnvelope<{ value: string }> = {
      payload: { value: 'draft one' },
      schemaVersion: DRAFT_SCHEMA_VERSION,
      updatedAt: '2026-07-24T00:00:00.000Z',
    };

    await store.write(envelope);
    expect(await store.read()).toEqual(envelope);

    await store.clear();
    expect(await store.read()).toBeNull();
  });
});

describe('analysisSessionReducer', () => {
  it('keeps the last successful result and intake context when analysis fails', () => {
    const succeeded = analysisSessionReducer(initialAnalysisSessionState, {
      type: 'analysis-succeeded',
      data: { projectId: 'previous-success' },
    });
    const withContext = analysisSessionReducer(succeeded, {
      type: 'set-pending-upload-files',
      pendingUploadFiles: [{
        isPrimaryCandidate: true,
        name: 'SKILL.md',
        path: 'SKILL.md',
        role: 'primary',
        size: 1,
        source: 'upload',
        type: 'text/markdown',
      }],
    });
    const failed = analysisSessionReducer(withContext, { type: 'analysis-failed', error: 'Network unavailable' });

    expect(failed.data).toEqual({ projectId: 'previous-success' });
    expect(failed.originalData).toEqual({ projectId: 'previous-success' });
    expect(failed.pendingUploadFiles).toHaveLength(1);
    expect(failed.error).toBe('Network unavailable');
    expect(failed.isExtracting).toBe(false);
  });
});
