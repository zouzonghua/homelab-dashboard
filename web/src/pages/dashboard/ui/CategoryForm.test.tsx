import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CategoryForm from './CategoryForm'

describe('CategoryForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('submits initial category values with the edited name', () => {
    const onSubmit = vi.fn()

    render(
      <CategoryForm
        title="编辑分类"
        initialValue={{ name: 'Media', icon: 'fa-solid fa-film' }}
        submitLabel="保存"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('分类名称') as HTMLInputElement).value).toBe('Media')

    fireEvent.change(screen.getByLabelText('分类名称'), { target: { value: 'Media Apps' } })
    fireEvent.click(screen.getByRole('button', { name: /保存/ }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Media Apps',
      icon: 'fa-solid fa-film',
    })
  })
})
