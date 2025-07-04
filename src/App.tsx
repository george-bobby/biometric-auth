import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ModePage } from './pages/ModePage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  // Check if user needs to complete biometric authentication
  const needsBiometricAuth = () => {
    // If user doesn't have a profile, they need to select one
    if (!user?.profile) {
      return '/mode'
    }
    // For test credentials, allow direct dashboard access
    if (user?.username === 'test' || user?.email === 'test@example.com') {
      return '/dashboard'
    }
    // Otherwise, require biometric authentication
    return '/auth'
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={needsBiometricAuth()} replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to={needsBiometricAuth()} replace /> : <SignupPage />} />
      <Route path="/mode" element={<ProtectedRoute><ModePage /></ProtectedRoute>} />
      <Route path="/auth" element={<ProtectedRoute><AuthPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App