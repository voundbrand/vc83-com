"use client"

import { useState, useEffect } from "react"
import { Calendar, FileText, Flag, Percent } from "lucide-react"

interface MilestoneFormData {
  name: string
  description?: string
  dueDate?: string
  status?: string
  progress?: number
}

interface MilestoneFormProps {
  mode: "create" | "edit"
  initialValues: MilestoneFormData
  onChange: (values: MilestoneFormData) => void
  showJson?: boolean
}

export function MilestoneForm({ initialValues, onChange, showJson }: MilestoneFormProps) {
  const [formData, setFormData] = useState<MilestoneFormData>(initialValues)

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
          background: 'var(--win95-input-bg)',
          color: 'var(--win95-text)',
          border: '2px solid var(--win95-border)'
        }}
      >
        {JSON.stringify(formData, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-4">
      {/* Milestone Name */}
      <div>
        <label
          htmlFor="milestone-name"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--win95-text)' }}
        >
          <Flag className="w-3.5 h-3.5" />
          Milestone Name *
        </label>
        <input
          id="milestone-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-input-bg)',
            color: 'var(--win95-text)'
          }}
          placeholder="Enter milestone name..."
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="milestone-description"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--win95-text)' }}
        >
          <FileText className="w-3.5 h-3.5" />
          Description
        </label>
        <textarea
          id="milestone-description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border-2 rounded resize-none"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-input-bg)',
            color: 'var(--win95-text)'
          }}
          placeholder="Enter milestone description..."
        />
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="milestone-due-date"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--win95-text)' }}
        >
          <Calendar className="w-3.5 h-3.5" />
          Due Date
        </label>
        <input
          id="milestone-due-date"
          type="date"
          value={formData.dueDate || ""}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-input-bg)',
            color: 'var(--win95-text)'
          }}
        />
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="milestone-status"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--win95-text)' }}
        >
          <Flag className="w-3.5 h-3.5" />
          Status
        </label>
        <select
          id="milestone-status"
          value={formData.status || "not_started"}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-input-bg)',
            color: 'var(--win95-text)'
          }}
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      {/* Progress */}
      <div>
        <label
          htmlFor="milestone-progress"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--win95-text)' }}
        >
          <Percent className="w-3.5 h-3.5" />
          Progress: {formData.progress || 0}%
        </label>
        <input
          id="milestone-progress"
          type="range"
          min="0"
          max="100"
          value={formData.progress || 0}
          onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) })}
          className="w-full"
        />
      </div>
    </div>
  )
}
