import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-candy">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🔐</div>
          <p className="font-black text-[#1A1040]">Vérification...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/connexion" replace />
  }

  return <>{children}</>
}
