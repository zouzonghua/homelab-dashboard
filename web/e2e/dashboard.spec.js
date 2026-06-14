import { expect, test } from '@playwright/test'

test('loads dashboard and persists a new service after reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /homelab dashboard/i })).toBeVisible()
  await expect(page.getByText('Jellyfin')).toBeVisible()
  await expect(page.getByText('HOMELAB', { exact: true })).toHaveCount(0)
  await expect(page.locator('.chassis-header__leds .status-port')).toHaveCount(4)

  await page.getByRole('button', { name: 'Enter edit mode' }).click()
  await page.getByRole('button', { name: 'Add service to Media' }).click()

  await page.getByLabel('Name').fill('E2E Service')
  await page.getByLabel('URL').fill('https://example.com/e2e')
  await page.getByLabel('Enable health checks').check()
  await page.getByLabel('Health check URL').fill('http://127.0.0.1:4174/api/v1/dashboard')
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/services') &&
      response.request().method() === 'POST' &&
      response.ok()
    ),
    page.getByRole('button', { name: 'Add', exact: true }).click(),
  ])

  await expect(page.getByRole('button', { name: 'Visit E2E Service' })).toBeVisible()
  await expect(page.getByLabel('E2E Service service status up')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Visit E2E Service' }).getByText(/\d+ms/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Visit E2E Service' })).toBeVisible()
  await expect(page.getByLabel('E2E Service service status up')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Visit E2E Service' }).getByText(/\d+ms/)).toBeVisible()
})
