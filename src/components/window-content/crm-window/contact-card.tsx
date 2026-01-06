"use client"

import { useDraggable } from '@dnd-kit/core'
import { Mail, Phone, DollarSign } from "lucide-react"

// Contact type for CRM pipeline (from API query result)
type PipelineContact = Record<string, unknown>;

interface ContactCardProps {
  contact: PipelineContact
}

export function ContactCard({ contact }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact._id as string,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  const props = (contact.customProperties || {}) as Record<string, unknown>
  const fullName = `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed"
  const email = props.email?.toString() || ""
  const phone = props.phone?.toString()
  const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
  const tags = Array.isArray(props.tags) ? props.tags : []

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--win95-bg)',
        borderColor: 'var(--win95-border)'
      }}
      {...listeners}
      {...attributes}
      className="p-3 border-2 cursor-move hover:shadow-md transition-shadow"
    >
      {/* Name */}
      <div className="font-semibold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
        {fullName}
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-2">
        {email && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            <Mail size={12} />
            <span className="truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            <Phone size={12} />
            <span>{phone}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {totalSpent > 0 && (
        <div className="flex items-center gap-1 mb-2 text-xs font-semibold" style={{ color: 'var(--success)' }}>
          <DollarSign size={12} />
          ${(totalSpent / 100).toFixed(2)}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-[10px] border"
              style={{
                background: 'var(--win95-bg-light)',
                borderColor: 'var(--win95-border)',
                color: 'var(--win95-highlight)'
              }}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
