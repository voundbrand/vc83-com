import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError } from "../lib/errors.js";
import type { Framework } from "../engine/types.js";
import type { ProviderKnowledge } from "../knowledge/types.js";
import { matchProvider, listKnownProviders } from "../knowledge/matcher.js";
import {
  generateSubprocessorInventory,
  generateGoLiveChecklist,
  generateIncidentMatrix,
} from "../templates/renderer.js";

// -- Types --

interface AssessBody {
  frameworks?: string[];
  profession?: string;
  jurisdiction?: string;
}

interface OnboardProviderBody {
  name: string;
  provider_type?: string;
}

interface GenerateDocBody {
  template: string;
  company_name?: string;
  company_address?: string;
  governance_owner?: string;
}

type RequirementValue = string | string[] | boolean;
type DeploymentRequirements = Record<string, Record<string, RequirementValue>>;

// -- Profession → framework mapping --

const PROFESSION_FRAMEWORKS: Record<string, string[]> = {
  lawyer: ["gdpr", "stgb_203"],
  rechtsanwalt: ["gdpr", "stgb_203"],
  tax_advisor: ["gdpr", "stberg_62a"],
  steuerberater: ["gdpr", "stberg_62a"],
  doctor: ["gdpr", "stgb_203"],
  arzt: ["gdpr", "stgb_203"],
  pharmacist: ["gdpr", "stgb_203"],
  apotheker: ["gdpr", "stgb_203"],
  notary: ["gdpr", "stgb_203"],
  notar: ["gdpr", "stgb_203"],
  general: ["gdpr"],
};

// -- Route registration --

export function registerGovernanceRoutes(
  app: FastifyInstance,
  db: Database.Database,
  frameworks: Framework[],
  knowledge: ProviderKnowledge[],
): void {
  /**
   * POST /api/v1/governance/assess
   *
   * Given selected frameworks or a profession, produce a full deployment
   * gap analysis: what's needed, what's present, what's missing.
   */
  app.post<{ Body: AssessBody }>(
    `${API_PREFIX}/governance/assess`,
    async (req) => {
      let frameworkIds = req.body.frameworks ?? [];

      // Auto-select frameworks from profession
      if (frameworkIds.length === 0 && req.body.profession) {
        const profession = req.body.profession.toLowerCase().trim();
        frameworkIds = PROFESSION_FRAMEWORKS[profession] ?? ["gdpr"];
      }

      if (frameworkIds.length === 0) {
        frameworkIds = ["gdpr"];
      }

      const selectedFrameworks = frameworks.filter((f) =>
        frameworkIds.includes(f.meta.id),
      );

      // Merge all deployment requirements across selected frameworks
      const allRequirements: Record<
        string,
        Record<string, string | string[]>
      > = {};
      for (const fw of selectedFrameworks) {
        const reqs = getDeploymentRequirements(fw);
        if (!reqs) continue;

        for (const [category, items] of Object.entries(reqs)) {
          if (!allRequirements[category]) {
            allRequirements[category] = {};
          }
          for (const [key, value] of Object.entries(items)) {
            if (typeof value !== "string" && !Array.isArray(value)) {
              continue;
            }
            // "required" overrides "recommended" overrides "conditional"
            const existing = allRequirements[category][key];
            if (!existing || value === "required") {
              allRequirements[category][key] = value;
            }
          }
        }
      }

      // Get current provider status
      const providers = db
        .prepare(
          "SELECT * FROM provider_registry WHERE active = 1",
        )
        .all() as Record<string, unknown>[];

      const providerGaps = providers.map((p) =>
        assessProviderGaps(p, allRequirements, knowledge),
      );

      // Count blockers
      const blockers: Array<{
        category: string;
        description: string;
        provider_id?: string;
        action_required: string;
      }> = [];

      for (const pg of providerGaps) {
        for (const gap of pg.gaps) {
          if (gap.status === "missing") {
            blockers.push({
              category: "provider",
              description: `${pg.provider_name}: ${gap.description}`,
              provider_id: pg.provider_id,
              action_required: gap.action_required,
            });
          }
        }
      }

      // Audit
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, action, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "governance.assessed",
        "system",
        "deployment_assessment",
        "recorded",
        JSON.stringify({
          frameworks: frameworkIds,
          provider_count: providers.length,
          blocker_count: blockers.length,
        }),
      );

      return {
        frameworks: selectedFrameworks.map((f) => ({
          id: f.meta.id,
          name: f.meta.name,
          jurisdiction: f.meta.jurisdiction,
        })),
        deployment_requirements: allRequirements,
        providers: providerGaps,
        blockers,
        blocker_count: blockers.length,
        decision: blockers.length === 0 ? "GO" : "NO_GO",
        assessed_at: new Date().toISOString(),
      };
    },
  );

  /**
   * POST /api/v1/governance/onboard-provider
   *
   * Register a provider with auto-populated knowledge from the knowledge base.
   * Returns the registered provider with pre-filled fields and evidence gaps.
   */
  app.post<{ Body: OnboardProviderBody }>(
    `${API_PREFIX}/governance/onboard-provider`,
    async (req, reply) => {
      const { name, provider_type } = req.body;

      if (!name) {
        throw new ValidationError("name is required");
      }

      // Look up in knowledge base
      const known = matchProvider(knowledge, name);

      const id = randomUUID();
      const resolvedType = provider_type ?? known?.provider_type ?? "unknown";
      const dataLocation = known?.data_location ?? null;
      const transferMechanism = known?.transfer_mechanism ?? null;
      const tomStatus = known?.tom_available ? "available" : "unknown";

      const metadata = known
        ? {
            knowledge_source: known.id,
            dpa_available: known.dpa_available,
            dpa_self_service: known.dpa_self_service ?? false,
            dpa_url: known.dpa_url,
            known_certifications: known.known_certifications,
            subprocessor_list_url: known.subprocessor_list_url,
            subprocessor_notification: known.subprocessor_notification,
            eu_routing_available: known.eu_routing_available,
            eu_data_residency_available:
              known.eu_data_residency_available,
            zero_data_retention_available:
              known.zero_data_retention_available,
            notes: known.notes,
          }
        : null;

      db.prepare(
        `INSERT INTO provider_registry
         (id, name, provider_type, dpa_status, data_location, transfer_mechanism, tom_status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        known?.name ?? name,
        resolvedType,
        "missing",
        dataLocation,
        transferMechanism,
        tomStatus,
        metadata ? JSON.stringify(metadata) : null,
      );

      // Audit
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, action, resource, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "governance.provider_onboarded",
        "system",
        "onboard_provider",
        `provider:${id}`,
        "recorded",
        JSON.stringify({
          name,
          knowledge_matched: !!known,
          knowledge_id: known?.id,
        }),
      );

      // Compute evidence gaps for this provider
      const selectedFrameworks = frameworks;
      const allRequirements: Record<
        string,
        Record<string, string | string[]>
      > = {};
      for (const fw of selectedFrameworks) {
        const reqs = getDeploymentRequirements(fw);
        if (!reqs) continue;
        for (const [cat, items] of Object.entries(reqs)) {
          if (!allRequirements[cat]) allRequirements[cat] = {};
          for (const [k, v] of Object.entries(items)) {
            if (typeof v !== "string" && !Array.isArray(v)) {
              continue;
            }
            if (!allRequirements[cat][k] || v === "required") {
              allRequirements[cat][k] = v;
            }
          }
        }
      }

      const providerRow = db
        .prepare("SELECT * FROM provider_registry WHERE id = ?")
        .get(id) as Record<string, unknown>;
      const gaps = assessProviderGaps(
        providerRow,
        allRequirements,
        knowledge,
      );

      reply.code(201);
      return {
        id,
        name: known?.name ?? name,
        provider_type: resolvedType,
        data_location: dataLocation,
        transfer_mechanism: transferMechanism,
        dpa_status: "missing",
        knowledge_matched: !!known,
        knowledge: known
          ? {
              dpa_available: known.dpa_available,
              dpa_url: known.dpa_url,
              dpa_self_service: known.dpa_self_service,
              certifications: known.known_certifications,
              notes: known.notes,
            }
          : null,
        evidence_gaps: gaps.gaps,
      };
    },
  );

  /**
   * GET /api/v1/governance/evidence-gaps
   *
   * Per-provider evidence status with action items.
   */
  app.get(`${API_PREFIX}/governance/evidence-gaps`, async () => {
    const providers = db
      .prepare("SELECT * FROM provider_registry WHERE active = 1")
      .all() as Record<string, unknown>[];

    const allRequirements = mergeAllDeploymentRequirements(frameworks);

    const gaps = providers.map((p) =>
      assessProviderGaps(p, allRequirements, knowledge),
    );

    const totalGaps = gaps.reduce((sum, g) => sum + g.gaps.filter((i) => i.status === "missing").length, 0);

    return {
      providers: gaps,
      total_gaps: totalGaps,
      all_clear: totalGaps === 0,
      checked_at: new Date().toISOString(),
    };
  });

  /**
   * GET /api/v1/governance/readiness
   *
   * GO/NO-GO readiness assessment.
   */
  app.get(`${API_PREFIX}/governance/readiness`, async () => {
    const providers = db
      .prepare("SELECT * FROM provider_registry WHERE active = 1")
      .all() as Record<string, unknown>[];

    const allRequirements = mergeAllDeploymentRequirements(frameworks);

    const providerGaps = providers.map((p) =>
      assessProviderGaps(p, allRequirements, knowledge),
    );
    const providerById = new Map(
      providers.map((p) => [p.id as string, p]),
    );

    // Collect blockers
    const blockers: Array<{
      category: string;
      description: string;
      provider_id?: string;
      action_required: string;
      owner: string;
    }> = [];

    const warnings: string[] = [];

    for (const pg of providerGaps) {
      for (const gap of pg.gaps) {
        if (gap.status === "missing") {
          const owner = resolveBlockerOwner(
            providerById.get(pg.provider_id),
          );
          blockers.push({
            category: "provider",
            description: `${pg.provider_name}: ${gap.description}`,
            provider_id: pg.provider_id,
            action_required: gap.action_required,
            owner,
          });
        }
      }
    }

    // Check if any providers are non-EU without transfer mechanism
    for (const p of providers) {
      const loc = p.data_location as string | null;
      const tm = p.transfer_mechanism as string | null;
      if (loc && !isEuLocation(loc) && (!tm || tm === "none")) {
        warnings.push(
          `${p.name}: located in ${loc} with no transfer mechanism configured`,
        );
      }
    }

    // Evidence count
    const evidenceCount = (
      db.prepare("SELECT COUNT(*) as c FROM evidence_artifacts").get() as {
        c: number;
      }
    ).c;

    // Posture score
    const dpaSignedCount = providers.filter(
      (p) => p.dpa_status === "signed",
    ).length;
    const dpaScore =
      providers.length > 0 ? dpaSignedCount / providers.length : 0;
    const evidenceScore = evidenceCount > 0 ? 1 : 0;
    const gapScore =
      providerGaps.length > 0
        ? providerGaps.filter((g) => g.status === "complete").length /
          providerGaps.length
        : 0;
    const postureScore = Math.round(
      (dpaScore * 0.4 + gapScore * 0.3 + evidenceScore * 0.3) * 100,
    );

    // Audit
    db.prepare(
      `INSERT INTO audit_events (id, event_type, actor, action, outcome, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      "governance.readiness_checked",
      "system",
      "readiness_assessment",
      blockers.length === 0 ? "GO" : "NO_GO",
      JSON.stringify({
        blocker_count: blockers.length,
        provider_count: providers.length,
        posture_score: postureScore,
      }),
    );

    const generatedAt = new Date().toISOString();

    return {
      decision: blockers.length === 0 ? "GO" : "NO_GO",
      posture_score: postureScore,
      frameworks: frameworks.map((f) => ({
        id: f.meta.id,
        name: f.meta.name,
      })),
      blockers,
      warnings,
      provider_status: providerGaps,
      evidence_count: evidenceCount,
      generated_at: generatedAt,
      timestamp: generatedAt,
    };
  });

  /**
   * GET /api/v1/governance/checklist
   *
   * Generate a go-live checklist based on active frameworks.
   */
  app.get(`${API_PREFIX}/governance/checklist`, async () => {
    const allRequirements = mergeAllDeploymentRequirements(frameworks);
    const providers = db
      .prepare("SELECT * FROM provider_registry WHERE active = 1")
      .all() as Record<string, unknown>[];

    const providerGaps = providers.map((p) =>
      assessProviderGaps(p, allRequirements, knowledge),
    );

    // Build checklist items
    const items: Array<{
      id: string;
      category: string;
      description: string;
      status: "done" | "pending" | "blocked";
      framework: string;
    }> = [];

    let idx = 1;

    // Provider items
    for (const pg of providerGaps) {
      for (const gap of pg.gaps) {
        items.push({
          id: `CL-${String(idx++).padStart(3, "0")}`,
          category: "provider",
          description: `${pg.provider_name}: ${gap.description}`,
          status: gap.status === "present" ? "done" : "pending",
          framework: "all",
        });
      }
    }

    // Requirement items
    for (const [category, reqs] of Object.entries(allRequirements)) {
      if (category === "providers") continue; // handled above per-provider
      for (const [key, level] of Object.entries(reqs)) {
        if (level === "required" || level === "recommended") {
          items.push({
            id: `CL-${String(idx++).padStart(3, "0")}`,
            category,
            description: `${key.replace(/_/g, " ")} (${level})`,
            status: "pending",
            framework: "all",
          });
        }
      }
    }

    return {
      title: "Deployment Go-Live Checklist",
      frameworks: frameworks.map((f) => f.meta.id),
      items,
      total: items.length,
      done: items.filter((i) => i.status === "done").length,
      pending: items.filter((i) => i.status === "pending").length,
      blocked: items.filter((i) => i.status === "blocked").length,
      generated_at: new Date().toISOString(),
    };
  });

  /**
   * POST /api/v1/governance/generate-doc
   *
   * Generate a governance document from templates.
   */
  app.post<{ Body: GenerateDocBody }>(
    `${API_PREFIX}/governance/generate-doc`,
    async (req) => {
      const { template, company_name, company_address, governance_owner } =
        req.body;

      if (!template) {
        throw new ValidationError("template is required");
      }

      const providers = db
        .prepare("SELECT * FROM provider_registry WHERE active = 1")
        .all() as Record<string, unknown>[];

      const parsedProviders = providers.map((p) => ({
        ...p,
        active: p.active === 1,
        metadata: p.metadata ? JSON.parse(p.metadata as string) : null,
      }));

      const context = {
        company_name: company_name ?? "{{COMPANY_NAME}}",
        company_address: company_address ?? "{{COMPANY_ADDRESS}}",
        governance_owner: governance_owner ?? "{{GOVERNANCE_OWNER}}",
        providers: parsedProviders,
        frameworks: frameworks.map((f) => f.meta),
        generated_at: new Date().toISOString(),
      };

      let content: string;

      switch (template) {
        case "subprocessor_inventory":
          content = generateSubprocessorInventory(context);
          break;
        case "go_live_checklist":
          content = generateGoLiveChecklist(context);
          break;
        case "incident_matrix":
          content = generateIncidentMatrix(context);
          break;
        default:
          throw new ValidationError(
            `Unknown template: ${template}. Available: subprocessor_inventory, go_live_checklist, incident_matrix`,
          );
      }

      // Audit
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, action, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "governance.doc_generated",
        "system",
        "generate_document",
        "recorded",
        JSON.stringify({ template }),
      );

      return {
        template,
        content,
        format: "markdown",
        generated_at: new Date().toISOString(),
      };
    },
  );

  /**
   * GET /api/v1/governance/knowledge
   *
   * List all known providers from the knowledge base.
   */
  app.get<{ Querystring: { provider_type?: string } }>(
    `${API_PREFIX}/governance/knowledge`,
    async (req) => {
      const results = listKnownProviders(
        knowledge,
        req.query.provider_type,
      );
      return {
        providers: results,
        count: results.length,
      };
    },
  );

  /**
   * GET /api/v1/governance/knowledge/:query
   *
   * Look up a specific provider in the knowledge base.
   */
  app.get<{ Params: { query: string } }>(
    `${API_PREFIX}/governance/knowledge/:query`,
    async (req) => {
      const match = matchProvider(knowledge, req.params.query);
      if (!match) {
        return { found: false, query: req.params.query };
      }
      return { found: true, provider: match };
    },
  );
}

// -- Helper functions --

const EU_EEA_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "CH", "GB", "JP", "KR", "NZ", "IL", "AD", "AR", "CA", "FO",
  "GG", "IM", "JE", "UY",
]);

function isEuLocation(location: string): boolean {
  return EU_EEA_CODES.has(location.toUpperCase().trim());
}

function resolveBlockerOwner(
  provider: Record<string, unknown> | undefined,
): string {
  if (!provider) {
    return "unassigned";
  }

  const metadata = parseProviderMetadata(
    provider.metadata as string | null | undefined,
  );
  const owner =
    (metadata?.governance_owner as string | undefined) ??
    (metadata?.owner as string | undefined);

  if (!owner || owner.trim().length === 0) {
    return "unassigned";
  }

  return owner.trim();
}

function parseProviderMetadata(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function mergeAllDeploymentRequirements(
  frameworks: Framework[],
): Record<string, Record<string, string | string[]>> {
  const merged: Record<string, Record<string, string | string[]>> = {};

  for (const fw of frameworks) {
    const reqs = getDeploymentRequirements(fw);
    if (!reqs) continue;

    for (const [cat, items] of Object.entries(reqs)) {
      if (!merged[cat]) merged[cat] = {};
      for (const [k, v] of Object.entries(items)) {
        if (typeof v !== "string" && !Array.isArray(v)) {
          continue;
        }
        if (!merged[cat][k] || v === "required") {
          merged[cat][k] = v;
        }
      }
    }
  }

  return merged;
}

function getDeploymentRequirements(
  framework: Framework,
): DeploymentRequirements | undefined {
  return framework.meta.deployment_requirements as DeploymentRequirements | undefined;
}

function assessProviderGaps(
  provider: Record<string, unknown>,
  _requirements: Record<string, Record<string, string | string[]>>,
  knowledge: ProviderKnowledge[],
): {
  provider_id: string;
  provider_name: string;
  provider_type: string;
  data_location: string;
  gaps: Array<{
    evidence_type: string;
    description: string;
    status: "present" | "missing" | "expired";
    action_required: string;
    reference?: string;
  }>;
  status: "complete" | "partial" | "missing";
} {
  const gaps: Array<{
    evidence_type: string;
    description: string;
    status: "present" | "missing" | "expired";
    action_required: string;
    reference?: string;
  }> = [];

  const pid = provider.id as string;
  const pname = provider.name as string;
  const ptype = provider.provider_type as string;
  const ploc = (provider.data_location as string) ?? "unknown";
  const meta = provider.metadata
    ? JSON.parse(provider.metadata as string)
    : {};

  // Look up knowledge for enrichment
  const known = matchProvider(knowledge, pname);

  // 1. DPA status
  const dpaStatus = provider.dpa_status as string;
  if (dpaStatus !== "signed") {
    const dpaUrl = known?.dpa_url ?? meta?.dpa_url;
    gaps.push({
      evidence_type: "dpa",
      description: "Signed DPA/AVV required (GDPR Art 28)",
      status: "missing",
      action_required: dpaUrl
        ? `Sign DPA at ${dpaUrl}`
        : "Request DPA from provider",
      reference: dpaUrl,
    });
  } else {
    // Check expiry
    const expiresAt = provider.dpa_expires_at as string | null;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      gaps.push({
        evidence_type: "dpa",
        description: "DPA/AVV has expired — renewal required",
        status: "expired",
        action_required: "Renew DPA with provider",
      });
    } else {
      gaps.push({
        evidence_type: "dpa",
        description: "Signed DPA/AVV",
        status: "present",
        action_required: "none",
      });
    }
  }

  // 2. Transfer mechanism (for non-EU providers)
  if (!isEuLocation(ploc) && ploc !== "unknown") {
    const tm = provider.transfer_mechanism as string | null;
    if (!tm || tm === "none" || tm === "none_required") {
      gaps.push({
        evidence_type: "transfer_mechanism",
        description: `Provider in ${ploc} — transfer mechanism required (GDPR Art 44-49)`,
        status: "missing",
        action_required:
          "Establish Standard Contractual Clauses (SCCs) or other Art 46 mechanism",
      });
    } else {
      gaps.push({
        evidence_type: "transfer_mechanism",
        description: `Transfer mechanism: ${tm}`,
        status: "present",
        action_required: "none",
      });
    }
  }

  // 3. TOM documentation
  const tomStatus = provider.tom_status as string;
  if (tomStatus !== "documented" && tomStatus !== "available") {
    gaps.push({
      evidence_type: "tom",
      description:
        "Technical and Organizational Measures documentation (GDPR Art 32)",
      status: "missing",
      action_required: known?.tom_url
        ? `Download TOMs from ${known.tom_url}`
        : "Request TOM documentation from provider",
      reference: known?.tom_url,
    });
  } else {
    gaps.push({
      evidence_type: "tom",
      description: "TOM documentation",
      status: "present",
      action_required: "none",
    });
  }

  // 4. Subprocessor list
  const hasSubList = meta?.subprocessor_list_url || known?.subprocessor_list_url;
  if (!hasSubList) {
    gaps.push({
      evidence_type: "subprocessor_list",
      description: "Subprocessor list required (GDPR Art 28(2))",
      status: "missing",
      action_required: "Request current subprocessor list from provider",
    });
  } else {
    gaps.push({
      evidence_type: "subprocessor_list",
      description: "Subprocessor list available",
      status: "present",
      action_required: "none",
      reference: (meta?.subprocessor_list_url ??
        known?.subprocessor_list_url) as string,
    });
  }

  const missingCount = gaps.filter((g) => g.status === "missing").length;
  const expiredCount = gaps.filter((g) => g.status === "expired").length;

  return {
    provider_id: pid,
    provider_name: pname,
    provider_type: ptype,
    data_location: ploc,
    gaps,
    status:
      missingCount + expiredCount === 0
        ? "complete"
        : missingCount + expiredCount < gaps.length
          ? "partial"
          : "missing",
  };
}
