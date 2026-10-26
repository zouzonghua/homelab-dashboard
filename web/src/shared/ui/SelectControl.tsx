import { Select } from '@base-ui/react/select'

export default function SelectControl({ id, name, value, onValueChange, items }: {
  id: string
  name: string
  value: string
  onValueChange: (value: string) => void
  items: { value: string; label: string }[]
}) {
  return <Select.Root name={name} value={value} items={items} onValueChange={(next) => { if (next !== null) onValueChange(next) }}>
    <Select.Trigger id={id} className="select-trigger"><Select.Value /><Select.Icon>⌄</Select.Icon></Select.Trigger>
    <Select.Portal><Select.Positioner className="popup-positioner" sideOffset={4} alignItemWithTrigger={false}>
      <Select.Popup className="popup"><Select.List>
        {items.map((item) => <Select.Item key={item.value} value={item.value} className="popup-item">
          <Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator>✓</Select.ItemIndicator>
        </Select.Item>)}
      </Select.List></Select.Popup>
    </Select.Positioner></Select.Portal>
  </Select.Root>
}
