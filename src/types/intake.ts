export type UploadedContextFile = {
  name: string;
  path: string;
  type: string;
  size: number;
  role: 'primary' | 'context';
  source: 'upload' | 'zip' | 'url';
  preview?: string;
  text?: string;
};

export type PreparedUploadFile = UploadedContextFile & {
  text?: string;
  isPrimaryCandidate: boolean;
};
