import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProfileSelection } from '../components/auth/ProfileSelection'
import { useAuth } from '../contexts/AuthContext'
import { ProfileType } from '../types/auth'
import { BiometricAPI, ProfileInfo } from '../lib/api'

export const ModePage: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { user, updateAuthenticationMode, updateProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const checkProfile = async () => {
      try {
        if (user?.profile) {
          // User already has a profile, redirect to auth
          navigate('/auth')
          return
        }
        // User doesn't have a profile, show profile selection
        setSelectedProfile(undefined)
      } catch (err) {
        setError('Failed to check profile')
      } finally {
        setIsLoading(false)
      }
    }

    checkProfile()
  }, [user, navigate])

  const handleProfileSelect = (profile: ProfileType) => {
    setSelectedProfile(profile)
  }

  const handleProfileContinue = async () => {
    if (!selectedProfile) return

    try {
      // Update user's profile and set combined auth as default
      await updateProfile(selectedProfile)
      await updateAuthenticationMode('both')
      
      // Navigate to authentication
      navigate('/auth')
    } catch (error) {
      setError('Failed to update profile')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome, {user?.username}!
            </h3>
            <p className="text-gray-600">
              Please select your profile to continue with biometric authentication
            </p>
          </div>
        </div>

        <ProfileSelection
          selectedProfile={selectedProfile}
          onProfileSelect={handleProfileSelect}
          title="Select Your Profile"
          description="Choose the profile that represents you for biometric authentication"
        />

        {selectedProfile && (
          <div className="text-center">
            <button
              onClick={handleProfileContinue}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Continue with {selectedProfile}
            </button>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  )
}
