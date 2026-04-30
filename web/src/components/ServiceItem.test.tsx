import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ServiceItem from './ServiceItem'
import type { ServiceViewModel } from '../types'

const service = (logo: string): ServiceViewModel => ({
  id: 12,
  categoryId: 1,
  order: 0,
  name: 'Jellyfin',
  logo,
  url: 'https://jellyfin.example',
  target: '_blank',
  monitorEnabled: false,
})

describe('ServiceItem', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses automatic favicon endpoint for blank logo', () => {
    const { getByAltText } = render(<ServiceItem service={service('')} />)

    expect(getByAltText('Jellyfin logo').getAttribute('src')).toBe('/api/v1/services/12/icon')
  })

  it('treats legacy bundled asset logo as automatic favicon', () => {
    const { getByAltText } = render(<ServiceItem service={service('assets/icons/jellyfin.png')} />)

    expect(getByAltText('Jellyfin logo').getAttribute('src')).toBe('/api/v1/services/12/icon')
  })
})
