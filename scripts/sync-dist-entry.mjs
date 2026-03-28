import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distAssetsDir = path.join(projectRoot, 'dist', 'assets');
const indexHtmlPath = path.join(projectRoot, 'index.html');

const files = await readdir(distAssetsDir);
const jsEntry = files.filter((name) => /^index-.*\.js$/.test(name)).sort().at(-1);
const cssEntry = files.filter((name) => /^index-.*\.css$/.test(name)).sort().at(-1);

if (!jsEntry || !cssEntry) {
  throw new Error('Missing dist assets required to sync index.html');
}

const html = await readFile(indexHtmlPath, 'utf-8');
const nextHtml = html
  .replace(/\/dist\/assets\/index-[A-Za-z0-9_-]+\.js/g, `/dist/assets/${jsEntry}`)
  .replace(/\/dist\/assets\/index-[A-Za-z0-9_-]+\.css/g, `/dist/assets/${cssEntry}`);

await writeFile(indexHtmlPath, nextHtml);
console.log(`Synced index.html -> ${jsEntry}, ${cssEntry}`);
