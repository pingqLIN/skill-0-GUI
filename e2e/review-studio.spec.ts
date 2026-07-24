import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('review studio browser contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
  });

  test('offers a task-first intake with keyboard-operable choices', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Guided intake|導引式 intake/ })).toBeVisible();

    const reviewTask = page.getByTestId('intake-task-review');
    const compareTask = page.getByTestId('intake-task-compare');
    const draftTask = page.getByTestId('intake-task-draft');
    const demoTask = page.getByTestId('intake-task-demo');

    await expect(reviewTask).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('task-input-section')).toHaveCount(0);
    await expect(page.getByText(/Review a skill bundle|審查 skill bundle/).first()).toBeVisible();
    await expect(compareTask).toBeVisible();
    await expect(draftTask).toBeVisible();
    await expect(demoTask).toBeVisible();

    await reviewTask.focus();
    await page.keyboard.press('ArrowRight');
    await expect(compareTask).toHaveAttribute('aria-checked', 'true');
    await expect(compareTask).toBeFocused();
    await expect(compareTask).toHaveAttribute('tabindex', '0');
    await expect(reviewTask).toHaveAttribute('tabindex', '-1');
    await expect(page.getByTestId('bundle-intake-panel')).toBeVisible();
    await expect(page.getByTestId('task-input-section')).toHaveCount(0);
    await expect(page.getByRole('complementary').getByText(/Review a skill bundle|審查 skill bundle/)).toBeVisible();
    const modeLabel = await page.getByTestId('bridge-mode-label').innerText();
    const modeClass = await page.locator('.guided-intake-mode .status-led').getAttribute('class');
    if (modeClass?.includes('status-led--canonical')) {
      expect(modeLabel).toMatch(/canonical/i);
    } else if (modeClass?.includes('status-led--standalone')) {
      expect(modeLabel).toMatch(/standalone|fallback/i);
    } else {
      expect(modeLabel).toMatch(/unavailable|pending|不可用|待確認/i);
    }

    await reviewTask.click();
    await expect(page.getByTestId('task-input-section')).toBeVisible();
    await expect(page.getByTestId('intake-tab-upload')).toHaveCount(0);
    await page.getByTestId('intake-tab-url').click();
    await expect(page.getByTestId('skill-url-input')).toBeVisible();

    await demoTask.click();
    await expect(page.getByTestId('skill-text-input')).toHaveValue(/name: demo-safe-review/);
    await expect(page.getByTestId('intake-tab-url')).toHaveCount(0);
    await expect(page.locator('.task-primary--attention')).toBeVisible();
  });

  test('persists and restores an intake draft through IndexedDB', async ({ page }) => {
    await page.getByTestId('intake-task-review').click();
    const textarea = page.locator('textarea').first();
    const draftText = '# Browser QA Draft\n\n- Preserve this local draft.';
    await textarea.fill(draftText);
    await expect(page.getByTestId('workspace-draft-status')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('workspace-draft-status')).toBeVisible();
    await page.getByTestId('intake-task-draft').click();
    await expect(page.getByTestId('draft-library')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export draft|輸出草稿/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.draft\.json$/);
    await page.getByRole('button', { name: /Continue editing|繼續編輯/ }).click();
    await expect(page.locator('textarea').first()).toHaveValue(draftText);

    await page.getByTestId('intake-task-draft').click();
    await page.getByRole('button', { name: /Delete draft|刪除草稿/ }).click();
    await page.getByRole('button', { name: /Confirm delete|確認刪除/ }).click();
    await expect(page.getByText(/No drafts yet|尚未建立草稿/)).toBeVisible();
  });

  test('connects blocking issues to the structured editor', async ({ page }) => {
    await page.getByTestId('intake-task-review').click();
    const textarea = page.locator('textarea').first();
    await textarea.fill('# Browser QA Skill\n\n## Instructions\n\n- Validate issue drilldown.');
    await page.getByRole('button', { name: /Analyze|分析/ }).last().click();

    const reviewRail = page.getByTestId('persistent-review-rail');
    await expect(reviewRail).toBeVisible({ timeout: 30_000 });
    await expect(reviewRail.getByTestId('blocking-issue-inbox')).toBeVisible();
    await reviewRail.getByRole('button', { name: /Open issue|開啟問題/ }).first().click();
    await expect(page.getByTestId('side-editor-dialog')).toBeVisible();
  });

  test('has no serious or critical axe violations on the intake screen', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blockingViolations = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );
    expect(blockingViolations).toEqual([]);
  });

  test('has no serious or critical axe violations in the review editor flow', async ({ page }) => {
    await page.getByTestId('intake-task-review').click();
    await page
      .locator('textarea')
      .first()
      .fill('# Browser QA Skill\n\n## Instructions\n\n- Validate issue drilldown.');
    await page.getByRole('button', { name: /Analyze|分析/ }).last().click();
    const reviewRail = page.getByTestId('persistent-review-rail');
    await expect(reviewRail).toBeVisible({ timeout: 30_000 });
    await reviewRail.getByRole('button', { name: /Open issue|開啟問題/ }).first().click();
    await expect(page.getByTestId('side-editor-dialog')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blockingViolations = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );
    expect(blockingViolations).toEqual([]);
  });

  test('keeps intake and review workspace bounded at the active viewport', async ({ page }, testInfo) => {
    await expect(page.getByTestId('intake-task-review')).toBeVisible();
    await page.getByTestId('intake-task-review').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('intake.png'), fullPage: true });

    await page.locator('textarea').first().fill('# Visual QA Skill\n\n- Keep the review workspace bounded.');
    await page.getByRole('button', { name: /Analyze|分析/ }).last().click();
    await expect(page.getByTestId('persistent-review-rail')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Executive Summary|執行摘要/ }).first()).toBeVisible();
    await expect(page.getByText('app.summary', { exact: false })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: false });
  });
});
