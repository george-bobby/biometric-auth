import React from 'react'
import { Shield, Check, LogOut } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.username}!</p>
          </div>
          <Button onClick={handleLogout} variant="outline" icon={LogOut}>
            Logout
          </Button>
        </div>

        {/* Authentication Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Authentication Complete</h2>
                <p className="text-gray-600">All security measures have been successfully verified</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <Check className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-900">Password</p>
                  <p className="text-sm text-green-700">Verified</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <Check className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-900">Face Recognition</p>
                  <p className="text-sm text-green-700">Verified</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <Check className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-900">Voice Recognition</p>
                  <p className="text-sm text-green-700">Verified</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-900">Account Information</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Username:</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{user?.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Account Created:</span>
                <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Security Level:</span>
                <span className="font-medium text-green-600">High (Multi-factor)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}