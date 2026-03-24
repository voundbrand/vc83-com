"use client";

import type { CSSProperties } from "react";
import { useCmsLocale } from "../hooks";

interface CmsLocaleSelectProps {
  label?: string;
  localeLabels?: Record<string, string>;
  disabled?: boolean;
  hideIfSingle?: boolean;
  labelStyle?: CSSProperties;
  selectStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
}

function normalizeLocaleLabel(locale: string): string {
  if (!locale) {
    return "";
  }
  return locale.length <= 3 ? locale.toUpperCase() : locale;
}

export function CmsLocaleSelect({
  label = "Content language",
  localeLabels,
  disabled = false,
  hideIfSingle = true,
  labelStyle,
  selectStyle,
  wrapperStyle,
}: CmsLocaleSelectProps) {
  const { locale, availableLocales, setLocale } = useCmsLocale();
  const uniqueLocales = Array.from(
    new Set([...availableLocales, locale].filter(Boolean))
  );

  if (hideIfSingle && uniqueLocales.length <= 1) {
    return null;
  }

  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        ...wrapperStyle,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#64748b",
          ...labelStyle,
        }}
      >
        {label}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        disabled={disabled}
        style={{
          borderRadius: 10,
          border: "1px solid rgba(30, 57, 38, 0.18)",
          backgroundColor: "white",
          color: "#1e3926",
          fontSize: 13,
          padding: "8px 10px",
          ...selectStyle,
        }}
      >
        {uniqueLocales.map((localeCode) => (
          <option key={localeCode} value={localeCode}>
            {localeLabels?.[localeCode] || normalizeLocaleLabel(localeCode)}
          </option>
        ))}
      </select>
    </label>
  );
}
