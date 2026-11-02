import { AuthCard } from './AuthForms'
import {
  EMAIL_FIELD,
  JOURNAL_NAME_FIELD,
  PASSWORD_FIELD,
  RUBRIC_ID_FIELD,
} from './authFields'
import TitleBar from './TitleBar'

export default function RegisterLoginPage({ title }: { title: string }) {
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
