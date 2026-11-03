import { useState } from 'react'
import { ApiError } from '../services/api'
import { AuthCard } from './AuthForms'
import {
  EMAIL_FIELD,
  JOURNAL_NAME_FIELD,
  PASSWORD_FIELD,
  RUBRIC_ID_FIELD,
} from './authFields'
import TitleBar from './TitleBar'

interface RegisterLoginPageProps {
  title: string
  onRegister?: (values: Record<string, string>) => Promise<void>
}

export default function RegisterLoginPage({
  title,
  onRegister,
}: RegisterLoginPageProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function handleRegister(values: Record<string, string>) {
    if (!onRegister) return
    setBusy(true)
    setError(undefined)
    try {
      await onRegister(values)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <TitleBar title={title} />
      <div className="authspace">
        <div className="auth">
          <AuthCard
            heading="Register"
            fields={[
              JOURNAL_NAME_FIELD,
              RUBRIC_ID_FIELD,
              EMAIL_FIELD,
              PASSWORD_FIELD,
            ]}
            submitLabel="Authenticate"
            onSubmit={onRegister ? handleRegister : undefined}
            error={error}
            busy={busy}
          />
          <AuthCard
            heading="Login"
            fields={[EMAIL_FIELD, PASSWORD_FIELD]}
            submitLabel="Authenticate"
          />
        </div>
      </div>
    </div>
  )
}
