import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react'
import { AuthAPI, BiometricAPI } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

interface ApiLog {
  id: string
  timestamp: Date
  method: string
  endpoint: string
  status: 'pending' | 'success' | 'error'
  statusCode?: number
  response?: any
  error?: string
  duration?: number
}

interface ConnectionStatus {
  backend: 'connected' | 'disconnected' | 'testing'
  database: 'connected' | 'disconnected' | 'testing'
  lastChecked: Date | null
}

export const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    backend: 'testing',
    database: 'testing',
    lastChecked: null
  })
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([])
  const [isTestingConnections, setIsTestingConnections] = useState(false)
  const { user, isAuthenticated } = useAuth()

  // Environment info
  const envInfo = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'Not set',
    NODE_ENV: import.meta.env.MODE || 'development',
    FRONTEND_URL: window.location.origin
  }

  const addApiLog = (log: Omit<ApiLog, 'id' | 'timestamp'>) => {
    const newLog: ApiLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setApiLogs(prev => [newLog, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  const testBackendConnection = async () => {
    const startTime = Date.now()
    addApiLog({
      method: 'GET',
      endpoint: '/api/health',
      status: 'pending'
    })

    try {
      const response = await BiometricAPI.healthCheck()
      const duration = Date.now() - startTime
      
      addApiLog({
        method: 'GET',
        endpoint: '/api/health',
        status: 'success',
        statusCode: 200,
        response,
        duration
      })
      
      setConnectionStatus(prev => ({ ...prev, backend: 'connected' }))
      return true
    } catch (error) {
      const duration = Date.now() - startTime
      
      addApiLog({
        method: 'GET',
        endpoint: '/api/health',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
      
      setConnectionStatus(prev => ({ ...prev, backend: 'disconnected' }))
      return false
    }
  }

  const testDatabaseConnection = async () => {
    const startTime = Date.now()
    addApiLog({
      method: 'GET',
      endpoint: '/api/profiles',
      status: 'pending'
    })

    try {
      const response = await fetch(`${envInfo.API_BASE_URL}/api/profiles`)
      const data = await response.json()
      const duration = Date.now() - startTime
      
      addApiLog({
        method: 'GET',
        endpoint: '/api/profiles',
        status: 'success',
        statusCode: response.status,
        response: data,
        duration
      })
      
      setConnectionStatus(prev => ({ ...prev, database: 'connected' }))
      return true
    } catch (error) {
      const duration = Date.now() - startTime
      
      addApiLog({
        method: 'GET',
        endpoint: '/api/profiles',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
      
      setConnectionStatus(prev => ({ ...prev, database: 'disconnected' }))
      return false
    }
  }

  const testAllConnections = async () => {
    setIsTestingConnections(true)
    setConnectionStatus(prev => ({
      ...prev,
      backend: 'testing',
      database: 'testing'
    }))

    await Promise.all([
      testBackendConnection(),
      testDatabaseConnection()
    ])

    setConnectionStatus(prev => ({
      ...prev,
      lastChecked: new Date()
    }))
    setIsTestingConnections(false)
  }

  const clearLogs = () => {
    setApiLogs([])
  }

  const getStatusIcon = (status: 'connected' | 'disconnected' | 'testing') => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'testing':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
    }
  }

  const getStatusColor = (status: 'connected' | 'disconnected' | 'testing') => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50'
      case 'disconnected':
        return 'text-red-600 bg-red-50'
      case 'testing':
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    return `${duration}ms`
  }

  // Test connections on mount
  useEffect(() => {
    testAllConnections()
  }, [])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          icon={Activity}
        >
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-hidden">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Debug Panel
            </CardTitle>
            <div className="flex gap-1">
              <Button
                onClick={testAllConnections}
                variant="outline"
                size="sm"
                icon={RefreshCw}
                disabled={isTestingConnections}
              >
                Test
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="outline"
                size="sm"
                icon={EyeOff}
              >
                Hide
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs max-h-80 overflow-y-auto">
          {/* Connection Status */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Connection Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded flex items-center gap-2 ${getStatusColor(connectionStatus.backend)}`}>
                {getStatusIcon(connectionStatus.backend)}
                <div>
                  <div className="font-medium">Backend</div>
                  <div className="text-xs opacity-75">{envInfo.API_BASE_URL}</div>
                </div>
              </div>
              <div className={`p-2 rounded flex items-center gap-2 ${getStatusColor(connectionStatus.database)}`}>
                {getStatusIcon(connectionStatus.database)}
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-xs opacity-75">Profiles API</div>
                </div>
              </div>
            </div>
            {connectionStatus.lastChecked && (
              <div className="text-xs text-gray-500">
                Last checked: {connectionStatus.lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* User Status */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">User Status</h4>
            <div className="p-2 bg-gray-50 rounded">
              <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
              {user && (
                <>
                  <div>User ID: {user.id}</div>
                  <div>Username: {user.username}</div>
                  <div>Profile: {user.profile || 'None'}</div>
                  <div>Auth Mode: {user.authentication_mode || 'None'}</div>
                  <div>Biometric Verified: {user.biometric_verified ? '✅' : '❌'}</div>
                </>
              )}
            </div>
          </div>

          {/* Environment Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Environment</h4>
            <div className="p-2 bg-gray-50 rounded space-y-1">
              {Object.entries(envInfo).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-mono">{key}:</span>
                  <span className="font-mono text-right truncate ml-2">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* API Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">API Logs ({apiLogs.length})</h4>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                icon={Trash2}
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {apiLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-2">No API calls yet</div>
              ) : (
                apiLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded text-xs ${
                      log.status === 'success' ? 'bg-green-50 border-green-200' :
                      log.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-yellow-50 border-yellow-200'
                    } border`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-mono">
                        {log.method} {log.endpoint}
                      </div>
                      <div className="text-xs opacity-75">
                        {formatDuration(log.duration)}
                      </div>
                    </div>
                    <div className="text-xs opacity-75">
                      {log.timestamp.toLocaleTimeString()}
                    </div>
                    {log.statusCode && (
                      <div className="text-xs">Status: {log.statusCode}</div>
                    )}
                    {log.error && (
                      <div className="text-xs text-red-600 mt-1">{log.error}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
