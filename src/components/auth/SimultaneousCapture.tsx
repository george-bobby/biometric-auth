import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Camera, Mic, Check, X, Play, Square, AlertCircle } from 'lucide-react'
import { ProfileType } from '../../types/auth'
import { BiometricAPI } from '../../lib/api'

interface SimultaneousCaptureProps {
  profile: ProfileType
  userId: string
  onStepComplete: (step: 'face' | 'voice' | 'lipsync', success: boolean, data?: any) => void
  onAllStepsComplete: (success: boolean) => void
}

interface FaceDetection {
  box: { x: number; y: number; width: number; height: number }
  confidence: number
  landmarks?: any
}

interface VerificationStep {
  step: 'face' | 'voice' | 'lipsync'
  status: 'pending' | 'processing' | 'success' | 'error'
  message: string
  data?: any
}

export const SimultaneousCapture: React.FC<SimultaneousCaptureProps> = ({
  profile,
  userId,
  onStepComplete,
  onAllStepsComplete
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [faceDetections, setFaceDetections] = useState<FaceDetection[]>([])
  const [currentStep, setCurrentStep] = useState<'face' | 'voice' | 'lipsync'>('face')
  const [steps, setSteps] = useState<VerificationStep[]>([
    { step: 'face', status: 'pending', message: 'Position your face in the camera' },
    { step: 'voice', status: 'pending', message: 'Speak clearly for voice recognition' },
    { step: 'lipsync', status: 'pending', message: 'Speak while looking at camera for lip sync' }
  ])
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // Initialize face-api models
  const initializeFaceAPI = useCallback(async () => {
    try {
      const MODEL_URL = '/models' // You'll need to add face-api models to public/models
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to load face-api models:', error)
      // Fallback: continue without face detection
      setIsInitialized(true)
    }
  }, [])

  // Start camera and microphone
  const startStreaming = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
        
        // Start face detection after video loads
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection()
        }
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error)
      updateStepStatus('face', 'error', 'Failed to access camera/microphone')
    }
  }, [])

  // Face detection loop
  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isInitialized) return

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()

        const canvas = canvasRef.current
        const displaySize = { 
          width: videoRef.current.videoWidth, 
          height: videoRef.current.videoHeight 
        }
        
        faceapi.matchDimensions(canvas, displaySize)
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          
          // Draw bounding boxes
          resizedDetections.forEach((detection, index) => {
            const box = detection.detection.box
            const confidence = detection.detection.score
            
            // Color based on confidence
            let color = '#ff0000' // Red for low confidence
            if (confidence > 0.8) color = '#00ff00' // Green for high confidence
            else if (confidence > 0.6) color = '#ffff00' // Yellow for medium confidence
            
            // Draw bounding box
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            
            // Draw confidence label
            ctx.fillStyle = color
            ctx.font = '16px Arial'
            ctx.fillText(
              `${profile} (${Math.round(confidence * 100)}%)`,
              box.x,
              box.y - 10
            )
            
            // Draw landmarks if available
            if (detection.landmarks) {
              faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
            }
          })
          
          // Update detections state
          const faceDetectionData = resizedDetections.map(detection => ({
            box: detection.detection.box,
            confidence: detection.detection.score,
            landmarks: detection.landmarks
          }))
          
          setFaceDetections(faceDetectionData)
        }
      } catch (error) {
        console.error('Face detection error:', error)
      }
    }

    // Run detection every 100ms
    detectionIntervalRef.current = setInterval(detectFaces, 100)
  }, [isInitialized, profile])

  // Update step status
  const updateStepStatus = (step: 'face' | 'voice' | 'lipsync', status: 'pending' | 'processing' | 'success' | 'error', message: string, data?: any) => {
    setSteps(prev => prev.map(s => 
      s.step === step ? { ...s, status, message, data } : s
    ))
  }

  // Capture image for face verification
  const captureImageForFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (ctx && videoRef.current.videoWidth && videoRef.current.videoHeight) {
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
      return imageData
    }
    return null
  }, [])

  // Step 1: Face Verification
  const processFaceVerification = useCallback(async () => {
    if (faceDetections.length === 0) {
      updateStepStatus('face', 'error', 'No face detected. Please position your face in the camera.')
      return
    }

    const highConfidenceDetection = faceDetections.find(detection => detection.confidence > 0.7)
    if (!highConfidenceDetection) {
      updateStepStatus('face', 'error', 'Face detection confidence too low. Please ensure good lighting.')
      return
    }

    updateStepStatus('face', 'processing', 'Processing face verification...')

    const imageData = captureImageForFace()
    if (!imageData) {
      updateStepStatus('face', 'error', 'Failed to capture image')
      return
    }

    try {
      const response = await BiometricAPI.authenticateCombined(
        'face',
        profile,
        userId,
        imageData
      )

      if (response.success && response.authentication_passed) {
        updateStepStatus('face', 'success', `Face verified as ${profile}`, {
          imageData,
          faceDetections,
          confidence: response.face_match?.similarity
        })
        onStepComplete('face', true, { imageData, faceDetections })
        setCurrentStep('voice')
      } else {
        updateStepStatus('face', 'error', response.message || 'Face verification failed')
        onStepComplete('face', false)
      }
    } catch (error) {
      updateStepStatus('face', 'error', 'Face verification failed')
      onStepComplete('face', false)
    }
  }, [faceDetections, profile, userId, captureImageForFace, onStepComplete])

  // Step 2: Voice Recording and Verification
  const startVoiceRecording = useCallback(async () => {
    if (!streamRef.current) return

    updateStepStatus('voice', 'processing', 'Recording voice... Speak clearly for 3-5 seconds')

    try {
      const audioStream = new MediaStream(
        streamRef.current.getAudioTracks()
      )

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(audioBlob)

        // Process voice verification
        try {
          const response = await BiometricAPI.authenticateCombined(
            'voice',
            profile,
            userId,
            undefined,
            audioBlob
          )

          if (response.success && response.authentication_passed) {
            updateStepStatus('voice', 'success', `Voice verified as ${profile}`, {
              audioBlob,
              confidence: response.voice_match?.similarity
            })
            onStepComplete('voice', true, { audioBlob })
            setCurrentStep('lipsync')
          } else {
            updateStepStatus('voice', 'error', response.message || 'Voice verification failed')
            onStepComplete('voice', false)
          }
        } catch (error) {
          updateStepStatus('voice', 'error', 'Voice verification failed')
          onStepComplete('voice', false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 5000)

      // Update recording time
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 5) {
            clearInterval(timer)
            return 5
          }
          return prev + 1
        })
      }, 1000)

    } catch (error) {
      updateStepStatus('voice', 'error', 'Failed to start voice recording')
      onStepComplete('voice', false)
    }
  }, [profile, userId, onStepComplete])

  // Step 3: Lip Sync Verification
  const startLipSyncVerification = useCallback(async () => {
    if (!streamRef.current) return

    updateStepStatus('lipsync', 'processing', 'Recording video and audio for lip sync verification...')

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' })
        setVideoBlob(videoBlob)

        // Convert video to base64 for backend processing
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Video = reader.result as string

            // Create audio blob from the same recording
            const audioBlob = new Blob(chunks, { type: 'audio/wav' })

            const response = await BiometricAPI.lipSyncCheck(base64Video, audioBlob, 4)

            if (response.success && response.lip_sync_detected) {
              updateStepStatus('lipsync', 'success', 'Lip synchronization verified!', {
                videoBlob,
                audioBlob,
                confidence: response.confidence
              })
              onStepComplete('lipsync', true, { videoBlob, audioBlob })
              onAllStepsComplete(true)
            } else {
              updateStepStatus('lipsync', 'error', response.message || 'Lip sync verification failed')
              onStepComplete('lipsync', false)
              onAllStepsComplete(false)
            }
          } catch (error) {
            updateStepStatus('lipsync', 'error', 'Lip sync verification failed')
            onStepComplete('lipsync', false)
            onAllStepsComplete(false)
          }
        }
        reader.readAsDataURL(videoBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Auto-stop after 4 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 4000)

      // Update recording time
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 4) {
            clearInterval(timer)
            return 4
          }
          return prev + 1
        })
      }, 1000)

    } catch (error) {
      updateStepStatus('lipsync', 'error', 'Failed to start lip sync recording')
      onStepComplete('lipsync', false)
      onAllStepsComplete(false)
    }
  }, [profile, userId, onStepComplete, onAllStepsComplete])

  // Initialize on mount
  useEffect(() => {
    initializeFaceAPI()
    return () => {
      // Cleanup
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [initializeFaceAPI])

  // Auto-start streaming when initialized
  useEffect(() => {
    if (isInitialized && !isStreaming) {
      startStreaming()
    }
  }, [isInitialized, isStreaming, startStreaming])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span>3-Step Biometric Verification</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video Display with Overlay */}
        <div className="relative">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Canvas overlay for bounding boxes */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }} // Mirror effect
            />
            
            {/* Status overlay */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isStreaming ? 'Live' : 'Connecting...'}
                </span>
              </div>
            </div>
            
            {/* Face detection info */}
            {faceDetections.length > 0 && (
              <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
                <div className="text-sm">
                  Faces: {faceDetections.length} | 
                  Confidence: {Math.round(Math.max(...faceDetections.map(d => d.confidence)) * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentStep === step.step
                  ? 'border-blue-500 bg-blue-50'
                  : step.status === 'success'
                  ? 'border-green-500 bg-green-50'
                  : step.status === 'error'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'success' ? 'bg-green-500 text-white' :
                    step.status === 'error' ? 'bg-red-500 text-white' :
                    step.status === 'processing' ? 'bg-blue-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {step.status === 'success' ? <Check className="w-4 h-4" /> :
                     step.status === 'error' ? <X className="w-4 h-4" /> :
                     step.status === 'processing' ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> :
                     index + 1}
                  </div>
                  
                  <div>
                    <h3 className="font-medium capitalize">
                      Step {index + 1}: {step.step} Verification
                    </h3>
                    <p className="text-sm text-gray-600">{step.message}</p>
                  </div>
                </div>
                
                {currentStep === step.step && (
                  <>
                    {step.step === 'face' && (
                      <Button
                        onClick={processFaceVerification}
                        disabled={faceDetections.length === 0 || step.status === 'processing'}
                        className="ml-4"
                      >
                        {step.status === 'processing' ? 'Processing...' : 'Verify Face'}
                      </Button>
                    )}

                    {step.step === 'voice' && (
                      <Button
                        onClick={startVoiceRecording}
                        disabled={isRecording || step.status === 'processing'}
                        className="ml-4 flex items-center space-x-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>
                          {isRecording ? `Recording... ${recordingTime}s` :
                           step.status === 'processing' ? 'Processing...' : 'Record Voice'}
                        </span>
                      </Button>
                    )}

                    {step.step === 'lipsync' && (
                      <Button
                        onClick={startLipSyncVerification}
                        disabled={isRecording || step.status === 'processing'}
                        className="ml-4 flex items-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>
                          {isRecording ? `Recording... ${recordingTime}s` :
                           step.status === 'processing' ? 'Processing...' : 'Start Lip Sync'}
                        </span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Current Step: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1)} Verification</p>
              {currentStep === 'face' && (
                <p>Position your face clearly in the camera frame. The system will detect your face and show a bounding box when ready.</p>
              )}
              {currentStep === 'voice' && (
                <p>Click the microphone button and speak clearly for 3-5 seconds.</p>
              )}
              {currentStep === 'lipsync' && (
                <p>Speak while looking directly at the camera to verify lip synchronization.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
