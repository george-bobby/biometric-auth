import React, { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '../ui/Button'

interface ImageUploadProps {
  onImageSelect: (imageData: string) => void
  onClear?: () => void
  selectedImage?: string | null
  accept?: string
  maxSizeKB?: number
  className?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onClear,
  selectedImage,
  accept = "image/*",
  maxSizeKB = 5000, // 5MB default
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    setError(null)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size
    if (file.size > maxSizeKB * 1024) {
      setError(`File size must be less than ${maxSizeKB / 1024}MB`)
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      onImageSelect(result)
    }
    reader.onerror = () => {
      setError('Failed to read the image file')
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
    onClear?.()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {!selectedImage ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                Upload Face Image
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supports JPG, PNG, GIF up to {maxSizeKB / 1024}MB
              </p>
            </div>
            
            <Button variant="outline" className="mt-4">
              <ImageIcon className="w-4 h-4 mr-2" />
              Choose Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden">
            <img
              src={selectedImage}
              alt="Selected face"
              className="w-full h-64 object-cover"
            />
            
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-2 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Image selected successfully
            </p>
            <Button variant="outline" size="sm" onClick={handleClick}>
              Change Image
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
