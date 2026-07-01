import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const DEFAULT_CA_CANDIDATES = [
  '/etc/ssl/certs/ca-certificates.crt',
  '/etc/ssl/cert.pem',
];

function resolveExtraCaCerts() {
  if (process.env.NODE_EXTRA_CA_CERTS) {
    return process.env.NODE_EXTRA_CA_CERTS;
  }

  return DEFAULT_CA_CANDIDATES.find((candidate) => existsSync(candidate)) || null;
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-system-ca.mjs <command> [...args]');
  process.exit(1);
}

const extraCaCerts = resolveExtraCaCerts();
const env = {
  ...process.env,
  ...(extraCaCerts ? { NODE_EXTRA_CA_CERTS: extraCaCerts } : {}),
};
const isWindows = process.platform === 'win32';
const executable = isWindows && ['node', 'node.exe'].includes(command.toLowerCase())
  ? process.execPath
  : command;
const useShell = isWindows && executable === command && !command.includes('\\') && !command.includes('/');

const child = spawn(executable, args, {
  env,
  shell: useShell,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
