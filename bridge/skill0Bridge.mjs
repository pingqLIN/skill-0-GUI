import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_SKILL0_ROOTS = ['/home/miles/dev2/skill-0', '/home/miles/dev/projects/skill-0'];
const ACTION_VERBS = new Set([
  'create', 'read', 'write', 'generate', 'build', 'deploy', 'install',
  'run', 'execute', 'parse', 'convert', 'extract', 'transform', 'send',
  'fetch', 'load', 'save', 'import', 'export', 'compile', 'test',
  'validate', 'format', 'render', 'process', 'upload', 'download',
  'delete', 'update', 'merge', 'clone', 'push', 'pull', 'configure',
  'setup', 'initialize', 'start', 'stop', 'monitor', 'scan', 'analyze',
  'optimize', 'migrate', 'implement', 'define', 'register', 'publish',
  'subscribe', 'connect', 'disconnect', 'authenticate', 'authorize',
  'encrypt', 'decrypt', 'hash', 'sign', 'verify', 'package', 'bundle',
]);

const RULE_KEYWORDS = [
  'must', 'should', 'avoid', 'never', 'always', 'check', 'verify',
  'ensure', 'validate', 'require', 'prohibit', 'restrict', 'limit',
  'enforce', 'mandatory', 'forbidden', 'do not', "don't",
];

const DIRECTIVE_HEADING_KEYWORDS = [
  'best practice', 'principle', 'guideline', 'strategy', 'overview',
  'context', 'philosophy', 'standard', 'convention', 'pattern',
  'architecture', 'design', 'approach', 'methodology', 'recommendation',
];

const ACTION_TYPE_MAP = [
  [['read', 'load', 'fetch', 'import', 'parse', 'extract', 'get', 'scan', 'analyze', 'monitor'], 'io_read'],
  [['write', 'save', 'export', 'create', 'generate', 'output', 'publish', 'upload', 'send', 'push'], 'io_write'],
  [['transform', 'convert', 'format', 'process', 'modify', 'merge', 'optimize', 'migrate', 'refactor'], 'transform'],
  [['calculate', 'compute', 'analyze', 'evaluate', 'compare', 'hash', 'encrypt', 'decrypt'], 'compute'],
  [['api', 'call', 'request', 'connect', 'subscribe', 'authenticate', 'authorize'], 'external_call'],
  [['install', 'deploy', 'configure', 'setup', 'initialize', 'start', 'stop', 'update', 'delete', 'register', 'package', 'bundle'], 'state_change'],
  [['llm', 'ai', 'infer', 'prompt', 'chat'], 'llm_inference'],
  [['input', 'prompt', 'ask', 'wait', 'await'], 'await_input'],
];

const DIRECTIVE_TYPE_MAP = [
  [['complete', 'done', 'finish', 'success', 'result', 'output', 'deliver'], 'completion'],
  [['know', 'domain', 'reference', 'specification', 'standard', 'documentation', 'resource'], 'knowledge'],
  [['principle', 'philosophy', 'approach', 'clean', 'solid', 'dry', 'kiss', 'yagni'], 'principle'],
  [['constraint', 'limit', 'restrict', 'maximum', 'minimum', 'boundary', 'threshold'], 'constraint'],
  [['prefer', 'recommend', 'favor', 'default', 'convention', 'style'], 'preference'],
  [['strategy', 'pattern', 'method', 'technique', 'algorithm', 'workflow', 'process'], 'strategy'],
];

const PATHISH_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.mjs',
  '.py',
  '.sh',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const COMMAND_PREFIXES = [
  'npm ',
  'npx ',
  'pip ',
  'python ',
  'python3 ',
  'bash ',
  'sh ',
  'node ',
  'git ',
  'docker ',
  'curl ',
  'wget ',
  'rg ',
];

const PYTHON_BRIDGE = `
import json
import os
import sys
from pathlib import Path

root = Path(os.environ["SKILL0_PARSER_ROOT"])
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from scripts.auto_parse import parse_skill_md
from scripts.complex_skill_parser import parse_skill_manifest

payload = json.loads(sys.stdin.read())
if payload.get("entry_path"):
    result = parse_skill_manifest(
        payload["entry_path"],
        root_dir=payload.get("root_dir"),
        options=payload.get("options"),
    )
else:
    result = parse_skill_md(payload.get("skill_name", "uploaded-skill"), payload["text"])
print(json.dumps(result, ensure_ascii=False))
`;

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function resolveExplicitRoot(explicitRoot) {
  return explicitRoot || process.env.SKILL0_PARSER_ROOT || process.env.SKILL0_ROOT || '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inferRiskLevel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'SAFE';
}

function normalizeFindingSeverity(value) {
  const lowered = String(value || 'info').toLowerCase();
  if (lowered === 'critical') return 'CRITICAL';
  if (lowered === 'high') return 'HIGH';
  if (lowered === 'medium') return 'MEDIUM';
  if (lowered === 'low') return 'LOW';
  return 'INFO';
}

function severityWeight(value) {
  const normalized = normalizeFindingSeverity(value);
  if (normalized === 'CRITICAL') return 5;
  if (normalized === 'HIGH') return 4;
  if (normalized === 'MEDIUM') return 3;
  if (normalized === 'LOW') return 2;
  return 1;
}

function buildOperatorReminders({ parserResult, securityFindings, bridge, riskLevel }) {
  const manifest = parserResult?.manifest ?? null;
  const reminders = [];

  const highValueFindings = [...securityFindings]
    .sort((left, right) => severityWeight(right.adjustedSeverity) - severityWeight(left.adjustedSeverity))
    .slice(0, 3);

  for (const finding of highValueFindings) {
    reminders.push({
      id: `rem-${reminders.length + 1}`,
      level: normalizeFindingSeverity(finding.adjustedSeverity).toLowerCase(),
      label: finding.ruleName,
      detail: finding.description,
      action: finding.ruleId.startsWith('PARSER-')
        ? 'Review parser evidence before approving execution.'
        : 'Review scanner evidence before approving execution.',
    });
  }

  if (manifest?.unresolved_references_count > 0 && reminders.length < 3) {
    reminders.push({
      id: `rem-${reminders.length + 1}`,
      level: 'medium',
      label: `${manifest.unresolved_references_count} unresolved references`,
      detail: 'The skill bundle references files that were not resolved during analysis.',
      action: 'Resolve or explicitly waive missing references before relying on equivalence.',
    });
  }

  if ((manifest?.command_references_count ?? 0) > 0 && reminders.length < 3) {
    reminders.push({
      id: `rem-${reminders.length + 1}`,
      level: 'medium',
      label: `${manifest.command_references_count} authority-bearing commands`,
      detail: 'Command references can materially change what the skill is allowed to do.',
      action: 'Inspect command snippets and confirm the allowed execution scope.',
    });
  }

  if (bridge.mode === 'standalone' && reminders.length < 3) {
    reminders.push({
      id: `rem-${reminders.length + 1}`,
      level: riskLevel === 'HIGH' ? 'high' : 'medium',
      label: 'Fallback analysis mode',
      detail: 'Results were produced in standalone compatibility mode instead of the canonical skill-0 bridge.',
      action: 'Re-run with the canonical bridge before making a final equivalence decision.',
    });
  }

  return reminders.slice(0, 3);
}

function slugifySkillName(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uploaded-skill';
}

function titleCaseSkillName(name) {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { body: content, metadata: {} };
  }

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key) {
      metadata[key] = value;
    }
  }

  return {
    body: content.slice(match[0].length),
    metadata,
  };
}

function extractSections(body) {
  const sections = [];
  let current = { heading: '', items: [], level: 0 };

  for (const line of body.split('\n')) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (current.heading || current.items.length) {
        sections.push(current);
      }
      current = {
        heading: headingMatch[2].trim(),
        items: [],
        level: headingMatch[1].length,
      };
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*•]\s+/, '').trim();
      if (item.length > 10) {
        current.items.push(item);
      }
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('```') && trimmed.length > 30) {
      current.items.push(trimmed);
    }
  }

  if (current.heading || current.items.length) {
    sections.push(current);
  }

  return sections;
}

function extractCodeCommands(body) {
  const commands = [];
  let inCode = false;

  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }

    if (!inCode) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/^(npm|npx|pip|python|python3|git|docker|curl|cargo|go|dotnet|mvn|gradle)\s/.test(trimmed)) {
      commands.push(trimmed);
    }
  }

  return commands.slice(0, 5);
}

function classifyActionType(text) {
  const lowered = text.toLowerCase();
  for (const [keywords, actionType] of ACTION_TYPE_MAP) {
    if (keywords.some((keyword) => lowered.includes(keyword))) {
      return actionType;
    }
  }
  return 'transform';
}

function classifyDirectiveType(text) {
  const lowered = text.toLowerCase();
  for (const [keywords, directiveType] of DIRECTIVE_TYPE_MAP) {
    if (keywords.some((keyword) => lowered.includes(keyword))) {
      return directiveType;
    }
  }
  return 'knowledge';
}

function isRuleSentence(text) {
  const lowered = text.toLowerCase();
  return RULE_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function isActionSentence(text) {
  const lowered = text.toLowerCase();
  const words = lowered.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return false;
  }

  const firstWord = words[0].replace(/[^a-z]/g, '');
  return ACTION_VERBS.has(firstWord) || Array.from(ACTION_VERBS).some((verb) => lowered.includes(verb));
}

function deduplicate(items, key) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const value = String(item[key] ?? '').slice(0, 50).toLowerCase();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(item);
  }

  return result;
}

function summarizeDescription(body) {
  const paragraph = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 20 && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*'));

  return (paragraph || 'Standalone decomposition generated from the GUI fallback parser.').slice(0, 200);
}

function relativeToRoot(targetPath, rootDir) {
  try {
    return path.relative(rootDir, targetPath) || path.basename(targetPath);
  } catch {
    return targetPath;
  }
}

function looksLikeRelativePath(value) {
  if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/') || value.startsWith('#')) {
    return false;
  }
  if (value.includes(' ') && !value.includes('/') && !value.includes('\\')) {
    return false;
  }
  const suffix = path.extname(value).toLowerCase();
  return PATHISH_EXTENSIONS.has(suffix) || value.includes('/');
}

function extractMarkdownLinks(body) {
  return Array.from(body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g))
    .map((match) => match[1].trim())
    .filter((candidate) => looksLikeRelativePath(candidate));
}

function extractInlinePaths(body) {
  const withoutFences = body.replace(/```[\s\S]*?```/g, '');
  return Array.from(withoutFences.matchAll(/`([^`\n]+)`/g))
    .map((match) => match[1].trim())
    .filter((candidate) => looksLikeRelativePath(candidate));
}

function extractFrontmatterPaths(metadata) {
  return Object.values(metadata)
    .map((value) => String(value || '').trim())
    .filter((candidate) => looksLikeRelativePath(candidate));
}

function classifySupportingFileKind(filePath) {
  const lowered = filePath.toLowerCase();
  const suffix = path.extname(filePath).toLowerCase();
  if (lowered.includes('template') || suffix === '.tmpl') return 'template';
  if (lowered.includes('script') || ['.py', '.sh', '.mjs', '.js', '.ts'].includes(suffix)) return 'script';
  if (['.json', '.yaml', '.yml', '.toml'].includes(suffix)) return 'config';
  if (['.md', '.txt'].includes(suffix)) return 'reference';
  return 'unknown';
}

async function summarizeReferenceFile(filePath) {
  const suffix = path.extname(filePath).toLowerCase();
  if (!['.md', '.txt'].includes(suffix)) {
    return `${suffix || 'file'} reference`;
  }

  try {
    const body = await readFile(filePath, 'utf-8');
    for (const line of body.split('\n')) {
      const stripped = line.trim().replace(/^#+\s*/, '').trim();
      if (stripped) {
        return stripped.slice(0, 120);
      }
    }
  } catch {
    return `${suffix || 'file'} reference`;
  }

  return `${suffix || 'file'} reference`;
}

function detectShellFamily(command) {
  const first = (command.split(/\s+/)[0] || '').toLowerCase();
  if (['python', 'python3'].includes(first)) return 'python';
  if (['bash', 'sh'].includes(first)) return 'posix_shell';
  return first || 'shell';
}

function classifyAuthorityProfile(command) {
  const lowered = command.toLowerCase();
  if (['curl ', 'wget ', 'http://', 'https://'].some((token) => lowered.includes(token))) return 'network_call';
  if (['rm ', 'docker ', 'git push', 'npm install', 'pip install', 'chmod ', 'chown '].some((token) => lowered.includes(token))) return 'system_mutation';
  if (['python ', 'python3 ', 'bash ', 'sh ', 'node ', 'npx '].some((token) => lowered.includes(token))) return 'process_exec';
  if (['tee ', 'cp ', 'mv ', 'touch ', 'mkdir '].some((token) => lowered.includes(token))) return 'file_write';
  if (['rg ', 'cat ', 'ls ', 'find '].some((token) => lowered.includes(token))) return 'read_only';
  return 'unknown_authority';
}

function classifyCommandRisk(command, authorityProfile) {
  const lowered = command.toLowerCase();
  if (authorityProfile === 'system_mutation') return 'high';
  if (authorityProfile === 'network_call' || authorityProfile === 'process_exec') return 'medium';
  if (authorityProfile === 'file_write') return lowered.includes('--force') ? 'medium' : 'low';
  return 'low';
}

async function extractSupportingFiles({ entryPath, rootDir, metadata, body }) {
  const refs = [
    ...extractMarkdownLinks(body),
    ...extractInlinePaths(body),
    ...extractFrontmatterPaths(metadata),
  ];
  const deduped = Array.from(new Set(refs));
  const supportingFiles = [];
  const unresolvedRefs = [];

  for (const [index, ref] of deduped.entries()) {
    const resolvedPath = path.resolve(path.dirname(entryPath), ref);
    const exists = await pathExistsForHelpers(resolvedPath);
    if (!exists) {
      unresolvedRefs.push(ref);
    }
    supportingFiles.push({
      id: `sf_${String(index + 1).padStart(3, '0')}`,
      path: ref,
      kind: classifySupportingFileKind(ref),
      resolved: exists,
      referenced_by: [relativeToRoot(entryPath, rootDir)],
      summary: exists ? await summarizeReferenceFile(resolvedPath) : 'Referenced file could not be resolved',
    });
  }

  return { supportingFiles, unresolvedRefs };
}

function extractCommandReferences(body, sourcePath) {
  const commands = [];
  let inCode = false;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (!inCode || !trimmed) {
      continue;
    }
    if (!COMMAND_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      continue;
    }
    const authorityProfile = classifyAuthorityProfile(trimmed);
    commands.push({
      id: `cr_${String(commands.length + 1).padStart(3, '0')}`,
      source_path: sourcePath,
      command: trimmed,
      shell_family: detectShellFamily(trimmed),
      authority_profile: authorityProfile,
      risk_grade: classifyCommandRisk(trimmed, authorityProfile),
      resolved_from: sourcePath,
    });
  }

  return commands;
}

function extractDelegationNodes({ metadata, body, sourcePath }) {
  const nodes = [];
  const contextValue = String(metadata.context || '').trim().toLowerCase();
  if (contextValue === 'fork') {
    nodes.push({
      id: `dg_${String(nodes.length + 1).padStart(3, '0')}`,
      kind: 'fork_context',
      agent: null,
      source_path: sourcePath,
      resolved: true,
      notes: 'Frontmatter requested forked context execution.',
    });
  }

  const agentValue = String(metadata.agent || '').trim();
  if (agentValue) {
    nodes.push({
      id: `dg_${String(nodes.length + 1).padStart(3, '0')}`,
      kind: 'named_agent',
      agent: agentValue,
      source_path: sourcePath,
      resolved: true,
      notes: 'Frontmatter explicitly names an agent.',
    });
  }

  if (/\b(subagent|delegate|delegation)\b/i.test(body)) {
    nodes.push({
      id: `dg_${String(nodes.length + 1).padStart(3, '0')}`,
      kind: 'subagent_reference',
      agent: agentValue || null,
      source_path: sourcePath,
      resolved: true,
      notes: 'Body text contains delegation instructions.',
    });
  }

  return nodes;
}

function buildAnalysisFindings({ supportingFiles, unresolvedRefs, commandReferences, delegationNodes }) {
  const findings = [];

  for (const ref of unresolvedRefs) {
    findings.push({
      finding_id: `fd_${String(findings.length + 1).padStart(3, '0')}`,
      title: `Unresolved reference: ${ref}`,
      category: 'reference_integrity',
      severity: 'medium',
      confidence: 'high',
      affected_paths: [ref],
      evidence: [{
        kind: 'missing_reference',
        source_path: ref,
        excerpt: ref,
        explanation: 'The referenced file could not be resolved from the entry skill.',
      }],
      recommended_action: 'resolve_reference',
    });
  }

  for (const command of commandReferences) {
    if (!['medium', 'high'].includes(command.risk_grade)) {
      continue;
    }
    findings.push({
      finding_id: `fd_${String(findings.length + 1).padStart(3, '0')}`,
      title: `Authority-bearing command: ${command.command.slice(0, 60)}`,
      category: 'execution_authority',
      severity: command.risk_grade === 'high' ? 'high' : 'medium',
      confidence: 'high',
      affected_paths: [command.source_path],
      evidence: [{
        kind: 'command_snippet',
        source_path: command.source_path,
        excerpt: command.command,
        explanation: `Command classified as ${command.authority_profile}.`,
      }],
      recommended_action: 'review_before_run',
    });
  }

  if (delegationNodes.length) {
    findings.push({
      finding_id: `fd_${String(findings.length + 1).padStart(3, '0')}`,
      title: 'Delegation path present',
      category: 'control_flow',
      severity: 'info',
      confidence: 'high',
      affected_paths: delegationNodes.map((node) => node.source_path),
      evidence: delegationNodes.map((node) => ({
        kind: 'delegation_signal',
        source_path: node.source_path,
        excerpt: node.notes,
        explanation: node.kind,
      })),
      recommended_action: 'confirm_scope',
    });
  }

  if (supportingFiles.length && supportingFiles.every((item) => !item.resolved)) {
    findings.push({
      finding_id: `fd_${String(findings.length + 1).padStart(3, '0')}`,
      title: 'All supporting references are unresolved',
      category: 'hidden_dependency',
      severity: 'medium',
      confidence: 'medium',
      affected_paths: supportingFiles.map((item) => item.path),
      evidence: supportingFiles.map((item) => ({
        kind: 'missing_reference',
        source_path: item.path,
        excerpt: item.path,
        explanation: 'The parser could not resolve any supporting file.',
      })),
      recommended_action: 'document_dependency',
    });
  }

  return findings;
}

async function augmentParserResultWithManifest(parserResult, { entryPath, rootDir, body, metadata }) {
  const sourcePath = relativeToRoot(entryPath, rootDir);
  const { supportingFiles, unresolvedRefs } = await extractSupportingFiles({
    body,
    entryPath,
    metadata,
    rootDir,
  });
  const commandReferences = extractCommandReferences(body, sourcePath);
  const delegationNodes = extractDelegationNodes({ metadata, body, sourcePath });
  const analysisFindings = buildAnalysisFindings({
    supportingFiles,
    unresolvedRefs,
    commandReferences,
    delegationNodes,
  });

  return {
    ...parserResult,
    manifest: {
      entry_skill: {
        path: sourcePath,
        name: metadata.name || parserResult?.meta?.name || path.basename(path.dirname(entryPath)),
        resolved: true,
      },
      analysis_level: 'manifest',
      supporting_files_count: supportingFiles.length,
      command_references_count: commandReferences.length,
      delegation_nodes_count: delegationNodes.length,
      unresolved_references_count: unresolvedRefs.length,
    },
    supporting_files: supportingFiles,
    command_references: commandReferences,
    delegation_nodes: delegationNodes,
    analysis_findings: analysisFindings,
    parser_meta: {
      analysis_level: 'manifest',
      entry_path: sourcePath,
      experimental_fields: [
        'manifest',
        'supporting_files',
        'command_references',
        'delegation_nodes',
        'analysis_findings',
      ],
      manifest_present: true,
      resolved_reference_count: supportingFiles.filter((item) => item.resolved).length,
      unresolved_reference_count: unresolvedRefs.length,
      target_schema_version: '2.5.0-draft',
      ...(parserResult?.parser_meta || {}),
    },
  };
}

async function pathExistsForHelpers(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createVirtualSkillPackage({ text, primaryPath, contextFiles }) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'skill0-gui-'));
  const entryRelativePath = normalizeRelativePath(primaryPath || 'SKILL.md');
  const entryPath = path.join(tempRoot, entryRelativePath);

  await mkdir(path.dirname(entryPath), { recursive: true });
  await writeFile(entryPath, text, 'utf-8');

  for (const file of contextFiles) {
    const relativePath = normalizeRelativePath(String(file.path || file.name || 'context.txt'));
    const targetPath = path.join(tempRoot, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, String(file.text || ''), 'utf-8');
  }

  return {
    cleanup: async () => {
      await rm(tempRoot, { force: true, recursive: true });
    },
    entryPath,
    rootDir: tempRoot,
  };
}

function normalizeRelativePath(value) {
  const normalized = String(value || 'SKILL.md').replace(/\\/g, '/').replace(/^\/+/, '');
  const cleanSegments = normalized
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return cleanSegments.join('/') || 'SKILL.md';
}

async function buildStandaloneManifestParserResult({
  entryPath,
  reason,
  rootDir,
  schemaPath,
  skillName,
  source,
  text,
}) {
  const parserResult = buildStandaloneParserResult({
    reason,
    schemaPath,
    skillName,
    source,
    text,
  });
  const fileBody = await readFile(entryPath, 'utf-8');
  const { body, metadata } = parseFrontmatter(fileBody);
  return await augmentParserResultWithManifest(parserResult, {
    body,
    entryPath,
    metadata,
    rootDir,
  });
}

function buildStandaloneParserResult({ schemaPath, skillName, source, text, reason }) {
  const normalizedSkillName = slugifySkillName(skillName);
  const { body, metadata } = parseFrontmatter(text);
  const sections = extractSections(body);
  const codeCommands = extractCodeCommands(body);

  const actions = [];
  const rules = [];
  const directives = [];

  for (const command of codeCommands) {
    const verb = command.split(/\s+/)[0] || 'run';
    actions.push({
      action_type: classifyActionType(command),
      description: command.slice(0, 100),
      name: `Run ${verb}`,
    });
  }

  for (const section of sections) {
    const headingLower = section.heading.toLowerCase();
    const isDirectiveSection = DIRECTIVE_HEADING_KEYWORDS.some((keyword) => headingLower.includes(keyword));

    for (const item of section.items) {
      const cleaned = item
        .replace(/[❌✅🔴🟡🟢⚠️💡🎯📌]/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .trim();

      if (cleaned.length < 15) {
        continue;
      }

      if (isRuleSentence(cleaned) && !isDirectiveSection) {
        rules.push({
          condition: headingLower.slice(0, 80) || 'general',
          description: cleaned.slice(0, 150),
          output: 'proceed_or_halt',
        });
        continue;
      }

      if (isActionSentence(cleaned) && !isDirectiveSection) {
        actions.push({
          action_type: classifyActionType(cleaned),
          description: cleaned.slice(0, 150),
          name: cleaned.slice(0, 60),
        });
        continue;
      }

      if (isDirectiveSection || cleaned.length > 50) {
        directives.push({
          decomposable: false,
          description: cleaned.slice(0, 150),
          directive_type: classifyDirectiveType(cleaned),
        });
      }
    }
  }

  const finalActions = deduplicate(actions, 'name').slice(0, 15).map((action, index) => ({
    ...action,
    deterministic: action.deterministic ?? true,
    id: `a_${String(index + 1).padStart(3, '0')}`,
    side_effects: action.side_effects ?? [],
  }));

  const finalRules = deduplicate(rules, 'description').slice(0, 10).map((rule, index) => ({
    ...rule,
    id: `r_${String(index + 1).padStart(3, '0')}`,
  }));

  const finalDirectives = deduplicate(directives, 'description').slice(0, 10).map((directive, index) => ({
    ...directive,
    id: `d_${String(index + 1).padStart(3, '0')}`,
  }));

  const description = (metadata.description || summarizeDescription(body)).slice(0, 200);
  const title = metadata.title || `${titleCaseSkillName(normalizedSkillName)} Skill`;

  return {
    $schema: schemaPath,
    decomposition: {
      actions: finalActions,
      directives: finalDirectives,
      rules: finalRules,
    },
    meta: {
      description,
      name: metadata.name || normalizedSkillName,
      parsed_by: 'skill-0-review-studio-standalone',
      parse_timestamp: new Date().toISOString(),
      parser_version: 'skill-0-review-studio standalone v1',
      schema_version: '2.4.0',
      skill_id: `claude__${normalizedSkillName}`,
      skill_layer: 'claude_skill',
      title,
    },
    original_definition: {
      fallback_reason: reason,
      skill_description: description,
      skill_name: metadata.name || normalizedSkillName,
      source,
    },
  };
}

function transformParserResult(parserResult, bridge) {
  const actions = parserResult?.decomposition?.actions ?? [];
  const rules = parserResult?.decomposition?.rules ?? [];
  const directives = parserResult?.decomposition?.directives ?? [];
  const meta = parserResult?.meta ?? {};
  const original = parserResult?.original_definition ?? {};
  const manifest = parserResult?.manifest ?? null;
  const parserFindings = (parserResult?.analysis_findings ?? []).map((finding, index) => {
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [];
    const firstEvidence = evidence[0] ?? {};
    const severity = normalizeFindingSeverity(finding.severity);
    return {
      ruleId: `PARSER-${String(index + 1).padStart(3, '0')}`,
      ruleName: finding.title,
      originalSeverity: severity,
      adjustedSeverity: severity,
      contextType: finding.category || 'parser',
      lineNumber: index + 1,
      lineContent: firstEvidence.excerpt || (finding.affected_paths ?? []).join(', ') || finding.title,
      description: [
        finding.recommended_action ? `Recommended action: ${finding.recommended_action}.` : null,
        ...evidence.map((item) => item.explanation).filter(Boolean),
      ].filter(Boolean).join(' ') || 'Evidence-backed parser finding.',
      adjustmentReason: 'Severity reflects parser-side structural analysis.',
      standardUrl: 'https://github.com/pingqLIN/skill-0/blob/main/docs/schema-extension-design-complex-skills-2026-03-24.md',
      detectionStandard: 'Skill-0 parser finding',
    };
  });

  const externalCalls = actions.filter((action) => action.action_type === 'external_call').length;
  const nonDeterministic = actions.filter((action) => action.deterministic === false).length;
  const blockingRules = rules.filter((rule) => ['abort', 'retry'].includes(rule.fail_action)).length;
  const strategicDirectives = directives.filter((directive) => directive.decomposable).length;

  const negativeIntent = clamp((externalCalls * 9) + (nonDeterministic * 8) + (blockingRules * 6), 4, 88);
  const riskLevel = inferRiskLevel(negativeIntent);
  const operability = clamp(68 + (actions.length * 2) + (rules.length * 3) - (nonDeterministic * 4), 32, 98);
  const confidence = clamp(74 + (rules.length * 4) + (directives.length * 2), 45, 98);
  const reworkRate = clamp(6 + (nonDeterministic * 6) + (strategicDirectives * 3), 4, 48);
  const goalAchievementRate = clamp(78 + (actions.length * 2) + strategicDirectives, 55, 99);
  const category = directives[0]?.directive_type || actions[0]?.action_type || 'skill_decomposition';

  const ruleDecisionNodes = rules.map((rule, index) => ({
    id: rule.id || `C${index + 1}`,
    question: rule.name || rule.description || `Rule ${index + 1}`,
    rules: [rule.condition_expression || rule.condition || 'evaluate condition'],
    threshold: rule.condition_expression || rule.condition || rule.returns || 'boolean',
    outcomes: {
      yes: 'retain decomposition path',
      no: rule.fail_action || 'review',
    },
    evidence: `${rule.condition_type || 'rule'} • ${rule.condition_expression || rule.condition || ''}`.trim(),
  }));

  const directivePhaseTasks = directives.length
    ? directives.map((directive) => `${directive.name || directive.directive_type}: ${directive.description}`)
    : ['No directives extracted'];

  const structuralSignals = manifest
    ? `${manifest.supporting_files_count || 0} refs · ${manifest.command_references_count || 0} commands · ${manifest.unresolved_references_count || 0} unresolved`
    : 'single-file parse';

  const securityFindings = [
    ...parserFindings,
    ...(bridge.error ? [{
      adjustedSeverity: bridge.mode === 'standalone' ? 'MEDIUM' : 'LOW',
      adjustmentReason: 'Bridge fallback notice.',
      contextType: 'bridge',
      description: bridge.error,
      detectionStandard: 'Bridge runtime',
      lineContent: bridge.error,
      lineNumber: 0,
      originalSeverity: bridge.mode === 'standalone' ? 'MEDIUM' : 'LOW',
      ruleId: 'BRIDGE-001',
      ruleName: 'Primary bridge unavailable',
      standardUrl: 'https://github.com/pingqLIN/skill-0-review-studio',
    }] : []),
  ];
  const operatorReminders = buildOperatorReminders({
    bridge,
    parserResult,
    riskLevel,
    securityFindings,
  });

  return {
    bridge,
    globalMetrics: {
      deliveryTime: Number((1.2 + (actions.length * 0.08) + (rules.length * 0.05)).toFixed(1)),
      decisionConfidence: confidence,
      goalAchievementRate,
      reworkRate,
    },
    parserResult,
    phases: [
      {
        decisionNodes: [],
        id: 'A',
        input: ['uploaded_skill_md'],
        name: 'Source Intake',
        output: ['source_context'],
        tasks: [original.source || 'manual upload', meta.name || 'unnamed skill', original.skill_description || 'no description'],
      },
      {
        decisionNodes: [],
        id: 'B',
        input: ['source_context'],
        name: 'Action Decomposition',
        output: ['action_graph'],
        tasks: actions.length ? actions.map((action) => `${action.id} · ${action.name}`) : ['No actions extracted'],
      },
      {
        decisionNodes: ruleDecisionNodes.length ? ruleDecisionNodes : [{
          id: 'C0',
          question: 'Are parser rules present?',
          rules: ['rules.length > 0'],
          threshold: '>= 1',
          outcomes: { yes: 'continue', no: 'review skill wording' },
          evidence: 'No rules extracted from parser output.',
        }],
        id: 'C',
        input: ['action_graph'],
        name: 'Rule Evaluation',
        output: ['rule_matrix'],
        tasks: rules.length ? rules.map((rule) => `${rule.id} · ${rule.name || rule.condition_expression || rule.description}`) : ['No rules extracted'],
      },
      {
        decisionNodes: [],
        id: 'D',
        input: ['rule_matrix'],
        name: 'Directive Mapping',
        output: ['directive_map'],
        tasks: directivePhaseTasks,
      },
      {
        decisionNodes: [],
        id: 'E',
        input: ['directive_map'],
        name: 'Trace Assembly',
        output: ['trace_bundle'],
        tasks: [
          `schema ${meta.schema_version || 'unknown'}`,
          `parser ${meta.parser_version || 'unknown'}`,
          `source ${original.source || 'uploaded skill'}`,
          `bridge ${bridge.mode}`,
          `signals ${structuralSignals}`,
        ],
      },
      {
        decisionNodes: [],
        id: 'F',
        input: ['trace_bundle'],
        name: 'Delivery Snapshot',
        output: ['skill_decomposition_json'],
        tasks: [
          `${actions.length} actions`,
          `${rules.length} rules`,
          `${directives.length} directives`,
          'export aligned skill decomposition',
        ],
      },
    ],
    projectId: meta.skill_id || `skill-0-${Date.now()}`,
    projectName: meta.title || meta.name || 'Skill-0 Parsed Skill',
    reviewerSummary: {
      operatorReminders,
    },
    riskAssessment: {
      details: `Parser mode ${bridge.mode} extracted ${actions.length} actions, ${rules.length} rules, ${directives.length} directives from the submitted skill definition. Structural signals: ${structuralSignals}. Parser findings: ${parserFindings.length}.`,
      level: riskLevel,
      negativeIntent,
    },
    securityScan: {
      blocked: false,
      findings: securityFindings,
      riskLevel,
      riskScore: negativeIntent,
    },
    threeClassification: {
      category,
      granularity: actions.length > 8 || directives.length > 6 ? 'Composite' : 'Atomic',
      operability,
    },
  };
}

function pythonExecArgs() {
  if (process.platform === 'win32') {
    return {
      args: ['python3', '-c', PYTHON_BRIDGE],
      command: 'wsl.exe',
    };
  }

  return {
    args: ['-c', PYTHON_BRIDGE],
    command: 'python3',
  };
}

function runSkill0Parser(text, skillName, skill0Root) {
  return new Promise((resolve, reject) => {
    const { args, command } = pythonExecArgs();
    const child = spawn(command, args, {
      env: {
        ...process.env,
        SKILL0_PARSER_ROOT: skill0Root,
        SKILL0_ROOT: process.env.SKILL0_ROOT || skill0Root,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `skill-0 parser exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Failed to parse skill-0 JSON output: ${String(error)}\n${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify({ text, skill_name: skillName }));
    child.stdin.end();
  });
}

function runSkill0ManifestParser({ entryPath, rootDir, skill0Root }) {
  return new Promise((resolve, reject) => {
    const { args, command } = pythonExecArgs();
    const child = spawn(command, args, {
      env: {
        ...process.env,
        SKILL0_PARSER_ROOT: skill0Root,
        SKILL0_ROOT: process.env.SKILL0_ROOT || skill0Root,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `skill-0 manifest parser exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Failed to parse skill-0 manifest JSON output: ${String(error)}\n${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify({
      entry_path: entryPath,
      root_dir: rootDir,
    }));
    child.stdin.end();
  });
}

export function createSkill0Bridge({ explicitRoot = '', mode = 'auto', projectRoot }) {
  const standaloneExampleSkillPath = path.resolve(projectRoot, 'standalone/example-skill.md');
  const standaloneSchemaPath = './standalone/skill-decomposition.schema.json';

  async function pathExists(targetPath) {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  function uniqueRoots() {
    return Array.from(
      new Set([resolveExplicitRoot(explicitRoot), ...DEFAULT_SKILL0_ROOTS].filter(Boolean)),
    );
  }

  async function resolveSkill0Root() {
    if (mode === 'standalone') {
      return null;
    }

    for (const root of uniqueRoots()) {
      const parserPath = path.join(root, 'scripts', 'auto_parse.py');
      if (await pathExists(parserPath)) {
        return root;
      }
    }
    return null;
  }

  async function getBridgeStatus() {
    const skill0Root = await resolveSkill0Root();
    return {
      mode: skill0Root ? 'skill-0' : 'standalone',
      skill0Root,
    };
  }

  async function getExampleSkill() {
    const skill0Root = await resolveSkill0Root();
    if (skill0Root) {
      const exampleSkillPath = path.join(skill0Root, 'converted-skills', 'reactjs', 'SKILL.md');
      if (await pathExists(exampleSkillPath)) {
        return {
          mode: 'skill-0',
          name: 'reactjs',
          skill0Root,
          source: exampleSkillPath,
          text: await readFile(exampleSkillPath, 'utf-8'),
        };
      }
    }

    return {
      mode: 'standalone',
      name: 'standalone-sample',
      skill0Root: null,
      source: standaloneExampleSkillPath,
      text: await readFile(standaloneExampleSkillPath, 'utf-8'),
    };
  }

  async function parseSkill(text, skillName, options = {}) {
    const normalizedSkillName = slugifySkillName(skillName);
    const skill0Root = await resolveSkill0Root();
    const contextFiles = Array.isArray(options.contextFiles) ? options.contextFiles : [];
    const primaryPath = typeof options.primaryPath === 'string' && options.primaryPath.trim()
      ? options.primaryPath.trim()
      : null;
    const packageMode = contextFiles.length > 0 || Boolean(primaryPath);

    let virtualPackage = null;
    if (packageMode) {
      virtualPackage = await createVirtualSkillPackage({
        contextFiles,
        primaryPath,
        text,
      });
    }

    if (skill0Root) {
      try {
        const parserResult = virtualPackage
          ? await runSkill0ManifestParser({
              entryPath: virtualPackage.entryPath,
              rootDir: virtualPackage.rootDir,
              skill0Root,
            })
          : await runSkill0Parser(text, normalizedSkillName, skill0Root);
        return transformParserResult(parserResult, {
          mode: 'skill-0',
          skill0Root,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown skill-0 parser bridge error';
        const parserResult = virtualPackage
          ? await buildStandaloneManifestParserResult({
              entryPath: virtualPackage.entryPath,
              reason: message,
              rootDir: virtualPackage.rootDir,
              schemaPath: standaloneSchemaPath,
              skillName: normalizedSkillName,
              source: 'standalone/fallback',
              text,
            })
          : buildStandaloneParserResult({
              reason: message,
              schemaPath: standaloneSchemaPath,
              skillName: normalizedSkillName,
              source: 'standalone/fallback',
              text,
            });

        return transformParserResult(parserResult, {
          error: message,
          mode: 'standalone',
          skill0Root,
        });
      } finally {
        await virtualPackage?.cleanup?.();
      }
    }

    try {
      const parserResult = virtualPackage
        ? await buildStandaloneManifestParserResult({
            entryPath: virtualPackage.entryPath,
            reason: mode === 'standalone'
              ? 'Bridge mode was forced to standalone.'
              : 'No compatible skill-0 repository was found.',
            rootDir: virtualPackage.rootDir,
            schemaPath: standaloneSchemaPath,
            skillName: normalizedSkillName,
            source: 'standalone/local',
            text,
          })
        : buildStandaloneParserResult({
            reason: mode === 'standalone'
              ? 'Bridge mode was forced to standalone.'
              : 'No compatible skill-0 repository was found.',
            schemaPath: standaloneSchemaPath,
            skillName: normalizedSkillName,
            source: 'standalone/local',
            text,
          });

      return transformParserResult(parserResult, {
        error: mode === 'standalone'
          ? 'Bridge mode was forced to standalone. Using the bundled standalone parser.'
          : 'No compatible skill-0 repository was found. Using the bundled standalone parser.',
        mode: 'standalone',
        skill0Root: null,
      });
    } finally {
      await virtualPackage?.cleanup?.();
    }
  }

  return {
    getBridgeStatus,
    getExampleSkill,
    parseSkill,
  };
}
