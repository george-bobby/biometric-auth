import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { SimultaneousCapture } from './SimultaneousCapture'
import { ProfileType } from '../../types/auth'

interface ThreeStepVerificationProps {
  profile: ProfileType
  userId: string
  onComplete: (success: boolean, data?: any) => void
  onCancel?: () => void
}

interface StepResult {
  step: 'face' | 'voice' | 'lipsync'
  success: boolean
  data?: any
  timestamp: Date
}

export const ThreeStepVerification: React.FC<ThreeStepVerificationProps> = ({
  profile,
  userId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<'capture' | 'results'>('capture')
  const [stepResults, setStepResults] = useState<StepResult[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [overallSuccess, setOverallSuccess] = useState(false)

  const handleStepComplete = (step: 'face' | 'voice' | 'lipsync', success: boolean, data?: any) => {
    const result: StepResult = {
      step,
      success,
      data,
      timestamp: new Date()
    }

    setStepResults(prev => {
      const updated = [...prev]
      const existingIndex = updated.findIndex(r => r.step === step)
      if (existingIndex >= 0) {
        updated[existingIndex] = result
      } else {
        updated.push(result)
      }
      return updated
    })
  }

  const handleAllStepsComplete = (success: boolean) => {
    setIsComplete(true)
    setOverallSuccess(success)
    setCurrentStep('results')
    
    // Auto-complete after showing results for a moment
    setTimeout(() => {
      onComplete(success, {
        stepResults,
        completedAt: new Date(),
        profile,
        userId
      })
    }, 2000)
  }

  const handleRetry = () => {
    setStepResults([])
    setIsComplete(false)
    setOverallSuccess(false)
    setCurrentStep('capture')
  }

  const getStepStatus = (step: 'face' | 'voice' | 'lipsync') => {
    const result = stepResults.find(r => r.step === step)
    if (!result) return 'pending'
    return result.success ? 'success' : 'failed'
  }

  const getStepIcon = (step: 'face' | 'voice' | 'lipsync') => {
    const status = getStepStatus(step)
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStepLabel = (step: 'face' | 'voice' | 'lipsync') => {
    switch (step) {
      case 'face':
        return 'Face Recognition'
      case 'voice':
        return 'Voice Recognition'
      case 'lipsync':
        return 'Lip Synchronization'
    }
  }

  if (currentStep === 'results') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            {overallSuccess ? 'Verification Complete!' : 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overall Status */}
          <div className={`text-center p-6 rounded-lg ${
            overallSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {overallSuccess ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            <h3 className={`text-xl font-semibold mb-2 ${
              overallSuccess ? 'text-green-800' : 'text-red-800'
            }`}>
              {overallSuccess 
                ? `Welcome, ${profile}!` 
                : 'Verification Incomplete'
              }
            </h3>
            <p className={`${overallSuccess ? 'text-green-700' : 'text-red-700'}`}>
              {overallSuccess 
                ? 'All biometric checks passed successfully.'
                : 'One or more verification steps failed. Please try again.'
              }
            </p>
          </div>

          {/* Step Results Summary */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Verification Steps:</h4>
            {(['face', 'voice', 'lipsync'] as const).map((step) => {
              const result = stepResults.find(r => r.step === step)
              return (
                <div key={step} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step)}
                    <span className="font-medium">{getStepLabel(step)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result ? (
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? 'Passed' : 'Failed'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not completed</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            {!overallSuccess && (
              <Button onClick={handleRetry} variant="outline" className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
            )}
            
            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
            
            {overallSuccess && (
              <Button onClick={() => onComplete(true, { stepResults })} className="flex items-center space-x-2">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            3-Step Biometric Verification for {profile}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center space-x-8">
            {(['face', 'voice', 'lipsync'] as const).map((step, index) => (
              <div key={step} className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    getStepStatus(step) === 'success' ? 'bg-green-500 text-white' :
                    getStepStatus(step) === 'failed' ? 'bg-red-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {getStepStatus(step) === 'success' ? '✓' :
                     getStepStatus(step) === 'failed' ? '✗' :
                     index + 1}
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-0.5 ${
                      stepResults.length > index ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {getStepLabel(step)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simultaneous Capture Component */}
      <SimultaneousCapture
        profile={profile}
        userId={userId}
        onStepComplete={handleStepComplete}
        onAllStepsComplete={handleAllStepsComplete}
      />
    </div>
  )
}
