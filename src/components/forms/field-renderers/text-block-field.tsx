/**
 * TEXT BLOCK FIELD RENDERER
 *
 * Renders static text/description blocks in forms.
 * Supports HTML content and various styling options.
 */

import { FormField } from "@/templates/forms/types";
import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TextBlockFieldProps {
  field: FormField;
  theme?: {
    colors?: {
      primary?: string;
      text?: string;
      background?: string;
    };
  };
}

export function TextBlockField({ field, theme }: TextBlockFieldProps) {
  // Don't render if no content provided
  if (!field.content) {
    return null;
  }

  const formatting = field.formatting || {};
  const style = formatting.style || "default";
  const alignment = formatting.alignment || "left";
  const padding = formatting.padding || "medium";

  // Style mappings
  const styleConfig = {
    default: {
      bg: theme?.colors?.background || "#f9fafb",
      border: theme?.colors?.primary || "#d1d5db",
      text: theme?.colors?.text || "#374151",
      icon: null,
    },
    info: {
      bg: "#eff6ff",
      border: "#3b82f6",
      text: "#1e40af",
      icon: <Info size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />,
    },
    warning: {
      bg: "#fef3c7",
      border: "#f59e0b",
      text: "#92400e",
      icon: <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />,
    },
    success: {
      bg: "#d1fae5",
      border: "#10b981",
      text: "#065f46",
      icon: <CheckCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />,
    },
    error: {
      bg: "#fee2e2",
      border: "#ef4444",
      text: "#991b1b",
      icon: <XCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />,
    },
  };

  const paddingMap = {
    none: "p-0",
    small: "p-2",
    medium: "p-4",
    large: "p-6",
  };

  const alignmentMap = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  const currentStyle = styleConfig[style];
  const paddingClass = paddingMap[padding];
  const alignmentClass = alignmentMap[alignment];

  return (
    <div
      className={`border-2 ${paddingClass} ${alignmentClass} mb-4`}
      style={{
        backgroundColor: currentStyle.bg,
        borderColor: currentStyle.border,
        color: currentStyle.text,
      }}
    >
      <div className="flex items-start gap-3">
        {currentStyle.icon}
        <div
          className="text-sm leading-relaxed flex-1"
          dangerouslySetInnerHTML={{ __html: field.content }}
        />
      </div>
    </div>
  );
}
