"use client"

import { useState, useEffect } from "react"
import { Calendar, FileText, Tag } from "lucide-react"

interface ProjectFormData {
  name: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  tags?: string[]
}

interface ProjectFormProps {
  mode: "create" | "edit"
  initialValues: ProjectFormData
  onChange: (values: ProjectFormData) => void
  showJson?: boolean
}

export function ProjectForm({ initialValues, onChange, showJson }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>(initialValues)

  // Update parent when form changes
  useEffect(() => {
    onChange(formData)
  }, [formData, onChange])

  // Update form when initial values change
  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  if (showJson) {
    return (
      <pre
        className="text-xs p-3 rounded overflow-x-auto font-mono"
        style={{
          background: 'var(--shell-input-surface)',
          color: 'var(--shell-text)',
          border: '2px solid var(--shell-border)'
        }}
      >
        {JSON.stringify(formData, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-4">
      {/* Project Name */}
      <div>
        <label
          htmlFor="project-name"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <FileText className="w-3.5 h-3.5" />
          Project Name *
        </label>
        <input
          id="project-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="Enter project name..."
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="project-description"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <FileText className="w-3.5 h-3.5" />
          Description
        </label>
        <textarea
          id="project-description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-2 py-1.5 text-sm border-2 rounded resize-none"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="Enter project description..."
        />
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="project-status"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Tag className="w-3.5 h-3.5" />
          Status
        </label>
        <select
          id="project-status"
          value={formData.status || "active"}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
        >
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Start Date */}
      <div>
        <label
          htmlFor="project-start-date"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Calendar className="w-3.5 h-3.5" />
          Start Date
        </label>
        <input
          id="project-start-date"
          type="date"
          value={formData.startDate || ""}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
        />
      </div>

      {/* End Date */}
      <div>
        <label
          htmlFor="project-end-date"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Calendar className="w-3.5 h-3.5" />
          End Date
        </label>
        <input
          id="project-end-date"
          type="date"
          value={formData.endDate || ""}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
        />
      </div>
    </div>
  )
}
