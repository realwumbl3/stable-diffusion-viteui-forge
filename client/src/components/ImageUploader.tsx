import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ProgressData } from '../hooks/useWebSocketProgress'

const ImageUploader = ({
  inputImage,
  onImageUpload,
  loading,
  progress,
  className = ""
}: {
  inputImage?: string | null
  onImageUpload: (image: string) => void
  loading?: boolean
  progress?: ProgressData | null
  className?: string
}
) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = (file: File | null): void => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (onImageUpload && e.target?.result) {
          onImageUpload(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const openFileDialog = (): void => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Upload button for toolbar
  if (inputImage) {
    return (
      <button
        onClick={openFileDialog}
        className="studio-btn-ghost p-2 rounded-md"
        title="Upload Image"
        type="button"
      >
        <Upload size={16} />
      </button>
    )
  }

  // Full uploader interface when no image
  return (
    <div className={cn("w-full h-full flex items-center justify-center p-8", className)}>
      {/* Loading State - Show when generating */}
      {loading && !inputImage ? (
        <div className="text-center">
          <div className="w-24 h-24 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          {progress ? (
            <>
              <p className="text-studio-text text-lg mb-4">
                {progress.textinfo || 'Generating image...'}
              </p>
              <div className="w-64 h-3 bg-studio-bg/30 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-studio-accent transition-all duration-300 ease-out"
                  style={{ width: `${(progress.progress || 0) * 100}%` }}
                />
              </div>
              <p className="text-studio-textSecondary text-sm">
                {Math.round((progress.progress || 0) * 100)}%
                {progress.total_batches && progress.total_batches > 1 && ` • Batch ${progress.current_batch}/${progress.total_batches}`}
                {progress.eta && ` • ETA: ${Math.round(progress.eta)}s`}
              </p>
            </>
          ) : (
            <p className="text-studio-textSecondary text-lg">Starting generation...</p>
          )}
        </div>
      ) : (
        /* Empty State with Upload Zone */
        <div className="text-center text-studio-text-muted">
          <div
            className={cn(
              "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center mb-4 mx-auto transition-colors duration-200 cursor-pointer",
              isDragOver ? "border-studio-accent bg-studio-accent/10" : "border-studio-border hover:border-studio-accent/50"
            )}
            onClick={openFileDialog}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Click to upload image or drag & drop here"
          >
            <Upload size={32} className="mb-2" />
            <p className="text-sm font-medium">
              {isDragOver ? "Drop image here" : "Click to upload"}
            </p>
            <p className="text-xs mt-1">or drag & drop image here</p>
          </div>
          <h3 className="text-lg font-medium mb-2">Ready for Image to Image</h3>
          <p className="text-sm">Upload an image and set your parameters</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}

export default ImageUploader
