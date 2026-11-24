import { Navigate, Outlet, useSearchParams } from 'react-router'
import { getStoredJournalId } from '../services/session'

// Layout route guard: editor pages need a journalId (stored, or ?journalId= in the
// URL, which the dashboard accepts), else go log in.
export default function RequireEditor() {
  const [searchParams] = useSearchParams()
  if (!searchParams.get('journalId') && !getStoredJournalId()) {
    return <Navigate to="/editor/login" replace />
  }
  return <Outlet />
}
