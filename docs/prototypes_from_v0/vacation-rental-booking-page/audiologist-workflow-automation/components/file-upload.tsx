"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, FileText, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxSize?: number // in MB
}

export function FileUpload({ onFilesSelected, accept = "image/*,.pdf", maxFiles = 5, maxSize = 10 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      const validFiles = droppedFiles.filter((file) => {
        const sizeInMB = file.size / (1024 * 1024)
        return sizeInMB <= maxSize
      })

      if (validFiles.length + files.length <= maxFiles) {
        const newFiles = [...files, ...validFiles]
        setFiles(newFiles)
        onFilesSelected(newFiles)
      }
    },
    [files, maxFiles, maxSize, onFilesSelected],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter((file) => {
        const sizeInMB = file.size / (1024 * 1024)
        return sizeInMB <= maxSize
      })

      if (validFiles.length + files.length <= maxFiles) {
        const newFiles = [...files, ...validFiles]
        setFiles(newFiles)
        onFilesSelected(newFiles)
      }
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-primary" />
    }
    return <FileText className="w-5 h-5 text-primary" />
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium mb-2">Dateien hochladen</p>
        <p className="text-sm text-muted-foreground mb-4">Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen</p>
        <p className="text-xs text-muted-foreground mb-4">
          Unterstützte Formate: Bilder, PDF (max. {maxSize}MB pro Datei, max. {maxFiles} Dateien)
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          multiple
          onChange={handleFileInput}
          disabled={files.length >= maxFiles}
        />
        <Button type="button" variant="outline" asChild className="bg-transparent">
          <label htmlFor="file-upload" className="cursor-pointer">
            Dateien auswählen
          </label>
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Hochgeladene Dateien ({files.length}/{maxFiles})
          </p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                {getFileIcon(file)}
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
