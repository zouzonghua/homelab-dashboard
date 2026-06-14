import { useState, type ChangeEvent, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { BivariantCallback, CategoryWithServices } from '../model/dashboard'
import IconPicker from './IconPicker'

type CategoryFormData = Pick<CategoryWithServices, 'name' | 'icon'>

type CategoryFormProps = {
  title: string
  initialValue?: CategoryFormData
  submitLabel: string
  onSubmit: BivariantCallback<[CategoryFormData]>
  onCancel: () => void
  onDelete?: () => void
}

export default function CategoryForm({
  title,
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>(initialValue ?? {
    name: '',
    icon: 'fa-solid fa-folder',
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(formData)
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="category-name" className="block text-sm font-medium mb-2">Category name</label>
          <input
            type="text"
            id="category-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
            placeholder="Example: Development Tools"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Icon</label>
          <IconPicker
            value={formData.icon}
            onChange={(iconValue) => setFormData((current) => ({ ...current, icon: iconValue }))}
          />
        </div>

        <div className="flex justify-between items-center">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-1" />
              Delete
            </button>
          )}

          <div className="flex space-x-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-dark-600 rounded-md hover:bg-gray-300 dark:hover:bg-dark-500 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1" />
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              <FontAwesomeIcon icon={onDelete ? faSave : faPlus} className="mr-1" />
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
