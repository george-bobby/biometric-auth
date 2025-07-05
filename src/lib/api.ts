const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface BiometricMatch {
  name: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
}

export interface FaceRecognitionResponse {
  success: boolean
  message: string
  matches: BiometricMatch[]
}

export interface VoiceRecognitionResponse {
  success: boolean
  message: string
  matches: BiometricMatch[]
  best_similarity: number
}

export interface ProfileInfo {
  name: string
  has_face_model: boolean
  has_voice_model: boolean
  supports_modes: {
    face: boolean
    voice: boolean
    both: boolean
  }
}

export interface ProfilesResponse {
  profiles: ProfileInfo[]
  total_profiles: number
}

export interface CombinedAuthResponse {
  success: boolean
  message: string
  face_match?: BiometricMatch
  voice_match?: BiometricMatch
  authentication_passed: boolean
}

export interface LipSyncResponse {
  success: boolean
  lip_sync_detected: boolean
  confidence: number
  message: string
  analysis: {
    duration_analyzed: number
    frames_processed: number
    audio_samples: number
  }
}



export class BiometricAPI {
  private static async makeRequest(endpoint: string, options: RequestInit) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  static async recognizeFace(imageData: string, userId: string): Promise<FaceRecognitionResponse> {
    const formData = new FormData()
    formData.append('image_data', imageData)
    formData.append('user_id', userId)

    return this.makeRequest('/api/face-recognition', {
      method: 'POST',
      body: formData,
    })
  }

  static async recognizeVoice(audioBlob: Blob, userId: string): Promise<VoiceRecognitionResponse> {
    const formData = new FormData()
    formData.append('audio_file', audioBlob, 'voice_sample.wav')
    formData.append('user_id', userId)

    return this.makeRequest('/api/voice-recognition', {
      method: 'POST',
      body: formData,
    })
  }

  static async healthCheck() {
    return this.makeRequest('/api/health', {
      method: 'GET',
    })
  }

  static async checkConnection(): Promise<boolean> {
    try {
      await this.healthCheck()
      return true
    } catch (error) {
      console.error('Backend connection failed:', error)
      return false
    }
  }

  static async getProfiles(): Promise<ProfilesResponse> {
    return this.makeRequest('/api/profiles', {
      method: 'GET',
    })
  }

  static async authenticateCombined(
    mode: 'face' | 'voice' | 'both',
    profile: string,
    userId: string,
    imageData?: string,
    audioBlob?: Blob
  ): Promise<CombinedAuthResponse> {
    const formData = new FormData()
    formData.append('mode', mode)
    formData.append('profile', profile)
    formData.append('user_id', userId)

    if (imageData) {
      formData.append('image_data', imageData)
    }

    if (audioBlob) {
      formData.append('audio_file', audioBlob, 'voice_sample.wav')
    }

    return this.makeRequest('/api/authenticate', {
      method: 'POST',
      body: formData,
    })
  }

  static async lipSyncCheck(
    videoData: string,
    audioBlob: Blob,
    duration: number = 4
  ): Promise<LipSyncResponse> {
    const formData = new FormData()
    formData.append('video_data', videoData)
    formData.append('audio_data', audioBlob, 'lipsync_audio.wav')
    formData.append('duration', duration.toString())

    return this.makeRequest('/api/lip-sync-check', {
      method: 'POST',
      body: formData,
    })
  }
}
