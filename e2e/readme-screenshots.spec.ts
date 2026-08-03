import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const shouldCapture = process.env.UPDATE_README_SCREENSHOTS === '1';
const screenshotRoot = path.resolve(process.cwd(), 'docs/assets/readme');

const openEvidenceBackedReview = async (page: Page) => {
  await page.goto('/');
  await page.getByTestId('intake-task-demo').click();
  await expect(page.getByTestId('skill-text-input')).toHaveValue(/name: demo-safe-review/);
  await page.getByRole('button', { name: /Analyze|分析/ }).last().click();

  const reviewRail = page.getByTestId('persistent-review-rail');
  await expect(reviewRail).toBeVisible({ timeout: 30_000 });
  await expect(reviewRail.getByTestId('blocking-issue-inbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /Executive Summary|執行摘要/ }).first()).toBeVisible();
  await expect(page.getByTestId('pipeline-section-content-summary')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Loading workspace module|正在載入工作區模組/)).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.getByText('app.summary', { exact: false })).toHaveCount(0);
  return reviewRail;
};

test.describe('README screenshots', () => {
  test.skip(!shouldCapture, 'Run npm run docs:capture-screenshots to refresh documentation images.');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('i18nextLng', 'en');
    });
  });

  test('captures the public demo entry', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('.demo-entry-page')).toBeVisible();
    await expect(page.getByRole('button', { name: /Open demo workspace/i }).first()).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotRoot, '01-demo-entry-desktop.png'),
      fullPage: false,
    });
  });

  test('captures the task-first guided intake', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('intake-task-demo').click();
    await expect(page.getByTestId('skill-text-input')).toHaveValue(/name: demo-safe-review/);
    await expect(page.locator('.task-primary--attention')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotRoot, '02-guided-intake-desktop.png'),
      fullPage: false,
    });
  });

  test('captures a fully loaded review with visible evidence gates', async ({ page }) => {
    await openEvidenceBackedReview(page);
    await page.screenshot({
      path: path.join(screenshotRoot, '03-review-workspace-evidence.png'),
      fullPage: false,
    });
  });

  test('captures the reviewer decision and export gate', async ({ page }) => {
    await openEvidenceBackedReview(page);
    await page.getByRole('button', { name: /Reviewer decision|Reviewer 決策/ }).last().click();
    await expect(page.getByTestId('drawer-view-review-decision')).toBeVisible();
    await expect
      .poll(async () => (await page.locator('.review-bottom-drawer').boundingBox())?.y ?? 1_024)
      .toBeLessThan(600);
    await page.screenshot({
      path: path.join(screenshotRoot, '04-review-decision-gate.png'),
      fullPage: false,
    });
  });
});
