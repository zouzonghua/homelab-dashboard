import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { categoryIconOptions } from '../icons/categoryIcons'

type IconPickerProps = {
  value?: string
  onChange: (value: string) => void
}

const IconPicker = ({ value = '', onChange }: IconPickerProps) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {categoryIconOptions.map((option) => {
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`p-3 rounded-md transition-colors flex items-center justify-center ${
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
            title={option.label}
            aria-label={option.label}
          >
            <FontAwesomeIcon icon={option.icon} className="text-lg" />
          </button>
        )
      })}
    </div>
  )
}

export default IconPicker
