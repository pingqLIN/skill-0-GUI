import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreparedUploadFile, UploadedContextFile } from '../types/intake';

const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';

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

function readWorkspaceDraft(): WorkspaceDraftSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      data: 'data' in parsed ? parsed.data : null,
      originalData: 'originalData' in parsed ? parsed.originalData : null,
      modifiedPaths: Array.isArray(parsed.modifiedPaths) ? parsed.modifiedPaths.filter((item): item is string => typeof item === 'string') : [],
      inputText: typeof parsed.inputText === 'string' ? parsed.inputText : '',
      skillUrlInput: typeof parsed.skillUrlInput === 'string' ? parsed.skillUrlInput : '',
      pendingUploadFiles: Array.isArray(parsed.pendingUploadFiles) ? parsed.pendingUploadFiles : [],
      pendingPrimaryPath: typeof parsed.pendingPrimaryPath === 'string' ? parsed.pendingPrimaryPath : null,
      supportFiles: Array.isArray(parsed.supportFiles) ? parsed.supportFiles : [],
      selectedContextPath: typeof parsed.selectedContextPath === 'string' ? parsed.selectedContextPath : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function writeWorkspaceDraft(snapshot: WorkspaceDraftSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
}

function hasSameWorkspaceDraftContent(left: WorkspaceDraftSnapshot, right: WorkspaceDraftSnapshot) {
  return JSON.stringify({
    data: left.data,
    originalData: left.originalData,
    modifiedPaths: left.modifiedPaths,
    inputText: left.inputText,
    skillUrlInput: left.skillUrlInput,
    pendingUploadFiles: left.pendingUploadFiles,
    pendingPrimaryPath: left.pendingPrimaryPath,
    supportFiles: left.supportFiles,
    selectedContextPath: left.selectedContextPath,
    updatedAt: null,
  }) === JSON.stringify({
    data: right.data,
    originalData: right.originalData,
    modifiedPaths: right.modifiedPaths,
    inputText: right.inputText,
    skillUrlInput: right.skillUrlInput,
    pendingUploadFiles: right.pendingUploadFiles,
    pendingPrimaryPath: right.pendingPrimaryPath,
    supportFiles: right.supportFiles,
    selectedContextPath: right.selectedContextPath,
    updatedAt: null,
  });
}

function clearWorkspaceDraftStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
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
  const [workspaceDraftSavedAt, setWorkspaceDraftSavedAt] = useState<string | null>(null);
  const [workspaceDraftRestored, setWorkspaceDraftRestored] = useState(false);
  const hasHydratedWorkspaceDraftRef = useRef(false);
  const skipNextWorkspaceDraftPersistRef = useRef(false);

  const clearWorkspaceDraftState = useCallback(() => {
    clearWorkspaceDraftStorage();
    setAvailableWorkspaceDraft(null);
    setWorkspaceDraftSavedAt(null);
    setWorkspaceDraftRestored(false);
  }, []);

  const applyWorkspaceDraftSnapshot = useCallback((snapshot: WorkspaceDraftSnapshot, options: { restored?: boolean } = {}) => {
    const { restored = true } = options;
    onApplySnapshot(snapshot);
    setWorkspaceDraftSavedAt(snapshot.updatedAt);
    setWorkspaceDraftRestored(restored);
    setAvailableWorkspaceDraft(snapshot);
    skipNextWorkspaceDraftPersistRef.current = true;
  }, [onApplySnapshot]);

  const restoreAvailableWorkspaceDraft = useCallback(() => {
    if (!availableWorkspaceDraft) {
      return;
    }

    applyWorkspaceDraftSnapshot(availableWorkspaceDraft);
  }, [applyWorkspaceDraftSnapshot, availableWorkspaceDraft]);

  const discardWorkspaceDraft = useCallback(() => {
    clearWorkspaceDraftState();
  }, [clearWorkspaceDraftState]);

  useEffect(() => {
    const snapshot = readWorkspaceDraft();
    if (snapshot) {
      setAvailableWorkspaceDraft(snapshot);
      setWorkspaceDraftSavedAt(snapshot.updatedAt);
      setWorkspaceDraftRestored(false);
      skipNextWorkspaceDraftPersistRef.current = true;
    }

    hasHydratedWorkspaceDraftRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedWorkspaceDraftRef.current) {
      return;
    }

    if (skipNextWorkspaceDraftPersistRef.current) {
      skipNextWorkspaceDraftPersistRef.current = false;
      return;
    }

    const hasDraftState = Boolean(
      data
      || originalData
      || inputText.trim()
      || skillUrlInput.trim()
      || pendingUploadFiles.length > 0
      || supportFiles.length > 0,
    );

    if (!hasDraftState) {
      if (availableWorkspaceDraft) {
        return;
      }

      clearWorkspaceDraftStorage();
      setAvailableWorkspaceDraft(null);
      setWorkspaceDraftSavedAt(null);
      setWorkspaceDraftRestored(false);
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
    const existingSnapshot = readWorkspaceDraft();
    if (existingSnapshot && hasSameWorkspaceDraftContent(existingSnapshot, nextSnapshot)) {
      if (workspaceDraftRestored) {
        return;
      }
    }

    const updatedAt = new Date().toISOString();
    const savedSnapshot = {
      ...nextSnapshot,
      updatedAt,
    };
    writeWorkspaceDraft(savedSnapshot);
    setAvailableWorkspaceDraft(savedSnapshot);
    setWorkspaceDraftSavedAt(updatedAt);
    setWorkspaceDraftRestored(false);
  }, [
    data,
    inputText,
    modifiedPaths,
    originalData,
    pendingPrimaryPath,
    pendingUploadFiles,
    selectedContextPath,
    skillUrlInput,
    supportFiles,
  ]);

  return {
    availableWorkspaceDraft,
    workspaceDraftSavedAt,
    workspaceDraftRestored,
    applyWorkspaceDraftSnapshot,
    restoreAvailableWorkspaceDraft,
    discardWorkspaceDraft,
    clearWorkspaceDraftState,
  };
}
