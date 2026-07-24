import type { PreparedUploadFile, UploadedContextFile } from '../types/intake';

export type AnalysisSessionState = {
  analysisSessionId: number;
  data: any | null;
  error: string | null;
  inputText: string;
  isExtracting: boolean;
  modifiedPaths: Set<string>;
  originalData: any | null;
  pendingPrimaryPath: string | null;
  pendingUploadFiles: PreparedUploadFile[];
  selectedContextPath: string | null;
  skillUrlInput: string;
  supportFiles: UploadedContextFile[];
};

export const initialAnalysisSessionState: AnalysisSessionState = {
  analysisSessionId: 0,
  data: null,
  error: null,
  inputText: '',
  isExtracting: false,
  modifiedPaths: new Set(),
  originalData: null,
  pendingPrimaryPath: null,
  pendingUploadFiles: [],
  selectedContextPath: null,
  skillUrlInput: '',
  supportFiles: [],
};

export type AnalysisSessionAction =
  | { type: 'analysis-start' }
  | { type: 'analysis-succeeded'; data: any }
  | { type: 'analysis-failed'; error: string }
  | { type: 'apply-draft'; snapshot: Omit<AnalysisSessionState, 'analysisSessionId' | 'error' | 'isExtracting'> }
  | { type: 'reset' }
  | { type: 'set-data'; data: any | null }
  | { type: 'set-error'; error: string | null }
  | { type: 'set-input-text'; inputText: string }
  | { type: 'set-modified-paths'; modifiedPaths: Set<string> }
  | { type: 'set-original-data'; originalData: any | null }
  | { type: 'set-pending-primary-path'; pendingPrimaryPath: string | null }
  | { type: 'set-pending-upload-files'; pendingUploadFiles: PreparedUploadFile[] }
  | { type: 'set-selected-context-path'; selectedContextPath: string | null }
  | { type: 'set-skill-url-input'; skillUrlInput: string }
  | { type: 'set-support-files'; supportFiles: UploadedContextFile[] };

function cloneAnalysisData(data: any) {
  return JSON.parse(JSON.stringify(data));
}

export function analysisSessionReducer(state: AnalysisSessionState, action: AnalysisSessionAction): AnalysisSessionState {
  switch (action.type) {
    case 'analysis-start':
      return { ...state, error: null, isExtracting: true };
    case 'analysis-succeeded':
      return {
        ...state,
        analysisSessionId: state.analysisSessionId + 1,
        data: action.data,
        error: null,
        isExtracting: false,
        modifiedPaths: new Set(),
        originalData: cloneAnalysisData(action.data),
        pendingPrimaryPath: null,
        pendingUploadFiles: [],
      };
    case 'analysis-failed':
      return { ...state, error: action.error, isExtracting: false };
    case 'apply-draft':
      return {
        ...state,
        ...action.snapshot,
        error: null,
        isExtracting: false,
        modifiedPaths: new Set(action.snapshot.modifiedPaths),
      };
    case 'reset':
      return initialAnalysisSessionState;
    case 'set-data': return { ...state, data: action.data };
    case 'set-error': return { ...state, error: action.error };
    case 'set-input-text': return { ...state, inputText: action.inputText };
    case 'set-modified-paths': return { ...state, modifiedPaths: action.modifiedPaths };
    case 'set-original-data': return { ...state, originalData: action.originalData };
    case 'set-pending-primary-path': return { ...state, pendingPrimaryPath: action.pendingPrimaryPath };
    case 'set-pending-upload-files': return { ...state, pendingUploadFiles: action.pendingUploadFiles };
    case 'set-selected-context-path': return { ...state, selectedContextPath: action.selectedContextPath };
    case 'set-skill-url-input': return { ...state, skillUrlInput: action.skillUrlInput };
    case 'set-support-files': return { ...state, supportFiles: action.supportFiles };
    default: return state;
  }
}
