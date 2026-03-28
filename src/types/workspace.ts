export type WorkspaceTabId = 'pipeline' | 'vector' | 'matrix';

export type EditorConfig = {
  type: 'global' | 'phase' | 'decision' | 'json';
  payload: any;
  phaseId?: string;
} | null;
