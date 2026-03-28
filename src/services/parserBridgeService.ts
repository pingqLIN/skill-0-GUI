import type { UploadedContextFile } from '../types/intake';

type AnalyzeSkillOptions = {
  contextFiles?: UploadedContextFile[];
  primaryPath?: string | null;
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
    throw new Error(payload?.error || 'Skill-0 parser bridge request failed');
  }

  return payload;
}
