import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { chromium } from 'playwright';
import { resolveBrowserReviewUrl } from './browser_review_url.mjs';

const roundLabel = process.env.BROWSER_EDITOR_REVIEW_ROUND || 'editor-round-1';
const outputDir = path.resolve('output/playwright', roundLabel);
const reportPath = path.resolve('output/review-notes', `${roundLabel}.json`);
const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';
const REVIEW_DRAFT_STORAGE_KEY = 'skill-0-review-studio.review-draft.v1:editor-verification-demo';
const workspaceData = {
  projectId: 'editor-verification-demo',
  projectName: 'Editor Verification Workspace',
  phases: [
    {
      id: 'A',
      name: 'Intake normalization',
      input: ['remote skill url'],
      tasks: ['normalize parser input', 'attach support files'],
      output: ['normalized intake package'],
      decisionNodes: [
        {
          id: 'A1',
          question: 'Is the source bundle complete?',
          threshold: '100%',
          outcomes: { yes: 'Continue', no: 'Block review' },
        },
      ],
    },
  ],
  riskAssessment: {
    level: 'LOW',
    negativeIntent: 4,
    details: 'Edit verification demo workspace.',
  },
  securityScan: {
    riskLevel: 'LOW',
    riskScore: 4,
    blocked: false,
    findings: [],
  },
  threeClassification: {
    category: 'Verification workflow',
    granularity: 'task',
    operability: 91,
  },
  globalMetrics: {
    deliveryTime: 1.3,
    decisionConfidence: 88,
    reworkRate: 9,
    goalAchievementRate: 96,
  },
  bridge: {
    mode: 'skill-0',
    skill0Root: '/home/miles/dev2/skill-0',
    draft_only: false,
  },
  reviewerSummary: {
    mode: 'canonical',
    reviewStatus: 'approved',
    reviewerName: 'Miles',
    reviewerNotes: 'Editor flow should be deterministic and traceable.',
    operatorReminders: ['Verify edits through diff and export packet.'],
  },
  parserResult: {
    meta: {
      parser_version: 'v2',
      schema_version: '2.4.0',
      skill_id: 'editor-verification-demo',
      title: 'Editor Verification Workspace',
      name: 'Editor Verification Workspace',
      description: 'Editor verification baseline document.',
    },
    manifest: {
      analysis_level: 'bundle',
      unresolved_references_count: 0,
    },
    original_definition: {
      source: 'browser-editor-review',
    },
    decomposition: {
      actions: [
        {
          id: 'a_001',
          name: 'Read bundle manifest',
          action_type: 'io_read',
          description: 'Inspect the bundle manifest before review.',
        },
      ],
      rules: [
        {
          id: 'r_001',
          name: 'Require canonical parser',
          condition_type: 'review_gate',
          condition_expression: 'bridge.mode === "skill-0"',
          returns: 'boolean',
        },
      ],
      directives: [
        {
          id: 'd_001',
          name: 'Preserve evidence trail',
          directive_type: 'review',
          description: 'Keep evidence visible during editing.',
        },
      ],
    },
    execution_paths: [
      {
        id: 'path_001',
        name: 'default review path',
        steps: ['a_001', 'r_001', 'd_001'],
      },
    ],
    supporting_files: [
      { path: 'demo/editor-checklist.md', role: 'context' },
    ],
    command_references: [
      { command: 'npm run build', source: 'demo/editor-checklist.md' },
    ],
    analysis_findings: [],
  },
};

const workspaceDraft = {
  data: workspaceData,
  originalData: workspaceData,
  modifiedPaths: [],
  inputText: '# Editor Verification Workspace',
  skillUrlInput: '',
  pendingUploadFiles: [],
  pendingPrimaryPath: null,
  supportFiles: [
    {
      name: 'editor-checklist.md',
      path: 'demo/editor-checklist.md',
      type: '.md',
      size: 128,
      role: 'context',
      source: 'upload',
      preview: '# Editor Checklist',
      text: '# Editor Checklist\n\n- Verify edit diff\n- Verify export packet\n',
    },
  ],
  selectedContextPath: 'demo/editor-checklist.md',
  updatedAt: '2026-04-08T14:00:00.000Z',
};

const reviewDraft = {
  validationRuns: [],
  consistencyRuns: [],
  pathTestRuns: [],
  globalNotes: [],
  elementNotes: [],
  noteTarget: 'global',
  reviewStatus: 'approved',
  reviewerName: 'Miles',
  reviewerNotes: 'Editor flow should be deterministic and traceable.',
  reviewSummaryDraft: 'Approved for verification export.',
  reviewerSignoff: 'qa-editor',
  reviewChecklist: {
    modeConfirmed: true,
    validationReviewed: true,
    diffReviewed: true,
    evidenceReady: true,
  },
  updatedAt: '2026-04-08T14:00:00.000Z',
  decisionLog: [
    {
      id: 'decision-1',
      timestamp: '2026-04-08T14:00:00.000Z',
      action: 'approved',
      summary: 'Workspace seeded in approved state for export verification.',
    },
  ],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureOutput() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
}

async function capture(page, slug) {
  const filePath = path.join(outputDir, `${slug}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

function logStep(label) {
  console.log(`[editor-review] ${label}`);
}

async function expandToolbar(page) {
  const expandButton = page.getByRole('button', { name: /Expand toolbar/i });
  if (await expandButton.count()) {
    await expandButton.click();
  }
}

async function isLocatorVisible(locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function openActionTray(page) {
  await expandToolbar(page);
  const actionTrayButton = page.getByTestId('top-toolbar-actions-trigger');
  const trayAction = page.getByTestId('top-toolbar-actions-menu');

  if (!(await isLocatorVisible(trayAction))) {
    await actionTrayButton.scrollIntoViewIfNeeded();
    await actionTrayButton.click({ force: true });
    await trayAction.waitFor({ state: 'visible' });
  }
}

async function clickActionTrayButton(page, name) {
  await openActionTray(page);
  const button = typeof name === 'string' ? page.getByTestId(name) : page.getByRole('button', { name });
  await button.waitFor({ state: 'visible' });
  await button.evaluate((node) => node.click());
}

async function openEditorShortcut(page, shortcutTestId) {
  const dialog = page.getByTestId('side-editor-dialog');
  await expandToolbar(page);
  const button = page.getByTestId(shortcutTestId);
  await button.waitFor({ state: 'visible' });
  await button.click();
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2500 });
    return;
  } catch {
    await capture(page, `editor-${shortcutTestId.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-retry-state`);
    const debugState = await page.evaluate(() => ({
      actionTriggerCount: document.querySelectorAll('[data-testid="top-toolbar-actions-trigger"]').length,
      bodyTextLength: document.body?.innerText?.length ?? 0,
      dialogCount: document.querySelectorAll('[data-testid="side-editor-dialog"]').length,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      url: window.location.href,
    }));
    console.log('[editor-review] retry debug state', JSON.stringify(debugState));
    logStep(`retry opening editor for ${shortcutTestId}`);
  }

  await button.waitFor({ state: 'visible' });
  await button.waitFor({ state: 'visible' });
  await button.evaluate((node) => node.click());
  await dialog.waitFor({ state: 'visible' });
}

async function closeReviewDrawerIfOpen(page) {
  const drawer = page.locator('.review-bottom-drawer');
  if (await drawer.count() && await drawer.first().isVisible()) {
    await page.locator('.review-bottom-toolbar button').first().click();
  }
}

async function exportReviewPacket(page, slug) {
  const exportShortcut = page.getByTestId('top-toolbar-export-review-packet-shortcut');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (await isLocatorVisible(exportShortcut))
      ? exportShortcut.click()
      : (async () => {
          await openActionTray(page);
          await page.getByTestId('top-toolbar-export-review-packet').click({ force: true });
        })(),
  ]);
  const downloadPath = path.join(outputDir, `${slug}.json`);
  await download.saveAs(downloadPath);
  const packetText = await fs.readFile(downloadPath, 'utf8');
  return {
    downloadPath,
    packet: JSON.parse(packetText),
  };
}

async function openDiffComparison(page) {
  await page.getByRole('button', { name: /Compare changes/i }).click();
  await page.locator('h3').filter({ hasText: /Diff summary/i }).first().waitFor();
}

async function openAnalysisSubview(page) {
  const analysisButton = page.getByTestId('pipeline-subview-analysis');
  await analysisButton.waitFor({ state: 'visible' });
  await analysisButton.click();
  await page.getByTestId('pipeline-section-content-analysis').waitFor({ state: 'visible' });
}

function workspaceTitle(page, value) {
  return page.locator('h2.display-serif').filter({ hasText: value }).first();
}

async function run() {
  await ensureOutput();
  const baseUrl = await resolveBrowserReviewUrl();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    console.error('[editor-review][pageerror]', error);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error('[editor-review][console-error]', message.text());
    }
  });
  await page.addInitScript(([workspaceDraftStorageKey, reviewDraftStorageKey, workspaceDraftState, reviewDraftState]) => {
    window.localStorage.setItem(workspaceDraftStorageKey, JSON.stringify(workspaceDraftState));
    window.localStorage.setItem(reviewDraftStorageKey, JSON.stringify(reviewDraftState));
  }, [WORKSPACE_DRAFT_STORAGE_KEY, REVIEW_DRAFT_STORAGE_KEY, workspaceDraft, reviewDraft]);

  const report = {
    round: roundLabel,
    url: baseUrl,
    captures: {},
    assertions: [],
  };

  try {
    logStep('open workspace');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await openAnalysisSubview(page);

    await workspaceTitle(page, 'Editor Verification Workspace').waitFor();
    report.captures.initial = await capture(page, 'editor-workspace-initial');

    const reviewDecisionPanelBefore = await page.getByTestId('review-decision-panel').textContent();

    logStep('run global edit');
    await workspaceTitle(page, 'Editor Verification Workspace').click();
    await page.getByTestId('side-editor-dialog').waitFor();
    await page.locator('[data-testid="side-editor-dialog"] input').first().fill('Editor Verification Workspace Renamed');
    await page.getByTestId('side-editor-save').click();
    await workspaceTitle(page, 'Editor Verification Workspace Renamed').waitFor();

    const reviewDecisionPanelAfter = await page.getByTestId('review-decision-panel').textContent();
    report.captures.globalSaved = await capture(page, 'editor-global-saved');
    report.assertions.push({
      step: 'global-edit-ui',
      passed: true,
      detail: 'Global editor updated the project title in the main workspace shell.',
    });
    report.assertions.push({
      step: 'global-edit-deterministic-panel',
      passed: reviewDecisionPanelBefore === reviewDecisionPanelAfter,
      detail: 'Review decision panel signals remained stable after a global edit.',
    });

    await openDiffComparison(page);
    assert(await page.getByText('projectName').count(), 'Fallback diff summary did not expose projectName change.');
    report.captures.globalDiff = await capture(page, 'editor-global-diff');
    await closeReviewDrawerIfOpen(page);

    logStep('export review packet after global edit');
    const globalPacket = await exportReviewPacket(page, 'editor-global-packet');
    assert(globalPacket.packet.projectName === 'Editor Verification Workspace Renamed', 'Exported review packet did not preserve the renamed project title.');
    assert(globalPacket.packet.reviewState?.diffSummary?.changed?.includes('projectName'), 'Exported review packet did not expose the global edit diff.');
    report.assertions.push({
      step: 'global-edit-export',
      passed: true,
      detail: 'Exported review packet preserved the renamed title and fallback diff summary.',
      artifact: globalPacket.downloadPath,
    });

    logStep('run structured editor edit');
    await openEditorShortcut(page, 'top-toolbar-open-structured-editor-shortcut');
    await page.locator('[data-field-path="meta.title"]').fill('Editor Verification Structured Title');
    await page.getByTestId('side-editor-save').click();
    await workspaceTitle(page, 'Editor Verification Structured Title').waitFor();
    report.captures.structuredSaved = await capture(page, 'editor-structured-saved');

    await openDiffComparison(page);
    assert(await page.getByText('meta').count(), 'Structured edit diff did not expose meta change.');
    report.captures.structuredDiff = await capture(page, 'editor-structured-diff');
    await closeReviewDrawerIfOpen(page);

    logStep('run json editor invalid and valid save');
    await openEditorShortcut(page, 'top-toolbar-open-json-editor-shortcut');
    const jsonInput = page.getByTestId('side-editor-json-input');
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="side-editor-json-input"]');
      return input instanceof HTMLTextAreaElement && input.value.trim().length > 10;
    });
    const validJson = await jsonInput.inputValue();
    await jsonInput.fill('{');
    await page.getByTestId('side-editor-save').click();
    await page.getByTestId('side-editor-json-error').waitFor();
    report.captures.jsonInvalid = await capture(page, 'editor-json-invalid');
    assert(await page.getByTestId('side-editor-json-error').textContent(), 'Invalid JSON error was not shown.');

    const updatedJsonDocument = JSON.parse(validJson);
    updatedJsonDocument.meta = {
      ...(updatedJsonDocument.meta ?? {}),
      name: 'Editor Verification JSON Title',
      title: 'Editor Verification JSON Title',
    };
    const updatedJson = JSON.stringify(updatedJsonDocument, null, 2);
    await jsonInput.fill(updatedJson);
    await page.getByTestId('side-editor-save').click();
    await workspaceTitle(page, 'Editor Verification JSON Title').waitFor();
    report.captures.jsonSaved = await capture(page, 'editor-json-saved');

    await openDiffComparison(page);
    assert(await page.getByText('meta').count(), 'JSON edit diff did not preserve the meta comparison surface.');
    report.captures.jsonDiff = await capture(page, 'editor-json-diff');
    await closeReviewDrawerIfOpen(page);

    logStep('export review packet after json edit');
    const jsonPacket = await exportReviewPacket(page, 'editor-json-packet');
    assert(jsonPacket.packet.projectName === 'Editor Verification JSON Title', 'Exported review packet did not preserve the JSON-edited title.');
    assert(jsonPacket.packet.reviewState?.diffSummary?.changed?.includes('meta'), 'Exported review packet did not expose the structured/json diff.');
    report.assertions.push({
      step: 'json-invalid-and-valid-save',
      passed: true,
      detail: 'Invalid JSON blocked save, then valid JSON saved and exported correctly.',
      artifact: jsonPacket.downloadPath,
    });
  } finally {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
