import React, { useState, useEffect } from 'react'
import { User, Users, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { ProfileType } from '../../types/auth'
import { BiometricAPI, ProfileInfo } from '../../lib/api'

interface ProfileSelectionProps {
  selectedProfile?: ProfileType
  onProfileSelect: (profile: ProfileType) => void
  onNext?: () => void
  showNextButton?: boolean
  title?: string
  description?: string
}

export const ProfileSelection: React.FC<ProfileSelectionProps> = ({
  selectedProfile,
  onProfileSelect,
  onNext,
  showNextButton = false,
  title = "Select Your Profile",
  description = "Choose the profile that represents you for biometric authentication"
}) => {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true)
        const response = await BiometricAPI.getProfiles()
        setProfiles(response.profiles)
      } catch (err) {
        setError('Failed to load available profiles')
        console.error('Error loading profiles:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfiles()
  }, [])

  const handleProfileSelect = (profileName: string) => {
    onProfileSelect(profileName as ProfileType)
  }

  const getProfileIcon = (profileName: string) => {
    switch (profileName) {
      case 'Fenny':
        return '👩'
      case 'George':
        return '👨'
      case 'Jovin':
        return '🧑'
      default:
        return '👤'
    }
  }

  const getProfileDescription = (profile: ProfileInfo) => {
    const modes = []
    if (profile.supports_modes.face) modes.push('Face')
    if (profile.supports_modes.voice) modes.push('Voice')
    if (profile.supports_modes.both) modes.push('Combined')
    
    return `Supports: ${modes.join(', ')} authentication`
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading profiles...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="text-center p-8">
            <div className="text-red-600 mb-4">⚠️ {error}</div>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.name}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedProfile === profile.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleProfileSelect(profile.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getProfileIcon(profile.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getProfileDescription(profile)}
                    </p>
                  </div>
                </div>
                
                {selectedProfile === profile.name && (
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                )}
              </div>
              
              {/* Model availability indicators */}
              <div className="mt-3 flex space-x-4 text-xs">
                <div className={`flex items-center space-x-1 ${
                  profile.has_face_model ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    profile.has_face_model ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Face Model</span>
                </div>
                <div className={`flex items-center space-x-1 ${
                  profile.has_voice_model ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    profile.has_voice_model ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Voice Model</span>
                </div>
              </div>
            </div>
          ))}
          
          {showNextButton && selectedProfile && onNext && (
            <div className="pt-4">
              <Button onClick={onNext} className="w-full">
                Continue with {selectedProfile}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
