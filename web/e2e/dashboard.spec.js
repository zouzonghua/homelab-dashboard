import { expect, test } from '@playwright/test'

test('loads dashboard and persists a new service after reload', async ({ page }) => {
  const statusRequests = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/status') {
      statusRequests.push(request)
    }
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: /homelab dashboard/i })).toBeVisible()
  await expect(page.getByText('Jellyfin')).toBeVisible()
  await expect(page.getByText('HOMELAB', { exact: true })).toHaveCount(0)
  await expect(page.locator('.chassis-header__leds .status-port')).toHaveCount(4)
  expect(statusRequests).toHaveLength(0)

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
  expect(statusRequests).toHaveLength(0)
})


test('switches layout geometry and remembers the choice after reload', async ({ page }) => {
  await page.goto('/')
  const jellyfin = page.getByRole('button', { name: 'Visit Jellyfin', exact: true })
  const navidrome = page.getByRole('button', { name: 'Visit Navidrome', exact: true })
  await expect(jellyfin).toBeVisible()

  const verticalFirst = await jellyfin.boundingBox()
  const verticalSecond = await navidrome.boundingBox()
  expect(verticalSecond.x).toBeCloseTo(verticalFirst.x, 0)
  expect(verticalSecond.y).toBeGreaterThan(verticalFirst.y)

  await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
  const horizontalFirst = await jellyfin.boundingBox()
  const horizontalSecond = await navidrome.boundingBox()
  expect(horizontalSecond.y).toBeCloseTo(horizontalFirst.y, 0)
  expect(horizontalSecond.x).toBeGreaterThan(horizontalFirst.x)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Switch to vertical layout' })).toBeVisible()
  const restoredFirst = await jellyfin.boundingBox()
  const restoredSecond = await navidrome.boundingBox()
  expect(restoredSecond.y).toBeCloseTo(restoredFirst.y, 0)

  await page.getByRole('button', { name: 'Switch to vertical layout' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Switch to horizontal layout' })).toBeVisible()
})

test('keeps layout controls and cards within a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
  const jellyfin = await page.getByRole('button', { name: 'Visit Jellyfin', exact: true }).boundingBox()
  const navidrome = await page.getByRole('button', { name: 'Visit Navidrome', exact: true }).boundingBox()
  expect(navidrome.x).toBeCloseTo(jellyfin.x, 0)
  expect(navidrome.y).toBeGreaterThan(jellyfin.y)
  const toggle = await page.getByRole('button', { name: 'Switch to vertical layout' }).boundingBox()
  expect(toggle.x + toggle.width).toBeLessThanOrEqual(375)
  expect(await page.locator('.chassis-app').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Enter edit mode' }).click()
  const editToggle = await page.getByRole('button', { name: 'Switch to vertical layout' }).boundingBox()
  expect(editToggle.x + editToggle.width).toBeLessThanOrEqual(375)
  expect(await page.locator('.chassis-app').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('reorders services across a horizontal row and persists the order', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
  await page.getByRole('button', { name: 'Enter edit mode' }).click()
  const media = page.locator('.rack-section').filter({ has: page.locator('.rack-section__label').filter({ hasText: /^Media$/ }) })
  const handle = page.getByRole('button', { name: 'Visit Jellyfin', exact: true }).locator('.drive-bay__logo')
  const start = await handle.boundingBox()
  const target = await page.getByRole('button', { name: 'Visit Navidrome', exact: true }).boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 })
  await page.mouse.up()
  await expect(media.locator('.drive-bay__name').first()).toHaveText('Navidrome')
  await page.reload()
  await expect(media.locator('.drive-bay__name').first()).toHaveText('Navidrome')
  await expect(page.getByRole('button', { name: 'Switch to vertical layout' })).toBeVisible()
})
