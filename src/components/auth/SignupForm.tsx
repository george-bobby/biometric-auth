import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Lock, Mail, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileSelection } from './ProfileSelection'
import { ThreeStepVerification } from './ThreeStepVerification'
import { ProfileType } from '../../types/auth'

export const SignupForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'credentials' | 'profile' | 'verification'>('credentials')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | undefined>()
  const [userId, setUserId] = useState<string | null>(null)

  const { signup, isLoading, error, setBiometricVerified } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      return
    }

    if (!selectedProfile) {
      return
    }

    try {
      const result = await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        profile: selectedProfile,
        authentication_mode: 'both' // Always use combined authentication
      })

      // If signup successful, proceed to verification
      if (result?.user?.id) {
        setUserId(result.user.id)
        setCurrentStep('verification')
      }
    } catch (error) {
      // Signup failed
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleNextStep = () => {
    if (currentStep === 'credentials') {
      setCurrentStep('profile')
    }
  }

  const handlePrevStep = () => {
    if (currentStep === 'profile') {
      setCurrentStep('credentials')
    } else if (currentStep === 'verification') {
      setCurrentStep('profile')
    }
  }

  const handleVerificationComplete = async (success: boolean, data?: any) => {
    if (success) {
      // Verification successful - user is now fully registered
      // Mark biometric verification as complete
      await setBiometricVerified(true)

      // The AuthContext should handle navigation to dashboard
    } else {
      // Verification failed - allow retry or go back
    }
  }

  const handleVerificationCancel = () => {
    setCurrentStep('profile')
  }

  const canProceedFromCredentials = () => {
    return formData.username &&
           formData.password &&
           formData.confirmPassword &&
           formData.password === formData.confirmPassword
  }

  // Step 1: Credentials
  if (currentStep === 'credentials') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Step 1 of 3: Enter your credentials</p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Input
              name="username"
              type="text"
              placeholder="Choose a username"
              label="Username"
              icon={User}
              value={formData.username}
              onChange={handleChange}
              required
            />

            <Input
              name="email"
              type="email"
              placeholder="Enter your email"
              label="Email (Optional)"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              name="password"
              type="password"
              placeholder="Create a password"
              label="Password"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Input
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              label="Confirm Password"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={formData.password !== formData.confirmPassword && formData.confirmPassword ? 'Passwords do not match' : ''}
              required
            />

            <Button
              onClick={handleNextStep}
              className="w-full"
              disabled={!canProceedFromCredentials()}
              icon={ArrowRight}
            >
              Next: Choose Profile
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Profile Selection
  if (currentStep === 'profile') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <ProfileSelection
          selectedProfile={selectedProfile}
          onProfileSelect={setSelectedProfile}
          title="Step 2 of 3: Select Your Profile"
          description="Choose the profile that represents you for biometric authentication"
        />

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevStep} icon={ArrowLeft}>
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProfile}
            isLoading={isLoading}
          >
            Create Account & Verify
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Step 3: Biometric Verification
  if (currentStep === 'verification' && selectedProfile && userId) {
    return (
      <ThreeStepVerification
        profile={selectedProfile}
        userId={userId}
        onComplete={handleVerificationComplete}
        onCancel={handleVerificationCancel}
      />
    )
  }

  return null
}