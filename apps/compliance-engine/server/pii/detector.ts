import { PII_PATTERNS } from "./patterns.js";
import type { PiiMatch, PiiScanResult } from "./types.js";

/**
 * Scan text for PII using regex patterns.
 * Returns all matches with type, location, and confidence.
 */
export function scanForPii(text: string): PiiScanResult {
  const matches: PiiMatch[] = [];

  for (const { type, pattern, confidence } of PII_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        value: redact(match[0]),
        start: match.index,
        end: match.index + match[0].length,
        confidence,
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Build summary counts
  const summary: Record<string, number> = {};
  for (const m of matches) {
    summary[m.type] = (summary[m.type] ?? 0) + 1;
  }

  return {
    has_pii: matches.length > 0,
    matches,
    summary,
  };
}

/**
 * Redact a matched value for safe logging.
 * Shows first 2 and last 2 characters, masks the rest.
 */
function redact(value: string): string {
  if (value.length <= 6) return "***";
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}
