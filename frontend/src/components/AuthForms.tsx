import type { FormEvent } from 'react'
import type { AuthField } from './authFields'

interface AuthCardProps {
  heading: string
  fields: AuthField[]
  submitLabel: string
  onSubmit?: () => void
}

export function AuthCard({
  heading,
  fields,
  submitLabel,
  onSubmit,
}: AuthCardProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div>{heading}</div>
      {fields.map((f) => (
        <input
          key={f.name}
          name={f.name}
          type={f.type ?? 'text'}
          inputMode={f.inputMode}
          placeholder={f.placeholder}
          aria-label={f.placeholder}
          required
        />
      ))}
      <div className="actions">
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  )
}
