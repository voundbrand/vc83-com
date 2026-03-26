import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { runConvexFunction, type ConvexRunResult } from "./runner";
import { resolveAgentCommandContext, resolveSessionId } from "./shared";

export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers agent permissions check [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --agent-id <id>             Agent object id (required)");
  console.log("  --session-id <id>           Session id (required unless env set)");
  console.log("  --dry-run                   Skip backend permission probe");
  console.log("  --token <value>             API token for target guard resolution");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

export async function handleAgentPermissions(
  parsed: ParsedArgs,
  runner: AgentRunner = runConvexFunction
): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  if (parsed.positionals[2] !== "check") {
    throw new Error("Usage: sevenlayers agent permissions check [options]");
  }

  const context = await resolveAgentCommandContext(parsed, { mutating: false });
  const sessionId = resolveSessionId(parsed);
  const agentId = getOptionString(parsed, "agent-id");
  const dryRun = getOptionBoolean(parsed, "dry-run");
  const issues: string[] = [];

  if (!sessionId) {
    issues.push("Missing session id. Provide --session-id or SEVENLAYERS_SESSION_ID.");
  }
  if (!agentId) {
    issues.push("Missing --agent-id.");
  }

  let response: unknown = null;
  let commandText: string | null = null;

  if (!dryRun && issues.length === 0) {
    const result = await runner({
      functionName: "agentOntology:getAgent",
      args: {
        sessionId,
        agentId
      },
      execute: true
    });
    commandText = result.command;
    response = result.parsedJson;

    if (result.parsedJson === null) {
      issues.push("Backend returned empty response for agent permission probe.");
    } else if (typeof result.parsedJson === "object" && result.parsedJson !== null) {
      const record = result.parsedJson as Record<string, unknown>;
      if (record.organizationId && String(record.organizationId) !== context.organizationId) {
        issues.push("Resolved agent organization does not match targeted org-id.");
      }
    }
  }

  const success = issues.length === 0;

  if (context.json) {
    console.log(
      JSON.stringify(
        {
          success,
          dryRun,
          profile: context.profile,
          organizationId: context.organizationId,
          applicationId: context.applicationId,
          command: commandText,
          response,
          issues
        },
        null,
        2
      )
    );
    return success ? 0 : 1;
  }

  if (success) {
    console.log(colorGreen("Agent permission checks passed."));
    return 0;
  }

  console.log(colorOrange("Agent permission checks failed."));
  for (const issue of issues) {
    console.log(colorGray(`- ${issue}`));
  }
  return 1;
}
