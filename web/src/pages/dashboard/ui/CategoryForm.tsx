import { useState, type FormEvent } from 'react'
import { Button } from '@base-ui/react/button'
import { Form } from '@base-ui/react/form'
import { Input } from '@base-ui/react/input'
import IconPicker from './IconPicker'
import type { BivariantCallback, CategoryWithServices } from '../model/dashboard'

type CategoryFormData = Pick<CategoryWithServices, 'name' | 'icon'>
type CategoryFormProps = { title: string; initialValue?: CategoryFormData; submitLabel: string; onSubmit: BivariantCallback<[CategoryFormData]>; onCancel: () => void; onDelete?: () => void }
export default function CategoryForm({ title, initialValue, submitLabel, onSubmit, onCancel, onDelete }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>(initialValue ?? { name: '', icon: 'fa-solid fa-folder' })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return }
    onSubmit(formData)
  }
  return <div>
    <h3 className="sr-only">{title}</h3>
    <Form onSubmit={submit}>
      <div className="field"><label htmlFor="category-name">Category name</label>
        <Input id="category-name" name="name" value={formData.name} onValueChange={(value) => setFormData((current) => ({ ...current, name: value }))} placeholder="Example: Development Tools" required />
      </div>
      <div className="field"><span>Icon</span><IconPicker value={formData.icon} onChange={(icon) => setFormData((current) => ({ ...current, icon }))} /></div>
      <div className="wm-form-actions">
        {onDelete && <Button className="wm-form-button--danger" onClick={onDelete}>Delete</Button>}
        <div className="wm-form-actions__confirm"><Button onClick={onCancel}>Cancel</Button><Button type="submit" className="primary">{submitLabel}</Button></div>
      </div>
    </Form>
  </div>
}
