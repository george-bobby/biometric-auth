import React from 'react'
import { CombinedAuth } from '../components/auth/CombinedAuth'

export const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex flex-col items-center justify-center p-4">
      <CombinedAuth />
    </div>
  )
}
