import { Navigate, Outlet } from 'react-router'
import { getStoredDesignerId } from '../services/session'

// Layout route guard: designer pages need a stored designerId, else go log in.
export default function RequireDesigner() {
  if (!getStoredDesignerId()) {
    return <Navigate to="/designer/login" replace />
  }
  return <Outlet />
}
