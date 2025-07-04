import React from 'react'
import { SignupForm } from '../components/auth/SignupForm'

export const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full flex justify-center">
        <SignupForm />
      </div>
    </div>
  )
}