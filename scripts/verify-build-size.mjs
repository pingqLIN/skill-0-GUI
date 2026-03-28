import { readdir } from 'node:fs/promises';
import path from 'node:path';

const DIST_ASSETS_DIR = path.resolve('dist/assets');
const MAX_ENTRY_BYTES = 500 * 1024;

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const assets = await readdir(DIST_ASSETS_DIR, { withFileTypes: true });
const files = assets.filter((entry) => entry.isFile()).map((entry) => entry.name);

const indexAsset = files.find((file) => /^index-.*\.js$/.test(file));
if (!indexAsset) {
  throw new Error('Standard build verification failed: missing dist/assets/index-*.js');
}

const vendorAsset = files.find((file) => /^vector-space-3d-vendor-.*\.js$/.test(file));
const indexPath = path.join(DIST_ASSETS_DIR, indexAsset);
const vendorPath = vendorAsset ? path.join(DIST_ASSETS_DIR, vendorAsset) : null;

const [{ size: indexSize }, vendorStat] = await Promise.all([
  import('node:fs/promises').then((fs) => fs.stat(indexPath)),
  vendorPath ? import('node:fs/promises').then((fs) => fs.stat(vendorPath)) : Promise.resolve(null),
]);

if (indexSize >= MAX_ENTRY_BYTES) {
  throw new Error(
    `Standard build entry chunk regression: ${indexAsset} is ${formatBytes(indexSize)} (limit ${formatBytes(MAX_ENTRY_BYTES)}).`,
  );
}

const vendorSummary = vendorAsset && vendorStat
  ? `${vendorAsset} ${formatBytes(vendorStat.size)}`
  : 'vector-space-3d-vendor chunk not present';

console.log(`Verified standard build size: ${indexAsset} ${formatBytes(indexSize)}; ${vendorSummary}.`);
