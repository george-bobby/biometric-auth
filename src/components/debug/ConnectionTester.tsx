import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database, 
  User, 
  Shield,
  Mic,
  Camera,
  Eye
} from 'lucide-react'
import { AuthAPI, BiometricAPI, DebugUtils } from '../../lib/api'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error' | 'idle'
  message?: string
  data?: any
  duration?: number
}

export const ConnectionTester: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Health', status: 'idle' },
    { name: 'Profiles API', status: 'idle' },
    { name: 'Auth Signup', status: 'idle' },
    { name: 'Auth Login', status: 'idle' },
    { name: 'Face Recognition', status: 'idle' },
    { name: 'Voice Recognition', status: 'idle' },
    { name: 'Combined Auth', status: 'idle' },
    { name: 'Lip Sync Check', status: 'idle' }
  ])
  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ))
  }

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now()
    updateTest(testName, { status: 'pending' })
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      updateTest(testName, { 
        status: 'success', 
        message: 'Test passed',
        data: result,
        duration 
      })
    } catch (error) {
      const duration = Date.now() - startTime
      updateTest(testName, { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Test failed',
        duration 
      })
    }
  }

  const testBackendHealth = async () => {
    const result = await DebugUtils.testBackendConnection()
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  }

  const testProfilesAPI = async () => {
    const result = await DebugUtils.testEndpoint('/api/profiles')
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  }

  const testAuthSignup = async () => {
    // Test with a temporary user
    const testUser = {
      username: `test_${Date.now()}`,
      password: 'testpass123',
      profile: 'George',
      authentication_mode: 'both'
    }
    
    try {
      const result = await AuthAPI.signup(testUser)
      return result
    } catch (error) {
      // If user already exists, that's actually a good sign the endpoint works
      if (error instanceof Error && error.message.includes('already exists')) {
        return { message: 'Signup endpoint working (user exists)' }
      }
      throw error
    }
  }

  const testAuthLogin = async () => {
    // Try to login with test credentials
    try {
      const result = await AuthAPI.login({
        username: 'test',
        password: 'test'
      })
      return result
    } catch (error) {
      // If credentials are wrong, that's still a sign the endpoint works
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('not found') ||
        error.message.includes('credentials')
      )) {
        return { message: 'Login endpoint working (invalid credentials expected)' }
      }
      throw error
    }
  }

  const testFaceRecognition = async () => {
    // Create a dummy base64 image (1x1 pixel)
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    
    try {
      const result = await BiometricAPI.recognizeFace(dummyImage, 'test_user')
      return result
    } catch (error) {
      // If it fails due to no face detected, that's expected
      if (error instanceof Error && (
        error.message.includes('No face') ||
        error.message.includes('face detected') ||
        error.message.includes('Invalid image')
      )) {
        return { message: 'Face recognition endpoint working (no face in test image expected)' }
      }
      throw error
    }
  }

  const testVoiceRecognition = async () => {
    // Create a dummy audio blob
    const dummyAudio = new Blob(['dummy audio data'], { type: 'audio/wav' })
    
    try {
      const result = await BiometricAPI.recognizeVoice(dummyAudio, 'test_user')
      return result
    } catch (error) {
      // If it fails due to invalid audio, that's expected
      if (error instanceof Error && (
        error.message.includes('audio') ||
        error.message.includes('voice') ||
        error.message.includes('Invalid')
      )) {
        return { message: 'Voice recognition endpoint working (invalid audio expected)' }
      }
      throw error
    }
  }

  const testCombinedAuth = async () => {
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const dummyAudio = new Blob(['dummy audio data'], { type: 'audio/wav' })
    
    try {
      const result = await BiometricAPI.authenticateCombined(
        'both',
        'George',
        'test_user',
        dummyImage,
        dummyAudio
      )
      return result
    } catch (error) {
      // If it fails due to invalid data, that's expected
      if (error instanceof Error && (
        error.message.includes('authentication') ||
        error.message.includes('Invalid') ||
        error.message.includes('failed')
      )) {
        return { message: 'Combined auth endpoint working (auth failure expected)' }
      }
      throw error
    }
  }

  const testLipSyncCheck = async () => {
    const dummyVideo = 'data:video/webm;base64,dummy'
    const dummyAudio = new Blob(['dummy audio data'], { type: 'audio/wav' })
    
    try {
      const result = await BiometricAPI.lipSyncCheck(dummyVideo, dummyAudio, 4)
      return result
    } catch (error) {
      // If it fails due to invalid data, that's expected
      if (error instanceof Error && (
        error.message.includes('lip') ||
        error.message.includes('sync') ||
        error.message.includes('Invalid')
      )) {
        return { message: 'Lip sync endpoint working (invalid data expected)' }
      }
      throw error
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'idle' as const })))
    
    // Run tests sequentially
    await runTest('Backend Health', testBackendHealth)
    await runTest('Profiles API', testProfilesAPI)
    await runTest('Auth Signup', testAuthSignup)
    await runTest('Auth Login', testAuthLogin)
    await runTest('Face Recognition', testFaceRecognition)
    await runTest('Voice Recognition', testVoiceRecognition)
    await runTest('Combined Auth', testCombinedAuth)
    await runTest('Lip Sync Check', testLipSyncCheck)
    
    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />
    }
  }

  const getTestIcon = (testName: string) => {
    switch (testName) {
      case 'Backend Health':
        return <Server className="w-4 h-4" />
      case 'Profiles API':
        return <Database className="w-4 h-4" />
      case 'Auth Signup':
      case 'Auth Login':
        return <User className="w-4 h-4" />
      case 'Face Recognition':
        return <Camera className="w-4 h-4" />
      case 'Voice Recognition':
        return <Mic className="w-4 h-4" />
      case 'Combined Auth':
        return <Shield className="w-4 h-4" />
      case 'Lip Sync Check':
        return <Eye className="w-4 h-4" />
      default:
        return <div className="w-4 h-4" />
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Connection & API Tests
          </CardTitle>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            icon={RefreshCw}
            variant="outline"
          >
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests.map((test) => (
          <div
            key={test.name}
            className={`p-3 rounded-lg border ${
              test.status === 'success' ? 'bg-green-50 border-green-200' :
              test.status === 'error' ? 'bg-red-50 border-red-200' :
              test.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTestIcon(test.name)}
                <span className="font-medium">{test.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {test.duration && (
                  <span className="text-xs text-gray-500">
                    {test.duration}ms
                  </span>
                )}
                {getStatusIcon(test.status)}
              </div>
            </div>
            {test.message && (
              <div className="mt-2 text-sm text-gray-600">
                {test.message}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
