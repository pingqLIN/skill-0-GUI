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
export const MAX_WORKSPACE_DRAFTS = 5;

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

export type WorkspaceDraftEntry = WorkspaceDraftSnapshot & {
  id: string;
  title: string;
};

type WorkspaceDraftCollectionPayload = {
  activeDraftId: string | null;
  drafts: WorkspaceDraftEntry[];
};

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

function deriveDraftTitle(snapshot: WorkspaceDraftSnapshot, fallbackIndex = 1) {
  const data = snapshot.data && typeof snapshot.data === 'object' ? snapshot.data as Record<string, unknown> : null;
  const dataTitle = data && ['projectName', 'title', 'name', 'projectId']
    .map((key) => data[key])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (dataTitle) return dataTitle.trim().slice(0, 80);

  const heading = snapshot.inputText.match(/^\s*#{1,3}\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 80);

  const primaryName = snapshot.pendingPrimaryPath?.split(/[\\/]/).pop();
  if (primaryName) return primaryName.slice(0, 80);

  if (snapshot.skillUrlInput.trim()) {
    try {
      return new URL(snapshot.skillUrlInput).pathname.split('/').filter(Boolean).pop()?.slice(0, 80) || `Draft ${fallbackIndex}`;
    } catch {
      return snapshot.skillUrlInput.trim().slice(0, 80);
    }
  }

  return `Draft ${fallbackIndex}`;
}

function normalizeDraftEntry(value: unknown, index: number): WorkspaceDraftEntry | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Record<string, unknown>;
  const snapshot = normalizeWorkspaceDraft(parsed);
  if (!snapshot) return null;
  return {
    ...snapshot,
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `draft-${index + 1}`,
    title: typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 80)
      : deriveDraftTitle(snapshot, index + 1),
  };
}

function normalizeDraftCollection(value: unknown): WorkspaceDraftCollectionPayload | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Record<string, unknown>;
  if (!Array.isArray(parsed.drafts)) return null;
  const drafts = parsed.drafts
    .map((draft, index) => normalizeDraftEntry(draft, index))
    .filter((draft): draft is WorkspaceDraftEntry => Boolean(draft))
    .sort((left, right) => Date.parse(right.updatedAt || '') - Date.parse(left.updatedAt || ''))
    .slice(0, MAX_WORKSPACE_DRAFTS);
  return {
    activeDraftId: typeof parsed.activeDraftId === 'string' && drafts.some((draft) => draft.id === parsed.activeDraftId)
      ? parsed.activeDraftId
      : null,
    drafts,
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
    // IndexedDB remains the source of truth when localStorage is blocked.
  }
}

function createDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toEnvelope(collection: WorkspaceDraftCollectionPayload): VersionedDraftEnvelope<WorkspaceDraftCollectionPayload> {
  return {
    payload: collection,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    updatedAt: collection.drafts[0]?.updatedAt ?? new Date().toISOString(),
  };
}

function fromEnvelope(envelope: VersionedDraftEnvelope<unknown>): WorkspaceDraftCollectionPayload | null {
  if (envelope.schemaVersion === DRAFT_SCHEMA_VERSION) {
    return normalizeDraftCollection(envelope.payload);
  }

  const legacySnapshot = normalizeWorkspaceDraft({
    ...(envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : {}),
    updatedAt: envelope.updatedAt,
  });
  if (!legacySnapshot) return null;
  return {
    activeDraftId: null,
    drafts: [{
      ...legacySnapshot,
      id: 'legacy-workspace-draft',
      title: deriveDraftTitle(legacySnapshot),
    }],
  };
}

function hasSameWorkspaceDraftContent(left: WorkspaceDraftSnapshot, right: WorkspaceDraftSnapshot) {
  const content = (snapshot: WorkspaceDraftSnapshot) => ({
    data: snapshot.data,
    originalData: snapshot.originalData,
    modifiedPaths: snapshot.modifiedPaths,
    inputText: snapshot.inputText,
    skillUrlInput: snapshot.skillUrlInput,
    pendingUploadFiles: snapshot.pendingUploadFiles,
    pendingPrimaryPath: snapshot.pendingPrimaryPath,
    supportFiles: snapshot.supportFiles,
    selectedContextPath: snapshot.selectedContextPath,
  });
  return JSON.stringify(content(left)) === JSON.stringify(content(right));
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
  const [workspaceDrafts, setWorkspaceDrafts] = useState<WorkspaceDraftEntry[]>([]);
  const [activeWorkspaceDraftId, setActiveWorkspaceDraftId] = useState<string | null>(null);
  const [workspaceDraftPersistenceError, setWorkspaceDraftPersistenceError] = useState<string | null>(null);
  const [workspaceDraftSavedAt, setWorkspaceDraftSavedAt] = useState<string | null>(null);
  const [workspaceDraftRestored, setWorkspaceDraftRestored] = useState(false);
  const [workspaceDraftHydrated, setWorkspaceDraftHydrated] = useState(false);
  const hasHydratedWorkspaceDraftRef = useRef(false);
  const skipNextWorkspaceDraftPersistRef = useRef(false);
  const storeRef = useRef<DraftStore<unknown> | null>(null);
  const usingMemoryFallbackRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());
  const draftsRef = useRef<WorkspaceDraftEntry[]>([]);
  const activeDraftIdRef = useRef<string | null>(null);

  const enqueueStoreOperation = useCallback((operation: (store: DraftStore<unknown>) => Promise<void>) => {
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const store = storeRef.current;
        if (!store) return;
        try {
          await operation(store);
          if (!usingMemoryFallbackRef.current) setWorkspaceDraftPersistenceError(null);
        } catch {
          const memoryStore = createInMemoryDraftStore<unknown>();
          storeRef.current = memoryStore;
          usingMemoryFallbackRef.current = true;
          await operation(memoryStore);
          setWorkspaceDraftPersistenceError('unavailable');
        }
      });
    return writeQueueRef.current;
  }, []);

  const persistDraftCollection = useCallback((drafts: WorkspaceDraftEntry[], activeDraftId: string | null) => {
    const normalizedActiveId = activeDraftId && drafts.some((draft) => draft.id === activeDraftId)
      ? activeDraftId
      : null;
    draftsRef.current = drafts;
    activeDraftIdRef.current = normalizedActiveId;
    setWorkspaceDrafts(drafts);
    setActiveWorkspaceDraftId(normalizedActiveId);
    void enqueueStoreOperation((store) => store.write(toEnvelope({
      activeDraftId: normalizedActiveId,
      drafts,
    })));
  }, [enqueueStoreOperation]);

  const clearWorkspaceDraftState = useCallback(() => {
    activeDraftIdRef.current = null;
    setActiveWorkspaceDraftId(null);
    setWorkspaceDraftSavedAt(null);
    setWorkspaceDraftRestored(false);
  }, []);

  const applyWorkspaceDraftSnapshot = useCallback((snapshot: WorkspaceDraftSnapshot, options: { restored?: boolean } = {}) => {
    onApplySnapshot(snapshot);
    setWorkspaceDraftSavedAt(snapshot.updatedAt);
    setWorkspaceDraftRestored(options.restored ?? true);
    skipNextWorkspaceDraftPersistRef.current = true;
  }, [onApplySnapshot]);

  const restoreWorkspaceDraft = useCallback((draftId: string) => {
    const draft = draftsRef.current.find((candidate) => candidate.id === draftId);
    if (!draft) return;
    activeDraftIdRef.current = draft.id;
    setActiveWorkspaceDraftId(draft.id);
    applyWorkspaceDraftSnapshot(draft);
  }, [applyWorkspaceDraftSnapshot]);

  const restoreAvailableWorkspaceDraft = useCallback((draftId?: string) => {
    const targetId = draftId ?? draftsRef.current[0]?.id;
    if (targetId) restoreWorkspaceDraft(targetId);
  }, [restoreWorkspaceDraft]);

  const deleteWorkspaceDraft = useCallback((draftId: string) => {
    const wasActiveDraft = activeDraftIdRef.current === draftId;
    const nextDrafts = draftsRef.current.filter((draft) => draft.id !== draftId);
    const nextActiveId = wasActiveDraft ? null : activeDraftIdRef.current;
    persistDraftCollection(nextDrafts, nextActiveId);
    if (wasActiveDraft) {
      skipNextWorkspaceDraftPersistRef.current = true;
      onApplySnapshot({
        data: null,
        originalData: null,
        modifiedPaths: [],
        inputText: '',
        skillUrlInput: '',
        pendingUploadFiles: [],
        pendingPrimaryPath: null,
        supportFiles: [],
        selectedContextPath: null,
        updatedAt: null,
      });
      setWorkspaceDraftSavedAt(null);
      setWorkspaceDraftRestored(false);
    }
  }, [onApplySnapshot, persistDraftCollection]);

  const discardWorkspaceDraft = useCallback((draftId?: string) => {
    const targetId = draftId ?? activeDraftIdRef.current ?? draftsRef.current[0]?.id;
    if (targetId) deleteWorkspaceDraft(targetId);
  }, [deleteWorkspaceDraft]);

  useEffect(() => {
    let disposed = false;
    const browserStore = createBrowserDraftStore<unknown>();
    storeRef.current = browserStore;

    const hydrate = async () => {
      let collection: WorkspaceDraftCollectionPayload | null = null;
      try {
        const envelope = await browserStore.read();
        collection = envelope ? fromEnvelope(envelope) : null;
        if (!collection) {
          const legacySnapshot = readLegacyWorkspaceDraft();
          if (legacySnapshot) {
            const legacyEntry: WorkspaceDraftEntry = {
              ...legacySnapshot,
              id: 'legacy-workspace-draft',
              title: deriveDraftTitle(legacySnapshot),
            };
            collection = { activeDraftId: null, drafts: [legacyEntry] };
            await browserStore.write(toEnvelope(collection));
          }
        }
      } catch {
        const memoryStore = createInMemoryDraftStore<unknown>();
        storeRef.current = memoryStore;
        usingMemoryFallbackRef.current = true;
        const legacySnapshot = readLegacyWorkspaceDraft();
        if (legacySnapshot) {
          const legacyEntry: WorkspaceDraftEntry = {
            ...legacySnapshot,
            id: 'legacy-workspace-draft',
            title: deriveDraftTitle(legacySnapshot),
          };
          collection = { activeDraftId: null, drafts: [legacyEntry] };
          await memoryStore.write(toEnvelope(collection));
        }
        setWorkspaceDraftPersistenceError('unavailable');
      }

      if (disposed) return;
      const drafts = collection?.drafts ?? [];
      draftsRef.current = drafts;
      activeDraftIdRef.current = null;
      setWorkspaceDrafts(drafts);
      setActiveWorkspaceDraftId(null);
      setWorkspaceDraftSavedAt(drafts[0]?.updatedAt ?? null);
      setWorkspaceDraftRestored(false);
      hasHydratedWorkspaceDraftRef.current = true;
      setWorkspaceDraftHydrated(true);
      removeLegacyWorkspaceDraft();
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
    if (!hasDraftState) return;

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
    const activeDraft = activeDraftIdRef.current
      ? draftsRef.current.find((draft) => draft.id === activeDraftIdRef.current) ?? null
      : null;
    if (activeDraft && hasSameWorkspaceDraftContent(activeDraft, nextSnapshot)) return;

    const savedAt = new Date().toISOString();
    const draftId = activeDraft?.id ?? createDraftId();
    const savedEntry: WorkspaceDraftEntry = {
      ...nextSnapshot,
      id: draftId,
      title: deriveDraftTitle(nextSnapshot, draftsRef.current.length + 1),
      updatedAt: savedAt,
    };
    const nextDrafts = [
      savedEntry,
      ...draftsRef.current.filter((draft) => draft.id !== draftId),
    ].slice(0, MAX_WORKSPACE_DRAFTS);
    persistDraftCollection(nextDrafts, draftId);
    setWorkspaceDraftSavedAt(savedAt);
    setWorkspaceDraftRestored(false);
  }, [
    data,
    inputText,
    modifiedPaths,
    originalData,
    pendingPrimaryPath,
    pendingUploadFiles,
    persistDraftCollection,
    selectedContextPath,
    skillUrlInput,
    supportFiles,
    workspaceDraftHydrated,
    workspaceDraftSavedAt,
  ]);

  return {
    activeWorkspaceDraftId,
    availableWorkspaceDraft: workspaceDrafts[0] ?? null,
    workspaceDrafts,
    workspaceDraftPersistenceError,
    workspaceDraftSavedAt,
    workspaceDraftRestored,
    applyWorkspaceDraftSnapshot,
    restoreWorkspaceDraft,
    restoreAvailableWorkspaceDraft,
    deleteWorkspaceDraft,
    discardWorkspaceDraft,
    clearWorkspaceDraftState,
  };
}
