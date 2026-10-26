import { expect, test } from '@playwright/test'

test('uses Base UI menus for export and activity logs', async ({ page }) => {
  await page.goto('/')
  const tools = page.getByRole('button', { name: 'Config tools' })
  await tools.click()
  await expect(page.getByRole('menu')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export config' }).click()
  expect((await download).suggestedFilename()).toContain('.json')
  await tools.click()
  await page.getByRole('menuitem', { name: 'Activity log' }).click()
  await expect(page.getByRole('dialog', { name: 'Activity log' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('saves a Base UI select value without bypassing form validation', async ({ page }) => {
  const original = await (await page.request.get('/api/v1/export')).json()
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    await page.getByRole('button', { name: 'Visit Jellyfin', exact: true }).focus()
    await page.keyboard.press('r')
    const select = page.getByRole('combobox', { name: 'Open behavior' })
    await select.click()
    await page.getByRole('option', { name: 'Same tab (_self)' }).click()
    await expect(select).toContainText('Same tab (_self)')
    const saved = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/api/v1/services/') && response.ok())
    await page.keyboard.press('Control+Enter')
    await saved
    await expect.poll(async () => (await (await page.request.get('/api/v1/export')).json()).items.find((item) => item.name === 'Media').list.find((item) => item.name === 'Jellyfin').target).toBe('_self')
  } finally {
    expect((await page.request.put('/api/v1/import', { data: original })).ok()).toBe(true)
  }
})
