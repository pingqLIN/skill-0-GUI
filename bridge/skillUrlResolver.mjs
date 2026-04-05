import path from 'node:path';

const SUPPORTED_PROTOCOLS = new Set(['https:']);
const SUPPORTED_FILE_EXTENSIONS = new Set(['.json', '.md', '.skill', '.txt']);

function createSkillUrlError(code, detail, status = 400) {
  const error = new Error(detail);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function getFileNameFromUrl(urlString) {
  const pathname = new URL(urlString).pathname;
  return pathname.split('/').filter(Boolean).at(-1) || 'remote-skill';
}

function assertSupportedExtension(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.has(extension)) {
    throw createSkillUrlError(
      'unsupported_file_type',
      'Supported skill URLs must point to a .md, .skill, .txt, or .json file.',
    );
  }
}

function normalizeGitHubUrl(parsedUrl) {
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  const isBlobPath = segments.length >= 5 && segments[2] === 'blob';

  if (!isBlobPath) {
    throw createSkillUrlError(
      'unsupported_github_url',
      'Supported GitHub URLs must point to a file using the /blob/ path.',
    );
  }

  const rawUrl = parsedUrl.href
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/');
  const fileName = getFileNameFromUrl(rawUrl);
  assertSupportedExtension(fileName);

  return {
    fetchUrl: rawUrl,
    fileName,
    primaryPath: new URL(rawUrl).pathname.replace(/^\/+/, ''),
    sourceType: 'github-blob',
  };
}

function normalizeRawGitHubUrl(parsedUrl) {
  const fileName = getFileNameFromUrl(parsedUrl.href);
  assertSupportedExtension(fileName);

  return {
    fetchUrl: parsedUrl.href,
    fileName,
    primaryPath: parsedUrl.pathname.replace(/^\/+/, ''),
    sourceType: 'github-raw',
  };
}

function normalizeRawGistUrl(parsedUrl) {
  const fileName = getFileNameFromUrl(parsedUrl.href);
  assertSupportedExtension(fileName);

  return {
    fetchUrl: parsedUrl.href,
    fileName,
    primaryPath: parsedUrl.pathname.replace(/^\/+/, ''),
    sourceType: 'gist-raw',
  };
}

function normalizeSkillUrl(inputUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw createSkillUrlError('invalid_url', 'Enter a valid HTTPS URL for a remote skill file.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
    throw createSkillUrlError('unsupported_protocol', 'Only HTTPS skill URLs are supported.');
  }

  const hostname = normalizeHostname(parsedUrl.hostname);

  if (hostname === 'github.com') {
    return normalizeGitHubUrl(parsedUrl);
  }

  if (hostname === 'raw.githubusercontent.com') {
    return normalizeRawGitHubUrl(parsedUrl);
  }

  if (hostname === 'gist.githubusercontent.com') {
    return normalizeRawGistUrl(parsedUrl);
  }

  throw createSkillUrlError(
    'unsupported_url_host',
    'Supported sources are GitHub blob URLs, raw.githubusercontent.com files, and raw gist URLs.',
  );
}

function ensureTextLikeResponse(contentType) {
  const normalized = String(contentType || '').toLowerCase();

  if (!normalized) {
    return;
  }

  if (normalized.includes('text/html')) {
    throw createSkillUrlError(
      'non_text_response',
      'The URL returned HTML instead of a skill file. Use a direct file URL instead of a page URL.',
    );
  }
}

export function serializeSkillUrlError(error) {
  return {
    error: typeof error?.code === 'string' ? error.code : 'resolve_skill_url_failed',
    detail: error instanceof Error ? error.message : 'Unable to resolve the remote skill URL.',
    status: typeof error?.status === 'number' ? error.status : 500,
  };
}

export async function resolveSkillUrlImport(inputUrl) {
  const normalized = normalizeSkillUrl(inputUrl);
  const response = await fetch(normalized.fetchUrl, {
    headers: {
      Accept: 'text/plain, text/markdown, application/json;q=0.9, */*;q=0.1',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw createSkillUrlError(
      'remote_fetch_failed',
      `Failed to download the remote skill file (${response.status}).`,
      502,
    );
  }

  const contentType = response.headers.get('content-type');
  ensureTextLikeResponse(contentType);

  const text = await response.text();

  if (!text.trim()) {
    throw createSkillUrlError('empty_remote_content', 'The remote skill file is empty.');
  }

  return {
    contentType: contentType || 'text/plain',
    fileName: normalized.fileName,
    primaryPath: normalized.primaryPath,
    resolvedUrl: response.url || normalized.fetchUrl,
    sourceType: normalized.sourceType,
    text,
    url: inputUrl,
  };
}
