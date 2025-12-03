/**
 * Provider Logo Component
 *
 * Displays SVG logos for AI model providers instead of emoji icons.
 */

import React from "react";

interface ProviderLogoProps {
  provider: string;
  size?: number;
  className?: string;
}

export function ProviderLogo({ provider, size = 16, className = "" }: ProviderLogoProps) {
  const style = { width: size, height: size };

  switch (provider.toLowerCase()) {
    case "anthropic":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Anthropic Claude logo - simplified A shape */}
          <path d="M12 2L2 22h4l6-12 6 12h4L12 2z" />
        </svg>
      );

    case "openai":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* OpenAI logo - circular design */}
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case "google":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Google G logo - simplified */}
          <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.721-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z"/>
        </svg>
      );

    case "meta":
    case "meta-llama":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Meta logo - infinity symbol */}
          <path d="M15.4 7.5c-1.8 0-3.3 1.1-4.4 2.8C9.9 8.6 8.4 7.5 6.6 7.5c-2.9 0-4.6 2.5-4.6 6.5 0 4 1.7 6.5 4.6 6.5 1.8 0 3.3-1.1 4.4-2.8 1.1 1.7 2.6 2.8 4.4 2.8 2.9 0 4.6-2.5 4.6-6.5 0-4-1.7-6.5-4.6-6.5z"/>
        </svg>
      );

    case "mistral":
    case "mistralai":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Mistral logo - wind/arrow symbol */}
          <path d="M20 4L4 12l16 8V4z" />
          <path d="M8 12l12 6V6L8 12z" opacity="0.5" />
        </svg>
      );

    case "amazon":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Amazon smile logo */}
          <path d="M3 16c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2s-.9 2-2 2H5c-1.1 0-2-.9-2-2z"/>
          <path d="M21 17.5c-3 2-7 3-9 3s-6-1-9-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="18" cy="18" r="1.5"/>
        </svg>
      );

    case "cohere":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* Cohere logo - stylized C */}
          <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9c2.08 0 3.98-.71 5.5-1.9l-2-2A6.5 6.5 0 1 1 18.5 12h2.45c0 4.97-4.03 9-9 9z"/>
        </svg>
      );

    case "nvidia":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          {/* NVIDIA logo - eye/chip symbol */}
          <path d="M12 4l8 4v8l-8 4-8-4V8z" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      );

    default:
      // Generic AI icon for unknown providers
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
          <path d="M12 2l10 6v8l-10 6L2 16V8z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M12 7v3M12 14v3M7 9.5l2.5 1.5M14.5 13l2.5 1.5M7 14.5l2.5-1.5M14.5 11l2.5-1.5"/>
        </svg>
      );
  }
}

/**
 * Provider colors for consistent branding
 */
export function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case "anthropic":
      return "text-orange-600";
    case "openai":
      return "text-green-600";
    case "google":
      return "text-blue-600";
    case "meta":
    case "meta-llama":
      return "text-purple-600";
    case "mistral":
    case "mistralai":
      return "text-red-600";
    case "amazon":
      return "text-yellow-700";
    case "cohere":
      return "text-indigo-600";
    case "nvidia":
      return "text-green-500";
    default:
      return "text-gray-600";
  }
}

/**
 * Provider badge component with logo + name
 */
export function ProviderBadge({ provider, showName = true }: { provider: string; showName?: boolean }) {
  const color = getProviderColor(provider);
  const providerName = provider.split("/")[0].toUpperCase();

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <ProviderLogo provider={provider} size={14} />
      {showName && <span className="text-xs font-semibold">{providerName}</span>}
    </div>
  );
}
