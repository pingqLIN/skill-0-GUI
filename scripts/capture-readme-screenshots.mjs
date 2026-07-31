import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    playwrightCli,
    'test',
    'e2e/readme-screenshots.spec.ts',
    '--project=chromium-desktop',
  ],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT || '43290',
      SKILL0_MODE: 'standalone',
      UPDATE_README_SCREENSHOTS: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
