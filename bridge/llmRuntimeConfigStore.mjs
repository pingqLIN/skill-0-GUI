const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_INPUT_CHARS = 12000;
const SUPPORTED_PROVIDERS = ['openai', 'gemini', 'anthropic'];
const SUPPORTED_MODES = ['disabled', 'fallback'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function trimString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeProvider(value) {
  const candidate = trimString(value).toLowerCase();
  return SUPPORTED_PROVIDERS.includes(candidate) ? candidate : null;
}

function normalizeMode(value) {
  const candidate = trimString(value).toLowerCase();
  return SUPPORTED_MODES.includes(candidate) ? candidate : 'disabled';
}

function normalizePositiveInteger(value, fallback, max = 120000) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return clamp(parsed, 256, max);
}

function createSettingsError(message, {
  code = 'llm_settings_error',
  detail = null,
  statusCode = 400,
} = {}) {
  const error = new Error(message);
  error.code = code;
  error.detail = detail || message;
  error.statusCode = statusCode;
  return error;
}

function normalizeMutableFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = trimString(value).toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

export function createLLMRuntimeConfigStore({
  mutable = process.env.SKILL0_RUNTIME_CONFIG_MUTABLE,
} = {}) {
  const initialProvider = normalizeProvider(process.env.SKILL0_LLM_PROVIDER || '');
  const initialMode = normalizeMode(process.env.SKILL0_LLM_MODE || 'disabled');
  const envApiKey = trimString(process.env.SKILL0_LLM_API_KEY || process.env.OPENAI_API_KEY || '');
  const state = {
    apiKey: envApiKey,
    apiKeySource: envApiKey ? 'env' : 'none',
    maxInputChars: normalizePositiveInteger(process.env.SKILL0_LLM_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS, 48000),
    mode: initialMode,
    model: trimString(process.env.SKILL0_LLM_MODEL || '') || (initialProvider === 'openai' ? DEFAULT_OPENAI_MODEL : ''),
    provider: initialProvider,
    timeoutMs: normalizePositiveInteger(process.env.SKILL0_LLM_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 120000),
    updatedAt: null,
  };
  const runtimeMutable = normalizeMutableFlag(mutable);

  function getRuntimeConfig() {
    return {
      apiKey: state.apiKey,
      maxInputChars: state.maxInputChars,
      mode: state.mode,
      model: state.model,
      provider: state.provider,
      timeoutMs: state.timeoutMs,
    };
  }

  function getPublicSettings() {
    return {
      options: {
        modeValues: SUPPORTED_MODES,
        providerValues: SUPPORTED_PROVIDERS,
      },
      settings: {
        apiKeyConfigured: Boolean(state.apiKey),
        apiKeySource: state.apiKeySource,
        maxInputChars: state.maxInputChars,
        mode: state.mode,
        model: state.model,
        mutable: runtimeMutable,
        provider: state.provider,
        timeoutMs: state.timeoutMs,
        updatedAt: state.updatedAt,
      },
    };
  }

  function updateRuntimeConfig(input = {}) {
    if (!runtimeMutable) {
      throw createSettingsError(
        'Runtime LLM settings are read-only in this deployment.',
        {
          code: 'llm_settings_read_only',
          statusCode: 403,
        },
      );
    }

    if ('mode' in input) {
      state.mode = normalizeMode(input.mode);
    }

    if ('provider' in input) {
      const provider = normalizeProvider(input.provider);
      if (!provider) {
        throw createSettingsError(
          'Choose a supported LLM provider.',
          {
            code: 'llm_settings_invalid_provider',
            detail: 'Supported providers are openai, gemini, and anthropic.',
          },
        );
      }
      state.provider = provider;
      if (!trimString(state.model) && provider === 'openai') {
        state.model = DEFAULT_OPENAI_MODEL;
      }
      if (provider !== 'openai' && state.model === DEFAULT_OPENAI_MODEL && !trimString(process.env.SKILL0_LLM_MODEL || '')) {
        state.model = '';
      }
    }

    if ('model' in input) {
      state.model = trimString(input.model) || (state.provider === 'openai' ? DEFAULT_OPENAI_MODEL : '');
    }

    if ('timeoutMs' in input) {
      state.timeoutMs = normalizePositiveInteger(input.timeoutMs, state.timeoutMs, 120000);
    }

    if ('maxInputChars' in input) {
      state.maxInputChars = normalizePositiveInteger(input.maxInputChars, state.maxInputChars, 48000);
    }

    if (input.clearApiKey === true) {
      state.apiKey = '';
      state.apiKeySource = 'none';
    } else if ('apiKey' in input) {
      state.apiKey = trimString(input.apiKey);
      state.apiKeySource = state.apiKey ? 'runtime' : 'none';
    }

    state.updatedAt = new Date().toISOString();
    return getPublicSettings();
  }

  return {
    getPublicSettings,
    getRuntimeConfig,
    updateRuntimeConfig,
  };
}
