"use client"

interface DesktopIconProps {
  icon: string
  label: string
  onClick?: () => void
}

export function DesktopIcon({ icon, label, onClick }: DesktopIconProps) {
  return (
    <div className="desktop-icon" onClick={onClick}>
      <div className="text-2xl mb-1">{icon}</div>
      <span className="text-xs text-white text-center font-pixel leading-tight">{label}</span>
    </div>
  )
}