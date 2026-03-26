import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { createPlatformApiClient } from "../../api/platform";
import { type TargetContext, resolveTargetContext } from "../../safety/target-guard";

export interface ResolvedRemoteCommand {
  target: TargetContext;
  json: boolean;
  api: ReturnType<typeof createPlatformApiClient>;
}

export interface ResolveRemoteCommandOptions {
  requireOrgApp: boolean;
  mutatingCommand: boolean;
}

function resolveApiToken(parsed: ParsedArgs): string | undefined {
  const explicit =
    getOptionString(parsed, "token") ??
    getOptionString(parsed, "api-token") ??
    getOptionString(parsed, "api-key");
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  const envTokenCandidates = [
    process.env.SEVENLAYERS_API_TOKEN,
    process.env.L4YERCAK3_API_TOKEN,
    process.env.L4YERCAK3_API_KEY
  ];

  for (const candidate of envTokenCandidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
}

export async function resolveRemoteCommand(
  parsed: ParsedArgs,
  options: ResolveRemoteCommandOptions
): Promise<ResolvedRemoteCommand> {
  const target = await resolveTargetContext(parsed, {
    requireOrgApp: options.requireOrgApp,
    mutatingCommand: options.mutatingCommand
  });

  const token = resolveApiToken(parsed);
  if (!token) {
    throw new Error(
      "Missing API token. Provide --token <value> or set SEVENLAYERS_API_TOKEN/L4YERCAK3_API_KEY."
    );
  }

  return {
    target,
    json: getOptionBoolean(parsed, "json"),
    api: createPlatformApiClient({
      backendUrl: target.backendUrl,
      token
    })
  };
}
