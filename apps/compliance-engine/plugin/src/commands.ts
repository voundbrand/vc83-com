import type { SidecarClient } from "./sidecar-client.js";

/**
 * Slash commands for the OpenClaw agent.
 * /compliance — shows compliance status dashboard
 */

export function createCommands(client: SidecarClient) {
  return {
    compliance: {
      name: "compliance",
      description: "Show compliance posture dashboard",
      handler: async () => {
        try {
          const summary = await client.reportSummary();
          return formatComplianceDashboard(summary);
        } catch {
          return "Compliance sidecar unreachable. Is the engine running?";
        }
      },
    },
  };
}

function formatComplianceDashboard(
  summary: Record<string, unknown>,
): string {
  const s = summary as {
    posture_score: number;
    frameworks: Array<{ id: string; name: string; rule_count: number }>;
    consent: { total: number; granted: number; revoked: number };
    providers: { total: number; dpa_signed: number; dpa_missing: number };
    subjects: { total: number; erased: number };
    audit: { total: number; denied: number };
    evidence: { total: number };
  };

  const scoreBar = "█".repeat(Math.round(s.posture_score / 10)) +
    "░".repeat(10 - Math.round(s.posture_score / 10));

  const lines = [
    "┌──────────────────────────────────────────┐",
    "│       Compliance Engine Dashboard        │",
    "├──────────────────────────────────────────┤",
    `│  Posture Score: ${scoreBar} ${s.posture_score}%`,
    "│",
    "│  Frameworks:",
    ...s.frameworks.map(
      (f) => `│    ${f.name} (${f.rule_count} rules)`,
    ),
    "│",
    `│  Consent:   ${s.consent.granted} granted / ${s.consent.revoked} revoked`,
    `│  Providers: ${s.providers.dpa_signed} signed / ${s.providers.dpa_missing} missing DPA`,
    `│  Subjects:  ${s.subjects.total} total / ${s.subjects.erased} erased`,
    `│  Audit:     ${s.audit.total} events (${s.audit.denied} denied)`,
    `│  Evidence:  ${s.evidence.total} artifacts`,
    "└──────────────────────────────────────────┘",
  ];

  return lines.join("\n");
}
