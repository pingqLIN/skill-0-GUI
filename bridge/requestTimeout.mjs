const DEFAULT_REQUEST_TIMEOUT_BUFFER_MS = 10000;

/**
 * @typedef {object} ParserRuntimeConfig
 * @property {string | null | undefined} [apiKey]
 * @property {string | null | undefined} [mode]
 * @property {string | null | undefined} [model]
 * @property {string | null | undefined} [provider]
 * @property {number | string | null | undefined} [timeoutMs]
 */

/**
 * @typedef {object} ParserRequestTimeoutOptions
 * @property {number | string | null | undefined} [baseTimeoutMs]
 * @property {number | string | null | undefined} [bufferMs]
 * @property {ParserRuntimeConfig | null | undefined} [runtimeConfig]
 */

function trimString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizePositiveInteger(value, fallback, max = 300000) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, parsed);
}

/**
 * @param {ParserRequestTimeoutOptions} [options]
 */
export function resolveParserRequestTimeoutMs({
  baseTimeoutMs,
  bufferMs = DEFAULT_REQUEST_TIMEOUT_BUFFER_MS,
  runtimeConfig,
} = {}) {
  const normalizedBaseTimeoutMs = normalizePositiveInteger(baseTimeoutMs, 20000);
  const normalizedMode = trimString(runtimeConfig?.mode).toLowerCase();
  const normalizedProvider = trimString(runtimeConfig?.provider);
  const normalizedModel = trimString(runtimeConfig?.model);
  const normalizedApiKey = trimString(runtimeConfig?.apiKey);
  const llmTimeoutMs = normalizePositiveInteger(runtimeConfig?.timeoutMs, normalizedBaseTimeoutMs);
  const llmEnabled = (normalizedMode === 'fallback' || normalizedMode === 'force')
    && normalizedProvider
    && normalizedModel
    && normalizedApiKey;

  if (!llmEnabled) {
    return normalizedBaseTimeoutMs;
  }

  return Math.max(
    normalizedBaseTimeoutMs,
    llmTimeoutMs + normalizePositiveInteger(bufferMs, DEFAULT_REQUEST_TIMEOUT_BUFFER_MS),
  );
}
