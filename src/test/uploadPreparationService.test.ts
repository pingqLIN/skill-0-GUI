import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareUploads,
  UploadPreparationError,
  ZIP_INTAKE_LIMITS,
} from '../services/uploadPreparationService';

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

type MockZipEntry = {
  name: string;
  dir: boolean;
  async: ReturnType<typeof vi.fn>;
  _data?: { uncompressedSize: number };
};

function createEntry(name: string, text = '# skill', declaredSize?: number): MockZipEntry {
  return {
    name,
    dir: false,
    async: vi.fn().mockResolvedValue(text),
    ...(declaredSize === undefined ? {} : { _data: { uncompressedSize: declaredSize } }),
  };
}

async function expectPreparationError(file: File, code: UploadPreparationError['code']) {
  await expect(prepareUploads([file])).rejects.toMatchObject({
    name: 'UploadPreparationError',
    code,
  });
}

describe('prepareUploads ZIP limits', () => {
  beforeEach(() => {
    vi.mocked(JSZip.loadAsync).mockReset();
  });

  it('rejects an oversized compressed ZIP before parsing it', async () => {
    const zipFile = new File(
      [new Uint8Array(ZIP_INTAKE_LIMITS.maxCompressedBytes + 1)],
      'oversized.zip',
      { type: 'application/zip' },
    );

    await expectPreparationError(zipFile, 'zip_input_too_large');
    expect(JSZip.loadAsync).not.toHaveBeenCalled();
  });

  it('rejects archives with too many files before extracting entries', async () => {
    const files = Object.fromEntries(
      Array.from({ length: ZIP_INTAKE_LIMITS.maxEntries + 1 }, (_, index) => {
        const entry = createEntry(`bundle/file-${index}.md`);
        return [entry.name, entry];
      }),
    );
    vi.mocked(JSZip.loadAsync).mockResolvedValue({ files } as any);

    await expectPreparationError(
      new File(['zip'], 'too-many-files.zip', { type: 'application/zip' }),
      'zip_entry_limit_exceeded',
    );
    expect(Object.values(files).every((entry) => entry.async.mock.calls.length === 0)).toBe(true);
  });

  it('rejects declared per-entry and total uncompressed sizes before extraction', async () => {
    const oversizedEntry = createEntry(
      'bundle/SKILL.md',
      '# skill',
      ZIP_INTAKE_LIMITS.maxEntryUncompressedBytes + 1,
    );
    vi.mocked(JSZip.loadAsync).mockResolvedValue({ files: { [oversizedEntry.name]: oversizedEntry } } as any);

    await expectPreparationError(
      new File(['zip'], 'oversized-entry.zip', { type: 'application/zip' }),
      'zip_entry_too_large',
    );
    expect(oversizedEntry.async).not.toHaveBeenCalled();

    const declaredSize = Math.floor(ZIP_INTAKE_LIMITS.maxTotalUncompressedBytes / 5);
    const totalEntries = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const entry = createEntry(`bundle/file-${index}.md`, '# skill', declaredSize);
        return [entry.name, entry];
      }),
    );
    vi.mocked(JSZip.loadAsync).mockResolvedValue({ files: totalEntries } as any);

    await expectPreparationError(
      new File(['zip'], 'oversized-total.zip', { type: 'application/zip' }),
      'zip_total_size_exceeded',
    );
    expect(Object.values(totalEntries).every((entry) => entry.async.mock.calls.length === 0)).toBe(true);
  });

  it('measures extracted text in UTF-8 bytes when metadata is unavailable', async () => {
    const entry = createEntry(
      'bundle/SKILL.md',
      '技'.repeat(Math.floor(ZIP_INTAKE_LIMITS.maxEntryUncompressedBytes / 3) + 1),
    );
    vi.mocked(JSZip.loadAsync).mockResolvedValue({ files: { [entry.name]: entry } } as any);

    await expectPreparationError(
      new File(['zip'], 'oversized-text.zip', { type: 'application/zip' }),
      'zip_entry_too_large',
    );
  });

  it('keeps valid ZIP skill and context files available for review', async () => {
    const skillEntry = createEntry('bundle/SKILL.md', '# zipped skill', 14);
    const policyEntry = createEntry('bundle/docs/policy.md', '# Policy', 8);
    vi.mocked(JSZip.loadAsync).mockResolvedValue({
      files: {
        [skillEntry.name]: skillEntry,
        [policyEntry.name]: policyEntry,
      },
    } as any);

    await expect(prepareUploads([
      new File(['zip'], 'bundle.zip', { type: 'application/zip' }),
    ])).resolves.toEqual([
      expect.objectContaining({ path: 'bundle/SKILL.md', role: 'primary', size: 14 }),
      expect.objectContaining({ path: 'bundle/docs/policy.md', role: 'primary', size: 8 }),
    ]);
  });

  it('expands a real JSZip archive through the guarded intake path', async () => {
    const actualJsZip = await vi.importActual<{ default: typeof JSZip }>('jszip');
    const archive = new actualJsZip.default();
    archive.file('bundle/SKILL.md', '# real zipped skill');
    archive.file('bundle/docs/policy.json', '{"mode":"review"}');
    const archiveBytes = await archive.generateAsync({ type: 'uint8array' });
    vi.mocked(JSZip.loadAsync).mockImplementation((input, options) => (
      actualJsZip.default.loadAsync(input, options) as ReturnType<typeof JSZip.loadAsync>
    ));

    await expect(prepareUploads([
      new File([archiveBytes], 'real-bundle.zip', { type: 'application/zip' }),
    ])).resolves.toEqual([
      expect.objectContaining({
        path: 'bundle/SKILL.md',
        role: 'primary',
        text: '# real zipped skill',
      }),
      expect.objectContaining({
        path: 'bundle/docs/policy.json',
        role: 'context',
        text: '{"mode":"review"}',
      }),
    ]);
  });
});
