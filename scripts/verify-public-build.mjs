import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const forbiddenPatterns = [
  /vector-space-3d/i,
  /react-force-graph-3d/i,
  /3d-force-graph/i,
];

async function main() {
  await rm(distDir, { force: true, recursive: true });
  await execFileAsync(process.execPath, [path.join(projectRoot, 'scripts', 'build-public.mjs')], {
    cwd: projectRoot,
    env: {
      ...process.env,
      VITE_ENABLE_3D: 'false',
    },
    maxBuffer: 10 * 1024 * 1024,
  });

  const assetsDir = path.join(distDir, 'assets');
  const assetNames = await readdir(assetsDir);
  const assetHits = assetNames.filter((name) => forbiddenPatterns.some((pattern) => pattern.test(name)));

  if (assetHits.length > 0) {
    throw new Error(`Public build emitted 3D assets: ${assetHits.join(', ')}`);
  }

  const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf-8');
  if (forbiddenPatterns.some((pattern) => pattern.test(indexHtml))) {
    throw new Error('Public build index.html still references 3D assets.');
  }

  console.log(`Verified public build boundary: ${assetNames.length} assets, no 3D entry/vendor chunk emitted.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
