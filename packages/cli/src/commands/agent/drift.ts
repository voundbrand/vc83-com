import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { runConvexFunction, type ConvexRunResult } from "./runner";
import { resolveAgentCommandContext, resolveSessionId } from "./shared";

export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers agent drift [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --session-id <id>           Session id (required unless env set)");
  console.log("  --template-id <id>          Template object id (required)");
  console.log("  --template-version-id <id>  Optional immutable template version id");
  console.log("  --target-org-id <id>        Optional org scope (repeatable or comma-separated)");
  console.log("  --token <value>             API token for target guard resolution");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

function normalizeIds(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)))
    .sort((left, right) => left.localeCompare(right));
}

function countFlaggedTargets(
  report: unknown,
  key: "stale" | "blocked"
): number {
  if (!report || typeof report !== "object") {
    return 0;
  }

  const targets = (report as Record<string, unknown>).targets;
  if (!Array.isArray(targets)) {
    return 0;
  }

  let count = 0;
  for (const target of targets) {
    if (target && typeof target === "object" && (target as Record<string, unknown>)[key] === true) {
      count += 1;
    }
  }
  return count;
}

function resolveTargetCount(report: unknown): number {
  if (!report || typeof report !== "object") {
    return 0;
  }
  const targets = (report as Record<string, unknown>).targets;
  return Array.isArray(targets) ? targets.length : 0;
}

export async function handleAgentDrift(
  parsed: ParsedArgs,
  runner: AgentRunner = runConvexFunction
): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const context = await resolveAgentCommandContext(parsed, { mutating: false });
  const sessionId = resolveSessionId(parsed);
  const templateId = getOptionString(parsed, "template-id");
  const templateVersionId = getOptionString(parsed, "template-version-id");
  const targetOrganizationIds = normalizeIds(getOptionStringArray(parsed, "target-org-id"));

  if (!sessionId) {
    throw new Error("agent drift requires --session-id or SEVENLAYERS_SESSION_ID.");
  }
  if (!templateId) {
    throw new Error("agent drift requires --template-id.");
  }

  const result = await runner({
    functionName: "agentOntology:getTemplateCloneDriftReport",
    args: {
      sessionId,
      templateId,
      ...(templateVersionId ? { templateVersionId } : {}),
      ...(targetOrganizationIds.length > 0 ? { targetOrganizationIds } : {})
    },
    execute: true
  });

  const issues: string[] = [];
  if (result.parsedJson === null) {
    issues.push("Backend returned empty or non-JSON drift response.");
  }
  const success = issues.length === 0;

  if (context.json) {
    console.log(
      JSON.stringify(
        {
          success,
          profile: context.profile,
          organizationId: context.organizationId,
          applicationId: context.applicationId,
          templateId,
          templateVersionId: templateVersionId ?? null,
          targetOrganizationIds,
          command: result.command,
          response: result.parsedJson,
          issues
        },
        null,
        2
      )
    );
    return success ? 0 : 1;
  }

  if (!success) {
    console.log(colorOrange("Agent drift query failed."));
    for (const issue of issues) {
      console.log(colorGray(`- ${issue}`));
    }
    return 1;
  }

  const targetCount = resolveTargetCount(result.parsedJson);
  const staleCount = countFlaggedTargets(result.parsedJson, "stale");
  const blockedCount = countFlaggedTargets(result.parsedJson, "blocked");

  console.log(colorGreen("Agent drift query completed."));
  console.log(colorGray(`Template: ${templateId}`));
  console.log(colorGray(`Targets: ${targetCount}`));
  console.log(colorGray(`Stale: ${staleCount}`));
  console.log(colorGray(`Blocked: ${blockedCount}`));
  return 0;
}
