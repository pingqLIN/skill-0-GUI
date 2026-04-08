import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BROWSER_REVIEW_URL || 'http://127.0.0.1:3006/';
const roundLabel = process.env.BROWSER_REVIEW_ROUND || 'round-1';
const outputDir = path.resolve('output/playwright', roundLabel);
const reportPath = path.resolve('output/review-notes', `${roundLabel}.json`);
const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';

const denseWorkspaceData = {
  projectId: 'review-density-demo',
  projectName: 'Review Density Demo Workspace',
  phases: [
    {
      id: 'A',
      name: 'Intake normalization',
      input: ['remote skill url', 'supporting bundle'],
      tasks: ['fetch remote definition', 'bucket supporting files', 'normalize parser input'],
      decisionNodes: [
        {
          id: 'A1',
          question: 'Is the source package complete?',
          rules: ['all required files detected'],
          threshold: '100%',
          outcomes: { yes: 'Proceed to parsing', no: 'Request missing bundle files' },
          evidence: 'supporting bundle contains policy, checklist, and command reference',
        },
      ],
      output: ['normalized intake package'],
    },
    {
      id: 'B',
      name: 'Parser projection review',
      input: ['normalized intake package'],
      tasks: ['extract decomposition', 'materialize execution paths', 'detect unresolved references'],
      decisionNodes: [
        {
          id: 'B1',
          question: 'Did the canonical parser complete?',
          rules: ['bridge mode is canonical', 'schema projection passed'],
          threshold: '100%',
          outcomes: { yes: 'Proceed to evidence review', no: 'Fallback only, do not approve' },
          evidence: 'bridge status reports canonical mode and valid schema payload',
        },
      ],
      output: ['parser projection', 'review evidence'],
    },
    {
      id: 'C',
      name: 'Reviewer gate',
      input: ['parser projection', 'review evidence'],
      tasks: ['confirm review status', 'check sign-off gates', 'prepare export package'],
      decisionNodes: [
        {
          id: 'C1',
          question: 'Can this workspace be exported?',
          rules: ['review status approved', 'all four gates closed'],
          threshold: '100%',
          outcomes: { yes: 'Export final packet', no: 'Keep draft state visible' },
          evidence: 'all reviewer checkpoints resolved and no blocking checks remain',
        },
      ],
      output: ['review packet', 'handoff artifacts'],
    },
  ],
  riskAssessment: {
    level: 'LOW',
    negativeIntent: 8,
    details: 'No active execution risk; warnings are limited to publish commands requiring reviewer confirmation.',
  },
  securityScan: {
    riskLevel: 'LOW',
    riskScore: 8,
    blocked: false,
    findings: [
      {
        ruleId: 'SEC-001',
        ruleName: 'Publish command requires gate review',
        originalSeverity: 'MEDIUM',
        adjustedSeverity: 'LOW',
        contextType: 'Skill command',
        lineNumber: 42,
        lineContent: 'npm run release:preview',
        description: 'Release preview command is visible and should remain gated behind reviewer sign-off.',
        adjustmentReason: 'Command is part of the review package, not auto-executed runtime code.',
        standardUrl: 'https://owasp.org',
        detectionStandard: 'OWASP Top 10',
      },
    ],
  },
  threeClassification: {
    category: 'Reviewer workflow',
    granularity: 'task',
    operability: 93,
  },
  globalMetrics: {
    deliveryTime: 1.8,
    decisionConfidence: 92,
    reworkRate: 11,
    goalAchievementRate: 97,
  },
  bridge: {
    mode: 'skill-0',
    skill0Root: '/home/miles/dev2/skill-0',
    draft_only: false,
  },
  reviewerSummary: {
    mode: 'canonical',
    reviewStatus: 'in_review',
    reviewerName: 'Miles',
    reviewerNotes: 'Need to reduce duplicate status surfaces and keep contextual evidence inside bounded zones.',
    operatorReminders: [
      'Keep parser mode visible while reducing repeated status chips.',
      'Avoid long scroll stacks inside the contextual drawer.',
    ],
  },
  parserResult: {
    meta: {
      parser_version: 'v2',
      schema_version: '2.4.0',
      skill_id: 'review-density-demo',
      title: 'Review Density Demo Workspace',
      name: 'Review Density Demo Workspace',
    },
    manifest: {
      analysis_level: 'bundle',
      unresolved_references_count: 1,
    },
    original_definition: {
      source: 'browser-density-review',
    },
    decomposition: {
      actions: [
        { id: 'a_001', name: 'Read bundle manifest', action_type: 'io_read' },
        { id: 'a_002', name: 'Inspect policy reference', action_type: 'inspect' },
        { id: 'a_003', name: 'Check release command', action_type: 'command_review' },
      ],
      rules: [
        { id: 'r_001', name: 'Require canonical parser', condition_type: 'review_gate', returns: 'boolean' },
        { id: 'r_002', name: 'Reject unresolved references', condition_type: 'review_gate', returns: 'boolean' },
      ],
      directives: [
        { id: 'd_001', name: 'Preserve evidence trail', directive_type: 'review' },
        { id: 'd_002', name: 'Hold export until approval', directive_type: 'release_gate' },
      ],
    },
    execution_paths: [
      { id: 'path_001', name: 'canonical review path', steps: ['a_001', 'r_001', 'a_002', 'r_002', 'a_003', 'd_002'] },
    ],
    supporting_files: [
      { path: 'demo/release-checklist.md', role: 'context' },
      { path: 'demo/policy.md', role: 'context' },
      { path: 'demo/runbook.md', role: 'context' },
    ],
    command_references: [
      { command: 'npm run build', source: 'demo/release-checklist.md' },
      { command: 'npm run release:preview', source: 'demo/runbook.md' },
    ],
    analysis_findings: [
      { id: 'finding_001', severity: 'warning', title: 'Unresolved reference in release bundle' },
      { id: 'finding_002', severity: 'info', title: 'Canonical bridge confirmed' },
    ],
  },
};

const workspaceDraft = {
  data: denseWorkspaceData,
  originalData: denseWorkspaceData,
  modifiedPaths: [],
  inputText: '# Review Density Demo Workspace',
  skillUrlInput: '',
  pendingUploadFiles: [],
  pendingPrimaryPath: null,
  supportFiles: [
    {
      name: 'release-checklist.md',
      path: 'demo/release-checklist.md',
      type: '.md',
      size: 184,
      role: 'context',
      source: 'upload',
      preview: '# Release Checklist',
      text: '# Release Checklist\n\n- Review status approved\n- Export gates confirmed\n',
    },
    {
      name: 'policy.md',
      path: 'demo/policy.md',
      type: '.md',
      size: 178,
      role: 'context',
      source: 'upload',
      preview: '# Review Policy',
      text: '# Review Policy\n\n- Keep parser mode visible\n- Do not approve unresolved references\n',
    },
  ],
  selectedContextPath: 'demo/release-checklist.md',
  updatedAt: '2026-04-08T12:00:00.000Z',
};

async function ensureOutput() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
}

async function capture(page, slug) {
  const filePath = path.join(outputDir, `${slug}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function getLayoutMetrics(page) {
  return page.evaluate(() => {
    const textOf = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const mainChildren = Array.from(document.querySelectorAll('main > *')).filter(visible);
    const largeBlocks = Array.from(document.querySelectorAll('section, header, div'))
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: textOf(element).slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.height >= 320)
      .slice(0, 20);

    const buttonTexts = Array.from(document.querySelectorAll('button'))
      .filter(visible)
      .map((button) => textOf(button))
      .filter(Boolean);

    const duplicateButtons = Object.entries(
      buttonTexts.reduce((acc, text) => {
        acc[text] = (acc[text] || 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 20);

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      bodyScrollHeight: document.body.scrollHeight,
      mainBlocks: mainChildren.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: textOf(element).slice(0, 120),
          height: Math.round(rect.height),
        };
      }),
      largeBlocks,
      duplicateButtons,
    };
  });
}

async function clickByText(page, candidates) {
  for (const candidate of candidates) {
    const locator = page.getByRole('button', { name: candidate }).first();
    if (await locator.count()) {
      await locator.click();
      return candidate;
    }
  }
  return null;
}

async function dumpButtonTexts(page, slug) {
  const buttonTexts = await page.locator('button').evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '')
      .filter(Boolean),
  );
  await fs.writeFile(path.join(outputDir, `${slug}-buttons.json`), JSON.stringify(buttonTexts, null, 2));
}

async function run() {
  await ensureOutput();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    colorScheme: 'light',
  });
  const page = await context.newPage();

  await page.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [WORKSPACE_DRAFT_STORAGE_KEY, workspaceDraft]);

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dumpButtonTexts(page, 'workspace');

  const report = {
    round: roundLabel,
    url: baseUrl,
    captures: {},
    metrics: {},
  };

  report.captures.workspace = await capture(page, 'workspace');
  report.metrics.workspace = await getLayoutMetrics(page);

  const collapseLabel = (await clickByText(page, ['Collapse toolbar', '收合工具列'])) ?? 'missing';
  await page.waitForTimeout(300);
  report.captures.toolbarCollapsed = await capture(page, 'toolbar-collapsed');
  report.metrics.toolbarCollapsed = await getLayoutMetrics(page);
  report.actions = { collapseLabel };

  await clickByText(page, ['Expand toolbar', '展開工具列']);
  await page.waitForTimeout(300);

  const viewButtons = [
    { slug: 'vector', labels: ['Vector semantics', '向量語義'] },
    { slug: 'matrix', labels: ['Compliance matrix', '合規矩陣'] },
  ];

  for (const view of viewButtons) {
    const clicked = await clickByText(page, view.labels);
    if (clicked) {
      await page.waitForTimeout(800);
      report.captures[view.slug] = await capture(page, view.slug);
      report.metrics[view.slug] = await getLayoutMetrics(page);
    }
  }

  await clickByText(page, ['Execution pipeline', '執行流程']);
  await page.waitForTimeout(600);

  const drawerTabs = [
    { slug: 'review-drawer', labels: ['Reviewer decision', 'Reviewer 決策'] },
    { slug: 'checks-drawer', labels: ['Details panel', '細節側欄'] },
    { slug: 'context-drawer', labels: ['Project summary', '專案摘要'] },
  ];

  for (const tab of drawerTabs) {
    const clicked = await clickByText(page, tab.labels);
    if (clicked) {
      await page.waitForTimeout(800);
      report.captures[tab.slug] = await capture(page, tab.slug);
      report.metrics[tab.slug] = await getLayoutMetrics(page);
    }
  }

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
