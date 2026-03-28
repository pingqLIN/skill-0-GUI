export type WorkspaceTabId = 'pipeline' | 'vector' | 'matrix';

export type EditorConfig = {
  type: 'global' | 'phase' | 'decision';
  payload: any;
  phaseId?: string;
} | null;
