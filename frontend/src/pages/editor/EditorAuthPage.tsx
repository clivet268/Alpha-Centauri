import { useNavigate } from 'react-router'
import RegisterLoginPage from '../../components/RegisterLoginPage'
import { loginJournal, registerJournal } from '../../services/journals'
import { setStoredJournalId } from '../../services/session'

export default function EditorAuthPage() {
  const navigate = useNavigate()

  async function onRegister(values: Record<string, string>) {
    const { journalId } = await registerJournal({
      journalName: values.journalName,
      rubricId: values.rubricId,
      email: values.email,
      password: values.password,
    })
    setStoredJournalId(journalId)
    navigate('/editor/dashboard')
  }

  async function onLogin(values: Record<string, string>) {
    const { journalId } = await loginJournal({
      email: values.email,
      password: values.password,
    })
    setStoredJournalId(journalId)
    // The dashboard fetches its payload (GET /journal/dashboard) for this journalId.
    navigate('/editor/dashboard')
  }

  return (
    <RegisterLoginPage
      title="Journal Editor Auth"
      onRegister={onRegister}
      onLogin={onLogin}
    />
  )
}
