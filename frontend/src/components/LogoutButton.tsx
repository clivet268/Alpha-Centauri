import { useNavigate } from 'react-router'
import {
  clearStoredDesignerId,
  clearStoredJournalId,
} from '../services/session'

interface LogoutButtonProps {
  role: 'designer' | 'editor'
}

// Forgets the stored id for this role and returns to that role's login page.
export default function LogoutButton({ role }: LogoutButtonProps) {
  const navigate = useNavigate()

  function logout() {
    if (role === 'designer') clearStoredDesignerId()
    else clearStoredJournalId()
    navigate(`/${role}/login`, { replace: true })
  }

  return (
    <button type="button" onClick={logout}>
      Log Out
    </button>
  )
}
