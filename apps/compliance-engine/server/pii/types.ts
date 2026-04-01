export interface PiiMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: "high" | "medium" | "low";
}

export interface PiiScanResult {
  has_pii: boolean;
  matches: PiiMatch[];
  summary: Record<string, number>;
}
