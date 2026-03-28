export type WorkspaceTabId = 'pipeline' | 'vector' | 'matrix';

export type EditorConfig = {
  type: 'global' | 'phase' | 'decision' | 'json' | 'skillDocument';
  payload: any;
  phaseId?: string;
  focusPath?: string;
} | null;
