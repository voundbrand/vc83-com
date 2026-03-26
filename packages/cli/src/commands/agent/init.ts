import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { runConvexFunction, type ConvexRunResult } from "./runner";
import { resolveAgentCommandContext } from "./shared";

export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers agent init [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --name <name>               Agent name (required)");
  console.log("  --subtype <type>            Agent subtype (default: general)");
  console.log("  --industry <text>           Bootstrap industry hint");
  console.log("  --target-audience <text>    Bootstrap audience hint");
  console.log("  --tone <text>               Bootstrap tone preference");
  console.log("  --context <text>            Additional bootstrap context");
  console.log("  --execute                   Execute bootstrap (default: dry-run)");
  console.log("  --token <value>             API token for target guard resolution");
  console.log("  --yes --confirm-prod PROD   Required for confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

export async function handleAgentInit(
  parsed: ParsedArgs,
  runner: AgentRunner = runConvexFunction
): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const execute = getOptionBoolean(parsed, "execute");
  const context = await resolveAgentCommandContext(parsed, { mutating: execute });
  const name = getOptionString(parsed, "name");
  if (!name) {
    throw new Error("agent init requires --name <agent-name>.");
  }

  const result = await runner({
    functionName: "ai/soulGenerator:bootstrapAgent",
    args: {
      organizationId: context.organizationId,
      name,
      subtype: getOptionString(parsed, "subtype") ?? "general",
      industry: getOptionString(parsed, "industry"),
      targetAudience: getOptionString(parsed, "target-audience"),
      tonePreference: getOptionString(parsed, "tone"),
      additionalContext: getOptionString(parsed, "context")
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
    console.log(colorGreen("Agent init dry-run prepared."));
    console.log(colorGray(`Run with --execute to apply:`));
    console.log(colorGray(`  ${result.command}`));
    return 0;
  }

  console.log(colorGreen("Agent init completed."));
  if (result.parsedJson) {
    console.log(colorGray(`Response: ${JSON.stringify(result.parsedJson)}`));
  }
  return 0;
}
