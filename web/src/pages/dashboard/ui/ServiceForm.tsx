import { useState, type FormEvent } from 'react'
import { Button } from '@base-ui/react/button'
import { Form } from '@base-ui/react/form'
import { Input } from '@base-ui/react/input'
import { Checkbox } from '@base-ui/react/checkbox'
import SelectControl from '@/shared/ui/SelectControl'
import type { BivariantCallback, ServiceFormData } from '../model/dashboard'

const emptyServiceForm: ServiceFormData = { name: '', logo: '', url: '', target: '_blank', monitorEnabled: false, monitorUrl: '' }
type ServiceFormProps = {
  initialValue?: ServiceFormData
  submitLabel: string
  onSubmit: BivariantCallback<[ServiceFormData]>
  onCancel: () => void
  onDelete?: () => void
}
export default function ServiceForm({ initialValue, submitLabel, onSubmit, onCancel, onDelete }: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>(initialValue ?? emptyServiceForm)
  const update = (key: keyof ServiceFormData, value: string | boolean) => setFormData((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return }
    onSubmit({ ...formData, monitorUrl: formData.monitorEnabled ? formData.monitorUrl : '' })
  }
  return <Form onSubmit={submit}>
    <div className="field"><label htmlFor="service-name">Name</label>
      <Input id="service-name" name="name" value={formData.name} onValueChange={(value) => update('name', value)} placeholder="Example: Jellyfin" required />
    </div>
    <div className="field"><label htmlFor="service-logo">Logo path</label>
      <Input id="service-logo" name="logo" value={formData.logo} onValueChange={(value) => update('logo', value)} placeholder="Leave blank to fetch the favicon automatically" />
    </div>
    <div className="field"><label htmlFor="service-url">URL</label>
      <Input id="service-url" name="url" type="url" value={formData.url} onValueChange={(value) => update('url', value)} placeholder="https://service.example" required />
    </div>
    <div className="field"><label htmlFor="service-target">Open behavior</label>
      <SelectControl id="service-target" name="target" value={formData.target ?? '_blank'} onValueChange={(value) => update('target', value)} items={[{value:'_blank',label:'New tab (_blank)'},{value:'_self',label:'Same tab (_self)'}]} />
    </div>
    <label className="checkbox-field">
      <Checkbox.Root name="monitorEnabled" checked={Boolean(formData.monitorEnabled)} onCheckedChange={(checked) => update('monitorEnabled', checked)} className="checkbox" aria-label="Enable health checks"><Checkbox.Indicator>✓</Checkbox.Indicator></Checkbox.Root>
      <span>Enable health checks</span>
    </label>
    {formData.monitorEnabled && <div className="field"><label htmlFor="service-monitor-url">Health check URL</label>
      <Input id="service-monitor-url" name="monitorUrl" type="url" value={formData.monitorUrl ?? ''} onValueChange={(value) => update('monitorUrl', value)} placeholder="Leave blank to use the service URL" />
    </div>}
    <div className="wm-form-actions">
      {onDelete && <Button className="wm-form-button--danger" onClick={onDelete}>Delete</Button>}
      <div className="wm-form-actions__confirm"><Button onClick={onCancel}>Cancel</Button><Button type="submit" className="primary">{submitLabel}</Button></div>
    </div>
  </Form>
}
