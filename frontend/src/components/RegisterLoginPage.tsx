import { useState } from 'react'
import { useNavigate } from 'react-router'
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
  onLogin?: (values: Record<string, string>) => Promise<void>
}

export default function RegisterLoginPage({
  title,
  onRegister,
  onLogin,
}: RegisterLoginPageProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState<string>()

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

  async function handleLogin(values: Record<string, string>) {
    if (!onLogin) return
    setLoginBusy(true)
    setLoginError(undefined)
    try {
      await onLogin(values)
    } catch (err) {
      setLoginError(
        err instanceof ApiError ? err.message : 'Could not log in.',
      )
    } finally {
      setLoginBusy(false)
    }
  }

  return (
    <div className="page">
      <TitleBar
        title={title}
        left={
          <button type="button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        }
      />
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
            onSubmit={onLogin ? handleLogin : undefined}
            error={loginError}
            busy={loginBusy}
          />
        </div>
      </div>
    </div>
  )
}
