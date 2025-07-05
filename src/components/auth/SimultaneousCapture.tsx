import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Camera, Mic, Check, X, Play, Square, AlertCircle, Loader } from 'lucide-react'
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

interface VerificationResult {
  type: 'face' | 'voice' | 'lipsync'
  success: boolean
  message: string
  confidence?: number
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
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [faceDetections, setFaceDetections] = useState<FaceDetection[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([])
  const [recordingComplete, setRecordingComplete] = useState(false)

  // Capture data
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)

  // Initialize face-api models
  const initializeFaceAPI = useCallback(async () => {
    try {
      const MODEL_URL = '/models'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      
      setIsInitialized(true)
    } catch (error) {
      setIsInitialized(true) // Continue without face detection
    }
  }, [])

  useEffect(() => {
    initializeFaceAPI()
  }, [initializeFaceAPI])

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
        
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection()
        }
      }
    } catch (error) {
      // Error accessing camera/microphone
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
          resizedDetections.forEach((detection) => {
            const box = detection.detection.box
            const confidence = detection.detection.score
            
            let color = '#ff0000'
            if (confidence > 0.8) color = '#00ff00'
            else if (confidence > 0.6) color = '#ffff00'
            
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            
            ctx.fillStyle = color
            ctx.font = '16px Arial'
            ctx.fillText(
              `${profile} (${Math.round(confidence * 100)}%)`,
              box.x,
              box.y - 10
            )
          })
          
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

    detectionIntervalRef.current = setInterval(detectFaces, 100)
  }, [isInitialized, profile])

  // Start simultaneous recording
  const startRecording = useCallback(async () => {
    if (!streamRef.current) return

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
        
        // Extract audio from video
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        
        // Capture frame for face recognition
        captureFrameFromVideo()
        
        setRecordingComplete(true)
        setIsProcessing(true)
        
        // Process all verifications
        await processAllVerifications(videoBlob, audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Auto-stop after 5 seconds
      setTimeout(() => {
        stopRecording()
      }, 5000)

    } catch (error) {
      // Failed to start recording
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  // Capture frame from video for face recognition
  const captureFrameFromVideo = useCallback(() => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (ctx && videoRef.current.videoWidth && videoRef.current.videoHeight) {
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
    }
  }, [])

  // Process all verifications
  const processAllVerifications = useCallback(async (videoBlob: Blob, audioBlob: Blob) => {
    const results: VerificationResult[] = []

    try {
      // 1. Face verification
      if (capturedImage) {
        try {
          const faceResponse = await BiometricAPI.authenticateCombined(
            'face',
            profile,
            userId,
            capturedImage
          )

          const faceResult: VerificationResult = {
            type: 'face',
            success: faceResponse.success && faceResponse.authentication_passed,
            message: faceResponse.message || (faceResponse.success ? 'Face verified' : 'Face verification failed'),
            confidence: faceResponse.face_match?.similarity,
            data: faceResponse.face_match
          }
          
          results.push(faceResult)
          onStepComplete('face', faceResult.success, { imageData: capturedImage })
        } catch (error) {
          results.push({
            type: 'face',
            success: false,
            message: 'Face verification failed',
            data: error
          })
          onStepComplete('face', false)
        }
      }

      // 2. Voice verification
      try {
        const voiceResponse = await BiometricAPI.authenticateCombined(
          'voice',
          profile,
          userId,
          undefined,
          audioBlob
        )

        const voiceResult: VerificationResult = {
          type: 'voice',
          success: voiceResponse.success && voiceResponse.authentication_passed,
          message: voiceResponse.message || (voiceResponse.success ? 'Voice verified' : 'Voice verification failed'),
          confidence: voiceResponse.voice_match?.similarity,
          data: voiceResponse.voice_match
        }
        
        results.push(voiceResult)
        onStepComplete('voice', voiceResult.success, { audioBlob })
      } catch (error) {
        results.push({
          type: 'voice',
          success: false,
          message: 'Voice verification failed',
          data: error
        })
        onStepComplete('voice', false)
      }

      // 3. Lip sync verification
      try {
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Video = reader.result as string
            const lipSyncResponse = await BiometricAPI.lipSyncCheck(base64Video, audioBlob, 5)

            const lipSyncResult: VerificationResult = {
              type: 'lipsync',
              success: lipSyncResponse.success && lipSyncResponse.lip_sync_detected,
              message: lipSyncResponse.message || (lipSyncResponse.success ? 'Lip sync verified' : 'Lip sync verification failed'),
              confidence: lipSyncResponse.confidence,
              data: lipSyncResponse.analysis
            }
            
            results.push(lipSyncResult)
            onStepComplete('lipsync', lipSyncResult.success, { videoBlob, audioBlob })
            
            // Complete all verifications
            setVerificationResults(results)
            setIsProcessing(false)
            
            const overallSuccess = results.every(r => r.success)
            onAllStepsComplete(overallSuccess)
          } catch (error) {
            results.push({
              type: 'lipsync',
              success: false,
              message: 'Lip sync verification failed',
              data: error
            })
            onStepComplete('lipsync', false)
            
            setVerificationResults(results)
            setIsProcessing(false)
            onAllStepsComplete(false)
          }
        }
        reader.readAsDataURL(videoBlob)
      } catch (error) {
        results.push({
          type: 'lipsync',
          success: false,
          message: 'Lip sync verification failed',
          data: error
        })
        onStepComplete('lipsync', false)
        
        setVerificationResults(results)
        setIsProcessing(false)
        onAllStepsComplete(false)
      }

    } catch (error) {
      setIsProcessing(false)
      onAllStepsComplete(false)
    }
  }, [capturedImage, profile, userId, onStepComplete, onAllStepsComplete])

  // Cleanup
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Auto-start streaming when component mounts
  useEffect(() => {
    if (isInitialized && !isStreaming) {
      startStreaming()
    }
  }, [isInitialized, isStreaming, startStreaming])

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const getStatusMessage = () => {
    if (isProcessing) return 'Processing verification...'
    if (recordingComplete) return 'Recording complete!'
    if (isRecording) return `Recording... ${formatTime(recordingTime)}`
    if (isStreaming) return 'Ready to record - Look at camera and speak clearly'
    return 'Initializing camera...'
  }

  const canStartRecording = isStreaming && !isRecording && !recordingComplete && !isProcessing

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Simultaneous Biometric Verification for {profile}
        </CardTitle>
        <p className="text-center text-gray-600">
          Look at the camera and speak clearly for 5 seconds
        </p>
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
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-lg font-medium">Processing verification...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            {getStatusMessage()}
          </p>
          {faceDetections.length > 0 && !isRecording && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Face detected - Ready to record
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {canStartRecording && (
            <Button
              onClick={startRecording}
              icon={Play}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              onClick={stopRecording}
              icon={Square}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Recording
            </Button>
          )}
        </div>

        {/* Verification Results */}
        {verificationResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-center">Verification Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['face', 'voice', 'lipsync'].map((type) => {
                const result = verificationResults.find(r => r.type === type)
                const isSuccess = result?.success
                const isProcessing = !result && recordingComplete

                return (
                  <div key={type} className={`p-4 rounded-lg border-2 ${
                    isSuccess ? 'border-green-500 bg-green-50' :
                    result && !isSuccess ? 'border-red-500 bg-red-50' :
                    'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {isSuccess ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : result && !isSuccess ? (
                        <X className="w-5 h-5 text-red-600" />
                      ) : isProcessing ? (
                        <Loader className="w-5 h-5 animate-spin text-blue-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="font-medium capitalize">{type} Verification</span>
                    </div>

                    {result && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">{result.message}</p>
                        {result.confidence && (
                          <p className="text-xs text-gray-500">
                            Confidence: {result.confidence}%
                          </p>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <p className="text-sm text-gray-600">Processing...</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
