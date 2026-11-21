import { useNavigate } from 'react-router'
import RegisterLoginPage from '../../components/RegisterLoginPage'
import { EMAIL_FIELD, PASSWORD_FIELD } from '../../components/authFields'
import { loginDesigner, registerDesigner } from '../../services/designers'
import { setStoredDesignerId } from '../../services/session'

export default function DesignerAuthPage() {
  const navigate = useNavigate()

  async function onRegister(values: Record<string, string>) {
    const { designerId } = await registerDesigner({
      email: values.email,
      password: values.password,
    })
    setStoredDesignerId(designerId)
    navigate('/designer/rubric')
  }

  async function onLogin(values: Record<string, string>) {
    const { designerId } = await loginDesigner({
      email: values.email,
      password: values.password,
    })
    setStoredDesignerId(designerId)
    navigate('/designer/rubric')
  }

  return (
    <RegisterLoginPage
      title="Rubric Designer Auth"
      registerFields={[EMAIL_FIELD, PASSWORD_FIELD]}
      onRegister={onRegister}
      onLogin={onLogin}
    />
  )
}
