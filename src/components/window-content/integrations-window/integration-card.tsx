"use client";

import React from "react";
import { Lock } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: string; // Font Awesome class (e.g., "fab fa-microsoft")
  iconColor?: string;
  status: "connected" | "available" | "coming_soon" | "locked";
  onClick?: () => void;
  requiredTier?: string; // e.g., "Starter" - shown when locked
}

export function IntegrationCard({
  name,
  description,
  icon,
  iconColor = "var(--win95-highlight)",
  status,
  onClick,
  requiredTier,
}: IntegrationCardProps) {
  const isDisabled = status === "coming_soon";
  const isLocked = status === "locked";

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full"
            style={{ background: "#10b981" }}
            title="Connected"
          />
        );
      case "coming_soon":
        return (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded"
            style={{
              background: 'var(--win95-border)',
              color: 'var(--neutral-gray)',
            }}
          >
            Coming Soon
          </div>
        );
      case "locked":
        return (
          // Lock icon in top-right only - clicking card shows upgrade details
          <div
            className="absolute top-2 right-2"
            title={`Requires ${requiredTier || 'upgrade'}`}
          >
            <Lock size={14} style={{ color: 'var(--warning)' }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick} // Allow click even when locked (to show upgrade prompt)
      disabled={isDisabled}
      className={`
        relative flex flex-col items-center justify-center gap-2 p-4 rounded border-2
        transition-all group min-h-[120px]
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      style={{
        background: isLocked
          ? 'linear-gradient(180deg, var(--win95-bg-light) 0%, rgba(245, 158, 11, 0.05) 100%)'
          : 'var(--win95-bg-light)',
        borderColor: isLocked ? 'var(--warning)' : 'var(--win95-border)',
        opacity: isLocked ? 0.85 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.borderColor = isLocked ? '#d97706' : 'var(--win95-highlight)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isLocked ? 'var(--warning)' : 'var(--win95-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      title={isLocked ? `${description} - Requires ${requiredTier}` : description}
    >
      {/* Status Badge */}
      {getStatusBadge()}

      {/* Icon */}
      <div
        className={`text-3xl ${isDisabled ? '' : 'group-hover:scale-110'} transition-transform`}
        style={{
          color: isLocked ? 'var(--neutral-gray)' : iconColor,
          filter: isLocked ? 'grayscale(50%)' : 'none',
        }}
      >
        <i className={icon} />
      </div>

      {/* Name */}
      <div
        className="text-xs font-semibold text-center break-words w-full"
        style={{ color: isLocked ? 'var(--neutral-gray)' : 'var(--win95-text)' }}
      >
        {name}
      </div>
    </button>
  );
}
