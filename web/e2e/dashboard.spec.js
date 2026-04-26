import { expect, test } from '@playwright/test'

test('loads dashboard and persists a new service after reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /homelab dashboard/i })).toBeVisible()
  await expect(page.getByText('Jellyfin')).toBeVisible()
  await expect(page.getByText('HOMELAB', { exact: true })).toHaveCount(0)
  await expect(page.locator('.chassis-header__leds .status-port')).toHaveCount(4)

  await page.getByRole('button', { name: '进入编辑模式' }).click()
  await page.getByRole('button', { name: '添加服务到 Media' }).click()

  await page.getByLabel('名称').fill('E2E Service')
  await page.getByLabel('URL').fill('https://example.com/e2e')
  await page.getByLabel('启用状态检测').check()
  await page.getByLabel('检测 URL').fill('http://127.0.0.1:4174/api/config')
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith('/api/config') &&
      response.request().method() === 'PUT' &&
      response.ok()
    ),
    page.getByRole('button', { name: '添加', exact: true }).click(),
  ])

  await expect(page.getByRole('button', { name: '访问 E2E Service' })).toBeVisible()
  await expect(page.getByLabel('E2E Service 服务状态 up')).toBeVisible()
  await expect(page.getByRole('button', { name: '访问 E2E Service' }).getByText(/\d+ms/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '访问 E2E Service' })).toBeVisible()
  await expect(page.getByLabel('E2E Service 服务状态 up')).toBeVisible()
  await expect(page.getByRole('button', { name: '访问 E2E Service' }).getByText(/\d+ms/)).toBeVisible()
})
