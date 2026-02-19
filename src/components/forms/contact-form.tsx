"use client"

import { useState, useEffect } from "react"
import { User, Mail, Phone, Building2, MapPin, Briefcase } from "lucide-react"

interface ContactFormData {
  name: string
  email?: string
  phone?: string
  organization?: string
  jobTitle?: string
  location?: string
  notes?: string
}

interface ContactFormProps {
  mode: "create" | "edit"
  initialValues: ContactFormData
  onChange: (values: ContactFormData) => void
  showJson?: boolean
}

export function ContactForm({ initialValues, onChange, showJson }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>(initialValues)

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
      {/* Name */}
      <div>
        <label
          htmlFor="contact-name"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <User className="w-3.5 h-3.5" />
          Name *
        </label>
        <input
          id="contact-name"
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
          placeholder="Enter contact name..."
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          value={formData.email || ""}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="contact@example.com"
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="contact-phone"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Phone className="w-3.5 h-3.5" />
          Phone
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={formData.phone || ""}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {/* Organization */}
      <div>
        <label
          htmlFor="contact-organization"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Building2 className="w-3.5 h-3.5" />
          Organization
        </label>
        <input
          id="contact-organization"
          type="text"
          value={formData.organization || ""}
          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="Company name..."
        />
      </div>

      {/* Job Title */}
      <div>
        <label
          htmlFor="contact-job-title"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Job Title
        </label>
        <input
          id="contact-job-title"
          type="text"
          value={formData.jobTitle || ""}
          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="Position..."
        />
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="contact-location"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          <MapPin className="w-3.5 h-3.5" />
          Location
        </label>
        <input
          id="contact-location"
          type="text"
          value={formData.location || ""}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border-2 rounded"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="City, Country"
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="contact-notes"
          className="flex items-center gap-2 text-xs font-semibold mb-1"
          style={{ color: 'var(--shell-text)' }}
        >
          Notes
        </label>
        <textarea
          id="contact-notes"
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border-2 rounded resize-none"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-input-surface)',
            color: 'var(--shell-text)'
          }}
          placeholder="Additional notes..."
        />
      </div>
    </div>
  )
}
