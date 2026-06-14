import { useState, type ChangeEvent, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { BivariantCallback, ServiceFormData } from '../model/dashboard'

const emptyServiceForm: ServiceFormData = {
  name: '',
  logo: '',
  url: '',
  target: '_blank',
  monitorEnabled: false,
  monitorUrl: '',
}

type ServiceFormProps = {
  initialValue?: ServiceFormData
  submitLabel: string
  onSubmit: BivariantCallback<[ServiceFormData]>
  onCancel: () => void
  onDelete?: () => void
}

export default function ServiceForm({ initialValue, submitLabel, onSubmit, onCancel, onDelete }: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>(initialValue ?? emptyServiceForm)

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type, value } = event.currentTarget
    const checked = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.checked : false

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({
      ...formData,
      monitorUrl: formData.monitorEnabled ? formData.monitorUrl : '',
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="service-name" className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          id="service-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="Example: Jellyfin"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="service-logo" className="block text-sm font-medium mb-1">Logo path</label>
        <input
          type="text"
          id="service-logo"
          name="logo"
          value={formData.logo}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="Leave blank to fetch the favicon automatically"
        />
        {!initialValue && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use a local icon, remote URL, or leave blank to fetch the favicon automatically
          </p>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="service-url" className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          id="service-url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="http://192.168.1.100:8096"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="service-target" className="block text-sm font-medium mb-1">Open behavior</label>
        <select
          id="service-target"
          name="target"
          value={formData.target}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
        >
          <option value="_blank">New tab (_blank)</option>
          <option value="_self">Same tab (_self)</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="flex items-center space-x-2 text-sm font-medium">
          <input
            type="checkbox"
            name="monitorEnabled"
            checked={formData.monitorEnabled}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <span>Enable health checks</span>
        </label>
      </div>

      {formData.monitorEnabled && (
        <div className="mb-4">
          <label htmlFor="service-monitor-url" className="block text-sm font-medium mb-1">Health check URL</label>
          <input
            type="url"
            id="service-monitor-url"
            name="monitorUrl"
            value={formData.monitorUrl}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
            placeholder="Leave blank to use the service URL"
          />
        </div>
      )}

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
  )
}
