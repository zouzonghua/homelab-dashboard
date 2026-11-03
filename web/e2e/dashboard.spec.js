import { expect, test } from '@playwright/test'

test('loads dashboard and persists a new service after reload', async ({ page }) => {
  const statusRequests = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/status') {
      statusRequests.push(request)
    }
  })

  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Config tools' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Visit personal website' })).toHaveCount(0)
  await expect(page.getByText('Jellyfin')).toBeVisible()
  await expect(page.getByText('HOMELAB', { exact: true })).toHaveCount(0)
  await expect(page.locator('.chassis-header__leds .status-port')).toHaveCount(0)
  expect(statusRequests).toHaveLength(0)

  await page.getByRole('button', { name: 'Enter edit mode' }).click()
  await page.getByRole('button', { name: 'Add service to Media' }).click()

  await page.getByLabel('Name').fill('E2E Service')
  await page.getByLabel('URL').fill('https://example.com/e2e')
  await page.getByRole('checkbox', { name: 'Enable health checks' }).check()
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
  await expect(page.getByRole('button', { name: 'Switch to masonry layout' })).toBeVisible()
  const restoredFirst = await jellyfin.boundingBox()
  const restoredSecond = await navidrome.boundingBox()
  expect(restoredSecond.y).toBeCloseTo(restoredFirst.y, 0)

  await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
  await page.getByRole('button', { name: 'Switch to vertical layout' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Switch to horizontal layout' })).toBeVisible()
})

for (const layout of ['vertical', 'horizontal', 'masonry']) {
  test(`hides the layout toggle on mobile and restores ${layout} when widened`, async ({ page }) => {
    await page.goto('/')
    if (layout === 'horizontal') {
      await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
    }
    if (layout === 'masonry') {
      await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
      await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
    }
    const toggle = page.locator('button[aria-label^="Switch to"]')
    for (const width of [639, 375]) {
      await page.setViewportSize({ width, height: 812 })
      await expect(toggle).toBeHidden()
      if (layout === 'masonry') await expect(page.locator('.masonry-column')).toHaveCount(1)
      const first = await page.getByRole('button', { name: 'Visit Jellyfin', exact: true }).boundingBox()
      const second = await page.getByRole('button', { name: 'Visit Navidrome', exact: true }).boundingBox()
      expect(second.x).toBeCloseTo(first.x, 0)
      expect(second.y).toBeGreaterThan(first.y)
    }
    await page.reload()
    await expect(toggle).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem('dashboard-layout'))).toBe(layout)
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    expect(await page.locator('.chassis-app').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.setViewportSize({ width: 640, height: 1000 })
    await expect(toggle).toBeVisible()
    const first = await page.getByRole('button', { name: 'Visit Jellyfin', exact: true }).boundingBox()
    const second = await page.getByRole('button', { name: 'Visit Navidrome', exact: true }).boundingBox()
    if (layout === 'horizontal') {
      expect(second.y).toBeCloseTo(first.y, 0)
      expect(second.x).toBeGreaterThan(first.x)
    } else {
      expect(second.x).toBeCloseTo(first.x, 0)
      expect(second.y).toBeGreaterThan(first.y)
    }
  })
}

test('reorders services across a horizontal row and persists the order', async ({ page }) => {
  const originalConfig = await (await page.request.get('/api/v1/export')).json()
  try {
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
    await expect.poll(async () => (await (await page.request.get('/api/v1/export')).json()).items.find((item) => item.name === 'Media').list.slice(0, 2).map((item) => item.name)).toEqual(['Navidrome', 'Jellyfin'])
    await page.reload()
    await expect(media.locator('.drive-bay__name').first()).toHaveText('Navidrome')
    await expect(page.getByRole('button', { name: 'Switch to masonry layout' })).toBeVisible()
  } finally {
    const restored = await page.request.put('/api/v1/import', { data: originalConfig })
    expect(restored.ok()).toBe(true)
  }
})


for (const width of [640, 767]) {
  test(`supports both layout directions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const first = page.getByRole('button', { name: 'Visit Jellyfin', exact: true })
    const second = page.getByRole('button', { name: 'Visit Navidrome', exact: true })
    await expect(first).toBeVisible()
    const verticalFirst = await first.boundingBox()
    const verticalSecond = await second.boundingBox()
    expect(verticalSecond.x).toBeCloseTo(verticalFirst.x, 0)
    expect(verticalSecond.y).toBeGreaterThan(verticalFirst.y)

    await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
    const horizontalFirst = await first.boundingBox()
    const horizontalSecond = await second.boundingBox()
    expect(horizontalSecond.y).toBeCloseTo(horizontalFirst.y, 0)
    expect(horizontalSecond.x).toBeGreaterThan(horizontalFirst.x)

    await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
    await page.getByRole('button', { name: 'Switch to vertical layout' }).click()
    const restoredFirst = await first.boundingBox()
    const restoredSecond = await second.boundingBox()
    expect(restoredSecond.x).toBeCloseTo(restoredFirst.x, 0)
    expect(restoredSecond.y).toBeGreaterThan(restoredFirst.y)
  })
}


test('keeps the header at the top when content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Config tools' })).toBeVisible()
  await page.locator('.chassis-app').evaluate((element) => { element.scrollTop = 500 })
  const header = await page.locator('.chassis-header').boundingBox()
  expect(header.y).toBe(0)
  await expect(page.getByRole('button', { name: 'Config tools' })).toBeVisible()
})

test('appends a group to a short column and preserves that column after reload', async ({ page }) => {
  const original = await (await page.request.get('/api/v1/export')).json()
  try {
    await page.setViewportSize({ width: 1200, height: 1000 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
    await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    const columns = page.locator('.masonry-column')
    await expect(columns).toHaveCount(4)
    const source = columns.nth(2).getByTitle('Drag to reorder').first()
    const destination = columns.nth(1)
    const tail = destination.locator('.masonry-tail')
    const start = await source.boundingBox()
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2)
    await expect(columns).toHaveCount(4)
    const box = await tail.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + 12, { steps: 15 })
    await expect(tail).toHaveAttribute('data-active', 'true')
    await page.mouse.up()

    const moved = original.items[2].name
    await expect(destination.locator('.rack-section__label').last()).toHaveText(moved)
    await expect(columns).toHaveCount(3)
    await expect.poll(async () => (await (await page.request.get('/api/v1/dashboard')).json()).masonryPlacements?.['4']?.sizes)
      .toEqual([1, 2, 1, 0])
    const nextHandle = await destination.getByTitle('Drag to reorder').first().boundingBox()
    await page.mouse.move(nextHandle.x + nextHandle.width / 2, nextHandle.y + nextHandle.height / 2)
    await page.mouse.down()
    await page.mouse.move(nextHandle.x + nextHandle.width / 2 + 10, nextHandle.y + nextHandle.height / 2)
    await expect(columns).toHaveCount(4)
    await expect(columns.nth(3).locator('.category-tile')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
    await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
    await expect(destination.locator('.rack-section__label').last()).toHaveText(moved)
    await expect(columns).toHaveCount(3)
    const created = await page.request.post('/api/v1/categories', {
      data: { name: 'Added after layout change', icon: 'fa-solid fa-folder' },
    })
    expect(created.ok()).toBe(true)
    const { id } = await created.json()
    await page.reload()
    await expect(columns).toHaveCount(3)
    await expect(destination.locator('.rack-section__label').last()).toHaveText(moved)
    await expect(columns.last().locator('.rack-section__label').last()).toHaveText('Added after layout change')
    expect((await page.request.delete(`/api/v1/categories/${id}`)).ok()).toBe(true)
    await page.reload()
    await expect(columns).toHaveCount(3)
    await expect(destination.locator('.rack-section__label').last()).toHaveText(moved)
  } finally {
    expect((await page.request.put('/api/v1/import', { data: original })).ok()).toBe(true)
  }
})

test('rolls back the entire order when a resource ID is invalid', async ({ request }) => {
  const categories = async () => (await (await request.get('/api/v1/categories')).json()).data
  await request.get('/api/v1/dashboard')
  const original = await categories()
  const ids = original.map(({ id }) => id)
  const invalid = [ids[1], ids[0], ...ids.slice(2, -1), -1]
  const response = await request.put('/api/v1/order', { data: { ids: invalid } })
  expect(response.status()).toBe(409)
  expect(await categories()).toEqual(original)
})

test('sorts and manages same-name groups by their resource identity', async ({ page }) => {
  const original = await (await page.request.get('/api/v1/export')).json()
  try {
    const items = original.items.map((item, index) => index === 1 ? { ...item, name: original.items[0].name } : item)
    expect((await page.request.put('/api/v1/import', { data: { ...original, items } })).ok()).toBe(true)
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    const tiles = page.locator('.category-tile')
    const source = await tiles.first().getByTitle('Drag to reorder').first().boundingBox()
    const target = await tiles.nth(1).boundingBox()
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + target.width / 2, target.y + 12, { steps: 15 })
    await page.mouse.up()
    const expected = items[1].list[0].name
    await expect.poll(async () => (await (await page.request.get('/api/v1/export')).json()).items[0].list[0].name).toBe(expected)
    await page.reload()
    await expect(tiles.first().locator('.drive-bay__name').first()).toHaveText(expected)
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    const second = tiles.nth(1)
    await second.getByRole('button', { name: 'Add service to Media' }).click()
    await page.getByLabel('Name').fill('Same-name group service')
    await page.getByLabel('URL').fill('https://example.com/same-name')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const service = second.getByRole('button', { name: 'Visit Same-name group service' })
    await expect(service).toBeVisible()

    await service.focus()
    await page.keyboard.press('r')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Renamed service')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    const renamed = second.getByRole('button', { name: 'Visit Renamed service' })
    await expect(renamed).toBeVisible()
    await renamed.focus()
    await page.keyboard.press('d')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(renamed).toHaveCount(0)

    await second.locator('.rack-section__header').focus()
    await page.keyboard.press('d')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Visit Jellyfin', exact: true })).toHaveCount(0)
    await page.reload()
    await expect(tiles.first().locator('.drive-bay__name').first()).toHaveText(expected)
    await expect(page.getByRole('button', { name: 'Visit Jellyfin', exact: true })).toHaveCount(0)
  } finally {
    expect((await page.request.put('/api/v1/import', { data: original })).ok()).toBe(true)
  }
})

test('sorts within the displayed column after changing viewport width', async ({ page }) => {
  const original = await (await page.request.get('/api/v1/export')).json()
  try {
    const { data } = await (await page.request.get('/api/v1/categories')).json()
    const [a, b, c, d] = data.map(({ id }) => id)
    const save = async (body) => {
      expect((await page.request.put('/api/v1/order', { data: body })).ok()).toBe(true)
    }
    await save({ ids: [a, c, b, d], masonry: { capacity: 4, sizes: [2, 2] } })
    await save({ ids: [a, b, c, d] })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Switch to horizontal layout' }).click()
    await page.getByRole('button', { name: 'Switch to masonry layout' }).click()
    await page.setViewportSize({ width: 1200, height: 1000 })
    await page.getByRole('button', { name: 'Enter edit mode' }).click()
    const columns = page.locator('.masonry-column')
    await expect(columns).toHaveCount(2)
    const labels = (column) => column.locator('.rack-section__label')
    const first = columns.first()
    const second = columns.nth(1)
    const names = original.items.map(({ name }) => name)
    await expect(labels(first)).toHaveText([names[0], names[2]])
    await expect(labels(second)).toHaveText([names[1], names[3]])

    const handle = second.getByTitle('Drag to reorder').first()
    const start = await handle.boundingBox()
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2)
    await expect(columns).toHaveCount(4)
    const target = await labels(second).last().boundingBox()
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 })
    await page.mouse.up()
    await expect(labels(first)).toHaveText([names[0], names[2]])
    await expect(labels(second)).toHaveText([names[3], names[1]])
    await expect.poll(async () => (await (await page.request.get('/api/v1/dashboard')).json()).masonryPlacements['4'].ids)
      .toEqual([a, c, d, b])
    await page.reload()
    await expect(labels(first)).toHaveText([names[0], names[2]])
    await expect(labels(second)).toHaveText([names[3], names[1]])
  } finally {
    expect((await page.request.put('/api/v1/import', { data: original })).ok()).toBe(true)
  }
})
