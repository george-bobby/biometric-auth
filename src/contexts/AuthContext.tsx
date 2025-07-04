import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { AuthState, User, LoginCredentials, SignupCredentials, ProfileType, AuthenticationMode } from '../types/auth'
import { supabase } from '../lib/supabase'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignupCredentials) => Promise<void>
  logout: () => Promise<void>
  updateBiometricData: (data: { face_data?: string; voice_data?: string }) => Promise<void>
  updateProfile: (profile: ProfileType) => Promise<void>
  updateAuthenticationMode: (mode: AuthenticationMode) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        error: null,
        isLoading: false
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, error: null }
    default:
      return state
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    // Check for existing Supabase session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          dispatch({ type: 'SET_ERROR', payload: error.message })
          return
        }

        if (session?.user) {
          // Convert Supabase user to our User type
          const user: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
            email: session.user.email,
            profile: session.user.user_metadata?.profile,
            authentication_mode: session.user.user_metadata?.authentication_mode,
            face_data: session.user.user_metadata?.face_data,
            voice_data: session.user.user_metadata?.voice_data,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          }
          dispatch({ type: 'SET_USER', payload: user })
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        console.error('Session check error:', error)
        dispatch({ type: 'SET_ERROR', payload: 'Failed to check authentication status' })
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
            email: session.user.email,
            profile: session.user.user_metadata?.profile,
            authentication_mode: session.user.user_metadata?.authentication_mode,
            face_data: session.user.user_metadata?.face_data,
            voice_data: session.user.user_metadata?.voice_data,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          }
          dispatch({ type: 'SET_USER', payload: user })
        } else {
          dispatch({ type: 'LOGOUT' })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const email = credentials.username.includes('@') ? credentials.username : `${credentials.username}@example.com`

      console.log('Attempting login with email:', email) // Debug log

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password,
      })

      if (error) {
        console.error('Supabase login error:', error) // Debug log
        throw new Error(`Login failed: ${error.message}`)
      }

      if (data.user) {
        console.log('Login successful:', data.user.email) // Debug log
        // User will be set automatically via the auth state change listener
      }
    } catch (error) {
      console.error('Login error:', error) // Debug log
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' })
    }
  }

  const signup = async (credentials: SignupCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const email = credentials.email || `${credentials.username}@example.com`

      console.log('Attempting signup with email:', email) // Debug log

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
            profile: credentials.profile,
            authentication_mode: credentials.authentication_mode,
          }
        }
      })

      if (error) {
        console.error('Supabase signup error:', error) // Debug log
        throw new Error(`Signup failed: ${error.message}`)
      }

      if (data.user) {
        console.log('Signup successful:', data.user.email) // Debug log
        // User will be set automatically via the auth state change listener
        // For email confirmation flow, user might need to verify email first
        if (!data.session) {
          dispatch({ type: 'SET_ERROR', payload: 'Account created! Please check your email to verify your account, or try logging in if email confirmation is disabled.' })
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Account created successfully!' })
        }
      }
    } catch (error) {
      console.error('Signup error:', error) // Debug log
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Signup failed' })
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
      // User state will be cleared automatically via the auth state change listener
    } catch (error) {
      console.error('Logout error:', error)
      // Force logout locally even if Supabase call fails
      dispatch({ type: 'LOGOUT' })
    }
  }

  const updateBiometricData = async (data: { face_data?: string; voice_data?: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Update user metadata with biometric data
      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          face_data: data.face_data || user.user_metadata?.face_data,
          voice_data: data.voice_data || user.user_metadata?.voice_data,
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (updatedUser.user) {
        const userWithBiometric: User = {
          id: updatedUser.user.id,
          username: updatedUser.user.user_metadata?.username || updatedUser.user.email?.split('@')[0] || '',
          email: updatedUser.user.email,
          profile: updatedUser.user.user_metadata?.profile,
          authentication_mode: updatedUser.user.user_metadata?.authentication_mode,
          face_data: updatedUser.user.user_metadata?.face_data,
          voice_data: updatedUser.user.user_metadata?.voice_data,
          created_at: updatedUser.user.created_at,
          updated_at: updatedUser.user.updated_at || updatedUser.user.created_at
        }
        dispatch({ type: 'SET_USER', payload: userWithBiometric })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update biometric data' })
    }
  }

  const updateProfile = async (profile: ProfileType) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          profile: profile,
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (updatedUser.user) {
        const userWithProfile: User = {
          id: updatedUser.user.id,
          username: updatedUser.user.user_metadata?.username || updatedUser.user.email?.split('@')[0] || '',
          email: updatedUser.user.email,
          profile: updatedUser.user.user_metadata?.profile,
          authentication_mode: updatedUser.user.user_metadata?.authentication_mode,
          face_data: updatedUser.user.user_metadata?.face_data,
          voice_data: updatedUser.user.user_metadata?.voice_data,
          created_at: updatedUser.user.created_at,
          updated_at: updatedUser.user.updated_at || updatedUser.user.created_at
        }
        dispatch({ type: 'SET_USER', payload: userWithProfile })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update profile' })
    }
  }

  const updateAuthenticationMode = async (mode: AuthenticationMode) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          authentication_mode: mode,
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (updatedUser.user) {
        const userWithMode: User = {
          id: updatedUser.user.id,
          username: updatedUser.user.user_metadata?.username || updatedUser.user.email?.split('@')[0] || '',
          email: updatedUser.user.email,
          profile: updatedUser.user.user_metadata?.profile,
          authentication_mode: updatedUser.user.user_metadata?.authentication_mode,
          face_data: updatedUser.user.user_metadata?.face_data,
          voice_data: updatedUser.user.user_metadata?.voice_data,
          created_at: updatedUser.user.created_at,
          updated_at: updatedUser.user.updated_at || updatedUser.user.created_at
        }
        dispatch({ type: 'SET_USER', payload: userWithMode })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update authentication mode' })
    }
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      signup,
      logout,
      updateBiometricData,
      updateProfile,
      updateAuthenticationMode
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}