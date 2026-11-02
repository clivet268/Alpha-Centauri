import type { ReactNode } from 'react'
import Modal from './Modal'

export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'date'
}

interface FormModalProps {
  open: boolean
  title: string
  fields: FieldDef[]
  submitLabel?: string
  onClose: () => void
  children?: ReactNode
}

export default function FormModal({
  open,
  title,
  fields,
  submitLabel = 'Submit',
  onClose,
  children,
}: FormModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      {children}
      <form onSubmit={(e) => e.preventDefault()}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`field-${f.name}`}>{f.label}:</label>
            <input
              id={`field-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              required
            />
          </div>
        ))}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">{submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}
