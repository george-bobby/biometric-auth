import React from 'react'
import { ConnectionTester } from '../components/debug/ConnectionTester'
import { Button } from '../components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TestPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Test Page</h1>
            <p className="text-gray-600 mt-2">
              Test all backend connections and API endpoints
            </p>
          </div>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            icon={ArrowLeft}
          >
            Back
          </Button>
        </div>

        {/* Connection Tester */}
        <ConnectionTester />

        {/* Additional Info */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Test Information</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Backend Health:</strong> Tests if the FastAPI backend is running and responding</p>
            <p>• <strong>Profiles API:</strong> Tests if the profiles endpoint returns available biometric profiles</p>
            <p>• <strong>Auth Signup/Login:</strong> Tests authentication endpoints with dummy data</p>
            <p>• <strong>Face Recognition:</strong> Tests face recognition endpoint with a test image</p>
            <p>• <strong>Voice Recognition:</strong> Tests voice recognition endpoint with dummy audio</p>
            <p>• <strong>Combined Auth:</strong> Tests the combined biometric authentication endpoint</p>
            <p>• <strong>Lip Sync Check:</strong> Tests the lip synchronization verification endpoint</p>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Some tests are expected to fail with specific error messages when using dummy data. 
              This indicates the endpoints are working correctly but rejecting invalid input as expected.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
