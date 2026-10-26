import { Button } from '@base-ui/react/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { categoryIconOptions } from './category-icons'

type IconPickerProps = {
  value?: string
  onChange: (value: string) => void
}

const IconPicker = ({ value = '', onChange }: IconPickerProps) => {
  return (
    <div className="icon-grid">
      {categoryIconOptions.map((option) => {
        const isSelected = value === option.value

        return (
          <Button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="wm-icon-option"
            aria-pressed={isSelected}
            title={option.label}
            aria-label={option.label}
          >
            <FontAwesomeIcon icon={option.icon}  />
          </Button>
        )
      })}
    </div>
  )
}

export default IconPicker
