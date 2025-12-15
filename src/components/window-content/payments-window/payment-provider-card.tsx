"use client";

import React from "react";
import { Lock, Check, AlertCircle } from "lucide-react";

interface PaymentProviderCardProps {
  name: string;
  description: string;
  icon: string; // Font Awesome class (e.g., "fab fa-stripe")
  iconColor?: string;
  status: "connected" | "available" | "coming_soon" | "locked" | "needs_setup";
  onClick?: () => void;
  requiredTier?: string; // e.g., "Starter" - shown when locked
}

/**
 * Payment Provider Card
 *
 * Similar to IntegrationCard but for payment providers.
 * Shows connection status and allows clicking to configure.
 */
export function PaymentProviderCard({
  name,
  description,
  icon,
  iconColor = "var(--win95-highlight)",
  status,
  onClick,
  requiredTier,
}: PaymentProviderCardProps) {
  const isDisabled = status === "coming_soon";
  const isLocked = status === "locked";
  const isConnected = status === "connected";
  const needsSetup = status === "needs_setup";

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "#10b981",
              border: "2px solid #059669",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            }}
            title="Connected"
          >
            <Check size={12} color="white" strokeWidth={3} />
          </div>
        );
      case "needs_setup":
        return (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "#f59e0b",
              border: "2px solid #d97706",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            }}
            title="Needs Setup"
          >
            <AlertCircle size={12} color="white" strokeWidth={3} />
          </div>
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

  const getCardBackground = () => {
    if (isConnected) {
      return 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.15) 100%)';
    }
    if (needsSetup) {
      return 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.1) 100%)';
    }
    if (isLocked) {
      return 'linear-gradient(180deg, var(--win95-bg-light) 0%, rgba(245, 158, 11, 0.05) 100%)';
    }
    return 'var(--win95-bg-light)';
  };

  const getBorderColor = () => {
    if (isConnected) return '#10b981';
    if (needsSetup) return '#f59e0b';
    if (isLocked) return 'var(--warning)';
    return 'var(--win95-border)';
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative flex flex-col items-center justify-center gap-2 p-4 rounded border-2
        transition-all group min-h-[120px]
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      style={{
        background: getCardBackground(),
        borderColor: getBorderColor(),
        opacity: isLocked ? 0.85 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          if (isConnected) {
            e.currentTarget.style.borderColor = '#059669';
          } else if (isLocked || needsSetup) {
            e.currentTarget.style.borderColor = '#d97706';
          } else {
            e.currentTarget.style.borderColor = 'var(--win95-highlight)';
          }
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = getBorderColor();
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {getStatusBadge()}

      {/* Icon */}
      <div
        className="w-10 h-10 flex items-center justify-center rounded"
        style={{
          background: isDisabled ? 'var(--win95-border)' : `${iconColor}15`,
        }}
      >
        <i
          className={icon}
          style={{
            fontSize: '24px',
            color: isDisabled ? 'var(--neutral-gray)' : iconColor,
          }}
        />
      </div>

      {/* Name */}
      <span
        className="text-xs font-bold text-center"
        style={{ color: isDisabled ? 'var(--neutral-gray)' : 'var(--win95-text)' }}
      >
        {name}
      </span>

      {/* Description */}
      <span
        className="text-[10px] text-center line-clamp-2"
        style={{ color: 'var(--neutral-gray)' }}
      >
        {description}
      </span>
    </button>
  );
}
