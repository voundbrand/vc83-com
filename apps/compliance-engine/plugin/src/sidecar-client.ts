/**
 * HTTP client for the compliance engine sidecar.
 * Used by the OpenClaw plugin to communicate with the sidecar.
 */

export interface SidecarConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export class SidecarClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: SidecarConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async healthy(): Promise<boolean> {
    try {
      const res = await this.fetch("/healthz");
      return res.status === "ok";
    } catch {
      return false;
    }
  }

  async ready(): Promise<boolean> {
    try {
      const res = await this.fetch("/readyz");
      return res.status === "ready";
    } catch {
      return false;
    }
  }

  async checkConsent(
    subjectId: string,
    consentType: string,
  ): Promise<{ has_consent: boolean; reason: string }> {
    return this.fetch(
      `/api/v1/consent/check?subject_id=${encodeURIComponent(subjectId)}&consent_type=${encodeURIComponent(consentType)}`,
    );
  }

  async recordAudit(event: {
    event_type: string;
    actor: string;
    subject_id?: string;
    action: string;
    resource?: string;
    outcome?: string;
    details?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    return this.post("/api/v1/audit", event);
  }

  async evaluate(context: {
    action: string;
    subject_id?: string;
    actor?: string;
    provider_id?: string;
    fields?: Record<string, unknown>;
  }): Promise<{
    allowed: boolean;
    blocked_by: Array<{ rule_id: string; message: string }>;
    warnings: Array<{ rule_id: string; message: string }>;
  }> {
    return this.post("/api/v1/evaluate", context);
  }

  async exportSubject(subjectId: string): Promise<Record<string, unknown>> {
    return this.fetch(`/api/v1/subjects/${encodeURIComponent(subjectId)}/export`);
  }

  async eraseSubject(subjectId: string): Promise<{ status: string }> {
    return this.request(
      `${this.baseUrl}/api/v1/subjects/${encodeURIComponent(subjectId)}`,
      { method: "DELETE" },
    );
  }

  async scanPii(text: string): Promise<{
    has_pii: boolean;
    summary: Record<string, number>;
  }> {
    return this.post("/api/v1/pii/scan", { text });
  }

  async reportSummary(): Promise<Record<string, unknown>> {
    return this.fetch("/api/v1/reports/summary");
  }

  // -- Governance API --

  async governanceAssess(params: {
    frameworks?: string[];
    profession?: string;
    jurisdiction?: string;
  }): Promise<Record<string, unknown>> {
    return this.post("/api/v1/governance/assess", params);
  }

  async governanceOnboardProvider(params: {
    name: string;
    provider_type?: string;
  }): Promise<Record<string, unknown>> {
    return this.post("/api/v1/governance/onboard-provider", params);
  }

  async governanceEvidenceGaps(): Promise<Record<string, unknown>> {
    return this.fetch("/api/v1/governance/evidence-gaps");
  }

  async governanceReadiness(): Promise<Record<string, unknown>> {
    return this.fetch("/api/v1/governance/readiness");
  }

  async governanceChecklist(): Promise<Record<string, unknown>> {
    return this.fetch("/api/v1/governance/checklist");
  }

  async governanceGenerateDoc(params: {
    template: string;
    company_name?: string;
    company_address?: string;
    governance_owner?: string;
  }): Promise<Record<string, unknown>> {
    return this.post("/api/v1/governance/generate-doc", params);
  }

  async governanceKnowledgeLookup(
    query: string,
  ): Promise<Record<string, unknown>> {
    return this.fetch(
      `/api/v1/governance/knowledge/${encodeURIComponent(query)}`,
    );
  }

  private async fetch(path: string): Promise<any> {
    return this.request(`${this.baseUrl}${path}`, { method: "GET" });
  }

  private async post(path: string, body: unknown): Promise<any> {
    return this.request(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async request(url: string, init: RequestInit): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Sidecar error ${response.status}: ${errorBody}`,
        );
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
