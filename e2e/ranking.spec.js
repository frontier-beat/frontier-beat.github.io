// F5: ranking controls against the mock API.
import { test, expect } from '@playwright/test';
import { openPage } from './helpers';

const apiRequest = (page) => page.waitForRequest((r) => r.url().includes('/top_papers'));
const params = (req) => Object.fromEntries(new URL(req.url()).searchParams);

test('default ranking is trending + 30d and loads page 1', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser);
  const req = apiRequest(page);
  await page.goto('/');
  expect(params(await req)).toMatchObject({ sort: 'trending', window: 'month', page: '1', per_page: '10' });
  await expect(page.getByRole('radio', { name: 'Trending' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '30d' })).toBeChecked();
  await expect(page.locator('.card')).toHaveCount(10);
  expect(errors).toEqual([]);
  await context.close();
});

test('changing sort updates the URL, refetches and resets the list; back restores', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser);
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(10);
  await page.mouse.wheel(0, 20000);
  await expect(page.locator('.card')).toHaveCount(20);

  const req = apiRequest(page);
  await page.getByText('Stars gained', { exact: true }).click();
  expect(params(await req)).toMatchObject({ sort: 'gained', window: 'month', page: '1' });
  await expect(page).toHaveURL(/\?sort=gained&window=month$/);
  await expect(page.locator('.card')).toHaveCount(10);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2000);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('radio', { name: 'Trending' })).toBeChecked();
  await expect(page.locator('.card')).toHaveCount(10);
  expect(errors).toEqual([]);
  await context.close();
});

test('keyboard: arrow keys move through sorts; window is disabled for Most stars', async ({ browser }) => {
  const { context, page } = await openPage(browser);
  await page.goto('/');
  await page.getByRole('radio', { name: 'Trending' }).focus();
  const req = apiRequest(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Most stars' })).toBeChecked();
  expect(params(await req)).toMatchObject({ sort: 'stars', window: 'all' });
  await expect(page.getByRole('radio', { name: '30d' })).toBeDisabled();
  await expect(page).toHaveURL(/\?sort=stars&window=month$/);
  await context.close();
});

test('deep link restores controls', async ({ browser }) => {
  const { context, page } = await openPage(browser);
  const req = apiRequest(page);
  await page.goto('/?sort=new&window=all');
  expect(params(await req)).toMatchObject({ sort: 'new', window: 'all' });
  await expect(page.getByRole('radio', { name: 'Newest' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'All' })).toBeChecked();
  await context.close();
});

test('error state offers retry', async ({ browser }) => {
  const { context, page } = await openPage(browser);
  await page.route('**/top_papers**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Could not load papers (HTTP 500: boom)');
  await page.unroute('**/top_papers**');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('.card')).toHaveCount(10);
  await context.close();
});

test('empty windowed result offers all time', async ({ browser }) => {
  const { context, page } = await openPage(browser);
  await page.route('**/top_papers**', (r) => {
    const q = new URL(r.request().url()).searchParams;
    if (q.get('window') === 'all') return r.fallback();
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ page: 1, per_page: 10, sort: q.get('sort'), window: q.get('window'), total: 0, repos: [] }) });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('No papers in this window.');
  await page.getByRole('button', { name: 'Show all time' }).click();
  await expect(page).toHaveURL(/\?window=all$|\?sort=trending&window=all$/);
  await expect(page.locator('.card')).toHaveCount(10);
  await context.close();
});
