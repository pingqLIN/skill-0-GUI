import type { SkillDocument, ValidationIssue } from '../types/skillDocument';

type ValidationResult = {
  issues: ValidationIssue[];
  schemaLabel: string;
  valid: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pushIssue(
  issues: ValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: ValidationIssue['severity'],
) {
  issues.push({ code, message, path, severity });
}

export function validateSkillDocument(skillDocument: SkillDocument): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(skillDocument.meta)) {
    pushIssue(issues, 'SCHEMA_META_REQUIRED', 'meta', 'Top-level `meta` object is required.', 'error');
  } else {
    if (typeof skillDocument.meta.title !== 'string' && typeof skillDocument.meta.name !== 'string') {
      pushIssue(issues, 'SCHEMA_META_TITLE', 'meta.title', 'SkillDocument should include `meta.title` or `meta.name`.', 'error');
    }
    if (
      skillDocument.meta.schema_version !== undefined
      && typeof skillDocument.meta.schema_version !== 'string'
    ) {
      pushIssue(issues, 'SCHEMA_META_SCHEMA_VERSION', 'meta.schema_version', '`meta.schema_version` must be a string when present.', 'error');
    }
  }

  if (!isRecord(skillDocument.decomposition)) {
    pushIssue(issues, 'SCHEMA_DECOMPOSITION_REQUIRED', 'decomposition', 'Top-level `decomposition` object is required.', 'error');
  } else {
    if (!Array.isArray(skillDocument.decomposition.actions)) {
      pushIssue(issues, 'SCHEMA_ACTIONS_ARRAY', 'decomposition.actions', '`decomposition.actions` must be an array.', 'error');
    }
    if (!Array.isArray(skillDocument.decomposition.rules)) {
      pushIssue(issues, 'SCHEMA_RULES_ARRAY', 'decomposition.rules', '`decomposition.rules` must be an array.', 'error');
    }
    if (!Array.isArray(skillDocument.decomposition.directives)) {
      pushIssue(issues, 'SCHEMA_DIRECTIVES_ARRAY', 'decomposition.directives', '`decomposition.directives` must be an array.', 'error');
    }
  }

  if (skillDocument.original_definition !== undefined && !isRecord(skillDocument.original_definition)) {
    pushIssue(issues, 'SCHEMA_ORIGINAL_DEFINITION_OBJECT', 'original_definition', '`original_definition` must be an object when present.', 'error');
  } else if (skillDocument.original_definition === undefined) {
    pushIssue(
      issues,
      'SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED',
      'original_definition',
      '`original_definition` is recommended so exported review artifacts preserve provenance.',
      'warning',
    );
  }

  for (const [index, action] of skillDocument.decomposition.actions.entries()) {
    if (typeof action.id !== 'string' || !action.id.trim()) {
      pushIssue(issues, 'SCHEMA_ACTION_ID', `decomposition.actions[${index}].id`, 'Each action requires a non-empty string `id`.', 'error');
    }
    if (typeof action.name !== 'string' || !action.name.trim()) {
      pushIssue(issues, 'SCHEMA_ACTION_NAME', `decomposition.actions[${index}].name`, 'Each action requires a non-empty string `name`.', 'error');
    }
    if (typeof action.action_type !== 'string' || !action.action_type.trim()) {
      pushIssue(issues, 'SCHEMA_ACTION_TYPE', `decomposition.actions[${index}].action_type`, 'Each action requires a non-empty string `action_type`.', 'error');
    }
  }

  for (const [index, rule] of skillDocument.decomposition.rules.entries()) {
    if (typeof rule.id !== 'string' || !rule.id.trim()) {
      pushIssue(issues, 'SCHEMA_RULE_ID', `decomposition.rules[${index}].id`, 'Each rule requires a non-empty string `id`.', 'error');
    }
    if (typeof rule.name !== 'string' || !rule.name.trim()) {
      pushIssue(issues, 'SCHEMA_RULE_NAME', `decomposition.rules[${index}].name`, 'Each rule requires a non-empty string `name`.', 'error');
    }
  }

  for (const [index, directive] of skillDocument.decomposition.directives.entries()) {
    if (typeof directive.id !== 'string' || !directive.id.trim()) {
      pushIssue(issues, 'SCHEMA_DIRECTIVE_ID', `decomposition.directives[${index}].id`, 'Each directive requires a non-empty string `id`.', 'error');
    }
    if (typeof directive.name !== 'string' || !directive.name.trim()) {
      pushIssue(issues, 'SCHEMA_DIRECTIVE_NAME', `decomposition.directives[${index}].name`, 'Each directive requires a non-empty string `name`.', 'error');
    }
    if (typeof directive.directive_type !== 'string' || !directive.directive_type.trim()) {
      pushIssue(issues, 'SCHEMA_DIRECTIVE_TYPE', `decomposition.directives[${index}].directive_type`, 'Each directive requires a non-empty string `directive_type`.', 'error');
    }
  }

  if (skillDocument.execution_paths !== undefined) {
    if (!Array.isArray(skillDocument.execution_paths)) {
      pushIssue(issues, 'SCHEMA_EXECUTION_PATHS_ARRAY', 'execution_paths', '`execution_paths` must be an array when present.', 'error');
    } else {
      for (const [index, executionPath] of skillDocument.execution_paths.entries()) {
        if (typeof executionPath.id !== 'string' || !executionPath.id.trim()) {
          pushIssue(issues, 'SCHEMA_PATH_ID', `execution_paths[${index}].id`, 'Each execution path requires a non-empty string `id`.', 'error');
        }
        if (!Array.isArray(executionPath.steps)) {
          pushIssue(issues, 'SCHEMA_PATH_STEPS_ARRAY', `execution_paths[${index}].steps`, 'Each execution path requires a `steps` array.', 'error');
          continue;
        }
        for (const [stepIndex, step] of executionPath.steps.entries()) {
          if (typeof step !== 'string' || !step.trim()) {
            pushIssue(issues, 'SCHEMA_PATH_STEP', `execution_paths[${index}].steps[${stepIndex}]`, 'Execution path steps must be non-empty strings.', 'error');
          }
        }
      }
    }
  }

  return {
    issues,
    schemaLabel: 'standalone/skill-decomposition.schema.json',
    valid: !issues.some((issue) => issue.severity === 'error'),
  };
}
