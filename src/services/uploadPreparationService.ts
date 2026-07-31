import { parseSkillDocumentJson } from './skillDocumentAdapter';
import type { PreparedUploadFile } from '../types/intake';

const PRIMARY_SKILL_EXTENSIONS = ['.md', '.skill', '.txt'];
const CONTEXT_PREVIEW_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.csv', '.tsv', '.log'];

export const ZIP_INTAKE_LIMITS = {
  maxCompressedBytes: 10 * 1024 * 1024,
  maxEntries: 256,
  maxEntryUncompressedBytes: 2 * 1024 * 1024,
  maxTotalUncompressedBytes: 8 * 1024 * 1024,
} as const;

export type UploadPreparationErrorCode =
  | 'zip_input_too_large'
  | 'zip_entry_limit_exceeded'
  | 'zip_entry_too_large'
  | 'zip_total_size_exceeded'
  | 'zip_invalid';

export class UploadPreparationError extends Error {
  constructor(public readonly code: UploadPreparationErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'UploadPreparationError';
  }
}

type ZipEntryWithSizeMetadata = {
  _data?: {
    uncompressedSize?: unknown;
  };
};

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function getUploadPath(file: File) {
  return file.webkitRelativePath || file.name;
}

function isPrimarySkillFile(file: File) {
  const target = getUploadPath(file).toLowerCase();
  const extension = getExtension(target);
  return PRIMARY_SKILL_EXTENSIONS.includes(extension) || target.endsWith('skill.md');
}

function isPrimarySkillPath(path: string) {
  const lower = path.toLowerCase();
  const extension = getExtension(lower);
  return PRIMARY_SKILL_EXTENSIONS.includes(extension) || lower.endsWith('skill.md');
}

function canPreviewAsText(file: File) {
  const extension = getExtension(file.name);
  return isPrimarySkillFile(file) || CONTEXT_PREVIEW_EXTENSIONS.includes(extension) || file.type.startsWith('text/');
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

async function prepareUploadFile(file: File): Promise<PreparedUploadFile> {
  const path = getUploadPath(file);
  const prepared: PreparedUploadFile = {
    name: file.name,
    path,
    type: file.type || getExtension(file.name) || 'unknown',
    size: file.size,
    role: 'context',
    source: 'upload',
    isPrimaryCandidate: false,
  };

  if (canPreviewAsText(file)) {
    try {
      prepared.text = await readFileAsText(file);
      prepared.preview = prepared.text.slice(0, 280);
      const isSkillDocumentImport = Boolean(parseSkillDocumentJson(prepared.text));
      prepared.isPrimaryCandidate = isPrimarySkillFile(file) || isSkillDocumentImport;
      prepared.role = prepared.isPrimaryCandidate ? 'primary' : 'context';
    } catch {
      prepared.text = undefined;
    }
  } else {
    prepared.isPrimaryCandidate = isPrimarySkillFile(file);
    prepared.role = prepared.isPrimaryCandidate ? 'primary' : 'context';
  }

  return prepared;
}

async function expandZipUpload(file: File): Promise<PreparedUploadFile[]> {
  if (file.size > ZIP_INTAKE_LIMITS.maxCompressedBytes) {
    throw new UploadPreparationError('zip_input_too_large');
  }

  const { default: JSZip } = await import('jszip');
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    throw new UploadPreparationError('zip_invalid', { cause: error });
  }

  const prepared: PreparedUploadFile[] = [];
  const fileEntries = Object.values(zip.files).filter((entry) => !entry.dir);

  if (fileEntries.length > ZIP_INTAKE_LIMITS.maxEntries) {
    throw new UploadPreparationError('zip_entry_limit_exceeded');
  }

  let declaredTotalBytes = 0;
  for (const entry of fileEntries) {
    // JSZip exposes the central-directory size on loaded entries but keeps it out of
    // the public type. Check it before inflation, then verify actual text bytes below.
    const declaredSize = (entry as typeof entry & ZipEntryWithSizeMetadata)._data?.uncompressedSize;
    if (typeof declaredSize !== 'number' || !Number.isFinite(declaredSize) || declaredSize < 0) continue;

    if (declaredSize > ZIP_INTAKE_LIMITS.maxEntryUncompressedBytes) {
      throw new UploadPreparationError('zip_entry_too_large');
    }

    declaredTotalBytes += declaredSize;
    if (declaredTotalBytes > ZIP_INTAKE_LIMITS.maxTotalUncompressedBytes) {
      throw new UploadPreparationError('zip_total_size_exceeded');
    }
  }

  let extractedTextBytes = 0;

  for (const entry of fileEntries) {
    const path = entry.name;
    const basename = path.split('/').pop() || path;
    const extension = getExtension(basename);
    const isPrimaryPathCandidate = isPrimarySkillPath(path);
    const isTextLike = isPrimaryPathCandidate || CONTEXT_PREVIEW_EXTENSIONS.includes(extension) || extension === '.md' || extension === '.txt';

    const item: PreparedUploadFile = {
      name: basename,
      path,
      type: extension || 'zip-entry',
      size: 0,
      role: 'context',
      source: 'zip',
      isPrimaryCandidate: false,
    };

    if (isTextLike) {
      try {
        item.text = await entry.async('string');
        item.size = new TextEncoder().encode(item.text).byteLength;
        if (item.size > ZIP_INTAKE_LIMITS.maxEntryUncompressedBytes) {
          throw new UploadPreparationError('zip_entry_too_large');
        }

        extractedTextBytes += item.size;
        if (extractedTextBytes > ZIP_INTAKE_LIMITS.maxTotalUncompressedBytes) {
          throw new UploadPreparationError('zip_total_size_exceeded');
        }

        item.preview = item.text.slice(0, 280);
        const isSkillDocumentImport = Boolean(parseSkillDocumentJson(item.text));
        item.isPrimaryCandidate = isPrimaryPathCandidate || isSkillDocumentImport;
        item.role = item.isPrimaryCandidate ? 'primary' : 'context';
      } catch (error) {
        if (error instanceof UploadPreparationError) throw error;
        item.text = undefined;
      }
    } else {
      item.isPrimaryCandidate = isPrimaryPathCandidate;
      item.role = item.isPrimaryCandidate ? 'primary' : 'context';
    }

    prepared.push(item);
  }

  return prepared;
}

export async function prepareUploads(files: File[]) {
  const prepared: PreparedUploadFile[] = [];

  for (const file of files) {
    if (getExtension(file.name) === '.zip') {
      prepared.push(...await expandZipUpload(file));
    } else {
      prepared.push(await prepareUploadFile(file));
    }
  }

  return prepared;
}
