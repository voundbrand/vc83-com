import fs from "node:fs/promises";
import path from "node:path";
import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { runConvexFunction, type ConvexRunResult } from "./runner";
import { resolveAgentCommandContext, resolveSessionId } from "./shared";

export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers agent template apply [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --agent-id <id>             Agent object id (required)");
  console.log("  --session-id <id>           Session id for protected mutations");
  console.log("  --patch-file <path>         JSON patch payload (required)");
  console.log("  --confirm-warn-override     Set overridePolicyGate.confirmWarnOverride=true");
  console.log("  --override-reason <text>    Set overridePolicyGate.reason");
  console.log("  --execute                   Apply patch (default: preview only)");
  console.log("  --token <value>             API token for target guard resolution");
  console.log("  --yes --confirm-prod PROD   Required for confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

async function loadPatchFile(filePath: string): Promise<unknown> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function handleAgentTemplate(
  parsed: ParsedArgs,
  runner: AgentRunner = runConvexFunction
): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  if (parsed.positionals[2] !== "apply") {
    throw new Error("Usage: sevenlayers agent template apply [options]");
  }

  const execute = getOptionBoolean(parsed, "execute");
  const context = await resolveAgentCommandContext(parsed, { mutating: execute });
  const sessionId = resolveSessionId(parsed);
  const agentId = getOptionString(parsed, "agent-id");
  const patchFile = getOptionString(parsed, "patch-file");

  if (!sessionId) {
    throw new Error("agent template apply requires --session-id or SEVENLAYERS_SESSION_ID.");
  }
  if (!agentId) {
    throw new Error("agent template apply requires --agent-id.");
  }
  if (!patchFile) {
    throw new Error("agent template apply requires --patch-file <path>.");
  }

  const patch = await loadPatchFile(patchFile);
  const overrideReason = getOptionString(parsed, "override-reason");
  const confirmWarnOverride = getOptionBoolean(parsed, "confirm-warn-override");
  const overridePolicyGate =
    overrideReason || confirmWarnOverride
      ? {
          ...(confirmWarnOverride ? { confirmWarnOverride: true } : {}),
          ...(overrideReason ? { reason: overrideReason } : {})
        }
      : undefined;

  const functionName = execute
    ? "agentOntology:applyAgentFieldPatch"
    : "agentOntology:previewAgentFieldPatch";

  const result = await runner({
    functionName,
    args: {
      sessionId,
      agentId,
      patch,
      ...(overridePolicyGate ? { overridePolicyGate } : {})
    },
    execute
  });

  if (context.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          executed: result.executed,
          profile: context.profile,
          organizationId: context.organizationId,
          applicationId: context.applicationId,
          command: result.command,
          response: result.parsedJson
        },
        null,
        2
      )
    );
    return 0;
  }

  if (!result.executed) {
    console.log(colorGreen("Agent template apply dry-run prepared."));
    console.log(colorGray(`Run with --execute to apply:`));
    console.log(colorGray(`  ${result.command}`));
    return 0;
  }

  console.log(colorGreen("Agent template apply completed."));
  if (result.parsedJson) {
    console.log(colorGray(`Response: ${JSON.stringify(result.parsedJson)}`));
  }
  return 0;
}
