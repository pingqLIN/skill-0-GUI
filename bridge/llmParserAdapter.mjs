const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_INPUT_CHARS = 12000;
const SCHEMA_VERSION = '2.4.0';

const SUPPORTED_PROVIDER_CAPABILITIES = {
  openai: {
    supportsJsonSchema: true,
    supportsReasoning: true,
  },
  gemini: {
    supportsJsonSchema: false,
    supportsReasoning: false,
  },
  anthropic: {
    supportsJsonSchema: false,
    supportsReasoning: false,
  },
};

const LLM_ASSISTED_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'meta',
    'decomposition',
    'execution_paths',
    'supporting_files',
    'command_references',
    'analysis_findings',
    'original_definition',
  ],
  properties: {
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'name', 'description'],
      properties: {
        title: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
    },
    decomposition: {
      type: 'object',
      additionalProperties: false,
      required: ['actions', 'rules', 'directives'],
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'action_type', 'description', 'deterministic', 'side_effects'],
            properties: {
              name: { type: 'string' },
              action_type: { type: 'string' },
              description: { type: 'string' },
              deterministic: { type: 'boolean' },
              side_effects: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        rules: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'condition_type', 'condition_expression', 'description', 'returns', 'fail_action'],
            properties: {
              name: { type: 'string' },
              condition_type: { type: 'string' },
              condition_expression: { type: 'string' },
              description: { type: 'string' },
              returns: { type: 'string' },
              fail_action: { type: 'string' },
            },
          },
        },
        directives: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'directive_type', 'description', 'decomposable', 'decomposition_hint'],
            properties: {
              name: { type: 'string' },
              directive_type: { type: 'string' },
              description: { type: 'string' },
              decomposable: { type: 'boolean' },
              decomposition_hint: { type: 'string' },
            },
          },
        },
      },
    },
    execution_paths: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'entry_condition', 'steps', 'success_end', 'failure_end', 'branches'],
        properties: {
          name: { type: 'string' },
          entry_condition: { type: 'string' },
          steps: {
            type: 'array',
            items: { type: 'string' },
          },
          success_end: { type: 'string' },
          failure_end: { type: 'string' },
          branches: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['condition', 'target'],
              properties: {
                condition: { type: 'string' },
                target: { type: 'string' },
              },
            },
          },
        },
      },
    },
    supporting_files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'resolved', 'kind', 'summary'],
        properties: {
          path: { type: 'string' },
          resolved: { type: 'boolean' },
          kind: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    },
    command_references: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['command', 'authority_profile', 'source_path', 'reference_type', 'excerpt'],
        properties: {
          command: { type: 'string' },
          authority_profile: { type: 'string' },
          source_path: { type: 'string' },
          reference_type: { type: 'string' },
          excerpt: { type: 'string' },
        },
      },
    },
    analysis_findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'category', 'recommended_action', 'affected_paths', 'evidence'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string' },
          category: { type: 'string' },
          recommended_action: { type: 'string' },
          affected_paths: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['excerpt', 'explanation'],
              properties: {
                excerpt: { type: 'string' },
                explanation: { type: 'string' },
              },
            },
          },
        },
      },
    },
    original_definition: {
      type: 'object',
      additionalProperties: false,
      required: ['skill_name', 'skill_description', 'source', 'fallback_reason'],
      properties: {
        skill_name: { type: 'string' },
        skill_description: { type: 'string' },
        source: { type: 'string' },
        fallback_reason: { type: 'string' },
      },
    },
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeProvider(value) {
  if (value === 'openai' || value === 'gemini' || value === 'anthropic') {
    return value;
  }
  return null;
}

function normalizeMode(value) {
  return value === 'fallback' ? 'fallback' : 'disabled';
}

function normalizePositiveInteger(value, fallback, max = 120000) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return clamp(parsed, 256, max);
}

function slugifySkillName(input) {
  return String(input || 'uploaded-skill')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uploaded-skill';
}

function titleCaseSkillName(name) {
  return String(name || 'Uploaded Skill')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function trimString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createLLMParserError(message, {
  code = 'llm_parser_error',
  detail = null,
  provider = null,
  statusCode = 500,
} = {}) {
  const error = new Error(message);
  error.code = code;
  error.detail = detail ?? message;
  error.provider = provider;
  error.statusCode = statusCode;
  return error;
}

function buildCapabilities({
  enabled,
  mode,
  provider,
  model,
  reason = null,
}) {
  const providerCapabilities = provider ? SUPPORTED_PROVIDER_CAPABILITIES[provider] : null;

  return {
    enabled,
    mode,
    model,
    provider,
    reason,
    supportsJsonSchema: providerCapabilities?.supportsJsonSchema ?? false,
    supportsReasoning: providerCapabilities?.supportsReasoning ?? false,
  };
}

function truncateForPrompt(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 18))}\n...[truncated]`;
}

function buildContextDigest(contextFiles, maxInputChars) {
  if (!Array.isArray(contextFiles) || contextFiles.length === 0) {
    return 'No supporting files were supplied.';
  }

  const perFileBudget = Math.max(220, Math.floor(maxInputChars / Math.max(contextFiles.length, 1) / 3));

  return contextFiles
    .map((file, index) => {
      const preview = truncateForPrompt(String(file?.text || ''), perFileBudget);
      return [
        `File ${index + 1}: ${trimString(file?.path) || trimString(file?.name) || 'unknown-file'}`,
        `Role: ${trimString(file?.role, 'context')}`,
        `Preview:`,
        preview || '[empty file]',
      ].join('\n');
    })
    .join('\n\n');
}

function buildOpenAIInstructions({
  contextDigest,
  fallbackReason,
  primaryPath,
  skillName,
  text,
}) {
  return [
    'You are a recovery parser for skill specifications.',
    'Return only schema-compatible structured data.',
    'Do not invent hidden files, commands, or execution steps.',
    'If the input is ambiguous, preserve uncertainty in descriptions and keep arrays empty instead of hallucinating facts.',
    'Use supporting_files only for files explicitly mentioned or supplied.',
    'Use command_references only for commands that are explicitly present in the input or supporting files.',
    'Use analysis_findings for concrete parsing or safety concerns backed by visible evidence.',
    '',
    `Requested skill name: ${skillName}`,
    `Primary path: ${primaryPath || 'SKILL.md'}`,
    `Fallback reason: ${fallbackReason}`,
    '',
    'Primary content:',
    truncateForPrompt(text, Math.max(1500, Math.floor(DEFAULT_MAX_INPUT_CHARS * 0.6))),
    '',
    'Supporting file digest:',
    contextDigest,
  ].join('\n');
}

function parseOpenAIStructuredOutput(payload, provider) {
  const outputs = Array.isArray(payload?.output) ? payload.output : [];

  for (const output of outputs) {
    if (output?.type !== 'message' || !Array.isArray(output.content)) {
      continue;
    }

    for (const item of output.content) {
      if (item?.type === 'refusal' && typeof item.refusal === 'string') {
        throw createLLMParserError(
          `LLM fallback refused the request: ${item.refusal}`,
          {
            code: 'llm_parser_refusal',
            detail: item.refusal,
            provider,
            statusCode: 422,
          },
        );
      }

      if (item?.type === 'output_text' && typeof item.text === 'string' && item.text.trim()) {
        try {
          return JSON.parse(item.text);
        } catch (error) {
          throw createLLMParserError(
            'LLM fallback returned invalid JSON output.',
            {
              code: 'llm_parser_invalid_json',
              detail: error instanceof Error ? error.message : String(error),
              provider,
              statusCode: 502,
            },
          );
        }
      }
    }
  }

  throw createLLMParserError(
    'LLM fallback returned no structured output.',
    {
      code: 'llm_parser_missing_output',
      provider,
      statusCode: 502,
    },
  );
}

function normalizeEvidenceItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      excerpt: trimString(item.excerpt),
      explanation: trimString(item.explanation),
    }))
    .filter((item) => item.excerpt || item.explanation);
}

function normalizeLLMParserResult(document, {
  fallbackReason,
  model,
  primaryPath,
  provider,
  schemaPath,
  skillName,
}) {
  const normalizedSkillName = slugifySkillName(
    trimString(document?.meta?.name) || trimString(document?.original_definition?.skill_name) || skillName,
  );
  const title = trimString(document?.meta?.title) || `${titleCaseSkillName(normalizedSkillName)} Skill`;
  const description = trimString(document?.meta?.description)
    || trimString(document?.original_definition?.skill_description)
    || 'LLM-assisted recovery parser output.';
  const actions = Array.isArray(document?.decomposition?.actions) ? document.decomposition.actions : [];
  const rules = Array.isArray(document?.decomposition?.rules) ? document.decomposition.rules : [];
  const directives = Array.isArray(document?.decomposition?.directives) ? document.decomposition.directives : [];
  const executionPaths = Array.isArray(document?.execution_paths) ? document.execution_paths : [];
  const supportingFiles = Array.isArray(document?.supporting_files) ? document.supporting_files : [];
  const commandReferences = Array.isArray(document?.command_references) ? document.command_references : [];
  const analysisFindings = Array.isArray(document?.analysis_findings) ? document.analysis_findings : [];

  const normalizedActions = actions.map((action, index) => ({
    action_type: trimString(action?.action_type, 'transform'),
    description: trimString(action?.description) || trimString(action?.name) || `Recovered action ${index + 1}`,
    deterministic: typeof action?.deterministic === 'boolean' ? action.deterministic : true,
    id: `a_${String(index + 1).padStart(3, '0')}`,
    name: trimString(action?.name) || `Recovered action ${index + 1}`,
    side_effects: normalizeStringArray(action?.side_effects),
  }));

  const normalizedRules = rules.map((rule, index) => ({
    condition_expression: trimString(rule?.condition_expression),
    condition_type: trimString(rule?.condition_type, 'rule'),
    description: trimString(rule?.description) || trimString(rule?.name) || `Recovered rule ${index + 1}`,
    fail_action: trimString(rule?.fail_action, 'review'),
    id: `r_${String(index + 1).padStart(3, '0')}`,
    name: trimString(rule?.name) || `Recovered rule ${index + 1}`,
    returns: trimString(rule?.returns, 'boolean'),
  }));

  const normalizedDirectives = directives.map((directive, index) => ({
    decomposable: typeof directive?.decomposable === 'boolean' ? directive.decomposable : false,
    decomposition_hint: trimString(directive?.decomposition_hint),
    description: trimString(directive?.description) || trimString(directive?.name) || `Recovered directive ${index + 1}`,
    directive_type: trimString(directive?.directive_type, 'strategy'),
    id: `d_${String(index + 1).padStart(3, '0')}`,
    name: trimString(directive?.name) || `Recovered directive ${index + 1}`,
  }));

  const normalizedExecutionPaths = executionPaths.map((executionPath, index) => ({
    branches: Array.isArray(executionPath?.branches)
      ? executionPath.branches
        .filter((branch) => branch && typeof branch === 'object')
        .map((branch) => ({
          condition: trimString(branch.condition),
          target: trimString(branch.target),
        }))
        .filter((branch) => branch.target)
      : [],
    entry_condition: trimString(executionPath?.entry_condition),
    failure_end: trimString(executionPath?.failure_end),
    id: `p_${String(index + 1).padStart(3, '0')}`,
    name: trimString(executionPath?.name) || `Recovered path ${index + 1}`,
    steps: normalizeStringArray(executionPath?.steps),
    success_end: trimString(executionPath?.success_end),
  }));

  const normalizedSupportingFiles = supportingFiles.map((file) => ({
    kind: trimString(file?.kind, 'reference'),
    path: trimString(file?.path),
    resolved: typeof file?.resolved === 'boolean' ? file.resolved : true,
    summary: trimString(file?.summary),
  })).filter((file) => file.path);

  const normalizedCommandReferences = commandReferences.map((reference) => ({
    authority_profile: trimString(reference?.authority_profile, 'process_exec'),
    command: trimString(reference?.command),
    excerpt: trimString(reference?.excerpt),
    reference_type: trimString(reference?.reference_type, 'inline'),
    source_path: trimString(reference?.source_path, primaryPath || 'SKILL.md'),
  })).filter((reference) => reference.command);

  const normalizedAnalysisFindings = analysisFindings.map((finding, index) => ({
    affected_paths: normalizeStringArray(finding?.affected_paths),
    category: trimString(finding?.category, 'parser'),
    evidence: normalizeEvidenceItems(finding?.evidence),
    recommended_action: trimString(finding?.recommended_action) || 'Review the recovered parser output before approval.',
    severity: trimString(finding?.severity, 'medium'),
    title: trimString(finding?.title) || `Recovered finding ${index + 1}`,
  }));

  return {
    $schema: schemaPath,
    analysis_findings: normalizedAnalysisFindings,
    command_references: normalizedCommandReferences,
    decomposition: {
      actions: normalizedActions,
      directives: normalizedDirectives,
      rules: normalizedRules,
    },
    execution_paths: normalizedExecutionPaths,
    manifest: {
      analysis_level: normalizedSupportingFiles.length > 0 || primaryPath ? 'manifest' : 'single_file',
      command_references_count: normalizedCommandReferences.length,
      supporting_files_count: normalizedSupportingFiles.length,
      unresolved_references_count: normalizedSupportingFiles.filter((file) => !file.resolved).length,
    },
    meta: {
      description,
      name: normalizedSkillName,
      parsed_by: `llm-assisted/${provider}`,
      parse_timestamp: new Date().toISOString(),
      parser_version: `skill-0-review-studio llm-assisted ${provider}/${model}`,
      schema_version: SCHEMA_VERSION,
      skill_id: `claude__${normalizedSkillName}`,
      skill_layer: 'claude_skill',
      title,
    },
    original_definition: {
      fallback_reason: trimString(document?.original_definition?.fallback_reason) || fallbackReason,
      skill_description: trimString(document?.original_definition?.skill_description) || description,
      skill_name: trimString(document?.original_definition?.skill_name) || normalizedSkillName,
      source: trimString(document?.original_definition?.source) || `llm-assisted/${provider}`,
    },
    supporting_files: normalizedSupportingFiles,
  };
}

function validateNormalizedParserResult(parserResult) {
  const issues = [];
  const actions = Array.isArray(parserResult?.decomposition?.actions) ? parserResult.decomposition.actions : [];
  const rules = Array.isArray(parserResult?.decomposition?.rules) ? parserResult.decomposition.rules : [];
  const directives = Array.isArray(parserResult?.decomposition?.directives) ? parserResult.decomposition.directives : [];
  const totalRecovered = actions.length + rules.length + directives.length;

  if (!trimString(parserResult?.meta?.name)) {
    issues.push('Missing meta.name.');
  }
  if (!trimString(parserResult?.meta?.title)) {
    issues.push('Missing meta.title.');
  }
  if (!trimString(parserResult?.meta?.skill_id)) {
    issues.push('Missing meta.skill_id.');
  }
  if (totalRecovered === 0) {
    issues.push('Recovered decomposition is empty.');
  }
  if (actions.some((action) => !trimString(action.id) || !trimString(action.name) || !trimString(action.action_type))) {
    issues.push('One or more recovered actions are incomplete.');
  }
  if (rules.some((rule) => !trimString(rule.id) || !trimString(rule.name))) {
    issues.push('One or more recovered rules are incomplete.');
  }
  if (directives.some((directive) => !trimString(directive.id) || !trimString(directive.name))) {
    issues.push('One or more recovered directives are incomplete.');
  }

  return {
    issues,
    valid: issues.length === 0,
  };
}

async function parseUnknownSkillWithOpenAI({
  apiKey,
  fetchImpl,
  fallbackReason,
  maxInputChars,
  model,
  primaryPath,
  provider,
  schemaPath,
  skillName,
  text,
  timeoutMs,
  contextFiles,
}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const contextDigest = buildContextDigest(contextFiles, maxInputChars);
  const prompt = buildOpenAIInstructions({
    contextDigest,
    fallbackReason,
    primaryPath,
    skillName,
    text: truncateForPrompt(text, maxInputChars),
  });

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'skill_recovery',
            strict: true,
            schema: LLM_ASSISTED_RESPONSE_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const providerMessage = payload?.error?.message
        || payload?.message
        || `OpenAI Responses API returned ${response.status}.`;
      throw createLLMParserError(
        `LLM fallback provider request failed: ${providerMessage}`,
        {
          code: response.status === 429 ? 'llm_provider_rate_limited' : 'llm_provider_request_failed',
          detail: providerMessage,
          provider,
          statusCode: response.status === 429 ? 503 : response.status,
        },
      );
    }

    const document = parseOpenAIStructuredOutput(payload, provider);
    const parserResult = normalizeLLMParserResult(document, {
      fallbackReason,
      model,
      primaryPath,
      provider,
      schemaPath,
      skillName,
    });
    const validation = validateNormalizedParserResult(parserResult);

    if (!validation.valid) {
      throw createLLMParserError(
        'LLM fallback output did not pass post-parse validation.',
        {
          code: 'llm_parser_schema_validation_failed',
          detail: validation.issues.join(' '),
          provider,
          statusCode: 502,
        },
      );
    }

    return {
      parserResult,
      schemaValidation: 'passed',
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createLLMParserError(
        'LLM fallback request timed out.',
        {
          code: 'llm_provider_timeout',
          detail: `The provider did not respond within ${timeoutMs}ms.`,
          provider,
          statusCode: 504,
        },
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * @typedef {{
 *   apiKey?: string;
 *   fetchImpl?: typeof fetch;
 *   getConfig?: () => {
 *     apiKey?: string;
 *     maxInputChars?: number;
 *     mode?: string;
 *     model?: string;
 *     provider?: string | null;
 *     timeoutMs?: number;
 *   };
 *   maxInputChars?: number;
 *   mode?: string;
 *   model?: string;
 *   provider?: string;
 *   timeoutMs?: number;
 * }} LLMParserAdapterOptions
 */

/** @param {LLMParserAdapterOptions} options */
export function createLLMParserAdapter({
  apiKey = process.env.SKILL0_LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  fetchImpl = globalThis.fetch,
  getConfig,
  maxInputChars = normalizePositiveInteger(process.env.SKILL0_LLM_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS, 48000),
  mode = process.env.SKILL0_LLM_MODE || 'disabled',
  model,
  provider = process.env.SKILL0_LLM_PROVIDER || '',
  timeoutMs = normalizePositiveInteger(process.env.SKILL0_LLM_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 120000),
} = {}) {
  function resolveRuntimeConfig() {
    const config = typeof getConfig === 'function'
      ? getConfig()
      : {
          apiKey,
          maxInputChars,
          mode,
          model,
          provider,
          timeoutMs,
        };
    const normalizedProvider = normalizeProvider(config?.provider);

    return {
      apiKey: trimString(config?.apiKey),
      maxInputChars: normalizePositiveInteger(config?.maxInputChars, DEFAULT_MAX_INPUT_CHARS, 48000),
      mode: normalizeMode(config?.mode),
      model: trimString(config?.model) || (normalizedProvider === 'openai' ? DEFAULT_OPENAI_MODEL : ''),
      provider: normalizedProvider,
      timeoutMs: normalizePositiveInteger(config?.timeoutMs, DEFAULT_TIMEOUT_MS, 120000),
    };
  }

  function getCapabilities() {
    const config = resolveRuntimeConfig();

    if (config.mode !== 'fallback') {
      return buildCapabilities({
        enabled: false,
        mode: config.mode,
        model: config.model || null,
        provider: config.provider,
        reason: 'LLM fallback mode is disabled.',
      });
    }

    if (!config.provider) {
      return buildCapabilities({
        enabled: false,
        mode: config.mode,
        model: null,
        provider: null,
        reason: 'LLM fallback provider is not configured.',
      });
    }

    if (!config.apiKey) {
      return buildCapabilities({
        enabled: false,
        mode: config.mode,
        model: config.model || null,
        provider: config.provider,
        reason: 'LLM fallback API key is not configured.',
      });
    }

    if (config.provider !== 'openai') {
      return buildCapabilities({
        enabled: false,
        mode: config.mode,
        model: config.model || null,
        provider: config.provider,
        reason: `${config.provider} fallback is not implemented in this build.`,
      });
    }

    if (typeof fetchImpl !== 'function') {
      return buildCapabilities({
        enabled: false,
        mode: config.mode,
        model: config.model || null,
        provider: config.provider,
        reason: 'No fetch implementation is available for the LLM fallback adapter.',
      });
    }

    return buildCapabilities({
      enabled: true,
      mode: config.mode,
      model: config.model,
      provider: config.provider,
    });
  }

  async function parseUnknownSkill({
    contextFiles = [],
    fallbackReason,
    primaryPath = null,
    schemaPath,
    skillName,
    text,
  }) {
    const config = resolveRuntimeConfig();
    const capabilities = getCapabilities();

    if (!capabilities.enabled || !capabilities.provider || !capabilities.model) {
      throw createLLMParserError(
        capabilities.reason || 'LLM fallback is unavailable.',
        {
          code: 'llm_fallback_unavailable',
          detail: capabilities.reason,
          provider: capabilities.provider,
          statusCode: 503,
        },
      );
    }

    if (capabilities.provider === 'openai') {
      return await parseUnknownSkillWithOpenAI({
        apiKey: config.apiKey,
        contextFiles,
        fallbackReason,
        fetchImpl,
        maxInputChars: config.maxInputChars,
        model: capabilities.model,
        primaryPath,
        provider: capabilities.provider,
        schemaPath,
        skillName,
        text,
        timeoutMs: config.timeoutMs,
      });
    }

    throw createLLMParserError(
      `${capabilities.provider} fallback is not implemented in this build.`,
      {
        code: 'llm_provider_not_implemented',
        provider: capabilities.provider,
        statusCode: 503,
      },
    );
  }

  return {
    getCapabilities,
    async parseUnknownSkill(input, options = {}) {
      return await parseUnknownSkill({
        ...input,
        ...options,
      });
    },
  };
}
