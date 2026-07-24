import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createBrowserDraftStore,
  createInMemoryDraftStore,
  DRAFT_SCHEMA_VERSION,
  type DraftStore,
  type VersionedDraftEnvelope,
} from '../services/draftRepository';
import type { PreparedUploadFile, UploadedContextFile } from '../types/intake';

export const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';

export type WorkspaceDraftSnapshot = {
  data: any | null;
  originalData: any | null;
  modifiedPaths: string[];
  inputText: string;
  skillUrlInput: string;
  pendingUploadFiles: PreparedUploadFile[];
  pendingPrimaryPath: string | null;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  updatedAt: string | null;
};

type WorkspaceDraftPayload = Omit<WorkspaceDraftSnapshot, 'updatedAt'>;

type WorkspaceDraftStateOptions = {
  data: any | null;
  originalData: any | null;
  modifiedPaths: Set<string>;
  inputText: string;
  skillUrlInput: string;
  pendingUploadFiles: PreparedUploadFile[];
  pendingPrimaryPath: string | null;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  onApplySnapshot: (snapshot: WorkspaceDraftSnapshot) => void;
};

function normalizeWorkspaceDraft(value: unknown): WorkspaceDraftSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Record<string, unknown>;
  return {
    data: 'data' in parsed ? parsed.data : null,
    originalData: 'originalData' in parsed ? parsed.originalData : null,
    modifiedPaths: Array.isArray(parsed.modifiedPaths) ? parsed.modifiedPaths.filter((item): item is string => typeof item === 'string') : [],
    inputText: typeof parsed.inputText === 'string' ? parsed.inputText : '',
    skillUrlInput: typeof parsed.skillUrlInput === 'string' ? parsed.skillUrlInput : '',
    pendingUploadFiles: Array.isArray(parsed.pendingUploadFiles) ? parsed.pendingUploadFiles as PreparedUploadFile[] : [],
    pendingPrimaryPath: typeof parsed.pendingPrimaryPath === 'string' ? parsed.pendingPrimaryPath : null,
    supportFiles: Array.isArray(parsed.supportFiles) ? parsed.supportFiles as UploadedContextFile[] : [],
    selectedContextPath: typeof parsed.selectedContextPath === 'string' ? parsed.selectedContextPath : null,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

function readLegacyWorkspaceDraft(): WorkspaceDraftSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
    return raw ? normalizeWorkspaceDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function removeLegacyWorkspaceDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
  } catch {
    // Explicit discard still clears the IndexedDB draft when localStorage is blocked.
  }
}

function toEnvelope(snapshot: WorkspaceDraftSnapshot): VersionedDraftEnvelope<WorkspaceDraftPayload> {
  const { updatedAt, ...payload } = snapshot;
  return { payload, schemaVersion: DRAFT_SCHEMA_VERSION, updatedAt: updatedAt ?? new Date().toISOString() };
}

function fromEnvelope(envelope: VersionedDraftEnvelope<WorkspaceDraftPayload>): WorkspaceDraftSnapshot | null {
  return envelope.schemaVersion === DRAFT_SCHEMA_VERSION
    ? normalizeWorkspaceDraft({ ...envelope.payload, updatedAt: envelope.updatedAt })
    : null;
}

function hasSameWorkspaceDraftContent(left: WorkspaceDraftSnapshot, right: WorkspaceDraftSnapshot) {
  return JSON.stringify({ ...left, updatedAt: null }) === JSON.stringify({ ...right, updatedAt: null });
}

export function useWorkspaceDraftState({
  data,
  originalData,
  modifiedPaths,
  inputText,
  skillUrlInput,
  pendingUploadFiles,
  pendingPrimaryPath,
  supportFiles,
  selectedContextPath,
  onApplySnapshot,
}: WorkspaceDraftStateOptions) {
  const [availableWorkspaceDraft, setAvailableWorkspaceDraft] = useState<WorkspaceDraftSnapshot | null>(null);
  const [workspaceDraftPersistenceError, setWorkspaceDraftPersistenceError] = useState<string | null>(null);
  const [workspaceDraftSavedAt, setWorkspaceDraftSavedAt] = useState<string | null>(null);
  const [workspaceDraftRestored, setWorkspaceDraftRestored] = useState(false);
  const [workspaceDraftHydrated, setWorkspaceDraftHydrated] = useState(false);
  const hasHydratedWorkspaceDraftRef = useRef(false);
  const skipNextWorkspaceDraftPersistRef = useRef(false);
  const storeRef = useRef<DraftStore<WorkspaceDraftPayload> | null>(null);
  const usingMemoryFallbackRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());

  const enqueueStoreOperation = useCallback((operation: (store: DraftStore<WorkspaceDraftPayload>) => Promise<void>) => {
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const store = storeRef.current;
        if (!store) return;
        try {
          await operation(store);
          if (!usingMemoryFallbackRef.current) {
            setWorkspaceDraftPersistenceError(null);
          }
        } catch {
          // Private mode, quota errors, and blocked databases must not break the active session.
          const memoryStore = createInMemoryDraftStore<WorkspaceDraftPayload>();
          storeRef.current = memoryStore;
          usingMemoryFallbackRef.current = true;
          await operation(memoryStore);
          setWorkspaceDraftPersistenceError('unavailable');
        }
      });
    return writeQueueRef.current;
  }, []);

  const clearWorkspaceDraftState = useCallback(() => {
    void enqueueStoreOperation((store) => store.clear());
    removeLegacyWorkspaceDraft();
    setAvailableWorkspaceDraft(null);
    setWorkspaceDraftSavedAt(null);
    setWorkspaceDraftRestored(false);
  }, [enqueueStoreOperation]);

  const applyWorkspaceDraftSnapshot = useCallback((snapshot: WorkspaceDraftSnapshot, options: { restored?: boolean } = {}) => {
    onApplySnapshot(snapshot);
    setWorkspaceDraftSavedAt(snapshot.updatedAt);
    setWorkspaceDraftRestored(options.restored ?? true);
    setAvailableWorkspaceDraft(snapshot);
    skipNextWorkspaceDraftPersistRef.current = true;
  }, [onApplySnapshot]);

  const restoreAvailableWorkspaceDraft = useCallback(() => {
    if (availableWorkspaceDraft) applyWorkspaceDraftSnapshot(availableWorkspaceDraft);
  }, [applyWorkspaceDraftSnapshot, availableWorkspaceDraft]);

  const discardWorkspaceDraft = useCallback(() => clearWorkspaceDraftState(), [clearWorkspaceDraftState]);

  useEffect(() => {
    let disposed = false;
    const browserStore = createBrowserDraftStore<WorkspaceDraftPayload>();
    storeRef.current = browserStore;

    const hydrate = async () => {
      let snapshot: WorkspaceDraftSnapshot | null = null;
      try {
        const envelope = await browserStore.read();
        snapshot = envelope ? fromEnvelope(envelope) : null;
        if (!snapshot) {
          const legacySnapshot = readLegacyWorkspaceDraft();
          if (legacySnapshot) {
            snapshot = legacySnapshot;
            // Retain legacy data until the user explicitly discards it.
            await browserStore.write(toEnvelope(legacySnapshot));
          }
        }
      } catch {
        const memoryStore = createInMemoryDraftStore<WorkspaceDraftPayload>();
        storeRef.current = memoryStore;
        usingMemoryFallbackRef.current = true;
        snapshot = readLegacyWorkspaceDraft();
        setWorkspaceDraftPersistenceError('unavailable');
        if (snapshot) await memoryStore.write(toEnvelope(snapshot));
      }

      if (disposed) return;
      if (snapshot) {
        setAvailableWorkspaceDraft(snapshot);
        setWorkspaceDraftSavedAt(snapshot.updatedAt);
        setWorkspaceDraftRestored(false);
        skipNextWorkspaceDraftPersistRef.current = true;
      }
      hasHydratedWorkspaceDraftRef.current = true;
      setWorkspaceDraftHydrated(true);
    };

    void hydrate();
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!workspaceDraftHydrated || !hasHydratedWorkspaceDraftRef.current) return;
    if (skipNextWorkspaceDraftPersistRef.current) {
      skipNextWorkspaceDraftPersistRef.current = false;
      return;
    }

    const hasDraftState = Boolean(
      data || originalData || inputText.trim() || skillUrlInput.trim() || pendingUploadFiles.length > 0 || supportFiles.length > 0,
    );
    if (!hasDraftState) {
      if (!availableWorkspaceDraft) {
        void enqueueStoreOperation((store) => store.clear());
        setWorkspaceDraftSavedAt(null);
        setWorkspaceDraftRestored(false);
      }
      return;
    }

    const nextSnapshot: WorkspaceDraftSnapshot = {
      data,
      originalData,
      modifiedPaths: Array.from(modifiedPaths),
      inputText,
      skillUrlInput,
      pendingUploadFiles,
      pendingPrimaryPath,
      supportFiles,
      selectedContextPath,
      updatedAt: workspaceDraftSavedAt,
    };
    if (availableWorkspaceDraft && hasSameWorkspaceDraftContent(availableWorkspaceDraft, nextSnapshot)) return;

    const savedSnapshot = { ...nextSnapshot, updatedAt: new Date().toISOString() };
    void enqueueStoreOperation((store) => store.write(toEnvelope(savedSnapshot))).then(() => {
      setAvailableWorkspaceDraft(savedSnapshot);
      setWorkspaceDraftSavedAt(savedSnapshot.updatedAt);
      setWorkspaceDraftRestored(false);
    });
  }, [
    availableWorkspaceDraft,
    data,
    enqueueStoreOperation,
    inputText,
    modifiedPaths,
    originalData,
    pendingPrimaryPath,
    pendingUploadFiles,
    selectedContextPath,
    skillUrlInput,
    supportFiles,
    workspaceDraftHydrated,
    workspaceDraftSavedAt,
  ]);

  return {
    availableWorkspaceDraft,
    workspaceDraftPersistenceError,
    workspaceDraftSavedAt,
    workspaceDraftRestored,
    applyWorkspaceDraftSnapshot,
    restoreAvailableWorkspaceDraft,
    discardWorkspaceDraft,
    clearWorkspaceDraftState,
  };
}
