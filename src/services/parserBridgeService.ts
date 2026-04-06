import type { UploadedContextFile } from '../types/intake';

type AnalyzeSkillOptions = {
  contextFiles?: UploadedContextFile[];
  primaryPath?: string | null;
};

export type ResolvedSkillUrlPayload = {
  contentType: string;
  fileName: string;
  primaryPath: string;
  resolvedUrl: string;
  sourceType: string;
  text: string;
  url: string;
};

type SkillUrlImportError = Error & {
  code?: string;
  detail?: string;
};

export async function analyzeSkillText(
  text: string,
  skillName = 'uploaded-skill',
  options: AnalyzeSkillOptions = {},
) {
  const body: Record<string, unknown> = { text, skillName };
  if (options.primaryPath) {
    body.primaryPath = options.primaryPath;
  }
  if (options.contextFiles?.length) {
    body.contextFiles = options.contextFiles.map((file) => ({
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      role: file.role,
      source: file.source,
      preview: file.preview,
      text: file.text ?? '',
    }));
  }

  const response = await fetch('/api/parse-skill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || 'Skill-0 parser bridge request failed');
  }

  return payload;
}

export async function resolveSkillUrl(url: string): Promise<ResolvedSkillUrlPayload> {
  const response = await fetch('/api/resolve-skill-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.error || 'Remote skill URL import failed') as SkillUrlImportError;
    error.code = typeof payload?.error === 'string' ? payload.error : 'resolve_skill_url_failed';
    error.detail = typeof payload?.detail === 'string' ? payload.detail : undefined;
    throw error;
  }

  return payload as ResolvedSkillUrlPayload;
}
