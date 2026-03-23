import { useCmsLocale } from "../hooks";

interface LocaleFallbackIndicatorProps {
  resolvedLocale: string | null;
}

export function LocaleFallbackIndicator({
  resolvedLocale,
}: LocaleFallbackIndicatorProps) {
  const { locale } = useCmsLocale();

  if (!resolvedLocale || resolvedLocale === locale) {
    return null;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#92400e",
        backgroundColor: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 999,
        padding: "2px 8px",
      }}
    >
      Fallback locale: {resolvedLocale}
    </span>
  );
}
