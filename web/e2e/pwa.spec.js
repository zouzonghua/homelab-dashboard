import { expect, test } from '@playwright/test'

test('provides an installable manifest, local icons and theme metadata', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Config tools' })).toBeVisible()
  await expect(page).toHaveTitle('Homelab')
  const link = page.locator('link[rel="manifest"]')
  await expect(link).toHaveAttribute('crossorigin', 'use-credentials')
  const response = await page.request.get(await link.getAttribute('href'))
  expect(response.headers()['content-type']).toContain('application/manifest+json')
  const manifest = await response.json()
  expect(manifest).toMatchObject({ id: '/', name: 'Homelab', start_url: '/', scope: '/', display: 'standalone' })
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src)
    expect(response.ok()).toBe(true)
    const png = await response.body()
    expect(png.readUInt32BE(0)).toBe(0x89504e47)
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes)
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Page.enable')
  const parsed = await cdp.send('Page.getAppManifest')
  expect(parsed.errors).toEqual([])
  expect((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([])
  await page.getByRole('button', { name: 'Current theme: System. Click to switch to Light' }).click()
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fbf1c7')
  await page.getByRole('button', { name: 'Current theme: Light. Click to switch to Dark' }).click()
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#282828')
})
