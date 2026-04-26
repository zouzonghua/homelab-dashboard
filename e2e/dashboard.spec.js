import { expect, test } from '@playwright/test'

test('loads dashboard and persists a new service after reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /homelab dashboard/i })).toBeVisible()
  await expect(page.getByText('Jellyfin')).toBeVisible()

  await page.getByRole('button', { name: '进入编辑模式' }).click()
  await page.getByRole('button', { name: '添加服务到 Media' }).click()

  await page.getByLabel('名称').fill('E2E Service')
  await page.getByLabel('Logo 路径').fill('https://example.com/icon.png')
  await page.getByLabel('URL').fill('https://example.com/e2e')
  await page.getByRole('button', { name: '添加', exact: true }).click()

  await expect(page.getByText('E2E Service')).toBeVisible()
  await page.reload()
  await expect(page.getByText('E2E Service')).toBeVisible()
})
