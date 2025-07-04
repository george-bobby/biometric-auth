import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Mic, Shield, Check, X, RotateCcw, Play, Pause, MicOff } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { BiometricAPI } from '../../lib/api'

export const CombinedAuth: React.FC = () => {
  // Face authentication state
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  
  // Voice authentication state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  // Common state
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [authResult, setAuthResult] = useState<string | null>(null)
  const [faceCompleted, setFaceCompleted] = useState(false)
  const [voiceCompleted, setVoiceCompleted] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { updateBiometricData, user } = useAuth()
  const navigate = useNavigate()

  // Check if user has required profile
  if (!user?.profile) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="text-center p-8">
            <div className="text-amber-600 mb-4">⚠️ Profile Required</div>
            <p className="text-gray-600 mb-4">
              You need to select a profile before using combined authentication.
            </p>
            <button
              onClick={() => window.location.href = '/mode'}
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
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Face authentication methods
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 } } 
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
        setFaceCompleted(true)
        stopCamera()
      }
    }
  }



  // Voice authentication methods
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setVoiceCompleted(true)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setStatus('error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Combined authentication
  const processCombinedAuth = async () => {
    if (!capturedImage || !audioBlob || !user || !user.profile) {
      return
    }

    setIsProcessing(true)
    setAuthResult(null)

    try {
      // Store biometric data in Supabase
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string
          await updateBiometricData({
            face_data: capturedImage,
            voice_data: base64Data
          })
        } catch (error) {
          console.error('Biometric data storage failed:', error)
        }
      }
      reader.readAsDataURL(audioBlob)

      // Send to backend for combined authentication
      const response = await BiometricAPI.authenticateCombined(
        'both',
        user.profile,
        user.id,
        capturedImage,
        audioBlob
      )

      if (response.success && response.authentication_passed) {
        const faceMatch = response.face_match
        const voiceMatch = response.voice_match

        setAuthResult(`✅ Authentication Successful!
Face: ${faceMatch?.name} (${faceMatch?.similarity}%)
Voice: ${voiceMatch?.name} (${voiceMatch?.similarity}%)`)
        setStatus('success')

        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        setAuthResult(response.message || 'Authentication failed')
        setStatus('error')
      }
    } catch (error) {
      setAuthResult('Authentication failed. Please try again.')
      setStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetAuthentication = () => {
    setCapturedImage(null)
    setAudioBlob(null)
    setAudioUrl(null)
    setFaceCompleted(false)
    setVoiceCompleted(false)
    setStatus('idle')
    setAuthResult(null)
    setIsPlaying(false)
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canAuthenticate = faceCompleted && voiceCompleted && status === 'idle'

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Biometric Authentication</h2>
          <p className="text-gray-600 mt-2">Complete both face and voice authentication to continue</p>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Face Authentication Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                faceCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {faceCompleted ? <Check className="w-4 h-4 text-white" /> : <Camera className="w-4 h-4 text-gray-500" />}
              </div>
              <h3 className="text-lg font-semibold">Face Authentication</h3>
            </div>



            {/* Face input interface */}
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
                          <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Click "Start Camera"</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                )}
              </div>

              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-blue-500 rounded-full opacity-50"></div>
                </div>
              )}
            </div>

            {/* Face controls */}
            <div className="flex justify-center space-x-2">
              {!isCameraActive && !capturedImage && (
                <Button onClick={startCamera} size="sm" icon={Camera}>
                  Start Camera
                </Button>
              )}

              {isCameraActive && !capturedImage && (
                <Button onClick={captureImage} size="sm" icon={Camera}>
                  Capture
                </Button>
              )}
            </div>
          </div>

          {/* Voice Authentication Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                voiceCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {voiceCompleted ? <Check className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-gray-500" />}
              </div>
              <h3 className="text-lg font-semibold">Voice Authentication</h3>
            </div>

            {/* Voice recording interface */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-center">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-red-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-xl font-mono text-red-600">
                      {formatTime(recordingTime)}
                    </div>
                    <p className="text-sm text-gray-600">Recording...</p>
                  </div>
                ) : audioUrl ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm text-gray-600">Voice captured</p>
                    <Button
                      onClick={isPlaying ? pauseAudio : playAudio}
                      variant="outline"
                      size="sm"
                      icon={isPlaying ? Pause : Play}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto flex items-center justify-center">
                      <Mic className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-600">Ready to record</p>
                  </div>
                )}
              </div>
            </div>

            {/* Phrase instruction */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">Say clearly:</p>
              <p className="text-sm font-semibold text-blue-900">"My voice is my password"</p>
            </div>

            {/* Voice controls */}
            <div className="flex justify-center space-x-2">
              {!isRecording && !audioUrl && (
                <Button onClick={startRecording} size="sm" icon={Mic}>
                  Record
                </Button>
              )}
              
              {isRecording && (
                <Button onClick={stopRecording} size="sm" icon={MicOff} variant="secondary">
                  Stop
                </Button>
              )}
              
              {audioUrl && (
                <Button 
                  onClick={() => {
                    setAudioBlob(null)
                    setAudioUrl(null)
                    setVoiceCompleted(false)
                  }} 
                  size="sm" 
                  variant="outline" 
                  icon={RotateCcw}
                >
                  Re-record
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-semibold">Authentication Successful!</span>
            </div>
            {authResult && (
              <pre className="text-sm text-green-700 whitespace-pre-wrap">{authResult}</pre>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <X className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-semibold">Authentication Failed</span>
            </div>
            {authResult && (
              <span className="text-sm text-red-700">{authResult}</span>
            )}
          </div>
        )}



        {/* Main Controls */}
        <div className="mt-6 flex justify-center space-x-4">
          {canAuthenticate && (
            <Button
              onClick={processCombinedAuth}
              isLoading={isProcessing}
              icon={Shield}
            >
              Continue
            </Button>
          )}

          {(faceCompleted || voiceCompleted) && (
            <Button onClick={resetAuthentication} variant="outline" icon={RotateCcw}>
              Start Over
            </Button>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  )
}
