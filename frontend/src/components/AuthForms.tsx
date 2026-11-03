import type { FormEvent } from 'react'
import type { AuthField } from './authFields'

interface AuthCardProps {
  heading: string
  fields: AuthField[]
  submitLabel: string
  onSubmit?: (values: Record<string, string>) => void
  error?: string
  busy?: boolean
}

export function AuthCard({
  heading,
  fields,
  submitLabel,
  onSubmit,
  error,
  busy = false,
}: AuthCardProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values: Record<string, string> = {}
    for (const [name, value] of new FormData(e.currentTarget)) {
      values[name] = String(value)
    }
    onSubmit?.(values)
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
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}
      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
