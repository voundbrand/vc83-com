"use client";

import { useCmsLocale } from "../hooks";

type StyleOverride = Record<string, string | number | undefined>;

interface CmsLocaleSelectProps {
  label?: string;
  localeLabels?: Record<string, string>;
  disabled?: boolean;
  hideIfSingle?: boolean;
  labelStyle?: StyleOverride;
  selectStyle?: StyleOverride;
  wrapperStyle?: StyleOverride;
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
      style={
        {
          display: "grid",
          gap: 6,
          ...wrapperStyle,
        } as any
      }
    >
      <span
        style={
          {
            fontSize: 12,
            color: "#64748b",
            ...labelStyle,
          } as any
        }
      >
        {label}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        disabled={disabled}
        style={
          {
            borderRadius: 10,
            border: "1px solid rgba(30, 57, 38, 0.18)",
            backgroundColor: "white",
            color: "#1e3926",
            fontSize: 13,
            padding: "8px 10px",
            ...selectStyle,
          } as any
        }
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
