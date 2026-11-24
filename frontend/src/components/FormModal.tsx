import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import Modal from './Modal'

export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'date'
  defaultValue?: string
}

interface FormModalProps {
  open: boolean
  title: string
  fields: FieldDef[]
  submitLabel?: string
  onClose: () => void
  // Receives the raw input values keyed by field name. Throw to keep the modal
  // open and show the error; the caller closes the modal on success.
  onSubmit?: (values: Record<string, string>) => Promise<void>
  children?: ReactNode
}

export default function FormModal({
  open,
  title,
  fields,
  submitLabel = 'Submit',
  onClose,
  onSubmit,
  children,
}: FormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const handleClose = () => {
    setError(undefined)
    onClose()
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onSubmit) return
    const form = e.currentTarget
    const values = Object.fromEntries(
      fields.map((f) => [f.name, String(new FormData(form).get(f.name) ?? '')]),
    )
    setSubmitting(true)
    setError(undefined)
    try {
      await onSubmit(values)
      form.reset()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={handleClose}>
      {children}
      <form onSubmit={handleSubmit}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`field-${f.name}`}>{f.label}:</label>
            <input
              id={`field-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              defaultValue={f.defaultValue}
              required
            />
          </div>
        ))}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
