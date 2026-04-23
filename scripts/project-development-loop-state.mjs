import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STATE_PATH = path.resolve('output/project-development-loop/state.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      fail(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return {
    command,
    options,
  };
}

function requireOption(options, key) {
  const value = options[key];
  if (!value || value === 'true') {
    fail(`Missing required option --${key}`);
  }

  return value;
}

function parseDeadline(options) {
  if (options.deadline) {
    const deadline = new Date(options.deadline);
    if (Number.isNaN(deadline.getTime())) {
      fail(`Invalid --deadline value: ${options.deadline}`);
    }
    return deadline.toISOString();
  }

  if (options['duration-hours']) {
    const hours = Number(options['duration-hours']);
    if (!Number.isFinite(hours) || hours <= 0) {
      fail(`Invalid --duration-hours value: ${options['duration-hours']}`);
    }

    return new Date(Date.now() + (hours * 60 * 60 * 1000)).toISOString();
  }

  fail('Provide either --deadline or --duration-hours');
}

async function ensureParentDirectory(filePath) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOTDIR') {
      fail(`Cannot create state directory because part of the path is a file: ${path.dirname(filePath)}`);
    }

    throw error;
  }
}

async function readState(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      fail(`State file not found: ${filePath}`);
    }

    throw error;
  }
}

async function writeState(filePath, state) {
  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function summarizeState(state) {
  return JSON.stringify({
    status: state.status,
    activeBatch: state.activeBatch,
    deadlineAt: state.deadlineAt,
    lastCheckpoint: state.lastCheckpoint,
    nextAction: state.nextAction,
    updatedAt: state.updatedAt,
    statePath: state.statePath,
  }, null, 2);
}

async function initState(filePath, options) {
  const now = new Date().toISOString();
  const batch = requireOption(options, 'batch');
  const nextAction = requireOption(options, 'next');
  const deadlineAt = parseDeadline(options);

  const state = {
    schemaVersion: 1,
    statePath: filePath,
    status: 'active',
    startedAt: now,
    updatedAt: now,
    deadlineAt,
    activeBatch: batch,
    lastCheckpoint: {
      completed: options.completed || 'startup audit completed',
      at: now,
      note: options.note || '',
    },
    nextAction,
    history: [
      {
        type: 'init',
        at: now,
        batch,
        completed: options.completed || 'startup audit completed',
        nextAction,
        note: options.note || '',
      },
    ],
  };

  await writeState(filePath, state);
  console.log(summarizeState(state));
}

async function checkpointState(filePath, options, nextStatus = 'active') {
  const state = await readState(filePath);
  const now = new Date().toISOString();
  const completed = requireOption(options, 'completed');
  const nextAction = requireOption(options, 'next');
  const batch = options.batch || state.activeBatch;
  const note = options.note || '';
  const status = options.status || nextStatus;

  const nextState = {
    ...state,
    status,
    activeBatch: batch,
    updatedAt: now,
    lastCheckpoint: {
      completed,
      at: now,
      note,
    },
    nextAction,
    history: [
      ...(state.history || []),
      {
        type: status === 'complete' ? 'complete' : 'checkpoint',
        at: now,
        batch,
        completed,
        nextAction,
        note,
        status,
      },
    ],
  };

  await writeState(filePath, nextState);
  console.log(summarizeState(nextState));
}

async function showStatus(filePath) {
  const state = await readState(filePath);
  console.log(summarizeState(state));
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(options.file || DEFAULT_STATE_PATH);

  if (!command) {
    fail('Usage: node scripts/project-development-loop-state.mjs <init|checkpoint|complete|status> [--file path] ...');
  }

  switch (command) {
    case 'init':
      await initState(filePath, options);
      return;
    case 'checkpoint':
      await checkpointState(filePath, options);
      return;
    case 'complete':
      await checkpointState(filePath, options, 'complete');
      return;
    case 'status':
      await showStatus(filePath);
      return;
    default:
      fail(`Unknown command: ${command}`);
  }
}

await main();
