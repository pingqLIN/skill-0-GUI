import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'shared-docs.manifest.json');
const outputDir = path.join(repoRoot, 'docs', 'shared');
const checkOnly = process.argv.includes('--check');

const candidateRoots = [
  process.env.SKILL0_PARSER_ROOT,
  process.env.SKILL0_ROOT,
  path.resolve(repoRoot, '..', 'skill-0'),
  '/home/miles/dev2/projects/skill-0',
  '/home/miles/dev2/skill-0',
  '/home/miles/dev/projects/skill-0',
].filter(Boolean);

async function fileExists(targetPath) {
  try {
    await readFile(targetPath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function resolveSkill0Root() {
  for (const root of candidateRoots) {
    const sharedReadme = path.join(root, 'docs', 'shared', 'README.md');
    if (await fileExists(sharedReadme)) {
      return root;
    }
  }
  return null;
}

function renderMirroredDocument(sourceRepoPath, body) {
  const normalizedSourceRepoPath = sourceRepoPath.split(path.sep).join(path.posix.sep);
  const banner = [
    '<!--',
    'This file is mirrored into skill-0-GUI.',
    `Source: ${normalizedSourceRepoPath}`,
    'Do not edit this copy directly; update the source document and rerun npm run docs:sync.',
    '-->',
    '',
  ].join('\n');

  return `${banner}${body}`;
}

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, '\n');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

await mkdir(outputDir, { recursive: true });

async function checkMirroredDocsWithoutSource() {
  for (const entry of manifest) {
    const targetPath = path.join(outputDir, entry.target);
    if (!(await fileExists(targetPath))) {
      throw new Error(
        `Missing mirrored doc: docs/shared/${entry.target}. Run npm run docs:sync from a workspace with skill-0 available.`,
      );
    }

    const existing = await readFile(targetPath, 'utf8');
    if (!existing.includes('This file is mirrored into skill-0-GUI.')) {
      throw new Error(
        `Mirrored doc missing sync banner: docs/shared/${entry.target}.`,
      );
    }
    if (!existing.includes('Do not edit this copy directly; update the source document and rerun npm run docs:sync.')) {
      throw new Error(
        `Mirrored doc missing source-of-truth notice: docs/shared/${entry.target}.`,
      );
    }
    console.log(`checked manifest ${entry.target} (source repo unavailable)`);
  }
}

const skill0Root = await resolveSkill0Root();

if (checkOnly && !skill0Root) {
  await checkMirroredDocsWithoutSource();
  process.exit(0);
}

if (!skill0Root) {
  throw new Error(
    [
      'Unable to resolve skill-0 shared docs source.',
      'Set SKILL0_PARSER_ROOT or SKILL0_ROOT, or create docs/shared in one of the known roots:',
      ...candidateRoots.map((root) => `- ${root}`),
    ].join('\n'),
  );
}

for (const entry of manifest) {
  const sourcePath = path.join(skill0Root, 'docs', 'shared', entry.source);
  const targetPath = path.join(outputDir, entry.target);
  const body = await readFile(sourcePath, 'utf8');
  const rendered = renderMirroredDocument(
    path.relative(repoRoot, sourcePath),
    body,
  );
  const existing = (await fileExists(targetPath))
    ? await readFile(targetPath, 'utf8')
    : null;

  if (checkOnly) {
    if (normalizeNewlines(existing) !== normalizeNewlines(rendered)) {
      throw new Error(
        `Outdated mirrored doc: docs/shared/${entry.target}. Run npm run docs:sync.`,
      );
    }
    console.log(`checked ${entry.source} -> docs/shared/${entry.target}`);
    continue;
  }

  await writeFile(targetPath, rendered, 'utf8');
  console.log(`synced ${entry.source} -> docs/shared/${entry.target}`);
}
