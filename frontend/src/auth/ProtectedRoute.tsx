import { Center, Loader } from '@mantine/core'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from '../api/types'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
