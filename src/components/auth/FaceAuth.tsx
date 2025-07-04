import React, { useState, useRef, useEffect } from 'react'
import { Camera, Check, X, RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { BiometricAPI } from '../../lib/api'

export const FaceAuth: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [recognitionResult, setRecognitionResult] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { updateBiometricData, user } = useAuth()

  // Check if user has required profile
  if (!user?.profile) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="text-center p-8">
            <div className="text-amber-600 mb-4">⚠️ Profile Required</div>
            <p className="text-gray-600 mb-4">
              You need to select a profile before using face authentication.
            </p>
            <button
              onClick={() => window.location.href = '/auth-mode-selection'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Profile Selection
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setStatus('error')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        setIsCapturing(false)
        stopCamera()
      }
    }
  }

  const processAuthentication = async () => {
    if (!capturedImage || !user || !user.profile) return

    setIsProcessing(true)
    setRecognitionResult(null)

    try {
      // First, store the face data in Supabase
      await updateBiometricData({ face_data: capturedImage })

      // Then, send to backend for profile-based authentication
      const response = await BiometricAPI.authenticateCombined(
        'face',
        user.profile,
        user.id,
        capturedImage
      )

      if (response.success && response.authentication_passed) {
        const faceMatch = response.face_match
        if (faceMatch) {
          setRecognitionResult(`✅ Authenticated as ${faceMatch.name} (${faceMatch.similarity}% confidence)`)
          setStatus('success')
        }
      } else {
        setRecognitionResult(response.message || 'Face authentication failed')
        setStatus('error')
      }
    } catch (error) {
      console.error('Face authentication failed:', error)
      setRecognitionResult('Face authentication failed. Please try again.')
      setStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const retryAuthentication = () => {
    setCapturedImage(null)
    setStatus('idle')
    setIsCapturing(false)
    setRecognitionResult(null)
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Face Authentication</h2>
          <p className="text-gray-600 mt-2">Position your face in the frame and capture</p>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Camera Input */}
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />
                  {!isCameraActive && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Click "Start Camera" to begin</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Face detection overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-blue-500 rounded-full opacity-50"></div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800">Face authentication successful!</span>
              </div>
              {recognitionResult && (
                <span className="text-sm text-green-700">{recognitionResult}</span>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <X className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">Face authentication failed</span>
              </div>
              {recognitionResult && (
                <span className="text-sm text-red-700">{recognitionResult}</span>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            {!isCameraActive && !capturedImage && (
              <Button onClick={startCamera} icon={Camera}>
                Start Camera
              </Button>
            )}

            {isCameraActive && !capturedImage && (
              <Button onClick={captureImage} icon={Camera}>
                Capture Face
              </Button>
            )}

            {capturedImage && status === 'idle' && (
              <>
                <Button onClick={retryAuthentication} variant="outline" icon={RotateCcw}>
                  Retake
                </Button>
                <Button onClick={processAuthentication} isLoading={isProcessing} icon={Check}>
                  Authenticate
                </Button>
              </>
            )}
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
