export type AuthenticationMode = 'face' | 'voice' | 'both'
export type ProfileType = 'Fenny' | 'George' | 'Jovin'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface User {
  id: string
  username: string
  email?: string
  profile?: ProfileType
  authentication_mode?: AuthenticationMode
  face_data?: string
  voice_data?: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SignupCredentials {
  username: string
  password: string
  email?: string
  profile: ProfileType
  authentication_mode: AuthenticationMode
}

export interface BiometricData {
  face_data?: string
  voice_data?: string
}

export interface AuthenticationRequest {
  mode: AuthenticationMode
  profile: ProfileType
  face_data?: string
  voice_data?: Blob
  user_id: string
}

export interface AuthenticationResult {
  success: boolean
  message: string
  face_match?: {
    name: string
    similarity: number
    confidence: string
  }
  voice_match?: {
    name: string
    similarity: number
    confidence: string
  }
  lip_sync_detected?: boolean
}