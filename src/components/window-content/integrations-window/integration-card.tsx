"use client";

import React from "react";
import { Lock, Check } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  logoSrc?: string;
  logoAlt?: string;
  icon?: string; // Font Awesome class (e.g., "fab fa-microsoft")
  iconColor?: string;
  status: "connected" | "available" | "coming_soon" | "locked";
  onClick?: () => void;
  requiredTier?: string; // e.g., "Starter" - shown when locked
}

export function IntegrationCard({
  name,
  description,
  logoSrc,
  logoAlt,
  icon,
  iconColor = "var(--tone-accent)",
  status,
  onClick,
  requiredTier,
}: IntegrationCardProps) {
  const isDisabled = status === "coming_soon";
  const isComingSoon = status === "coming_soon";
  const isLocked = status === "locked";
  const isConnected = status === "connected";

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          // Green checkmark badge in top-right for connected integrations
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "#10b981",
              border: "2px solid #059669", // Darker green outline
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            }}
            title="Connected"
          >
            <Check size={12} color="white" strokeWidth={3} />
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

  // Determine card background based on status
  const getCardBackground = () => {
    if (isConnected) {
      // Light green overlay for connected integrations
      return 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.15) 100%)';
    }
    if (isLocked) {
      return 'linear-gradient(180deg, var(--window-document-bg-elevated) 0%, rgba(245, 158, 11, 0.05) 100%)';
    }
    return 'var(--window-document-bg-elevated)';
  };

  // Determine border color based on status
  const getBorderColor = () => {
    if (isConnected) return '#10b981'; // Green border for connected
    if (isLocked) return 'var(--warning)';
    return 'var(--window-document-border)';
  };

  return (
    <button
      onClick={onClick} // Allow click even when locked (to show upgrade prompt)
      disabled={isDisabled}
      className={`
        relative flex flex-col items-center justify-center gap-2 p-4 rounded border-2
        transition-all group min-h-[120px]
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        background: getCardBackground(),
        borderColor: getBorderColor(),
        opacity: isLocked ? 0.85 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          if (isConnected) {
            e.currentTarget.style.borderColor = '#059669'; // Darker green on hover
          } else if (isLocked) {
            e.currentTarget.style.borderColor = '#d97706';
          } else {
            e.currentTarget.style.borderColor = 'var(--tone-accent)';
          }
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = getBorderColor();
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
          color: logoSrc ? undefined : (isLocked ? 'var(--neutral-gray)' : iconColor),
          filter: isLocked ? 'grayscale(50%)' : 'none',
          opacity: isComingSoon ? 0.95 : 1,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={logoAlt || ""}
            aria-hidden="true"
            draggable={false}
            className="h-10 w-10 object-contain pointer-events-none select-none"
          />
        ) : icon ? (
          <i className={icon} aria-hidden="true" />
        ) : null}
      </div>

      {/* Name */}
      <div
        className="text-xs font-semibold text-center break-words w-full"
        style={{ color: isLocked ? 'var(--neutral-gray)' : 'var(--window-document-text)' }}
      >
        {name}
      </div>

      {isComingSoon && (
        <div
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: 'var(--window-document-border)',
            color: 'var(--neutral-gray)',
          }}
        >
          Coming Soon
        </div>
      )}
    </button>
  );
}
